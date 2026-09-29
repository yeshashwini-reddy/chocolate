import React, { useState } from 'react';
import { useCart } from '../context/CartContext';

export default function AddToCartButton({ product, options = {}, className = '', showToast }) {
  const { addToCart } = useCart();
  const [isAdded, setIsAdded] = useState(false);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, options);
    setIsAdded(true);

    if (showToast) {
      const optionText = options.selectedFlavour || options.selectedOccasion;
      const displayName = optionText ? `${product.name} (${optionText})` : product.name;
      showToast(`Added "${displayName}" to cart! 🛒`);
    }

    setTimeout(() => {
      setIsAdded(false);
    }, 1200);
  };

  return (
    <button
      type="button"
      className={`btn-add-cart ${isAdded ? 'added' : ''} ${className}`}
      onClick={handleClick}
      title={`Add ${product.name} to Cart`}
      aria-label={`Add ${product.name} to Cart`}
    >
      <span>{isAdded ? '✓ Added' : '🛒 Add to Cart'}</span>
    </button>
  );
}
