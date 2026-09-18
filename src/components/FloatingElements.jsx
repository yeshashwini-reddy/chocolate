import React, { useState, useEffect } from 'react';

export default function FloatingElements({ toastMessage }) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const totalScrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScrollHeight > 0) {
        const progress = Math.min(100, Math.max(0, (scrollY / totalScrollHeight) * 100));
        setScrollProgress(progress);
      }
      setShowBackToTop(scrollY > 380);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* Top Scroll Progress Indicator */}
      <div
        className="scroll-progress-bar"
        id="scroll-progress-bar"
        style={{ width: `${scrollProgress}%` }}
        aria-hidden="true"
      ></div>

      {/* Floating WhatsApp Quick Enquiry Button */}
      <a
        href="https://wa.me/918978889929"
        target="_blank"
        rel="noopener noreferrer"
        className="floating-whatsapp"
        id="floating-whatsapp-btn"
        aria-label="Chat on WhatsApp"
      >
        <span className="floating-whatsapp-pulse"></span>
        <span aria-hidden="true">💬</span>
      </a>

      {/* Floating Back to Top Button */}
      <button
        type="button"
        className={`floating-back-to-top ${showBackToTop ? 'visible' : ''}`}
        id="back-to-top-float"
        aria-label="Scroll back to top"
        onClick={scrollToTop}
      >
        <span className="back-to-top-icon" aria-hidden="true">
          ↑
        </span>
        <span className="back-to-top-label">TOP</span>
      </button>

      {/* Toast Notification */}
      {toastMessage && (
        <div id="toast-notice" className="toast-notice show">
          {toastMessage}
        </div>
      )}
    </>
  );
}
