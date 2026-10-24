-- ============================================================================
-- MADHURI'S CHOCO HEAVEN - CONSOLIDATED SCHEMA MIGRATION FOR ORDERS & ORDER_ITEMS
-- Resolves: PostgREST schema cache errors (e.g. missing 'delivery_address', 'delivery_type')
--
-- Safety Guarantees:
-- 1. Non-destructive: Uses ADD COLUMN IF NOT EXISTS without dropping any tables or columns.
-- 2. Preserves all existing orders, order_items, customer data, and relationships.
-- 3. Does not modify or replace existing RLS policies or helper functions.
-- 4. Reloads PostgREST schema cache at the end via NOTIFY pgrst, 'reload schema'.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PUBLIC.ORDERS: ADD MISSING CHECKOUT & FULFILLMENT COLUMNS
-- ----------------------------------------------------------------------------

-- Allow user_id to be NULL so guest custom orders / unauthenticated checkouts do not fail
ALTER TABLE public.orders 
  ALTER COLUMN user_id DROP NOT NULL;

-- Order identification and reference
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS order_number TEXT;

-- Fulfillment and delivery columns (resolves schema-cache error)
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS delivery_type TEXT DEFAULT 'delivery',
  ADD COLUMN IF NOT EXISTS delivery_address TEXT;

-- Payment tracking and receipts
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash_on_delivery',
  ADD COLUMN IF NOT EXISTS receipt_number TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;

-- Operational and custom enquiry tracking columns
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS decision_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS owner_response TEXT,
  ADD COLUMN IF NOT EXISTS quoted_price NUMERIC(10, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS quote_status TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS quote_responded_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS guest_access_token TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ----------------------------------------------------------------------------
-- 2. PUBLIC.ORDER_ITEMS: VERIFY & ADD GRANULAR LINE ITEM COLUMNS
-- ----------------------------------------------------------------------------

ALTER TABLE public.order_items 
  ADD COLUMN IF NOT EXISTS order_id UUID,
  ADD COLUMN IF NOT EXISTS product_id UUID,
  ADD COLUMN IF NOT EXISTS product_name TEXT,
  ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_tag TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS product_key TEXT,
  ADD COLUMN IF NOT EXISTS customisation_details JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Ensure foreign key constraint exists for PostgREST resource embedding
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'order_items_order_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'order_items'
  ) THEN
    ALTER TABLE public.order_items 
      ADD CONSTRAINT order_items_order_id_fkey 
      FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. PERFORMANCE INDEXES
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_type ON public.orders(delivery_type);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_receipt_number ON public.orders(receipt_number);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_key ON public.order_items(product_key);

-- ----------------------------------------------------------------------------
-- 4. PRIVILEGES: ENSURE REQUIRED COLUMNS & SEQUENCES ARE ACCESSIBLE
-- ----------------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.orders TO authenticated;
GRANT ALL ON TABLE public.orders TO service_role;

GRANT SELECT, INSERT ON TABLE public.order_items TO authenticated;
GRANT ALL ON TABLE public.order_items TO service_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ----------------------------------------------------------------------------
-- 5. RELOAD POSTGREST SCHEMA CACHE (CRITICAL)
-- Forces PostgREST to immediately re-introspect public.orders and public.order_items
-- so that newly added columns are instantly recognized by the API without server restart.
-- ----------------------------------------------------------------------------

NOTIFY pgrst, 'reload schema';
