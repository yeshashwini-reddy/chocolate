// Deno/Supabase Edge Function: verify-razorpay-payment
// Deploy using: supabase functions deploy verify-razorpay-payment
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { HmacSha256 } from 'https://deno.land/std@0.160.0/hash/sha256.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Used only in secure server environment
    );

    const {
      orderId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = await req.json();

    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!keySecret) {
      return new Response(JSON.stringify({ error: 'Server key secret missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify HMAC-SHA256 signature
    const textToSign = `${razorpay_order_id}|${razorpay_payment_id}`;
    const hmac = new HmacSha256(keySecret);
    hmac.update(textToSign);
    const generatedSignature = hmac.hex();

    if (generatedSignature !== razorpay_signature) {
      // Signature mismatch
      await supabaseClient
        .from('orders')
        .update({ payment_status: 'failed' })
        .eq('id', orderId);

      return new Response(JSON.stringify({ error: 'Signature verification failed', verified: false }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verified! Update order payment status securely on the database
    const { error: updateErr } = await supabaseClient
      .from('orders')
      .update({
        payment_status: 'paid',
        status: 'processing',
        razorpay_order_id,
        razorpay_payment_id
      })
      .eq('id', orderId);

    if (updateErr) {
      throw updateErr;
    }

    return new Response(JSON.stringify({ verified: true, payment_status: 'paid' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
