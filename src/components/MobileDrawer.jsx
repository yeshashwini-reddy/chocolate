import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function MobileDrawer({
  isOpen,
  onClose,
  onNavigate,
  onFilterNavigate,
  onOpenOrderHistory
}) {
  const { user, logout } = useAuth();

  const handleLink = (e, hash) => {
    e.preventDefault();
    onClose();
    if (onNavigate) {
      onNavigate(hash);
    } else {
      window.location.hash = hash;
    }
  };

  const handleSublink = (e, hash, filter) => {
    e.preventDefault();
    onClose();
    if (onFilterNavigate) {
      onFilterNavigate(hash, filter);
    } else {
      window.location.hash = hash;
    }
  };

  const role = user?.role || 'user';

  return (
    <>
      <div
        className={`drawer-backdrop ${isOpen ? 'open' : ''}`}
        id="drawer-backdrop"
        onClick={onClose}
      ></div>

      <aside
        className={`mobile-drawer ${isOpen ? 'open' : ''}`}
        id="mobile-drawer"
        aria-label="Mobile Navigation Drawer"
      >
        <div className="mobile-drawer-header">
          <a
            href="#home"
            className="brand-logo"
            aria-label="Madhuri's Choco Heaven Home"
            onClick={(e) => handleLink(e, '#home')}
          >
            <img
              src="assets/images/logo.png"
              alt="Madhuri's Choco Heaven Official Brand Logo"
              className="drawer-logo-img"
              width="56"
              height="56"
            />
            <div className="brand-text">
              <span className="brand-title">Madhuri’s</span>
              <span className="brand-highlight">Choco Heaven</span>
            </div>
          </a>
        </div>

        <nav className="mobile-nav-links">
          <a href="#home" className="nav-link" onClick={(e) => handleLink(e, '#home')}>
            Home
          </a>
          <a href="#about" className="nav-link" onClick={(e) => handleLink(e, '#about')}>
            About Us
          </a>
          <a href="#categories" className="nav-link" onClick={(e) => handleLink(e, '#categories')}>
            Creations
          </a>

          <div className="mobile-nav-group">
            <a href="#chocolates" className="nav-link" onClick={(e) => handleLink(e, '#chocolates')}>
              Chocolates ▾
            </a>
            <div className="mobile-submenu">
              <a href="#chocolates" className="mobile-sublink" onClick={(e) => handleSublink(e, '#chocolates', 'all')}>
                All Chocolates
              </a>
              <a href="#chocolates" className="mobile-sublink" onClick={(e) => handleSublink(e, '#chocolates', 'classic')}>
                Classic Chocolates
              </a>
              <a href="#chocolates" className="mobile-sublink" onClick={(e) => handleSublink(e, '#chocolates', 'customised')}>
                Customised
              </a>
              <a href="#chocolates" className="mobile-sublink" onClick={(e) => handleSublink(e, '#chocolates', 'gifting')}>
                Gifting
              </a>
              <a href="#chocolates" className="mobile-sublink" onClick={(e) => handleSublink(e, '#chocolates', 'specialty')}>
                Specialty
              </a>
              <a href="#chocolates" className="mobile-sublink" onClick={(e) => handleSublink(e, '#chocolates', 'flavoured')}>
                Flavoured
              </a>
            </div>
          </div>

          <div className="mobile-nav-group">
            <a href="#cakes-bakes" className="nav-link" onClick={(e) => handleLink(e, '#cakes-bakes')}>
              Cakes & Bakes ▾
            </a>
            <div className="mobile-submenu">
              <a href="#cakes-bakes" className="mobile-sublink" onClick={(e) => handleSublink(e, '#cakes-bakes', 'all')}>
                All Cakes & Bakes
              </a>
              <a href="#cakes-bakes" className="mobile-sublink" onClick={(e) => handleSublink(e, '#cakes-bakes', 'cakes')}>
                Celebration Cakes
              </a>
              <a href="#cakes-bakes" className="mobile-sublink" onClick={(e) => handleSublink(e, '#cakes-bakes', 'cupcakes')}>
                Cupcakes & Muffins
              </a>
              <a href="#cakes-bakes" className="mobile-sublink" onClick={(e) => handleSublink(e, '#cakes-bakes', 'brownies')}>
                Fudgy Brownies
              </a>
              <a href="#cakes-bakes" className="mobile-sublink" onClick={(e) => handleSublink(e, '#cakes-bakes', 'cookies')}>
                Artisan Cookies
              </a>
              <a href="#cakes-bakes" className="mobile-sublink" onClick={(e) => handleSublink(e, '#cakes-bakes', 'plum-cake')}>
                Spiced Plum Cake
              </a>
            </div>
          </div>

          <a href="#contact" className="nav-link" onClick={(e) => handleLink(e, '#contact')}>
            Contact & Order
          </a>
        </nav>

        <div className="mobile-drawer-footer">
          <div className="mobile-auth-controls" id="mobile-auth-controls">
            {!user ? (
              <div className="mobile-auth-buttons" style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                <a
                  href="#login"
                  className="btn btn-outline"
                  style={{ flex: 1, textAlign: 'center', padding: '8px 12px', fontSize: '0.88rem' }}
                  onClick={(e) => handleLink(e, '#login')}
                >
                  Login
                </a>
                <a
                  href="#login?tab=signup"
                  className="btn btn-gold"
                  style={{ flex: 1, textAlign: 'center', padding: '8px 12px', fontSize: '0.88rem' }}
                  onClick={(e) => handleLink(e, '#login?tab=signup')}
                >
                  Sign Up
                </a>
              </div>
            ) : (
              <div className="mobile-user-box" style={{ marginBottom: '12px' }}>
                <div className="mobile-profile-info">
                  <span className="user-avatar-icon" style={{ fontSize: '1.3rem' }}>👤</span>
                  <div>
                    <div className="mobile-profile-name">{user.name}</div>
                    <div className="mobile-profile-email">{user.email}</div>
                    <span className="badge-tag badge-gold" style={{ fontSize: '0.7rem', marginTop: '2px', display: 'inline-block' }}>
                      ROLE: {role.toUpperCase()}
                    </span>
                  </div>
                </div>

                {role === 'admin' && (
                  <a
                    href="#admin"
                    className="btn btn-outline"
                    style={{ width: '100%', marginBottom: '8px', marginTop: '10px' }}
                    onClick={(e) => handleLink(e, '#admin')}
                  >
                    ⚙️ Admin Dashboard
                  </a>
                )}
                {role === 'owner' && (
                  <a
                    href="#owner"
                    className="btn btn-gold"
                    style={{ width: '100%', marginBottom: '8px', marginTop: '10px' }}
                    onClick={(e) => handleLink(e, '#owner')}
                  >
                    👑 Owner Dashboard
                  </a>
                )}

                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ width: '100%', marginTop: '8px', marginBottom: '8px' }}
                  onClick={() => {
                    onClose();
                    if (onOpenOrderHistory) onOpenOrderHistory();
                  }}
                >
                  📦 My Order History
                </button>

                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ width: '100%', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#f87171' }}
                  onClick={() => {
                    onClose();
                    logout();
                  }}
                >
                  🚪 Logout
                </button>
              </div>
            )}
          </div>

          <div className="mobile-drawer-brand">🍫 Handmade • 🎂 Freshly Baked • ❤️ With Love</div>
          <a
            href="#contact"
            className="btn btn-gold"
            style={{ width: '100%' }}
            onClick={(e) => handleLink(e, '#contact')}
          >
            Order Now
          </a>
        </div>
      </aside>
    </>
  );
}
