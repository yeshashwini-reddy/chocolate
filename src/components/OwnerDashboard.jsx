import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useProducts } from '../context/ProductContext';
import { BRAND_CONFIG } from '../config/brandConfig';
import { supabase, getTabId } from '../supabaseClient';
import OwnerOrderCard from './OwnerOrderCard';
import OwnerProductModal from './OwnerProductModal';
import { getOrderStatusConfig } from '../services/orderStatus';
import {
  downloadReceiptPdf,
  printReceiptPdf,
  isOrderPaymentVerified,
  fetchOrderForReceipt
} from '../services/receiptService';

export default function OwnerDashboard({ onNavigate }) {
  const { user, logout } = useAuth();
  const {
    products,
    isLoadingProducts,
    refreshProducts,
    createProduct,
    updateProduct,
    toggleStock,
    removeProduct
  } = useProducts();

  // Navigation tab state: 'overview' | 'products' | 'orders' | 'customers' | 'settings'
  const [activeTab, setActiveTab] = useState('overview');

  // Supabase Data State
  const [ordersList, setOrdersList] = useState([]);
  const [customersList, setCustomersList] = useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState(null);
  const [fetchNotice, setFetchNotice] = useState(null);
  const [dashboardToast, setDashboardToast] = useState(null);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [statusUpdateError, setStatusUpdateError] = useState(null);

  // Modals & Action State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleteConfirmProduct, setDeleteConfirmProduct] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState(null);

  // Quick Inline Price Editing State: { [productId]: stringValue }
  const [inlinePriceEdits, setInlinePriceEdits] = useState({});
  const [isSavingInlinePrice, setIsSavingInlinePrice] = useState({});

  // Product Filter & Search State
  const [productSearch, setProductSearch] = useState('');
  const [productCatFilter, setProductCatFilter] = useState('all');
  const [productStockFilter, setProductStockFilter] = useState('all'); // 'all' | 'available' | 'unavailable' | 'needs_pricing'

  // Orders Filter & Search State
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all'); // 'all' | 'pending' | 'processing' | 'completed' | 'cancelled'

  // Customer Filter State
  const [customerSearch, setCustomerSearch] = useState('');

  const triggerToast = (msg) => {
    setDashboardToast(msg);
    setTimeout(() => {
      setDashboardToast((prev) => (prev === msg ? null : prev));
    }, 4500);
  };

  // Fetch real orders and registered customer profiles from Supabase
  const loadDashboardData = async () => {
    setIsLoadingOrders(true);
    setOrdersError(null);
    let errorNotes = [];

    try {
      // 1. Fetch Real Orders
      const { data: dbOrders, error: ordErr } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordErr) {
        console.error('[OwnerDashboard] Orders query error:', ordErr.message);
        setOrdersError(ordErr.message);
        setOrdersList([]);
        errorNotes.push(`Orders: ${ordErr.message}`);
      } else {
        setOrdersError(null);
        setOrdersList(dbOrders || []);
      }

      // 2. Fetch Real Profiles (Registered Customers)
      const { data: dbProfiles, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profErr) {
        console.warn('[OwnerDashboard] Profiles query note:', profErr.message);
        errorNotes.push(`Profiles: ${profErr.message}`);
        setCustomersList([]);
      } else {
        setCustomersList(dbProfiles || []);
      }

      if (errorNotes.length > 0) {
        setFetchNotice(errorNotes.join(' | '));
      } else {
        setFetchNotice(null);
      }
    } catch (err) {
      console.error('[OwnerDashboard] Data load exception:', err);
      setOrdersError(err.message || 'Failed to load orders.');
      setFetchNotice(err.message);
      setOrdersList([]);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    // Supabase Realtime channel for live order updates
    let channel;
    try {
      const tabId = getTabId();
      const channelName = `owner_live_orders_${tabId}_${Date.now()}`;
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          () => {
            loadDashboardData();
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('[OwnerDashboard] Realtime setup note:', e);
    }

    const handleWindowFocus = () => {
      loadDashboardData();
    };
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // Update order status in Supabase (persists first, displays loading, updates UI on success)
  const handleStatusChange = async (orderId, newStatus) => {
    if (!orderId || !newStatus) return;
    if (updatingOrderId === orderId) return;

    setUpdatingOrderId(orderId);
    setStatusUpdateError(null);

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) {
        console.error('[OwnerDashboard] Status update error:', error.message);
        setStatusUpdateError({ orderId, message: error.message });
        triggerToast(`Status update error: ${error.message}`);
      } else {
        // Update the UI only AFTER the database update succeeds
        setOrdersList((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus, updated_at: new Date().toISOString() } : o))
        );
        const statusConfig = getOrderStatusConfig(newStatus);
        triggerToast(`Order status updated to "${statusConfig.label}".`);
      }
    } catch (err) {
      console.error('[OwnerDashboard] Status update exception:', err);
      setStatusUpdateError({ orderId, message: err.message || 'Unknown network error' });
      triggerToast(`Error updating status: ${err.message || 'Network error'}`);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Verify and record order payment
  const handleVerifyPayment = async (orderId) => {
    const paidAt = new Date().toISOString();
    const order = ordersList.find((o) => o.id === orderId);
    const receiptNum = order?.receipt_number || `RCPT-${order?.order_number || orderId.slice(0, 8)}`;

    setOrdersList((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, payment_status: 'paid', paid_at: paidAt, receipt_number: receiptNum }
          : o
      )
    );

    try {
      const { error } = await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          paid_at: paidAt,
          receipt_number: receiptNum,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) {
        triggerToast(`Payment verification error: ${error.message}`);
      } else {
        triggerToast(`Payment verified! Receipt ${receiptNum} issued.`);
      }
    } catch (err) {
      triggerToast(`Payment verification error: ${err.message}`);
    }
  };

  // Product Management Handlers
  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod) => {
    setEditingProduct(prod);
    setIsProductModalOpen(true);
  };

  const handleSaveProductModal = async (payload, existingProd) => {
    if (existingProd) {
      const res = await updateProduct(existingProd.id || existingProd.product_key, payload);
      if (res.success) {
        triggerToast(`Product "${payload.name}" updated successfully.`);
      }
      return res;
    } else {
      const res = await createProduct(payload);
      if (res.success) {
        triggerToast(`Product "${payload.name}" added to catalogue!`);
      }
      return res;
    }
  };

  // Inline Quick Price Change Handler
  const handleInlinePriceSave = async (prod) => {
    const editVal = inlinePriceEdits[prod.id];
    if (editVal === undefined || editVal === '') return;

    const newPriceNum = parseFloat(editVal);
    if (isNaN(newPriceNum) || newPriceNum < 0) {
      triggerToast('Price must be a valid non-negative number.');
      return;
    }

    setIsSavingInlinePrice((prev) => ({ ...prev, [prod.id]: true }));
    try {
      const res = await updateProduct(prod.id || prod.product_key, { price: newPriceNum });
      if (res.success) {
        triggerToast(`Price of "${prod.name}" updated to ₹${newPriceNum}. Customer cards updated.`);
        setInlinePriceEdits((prev) => {
          const copy = { ...prev };
          delete copy[prod.id];
          return copy;
        });
      } else {
        triggerToast(`Failed to update price: ${res.message}`);
      }
    } catch (err) {
      triggerToast(`Error saving price: ${err.message}`);
    } finally {
      setIsSavingInlinePrice((prev) => ({ ...prev, [prod.id]: false }));
    }
  };

  // Stock Availability Toggle Handler
  const handleStockToggle = async (prod) => {
    const currentStock = prod.available ?? prod.is_available ?? true;
    const res = await toggleStock(prod.id || prod.product_key, currentStock);
    if (res.success) {
      triggerToast(
        `"${prod.name}" marked ${!currentStock ? '● In Stock' : '○ Out of Stock'}.`
      );
    } else {
      triggerToast(`Could not update stock: ${res.message}`);
    }
  };

  // Safe Removal / Archive Handler
  const handleConfirmDelete = async () => {
    if (!deleteConfirmProduct) return;
    setIsDeleting(true);
    try {
      const res = await removeProduct(
        deleteConfirmProduct.id,
        deleteConfirmProduct.product_key,
        deleteConfirmProduct.name
      );
      if (res.success) {
        triggerToast(res.message);
      } else {
        triggerToast(`Removal failed: ${res.message}`);
      }
      setDeleteConfirmProduct(null);
    } catch (err) {
      triggerToast(`Error: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // -------------------------------------------------------------
  // COMPUTED STATISTICS (Strictly Real Supabase Database Values)
  // -------------------------------------------------------------
  const totalProducts = products.length;
  const availableProducts = products.filter((p) => p.available && p.is_available).length;
  const unavailableProducts = products.filter((p) => !p.available || !p.is_available).length;
  const needsPricingCount = products.filter((p) => p.needsPricing || !p.price || p.price <= 0).length;

  const totalOrders = ordersList.length;
  const pendingOrders = ordersList.filter((o) => o.status === 'pending' || !o.status);
  const processingOrders = ordersList.filter(
    (o) => o.status === 'processing' || o.status === 'accepted' || o.status === 'awaiting'
  );
  const completedOrders = ordersList.filter((o) => o.status === 'completed');
  const cancelledOrders = ordersList.filter((o) => o.status === 'cancelled');

  const totalCustomers = customersList.length;

  // Real verified revenue strictly from completed orders
  const verifiedRevenue = completedOrders.reduce(
    (sum, o) => sum + (Number(o.total_amount) || 0),
    0
  );

  // -------------------------------------------------------------
  // FILTERED PRODUCTS LIST
  // -------------------------------------------------------------
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // 1. Search Query
      if (productSearch.trim()) {
        const q = productSearch.toLowerCase().trim();
        const nameMatch = p.name?.toLowerCase().includes(q);
        const descMatch = (p.desc || p.description)?.toLowerCase().includes(q);
        const keyMatch = p.product_key?.toLowerCase().includes(q);
        if (!nameMatch && !descMatch && !keyMatch) return false;
      }

      // 2. Category Filter
      if (productCatFilter !== 'all') {
        const cat = (p.category || '').toLowerCase();
        if (cat !== productCatFilter.toLowerCase()) return false;
      }

      // 3. Stock / Pricing Filter
      if (productStockFilter === 'available') {
        if (!p.available || !p.is_available) return false;
      } else if (productStockFilter === 'unavailable') {
        if (p.available && p.is_available) return false;
      } else if (productStockFilter === 'needs_pricing') {
        if (!p.needsPricing && p.price > 0) return false;
      }

      return true;
    });
  }, [products, productSearch, productCatFilter, productStockFilter]);

  // -------------------------------------------------------------
  // FILTERED ORDERS LIST
  // -------------------------------------------------------------
  const filteredOrders = useMemo(() => {
    return ordersList.filter((o) => {
      // Status Filter
      if (orderStatusFilter === 'pending' && o.status !== 'pending' && o.status) return false;
      if (
        orderStatusFilter === 'processing' &&
        o.status !== 'processing' &&
        o.status !== 'accepted' &&
        o.status !== 'awaiting'
      )
        return false;
      if (orderStatusFilter === 'completed' && o.status !== 'completed') return false;
      if (orderStatusFilter === 'cancelled' && o.status !== 'cancelled') return false;

      // Search Filter
      if (orderSearch.trim()) {
        const q = orderSearch.toLowerCase().trim();
        const refMatch = (o.order_number || o.id || '').toLowerCase().includes(q);
        const nameMatch = (o.customer_name || '').toLowerCase().includes(q);
        const emailMatch = (o.customer_email || '').toLowerCase().includes(q);
        const phoneMatch = (o.customer_phone || '').toLowerCase().includes(q);
        if (!refMatch && !nameMatch && !emailMatch && !phoneMatch) return false;
      }

      return true;
    });
  }, [ordersList, orderStatusFilter, orderSearch]);

  // -------------------------------------------------------------
  // FILTERED CUSTOMERS LIST
  // -------------------------------------------------------------
  const filteredCustomers = useMemo(() => {
    return customersList.filter((c) => {
      if (!customerSearch.trim()) return true;
      const q = customerSearch.toLowerCase().trim();
      const nameMatch = (c.full_name || c.name || '').toLowerCase().includes(q);
      const emailMatch = (c.email || '').toLowerCase().includes(q);
      const phoneMatch = (c.phone || '').toLowerCase().includes(q);
      return nameMatch || emailMatch || phoneMatch;
    });
  }, [customersList, customerSearch]);

  const existingProductKeys = products.map((p) => p.product_key || p.id);

  return (
    <div style={{ background: '#150b08', minHeight: '100vh', display: 'flex', flexDirection: 'column', color: 'var(--text-cream)' }}>
      {/* Toast Notification Banner */}
      {dashboardToast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: 'rgba(30, 16, 11, 0.95)',
            border: '1px solid var(--gold-400)',
            color: 'var(--gold-300)',
            padding: '12px 20px',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)',
            zIndex: 2000,
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <span>✨</span>
          <span>{dashboardToast}</span>
        </div>
      )}

      {/* HEADER */}
      <header className="owner-header" style={{ position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(10px)', background: 'rgba(21, 11, 8, 0.95)', borderBottom: '1px solid var(--border-gold-strong)', padding: '14px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <a
          href="#owner"
          className="owner-brand-wrap"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('overview');
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}
        >
          <img src="assets/images/logo.png" alt="Madhuri's Choco Heaven" style={{ width: '42px', height: '42px', objectFit: 'contain' }} />
          <div>
            <div className="owner-brand-title" style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--gold-300)', fontWeight: 700 }}>
              Madhuri’s Choco Heaven
            </div>
            <div className="owner-brand-badge" style={{ fontSize: '0.74rem', color: 'var(--gold-400)', letterSpacing: '1px', textTransform: 'uppercase' }}>
              👑 Owner & Executive Suite
            </div>
          </div>
        </a>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            Welcome, <strong style={{ color: 'var(--gold-300)' }}>{user?.name || 'Madhuri'}</strong>
          </span>
          <button
            type="button"
            className="btn btn-outline btn-sm"
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

      {/* MAIN CONTAINER */}
      <main className="admin-container" style={{ flex: 1, padding: '28px 24px', maxWidth: '1360px', width: '100%', margin: '0 auto' }}>
        {fetchNotice && (
          <div
            style={{
              background: 'rgba(212, 163, 115, 0.12)',
              border: '1px solid var(--gold-400)',
              color: 'var(--gold-300)',
              padding: '12px 18px',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '20px',
              fontSize: '0.86rem'
            }}
          >
            ℹ️ <strong>Database Status:</strong> {fetchNotice}. Run the provided <code>supabase-owner-dashboard-migration.sql</code> in the Supabase SQL editor to ensure full permissions.
          </div>
        )}

        {/* 5-TAB PRIMARY NAVIGATION */}
        <div className="admin-tabs" style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-gold)', marginBottom: '28px', overflowX: 'auto', paddingBottom: '2px' }}>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📊 Overview
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            🍫 Products & Pricing ({totalProducts})
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            📦 Orders Management ({totalOrders})
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'customers' ? 'active' : ''}`}
            onClick={() => setActiveTab('customers')}
          >
            👥 Customers ({totalCustomers})
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            ⚙️ Database & Security
          </button>
        </div>

        {/* ============================================================== */}
        {/* TAB 1: OVERVIEW & REAL DASHBOARD STATISTICS                   */}
        {/* ============================================================== */}
        {activeTab === 'overview' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--gold-300)', margin: 0, fontSize: '1.6rem' }}>
                  Business Overview & Live Metrics
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '4px 0 0 0' }}>
                  Real-time figures directly from your Supabase database.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    loadDashboardData();
                    refreshProducts();
                    triggerToast('Dashboard metrics refreshed from Supabase.');
                  }}
                >
                  🔄 Refresh Data
                </button>
                <button
                  type="button"
                  className="btn btn-gold btn-sm"
                  onClick={handleOpenAddProduct}
                >
                  ✨ Add Product
                </button>
              </div>
            </div>

            {/* REAL DASHBOARD STATISTICS (PHASE 3) */}
            <div className="metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px', marginBottom: '28px' }}>
              {/* Total Products */}
              <div
                className="metric-card"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setActiveTab('products');
                  setProductStockFilter('all');
                }}
                title="View all products"
              >
                <div className="metric-icon">🍫</div>
                <div>
                  <div className="metric-val">{totalProducts}</div>
                  <div className="metric-lbl">Total Products</div>
                </div>
              </div>

              {/* Available Products */}
              <div
                className="metric-card"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setActiveTab('products');
                  setProductStockFilter('available');
                }}
                title="View available products"
              >
                <div className="metric-icon" style={{ color: '#34d399' }}>●</div>
                <div>
                  <div className="metric-val" style={{ color: '#34d399' }}>{availableProducts}</div>
                  <div className="metric-lbl">Available in Store</div>
                </div>
              </div>

              {/* Unavailable Products */}
              <div
                className="metric-card"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setActiveTab('products');
                  setProductStockFilter('unavailable');
                }}
                title="View unavailable / archived products"
              >
                <div className="metric-icon" style={{ color: '#f87171' }}>○</div>
                <div>
                  <div className="metric-val" style={{ color: '#f87171' }}>{unavailableProducts}</div>
                  <div className="metric-lbl">Unavailable / Out of Stock</div>
                </div>
              </div>

              {/* Products Needing Pricing */}
              <div
                className="metric-card"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setActiveTab('products');
                  setProductStockFilter('needs_pricing');
                }}
                title="View products requiring price set"
              >
                <div className="metric-icon" style={{ color: '#fbbf24' }}>⚠️</div>
                <div>
                  <div className="metric-val" style={{ color: '#fbbf24' }}>{needsPricingCount}</div>
                  <div className="metric-lbl">Needing Price Set</div>
                </div>
              </div>

              {/* Total Orders */}
              <div
                className="metric-card"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setActiveTab('orders');
                  setOrderStatusFilter('all');
                }}
                title="View all orders"
              >
                <div className="metric-icon">📋</div>
                <div>
                  <div className="metric-val">{totalOrders}</div>
                  <div className="metric-lbl">Total Orders</div>
                </div>
              </div>

              {/* Pending Orders */}
              <div
                className="metric-card"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setActiveTab('orders');
                  setOrderStatusFilter('pending');
                }}
                title="View pending orders"
              >
                <div className="metric-icon" style={{ color: 'var(--gold-300)' }}>⏳</div>
                <div>
                  <div className="metric-val">{pendingOrders.length}</div>
                  <div className="metric-lbl">Pending Orders</div>
                </div>
              </div>

              {/* Processing Orders */}
              <div
                className="metric-card"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setActiveTab('orders');
                  setOrderStatusFilter('processing');
                }}
                title="View processing orders"
              >
                <div className="metric-icon" style={{ color: '#60a5fa' }}>⚡</div>
                <div>
                  <div className="metric-val">{processingOrders.length}</div>
                  <div className="metric-lbl">In Production</div>
                </div>
              </div>

              {/* Completed Orders */}
              <div
                className="metric-card"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setActiveTab('orders');
                  setOrderStatusFilter('completed');
                }}
                title="View completed orders"
              >
                <div className="metric-icon" style={{ color: '#34d399' }}>✅</div>
                <div>
                  <div className="metric-val">{completedOrders.length}</div>
                  <div className="metric-lbl">Completed Orders</div>
                </div>
              </div>

              {/* Cancelled Orders */}
              <div
                className="metric-card"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setActiveTab('orders');
                  setOrderStatusFilter('cancelled');
                }}
                title="View cancelled orders"
              >
                <div className="metric-icon" style={{ color: '#f87171' }}>❌</div>
                <div>
                  <div className="metric-val">{cancelledOrders.length}</div>
                  <div className="metric-lbl">Cancelled Orders</div>
                </div>
              </div>

              {/* Total Customers */}
              <div
                className="metric-card"
                style={{ cursor: 'pointer' }}
                onClick={() => setActiveTab('customers')}
                title="View registered customers"
              >
                <div className="metric-icon">👥</div>
                <div>
                  <div className="metric-val">{totalCustomers}</div>
                  <div className="metric-lbl">Registered Customers</div>
                </div>
              </div>

              {/* Verified Completed Revenue (Strictly Real) */}
              <div
                className="metric-card"
                style={{ cursor: 'pointer', borderColor: 'var(--border-gold-strong)' }}
                onClick={() => {
                  setActiveTab('orders');
                  setOrderStatusFilter('completed');
                }}
                title="Revenue from verified completed orders"
              >
                <div className="metric-icon">💰</div>
                <div>
                  <div className="metric-val">₹{verifiedRevenue.toLocaleString('en-IN')}</div>
                  <div className="metric-lbl">Verified Revenue (Completed)</div>
                </div>
              </div>
            </div>

            {/* RECENT ORDERS TABLE */}
            <div className="admin-card-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--gold-300)', margin: 0 }}>
                  Recent Orders & Celebration Enquiries
                </h3>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setActiveTab('orders')}
                >
                  View All Orders →
                </button>
              </div>

              {isLoadingOrders ? (
                <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  Loading real orders from Supabase...
                </div>
              ) : ordersError ? (
                <div style={{ textAlign: 'center', padding: '36px', color: '#f87171' }}>
                  <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>⚠️</div>
                  <div style={{ fontWeight: 600, marginBottom: '6px' }}>Failed to load orders from Supabase</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '14px' }}>{ordersError}</div>
                  <button type="button" className="btn btn-outline btn-sm" onClick={loadDashboardData}>
                    🔄 Retry
                  </button>
                </div>
              ) : ordersList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  No orders placed yet. Orders created on the storefront will appear here instantly.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Reference</th>
                        <th>Customer</th>
                        <th>Products Ordered</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordersList.slice(0, 5).map((ord) => {
                        const refId = ord.order_number || (ord.id ? ord.id.slice(0, 8).toUpperCase() : 'MCH-ORD');
                        const isPaid = isOrderPaymentVerified(ord);
                        return (
                          <tr key={ord.id}>
                            <td>
                              <strong style={{ color: 'var(--gold-300)', fontFamily: 'var(--font-serif)' }}>
                                {refId}
                              </strong>
                            </td>
                            <td>
                              <div><strong>{ord.customer_name || 'Customer'}</strong></div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>{ord.customer_phone}</div>
                            </td>
                            <td style={{ maxWidth: '280px' }}>
                              <div style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {ord.product_name || 'Artisan Selection'}
                              </div>
                            </td>
                            <td style={{ fontSize: '0.84rem', color: 'var(--text-dim)' }}>
                              {ord.created_at ? new Date(ord.created_at).toLocaleDateString() : 'Recent'}
                            </td>
                            <td>
                              <strong style={{ color: 'var(--gold-300)', fontFamily: 'var(--font-serif)' }}>
                                {ord.total_amount > 0 ? `₹${Number(ord.total_amount).toLocaleString('en-IN')}` : 'Quotation'}
                              </strong>
                            </td>
                            <td>
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  textTransform: 'uppercase',
                                  background:
                                    ord.status === 'completed'
                                      ? 'rgba(52, 211, 153, 0.15)'
                                      : ord.status === 'cancelled'
                                      ? 'rgba(248, 113, 113, 0.15)'
                                      : 'rgba(212, 163, 115, 0.15)',
                                  color:
                                    ord.status === 'completed'
                                      ? '#34d399'
                                      : ord.status === 'cancelled'
                                      ? '#f87171'
                                      : 'var(--gold-300)',
                                  border: `1px solid ${
                                    ord.status === 'completed'
                                      ? '#34d399'
                                      : ord.status === 'cancelled'
                                      ? '#f87171'
                                      : 'var(--gold-400)'
                                  }`
                                }}
                              >
                                {ord.status || 'Pending'}
                              </span>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                style={{ fontSize: '0.74rem', padding: '4px 8px' }}
                                onClick={() => {
                                  setActiveTab('orders');
                                  setOrderSearch(refId);
                                }}
                              >
                                Inspect
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: PRODUCTS & PRICING MANAGEMENT (PHASE 4)                */}
        {/* ============================================================== */}
        {activeTab === 'products' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--gold-300)', margin: 0, fontSize: '1.6rem' }}>
                  Product Catalogue & Pricing Management
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '4px 0 0 0' }}>
                  Manage products, edit selling prices, toggle active stock, and add items. Updates sync live to the customer storefront.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={async () => {
                    await refreshProducts();
                    triggerToast('Product catalogue re-synchronized with Supabase.');
                  }}
                >
                  🔄 Refresh
                </button>
                <button
                  type="button"
                  className="btn btn-gold btn-sm"
                  onClick={handleOpenAddProduct}
                >
                  ✨ Add New Product
                </button>
              </div>
            </div>

            {/* FILTER & SEARCH TOOLBAR */}
            <div
              className="admin-card-box"
              style={{
                marginBottom: '20px',
                padding: '16px 20px',
                display: 'flex',
                gap: '16px',
                alignItems: 'center',
                flexWrap: 'wrap',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '280px', flexWrap: 'wrap' }}>
                {/* Search */}
                <input
                  type="text"
                  className="checkout-input"
                  placeholder="🔍 Search products by name or key..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  style={{ flex: 1, minWidth: '220px' }}
                />

                {/* Category Dropdown */}
                <select
                  className="checkout-input"
                  value={productCatFilter}
                  onChange={(e) => setProductCatFilter(e.target.value)}
                  style={{ width: 'auto', background: '#150b08', color: 'var(--text-cream)' }}
                >
                  <option value="all">All Categories</option>
                  <option value="classic">Classic Chocolates</option>
                  <option value="customised">Customised Chocolates</option>
                  <option value="gifting">Luxury Gifting</option>
                  <option value="specialty">Specialty</option>
                  <option value="flavoured">Flavoured</option>
                  <option value="cakes">Celebration Cakes</option>
                  <option value="cupcakes">Cupcakes & Muffins</option>
                  <option value="brownies">Fudgy Brownies</option>
                  <option value="cookies">Artisan Cookies</option>
                  <option value="plum-cake">Spiced Plum Cake</option>
                </select>
              </div>

              {/* Availability Filter Pills */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`filter-pill ${productStockFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setProductStockFilter('all')}
                >
                  All ({products.length})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${productStockFilter === 'available' ? 'active' : ''}`}
                  onClick={() => setProductStockFilter('available')}
                >
                  ● In Stock ({availableProducts})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${productStockFilter === 'unavailable' ? 'active' : ''}`}
                  onClick={() => setProductStockFilter('unavailable')}
                >
                  ○ Out of Stock ({unavailableProducts})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${productStockFilter === 'needs_pricing' ? 'active' : ''}`}
                  onClick={() => setProductStockFilter('needs_pricing')}
                  style={{ borderColor: needsPricingCount > 0 ? '#fbbf24' : 'inherit' }}
                >
                  ⚠️ Needs Pricing ({needsPricingCount})
                </button>
              </div>
            </div>

            {/* PRODUCTS TABLE */}
            <div className="admin-card-box">
              {isLoadingProducts ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  Loading products from database...
                </div>
              ) : filteredProducts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No products found matching the current filter or search criteria.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th style={{ width: '60px' }}>Image</th>
                        <th>Product Details</th>
                        <th>Category</th>
                        <th>Current Price (INR)</th>
                        <th>Quick Price Update</th>
                        <th>Availability</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((prod) => {
                        const isAvail = prod.available ?? prod.is_available ?? true;
                        const needsPricing = prod.needsPricing || !prod.price || prod.price <= 0;
                        const inlineVal = inlinePriceEdits[prod.id] !== undefined ? inlinePriceEdits[prod.id] : '';
                        const isSavingPrice = isSavingInlinePrice[prod.id];

                        return (
                          <tr key={prod.id || prod.product_key}>
                            <td>
                              <img
                                src={prod.image || prod.image_url || 'assets/images/chocolate_truffles_box.jpg'}
                                alt={prod.name}
                                style={{
                                  width: '48px',
                                  height: '48px',
                                  objectFit: 'cover',
                                  borderRadius: 'var(--radius-sm)',
                                  border: '1px solid var(--border-gold)',
                                  background: '#150b08'
                                }}
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = 'assets/images/chocolate_truffles_box.jpg';
                                }}
                              />
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, color: 'var(--gold-300)', fontSize: '0.96rem' }}>
                                {prod.name}
                              </div>
                              <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                                Key: <code>{prod.product_key}</code>
                              </div>
                              {prod.tags && prod.tags.length > 0 && (
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                                  {prod.tags.slice(0, 3).map((t, idx) => (
                                    <span key={idx} className="badge-tag" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td>
                              <span className="badge-tag badge-gold" style={{ fontSize: '0.74rem' }}>
                                {prod.categoryLabel || prod.category}
                              </span>
                            </td>
                            <td>
                              {needsPricing ? (
                                <span
                                  style={{
                                    display: 'inline-block',
                                    background: 'rgba(251, 191, 36, 0.15)',
                                    border: '1px solid #fbbf24',
                                    color: '#fbbf24',
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    fontWeight: 700,
                                    fontSize: '0.78rem'
                                  }}
                                  title="Product needs pricing set before online purchasing"
                                >
                                  ⚠️ Needs Pricing (₹0)
                                </span>
                              ) : (
                                <strong style={{ fontFamily: 'var(--font-serif)', color: 'var(--gold-300)', fontSize: '1.05rem' }}>
                                  ₹{prod.price}
                                </strong>
                              )}
                            </td>
                            {/* Inline Quick Price Update */}
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ color: 'var(--gold-300)', fontWeight: 600 }}>₹</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  placeholder={String(prod.price || 0)}
                                  className="checkout-input"
                                  style={{ width: '84px', padding: '6px 8px', fontSize: '0.85rem' }}
                                  value={inlineVal}
                                  onChange={(e) =>
                                    setInlinePriceEdits((prev) => ({
                                      ...prev,
                                      [prod.id]: e.target.value
                                    }))
                                  }
                                />
                                {inlineVal !== '' && (
                                  <button
                                    type="button"
                                    className="btn btn-gold btn-sm"
                                    style={{ fontSize: '0.74rem', padding: '5px 8px' }}
                                    disabled={isSavingPrice}
                                    onClick={() => handleInlinePriceSave(prod)}
                                    title="Save new price to Supabase"
                                  >
                                    {isSavingPrice ? '...' : 'Save'}
                                  </button>
                                )}
                              </div>
                            </td>
                            {/* Stock Toggle */}
                            <td>
                              <button
                                type="button"
                                onClick={() => handleStockToggle(prod)}
                                style={{
                                  background: isAvail ? 'rgba(52, 211, 153, 0.12)' : 'rgba(248, 113, 113, 0.12)',
                                  border: `1px solid ${isAvail ? '#34d399' : '#f87171'}`,
                                  color: isAvail ? '#34d399' : '#f87171',
                                  padding: '4px 10px',
                                  borderRadius: '20px',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}
                                title="Click to toggle availability"
                              >
                                {isAvail ? '● In Stock' : '○ Out of Stock'}
                              </button>
                            </td>
                            {/* Actions */}
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                <button
                                  type="button"
                                  className="btn btn-outline btn-sm"
                                  style={{ fontSize: '0.76rem', padding: '5px 10px' }}
                                  onClick={() => handleOpenEditProduct(prod)}
                                  title="Edit product details"
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-outline btn-sm"
                                  style={{
                                    fontSize: '0.76rem',
                                    padding: '5px 10px',
                                    borderColor: '#f87171',
                                    color: '#f87171'
                                  }}
                                  onClick={() => setDeleteConfirmProduct(prod)}
                                  title="Remove or archive product from catalogue"
                                >
                                  🗑️ Remove
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: ORDERS MANAGEMENT (PHASE 7)                            */}
        {/* ============================================================== */}
        {activeTab === 'orders' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--gold-300)', margin: 0, fontSize: '1.6rem' }}>
                  Orders & Production Fulfillment
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '4px 0 0 0' }}>
                  Manage incoming customer orders, update production statuses, verify payments, and generate official PDF receipts.
                </p>
              </div>

              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={loadDashboardData}
              >
                🔄 Refresh Orders
              </button>
            </div>

            {/* Filter and Search Bar */}
            <div
              className="admin-card-box"
              style={{
                marginBottom: '20px',
                padding: '16px 20px',
                display: 'flex',
                gap: '16px',
                alignItems: 'center',
                flexWrap: 'wrap',
                justifyContent: 'space-between'
              }}
            >
              <input
                type="text"
                className="checkout-input"
                placeholder="🔍 Search by Order Ref (e.g. MCH-123456), Customer Name, Email, or Phone..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                style={{ flex: 1, minWidth: '260px' }}
              />

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`filter-pill ${orderStatusFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setOrderStatusFilter('all')}
                >
                  All ({ordersList.length})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${orderStatusFilter === 'pending' ? 'active' : ''}`}
                  onClick={() => setOrderStatusFilter('pending')}
                >
                  ⏳ Pending ({pendingOrders.length})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${orderStatusFilter === 'processing' ? 'active' : ''}`}
                  onClick={() => setOrderStatusFilter('processing')}
                >
                  ⚡ In Production ({processingOrders.length})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${orderStatusFilter === 'completed' ? 'active' : ''}`}
                  onClick={() => setOrderStatusFilter('completed')}
                >
                  ✅ Completed ({completedOrders.length})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${orderStatusFilter === 'cancelled' ? 'active' : ''}`}
                  onClick={() => setOrderStatusFilter('cancelled')}
                >
                  ❌ Cancelled ({cancelledOrders.length})
                </button>
              </div>
            </div>

            {/* Orders Feed */}
            {isLoadingOrders ? (
              <div className="admin-card-box" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                Loading real customer orders...
              </div>
            ) : ordersError ? (
              <div className="admin-card-box" style={{ textAlign: 'center', padding: '40px', color: '#f87171' }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⚠️</div>
                <h3 style={{ color: '#f87171', marginBottom: '8px' }}>Unable to retrieve orders</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
                  Database query failed: {ordersError}
                </p>
                <button type="button" className="btn btn-outline btn-sm" onClick={loadDashboardData}>
                  🔄 Retry Loading Orders
                </button>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="admin-card-box" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                {ordersList.length === 0
                  ? 'No customer orders found in the database yet. New customer orders will appear here automatically.'
                  : 'No orders match your filter criteria.'}
              </div>
            ) : (
              filteredOrders.map((ord) => (
                <OwnerOrderCard
                  key={ord.id}
                  ord={ord}
                  currentUser={user}
                  onStatusChange={handleStatusChange}
                  onVerifyPayment={handleVerifyPayment}
                  actions={
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginRight: '4px' }}>Status:</label>
                      <select
                        className="status-select"
                        value={ord.status || 'pending'}
                        disabled={updatingOrderId === ord.id}
                        onChange={(e) => handleStatusChange(ord.id, e.target.value)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '6px',
                          background: 'rgba(21, 11, 8, 0.9)',
                          border: '1px solid var(--border-gold)',
                          color: 'var(--gold-200)',
                          cursor: updatingOrderId === ord.id ? 'wait' : 'pointer',
                          opacity: updatingOrderId === ord.id ? 0.65 : 1
                        }}
                      >
                        <option value="pending">⏳ Pending Acceptance</option>
                        <option value="processing">⚡ In Production / Processing</option>
                        <option value="completed">✅ Completed & Delivered</option>
                        <option value="cancelled">❌ Cancelled</option>
                      </select>
                      {updatingOrderId === ord.id && (
                        <span style={{ fontSize: '0.76rem', color: 'var(--gold-300)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span>💾</span>
                          <span>Saving...</span>
                        </span>
                      )}
                      {statusUpdateError?.orderId === ord.id && (
                        <span style={{ fontSize: '0.75rem', color: '#f87171' }}>
                          ⚠️ {statusUpdateError.message}
                        </span>
                      )}
                    </div>
                  }
                />
              ))
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: CUSTOMERS DIRECTORY (PHASE 8)                           */}
        {/* ============================================================== */}
        {activeTab === 'customers' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--gold-300)', margin: 0, fontSize: '1.6rem' }}>
                  Registered Customer Directory
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '4px 0 0 0' }}>
                  Inspect registered customer profiles and their associated order history from <code>public.profiles</code>.
                </p>
              </div>

              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={loadDashboardData}
              >
                🔄 Refresh Directory
              </button>
            </div>

            {/* Customer Search Bar */}
            <div className="admin-card-box" style={{ marginBottom: '20px', padding: '16px 20px' }}>
              <input
                type="text"
                className="checkout-input"
                placeholder="🔍 Search customers by Name, Email, or Phone..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            {/* Customers Table */}
            <div className="admin-card-box">
              {customersList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  No customer profiles found in database.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Customer Name</th>
                        <th>Email Address</th>
                        <th>Phone</th>
                        <th>Role</th>
                        <th>Member Since</th>
                        <th>Orders Placed</th>
                        <th style={{ textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.map((cust) => {
                        const custEmail = cust.email?.toLowerCase().trim();
                        const custOrders = ordersList.filter(
                          (o) =>
                            (o.user_id && o.user_id === cust.id) ||
                            (o.customer_email && o.customer_email.toLowerCase().trim() === custEmail)
                        );

                        return (
                          <tr key={cust.id || cust.email}>
                            <td>
                              <strong style={{ color: 'var(--gold-300)' }}>
                                {cust.full_name || cust.name || 'Customer'}
                              </strong>
                            </td>
                            <td>{cust.email}</td>
                            <td>{cust.phone || '—'}</td>
                            <td>
                              <span
                                className="badge-tag"
                                style={{
                                  background:
                                    cust.role === 'owner'
                                      ? 'rgba(212, 163, 115, 0.25)'
                                      : cust.role === 'admin'
                                      ? 'rgba(96, 165, 250, 0.2)'
                                      : 'rgba(255, 255, 255, 0.08)',
                                  color:
                                    cust.role === 'owner'
                                      ? 'var(--gold-300)'
                                      : cust.role === 'admin'
                                      ? '#60a5fa'
                                      : 'var(--text-muted)',
                                  fontWeight: 700
                                }}
                              >
                                {(cust.role || 'user').toUpperCase()}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.84rem', color: 'var(--text-dim)' }}>
                              {cust.created_at ? new Date(cust.created_at).toLocaleDateString() : '—'}
                            </td>
                            <td>
                              <span style={{ fontWeight: 700, color: custOrders.length > 0 ? 'var(--gold-300)' : 'var(--text-dim)' }}>
                                {custOrders.length} order(s)
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                style={{ fontSize: '0.74rem', padding: '4px 8px' }}
                                onClick={() => setSelectedCustomerForHistory({ ...cust, orders: custOrders })}
                              >
                                View Orders ({custOrders.length})
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 5: DATABASE & SECURITY (SETTINGS)                         */}
        {/* ============================================================== */}
        {activeTab === 'settings' && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--gold-300)', margin: 0, fontSize: '1.6rem' }}>
                Database Health & Security Configuration
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '4px 0 0 0' }}>
                Supabase schema, Row Level Security policies, and verified administrator credentials.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              {/* Card 1: Verified Roles */}
              <div className="admin-card-box">
                <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--gold-300)', marginBottom: '14px', fontSize: '1.2rem' }}>
                  Verified Role Hierarchy
                </h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  Role-based access is authenticated via <code>public.profiles.role</code> for authenticated user UUIDs.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ background: 'rgba(21, 11, 8, 0.7)', border: '1px solid var(--border-gold)', borderRadius: 'var(--radius-sm)', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong>Store Owner Account</strong>
                      <span className="badge-tag badge-gold">ROLE: OWNER</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                      Full product catalog CRUD, pricing management, order fulfillment, and metrics view.
                    </div>
                  </div>

                  <div style={{ background: 'rgba(21, 11, 8, 0.7)', border: '1px solid var(--border-gold)', borderRadius: 'var(--radius-sm)', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong>Store Administrator Account</strong>
                      <span className="badge-tag" style={{ background: 'rgba(96, 165, 250, 0.2)', color: '#60a5fa' }}>ROLE: ADMIN</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                      Inventory management, order tracking, and receipt access.
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Migration Script Instructions */}
              <div className="admin-card-box">
                <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--gold-300)', marginBottom: '14px', fontSize: '1.2rem' }}>
                  SQL Migration Helper
                </h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                  A safe, reviewable migration script has been generated in your repository:
                </p>
                <div style={{ background: '#120806', border: '1px solid var(--border-gold)', borderRadius: 'var(--radius-sm)', padding: '12px', fontSize: '0.84rem', fontFamily: 'monospace', color: 'var(--gold-300)', marginBottom: '14px' }}>
                  supabase-owner-dashboard-migration.sql
                </div>
                <ul style={{ fontSize: '0.82rem', color: 'var(--text-dim)', paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <li>Grants schema access to <code>authenticated</code>, <code>anon</code>, and <code>service_role</code></li>
                  <li>Ensures both <code>available</code> and <code>is_available</code> columns exist</li>
                  <li>Adds RLS policies permitting Owner & Admin product management</li>
                  <li>Safely seeds demo prices for all 20 catalogue products matching <code>brandConfig.js</code></li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* MODAL: ADD / EDIT PRODUCT                                      */}
      {/* ============================================================== */}
      <OwnerProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onSave={handleSaveProductModal}
        product={editingProduct}
        existingKeys={existingProductKeys}
      />

      {/* ============================================================== */}
      {/* MODAL: CONFIRM REMOVE / ARCHIVE PRODUCT                        */}
      {/* ============================================================== */}
      {deleteConfirmProduct && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(6px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            className="admin-card-box"
            style={{
              maxWidth: '520px',
              width: '100%',
              background: '#1e100b',
              border: '1px solid #ef4444',
              borderRadius: 'var(--radius-md)',
              padding: '24px'
            }}
          >
            <h3 style={{ fontFamily: 'var(--font-serif)', color: '#fca5a5', margin: '0 0 12px 0' }}>
              ⚠️ Remove Product from Catalogue
            </h3>
            <p style={{ color: 'var(--text-cream)', fontSize: '0.92rem', marginBottom: '12px' }}>
              Are you sure you want to remove <strong>"{deleteConfirmProduct.name}"</strong>?
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginBottom: '20px' }}>
              <strong>Historical Order Protection:</strong> If this product was ordered previously by any customer, it will be safely <em>Archived & marked Out of Stock</em> to preserve all previous order receipts and invoice line items.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-outline"
                disabled={isDeleting}
                onClick={() => setDeleteConfirmProduct(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-gold"
                style={{ background: '#dc2626', borderColor: '#dc2626', color: '#fff' }}
                disabled={isDeleting}
                onClick={handleConfirmDelete}
              >
                {isDeleting ? 'Processing...' : 'Confirm Removal / Archive'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CUSTOMER SPECIFIC ORDER HISTORY                         */}
      {/* ============================================================== */}
      {selectedCustomerForHistory && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(6px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedCustomerForHistory(null);
          }}
        >
          <div
            className="admin-card-box"
            style={{
              maxWidth: '720px',
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              background: '#1e100b',
              border: '1px solid var(--border-gold)',
              borderRadius: 'var(--radius-md)',
              padding: '26px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-gold)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--gold-300)', margin: 0 }}>
                  Customer Orders: {selectedCustomerForHistory.full_name || selectedCustomerForHistory.name || 'Customer'}
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                  {selectedCustomerForHistory.email} • {selectedCustomerForHistory.phone || 'No phone'}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setSelectedCustomerForHistory(null)}
              >
                ✕
              </button>
            </div>

            {selectedCustomerForHistory.orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                This customer has not placed any orders yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {selectedCustomerForHistory.orders.map((ord) => (
                  <div
                    key={ord.id}
                    style={{
                      background: 'rgba(21, 11, 8, 0.8)',
                      border: '1px solid var(--border-gold)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '10px'
                    }}
                  >
                    <div>
                      <strong style={{ color: 'var(--gold-300)', fontFamily: 'var(--font-serif)' }}>
                        {ord.order_number || ord.id}
                      </strong>
                      <div style={{ fontSize: '0.84rem', color: 'var(--text-cream)', marginTop: '2px' }}>
                        {ord.product_name}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                        {ord.created_at ? new Date(ord.created_at).toLocaleDateString() : 'Recent'} • {ord.delivery_type === 'delivery' ? '🚚 Delivery' : '🍫 Pickup'}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-serif)', color: 'var(--gold-300)', fontWeight: 700 }}>
                        {ord.total_amount > 0 ? `₹${Number(ord.total_amount).toLocaleString('en-IN')}` : 'Quotation'}
                      </div>
                      <span
                        className="badge-tag"
                        style={{
                          fontSize: '0.72rem',
                          textTransform: 'uppercase',
                          marginTop: '4px',
                          display: 'inline-block'
                        }}
                      >
                        {ord.status || 'Pending'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
