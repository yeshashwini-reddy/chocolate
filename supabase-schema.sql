-- ==========================================================================
-- MADHURI'S CHOCO HEAVEN - SUPABASE DATABASE SCHEMA & RLS POLICIES
-- Run this entire script in the Supabase SQL Editor to set up tables,
-- triggers, RLS security policies, and seed product data.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. PROFILES TABLE (Customer & Staff Directory)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'owner')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- --------------------------------------------------------------------------
-- 2. PRODUCTS TABLE (Chocolate & Cake Catalogue)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_key TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) DEFAULT 0,
  price_tag TEXT DEFAULT 'Price on Request',
  category TEXT NOT NULL,
  category_label TEXT,
  image_url TEXT,
  tags TEXT[],
  available BOOLEAN DEFAULT true,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_available ON public.products(available);

-- --------------------------------------------------------------------------
-- 3. ORDERS TABLE (Customer Orders & Custom Celebration Enquiries)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  total_amount NUMERIC(10, 2) DEFAULT 0,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  occasion TEXT,
  product_name TEXT,
  quantity TEXT,
  preferred_date TEXT,
  customisation_details TEXT,
  special_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

-- --------------------------------------------------------------------------
-- 4. ORDER ITEMS TABLE (Granular Line Items)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- ==========================================================================
-- HELPER FUNCTIONS FOR RLS (PREVENTS RLS INFINITE RECURSION)
-- ==========================================================================

-- Function to safely fetch user role without triggering recursive RLS on profiles
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

-- Function to check if current authenticated user is admin or owner
CREATE OR REPLACE FUNCTION public.is_admin_or_owner()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'owner')
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

-- Function to check if current authenticated user is owner
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'owner'
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

-- ==========================================================================
-- AUTOMATIC NEW USER PROFILE & CUSTOMER EMAIL STORAGE TRIGGER
-- ==========================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, role)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone', NULL),
    'user'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at timestamp trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_products_updated_at ON public.products;
CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_orders_updated_at ON public.orders;
CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------------
-- PROFILES POLICIES
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "Profiles select policy" ON public.profiles;
CREATE POLICY "Profiles select policy" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id OR public.is_admin_or_owner()
  );

DROP POLICY IF EXISTS "Profiles insert policy" ON public.profiles;
CREATE POLICY "Profiles insert policy" ON public.profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id
  );

DROP POLICY IF EXISTS "Profiles update policy" ON public.profiles;
CREATE POLICY "Profiles update policy" ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id OR public.is_admin_or_owner()
  )
  WITH CHECK (
    -- Normal users can update their profile but cannot elevate their own role
    (auth.uid() = id AND role = public.get_user_role(auth.uid()))
    OR public.is_owner()
    OR (public.is_admin_or_owner() AND role != 'owner')
  );

DROP POLICY IF EXISTS "Profiles delete policy" ON public.profiles;
CREATE POLICY "Profiles delete policy" ON public.profiles
  FOR DELETE USING (
    public.is_owner()
  );

-- --------------------------------------------------------------------------
-- PRODUCTS POLICIES
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "Products public read policy" ON public.products;
CREATE POLICY "Products public read policy" ON public.products
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Products admin/owner write policy" ON public.products;
CREATE POLICY "Products admin/owner write policy" ON public.products
  FOR ALL USING (
    public.is_admin_or_owner()
  );

-- --------------------------------------------------------------------------
-- ORDERS POLICIES
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "Orders select policy" ON public.orders;
CREATE POLICY "Orders select policy" ON public.orders
  FOR SELECT USING (
    auth.uid() = user_id OR public.is_admin_or_owner()
  );

DROP POLICY IF EXISTS "Orders insert policy" ON public.orders;
CREATE POLICY "Orders insert policy" ON public.orders
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );

DROP POLICY IF EXISTS "Orders update policy" ON public.orders;
CREATE POLICY "Orders update policy" ON public.orders
  FOR UPDATE USING (
    auth.uid() = user_id OR public.is_admin_or_owner()
  );

DROP POLICY IF EXISTS "Orders delete policy" ON public.orders;
CREATE POLICY "Orders delete policy" ON public.orders
  FOR DELETE USING (
    public.is_owner()
  );

-- --------------------------------------------------------------------------
-- ORDER ITEMS POLICIES
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "Order items select policy" ON public.order_items;
CREATE POLICY "Order items select policy" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id 
        AND (o.user_id = auth.uid() OR public.is_admin_or_owner())
    )
  );

