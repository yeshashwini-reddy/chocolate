import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BRAND_CONFIG } from '../config/brandConfig';
import { supabase } from '../supabaseClient';
import OwnerOrderCard from './OwnerOrderCard';
import ProductStockAvailability from './ProductStockAvailability';
import RegisteredCustomers from './RegisteredCustomers';

export default function OwnerDashboard({ onNavigate }) {
  const { user, orders: fallbackOrders, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('custom');
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
      console.warn('[OwnerDashboard] Product stock update exception:', err);
    }
  };

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
        console.warn('[OwnerDashboard] Status update warning:', error.message);
      }
    } catch (err) {
      console.warn('[OwnerDashboard] Status update exception:', err);
    }
  };

  const loadOwnerData = async () => {
    setIsLoading(true);
    let errorMessages = [];

    try {
      // 1. Real Supabase Orders
      const { data: dbOrders, error: ordErr } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordErr || !dbOrders || dbOrders.length === 0) {
        if (ordErr) {
          console.warn('[OwnerDashboard] Orders fetch note:', ordErr.message);
          errorMessages.push(`Orders: ${ordErr.message}`);
        }
        setOrdersList(fallbackOrders || []);
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

  // Filter order categories for the 4 primary summary sections
  const pendingOrders = ordersList.filter((o) => o.status === 'pending' || !o.status);
  const awaitingOrders = ordersList.filter((o) => o.status === 'processing' || o.status === 'accepted' || o.status === 'awaiting');
  const completedOrders = ordersList.filter((o) => o.status === 'completed');
  const cancelledOrders = ordersList.filter((o) => o.status === 'cancelled');

  const totalCustomers = customersList.length;

  // Real database calculation: Revenue generated from completed orders
  const totalRevenue = completedOrders.reduce(
    (sum, o) => sum + (Number(o.total_amount) || 0),
    0
  );

  return (
    <div style={{ background: '#150b08', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
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

        {/* 4 PRIMARY SUMMARY CARDS (EXCLUSIVELY ONLY THESE 4 CARDS AT TOP) */}
        <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {/* 1. COMPLETED ORDERS */}
          <div
            className={`metric-card ${activeTab === 'completed' ? 'active-metric' : ''}`}
            style={{ cursor: 'pointer', transition: 'transform 0.2s ease, border-color 0.2s ease' }}
            onClick={() => setActiveTab('completed')}
            title="Click to view Completed Orders"
          >
            <div className="metric-icon">✅</div>
            <div>
              <div className="metric-val">{completedOrders.length}</div>
              <div className="metric-lbl">Completed Orders</div>
            </div>
          </div>

          {/* 2. AWAITING ORDERS */}
          <div
            className={`metric-card ${activeTab === 'awaiting' ? 'active-metric' : ''}`}
            style={{ cursor: 'pointer', transition: 'transform 0.2s ease, border-color 0.2s ease' }}
            onClick={() => setActiveTab('awaiting')}
            title="Click to view Awaiting Orders"
          >
            <div className="metric-icon">⏳</div>
            <div>
              <div className="metric-val">{awaitingOrders.length}</div>
              <div className="metric-lbl">Awaiting Orders</div>
            </div>
          </div>

          {/* 3. CANCELLED ORDERS */}
          <div
            className={`metric-card ${activeTab === 'cancelled' ? 'active-metric' : ''}`}
            style={{ cursor: 'pointer', transition: 'transform 0.2s ease, border-color 0.2s ease' }}
            onClick={() => setActiveTab('cancelled')}
            title="Click to view Cancelled Orders"
          >
            <div className="metric-icon">❌</div>
            <div>
              <div className="metric-val">{cancelledOrders.length}</div>
              <div className="metric-lbl">Cancelled Orders</div>
            </div>
          </div>

          {/* 4. REVENUE GENERATED */}
          <div
            className={`metric-card ${activeTab === 'revenue' ? 'active-metric' : ''}`}
            style={{ cursor: 'pointer', transition: 'transform 0.2s ease, border-color 0.2s ease' }}
            onClick={() => setActiveTab('revenue')}
            title="Click to view Revenue Generated"
          >
            <div className="metric-icon">💰</div>
            <div>
              <div className="metric-val">{totalRevenue > 0 ? `₹${totalRevenue.toLocaleString()}` : '₹0'}</div>
              <div className="metric-lbl">Revenue Generated</div>
            </div>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="admin-tabs" style={{ marginTop: '24px' }}>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'custom' ? 'active' : ''}`}
            onClick={() => setActiveTab('custom')}
          >
            ✨ Custom Orders ({pendingOrders.length})
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'awaiting' ? 'active' : ''}`}
            onClick={() => setActiveTab('awaiting')}
          >
            ⏳ Awaiting Orders ({awaitingOrders.length})
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            ✅ Completed Orders ({completedOrders.length})
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'cancelled' ? 'active' : ''}`}
            onClick={() => setActiveTab('cancelled')}
          >
            ❌ Cancelled Orders ({cancelledOrders.length})
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'revenue' ? 'active' : ''}`}
            onClick={() => setActiveTab('revenue')}
          >
            💰 Revenue Generated
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            📦 Product Stock & Availability ({productsStock.length})
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'customers' ? 'active' : ''}`}
            onClick={() => setActiveTab('customers')}
          >
            👥 Registered Customers ({totalCustomers})
          </button>
        </div>

        {/* TABS CONTENT */}

        {/* 1. CUSTOM ORDERS TAB (PENDING REQUESTS WORKFLOW) */}
        {activeTab === 'custom' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--gold-300)', margin: 0 }}>
                  Custom Orders & Celebration Enquiries ({pendingOrders.length})
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '4px 0 0 0' }}>
                  Review customer requests. Click <strong>[ ACCEPT ORDER ]</strong> to move to Awaiting Orders or <strong>[ CANCEL ORDER ]</strong> to mark as Cancelled.
                </p>
              </div>
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
              <div className="admin-card-box" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading custom orders from database...
              </div>
            ) : pendingOrders.length === 0 ? (
              <div className="admin-card-box" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No pending custom orders or new enquiries at the moment.
              </div>
            ) : (
              pendingOrders.map((ord) => (
                <OwnerOrderCard
                  key={ord.id}
                  ord={ord}
                  onStatusChange={handleStatusChange}
                  actions={
                    <>
                      <button
                        type="button"
                        className="btn btn-gold btn-sm"
                        onClick={() => handleStatusChange(ord.id, 'processing')}
                      >
                        ✅ ACCEPT ORDER
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ borderColor: '#f87171', color: '#f87171' }}
                        onClick={() => handleStatusChange(ord.id, 'cancelled')}
                      >
                        ❌ CANCEL ORDER
                      </button>
                    </>
                  }
                />
              ))
            )}
          </div>
        )}

        {/* 2. AWAITING ORDERS TAB */}
        {activeTab === 'awaiting' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--gold-300)', margin: 0 }}>
                  Awaiting Orders & Orders In Production ({awaitingOrders.length})
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '4px 0 0 0' }}>
                  Orders accepted by Owner currently in production or awaiting final fulfillment.
                </p>
              </div>
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
              <div className="admin-card-box" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading awaiting orders from database...
              </div>
            ) : awaitingOrders.length === 0 ? (
              <div className="admin-card-box" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No orders currently awaiting completion.
              </div>
            ) : (
              awaitingOrders.map((ord) => (
                <OwnerOrderCard
                  key={ord.id}
                  ord={ord}
                  onStatusChange={handleStatusChange}
                  actions={
                    <>
                      <button
                        type="button"
                        className="btn btn-gold btn-sm"
                        onClick={() => handleStatusChange(ord.id, 'completed')}
                      >
                        ✨ MARK AS COMPLETED
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ borderColor: '#f87171', color: '#f87171' }}
                        onClick={() => handleStatusChange(ord.id, 'cancelled')}
                      >
                        ❌ CANCEL ORDER
                      </button>
                    </>
                  }
                />
              ))
            )}
          </div>
        )}

        {/* 3. COMPLETED ORDERS TAB */}
        {activeTab === 'completed' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--gold-300)', margin: 0 }}>
                  Completed Orders Directory ({completedOrders.length})
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '4px 0 0 0' }}>
                  Fulfilled orders permanently recorded in database history.
                </p>
              </div>
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
              <div className="admin-card-box" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading completed orders...
              </div>
            ) : completedOrders.length === 0 ? (
              <div className="admin-card-box" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No completed orders recorded yet.
              </div>
            ) : (
              completedOrders.map((ord) => (
                <OwnerOrderCard
                  key={ord.id}
                  ord={ord}
                  onStatusChange={handleStatusChange}
                />
              ))
            )}
          </div>
        )}

        {/* 4. CANCELLED ORDERS TAB */}
        {activeTab === 'cancelled' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--gold-300)', margin: 0 }}>
                  Cancelled Orders Roster ({cancelledOrders.length})
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '4px 0 0 0' }}>
                  Orders marked as cancelled. Records are preserved in the database.
                </p>
              </div>
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
              <div className="admin-card-box" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading cancelled orders...
              </div>
            ) : cancelledOrders.length === 0 ? (
              <div className="admin-card-box" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No cancelled orders recorded.
              </div>
            ) : (
              cancelledOrders.map((ord) => (
                <OwnerOrderCard
                  key={ord.id}
                  ord={ord}
                  onStatusChange={handleStatusChange}
                  actions={
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => handleStatusChange(ord.id, 'processing')}
                    >
                      🔄 Re-accept Order
                    </button>
                  }
                />
              ))
            )}
          </div>
        )}

        {/* 5. REVENUE GENERATED TAB */}
        {activeTab === 'revenue' && (
          <div>
            <div className="admin-card-box" style={{ marginBottom: '20px', textAlign: 'center', background: 'rgba(212, 163, 115, 0.08)' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Total Accumulated Revenue
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--gold-300)', fontFamily: 'var(--font-serif)', marginTop: '4px' }}>
                ₹{totalRevenue.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginTop: '6px' }}>
                Calculated from {completedOrders.length} completed order(s)
              </div>
            </div>

            <div className="admin-card-box">
              <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--gold-300)', marginBottom: '16px' }}>
                Revenue Breakdown & Completed Orders
              </h3>

              {completedOrders.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No revenue recorded from completed orders yet.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Ref ID</th>
                        <th>Customer</th>
                        <th>Product / Order</th>
                        <th>Quantity</th>
                        <th>Amount</th>
                        <th>Completion Date</th>
                        <th>Payment Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedOrders.map((ord) => {
                        const refId = ord.order_number || (ord.id ? ord.id.slice(0, 8).toUpperCase() : 'MCH-ORD');
                        return (
                          <tr key={ord.id || refId}>
                            <td>
                              <strong style={{ color: 'var(--gold-300)' }}>{refId}</strong>
                            </td>
                            <td>{ord.customer_name || 'Customer'}</td>
                            <td>{ord.product_name || ord.category || 'Confectionery'}</td>
                            <td>{ord.quantity || 'Standard'}</td>
                            <td>
                              <strong style={{ color: 'var(--gold-300)' }}>
                                {ord.total_amount ? `₹${ord.total_amount}` : 'Quote'}
                              </strong>
                            </td>
                            <td style={{ color: 'var(--text-dim)', fontSize: '0.84rem' }}>
                              {ord.updated_at ? new Date(ord.updated_at).toLocaleDateString() : 'Recent'}
                            </td>
                            <td>
                              <span style={{ color: '#34d399', fontWeight: 700, fontSize: '0.82rem' }}>
                                ● RECORDED / COMPLETED
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
          </div>
        )}

        {/* 6. PRODUCTS STOCK & AVAILABILITY TAB */}
        {activeTab === 'products' && (
          <ProductStockAvailability
            productsStock={productsStock}
            onToggleStock={handleToggleStock}
          />
        )}

        {/* 7. REGISTERED CUSTOMERS TAB */}
        {activeTab === 'customers' && (
          <RegisteredCustomers
            customersList={customersList}
          />
        )}
      </main>
    </div>
  );
}
