import React from 'react';
import { BRAND_CONFIG } from '../config/brandConfig';

export default function WhyChooseUs() {
  return (
    <section
      className="section-padding"
      id="why-choose-us"
      aria-labelledby="why-heading"
      style={{ background: 'var(--bg-secondary)' }}
    >
      <div className="container">
        <div className="section-header reveal-on-scroll revealed">
          <div className="section-subtitle">Our Promise</div>
          <h2 className="section-title" id="why-heading">
            Why Choose <span className="text-gradient-gold">Madhuri’s Choco Heaven</span>
          </h2>
          <p className="section-desc">
            The difference between industrial mass production and authentic homemade craftsmanship.
          </p>
        </div>

        <div className="why-grid">
          {BRAND_CONFIG.whyChooseUs.map((item, idx) => (
            <div
              key={idx}
              className={`why-card reveal-on-scroll revealed ${idx % 3 > 0 ? `reveal-delay-${idx % 3}` : ''}`}
            >
              <div className="why-icon-wrap">{item.icon}</div>
              <div className="why-body-wrap">
                <h3 className="why-title">{item.title}</h3>
                <p className="why-desc">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
