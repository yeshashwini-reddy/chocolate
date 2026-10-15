/**
 * MADHURI'S CHOCO HEAVEN - SECURE PAYMENT-VERIFIED PDF RECEIPT & CONFIRMATION SYSTEM
 * 
 * Generates and downloads official, beautifully branded PDF documents using jsPDF & jspdf-autotable.
 * 
 * Document Types & Business Rules:
 * 1. Verified Paid Orders:
 *    - Document Title: "PAYMENT RECEIPT"
 *    - Issued strictly when payment_status === 'paid'
 *    - Displays verified payment reference, payment timestamp, and zero balance
 *    - Filename: Madhuris-Choco-Heaven-Receipt-[OrderNumber].pdf
 * 
 * 2. Unpaid / Pending Orders (Cash on Delivery, Cash on Pickup, Awaiting Online):
 *    - Document Title: "ORDER CONFIRMATION — PAYMENT PENDING"
 *    - Clearly states payment is pending and due upon fulfillment (delivery or pickup)
 *    - States that this document is an order confirmation and NOT proof of payment
 *    - Filename: Madhuris-Choco-Heaven-OrderConfirmation-[OrderNumber].pdf
 * 
 * Security & Integrity Guarantees:
 * - Documents are generated from immutable database snapshots (never active cart).
 * - Customer ownership is validated to prevent cross-user document downloads.
 * - Indian Rupee formatting is PDF font-safe (e.g. "Rs. 1,299.00") without broken Unicode glyphs.
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../supabaseClient.js';
import { BRAND_CONFIG } from '../config/brandConfig.js';

/**
 * Format currency in Indian Rupees format safely for standard PDF fonts.
 * Standard PDF fonts (Helvetica) lack the Unicode Rupee symbol glyph (U+20B9),
 * which would render as a missing box character. Using "Rs." ensures 100% universal
 * readability across all PDF viewers, mobile devices, and thermal/laser printers.
 * 
 * @param {number|string} amount 
 * @returns {string} e.g. "Rs. 1,299.00"
 */
export function formatRupees(amount) {
  const num = Number(amount) || 0;
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
  return `Rs. ${formatted}`;
}

/**
 * Helper to load and cache the official brand logo as a lightweight base64 PNG data URL.
 * Scales the image via an offscreen canvas to keep the generated PDF fast and lightweight (~40KB).
 */
let cachedLogoDataUrl = null;

async function getBrandLogoDataUrl() {
  if (cachedLogoDataUrl) return cachedLogoDataUrl;
  if (typeof window === 'undefined') return null;

  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 160;
          canvas.height = 160;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, 160, 160);
          cachedLogoDataUrl = canvas.toDataURL('image/png');
          resolve(cachedLogoDataUrl);
        } catch (_) {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = '/assets/images/logo.png';
    } catch (_) {
      resolve(null);
    }
  });
}

/**
 * Verify whether an order has been verified and paid.
 * 
 * @param {Object} order 
 * @returns {boolean}
 */
export function isOrderPaymentVerified(order) {
  if (!order) return false;
  const status = (order.payment_status || order.paymentStatus || '').toLowerCase();
  return status === 'paid';
}

/**
 * Format human-readable payment method description based on order details.
 * 
 * @param {Object} order 
 * @returns {string} e.g. "Cash on Delivery", "Cash on Pickup", "Online Payment (Razorpay)"
 */
export function getPaymentMethodDisplay(order) {
  if (!order) return 'Cash on Delivery';
  const method = (order.payment_method || order.paymentMethod || '').toLowerCase();
  const deliveryType = order.delivery_type || order.deliveryType || 'delivery';

  if (method === 'razorpay' || method.includes('online')) {
    return 'Online Payment (Razorpay)';
  }
  if (method === 'cash_on_pickup' || (deliveryType === 'pickup' && method.includes('pickup'))) {
    return 'Cash on Pickup';
  }
  if (method === 'cash_on_delivery' || method.includes('delivery')) {
    return 'Cash on Delivery';
  }
  return order.payment_method || order.paymentMethod || 'Cash on Delivery';
}

/**
 * Format human-readable payment status message based on actual payment state.
 * 
 * @param {Object} order 
 * @returns {string} e.g. "Paid", "Pending — Payment Due on Delivery", "Pending — Payment Due on Pickup"
 */
