import React, { useState } from 'react';
import { BRAND_CONFIG } from '../config/brandConfig';

export default function ChocolatesSection({ onEnquireProduct, activeFilter: externalFilter }) {
  const [filter, setFilter] = useState(externalFilter || 'all');
  const [selectedFlavours, setSelectedFlavours] = useState({});
  const [selectedOccasions, setSelectedOccasions] = useState({});

  // If external filter changes, respect it
  React.useEffect(() => {
    if (externalFilter) {
      setFilter(externalFilter);
    }
  }, [externalFilter]);

  const getProductWhatsAppUrl = (prod, extraDetail = '') => {
    const waNumber = BRAND_CONFIG?.contact?.whatsappNumber || 'YOUR_WHATSAPP_NUMBER';
    let msg = '';

    if (prod.type === 'theme') {
      const occasionText = extraDetail ? ` for ${extraDetail}` : '';
      msg = `Hi Madhuri’s Choco Heaven, I’m interested in Theme-Based Chocolates${occasionText}. I’d like to discuss customisation, theme options and pricing.`;
    } else if (prod.type === 'corporate') {
      msg = `Hi Madhuri’s Choco Heaven, I’m interested in Corporate Chocolate Orders customised with our company logo/branding. Please share details on corporate packages, quantity and pricing.`;
    } else if (prod.type === 'bouquet') {
      msg = `Hi Madhuri’s Choco Heaven, I’m interested in Chocolate Bouquets. I’d like to know more about customisation, bouquet arrangements and pricing.`;
    } else if (prod.type === 'hamper') {
      msg = `Hi Madhuri’s Choco Heaven, I’m interested in Occasion Hampers. I’d like to discuss custom hamper arrangements, contents and pricing.`;
    } else if (prod.type === 'flavoured') {
      const flavourText = extraDetail ? ` (Flavour: ${extraDetail})` : '';
      msg = `Hi Madhuri’s Choco Heaven, I’m interested in Flavoured Chocolates${flavourText}. I’d like to know more about customisation, quantity and pricing.`;
    } else {
      msg = `Hi Madhuri’s Choco Heaven, I’m interested in ${prod.name}. I’d like to know more about customisation, quantity and pricing.`;
    }

    return `https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`;
  };

  const handleFlavourClick = (prodId, flavourName) => {
    setSelectedFlavours((prev) => {
      const current = prev[prodId];
      if (current === flavourName) {
        const copy = { ...prev };
        delete copy[prodId];
        return copy;
      }
      return { ...prev, [prodId]: flavourName };
    });
  };

  const handleOccasionClick = (prodId, occasionName) => {
    setSelectedOccasions((prev) => {
      const current = prev[prodId];
      if (current === occasionName) {
        const copy = { ...prev };
        delete copy[prodId];
        return copy;
      }
      return { ...prev, [prodId]: occasionName };
    });
  };

  const filteredChocolates = BRAND_CONFIG.chocolates.filter((prod) => {
    if (filter === 'all') return true;
    return prod.category === filter;
  });

  return (
    <section className="section-padding" id="chocolates" aria-labelledby="chocolates-heading">
      <div className="container">
        <div className="section-header reveal-on-scroll revealed">
          <div className="section-subtitle">Luxury Confectionery</div>
          <h2 className="section-title" id="chocolates-heading">
            Handcrafted <span className="text-gradient-gold">Chocolates</span>
          </h2>
          <p className="section-desc">
            Made with love, crafted for every craving and celebration.
          </p>
        </div>

        {/* Category Filter Bar */}
        <div
          className="category-filter-bar"
          data-filter-group="chocolates"
          role="tablist"
          aria-label="Chocolate Categories"
        >
          <button
            type="button"
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
            role="tab"
            aria-selected={filter === 'all'}
          >
            ALL
          </button>
          <button
            type="button"
            className={`filter-btn ${filter === 'classic' ? 'active' : ''}`}
            onClick={() => setFilter('classic')}
            role="tab"
            aria-selected={filter === 'classic'}
          >
            CLASSIC CHOCOLATES
          </button>
          <button
            type="button"
            className={`filter-btn ${filter === 'customised' ? 'active' : ''}`}
            onClick={() => setFilter('customised')}
            role="tab"
            aria-selected={filter === 'customised'}
          >
            CUSTOMISED
          </button>
          <button
            type="button"
            className={`filter-btn ${filter === 'gifting' ? 'active' : ''}`}
            onClick={() => setFilter('gifting')}
            role="tab"
            aria-selected={filter === 'gifting'}
          >
            GIFTING
          </button>
          <button
            type="button"
            className={`filter-btn ${filter === 'specialty' ? 'active' : ''}`}
            onClick={() => setFilter('specialty')}
            role="tab"
            aria-selected={filter === 'specialty'}
          >
            SPECIALTY
          </button>
          <button
            type="button"
            className={`filter-btn ${filter === 'flavoured' ? 'active' : ''}`}
            onClick={() => setFilter('flavoured')}
            role="tab"
            aria-selected={filter === 'flavoured'}
          >
            FLAVOURED
          </button>
        </div>

        {/* Dynamic Product Grid */}
        <div className="products-grid" id="chocolate-products-grid" aria-live="polite">
          {filteredChocolates.map((prod) => {
            const selectedFlavour = selectedFlavours[prod.id] || '';
            const selectedOccasion = selectedOccasions[prod.id] || '';
            const waUrl = getProductWhatsAppUrl(prod, selectedFlavour || selectedOccasion);

            return (
              <article
                key={prod.id}
                className={`product-card reveal-on-scroll revealed ${prod.isProminent ? 'product-card-prominent' : ''}`}
                data-category={prod.category}
                id={`card-${prod.id}`}
              >
                <div className="product-img-box">
                  <img
                    src={prod.image}
                    alt={`${prod.name} - Madhuri's Choco Heaven`}
                    loading="lazy"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'assets/images/chocolate_truffles_box.jpg';
                    }}
                  />
                  <div className="product-tags-row">
                    {prod.badge && (
                      <span className="badge-tag badge-gold badge-special">{prod.badge}</span>
                    )}
                    {prod.tags &&
                      prod.tags.map((tag, tIdx) => (
                        <span key={tIdx} className="badge-tag">
                          {tag}
                        </span>
                      ))}
                  </div>
                </div>

                <div className="product-body">
                  <div className="product-category-crumb">{prod.categoryLabel || 'Chocolates'}</div>
                  <h3 className="product-name">{prod.name}</h3>
                  <p className="product-desc">{prod.desc}</p>

                  {/* Theme-Based Occasions Chips */}
                  {prod.type === 'theme' && prod.supportedOccasions && (
                    <div className="product-occasions-box">
                      <span className="occasions-badge-label">Supported Occasions:</span>
                      <div className="occasions-chips-wrap">
                        {prod.supportedOccasions.map((occ) => (
                          <button
                            key={occ}
                            type="button"
                            className={`occasion-chip ${selectedOccasion === occ ? 'active' : ''}`}
                            onClick={() => handleOccasionClick(prod.id, occ)}
                            title={`Select ${occ}`}
                          >
                            {occ}
                          </button>
                        ))}
                        <span className="occasion-chip-extra">+ more celebrations</span>
                      </div>
                    </div>
                  )}

                  {/* Corporate Logo Placeholder Area */}
                  {prod.type === 'corporate' && (
                    <div className="corporate-branding-box">
                      <div className="corporate-logo-placeholder">
                        <span className="corp-placeholder-icon">🏢</span>
                        <div className="corp-placeholder-text">
                          <strong>Your Company Logo / Branding Here</strong>
                          <span>Placeholder for custom logo, corporate colors & bespoke packaging</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Flavoured Chocolate Selector Pills */}
                  {prod.type === 'flavoured' && prod.flavours && (
                    <div className="product-flavours-box">
                      <div className="flavours-header">
                        <span className="flavours-badge-label">Available Flavours:</span>
                        <span className="active-flavour-badge" id={`flavour-badge-${prod.id}`}>
                          {selectedFlavour ? `${selectedFlavour} Selected` : 'All Flavours'}
                        </span>
                      </div>
                      <div className="flavour-pills-row" data-product-id={prod.id}>
                        {prod.flavours.map((f) => (
                          <button
                            key={f.name}
                            type="button"
                            className={`flavour-pill ${selectedFlavour === f.name ? 'active' : ''}`}
                            onClick={() => handleFlavourClick(prod.id, f.name)}
                            title={`${f.name} Flavour`}
                          >
                            <span className="flavour-emoji">{f.emoji}</span>
                            <span className="flavour-name">{f.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="product-footer">
                    <div className="price-box">
                      <span className="price-label">Pricing</span>
                      <span className="price-text">{prod.priceTag || 'Price on Request'}</span>
                    </div>

                    <div className="product-actions-group">
                      <button
                        type="button"
                        className="btn btn-gold btn-sm action-enquire-product"
                        onClick={() => {
                          if (onEnquireProduct) {
                            onEnquireProduct({
                              product: prod.name,
                              category: prod.categoryLabel || 'Chocolates',
                              type: prod.type,
                              selectedFlavour,
                              selectedOccasion
                            });
                          }
                        }}
                      >
                        {prod.actionText || 'Customise & Enquire'}
                      </button>

                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-whatsapp-quick"
                        id={`wa-btn-${prod.id}`}
                        aria-label={`Enquire about ${prod.name} on WhatsApp`}
                        title="Direct WhatsApp Enquiry"
                      >
                        <span className="wa-quick-icon" aria-hidden="true">
                          💬
                        </span>
                        <span className="wa-quick-text">WhatsApp</span>
                      </a>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
