import React from 'react';
import { useCart } from '../context/CartContext';

export default function CartView({ onNavigate, onCheckoutCart }) {
  const { cartItems, removeFromCart, updateQuantity, clearCart, getCartSummary } = useCart();
  const { numericSubtotal, hasPriceOnRequest, totalItems } = getCartSummary();

  const handleCheckoutClick = () => {
    // Generate order summary text for pre-filling enquiry form
    const itemLines = cartItems.map((item, idx) => {
      const priceDetail = item.price ? `₹${item.price * item.quantity}` : 'Price on Request';
      return `${idx + 1}. ${item.name} × ${item.quantity} (${item.category}) — ${priceDetail}`;
    });

    let summaryText = `SHOPPING CART ORDER DETAILS:\n-------------------------------\n${itemLines.join('\n')}\n-------------------------------\nTotal Items: ${totalItems}`;

    if (numericSubtotal > 0) {
      summaryText += `\nSubtotal (Priced Items): ₹${numericSubtotal.toLocaleString('en-IN')}`;
    }
    if (hasPriceOnRequest) {
      summaryText += `\n(Note: Some items are "Price on Request" and require price confirmation.)`;
    }

    if (onCheckoutCart) {
      onCheckoutCart(summaryText);
    } else if (onNavigate) {
      onNavigate('#contact');
    }
  };

  return (
    <section className="section-padding cart-section" id="cart" aria-labelledby="cart-heading">
      <div className="container">
        {/* Section Header */}
        <div className="section-header reveal-on-scroll revealed">
          <div className="section-subtitle">Your Selection</div>
          <h2 className="section-title" id="cart-heading">
            Your <span className="text-gradient-gold">Shopping Cart</span>
          </h2>
          <p className="section-desc">
            Review your handcrafted chocolates and fresh artisan bakes before completing your order request.
          </p>
        </div>

        {cartItems.length === 0 ? (
          /* Empty Cart State */
          <div className="empty-cart-box text-center">
            <div className="empty-cart-icon">🛒</div>
            <h3 className="empty-cart-title font-serif">Your cart is empty.</h3>
            <p className="empty-cart-desc">
              Explore our luxury handcrafted chocolates and fresh bakery treats to add items to your cart.
            </p>
            <div className="empty-cart-actions">
              <button
                type="button"
                className="btn btn-gold"
                onClick={() => onNavigate && onNavigate('#chocolates')}
              >
                <span>Browse Chocolates</span>
                <span className="btn-icon-arrow">→</span>
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => onNavigate && onNavigate('#cakes-bakes')}
              >
                <span>Explore Cakes & Bakes</span>
              </button>
            </div>
          </div>
        ) : (
          /* Cart Content Layout */
          <div className="cart-content-grid">
            {/* Left: Cart Items List */}
            <div className="cart-items-col">
              <div className="cart-items-header">
                <span className="cart-items-count font-serif">
                  Cart Items ({cartItems.length})
                </span>
                <button
                  type="button"
                  className="cart-clear-btn"
                  onClick={clearCart}
                  title="Clear all items from cart"
                >
                  🗑️ Clear Cart
                </button>
              </div>

              <div className="cart-items-list">
                {cartItems.map((item) => (
                  <article key={item.cartItemId} className="cart-item-card">
                    <div className="cart-item-img-box">
                      <img
                        src={item.image}
                        alt={item.name}
                        loading="lazy"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'assets/images/chocolate_truffles_box.jpg';
                        }}
                      />
                    </div>

                    <div className="cart-item-details">
                      <div className="cart-item-category">{item.category}</div>
                      <h3 className="cart-item-name">{item.name}</h3>

                      <div className="cart-item-price-row">
                        <span className="cart-price-label">Price:</span>
                        <span className="cart-price-value">
                          {item.price
                            ? `₹${(item.price * item.quantity).toLocaleString('en-IN')}`
                            : item.priceTag || 'Price on Request'}
                        </span>
                      </div>
                    </div>

                    <div className="cart-item-actions">
                      <div
                        className="cart-qty-group"
                        role="group"
                        aria-label={`Quantity for ${item.name}`}
                      >
                        <button
                          type="button"
                          className="qty-btn qty-minus"
                          onClick={() => updateQuantity(item.cartItemId, -1)}
                          aria-label="Decrease quantity"
                          title="Decrease quantity"
                        >
                          -
                        </button>
                        <span className="qty-number" aria-live="polite">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          className="qty-btn qty-plus"
                          onClick={() => updateQuantity(item.cartItemId, 1)}
                          aria-label="Increase quantity"
                          title="Increase quantity"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        className="cart-remove-btn"
                        onClick={() => removeFromCart(item.cartItemId)}
                        aria-label={`Remove ${item.name} from cart`}
                        title="Remove product"
                      >
                        ✕ Remove
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            {/* Right: Cart Summary Box */}
            <div className="cart-summary-col">
              <div className="cart-summary-card">
                <h3 className="cart-summary-title font-serif">Order Summary</h3>
                <div className="summary-divider"></div>

                <div className="summary-row">
                  <span className="summary-label">Total Items</span>
                  <span className="summary-val">{totalItems}</span>
                </div>

                <div className="summary-row">
                  <span className="summary-label">Priced Items Subtotal</span>
                  <span className="summary-val highlight-gold">
                    {numericSubtotal > 0
                      ? `₹${numericSubtotal.toLocaleString('en-IN')}`
                      : 'N/A'}
                  </span>
                </div>

                {hasPriceOnRequest && (
                  <div className="price-on-request-notice">
                    <span className="notice-icon">ℹ️</span>
                    <span className="notice-text">
                      Some items are listed as <strong>"Price on Request"</strong>. The final price
                      for these custom creations will be confirmed during order processing.
                    </span>
                  </div>
                )}

                <div className="summary-divider"></div>

                <div className="cart-summary-actions">
                  <button
                    type="button"
                    className="btn btn-gold btn-lg cart-checkout-btn"
                    onClick={handleCheckoutClick}
                  >
                    <span>Proceed to Order / Enquire</span>
                    <span className="btn-icon-arrow">→</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline cart-continue-btn"
                    onClick={() => onNavigate && onNavigate('#chocolates')}
                  >
                    <span>Continue Shopping</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
