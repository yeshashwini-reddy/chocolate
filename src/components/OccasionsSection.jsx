import React, { useState } from 'react';
import { BRAND_CONFIG } from '../config/brandConfig';

const occasionImageMap = {
  'birthdays': 'assets/images/celebration_cake.jpg',
  'weddings': 'assets/images/chocolate_truffles_box.jpg',
  'anniversaries': 'assets/images/chocolate_truffles_box.jpg',
  'baby-showers': 'assets/images/cupcakes_muffins.jpg',
  'festivals': 'assets/images/festive_plum_cake.jpg',
  'return-gifts': 'assets/images/custom_chocolate_bars.jpg',
  'corporate': 'assets/images/custom_gift_hamper.jpg',
  'special-celebrations': 'assets/images/fudgy_brownies_cookies.jpg'
};

const occasionTreatChipsMap = {
  'birthdays': [
    { name: 'Theme-Based Chocolates', icon: '🎨', filter: 'customised', section: 'chocolates', hash: '#chocolates' },
    { name: 'Celebration Theme Cakes', icon: '🎂', filter: 'cakes', section: 'cakes-bakes', hash: '#cakes-bakes' },
    { name: 'Assorted Cupcakes', icon: '🧁', filter: 'cupcakes', section: 'cakes-bakes', hash: '#cakes-bakes' },
    { name: 'Custom Chocolate Bars', icon: '🍫', filter: 'classic', section: 'chocolates', hash: '#chocolates' }
  ],
  'weddings': [
    { name: 'Customised Gift Boxes', icon: '🎁', filter: 'gifting', section: 'chocolates', hash: '#chocolates' },
    { name: 'Occasion Hampers', icon: '🎀', filter: 'gifting', section: 'chocolates', hash: '#chocolates' },
    { name: 'Tier Celebration Cakes', icon: '🎂', filter: 'cakes', section: 'cakes-bakes', hash: '#cakes-bakes' },
    { name: 'Wine-Shaped Chocolates', icon: '🍷', filter: 'specialty', section: 'chocolates', hash: '#chocolates' }
  ],
  'anniversaries': [
    { name: 'Artisan Dark Chocolate', icon: '🍫', filter: 'classic', section: 'chocolates', hash: '#chocolates' },
    { name: 'Theme-Based Chocolates', icon: '❤️', filter: 'customised', section: 'chocolates', hash: '#chocolates' },
    { name: 'Spiced Plum Cake', icon: '🍰', filter: 'plum-cake', section: 'cakes-bakes', hash: '#cakes-bakes' },
    { name: 'Occasion Hampers', icon: '🎁', filter: 'gifting', section: 'chocolates', hash: '#chocolates' }
  ],
  'baby-showers': [
    { name: 'Creamy White Chocolate', icon: '🤍', filter: 'classic', section: 'chocolates', hash: '#chocolates' },
    { name: 'Decorated Cupcakes', icon: '🧁', filter: 'cupcakes', section: 'cakes-bakes', hash: '#cakes-bakes' },
    { name: 'Theme-Based Chocolates', icon: '👶', filter: 'customised', section: 'chocolates', hash: '#chocolates' },
    { name: 'Artisan Cookies', icon: '🍪', filter: 'cookies', section: 'cakes-bakes', hash: '#cakes-bakes' }
  ],
  'festivals': [
    { name: 'Dry Fruit Chocolates', icon: '🥜', filter: 'classic', section: 'chocolates', hash: '#chocolates' },
    { name: 'Tutti Fruity Chocolates', icon: '🍒', filter: 'flavoured', section: 'chocolates', hash: '#chocolates' },
    { name: 'Dates & Almonds Chocolates', icon: '✨', filter: 'flavoured', section: 'chocolates', hash: '#chocolates' },
    { name: 'Festive Occasion Hampers', icon: '🎉', filter: 'gifting', section: 'chocolates', hash: '#chocolates' }
  ],
  'return-gifts': [
    { name: 'Chocolate Bars', icon: '🍫', filter: 'classic', section: 'chocolates', hash: '#chocolates' },
    { name: 'Fudgy Brownie Bites', icon: '✨', filter: 'brownies', section: 'cakes-bakes', hash: '#cakes-bakes' },
    { name: 'Assorted Butter Cookies', icon: '🍪', filter: 'cookies', section: 'cakes-bakes', hash: '#cakes-bakes' },
    { name: 'Customised Name Boxes', icon: '🎁', filter: 'customised', section: 'chocolates', hash: '#chocolates' }
  ],
  'corporate': [
    { name: 'Corporate Logo Chocolates', icon: '🏢', filter: 'customised', section: 'chocolates', hash: '#chocolates' },
    { name: 'Dark Chocolate Bars', icon: '🍫', filter: 'classic', section: 'chocolates', hash: '#chocolates' },
    { name: 'Bespoke Executive Hampers', icon: '🎁', filter: 'gifting', section: 'chocolates', hash: '#chocolates' }
  ],
  'special-celebrations': [
    { name: 'Chocolate Bouquets', icon: '💐', filter: 'specialty', section: 'chocolates', hash: '#chocolates' },
    { name: 'Bounty Coconut Bars', icon: '🥥', filter: 'specialty', section: 'chocolates', hash: '#chocolates' },
    { name: 'Celebration Cakes', icon: '🎂', filter: 'cakes', section: 'cakes-bakes', hash: '#cakes-bakes' },
    { name: 'Occasion Hampers', icon: '🎀', filter: 'gifting', section: 'chocolates', hash: '#chocolates' }
  ]
};

