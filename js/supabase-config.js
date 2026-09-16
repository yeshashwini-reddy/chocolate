/**
 * MADHURI'S CHOCO HEAVEN - SUPABASE CONFIGURATION & CLIENT INITIALIZATION
 * 
 * Replace SUPABASE_URL and SUPABASE_ANON_KEY with your project credentials
 * from your Supabase Dashboard: https://supabase.com/dashboard/project/_/settings/api
 */

(function () {
  'use strict';

  // REPLACE THESE WITH YOUR REAL SUPABASE CREDENTIALS
  const SUPABASE_URL = "https://xyzcompany.supabase.co"; // e.g. "https://your-project.supabase.co"
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5emNvbXBhbnkiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoyMDAwMDAwMDAwfQ.placeholder_key"; // e.g. "eyJhbG..."

  let client = null;

  const isConfigured = function () {
    return (
      SUPABASE_URL &&
      SUPABASE_ANON_KEY &&
      !SUPABASE_URL.includes("xyzcompany.supabase.co") &&
      !SUPABASE_ANON_KEY.includes("placeholder_key")
    );
  };

  if (typeof window.supabase !== 'undefined') {
    try {
      client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
    } catch (e) {
      console.warn("Supabase client initialization warning:", e);
    }
  }

  window.MCH_SUPABASE = {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
    client: client,
    isConfigured: isConfigured
  };
})();
