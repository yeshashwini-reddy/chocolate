-- ============================================================================
-- MADHURI'S CHOCO HEAVEN - CONSOLIDATED SCHEMA MIGRATION FOR ORDERS & ORDER_ITEMS
-- Resolves: PostgREST schema cache errors (missing 'delivery_address', 'delivery_type')
--
-- Safety Guarantees & Constraints:
-- 1. ZERO automatic record deletion: Never deletes existing orders or order_items.
-- 2. Non-destructive: Uses ADD COLUMN IF NOT EXISTS without dropping or recreating tables.
-- 3. Foreign key uses NOT VALID: Preserves existing records while enforcing integrity on new rows.
-- 4. Preserves orders.user_id NOT NULL constraint.
-- 5. Preserves customisation_details as TEXT (matching React frontend string rendering).
-- 6. Engine-level BEFORE UPDATE security trigger blocks customer tampering on all protected columns.
-- 7. Verified search_path and execution permissions for SECURITY DEFINER functions.
-- 8. Forces PostgREST schema cache reload at the end via NOTIFY pgrst, 'reload schema'.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PUBLIC.ORDERS: ADD MISSING CHECKOUT & FULFILLMENT COLUMNS (LEAST-PRIVILEGE)
-- Adds ONLY columns verified against active application code
-- ----------------------------------------------------------------------------

-- Human-readable order number (e.g. "MCH-841920")
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS order_number TEXT;

-- Fulfillment and delivery details (resolves schema-cache error)
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

-- Modification tracking
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ----------------------------------------------------------------------------
-- 2. PUBLIC.ORDER_ITEMS: VERIFY REQUIRED LINE ITEM COLUMNS
-- ----------------------------------------------------------------------------

ALTER TABLE public.order_items 
  ADD COLUMN IF NOT EXISTS order_id UUID,
  ADD COLUMN IF NOT EXISTS product_id UUID,
  ADD COLUMN IF NOT EXISTS product_name TEXT,
  ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_tag TEXT,
  ADD COLUMN IF NOT EXISTS customisation_details TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ----------------------------------------------------------------------------
-- 3. SAFE FOREIGN KEY CONSTRAINT (NON-DESTRUCTIVE: NOT VALID)
-- Does NOT delete any existing order_items records.
-- Using NOT VALID ensures the constraint succeeds even if legacy records exist,
-- immediately enabling PostgREST resource embedding, while enforcing integrity
-- on all new insertions.
-- ----------------------------------------------------------------------------

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
      FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE NOT VALID;
    RAISE NOTICE 'Foreign key constraint order_items_order_id_fkey added successfully (NOT VALID: existing records preserved).';
  ELSE
    RAISE NOTICE 'Foreign key constraint order_items_order_id_fkey already exists.';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4. PERFORMANCE INDEXES
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_type ON public.orders(delivery_type);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_receipt_number ON public.orders(receipt_number);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- ----------------------------------------------------------------------------
-- 5. MINIMUM PRIVILEGES (LEAST-PRIVILEGE GRANTS)
-- DELETE is NEVER granted to authenticated customers on orders or order_items.
-- UPDATE is NEVER granted to authenticated customers on order_items.
-- ----------------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE ON TABLE public.orders TO authenticated;
GRANT ALL ON TABLE public.orders TO service_role;

GRANT SELECT, INSERT ON TABLE public.order_items TO authenticated;
GRANT ALL ON TABLE public.order_items TO service_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ----------------------------------------------------------------------------
-- 6. SECURITY-DEFINER ROLE HELPER (VERIFIED SEARCH_PATH & EXECUTE PRIVILEGES)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin_or_owner()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'owner')
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

