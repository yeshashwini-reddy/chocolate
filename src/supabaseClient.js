import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hwrreyawamsxdiwrprjj.supabase.co';
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

if (!supabasePublishableKey) {
  console.warn(
    '[Supabase] VITE_SUPABASE_PUBLISHABLE_KEY is not defined in .env.local. Please check your environment variables.'
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);