import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { BRAND_CONFIG } from '../config/brandConfig';
import { isRazorpayConfigured, openRazorpayCheckout } from '../services/paymentService';
import {
  downloadReceiptPdf,
  printReceiptPdf,
  isOrderPaymentVerified,
  getPaymentMethodDisplay,
  getPaymentStatusDisplay
} from '../services/receiptService';
import { fetchLiveProducts } from '../services/productService';

export default function CartView({ onNavigate, showToast, initialView = 'cart' }) {
  const {
    cartItems,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartSummary,
    isLoadingCart,
    isSyncing
  } = useCart();
  const { user } = useAuth();

  const [activeStep, setActiveStep] = useState(initialView); // 'cart' | 'checkout' | 'confirmation'
  const [deliveryType, setDeliveryType] = useState('delivery'); // 'delivery' | 'pickup'
  const [paymentMethod, setPaymentMethod] = useState('cash_on_delivery'); // 'cash_on_delivery' | 'razorpay'
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [placedOrderDetails, setPlacedOrderDetails] = useState(null);
  const [isGeneratingReceipt, setIsGeneratingReceipt] = useState(false);
  const [isInitiatingPayment, setIsInitiatingPayment] = useState(false);

  /**
   * Secure Razorpay Online Payment Flow:
   * 1. Creates Razorpay order server-side via create-razorpay-order Edge Function.
   * 2. Opens Razorpay Checkout modal with the server-generated order ID.
   * 3. Verifies cryptographic HMAC-SHA256 signature server-side via verify-razorpay-payment.
   * 4. Updates order confirmation state upon verified success.
   * 5. Preserves the order safely as Pending if payment is cancelled or abandoned.
   */
  const triggerRazorpayPayment = async (orderInfo) => {
    const orderIdToPay = orderInfo?.orderId || orderInfo?.id;
    if (!orderIdToPay || isInitiatingPayment) return;

    setIsInitiatingPayment(true);
    if (showToast) showToast('Connecting to secure payment gateway... 🍫');

    try {
      const orderNumber = orderInfo.orderNumber || orderInfo.order_number;
      const { data: rzpOrderData, error: rzpCreateErr } = await supabase.functions.invoke('create-razorpay-order', {
        body: {
          orderId: orderIdToPay,
          orderNumber: orderNumber
        }
      });

      if (rzpCreateErr || !rzpOrderData?.razorpay_order_id) {
        let serverErrorMsg = rzpOrderData?.error;
        if (!serverErrorMsg && rzpCreateErr?.context) {
          try {
            const errJson = await rzpCreateErr.context.json();
            serverErrorMsg = errJson?.error || errJson?.details || errJson?.message;
          } catch (_) {
            try {
              serverErrorMsg = await rzpCreateErr.context.text();
            } catch (_) {}
          }
        }
        if (!serverErrorMsg) {
          serverErrorMsg = rzpCreateErr?.message || 'Unable to open gateway';
        }

        console.error('[CartView] create-razorpay-order error:', { rzpCreateErr, rzpOrderData, serverErrorMsg });
        if (showToast) {
          showToast(
            `Payment gateway notice: ${serverErrorMsg}. Your order is safely saved as Pending.`
          );
        }
        return;
      }

      openRazorpayCheckout({
        orderNumber: orderNumber,
        razorpayOrderId: rzpOrderData.razorpay_order_id,
        amountInRupees: orderInfo.totalAmount || orderInfo.total_amount,
        customerName: orderInfo.customerName || orderInfo.customer_name,
        customerEmail: orderInfo.customerEmail || orderInfo.customer_email,
        customerPhone: orderInfo.customerPhone || orderInfo.customer_phone,
        onSuccess: async (rzpResponse) => {
          if (showToast) showToast('Payment received! Verifying signature with backend... 🍫');
          try {
            const { data: verifyRes, error: verifyErr } = await supabase.functions.invoke('verify-razorpay-payment', {
              body: {
                orderId: orderIdToPay,
                orderNumber: orderNumber,
                razorpay_order_id: rzpResponse.razorpay_order_id,
                razorpay_payment_id: rzpResponse.razorpay_payment_id,
                razorpay_signature: rzpResponse.razorpay_signature
              }
            });

            if (verifyErr || !verifyRes?.verified) {
              let verifyMsg = verifyRes?.error;
              if (!verifyMsg && verifyErr?.context) {
                try {
                  const vErrJson = await verifyErr.context.json();
                  verifyMsg = vErrJson?.details ? `${vErrJson.error}: ${vErrJson.details}` : (vErrJson?.error || vErrJson?.details || vErrJson?.message);
                } catch (_) {}
              }
              console.warn('[CartView] Backend verification notice:', { verifyErr, verifyRes, verifyMsg });
              if (showToast) {
                showToast(`Payment verification notice: ${verifyMsg || 'Pending server reconciliation'}. Order preserved.`);
              }
              return;
            }

            // Only mark as paid upon successful server verification
            setPlacedOrderDetails((prev) => ({
              ...prev,
              paymentStatus: 'paid',
              payment_status: 'paid',
              paid_at: verifyRes.paid_at || new Date().toISOString(),
              receipt_number: verifyRes.receipt_number || `RCPT-${orderNumber}`,
              payment_reference: rzpResponse.razorpay_payment_id,
              razorpayPaymentId: rzpResponse.razorpay_payment_id,
              razorpayOrderId: rzpResponse.razorpay_order_id
            }));
            if (showToast) showToast('Payment successfully verified! Your official paid receipt is ready. 📄');
          } catch (verEx) {
            console.error('[CartView] Verification exception:', verEx);
            if (showToast) showToast('Verification network notice. Payment will reconcile automatically via webhook.');
          }
        },
        onFailure: (err) => {
          console.warn('[CartView] Razorpay payment failure/dismiss:', err);
          if (showToast) {
            showToast('Payment was not completed. Your order is safely preserved in Order History.');
          }
        },
        onDismiss: () => {
          if (showToast) {
            showToast('Payment window closed. You can retry anytime from Order History.');
          }
        }
      });
    } catch (err) {
      console.error('[CartView] Payment gateway error:', err);
      if (showToast) showToast('Could not initialize payment gateway. Please try again.');
    } finally {
      setIsInitiatingPayment(false);
    }
  };

  const handleDownloadReceipt = async () => {
    if (!placedOrderDetails) return;
    try {
      setIsGeneratingReceipt(true);
      const filename = await downloadReceiptPdf(placedOrderDetails);
      const isPaid = isOrderPaymentVerified(placedOrderDetails);
      if (showToast) {
        showToast(
          isPaid
            ? `Paid receipt downloaded: ${filename} 📄`
            : `Order confirmation downloaded: ${filename} 📄`
        );
      }
    } catch (err) {
      console.error('[CartView] PDF download error:', err);
      if (showToast) showToast(err.message || 'Failed to generate document. Please try again.');
    } finally {
      setIsGeneratingReceipt(false);
    }
  };

  const handlePrintReceipt = async () => {
    if (!placedOrderDetails) return;
    try {
      setIsGeneratingReceipt(true);
      await printReceiptPdf(placedOrderDetails);
    } catch (err) {
      console.error('[CartView] PDF print error:', err);
      if (showToast) showToast(err.message || 'Failed to prepare document for printing.');
    } finally {
      setIsGeneratingReceipt(false);
    }
  };

  // Checkout Form State
  const [checkoutData, setCheckoutData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    preferredDate: '',
    occasion: 'Birthday',
    customisation: '',
    message: ''
  });

  // Pre-fill user profile data when available
  useEffect(() => {
    if (user) {
      setCheckoutData((prev) => ({
        ...prev,
        name: prev.name || user.name || '',
        email: prev.email || user.email || '',
        phone: prev.phone || user.phone || ''
      }));
    }
  }, [user]);

  // Sync step if URL hash changes to #checkout
  useEffect(() => {
    if (window.location.hash.includes('#checkout')) {
      setActiveStep('checkout');
    } else if (window.location.hash.includes('#cart')) {
      setActiveStep('cart');
    }
  }, []);

  const {
    numericSubtotal,
    hasPriceOnRequest,
    totalItems,
    unconfirmedCount
  } = getCartSummary();

  const todayStr = new Date().toISOString().split('T')[0];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCheckoutData((prev) => ({ ...prev, [name]: value }));
  };

  const validateCheckout = () => {
    if (!checkoutData.name.trim()) {
      if (showToast) showToast('Please enter your full name 🍫');
      return false;
    }
    if (!checkoutData.phone.trim()) {
      if (showToast) showToast('Please enter your phone / WhatsApp number 📞');
      return false;
    }
    if (deliveryType === 'delivery' && !checkoutData.address.trim()) {
      if (showToast) showToast('Please enter your delivery address 📍');
      return false;
    }
    if (!checkoutData.preferredDate) {
      if (showToast) showToast('Please select your preferred delivery or pickup date 📅');
      return false;
    }
    return true;
  };

  /**
   * Submit Order to Database Atomically
   */
  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (isPlacingOrder) return;
    if (!validateCheckout()) return;

    if (!user?.id) {
      if (showToast) showToast('Please log in or create an account to place your order 🍫');
      if (onNavigate) onNavigate('#login');
      else window.location.hash = '#login';
      return;
    }

    if (cartItems.length === 0) {
      if (showToast) showToast('Your cart is empty.');
      setActiveStep('cart');
      return;
    }

    setIsPlacingOrder(true);

    try {
      // 1. Authoritative Validation Against Live Database
      const { products: liveDbProducts } = await fetchLiveProducts();
      const liveProductMap = new Map();
      liveDbProducts.forEach((p) => {
        liveProductMap.set(String(p.id), p);
        if (p.product_key) liveProductMap.set(String(p.product_key), p);
        if (p.name) liveProductMap.set(p.name.toLowerCase().trim(), p);
      });

      let priceMismatchNoticed = false;
      let priceNoticeMsg = '';
      let calculatedTotal = 0;
      const validatedLineItems = [];

      for (const item of cartItems) {
        const liveProd = liveProductMap.get(String(item.productId)) ||
                         liveProductMap.get(String(item.cartItemId).split('__')[0]) ||
                         liveProductMap.get((item.rawName || item.name).toLowerCase().trim());

        if (liveProd) {
          // Check Stock Availability
          if (liveProd.available === false || liveProd.is_available === false) {
            setIsPlacingOrder(false);
            if (showToast) {
              showToast(`"${item.name}" is now out of stock. Please remove it from your cart.`);
            }
            setActiveStep('cart');
            return;
          }

          // Check Non-Negative / Needs Pricing Guard
          if (liveProd.price <= 0 || liveProd.needsPricing) {
            setIsPlacingOrder(false);
            if (showToast) {
              showToast(`"${item.name}" requires custom pricing. It cannot be checked out for ₹0.`);
            }
            setActiveStep('cart');
            return;
          }

          const dbUnitPrice = Number(liveProd.price) || 0;
          if (item.price !== null && typeof item.price === 'number' && item.price !== dbUnitPrice) {
            priceMismatchNoticed = true;
            priceNoticeMsg = `The price of "${item.name}" has been updated by the owner from ₹${item.price} to ₹${dbUnitPrice}.`;
            item.price = dbUnitPrice;
          }

          calculatedTotal += dbUnitPrice * item.quantity;
          validatedLineItems.push({
            name: item.name,
            quantity: item.quantity,
            price: dbUnitPrice
          });
        } else {
          const itemPrice = Number(item.price) || 0;
          if (itemPrice <= 0) {
            setIsPlacingOrder(false);
            if (showToast) {
              showToast(`"${item.name}" requires custom pricing and cannot be purchased for ₹0.`);
            }
            setActiveStep('cart');
            return;
          }
          calculatedTotal += itemPrice * item.quantity;
          validatedLineItems.push({
            name: item.name,
            quantity: item.quantity,
            price: itemPrice
          });
        }
      }

      // If owner changed the price while customer was in checkout:
      if (priceMismatchNoticed) {
        setIsPlacingOrder(false);
        if (showToast) {
          showToast(`${priceNoticeMsg} Your order total has been updated. Please review before proceeding.`);
        }
        return;
      }

      const orderRef = 'MCH-' + Math.floor(100000 + Math.random() * 900000);
      const summaryProductNames = validatedLineItems.map((i) => `${i.name} × ${i.quantity}`).join(', ');

      const resolvedPaymentMethod =
        paymentMethod === 'razorpay'
          ? 'Online Payment (Razorpay)'
          : deliveryType === 'pickup'
          ? 'Cash on Pickup'
          : 'Cash on Delivery';

      // 1. Try atomic stored procedure create_order_from_cart
      let createdOrderId = null;
      let finalOrderNumber = orderRef;

      try {
        const { data: rpcResult, error: rpcError } = await supabase.rpc('create_order_from_cart', {
          p_customer_name: checkoutData.name.trim(),
          p_customer_phone: checkoutData.phone.trim(),
          p_customer_email: checkoutData.email.trim(),
          p_delivery_type: deliveryType,
          p_delivery_address: deliveryType === 'delivery' ? checkoutData.address.trim() : 'Pickup from Studio',
          p_preferred_date: checkoutData.preferredDate,
          p_occasion: checkoutData.occasion,
          p_customisation_details: checkoutData.customisation.trim() || null,
          p_special_message: checkoutData.message.trim() || null,
          p_payment_method: resolvedPaymentMethod
        });

        if (!rpcError && rpcResult?.order_number) {
          createdOrderId = rpcResult.order_id;
          finalOrderNumber = rpcResult.order_number;
        }
      } catch (rpcEx) {
        console.info('[CartView] RPC note, falling back to direct insert:', rpcEx.message);
      }

      // 2. Direct Supabase insert with verified amounts
      if (!createdOrderId) {
        try {
          const { data: orderRow, error: orderErr } = await supabase
            .from('orders')
            .insert({
              user_id: user.id,
              order_number: finalOrderNumber,
              customer_name: checkoutData.name.trim(),
              customer_email: checkoutData.email.trim(),
              customer_phone: checkoutData.phone.trim(),
              delivery_type: deliveryType,
              delivery_address: deliveryType === 'delivery' ? checkoutData.address.trim() : 'Pickup from Studio',
              occasion: checkoutData.occasion,
              product_name: summaryProductNames,
              quantity: `${totalItems} item(s)`,
              preferred_date: checkoutData.preferredDate,
              customisation_details: checkoutData.customisation.trim() || null,
              special_message: checkoutData.message.trim() || null,
              total_amount: calculatedTotal,
              status: 'pending',
              payment_status: 'pending',
              payment_method: resolvedPaymentMethod
            })
            .select('id')
            .single();

          if (orderErr) {
            console.error('[CartView] Direct Supabase order insert error:', orderErr.message);
            if (showToast) showToast(`Failed to place order: ${orderErr.message}`);
            setIsPlacingOrder(false);
            return;
          }

          if (orderRow?.id) {
            createdOrderId = orderRow.id;

            // Insert verified order items line by line
            const orderLineItems = validatedLineItems.map((item) => ({
              order_id: createdOrderId,
              product_name: item.name,
              quantity: item.quantity,
              price: item.price
            }));

            const { error: itemsErr } = await supabase.from('order_items').insert(orderLineItems);
            if (itemsErr) {
              console.error('[CartView] Failed to insert order items:', itemsErr.message);
            }
          }
        } catch (dbEx) {
          console.error('[CartView] Supabase database exception:', dbEx);
          if (showToast) showToast(`Order failed: ${dbEx.message || 'Database error'}`);
          setIsPlacingOrder(false);
          return;
        }
      }

      // Strictly verify that order was saved to database before proceeding
      if (!createdOrderId) {
        if (showToast) showToast('Failed to save order to database. Please check your connection and try again.');
        setIsPlacingOrder(false);
        return;
      }

      // Snapshot ordered items for confirmation screen before clearing cart
      const savedItemsSnapshot = [...cartItems];

      // Clean up customer's active cart
      await clearCart();

      const orderConfirmation = {
        orderId: createdOrderId,
        orderNumber: finalOrderNumber,
        items: savedItemsSnapshot,
        totalAmount: calculatedTotal,
        hasPriceOnRequest,
        customerName: checkoutData.name.trim(),
        customerPhone: checkoutData.phone.trim(),
        customerEmail: checkoutData.email.trim(),
        deliveryType,
        deliveryAddress: deliveryType === 'delivery' ? checkoutData.address.trim() : 'Pickup from Studio',
        preferredDate: checkoutData.preferredDate,
        occasion: checkoutData.occasion,
        paymentStatus: 'pending',
        payment_status: 'pending',
        paymentMethod: resolvedPaymentMethod,
        payment_method: resolvedPaymentMethod
      };

      setPlacedOrderDetails(orderConfirmation);

      // Handle Online Payment via Razorpay if selected and configured
      if (paymentMethod === 'razorpay' && isRazorpayConfigured() && calculatedTotal > 0 && !hasPriceOnRequest) {
        triggerRazorpayPayment(orderConfirmation);
      }

      setActiveStep('confirmation');
      if (showToast) showToast(`Order placed successfully! Reference: ${finalOrderNumber} 🍫`);
    } catch (err) {
      console.error('[CartView] Order creation error:', err);
      if (showToast) showToast(err.message || 'Failed to place order. Please check your connection.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <section className="section-padding cart-section" id="cart" aria-labelledby="cart-heading">
      <div className="container">
        {/* ==================================================================
            STEP 3: ORDER CONFIRMATION VIEW
            ================================================================== */}
        {activeStep === 'confirmation' && placedOrderDetails ? (
          <div className="order-confirmation-box reveal-on-scroll revealed">
            <div className="order-confirmation-badge">
              ✓ Order Successfully Received
            </div>

            <h2 className="font-serif" style={{ color: 'var(--text-cream)', fontSize: '2rem', marginBottom: '8px' }}>
              Thank You, <span className="text-gradient-gold">{placedOrderDetails.customerName}</span>!
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.96rem', maxWidth: '540px', margin: '0 auto 20px' }}>
              Madhuri has received your order request and will handcraft your delicious creations with love.
            </p>

            <div className="order-confirmation-ref-box">
              <div className="order-confirmation-ref-label">Order Reference Number</div>
              <div className="order-confirmation-ref-id">{placedOrderDetails.orderNumber}</div>
            </div>

            <div className="order-confirmation-details-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ color: 'var(--gold-400)', fontWeight: 600, fontSize: '0.82rem', textTransform: 'uppercase' }}>
                  Ordered Items ({placedOrderDetails.items.length})
                </span>
                <span
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: '4px',
                    background: isOrderPaymentVerified(placedOrderDetails) ? 'rgba(52, 211, 153, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    color: isOrderPaymentVerified(placedOrderDetails) ? '#34d399' : '#f59e0b',
                    border: isOrderPaymentVerified(placedOrderDetails) ? '1px solid #34d399' : '1px solid #f59e0b'
                  }}
                >
                  ● {getPaymentStatusDisplay(placedOrderDetails)}
                </span>
              </div>

              <div className="order-confirmation-items-summary">
                {placedOrderDetails.items.map((item, idx) => (
                  <div key={idx} className="order-confirmation-item-row">
                    <span>
                      {item.name} <strong>× {item.quantity}</strong>
                    </span>
                    <span style={{ color: 'var(--gold-300)', fontWeight: 600 }}>
                      {item.price ? `₹${(item.price * item.quantity).toLocaleString('en-IN')}` : 'Price on Request'}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginTop: '16px', fontSize: '0.88rem' }}>
                <div>
                  <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Fulfillment</span>
                  <strong style={{ color: 'var(--text-cream)' }}>
                    {placedOrderDetails.deliveryType === 'delivery' ? '🚚 Doorstep Delivery' : '🍫 Studio Self-Pickup'}
                  </strong>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '2px' }}>{placedOrderDetails.deliveryAddress}</div>
                </div>

                <div>
                  <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Preferred Date & Occasion</span>
                  <strong style={{ color: 'var(--text-cream)' }}>
                    {placedOrderDetails.preferredDate} ({placedOrderDetails.occasion})
                  </strong>
                </div>

                <div>
                  <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Payment Method</span>
                  <strong style={{ color: 'var(--text-cream)' }}>
                    {getPaymentMethodDisplay(placedOrderDetails)}
                  </strong>
                </div>

                <div>
                  <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Payment Status</span>
                  <strong style={{ color: isOrderPaymentVerified(placedOrderDetails) ? '#34d399' : '#f59e0b' }}>
                    {getPaymentStatusDisplay(placedOrderDetails)}
                  </strong>
                </div>

                <div>
                  <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Payable Amount</span>
                  <strong style={{ color: 'var(--gold-300)', fontSize: '1.15rem', fontFamily: 'var(--font-serif)' }}>
                    {placedOrderDetails.totalAmount > 0 ? `₹${placedOrderDetails.totalAmount.toLocaleString('en-IN')}` : 'Quotation Pending'}
                  </strong>
                </div>

                <div>
                  <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Contact</span>
                  <strong style={{ color: 'var(--text-cream)' }}>{placedOrderDetails.customerPhone}</strong>
                </div>
              </div>
            </div>

            {/* Document Download & Print Card */}
            <div
              className="order-confirmation-receipt-card"
              style={{
                marginTop: '22px',
                padding: '20px',
                background: 'rgba(21, 11, 8, 0.75)',
                border: isOrderPaymentVerified(placedOrderDetails)
                  ? '1px solid rgba(52, 211, 153, 0.4)'
                  : '1px solid var(--border-gold-strong)',
                borderRadius: 'var(--radius-md)',
                textAlign: 'center',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)'
              }}
            >
              {isOrderPaymentVerified(placedOrderDetails) ? (
                <>
                  <div
                    style={{
                      color: '#34d399',
                      fontWeight: 700,
                      fontSize: '0.98rem',
                      marginBottom: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <span>✓ Official Payment Verified & Settled</span>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', margin: '0 auto 16px', maxWidth: '480px' }}>
                    Your payment has been successfully verified. You can now download and print your official itemised Paid Receipt for your records.
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      id="btn-download-receipt"
                      className="btn btn-gold btn-sm"
                      disabled={isGeneratingReceipt}
                      onClick={handleDownloadReceipt}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontWeight: 600 }}
                    >
                      <span>📄</span>
                      <span>{isGeneratingReceipt ? 'Generating Receipt...' : 'Download Paid Receipt (PDF)'}</span>
                    </button>
                    <button
                      type="button"
                      id="btn-print-receipt"
                      className="btn btn-outline btn-sm"
                      disabled={isGeneratingReceipt}
                      onClick={handlePrintReceipt}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px' }}
                    >
                      <span>🖨️</span>
                      <span>Print Receipt</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div
                    style={{
                      color: '#f59e0b',
                      fontWeight: 700,
                      fontSize: '0.98rem',
                      marginBottom: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <span>⏳ Order Confirmed — Payment Pending ({getPaymentMethodDisplay(placedOrderDetails)})</span>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 auto 16px', maxWidth: '520px' }}>
                    Your order is confirmed and scheduled for handcrafted preparation. Payment ({placedOrderDetails.totalAmount > 0 ? `₹${placedOrderDetails.totalAmount.toLocaleString('en-IN')}` : 'Quotation Basis'}) is due upon {placedOrderDetails.deliveryType === 'pickup' ? 'studio collection' : 'doorstep delivery'}. You can download your official Order Confirmation document now.
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
                    {placedOrderDetails.totalAmount > 0 &&
                      (placedOrderDetails.paymentMethod?.toLowerCase().includes('razorpay') ||
                       placedOrderDetails.payment_method?.toLowerCase().includes('razorpay')) &&
                      isRazorpayConfigured() && (
                        <button
                          type="button"
                          id="btn-retry-online-payment"
                          className="btn btn-gold btn-sm"
                          disabled={isInitiatingPayment}
                          onClick={() => triggerRazorpayPayment(placedOrderDetails)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 22px',
                            fontWeight: 700,
                            background: 'linear-gradient(135deg, #d4a373 0%, #b3804d 100%)',
                            boxShadow: '0 4px 15px rgba(212, 163, 115, 0.35)'
                          }}
                        >
                          <span>⚡</span>
                          <span>{isInitiatingPayment ? 'Opening Gateway...' : 'Pay Online Now (Razorpay)'}</span>
                        </button>
                    )}
                    <button
                      type="button"
                      id="btn-download-receipt"
                      className="btn btn-outline btn-sm"
                      disabled={isGeneratingReceipt}
                      onClick={handleDownloadReceipt}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontWeight: 600 }}
                    >
                      <span>📄</span>
                      <span>{isGeneratingReceipt ? 'Generating Confirmation...' : 'Download Order Confirmation (PDF)'}</span>
                    </button>
                    <button
                      type="button"
                      id="btn-print-receipt"
                      className="btn btn-outline btn-sm"
                      disabled={isGeneratingReceipt}
                      onClick={handlePrintReceipt}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px' }}
                    >
                      <span>🖨️</span>
                      <span>Print Confirmation</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Bottom Actions: Continue Shopping, Download Button, and WhatsApp */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap', marginTop: '24px' }}>
              <button
                type="button"
                className="btn btn-gold"
                onClick={() => {
                  setActiveStep('cart');
                  if (onNavigate) onNavigate('#home');
                }}
              >
                <span>Continue Shopping</span>
                <span className="btn-icon-arrow">→</span>
              </button>

              <button
                type="button"
                className="btn btn-outline"
                disabled={isGeneratingReceipt}
                onClick={handleDownloadReceipt}
                style={{ borderColor: 'var(--gold-400)', color: 'var(--gold-300)' }}
              >
                <span>📄 {isOrderPaymentVerified(placedOrderDetails) ? 'Download Receipt (PDF)' : 'Download Confirmation (PDF)'}</span>
              </button>

              <a
                href={`https://wa.me/${BRAND_CONFIG?.contact?.whatsappNumber || '918978889929'}?text=${encodeURIComponent(`Hi Madhuri! I placed order ${placedOrderDetails.orderNumber} for ${placedOrderDetails.items.length} item(s). Looking forward to discussing details!`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline"
                style={{ borderColor: '#34d399', color: '#34d399' }}
              >
                <span>Chat with Madhuri on WhatsApp 💬</span>
              </a>
            </div>
          </div>
        ) : activeStep === 'checkout' ? (
          /* ==================================================================
             STEP 2: CHECKOUT VIEW
             ================================================================== */
          <div className="checkout-view reveal-on-scroll revealed">
            <div className="section-header" style={{ marginBottom: '28px' }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ marginBottom: '16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                onClick={() => setActiveStep('cart')}
              >
                ← Return to Cart
              </button>
              <div className="section-subtitle">Secure Checkout</div>
              <h2 className="section-title">
                Review & <span className="text-gradient-gold">Complete Your Order</span>
              </h2>
            </div>

            <form onSubmit={handlePlaceOrder} className="checkout-grid">
              {/* Left Column: Customer & Delivery Details */}
              <div className="checkout-form-col">
                {/* 1. Customer Details Card */}
                <div className="checkout-card">
                  <h3 className="checkout-section-title">
                    <span>👤</span> Customer Information
                  </h3>

                  <div className="checkout-fields-row">
                    <div className="checkout-field">
                      <label className="checkout-label" htmlFor="checkout-name">
                        Full Name <span className="required-star">*</span>
                      </label>
                      <input
                        type="text"
                        id="checkout-name"
                        name="name"
                        className="checkout-input"
                        placeholder="e.g. Priya Sharma"
                        value={checkoutData.name}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    <div className="checkout-field">
                      <label className="checkout-label" htmlFor="checkout-phone">
                        Phone / WhatsApp <span className="required-star">*</span>
                      </label>
                      <input
                        type="tel"
                        id="checkout-phone"
                        name="phone"
                        className="checkout-input"
                        placeholder="e.g. +91 98765 43210"
                        value={checkoutData.phone}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="checkout-field">
                    <label className="checkout-label" htmlFor="checkout-email">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="checkout-email"
                      name="email"
                      className="checkout-input"
                      placeholder="e.g. name@example.com"
                      value={checkoutData.email}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                {/* 2. Delivery & Occasion Details Card */}
                <div className="checkout-card">
                  <h3 className="checkout-section-title">
                    <span>🚚</span> Delivery & Event Details
                  </h3>

                  <div className="delivery-toggle-group">
                    <button
                      type="button"
                      className={`delivery-toggle-btn ${deliveryType === 'delivery' ? 'active' : ''}`}
                      onClick={() => {
                        setDeliveryType('delivery');
                        if (paymentMethod === 'cash_on_pickup') setPaymentMethod('cash_on_delivery');
                      }}
                    >
                      <span>🚚</span> Doorstep Delivery
                    </button>
                    <button
                      type="button"
                      className={`delivery-toggle-btn ${deliveryType === 'pickup' ? 'active' : ''}`}
                      onClick={() => {
                        setDeliveryType('pickup');
                        if (paymentMethod === 'cash_on_delivery') setPaymentMethod('cash_on_pickup');
                      }}
                    >
                      <span>🍫</span> Studio Self-Pickup
                    </button>
                  </div>

                  {deliveryType === 'delivery' && (
                    <div className="checkout-field">
                      <label className="checkout-label" htmlFor="checkout-address">
                        Delivery Address & Landmark <span className="required-star">*</span>
                      </label>
                      <textarea
                        id="checkout-address"
                        name="address"
                        className="checkout-textarea"
                        placeholder="Enter full delivery address, apartment/house number, and landmark..."
                        value={checkoutData.address}
                        onChange={handleInputChange}
                        required={deliveryType === 'delivery'}
                      />
                    </div>
                  )}

                  <div className="checkout-fields-row">
                    <div className="checkout-field">
                      <label className="checkout-label" htmlFor="checkout-date">
                        Preferred Date <span className="required-star">*</span>
                      </label>
                      <input
                        type="date"
                        id="checkout-date"
                        name="preferredDate"
                        className="checkout-input"
                        min={todayStr}
                        value={checkoutData.preferredDate}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    <div className="checkout-field">
                      <label className="checkout-label" htmlFor="checkout-occasion">
                        Occasion
                      </label>
                      <select
                        id="checkout-occasion"
                        name="occasion"
                        className="checkout-select"
                        value={checkoutData.occasion}
                        onChange={handleInputChange}
                      >
                        <option value="Birthday">Birthday</option>
                        <option value="Anniversary">Anniversary</option>
                        <option value="Wedding / Engagement">Wedding / Engagement</option>
                        <option value="Festival Celebration">Festival (Diwali, Rakhi, Christmas)</option>
                        <option value="Corporate Event">Corporate Gifting</option>
                        <option value="Baby Shower">Baby Shower</option>
                        <option value="Just Because">Just for Indulgence ❤️</option>
                      </select>
                    </div>
                  </div>

                  <div className="checkout-field">
                    <label className="checkout-label" htmlFor="checkout-customisation">
                      Customisation Details (Optional)
                    </label>
                    <textarea
                      id="checkout-customisation"
                      name="customisation"
                      className="checkout-textarea"
                      placeholder="Eggless preference, dietary notes, ribbon color, flavor specifications..."
                      value={checkoutData.customisation}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="checkout-field">
                    <label className="checkout-label" htmlFor="checkout-message">
                      Greeting Sleeve Message / Gift Note
                    </label>
                    <input
                      type="text"
                      id="checkout-message"
                      name="message"
                      className="checkout-input"
                      placeholder="e.g. Happy Birthday Priya! With lots of love."
                      value={checkoutData.message}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                {/* 3. Payment Method Card */}
                <div className="checkout-card">
                  <h3 className="checkout-section-title">
                    <span>💳</span> Payment Selection
                  </h3>

                  <div className="payment-options-list">
                    <label className={`payment-option-card ${paymentMethod === (deliveryType === 'pickup' ? 'cash_on_pickup' : 'cash_on_delivery') ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={deliveryType === 'pickup' ? 'cash_on_pickup' : 'cash_on_delivery'}
                        checked={paymentMethod === (deliveryType === 'pickup' ? 'cash_on_pickup' : 'cash_on_delivery')}
                        onChange={() => setPaymentMethod(deliveryType === 'pickup' ? 'cash_on_pickup' : 'cash_on_delivery')}
                      />
                      <div className="payment-option-info">
                        <div className="payment-option-title">
                          {deliveryType === 'pickup' ? '🍫 Cash on Pickup / Pay at Studio' : '💵 Cash on Delivery (COD) / Pay on Delivery'}
                        </div>
                        <div className="payment-option-desc">
                          {deliveryType === 'pickup'
                            ? 'Collect your handcrafted treats at our studio boutique. Settle via UPI (GPay, PhonePe, Paytm) or cash upon pickup.'
                            : 'Confirm your handcrafted order now. Settle via UPI (GPay, PhonePe, Paytm) or cash when your treats are delivered.'}
                        </div>
                      </div>
                    </label>

                    <label className={`payment-option-card ${paymentMethod === 'razorpay' ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="razorpay"
                        checked={paymentMethod === 'razorpay'}
                        onChange={() => setPaymentMethod('razorpay')}
                      />
                      <div className="payment-option-info">
                        <div className="payment-option-title">
                          ⚡ Instant Online Payment (Razorpay — UPI / Cards / Netbanking)
                        </div>
                        <div className="payment-option-desc">
                          Pay instantly and securely via Razorpay gateway. (Receipt verified instantly upon payment confirmation).
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Right Column: Sticky Order Summary */}
              <div className="checkout-summary-col">
                <div className="cart-summary-card">
                  <h3 className="cart-summary-title font-serif">Order Summary</h3>
                  <div className="summary-divider"></div>

                  <div style={{ maxHeight: '240px', overflowY: 'auto', marginBottom: '14px' }}>
                    {cartItems.map((item) => (
                      <div
                        key={item.cartItemId}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 0',
                          borderBottom: '1px dashed var(--border-subtle)',
                          fontSize: '0.88rem'
                        }}
                      >
                        <div style={{ flex: 1, paddingRight: '8px' }}>
                          <div style={{ color: 'var(--text-cream)', fontWeight: 600 }}>{item.name}</div>
                          <div style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>Qty: {item.quantity}</div>
                        </div>
                        <div style={{ color: 'var(--gold-300)', fontWeight: 700, fontFamily: 'var(--font-serif)' }}>
                          {item.price ? `₹${(item.price * item.quantity).toLocaleString('en-IN')}` : '₹0'}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="summary-row">
                    <span className="summary-label">Total Items</span>
                    <span className="summary-val">{totalItems}</span>
                  </div>

                  <div className="summary-row">
                    <span className="summary-label">Cart Subtotal</span>
                    <span className="summary-val highlight-gold">
                      ₹{numericSubtotal.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="summary-row">
                    <span className="summary-label">Fulfillment</span>
                    <span className="summary-val">
                      {deliveryType === 'delivery' ? 'Calculated at dispatch' : 'Free Self-Pickup'}
                    </span>
                  </div>

                  <div className="summary-divider"></div>

                  <div className="summary-row" style={{ fontSize: '1.1rem', marginBottom: '18px' }}>
                    <span className="summary-label" style={{ fontWeight: 700, color: 'var(--text-cream)' }}>
                      Total Payable Now
                    </span>
                    <span className="summary-val highlight-gold" style={{ fontSize: '1.4rem' }}>
                      ₹{numericSubtotal.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-gold btn-lg cart-checkout-btn"
                    disabled={isPlacingOrder || isSyncing}
                  >
                    <span>
                      {isPlacingOrder
                        ? 'Processing Order...'
                        : paymentMethod === 'razorpay'
                        ? 'Place Order & Pay via Razorpay'
                        : 'Place Order & Continue'}
                    </span>
                    <span className="btn-icon-arrow">→</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        ) : (
          /* ==================================================================
             STEP 1: SHOPPING CART VIEW
             ================================================================== */
          <div className="cart-main-view">
            {/* Section Header */}
            <div className="section-header reveal-on-scroll revealed" style={{ marginBottom: '28px' }}>
              <div className="section-subtitle">Your Selection</div>
              <h2 className="section-title" id="cart-heading">
                Your <span className="text-gradient-gold">Shopping Cart</span>
              </h2>
              <p className="section-desc">
                Review your selection and prepare something delicious.
              </p>
            </div>

            {/* Chocolate-Themed Empty Cart State (when cart has 0 items) */}
            {cartItems.length === 0 ? (
              <div className="empty-cart-box text-center reveal-on-scroll revealed">
                <div className="empty-cart-chocolate-emblem" aria-hidden="true">
                  <svg
                    width="100"
                    height="100"
                    viewBox="0 0 100 100"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    role="img"
                    aria-label="Artisan Chocolate Boutique Illustration"
                  >
                    <defs>
                      <radialGradient id="chocGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#D4A373" stopOpacity="0.32" />
                        <stop offset="65%" stopColor="#2A140D" stopOpacity="0.65" />
                        <stop offset="100%" stopColor="#140A06" stopOpacity="0.95" />
                      </radialGradient>
                      <linearGradient id="chocGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#E6C594" />
                        <stop offset="50%" stopColor="#D4A373" />
                        <stop offset="100%" stopColor="#B37D4E" />
                      </linearGradient>
                      <linearGradient id="chocBarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#5A2E1F" />
                        <stop offset="50%" stopColor="#3E1E14" />
                        <stop offset="100%" stopColor="#28130B" />
                      </linearGradient>
                      <linearGradient id="chocSquareGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#6D3826" />
                        <stop offset="100%" stopColor="#371A10" />
                      </linearGradient>
                    </defs>

                    {/* Outer Gold Medallion Ring */}
                    <circle cx="50" cy="50" r="46" fill="url(#chocGlow)" stroke="url(#chocGoldGrad)" strokeWidth="1.5" />
                    <circle cx="50" cy="50" r="41" stroke="#D4A373" strokeWidth="0.75" strokeDasharray="3 3" opacity="0.65" />

                    {/* Handcrafted Chocolate Bar */}
                    <g transform="translate(25, 24)">
                      {/* Bar Slab */}
                      <rect x="0" y="0" width="34" height="48" rx="4" fill="url(#chocBarGrad)" stroke="#7A412E" strokeWidth="0.8" />
                      {/* Embossed Chocolate Squares */}
                      <rect x="3" y="3" width="12" height="11" rx="1.5" fill="url(#chocSquareGrad)" stroke="#874C37" strokeWidth="0.5" />
                      <rect x="19" y="3" width="12" height="11" rx="1.5" fill="url(#chocSquareGrad)" stroke="#874C37" strokeWidth="0.5" />
                      <rect x="3" y="17" width="12" height="11" rx="1.5" fill="url(#chocSquareGrad)" stroke="#874C37" strokeWidth="0.5" />
                      <rect x="19" y="17" width="12" height="11" rx="1.5" fill="url(#chocSquareGrad)" stroke="#874C37" strokeWidth="0.5" />
                      <rect x="3" y="31" width="12" height="11" rx="1.5" fill="url(#chocSquareGrad)" stroke="#874C37" strokeWidth="0.5" />
                      <rect x="19" y="31" width="12" height="11" rx="1.5" fill="url(#chocSquareGrad)" stroke="#874C37" strokeWidth="0.5" />
                      {/* Luxurious Gold Wrapper Foil at Base */}
                      <path d="M0 38 Q8 36 17 38 Q26 40 34 38 L34 48 L0 48 Z" fill="url(#chocGoldGrad)" opacity="0.9" />
                    </g>

                    {/* Cocoa Pod / Cacao Bean Accent */}
                    <g transform="translate(56, 42)">
                      <path d="M6 0 C15 4 19 16 15 26 C11 34 2 36 -2 32 C-7 28 -7 18 -2 10 C1 4 4 1 6 0 Z" fill="#4A2316" stroke="url(#chocGoldGrad)" strokeWidth="1" />
                      <path d="M6 3 C9 9 10 18 6 27" stroke="#7A412E" strokeWidth="1" fill="none" />
                      <path d="M3 5 C0 11 0 20 4 29" stroke="#7A412E" strokeWidth="1" fill="none" />
                    </g>

                    {/* Warm Gold Artisan Sparkles */}
                    <path d="M22 20 L24 14 L26 20 L32 22 L26 24 L24 30 L22 24 L16 22 Z" fill="url(#chocGoldGrad)" />
                    <path d="M72 24 L73.5 19 L75 24 L80 25.5 L75 27 L73.5 32 L72 27 L67 25.5 Z" fill="url(#chocGoldGrad)" />
                    <circle cx="28" cy="74" r="1.5" fill="#E6C594" />
                    <circle cx="76" cy="68" r="1.5" fill="#E6C594" />
                  </svg>
                </div>
                <h3 className="empty-cart-title font-serif">
                  Your Cart Awaits Something Sweet
                </h3>
                <p className="empty-cart-desc">
                  Your favourite handcrafted chocolates and freshly baked treats belong here. Explore our creations and add something special to your cart.
                </p>
                <div className="empty-cart-actions">
                  <button
                    type="button"
                    className="btn btn-gold"
                    onClick={() => onNavigate && onNavigate('#chocolates')}
                  >
                    <span>Explore Chocolates</span>
                    <span className="btn-icon-arrow">→</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => onNavigate && onNavigate('#cakes-bakes')}
                  >
                    <span>Discover Cakes & Bakes</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Cart Content Grid when items exist */
              <div className="cart-content-grid">
                {/* Left: Cart Items List */}
                <div className="cart-items-col">
                  <div className="cart-items-header">
                    <span className="cart-items-count font-serif">
                      Cart Items ({cartItems.length})
                    </span>
                    <button
                      type="button"
                      className="cart-clear-btn"
                      onClick={clearCart}
                      disabled={isSyncing}
                      title="Clear all items from your cart"
                    >
                      🗑️ Clear Cart
                    </button>
                  </div>

                  <div className="cart-items-list">
                    {cartItems.map((item) => (
                      <article key={item.cartItemId} className="cart-item-card">
                        <div className="cart-item-img-box">
                          <img
                            src={item.image}
                            alt={item.name}
                            loading="lazy"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'assets/images/chocolate_truffles_box.jpg';
                            }}
                          />
                        </div>

                        <div className="cart-item-details">
                          {item.category && (
                            <div className="cart-item-category">{item.category}</div>
                          )}
                          <h3 className="cart-item-name">{item.name}</h3>

                          {/* Customisation Details tags */}
                          {(item.selectedFlavour || item.selectedOccasion) && (
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                              {item.selectedFlavour && (
                                <span
                                  style={{
                                    fontSize: '0.72rem',
                                    background: 'rgba(212, 163, 115, 0.15)',
                                    color: 'var(--gold-300)',
                                    padding: '2px 8px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border-gold)'
                                  }}
                                >
                                  Flavour: {item.selectedFlavour}
                                </span>
                              )}
                              {item.selectedOccasion && (
                                <span
                                  style={{
                                    fontSize: '0.72rem',
                                    background: 'rgba(212, 163, 115, 0.15)',
                                    color: 'var(--gold-300)',
                                    padding: '2px 8px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border-gold)'
                                  }}
                                >
                                  Occasion: {item.selectedOccasion}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Unit price */}
                          <div className="cart-item-price-row">
                            <span className="cart-price-label">Unit Price:</span>
                            <span className="cart-price-value">
                              {item.price
                                ? `₹${item.price.toLocaleString('en-IN')}`
                                : item.priceTag || '₹299'}
                            </span>
                          </div>

                          {/* Subtotal */}
                          <div className="cart-item-price-row" style={{ marginTop: '4px' }}>
                            <span className="cart-price-label">Item Subtotal:</span>
                            <span
                              className="cart-price-value"
                              style={{ color: 'var(--gold-300)', fontWeight: 700 }}
                            >
                              ₹{((item.price || 0) * item.quantity).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>

                        <div className="cart-item-actions">
                          {/* Quantity control: [ − ] 1 [ + ] */}
                          <div
                            className="cart-qty-group"
                            role="group"
                            aria-label={`Quantity for ${item.name}`}
                          >
                            <button
                              type="button"
                              className="qty-btn qty-minus"
                              onClick={() => updateQuantity(item.cartItemId, -1)}
                              disabled={isSyncing}
                              aria-label={`Decrease quantity of ${item.name}`}
                              title={item.quantity === 1 ? "Remove from cart" : "Decrease quantity"}
                            >
                              −
                            </button>
                            <span className="qty-number" aria-live="polite">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              className="qty-btn qty-plus"
                              onClick={() => updateQuantity(item.cartItemId, 1)}
                              disabled={isSyncing}
                              aria-label="Increase quantity"
                              title="Increase quantity"
                            >
                              +
                            </button>
                          </div>

                          {/* Remove button */}
                          <button
                            type="button"
                            className="cart-remove-btn"
                            onClick={() => removeFromCart(item.cartItemId)}
                            disabled={isSyncing}
                            aria-label={`Remove ${item.name} from cart`}
                            title="Remove item"
                          >
                            ✕ Remove
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                {/* Right: Cart Order Summary Box */}
                <div className="cart-summary-col">
                  <div className="cart-summary-card">
                    <h3 className="cart-summary-title font-serif">ORDER SUMMARY</h3>
                    <div className="summary-divider"></div>

                    <div className="summary-row">
                      <span className="summary-label">Total Items</span>
                      <span className="summary-val">{totalItems}</span>
                    </div>

                    <div className="summary-row">
                      <span className="summary-label">Cart Subtotal</span>
                      <span className="summary-val highlight-gold">
                        ₹{numericSubtotal.toLocaleString('en-IN')}
                      </span>
                    </div>

                    {hasPriceOnRequest && (
                      <div className="price-on-request-notice">
                        <span className="notice-icon">ℹ️</span>
                        <span className="notice-text">
                          Contains custom creations marked <strong>"Price on Request"</strong>. The final price
                          will be confirmed upon review.
                        </span>
                      </div>
                    )}

                    <div className="summary-divider"></div>

                    <div className="summary-row" style={{ fontSize: '1.05rem', marginBottom: '16px' }}>
                      <span className="summary-label" style={{ fontWeight: 700, color: 'var(--text-cream)' }}>
                        TOTAL PAYABLE
                      </span>
                      <span className="summary-val highlight-gold" style={{ fontSize: '1.35rem' }}>
                        ₹{numericSubtotal.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="cart-summary-actions">
                      <button
                        type="button"
                        className="btn btn-gold btn-lg cart-checkout-btn"
                        onClick={() => setActiveStep('checkout')}
                        disabled={cartItems.length === 0}
                      >
                        <span>Proceed to Checkout</span>
                        <span className="btn-icon-arrow">→</span>
                      </button>

                      <button
                        type="button"
                        className="btn btn-outline cart-continue-btn"
                        onClick={() => onNavigate && onNavigate('#chocolates')}
                      >
                        <span>Continue Shopping</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
