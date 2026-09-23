import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BRAND_CONFIG } from '../config/brandConfig';
import { supabase } from '../supabaseClient';

export default function OwnerDashboard({ onNavigate }) {
  const { user, orders: fallbackOrders, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [ordersList, setOrdersList] = useState([]);
  const [customersList, setCustomersList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchNotice, setFetchNotice] = useState(null);

  const loadOwnerData = async () => {
    setIsLoading(true);
    let errorMessages = [];

    try {
      // 1. Real Supabase Orders
      const { data: dbOrders, error: ordErr } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordErr) {
        console.warn('[OwnerDashboard] Orders fetch note:', ordErr.message);
        errorMessages.push(`Orders: ${ordErr.message}`);
        setOrdersList([]);
      } else {
        setOrdersList(dbOrders || []);
      }

      // 2. Real Supabase Registered Customers (Profiles)
      const { data: dbProfiles, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profErr) {
        console.warn('[OwnerDashboard] Profiles fetch note:', profErr.message);
        errorMessages.push(`Profiles: ${profErr.message}`);
        setCustomersList([]);
      } else {
        setCustomersList(dbProfiles || []);
      }

      if (errorMessages.length > 0) {
        setFetchNotice(errorMessages.join(' | '));
      } else {
        setFetchNotice(null);
      }
    } catch (err) {
      console.warn('[OwnerDashboard] Query error:', err);
      setFetchNotice(err.message);
      setOrdersList([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOwnerData();

    // Subscribe to Supabase Realtime changes for orders
    let channel;
    try {
      channel = supabase
        .channel('owner_realtime_orders')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          () => {
            loadOwnerData();
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('[OwnerDashboard] Realtime subscription skipped:', e);
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // Real Supabase Business Calculations
  const totalOrders = ordersList.length;
  const pendingOrders = ordersList.filter((o) => o.status === 'pending');
  const processingOrders = ordersList.filter((o) => o.status === 'processing');
  const completedOrders = ordersList.filter((o) => o.status === 'completed');
  const cancelledOrders = ordersList.filter((o) => o.status === 'cancelled');
  const totalCustomers = customersList.length;
  const totalRevenue = ordersList.reduce(
    (sum, o) => sum + (Number(o.total_amount) || 0),
    0
  );

  return (
    <div style={{ background: '#150b08', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="owner-header">
        <a
          href="#owner"
          className="owner-brand-wrap"
          onClick={(e) => {
            e.preventDefault();
            if (onNavigate) onNavigate('#owner');
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
            title="Preview customer storefront in a new tab"
            onClick={() => {
              window.open(window.location.origin + window.location.pathname + '#home', '_blank');
            }}
          >
            Preview Store ↗
          </button>
          <button type="button" className="btn btn-gold btn-sm" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <main className="admin-container">
        {fetchNotice && (
          <div
            style={{
              background: 'rgba(212, 163, 115, 0.1)',
              border: '1px solid var(--gold-400)',
              color: 'var(--gold-300)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '20px',
              fontSize: '0.85rem'
            }}
          >
            ℹ️ <strong>Supabase Connection:</strong> {fetchNotice}. Run the GRANT script in the Supabase SQL editor to ensure full table access.
          </div>
        )}

        {/* KPI CARDS */}
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-icon">👑</div>
            <div>
              <div className="metric-val">{totalOrders}</div>
              <div className="metric-lbl">Total Business Orders</div>
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
            <div className="metric-icon">⚙️</div>
            <div>
              <div className="metric-val">{processingOrders.length}</div>
              <div className="metric-lbl">In Production</div>
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
            <div className="metric-icon">❌</div>
            <div>
              <div className="metric-val">{cancelledOrders.length}</div>
              <div className="metric-lbl">Cancelled Orders</div>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">👥</div>
            <div>
              <div className="metric-val">{totalCustomers}</div>
              <div className="metric-lbl">Client Base</div>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">💰</div>
            <div>
              <div className="metric-val">{totalRevenue > 0 ? `₹${totalRevenue.toLocaleString()}` : '₹0'}</div>
              <div className="metric-lbl">Recorded Revenue</div>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">🍫</div>
            <div>
              <div className="metric-val">{BRAND_CONFIG.chocolates.length + BRAND_CONFIG.cakesAndBakes.length}</div>
              <div className="metric-lbl">Handcrafted Items</div>
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
            📦 All Orders ({totalOrders})
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
                  <span>Total Customers:</span>
                  <strong style={{ color: 'var(--gold-300)' }}>{totalCustomers} Registered</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-gold)' }}>
                  <span>Fulfillment Rate:</span>
                  <strong style={{ color: '#34d399' }}>
                    {totalOrders > 0 ? `${Math.round((completedOrders.length / totalOrders) * 100)}%` : '100%'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-gold)' }}>
                  <span>Payment Tracking:</span>
                  <strong style={{ color: 'var(--gold-400)', fontSize: '0.82rem' }}>
                    Schema Migration Required (No payment_status column)
                  </strong>
                </div>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--gold-300)', margin: 0 }}>
                  Recent Orders & Enquiries
                </h3>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '0.76rem', padding: '3px 8px' }}
                  onClick={loadOwnerData}
                >
                  🔄 Refresh
                </button>
              </div>

              {isLoading ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Loading recent business data...
                </div>
              ) : ordersList.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No orders or enquiries recorded yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {ordersList.slice(0, 5).map((ord) => {
                    const refId = ord.order_number || (ord.id ? ord.id.slice(0, 8).toUpperCase() : 'MCH-ORD');
                    return (
                      <div
                        key={ord.id || refId}
                        style={{
                          background: 'rgba(21, 11, 8, 0.6)',
                          padding: '12px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-gold)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <strong style={{ color: 'var(--gold-300)' }}>{refId}</strong>
                          <span
                            style={{
                              fontSize: '0.78rem',
                              color: ord.status === 'completed' ? '#34d399' : ord.status === 'cancelled' ? '#f87171' : '#f59e0b',
                              textTransform: 'uppercase',
                              fontWeight: 700
                            }}
                          >
                            {ord.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.88rem', color: 'var(--text-cream)' }}>
                          {ord.customer_name || 'Customer'} — {ord.product_name || ord.category || 'Confectionery'}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                          {ord.preferred_date ? `Preferred: ${ord.preferred_date}` : 'Flexible timing'}
                          {ord.total_amount ? ` · ₹${ord.total_amount}` : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ORDERS TAB */}
        {activeTab === 'orders' && (
          <div className="admin-card-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--gold-300)', margin: 0 }}>
                Full Store Order Roster
              </h3>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ fontSize: '0.78rem', padding: '4px 10px' }}
                onClick={loadOwnerData}
              >
                🔄 Refresh
              </button>
            </div>

            {isLoading ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading live store orders...
              </div>
            ) : ordersList.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No store orders recorded in the database yet.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Ref ID</th>
                      <th>Client Name</th>
                      <th>Contact</th>
                      <th>Product / Occasion</th>
                      <th>Quantity / Timing</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordersList.map((ord) => {
                      const refId = ord.order_number || (ord.id ? ord.id.slice(0, 8).toUpperCase() : 'MCH-ORD');
                      return (
                        <tr key={ord.id || refId}>
                          <td>
                            <strong style={{ color: 'var(--gold-300)' }}>{refId}</strong>
                          </td>
                          <td>
                            <div>{ord.customer_name || 'Client'}</div>
                            <small style={{ color: 'var(--text-dim)' }}>{ord.customer_email || '—'}</small>
                          </td>
                          <td>{ord.customer_phone || '—'}</td>
                          <td>
                            <div>{ord.product_name || ord.category || 'Handcrafted Order'}</div>
                            {ord.occasion && (
                              <small style={{ color: 'var(--gold-400)' }}>Occasion: {ord.occasion}</small>
                            )}
                          </td>
                          <td>
                            <div>{ord.quantity || 'Standard'}</div>
                            <small style={{ color: 'var(--text-dim)' }}>{ord.preferred_date || 'Flexible'}</small>
                          </td>
                          <td>
                            <span style={{ color: 'var(--gold-300)', fontWeight: 600 }}>
                              {ord.total_amount ? `₹${ord.total_amount}` : 'Quote on req'}
                            </span>
                          </td>
                          <td>
                            <span
                              className="badge-tag badge-gold"
                              style={{
                                textTransform: 'uppercase',
                                color: ord.status === 'completed' ? '#34d399' : ord.status === 'cancelled' ? '#f87171' : undefined
                              }}
                            >
                              {ord.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