DROP POLICY IF EXISTS "Order items insert policy" ON public.order_items;
CREATE POLICY "Order items insert policy" ON public.order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id 
        AND (o.user_id = auth.uid() OR public.is_admin_or_owner())
    )
  );

DROP POLICY IF EXISTS "Order items modify policy" ON public.order_items;
CREATE POLICY "Order items modify policy" ON public.order_items
  FOR ALL USING (
    public.is_admin_or_owner()
  );

-- ==========================================================================
-- SEED INITIAL PRODUCTS DATA
-- ==========================================================================
INSERT INTO public.products (product_key, name, category, category_label, description, price_tag, image_url, available, is_available)
VALUES
  ('dark-chocolate', 'Dark Chocolate', 'chocolates', 'Classic Chocolates', 'Rich handcrafted dark chocolate made for those who love a deeper cocoa experience.', 'Price on Request', 'assets/images/chocolates/dark-chocolate.jpg', true, true),
  ('milk-chocolate', 'Milk Chocolate', 'chocolates', 'Classic Chocolates', 'Smooth, creamy handcrafted milk chocolate for a classic sweet indulgence.', 'Price on Request', 'assets/images/chocolates/milk-chocolate.jpg', true, true),
  ('white-chocolate', 'White Chocolate', 'chocolates', 'Classic Chocolates', 'Delicate and creamy white chocolate crafted for a sweet, luxurious treat.', 'Price on Request', 'assets/images/chocolates/white-chocolate.jpg', true, true),
  ('dry-fruit-chocolates', 'Dry Fruit Chocolates', 'chocolates', 'Classic Chocolates', 'Handcrafted chocolates paired with delicious dry fruits for a satisfying bite.', 'Price on Request', 'assets/images/chocolates/dry-fruit-chocolate.jpg', true, true),
  ('chocolate-bars', 'Chocolate Bars', 'chocolates', 'Classic Chocolates', 'Beautifully crafted chocolate bars made for gifting or enjoying yourself.', 'Price on Request', 'assets/images/chocolates/chocolate-bars.jpg', true, true),
  ('theme-based-chocolates', 'Theme-Based Chocolates', 'chocolates', 'Customised', 'Customised chocolates designed around your celebration, theme and occasion.', 'Price on Request', 'assets/images/chocolates/theme-chocolates.jpg', true, true),
  ('corporate-orders', 'Corporate Chocolate Orders', 'chocolates', 'Customised', 'Customised chocolates featuring your company logo or branding.', 'Price on Request', 'assets/images/chocolates/corporate-chocolates.jpg', true, true),
  ('chocolate-bouquets', 'Chocolate Bouquets', 'chocolates', 'Gifting', 'A beautiful bouquet-style arrangement made with delicious chocolates.', 'Price on Request', 'assets/images/chocolates/chocolate-bouquet.jpg', true, true),
  ('celebration-cake', 'Custom Celebration Cakes', 'cakes', 'Cakes & Bakes', 'Multi-layered moist chocolate sponge dressed in velvety chocolate ganache and fresh berries.', 'Price on Request', 'assets/images/celebration_cake.jpg', true, true),
  ('gourmet-cupcakes', 'Signature Gourmet Cupcakes', 'cakes', 'Cakes & Bakes', 'Fluffy vanilla and chocolate cupcakes swirled with decadent chocolate buttercream.', 'Price on Request', 'assets/images/cupcakes_muffins.jpg', true, true),
  ('fudgy-brownies', 'Rich Fudgy Chocolate Brownies', 'cakes', 'Cakes & Bakes', 'Decadently dense chocolate brownies made with pure dark chocolate and optional walnuts.', 'Price on Request', 'assets/images/fudgy_brownies_cookies.jpg', true, true),
  ('plum-cake', 'Traditional Rich Spiced Plum Cake', 'cakes', 'Cakes & Bakes', 'A rich dark festive fruitcake loaded with premium dry fruits and warm spices.', 'Price on Request', 'assets/images/festive_plum_cake.jpg', true, true)
ON CONFLICT (product_key) DO NOTHING;

-- ==========================================================================
-- TEST ACCOUNTS ROLE PROMOTION INSTRUCTIONS
-- To assign roles to test users created via Supabase Signup:
-- 
-- 1. Create accounts via the website signup form:
--    - user@test.com
--    - admin@test.com
--    - owner@test.com
-- 
-- 2. Run the SQL below to elevate roles:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@test.com';
-- UPDATE public.profiles SET role = 'owner' WHERE email = 'owner@test.com';
-- ==========================================================================
