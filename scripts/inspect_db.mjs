import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hwrreyawamsxdiwrprjj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Z6lQRn7IouTHkqa6gH_DAA_2BHtE0IH';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function inspectWithAuth() {
  console.log('--- SIGNING IN TO INSPECT DATABASE ---');
  
  // Try logging in as owner@test.com
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'owner@test.com',
    password: 'password123'
  });

  if (authErr) {
    console.error('Owner auth error:', authErr);
    // Try admin@test.com
    const { data: adminAuth, error: adminErr } = await supabase.auth.signInWithPassword({
      email: 'admin@test.com',
      password: 'password123'
    });
    if (adminErr) {
      console.error('Admin auth error:', adminErr);
      return;
    } else {
      console.log('Signed in as admin:', adminAuth.user.email, adminAuth.user.id);
    }
  } else {
    console.log('Signed in as owner:', authData.user.email, authData.user.id);
  }

  // 1. Fetch orders
  const { data: orders, error: ordersErr } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (ordersErr) {
    console.error('Orders error:', ordersErr);
  } else {
    console.log(`Total orders found: ${orders?.length || 0}`);
    console.log(JSON.stringify(orders, null, 2));
  }

  // 2. Fetch order items
  const { data: items, error: itemsErr } = await supabase
    .from('order_items')
    .select('*');

  if (itemsErr) {
    console.error('Order items error:', itemsErr);
  } else {
    console.log(`Total order_items found: ${items?.length || 0}`);
    console.log(JSON.stringify(items, null, 2));
  }

  // 3. Fetch profiles
  const { data: profiles, error: profilesErr } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (profilesErr) {
    console.error('Profiles error:', profilesErr);
  } else {
    console.log(`Total profiles found: ${profiles?.length || 0}`);
    console.log(JSON.stringify(profiles, null, 2));
  }
}

inspectWithAuth();
