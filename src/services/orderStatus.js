/**
 * MADHURI'S CHOCO HEAVEN - CANONICAL ORDER STATUS DEFINITIONS & VISUAL BADGES
 * 
 * Provides unified status definitions, user-friendly labels, and luxury visual badge
 * styles synchronized between Owner Dashboard, Customer History, and Receipts.
 */

export const ORDER_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

export const ORDER_STATUS_CONFIG = {
  pending: {
    value: 'pending',
    label: '⏳ Pending Acceptance',
    shortLabel: 'Pending Acceptance',
    color: '#f59e0b',
    background: 'rgba(245, 158, 11, 0.15)',
    border: '1px solid rgba(245, 158, 11, 0.4)'
  },
  processing: {
    value: 'processing',
    label: '⚡ In Production / Processing',
    shortLabel: 'In Production',
    color: '#60a5fa',
    background: 'rgba(59, 130, 246, 0.15)',
    border: '1px solid rgba(96, 165, 250, 0.4)'
  },
  completed: {
    value: 'completed',
    label: '✅ Completed & Delivered',
    shortLabel: 'Completed & Delivered',
    color: '#34d399',
    background: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid rgba(52, 211, 153, 0.4)'
  },
  cancelled: {
    value: 'cancelled',
    label: '❌ Cancelled',
    shortLabel: 'Cancelled',
    color: '#f87171',
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(248, 113, 113, 0.4)'
  }
};

/**
 * Normalizes any database status string (including legacy variants) to the canonical configuration.
 *
 * @param {string} status 
 * @returns {typeof ORDER_STATUS_CONFIG['pending']}
 */
export function getOrderStatusConfig(status) {
  const s = (status || '').toString().trim().toLowerCase();
  if (s === 'completed' || s === 'delivered') {
    return ORDER_STATUS_CONFIG.completed;
  }
  if (s === 'processing' || s === 'accepted' || s === 'in_production' || s === 'awaiting') {
    return ORDER_STATUS_CONFIG.processing;
  }
  if (s === 'cancelled' || s === 'rejected') {
    return ORDER_STATUS_CONFIG.cancelled;
  }
  return ORDER_STATUS_CONFIG.pending;
}
