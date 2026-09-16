import React, { useState, useEffect } from 'react';
import { BRAND_CONFIG } from '../config/brandConfig';

export default function Gallery({ onEnquireGalleryItem }) {
  const [filter, setFilter] = useState('all');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSwitching, setIsSwitching] = useState(false);

  const filteredItems = BRAND_CONFIG.gallery.filter((item) => {
    if (filter === 'all') return true;
    return item.category === filter;
  });

  const openLightbox = (index) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    document.body.style.overflow = '';
  };

  const nextImage = (e) => {
    if (e) e.stopPropagation();
    if (filteredItems.length === 0) return;
    setIsSwitching(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % filteredItems.length);
      setIsSwitching(false);
    }, 150);
  };

  const prevImage = (e) => {
    if (e) e.stopPropagation();
    if (filteredItems.length === 0) return;
    setIsSwitching(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
      setIsSwitching(false);
    }, 150);
  };

  // Keyboard navigation
  useEffect(() => {
    if (!lightboxOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, filteredItems.length]);

  const currentItem = filteredItems[currentIndex] || filteredItems[0];
  const counterText = `${String(currentIndex + 1).padStart(2, '0')} / ${String(
    filteredItems.length
  ).padStart(2, '0')}`;

  return (
    <section className="section-padding" id="gallery" aria-labelledby="gallery-heading">
      <div className="container">
        <div className="section-header reveal-on-scroll revealed">
          <div className="section-subtitle">Visual Showcase</div>
          <h2 className="section-title" id="gallery-heading">
            Our Sweet <span className="text-gradient-gold">Gallery</span>
          </h2>
          <p className="section-desc">
            A glimpse into our handcrafted chocolates, celebration cakes, festive hampers, and gifting setups. Click
            any photo to view in detail.
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="gallery-filters reveal-on-scroll revealed">
          <button
            type="button"
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => {
              setFilter('all');
              setCurrentIndex(0);
            }}
          >
            All Creations
          </button>
          <button
            type="button"
            className={`filter-btn ${filter === 'chocolates' ? 'active' : ''}`}
            onClick={() => {
              setFilter('chocolates');
              setCurrentIndex(0);
            }}
          >
            Chocolates
          </button>
          <button
            type="button"
            className={`filter-btn ${filter === 'cakes' ? 'active' : ''}`}
            onClick={() => {
              setFilter('cakes');
              setCurrentIndex(0);
            }}
          >
            Cakes & Bakes
          </button>
          <button
            type="button"
            className={`filter-btn ${filter === 'gifts' ? 'active' : ''}`}
            onClick={() => {
              setFilter('gifts');
              setCurrentIndex(0);
            }}
          >
            Gift Hampers
          </button>
        </div>

        {/* Gallery Grid */}
        <div className="gallery-grid" id="gallery-grid">
          {filteredItems.map((item, idx) => (
            <div
              key={item.id}
              className="gallery-item"
              data-category={item.category}
              data-title={item.title}
              data-caption={item.caption}
              onClick={() => openLightbox(idx)}
            >
              <img src={item.image} alt={item.title} loading="lazy" />
              <div className="gallery-overlay">
                <span className="gallery-overlay-badge">{item.categoryLabel}</span>
                <div className="gallery-overlay-title">{item.shortTitle || item.title}</div>
                <p className="gallery-overlay-caption">{item.shortCaption || item.caption}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && currentItem && (
        <div
          className="lightbox-modal open"
          id="lightbox-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Image Lightbox"
          onClick={(e) => {
            if (e.target.id === 'lightbox-modal') closeLightbox();
          }}
        >
          <div className="lightbox-counter" id="lightbox-counter">
            {counterText}
          </div>
          <button
            type="button"
            className="lightbox-close-btn"
            id="lightbox-close"
            aria-label="Close Lightbox"
            onClick={closeLightbox}
          >
            ✕
          </button>
          <button
            type="button"
            className="lightbox-nav-btn lightbox-prev"
            id="lightbox-prev"
            aria-label="Previous Image"
            onClick={prevImage}
          >
            ‹
          </button>
          <button
            type="button"
            className="lightbox-nav-btn lightbox-next"
            id="lightbox-next"
            aria-label="Next Image"
            onClick={nextImage}
          >
            ›
          </button>

          <div className="lightbox-content">
            <div className="lightbox-img-wrap">
              <img
                src={currentItem.image}
                id="lightbox-img"
                alt={currentItem.title}
                className={isSwitching ? 'switching' : ''}
              />
            </div>
            <div className="lightbox-details">
              <div className="lightbox-info">
                <h4 className="lightbox-title" id="lightbox-title">
                  {currentItem.title}
                </h4>
                <p className="lightbox-caption" id="lightbox-caption">
                  {currentItem.caption}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-gold btn-sm"
                id="lightbox-enquire-btn"
                onClick={() => {
                  closeLightbox();
                  if (onEnquireGalleryItem) onEnquireGalleryItem(currentItem);
                }}
              >
                <span>Enquire About This</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
