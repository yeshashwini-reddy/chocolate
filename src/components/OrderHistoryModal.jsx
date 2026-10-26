import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase, getTabId } from '../supabaseClient';
import { getOrderStatusConfig } from '../services/orderStatus';
import {
  downloadReceiptPdf,
  printReceiptPdf,
  isOrderPaymentVerified,
  fetchOrderForReceipt,
  formatRupees,
  getPaymentMethodDisplay,
  getPaymentStatusDisplay
} from '../services/receiptService';
import { isRazorpayConfigured, openRazorpayCheckout } from '../services/paymentService';

export default function OrderHistoryModal({ isOpen, onClose, onNavigate }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [receiptLoadingId, setReceiptLoadingId] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [retryingPaymentId, setRetryingPaymentId] = useState(null);

  // Fetch real database orders strictly for the authenticated customer
  const loadCustomerOrders = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setActionError(null);
    setFetchError(null);

    try {
      // Query strictly scoped to the authenticated customer's user_id according to RLS policies
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[OrderHistoryModal] Supabase query error:', error.message);
        setFetchError(error.message);
        setOrders([]);
      } else {
        setFetchError(null);
        setOrders(data || []);
      }
    } catch (err) {
      console.error('[OrderHistoryModal] Fetch exception:', err);
      setFetchError(err.message || 'Failed to load orders.');
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !user?.id) return;

    // 1. Immediate fetch upon modal open
    loadCustomerOrders();

    // 2. Realtime subscription strictly filtered to this authenticated customer's orders
    let channel;
    try {
      const tabId = getTabId();
      const channelName = `customer_orders_${user.id}_${tabId}_${Date.now()}`;
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            loadCustomerOrders();
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('[OrderHistoryModal] Realtime setup note:', e);
    }

    // 3. Reliable refresh-on-focus fallback
    const handleWindowFocus = () => {
      loadCustomerOrders();
    };
    window.addEventListener('focus', handleWindowFocus);

    // 4. Clean up channel subscription and focus listener
    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [isOpen, user?.id]);

  const handleDownloadReceipt = async (ord) => {
    setActionError(null);
    try {
      setReceiptLoadingId(ord.id || ord.order_number);
      // Use existing verified items if already loaded, or fetch full order snapshot
      const fullOrder = (ord.order_items && ord.order_items.length > 0)
        ? { ...ord, items: ord.order_items }
        : await fetchOrderForReceipt(ord.id || ord.order_number, user);
      await downloadReceiptPdf(fullOrder);
    } catch (err) {
      console.error('[OrderHistoryModal] Document download error:', err);
      setActionError(err.message || 'Failed to download document. Please try again.');
    } finally {
      setReceiptLoadingId(null);
    }
  };

  const handlePrintReceipt = async (ord) => {
    setActionError(null);
    try {
      setReceiptLoadingId(ord.id || ord.order_number);
      const fullOrder = (ord.order_items && ord.order_items.length > 0)
        ? { ...ord, items: ord.order_items }
        : await fetchOrderForReceipt(ord.id || ord.order_number, user);
      await printReceiptPdf(fullOrder);
    } catch (err) {
      console.error('[OrderHistoryModal] Document print error:', err);
      setActionError(err.message || 'Failed to prepare document for printing.');
    } finally {
      setReceiptLoadingId(null);
    }
  };

  const handlePayOnline = async (ord) => {
    if (!ord?.id || retryingPaymentId) return;
    setActionError(null);
    setRetryingPaymentId(ord.id);

    try {
      const { data: rzpOrderData, error: rzpCreateErr } = await supabase.functions.invoke('create-razorpay-order', {
        body: {
          orderId: ord.id,
          orderNumber: ord.order_number
        }
      });

      if (rzpCreateErr || !rzpOrderData?.razorpay_order_id) {
        let errMsg = rzpOrderData?.error;
        if (!errMsg && rzpCreateErr?.context) {
          try {
            const errJson = await rzpCreateErr.context.json();
            errMsg = errJson?.error || errJson?.details || errJson?.message;
          } catch (_) {}
        }
        throw new Error(errMsg || rzpCreateErr?.message || 'Failed to initialize payment gateway.');
      }

      openRazorpayCheckout({
        orderNumber: ord.order_number,
        razorpayOrderId: rzpOrderData.razorpay_order_id,
        amountInRupees: ord.total_amount,
        customerName: ord.customer_name || user?.name || '',
        customerEmail: ord.customer_email || user?.email || '',
        customerPhone: ord.customer_phone || user?.phone || '',
        onSuccess: async (rzpResponse) => {
          try {
            const { data: verifyRes, error: verifyErr } = await supabase.functions.invoke('verify-razorpay-payment', {
              body: {
                orderId: ord.id,
                orderNumber: ord.order_number,
                razorpay_order_id: rzpResponse.razorpay_order_id,
                razorpay_payment_id: rzpResponse.razorpay_payment_id,
                razorpay_signature: rzpResponse.razorpay_signature
              }
            });

            if (verifyErr || !verifyRes?.verified) {
              let vMsg = verifyRes?.error;
              if (!vMsg && verifyErr?.context) {
                try {
                  const vJson = await verifyErr.context.json();
                  vMsg = vJson?.details ? `${vJson.error}: ${vJson.details}` : (vJson?.error || vJson?.details || vJson?.message);
                } catch (_) {}
              }
              setActionError(vMsg || 'Payment verification is pending server confirmation.');
            } else {
              // Optimistically update the specific order state immediately
              setOrders((prev) =>
                prev.map((o) =>
                  (o.id === ord.id || o.order_number === ord.order_number)
                    ? {
                        ...o,
                        payment_status: 'paid',
                        paid_at: verifyRes.paid_at || new Date().toISOString(),
                        receipt_number: verifyRes.receipt_number || `RCPT-${ord.order_number}`,
                        payment_reference: rzpResponse.razorpay_payment_id,
                        razorpay_payment_id: rzpResponse.razorpay_payment_id,
                        razorpay_order_id: rzpResponse.razorpay_order_id,
                      }
                    : o
                )
              );
              // Re-fetch authoritative database records
              await loadCustomerOrders();
            }
          } catch (verErr) {
            console.error('[OrderHistoryModal] Payment verification error:', verErr);
          }
        },
        onFailure: (err) => {
          console.warn('[OrderHistoryModal] Payment not completed:', err);
        },
        onDismiss: () => {
          console.info('[OrderHistoryModal] Payment popup dismissed');
        }
      });
    } catch (err) {
      console.error('[OrderHistoryModal] Payment retry error:', err);
      setActionError(err.message || 'Payment initiation failed.');
    } finally {
      setRetryingPaymentId(null);
    }
  };

  if (!isOpen) return null;

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
        style={{ maxWidth: '680px', width: '92%', maxHeight: '88vh', overflowY: 'auto' }}
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
            📦 My Order History & Receipts
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={isLoading}
              onClick={loadCustomerOrders}
              style={{ fontSize: '0.76rem', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              title="Refresh your orders from Supabase"
            >
              <span>🔄</span>
              <span>{isLoading ? 'Refreshing...' : 'Refresh'}</span>
            </button>
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
        </div>

        {actionError && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#fca5a5',
              padding: '10px 14px',
              borderRadius: '6px',
              fontSize: '0.86rem',
              marginBottom: '16px'
            }}
          >
            ⚠️ {actionError}
          </div>
        )}

        <div id="order-history-content">
          {!user ? (
            <div style={{ textAlign: 'center', padding: '24px' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '14px' }}>
                Please log in to view your verified orders and download receipts.
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
          ) : isLoading ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
              Loading your verified orders and receipts...
            </div>
          ) : fetchError ? (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: '#f87171' }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⚠️</div>
              <p style={{ fontWeight: 600, fontSize: '1.05rem', marginBottom: '6px' }}>
                Failed to load your orders
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '18px' }}>
                {fetchError}
              </p>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={loadCustomerOrders}
              >
                🔄 Retry
              </button>
            </div>
          ) : orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 10px' }}>
              <div style={{ fontSize: '2.2rem', marginBottom: '10px' }}>🧾</div>
              <p style={{ color: 'var(--gold-300)', fontWeight: 600, fontSize: '1.05rem', marginBottom: '6px' }}>
                No orders found yet
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '18px' }}>
                Explore our handcrafted creations or place a custom order!
              </p>
              <button
                type="button"
                className="btn btn-gold btn-sm"
                onClick={() => {
                  onClose();
                  if (onNavigate) onNavigate('#creations');
                }}
              >
                Explore Creations
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {orders.map((ord) => {
                const isPaid = isOrderPaymentVerified(ord);
                const orderKey = ord.id || ord.order_number;
                const isProcessingThis = receiptLoadingId === orderKey;
                const statusConfig = getOrderStatusConfig(ord.status);
                const formattedDate = ord.created_at
                  ? new Date(ord.created_at).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })
                  : '';
                const totalAmt = Number(ord.total_amount) || 0;

                return (
                  <div
                    key={orderKey}
                    style={{
                      background: 'rgba(21, 11, 8, 0.75)',
                      border: isPaid ? '1px solid rgba(52, 211, 153, 0.35)' : '1px solid var(--border-gold)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.25)'
                    }}
                  >
                    {/* Header Row: Order Number, Date, Status */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        flexWrap: 'wrap',
                        gap: '8px',
                        marginBottom: '10px'
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 700, color: 'var(--gold-300)', fontSize: '1.05rem' }}>
                          {ord.order_number || ord.id?.slice(0, 8)}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginLeft: '10px' }}>
                          {formattedDate}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {/* Payment Status Badge */}
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '10px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background: isPaid ? 'rgba(16, 185, 129, 0.18)' : 'rgba(245, 158, 11, 0.15)',
                            color: isPaid ? '#34d399' : '#f59e0b',
                            border: isPaid ? '1px solid #34d399' : '1px solid #f59e0b'
                          }}
                        >
                          ● {getPaymentStatusDisplay(ord)}
                        </span>

                        {/* Fulfillment Status Badge */}
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: '10px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.3px',
                            background: statusConfig.background,
                            color: statusConfig.color,
                            border: statusConfig.border
                          }}
                        >
                          {statusConfig.label}
                        </span>
                      </div>
                    </div>

                    {/* Granular Line Items from order_items table */}
                    {Array.isArray(ord.order_items) && ord.order_items.length > 0 ? (
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '4px', fontWeight: 600 }}>
                          Order Items ({ord.order_items.length}):
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {ord.order_items.map((item, idx) => (
                            <div
                              key={item.id || idx}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: 'rgba(255, 255, 255, 0.03)',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '0.84rem'
                              }}
                            >
                              <span style={{ color: 'var(--text-cream)' }}>
                                🍫 {item.product_name}{' '}
                                <span style={{ color: 'var(--gold-400)', fontWeight: 600 }}>× {item.quantity}</span>
                              </span>
                              <span style={{ color: 'var(--gold-200)', fontWeight: 500 }}>
                                {item.price > 0 ? formatRupees(item.price * item.quantity) : (item.price_tag || '')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.88rem', color: 'var(--text-cream)', marginBottom: '4px' }}>
                        <strong>Items:</strong> {ord.product_name || ord.category || 'Handcrafted Confectionery'}{' '}
                        {ord.quantity ? `(${ord.quantity})` : ''}
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>
                        Fulfillment: {ord.delivery_type === 'pickup' ? '🍫 Studio Pickup' : '🚚 Doorstep Delivery'}
                      </span>
                      <span style={{ color: 'var(--gold-300)', fontWeight: 700 }}>
                        {totalAmt > 0 ? formatRupees(totalAmt) : 'Quotation Basis'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '0.82rem', flexWrap: 'wrap', gap: '6px' }}>
                      <span style={{ color: 'var(--text-dim)' }}>
                        Payment Method: <strong style={{ color: 'var(--text-cream)' }}>{getPaymentMethodDisplay(ord)}</strong>
                      </span>
                      <span style={{ color: isPaid ? '#34d399' : '#f59e0b', fontWeight: 600 }}>
                        {getPaymentStatusDisplay(ord)}
                      </span>
                    </div>

                    {ord.custom_message && (
                      <div
                        style={{
                          fontSize: '0.82rem',
                          color: 'var(--text-dim)',
                          fontStyle: 'italic',
                          marginTop: '8px',
                          background: 'rgba(0,0,0,0.25)',
                          padding: '6px 10px',
                          borderRadius: '4px'
                        }}
                      >
                        "{ord.custom_message}"
                      </div>
                    )}

                    {/* Receipt / Document Action Footer */}
                    <div
                      style={{
                        marginTop: '14px',
                        paddingTop: '12px',
                        borderTop: '1px solid rgba(212, 163, 115, 0.18)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '10px'
                      }}
                    >
                      {isPaid ? (
                        <>
                          <span style={{ color: '#34d399', fontSize: '0.78rem', fontWeight: 600 }}>
                            ✓ Payment Verified: Official Receipt Ready
                          </span>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              type="button"
                              className="btn btn-gold btn-sm"
                              disabled={isProcessingThis}
                              onClick={() => handleDownloadReceipt(ord)}
                              style={{ fontSize: '0.76rem', padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                            >
                              <span>📄</span>
                              <span>{isProcessingThis ? 'Preparing...' : 'Download Paid Receipt (PDF)'}</span>
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              disabled={isProcessingThis}
                              onClick={() => handlePrintReceipt(ord)}
                              style={{ fontSize: '0.76rem', padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                            >
                              <span>🖨️</span>
                              <span>Print</span>
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <span style={{ color: '#f59e0b', fontSize: '0.78rem', fontStyle: 'italic' }}>
                            ⏳ Payment Pending ({getPaymentMethodDisplay(ord)})
                          </span>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {Number(ord.total_amount) > 0 &&
                              (ord.payment_method?.toLowerCase().includes('razorpay') || ord.razorpay_order_id) &&
                              isRazorpayConfigured() && (
                                <button
                                  type="button"
                                  className="btn btn-gold btn-sm"
                                  disabled={retryingPaymentId === ord.id}
                                  onClick={() => handlePayOnline(ord)}
                                  style={{
                                    fontSize: '0.76rem',
                                    padding: '5px 12px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    fontWeight: 700,
                                    background: 'linear-gradient(135deg, #d4a373 0%, #b3804d 100%)',
                                    color: '#150b08'
                                  }}
                                >
                                  <span>⚡</span>
                                  <span>{retryingPaymentId === ord.id ? 'Connecting...' : 'Pay Online (Razorpay)'}</span>
                                </button>
                            )}
                            <button
                              type="button"
                              className="btn btn-gold btn-sm"
                              disabled={isProcessingThis}
                              onClick={() => handleDownloadReceipt(ord)}
                              style={{ fontSize: '0.76rem', padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                            >
                              <span>📄</span>
                              <span>{isProcessingThis ? 'Preparing...' : 'Download Order Confirmation (PDF)'}</span>
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              disabled={isProcessingThis}
                              onClick={() => handlePrintReceipt(ord)}
                              style={{ fontSize: '0.76rem', padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                            >
                              <span>🖨️</span>
                              <span>Print</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
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
