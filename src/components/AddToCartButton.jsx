import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export default function AddToCartButton({
  product,
  options = {},
  className = '',
  showToast,
  onRequireLogin
}) {
  const {
    addToCart,
    updateQuantity,
    removeFromCart,
    getProductQuantity,
    getCartItemKey
  } = useCart();
  const { user } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  // Derive cartItemKey for current customization options
  const cartItemKey = getCartItemKey
    ? getCartItemKey(product?.id, options)
    : (() => {
        const { selectedFlavour = '', selectedOccasion = '' } = options;
        const optionKey = [selectedFlavour, selectedOccasion].filter(Boolean).join(' - ');
        return optionKey ? `${product?.id}__${optionKey}` : `${product?.id}`;
      })();

  // Synchronized quantity directly from unified cart state
  const currentQuantity = user && getProductQuantity ? getProductQuantity(product?.id, options) : 0;

  // Add product to customer cart when quantity is zero
  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isUpdating) return;

    if (!user) {
      if (showToast) {
        showToast('Please log in to add items to your personal cart! 🍫');
      }
      if (onRequireLogin) {
        onRequireLogin();
      } else {
        window.location.hash = '#login';
      }
      return;
    }

    setIsUpdating(true);
    try {
      const result = await addToCart(product, options);
      if (result.success) {
        if (showToast) {
          showToast(result.message || `${product.name} added to your cart.`);
        }
      } else if (result.requiresLogin) {
        if (showToast) {
          showToast(result.message);
        }
        window.location.hash = '#login';
      } else {
        if (showToast) {
          showToast(result.message || 'Could not add item to cart. Please try again.');
        }
      }
    } catch (err) {
      if (showToast) {
        showToast('An unexpected error occurred while adding to cart.');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  // Increase quantity by one
  const handleIncrease = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isUpdating) return;
    setIsUpdating(true);
    try {
      await updateQuantity(cartItemKey, 1);
    } catch (err) {
      console.warn('[AddToCartButton] Increase error:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Decrease quantity by one (or remove from cart if quantity reaches 0)
  const handleDecrease = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isUpdating) return;
    setIsUpdating(true);
    try {
      if (currentQuantity <= 1) {
        await removeFromCart(cartItemKey);
        if (showToast) {
          showToast(`${product.name} removed from cart.`);
        }
      } else {
        await updateQuantity(cartItemKey, -1);
      }
    } catch (err) {
      console.warn('[AddToCartButton] Decrease error:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  // When product is in cart: replace Add to Cart button in-place with elegant quantity selector
  if (currentQuantity > 0) {
    return (
      <div
        className={`product-card-qty-control ${className}`}
        role="group"
        aria-label={`Quantity selector for ${product.name}`}
      >
        <button
          type="button"
          className="card-qty-btn card-qty-minus"
          onClick={handleDecrease}
          disabled={isUpdating}
          aria-label={`Decrease quantity of ${product.name}`}
          title={currentQuantity === 1 ? 'Remove from cart' : 'Decrease quantity'}
        >
          −
        </button>
        <span className="card-qty-number" aria-live="polite">
          {currentQuantity}
        </span>
        <button
          type="button"
          className="card-qty-btn card-qty-plus"
          onClick={handleIncrease}
          disabled={isUpdating}
          aria-label={`Increase quantity of ${product.name}`}
          title="Increase quantity"
        >
          +
        </button>
      </div>
    );
  }

  // When product is NOT in cart: render standard Add to Cart button
  return (
    <button
      type="button"
      className={`btn-add-cart ${className}`}
      onClick={handleAddToCart}
      disabled={isUpdating}
      title={user ? `Add ${product.name} to Cart` : 'Log in to add to Cart'}
      aria-label={`Add ${product.name} to Cart`}
    >
      <span>
        {isUpdating ? 'Adding...' : '🛒 Add to Cart'}
      </span>
    </button>
  );
}
