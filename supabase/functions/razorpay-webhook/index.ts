// Deno/Supabase Edge Function: razorpay-webhook
// Madhuri's Choco Heaven - Asynchronous Webhook Payment Reconciliation
// Deploy using: supabase functions deploy razorpay-webhook --no-verify-jwt

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Constant-time HMAC-SHA256 signature verification over raw request body
 */
async function verifyHmacSha256(rawBody: string, secret: string, providedSignatureHex: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const sigBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
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
    console.error('[razorpay-webhook] HMAC check exception:', err);
    return false;
  }
}

serve(async (req: Request): Promise<Response> => {
  // Webhooks from Razorpay only send POST requests
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') ?? '';

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[razorpay-webhook] Missing Supabase server credentials.');
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500 });
    }

    if (!webhookSecret) {
      console.error('[razorpay-webhook] RAZORPAY_WEBHOOK_SECRET is not configured.');
      return new Response(JSON.stringify({ error: 'Webhook secret missing' }), { status: 500 });
    }

    // 1. Read the raw text body strictly BEFORE any JSON parsing
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      console.warn('[razorpay-webhook] Missing x-razorpay-signature header.');
      return new Response(JSON.stringify({ error: 'Missing webhook signature' }), { status: 400 });
    }

    // 2. Validate cryptographic signature using Web Crypto HMAC-SHA256
    const isValid = await verifyHmacSha256(rawBody, webhookSecret, signature);
    if (!isValid) {
      console.warn('[razorpay-webhook] Signature verification failed for incoming webhook.');
      return new Response(JSON.stringify({ error: 'Invalid webhook signature' }), { status: 400 });
    }

    // 3. Parse verified JSON payload
    const eventData = JSON.parse(rawBody);
    const eventType = eventData.event;
    console.log(`[razorpay-webhook] Validated incoming event: ${eventType}`);

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      },
    });

    // Extract identifiers from standard Razorpay webhook structure
    const payloadEntity = eventData.payload?.payment?.entity || eventData.payload?.order?.entity;
    const razorpayOrderId = payloadEntity?.order_id || (eventType === 'order.paid' ? payloadEntity?.id : null);
    const razorpayPaymentId = eventData.payload?.payment?.entity?.id || null;
    const supabaseOrderIdNote = payloadEntity?.notes?.supabase_order_id || null;

    if (!razorpayOrderId && !supabaseOrderIdNote) {
      console.warn('[razorpay-webhook] Event contains no resolvable order identifier:', eventType);
      return new Response(JSON.stringify({ received: true, note: 'No order identifier found' }), { status: 200 });
    }

    // 4. Find order in database
    let orderQuery = serviceClient.from('orders').select('*');
    if (supabaseOrderIdNote) {
      orderQuery = orderQuery.eq('id', supabaseOrderIdNote);
    } else {
      orderQuery = orderQuery.eq('razorpay_order_id', razorpayOrderId);
    }

    const { data: orders, error: findErr } = await orderQuery;
    if (findErr || !orders || orders.length === 0) {
      console.warn('[razorpay-webhook] No matching order found in database for:', { razorpayOrderId, supabaseOrderIdNote });
      return new Response(JSON.stringify({ received: true, note: 'Order not found' }), { status: 200 });
    }

    const order = orders[0];

    // 5. Handle payment success events: 'order.paid' or 'payment.captured'
    if (eventType === 'order.paid' || eventType === 'payment.captured') {
      // Idempotency: If already paid, do not overwrite paid_at or receipt number
      if ((order.payment_status || '').toLowerCase() === 'paid') {
        console.log(`[razorpay-webhook] Order ${order.order_number} already paid. Skipping duplicate update.`);
        return new Response(JSON.stringify({ received: true, already_paid: true }), { status: 200 });
      }

      const receiptNumber = order.receipt_number || `RCPT-${order.order_number || order.id.slice(0, 8).toUpperCase()}`;
      const paidAt = order.paid_at || new Date().toISOString();

      let updateSuccess = false;
      let lastUpdateErr: any = null;

      // A) Try dedicated atomic procedure first
      try {
        const { error: rpcErr } = await serviceClient.rpc('record_verified_razorpay_payment', {
          p_order_id: order.id,
          p_razorpay_order_id: razorpayOrderId || order.razorpay_order_id,
          p_razorpay_payment_id: razorpayPaymentId || order.payment_reference || 'RAZORPAY_WEBHOOK',
          p_receipt_number: receiptNumber,
          p_paid_at: paidAt,
        });

        if (!rpcErr) {
          updateSuccess = true;
        } else {
          lastUpdateErr = rpcErr;
          console.warn('[razorpay-webhook] RPC note, falling back to direct update:', rpcErr.message);
        }
      } catch (rpcEx: any) {
        lastUpdateErr = rpcEx;
        console.warn('[razorpay-webhook] RPC exception:', rpcEx?.message);
      }

      // B) Direct update fallback via serviceClient
      if (!updateSuccess) {
        const { error: updateErr } = await serviceClient
          .from('orders')
          .update({
            payment_status: 'paid',
            paid_at: paidAt,
            payment_reference: razorpayPaymentId || order.payment_reference || 'RAZORPAY_WEBHOOK',
            razorpay_payment_id: razorpayPaymentId || order.razorpay_payment_id,
            razorpay_order_id: razorpayOrderId || order.razorpay_order_id,
            receipt_number: receiptNumber,
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id);

        if (!updateErr) {
          updateSuccess = true;
        } else {
          lastUpdateErr = updateErr;
          console.error('[razorpay-webhook] Direct update error:', updateErr);
        }
      }

      if (!updateSuccess) {
        console.error('[razorpay-webhook] Error updating order to paid:', lastUpdateErr);
        return new Response(
          JSON.stringify({
            error: 'Database update failed',
            details: lastUpdateErr?.message || 'Update failed',
          }),
          { status: 500 }
        );
      }

      console.log(`[razorpay-webhook] Successfully reconciled order ${order.order_number} as PAID.`);
      return new Response(JSON.stringify({ received: true, reconciled: true }), { status: 200 });
    }

    // 6. Handle payment failure events
    if (eventType === 'payment.failed') {
      // Do NOT set payment_status to 'failed' if the order has already been marked 'paid'
      if ((order.payment_status || '').toLowerCase() !== 'paid') {
        await serviceClient
          .from('orders')
          .update({
            payment_status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id);
        console.log(`[razorpay-webhook] Order ${order.order_number} marked as payment_status: failed.`);
      }
      return new Response(JSON.stringify({ received: true, status: 'payment_failed_recorded' }), { status: 200 });
    }

    // Acknowledge other event types safely
    return new Response(JSON.stringify({ received: true, unhandled_event: eventType }), { status: 200 });
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : typeof err === 'string' ? err : 'Webhook processing error';
    console.error('[razorpay-webhook] Unexpected error:', err);
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
});
