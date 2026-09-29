import React, { createContext, useContext, useState, useEffect } from 'react';

const CART_STORAGE_KEY = 'madhuris_choco_heaven_cart';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (err) {
      console.error('Failed to load cart from localStorage:', err);
      return [];
    }
  });

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch (err) {
      console.error('Failed to save cart to localStorage:', err);
    }
  }, [cartItems]);

  // Helper to parse price from priceTag or price prop
  const parsePrice = (priceTag, price) => {
    if (typeof price === 'number' && !isNaN(price)) return price;
    if (typeof priceTag === 'string') {
      const match = priceTag.match(/\d+([.,]\d+)?/);
      if (match) {
        return parseFloat(match[0].replace(',', ''));
      }
    }
    return null;
  };

  /**
   * Add a product to the cart.
   * If an item with the same cartItemId already exists, increase quantity.
   */
  const addToCart = (product, options = {}) => {
    const { selectedFlavour = '', selectedOccasion = '' } = options;

    // Generate unique ID based on product ID and selected options
    const optionKey = [selectedFlavour, selectedOccasion].filter(Boolean).join(' - ');
    const cartItemId = optionKey ? `${product.id}__${optionKey}` : product.id;

    const numericPrice = parsePrice(product.priceTag, product.price);
    const displayName = optionKey ? `${product.name} (${optionKey})` : product.name;

    setCartItems((prevItems) => {
      const existingIndex = prevItems.findIndex((item) => item.cartItemId === cartItemId);

      if (existingIndex > -1) {
        // Increase quantity of existing item
        const updated = [...prevItems];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1
        };
        return updated;
      }

      // Add new item
      const newItem = {
        cartItemId,
        productId: product.id,
        name: displayName,
        rawName: product.name,
        image: product.image || 'assets/images/chocolate_truffles_box.jpg',
        category: product.categoryLabel || product.category || 'Confectionery',
        priceTag: product.priceTag || 'Price on Request',
        price: numericPrice,
        quantity: 1,
        selectedFlavour,
        selectedOccasion
      };

      return [...prevItems, newItem];
    });
  };

  /**
   * Remove an item completely from cart by cartItemId
   */
  const removeFromCart = (cartItemId) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.cartItemId !== cartItemId));
  };

  /**
   * Update quantity of an item (+1 or -1). Removes if quantity reaches 0.
   */
  const updateQuantity = (cartItemId, delta) => {
    setCartItems((prevItems) => {
      return prevItems
        .map((item) => {
          if (item.cartItemId === cartItemId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean);
    });
  };

  /**
   * Clear all items from cart
   */
  const clearCart = () => {
    setCartItems([]);
  };

  /**
   * Calculate total item count in cart
   */
  const getCartCount = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  /**
   * Calculate cart subtotal details
   */
  const getCartSummary = () => {
    let numericSubtotal = 0;
    let hasPriceOnRequest = false;
    let totalItems = 0;

    cartItems.forEach((item) => {
      totalItems += item.quantity;
      if (typeof item.price === 'number' && item.price > 0) {
        numericSubtotal += item.price * item.quantity;
      } else {
        hasPriceOnRequest = true;
      }
    });

    return {
      numericSubtotal,
      hasPriceOnRequest,
      totalItems
    };
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartCount,
        getCartSummary
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
