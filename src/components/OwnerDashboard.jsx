import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BRAND_CONFIG } from '../config/brandConfig';

export default function OwnerDashboard({ onNavigate }) {
  const { user, orders, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  const pendingOrders = orders.filter((o) => o.status === 'pending');
  const completedOrders = orders.filter((o) => o.status === 'completed');

  return (
    <div style={{ background: '#150b08', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="owner-header">
        <a
          href="#home"
          className="owner-brand-wrap"
          onClick={(e) => {
            e.preventDefault();
            if (onNavigate) onNavigate('#home');
          }}
        >
          <img src="assets/images/logo.png" alt="Madhuri's Choco Heaven" />
          <div>
            <div className="owner-brand-title">Madhuri’s Choco Heaven</div>
            <div className="owner-brand-badge">Owner & Executive Suite</div>
          </div>
        </a>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Welcome, <strong style={{ color: 'var(--gold-300)' }}>{user?.name || 'Madhuri'}</strong> 👑
          </span>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => {
              if (onNavigate) onNavigate('#home');
            }}
          >
            Visit Website
          </button>
          <button type="button" className="btn btn-gold btn-sm" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <main className="admin-container">
        {/* KPI CARDS */}
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-icon">👑</div>
            <div>
              <div className="metric-val">{orders.length}</div>
              <div className="metric-lbl">Total Business Enquiries</div>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">💬</div>
            <div>
              <div className="metric-val">{pendingOrders.length}</div>
              <div className="metric-lbl">Awaiting Consultation</div>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">✨</div>
            <div>
              <div className="metric-val">{completedOrders.length}</div>
              <div className="metric-lbl">Fulfilled Orders</div>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">🍫</div>
            <div>
              <div className="metric-val">{BRAND_CONFIG.chocolates.length + BRAND_CONFIG.cakesAndBakes.length}</div>
              <div className="metric-lbl">Total Handcrafted Items</div>
            </div>
          </div>
        </div>

        {/* OWNER TABS */}
        <div className="admin-tabs">
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📊 Business Overview
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            📦 All Orders ({orders.length})
          </button>
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            <div className="admin-card-box">
              <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--gold-300)', marginBottom: '14px' }}>
                Store Performance Summary
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginBottom: '18px' }}>
                Madhuri's Choco Heaven handcrafted confectionery boutique continues to delight customers with custom
                celebration cakes, artisanal chocolates, and luxury return gift hampers.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-gold)' }}>
                  <span>WhatsApp Business:</span>
                  <strong style={{ color: 'var(--gold-300)' }}>Connected</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-gold)' }}>
                  <span>Pre-order Window:</span>
                  <strong style={{ color: 'var(--gold-300)' }}>2 to 4 Days</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-gold)' }}>
                  <span>Store Status:</span>
                  <strong style={{ color: '#34d399' }}>Accepting Orders</strong>
                </div>
              </div>
            </div>

            <div className="admin-card-box">
              <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--gold-300)', marginBottom: '14px' }}>
                Recent High-Priority Enquiries
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {orders.slice(0, 3).map((ord) => (
                  <div
                    key={ord.id || ord.order_number}
                    style={{
                      background: 'rgba(21, 11, 8, 0.6)',
                      padding: '12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-gold)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <strong style={{ color: 'var(--gold-300)' }}>{ord.order_number}</strong>
                      <span style={{ fontSize: '0.8rem', color: '#f59e0b', textTransform: 'uppercase' }}>
                        {ord.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.88rem', color: 'var(--text-cream)' }}>
                      {ord.customer_name} — {ord.category}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ORDERS TAB */}
        {activeTab === 'orders' && (
          <div className="admin-card-box">
            <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--gold-300)', marginBottom: '16px' }}>
              Full Store Order Roster
            </h3>
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Ref ID</th>
                    <th>Client Name</th>
                    <th>Contact</th>
                    <th>Product / Category</th>
                    <th>Quantity</th>
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
                      <td>{ord.quantity}</td>
                      <td>
                        <span className="badge-tag badge-gold" style={{ textTransform: 'uppercase' }}>
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
      </main>
    </div>
  );
}
