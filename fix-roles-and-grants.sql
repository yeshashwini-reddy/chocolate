-- ==========================================================================
-- MADHURI'S CHOCO HEAVEN - SUPABASE PERMISSIONS & ROLES MIGRATION
-- Run this entire script in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/hwrreyawamsxdiwrprjj/sql
-- ==========================================================================

-- 1. Grant table, sequence and routine privileges to Supabase roles
-- (Fixes PostgreSQL 42501 permission denied errors so RLS policies can take effect)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated, service_role;
GRANT SELECT ON TABLE public.products TO anon;

-- Ensure future tables also inherit these permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO authenticated, service_role;

-- 2. Elevate demo accounts in public.profiles to their authoritative roles
UPDATE public.profiles 
SET role = 'admin', updated_at = NOW() 
WHERE email = 'admin@test.com';

UPDATE public.profiles 
SET role = 'owner', updated_at = NOW() 
WHERE email = 'owner@test.com';

-- 3. Optional: Add payment_status column to orders table if payment tracking is desired
-- (Currently the schema does not have payment_status, so paid statistics are not computed)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' 
CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));

-- 4. Verification Check: View the updated roles for demo accounts
SELECT id, full_name, email, role, updated_at 
FROM public.profiles 
WHERE email IN ('admin@test.com', 'owner@test.com', 'user@test.com');
