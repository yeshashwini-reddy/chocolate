import React from 'react';

export default function RegisteredCustomers({ customersList }) {
  return (
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
  );
}
