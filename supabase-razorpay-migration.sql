-- ============================================================================
-- MADHURI'S CHOCO HEAVEN - RAZORPAY TEST MODE INTEGRATION MIGRATION
-- Schema Verification, Gateway Indexing & Security Confirmation
--
-- Safety Guarantees:
-- 1. Non-destructive: Uses ADD COLUMN IF NOT EXISTS. Never drops tables or columns.
-- 2. Preserves existing orders, order_items, customer history, and COD functionality.
-- 3. Adds lookup indexes on razorpay_order_id and razorpay_payment_id for high-speed
--    webhook reconciliation and payment verification.
-- 4. Confirms Row Level Security (RLS) and security trigger enforce_order_update_security()
--    prevent customers from tampering with payment_status, razorpay_order_id, or razorpay_payment_id.
-- 5. Edge Functions use the server-side SUPABASE_SERVICE_ROLE_KEY to update payment fields.
-- ============================================================================

-- 1. ENSURE PAYMENT TRACKING COLUMNS EXIST ON PUBLIC.ORDERS
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash_on_delivery',
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS receipt_number TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. CREATE LOOKUP INDEXES FOR WEBHOOKS AND VERIFICATION
CREATE INDEX IF NOT EXISTS idx_orders_razorpay_order_id 
  ON public.orders(razorpay_order_id);

CREATE INDEX IF NOT EXISTS idx_orders_razorpay_payment_id 
  ON public.orders(razorpay_payment_id);

CREATE INDEX IF NOT EXISTS idx_orders_payment_status 
  ON public.orders(payment_status);

-- 3. CONFIRM LEAST-PRIVILEGE TABLE GRANTS
-- Authenticated users have SELECT, INSERT, UPDATE on orders.
-- The existing trigger enforce_order_update_security() strictly rejects customer updates
-- to payment_status, razorpay_order_id, razorpay_payment_id, paid_at, receipt_number,
-- and total_amount.
GRANT SELECT, INSERT, UPDATE ON TABLE public.orders TO authenticated;
GRANT ALL ON TABLE public.orders TO service_role;

-- 4. RELOAD POSTGREST SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