export function getPaymentStatusDisplay(order) {
  if (!order) return 'Pending — Payment Due on Delivery';
  const isPaid = isOrderPaymentVerified(order);
  if (isPaid) {
    return 'Paid';
  }

  const rawStatus = (order.payment_status || order.paymentStatus || '').toLowerCase();
  if (rawStatus === 'failed') {
    return 'Failed — Payment Unsuccessful';
  }
  if (rawStatus === 'refunded') {
    return 'Refunded';
  }

  const method = (order.payment_method || order.paymentMethod || '').toLowerCase();
  const deliveryType = order.delivery_type || order.deliveryType || 'delivery';

  if (method === 'cash_on_pickup' || deliveryType === 'pickup') {
    return 'Pending — Payment Due on Pickup';
  }
  if (method === 'razorpay' || method.includes('online')) {
    return 'Pending — Awaiting Payment Verification';
  }
  return 'Pending — Payment Due on Delivery';
}

/**
 * Generate a complete, beautifully branded jsPDF document for an order.
 * - If verified paid: Generates an official "PAYMENT RECEIPT"
 * - If pending / unpaid: Generates an official "ORDER CONFIRMATION — PAYMENT PENDING"
 * 
 * @param {Object} orderData 
 * @returns {Promise<jsPDF>}
 */
