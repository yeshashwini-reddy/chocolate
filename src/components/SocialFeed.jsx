import React from 'react';
import { BRAND_CONFIG } from '../config/brandConfig';

export default function SocialFeed() {
  return (
    <section className="section-padding" id="instagram-feed" aria-labelledby="social-heading">
      <div className="container">
        <div className="section-header reveal-on-scroll revealed">
          <div className="section-subtitle">Stay Connected</div>
          <h2 className="section-title" id="social-heading">
            Sweet Moments, <br />
            <span className="text-gradient-gold">One Post At A Time.</span>
          </h2>
          <p className="section-desc">
            Follow our confectionery journey on Instagram for fresh batch previews, baking reels, and celebration
            setup inspirations.
          </p>
        </div>

        <div className="social-grid reveal-on-scroll revealed">
          {BRAND_CONFIG.socialPosts.map((post, idx) => (
            <div key={idx} className="social-card">
              <img src={post.image} alt={post.tag} loading="lazy" />
              <div className="social-overlay">
                <span className="social-insta-icon">📷</span>
                <span className="social-tag">{post.tag}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center' }} className="reveal-on-scroll revealed">
          <a
            href={BRAND_CONFIG.social.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline"
            id="social-follow-btn"
          >
            <span>Follow Madhuri’s Choco Heaven</span>
            <span>📷</span>
          </a>
        </div>
      </div>
    </section>
  );
}
