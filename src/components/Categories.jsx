import React from 'react';
import { BRAND_CONFIG } from '../config/brandConfig';

export default function Categories({ onNavigate }) {
  const handleLink = (e, hash) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate(hash);
    } else {
      window.location.hash = hash;
    }
  };

  return (
    <section className="section-padding" id="categories" aria-labelledby="categories-heading">
      <div className="container">
        <div className="section-header reveal-on-scroll revealed">
          <div className="section-subtitle">What We Create</div>
          <h2 className="section-title" id="categories-heading">
            Featured <span className="text-gradient-gold">Creations</span>
          </h2>
          <p className="section-desc">
            Explore our handcrafted range of chocolates, cakes, and bakes made fresh for your joyful milestones.
          </p>
        </div>

        <div className="categories-grid">
          {BRAND_CONFIG.categories.map((cat, idx) => (
            <article key={cat.id} className={`category-card reveal-on-scroll revealed ${idx > 0 ? `reveal-delay-${idx}` : ''}`}>
              <div className="category-image-wrap">
                <img src={cat.image} alt={cat.title} loading="lazy" />
                <div className="category-badge-overlay">
                  <span className="badge-tag badge-gold">{cat.badge}</span>
                </div>
              </div>
              <div className="category-content">
                <div className="category-icon">{cat.icon}</div>
                <h3 className="category-title">{cat.title}</h3>
                <p className="category-desc">{cat.desc}</p>
                <a
                  href={cat.link}
                  className="category-link"
                  onClick={(e) => handleLink(e, cat.link)}
                >
                  <span>Explore {cat.title.split('&')[0].trim()}</span>
                  <span className="arrow-icon">→</span>
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className="section-divider" aria-hidden="true"></div>
    </section>
  );
}
