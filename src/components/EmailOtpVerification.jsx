import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

export default function EmailOtpVerification({ email, onVerified, onBackToSignup, onGoToLogin }) {
  const { verifyOtp, resendOtp } = useAuth();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [cooldown, setCooldown] = useState(60);
  const inputsRef = useRef([]);

  // Auto-focus first input box on mount
  useEffect(() => {
    if (inputsRef.current[0]) {
      inputsRef.current[0].focus();
    }
  }, []);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const otpCode = otp.join('');
  const isComplete = otpCode.length === 6;

  const handleChange = (index, value) => {
    setErrorMsg('');
    setSuccessMsg('');

    const clean = value.replace(/\D/g, '');
    if (!clean) {
      const nextOtp = [...otp];
      nextOtp[index] = '';
      setOtp(nextOtp);
      return;
    }

    const nextOtp = [...otp];
    nextOtp[index] = clean.slice(-1);
    setOtp(nextOtp);

    // Auto-advance to next input
    if (index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        inputsRef.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const nextOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      nextOtp[i] = pastedData[i] || '';
    }
    setOtp(nextOtp);

    const focusIndex = Math.min(pastedData.length, 5);
    inputsRef.current[focusIndex]?.focus();
  };

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    if (!isComplete || isLoading) return;

    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    const res = await verifyOtp(email, otpCode);
    setIsLoading(false);

    if (!res.success) {
      setErrorMsg(res.message || 'Invalid or expired verification code.');
    } else {
      if (onVerified) {
        onVerified(res.role || 'user');
      }
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;

    setErrorMsg('');
    setSuccessMsg('');
    setIsResending(true);

    const res = await resendOtp(email);
    setIsResending(false);

    if (!res.success) {
      setErrorMsg(res.message || 'Failed to resend verification code. Please try again.');
    } else {
      setSuccessMsg('✓ A new 6-digit verification code has been sent to your email.');
      setCooldown(60);
    }
  };

  return (
    <div className="auth-form-view active" id="auth-otp-view">
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <div style={{ fontSize: '2.4rem', marginBottom: '8px' }}>✉️</div>
        <h1 className="auth-title-large" style={{ fontSize: '1.75rem' }}>
          Verify Your Email
        </h1>
        <p className="auth-subtitle-text" style={{ marginBottom: '10px' }}>
          We’ve sent a 6-digit verification code to:
        </p>
        <div className="otp-email-highlight">
          {email}
        </div>
      </div>

      {errorMsg && (
        <div className="auth-error-msg show" id="otp-error-msg" style={{ marginBottom: '18px' }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="otp-success-msg" style={{ marginBottom: '16px' }}>
          {successMsg}
        </div>
      )}

      <form onSubmit={handleVerify} noValidate>
        <label
          htmlFor="otp-input-0"
          className="form-label"
          style={{ textAlign: 'center', display: 'block', marginBottom: '10px', fontSize: '0.88rem' }}
        >
          Enter 6-Digit Code
        </label>

        {/* 6-box OTP digits */}
        <div className="otp-boxes-container" onPaste={handlePaste}>
          {otp.map((digit, index) => (
            <input
              key={index}
              id={`otp-input-${index}`}
              ref={(el) => (inputsRef.current[index] = el)}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className={`otp-digit-input ${digit ? 'filled' : ''}`}
              disabled={isLoading}
              aria-label={`Digit ${index + 1} of verification code`}
            />
          ))}
        </div>

        <button
          type="submit"
          className="btn btn-gold btn-lg login-btn-submit"
          style={{ width: '100%', marginTop: '12px' }}
          disabled={!isComplete || isLoading}
        >
          <span>{isLoading ? 'Verifying Code...' : 'Verify & Continue'}</span>
          <span className="btn-icon-arrow">→</span>
        </button>
      </form>

      {/* Resend OTP Section */}
      <div className="otp-resend-row">
        <span style={{ color: 'var(--text-muted)' }}>Didn't receive the code?</span>
        {cooldown > 0 ? (
          <span style={{ color: 'var(--gold-400)', fontWeight: 600 }}>
            Resend in {cooldown}s
          </span>
        ) : (
          <button
            type="button"
            className="otp-resend-btn"
            onClick={handleResend}
            disabled={isResending}
          >
            {isResending ? 'Sending...' : 'Resend Code'}
          </button>
        )}
      </div>

      {/* Navigation options */}
      <div className="auth-footer-prompt" style={{ marginTop: '16px', paddingTop: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {onBackToSignup && (
            <button
              type="button"
              className="auth-switch-link"
              onClick={onBackToSignup}
              style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              ← Back to Sign Up
            </button>
          )}
          {onGoToLogin && (
            <button
              type="button"
              className="auth-switch-link"
              onClick={onGoToLogin}
              style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              Go to Login →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