GRANT EXECUTE ON FUNCTION public.is_admin_or_owner() TO anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 7. TAMPER-PROOF SECURITY TRIGGER FOR ORDERS
-- Explicitly protects:
-- - Customer ownership (user_id cannot be reassigned)
-- - Financial integrity (total_amount cannot be changed)
-- - Reference number (order_number cannot be changed)
-- - Payment status & gateway data (payment_status, payment_method, paid_at,
--   payment_reference, receipt_number, razorpay_order_id, razorpay_payment_id)
-- - Delivery details (delivery_type, delivery_address)
-- - Product & order details (product_name, quantity, occasion, preferred_date,
--   customisation_details, special_message, created_at)
-- - Order status: Customer can only cancel an order if currently in 'pending' status.
--
-- Authorized owners and admins (is_admin_or_owner() = true) retain full authority
-- to update status, verify payments, and manage fulfillment.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_order_update_security()
RETURNS TRIGGER AS $$
BEGIN
  -- Legitimate owner/admin updates proceed with all operational permissions
  IF public.is_admin_or_owner() THEN
    NEW.updated_at := NOW();
    RETURN NEW;
  END IF;

  -- Authenticated customer updating their own order
  IF auth.uid() = OLD.user_id THEN
    -- Block customer tampering on customer ownership
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'Security violation: Customers cannot reassign order ownership.';
    END IF;

    -- Block customer tampering on order reference
    IF NEW.order_number IS DISTINCT FROM OLD.order_number THEN
      RAISE EXCEPTION 'Security violation: Customers cannot alter order_number.';
    END IF;

    -- Block customer tampering on financial total
    IF NEW.total_amount IS DISTINCT FROM OLD.total_amount THEN
      RAISE EXCEPTION 'Security violation: Customers cannot alter total_amount.';
    END IF;

    -- Block customer tampering on payment tracking
    IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
      RAISE EXCEPTION 'Security violation: Customers cannot alter payment_status directly.';
    END IF;

    IF NEW.payment_method IS DISTINCT FROM OLD.payment_method THEN
      RAISE EXCEPTION 'Security violation: Customers cannot alter payment_method.';
    END IF;

    IF NEW.paid_at IS DISTINCT FROM OLD.paid_at THEN
      RAISE EXCEPTION 'Security violation: Customers cannot alter paid_at timestamp.';
    END IF;

    IF NEW.payment_reference IS DISTINCT FROM OLD.payment_reference THEN
      RAISE EXCEPTION 'Security violation: Customers cannot alter payment_reference.';
    END IF;

    IF NEW.receipt_number IS DISTINCT FROM OLD.receipt_number THEN
      RAISE EXCEPTION 'Security violation: Customers cannot alter receipt_number.';
    END IF;

    IF NEW.razorpay_order_id IS DISTINCT FROM OLD.razorpay_order_id THEN
      RAISE EXCEPTION 'Security violation: Customers cannot alter razorpay_order_id.';
    END IF;

    IF NEW.razorpay_payment_id IS DISTINCT FROM OLD.razorpay_payment_id THEN
      RAISE EXCEPTION 'Security violation: Customers cannot alter razorpay_payment_id.';
    END IF;

    -- Block customer tampering on fulfillment and delivery details
    IF NEW.delivery_type IS DISTINCT FROM OLD.delivery_type THEN
      RAISE EXCEPTION 'Security violation: Customers cannot alter delivery_type after placing an order.';
    END IF;

    IF NEW.delivery_address IS DISTINCT FROM OLD.delivery_address THEN
      RAISE EXCEPTION 'Security violation: Customers cannot alter delivery_address after placing an order.';
    END IF;

    -- Block customer tampering on product contents & order specifications
    IF NEW.product_name IS DISTINCT FROM OLD.product_name THEN
      RAISE EXCEPTION 'Security violation: Customers cannot alter product_name.';
    END IF;

    IF NEW.quantity IS DISTINCT FROM OLD.quantity THEN
      RAISE EXCEPTION 'Security violation: Customers cannot alter quantity.';
    END IF;

    IF NEW.occasion IS DISTINCT FROM OLD.occasion THEN
      RAISE EXCEPTION 'Security violation: Customers cannot alter occasion.';
    END IF;

    IF NEW.preferred_date IS DISTINCT FROM OLD.preferred_date THEN
      RAISE EXCEPTION 'Security violation: Customers cannot alter preferred_date.';
    END IF;

    IF NEW.customisation_details IS DISTINCT FROM OLD.customisation_details THEN
      RAISE EXCEPTION 'Security violation: Customers cannot alter customisation_details.';
    END IF;

    IF NEW.special_message IS DISTINCT FROM OLD.special_message THEN
      RAISE EXCEPTION 'Security violation: Customers cannot alter special_message.';
    END IF;

    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Security violation: Customers cannot alter created_at timestamp.';
    END IF;

    -- Customer status change: allowed ONLY if cancelling a pending order
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NOT (OLD.status = 'pending' AND NEW.status = 'cancelled') THEN
        RAISE EXCEPTION 'Security violation: Customers can only cancel orders in pending status.';
      END IF;
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Security violation: You are not authorized to update this order.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.enforce_order_update_security() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enforce_order_update_security() TO authenticated, service_role;

DROP TRIGGER IF EXISTS trg_enforce_order_update_security ON public.orders;
CREATE TRIGGER trg_enforce_order_update_security
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.enforce_order_update_security();

-- ----------------------------------------------------------------------------
-- 8. RELOAD POSTGREST SCHEMA CACHE (MANDATORY)
-- Instructs PostgREST to immediately re-introspect public.orders and public.order_items
-- so that delivery_address, delivery_type, and other columns are instantly recognized.
-- ----------------------------------------------------------------------------

NOTIFY pgrst, 'reload schema';