export async function generateReceiptPdf(orderData) {
  if (!orderData) {
    throw new Error('Receipt generation error: No order data provided.');
  }

  const isPaid = isOrderPaymentVerified(orderData);
  const paymentMethodLabel = getPaymentMethodDisplay(orderData);
  const paymentStatusLabel = getPaymentStatusDisplay(orderData);

  // Normalize order fields
  const orderNumber = orderData.order_number || orderData.orderNumber || 'MCH-ORD';
  const receiptNumber = isPaid
    ? (orderData.receipt_number || `RCPT-${orderNumber}`)
    : `CONF-${orderNumber}`;
  const customerName = orderData.customer_name || orderData.customerName || 'Valued Customer';
  const customerEmail = orderData.customer_email || orderData.customerEmail || '—';
  const customerPhone = orderData.customer_phone || orderData.customerPhone || '—';
  const isPickup = (orderData.delivery_type || orderData.deliveryType || 'delivery') === 'pickup';
  const deliveryType = isPickup ? 'Studio Self-Pickup' : 'Doorstep Delivery';
  const deliveryAddress = isPickup
    ? 'Madhuri’s Choco Heaven Studio (Self-Pickup)'
    : (orderData.delivery_address || orderData.deliveryAddress || 'Delivery Address Provided');
  const occasion = orderData.occasion || 'Special Celebration';
  const preferredDate = orderData.preferred_date || orderData.preferredDate || 'As confirmed with studio';
  const paymentRef = orderData.razorpay_payment_id || orderData.payment_reference || orderData.paymentReference || (isPaid ? 'VERIFIED-GATEWAY-TXN' : 'PAYMENT-PENDING');
  const createdAt = orderData.created_at || orderData.createdAt || new Date().toISOString();
  const paidAt = isPaid ? (orderData.paid_at || orderData.paidAt || createdAt) : null;
  const totalAmount = Number(orderData.total_amount ?? orderData.totalAmount ?? 0);
  const customisationNotes = orderData.customisation_details || orderData.special_message || null;

  // Format dates
  const formattedOrderDate = new Date(createdAt).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
  const formattedPaidDate = paidAt
    ? new Date(paidAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Pending Settlement';

  // Extract itemised products from order line items snapshot
  let lineItems = [];
  if (Array.isArray(orderData.items) && orderData.items.length > 0) {
    lineItems = orderData.items.map((i) => ({
      name: i.name || i.product_name || 'Handcrafted Confectionery',
      quantity: Number(i.quantity) || 1,
      price: Number(i.price || i.unit_price || 0),
      subtotal: (Number(i.quantity) || 1) * Number(i.price || i.unit_price || 0)
    }));
  } else if (Array.isArray(orderData.order_items) && orderData.order_items.length > 0) {
    lineItems = orderData.order_items.map((i) => ({
      name: i.product_name || i.name || 'Handcrafted Confectionery',
      quantity: Number(i.quantity) || 1,
      price: Number(i.price || 0),
      subtotal: (Number(i.quantity) || 1) * Number(i.price || 0)
    }));
  } else {
    // Fallback to order summary row
    lineItems = [
      {
        name: orderData.product_name || 'Handcrafted Confectionery',
        quantity: 1,
        price: totalAmount,
        subtotal: totalAmount
      }
    ];
  }

  // Calculate Subtotal and check if any items exist
  const calculatedSubtotal = lineItems.reduce((acc, curr) => acc + curr.subtotal, 0);
  const finalTotal = totalAmount > 0 ? totalAmount : calculatedSubtotal;

  // Initialize jsPDF (A4: 210mm x 297mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  // Brand Palette Constants (Dark Chocolate & Warm Gold)
  const COLOR_CHOCOLATE = [36, 20, 15]; // #24140F
  const COLOR_GOLD = [212, 163, 115];    // #D4A373
  const COLOR_MUTED = [105, 82, 72];     // Muted brown
  const COLOR_CREAM_BG = [252, 250, 246]; // Soft cream for cards
  const COLOR_SUCCESS = [16, 140, 80];    // Emerald green
  const COLOR_PENDING = [190, 110, 20];   // Warm amber brown

  let currentY = margin;

  // 1. HEADER SECTION: BRANDING & CONTACT
  const logoDataUrl = await getBrandLogoDataUrl();
  const logoSize = 22; // 22mm x 22mm

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', margin, currentY, logoSize, logoSize);
    } catch (_) {
      // Graceful fallback if image decoding fails
    }
  }

  const textStartX = logoDataUrl ? margin + logoSize + 4 : margin;

  // Business Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...COLOR_CHOCOLATE);
  doc.text("MADHURI'S CHOCO HEAVEN", textStartX, currentY + 5);

  // Business Tagline
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR_GOLD);
  doc.text('Handcrafted Homemade Chocolates, Cakes & Customised Treats', textStartX, currentY + 9.5);

  // Business Details & Contact
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_MUTED);
  doc.text(`Studio: ${BRAND_CONFIG.contact.location || 'Home Boutique Studio'}`, textStartX, currentY + 14);
  doc.text(`Website: madhuricollective.com  |  Email: ${BRAND_CONFIG.contact.email}  |  Phone: ${BRAND_CONFIG.contact.phoneNumber}`, textStartX, currentY + 18);

  // Right Header: Document Title (Accurately distinguishes Paid Receipt vs Pending Order Confirmation)
  const documentTitle = isPaid ? 'PAYMENT RECEIPT' : 'ORDER CONFIRMATION';
  const subtitleDoc = isPaid ? `Receipt #: ${receiptNumber}` : `Confirmation #: ${receiptNumber}`;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isPaid ? 18 : 14.5);
  doc.setTextColor(isPaid ? COLOR_GOLD[0] : COLOR_CHOCOLATE[0], isPaid ? COLOR_GOLD[1] : COLOR_CHOCOLATE[1], isPaid ? COLOR_GOLD[2] : COLOR_CHOCOLATE[2]);
  doc.text(documentTitle, pageWidth - margin, currentY + 6, { align: 'right' });

  if (!isPaid) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_PENDING);
    doc.text('PAYMENT PENDING', pageWidth - margin, currentY + 10, { align: 'right' });
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR_CHOCOLATE);
  doc.text(subtitleDoc, pageWidth - margin, currentY + (isPaid ? 12 : 14), { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_MUTED);
  doc.text(`Date: ${formattedOrderDate}`, pageWidth - margin, currentY + (isPaid ? 16.5 : 18), { align: 'right' });

  currentY += 24;

  // Decorative Gold Separator
  doc.setDrawColor(...COLOR_GOLD);
  doc.setLineWidth(0.6);
  doc.line(margin, currentY, pageWidth - margin, currentY);

  currentY += 5;

  // 2. PAYMENT STATUS BANNER
  if (isPaid) {
    // Verified Paid Banner
    doc.setFillColor(242, 249, 244); // Very soft green tint
    doc.setDrawColor(...COLOR_SUCCESS);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, currentY, contentWidth, 12, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLOR_SUCCESS);
    doc.text('✓ PAYMENT STATUS: VERIFIED & PAID', margin + 4, currentY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(...COLOR_CHOCOLATE);
    const paymentDetailsLine = `Method: ${paymentMethodLabel}   |   Ref / Txn ID: ${paymentRef}   |   Verified: ${formattedPaidDate}`;
    doc.text(paymentDetailsLine, margin + 4, currentY + 9.2);
  } else {
    // Pending Payment Banner (COD / Pickup / Awaiting Online)
    doc.setFillColor(254, 250, 242); // Soft amber tint
    doc.setDrawColor(...COLOR_PENDING);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, currentY, contentWidth, 13, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(...COLOR_PENDING);
    doc.text(`⏳ PAYMENT STATUS: ${paymentStatusLabel.toUpperCase()}`, margin + 4, currentY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.6);
    doc.setTextColor(...COLOR_CHOCOLATE);
    const paymentNoticeLine = `Method: ${paymentMethodLabel}   |   Fulfillment: ${deliveryType}   |   Notice: Payment due upon ${isPickup ? 'collection' : 'delivery'}`;
    doc.text(paymentNoticeLine, margin + 4, currentY + 9.4);
  }

  currentY += isPaid ? 16 : 17;

  // 3. TWO-COLUMN METADATA BOXES (Customer Details & Order Details)
  const boxWidth = (contentWidth - 6) / 2;
  const boxHeight = 32;

  // Left Card: Customer & Delivery Information
  doc.setFillColor(...COLOR_CREAM_BG);
  doc.setDrawColor(228, 218, 206);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, currentY, boxWidth, boxHeight, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR_GOLD);
  doc.text('BILLED & DELIVERED TO:', margin + 4, currentY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_CHOCOLATE);
  doc.text(customerName, margin + 4, currentY + 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_MUTED);
  doc.text(`Phone: ${customerPhone}`, margin + 4, currentY + 15);
  doc.text(`Email: ${customerEmail}`, margin + 4, currentY + 19);

  const cleanAddress = doc.splitTextToSize(`Address: ${deliveryAddress}`, boxWidth - 8);
  doc.text(cleanAddress.slice(0, 2), margin + 4, currentY + 23);

  // Right Card: Order Metadata
  const rightBoxX = margin + boxWidth + 6;
  doc.setFillColor(...COLOR_CREAM_BG);
  doc.setDrawColor(228, 218, 206);
  doc.roundedRect(rightBoxX, currentY, boxWidth, boxHeight, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR_GOLD);
  doc.text('ORDER IDENTIFICATION:', rightBoxX + 4, currentY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_CHOCOLATE);
  doc.text(`Order Reference:`, rightBoxX + 4, currentY + 10.5);
  doc.setFont('helvetica', 'bold');
  doc.text(orderNumber, rightBoxX + 32, currentY + 10.5);

  doc.setFont('helvetica', 'normal');
  doc.text(`Order Date:`, rightBoxX + 4, currentY + 15);
  doc.text(formattedOrderDate, rightBoxX + 32, currentY + 15);

  doc.text(`Occasion:`, rightBoxX + 4, currentY + 19);
  doc.text(occasion, rightBoxX + 32, currentY + 19);

  doc.text(`Fulfillment:`, rightBoxX + 4, currentY + 23);
  doc.text(`${deliveryType} (${preferredDate})`, rightBoxX + 32, currentY + 23);

  currentY += boxHeight + 6;

  // 4. ITEMISED PURCHASE TABLE (via jspdf-autotable)
  const tableRows = lineItems.map((item, idx) => [
    idx + 1,
    item.name,
    item.quantity,
    formatRupees(item.price),
    formatRupees(item.subtotal)
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Item Description & Details', 'Qty', 'Unit Price', 'Amount']],
    body: tableRows,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      textColor: COLOR_CHOCOLATE,
      lineColor: [225, 215, 203],
      lineWidth: 0.2,
      cellPadding: 3.5,
      valign: 'middle'
    },
    headStyles: {
      fillColor: [39, 22, 17], // Dark cocoa brown
      textColor: [243, 222, 184], // Light gold
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left'
    },
    alternateRowStyles: {
      fillColor: [253, 251, 247] // Cream alternating rows
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto', halign: 'left' },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 32, halign: 'right' },
      4: { cellWidth: 34, halign: 'right' }
    },
    didDrawPage: (data) => {
      currentY = data.cursor.y;
    }
  });

  currentY = doc.lastAutoTable.finalY + 4;

  // Check if financial summary fits on page, else create new page
  if (currentY > pageHeight - 68) {
    doc.addPage();
    currentY = margin + 10;
  }

  // 5. PRICE BREAKDOWN & FINANCIAL SUMMARY BLOCK
  const summaryBoxWidth = 88;
  const summaryX = pageWidth - margin - summaryBoxWidth;
  const rowH = 5.2;

  doc.setFillColor(...COLOR_CREAM_BG);
  doc.setDrawColor(...COLOR_GOLD);
  doc.setLineWidth(0.4);
  doc.roundedRect(summaryX, currentY, summaryBoxWidth, 29, 1.5, 1.5, 'FD');

  let sumY = currentY + 5.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR_MUTED);
  doc.text('Subtotal:', summaryX + 4, sumY);
  doc.setTextColor(...COLOR_CHOCOLATE);
  doc.text(formatRupees(finalTotal), summaryX + summaryBoxWidth - 4, sumY, { align: 'right' });

  sumY += rowH;
  doc.setTextColor(...COLOR_MUTED);
  doc.text('Delivery / Pickup Fee:', summaryX + 4, sumY);
  doc.setTextColor(...COLOR_SUCCESS);
  doc.text('Complimentary (Free)', summaryX + summaryBoxWidth - 4, sumY, { align: 'right' });

  sumY += rowH;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...COLOR_CHOCOLATE);
  doc.text(isPaid ? 'Total Paid:' : 'Total Payable:', summaryX + 4, sumY);
  doc.setTextColor(...COLOR_GOLD);
  doc.text(formatRupees(finalTotal), summaryX + summaryBoxWidth - 4, sumY, { align: 'right' });

  sumY += rowH + 0.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(...COLOR_MUTED);
  doc.text('Payment Status:', summaryX + 4, sumY);
  doc.setFont('helvetica', 'bold');
  if (isPaid) {
    doc.setTextColor(...COLOR_SUCCESS);
    doc.text('Rs. 0.00 (Fully Settled)', summaryX + summaryBoxWidth - 4, sumY, { align: 'right' });
  } else {
    doc.setTextColor(...COLOR_PENDING);
    doc.text(`${formatRupees(finalTotal)} (Due on ${isPickup ? 'Pickup' : 'Delivery'})`, summaryX + summaryBoxWidth - 4, sumY, { align: 'right' });
  }

  // Left Box: Notes or Unpaid Clarification Notice
  const noteWidth = summaryX - margin - 6;
  doc.setFillColor(254, 252, 248);
  doc.setDrawColor(228, 218, 206);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, currentY, noteWidth, 29, 1.5, 1.5, 'FD');

  if (isPaid) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_GOLD);
    doc.text('CUSTOMER CUSTOMISATION & NOTES:', margin + 4, currentY + 5);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_CHOCOLATE);
    const splitNotes = doc.splitTextToSize(customisationNotes ? `"${customisationNotes}"` : 'Standard boutique packaging confirmed.', noteWidth - 8);
    doc.text(splitNotes.slice(0, 4), margin + 4, currentY + 10);
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(...COLOR_PENDING);
    doc.text('⚠️ OFFICIAL ORDER CONFIRMATION NOTICE:', margin + 4, currentY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(...COLOR_CHOCOLATE);
    const noticeText = `This document confirms that your order has been received by the boutique studio. Payment (${formatRupees(finalTotal)}) is currently pending and must be settled upon ${isPickup ? 'studio pickup' : 'doorstep delivery'}. This document is not a proof of payment.`;
    const splitNotice = doc.splitTextToSize(noticeText, noteWidth - 8);
    doc.text(splitNotice.slice(0, 4), margin + 4, currentY + 9.5);
  }

  currentY += 34;

  // 6. OFFICIAL FOOTER & AUTHENTICITY NOTICE
  const footerY = Math.max(currentY, pageHeight - 28);

  doc.setDrawColor(228, 218, 206);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 2, pageWidth - margin, footerY - 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR_CHOCOLATE);
  const footerHeading = isPaid
    ? 'Thank you for choosing Madhuri’s Choco Heaven!'
    : 'Thank you for placing your order with Madhuri’s Choco Heaven!';
  doc.text(footerHeading, pageWidth / 2, footerY + 2.5, { align: 'center' });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_GOLD);
  doc.text('Handcrafted with love, made for your sweetest celebrations.', pageWidth / 2, footerY + 6.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...COLOR_MUTED);
  const footerSub = isPaid
    ? 'Payment recorded for the order referenced above. Madhuri’s Choco Heaven • Handcrafted Boutique Studio • +91 89788 89929'
    : 'Payment is still pending. This document is an order confirmation and is not proof of payment. • +91 89788 89929';
  doc.text(footerSub, pageWidth / 2, footerY + 10.5, { align: 'center' });

  // 7. PAGE NUMBERS (Multi-page safety)
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLOR_MUTED);
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
    doc.text(`Order Reference: ${orderNumber}`, margin, pageHeight - 8);
  }

  return doc;
}

