import React from 'react';

export default function OrdersEnquiries({ ordersList, isLoading, onRefresh, onStatusChange }) {
  return (
    <div className="admin-card-box">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--gold-300)', margin: 0 }}>
          Customer Orders & Enquiries
        </h3>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          style={{ fontSize: '0.78rem', padding: '4px 10px' }}
          onClick={onRefresh}
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
                        onChange={(e) => onStatusChange(ord.id, e.target.value)}
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
  );
}
