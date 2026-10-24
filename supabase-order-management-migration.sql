-- ============================================================================
-- MADHURI'S CHOCO HEAVEN - ORDER MANAGEMENT & INTEGRATION MIGRATION (V3)
-- File: supabase-order-management-migration.sql
-- Description: Idempotent migration for existing database schema.
--              Extends public.orders and public.order_items with strict RLS,
--              atomic checkout transaction, and least-privilege permissions.
-- Tables affected: public.orders, public.order_items
-- Dependencies: public.profiles, public.products, public.carts, public.cart_items
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTEND PUBLIC.ORDERS TABLE
-- ----------------------------------------------------------------------------

-- 1.1 Allow user_id to be NULL for guest custom enquiries while preserving foreign key
ALTER TABLE public.orders 
  ALTER COLUMN user_id DROP NOT NULL;

-- 1.2 Order Tracking & Reference
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS order_number TEXT;

-- 1.3 Fulfillment & Delivery Information
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS delivery_type TEXT DEFAULT 'delivery',
  ADD COLUMN IF NOT EXISTS delivery_address TEXT;

-- 1.4 Payment Tracking & Receipts
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash_on_delivery',
  ADD COLUMN IF NOT EXISTS receipt_number TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;

-- 1.5 Custom Order & Enquiry Management
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS decision_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS owner_response TEXT,
  ADD COLUMN IF NOT EXISTS quoted_price NUMERIC(10, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS quote_status TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS quote_responded_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS guest_access_token TEXT DEFAULT NULL;

-- ----------------------------------------------------------------------------
-- 2. CONSTRAINTS & INTEGRITY CHECKS ON PUBLIC.ORDERS
-- ----------------------------------------------------------------------------

-- 2.1 Update status check constraint (fully backwards-compatible with existing values)
ALTER TABLE public.orders 
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders 
  ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('pending', 'under_review', 'quote_sent', 'processing', 'completed', 'cancelled'));

-- 2.2 Validate delivery type values
ALTER TABLE public.orders 
  DROP CONSTRAINT IF EXISTS orders_delivery_type_check;

ALTER TABLE public.orders 
  ADD CONSTRAINT orders_delivery_type_check 
  CHECK (delivery_type IN ('delivery', 'pickup'));

-- 2.3 Validate payment status values
ALTER TABLE public.orders 
  DROP CONSTRAINT IF EXISTS orders_payment_status_check;

ALTER TABLE public.orders 
  ADD CONSTRAINT orders_payment_status_check 
  CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));

-- 2.4 Validate order type values
ALTER TABLE public.orders 
  DROP CONSTRAINT IF EXISTS orders_order_type_check;

ALTER TABLE public.orders 
  ADD CONSTRAINT orders_order_type_check 
  CHECK (order_type IN ('standard', 'custom_enquiry'));

-- 2.5 Validate owner decision status values
ALTER TABLE public.orders 
  DROP CONSTRAINT IF EXISTS orders_decision_status_check;

ALTER TABLE public.orders 
  ADD CONSTRAINT orders_decision_status_check 
  CHECK (decision_status IN ('pending', 'accepted', 'rejected', 'quote_provided'));

-- 2.6 Validate customer quote response values
ALTER TABLE public.orders 
  DROP CONSTRAINT IF EXISTS orders_quote_status_check;

ALTER TABLE public.orders 
  ADD CONSTRAINT orders_quote_status_check 
  CHECK (quote_status IS NULL OR quote_status IN ('pending_acceptance', 'accepted', 'declined'));

-- 2.7 Indexes for performance and lookup security
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_number 
  ON public.orders(order_number) 
  WHERE order_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_payment_status 
  ON public.orders(payment_status);

CREATE INDEX IF NOT EXISTS idx_orders_receipt_number 
  ON public.orders(receipt_number);

CREATE INDEX IF NOT EXISTS idx_orders_order_type 
  ON public.orders(order_type);

CREATE INDEX IF NOT EXISTS idx_orders_decision_status 
  ON public.orders(decision_status);

CREATE INDEX IF NOT EXISTS idx_orders_guest_token 
  ON public.orders(order_number, guest_access_token) 
  WHERE guest_access_token IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 3. EXTEND PUBLIC.ORDER_ITEMS TABLE
-- ----------------------------------------------------------------------------

ALTER TABLE public.order_items 
  ADD COLUMN IF NOT EXISTS price_tag TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS product_key TEXT,
  ADD COLUMN IF NOT EXISTS customisation_details JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_order_items_product_key 
  ON public.order_items(product_key);

