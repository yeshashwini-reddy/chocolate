-- ============================================================================
-- MADHURI'S CHOCO HEAVEN - RECEIPT & PAYMENT VERIFICATION MIGRATION
-- Adds receipt tracking fields to the public.orders table idempotently.
-- ============================================================================

-- 1. Add receipt and payment verification timestamp columns if not already present
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS receipt_number TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_reference TEXT;

-- 2. Indexes for fast lookup by receipt number and payment status
CREATE INDEX IF NOT EXISTS idx_orders_receipt_number ON public.orders(receipt_number);
CREATE INDEX IF NOT EXISTS idx_orders_paid_at ON public.orders(paid_at);

-- 3. Idempotent backfill: populate unique receipt numbers for any existing paid orders
UPDATE public.orders
SET 
  receipt_number = 'RCPT-' || COALESCE(order_number, UPPER(SUBSTRING(id::text FROM 1 FOR 8))),
  paid_at = COALESCE(paid_at, updated_at, created_at, NOW())
WHERE payment_status = 'paid' AND (receipt_number IS NULL OR receipt_number = '');
