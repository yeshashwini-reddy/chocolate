import React from 'react';

export default function OwnerOrderCard({ ord, onStatusChange, actions }) {
  const refId = ord.order_number || (ord.id ? ord.id.slice(0, 8).toUpperCase() : 'MCH-ORD');
  const cleanPhone = ord.customer_phone ? ord.customer_phone.replace(/[^0-9]/g, '') : '';
  const formattedDate = ord.created_at ? new Date(ord.created_at).toLocaleDateString() : 'Recent';

  const statusColor =
    ord.status === 'completed'
      ? '#34d399'
      : ord.status === 'cancelled'
      ? '#f87171'
      : ord.status === 'processing' || ord.status === 'accepted' || ord.status === 'awaiting'
      ? '#60a5fa'
      : 'var(--gold-300)';

  return (
    <div
      className="admin-card-box"
      style={{
        marginBottom: '20px',
        background: 'rgba(21, 11, 8, 0.75)',
        border: '1px solid var(--border-gold)',
        borderRadius: 'var(--radius-md)',
        padding: '20px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
      }}
    >
      {/* Header Info */}
      <div
        style={{
          display: 'flex',
          justify: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: '1px solid var(--border-gold)',
          paddingBottom: '14px',
          marginBottom: '16px'
        }}
      >
        <div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Order / Request Reference
          </span>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--gold-300)', fontFamily: 'var(--font-serif)' }}>
            {refId}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span
            className="badge-tag"
            style={{
              background: 'rgba(212, 163, 115, 0.15)',
              border: `1px solid ${statusColor}`,
              color: statusColor,
              textTransform: 'uppercase',
              fontWeight: 700,
              padding: '4px 10px',
              fontSize: '0.78rem'
            }}
          >
            ● {ord.status || 'pending'}
          </span>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            Submitted: {formattedDate}
          </div>
        </div>
      </div>

      {/* Grid of Details */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--gold-400)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '2px' }}>
            Customer Name
          </div>
          <div style={{ color: 'var(--text-cream)', fontWeight: 600, fontSize: '0.95rem' }}>
            {ord.customer_name || 'Customer'}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--gold-400)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '2px' }}>
            Phone / WhatsApp
          </div>
          <div style={{ color: 'var(--text-cream)', fontSize: '0.92rem' }}>
            {cleanPhone ? (
              <a
                href={`https://wa.me/${cleanPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#34d399', textDecoration: 'underline', fontWeight: 600 }}
                title="Chat directly on WhatsApp"
              >
                💬 {ord.customer_phone}
              </a>
            ) : (
              ord.customer_phone || '—'
            )}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--gold-400)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '2px' }}>
            Email Address
          </div>
          <div style={{ color: 'var(--text-cream)', fontSize: '0.9rem' }}>{ord.customer_email || '—'}</div>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--gold-400)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '2px' }}>
            Occasion
          </div>
          <div style={{ color: 'var(--text-cream)', fontSize: '0.92rem' }}>{ord.occasion || 'Celebration'}</div>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--gold-400)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '2px' }}>
            Product Interested In
          </div>
          <div style={{ color: 'var(--gold-300)', fontWeight: 600, fontSize: '0.95rem' }}>
            {ord.product_name || ord.category || 'Handcrafted Confectionery'}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--gold-400)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '2px' }}>
            Estimated Quantity
          </div>
          <div style={{ color: 'var(--text-cream)', fontSize: '0.92rem' }}>{ord.quantity || 'Standard'}</div>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--gold-400)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '2px' }}>
            Preferred Date
          </div>
          <div style={{ color: 'var(--text-cream)', fontSize: '0.92rem' }}>{ord.preferred_date || 'Flexible timing'}</div>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--gold-400)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '2px' }}>
            Pricing / Amount
          </div>
          <div style={{ color: 'var(--gold-300)', fontWeight: 700, fontSize: '1.05rem' }}>
            {ord.total_amount ? `₹${ord.total_amount}` : 'Quote on request'}
          </div>
        </div>
      </div>

      {/* Customisation Details & Message Block */}
      {(ord.customisation_details || ord.special_message) && (
        <div
          style={{
            background: 'rgba(15, 8, 6, 0.7)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-gold)',
            marginBottom: '16px'
          }}
        >
          {ord.customisation_details && (
            <div style={{ marginBottom: ord.special_message ? '8px' : 0 }}>
              <span style={{ color: 'var(--gold-300)', fontWeight: 600, fontSize: '0.84rem' }}>
                🎨 Customisation Details & Theme:{' '}
              </span>
              <span style={{ color: 'var(--text-cream)', fontSize: '0.88rem' }}>{ord.customisation_details}</span>
            </div>
          )}
          {ord.special_message && (
            <div>
              <span style={{ color: 'var(--gold-300)', fontWeight: 600, fontSize: '0.84rem' }}>
                💬 Additional Message / Questions:{' '}
              </span>
              <span style={{ color: 'var(--text-cream)', fontSize: '0.88rem' }}>{ord.special_message}</span>
            </div>
          )}
        </div>
      )}

      {/* Custom Actions */}
      {actions && (
        <div
          style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            alignItems: 'center',
            paddingTop: '12px',
            borderTop: '1px solid rgba(212, 163, 115, 0.2)'
          }}
        >
          {actions}
        </div>
      )}
    </div>
  );
}
