import React, { useState } from 'react';
import { BRAND_CONFIG } from '../config/brandConfig';
import AddToCartButton from './AddToCartButton';

export default function CakesAndBakesSection({ onEnquireProduct, activeFilter: externalFilter, showToast }) {
  const [filter, setFilter] = useState(externalFilter || 'all');

  React.useEffect(() => {
    if (externalFilter) {
      setFilter(externalFilter);
    }
  }, [externalFilter]);

  const filteredBakes = BRAND_CONFIG.cakesAndBakes.filter((prod) => {
    if (filter === 'all') return true;
    return prod.category === filter;
  });

  return (
    <section className="section-padding" id="cakes-bakes" aria-labelledby="bakes-heading">
      <div className="container">
        <div className="section-header reveal-on-scroll revealed">
          <div className="section-subtitle">Fresh From Our Oven</div>
          <h2 className="section-title" id="bakes-heading">
            Cakes & <span className="text-gradient-gold">Artisan Bakes</span>
          </h2>
          <p className="section-desc">
            Baked to order with premium butter, fresh eggs or eggless options, and pure Belgian cocoa. Warmth you
            can taste in every single bite.
          </p>
        </div>

        {/* Category Filter Bar */}
        <div className="category-filter-bar" data-filter-group="cakes-bakes">
          <button
            type="button"
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Bakes
          </button>
          <button
            type="button"
            className={`filter-btn ${filter === 'cakes' ? 'active' : ''}`}
            onClick={() => setFilter('cakes')}
          >
            Celebration Cakes
          </button>
          <button
            type="button"
            className={`filter-btn ${filter === 'cupcakes' ? 'active' : ''}`}
            onClick={() => setFilter('cupcakes')}
          >
            Cupcakes & Muffins
          </button>
          <button
            type="button"
            className={`filter-btn ${filter === 'brownies' ? 'active' : ''}`}
            onClick={() => setFilter('brownies')}
          >
            Fudgy Brownies
          </button>
          <button
            type="button"
            className={`filter-btn ${filter === 'cookies' ? 'active' : ''}`}
            onClick={() => setFilter('cookies')}
          >
            Artisan Cookies
          </button>
          <button
            type="button"
            className={`filter-btn ${filter === 'plum-cake' ? 'active' : ''}`}
            onClick={() => setFilter('plum-cake')}
          >
            Spiced Plum Cake
          </button>
        </div>

        <div className="products-grid bakes-products-grid">
          {filteredBakes.map((prod) => (
            <article
              key={prod.id}
              className="product-card bakes-product-card reveal-on-scroll revealed"
              data-category={prod.category}
            >
              <div className="product-img-box">
                <img src={prod.image} alt={prod.name} loading="lazy" />
                <div className="product-tags-row">
                  {prod.tags.map((tag, tIdx) => (
                    <span key={tIdx} className="badge-tag badge-gold">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="product-body">
                <h3 className="product-name">{prod.name}</h3>
                <p className="product-desc">{prod.desc}</p>
                
                {/* Bottom section: Divider, Pricing & Action Buttons */}
                <div className="product-card-bottom">
                  <div className="product-card-divider" role="separator" />

                  <div className="product-price-section">
                    <span className="price-overhead-label">PRICE</span>
                    <span className="price-amount">{prod.priceTag || (prod.price ? `₹${prod.price}` : 'Price on Request')}</span>
                  </div>

                  <div className="product-card-actions">
                    <button
                      type="button"
                      className="btn-customise-enquire action-enquire-product"
                      onClick={() => {
                        if (onEnquireProduct) {
                          onEnquireProduct({
                            product: prod.name,
                            category: prod.categoryLabel || 'Cakes'
                          });
                        }
                      }}
                    >
                      Customise & Enquire
                    </button>
                    <AddToCartButton
                      product={prod}
                      showToast={showToast}
                      className="btn-card-add-cart"
                    />
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