-- ----------------------------------------------------------------------------
-- 4. NON-DESTRUCTIVE BACKFILL FOR EXISTING ORDER RECORDS
-- ----------------------------------------------------------------------------

-- Assign unique human-readable order number only to existing legacy rows missing one.
-- Does NOT fabricate payments, timestamps, or receipts.
UPDATE public.orders
SET order_number = 'MCH-' || TO_CHAR(created_at, 'YYMM') || '-' || UPPER(SUBSTRING(id::text FROM 1 FOR 4))
WHERE order_number IS NULL OR order_number = '';

-- ----------------------------------------------------------------------------
-- 5. TAMPER-PROOF ORDER SECURITY TRIGGER
-- Enforces at the database engine level that customers cannot modify
-- sensitive financial or owner-controlled columns.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_order_update_security()
RETURNS TRIGGER AS $$
BEGIN
  -- Admins and owners can update all operational fields
  IF public.is_admin_or_owner() THEN
    RETURN NEW;
  END IF;

  -- Authenticated customer updating their own order
  IF auth.uid() = OLD.user_id THEN
    -- Block customer tampering on financial and owner-controlled columns
    IF NEW.total_amount IS DISTINCT FROM OLD.total_amount THEN
      RAISE EXCEPTION 'Security violation: Customers cannot alter total_amount.';
    END IF;

    IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
      RAISE EXCEPTION 'Security violation: Customers cannot alter payment_status directly.';
    END IF;

    IF NEW.payment_reference IS DISTINCT FROM OLD.payment_reference THEN
      RAISE EXCEPTION 'Security violation: Customers cannot alter payment_reference.';
    END IF;

    IF NEW.paid_at IS DISTINCT FROM OLD.paid_at THEN
      RAISE EXCEPTION 'Security violation: Customers cannot alter paid_at timestamp.';
    END IF;

    IF NEW.receipt_number IS DISTINCT FROM OLD.receipt_number THEN
      RAISE EXCEPTION 'Security violation: Customers cannot alter receipt_number.';
    END IF;

    IF NEW.quoted_price IS DISTINCT FROM OLD.quoted_price THEN
      RAISE EXCEPTION 'Security violation: Customers cannot alter quoted_price.';
    END IF;

    IF NEW.owner_response IS DISTINCT FROM OLD.owner_response THEN
      RAISE EXCEPTION 'Security violation: Customers cannot alter owner_response.';
    END IF;

    IF NEW.decision_status IS DISTINCT FROM OLD.decision_status THEN
      RAISE EXCEPTION 'Security violation: Customers cannot alter decision_status.';
    END IF;

    IF NEW.order_type IS DISTINCT FROM OLD.order_type THEN
      RAISE EXCEPTION 'Security violation: Customers cannot alter order_type.';
    END IF;

    IF NEW.order_number IS DISTINCT FROM OLD.order_number THEN
      RAISE EXCEPTION 'Security violation: Customers cannot alter order_number.';
    END IF;

    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'Security violation: Customers cannot reassign order ownership.';
    END IF;

    IF NEW.guest_access_token IS DISTINCT FROM OLD.guest_access_token THEN
      RAISE EXCEPTION 'Security violation: Customers cannot alter guest_access_token.';
    END IF;

    -- Customer cancellation restriction: customer can only cancel if still in pending status
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NOT (OLD.status = 'pending' AND NEW.status = 'cancelled') THEN
        RAISE EXCEPTION 'Customers can only cancel orders currently in pending status.';
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Unauthorized: You do not have permission to update this order.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_enforce_order_update_security ON public.orders;
CREATE TRIGGER trg_enforce_order_update_security
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.enforce_order_update_security();

-- ----------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) POLICIES REFRESH
-- ----------------------------------------------------------------------------

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 6.1 ORDERS SELECT POLICY: Authenticated user sees their own; Admin/Owner sees all
DROP POLICY IF EXISTS "Orders select policy" ON public.orders;
CREATE POLICY "Orders select policy" ON public.orders
  FOR SELECT 
  TO authenticated
  USING (
    auth.uid() = user_id OR public.is_admin_or_owner()
  );

