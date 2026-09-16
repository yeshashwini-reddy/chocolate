import React, { useEffect, useRef, useState } from 'react';

export default function SplashScreen({ onFinish }) {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [progressWidth, setProgressWidth] = useState('0%');
  const canvasRef = useRef(null);
  const isExitingRef = useRef(false);
  const animFrameIdRef = useRef(null);

  useEffect(() => {
    // Lock scroll on mount
    document.body.style.overflow = 'hidden';

    // Start progress bar animation
    const progressTimer = setTimeout(() => {
      setProgressWidth('100%');
    }, 100);

    // Particle canvas engine
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      let width = (canvas.width = window.innerWidth);
      let height = (canvas.height = window.innerHeight);
      let centerX = width / 2;
      let centerY = height / 2;

      const particleCount = width < 768 ? 36 : 68;
      const particles = [];
      const colors = [
        'rgba(212, 163, 115, ',  // Warm caramel gold
        'rgba(243, 222, 184, ',  // Light gold shimmer
        'rgba(184, 122, 72, ',   // Rich roasted cocoa
        'rgba(128, 68, 38, ',    // Deep chocolate amber
        'rgba(253, 251, 247, '   // Warm silk cream
      ];
      const startTime = Date.now();

      for (let i = 0; i < particleCount; i++) {
        const edgeSpawn = Math.random() < 0.6;
        let px, py;
        if (edgeSpawn) {
          if (Math.random() < 0.5) {
            px = Math.random() < 0.5 ? Math.random() * (width * 0.25) : width - Math.random() * (width * 0.25);
            py = Math.random() * height;
          } else {
            px = Math.random() * width;
            py = Math.random() < 0.5 ? Math.random() * (height * 0.25) : height - Math.random() * (height * 0.25);
          }
        } else {
          px = Math.random() * width;
          py = Math.random() * height;
        }

        particles.push({
          x: px,
          y: py,
          radius: Math.random() * 2.2 + 0.7,
          colorPrefix: colors[Math.floor(Math.random() * colors.length)],
          baseAlpha: Math.random() * 0.55 + 0.3,
          alpha: 0,
          speedX: (Math.random() - 0.5) * 0.45,
          speedY: -Math.random() * 0.4 - 0.1,
          gatherSpeed: Math.random() * 1.2 + 0.6,
          pulseSpeed: Math.random() * 0.02 + 0.008,
          pulseOffset: Math.random() * Math.PI * 2
        });
      }

      function render() {
        ctx.clearRect(0, 0, width, height);
        const elapsed = (Date.now() - startTime) / 1000;

        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];

          if (isExitingRef.current) {
            const dx = p.x - centerX;
            const dy = p.y - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            p.x += (dx / dist) * 2.4;
            p.y += (dy / dist) * 2.4;
            p.baseAlpha *= 0.94;
          } else if (elapsed < 2.0) {
            const dx = centerX - p.x;
            const dy = centerY - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;

            if (dist > 160) {
              p.x += (dx / dist) * p.gatherSpeed;
              p.y += (dy / dist) * p.gatherSpeed;
            } else {
              p.x += p.speedX;
              p.y += p.speedY;
            }
          } else {
            p.x += p.speedX;
            p.y += p.speedY;
          }

          if (p.y < -15) {
            p.y = height + 15;
            p.x = Math.random() * width;
          }
          if (p.x < -15) p.x = width + 15;
          if (p.x > width + 15) p.x = -15;

          p.alpha = p.baseAlpha * (0.65 + 0.35 * Math.sin(Date.now() * p.pulseSpeed + p.pulseOffset));

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = p.colorPrefix + Math.max(0, p.alpha) + ')';
          ctx.shadowBlur = p.radius > 1.5 ? 8 : 0;
          ctx.shadowColor = 'rgba(212, 163, 115, 0.5)';
          ctx.fill();
        }

        animFrameIdRef.current = requestAnimationFrame(render);
      }

      render();

      const handleResize = () => {
        if (!canvasRef.current) return;
        width = canvasRef.current.width = window.innerWidth;
        height = canvasRef.current.height = window.innerHeight;
        centerX = width / 2;
        centerY = height / 2;
      };
      window.addEventListener('resize', handleResize);

      // Check duration
      const urlParams = new URLSearchParams(window.location.search);
      const forceMotion = urlParams.get('motion') === 'full' || urlParams.get('splash') === '1';
      const prefersReducedMotion = !forceMotion && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const splashDuration = prefersReducedMotion ? 1200 : 3400;

      const finishTimer = setTimeout(() => {
        isExitingRef.current = true;
        setIsFadingOut(true);

        setTimeout(() => {
          if (animFrameIdRef.current) {
            cancelAnimationFrame(animFrameIdRef.current);
          }
          window.removeEventListener('resize', handleResize);
          setIsVisible(false);
          document.body.style.overflow = '';
          if (onFinish) onFinish();
        }, 850);
      }, splashDuration);

      return () => {
        clearTimeout(progressTimer);
        clearTimeout(finishTimer);
        if (animFrameIdRef.current) {
          cancelAnimationFrame(animFrameIdRef.current);
        }
        window.removeEventListener('resize', handleResize);
        document.body.style.overflow = '';
      };
    }
  }, [onFinish]);

  if (!isVisible) return null;

  return (
    <div
      className={`splash-screen ${isFadingOut ? 'fade-out' : ''}`}
      id="splash-screen"
      aria-label="Welcome to Madhuri's Choco Heaven"
    >
      {/* Animated Liquid Chocolate & Ambient Sheen Layers */}
      <div className="splash-sheen-layer" aria-hidden="true"></div>
      <div className="splash-vignette" aria-hidden="true"></div>

      {/* Gathering Cocoa & Gold Dust Particles Canvas */}
      <canvas ref={canvasRef} id="splash-particles" className="splash-canvas" aria-hidden="true"></canvas>

      {/* Golden Light Sweep Beam Behind Logo */}
      <div className="splash-light-sweep" aria-hidden="true"></div>

      {/* Framing Chocolate Elements */}
      {/* Left Flank */}
      <div className="splash-flank splash-flank-left" aria-hidden="true">
        <div className="choc-elem choc-curl-bg">
          <svg viewBox="0 0 130 170" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M22,140 C10,95 40,35 85,20 C118,10 128,32 110,62 C88,95 32,112 48,155 C54,165 32,160 22,140 Z"
              fill="url(#curlGrad1)"
              filter="drop-shadow(0 8px 20px rgba(0,0,0,0.6))"
            />
            <path d="M42,120 C60,88 95,54 105,32 C78,54 48,88 38,126 Z" fill="url(#curlHighlight)" opacity="0.85" />
            <defs>
              <linearGradient id="curlGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6B3724" />
                <stop offset="45%" stopColor="#3D1D12" />
                <stop offset="100%" stopColor="#1A0A05" />
              </linearGradient>
              <linearGradient id="curlHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#D4A373" stopOpacity="0.9" />
                <stop offset="60%" stopColor="#8C5338" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#3D1D12" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="choc-elem choc-bean-fg">
          <svg viewBox="0 0 100 75" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse
              cx="50"
              cy="38"
              rx="44"
              ry="26"
              transform="rotate(-18 50 38)"
              fill="url(#beanGrad)"
              filter="drop-shadow(0 10px 20px rgba(0,0,0,0.7))"
            />
            <path
              d="M16,48 C36,40 68,34 88,25"
              stroke="#E4BC84"
              strokeWidth="2.6"
              strokeLinecap="round"
              opacity="0.85"
            />
            <path
              d="M22,40 C42,32 64,28 82,20"
              stroke="#FFF2D6"
              strokeWidth="1.2"
              strokeLinecap="round"
              opacity="0.5"
            />
            <defs>
              <radialGradient id="beanGrad" cx="38%" cy="32%" r="62%">
                <stop offset="0%" stopColor="#7A3D27" />
                <stop offset="50%" stopColor="#421E12" />
                <stop offset="100%" stopColor="#180703" />
              </radialGradient>
            </defs>
          </svg>
        </div>

        <div className="choc-elem choc-flake-left">
          <svg viewBox="0 0 65 50" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M8,32 C20,12 46,10 58,25 C42,36 24,38 8,32 Z"
              fill="url(#flakeGrad)"
              filter="drop-shadow(0 6px 12px rgba(0,0,0,0.5))"
            />
            <path d="M16,24 C30,16 44,16 52,22" stroke="#D4A373" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
            <defs>
              <linearGradient id="flakeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#5E3020" />
                <stop offset="100%" stopColor="#241008" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Right Flank */}
      <div className="splash-flank splash-flank-right" aria-hidden="true">
        <div className="choc-elem choc-truffle-bg">
          <svg viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="70" cy="70" r="58" fill="url(#truffleGrad)" filter="drop-shadow(0 12px 28px rgba(0,0,0,0.75))" />
            <circle cx="55" cy="48" r="34" fill="url(#goldDustGrad)" opacity="0.65" />
            <defs>
              <radialGradient id="truffleGrad" cx="36%" cy="34%" r="64%">
                <stop offset="0%" stopColor="#6E3520" />
                <stop offset="50%" stopColor="#3A1A0F" />
                <stop offset="100%" stopColor="#140602" />
              </radialGradient>
              <radialGradient id="goldDustGrad" cx="42%" cy="40%" r="52%">
                <stop offset="0%" stopColor="#F3DEB8" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#D4A373" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#3A1A0F" stopOpacity="0" />
              </radialGradient>
            </defs>
          </svg>
        </div>

        <div className="choc-elem choc-piece-fg">
          <svg viewBox="0 0 110 95" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M18,25 L82,14 L96,62 L32,77 Z"
              fill="url(#chocPieceDark)"
              filter="drop-shadow(0 14px 28px rgba(0,0,0,0.8))"
            />
            <path d="M18,25 L82,14 L74,30 L26,38 Z" fill="url(#chocPieceTop)" />
            <path d="M32,77 L96,62 L90,46 L26,60 Z" fill="#200B05" opacity="0.85" />
            <circle cx="54" cy="45" r="12" fill="url(#pieceGoldGlow)" opacity="0.6" />
            <defs>
              <linearGradient id="chocPieceDark" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#54281A" />
                <stop offset="100%" stopColor="#200B05" />
              </linearGradient>
              <linearGradient id="chocPieceTop" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#7C3E28" />
                <stop offset="100%" stopColor="#A25A3D" />
              </linearGradient>
              <radialGradient id="pieceGoldGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FFF0D0" />
                <stop offset="40%" stopColor="#D4A373" />
                <stop offset="100%" stopColor="#200B05" stopOpacity="0" />
              </radialGradient>
            </defs>
          </svg>
        </div>

        <div className="choc-elem choc-curl-right">
          <svg viewBox="0 0 80 110" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M58,16 C70,45 52,80 24,92 C6,98 12,80 26,62 C40,42 50,22 58,16 Z"
              fill="url(#curlGrad2)"
              filter="drop-shadow(0 8px 18px rgba(0,0,0,0.6))"
            />
            <defs>
              <linearGradient id="curlGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#8C4931" />
                <stop offset="50%" stopColor="#4B2316" />
                <stop offset="100%" stopColor="#1E0A04" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Center Hero Branding Composition */}
      <div className="splash-content">
        <div className="splash-logo-wrap">
          <div className="splash-logo-glow" aria-hidden="true"></div>
          <div className="splash-logo-sheen" aria-hidden="true"></div>
          <img
            src="assets/images/logo.png"
            alt="Madhuri’s Choco Heaven Official Brand Logo"
            className="splash-logo-img"
            width="260"
            height="260"
          />
        </div>

        <h1 className="splash-brand-title">
          Madhuri’s <span className="gold-accent">Choco Heaven</span>
        </h1>

        <p className="splash-tagline">
          Where every celebration becomes a little sweeter.
        </p>

        <div className="splash-divider" aria-hidden="true">
          <span className="splash-divider-diamond">◆</span>
        </div>
      </div>

      {/* Slender Gold Progress Indicator */}
      <div className="splash-progress-wrap" aria-hidden="true">
        <div className="splash-progress-track">
          <div
            className="splash-progress-bar"
            id="splash-progress-bar"
            style={{ width: progressWidth }}
          ></div>
        </div>
        <span className="splash-loading-text">Crafting Sweetness...</span>
      </div>
    </div>
  );
}
