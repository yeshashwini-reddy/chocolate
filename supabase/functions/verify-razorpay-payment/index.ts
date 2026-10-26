// Deno/Supabase Edge Function: verify-razorpay-payment
// Madhuri's Choco Heaven - Cryptographically Verified Server-Side Payment Verification
// Deploy using: supabase functions deploy verify-razorpay-payment

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * Constant-time HMAC-SHA256 signature verification using Web Crypto API
 */
async function verifyHmacSha256(text: string, secret: string, providedSignatureHex: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const sigBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(text));
    const hashArray = Array.from(new Uint8Array(sigBuffer));
    const expectedHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    const cleanExpected = expectedHex.toLowerCase().trim();
    const cleanProvided = (providedSignatureHex || '').toLowerCase().trim();

    if (cleanExpected.length !== cleanProvided.length) {
      return false;
    }

    let diff = 0;
    for (let i = 0; i < cleanExpected.length; i++) {
      diff |= cleanExpected.charCodeAt(i) ^ cleanProvided.charCodeAt(i);
    }
    return diff === 0;
  } catch (err) {
    console.error('[verify-razorpay-payment] Crypto error during HMAC check:', err);
    return false;
  }
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID') ?? '';
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET') ?? '';

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase server configuration is missing.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!razorpayKeySecret) {
      return new Response(
        JSON.stringify({ error: 'Server payment secret not configured.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      },
    });

    // 1. Authenticate caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await authClient.auth.getUser();
    if (userErr || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Session is invalid or expired.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Parse payload
    const payload = await req.json().catch(() => ({}));
    const orderId = payload.orderId || payload.order_id || payload.id;
    const orderNumber = payload.orderNumber || payload.order_number;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = payload;

    if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return new Response(
        JSON.stringify({ error: 'Missing required Razorpay payment verification parameters.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isUuid = Boolean(
      typeof orderId === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)
    );

    // 3. Query order securely (authClient first, serviceClient fallback)
    let order: any = null;
    let queryError: any = null;

    try {
      let query = authClient
        .from('orders')
        .select('id, user_id, order_number, total_amount, payment_status, receipt_number, razorpay_order_id, paid_at');

      if (isUuid) {
        query = query.eq('id', orderId);
      } else if (orderNumber) {
        query = query.eq('order_number', orderNumber);
      } else {
        query = query.eq('order_number', orderId);
      }

      const { data, error } = await query.maybeSingle();
      if (!error && data) {
        order = data;
      } else if (error) {
        queryError = error;
      }
    } catch (e: any) {
      queryError = e;
    }

    if (!order) {
      try {
        let query = serviceClient
          .from('orders')
          .select('id, user_id, order_number, total_amount, payment_status, receipt_number, razorpay_order_id, paid_at');

        if (isUuid) {
          query = query.eq('id', orderId);
        } else if (orderNumber) {
          query = query.eq('order_number', orderNumber);
        } else {
          query = query.eq('order_number', orderId);
        }

        const { data, error } = await query.maybeSingle();
        if (!error && data) {
          order = data;
          queryError = null;
        } else if (error) {
          queryError = error;
        }
      } catch (e: any) {
        queryError = e;
      }
    }

    if (!order) {
      return new Response(
        JSON.stringify({
          error: 'Order not found in database.',
          details: queryError ? queryError.message : 'No order matching provided ID or number.',
          searchedId: orderId,
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Verify caller authorization: Caller must own this order or be an authorized owner/admin
    let isAuthorized = order.user_id === user.id;
    if (!isAuthorized) {
      const { data: profile } = await authClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (profile && (profile.role === 'admin' || profile.role === 'owner')) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: 'Access denied: You are not authorized to verify this order.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Cross-check Razorpay Order ID against stored record
    if (order.razorpay_order_id && order.razorpay_order_id !== razorpay_order_id) {
      console.warn(`[verify-razorpay-payment] Order ID mismatch. Stored: ${order.razorpay_order_id}, Received: ${razorpay_order_id}`);
      return new Response(
        JSON.stringify({ error: 'Razorpay order ID does not match the initial order registration.', verified: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Idempotency check: If already paid, return success without mutating record or timestamps
    if ((order.payment_status || '').toLowerCase() === 'paid') {
      return new Response(
        JSON.stringify({
          verified: true,
          payment_status: 'paid',
          already_processed: true,
          receipt_number: order.receipt_number,
          paid_at: order.paid_at,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. Verify HMAC-SHA256 signature
    const textToSign = `${razorpay_order_id}|${razorpay_payment_id}`;
    const isValidSignature = await verifyHmacSha256(textToSign, razorpayKeySecret, razorpay_signature);

    if (!isValidSignature) {
      console.warn(`[verify-razorpay-payment] Invalid signature received for order ${order.order_number}`);
      // NOTE: Reject without mutating the order to failed to prevent malicious denial-of-service on orders
      return new Response(
        JSON.stringify({ error: 'Cryptographic signature verification failed.', verified: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 8. Server-Side Direct Verification with Razorpay API (Double-Validation)
    // Independently validate payment ID, Razorpay order ID, payment status, amount, and currency
    const rzpAuth = 'Basic ' + btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
    const rzpPayRes = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
      method: 'GET',
      headers: { Authorization: rzpAuth },
    });

    if (!rzpPayRes.ok) {
      const errBody: any = await rzpPayRes.json().catch(() => ({}));
      console.error('[verify-razorpay-payment] Razorpay payment fetch failed:', errBody);
      return new Response(
        JSON.stringify({
          error: 'Unable to verify payment with Razorpay gateway. Payment reference was not found or is invalid.',
          details: errBody?.error?.description || 'Gateway lookup failed',
          verified: false,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rzpPayment: any = await rzpPayRes.json();

    // A) Confirm payment status is either 'captured' or 'authorized'
    if (rzpPayment.status !== 'captured' && rzpPayment.status !== 'authorized') {
      return new Response(
        JSON.stringify({
          error: `Payment is not settled. Current gateway status is '${rzpPayment.status}'.`,
          payment_status: rzpPayment.status,
          verified: false,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // B) Confirm Razorpay Order ID matches exactly
    if (!rzpPayment.order_id || rzpPayment.order_id !== razorpay_order_id) {
      return new Response(
        JSON.stringify({
          error: 'Security mismatch: Razorpay payment is not associated with this order ID.',
          verified: false,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // C) Confirm currency is INR
    if (rzpPayment.currency && rzpPayment.currency !== 'INR') {
      return new Response(
        JSON.stringify({
          error: `Payment currency mismatch. Expected INR but received ${rzpPayment.currency}.`,
          verified: false,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // D) Confirm amount matches database total in paise exactly
    const expectedPaise = Math.round(Number(order.total_amount) * 100);
    if (Number(rzpPayment.amount) !== expectedPaise) {
      return new Response(
        JSON.stringify({
          error: `Payment amount mismatch. Expected ₹${Number(order.total_amount).toFixed(2)} (${expectedPaise} paise) but gateway received ₹${(Number(rzpPayment.amount) / 100).toFixed(2)}.`,
          verified: false,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 9. Mark order as paid: Keep fulfilment status untouched!
    const receiptNumber = order.receipt_number || `RCPT-${order.order_number || order.id.slice(0, 8).toUpperCase()}`;
    const paidAtTimestamp = order.paid_at || new Date().toISOString();

    let updateSuccess = false;
    let lastError: any = null;

    // A) Try dedicated atomic procedure first
    try {
      const { error: rpcErr } = await serviceClient.rpc('record_verified_razorpay_payment', {
        p_order_id: order.id,
        p_razorpay_order_id: razorpay_order_id,
        p_razorpay_payment_id: razorpay_payment_id,
        p_receipt_number: receiptNumber,
        p_paid_at: paidAtTimestamp,
      });

      if (!rpcErr) {
        updateSuccess = true;
      } else {
        lastError = rpcErr;
        console.warn('[verify-razorpay-payment] RPC note, falling back to direct update:', rpcErr.message);
      }
    } catch (rpcEx: any) {
      lastError = rpcEx;
      console.warn('[verify-razorpay-payment] RPC exception:', rpcEx?.message);
    }

    // B) Direct update fallback via serviceClient
    if (!updateSuccess) {
      const { error: updateErr } = await serviceClient
        .from('orders')
        .update({
          payment_status: 'paid',
          paid_at: paidAtTimestamp,
          payment_reference: razorpay_payment_id,
          razorpay_payment_id: razorpay_payment_id,
          razorpay_order_id: razorpay_order_id,
          receipt_number: receiptNumber,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (!updateErr) {
        updateSuccess = true;
      } else {
        lastError = updateErr;
        console.error('[verify-razorpay-payment] Direct update error:', updateErr);
      }
    }

    if (!updateSuccess) {
      console.error('[verify-razorpay-payment] Failed to record payment confirmation:', lastError);
      return new Response(
        JSON.stringify({
          error: 'Failed to record payment confirmation in database.',
          details: lastError?.message || 'Database rejected order update. Please apply the payment verification migration.',
          code: lastError?.code || 'DB_UPDATE_ERROR',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        verified: true,
        payment_status: 'paid',
        receipt_number: receiptNumber,
        paid_at: paidAtTimestamp,
        payment_reference: razorpay_payment_id,
        order_id: order.id,
        order_number: order.order_number,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : typeof error === 'string' ? error : 'Verification failed.';
    console.error('[verify-razorpay-payment] Unexpected exception:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