-- 6.2 ORDERS INSERT POLICY: Enforces initial 'pending' state and prevents self-marking as paid
DROP POLICY IF EXISTS "Orders insert policy" ON public.orders;
DROP POLICY IF EXISTS "Orders customer insert policy" ON public.orders;
CREATE POLICY "Orders customer insert policy" ON public.orders
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      public.is_admin_or_owner()
      OR (
        (payment_status IS NULL OR payment_status = 'pending')
        AND (decision_status IS NULL OR decision_status = 'pending')
        AND (quoted_price IS NULL)
        AND (status = 'pending')
      )
    )
  );

-- 6.3 ORDERS UPDATE POLICY (SPLIT):
-- Admin/Owner has full update access; Customer has restricted access (enforced by trigger)
DROP POLICY IF EXISTS "Orders update policy" ON public.orders;
DROP POLICY IF EXISTS "Orders admin/owner update policy" ON public.orders;
CREATE POLICY "Orders admin/owner update policy" ON public.orders
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_owner())
  WITH CHECK (public.is_admin_or_owner());

DROP POLICY IF EXISTS "Orders customer update policy" ON public.orders;
CREATE POLICY "Orders customer update policy" ON public.orders
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6.4 ORDERS DELETE POLICY: Strictly Owner only
DROP POLICY IF EXISTS "Orders delete policy" ON public.orders;
CREATE POLICY "Orders delete policy" ON public.orders
  FOR DELETE 
  TO authenticated
  USING (public.is_owner());

-- 6.5 ORDER ITEMS POLICIES
DROP POLICY IF EXISTS "Order items select policy" ON public.order_items;
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

DROP POLICY IF EXISTS "Order items insert policy" ON public.order_items;
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

DROP POLICY IF EXISTS "Order items modify policy" ON public.order_items;
CREATE POLICY "Order items modify policy" ON public.order_items
  FOR ALL 
  TO authenticated
  USING (public.is_admin_or_owner());

