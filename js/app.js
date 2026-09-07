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

  function filterProductCards(sectionId, filterValue) {
    const section = document.getElementById(sectionId);
    if (!section) return;

    // Update filter button UI inside section
    const filterBtns = section.querySelectorAll('.category-filter-bar .filter-btn');
    filterBtns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-filter') === filterValue);
    });

    // Filter product cards
    const cards = section.querySelectorAll('.product-card');
    cards.forEach(card => {
      const category = card.getAttribute('data-category');
      if (filterValue === 'all' || category === filterValue) {
        card.style.display = '';
        card.style.opacity = '1';
        card.style.transform = 'scale(1)';
      } else {
        card.style.display = 'none';
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
  }

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

  // 5. PRODUCT "CUSTOMISE & ENQUIRE" BUTTONS ACTION
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.action-enquire-product');
    if (btn) {
      const productName = btn.getAttribute('data-product-name');
      const productCategory = btn.getAttribute('data-product-category') || '';
      
      const productSelect = document.getElementById('enquiry-product');
      const customNotes = document.getElementById('enquiry-customisation');
      const contactSection = document.getElementById('contact');

      if (productSelect && productName) {
        let matched = false;
        for (let opt of productSelect.options) {
          if (opt.text.toLowerCase().includes(productName.toLowerCase())) {
            productSelect.value = opt.value;
            matched = true;
            break;
          }
        }
        if (!matched && customNotes) {
          customNotes.value = `I would like to enquire about and customise: ${productName}`;
        }
      }

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

  // Set minimum date for preferred date picker to today
  const dateInput = document.getElementById('enquiry-date');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
  }
});
