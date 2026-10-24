-- ==========================================================================
-- MADHURI'S CHOCO HEAVEN - OWNER DASHBOARD & PRODUCTS MIGRATION
-- Run this script in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/hwrreyawamsxdiwrprjj/sql
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. CRITICAL POSTGRESQL PRIVILEGES & SCHEMA GRANTS
-- Fixes PostgreSQL error 42501 (permission denied for table products / order_items)
-- --------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated, service_role;
GRANT SELECT ON TABLE public.products TO anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO authenticated, service_role;

-- --------------------------------------------------------------------------
-- 2. ENSURE PRODUCTS TABLE COLUMNS & CONSTRAINTS
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

-- Ensure all required columns exist even if table was created with partial schema
ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS product_key TEXT,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_tag TEXT DEFAULT 'Price on Request',
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS category_label TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[],
  ADD COLUMN IF NOT EXISTS available BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create unique index on product_key if not exists
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_product_key_unique ON public.products(product_key);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_available ON public.products(available);
CREATE INDEX IF NOT EXISTS idx_products_is_available ON public.products(is_available);

-- --------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS) POLICIES FOR PRODUCTS
-- --------------------------------------------------------------------------
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Products public read policy" ON public.products;
DROP POLICY IF EXISTS "Products select policy" ON public.products;
CREATE POLICY "Products public read policy" ON public.products
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Products admin/owner write policy" ON public.products;
DROP POLICY IF EXISTS "Products owner insert policy" ON public.products;
CREATE POLICY "Products owner insert policy" ON public.products
  FOR INSERT WITH CHECK (public.is_admin_or_owner());

DROP POLICY IF EXISTS "Products owner update policy" ON public.products;
CREATE POLICY "Products owner update policy" ON public.products
  FOR UPDATE USING (public.is_admin_or_owner())
  WITH CHECK (public.is_admin_or_owner());

DROP POLICY IF EXISTS "Products owner delete policy" ON public.products;
CREATE POLICY "Products owner delete policy" ON public.products
  FOR DELETE USING (public.is_admin_or_owner());