export default function OccasionsSection({ onEnquireOccasion, onChipNavigate }) {
  const [activeOccasionId, setActiveOccasionId] = useState('birthdays');

  const occ = BRAND_CONFIG.occasions.find((o) => o.id === activeOccasionId) || BRAND_CONFIG.occasions[0];
  const chips = occasionTreatChipsMap[activeOccasionId] || occasionTreatChipsMap['birthdays'];
  const imageUrl = occasionImageMap[activeOccasionId] || 'assets/images/celebration_cake.jpg';

  const handleChipClick = (e, chip) => {
    e.preventDefault();
    if (onChipNavigate) {
      onChipNavigate(chip.hash, chip.filter);
    } else {
      window.location.hash = chip.hash;
    }
  };

  return (
    <section className="section-padding occasions-section" id="occasions" aria-labelledby="occasions-heading">
      <div className="container">
        <div className="section-header reveal-on-scroll revealed">
          <div className="section-subtitle">Crafted For Your Milestones</div>
          <h2 className="section-title" id="occasions-heading">
            Sweet Treats For <span className="text-gradient-gold">Every Occasion</span>
          </h2>
          <p className="section-desc">
            Whether welcoming a newborn, sealing vows, or surprising loved ones on their birthday, find the tailored
            treat collection designed for your moment.
          </p>
        </div>

        {/* Occasions Switcher Navigation */}
        <div className="occasions-nav reveal-on-scroll revealed">
          {BRAND_CONFIG.occasions.map((o) => (
            <button
              key={o.id}
              type="button"
              className={`occasion-btn ${activeOccasionId === o.id ? 'active' : ''}`}
              onClick={() => setActiveOccasionId(o.id)}
            >
              {o.icon} {o.name}
            </button>
          ))}
        </div>

        {/* Active Occasion Display Card */}
        <div className="occasion-display-card">
          <div className="occasion-info-col">
            <div className="occasion-lead">
              <span className="occasion-icon-large" id="occasion-icon">
                {occ.icon}
              </span>
              <h3 className="occasion-title-large" id="occasion-title">
                {occ.name}
              </h3>
            </div>
            <p className="occasion-tagline" id="occasion-tagline">
              {occ.tagline}
            </p>
            <p className="occasion-details" id="occasion-desc">
              {occ.description}
            </p>

            <div className="occasion-treats-box">
              <div className="occasion-treats-label">Recommended Treats For This Occasion:</div>
              <ul className="occasion-treats-list" id="occasion-treats-list">
                {occ.treats.map((treat, tIdx) => (
                  <li key={tIdx}>{treat}</li>
                ))}
              </ul>
            </div>

            {/* Dynamic Matching Treats Showcase */}
            <div className="occasion-matched-box">
              <div className="occasion-treats-label">Matching Catalogue Treats:</div>
              <div className="occasion-matched-chips" id="occasion-matched-chips">
                {chips.map((chip, cIdx) => (
                  <a
                    key={cIdx}
                    href={chip.hash}
                    className="occasion-matched-chip"
                    onClick={(e) => handleChipClick(e, chip)}
                    title={`Explore ${chip.name}`}
                  >
                    <span className="occasion-matched-chip-icon">{chip.icon}</span>
                    <span>{chip.name}</span>
                  </a>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="btn btn-gold"
              id="occasion-enquire-btn"
              onClick={() => {
                if (onEnquireOccasion) onEnquireOccasion(occ.name);
              }}
            >
              <span>Enquire For This Occasion</span>
              <span className="btn-icon-arrow">→</span>
            </button>
          </div>

          <div className="occasion-visual-col">
            <img
              src={imageUrl}
              id="occasion-image"
              alt={`${occ.name} celebration treats`}
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
