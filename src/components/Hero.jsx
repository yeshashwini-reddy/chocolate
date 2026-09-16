import React, { useEffect, useRef } from 'react';

export default function Hero({ onNavigate }) {
  const canvasRef = useRef(null);
  const heroSectionRef = useRef(null);
  const heroCard1Ref = useRef(null);
  const heroCard2Ref = useRef(null);
  const heroImgFrameRef = useRef(null);

  // Floating cocoa & gold particles canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', handleResize);

    const particleCount = window.innerWidth < 768 ? 25 : 45;
    const colors = [
      'rgba(212, 163, 115, ', // gold
      'rgba(243, 222, 184, ', // light gold
      'rgba(184, 133, 84, ',  // caramel
      'rgba(130, 80, 50, '    // warm cocoa
    ];

    class Particle {
      constructor() {
        this.reset();
      }
      reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 3.5 + 1.2;
        this.speedX = (Math.random() - 0.5) * 0.4;
        this.speedY = -(Math.random() * 0.5 + 0.2); // upward drift
        this.opacity = Math.random() * 0.6 + 0.2;
        this.colorPrefix = colors[Math.floor(Math.random() * colors.length)];
      }
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.y < 0) {
          this.y = height + 10;
          this.x = Math.random() * width;
        }
        if (this.x < 0 || this.x > width) {
          this.speedX = -this.speedX;
        }
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `${this.colorPrefix}${this.opacity})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(212, 163, 115, 0.4)';
        ctx.fill();
      }
    }

    const particles = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    function renderParticles() {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        p.update();
        p.draw();
      });
      animationFrameId = requestAnimationFrame(renderParticles);
    }

    // IntersectionObserver to pause when not visible
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (!animationFrameId) renderParticles();
          } else {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
          }
        });
      },
      { threshold: 0.1 }
    );

    if (heroSectionRef.current) observer.observe(heroSectionRef.current);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      observer.disconnect();
    };
  }, []);

  // Desktop mouse parallax & magnetic button effect
  useEffect(() => {
    const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!isFinePointer || prefersReducedMotion) return;

    const heroSection = heroSectionRef.current;
    if (!heroSection) return;

    const handleMouseMove = (e) => {
      const rect = heroSection.getBoundingClientRect();
      const normX = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
      const normY = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);

      if (heroCard1Ref.current) {
        heroCard1Ref.current.style.transform = `translate(${normX * -14}px, ${normY * -12}px)`;
      }
      if (heroCard2Ref.current) {
        heroCard2Ref.current.style.transform = `translate(${normX * 16}px, ${normY * 14}px)`;
      }
      if (heroImgFrameRef.current) {
        heroImgFrameRef.current.style.transform = `perspective(1000px) rotateY(${normX * 3}deg) rotateX(${normY * -3}deg)`;
      }
    };

    const handleMouseLeave = () => {
      if (heroCard1Ref.current) heroCard1Ref.current.style.transform = '';
      if (heroCard2Ref.current) heroCard2Ref.current.style.transform = '';
      if (heroImgFrameRef.current) heroImgFrameRef.current.style.transform = '';
    };

    heroSection.addEventListener('mousemove', handleMouseMove, { passive: true });
    heroSection.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      heroSection.removeEventListener('mousemove', handleMouseMove);
      heroSection.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  const handleLink = (e, hash) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate(hash);
    } else {
      window.location.hash = hash;
    }
  };

  return (
    <section className="hero-section" id="home" ref={heroSectionRef} aria-label="Welcome Hero">
      <canvas ref={canvasRef} id="particle-canvas" aria-hidden="true"></canvas>

      <div className="container hero-content-wrapper">
        <div className="hero-text">
          <div className="hero-badge">
            <img
              src="assets/images/logo.png"
              alt=""
              className="hero-badge-logo"
              width="22"
              height="22"
              aria-hidden="true"
            />
            <span>Handcrafted Boutique Confectionery</span>
          </div>
          <h1 className="hero-title">
            Where Every Celebration <br />
            <span className="text-gradient-gold">Becomes a Little Sweeter.</span>
          </h1>
          <p className="hero-subtitle">
            Handcrafted chocolates, freshly baked treats and customised creations made with love for your most special
            moments.
          </p>

          <div className="hero-ctas">
            <a
              href="#categories"
              className="btn btn-gold btn-lg btn-magnetic"
              onClick={(e) => handleLink(e, '#categories')}
            >
              <span>Explore Our Creations</span>
              <span className="btn-icon-arrow">→</span>
            </a>
            <a
              href="#custom-order"
              className="btn btn-outline btn-lg btn-magnetic"
              onClick={(e) => handleLink(e, '#custom-order')}
            >
              <span>Customise Your Order</span>
            </a>
          </div>

          <div className="hero-highlights">
            <div className="hero-highlight-item">
              <span className="hero-highlight-icon">🍫</span>
              <span>100% Handcrafted</span>
            </div>
            <div className="hero-highlight-item">
              <span className="hero-highlight-icon">🎂</span>
              <span>Baked Fresh on Order</span>
            </div>
            <div className="hero-highlight-item">
              <span className="hero-highlight-icon">❤️</span>
              <span>Homemade with Love</span>
            </div>
          </div>
        </div>

        {/* Hero Visual Showcase */}
        <div className="hero-media-showcase">
          <div className="hero-image-frame" ref={heroImgFrameRef}>
            <img
              src="assets/images/hero_chocolate_spread.jpg"
              alt="Artisanal chocolate spread and celebration cake by Madhuri's Choco Heaven"
              width="720"
              height="480"
              fetchpriority="high"
            />
          </div>
          <div
            className="floating-hero-card floating-hero-card-1 animate-float-slow"
            ref={heroCard1Ref}
          >
            <span className="floating-card-icon">🎁</span>
            <div>
              <div className="floating-card-title">Custom Gift Boxes</div>
              <div className="floating-card-subtitle">Made for your special moments</div>
            </div>
          </div>
          <div
            className="floating-hero-card floating-hero-card-2 animate-float-gentle"
            ref={heroCard2Ref}
          >
            <span className="floating-card-icon">⭐</span>
            <div>
              <div className="floating-card-title">Artisan Quality</div>
              <div className="floating-card-subtitle">Finest cocoa & pure butter</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
