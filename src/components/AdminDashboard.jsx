import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BRAND_CONFIG } from '../config/brandConfig';
import { supabase } from '../supabaseClient';

export default function AdminDashboard({ onNavigate }) {
  const { user, orders: fallbackOrders, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('orders');
  const [ordersList, setOrdersList] = useState([]);
  const [customersList, setCustomersList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchNotice, setFetchNotice] = useState(null);

  const [productsStock, setProductsStock] = useState(() => {
    return BRAND_CONFIG.chocolates.map((c) => ({
      id: c.id,
      name: c.name,
      category: c.categoryLabel,
      price: c.priceTag,
      inStock: true
    }));
  });

  // Fetch live orders, customer profiles, and products from Supabase
  const loadAdminData = async () => {
    setIsLoading(true);
    let errorMessages = [];

    try {
      // 1. Fetch real Supabase Orders
      const { data: dbOrders, error: ordErr } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordErr) {
        console.warn('[AdminDashboard] Orders fetch note:', ordErr.message);
        errorMessages.push(`Orders: ${ordErr.message}`);
        setOrdersList([]);
      } else {
        setOrdersList(dbOrders || []);
      }

      // 2. Fetch real Supabase Profiles (Registered Customers)
      const { data: dbProfiles, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profErr) {
        console.warn('[AdminDashboard] Profiles fetch note:', profErr.message);
        errorMessages.push(`Profiles: ${profErr.message}`);
        setCustomersList([]);
      } else {
        setCustomersList(dbProfiles || []);
      }

      // 3. Fetch real Supabase Products
      const { data: dbProducts, error: prodErr } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (!prodErr && dbProducts && dbProducts.length > 0) {
        setProductsStock(
          dbProducts.map((p) => ({
            id: p.id,
            name: p.name,
            category: p.category_label || p.category,
            price: p.price_tag || (p.price ? `₹${p.price}` : 'Price on Request'),
            inStock: p.available ?? p.is_available ?? true
          }))
        );
      }

      if (errorMessages.length > 0) {
        setFetchNotice(errorMessages.join(' | '));
      } else {
        setFetchNotice(null);
      }
    } catch (err) {
      console.warn('[AdminDashboard] Query error:', err);
      setFetchNotice(err.message);
      setOrdersList([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();

    // Subscribe to Supabase Realtime changes for orders if available
    let channel;
    try {
      channel = supabase
        .channel('admin_realtime_orders')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          () => {
            loadAdminData();
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('[AdminDashboard] Realtime subscription skipped:', e);
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // Update order status directly in Supabase
  const handleStatusChange = async (orderId, newStatus) => {
    setOrdersList((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);
      if (error) {
        console.warn('[AdminDashboard] Status update warning:', error.message);
      }
    } catch (err) {
      console.warn('[AdminDashboard] Status update exception:', err);
    }
  };

  const handleToggleStock = async (prodId, currentStock) => {
    const nextStock = !currentStock;
    setProductsStock((prev) =>
      prev.map((p) => (p.id === prodId ? { ...p, inStock: nextStock } : p))
    );
    try {
      await supabase
        .from('products')
        .update({ available: nextStock, is_available: nextStock })
        .eq('id', prodId);
    } catch (err) {
      console.warn('[AdminDashboard] Product stock update exception:', err);
    }
  };

  // Real Supabase Statistics Calculations
  const totalOrders = ordersList.length;
  const pendingCount = ordersList.filter((o) => o.status === 'pending').length;
  const processingCount = ordersList.filter((o) => o.status === 'processing').length;
  const completedCount = ordersList.filter((o) => o.status === 'completed').length;
  const cancelledCount = ordersList.filter((o) => o.status === 'cancelled').length;
  const totalCustomers = customersList.length;
  const totalEnquiries = ordersList.filter(
    (o) => o.occasion || o.customisation_details || o.special_message
  ).length;

  return (
    <div style={{ background: '#150b08', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="admin-header">
        <a
          href="#admin"
          className="admin-logo-brand"
          onClick={(e) => {
            e.preventDefault();
            if (onNavigate) onNavigate('#admin');
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

        {/* METRICS CARDS */}
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-icon">📦</div>
            <div>
              <div className="metric-val">{totalOrders}</div>
              <div className="metric-lbl">Total Orders</div>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">⏳</div>
            <div>
              <div className="metric-val">{pendingCount}</div>
              <div className="metric-lbl">Pending Orders</div>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">⚙️</div>
            <div>
              <div className="metric-val">{processingCount}</div>
              <div className="metric-lbl">Processing Orders</div>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">✅</div>
            <div>
              <div className="metric-val">{completedCount}</div>
              <div className="metric-lbl">Completed Orders</div>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">❌</div>
            <div>
              <div className="metric-val">{cancelledCount}</div>
              <div className="metric-lbl">Cancelled Orders</div>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">👥</div>
            <div>
              <div className="metric-val">{totalCustomers}</div>
              <div className="metric-lbl">Total Customers</div>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">💬</div>
            <div>
              <div className="metric-val">{totalEnquiries}</div>
              <div className="metric-lbl">Custom Enquiries</div>
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
            📋 Orders & Enquiries ({totalOrders})
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
            👥 Registered Customers ({totalCustomers})
          </button>
        </div>

        {/* ORDERS TAB */}
        {activeTab === 'orders' && (
          <div className="admin-card-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--gold-300)', margin: 0 }}>
                Customer Orders & Enquiries
              </h3>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ fontSize: '0.78rem', padding: '4px 10px' }}
                onClick={loadAdminData}
              >
                🔄 Refresh
              </button>
            </div>

            {isLoading ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading live Supabase orders...
              </div>
            ) : ordersList.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No customer orders found in the database yet.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Ref ID</th>
                      <th>Customer</th>
                      <th>Contact</th>
                      <th>Product / Occasion</th>
                      <th>Qty / Date</th>
                      <th>Amount</th>
                      <th>Status Action</th>
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
                            <div>{ord.customer_name || 'Customer'}</div>
                            <small style={{ color: 'var(--text-dim)' }}>{ord.customer_email || '—'}</small>
                          </td>
                          <td>{ord.customer_phone || '—'}</td>
                          <td>
                            <div>{ord.product_name || ord.category || 'Confectionery Order'}</div>
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
                            <select
                              value={ord.status || 'pending'}
                              onChange={(e) => handleStatusChange(ord.id, e.target.value)}
                              style={{
                                background: 'rgba(21, 11, 8, 0.9)',
                                border: '1px solid var(--border-gold)',
                                color: ord.status === 'completed' ? '#34d399' : ord.status === 'cancelled' ? '#f87171' : 'var(--gold-300)',
                                padding: '4px 8px',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                cursor: 'pointer'
                              }}
                            >
                              <option value="pending">PENDING</option>
                              <option value="processing">PROCESSING</option>
                              <option value="completed">COMPLETED</option>
                              <option value="cancelled">CANCELLED</option>
                            </select>
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
                          onClick={() => handleToggleStock(prod.id, prod.inStock)}
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
              Registered Customer Directory
            </h3>
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>Member Since</th>
                  </tr>
                </thead>
                <tbody>
                  {customersList.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                        No customers registered yet.
                      </td>
                    </tr>
                  ) : (
                    customersList.map((u, i) => (
                      <tr key={u.id || u.email || i}>
                        <td>
                          <strong style={{ color: 'var(--gold-300)' }}>{u.full_name || u.name || 'Customer'}</strong>
                        </td>
                        <td>{u.email}</td>
                        <td>{u.phone || '—'}</td>
                        <td>
                          <span className="badge-tag badge-gold">{(u.role || 'user').toUpperCase()}</span>
                        </td>
                        <td style={{ color: 'var(--text-dim)', fontSize: '0.84rem' }}>
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
