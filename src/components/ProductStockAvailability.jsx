import React from 'react';

export default function ProductStockAvailability({ productsStock, onToggleStock }) {
  return (
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
                    onClick={() => onToggleStock(prod.id, prod.inStock)}
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
  );
}