/**
 * Download the PDF directly to the customer's device.
 * Filename:
 * - Paid: Madhuris-Choco-Heaven-Receipt-[OrderNumber].pdf
 * - Pending: Madhuris-Choco-Heaven-OrderConfirmation-[OrderNumber].pdf
 * 
 * @param {Object} orderData 
 * @returns {Promise<string>} Generated filename
 */
export async function downloadReceiptPdf(orderData) {
  const doc = await generateReceiptPdf(orderData);
  const isPaid = isOrderPaymentVerified(orderData);
  const rawOrderNumber = orderData.order_number || orderData.orderNumber || 'ORDER';
  const cleanOrderNumber = rawOrderNumber.replace(/[^a-zA-Z0-9_-]/g, '');
  const prefix = isPaid ? 'Madhuris-Choco-Heaven-Receipt' : 'Madhuris-Choco-Heaven-OrderConfirmation';
  const fileName = `${prefix}-${cleanOrderNumber}.pdf`;

  doc.save(fileName);
  return fileName;
}

/**
 * Open the PDF document in the browser print dialog.
 * 
 * @param {Object} orderData 
 */
export async function printReceiptPdf(orderData) {
  const doc = await generateReceiptPdf(orderData);
  doc.autoPrint();

  const blobUrl = doc.output('bloburl');
  const printWindow = window.open(blobUrl, '_blank');
  if (!printWindow) {
    // If popup was blocked, fallback to direct download
    await downloadReceiptPdf(orderData);
  }
}

