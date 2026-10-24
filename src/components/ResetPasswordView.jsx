import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

export default function ResetPasswordView({ onNavigate }) {
  const { updatePassword, isPasswordRecovery, clearPasswordRecovery, logout } = useAuth();

  // Stages: 'checking' | 'authorized' | 'unauthorized' | 'success'
  const [stage, setStage] = useState('checking');
  const [authError, setAuthError] = useState('');

  // Form states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper to extract authentication parameters from URL search or hash
  const parseUrlParams = () => {
    if (typeof window === 'undefined') return {};

    const searchParams = new URLSearchParams(window.location.search);
    const rawHash = window.location.hash || '';
    let hashQuery = '';

    if (rawHash.includes('?')) {
      hashQuery = rawHash.split('?')[1];
    } else if (rawHash.includes('&') || rawHash.includes('=')) {
      hashQuery = rawHash.replace(/^#+/, '').replace(/^reset-password[#&?]*/, '');
    }
    const hashParams = new URLSearchParams(hashQuery);

    return {
      code: searchParams.get('code') || hashParams.get('code'),
      token_hash: searchParams.get('token_hash') || hashParams.get('token_hash'),
      type: searchParams.get('type') || hashParams.get('type'),
      error: searchParams.get('error') || hashParams.get('error'),
      errorCode: searchParams.get('error_code') || hashParams.get('error_code'),
      errorDescription: searchParams.get('error_description') || hashParams.get('error_description')
    };
  };

  useEffect(() => {
    let isMounted = true;

    const verifyRecoveryAuth = async () => {
      setStage('checking');
      setAuthError('');

      const { code, token_hash, type, error, errorCode, errorDescription } = parseUrlParams();

      // 1. Check for explicit error in URL callback (e.g., otp_expired or access_denied)
      if (error || errorCode) {
        if (!isMounted) return;
        const msg = errorDescription
          ? decodeURIComponent(errorDescription.replace(/\+/g, ' '))
          : 'Your password reset link is invalid or has expired. Please request a new link.';
        setAuthError(msg);
        setStage('unauthorized');
        return;
      }

      // 2. If a PKCE auth code is in the URL, exchange it for a session
      if (code) {
        try {
          const { data, error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
          if (!isMounted) return;

          if (exchangeErr) {
            console.warn('[ResetPasswordView] Code exchange note:', exchangeErr.message);
            setAuthError('Your password reset link has expired or has already been used. Please request a new link.');
            setStage('unauthorized');
            return;
          }

          if (data?.session) {
            sessionStorage.setItem('mch_in_password_recovery', 'true');
            try {
              window.history.replaceState(null, '', window.location.pathname + '#reset-password');
            } catch (_) {}
            setStage('authorized');
            return;
          }
        } catch (err) {
          if (!isMounted) return;
          setAuthError(err.message || 'Failed to exchange recovery code.');
          setStage('unauthorized');
          return;
        }
      }

      // 3. If token_hash and type=recovery are present, verify OTP
      if (token_hash && type === 'recovery') {
        try {
          const { data, error: otpErr } = await supabase.auth.verifyOtp({
            token_hash,
            type: 'recovery'
          });
          if (!isMounted) return;

          if (otpErr) {
            setAuthError(otpErr.message || 'Invalid or expired recovery token.');
            setStage('unauthorized');
            return;
          }

          if (data?.session) {
            sessionStorage.setItem('mch_in_password_recovery', 'true');
            setStage('authorized');
            return;
          }
        } catch (err) {
          if (!isMounted) return;
          setAuthError(err.message || 'Failed to verify recovery token.');
          setStage('unauthorized');
          return;
        }
      }

      // 4. Check if session was already authenticated via recovery flow
      const hasRecoveryFlag = sessionStorage.getItem('mch_in_password_recovery') === 'true';
      if (isPasswordRecovery || hasRecoveryFlag) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;
        if (session) {
          setStage('authorized');
          return;
        }
      }

      // 5. Allow brief interval for Supabase detectSessionInUrl to finish parsing hash tokens
      const timeoutId = setTimeout(async () => {
        if (!isMounted) return;
        const { data: { session } } = await supabase.auth.getSession();
        const flagged = sessionStorage.getItem('mch_in_password_recovery') === 'true';

        if (session && (isPasswordRecovery || flagged)) {
          setStage('authorized');
        } else {
          setAuthError('No active recovery session found. You cannot reset your password without an authorized recovery link.');
          setStage('unauthorized');
        }
      }, 750);

      return () => clearTimeout(timeoutId);
    };

    verifyRecoveryAuth();

    // Listen to Supabase PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (event === 'PASSWORD_RECOVERY') {
        sessionStorage.setItem('mch_in_password_recovery', 'true');
        setStage('authorized');
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [isPasswordRecovery]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const cleanPass = newPassword.trim();
    const cleanConfirm = confirmPassword.trim();

    if (!cleanPass) {
      setFormError('Please enter a new password.');
      return;
    }
    if (cleanPass.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }
    if (cleanPass !== cleanConfirm) {
      setFormError('Passwords do not match. Please verify both fields.');
      return;
    }

    setIsSubmitting(true);
    const res = await updatePassword(cleanPass);
    setIsSubmitting(false);

    if (!res.success) {
      setFormError(`⚠️ ${res.message}`);
    } else {
      clearPasswordRecovery();
      setStage('success');
    }
  };

  const handleReturnToLogin = async () => {
    clearPasswordRecovery();
    try {
      await logout();
    } catch (_) {}
    if (onNavigate) {
      onNavigate('#login');
    } else {
      window.location.hash = '#login';
    }
  };

  const handleRequestNewLink = () => {
    clearPasswordRecovery();
    if (onNavigate) {
      onNavigate('#login?tab=forgot');
    } else {
      window.location.hash = '#login?tab=forgot';
    }
  };

  return (
    <main>
      <section className="auth-page-section">
        <div className="auth-split-card">

          {/* ==========================================================================
               LEFT SIDE: BRANDED HIGHLIGHTS
               ========================================================================== */}
          <div className="auth-brand-panel">
            <div>
              <a
                href="#home"
                className="auth-brand-logo"
                aria-label="Madhuri's Choco Heaven Home"
                onClick={(e) => {
                  e.preventDefault();
                  if (onNavigate) onNavigate('#home');
                  else window.location.hash = '#home';
                }}
              >
                <img src="assets/images/logo.png" alt="Madhuri's Choco Heaven Logo" />
                <div className="brand-text">
                  <span className="brand-title" style={{ fontSize: '1.3rem' }}>Madhuri’s</span>
                  <span className="brand-highlight" style={{ fontSize: '0.95rem' }}>Choco Heaven</span>
                </div>
              </a>

              <div className="auth-brand-header">
                <h2 className="auth-brand-tagline">Secure Account Recovery.</h2>
                <p className="auth-brand-desc">
                  Set a new password to keep your handcrafted confectionery orders and account safe.
                </p>
              </div>

              <div className="auth-benefits-list">
                <div className="auth-benefit-item">
                  <span className="auth-benefit-icon">🔒</span>
                  <div>
                    <div className="auth-benefit-title">Encrypted & Secure</div>
                    <div className="auth-benefit-sub">Your credentials are encrypted end-to-end via Supabase.</div>
                  </div>
                </div>

                <div className="auth-benefit-item">
                  <span className="auth-benefit-icon">⚡</span>
                  <div>
                    <div className="auth-benefit-title">Instant Account Access</div>
                    <div className="auth-benefit-sub">Update your password and resume your chocolate orders.</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="auth-brand-footer-text">
              🍫 Handmade • 🎂 Freshly Baked • ❤️ With Love
            </div>
          </div>

          {/* ==========================================================================
               RIGHT SIDE: FORM / ERROR / SUCCESS PANEL
               ========================================================================== */}
          <div className="auth-form-panel">
            {stage === 'checking' && (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>⏳</div>
                <h3 style={{ color: 'var(--gold-300)', fontFamily: 'var(--font-serif)', marginBottom: '8px' }}>
                  Verifying Recovery Link...
                </h3>
                <p style={{ fontSize: '0.92rem' }}>Please wait while we validate your security authorization.</p>
              </div>
            )}

            {stage === 'unauthorized' && (
              <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                <div style={{ fontSize: '3rem', marginBottom: '12px' }}>⚠️</div>
                <h2 style={{ color: '#f87171', fontFamily: 'var(--font-serif)', marginBottom: '12px', fontSize: '1.6rem' }}>
                  Recovery Link Expired or Invalid
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.94rem', lineHeight: '1.6', marginBottom: '24px' }}>
                  {authError || 'The password reset link has expired, was already used, or is missing valid recovery authorization.'}
                </p>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-gold"
                    onClick={handleRequestNewLink}
                  >
                    🔑 Request New Reset Link
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleReturnToLogin}
                  >
                    Return to Login
                  </button>
                </div>
              </div>
            )}

            {stage === 'authorized' && (
              <div className="auth-form-view active">
                <div>
                  <h1 className="auth-title-large">Set New Password</h1>
                  <p className="auth-subtitle-text">
                    Enter your new password below to secure your account.
                  </p>
                </div>

                {formError && (
                  <div className="auth-error-msg show" style={{ marginBottom: '18px' }}>
                    {formError}
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                  {/* New Password Field */}
                  <div className="form-group" style={{ marginBottom: '18px' }}>
                    <label htmlFor="reset-new-password" className="form-label">New Password</label>
                    <div className="password-field-wrap">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        id="reset-new-password"
                        className="form-control"
                        placeholder="At least 6 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        className="toggle-pass-btn"
                        aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password Field */}
                  <div className="form-group" style={{ marginBottom: '24px' }}>
                    <label htmlFor="reset-confirm-password" className="form-label">Confirm New Password</label>
                    <div className="password-field-wrap">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        id="reset-confirm-password"
                        className="form-control"
                        placeholder="Re-enter your new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        className="toggle-pass-btn"
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-gold btn-lg login-btn-submit"
                    style={{ width: '100%', marginBottom: '16px' }}
                    disabled={isSubmitting}
                  >
                    <span>{isSubmitting ? 'Updating Password...' : 'Save New Password'}</span>
                    <span className="btn-icon-arrow">→</span>
                  </button>

                  <div className="auth-footer-prompt">
                    Need to start over?{' '}
                    <span
                      className="auth-switch-link"
                      onClick={handleReturnToLogin}
                    >
                      Back to Login →
                    </span>
                  </div>
                </form>
              </div>
            )}

            {stage === 'success' && (
              <div style={{ textAlign: 'center', padding: '36px 16px' }}>
                <div style={{ fontSize: '3.2rem', marginBottom: '12px' }}>✅</div>
                <h2 style={{ color: '#34d399', fontFamily: 'var(--font-serif)', marginBottom: '12px', fontSize: '1.6rem' }}>
                  Password Reset Complete!
                </h2>
                <p style={{ color: 'var(--text-cream)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '26px' }}>
                  Your password has been securely updated. You can now log in using your new credentials.
                </p>

                <button
                  type="button"
                  className="btn btn-gold btn-lg"
                  style={{ minWidth: '220px' }}
                  onClick={handleReturnToLogin}
                >
                  Proceed to Login →
                </button>
              </div>
            )}
          </div>

        </div>
      </section>
    </main>
  );
}
