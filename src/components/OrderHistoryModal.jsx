import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function OrderHistoryModal({ isOpen, onClose, onNavigate }) {
  const { user, getUserOrders } = useAuth();

  if (!isOpen) return null;

  const orders = getUserOrders();

  const statusStyles = {
    pending: { background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.4)' },
    processing: { background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.4)' },
    completed: { background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)' },
    cancelled: { background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)' }
  };

  return (
    <div
      className="dialog-overlay open"
      id="order-history-modal"
      aria-hidden={!isOpen}
      onClick={(e) => {
        if (e.target.id === 'order-history-modal') onClose();
      }}
    >
      <div
        className="dialog-card"
        style={{ maxWidth: '650px', width: '92%', maxHeight: '85vh', overflowY: 'auto' }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--border-gold-strong)',
            paddingBottom: '14px',
            marginBottom: '18px'
          }}
        >
          <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--gold-300)', margin: 0, fontSize: '1.4rem' }}>
            📦 My Order History
          </h3>
          <button
            type="button"
            id="close-order-history-modal"
            className="dialog-close-btn"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--gold-400)',
              fontSize: '1.5rem',
              cursor: 'pointer'
            }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div id="order-history-content">
          {!user ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '14px' }}>
                Please login to view your order history.
              </p>
              <button
                type="button"
                className="btn btn-gold btn-sm"
                onClick={() => {
                  onClose();
                  if (onNavigate) onNavigate('#login');
                }}
              >
                Login Now
              </button>
            </div>
          ) : orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 10px' }}>
              <div style={{ fontSize: '2.2rem', marginBottom: '10px' }}>🧾</div>
              <p style={{ color: 'var(--gold-300)', fontWeight: 600, fontSize: '1.05rem', marginBottom: '6px' }}>
                No orders found yet
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '18px' }}>
                Place your first order using the Custom Order enquiry form!
              </p>
              <button
                type="button"
                className="btn btn-gold btn-sm"
                onClick={() => {
                  onClose();
                  if (onNavigate) onNavigate('#custom-order');
                }}
              >
                Order Now
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {orders.map((ord) => {
                const style = statusStyles[ord.status] || statusStyles.pending;
                const formattedDate = ord.created_at
                  ? new Date(ord.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })
                  : '';

                return (
                  <div
                    key={ord.id || ord.order_number}
                    style={{
                      background: 'rgba(21, 11, 8, 0.7)',
                      border: '1px solid var(--border-gold)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '8px'
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 700, color: 'var(--gold-300)', fontSize: '1.05rem' }}>
                          {ord.order_number}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginLeft: '10px' }}>
                          {formattedDate}
                        </span>
                      </div>
                      <span
                        style={{
                          padding: '2px 10px',
                          borderRadius: '12px',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          ...style
                        }}
                      >
                        {ord.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-cream)', marginBottom: '4px' }}>
                      <strong>Category:</strong> {ord.category || 'General'}
                    </div>
                    <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      <strong>Quantity / Option:</strong> {ord.quantity || 'Standard'}
                    </div>
                    {ord.preferred_date && (
                      <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                        <strong>Preferred Date:</strong> {ord.preferred_date}
                      </div>
                    )}
                    {ord.custom_message && (
                      <div
                        style={{
                          fontSize: '0.84rem',
                          color: 'var(--text-dim)',
                          fontStyle: 'italic',
                          marginTop: '6px',
                          background: 'rgba(0,0,0,0.3)',
                          padding: '8px',
                          borderRadius: '4px'
                        }}
                      >
                        "{ord.custom_message}"
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
