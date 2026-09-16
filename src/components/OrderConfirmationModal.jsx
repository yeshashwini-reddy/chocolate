import React from 'react';

export default function OrderConfirmationModal({ isOpen, referenceNumber, onClose }) {
  if (!isOpen) return null;

  return (
    <div
      className="dialog-overlay open"
      id="dialog-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      onClick={(e) => {
        if (e.target.id === 'dialog-overlay') onClose();
      }}
    >
      <div className="dialog-box">
        <div className="dialog-icon">
          <img
            src="assets/images/logo.png"
            alt="Madhuri's Choco Heaven"
            className="dialog-logo-img"
            width="72"
            height="72"
          />
        </div>
        <h3 className="dialog-title" id="dialog-title">
          Enquiry Received!
        </h3>
        <p className="dialog-message">
          Thank you for choosing Madhuri’s Choco Heaven. We have received your order enquiry (Reference:{' '}
          <strong id="dialog-ref-number" style={{ color: 'var(--gold-400)' }}>
            {referenceNumber || 'MCH-882314'}
          </strong>
          ).
          <br />
          <br />
          Madhuri will get in touch with you shortly on your provided contact number to discuss customisation
          details, flavor preferences, and pricing.
        </p>
        <button type="button" className="btn btn-gold" id="dialog-close-btn" onClick={onClose}>
          <span>Wonderful, Thank You!</span>
        </button>
      </div>
    </div>
  );
}
