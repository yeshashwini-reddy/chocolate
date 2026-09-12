/**
 * MADHURI'S CHOCO HEAVEN - MAIN APPLICATION LOGIC
 * Interactions, Canvas Particles, Occasions Switcher, Form & WhatsApp Integration
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. STICKY NAVBAR SCROLL BEHAVIOR
  const header = document.querySelector('.site-header');

  function handleScroll() {
    if (window.scrollY > 40) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }

    const scrollY = window.pageYOffset;

    // Subtle Hero Scroll Parallax (Non-destructive movement)
    const heroMedia = document.querySelector('.hero-media-showcase');
    const heroText = document.querySelector('.hero-text');
    if (heroMedia && scrollY < 900 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      heroMedia.style.transform = `translateY(${scrollY * 0.12}px)`;
      if (heroText) heroText.style.transform = `translateY(${scrollY * 0.05}px)`;
    }

    // Update Top Scroll Progress Bar
    const progressBar = document.getElementById('scroll-progress-bar');
    if (progressBar) {
      const totalScrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScrollHeight > 0) {
        const progress = Math.min(100, Math.max(0, (window.scrollY / totalScrollHeight) * 100));
        progressBar.style.width = `${progress}%`;
      }
    }

    // Toggle Floating Back to Top Button
    const floatingBackToTop = document.getElementById('back-to-top-float');
    if (floatingBackToTop) {
      if (window.scrollY > 380) {
        floatingBackToTop.classList.add('visible');
      } else {
        floatingBackToTop.classList.remove('visible');
      }
    }
  }

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  // 1B. MULTI-PAGE ROUTER & CATEGORY FILTERING SYSTEM
  const pageViews = document.querySelectorAll('.page-view');
  const allNavLinks = document.querySelectorAll('.nav-desktop a, .mobile-nav-links a');

  const routeViewMap = {
    '': 'view-home',
    '#home': 'view-home',
    '#about': 'view-about',
    '#categories': 'view-categories',
    '#occasions': 'view-categories',
    '#custom-order': 'view-categories',
    '#gallery': 'view-categories',
    '#chocolates': 'view-chocolates',
    '#cakes-bakes': 'view-cakes-bakes',
    '#contact': 'view-contact'
  };

  // 1B. PRODUCT CATALOGUE RENDERING & FILTERING SYSTEM
  function getProductWhatsAppUrl(prod, extraDetail = '') {
    const waNumber = window.BRAND_CONFIG?.contact?.whatsappNumber || 'YOUR_WHATSAPP_NUMBER';
    let msg = '';

    if (prod.type === 'theme') {
      const occasionText = extraDetail ? ` for ${extraDetail}` : '';
      msg = `Hi Madhuri’s Choco Heaven, I’m interested in Theme-Based Chocolates${occasionText}. I’d like to discuss customisation, theme options and pricing.`;
    } else if (prod.type === 'corporate') {
      msg = `Hi Madhuri’s Choco Heaven, I’m interested in Corporate Chocolate Orders customised with our company logo/branding. Please share details on corporate packages, quantity and pricing.`;
    } else if (prod.type === 'bouquet') {
      msg = `Hi Madhuri’s Choco Heaven, I’m interested in Chocolate Bouquets. I’d like to know more about customisation, bouquet arrangements and pricing.`;
    } else if (prod.type === 'hamper') {
      msg = `Hi Madhuri’s Choco Heaven, I’m interested in Occasion Hampers. I’d like to discuss custom hamper arrangements, contents and pricing.`;
    } else if (prod.type === 'flavoured') {
      const flavourText = extraDetail ? ` (Flavour: ${extraDetail})` : '';
      msg = `Hi Madhuri’s Choco Heaven, I’m interested in Flavoured Chocolates${flavourText}. I’d like to know more about customisation, quantity and pricing.`;
    } else {
      msg = `Hi Madhuri’s Choco Heaven, I’m interested in ${prod.name}. I’d like to know more about customisation, quantity and pricing.`;
    }

    return `https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`;
  }

  function renderChocolatesCatalogue() {
    const container = document.getElementById('chocolate-products-grid');
    if (!container || !window.BRAND_CONFIG || !window.BRAND_CONFIG.chocolates) return;

    const chocolates = window.BRAND_CONFIG.chocolates;
    container.innerHTML = '';

    chocolates.forEach((prod, index) => {
      const article = document.createElement('article');
      article.className = `product-card reveal-on-scroll ${prod.isProminent ? 'product-card-prominent' : ''}`;
      article.setAttribute('data-category', prod.category);
      article.setAttribute('id', `card-${prod.id}`);

      // Tags Row
      let tagsHtml = '';
      if (prod.badge) {
        tagsHtml += `<span class="badge-tag badge-gold badge-special">${prod.badge}</span>`;
      }
      if (prod.tags && prod.tags.length > 0) {
        prod.tags.forEach(tag => {
          tagsHtml += `<span class="badge-tag">${tag}</span>`;
        });
      }

      // Special content per product type
      let specialContentHtml = '';

      // Theme-Based Occasions Chips
      if (prod.type === 'theme' && prod.supportedOccasions) {
        specialContentHtml = `
          <div class="product-occasions-box">
            <span class="occasions-badge-label">Supported Occasions:</span>
            <div class="occasions-chips-wrap">
              ${prod.supportedOccasions.map(occ => `<button type="button" class="occasion-chip" data-occasion="${occ}" title="Select ${occ}">${occ}</button>`).join('')}
              <span class="occasion-chip-extra">+ more celebrations</span>
            </div>
          </div>
        `;
      }

      // Corporate Logo Placeholder Area
      if (prod.type === 'corporate') {
        specialContentHtml = `
          <div class="corporate-branding-box">
            <div class="corporate-logo-placeholder">
              <span class="corp-placeholder-icon">🏢</span>
              <div class="corp-placeholder-text">
                <strong>Your Company Logo / Branding Here</strong>
                <span>Placeholder for custom logo, corporate colors & bespoke packaging</span>
              </div>
            </div>
          </div>
        `;
      }

      // Flavoured Chocolate Selector Pills
      if (prod.type === 'flavoured' && prod.flavours) {
        specialContentHtml = `
          <div class="product-flavours-box">
            <div class="flavours-header">
              <span class="flavours-badge-label">Available Flavours:</span>
              <span class="active-flavour-badge" id="flavour-badge-${prod.id}">All Flavours</span>
            </div>
            <div class="flavour-pills-row" data-product-id="${prod.id}">
              ${prod.flavours.map(f => `
                <button type="button" class="flavour-pill" data-flavour="${f.name}" title="${f.name} Flavour">
                  <span class="flavour-emoji">${f.emoji}</span>
                  <span class="flavour-name">${f.label}</span>
                </button>
              `).join('')}
            </div>
          </div>
        `;
      }

      const initialWaUrl = getProductWhatsAppUrl(prod);

      article.innerHTML = `
        <div class="product-img-box">
          <img src="${prod.image}" alt="${prod.name} - Madhuri's Choco Heaven" loading="lazy" onerror="this.onerror=null; this.src='assets/images/chocolate_truffles_box.jpg';">
          <div class="product-tags-row">
            ${tagsHtml}
          </div>
        </div>
        <div class="product-body">
          <div class="product-category-crumb">${prod.categoryLabel || 'Chocolates'}</div>
          <h3 class="product-name">${prod.name}</h3>
          <p class="product-desc">${prod.desc}</p>
          ${specialContentHtml}
          <div class="product-footer">
            <div class="price-box">
              <span class="price-label">Pricing</span>
              <span class="price-text">${prod.priceTag || 'Price on Request'}</span>
            </div>
            <div class="product-actions-group">
              <button type="button" class="btn btn-gold btn-sm action-enquire-product"
                data-product-name="${prod.name}"
                data-product-category="${prod.categoryLabel || 'Chocolates'}"
                data-product-id="${prod.id}"
                data-action-type="${prod.type}">
                ${prod.actionText || 'Customise & Enquire'}
              </button>
              <a href="${initialWaUrl}" target="_blank" rel="noopener noreferrer"
                class="btn-whatsapp-quick"
                id="wa-btn-${prod.id}"
                data-product-id="${prod.id}"
                aria-label="Enquire about ${prod.name} on WhatsApp"
                title="Direct WhatsApp Enquiry">
                <span class="wa-quick-icon" aria-hidden="true">💬</span>
                <span class="wa-quick-text">WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      `;

      container.appendChild(article);
    });

    // Mark newly rendered elements revealed
    container.querySelectorAll('.reveal-on-scroll').forEach(el => {
      el.classList.add('revealed');
    });
  }

  function filterProductCards(sectionId, filterValue) {
    const section = document.getElementById(sectionId);
    if (!section) return;

    // Update filter button UI inside section
    const filterBtns = section.querySelectorAll('.category-filter-bar .filter-btn');
    filterBtns.forEach(btn => {
      const isActive = btn.getAttribute('data-filter') === filterValue;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    // Filter product cards with smooth transition
    const cards = section.querySelectorAll('.product-card');
    cards.forEach(card => {
      const category = card.getAttribute('data-category');
      const shouldShow = (filterValue === 'all' || category === filterValue);

      if (shouldShow) {
        card.style.display = '';
        requestAnimationFrame(() => {
          card.style.opacity = '1';
          card.style.transform = 'scale(1)';
          card.classList.remove('card-filtered-out');
        });
      } else {
        card.classList.add('card-filtered-out');
        card.style.opacity = '0';
        card.style.transform = 'scale(0.96)';
        setTimeout(() => {
          if (card.classList.contains('card-filtered-out')) {
            card.style.display = 'none';
          }
        }, 220);
      }
    });
  }

  function switchView(hash, isInitial = false) {
    const rawHash = hash || window.location.hash || '';
    const cleanHash = rawHash.split('?')[0]; // strip query params
    const targetViewId = routeViewMap[cleanHash] || 'view-home';

    pageViews.forEach(view => {
      if (view.id === targetViewId) {
        view.classList.remove('hidden-view');
        view.classList.add('active-view');
      } else {
        view.classList.remove('active-view');
        view.classList.add('hidden-view');
      }
    });

    // Reveal elements in active view
    document.querySelectorAll('.active-view .reveal-on-scroll').forEach(el => {
      el.classList.add('revealed');
    });

    // Update active nav link highlighting
    allNavLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('login.html')) return;

      if (href === cleanHash || (cleanHash === '' && href === '#home')) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Scroll handling
    if (!isInitial || cleanHash) {
      if (['#occasions', '#custom-order', '#gallery', '#how-it-works'].includes(cleanHash)) {
        const targetElem = document.querySelector(cleanHash);
        if (targetElem) {
          targetElem.scrollIntoView({ behavior: 'smooth' });
          return;
        }
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Render dynamic chocolates catalogue on initialization
  renderChocolatesCatalogue();

  // Listen to hash changes & link clicks
  window.addEventListener('hashchange', () => switchView(window.location.hash));

  // Category Filter Bar & Sublink Click Handlers
  document.addEventListener('click', (e) => {
    // Filter button inside section
    const filterBtn = e.target.closest('.filter-btn');
    if (filterBtn && filterBtn.closest('.category-filter-bar')) {
      const filterGroup = filterBtn.closest('.category-filter-bar').getAttribute('data-filter-group');
      const filterVal = filterBtn.getAttribute('data-filter');
      if (filterGroup && filterVal) {
        filterProductCards(filterGroup, filterVal);
      }
    }

    // Dropdown / Mobile Sublink Click with data-filter
    const sublink = e.target.closest('[data-filter]');
    if (sublink && (sublink.classList.contains('dropdown-item') || sublink.classList.contains('mobile-sublink'))) {
      const href = sublink.getAttribute('href');
      const filterVal = sublink.getAttribute('data-filter');
      if (href && filterVal) {
        const sectionId = href.replace('#', '');
        setTimeout(() => {
          filterProductCards(sectionId, filterVal);
        }, 50);
      }
    }
  });

  // Initial Router Trigger
  switchView(window.location.hash, true);

  // 2. MOBILE MENU DRAWER
  const mobileToggle = document.querySelector('.mobile-toggle');
  const mobileDrawer = document.querySelector('.mobile-drawer');
  const drawerBackdrop = document.querySelector('.drawer-backdrop');
  const mobileLinks = document.querySelectorAll('.mobile-drawer .nav-link, .mobile-drawer .btn');

  function toggleMobileMenu(forceClose = false) {
    const isOpen = forceClose ? false : !mobileDrawer.classList.contains('open');
    mobileToggle.classList.toggle('is-active', isOpen);
    mobileDrawer.classList.toggle('open', isOpen);
    drawerBackdrop.classList.toggle('open', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  }

  if (mobileToggle) {
    mobileToggle.addEventListener('click', () => toggleMobileMenu());
  }
  if (drawerBackdrop) {
    drawerBackdrop.addEventListener('click', () => toggleMobileMenu(true));
  }
  mobileLinks.forEach(link => {
    link.addEventListener('click', () => toggleMobileMenu(true));
  });

  // 3. FLOATING COCOA & GOLD PARTICLES IN HERO
  const canvas = document.getElementById('particle-canvas');
  if (canvas && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    window.addEventListener('resize', () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    });

    const particles = [];
    const particleCount = window.innerWidth < 768 ? 25 : 45;

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
        // Warm gold and cocoa particles
        const colors = [
          'rgba(212, 163, 115, ', // gold
          'rgba(243, 222, 184, ', // light gold
          'rgba(184, 133, 84, ',  // caramel
          'rgba(130, 80, 50, '    // warm cocoa
        ];
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

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    function renderParticles() {
      ctx.clearRect(0, 0, width, height);
      particles.forEach(p => {
        p.update();
        p.draw();
      });
      animationFrameId = requestAnimationFrame(renderParticles);
    }

    // Only run when hero is visible
    const heroObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (!animationFrameId) renderParticles();
        } else {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
      });
    }, { threshold: 0.1 });

    const heroSection = document.getElementById('home');
    if (heroSection) heroObserver.observe(heroSection);
  }

  // 4. INTERACTIVE OCCASIONS EXPLORER
  const occasionBtns = document.querySelectorAll('.occasion-btn');
  const occasionIcon = document.getElementById('occasion-icon');
  const occasionTitle = document.getElementById('occasion-title');
  const occasionTagline = document.getElementById('occasion-tagline');
  const occasionDesc = document.getElementById('occasion-desc');
  const occasionTreatsList = document.getElementById('occasion-treats-list');
  const occasionImage = document.getElementById('occasion-image');
  const occasionEnquireBtn = document.getElementById('occasion-enquire-btn');

  let currentOccasionId = 'birthdays';

  function updateOccasionDisplay(occId) {
    if (!window.BRAND_CONFIG || !window.BRAND_CONFIG.occasions) return;
    const occ = window.BRAND_CONFIG.occasions.find(o => o.id === occId);
    if (!occ) return;

    currentOccasionId = occ.id;

    if (occasionIcon) occasionIcon.textContent = occ.icon;
    if (occasionTitle) occasionTitle.textContent = occ.name;
    if (occasionTagline) occasionTagline.textContent = occ.tagline;
    if (occasionDesc) occasionDesc.textContent = occ.description;

    // Map occasion to appropriate generated asset
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

    if (occasionImage && occasionImageMap[occId]) {
      occasionImage.src = occasionImageMap[occId];
      occasionImage.alt = `${occ.name} Treats - Madhuri's Choco Heaven`;
    }

    if (occasionTreatsList) {
      occasionTreatsList.innerHTML = '';
      occ.treats.forEach(treat => {
        const li = document.createElement('li');
        li.textContent = treat;
        occasionTreatsList.appendChild(li);
      });
    }

    occasionBtns.forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-occasion') === occId);
    });

    // Populate matched treats chips
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

    const occasionMatchedChips = document.getElementById('occasion-matched-chips');
    if (occasionMatchedChips) {
      const chips = occasionTreatChipsMap[occId] || occasionTreatChipsMap['birthdays'];
      occasionMatchedChips.innerHTML = chips.map(chip => `
        <a href="${chip.hash}" class="occasion-matched-chip" data-filter="${chip.filter}" data-section="${chip.section}" title="Explore ${chip.name}">
          <span class="occasion-matched-chip-icon">${chip.icon}</span>
          <span>${chip.name}</span>
        </a>
      `).join('');
    }
  }

  // Initialize occasion display on load
  updateOccasionDisplay('birthdays');

  // Occasion matched chip click filter routing
  document.addEventListener('click', (e) => {
    const chip = e.target.closest('.occasion-matched-chip');
    if (chip) {
      const section = chip.getAttribute('data-section');
      const filter = chip.getAttribute('data-filter');
      if (section && filter) {
        setTimeout(() => {
          filterCategoryProducts(section, filter);
        }, 100);
      }
    }
  });

  occasionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const occId = btn.getAttribute('data-occasion');
      updateOccasionDisplay(occId);
    });
  });

  if (occasionEnquireBtn) {
    occasionEnquireBtn.addEventListener('click', () => {
      const occSelect = document.getElementById('enquiry-occasion');
      const contactSection = document.getElementById('contact');

      const occasionMap = {
        'birthdays': 'Birthday',
        'weddings': 'Wedding',
        'anniversaries': 'Anniversary',
        'baby-showers': 'Baby Shower',
        'festivals': 'Festival',
        'return-gifts': 'Return Gifts',
        'corporate': 'Corporate Gifting',
        'special-celebrations': 'Other'
      };

      if (occSelect && currentOccasionId) {
        const targetValue = (occasionMap[currentOccasionId] || currentOccasionId).toLowerCase();
        for (let opt of occSelect.options) {
          const val = opt.value.toLowerCase();
          const txt = opt.text.toLowerCase();
          if (val === targetValue || val.includes(targetValue) || targetValue.includes(val) || txt.includes(targetValue)) {
            occSelect.value = opt.value;
            break;
          }
        }
      }

      if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth' });
        highlightContactForm();
      }
    });
  }

  // 5. INTERACTIVE FLAVOUR & OCCASION SELECTION & PRODUCT ENQUIRY ACTION
  document.addEventListener('click', (e) => {
    // 5A. Flavour Pill Selection (Flavoured Chocolates)
    const flavourPill = e.target.closest('.flavour-pill');
    if (flavourPill) {
      const row = flavourPill.closest('.flavour-pills-row');
      const productId = row?.getAttribute('data-product-id');
      const flavour = flavourPill.getAttribute('data-flavour');
      if (!productId || !flavour) return;

      const isAlreadyActive = flavourPill.classList.contains('active');
      row.querySelectorAll('.flavour-pill').forEach(p => p.classList.remove('active'));

      const badge = document.getElementById(`flavour-badge-${productId}`);
      const waBtn = document.getElementById(`wa-btn-${productId}`);
      const card = document.getElementById(`card-${productId}`);
      const enquireBtn = card?.querySelector('.action-enquire-product');
      const prod = window.BRAND_CONFIG?.chocolates?.find(p => p.id === productId);

      if (isAlreadyActive) {
        if (badge) badge.textContent = 'All Flavours';
        if (waBtn && prod) waBtn.href = getProductWhatsAppUrl(prod, '');
        if (enquireBtn) enquireBtn.removeAttribute('data-selected-flavour');
      } else {
        flavourPill.classList.add('active');
        if (badge) badge.textContent = `${flavour} Selected`;
        if (waBtn && prod) waBtn.href = getProductWhatsAppUrl(prod, flavour);
        if (enquireBtn) enquireBtn.setAttribute('data-selected-flavour', flavour);
      }
      return;
    }

    // 5B. Occasion Chip Selection (Theme-Based Chocolates)
    const occChip = e.target.closest('.occasion-chip');
    if (occChip) {
      const occasionName = occChip.getAttribute('data-occasion');
      const card = occChip.closest('.product-card');
      const productId = card?.id?.replace('card-', '');
      const prod = window.BRAND_CONFIG?.chocolates?.find(p => p.id === productId);
      const waBtn = document.getElementById(`wa-btn-${productId}`);
      const enquireBtn = card?.querySelector('.action-enquire-product');

      const isChipActive = occChip.classList.contains('active');
      card.querySelectorAll('.occasion-chip').forEach(c => c.classList.remove('active'));

      if (isChipActive) {
        if (waBtn && prod) waBtn.href = getProductWhatsAppUrl(prod, '');
        if (enquireBtn) enquireBtn.removeAttribute('data-selected-occasion');
      } else {
        occChip.classList.add('active');
        if (waBtn && prod) waBtn.href = getProductWhatsAppUrl(prod, occasionName);
        if (enquireBtn) enquireBtn.setAttribute('data-selected-occasion', occasionName);
      }
      return;
    }

    // 5C. Product "Customise & Enquire" / "Enquire Now" CTA Click
    const btn = e.target.closest('.action-enquire-product');
    if (btn) {
      const productName = btn.getAttribute('data-product-name');
      const productCategory = btn.getAttribute('data-product-category') || '';
      const actionType = btn.getAttribute('data-action-type') || '';
      const selectedFlavour = btn.getAttribute('data-selected-flavour');
      const selectedOccasion = btn.getAttribute('data-selected-occasion');

      const productSelect = document.getElementById('enquiry-product');
      const occasionSelect = document.getElementById('enquiry-occasion');
      const customNotes = document.getElementById('enquiry-customisation');
      const contactSection = document.getElementById('contact');

      // 1. Select the product in the dropdown
      if (productSelect && productName) {
        let matched = false;
        for (let opt of productSelect.options) {
          if (opt.value.toLowerCase().includes(productName.toLowerCase()) || opt.text.toLowerCase().includes(productName.toLowerCase())) {
            productSelect.value = opt.value;
            matched = true;
            break;
          }
        }
      }

      // 2. Map occasion if selected
      if (occasionSelect && selectedOccasion) {
        for (let opt of occasionSelect.options) {
          if (opt.text.toLowerCase().includes(selectedOccasion.toLowerCase())) {
            occasionSelect.value = opt.value;
            break;
          }
        }
      }

      // 3. Pre-fill tailored customisation notes
      if (customNotes) {
        if (actionType === 'theme') {
          const occPrompt = selectedOccasion ? `Theme/Occasion: ${selectedOccasion}. ` : 'Theme/Occasion: (Rakhi, Diwali, Birthday, etc.). ';
          customNotes.value = `${occPrompt}I would like custom handcrafted chocolates tailored for this celebration.`;
        } else if (actionType === 'corporate') {
          customNotes.value = `Corporate Order: Custom chocolates featuring our company logo/branding, custom box packaging and greeting sleeve.`;
        } else if (actionType === 'flavoured') {
          const flavPrompt = selectedFlavour ? `Flavour Preference: ${selectedFlavour}. ` : 'Flavours interested in: ';
          customNotes.value = `${flavPrompt}Please share available assortment sizes and pricing details.`;
        } else if (actionType === 'bouquet') {
          customNotes.value = `Custom Chocolate Bouquet arrangement for celebration gifting.`;
        } else if (actionType === 'hamper') {
          customNotes.value = `Customised Occasion Hamper with assorted chocolates and celebratory packaging.`;
        } else {
          customNotes.value = `I am interested in ${productName}. I’d like to know more about customisation, quantity and pricing.`;
        }
      }

      // 4. Smooth scroll to contact and highlight form
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth' });
        highlightContactForm();
      }
    }
  });

  function highlightContactForm() {
    const formCard = document.querySelector('.enquiry-form-card');
    if (formCard) {
      formCard.style.boxShadow = '0 0 35px rgba(212, 163, 115, 0.6)';
      formCard.style.borderColor = 'var(--gold-400)';
      setTimeout(() => {
        formCard.style.boxShadow = '';
        formCard.style.borderColor = '';
      }, 1500);
    }
  }

  // 6. FORM HANDLING & WHATSAPP INTEGRATION
  const enquiryForm = document.getElementById('order-enquiry-form');
  const whatsappSubmitBtn = document.getElementById('btn-whatsapp-enquiry');
  const dialogOverlay = document.getElementById('dialog-overlay');
  const dialogCloseBtn = document.getElementById('dialog-close-btn');

  function getFormData() {
    return {
      name: document.getElementById('enquiry-name')?.value.trim() || '',
      phone: document.getElementById('enquiry-phone')?.value.trim() || '',
      email: document.getElementById('enquiry-email')?.value.trim() || '',
      occasion: document.getElementById('enquiry-occasion')?.value || 'Not specified',
      product: document.getElementById('enquiry-product')?.value || 'General inquiry',
      quantity: document.getElementById('enquiry-quantity')?.value.trim() || 'Custom',
      date: document.getElementById('enquiry-date')?.value || 'Flexible',
      customisation: document.getElementById('enquiry-customisation')?.value.trim() || 'None specified',
      message: document.getElementById('enquiry-message')?.value.trim() || ''
    };
  }

  function validateForm(data) {
    if (!data.name) {
      showToast('Please enter your full name 🍫');
      document.getElementById('enquiry-name')?.focus();
      return false;
    }
    if (!data.phone) {
      showToast('Please provide your phone/WhatsApp number 📞');
      document.getElementById('enquiry-phone')?.focus();
      return false;
    }
    return true;
  }

  function buildWhatsAppMessage(data) {
    return encodeURIComponent(
      `*New Order Enquiry - Madhuri’s Choco Heaven 🍫❤️*
---------------------------------------
• *Name:* ${data.name}
• *Phone:* ${data.phone}
• *Email:* ${data.email || 'Not provided'}
• *Occasion:* ${data.occasion}
• *Product Interested In:* ${data.product}
• *Quantity:* ${data.quantity}
• *Preferred Date:* ${data.date}
• *Customisation Details:* ${data.customisation}
• *Special Message:* ${data.message || 'Looking forward to delicious treats!'}
---------------------------------------
_Sent via Madhuri’s Choco Heaven Website_`
    );
  }

  // WhatsApp Button Direct Click
  if (whatsappSubmitBtn) {
    whatsappSubmitBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const data = getFormData();
      if (!validateForm(data)) return;

      const waNumber = window.BRAND_CONFIG?.contact?.whatsappNumber || 'YOUR_WHATSAPP_NUMBER';
      const text = buildWhatsAppMessage(data);
      const url = `https://wa.me/${waNumber}?text=${text}`;

      showToast('Opening WhatsApp with your order details... 💬');
      window.open(url, '_blank', 'noopener,noreferrer');
    });
  }

  // Standard Form Submit
  if (enquiryForm) {
    enquiryForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = getFormData();
      if (!validateForm(data)) return;

      // Show confirmation modal
      const refNumber = 'MCH-' + Math.floor(100000 + Math.random() * 900000);
      const refElem = document.getElementById('dialog-ref-number');
      if (refElem) refElem.textContent = refNumber;

      if (dialogOverlay) {
        dialogOverlay.classList.add('open');
      }

      enquiryForm.reset();
    });
  }

  if (dialogCloseBtn) {
    dialogCloseBtn.addEventListener('click', () => {
      if (dialogOverlay) dialogOverlay.classList.remove('open');
    });
  }

  if (dialogOverlay) {
    dialogOverlay.addEventListener('click', (e) => {
      if (e.target === dialogOverlay) {
        dialogOverlay.classList.remove('open');
      }
    });
  }

  // 7. TOAST NOTIFICATION UTILITY
  function showToast(message) {
    let toast = document.getElementById('toast-notice');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast-notice';
      toast.className = 'toast-notice';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3500);
  }

  // 8. SCROLL REVEAL OBSERVER
  const revealElements = document.querySelectorAll('.reveal-on-scroll');
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '0px 0px -60px 0px',
      threshold: 0.12
    });

    revealElements.forEach(el => revealObserver.observe(el));
  } else {
    revealElements.forEach(el => el.classList.add('revealed'));
  }

  // 9. BACK TO TOP BUTTON
  const backToTopBtn = document.getElementById('back-to-top');
  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  const floatingBackToTopBtn = document.getElementById('back-to-top-float');
  if (floatingBackToTopBtn) {
    floatingBackToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Set minimum date for preferred date picker to today
  const dateInput = document.getElementById('enquiry-date');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
  }

  // ==========================================================================
  // 10. "FROM COCOA TO CELEBRATION" - STORY TIMELINE & STAGE INTERACTION
  // ==========================================================================
  const storyCards = document.querySelectorAll('.story-card');
  const storyTimelineFill = document.getElementById('story-timeline-fill');

  function setStoryStage(stageNumber) {
    storyCards.forEach(card => {
      const isCurrent = card.getAttribute('data-stage') === String(stageNumber);
      card.classList.toggle('active-stage', isCurrent);
    });

    if (storyTimelineFill) {
      const stagePercent = { '1': 25, '2': 50, '3': 75, '4': 100 };
      const width = stagePercent[String(stageNumber)] || 25;
      storyTimelineFill.style.width = `${width}%`;
    }
  }

  // Hover or click on story card updates stage
  storyCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      const stage = card.getAttribute('data-stage');
      if (stage) setStoryStage(stage);
    });

    card.addEventListener('click', () => {
      const stage = card.getAttribute('data-stage');
      if (stage) setStoryStage(stage);
    });
  });

  // Story scroll spy via IntersectionObserver
  if ('IntersectionObserver' in window && storyCards.length > 0) {
    const storyObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const stage = entry.target.getAttribute('data-stage');
          if (stage) setStoryStage(stage);
        }
      });
    }, {
      rootMargin: '0px 0px -40% 0px',
      threshold: 0.3
    });

    storyCards.forEach(card => storyObserver.observe(card));
  }

  // ==========================================================================
  // 11. LUXURY CUSTOM CURSOR (DESKTOP WITH FINE POINTER ONLY)
  // ==========================================================================
  const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (isFinePointer && !prefersReducedMotion) {
    const cursorDot = document.getElementById('custom-cursor-dot');
    const cursorRing = document.getElementById('custom-cursor-ring');

    if (cursorDot && cursorRing) {
      let mouseX = -100;
      let mouseY = -100;
      let ringX = -100;
      let ringY = -100;
      let isVisible = false;
      let isAnimating = false;

      function renderCursor() {
        if (!isVisible) {
          isAnimating = false;
          return;
        }
        // Smooth lerp (linear interpolation) for ring
        ringX += (mouseX - ringX) * 0.16;
        ringY += (mouseY - ringY) * 0.16;

        cursorDot.style.left = `${mouseX}px`;
        cursorDot.style.top = `${mouseY}px`;
        cursorRing.style.left = `${ringX}px`;
        cursorRing.style.top = `${ringY}px`;

        requestAnimationFrame(renderCursor);
      }

      window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        if (!isVisible) {
          isVisible = true;
          cursorDot.style.opacity = '1';
          cursorRing.style.opacity = '1';
          if (!isAnimating) {
            isAnimating = true;
            requestAnimationFrame(renderCursor);
          }
        }
      }, { passive: true });

      // Interactive hover states on clickable elements
      const interactiveSelector = 'a, button, input, select, textarea, .product-card, .category-card, .gallery-item, .story-card, .flavour-pill, .occasion-btn, .occasion-chip';

      document.addEventListener('mouseover', (e) => {
        if (e.target.closest(interactiveSelector)) {
          cursorRing.classList.add('cursor-hover');
        }
      }, { passive: true });

      document.addEventListener('mouseout', (e) => {
        if (e.target.closest(interactiveSelector)) {
          cursorRing.classList.remove('cursor-hover');
        }
      }, { passive: true });

      document.addEventListener('mousedown', () => {
        cursorRing.classList.add('cursor-active');
      });

      document.addEventListener('mouseup', () => {
        cursorRing.classList.remove('cursor-active');
      });

      document.addEventListener('mouseleave', () => {
        cursorDot.classList.add('custom-cursor-hidden');
        cursorRing.classList.add('custom-cursor-hidden');
      });

      document.addEventListener('mouseenter', () => {
        cursorDot.classList.remove('custom-cursor-hidden');
        cursorRing.classList.remove('custom-cursor-hidden');
      });
    }
  }

  // ==========================================================================
  // 12. DESKTOP MOUSE PARALLAX ON HERO MEDIA & FLOATING CARDS
  // ==========================================================================
  if (isFinePointer && !prefersReducedMotion) {
    const heroSection = document.querySelector('.hero-section');
    const heroCard1 = document.querySelector('.floating-hero-card-1');
    const heroCard2 = document.querySelector('.floating-hero-card-2');
    const heroImgFrame = document.querySelector('.hero-image-frame');

    if (heroSection && (heroCard1 || heroCard2 || heroImgFrame)) {
      heroSection.addEventListener('mousemove', (e) => {
        const rect = heroSection.getBoundingClientRect();
        const normX = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
        const normY = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);

        if (heroCard1) {
          heroCard1.style.transform = `translate(${normX * -14}px, ${normY * -12}px)`;
        }
        if (heroCard2) {
          heroCard2.style.transform = `translate(${normX * 16}px, ${normY * 14}px)`;
        }
        if (heroImgFrame) {
          heroImgFrame.style.transform = `perspective(1000px) rotateY(${normX * 3}deg) rotateX(${normY * -3}deg)`;
        }
      }, { passive: true });

      heroSection.addEventListener('mouseleave', () => {
        if (heroCard1) heroCard1.style.transform = '';
        if (heroCard2) heroCard2.style.transform = '';
        if (heroImgFrame) heroImgFrame.style.transform = '';
      });
    }
  }

  // ==========================================================================
  // 13. DESKTOP MAGNETIC CTA BUTTONS
  // ==========================================================================
  if (isFinePointer && !prefersReducedMotion) {
    const magneticBtns = document.querySelectorAll('.hero-ctas .btn, .btn-gold, .btn-outline, .floating-back-to-top');

    magneticBtns.forEach(btn => {
      btn.classList.add('btn-magnetic');

      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;

        // Subtle pull limit: max 6px
        const pullX = Math.max(-6, Math.min(6, x * 0.22));
        const pullY = Math.max(-6, Math.min(6, y * 0.22));

        btn.style.transform = `translate(${pullX}px, ${pullY}px)`;
      });

      btn.addEventListener('mouseleave', () => {
        btn.style.transform = '';
      });
    });
  }
});
