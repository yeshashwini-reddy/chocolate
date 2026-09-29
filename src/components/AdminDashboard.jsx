import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BRAND_CONFIG } from '../config/brandConfig';
import { supabase } from '../supabaseClient';

export default function AdminDashboard({ onNavigate }) {
  const { user, orders: fallbackOrders, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('products');
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

      if (ordErr || !dbOrders || dbOrders.length === 0) {
        if (ordErr) {
          console.warn('[AdminDashboard] Orders fetch note:', ordErr.message);
          errorMessages.push(`Orders: ${ordErr.message}`);
        }
        setOrdersList(fallbackOrders || []);
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
            title="Preview customer storefront"
            onClick={() => {
              if (onNavigate) onNavigate('#home');
              else window.location.hash = '#home';
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

        <div className="admin-card-box" style={{ marginTop: '24px' }}>
          <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--gold-300)', marginBottom: '14px' }}>
            Admin Operations Control Center
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', margin: 0 }}>
            System metrics and real-time operational overview. Business catalogue management and customer directory access are configured in the Executive Suite.
          </p>
        </div>
      </main>
    </div>
  );
}
