-- ============================================================================
-- MADHURI'S CHOCO HEAVEN - CARTS & CART ITEMS SCHEMA MIGRATION
-- File: supabase-cart-migration.sql
-- Description: Idempotent migration creating customer shopping carts and items.
--              Includes referential integrity, strict customer RLS isolation,
--              and least-privilege permissions.
-- Dependencies: public.profiles, public.products
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. CARTS TABLE (Customer-Specific Active Shopping Carts)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT carts_user_id_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_carts_user_id ON public.carts(user_id);

-- ----------------------------------------------------------------------------
-- 2. CART ITEMS TABLE (Items & Customisation Selections)
-- Note: unit_price and price_tag stored here are purely for UI caching.
-- Authoritative pricing is always verified against public.products at checkout.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  product_key TEXT,
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
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON public.cart_items(product_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_item_key ON public.cart_items(cart_item_key);

-- ----------------------------------------------------------------------------
-- 3. RESOLUTION TRIGGER FOR PRODUCT IDENTIFIER
-- Automatically links product_id (UUID) if client inserts via product_key slug
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_cart_item_product_resolution()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.product_id IS NULL AND NEW.product_key IS NOT NULL THEN
    SELECT id INTO NEW.product_id 
    FROM public.products 
    WHERE product_key = NEW.product_key 
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_resolve_cart_item_product ON public.cart_items;
CREATE TRIGGER trg_resolve_cart_item_product
  BEFORE INSERT OR UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_cart_item_product_resolution();

-- ----------------------------------------------------------------------------
-- 4. UPDATED_AT TIMESTAMP TRIGGERS
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS set_carts_updated_at ON public.carts;
CREATE TRIGGER set_carts_updated_at
  BEFORE UPDATE ON public.carts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_cart_items_updated_at ON public.cart_items;
CREATE TRIGGER set_cart_items_updated_at
  BEFORE UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- 5.1 CARTS POLICIES
DROP POLICY IF EXISTS "Carts select policy" ON public.carts;
CREATE POLICY "Carts select policy" ON public.carts
  FOR SELECT 
  TO authenticated
  USING (
    auth.uid() = user_id OR public.is_admin_or_owner()
  );

DROP POLICY IF EXISTS "Carts insert policy" ON public.carts;
CREATE POLICY "Carts insert policy" ON public.carts
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
  );

DROP POLICY IF EXISTS "Carts update policy" ON public.carts;
CREATE POLICY "Carts update policy" ON public.carts
  FOR UPDATE 
  TO authenticated
  USING (
    auth.uid() = user_id OR public.is_admin_or_owner()
  ) WITH CHECK (
    auth.uid() = user_id OR public.is_admin_or_owner()
  );

DROP POLICY IF EXISTS "Carts delete policy" ON public.carts;
CREATE POLICY "Carts delete policy" ON public.carts
  FOR DELETE 
  TO authenticated
  USING (
    auth.uid() = user_id OR public.is_admin_or_owner()
  );

-- 5.2 CART ITEMS POLICIES
DROP POLICY IF EXISTS "Cart items select policy" ON public.cart_items;
CREATE POLICY "Cart items select policy" ON public.cart_items
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.carts c
      WHERE c.id = cart_items.cart_id 
        AND (c.user_id = auth.uid() OR public.is_admin_or_owner())
    )
  );

DROP POLICY IF EXISTS "Cart items insert policy" ON public.cart_items;
CREATE POLICY "Cart items insert policy" ON public.cart_items
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.carts c
      WHERE c.id = cart_items.cart_id 
        AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Cart items update policy" ON public.cart_items;
CREATE POLICY "Cart items update policy" ON public.cart_items
  FOR UPDATE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.carts c
      WHERE c.id = cart_items.cart_id 
        AND c.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.carts c
      WHERE c.id = cart_items.cart_id 
        AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Cart items delete policy" ON public.cart_items;
CREATE POLICY "Cart items delete policy" ON public.cart_items
  FOR DELETE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.carts c
      WHERE c.id = cart_items.cart_id 
        AND (c.user_id = auth.uid() OR public.is_admin_or_owner())
    )
  );

-- ----------------------------------------------------------------------------
-- 6. NARROWLY SCOPED DATABASE PERMISSIONS (LEAST PRIVILEGE)
-- ----------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.carts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.cart_items TO authenticated;

GRANT ALL ON TABLE public.carts TO service_role;
GRANT ALL ON TABLE public.cart_items TO service_role;
