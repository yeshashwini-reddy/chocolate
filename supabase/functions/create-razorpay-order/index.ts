// Deno/Supabase Edge Function: create-razorpay-order
// Madhuri's Choco Heaven - Secure Server-Side Razorpay Order Creation
// Deploy using: supabase functions deploy create-razorpay-order

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

    // Check required environment configuration
    if (!supabaseUrl) {
      return new Response(
        JSON.stringify({ error: 'Supabase URL is missing on server.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!razorpayKeyId || !razorpayKeySecret) {
      return new Response(
        JSON.stringify({
          error: 'Razorpay credentials not configured in server secrets.',
          hasKeyId: Boolean(razorpayKeyId),
          hasKeySecret: Boolean(razorpayKeySecret),
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Authenticate caller using their bearer token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: { user }, error: userErr } = await authClient.auth.getUser();
    if (userErr || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid or expired session.', details: userErr?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Parse payload - accept orderId and optional orderNumber
    const payload = await req.json().catch(() => ({}));
    const orderId = payload.orderId || payload.order_id || payload.id;
    const orderNumber = payload.orderNumber || payload.order_number;

    if (!orderId && !orderNumber) {
      return new Response(
        JSON.stringify({ error: 'A valid orderId or orderNumber is required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isUuid = Boolean(
      typeof orderId === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)
    );

    // 3. Query order securely
    // Strategy:
    // A) First try authClient (direct RLS for authenticated customer or owner)
    // B) If not found, try serviceClient with serviceRoleKey if available
    let order: any = null;
    let queryError: any = null;

    // A) Try querying with authClient (customer's own authenticated RLS session)
    try {
      let query = authClient
        .from('orders')
        .select('id, user_id, order_number, total_amount, payment_status, payment_method, razorpay_order_id, customer_email, customer_name');

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

    // B) Fallback: Try querying with serviceClient
    if (!order && serviceRoleKey) {
      try {
        const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: {
            headers: {
              apikey: serviceRoleKey,
              Authorization: `Bearer ${serviceRoleKey}`,
            },
          },
        });

        let query = serviceClient
          .from('orders')
          .select('id, user_id, order_number, total_amount, payment_status, payment_method, razorpay_order_id, customer_email, customer_name');

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
      console.error('[create-razorpay-order] Order query failure:', { orderId, orderNumber, queryError });
      return new Response(
        JSON.stringify({
          error: 'Order not found in database.',
          details: queryError ? queryError.message : 'No order matching the provided order ID or order number.',
          searchedId: orderId,
          searchedNumber: orderNumber,
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Verify caller authorization: Caller must be the order owner OR have an authorized owner/admin profile
    let isAuthorized = order.user_id === user.id;
    if (!isAuthorized) {
      // Check admin/owner role in profiles
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
        JSON.stringify({ error: 'Access denied: You are not authorized to pay for this order.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Prevent duplicate payments on already paid orders
    if ((order.payment_status || '').toLowerCase() === 'paid') {
      return new Response(
        JSON.stringify({ error: 'This order is already marked as paid.', payment_status: 'paid' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Validate trusted total amount from database
    const totalAmount = Number(order.total_amount);
    if (isNaN(totalAmount) || totalAmount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid order amount. Amount must be greater than zero.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const amountInPaise = Math.round(totalAmount * 100);
    const rzpBasicAuth = 'Basic ' + btoa(`${razorpayKeyId}:${razorpayKeySecret}`);

    // 7. Check if a Razorpay order was already generated for this order (prevent duplicate orders on retry)
    if (order.razorpay_order_id) {
      try {
        const checkRes = await fetch(`https://api.razorpay.com/v1/orders/${order.razorpay_order_id}`, {
          method: 'GET',
          headers: { Authorization: rzpBasicAuth },
        });

        if (checkRes.ok) {
          const existingRzp = await checkRes.json();
          // If the existing order is still open and matches the exact amount, safely reuse it
          if (
            (existingRzp.status === 'created' || existingRzp.status === 'attempted') &&
            existingRzp.amount === amountInPaise
          ) {
            return new Response(
              JSON.stringify({
                razorpay_order_id: existingRzp.id,
                amount: existingRzp.amount,
                currency: existingRzp.currency,
                order_number: order.order_number,
                key_id: razorpayKeyId,
                reused: true,
              }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      } catch (checkErr) {
        console.warn('[create-razorpay-order] Note checking existing order:', checkErr);
      }
    }

    // 8. Create a new official order via Razorpay Orders API
    const receiptId = (order.order_number || `rcpt_${order.id.replace(/-/g, '').slice(0, 10)}`).slice(0, 40);
    const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': rzpBasicAuth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt: receiptId,
        notes: {
          supabase_order_id: order.id,
          order_number: order.order_number || '',
          customer_email: order.customer_email || user.email || '',
          customer_name: order.customer_name || '',
        },
      }),
    });

    if (!rzpRes.ok) {
      const errBody: any = await rzpRes.json().catch(() => ({}));
      console.error('[create-razorpay-order] Razorpay API error:', errBody);
      return new Response(
        JSON.stringify({
          error: errBody.error?.description || 'Failed to create order with Razorpay.',
          code: errBody.error?.code || 'RAZORPAY_ERROR',
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rzpData: any = await rzpRes.json();

    // 9. Persist razorpay_order_id in orders table
    // Try serviceClient first, fallback to authClient
    let updateSuccess = false;
    if (serviceRoleKey) {
      try {
        const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: {
            headers: {
              apikey: serviceRoleKey,
              Authorization: `Bearer ${serviceRoleKey}`,
            },
          },
        });
        const { error: sUpdateErr } = await serviceClient
          .from('orders')
          .update({
            razorpay_order_id: rzpData.id,
            payment_method: 'Online Payment (Razorpay)',
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id);

        if (!sUpdateErr) updateSuccess = true;
      } catch (_) {}
    }

    if (!updateSuccess) {
      try {
        await authClient
          .from('orders')
          .update({
            razorpay_order_id: rzpData.id,
            payment_method: 'Online Payment (Razorpay)',
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id);
      } catch (err: any) {
        console.warn('[create-razorpay-order] Note updating razorpay_order_id:', err?.message);
      }
    }

    return new Response(
      JSON.stringify({
        razorpay_order_id: rzpData.id,
        amount: rzpData.amount,
        currency: rzpData.currency,
        order_number: order.order_number,
        key_id: razorpayKeyId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : typeof error === 'string' ? error : 'Internal server error';
    console.error('[create-razorpay-order] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
