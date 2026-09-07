/**
 * MADHURI'S CHOCO HEAVEN - GALLERY FILTERING & LIGHTBOX
 */

document.addEventListener('DOMContentLoaded', () => {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const galleryItems = document.querySelectorAll('.gallery-item');
  const lightbox = document.getElementById('lightbox-modal');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxTitle = document.getElementById('lightbox-title');
  const lightboxCaption = document.getElementById('lightbox-caption');
  const lightboxClose = document.getElementById('lightbox-close');
  const lightboxPrev = document.getElementById('lightbox-prev');
  const lightboxNext = document.getElementById('lightbox-next');
  const lightboxEnquireBtn = document.getElementById('lightbox-enquire-btn');

  let activeItems = Array.from(galleryItems);
  let currentLightboxIndex = 0;

  // 1. FILTERING
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filterValue = btn.getAttribute('data-filter');

      activeItems = [];
      galleryItems.forEach(item => {
        const itemCategory = item.getAttribute('data-category');
        if (filterValue === 'all' || itemCategory === filterValue) {
          item.style.display = 'block';
          setTimeout(() => {
            item.style.opacity = '1';
            item.style.transform = 'scale(1)';
          }, 50);
          activeItems.push(item);
        } else {
          item.style.opacity = '0';
          item.style.transform = 'scale(0.92)';
          setTimeout(() => {
            item.style.display = 'none';
          }, 300);
        }
      });
    });
  });

  // 2. LIGHTBOX OPEN
  function openLightbox(index) {
    if (!lightbox || activeItems.length === 0) return;
    currentLightboxIndex = index;
    const item = activeItems[currentLightboxIndex];
    
    const imgElem = item.querySelector('img');
    const title = item.getAttribute('data-title') || imgElem.alt;
    const caption = item.getAttribute('data-caption') || '';
    const src = imgElem.getAttribute('src');

    lightboxImg.src = src;
    lightboxImg.alt = title;
    lightboxTitle.textContent = title;
    lightboxCaption.textContent = caption;

    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }

  function nextLightbox() {
    if (activeItems.length === 0) return;
    currentLightboxIndex = (currentLightboxIndex + 1) % activeItems.length;
    openLightbox(currentLightboxIndex);
  }

  function prevLightbox() {
    if (activeItems.length === 0) return;
    currentLightboxIndex = (currentLightboxIndex - 1 + activeItems.length) % activeItems.length;
    openLightbox(currentLightboxIndex);
  }

  galleryItems.forEach((item) => {
    item.addEventListener('click', () => {
      const idx = activeItems.indexOf(item);
      if (idx !== -1) {
        openLightbox(idx);
      }
    });
  });

  if (lightboxClose) {
    lightboxClose.addEventListener('click', closeLightbox);
  }

  if (lightboxPrev) {
    lightboxPrev.addEventListener('click', (e) => {
      e.stopPropagation();
      prevLightbox();
    });
  }

  if (lightboxNext) {
    lightboxNext.addEventListener('click', (e) => {
      e.stopPropagation();
      nextLightbox();
    });
  }

  // Backdrop click closes
  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) {
        closeLightbox();
      }
    });
  }

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (!lightbox || !lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') nextLightbox();
    if (e.key === 'ArrowLeft') prevLightbox();
  });

  // Lightbox "Enquire About This" action
  if (lightboxEnquireBtn) {
    lightboxEnquireBtn.addEventListener('click', () => {
      const currentItem = activeItems[currentLightboxIndex];
      const title = currentItem ? (currentItem.getAttribute('data-title') || '') : '';
      closeLightbox();

      const productSelect = document.getElementById('enquiry-product');
      const customNotes = document.getElementById('enquiry-customisation');
      const contactSection = document.getElementById('contact');

      if (productSelect && title) {
        const lowerTitle = title.toLowerCase();
        let matched = false;

        // Try exact/substring match
        for (let opt of productSelect.options) {
          const optLower = opt.value.toLowerCase();
          if (optLower.includes(lowerTitle) || lowerTitle.includes(optLower)) {
            productSelect.value = opt.value;
            matched = true;
            break;
          }
        }

        // If not matched, try keyword match
        if (!matched) {
          const keywords = [
            { key: 'truffle', val: 'Chocolate Truffles' },
            { key: 'cake', val: 'Celebration Cakes' },
            { key: 'bar', val: 'Custom Chocolate Bars' },
            { key: 'hamper', val: 'Festival Chocolate Hampers' },
            { key: 'cupcake', val: 'Gourmet Cupcakes' },
            { key: 'muffin', val: 'Bakery Muffins' },
            { key: 'brownie', val: 'Fudgy Brownies' },
            { key: 'cookie', val: 'Artisan Cookies' },
            { key: 'plum', val: 'Spiced Plum Cake' }
          ];

          for (let item of keywords) {
            if (lowerTitle.includes(item.key)) {
              productSelect.value = item.val;
              matched = true;
              break;
            }
          }
        }

        if (customNotes) {
          customNotes.value = `Enquiring specifically about: ${title}`;
        }
      }

      if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth' });
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
    });
  }
});
