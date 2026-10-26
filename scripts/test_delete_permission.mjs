import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hwrreyawamsxdiwrprjj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Z6lQRn7IouTHkqa6gH_DAA_2BHtE0IH';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testDeletePermission() {
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'owner@test.com',
    password: 'password123'
  });

  if (authErr) {
    console.error('Owner login failed:', authErr);
    return;
  }
  console.log('Logged in as owner:', auth.user.email);

  // Check if we can delete the diagnostic test order: MCH-DIAG-01 (id: 31fe420d-a97a-41a3-ba06-9878c85bcd25)
  const diagId = '31fe420d-a97a-41a3-ba06-9878c85bcd25';
  const { data, error } = await supabase
    .from('orders')
    .delete()
    .eq('id', diagId)
    .select();

  if (error) {
    console.error('Delete error:', error);
  } else {
    console.log('Successfully deleted test order:', data);
  }
}

testDeletePermission();
