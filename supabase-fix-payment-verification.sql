-- ============================================================================
-- MADHURI'S CHOCO HEAVEN - PAYMENT VERIFICATION & SERVICE ROLE SECURITY MIGRATION
-- File: supabase-fix-payment-verification.sql
--
-- PURPOSE:
-- Resolves PostgreSQL Error 42501 ("permission denied for table orders")
-- encountered by the Edge Function `verify-razorpay-payment` when updating
-- public.orders after a successful Razorpay payment.
--
-- SECURITY ARCHITECTURE & DEFENSE-IN-DEPTH:
-- 1. Strict Least-Privilege Grants:
--    - Granted SELECT, UPDATE to `service_role` only. No DELETE privilege is granted.
--    - No additional privileges are granted to `anon` or `authenticated`.
-- 2. Restrictive Function Execution (Issue 1):
--    - EXECUTE on `record_verified_razorpay_payment` is granted EXCLUSIVELY to `service_role`.
--    - REVOKE ALL explicitly removes EXECUTE from PUBLIC, anon, and authenticated.
--    - Ordinary authenticated customers CANNOT invoke this procedure from browser dev tools.
-- 3. Strict Order & Gateway Validation (Issue 2):
--    - Validates target order existence and locks row (FOR UPDATE).
--    - Strictly checks that the target order's registered `razorpay_order_id` matches
--      the verified `p_razorpay_order_id`. Prevents associating unrelated payments.
-- 4. Idempotency & Tamper-Proof Protections (Issues 3 & 5):
--    - Re-entrant requests for already-paid orders return the confirmed record safely.
--    - Preserves all customer tamper protections via the BEFORE UPDATE trigger.
--    - Preserves customer order cancellation rules (pending orders only).
--    - Preserves Row Level Security (RLS) on public.orders without disabling or weakening it.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. LEAST-PRIVILEGE GRANTS TO service_role (Resolves Error 42501)
-- ----------------------------------------------------------------------------

-- Allow service_role to access public schema
GRANT USAGE ON SCHEMA public TO service_role;

-- Grant table-level SELECT and UPDATE to service_role on public.orders (NO DELETE)
GRANT SELECT, UPDATE ON TABLE public.orders TO service_role;

-- Grant column-level UPDATE privileges specifically on payment-related fields
GRANT UPDATE (
  payment_status,
  payment_method,
  paid_at,
  payment_reference,
  razorpay_order_id,
  razorpay_payment_id,
  receipt_number,
  updated_at
) ON TABLE public.orders TO service_role;

-- Grant read-only access to public.order_items for receipt item verification
GRANT SELECT ON TABLE public.order_items TO service_role;

-- ----------------------------------------------------------------------------
-- 2. UPDATE is_admin_or_owner() TO RECOGNIZE service_role
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin_or_owner()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(auth.role(), auth.jwt() ->> 'role', current_setting('request.jwt.claim.role', true)) = 'service_role'
      OR current_user IN ('service_role', 'supabase_admin')
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'owner')
      );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

-- Tighten execute privileges: anon cannot execute, only authenticated and service_role
REVOKE ALL ON FUNCTION public.is_admin_or_owner() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_or_owner() TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 3. UPDATE TRIGGER FUNCTION enforce_order_update_security()
-- Preserves all customer ownership, financial total, delivery, and cancellation rules
-- while allowing trusted service_role processes to update payment fields.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_order_update_security()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Trusted server processes (service_role) or store owners/admins
  -- proceed with operational authority to update order and payment statuses:
  IF COALESCE(auth.role(), auth.jwt() ->> 'role', current_setting('request.jwt.claim.role', true)) = 'service_role'
     OR current_user IN ('service_role', 'supabase_admin')
     OR public.is_admin_or_owner() THEN
    NEW.updated_at := NOW();
    RETURN NEW;
  END IF;

  -- 2. Authenticated customer updating their own order:
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

REVOKE ALL ON FUNCTION public.enforce_order_update_security() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enforce_order_update_security() TO authenticated, service_role;

DROP TRIGGER IF EXISTS trg_enforce_order_update_security ON public.orders;
CREATE TRIGGER trg_enforce_order_update_security
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.enforce_order_update_security();

