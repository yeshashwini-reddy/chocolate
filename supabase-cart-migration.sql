-- ==========================================================================
-- MADHURI'S CHOCO HEAVEN - CARTS, CART ITEMS & CHECKOUT SYSTEM MIGRATION
-- Run this script in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/hwrreyawamsxdiwrprjj/sql
-- ==========================================================================

-- 1. Ensure required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- --------------------------------------------------------------------------
-- 2. CARTS TABLE (Customer-Specific Active Shopping Carts)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT carts_user_id_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_carts_user_id ON public.carts(user_id);

-- --------------------------------------------------------------------------
-- 3. CART ITEMS TABLE (Individual Items & Customisation Selections)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  unit_price NUMERIC(10, 2) DEFAULT NULL,
  price_tag TEXT DEFAULT 'Price on Request',
  image_url TEXT,
  category TEXT,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  customisation_details JSONB DEFAULT '{}'::jsonb,
  cart_item_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cart_items_cart_item_unique UNIQUE (cart_id, cart_item_key)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON public.cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_item_key ON public.cart_items(cart_item_key);

-- --------------------------------------------------------------------------
-- 4. EXTEND ORDERS TABLE (Delivery Details & Payment Verification)
-- --------------------------------------------------------------------------
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS order_number TEXT,
  ADD COLUMN IF NOT EXISTS delivery_type TEXT DEFAULT 'delivery' CHECK (delivery_type IN ('delivery', 'pickup')),
  ADD COLUMN IF NOT EXISTS delivery_address TEXT,
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash_on_delivery',
  ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);

-- --------------------------------------------------------------------------
-- 5. UPDATED_AT TIMESTAMP TRIGGERS
-- --------------------------------------------------------------------------
DROP TRIGGER IF EXISTS set_carts_updated_at ON public.carts;
CREATE TRIGGER set_carts_updated_at
  BEFORE UPDATE ON public.carts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_cart_items_updated_at ON public.cart_items;
CREATE TRIGGER set_cart_items_updated_at
  BEFORE UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- --------------------------------------------------------------------------
-- 6. ENABLE ROW LEVEL SECURITY (RLS)
-- --------------------------------------------------------------------------
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------------
-- 7. RLS POLICIES FOR CARTS TABLE
-- --------------------------------------------------------------------------
-- Customers can read only their own cart; Admin/Owner can view all
DROP POLICY IF EXISTS "Carts select policy" ON public.carts;
CREATE POLICY "Carts select policy" ON public.carts
  FOR SELECT USING (
    auth.uid() = user_id OR public.is_admin_or_owner()
  );

-- Customers can insert only a cart for themselves
DROP POLICY IF EXISTS "Carts insert policy" ON public.carts;
CREATE POLICY "Carts insert policy" ON public.carts
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );

-- Customers can update only their own cart
DROP POLICY IF EXISTS "Carts update policy" ON public.carts;
CREATE POLICY "Carts update policy" ON public.carts
  FOR UPDATE USING (
    auth.uid() = user_id OR public.is_admin_or_owner()
  ) WITH CHECK (
    auth.uid() = user_id OR public.is_admin_or_owner()
  );

-- Customers can delete only their own cart
DROP POLICY IF EXISTS "Carts delete policy" ON public.carts;
CREATE POLICY "Carts delete policy" ON public.carts
  FOR DELETE USING (
    auth.uid() = user_id OR public.is_admin_or_owner()
  );

-- --------------------------------------------------------------------------
-- 8. RLS POLICIES FOR CART ITEMS TABLE
-- --------------------------------------------------------------------------
-- Read items: only if parent cart belongs to current user or admin/owner
DROP POLICY IF EXISTS "Cart items select policy" ON public.cart_items;
CREATE POLICY "Cart items select policy" ON public.cart_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.carts c
      WHERE c.id = cart_items.cart_id 
        AND (c.user_id = auth.uid() OR public.is_admin_or_owner())
    )
  );

-- Insert items: only into customer's own cart
DROP POLICY IF EXISTS "Cart items insert policy" ON public.cart_items;
CREATE POLICY "Cart items insert policy" ON public.cart_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.carts c
      WHERE c.id = cart_items.cart_id 
        AND c.user_id = auth.uid()
    )
  );

-- Update items: only items in customer's own cart
DROP POLICY IF EXISTS "Cart items update policy" ON public.cart_items;
CREATE POLICY "Cart items update policy" ON public.cart_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.carts c
      WHERE c.id = cart_items.cart_id 
        AND (c.user_id = auth.uid() OR public.is_admin_or_owner())
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.carts c
      WHERE c.id = cart_items.cart_id 
        AND (c.user_id = auth.uid() OR public.is_admin_or_owner())
    )
  );

