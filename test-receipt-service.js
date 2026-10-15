/**
 * Comprehensive Automated Test Suite for Secure Receipt & Order Confirmation System
 */

import {
  formatRupees,
  isOrderPaymentVerified,
  getPaymentMethodDisplay,
  getPaymentStatusDisplay,
  generateReceiptPdf,
  downloadReceiptPdf
} from './src/services/receiptService.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n--- STARTING RECEIPT & CONFIRMATION TEST SUITE ---\n');

  // TEST 1: Currency Formatting & Font-Safe Indian Rupee
  console.log('Test Group 1: Currency Formatting');
  const formatted1 = formatRupees(299);
  const formatted2 = formatRupees(1299.5);
  const formatted3 = formatRupees(12999);
  assert(formatted1 === 'Rs. 299.00', `299 formats to "Rs. 299.00" (got "${formatted1}")`);
  assert(formatted2 === 'Rs. 1,299.50', `1299.5 formats to "Rs. 1,299.50" (got "${formatted2}")`);
  assert(formatted3 === 'Rs. 12,999.00', `12999 formats to "Rs. 12,999.00" (got "${formatted3}")`);
  assert(!formatted1.includes('\u20B9'), 'Does not use unencoded Unicode glyph that renders broken boxes in standard PDF fonts');

  // TEST 2: Payment Verification Gate
  console.log('\nTest Group 2: Payment Status Verification Gate');
  const paidOrder = { order_number: 'ORD-101', payment_status: 'paid' };
  const pendingCodOrder = { order_number: 'ORD-102', payment_status: 'pending', payment_method: 'cash_on_delivery', delivery_type: 'delivery' };
  const pendingPickupOrder = { order_number: 'ORD-103', payment_status: 'pending', payment_method: 'cash_on_pickup', delivery_type: 'pickup' };
  const failedOrder = { order_number: 'ORD-104', payment_status: 'failed', payment_method: 'razorpay' };
  const refundedOrder = { order_number: 'ORD-105', payment_status: 'refunded' };

  assert(isOrderPaymentVerified(paidOrder) === true, 'Paid order is verified');
  assert(isOrderPaymentVerified(pendingCodOrder) === false, 'Pending COD order is NOT verified as paid');
  assert(isOrderPaymentVerified(pendingPickupOrder) === false, 'Pending Pickup order is NOT verified as paid');
  assert(isOrderPaymentVerified(failedOrder) === false, 'Failed order is NOT verified as paid');
  assert(isOrderPaymentVerified(refundedOrder) === false, 'Refunded order is NOT verified as paid');

  // TEST 3: Payment Method and Status Human-Readable Resolvers
  console.log('\nTest Group 3: Method and Status Text Display');
  assert(getPaymentMethodDisplay(pendingCodOrder) === 'Cash on Delivery', 'Resolves COD method');
  assert(getPaymentMethodDisplay(pendingPickupOrder) === 'Cash on Pickup', 'Resolves Cash on Pickup method');
  assert(getPaymentMethodDisplay({ payment_method: 'razorpay' }) === 'Online Payment (Razorpay)', 'Resolves Razorpay method');

  assert(getPaymentStatusDisplay(pendingCodOrder) === 'Pending — Payment Due on Delivery', 'COD displays Pending Due on Delivery');
  assert(getPaymentStatusDisplay(pendingPickupOrder) === 'Pending — Payment Due on Pickup', 'Pickup displays Pending Due on Pickup');
  assert(getPaymentStatusDisplay(paidOrder) === 'Paid', 'Paid order displays "Paid"');
  assert(getPaymentStatusDisplay(failedOrder) === 'Failed — Payment Unsuccessful', 'Failed payment displays Failed status');

  // TEST 4: Verified Paid Order Document Generation
  console.log('\nTest Group 4: PDF Generation for Verified Paid Order');
  const verifiedOrderData = {
    order_number: 'MCH-ORD-8823',
    receipt_number: 'RCPT-MCH-ORD-8823',
    customer_name: 'Priya Sharma',
    customer_email: 'priya.sharma@example.com',
    customer_phone: '+91 98765 43210',
    delivery_type: 'delivery',
    delivery_address: 'Flat 402, Sunshine Towers, Bangalore 560034',
    occasion: 'Anniversary',
    preferred_date: '2026-10-20',
    payment_status: 'paid',
    payment_method: 'Online Payment (Razorpay)',
    razorpay_payment_id: 'pay_P189xK894726',
    created_at: new Date().toISOString(),
    paid_at: new Date().toISOString(),
    total_amount: 1498,
    items: [
      { name: 'Dark Truffle Assortment Box', quantity: 2, price: 549 },
      { name: 'Artisan Hazelnut Praline Bar', quantity: 1, price: 400 }
    ],
    customisation_details: 'Golden ribbon gift box with custom message card'
  };

  const paidDoc = await generateReceiptPdf(verifiedOrderData);
  assert(paidDoc !== null, 'jsPDF instance for paid order generated');
  assert(paidDoc.getNumberOfPages() >= 1, `Paid receipt has valid page count: ${paidDoc.getNumberOfPages()}`);

  // TEST 5: Unpaid Order Document Generation (Order Confirmation)
  console.log('\nTest Group 5: PDF Generation for Unpaid COD / Pickup Order');
  const pendingOrderData = {
    ...verifiedOrderData,
    order_number: 'MCH-COD-4412',
    receipt_number: 'CONF-MCH-COD-4412',
    payment_status: 'pending',
    payment_method: 'Cash on Delivery',
    paid_at: null
  };

  const confDoc = await generateReceiptPdf(pendingOrderData);
  assert(confDoc !== null, 'jsPDF instance for order confirmation generated');
  assert(confDoc.getNumberOfPages() >= 1, `Order confirmation has valid page count: ${confDoc.getNumberOfPages()}`);

  // TEST 6: Multi-page Pagination for Long Orders
  console.log('\nTest Group 6: Pagination for Long Orders');
  const longItems = [];
  for (let i = 1; i <= 25; i++) {
    longItems.push({
      name: `Artisan Gourmet Chocolate Batch #${i} - Single Origin Ecuadorian Cocoa`,
      quantity: 1,
      price: 250
    });
  }

  const longOrderData = {
    ...verifiedOrderData,
    order_number: 'MCH-LONG-9999',
    receipt_number: 'RCPT-MCH-LONG-9999',
    total_amount: 6250,
    items: longItems
  };

  const multiPageDoc = await generateReceiptPdf(longOrderData);
  assert(multiPageDoc.getNumberOfPages() > 1, `Long item order correctly paginated to multiple pages (total: ${multiPageDoc.getNumberOfPages()} pages)`);

  console.log(`\n========================================`);
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests().catch((e) => {
  console.error('Test suite runner failed:', e);
  process.exit(1);
});
