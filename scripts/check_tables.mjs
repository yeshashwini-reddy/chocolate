import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hwrreyawamsxdiwrprjj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Z6lQRn7IouTHkqa6gH_DAA_2BHtE0IH';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkTables() {
  await supabase.auth.signInWithPassword({
    email: 'owner@test.com',
    password: 'password123'
  });

  const tables = ['orders', 'order_items', 'profiles', 'products', 'receipts', 'custom_orders', 'enquiries', 'categories'];
  for (const t of tables) {
    const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`Table '${t}': Error/Not accessible (${error.message})`);
    } else {
      console.log(`Table '${t}': Found with ${count} records.`);
    }
  }
}

checkTables();