-- --------------------------------------------------------------------------
-- 4. MIGRATE & SEED REAL CATALOGUE PRICES FROM BRAND CONFIGURATION
-- Updates existing rows with matching product_key and inserts missing items
-- --------------------------------------------------------------------------
INSERT INTO public.products (
  product_key, name, description, price, price_tag, 
  category, category_label, image_url, tags, available, is_available
)
VALUES
  -- Handcrafted Chocolates
  (
    'dark-chocolate',
    'Dark Chocolate',
    'Rich handcrafted dark chocolate made for those who love a deeper cocoa experience.',
    299.00,
    '₹299',
    'classic',
    'Classic Chocolates',
    'assets/images/chocolates/dark-chocolate.jpg',
    ARRAY['Pure Cocoa', 'Deep Cocoa'],
    true,
    true
  ),
  (
    'milk-chocolate',
    'Milk Chocolate',
    'Smooth, creamy handcrafted milk chocolate for a classic sweet indulgence.',
    249.00,
    '₹249',
    'classic',
    'Classic Chocolates',
    'assets/images/chocolates/milk-chocolate.jpg',
    ARRAY['Smooth & Creamy', 'Classic Sweet'],
    true,
    true
  ),
  (
    'white-chocolate',
    'White Chocolate',
    'Delicate and creamy white chocolate crafted for a sweet, luxurious treat.',
    279.00,
    '₹279',
    'classic',
    'Classic Chocolates',
    'assets/images/chocolates/white-chocolate.jpg',
    ARRAY['Velvety Ivory', 'Luxurious Treat'],
    true,
    true
  ),
  (
    'dry-fruit-chocolates',
    'Dry Fruit Chocolates',
    'Handcrafted chocolates paired with delicious dry fruits for a satisfying bite.',
    349.00,
    '₹349',
    'classic',
    'Classic Chocolates',
    'assets/images/chocolates/dry-fruit-chocolate.jpg',
    ARRAY['Roasted Dry Fruits', 'Nutty Crunch'],
    true,
    true
  ),
  (
    'chocolate-bars',
    'Chocolate Bars',
    'Beautifully crafted chocolate bars made for gifting or enjoying yourself.',
    229.00,
    '₹229',
    'classic',
    'Classic Chocolates',
    'assets/images/chocolates/chocolate-bars.jpg',
    ARRAY['Artisanal Slabs', 'Gourmet Bars'],
    true,
    true
  ),
  (
    'theme-based-chocolates',
    'Theme-Based Chocolates — Customisation',
    'Customised chocolates designed around your celebration, theme and occasion.',
    499.00,
    '₹499',
    'customised',
    'Customised',
    'assets/images/chocolates/theme-chocolates.jpg',
    ARRAY['Personalised', 'Custom Celebration'],
    true,
    true
  ),
  (
    'corporate-orders',
    'Corporate Chocolate Orders',
    'Customised chocolates featuring your company logo or branding, perfect for corporate gifting and special events.',
    599.00,
    '₹599',
    'customised',
    'Customised',
    'assets/images/chocolates/corporate-chocolates.jpg',
    ARRAY['Company Branding', 'Executive Gifting'],
    true,
    true
  ),
  (
    'chocolate-bouquets',
    'Chocolate Bouquets',
    'A beautiful bouquet-style arrangement made with delicious chocolates.',
    799.00,
    '₹799',
    'gifting',
    'Gifting',
    'assets/images/chocolates/chocolate-bouquet.jpg',
    ARRAY['Decorative Arrangement', 'Celebration Gift'],
    true,
    true
  ),
  (
    'dates-almonds-chocolates',
    'Dates & Almonds Chocolates',
    'A handcrafted combination of dates, almonds and chocolate.',
    399.00,
    '₹399',
    'specialty',
    'Specialty',
    'assets/images/chocolates/dates-almond-chocolates.jpg',
    ARRAY['Stuffed Dates', 'Whole Almonds'],
    true,
    true
  ),
  (
    'bounty-bars',
    'Bounty Bars',
    'Chocolate treats inspired by the classic coconut-and-chocolate combination.',
    269.00,
    '₹269',
    'specialty',
    'Specialty',
    'assets/images/chocolates/bounty-bars.jpg',
    ARRAY['Moist Coconut', 'Classic Pair'],
    true,
    true
  ),
  (
    'tutti-fruity-white-chocolates',
    'Tutti Fruity White Chocolates',
    'Creamy white chocolates combined with colourful tutti-fruity pieces.',
    289.00,
    '₹289',
    'specialty',
    'Specialty',
    'assets/images/chocolates/tutti-fruity-white-chocolate.jpg',
    ARRAY['Colourful Gems', 'Creamy White'],
    true,
    true
  ),
  (
    'wine-shaped-chocolates',
    'Wine-Shaped Chocolates',
    'Creative chocolates crafted in elegant wine-inspired shapes.',
    449.00,
    '₹449',
    'specialty',
    'Specialty',
    'assets/images/chocolates/wine-shaped-chocolates.jpg',
    ARRAY['Novelty Shapes', 'Gourmet Confection'],
    true,
    true
  ),
  (
    'occasion-hampers',
    'Occasion Hampers',
    'Thoughtfully arranged chocolate hampers created for special occasions and celebrations.',
    899.00,
    '₹899',
    'gifting',
    'Gifting',
    'assets/images/chocolates/occasion-hampers.jpg',
    ARRAY['Curated Box', 'Grand Hampers'],
    true,
    true
  ),
  (
    'flavoured-chocolates',
    'Flavoured Chocolates',
    'Explore handcrafted chocolates in a selection of delicious flavours.',
    329.00,
    '₹329',
    'flavoured',
    'Flavoured',
    'assets/images/chocolates/flavoured-chocolates.jpg',
    ARRAY['6 Artisan Flavours', 'Select Your Flavour'],
    true,
    true
  ),

  -- Cakes & Artisan Bakes
  (
    'celebration-cake',
    'Custom Celebration Cakes',
    'Multi-layered moist chocolate sponge dressed in velvety chocolate ganache, edible gold leaf, fresh berries, and macarons.',
    799.00,
    '₹799',
    'cakes',
    'Cakes & Bakes',
    'https://www.recipetineats.com/uploads/2023/11/Mini-chocolate-cakes_2.jpg',
    ARRAY['Centrepiece', 'Custom Design'],
    true,
    true
  ),
  (
    'gourmet-cupcakes',
    'Signature Gourmet Cupcakes',
    'Fluffy vanilla and chocolate cupcakes swirled with decadent chocolate buttercream and delicate chocolate curls.',
    249.00,
    '₹249',
    'cupcakes',
    'Cakes & Bakes',
    'assets/images/cupcakes_muffins.jpg',
    ARRAY['Box of 6 / 12', 'Party Favours'],
    true,
    true
  ),
  (
    'bakery-muffins',
    'Bakery Muffins',
    'Wholesome, moist golden muffins bursting with juicy blueberries and dark chocolate chunks with a crunchy sugar crust.',
    199.00,
    '₹199',
    'cupcakes',
    'Cakes & Bakes',
    'assets/images/cupcakes_muffins.jpg',
    ARRAY['Breakfast Delight', 'Blueberry & Choc'],
    true,
    true
  ),
  (
    'fudgy-brownies',
    'Fudgy Brownies',
    'Decadently dense, crackly topped chocolate brownies made with pure melted dark chocolate and optional roasted walnuts.',
    299.00,
    '₹299',
    'brownies',
    'Cakes & Bakes',
    'assets/images/fudgy_brownies_cookies.jpg',
    ARRAY['Super Fudgy', 'Best Seller'],
    true,
    true
  ),
  (
    'sea-salt-cookies',
    'Artisan Cookies',
    'Crisp golden edges with soft, chewy chocolate centers topped with flaky sea salt for an exquisite balance of sweet and savory.',
    299.00,
    '₹299',
    'cookies',
    'Cakes & Bakes',
    'assets/images/fudgy_brownies_cookies.jpg',
    ARRAY['Crisp & Chewy', 'Sea Salt'],
    true,
    true
  ),
  (
    'plum-cake',
    'Spiced Plum Cake',
    'A rich dark festive fruitcake loaded with soaked premium dry fruits, candied peel, and warm spices, dusted with snowy sugar.',
    499.00,
    '₹499',
    'plum-cake',
    'Cakes & Bakes',
    'assets/images/festive_plum_cake.jpg',
    ARRAY['Festive Special', 'Heritage Recipe'],
    true,
    true
  )
ON CONFLICT (product_key) DO UPDATE SET
  price = CASE 
    WHEN public.products.price = 0 OR public.products.price IS NULL THEN EXCLUDED.price 
    ELSE public.products.price 
  END,
  price_tag = CASE 
    WHEN public.products.price_tag = 'Price on Request' OR public.products.price_tag IS NULL THEN EXCLUDED.price_tag 
    ELSE public.products.price_tag 
  END,
  category = COALESCE(public.products.category, EXCLUDED.category),
  category_label = COALESCE(public.products.category_label, EXCLUDED.category_label),
  description = COALESCE(public.products.description, EXCLUDED.description),
  image_url = COALESCE(public.products.image_url, EXCLUDED.image_url),
  tags = COALESCE(public.products.tags, EXCLUDED.tags),
  updated_at = NOW();

-- --------------------------------------------------------------------------
-- 5. VERIFICATION QUERY: View verified products
-- --------------------------------------------------------------------------
SELECT product_key, name, category, price, price_tag, available, is_available 
FROM public.products 
ORDER BY category, name;
