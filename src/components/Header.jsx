import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Header({
  activeView,
  onNavigate,
  onToggleMobileMenu,
  isMobileMenuOpen,
  onOpenOrderHistory
}) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { user, logout } = useAuth();
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleLinkClick = (e, targetHash) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate(targetHash);
    } else {
      window.location.hash = targetHash;
    }
  };

  const getFirstName = () => {
    if (!user) return 'User';
    if (user.email === 'yeshaswinireddy32@gmail.com') return 'Yeshashwini';
    if (user.name) {
      const part = user.name.split(' ')[0];
      return part.charAt(0).toUpperCase() + part.slice(1);
    }
    return 'User';
  };
  const firstName = getFirstName();
  const fullName = (user?.email === 'yeshaswinireddy32@gmail.com')
    ? 'Yeshashwini reddy'
    : (user?.name || firstName);
  const role = user?.role || 'user';

  return (
    <header className={`site-header ${isScrolled ? 'scrolled' : ''}`} id="site-header" role="banner">
      <div className="container header-container">
        <a
          href="#home"
          className="brand-logo"
          aria-label="Madhuri's Choco Heaven Home"
          onClick={(e) => handleLinkClick(e, '#home')}
        >
          <img
            src="assets/images/logo.png"
            alt="Madhuri's Choco Heaven Official Brand Logo"
            className="brand-logo-img"
            width="76"
            height="76"
          />
          <div className="brand-text">
            <span className="brand-title">Madhuri’s</span>
            <span className="brand-highlight">Choco Heaven</span>
          </div>
        </a>

        {/* Desktop Navigation */}
        <nav className="nav-desktop" aria-label="Primary Navigation">
          <a
            href="#home"
            className={`nav-link ${activeView === 'view-home' ? 'active' : ''}`}
            onClick={(e) => handleLinkClick(e, '#home')}
          >
            Home
          </a>
          <a
            href="#about"
            className={`nav-link ${activeView === 'view-about' ? 'active' : ''}`}
            onClick={(e) => handleLinkClick(e, '#about')}
          >
            About
          </a>
          <a
            href="#chocolates"
            className={`nav-link ${activeView === 'view-chocolates' ? 'active' : ''}`}
            onClick={(e) => handleLinkClick(e, '#chocolates')}
          >
            Chocolates
          </a>
          <a
            href="#cakes-bakes"
            className={`nav-link ${activeView === 'view-cakes-bakes' ? 'active' : ''}`}
            onClick={(e) => handleLinkClick(e, '#cakes-bakes')}
          >
            Cakes & Bakes
          </a>
          <a
            href="#contact"
            className={`nav-link ${activeView === 'view-contact' ? 'active' : ''}`}
            onClick={(e) => handleLinkClick(e, '#contact')}
          >
            Contact
          </a>
        </nav>

        {/* Header Action & Mobile Trigger */}
        <div className="header-actions">
          <div className="header-auth-controls" id="header-auth-controls">
            {!user ? (
              <>
                <a
                  href="#login"
                  className="nav-auth-login"
                  onClick={(e) => handleLinkClick(e, '#login')}
                >
                  Login
                </a>
                <a
                  href="#login?tab=signup"
                  className="nav-auth-signup"
                  onClick={(e) => handleLinkClick(e, '#login?tab=signup')}
                >
                  Sign Up
                </a>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }} ref={dropdownRef}>
                {role === 'admin' && (
                  <a
                    href="#admin"
                    className="btn btn-outline btn-sm"
                    style={{ padding: '4px 12px', fontSize: '0.82rem', borderColor: 'var(--gold-400)', color: 'var(--gold-300)' }}
                    onClick={(e) => handleLinkClick(e, '#admin')}
                  >
                    ⚙️ Admin Dashboard
                  </a>
                )}
                {role === 'owner' && (
                  <a
                    href="#owner"
                    className="btn btn-gold btn-sm"
                    style={{ padding: '4px 12px', fontSize: '0.82rem' }}
                    onClick={(e) => handleLinkClick(e, '#owner')}
                  >
                    👑 Owner Dashboard
                  </a>
                )}

                <div className={`profile-dropdown-wrap ${isProfileOpen ? 'open' : ''}`} id="profile-dropdown-wrap">
                  <button
                    type="button"
                    className="nav-profile-btn"
                    id="nav-profile-toggle"
                    aria-expanded={isProfileOpen}
                    aria-label="User Profile Menu"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsProfileOpen(!isProfileOpen);
                    }}
                  >
                    <span className="user-avatar-icon">👤</span>
                    <span className="nav-profile-label">
                      {firstName} ({role.toUpperCase()})
                    </span>
                    <span className="dropdown-arrow">{isProfileOpen ? '▴' : '▾'}</span>
                  </button>

                  {isProfileOpen && (
                    <div
                      className="profile-dropdown-menu"
                      id="profile-dropdown-menu"
                      style={{ display: 'block', opacity: 1, visibility: 'visible', transform: 'translateY(0) scale(1)' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="profile-user-info">
                        <div className="profile-user-name">{fullName}</div>
                        <div className="profile-user-email">{user.email || ''}</div>
                        <span
                          className="badge-tag badge-gold"
                          style={{ fontSize: '0.72rem', marginTop: '4px', display: 'inline-block' }}
                        >
                          ROLE: {role.toUpperCase()}
                        </span>
                      </div>
                      <div className="profile-menu-divider"></div>
                      <button
                        type="button"
                        className="profile-menu-item-btn"
                        id="btn-view-order-history"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsProfileOpen(false);
                          if (onOpenOrderHistory) onOpenOrderHistory();
                        }}
                      >
                        <span>📦 My Order History</span>
                      </button>
                      <div className="profile-menu-divider"></div>
                      <button
                        type="button"
                        className="profile-logout-btn"
                        id="btn-profile-logout"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsProfileOpen(false);
                          logout();
                        }}
                      >
                        <span>🚪 Logout</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <a
            href="#contact"
            className="btn btn-gold btn-sm header-cta"
            onClick={(e) => handleLinkClick(e, '#contact')}
          >
            Order Now
          </a>

          <button
            className={`mobile-toggle ${isMobileMenuOpen ? 'is-active' : ''}`}
            id="mobile-toggle"
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileMenuOpen}
            onClick={onToggleMobileMenu}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>
    </header>
  );
}