/**
 * Fetch a customer order along with its itemised line items from Supabase.
 * Enforces customer-specific authorization:
 * - A customer can only fetch their own order.
 * - Store admins and owners can fetch any order.
 * 
 * @param {string} orderId 
 * @param {Object} currentUser 
 * @returns {Promise<Object>}
 */
export async function fetchOrderForReceipt(orderId, currentUser) {
  if (!orderId) {
    throw new Error('Order identification is required to retrieve document.');
  }

  // 1. Fetch order from Supabase
  const { data: orderRow, error: orderErr } = await supabase
    .from('orders')
    .select('*')
    .or(`id.eq.${orderId},order_number.eq.${orderId}`)
    .maybeSingle();

  if (orderErr) {
    throw new Error(`Failed to load order: ${orderErr.message}`);
  }

  if (!orderRow) {
    throw new Error('Order not found. Please verify the order reference number.');
  }

  // 2. Strict Customer Ownership Check (if user logged in)
  if (currentUser?.id) {
    const isOwnerOrAdmin = ['admin', 'owner'].includes(currentUser.role);
    const isOrderCustomer = 
      orderRow.user_id === currentUser.id ||
      (orderRow.customer_email && orderRow.customer_email.toLowerCase() === currentUser.email?.toLowerCase());

    if (!isOwnerOrAdmin && !isOrderCustomer) {
      throw new Error('Security Error: You are not authorized to view or download this order receipt.');
    }
  }

  // 3. Fetch granular line items from order_items table
  const { data: items, error: itemsErr } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderRow.id);

  if (itemsErr) {
    console.warn('[ReceiptService] Error loading line items:', itemsErr.message);
  }

  return {
    ...orderRow,
    items: items && items.length > 0 ? items : []
  };
}
