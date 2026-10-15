import React, { useEffect, useRef } from 'react';

export default function Hero({ onNavigate }) {
  const canvasRef = useRef(null);
  const heroSectionRef = useRef(null);
  const heroCard1Ref = useRef(null);
  const heroCard2Ref = useRef(null);
  const heroImgFrameRef = useRef(null);
  const choc1Ref = useRef(null);
  const choc2Ref = useRef(null);
  const choc3Ref = useRef(null);
  const choc4Ref = useRef(null);

  // 1. FLOATING COCOA & GOLDEN PARTICLES CANVAS
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

    const isMobile = window.innerWidth < 768;
    const particleCount = isMobile ? 22 : 44;

    // Particle types:
    // Type 1: Golden boutique dust (shimmering gold, gentle twinkle)
    // Type 0: Cocoa powder (warm roasted cocoa flecks, gentle sinusoidal sway)
    // Type 2: Ambient warm bokeh motes (soft, diffuse, very low opacity)
    class Particle {
      constructor() {
        this.reset(true);
      }

      reset(initial = false) {
        this.x = Math.random() * width;
        this.y = initial ? Math.random() * height : height + Math.random() * 20;

        const randType = Math.random();
        if (randType < 0.45) {
          // Golden dust motes
          this.type = 1;
          this.size = Math.random() * 1.6 + 1.0;
          this.speedY = -(Math.random() * 0.28 + 0.12);
          this.swaySpeed = Math.random() * 0.0015 + 0.001;
          this.swayAmp = Math.random() * 0.35 + 0.15;
          this.baseOpacity = Math.random() * 0.35 + 0.2;
          this.twinkleSpeed = Math.random() * 0.0028 + 0.0018;
          this.phase = Math.random() * Math.PI * 2;
          this.colorRgb = Math.random() > 0.5 ? '243, 222, 184' : '212, 163, 115';
          this.hasGlow = true;
        } else if (randType < 0.88) {
          // Cocoa powder flecks
          this.type = 0;
          this.size = Math.random() * 2.2 + 1.1;
          this.speedY = -(Math.random() * 0.22 + 0.10);
          this.swaySpeed = Math.random() * 0.002 + 0.001;
          this.swayAmp = Math.random() * 0.4 + 0.2;
          this.baseOpacity = Math.random() * 0.30 + 0.15;
          this.twinkleSpeed = 0;
          this.phase = Math.random() * Math.PI * 2;
          const cocoaShades = ['140, 85, 52', '180, 120, 75', '105, 62, 38'];
          this.colorRgb = cocoaShades[Math.floor(Math.random() * cocoaShades.length)];
          this.hasGlow = false;
        } else {
          // Ambient warm bokeh light mote
          this.type = 2;
          this.size = Math.random() * 6.0 + 4.5;
          this.speedY = -(Math.random() * 0.12 + 0.05);
          this.swaySpeed = Math.random() * 0.001 + 0.0005;
          this.swayAmp = Math.random() * 0.25 + 0.1;
          this.baseOpacity = Math.random() * 0.06 + 0.03;
          this.twinkleSpeed = Math.random() * 0.001 + 0.001;
          this.phase = Math.random() * Math.PI * 2;
          this.colorRgb = '228, 188, 132';
          this.hasGlow = true;
        }
      }

      update(time) {
        this.y += this.speedY;
        this.x += Math.sin(time * this.swaySpeed + this.phase) * this.swayAmp;

        if (this.y < -20) {
          this.reset(false);
        }
        if (this.x < -20) this.x = width + 10;
        if (this.x > width + 20) this.x = -10;
      }

      draw(time) {
        let currentOpacity = this.baseOpacity;
        if (this.twinkleSpeed > 0) {
          currentOpacity = this.baseOpacity * (0.68 + 0.32 * Math.sin(time * this.twinkleSpeed + this.phase));
        }

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.colorRgb}, ${currentOpacity.toFixed(3)})`;

        if (this.hasGlow) {
          ctx.shadowBlur = this.type === 2 ? 8 : 4;
          ctx.shadowColor = 'rgba(212, 163, 115, 0.28)';
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.fill();
      }
    }

    const particles = Array.from({ length: particleCount }, () => new Particle());

    function render(time) {
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < particles.length; i++) {
        particles[i].update(time);
        particles[i].draw(time);
      }
      animationFrameId = requestAnimationFrame(render);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (!animationFrameId) animationFrameId = requestAnimationFrame(render);
          } else {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
          }
        });
      },
      { threshold: 0.05 }
    );

    if (heroSectionRef.current) observer.observe(heroSectionRef.current);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      observer.disconnect();
    };
  }, []);

  // 2. DESKTOP SMOOTH MOUSE PARALLAX & TILT
  useEffect(() => {
    const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!isFinePointer || prefersReducedMotion) return;

    const heroSection = heroSectionRef.current;
    if (!heroSection) return;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let animId = null;

    const updateParallax = () => {
      currentX += (targetX - currentX) * 0.06;
      currentY += (targetY - currentY) * 0.06;

      // Subtle parallax shift on floating chocolate pieces
      if (choc1Ref.current) {
        choc1Ref.current.style.transform = `translate(${(currentX * 11).toFixed(2)}px, ${(currentY * 8).toFixed(2)}px)`;
      }
      if (choc2Ref.current) {
        choc2Ref.current.style.transform = `translate(${(currentX * 9).toFixed(2)}px, ${(currentY * 7).toFixed(2)}px)`;
      }
      if (choc3Ref.current) {
        choc3Ref.current.style.transform = `translate(${(currentX * -11).toFixed(2)}px, ${(currentY * -9).toFixed(2)}px)`;
      }
      if (choc4Ref.current) {
        choc4Ref.current.style.transform = `translate(${(currentX * -8).toFixed(2)}px, ${(currentY * -6).toFixed(2)}px)`;
      }

      // Floating cards: update CSS custom properties so vertical float animation continues seamlessly
      if (heroCard1Ref.current) {
        heroCard1Ref.current.style.setProperty('--p-x1', `${(currentX * -9).toFixed(2)}px`);
        heroCard1Ref.current.style.setProperty('--p-y1', `${(currentY * -7).toFixed(2)}px`);
      }
      if (heroCard2Ref.current) {
        heroCard2Ref.current.style.setProperty('--p-x2', `${(currentX * 9).toFixed(2)}px`);
        heroCard2Ref.current.style.setProperty('--p-y2', `${(currentY * 7).toFixed(2)}px`);
      }

      // Hero image frame: gentle 3D perspective tilt
      if (heroImgFrameRef.current) {
        heroImgFrameRef.current.style.transform = `perspective(1000px) rotateY(${(currentX * 2.2).toFixed(2)}deg) rotateX(${(currentY * -2.2).toFixed(2)}deg)`;
      }

      animId = requestAnimationFrame(updateParallax);
    };

    animId = requestAnimationFrame(updateParallax);

    const handleMouseMove = (e) => {
      const rect = heroSection.getBoundingClientRect();
      targetX = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
      targetY = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    };

    const handleMouseLeave = () => {
      targetX = 0;
      targetY = 0;
    };

    heroSection.addEventListener('mousemove', handleMouseMove, { passive: true });
    heroSection.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      heroSection.removeEventListener('mousemove', handleMouseMove);
      heroSection.removeEventListener('mouseleave', handleMouseLeave);
      if (animId) cancelAnimationFrame(animId);
    };
  }, []);

  // 3. SUBTLE CHOCOLATE IMAGE INTERACTIVE LIGHTING SHEEN
  useEffect(() => {
    const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!isFinePointer || prefersReducedMotion) return;

    const frame = heroImgFrameRef.current;
    if (!frame) return;

    const handlePointerMove = (e) => {
      const rect = frame.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      frame.style.setProperty('--sheen-x', `${x.toFixed(1)}%`);
      frame.style.setProperty('--sheen-y', `${y.toFixed(1)}%`);
      frame.style.setProperty('--sheen-opacity', '1');
    };

    const handlePointerLeave = () => {
      frame.style.setProperty('--sheen-opacity', '0');
    };

    frame.addEventListener('pointermove', handlePointerMove, { passive: true });
    frame.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      frame.removeEventListener('pointermove', handlePointerMove);
      frame.removeEventListener('pointerleave', handlePointerLeave);
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
      {/* Ambient floating cocoa & gold dust canvas */}
      <canvas ref={canvasRef} id="particle-canvas" aria-hidden="true"></canvas>

      {/* Subtle decorative floating chocolate pieces & cocoa beans */}
      <div className="hero-choc-decor-layer" aria-hidden="true">
        {/* Piece 1: Dark Chocolate Tablet Square with Gold Fleck (Upper Left) */}
        <div className="hero-choc-item hero-choc-pos-1" ref={choc1Ref}>
          <div className="hero-choc-shape hero-choc-float-1">
            <svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="chocSquareGrad" x1="0" y1="0" x2="34" y2="34" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#3E1E14" />
                  <stop offset="55%" stopColor="#29120B" />
                  <stop offset="100%" stopColor="#180905" />
                </linearGradient>
                <linearGradient id="chocBevelTop" x1="0" y1="0" x2="34" y2="0" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#5D3223" />
                  <stop offset="100%" stopColor="#452115" />
                </linearGradient>
              </defs>
              <rect x="2" y="2" width="30" height="30" rx="3.5" fill="url(#chocSquareGrad)" />
              <path d="M3 5C3 3.89543 3.89543 3 5 3H29C30.1046 3 31 3.89543 31 5V6H5V31H3V5Z" fill="url(#chocBevelTop)" opacity="0.65" />
              <rect x="6" y="6" width="22" height="22" rx="2" fill="none" stroke="#170704" strokeWidth="1" opacity="0.75" />
              <rect x="7" y="7" width="20" height="20" rx="1.5" fill="none" stroke="#482418" strokeWidth="0.75" opacity="0.55" />
              <circle cx="10" cy="11" r="1.3" fill="#F3DEB8" opacity="0.85" />
              <circle cx="11.4" cy="12.2" r="0.8" fill="#D4A373" opacity="0.7" />
            </svg>
          </div>
        </div>

        {/* Piece 2: Roasted Cocoa Bean Silhouette (Lower Left) */}
        <div className="hero-choc-item hero-choc-pos-2" ref={choc2Ref}>
          <div className="hero-choc-shape hero-choc-float-2">
            <svg width="30" height="20" viewBox="0 0 30 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="cocoaBeanGrad" x1="0" y1="0" x2="30" y2="20" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#4B271A" />
                  <stop offset="60%" stopColor="#2E160E" />
                  <stop offset="100%" stopColor="#1B0B06" />
                </linearGradient>
              </defs>
              <path d="M3 10C3 5 8 2 15 2C22 2 27 5 27 10C27 15 22 18 15 18C8 18 3 15 3 10Z" fill="url(#cocoaBeanGrad)" />
              <path d="M6 10C10 8.5 20 8.5 24 10" stroke="#5E3324" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
              <path d="M6 11C10 9.5 20 9.5 24 11" stroke="#150804" strokeWidth="0.8" strokeLinecap="round" opacity="0.6" />
              <path d="M8 5C11 3.8 19 3.8 22 5" stroke="#7A4532" strokeWidth="0.8" strokeLinecap="round" opacity="0.45" />
            </svg>
          </div>
        </div>

        {/* Piece 3: Artisan Truffle Bonbon (Upper Right) */}
        <div className="hero-choc-item hero-choc-pos-3" ref={choc3Ref}>
          <div className="hero-choc-shape hero-choc-float-3">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="truffleGrad" cx="38%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#552F20" />
                  <stop offset="45%" stopColor="#371C12" />
                  <stop offset="100%" stopColor="#190A05" />
                </radialGradient>
              </defs>
              <circle cx="14" cy="14" r="11" fill="url(#truffleGrad)" />
              <ellipse cx="11.5" cy="10" rx="4.5" ry="3" fill="#84503B" opacity="0.45" />
              <circle cx="10" cy="9" r="0.75" fill="#F3DEB8" opacity="0.9" />
              <circle cx="13" cy="8.5" r="0.55" fill="#E4BC84" opacity="0.8" />
              <circle cx="15.5" cy="11" r="0.65" fill="#ECCB9F" opacity="0.75" />
            </svg>
          </div>
        </div>

        {/* Piece 4: Hand-Cut Chocolate Bark Shard (Lower Right) */}
        <div className="hero-choc-item hero-choc-pos-4" ref={choc4Ref}>
          <div className="hero-choc-shape hero-choc-float-4">
            <svg width="26" height="32" viewBox="0 0 26 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="barkGrad" x1="2" y1="2" x2="24" y2="30" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#3D1D14" />
                  <stop offset="50%" stopColor="#28110A" />
                  <stop offset="100%" stopColor="#160804" />
                </linearGradient>
              </defs>
              <path d="M4 8L16 2L23 9L21 27L8 29L3 20Z" fill="url(#barkGrad)" />
              <path d="M4 8L15 15L21 27" stroke="#552B1D" strokeWidth="0.8" opacity="0.65" />
              <path d="M16 2L15 15L8 29" stroke="#180804" strokeWidth="0.8" opacity="0.75" />
              <path d="M4 8L16 2L23 9" stroke="#753C2A" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
            </svg>
          </div>
        </div>
      </div>

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
            <div className="hero-image-sheen" aria-hidden="true"></div>
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