-- ----------------------------------------------------------------------------
-- 4. ATOMIC FUNCTION: record_verified_razorpay_payment
-- Strictly restricted to service_role with order & identifier cross-validation
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_verified_razorpay_payment(
  p_order_id UUID,
  p_razorpay_order_id TEXT,
  p_razorpay_payment_id TEXT,
  p_receipt_number TEXT,
  p_paid_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB AS $$
DECLARE
  v_existing RECORD;
  v_updated RECORD;
BEGIN
  -- Defense-in-Depth Role Verification: ONLY service_role (or supabase_admin)
  IF NOT (
    COALESCE(auth.role(), auth.jwt() ->> 'role', current_setting('request.jwt.claim.role', true)) = 'service_role'
    OR current_user IN ('service_role', 'supabase_admin')
  ) THEN
    RAISE EXCEPTION 'Access denied: Payment confirmation can only be executed by trusted server-side service_role.';
  END IF;

  -- Validate input parameters
  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'Invalid parameter: p_order_id cannot be null.';
  END IF;

  IF p_razorpay_order_id IS NULL OR trim(p_razorpay_order_id) = '' THEN
    RAISE EXCEPTION 'Invalid parameter: p_razorpay_order_id cannot be empty.';
  END IF;

  IF p_razorpay_payment_id IS NULL OR trim(p_razorpay_payment_id) = '' THEN
    RAISE EXCEPTION 'Invalid parameter: p_razorpay_payment_id cannot be empty.';
  END IF;

  -- Lock and retrieve the target order row
  SELECT * INTO v_existing
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order with ID % not found.', p_order_id;
  END IF;

  -- Issue 2 Validation: Ensure target order matches expected Razorpay Order ID.
  -- Cannot attach a payment to an order registered under a different Razorpay order ID.
  IF v_existing.razorpay_order_id IS NOT NULL 
     AND trim(v_existing.razorpay_order_id) <> ''
     AND v_existing.razorpay_order_id <> trim(p_razorpay_order_id) THEN
    RAISE EXCEPTION 'Security mismatch: Order % is registered with Razorpay order %, but payment verification was submitted for %.',
      v_existing.order_number, v_existing.razorpay_order_id, p_razorpay_order_id;
  END IF;

  -- Issue 5 Idempotency: If already paid, safely return current state without duplicate mutation
  IF LOWER(COALESCE(v_existing.payment_status, '')) = 'paid' THEN
    IF v_existing.razorpay_payment_id = trim(p_razorpay_payment_id)
       OR v_existing.razorpay_order_id = trim(p_razorpay_order_id) THEN
      RETURN to_jsonb(v_existing);
    ELSE
      RAISE EXCEPTION 'Order % is already marked as paid with payment reference %.',
        v_existing.order_number, v_existing.razorpay_payment_id;
    END IF;
  END IF;

  -- Update payment-related columns only
  UPDATE public.orders
  SET
    payment_status = 'paid',
    paid_at = COALESCE(v_existing.paid_at, p_paid_at, NOW()),
    payment_reference = trim(p_razorpay_payment_id),
    razorpay_payment_id = trim(p_razorpay_payment_id),
    razorpay_order_id = trim(p_razorpay_order_id),
    receipt_number = COALESCE(v_existing.receipt_number, p_receipt_number, 'RCPT-' || COALESCE(v_existing.order_number, substring(p_order_id::text from 1 for 8))),
    updated_at = NOW()
  WHERE id = p_order_id
    AND (razorpay_order_id IS NULL OR razorpay_order_id = '' OR razorpay_order_id = trim(p_razorpay_order_id))
  RETURNING * INTO v_updated;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to update order %: Razorpay order ID mismatch.', p_order_id;
  END IF;

  RETURN to_jsonb(v_updated);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Issue 1 Fix: Explicitly REVOKE ALL function privileges from PUBLIC, anon, and authenticated
REVOKE ALL ON FUNCTION public.record_verified_razorpay_payment(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;

-- Issue 1 Fix: Grant execution EXCLUSIVELY to service_role (Edge Functions only)
GRANT EXECUTE ON FUNCTION public.record_verified_razorpay_payment(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ) TO service_role;

-- ----------------------------------------------------------------------------
-- 5. RELOAD POSTGREST SCHEMA CACHE
-- ----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
