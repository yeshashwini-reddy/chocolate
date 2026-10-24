-- ============================================================================
-- MADHURI'S CHOCO HEAVEN - PREFLIGHT DIAGNOSTIC QUERIES (READ-ONLY)
-- Run this script in the Supabase SQL Editor BEFORE running any migration.
-- These queries inspect your database without modifying or deleting any data.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. IDENTIFY ORDER_ITEMS WITH NULL order_id
-- If any rows are returned, these items have no parent order.
-- ----------------------------------------------------------------------------
SELECT 
  id AS order_item_id,
  product_name,
  quantity,
  price,
  created_at
FROM public.order_items
WHERE order_id IS NULL;


-- ----------------------------------------------------------------------------
-- 2. IDENTIFY ORPHANED ORDER_ITEMS (order_id does NOT match any orders.id)
-- If any rows are returned, adding a strict foreign key would fail.
-- ----------------------------------------------------------------------------
SELECT 
  oi.id AS order_item_id,
  oi.order_id AS referenced_order_id,
  oi.product_name,
  oi.quantity,
  oi.price,
  oi.created_at
FROM public.order_items oi
LEFT JOIN public.orders o ON o.id = oi.order_id
WHERE oi.order_id IS NOT NULL 
  AND o.id IS NULL;


-- ----------------------------------------------------------------------------
-- 3. CHECK EXISTING FOREIGN KEYS BETWEEN orders AND order_items
-- Lists existing constraints so you know if a foreign key is already active.
-- ----------------------------------------------------------------------------
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name = 'order_items'
  AND ccu.table_name = 'orders';


-- ----------------------------------------------------------------------------
-- 4. VERIFY EXISTING COLUMNS IN public.orders
-- Inspects current columns in orders to confirm missing fields.
-- ----------------------------------------------------------------------------
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'orders'
ORDER BY ordinal_position;


-- ----------------------------------------------------------------------------
-- 5. VERIFY EXISTING COLUMNS IN public.order_items
-- Inspects current columns in order_items.
-- ----------------------------------------------------------------------------
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'order_items'
ORDER BY ordinal_position;


-- ----------------------------------------------------------------------------
-- 6. VERIFY EXISTING RLS POLICIES ON orders AND order_items
-- Inspects active policies on both tables.
-- ----------------------------------------------------------------------------
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('orders', 'order_items')
ORDER BY tablename, policyname;
