/**
 * MADHURI'S CHOCO HEAVEN - PAYMENT SERVICE
 * 
 * Secure Payment Gateway Integration Architecture (Razorpay).
 * 
 * Security Principles:
 * 1. Secret keys (RAZORPAY_KEY_SECRET) NEVER exist in frontend code.
 * 2. Only public Key ID (VITE_RAZORPAY_KEY_ID) may be used client-side for modal rendering.
 * 3. Payment amounts are calculated and validated from trusted database records.
 * 4. Signatures (razorpay_signature) must be verified server-side via HMAC SHA256.
 * 5. Orders are NEVER marked as paid solely from client-side success callbacks.
 */

const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

export function isRazorpayConfigured() {
  const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID;
  return Boolean(keyId && keyId.trim().length > 0 && !keyId.includes('YOUR_'));
}

export function getRazorpayKeyId() {
  return import.meta.env.VITE_RAZORPAY_KEY_ID || '';
}

/**
 * Dynamically load Razorpay standard checkout SDK
 */
export function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.querySelector(`script[src="${RAZORPAY_SCRIPT_URL}"]`);
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.warn('[PaymentService] Failed to load Razorpay SDK');
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

/**
 * Open Razorpay Checkout modal
 */
export async function openRazorpayCheckout({
  orderNumber,
  razorpayOrderId,
  amountInRupees,
  customerName,
  customerEmail,
  customerPhone,
  onSuccess,
  onFailure,
  onDismiss
}) {
  const isLoaded = await loadRazorpayScript();
  if (!isLoaded || !window.Razorpay) {
    if (onFailure) {
      onFailure(new Error('Unable to initialize payment gateway. Please try Cash on Delivery or contact us directly.'));
    }
    return;
  }

  const keyId = getRazorpayKeyId();
  if (!keyId) {
    if (onFailure) {
      onFailure(new Error('Razorpay public key not configured in environment variables.'));
    }
    return;
  }

  const amountInPaise = Math.round(Number(amountInRupees) * 100);

  const options = {
    key: keyId,
    amount: amountInPaise,
    currency: 'INR',
    name: "Madhuri's Choco Heaven",
    description: `Order ${orderNumber} - Handcrafted Chocolates & Bakes`,
    image: '/assets/images/logo.png',
    order_id: razorpayOrderId || undefined,
    handler: function (response) {
      // response contains razorpay_payment_id, razorpay_order_id, razorpay_signature
      if (onSuccess) {
        onSuccess(response);
      }
    },
    prefill: {
      name: customerName || '',
      email: customerEmail || '',
      contact: customerPhone || ''
    },
    theme: {
      color: '#d4a373'
    },
    modal: {
      ondismiss: function () {
        if (onDismiss) onDismiss();
      }
    }
  };

  try {
    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', function (response) {
      if (onFailure) onFailure(response.error);
    });
    rzp.open();
  } catch (err) {
    if (onFailure) onFailure(err);
  }
}
