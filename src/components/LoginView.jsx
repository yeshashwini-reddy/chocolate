import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import EmailOtpVerification from './EmailOtpVerification';

export default function LoginView({ onNavigate, initialTab = 'login' }) {
  const { user, login, signup, logout } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showPassword, setShowPassword] = useState(false);
  const [pendingOtpEmail, setPendingOtpEmail] = useState(() => {
    return sessionStorage.getItem('mch_pending_otp_email') || '';
  });

  // Form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');
  const [signupError, setSignupError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleLink = (e, hash) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate(hash);
    } else {
      window.location.hash = hash;
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);

    const res = await login(loginEmail, loginPassword);
    setIsLoading(false);

    if (!res.success) {
      if (res.message && res.message.toLowerCase().includes('email not confirmed')) {
        const clean = loginEmail.trim().toLowerCase();
        setPendingOtpEmail(clean);
        sessionStorage.setItem('mch_pending_otp_email', clean);
        return;
      }
      setLoginError(`⚠️ ${res.message}`);
    } else {
      const role = res.role || 'user';
      if (role === 'admin') {
        if (onNavigate) onNavigate('#admin');
        else window.location.hash = '#admin';
      } else if (role === 'owner') {
        if (onNavigate) onNavigate('#owner');
        else window.location.hash = '#owner';
      } else {
        if (onNavigate) onNavigate('#home');
        else window.location.hash = '#home';
      }
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setSignupError('');
    setIsLoading(true);

    const res = await signup(signupName, signupEmail, signupPassword, signupConfirm);
    setIsLoading(false);

    if (!res.success) {
      setSignupError(`⚠️ ${res.message}`);
    } else {
      // Transition immediately to dedicated Email OTP Verification screen
      const targetEmail = res.email || signupEmail.trim().toLowerCase();
      setPendingOtpEmail(targetEmail);
      sessionStorage.setItem('mch_pending_otp_email', targetEmail);
    }
  };

  const handleOtpSuccess = (role) => {
    sessionStorage.removeItem('mch_pending_otp_email');
    setPendingOtpEmail('');

    if (role === 'admin') {
      if (onNavigate) onNavigate('#admin');
      else window.location.hash = '#admin';
    } else if (role === 'owner') {
      if (onNavigate) onNavigate('#owner');
      else window.location.hash = '#owner';
    } else {
      if (onNavigate) onNavigate('#home');
      else window.location.hash = '#home';
    }
  };

  const handleDemoFill = (email, password) => {
    setLoginEmail(email);
    setLoginPassword(password);
    setActiveTab('login');
    setLoginError('');
  };

  return (
    <main>
      <section className="auth-page-section">
        <div className="auth-split-card">

          {/* ==========================================================================
               LEFT SIDE: BRANDED PANELS & HIGHLIGHTS
               ========================================================================== */}
          <div className="auth-brand-panel">
            <div>
              <a
                href="#home"
                className="auth-brand-logo"
                aria-label="Madhuri's Choco Heaven Home"
                onClick={(e) => handleLink(e, '#home')}
              >
                <img src="assets/images/logo.png" alt="Madhuri's Choco Heaven Logo" />
                <div className="brand-text">
                  <span className="brand-title" style={{ fontSize: '1.3rem' }}>Madhuri’s</span>
                  <span className="brand-highlight" style={{ fontSize: '0.95rem' }}>Choco Heaven</span>
                </div>
              </a>

              <div className="auth-brand-header">
                <h2 className="auth-brand-tagline">Where Every Celebration Becomes a Little Sweeter.</h2>
                <p className="auth-brand-desc">
                  Handcrafted chocolates, freshly baked celebration cakes, and customized gift hampers made with love.
                </p>
              </div>

              <div className="auth-benefits-list">
                <div className="auth-benefit-item">
                  <span className="auth-benefit-icon">✓</span>
                  <div>
                    <div className="auth-benefit-title">Handcrafted with Care</div>
                    <div className="auth-benefit-sub">Artisanal chocolates and bakes prepared fresh by hand.</div>
                  </div>
                </div>

                <div className="auth-benefit-item">
                  <span className="auth-benefit-icon">✓</span>
                  <div>
                    <div className="auth-benefit-title">Premium Quality Ingredients</div>
                    <div className="auth-benefit-sub">Finest cocoa, pure butter, and zero preservatives.</div>
                  </div>
                </div>

                <div className="auth-benefit-item">
                  <span className="auth-benefit-icon">✓</span>
                  <div>
                    <div className="auth-benefit-title">Made for Every Celebration</div>
                    <div className="auth-benefit-sub">Tailored treats for birthdays, weddings & sweet moments.</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="auth-brand-footer-text">
              🍫 Handmade • 🎂 Freshly Baked • ❤️ With Love
            </div>
          </div>

          {/* ==========================================================================
               RIGHT SIDE: AUTHENTICATION FORM (LOGIN & SIGNUP)
               ========================================================================== */}
          <div className="auth-form-panel">
            {user ? (
              /* ALREADY LOGGED IN VIEW */
              <div id="already-logged-in-box" style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '2.8rem', marginBottom: '12px' }}>👤</div>
                <h3 style={{ color: 'var(--gold-300)', marginBottom: '8px' }} id="logged-in-user-name">
                  Hello, {user.name}! ({user.role?.toUpperCase()})
                </h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
                  You are currently logged in.
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <a
                    href="#home"
                    className="btn btn-gold"
                    onClick={(e) => handleLink(e, '#home')}
                  >
                    Return to Homepage
                  </a>
                  {user.role === 'admin' && (
                    <a
                      href="#admin"
                      className="btn btn-outline"
                      onClick={(e) => handleLink(e, '#admin')}
                    >
                      ⚙️ Admin Dashboard
                    </a>
                  )}
                  {user.role === 'owner' && (
                    <a
                      href="#owner"
                      className="btn btn-gold"
                      onClick={(e) => handleLink(e, '#owner')}
                    >
                      👑 Owner Dashboard
                    </a>
                  )}
                  <button
                    type="button"
                    className="btn btn-outline"
                    id="btn-page-logout"
                    onClick={logout}
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : pendingOtpEmail ? (
              <EmailOtpVerification
                email={pendingOtpEmail}
                onVerified={handleOtpSuccess}
                onBackToSignup={() => {
                  sessionStorage.removeItem('mch_pending_otp_email');
                  setPendingOtpEmail('');
                  setActiveTab('signup');
                }}
                onGoToLogin={() => {
                  sessionStorage.removeItem('mch_pending_otp_email');
                  setPendingOtpEmail('');
                  setActiveTab('login');
                }}
              />
            ) : (
              <>
                {/* Auth Tabs (Login / Sign Up) */}
                <div className="auth-tabs">
                  <button
                    type="button"
                    className={`auth-tab-btn ${activeTab === 'login' ? 'active' : ''}`}
                    id="tab-btn-login"
                    onClick={() => {
                      setActiveTab('login');
                      setLoginError('');
                      setSignupError('');
                    }}
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    className={`auth-tab-btn ${activeTab === 'signup' ? 'active' : ''}`}
                    id="tab-btn-signup"
                    onClick={() => {
                      setActiveTab('signup');
                      setLoginError('');
                      setSignupError('');
                    }}
                  >
                    Sign Up
                  </button>
                </div>

                {/* ==========================================================================
                     LOGIN VIEW
                     ========================================================================== */}
                <div className={`auth-form-view ${activeTab === 'login' ? 'active' : ''}`} id="auth-login-view">
                  <div>
                    <h1 className="auth-title-large">Welcome Back</h1>
                    <p className="auth-subtitle-text">Login to continue your sweet experience</p>
                  </div>

                  <div
                    className={`auth-error-msg ${loginError ? 'show' : ''}`}
                    id="login-error-msg"
                  >
                    {loginError}
                  </div>

                  <form id="auth-login-form" onSubmit={handleLoginSubmit} noValidate>
                    <div className="form-group" style={{ marginBottom: '18px' }}>
                      <label htmlFor="login-email" className="form-label">Email Address</label>
                      <input
                        type="email"
                        id="login-email"
                        className="form-control"
                        placeholder="Enter your email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label htmlFor="login-password" className="form-label" style={{ marginBottom: 0 }}>Password</label>
                        <a
                          href="javascript:void(0)"
                          className="auth-link-forgot"
                          id="btn-forgot-pass"
                          onClick={() => alert('To reset your password, please contact Madhuri directly on WhatsApp or email.')}
                        >
                          Forgot Password?
                        </a>
                      </div>
                      <div className="password-field-wrap">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          id="login-password"
                          className="form-control"
                          placeholder="Enter your password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          className="toggle-pass-btn"
                          id="btn-toggle-password"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? '🙈' : '👁️'}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="btn btn-gold btn-lg login-btn-submit"
                      style={{ width: '100%' }}
                      disabled={isLoading}
                    >
                      <span>{isLoading ? 'Logging in...' : 'Login'}</span>
                      <span className="btn-icon-arrow">→</span>
                    </button>
                  </form>

                  {/* Quick Demo Fill Shortcut */}
                  <div
                    style={{
                      marginTop: '18px',
                      padding: '10px 12px',
                      background: 'rgba(212, 163, 115, 0.08)',
                      border: '1px solid var(--border-gold)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8rem',
                      color: 'var(--text-muted)'
                    }}
                  >
                    <div style={{ fontWeight: 600, color: 'var(--gold-300)', marginBottom: '4px' }}>
                      ⚡ Demo Accounts:
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                        onClick={() => handleDemoFill('user@test.com', 'password123')}
                      >
                        Customer Demo
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                        onClick={() => handleDemoFill('admin@test.com', 'password123')}
                      >
                        Admin Demo
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                        onClick={() => handleDemoFill('owner@test.com', 'password123')}
                      >
                        Owner Demo
                      </button>
                    </div>
                  </div>

                  <div className="auth-footer-prompt">
                    Don't have an account?{' '}
                    <span
                      className="auth-switch-link"
                      id="link-to-signup"
                      onClick={() => {
                        setActiveTab('signup');
                        setLoginError('');
                        setSignupError('');
                      }}
                    >
                      Sign Up →
                    </span>
                  </div>

                  <a
                    href="#home"
                    className="auth-guest-link"
                    onClick={(e) => handleLink(e, '#home')}
                  >
                    ← Return to Homepage
                  </a>
                </div>

                {/* ==========================================================================
                     SIGNUP VIEW
                     ========================================================================== */}
                <div className={`auth-form-view ${activeTab === 'signup' ? 'active' : ''}`} id="auth-signup-view">
                  <div>
                    <h1 className="auth-title-large">Create Your Account</h1>
                    <p className="auth-subtitle-text">Join Madhuri's Choco Heaven</p>
                  </div>

                  <div
                    className={`auth-error-msg ${signupError ? 'show' : ''}`}
                    id="signup-error-msg"
                  >
                    {signupError}
                  </div>

                  <form id="auth-signup-form" onSubmit={handleSignupSubmit} noValidate>
                    <div className="form-group" style={{ marginBottom: '14px' }}>
                      <label htmlFor="signup-name" className="form-label">Full Name</label>
                      <input
                        type="text"
                        id="signup-name"
                        className="form-control"
                        placeholder="e.g. Ananya Sharma"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: '14px' }}>
                      <label htmlFor="signup-email" className="form-label">Email Address</label>
                      <input
                        type="email"
                        id="signup-email"
                        className="form-control"
                        placeholder="Enter your email"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: '14px' }}>
                      <label htmlFor="signup-password" className="form-label">Password</label>
                      <input
                        type="password"
                        id="signup-password"
                        className="form-control"
                        placeholder="At least 6 characters"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: '22px' }}>
                      <label htmlFor="signup-confirm-password" className="form-label">Confirm Password</label>
                      <input
                        type="password"
                        id="signup-confirm-password"
                        className="form-control"
                        placeholder="Re-enter password"
                        value={signupConfirm}
                        onChange={(e) => setSignupConfirm(e.target.value)}
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="btn btn-gold btn-lg login-btn-submit"
                      style={{ width: '100%' }}
                      disabled={isLoading}
                    >
                      <span>{isLoading ? 'Creating Account...' : 'Sign Up'}</span>
                      <span className="btn-icon-arrow">→</span>
                    </button>
                  </form>

                  <div className="auth-footer-prompt">
                    Already have an account?{' '}
                    <span
                      className="auth-switch-link"
                      id="link-to-login"
                      onClick={() => {
                        setActiveTab('login');
                        setLoginError('');
                        setSignupError('');
                      }}
                    >
                      Login →
                    </span>
                  </div>

                  <a
                    href="#home"
                    className="auth-guest-link"
                    onClick={(e) => handleLink(e, '#home')}
                  >
                    ← Return to Homepage
                  </a>
                </div>
              </>
            )}
          </div>

        </div>
      </section>
    </main>
  );
}
