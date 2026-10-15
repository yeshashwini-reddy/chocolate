import React, { useState } from 'react';
import {
  downloadReceiptPdf,
  printReceiptPdf,
  isOrderPaymentVerified,
  fetchOrderForReceipt,
  formatRupees
} from '../services/receiptService';

export default function OwnerOrderCard({ ord, onStatusChange, onVerifyPayment, actions, currentUser }) {
  const [isProcessingReceipt, setIsProcessingReceipt] = useState(false);
  const [receiptError, setReceiptError] = useState(null);

  const refId = ord.order_number || (ord.id ? ord.id.slice(0, 8).toUpperCase() : 'MCH-ORD');
  const cleanPhone = ord.customer_phone ? ord.customer_phone.replace(/[^0-9]/g, '') : '';
  const formattedDate = ord.created_at ? new Date(ord.created_at).toLocaleDateString() : 'Recent';
  const isPaid = isOrderPaymentVerified(ord);
  const totalAmt = Number(ord.total_amount) || 0;

  const statusColor =
    ord.status === 'completed'
      ? '#34d399'
      : ord.status === 'cancelled'
      ? '#f87171'
      : ord.status === 'processing' || ord.status === 'accepted' || ord.status === 'awaiting'
      ? '#60a5fa'
      : 'var(--gold-300)';

  const handleDownload = async () => {
    try {
      setReceiptError(null);
      setIsProcessingReceipt(true);
      const fullOrder = await fetchOrderForReceipt(ord.id || ord.order_number, currentUser || { role: 'owner' });
      await downloadReceiptPdf(fullOrder);
    } catch (err) {
      console.error('[OwnerOrderCard] Download error:', err);
      setReceiptError(err.message || 'Failed to download receipt.');
    } finally {
      setIsProcessingReceipt(false);
    }
  };

  const handlePrint = async () => {
    try {
      setReceiptError(null);
      setIsProcessingReceipt(true);
      const fullOrder = await fetchOrderForReceipt(ord.id || ord.order_number, currentUser || { role: 'owner' });
      await printReceiptPdf(fullOrder);
    } catch (err) {
      console.error('[OwnerOrderCard] Print error:', err);
      setReceiptError(err.message || 'Failed to print receipt.');
    } finally {
      setIsProcessingReceipt(false);
    }
  };

  return (
    <div
      className="admin-card-box"
      style={{
        marginBottom: '20px',
        background: 'rgba(21, 11, 8, 0.75)',
        border: isPaid ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid var(--border-gold)',
        borderRadius: 'var(--radius-md)',
        padding: '20px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
      }}
    >
      {/* Header Info */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
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

        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Payment Badge */}
            <span
              style={{
                background: isPaid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                border: isPaid ? '1px solid #34d399' : '1px solid #f59e0b',
                color: isPaid ? '#34d399' : '#f59e0b',
                textTransform: 'uppercase',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '8px',
                fontSize: '0.74rem'
              }}
            >
              ● {isPaid ? 'Payment Verified' : 'Payment Pending'}
            </span>

            {/* Fulfillment Status Badge */}
            <span
              className="badge-tag"
              style={{
                background: 'rgba(212, 163, 115, 0.15)',
                border: `1px solid ${statusColor}`,
                color: statusColor,
                textTransform: 'uppercase',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '8px',
                fontSize: '0.74rem'
              }}
            >
              {ord.status || 'pending'}
            </span>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            Submitted: {formattedDate}
          </div>
        </div>
      </div>

      {receiptError && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#fca5a5',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '0.82rem',
            marginBottom: '14px'
          }}
        >
          ⚠️ {receiptError}
        </div>
      )}

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
            Total / Pricing
          </div>
          <div style={{ color: 'var(--gold-300)', fontWeight: 700, fontSize: '1.05rem' }}>
            {totalAmt > 0 ? formatRupees(totalAmt) : 'Quote on request'}
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

      {/* Official Receipt Management Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          padding: '12px 14px',
          background: 'rgba(10, 5, 4, 0.5)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid rgba(212, 163, 115, 0.15)',
          marginBottom: '14px'
        }}
      >
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          {isPaid ? (
            <span style={{ color: '#34d399', fontWeight: 600 }}>
              ✓ Verified Paid Receipt (Receipt #: {ord.receipt_number || `RCPT-${refId}`})
            </span>
          ) : (
            <span>
              Payment Method: <strong>{ord.payment_method || 'Cash on Delivery / Direct'}</strong> (Unsettled)
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {isPaid ? (
            <>
              <button
                type="button"
                className="btn btn-gold btn-sm"
                disabled={isProcessingReceipt}
                onClick={handleDownload}
                style={{ fontSize: '0.76rem', padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <span>📄</span>
                <span>{isProcessingReceipt ? 'Generating...' : 'Download Receipt'}</span>
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={isProcessingReceipt}
                onClick={handlePrint}
                style={{ fontSize: '0.76rem', padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <span>🖨️</span>
                <span>Print</span>
              </button>
            </>
          ) : (
            onVerifyPayment && (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ borderColor: '#34d399', color: '#34d399', fontSize: '0.76rem', padding: '5px 12px' }}
                onClick={() => onVerifyPayment(ord.id)}
                title="Mark this order as paid after receiving cash, UPI, or transfer"
              >
                💵 Verify & Mark as Paid
              </button>
            )
          )}
        </div>
      </div>

      {/* Custom Actions (e.g. Accept, Cancel, Complete) */}
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
