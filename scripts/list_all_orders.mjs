import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hwrreyawamsxdiwrprjj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Z6lQRn7IouTHkqa6gH_DAA_2BHtE0IH';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function listAll() {
  await supabase.auth.signInWithPassword({
    email: 'owner@test.com',
    password: 'password123'
  });

  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  console.log(`TOTAL_ORDERS_COUNT: ${orders?.length}`);

  orders.forEach((o, i) => {
    console.log(`[${i + 1}] ID: ${o.id} | Order#: ${o.order_number} | Customer: ${o.customer_name} (${o.customer_email}) | Phone: ${o.customer_phone} | Date: ${o.created_at} | Items: ${o.product_name} | Amount: ₹${o.total_amount} | Status: ${o.status} | PayStatus: ${o.payment_status} | Method: ${o.payment_method} | RzpOrd: ${o.razorpay_order_id || 'none'}`);
  });
}

listAll();
