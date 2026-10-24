import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [cartId, setCartId] = useState(null);
  const [isLoadingCart, setIsLoadingCart] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [cartError, setCartError] = useState(null);
  const [isDbCartActive, setIsDbCartActive] = useState(false);

  // Guard to prevent concurrent add-to-cart clicks
  const addingInProgressRef = useRef(false);
  // Keep track of the active user ID to prevent race conditions during login/logout switches
  const currentUserIdRef = useRef(null);

  // Helper to parse numeric price from product properties
  const parsePrice = (priceTag, price) => {
    if (typeof price === 'number' && !isNaN(price) && price > 0) return price;
    if (typeof priceTag === 'string') {
      const match = priceTag.match(/\d+([.,]\d+)?/);
      if (match) {
        const parsed = parseFloat(match[0].replace(',', ''));
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    }
    return null;
  };

  /**
   * Helper to get user-specific storage key for isolated fallback
   * Using sessionStorage ensures cart caching is strictly tab-isolated
   * and never leaks or collides across browser tabs.
   */
  const getUserStorageKey = (uid) => `mch_tab_cart_${uid}`;

  /**
   * Fetch or initialize cart from Supabase for the authenticated user
   */
  const loadUserCart = useCallback(async (authenticatedUser) => {
    if (!authenticatedUser?.id) return;
    const uid = authenticatedUser.id;
    currentUserIdRef.current = uid;
    setIsLoadingCart(true);
    setCartError(null);

    try {
      // 1. Locate or create active cart for user in public.carts
      let { data: existingCart, error: cartFetchErr } = await supabase
        .from('carts')
        .select('id, user_id')
        .eq('user_id', uid)
        .maybeSingle();

      if (cartFetchErr) {
        // Table may not exist yet if SQL migration is pending
        console.info('[CartContext] Supabase carts table lookup:', cartFetchErr.message);
        throw cartFetchErr;
      }

      if (!existingCart) {
        const { data: newCart, error: cartCreateErr } = await supabase
          .from('carts')
          .insert({ user_id: uid })
          .select('id, user_id')
          .single();

        if (cartCreateErr) {
          throw cartCreateErr;
        }
        existingCart = newCart;
      }

      // Check if user switched while query was running
      if (currentUserIdRef.current !== uid) return;

      setCartId(existingCart.id);
      setIsDbCartActive(true);

      // 2. Fetch cart items for this specific cart
      const { data: items, error: itemsErr } = await supabase
        .from('cart_items')
        .select('*')
        .eq('cart_id', existingCart.id)
        .order('created_at', { ascending: true });

      if (itemsErr) {
        throw itemsErr;
      }

      if (currentUserIdRef.current !== uid) return;

      const formatted = (items || []).map((row) => ({
        id: row.id,
        cartItemId: row.cart_item_key,
        productId: row.product_id,
        name: row.product_name,
        rawName: row.product_name,
        price: row.unit_price ? Number(row.unit_price) : null,
        priceTag: row.price_tag || (row.unit_price ? `₹${row.unit_price}` : 'Price on Request'),
        image: row.image_url || 'assets/images/chocolate_truffles_box.jpg',
        category: row.category || 'Confectionery',
        quantity: row.quantity || 1,
        customisationDetails: row.customisation_details || {},
        selectedFlavour: row.customisation_details?.selectedFlavour || '',
        selectedOccasion: row.customisation_details?.selectedOccasion || ''
      }));

      setCartItems(formatted);
      try {
        sessionStorage.setItem(getUserStorageKey(uid), JSON.stringify(formatted));
      } catch (_) {}
    } catch (err) {
      // Graceful customer-isolated fallback if database table is pending migration
      console.warn('[CartContext] Operating in customer-isolated local mode for user:', uid, err.message);
      setIsDbCartActive(false);

      if (currentUserIdRef.current === uid) {
        try {
          const cached = sessionStorage.getItem(getUserStorageKey(uid));
          setCartItems(cached ? JSON.parse(cached) : []);
        } catch (_) {
          setCartItems([]);
        }
      }
    } finally {
      if (currentUserIdRef.current === uid) {
        setIsLoadingCart(false);
      }
    }
  }, []);

  /**
   * Monitor authentication changes
   * - When user logs in: load their user-isolated cart.
   * - When account changes: clear previous user's cart from React state immediately before loading next user.
   * - When user logs out: safely remove ONLY the logging-out user's local cart cache without touching other accounts.
   */
  useEffect(() => {
    const prevUserId = currentUserIdRef.current;

    if (!user) {
      // Safe cleanup on logout: remove ONLY the logging-out user's tab cart cache
      if (prevUserId) {
        try {
          sessionStorage.removeItem(getUserStorageKey(prevUserId));
        } catch (_) {}
      }
      currentUserIdRef.current = null;
      setCartItems([]);
      setCartId(null);
      setIsDbCartActive(false);
      setIsLoadingCart(false);
      setCartError(null);
    } else {
      if (prevUserId !== user.id) {
        // Clear previous user's cart state immediately before loading new user
        setCartItems([]);
        setCartId(null);
        setIsLoadingCart(true);
        loadUserCart(user);
      }
    }
  }, [user, loadUserCart]);

  /**
   * Add a product to the authenticated customer's cart
   */
  const addToCart = async (product, options = {}) => {
    if (addingInProgressRef.current) return { success: false, message: 'Please wait...' };
    addingInProgressRef.current = true;
    setIsSyncing(true);

    try {
      if (!user) {
        return {
          success: false,
          requiresLogin: true,
          message: 'Please log in to add items to your personal shopping cart 🍫'
        };
      }

      const uid = user.id;
      const { selectedFlavour = '', selectedOccasion = '' } = options;

      // Unique identifier for item + customization combination
      const optionKey = [selectedFlavour, selectedOccasion].filter(Boolean).join(' - ');
      const cartItemKey = optionKey ? `${product.id}__${optionKey}` : `${product.id}`;

      const numericPrice = parsePrice(product.priceTag, product.price);
      const displayName = optionKey ? `${product.name} (${optionKey})` : product.name;
      const customisationDetails = { selectedFlavour, selectedOccasion };

      // Find if item already exists in local state
      const existingItem = cartItems.find((i) => i.cartItemId === cartItemKey);
      const newQuantity = existingItem ? existingItem.quantity + 1 : 1;

      // Optimistic update
      let nextItems;
      if (existingItem) {
        nextItems = cartItems.map((item) =>
          item.cartItemId === cartItemKey ? { ...item, quantity: newQuantity } : item
        );
      } else {
        const newItem = {
          cartItemId: cartItemKey,
          productId: String(product.id),
          name: displayName,
          rawName: product.name,
          image: product.image || 'assets/images/chocolate_truffles_box.jpg',
          category: product.categoryLabel || product.category || 'Confectionery',
          priceTag: product.priceTag || (numericPrice ? `₹${numericPrice}` : 'Price on Request'),
          price: numericPrice,
          quantity: 1,
          customisationDetails,
          selectedFlavour,
          selectedOccasion
        };
        nextItems = [...cartItems, newItem];
      }

      setCartItems(nextItems);
      try {
        sessionStorage.setItem(getUserStorageKey(uid), JSON.stringify(nextItems));
      } catch (_) {}

      // Synchronize with Supabase database if active
      if (cartId && isDbCartActive) {
        if (existingItem) {
          await supabase
            .from('cart_items')
            .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
            .eq('cart_id', cartId)
            .eq('cart_item_key', cartItemKey);
        } else {
          await supabase.from('cart_items').insert({
            cart_id: cartId,
            product_id: String(product.id),
            product_name: displayName,
            unit_price: numericPrice,
            price_tag: product.priceTag || (numericPrice ? `₹${numericPrice}` : 'Price on Request'),
            image_url: product.image || 'assets/images/chocolate_truffles_box.jpg',
            category: product.categoryLabel || product.category || 'Confectionery',
            quantity: 1,
            customisation_details: customisationDetails,
            cart_item_key: cartItemKey
          });
        }
      }

      return {
        success: true,
        message: `${displayName} added to your cart.`
      };
    } catch (err) {
      console.warn('[CartContext] addToCart exception:', err);
      return {
        success: true, // Local optimistic state preserved
        message: `${product.name} added to your cart.`
      };
    } finally {
      setIsSyncing(false);
      addingInProgressRef.current = false;
    }
  };

  /**
   * Update quantity of an item (+1 or -1)
   */
  const updateQuantity = async (cartItemId, delta) => {
    if (!user) return;
    const uid = user.id;

    const targetItem = cartItems.find((i) => i.cartItemId === cartItemId);
    if (!targetItem) return;

    const newQty = targetItem.quantity + delta;
    if (newQty <= 0) {
      // When quantity reaches zero, remove product from cart completely and restore Add to Cart button
      await removeFromCart(cartItemId);
      return;
    }

    const nextItems = cartItems.map((item) =>
      item.cartItemId === cartItemId ? { ...item, quantity: newQty } : item
    );

    setCartItems(nextItems);
    try {
      sessionStorage.setItem(getUserStorageKey(uid), JSON.stringify(nextItems));
    } catch (_) {}

    if (cartId && isDbCartActive) {
      try {
        await supabase
          .from('cart_items')
          .update({ quantity: newQty, updated_at: new Date().toISOString() })
          .eq('cart_id', cartId)
          .eq('cart_item_key', cartItemId);
      } catch (err) {
        console.warn('[CartContext] updateQuantity DB sync note:', err.message);
      }
    }
  };

  /**
   * Remove item from cart completely
   */
  const removeFromCart = async (cartItemId) => {
    if (!user) return;
    const uid = user.id;

    const nextItems = cartItems.filter((item) => item.cartItemId !== cartItemId);
    setCartItems(nextItems);
    try {
      sessionStorage.setItem(getUserStorageKey(uid), JSON.stringify(nextItems));
    } catch (_) {}

    if (cartId && isDbCartActive) {
      try {
        await supabase
          .from('cart_items')
          .delete()
          .eq('cart_id', cartId)
          .eq('cart_item_key', cartItemId);
      } catch (err) {
        console.warn('[CartContext] removeFromCart DB sync note:', err.message);
      }
    }
  };

  /**
   * Clear all items from active cart
   */
  const clearCart = async () => {
    if (!user) return;
    const uid = user.id;

    setCartItems([]);
    try {
      sessionStorage.removeItem(getUserStorageKey(uid));
    } catch (_) {}

    if (cartId && isDbCartActive) {
      try {
        await supabase.from('cart_items').delete().eq('cart_id', cartId);
      } catch (err) {
        console.warn('[CartContext] clearCart DB sync note:', err.message);
      }
    }
  };

  /**
   * Total unit count in cart for dynamic navbar badge
   */
  const getCartCount = () => {
    return cartItems.reduce((total, item) => total + (item.quantity || 1), 0);
  };

  /**
   * Calculate cart financial and quantity summaries
   */
  const getCartSummary = () => {
    let numericSubtotal = 0;
    let hasPriceOnRequest = false;
    let totalItems = 0;
    let pricedCount = 0;
    let unconfirmedCount = 0;

    cartItems.forEach((item) => {
      const qty = item.quantity || 1;
      totalItems += qty;
      if (typeof item.price === 'number' && item.price > 0) {
        numericSubtotal += item.price * qty;
        pricedCount += qty;
      } else {
        hasPriceOnRequest = true;
        unconfirmedCount += qty;
      }
    });

    return {
      numericSubtotal,
      hasPriceOnRequest,
      totalItems,
      pricedCount,
      unconfirmedCount,
      isPayableOnline: numericSubtotal > 0 && !hasPriceOnRequest
    };
  };

  /**
   * Helper to get current quantity of a product with specific options
   */
  const getProductQuantity = useCallback((productId, options = {}) => {
    if (!productId) return 0;
    const { selectedFlavour = '', selectedOccasion = '' } = options;
    const optionKey = [selectedFlavour, selectedOccasion].filter(Boolean).join(' - ');
    const cartItemKey = optionKey ? `${productId}__${optionKey}` : `${productId}`;

    // 1. Exact match by cartItemId
    const item = cartItems.find((i) => i.cartItemId === cartItemKey);
    if (item) return item.quantity || 0;

    // 2. Fallback: If no options are specified, check if there's an item with matching productId
    if (!optionKey) {
      const fallbackItem = cartItems.find((i) => String(i.productId) === String(productId));
      if (fallbackItem) return fallbackItem.quantity || 0;
    }

    return 0;
  }, [cartItems]);

  /**
   * Helper to derive unique cartItemKey for product and customizations
   */
  const getCartItemKey = useCallback((productId, options = {}) => {
    if (!productId) return '';
    const { selectedFlavour = '', selectedOccasion = '' } = options;
    const optionKey = [selectedFlavour, selectedOccasion].filter(Boolean).join(' - ');
    return optionKey ? `${productId}__${optionKey}` : `${productId}`;
  }, []);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        cartId,
        isLoadingCart,
        isSyncing,
        cartError,
        isDbCartActive,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartCount,
        getCartSummary,
        getProductQuantity,
        getCartItemKey,
        refreshCart: () => user && loadUserCart(user)
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
