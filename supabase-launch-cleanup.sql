-- ==============================================================================
-- MADHURI'S CHOCO HEAVEN - OFFICIAL LAUNCH CLEANUP SCRIPT
-- Project Dashboard URL: https://supabase.com/dashboard/project/hwrreyawamsxdiwrprjj/sql
--
-- SAFETY & PRESERVATION GUARANTEES:
-- 1. All 12 catalogue products are 100% PRESERVED.
-- 2. All 9 profiles (including chocolate.project.mail@gmail.com, owner@test.com,
--    admin@test.com, and customer accounts) are 100% PRESERVED.
-- 3. Razorpay credentials, Webhooks, and Edge Functions are untouched.
-- 4. Complete backup of all deleted test data is archived at:
--    backups/launch_pre_cleanup_backup_2026-10-26T16-25-02-781Z.json
-- ==============================================================================

BEGIN;

-- 1. Verification of Pre-Cleanup State
DO $$
DECLARE
  v_order_count INT;
BEGIN
  SELECT count(*) INTO v_order_count FROM public.orders;
  RAISE NOTICE 'Pre-cleanup orders count: %', v_order_count;
END $$;

-- 2. Remove any lingering line items associated with test orders
DELETE FROM public.order_items
WHERE order_id IN (
  SELECT id FROM public.orders 
  WHERE order_number LIKE 'MCH-TEST-%'
     OR order_number = 'MCH-DIAG-01'
     OR customer_email IN ('yeshaswinireddy32@gmail.com', 'admin@test.com')
     OR customer_name = 'Diag'
);

-- 3. Delete the 23 confirmed development/testing orders
DELETE FROM public.orders
WHERE order_number LIKE 'MCH-TEST-%'
   OR order_number = 'MCH-DIAG-01'
   OR customer_email IN ('yeshaswinireddy32@gmail.com', 'admin@test.com')
   OR customer_name = 'Diag';

-- 4. Verification Check: Confirm orders count is now 0
DO $$
DECLARE
  v_post_orders INT;
  v_prod_count INT;
  v_profile_count INT;
BEGIN
  SELECT count(*) INTO v_post_orders FROM public.orders;
  SELECT count(*) INTO v_prod_count FROM public.products;
  SELECT count(*) INTO v_profile_count FROM public.profiles;

  RAISE NOTICE 'Post-cleanup orders count: % (Expected: 0)', v_post_orders;
  RAISE NOTICE 'Preserved products count: % (Expected: 12)', v_prod_count;
  RAISE NOTICE 'Preserved customer profiles count: % (Expected: 9)', v_profile_count;

  IF v_post_orders > 0 THEN
    RAISE EXCEPTION 'Warning: Some unconfirmed orders remain. Please inspect manually.';
  END IF;
END $$;

COMMIT;

-- 5. Notify PostgREST schema cache to reload
NOTIFY pgrst, 'reload schema';
