import React from 'react';
import { BRAND_CONFIG } from '../config/brandConfig';

export default function Footer({ onNavigate }) {
  const handleLink = (e, hash) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate(hash);
    } else {
      window.location.hash = hash;
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="site-footer" role="contentinfo">
      <div className="container">
        <div className="footer-grid">
          {/* Brand Col */}
          <div className="footer-brand">
            <a
              href="#home"
              className="brand-logo footer-brand-logo"
              aria-label="Madhuri's Choco Heaven Home"
              onClick={(e) => handleLink(e, '#home')}
            >
              <img
                src="assets/images/logo.png"
                alt="Madhuri's Choco Heaven Official Brand Logo"
                className="footer-logo-img"
                width="80"
                height="80"
              />
              <div className="brand-text">
                <span className="brand-title">Madhuri’s</span>
                <span className="brand-highlight">Choco Heaven</span>
              </div>
            </a>
            <p className="footer-tagline">“Where every celebration becomes a little sweeter!”</p>
            <p className="footer-desc">
              Handcrafted homemade chocolates, customised celebration gift boxes, fresh cakes, and artisanal baked treats
              made with love for your special occasions.
            </p>
            <div className="footer-brand-strip" style={{ fontSize: '0.85rem', color: 'var(--gold-400)', fontWeight: 600 }}>
              🍫 Homemade • 🎂 Freshly Baked • 🎁 Customised • ❤️ Made with Love
            </div>
          </div>

          {/* Quick Links */}
          <div className="footer-col">
            <h4 className="footer-col-title">Explore</h4>
            <div className="footer-links">
              <a href="#home" className="footer-link" onClick={(e) => handleLink(e, '#home')}>
                Home
              </a>
              <a href="#about" className="footer-link" onClick={(e) => handleLink(e, '#about')}>
                About Us
              </a>
              <a href="#categories" className="footer-link" onClick={(e) => handleLink(e, '#categories')}>
                Categories
              </a>
              <a href="#chocolates" className="footer-link" onClick={(e) => handleLink(e, '#chocolates')}>
                Handcrafted Chocolates
              </a>
              <a href="#cakes-bakes" className="footer-link" onClick={(e) => handleLink(e, '#cakes-bakes')}>
                Cakes & Bakes
              </a>
              <a href="#custom-order" className="footer-link" onClick={(e) => handleLink(e, '#custom-order')}>
                Custom Orders
              </a>
            </div>
          </div>

          {/* Occasions Links */}
          <div className="footer-col">
            <h4 className="footer-col-title">Occasions</h4>
            <div className="footer-links">
              <a href="#occasions" className="footer-link" onClick={(e) => handleLink(e, '#occasions')}>
                Birthdays & Parties
              </a>
              <a href="#occasions" className="footer-link" onClick={(e) => handleLink(e, '#occasions')}>
                Weddings & Engagements
              </a>
              <a href="#occasions" className="footer-link" onClick={(e) => handleLink(e, '#occasions')}>
                Anniversaries
              </a>
              <a href="#occasions" className="footer-link" onClick={(e) => handleLink(e, '#occasions')}>
                Baby Showers
              </a>
              <a href="#occasions" className="footer-link" onClick={(e) => handleLink(e, '#occasions')}>
                Festivals & Hampers
              </a>
              <a href="#occasions" className="footer-link" onClick={(e) => handleLink(e, '#occasions')}>
                Return Gifts
              </a>
            </div>
          </div>

          {/* Contact & Connect */}
          <div className="footer-col">
            <h4 className="footer-col-title">Connect</h4>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-dim)', marginBottom: '12px' }}>
              Pre-orders recommended for all customized chocolates and baked creations.
            </p>
            <div className="footer-links">
              <a
                href={`https://wa.me/${BRAND_CONFIG.contact.whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-link"
              >
                💬 Chat on WhatsApp
              </a>
              <a href={`tel:${BRAND_CONFIG.contact.phoneNumber}`} className="footer-link">
                📞 Call Us Directly
              </a>
              <a href={`mailto:${BRAND_CONFIG.contact.email}`} className="footer-link">
                ✉️ Email Inquiries
              </a>
            </div>
            <div className="footer-social-row">
              <a
                href={BRAND_CONFIG.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="social-icon-btn"
                aria-label="Instagram"
              >
                <span>📸</span>
              </a>
              <a
                href={`https://wa.me/${BRAND_CONFIG.contact.whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="social-icon-btn"
                aria-label="WhatsApp"
              >
                <span>💬</span>
              </a>
              <a
                href={BRAND_CONFIG.social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="social-icon-btn"
                aria-label="Facebook"
              >
                <span>👍</span>
              </a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <div>© 2026 Madhuri’s Choco Heaven. All rights reserved. Handcrafted with love.</div>
          <button
            type="button"
            className="back-to-top"
            id="back-to-top"
            aria-label="Scroll to top of page"
            onClick={scrollToTop}
          >
            <span>Back to Top</span>
            <span>↑</span>
          </button>
        </div>
      </div>
    </footer>
  );
}
