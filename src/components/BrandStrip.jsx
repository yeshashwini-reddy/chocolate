import React from 'react';

export default function BrandStrip() {
  return (
    <section className="brand-strip" aria-label="Brand Philosophy Banner">
      <div className="container">
        <div className="brand-strip-inner">
          <div className="brand-pill"><span>🍫</span> Homemade</div>
          <div className="brand-pill-separator">•</div>
          <div className="brand-pill"><span>🎂</span> Freshly Baked</div>
          <div className="brand-pill-separator">•</div>
          <div className="brand-pill"><span>🎁</span> Customised</div>
          <div className="brand-pill-separator">•</div>
          <div className="brand-pill"><span>❤️</span> Made with Love</div>
        </div>
      </div>
    </section>
  );
}
