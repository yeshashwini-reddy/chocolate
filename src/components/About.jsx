import React from 'react';

export default function About({ onNavigate }) {
  const handleLink = (e, hash) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate(hash);
    } else {
      window.location.hash = hash;
    }
  };

  return (
    <section className="section-padding" id="about" aria-labelledby="about-heading">
      <div className="container">
        <div className="about-grid">
          {/* Visual Column */}
          <div className="about-visual reveal-on-scroll revealed">
            <div className="about-image-card">
              <img
                src="assets/images/about_artisan_craft.jpg"
                alt="Handcrafting artisan chocolate truffles with fine cocoa dusting"
                loading="lazy"
              />
              <div className="about-experience-badge">
                <div className="about-badge-num">100%</div>
                <div className="about-badge-label">Artisan Love</div>
              </div>
            </div>
          </div>

          {/* Content Column */}
          <div className="about-content reveal-on-scroll reveal-delay-2 revealed">
            <div className="section-subtitle">Our Sweet Story</div>
            <h2 className="section-title" id="about-heading">
              Made With Love, <br />
              <span className="text-gradient-gold">Crafted For Your Moments.</span>
            </h2>
            <p className="about-lead">
              “At Madhuri’s Choco Heaven, every creation is made with care, creativity and a whole lot of love. From
              handcrafted chocolates to freshly baked cakes and treats, we create delicious moments for every
              celebration.”
            </p>
            <p className="about-text">
              What started from a heartfelt passion for confectionery has blossomed into a cherished boutique brand.
              We believe that true celebrations deserve more than mass-produced sweets. That's why every batch of our
              chocolates is hand-tempered, every cake is baked fresh upon order, and every gift box is packaged with
              delicate elegance.
            </p>

            <div className="about-occasions-wrap">
              <div className="about-occasions-title">Specialising in custom treats for:</div>
              <div className="about-occasions-tags">
                <span className="about-tag">🎂 Birthdays</span>
                <span className="about-tag">💍 Weddings</span>
                <span className="about-tag">❤️ Anniversaries</span>
                <span className="about-tag">👶 Baby Showers</span>
                <span className="about-tag">🎉 Festivals</span>
                <span className="about-tag">🎁 Return Gifts</span>
                <span className="about-tag">🏢 Corporate Gifting</span>
                <span className="about-tag">✨ Special Milestones</span>
              </div>
            </div>

            <a
              href="#custom-order"
              className="btn btn-gold"
              onClick={(e) => handleLink(e, '#custom-order')}
            >
              <span>Plan Your Celebration Treats</span>
              <span className="btn-icon-arrow">→</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