-- ----------------------------------------------------------------------------
-- 7. SECURE GUEST CUSTOM ENQUIRY ENTRYPOINT (RPC)
-- Allows visitors to submit custom celebration enquiries safely.
-- Generates a 64-character cryptographic tracking token so the guest
-- can track status later without public order leakage or service-role keys.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.submit_guest_custom_enquiry(
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_customer_email TEXT DEFAULT NULL,
  p_occasion TEXT DEFAULT 'Celebration',
  p_product_name TEXT DEFAULT 'Custom Handcrafted Chocolates',
  p_quantity TEXT DEFAULT 'Standard',
  p_preferred_date TEXT DEFAULT NULL,
  p_customisation_details TEXT DEFAULT NULL,
  p_special_message TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_order_number TEXT;
  v_guest_token TEXT;
  v_clean_name TEXT;
  v_clean_phone TEXT;
  v_clean_email TEXT;
BEGIN
  -- Strict input sanitization & validation
  v_clean_name := NULLIF(TRIM(p_customer_name), '');
  v_clean_phone := NULLIF(TRIM(p_customer_phone), '');
  v_clean_email := NULLIF(TRIM(p_customer_email), '');

  IF v_clean_name IS NULL THEN
    RAISE EXCEPTION 'Customer name is required.';
  END IF;

  IF v_clean_phone IS NULL THEN
    RAISE EXCEPTION 'Customer phone / WhatsApp number is required.';
  END IF;

  IF LENGTH(v_clean_name) > 120 THEN
    RAISE EXCEPTION 'Customer name cannot exceed 120 characters.';
  END IF;

  IF LENGTH(v_clean_phone) > 30 THEN
    RAISE EXCEPTION 'Customer phone cannot exceed 30 characters.';
  END IF;

  -- Collision-safe human-friendly order reference: MCH-YYMM-XXXX
  LOOP
    v_order_number := 'MCH-' || TO_CHAR(NOW(), 'YYMM') || '-' || LPAD(FLOOR(1000 + RANDOM() * 9000)::TEXT, 4, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.orders WHERE order_number = v_order_number);
  END LOOP;

  -- Generate 64-character cryptographic token for guest-only retrieval
  v_guest_token := encode(gen_random_bytes(32), 'hex');

  -- Insert guest enquiry with locked-down safe defaults
  INSERT INTO public.orders (
    user_id,
    order_number,
    guest_access_token,
    order_type,
    status,
    decision_status,
    total_amount,
    payment_status,
    payment_method,
    customer_name,
    customer_phone,
    customer_email,
    occasion,
    product_name,
    quantity,
    preferred_date,
    customisation_details,
    special_message
  )
  VALUES (
    NULL,
    v_order_number,
    v_guest_token,
    'custom_enquiry',
    'pending',
    'pending',
    0,
    'pending',
    'direct_quote',
    v_clean_name,
    v_clean_phone,
    v_clean_email,
    COALESCE(NULLIF(TRIM(p_occasion), ''), 'Celebration'),
    COALESCE(NULLIF(TRIM(p_product_name), ''), 'Custom Handcrafted Chocolates'),
    COALESCE(NULLIF(TRIM(p_quantity), ''), 'Standard'),
    NULLIF(TRIM(p_preferred_date), ''),
    NULLIF(TRIM(p_customisation_details), ''),
    NULLIF(TRIM(p_special_message), '')
  )
  RETURNING id INTO v_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'tracking_token', v_guest_token,
    'message', 'Custom celebration enquiry submitted successfully.'
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 8. SECURE GUEST ENQUIRY STATUS RETRIEVAL (RPC)
-- Allows a guest to check only their own enquiry using the token.
-- Prevents public scraping or order reference enumeration attacks.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_guest_enquiry_status(
  p_order_number TEXT,
  p_tracking_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
BEGIN
  IF p_order_number IS NULL OR p_tracking_token IS NULL THEN
    RAISE EXCEPTION 'Order reference and tracking token are required.';
  END IF;

  -- Query order matching exact pair with user_id NULL
  SELECT 
    order_number,
    status,
    decision_status,
    owner_response,
    quoted_price,
    quote_status,
    customer_name,
    product_name,
    occasion,
    preferred_date,
    created_at
  INTO v_order
  FROM public.orders
  WHERE order_number = TRIM(p_order_number)
    AND guest_access_token = TRIM(p_tracking_token)
    AND user_id IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Enquiry not found or access token invalid.';
  END IF;

  RETURN to_jsonb(v_order);
END;
$$;

-- ----------------------------------------------------------------------------
-- 9. AUTHORITATIVE ATOMIC CHECKOUT TRANSACTION (RPC)
-- Function Name: public.create_order_from_cart
-- Directly matches existing frontend CartView call signature.
-- Validates customer identity, product availability, canonical catalog prices,
-- line totals, and order_items snapshots. Client prices are completely ignored.
-- If p_items is NULL, it reads and purges public.cart_items for the user's cart.
-- ----------------------------------------------------------------------------

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
  p_payment_method TEXT DEFAULT 'cash_on_delivery',
  p_items JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_cart_id UUID;
  v_order_id UUID;
  v_order_number TEXT;
  v_item RECORD;
  v_product RECORD;
  v_item_quantity INTEGER;
  v_line_total NUMERIC(10, 2);
  v_calculated_total NUMERIC(10, 2) := 0;
  v_item_names TEXT[] := ARRAY[]::TEXT[];
  v_item_count INTEGER := 0;
  v_raw_items JSONB;
  v_elem JSONB;
BEGIN
  -- 1. Strictly verify authenticated session
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to place an order.';
  END IF;

  -- 2. Validate delivery parameters
  IF p_delivery_type NOT IN ('delivery', 'pickup') THEN
    RAISE EXCEPTION 'Invalid delivery type. Must be delivery or pickup.';
  END IF;

  IF p_delivery_type = 'delivery' AND (p_delivery_address IS NULL OR TRIM(p_delivery_address) = '') THEN
    RAISE EXCEPTION 'Delivery address is required for home delivery.';
  END IF;

  -- 3. Locate cart or assemble items list
  IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
    v_raw_items := p_items;
  ELSE
    -- Read from active database cart
    SELECT id INTO v_cart_id FROM public.carts WHERE user_id = v_user_id;
    IF v_cart_id IS NULL THEN
      RAISE EXCEPTION 'Active shopping cart not found.';
    END IF;

    SELECT jsonb_agg(to_jsonb(ci)) INTO v_raw_items 
    FROM public.cart_items ci 
    WHERE cart_id = v_cart_id;

    IF v_raw_items IS NULL OR jsonb_array_length(v_raw_items) = 0 THEN
      RAISE EXCEPTION 'Cart is empty. Please add items before checking out.';
    END IF;
  END IF;

  -- 4. Collision-safe unique order reference (MCH-YYMM-XXXX)
  LOOP
    v_order_number := 'MCH-' || TO_CHAR(NOW(), 'YYMM') || '-' || LPAD(FLOOR(1000 + RANDOM() * 9000)::TEXT, 4, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.orders WHERE order_number = v_order_number);
  END LOOP;

  -- 5. Create initial parent order header (trusted total will update below)
  INSERT INTO public.orders (
    user_id,
    order_number,
    order_type,
    status,
    decision_status,
    total_amount,
    payment_status,
    payment_method,
    delivery_type,
    delivery_address,
    customer_name,
    customer_phone,
    customer_email,
    occasion,
    preferred_date,
    customisation_details,
    special_message
  )
  VALUES (
    v_user_id,
    v_order_number,
    'standard',
    'pending',
    'accepted',
    0,
    'pending',
    COALESCE(NULLIF(TRIM(p_payment_method), ''), 'cash_on_delivery'),
    p_delivery_type,
    CASE WHEN p_delivery_type = 'delivery' THEN TRIM(p_delivery_address) ELSE 'Pickup from Studio' END,
    NULLIF(TRIM(p_customer_name), ''),
    NULLIF(TRIM(p_customer_phone), ''),
    NULLIF(TRIM(p_customer_email), ''),
    NULLIF(TRIM(p_occasion), ''),
    NULLIF(TRIM(p_preferred_date), ''),
    NULLIF(TRIM(p_customisation_details), ''),
    NULLIF(TRIM(p_special_message), '')
  )
  RETURNING id INTO v_order_id;

  -- 6. Process each item: validate availability and fetch CANONICAL price from public.products
  FOR v_elem IN SELECT * FROM jsonb_array_elements(v_raw_items)
  LOOP
    v_item_quantity := COALESCE((v_elem->>'quantity')::INTEGER, 1);
    IF v_item_quantity < 1 THEN
      RAISE EXCEPTION 'Invalid quantity for item "%".', COALESCE(v_elem->>'product_name', v_elem->>'name');
    END IF;

    -- Lookup canonical product in database (locking row for share)
    SELECT * INTO v_product
    FROM public.products
    WHERE (
      (v_elem->>'product_id' IS NOT NULL AND id::text = v_elem->>'product_id')
      OR (v_elem->>'productId' IS NOT NULL AND id::text = v_elem->>'productId')
      OR (v_elem->>'product_key' IS NOT NULL AND product_key = v_elem->>'product_key')
    )
    FOR SHARE;

    IF NOT FOUND THEN
      -- Fallback match by product name if key lookup differed
      SELECT * INTO v_product
      FROM public.products
      WHERE LOWER(name) = LOWER(TRIM(COALESCE(v_elem->>'rawName', v_elem->>'product_name', v_elem->>'name')))
      LIMIT 1;
    END IF;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product "%" is not recognized in the active catalogue.', COALESCE(v_elem->>'product_name', v_elem->>'name');
    END IF;

    -- Verify stock availability
    IF NOT (COALESCE(v_product.available, true) AND COALESCE(v_product.is_available, true)) THEN
      RAISE EXCEPTION 'Product "%" is currently out of stock.', v_product.name;
    END IF;

    -- Verify price is purchasable (reject unpriced/zero Price on Request items)
    IF v_product.price IS NULL OR v_product.price <= 0 THEN
      RAISE EXCEPTION 'Product "%" has custom pricing (Price on Request) and cannot be checked out automatically. Please submit a Custom Order enquiry.', v_product.name;
    END IF;

    -- Calculate price strictly from trusted database record
    v_line_total := v_product.price * v_item_quantity;
    v_calculated_total := v_calculated_total + v_line_total;
    v_item_count := v_item_count + v_item_quantity;
    v_item_names := array_append(v_item_names, v_product.name || ' × ' || v_item_quantity);

    -- Insert verified item snapshot into order_items
    INSERT INTO public.order_items (
      order_id,
      product_id,
      product_key,
      product_name,
      quantity,
      price,
      price_tag,
      image_url,
      category,
      customisation_details
    )
    VALUES (
      v_order_id,
      v_product.id,
      v_product.product_key,
      COALESCE(v_elem->>'product_name', v_elem->>'name', v_product.name),
      v_item_quantity,
      v_product.price,
      COALESCE(v_product.price_tag, '₹' || v_product.price),
      COALESCE(v_product.image_url, v_elem->>'image_url', v_elem->>'image'),
      COALESCE(v_product.category_label, v_product.category),
      COALESCE(v_elem->'customisation_details', v_elem->'customisationDetails', '{}'::jsonb)
    );
  END LOOP;

  -- 7. Update parent order with authoritative total amount and product summary
  UPDATE public.orders
  SET 
    total_amount = v_calculated_total,
    product_name = array_to_string(v_item_names, ', '),
    quantity = v_item_count::TEXT || ' item(s)'
  WHERE id = v_order_id;

  -- 8. Purge customer database cart items upon successful order creation
  IF v_cart_id IS NOT NULL THEN
    DELETE FROM public.cart_items WHERE cart_id = v_cart_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'total_amount', v_calculated_total,
    'message', 'Order placed successfully.'
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 10. CUSTOMER QUOTE RESPONSE RPC
-- Allows authenticated customer who owns the order to accept or decline a quote.
-- Owners CANNOT use this function to impersonate customer responses.
-- Acceptance moves status to 'processing' without altering payment_status.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.respond_to_order_quote(
  p_order_id UUID,
  p_accept BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_new_quote_status TEXT;
  v_new_status TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  SELECT * INTO v_order 
  FROM public.orders 
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found.';
  END IF;

  -- STRICT CUSTOMER OWNERSHIP CHECK:
  -- Only the customer who owns this order can accept or decline the quote.
  -- Owners and admins cannot call this function on behalf of the customer.
  IF v_order.user_id IS NULL OR v_order.user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Only the customer who placed this order can respond to the quote.';
  END IF;

  -- Verify that an active quote exists
  IF v_order.quoted_price IS NULL OR v_order.quoted_price <= 0 THEN
    RAISE EXCEPTION 'This order does not have an active price quote awaiting a decision.';
  END IF;

  -- Verify quote state has not already been finalized
  IF v_order.quote_status IN ('accepted', 'declined') THEN
    RAISE EXCEPTION 'This quote has already been finalized as % and cannot be modified.', v_order.quote_status;
  END IF;

  IF v_order.status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'Cannot respond to a quote for an order that is already completed or cancelled.';
  END IF;

  IF p_accept THEN
    v_new_quote_status := 'accepted';
    v_new_status := 'processing';
  ELSE
    v_new_quote_status := 'declined';
    v_new_status := 'cancelled';
  END IF;

  -- Update quote status and operational status.
  -- payment_status is deliberately NOT updated (kept as 'pending') until payment is received!
  UPDATE public.orders
  SET 
    quote_status = v_new_quote_status,
    quote_responded_at = NOW(),
    status = v_new_status,
    total_amount = CASE WHEN p_accept THEN v_order.quoted_price ELSE v_order.total_amount END,
    updated_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'quote_status', v_new_quote_status,
    'status', v_new_status,
    'payment_status', v_order.payment_status
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 11. NARROWLY SCOPED DATABASE PERMISSIONS (LEAST PRIVILEGE)
-- Eliminates broad schema-wide grants and wildcard default privileges.
-- ----------------------------------------------------------------------------

-- 11.1 Schema usage
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- 11.2 Public products: Anonymous and authenticated users can view; writes gated by RLS
GRANT SELECT ON TABLE public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.products TO authenticated;

-- 11.3 Public profiles: Authenticated users only (RLS restricts to own profile / admin)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO authenticated;

-- 11.4 Public orders & order_items: Authenticated users only (RLS + trigger restrict all actions)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.order_items TO authenticated;

-- 11.5 Service role retains administrative access for Supabase Dashboard and Edge Functions
GRANT ALL ON TABLE public.products TO service_role;
GRANT ALL ON TABLE public.profiles TO service_role;
GRANT ALL ON TABLE public.orders TO service_role;
GRANT ALL ON TABLE public.order_items TO service_role;

-- 11.6 Explicit function execution grants
GRANT EXECUTE ON FUNCTION public.is_admin_or_owner() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_owner() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_guest_custom_enquiry(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_guest_enquiry_status(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_order_from_cart(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.respond_to_order_quote(UUID, BOOLEAN) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 12. POST-MIGRATION VERIFICATION QUERIES
-- Run these individually in the Supabase SQL Editor to verify changes.
-- ----------------------------------------------------------------------------

-- 12.1 Verify public.orders columns
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' AND table_name = 'orders'
-- ORDER BY ordinal_position;

-- 12.2 Verify public.order_items columns
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' AND table_name = 'order_items'
-- ORDER BY ordinal_position;

-- 12.3 Verify active RLS policies
-- SELECT tablename, policyname, permissive, roles, cmd 
-- FROM pg_policies 
-- WHERE schemaname = 'public' AND tablename IN ('orders', 'order_items');

-- 12.4 Verify check constraints on public.orders
-- SELECT conname, pg_get_constraintdef(oid) 
-- FROM pg_constraint 
-- WHERE conrelid = 'public.orders'::regclass AND contype = 'c';
