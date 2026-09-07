/**
 * MADHURI'S CHOCO HEAVEN - AUTHENTICATION & ACTION PROTECTION MODULE
 * User Session Management, Navigation Auth Controls & Order Protection
 */

(function () {
  const USERS_KEY = 'mch_users';
  const CURRENT_USER_KEY = 'mch_current_user';

  class AuthSystem {
    constructor() {
      this.initStorage();
    }

    initStorage() {
      if (!localStorage.getItem(USERS_KEY)) {
        const defaultUsers = [
          {
            name: 'Madhuri Guest',
            email: 'user@example.com',
            password: 'password123'
          }
        ];
        localStorage.setItem(USERS_KEY, JSON.stringify(defaultUsers));
      }
    }

    getUsers() {
      try {
        return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
      } catch (e) {
        return [];
      }
    }

    getCurrentUser() {
      try {
        return JSON.parse(localStorage.getItem(CURRENT_USER_KEY)) || null;
      } catch (e) {
        return null;
      }
    }

    isAuthenticated() {
      return !!this.getCurrentUser();
    }

    signup(name, email, password, confirmPassword) {
      name = name ? name.trim() : '';
      email = email ? email.trim().toLowerCase() : '';
      password = password || '';
      confirmPassword = confirmPassword || '';

      if (!name) return { success: false, message: 'Please enter your full name.' };
      if (!email || !this.validateEmail(email)) return { success: false, message: 'Please enter a valid email address.' };
      if (!password || password.length < 6) return { success: false, message: 'Password must be at least 6 characters.' };
      if (password !== confirmPassword) return { success: false, message: 'Passwords do not match.' };

      const users = this.getUsers();
      if (users.some(u => u.email === email)) {
        return { success: false, message: 'An account with this email already exists.' };
      }

      const newUser = { name, email, password };
      users.push(newUser);
      localStorage.setItem(USERS_KEY, JSON.stringify(users));

      // Auto login session
      const sessionUser = { name: newUser.name, email: newUser.email };
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(sessionUser));

      return { success: true, user: sessionUser };
    }

    login(email, password) {
      email = email ? email.trim().toLowerCase() : '';
      password = password || '';

      if (!email || !this.validateEmail(email)) return { success: false, message: 'Please enter a valid email address.' };
      if (!password) return { success: false, message: 'Please enter your password.' };

      const users = this.getUsers();
      let user = users.find(u => u.email === email);

      // In demo mode, if valid format and password >= 6, auto-register if user doesn't exist yet
      if (!user && password.length >= 6) {
        user = { name: email.split('@')[0], email: email, password: password };
        users.push(user);
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
      }

      if (!user || user.password !== password) {
        return { success: false, message: 'Invalid email or password. (Password min 6 characters)' };
      }

      const sessionUser = { name: user.name, email: user.email };
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(sessionUser));

      return { success: true, user: sessionUser };
    }

    logout() {
      localStorage.removeItem(CURRENT_USER_KEY);
      this.updateNavbarUI();
      if (window.showToast) {
        window.showToast('Logged out successfully. 👋');
      }
    }

    validateEmail(email) {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return re.test(email);
    }

    updateNavbarUI() {
      const user = this.getCurrentUser();
      const headerAuthControls = document.getElementById('header-auth-controls');
      const mobileAuthControls = document.getElementById('mobile-auth-controls');

      if (user) {
        const firstName = user.name.split(' ')[0];
        const loggedInHTML = `
          <div class="header-user-badge">
            <span class="user-avatar-icon">👤</span>
            <span class="header-user-name">${this.escapeHtml(firstName)}</span>
          </div>
          <button type="button" class="btn-nav-logout" id="btn-logout-header">Logout</button>
        `;

        const mobileLoggedInHTML = `
          <div class="mobile-user-box">
            <span class="header-user-badge">
              <span class="user-avatar-icon">👤</span>
              <span>${this.escapeHtml(user.name)}</span>
            </span>
            <button type="button" class="btn-nav-logout" id="btn-logout-mobile">Logout</button>
          </div>
        `;

        if (headerAuthControls) headerAuthControls.innerHTML = loggedInHTML;
        if (mobileAuthControls) mobileAuthControls.innerHTML = mobileLoggedInHTML;

        // Bind logout handlers
        const btnLogoutHeader = document.getElementById('btn-logout-header');
        const btnLogoutMobile = document.getElementById('btn-logout-mobile');
        if (btnLogoutHeader) btnLogoutHeader.addEventListener('click', () => this.logout());
        if (btnLogoutMobile) btnLogoutMobile.addEventListener('click', () => this.logout());
      } else {
        const loggedOutHTML = `
          <a href="login.html?tab=login" class="btn-nav-login">Login</a>
          <a href="login.html?tab=signup" class="btn-nav-signup">Sign Up</a>
        `;

        const mobileLoggedOutHTML = `
          <div class="mobile-auth-buttons">
            <a href="login.html?tab=login" class="btn btn-outline" style="flex: 1; text-align: center;">Login</a>
            <a href="login.html?tab=signup" class="btn btn-gold" style="flex: 1; text-align: center;">Sign Up</a>
          </div>
        `;

        if (headerAuthControls) headerAuthControls.innerHTML = loggedOutHTML;
        if (mobileAuthControls) mobileAuthControls.innerHTML = mobileLoggedOutHTML;
      }
    }

    escapeHtml(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }
  }

  const authInstance = new AuthSystem();
  window.AuthSystem = authInstance;

  // Protected Action Helper
  window.requireAuthOrRedirect = function (redirectHash = '#contact') {
    if (authInstance.isAuthenticated()) {
      return true;
    } else {
      const redirectTarget = encodeURIComponent(`index.html${redirectHash}`);
      window.location.href = `login.html?redirect=${redirectTarget}`;
      return false;
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    // Initial navbar rendering
    authInstance.updateNavbarUI();

    // INTERCEPT PROTECTED ACTIONS FOR UNLESS LOGGED IN
    // 1. Order Now CTA buttons (.header-cta and mobile drawer order button)
    const orderBtns = document.querySelectorAll('.header-cta, .mobile-drawer-footer .btn');
    orderBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (!authInstance.isAuthenticated()) {
          e.preventDefault();
          e.stopPropagation();
          window.requireAuthOrRedirect('#contact');
        }
      }, true);
    });

    // 2. Customise & Enquire buttons on Product Cards (.action-enquire-product)
    document.addEventListener('click', (e) => {
      const prodBtn = e.target.closest('.action-enquire-product');
      if (prodBtn) {
        if (!authInstance.isAuthenticated()) {
          e.preventDefault();
          e.stopPropagation();
          window.requireAuthOrRedirect('#contact');
        }
      }
    }, true);

    // 3. Occasion Enquiry Button (#occasion-enquire-btn)
    const occasionBtn = document.getElementById('occasion-enquire-btn');
    if (occasionBtn) {
      occasionBtn.addEventListener('click', (e) => {
        if (!authInstance.isAuthenticated()) {
          e.preventDefault();
          e.stopPropagation();
          window.requireAuthOrRedirect('#contact');
        }
      }, true);
    }

    // 4. Order Enquiry Form Submission (#order-enquiry-form)
    const enquiryForm = document.getElementById('order-enquiry-form');
    if (enquiryForm) {
      enquiryForm.addEventListener('submit', (e) => {
        if (!authInstance.isAuthenticated()) {
          e.preventDefault();
          e.stopPropagation();
          window.requireAuthOrRedirect('#contact');
        }
      }, true);
    }

    // 5. WhatsApp Enquiry Button (#btn-whatsapp-enquiry)
    const whatsappBtn = document.getElementById('btn-whatsapp-enquiry');
    if (whatsappBtn) {
      whatsappBtn.addEventListener('click', (e) => {
        if (!authInstance.isAuthenticated()) {
          e.preventDefault();
          e.stopPropagation();
          window.requireAuthOrRedirect('#contact');
        }
      }, true);
    }
  });
})();
