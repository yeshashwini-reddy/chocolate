import React, { useState, useEffect, useRef } from 'react';
import { BRAND_CONFIG } from '../config/brandConfig';

export default function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartXRef = useRef(0);
  const totalSlides = BRAND_CONFIG.testimonials.length;

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const goToSlide = (idx) => {
    setCurrentIndex(idx);
  };

  // Autoplay
  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      nextSlide();
    }, 5500);

    return () => clearInterval(timer);
  }, [isPaused, totalSlides]);

  const handleTouchStart = (e) => {
    touchStartXRef.current = e.touches[0].clientX;
    setIsPaused(true);
  };

  const handleTouchEnd = (e) => {
    const endX = e.changedTouches[0].clientX;
    const diff = touchStartXRef.current - endX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) nextSlide();
      else prevSlide();
    }
    setIsPaused(false);
  };

  return (
    <section
      className="section-padding"
      id="testimonials"
      aria-labelledby="testimonials-heading"
      style={{ background: 'var(--bg-secondary)' }}
    >
      <div className="container">
        <div className="section-header reveal-on-scroll revealed">
          <div className="section-subtitle">Sweet Words From Customers</div>
          <h2 className="section-title" id="testimonials-heading">
            Moments Made <span className="text-gradient-gold">Memorable</span>
          </h2>
          <p className="section-desc">
            Real feedback from customers whose celebrations were sweetened by Madhuri's Choco Heaven.
          </p>
        </div>

        <div
          className="testimonials-wrapper reveal-on-scroll revealed"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div
            className="testimonials-track"
            id="testimonial-track"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {BRAND_CONFIG.testimonials.map((t) => (
              <div key={t.id} className="testimonial-slide">
                <div className="testimonial-card">
                  <div className="testimonial-stars" aria-label="5 stars rating">
                    {'★'.repeat(t.rating)}
                  </div>
                  <p className="testimonial-quote">{t.quote}</p>
                  <div className="testimonial-client">
                    <div className="testimonial-name">{t.name}</div>
                    <div className="testimonial-occasion">{t.occasion}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="carousel-controls">
            <button
              type="button"
              className="carousel-arrow"
              id="testimonial-prev"
              aria-label="Previous testimonial"
              onClick={prevSlide}
            >
              ‹
            </button>
            <div className="carousel-dots" id="testimonial-dots">
              {BRAND_CONFIG.testimonials.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`carousel-dot ${idx === currentIndex ? 'active' : ''}`}
                  aria-label={`Go to testimonial ${idx + 1}`}
                  onClick={() => goToSlide(idx)}
                />
              ))}
            </div>
            <button
              type="button"
              className="carousel-arrow"
              id="testimonial-next"
              aria-label="Next testimonial"
              onClick={nextSlide}
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
