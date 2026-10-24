-- ============================================================================
-- MADHURI'S CHOCO HEAVEN - SUPABASE REALTIME ORDERS PUBLICATION MIGRATION
-- 
-- Purpose:
-- Enables Supabase Realtime (WebSocket push notifications) for the `public.orders`
-- table so that status changes made by the Owner are instantly broadcast to
-- the relevant customer's browser session without requiring manual refresh.
--
-- Security Guarantees:
-- 1. Row Level Security (RLS) is preserved and enforced by Supabase Realtime.
--    Realtime filters events using the existing "Orders select policy":
--    (auth.uid() = user_id OR public.is_admin_or_owner())
--    Therefore, a customer will NEVER receive another customer's order updates.
-- 2. REPLICA IDENTITY FULL ensures old and new values are present during UPDATE
--    events so Supabase can verify the row's ownership filter (user_id = auth.uid()).
-- 3. Idempotent: Can be safely executed multiple times without errors.
-- ============================================================================

-- Step 1: Ensure REPLICA IDENTITY is set to FULL on public.orders
-- This allows Supabase Realtime to evaluate RLS policies and user_id filters
-- when an UPDATE or DELETE occurs.
ALTER TABLE public.orders REPLICA IDENTITY FULL;

-- Step 2: Add public.orders to the supabase_realtime publication
-- Only adds the table if it is not already in the publication.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
END $$;

-- Step 3: Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Verification query (Read-only check):
SELECT 
  pubname AS publication_name,
  schemaname AS schema_name,
  tablename AS table_name
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' AND tablename = 'orders';
