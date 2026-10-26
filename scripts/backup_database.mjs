import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = 'https://hwrreyawamsxdiwrprjj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Z6lQRn7IouTHkqa6gH_DAA_2BHtE0IH';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createBackup() {
  await supabase.auth.signInWithPassword({
    email: 'owner@test.com',
    password: 'password123'
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.resolve('backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // 1. Orders
  const { data: orders, error: ordersErr } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: true });

  // 2. Order Items
  const { data: orderItems, error: itemsErr } = await supabase
    .from('order_items')
    .select('*')
    .order('created_at', { ascending: true });

  // 3. Profiles
  const { data: profiles, error: profilesErr } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true });

  // 4. Products
  const { data: products, error: productsErr } = await supabase
    .from('products')
    .select('*')
    .order('name', { ascending: true });

  const backupData = {
    backup_created_at: new Date().toISOString(),
    counts: {
      orders: orders?.length || 0,
      order_items: orderItems?.length || 0,
      profiles: profiles?.length || 0,
      products: products?.length || 0
    },
    orders: orders || [],
    order_items: orderItems || [],
    profiles: profiles || [],
    products: products || []
  };

  const backupPath = path.join(backupDir, `launch_pre_cleanup_backup_${timestamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf-8');
  console.log(`Backup successfully created at: ${backupPath}`);
  console.log('Record counts:', backupData.counts);
}

createBackup();
