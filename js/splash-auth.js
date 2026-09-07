/**
 * ==========================================================================
 * MADHURI'S CHOCO HEAVEN - CINEMATIC SPLASH SCREEN CONTROLLER
 * "The Chocolate Reveal" - Smooth luxury brand opening experience
 * ==========================================================================
 */

(function () {
  'use strict';

  // DOM Elements
  const splashScreen = document.getElementById('splash-screen');
  const splashCanvas = document.getElementById('splash-particles');
  const splashProgressBar = document.getElementById('splash-progress-bar');

  let particleAnimationId = null;
  let particles = [];
  let isExiting = false;

  /* ==========================================================================
     1. CINEMATIC GATHERING COCOA & GOLD DUST PARTICLES ENGINE
     "The Chocolate Reveal" Gathering & Ambient Shimmer Physics
     ========================================================================== */
  function initSplashParticles() {
    if (!splashCanvas) return;
    const ctx = splashCanvas.getContext('2d');
    let width = (splashCanvas.width = window.innerWidth);
    let height = (splashCanvas.height = window.innerHeight);
    let centerX = width / 2;
    let centerY = height / 2;

    // Responsive particle count
    const particleCount = width < 768 ? 36 : 68;
    particles = [];
    isExiting = false;

    const colors = [
      'rgba(212, 163, 115, ',  // Warm caramel gold
      'rgba(243, 222, 184, ',  // Light gold shimmer
      'rgba(184, 122, 72, ',   // Rich roasted cocoa
      'rgba(128, 68, 38, ',    // Deep chocolate amber
      'rgba(253, 251, 247, '   // Warm silk cream
    ];

    const startTime = Date.now();

    for (let i = 0; i < particleCount; i++) {
      // Spawn particles across the entire viewport, including outer flanks
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

        if (isExiting) {
          // Outward drift during transition into homepage
          const dx = p.x - centerX;
          const dy = p.y - centerY;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          p.x += (dx / dist) * 2.4;
          p.y += (dy / dist) * 2.4;
          p.baseAlpha *= 0.94;
        } else if (elapsed < 2.0) {
          // Phase 1: Cinematic Gathering towards center
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
          // Phase 2: Ambient Float & Shimmer
          p.x += p.speedX;
          p.y += p.speedY;
        }

        // Boundary wrap
        if (p.y < -15) {
          p.y = height + 15;
          p.x = Math.random() * width;
        }
        if (p.x < -15) p.x = width + 15;
        if (p.x > width + 15) p.x = -15;

        // Subtle shimmering alpha
        p.alpha = p.baseAlpha * (0.65 + 0.35 * Math.sin(Date.now() * p.pulseSpeed + p.pulseOffset));

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.colorPrefix + Math.max(0, p.alpha) + ')';
        ctx.shadowBlur = p.radius > 1.5 ? 8 : 0;
        ctx.shadowColor = 'rgba(212, 163, 115, 0.5)';
        ctx.fill();
      }

      particleAnimationId = requestAnimationFrame(render);
    }

    render();

    window.addEventListener('resize', function () {
      if (splashCanvas && splashScreen && !splashScreen.classList.contains('fade-out')) {
        width = splashCanvas.width = window.innerWidth;
        height = splashCanvas.height = window.innerHeight;
        centerX = width / 2;
        centerY = height / 2;
      }
    });
  }

  function stopSplashParticles() {
    if (particleAnimationId) {
      cancelAnimationFrame(particleAnimationId);
      particleAnimationId = null;
    }
  }

  /* ==========================================================================
     2. SPLASH SCREEN TIMED ORCHESTRATION - "THE CHOCOLATE REVEAL"
     ========================================================================== */
  function startSplashSequence() {
    if (!splashScreen) {
      document.body.style.overflow = '';
      return;
    }

    // Lock background scrolling while splash is active
    document.body.style.overflow = 'hidden';

    // Start cinematic gathering particles
    initSplashParticles();

    // Trigger smooth gold progress bar fill
    if (splashProgressBar) {
      setTimeout(() => {
        splashProgressBar.style.width = '100%';
      }, 100);
    }

    // Check URL parameters for explicit testing or motion override
    const urlParams = new URLSearchParams(window.location.search);
    const forceMotion = urlParams.get('motion') === 'full' || urlParams.get('splash') === '1';
    if (forceMotion) {
      document.documentElement.setAttribute('data-force-motion', 'true');
    }

    // Determine duration: 3.4s for full cinematic experience, 1.2s for reduced motion
    const prefersReducedMotion = !forceMotion && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const splashDuration = prefersReducedMotion ? 1200 : 3400;

    setTimeout(() => {
      // Step: Start particle dispersal and fade out splash screen directly into the homepage
      isExiting = true;
      splashScreen.classList.add('fade-out');

      // Stop particle canvas and restore scroll after transition completes
      setTimeout(() => {
        stopSplashParticles();
        splashScreen.style.display = 'none';
        document.body.style.overflow = '';
      }, 850);
    }, splashDuration);
  }

  /* ==========================================================================
     3. INITIALIZATION
     ========================================================================== */
  document.addEventListener('DOMContentLoaded', function () {
    startSplashSequence();
  });

})();
