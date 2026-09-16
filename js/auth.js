/**
 * MADHURI'S CHOCO HEAVEN - SUPABASE AUTHENTICATION & ROLE MANAGEMENT MODULE
 * User Session Persistence, Navigation Auth Controls & Role-Based Security
 */

(function () {
  'use strict';

  const LOCAL_USERS_KEY = 'mch_users';
  const LOCAL_CURRENT_USER_KEY = 'mch_current_user';

  class AuthSystem {
    constructor() {
      this.cachedUser = null;
      this.initLocalFallback();
      this.listenToAuthChanges();
    }

    initLocalFallback() {
      if (!localStorage.getItem(LOCAL_USERS_KEY)) {
        const defaultUsers = [
          { name: 'Customer User', email: 'user@test.com', password: 'password123', role: 'user' },
          { name: 'Store Admin', email: 'admin@test.com', password: 'password123', role: 'admin' },
          { name: 'Business Owner', email: 'owner@test.com', password: 'password123', role: 'owner' }
        ];
        localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(defaultUsers));
      }
    }

    getSupabase() {
      return window.MCH_SUPABASE && window.MCH_SUPABASE.client;
    }

    isSupabaseReady() {
      return window.MCH_SUPABASE && window.MCH_SUPABASE.isConfigured() && !!this.getSupabase();
    }

    listenToAuthChanges() {
      const sb = this.getSupabase();
      if (sb) {
        sb.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            await this.fetchProfileAndCache(session?.user);
          } else if (event === 'SIGNED_OUT') {
            this.cachedUser = null;
            localStorage.removeItem(LOCAL_CURRENT_USER_KEY);
          }
          this.updateNavbarUI();
        });
      }
    }

    async fetchProfileAndCache(authUser) {
      if (!authUser) {
        this.cachedUser = null;
        return null;
      }

      const sb = this.getSupabase();
      let role = 'user';
      let fullName = authUser.user_metadata?.full_name || authUser.email.split('@')[0];
      let phone = '';

      if (sb && this.isSupabaseReady()) {
        try {
          const { data, error } = await sb
            .from('profiles')
            .select('id, full_name, email, phone, role')
            .eq('id', authUser.id)
            .single();

          if (data && !error) {
            role = data.role || 'user';
            fullName = data.full_name || fullName;
            phone = data.phone || '';
          }
        } catch (e) {
          console.warn("Error fetching profile from Supabase:", e);
        }
      }

      this.cachedUser = {
        id: authUser.id,
        name: fullName,
        email: authUser.email,
        phone: phone,
        role: role
      };

      localStorage.setItem(LOCAL_CURRENT_USER_KEY, JSON.stringify(this.cachedUser));
      return this.cachedUser;
    }

    async getCurrentUser() {
      const sb = this.getSupabase();
      if (sb && this.isSupabaseReady()) {
        try {
          const { data: { session } } = await sb.auth.getSession();
          if (session && session.user) {
            return await this.fetchProfileAndCache(session.user);
          }
        } catch (e) {
          console.warn("Session check error:", e);
        }
      }

      // Fallback to local session
      try {
        const local = JSON.parse(localStorage.getItem(LOCAL_CURRENT_USER_KEY));
        if (local) {
          this.cachedUser = local;
          return local;
        }
      } catch (e) {}

      return null;
    }

    async signup(name, email, password, confirmPassword) {
      name = name ? name.trim() : '';
      email = email ? email.trim().toLowerCase() : '';
      password = password || '';
      confirmPassword = confirmPassword || '';

      if (!name) return { success: false, message: 'Please enter your full name.' };
      if (!email || !this.validateEmail(email)) return { success: false, message: 'Please enter a valid email address.' };
      if (!password || password.length < 6) return { success: false, message: 'Password must be at least 6 characters.' };
      if (password !== confirmPassword) return { success: false, message: 'Passwords do not match.' };

      const sb = this.getSupabase();
      if (sb && this.isSupabaseReady()) {
        try {
          const { data, error } = await sb.auth.signUp({
            email: email,
            password: password,
            options: {
              data: {
                full_name: name
              }
            }
          });

          if (error) {
            return { success: false, message: error.message };
          }

          if (data.user) {
            await this.fetchProfileAndCache(data.user);
            return { success: true, user: this.cachedUser, role: 'user' };
          }
        } catch (e) {
          return { success: false, message: e.message || 'Signup failed.' };
        }
      }

      // Local fallback mode
      const users = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY)) || [];
      if (users.some(u => u.email === email)) {
        return { success: false, message: 'An account with this email already exists.' };
      }

      const newUser = { id: 'local_' + Date.now(), name, email, password, role: 'user' };
      users.push(newUser);
      localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));

      const sessionUser = { id: newUser.id, name: newUser.name, email: newUser.email, role: 'user' };
      localStorage.setItem(LOCAL_CURRENT_USER_KEY, JSON.stringify(sessionUser));
      this.cachedUser = sessionUser;

      return { success: true, user: sessionUser, role: 'user' };
    }

    async login(email, password) {
      email = email ? email.trim().toLowerCase() : '';
      password = password || '';

      if (!email || !this.validateEmail(email)) return { success: false, message: 'Please enter a valid email address.' };
      if (!password) return { success: false, message: 'Please enter your password.' };

      const sb = this.getSupabase();
      if (sb && this.isSupabaseReady()) {
        try {
          const { data, error } = await sb.auth.signInWithPassword({
            email: email,
            password: password
          });

          if (error) {
            return { success: false, message: error.message };
          }

          if (data.user) {
            const userProfile = await this.fetchProfileAndCache(data.user);
            return { success: true, user: userProfile, role: userProfile.role };
          }
        } catch (e) {
          return { success: false, message: e.message || 'Login failed.' };
        }
      }

      // Local fallback mode for demo/test accounts
      const users = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY)) || [];
      let user = users.find(u => u.email === email);

      if (!user && password.length >= 6) {
        // Default role based on email if test account
        let role = 'user';
        if (email.includes('admin')) role = 'admin';
        if (email.includes('owner')) role = 'owner';

        user = { id: 'local_' + Date.now(), name: email.split('@')[0], email: email, password: password, role: role };
        users.push(user);
        localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
      }

      if (!user || user.password !== password) {
        return { success: false, message: 'Invalid email or password.' };
      }

      const sessionUser = { id: user.id || 'local_user', name: user.name, email: user.email, role: user.role || 'user' };
      localStorage.setItem(LOCAL_CURRENT_USER_KEY, JSON.stringify(sessionUser));
      this.cachedUser = sessionUser;

      return { success: true, user: sessionUser, role: sessionUser.role };
    }

    async logout() {
      const sb = this.getSupabase();
      if (sb && this.isSupabaseReady()) {
        try {
          await sb.auth.signOut();
        } catch (e) {}
      }

      this.cachedUser = null;
      localStorage.removeItem(LOCAL_CURRENT_USER_KEY);
      this.updateNavbarUI();

      if (window.showToast) {
        window.showToast('Logged out successfully. 👋');
      }
      window.location.href = 'index.html';
    }

    validateEmail(email) {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return re.test(email);
    }

    async updateNavbarUI() {
      const user = await this.getCurrentUser();
      const headerAuthControls = document.getElementById('header-auth-controls');
      const mobileAuthControls = document.getElementById('mobile-auth-controls');

      if (user) {
        const firstName = user.name ? user.name.split(' ')[0] : 'User';
        const role = user.role || 'user';

        let dashboardBadge = '';
        let dashboardMobileLink = '';
        if (role === 'admin') {
          dashboardBadge = `<a href="admin.html" class="btn btn-outline btn-sm" style="padding: 4px 12px; font-size: 0.82rem; border-color: var(--gold-400); color: var(--gold-300);">⚙️ Admin Dashboard</a>`;
          dashboardMobileLink = `<a href="admin.html" class="btn btn-outline" style="width: 100%; margin-bottom: 8px;">⚙️ Admin Dashboard</a>`;
        } else if (role === 'owner') {
          dashboardBadge = `<a href="owner.html" class="btn btn-gold btn-sm" style="padding: 4px 12px; font-size: 0.82rem;">👑 Owner Dashboard</a>`;
          dashboardMobileLink = `<a href="owner.html" class="btn btn-gold" style="width: 100%; margin-bottom: 8px;">👑 Owner Dashboard</a>`;
        }

        const loggedInHTML = `
          ${dashboardBadge}
          <div class="profile-dropdown-wrap" id="profile-dropdown-wrap">
            <button type="button" class="nav-profile-btn" id="nav-profile-toggle" aria-expanded="false" aria-label="User Profile Menu">
              <span class="user-avatar-icon">👤</span>
              <span class="nav-profile-label">${this.escapeHtml(firstName)} (${role.toUpperCase()})</span>
              <span class="dropdown-arrow">▾</span>
            </button>
            <div class="profile-dropdown-menu" id="profile-dropdown-menu">
              <div class="profile-user-info">
                <div class="profile-user-name">${this.escapeHtml(user.name || firstName)}</div>
                <div class="profile-user-email">${this.escapeHtml(user.email || '')}</div>
                <span class="badge-tag badge-gold" style="font-size: 0.72rem; margin-top: 4px; display: inline-block;">ROLE: ${role.toUpperCase()}</span>
              </div>
              <div class="profile-menu-divider"></div>
              <button type="button" class="profile-menu-item-btn" id="btn-view-order-history" style="width: 100%; text-align: left; padding: 8px 12px; background: transparent; border: none; color: var(--gold-300); font-size: 0.88rem; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                <span>📦 My Order History</span>
              </button>
              <div class="profile-menu-divider"></div>
              <button type="button" class="profile-logout-btn" id="btn-profile-logout">
                <span>🚪 Logout</span>
              </button>
            </div>
          </div>
        `;

        const mobileLoggedInHTML = `
          <div class="mobile-user-box">
            <div class="mobile-profile-info">
              <span class="user-avatar-icon" style="font-size: 1.3rem;">👤</span>
              <div>
                <div class="mobile-profile-name">${this.escapeHtml(user.name)}</div>
                <div class="mobile-profile-email">${this.escapeHtml(user.email)}</div>
                <div style="font-size: 0.76rem; color: var(--gold-400); font-weight: 700; margin-top: 2px;">Role: ${role.toUpperCase()}</div>
              </div>
            </div>
            ${dashboardMobileLink}
            <button type="button" class="btn btn-outline" id="btn-mobile-order-history" style="width: 100%; font-size: 0.85rem; margin-bottom: 6px;">📦 My Order History</button>
            <button type="button" class="profile-logout-btn" id="btn-logout-mobile" style="margin-top: 4px;">
              <span>🚪 Logout</span>
            </button>
          </div>
        `;

        if (headerAuthControls) headerAuthControls.innerHTML = loggedInHTML;
        if (mobileAuthControls) mobileAuthControls.innerHTML = mobileLoggedInHTML;

        // Event listener bindings
        const wrap = document.getElementById('profile-dropdown-wrap');
        const toggleBtn = document.getElementById('nav-profile-toggle');
        const logoutBtn = document.getElementById('btn-profile-logout');
        const mobileLogoutBtn = document.getElementById('btn-logout-mobile');
        const orderHistoryBtn = document.getElementById('btn-view-order-history');
        const mobileOrderHistoryBtn = document.getElementById('btn-mobile-order-history');

        if (toggleBtn && wrap) {
          toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = wrap.classList.toggle('open');
            toggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
          });
        }

        if (logoutBtn) {
          logoutBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (wrap) wrap.classList.remove('open');
            this.logout();
          });
        }

        if (mobileLogoutBtn) {
          mobileLogoutBtn.addEventListener('click', () => this.logout());
        }

        if (orderHistoryBtn) {
          orderHistoryBtn.addEventListener('click', () => {
            if (wrap) wrap.classList.remove('open');
            if (window.openOrderHistoryModal) window.openOrderHistoryModal();
          });
        }

        if (mobileOrderHistoryBtn) {
          mobileOrderHistoryBtn.addEventListener('click', () => {
            if (window.openOrderHistoryModal) window.openOrderHistoryModal();
          });
        }

        document.addEventListener('click', (e) => {
          if (wrap && !wrap.contains(e.target)) {
            wrap.classList.remove('open');
            if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
          }
        });

      } else {
        const loggedOutHTML = `
          <a href="login.html?tab=login" class="nav-auth-login">Login</a>
          <a href="login.html?tab=signup" class="nav-auth-signup">Sign Up</a>
        `;

        const mobileLoggedOutHTML = `
          <div class="mobile-auth-buttons" style="display: flex; gap: 10px; margin-bottom: 12px;">
            <a href="login.html?tab=login" class="btn btn-outline" style="flex: 1; text-align: center; padding: 8px 12px; font-size: 0.88rem;">Login</a>
            <a href="login.html?tab=signup" class="btn btn-gold" style="flex: 1; text-align: center; padding: 8px 12px; font-size: 0.88rem;">Sign Up</a>
          </div>
        `;

        if (headerAuthControls) headerAuthControls.innerHTML = loggedOutHTML;
        if (mobileAuthControls) mobileAuthControls.innerHTML = mobileLoggedOutHTML;
      }
    }

    escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }
  }

  const authInstance = new AuthSystem();
  window.AuthSystem = authInstance;

  window.updateNavbarAuthState = function () {
    authInstance.updateNavbarUI();
  };

  window.handleLogout = function () {
    authInstance.logout();
  };

  document.addEventListener('DOMContentLoaded', () => {
    authInstance.updateNavbarUI();
  });
})();
