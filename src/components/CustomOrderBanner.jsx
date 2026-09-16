import React from 'react';

export default function CustomOrderBanner({ onNavigate }) {
  const handleLink = (e, hash) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate(hash);
    } else {
      window.location.hash = hash;
    }
  };

  return (
    <section className="section-padding custom-order-section" id="custom-order" aria-labelledby="custom-heading">
      <div className="container">
        <div className="custom-order-banner reveal-on-scroll revealed">
          <div className="section-subtitle">Personalised Perfection</div>
          <h2 className="section-title" id="custom-heading">
            Dream It. Customise It. <br />
            <span className="text-gradient-gold">Make It Sweeter.</span>
          </h2>
          <p className="section-desc" style={{ maxWidth: '680px', margin: '0 auto' }}>
            We believe gifting is an art. That’s why everything from flavor profiles to bespoke packaging can be
            tailored to match your theme, vision, and guest list.
          </p>

          <div className="custom-features-row">
            <div className="custom-feature-item">
              <div className="custom-feature-icon">🎨</div>
              <div className="custom-feature-title">Theme & Color</div>
              <div className="custom-feature-desc">Packaging and ribbons curated to match your event's exact palette.</div>
            </div>
            <div className="custom-feature-item">
              <div className="custom-feature-icon">🍫</div>
              <div className="custom-feature-title">Bespoke Flavours</div>
              <div className="custom-feature-desc">Dark, Milk, White, Roasted Nuts, Berry Ganache, Sea Salt & Caramels.</div>
            </div>
            <div className="custom-feature-item">
              <div className="custom-feature-icon">✍️</div>
              <div className="custom-feature-title">Personal Inscriptions</div>
              <div className="custom-feature-desc">Names, dates, initials, or heartfelt greeting cards in every box.</div>
            </div>
            <div className="custom-feature-item">
              <div className="custom-feature-icon">📦</div>
              <div className="custom-feature-title">Flexible Quantities</div>
              <div className="custom-feature-desc">From single milestone gift boxes to 500+ guest return gift hampers.</div>
            </div>
          </div>

          <a
            href="#contact"
            className="btn btn-gold btn-lg"
            onClick={(e) => handleLink(e, '#contact')}
          >
            <span>Start Your Custom Order</span>
            <span className="btn-icon-arrow">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
