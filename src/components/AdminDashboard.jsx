import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BRAND_CONFIG } from '../config/brandConfig';

export default function AdminDashboard({ onNavigate }) {
  const { user, orders, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('orders');
  const [productsStock, setProductsStock] = useState(() => {
    return BRAND_CONFIG.chocolates.map((c) => ({
      id: c.id,
      name: c.name,
      category: c.categoryLabel,
      price: c.priceTag,
      inStock: true
    }));
  });

  const handleToggleStock = (prodId) => {
    setProductsStock((prev) =>
      prev.map((p) => (p.id === prodId ? { ...p, inStock: !p.inStock } : p))
    );
  };

  const localUsers = JSON.parse(localStorage.getItem('mch_users') || '[]');

  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const completedCount = orders.filter((o) => o.status === 'completed').length;

  return (
    <div style={{ background: '#150b08', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="admin-header">
        <a
          href="#home"
          className="admin-logo-brand"
          onClick={(e) => {
            e.preventDefault();
            if (onNavigate) onNavigate('#home');
          }}
        >
          <img src="assets/images/logo.png" alt="Madhuri's Choco Heaven" />
          <div>
            <div className="admin-brand-title">Madhuri’s Choco Heaven</div>
            <div className="admin-brand-sub">Admin Operations Control</div>
          </div>
        </a>

        <div className="admin-user-controls">
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Admin: <strong style={{ color: 'var(--gold-300)' }}>{user?.name || 'Administrator'}</strong>
          </span>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => {
              if (onNavigate) onNavigate('#home');
            }}
          >
            Back to Website
          </button>
          <button type="button" className="btn btn-gold btn-sm" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <main className="admin-container">
        {/* METRICS CARDS */}
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-icon">📦</div>
            <div>
              <div className="metric-val">{orders.length}</div>
              <div className="metric-lbl">Total Orders</div>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">⏳</div>
            <div>
              <div className="metric-val">{pendingCount}</div>
              <div className="metric-lbl">Pending Enquiries</div>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">✅</div>
            <div>
              <div className="metric-val">{completedCount}</div>
              <div className="metric-lbl">Completed</div>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">👥</div>
            <div>
              <div className="metric-val">{localUsers.length}</div>
              <div className="metric-lbl">Registered Customers</div>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="admin-tabs">
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            📋 Orders & Enquiries ({orders.length})
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            🍫 Product Stock & Availability ({productsStock.length})
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'customers' ? 'active' : ''}`}
            onClick={() => setActiveTab('customers')}
          >
            👥 Registered Customers ({localUsers.length})
          </button>
        </div>

        {/* ORDERS TAB */}
        {activeTab === 'orders' && (
          <div className="admin-card-box">
            <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--gold-300)', marginBottom: '16px' }}>
              Customer Orders & Enquiries
            </h3>
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Ref ID</th>
                    <th>Customer</th>
                    <th>Contact</th>
                    <th>Category / Item</th>
                    <th>Qty / Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((ord) => (
                    <tr key={ord.id || ord.order_number}>
                      <td>
                        <strong style={{ color: 'var(--gold-300)' }}>{ord.order_number}</strong>
                      </td>
                      <td>
                        <div>{ord.customer_name}</div>
                        <small style={{ color: 'var(--text-dim)' }}>{ord.customer_email}</small>
                      </td>
                      <td>{ord.customer_phone}</td>
                      <td>{ord.category}</td>
                      <td>
                        <div>{ord.quantity}</div>
                        <small style={{ color: 'var(--text-dim)' }}>{ord.preferred_date || 'Flexible'}</small>
                      </td>
                      <td>
                        <span
                          className="badge-tag badge-gold"
                          style={{ textTransform: 'uppercase', fontSize: '0.74rem' }}
                        >
                          {ord.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PRODUCTS TAB */}
        {activeTab === 'products' && (
          <div className="admin-card-box">
            <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--gold-300)', marginBottom: '16px' }}>
              Catalogue Inventory Management
            </h3>
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Pricing</th>
                    <th>Stock Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {productsStock.map((prod) => (
                    <tr key={prod.id}>
                      <td>
                        <strong style={{ color: 'var(--gold-300)' }}>{prod.name}</strong>
                      </td>
                      <td>{prod.category}</td>
                      <td>{prod.price}</td>
                      <td>
                        <span style={{ color: prod.inStock ? '#34d399' : '#f87171', fontWeight: 700 }}>
                          {prod.inStock ? '● In Stock' : '○ Out of Stock'}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: '0.76rem', padding: '4px 8px' }}
                          onClick={() => handleToggleStock(prod.id)}
                        >
                          Toggle Stock
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CUSTOMERS TAB */}
        {activeTab === 'customers' && (
          <div className="admin-card-box">
            <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--gold-300)', marginBottom: '16px' }}>
              Customer Directory
            </h3>
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                  </tr>
                </thead>
                <tbody>
                  {localUsers.map((u, i) => (
                    <tr key={i}>
                      <td>
                        <strong style={{ color: 'var(--gold-300)' }}>{u.name}</strong>
                      </td>
                      <td>{u.email}</td>
                      <td>
                        <span className="badge-tag badge-gold">{(u.role || 'user').toUpperCase()}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
