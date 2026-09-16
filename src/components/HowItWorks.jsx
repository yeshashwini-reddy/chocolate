import React, { useState } from 'react';
import { BRAND_CONFIG } from '../config/brandConfig';

export default function HowItWorks() {
  const [activeStage, setActiveStage] = useState(1);

  const stagePercent = { 1: 25, 2: 50, 3: 75, 4: 100 };
  const fillWidth = `${stagePercent[activeStage] || 25}%`;

  return (
    <section className="section-padding story-section" id="how-it-works" aria-labelledby="how-heading">
      <div className="container">
        <div className="section-header reveal-on-scroll revealed">
          <div className="section-subtitle">Artisan Journey</div>
          <h2 className="section-title" id="how-heading">
            From Cocoa to <span className="text-gradient-gold">Celebration</span>
          </h2>
          <p className="section-desc">
            Follow the heartfelt handcrafted journey — from carefully selected origin cocoa and slow small-batch baking to
            bespoke customisation and unforgettable celebrations.
          </p>
        </div>

        {/* Interactive Story Timeline Track */}
        <div className="story-timeline-track" aria-hidden="true">
          <div className="story-timeline-line"></div>
          <div
            className="story-timeline-fill"
            id="story-timeline-fill"
            style={{ width: fillWidth }}
          ></div>
        </div>

        <div className="how-grid story-grid">
          {BRAND_CONFIG.howItWorks.map((item, idx) => {
            const stageNum = idx + 1;
            const isCurrent = activeStage === stageNum;

            return (
              <div
                key={item.step}
                className={`how-card story-card reveal-on-scroll revealed ${idx > 0 ? `reveal-delay-${idx}` : ''} ${
                  isCurrent ? 'active-stage' : ''
                }`}
                data-stage={stageNum}
                onMouseEnter={() => setActiveStage(stageNum)}
                onClick={() => setActiveStage(stageNum)}
              >
                <div className="how-step-badge">{item.step}</div>
                <div className="story-stage-tag">{item.stageTag}</div>
                <div className="how-icon-box story-icon-box">{item.icon}</div>
                <h3 className="how-card-title">{item.title}</h3>
                <p className="how-card-desc">{item.desc}</p>
                <div className="story-card-highlight">{item.highlight}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
