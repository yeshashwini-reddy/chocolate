-- ============================================================================
-- MADHURI'S CHOCO HEAVEN - ORDER ITEMS PERMISSIONS & RLS MIGRATION
-- Fixes: "permission denied for table order_items" (PostgreSQL 42501)
--
-- Security Model: Least-Privilege Role-Based Access Control (RBAC) + RLS
-- 1. Table Grants: Explicitly grants minimum required SQL verbs to 'authenticated'.
-- 2. Foreign Key: Ensures foreign key relationship between orders and order_items.
-- 3. Row Level Security: Enforces strict data isolation:
--    - Customers can SELECT only order_items for orders where orders.user_id = auth.uid().
--    - Customers can INSERT order_items only for orders where orders.user_id = auth.uid().
--    - Customers CANNOT UPDATE or DELETE any order_items.
--    - Admins and Owners can SELECT, INSERT, UPDATE, DELETE all order_items.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. SCHEMA USAGE PRIVILEGES
-- ----------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 2. ENSURE TABLES & COLUMNS EXIST (IDEMPOTENT)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_number TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  delivery_type TEXT DEFAULT 'delivery',
  delivery_address TEXT,
  occasion TEXT,
  product_name TEXT,
  quantity TEXT,
  preferred_date TEXT,
  customisation_details TEXT,
  special_message TEXT,
  total_amount NUMERIC(10, 2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT DEFAULT 'cash_on_delivery',
  receipt_number TEXT,
  paid_at TIMESTAMPTZ,
  payment_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price NUMERIC(10, 2) DEFAULT 0,
  price_tag TEXT,
  category TEXT,
  image_url TEXT,
  product_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all required columns exist on order_items idempotently
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
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Ensure foreign key constraint from order_items to orders exists for PostgREST joins
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

-- Performance index on order_id for fast join lookups in order history queries
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);

-- ----------------------------------------------------------------------------
-- 3. HELPER FUNCTIONS FOR SECURITY (SECURITY DEFINER)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin_or_owner()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'owner')
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'owner'
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

-- Grant execute on security helper functions
GRANT EXECUTE ON FUNCTION public.is_admin_or_owner() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_owner() TO anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 4. TABLE-LEVEL PRIVILEGES (POSTGRESQL GRANTS)
-- Must be granted explicitly; RLS cannot grant access if table privileges are denied.
-- Least-privilege: Do NOT grant ALL to authenticated or anon.
-- ----------------------------------------------------------------------------

-- Orders: Authenticated customers can SELECT, INSERT, UPDATE their own orders.
GRANT SELECT, INSERT, UPDATE ON TABLE public.orders TO authenticated;
GRANT ALL ON TABLE public.orders TO service_role;

-- Order Items: Authenticated customers can SELECT their order items and INSERT items on order creation.
-- Authenticated customers CANNOT update or delete order items.
GRANT SELECT, INSERT ON TABLE public.order_items TO authenticated;
GRANT ALL ON TABLE public.order_items TO service_role;

-- Sequences: Grant usage on all sequences so ID generation succeeds
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) ON PUBLIC.ORDERS
-- ----------------------------------------------------------------------------
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 5.1 Orders SELECT: Customers can see only their own orders; Admins/Owners see all
DROP POLICY IF EXISTS "Orders select policy" ON public.orders;
DROP POLICY IF EXISTS "Orders customer read policy" ON public.orders;
DROP POLICY IF EXISTS "Orders owner read policy" ON public.orders;

CREATE POLICY "Orders select policy" ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR public.is_admin_or_owner()
  );

-- 5.2 Orders INSERT: Authenticated customers can insert orders for their own user_id
DROP POLICY IF EXISTS "Orders insert policy" ON public.orders;
DROP POLICY IF EXISTS "Orders customer insert policy" ON public.orders;

CREATE POLICY "Orders insert policy" ON public.orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id OR public.is_admin_or_owner()
  );

-- 5.3 Orders UPDATE: Customers can update only their own order; Admins/Owners can update any
DROP POLICY IF EXISTS "Orders update policy" ON public.orders;
DROP POLICY IF EXISTS "Orders customer update policy" ON public.orders;

CREATE POLICY "Orders update policy" ON public.orders
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id OR public.is_admin_or_owner()
  )
  WITH CHECK (
    auth.uid() = user_id OR public.is_admin_or_owner()
  );

-- 5.4 Orders DELETE: Only Owner can delete orders
DROP POLICY IF EXISTS "Orders delete policy" ON public.orders;

CREATE POLICY "Orders delete policy" ON public.orders
  FOR DELETE
  TO authenticated
  USING (
    public.is_owner()
  );

-- ----------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) ON PUBLIC.ORDER_ITEMS
-- ----------------------------------------------------------------------------
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 6.1 Order Items SELECT: Customers can view line items ONLY for orders they own.
--     Owner/Admin can view all line items.
DROP POLICY IF EXISTS "Order items select policy" ON public.order_items;
DROP POLICY IF EXISTS "Order items customer read policy" ON public.order_items;

CREATE POLICY "Order items select policy" ON public.order_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND (o.user_id = auth.uid() OR public.is_admin_or_owner())
    )
  );

-- 6.2 Order Items INSERT: Customers can insert items ONLY into orders they own.
--     Owner/Admin can insert into any order.
DROP POLICY IF EXISTS "Order items insert policy" ON public.order_items;
DROP POLICY IF EXISTS "Order items customer insert policy" ON public.order_items;

CREATE POLICY "Order items insert policy" ON public.order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND (o.user_id = auth.uid() OR public.is_admin_or_owner())
    )
  );

-- 6.3 Order Items UPDATE: Only Admin/Owner can update line items for order management.
--     Customers CANNOT modify line items after order is placed.
DROP POLICY IF EXISTS "Order items modify policy" ON public.order_items;
DROP POLICY IF EXISTS "Order items update policy" ON public.order_items;

CREATE POLICY "Order items update policy" ON public.order_items
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_or_owner()
  )
  WITH CHECK (
    public.is_admin_or_owner()
  );

-- 6.4 Order Items DELETE: Only Admin/Owner can delete line items.
--     Customers CANNOT delete line items.
DROP POLICY IF EXISTS "Order items delete policy" ON public.order_items;

CREATE POLICY "Order items delete policy" ON public.order_items
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin_or_owner()
  );