-- Delete items: only items in customer's own cart
DROP POLICY IF EXISTS "Cart items delete policy" ON public.cart_items;
CREATE POLICY "Cart items delete policy" ON public.cart_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.carts c
      WHERE c.id = cart_items.cart_id 
        AND (c.user_id = auth.uid() OR public.is_admin_or_owner())
    )
  );

-- --------------------------------------------------------------------------
-- 9. ATOMIC DATABASE RPC FUNCTION: CREATE ORDER FROM CART
-- --------------------------------------------------------------------------
-- This guarantees atomic checkout execution: creates order, creates order_items,
-- calculates trusted totals server-side, and purges cart items in a single transaction.
CREATE OR REPLACE FUNCTION public.create_order_from_cart(
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_customer_email TEXT,
  p_delivery_type TEXT,
  p_delivery_address TEXT,
  p_preferred_date TEXT,
  p_occasion TEXT,
  p_customisation_details TEXT,
  p_special_message TEXT,
  p_payment_method TEXT DEFAULT 'cash_on_delivery'
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_cart_id UUID;
  v_order_id UUID;
  v_order_number TEXT;
  v_total_amount NUMERIC(10, 2) := 0;
  v_item_count INTEGER := 0;
  v_summary_product_names TEXT := '';
  v_item RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to place an order.';
  END IF;

  -- 1. Locate user's active cart
  SELECT id INTO v_cart_id FROM public.carts WHERE user_id = v_user_id;
  IF v_cart_id IS NULL THEN
    RAISE EXCEPTION 'Active shopping cart not found.';
  END IF;

  -- 2. Validate cart has items
  SELECT COUNT(*) INTO v_item_count FROM public.cart_items WHERE cart_id = v_cart_id;
  IF v_item_count = 0 THEN
    RAISE EXCEPTION 'Cart is empty. Please add items before placing an order.';
  END IF;

  -- 3. Calculate verified server-side total amount
  FOR v_item IN (SELECT * FROM public.cart_items WHERE cart_id = v_cart_id) LOOP
    IF v_item.unit_price IS NOT NULL AND v_item.unit_price > 0 THEN
      v_total_amount := v_total_amount + (v_item.unit_price * v_item.quantity);
    END IF;
  END LOOP;

  -- 4. Generate unique readable order reference number (e.g. MCH-782194)
  v_order_number := 'MCH-' || LPAD(FLOOR(100000 + RANDOM() * 900000)::TEXT, 6, '0');

  -- 5. Compile primary products text summary for dashboard quick view
  SELECT string_agg(product_name || ' × ' || quantity, ', ')
  INTO v_summary_product_names
  FROM public.cart_items
  WHERE cart_id = v_cart_id;

  -- 6. Insert into orders table
  INSERT INTO public.orders (
    user_id,
    order_number,
    status,
    payment_status,
    payment_method,
    total_amount,
    customer_name,
    customer_phone,
    customer_email,
    delivery_type,
    delivery_address,
    occasion,
    product_name,
    quantity,
    preferred_date,
    customisation_details,
    special_message
  ) VALUES (
    v_user_id,
    v_order_number,
    'pending',
    'pending',
    COALESCE(p_payment_method, 'cash_on_delivery'),
    v_total_amount,
    p_customer_name,
    p_customer_phone,
    p_customer_email,
    COALESCE(p_delivery_type, 'delivery'),
    p_delivery_address,
    p_occasion,
    COALESCE(v_summary_product_names, 'Handcrafted Confectionery'),
    v_item_count || ' item(s)',
    p_preferred_date,
    p_customisation_details,
    p_special_message
  )
  RETURNING id INTO v_order_id;

  -- 7. Insert line items into order_items table
  INSERT INTO public.order_items (
    order_id,
    product_name,
    quantity,
    price
  )
  SELECT
    v_order_id,
    product_name,
    quantity,
    COALESCE(unit_price, 0)
  FROM public.cart_items
  WHERE cart_id = v_cart_id;

  -- 8. Clean up customer's active cart items
  DELETE FROM public.cart_items WHERE cart_id = v_cart_id;

  -- 9. Return structured order confirmation object
  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'total_amount', v_total_amount,
    'item_count', v_item_count,
    'payment_status', 'pending',
    'status', 'pending'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- --------------------------------------------------------------------------
-- 10. GRANTS & ROLE PRIVILEGES (CRITICAL FOR POSTGREST & SUPABASE AUTH)
-- --------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated, service_role;
GRANT SELECT ON TABLE public.products TO anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO authenticated, service_role;
