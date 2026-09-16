import React, { useState, useEffect, forwardRef } from 'react';
import { BRAND_CONFIG } from '../config/brandConfig';
import { useAuth } from '../context/AuthContext';

const ContactSection = forwardRef(function ContactSection(
  { initialFormData, onSubmitSuccess, showToast },
  ref
) {
  const { createOrder, user } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    occasion: 'Birthday',
    product: 'Dark Chocolate',
    quantity: '',
    date: '',
    customisation: '',
    message: ''
  });

  const [isHighlighted, setIsHighlighted] = useState(false);

  // Sync user info if logged in
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: prev.name || user.name || '',
        email: prev.email || user.email || '',
        phone: prev.phone || user.phone || ''
      }));
    }
  }, [user]);

  // Sync initial prefill data if passed
  useEffect(() => {
    if (initialFormData) {
      setFormData((prev) => ({
        ...prev,
        ...initialFormData
      }));
      triggerHighlight();
    }
  }, [initialFormData]);

  const triggerHighlight = () => {
    setIsHighlighted(true);
    setTimeout(() => {
      setIsHighlighted(false);
    }, 1500);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    if (!formData.name.trim()) {
      if (showToast) showToast('Please enter your full name 🍫');
      return false;
    }
    if (!formData.phone.trim()) {
      if (showToast) showToast('Please provide your phone/WhatsApp number 📞');
      return false;
    }
    return true;
  };

  const buildWhatsAppMessage = () => {
    return encodeURIComponent(
      `*New Order Enquiry - Madhuri’s Choco Heaven 🍫❤️*
---------------------------------------
• *Name:* ${formData.name.trim()}
• *Phone:* ${formData.phone.trim()}
• *Email:* ${formData.email.trim() || 'Not provided'}
• *Occasion:* ${formData.occasion}
• *Product Interested In:* ${formData.product}
• *Quantity:* ${formData.quantity.trim() || 'Standard'}
• *Preferred Date:* ${formData.date || 'Flexible'}
• *Customisation Details:* ${formData.customisation.trim() || 'None specified'}
• *Special Message:* ${formData.message.trim() || 'Looking forward to delicious treats!'}
---------------------------------------
_Sent via Madhuri’s Choco Heaven Website_`
    );
  };

  const handleWhatsAppClick = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const waNumber = BRAND_CONFIG?.contact?.whatsappNumber || 'YOUR_WHATSAPP_NUMBER';
    const text = buildWhatsAppMessage();
    const url = `https://wa.me/${waNumber}?text=${text}`;

    if (showToast) showToast('Opening WhatsApp with your order details... 💬');
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const refNumber = createOrder(formData);

    if (onSubmitSuccess) {
      onSubmitSuccess(refNumber);
    }

    // Reset form
    setFormData({
      name: user?.name || '',
      phone: user?.phone || '',
      email: user?.email || '',
      occasion: 'Birthday',
      product: 'Dark Chocolate',
      quantity: '',
      date: '',
      customisation: '',
      message: ''
    });
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <section
      className="section-padding"
      id="contact"
      ref={ref}
      aria-labelledby="contact-heading"
      style={{ background: 'var(--bg-secondary)' }}
    >
      <div className="container">
        <div className="section-header reveal-on-scroll revealed">
          <div className="section-subtitle">Get In Touch</div>
          <h2 className="section-title" id="contact-heading">
            Let’s Make Your Celebration <br />
            <span className="text-gradient-gold">A Little Sweeter.</span>
          </h2>
          <p className="section-desc">
            Planning something special? Tell us what you have in mind and we’ll create something deliciously memorable.
          </p>
        </div>

        <div className="contact-layout">
          {/* Left: Quick Contact & Info Panel */}
          <div className="contact-info-panel reveal-on-scroll revealed">
            <div className="contact-card-box">
              <h3 className="contact-box-title">Order Directly & Quickly</h3>
              <p className="contact-box-desc">
                Since all our creations are custom handcrafted and baked fresh on order, we recommend placing your
                orders 2 to 4 days in advance (earlier for large wedding or return-gift hampers).
              </p>

              <div className="quick-contact-list">
                {/* WhatsApp */}
                <a
                  href={`https://wa.me/${BRAND_CONFIG.contact.whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="quick-contact-item"
                >
                  <span className="contact-item-icon">💬</span>
                  <div>
                    <div className="contact-item-label">WhatsApp Quick Chat</div>
                    <div className="contact-item-value">Chat with Madhuri</div>
                  </div>
                </a>

                {/* Phone */}
                <a href={`tel:${BRAND_CONFIG.contact.phoneNumber}`} className="quick-contact-item">
                  <span className="contact-item-icon">📞</span>
                  <div>
                    <div className="contact-item-label">Call For Enquiries</div>
                    <div className="contact-item-value">Call Madhuri's Choco Heaven</div>
                  </div>
                </a>

                {/* Instagram */}
                <a
                  href={BRAND_CONFIG.social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="quick-contact-item"
                >
                  <span className="contact-item-icon">📸</span>
                  <div>
                    <div className="contact-item-label">Instagram DM</div>
                    <div className="contact-item-value">@MadhurisChocoHeaven</div>
                  </div>
                </a>

                {/* Email */}
                <a href={`mailto:${BRAND_CONFIG.contact.email}`} className="quick-contact-item">
                  <span className="contact-item-icon">✉️</span>
                  <div>
                    <div className="contact-item-label">Email Orders</div>
                    <div className="contact-item-value">Send an Email</div>
                  </div>
                </a>
              </div>
            </div>

            {/* Operating & Hygiene Assurance */}
            <div className="contact-card-box" style={{ borderColor: 'var(--border-gold)' }}>
              <h4 style={{ color: 'var(--gold-400)', marginBottom: '8px', fontSize: '1.1rem' }}>
                🍫 Homemade Guarantee
              </h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                Every creation is made under strict hygienic conditions using premium-quality chocolate couverture,
                pure dairy butter, and fresh seasonal ingredients. 100% vegetarian & eggless options available on
                request.
              </p>
            </div>
          </div>

          {/* Right: Custom Enquiry Form */}
          <div
            className="enquiry-form-card reveal-on-scroll reveal-delay-2 revealed"
            style={
              isHighlighted
                ? {
                    boxShadow: '0 0 35px rgba(212, 163, 115, 0.6)',
                    borderColor: 'var(--gold-400)',
                    transition: 'all 0.4s ease'
                  }
                : {}
            }
          >
            <h3 className="form-title">Custom Order & Enquiry Form</h3>
            <p className="form-subtitle">
              Fill in your requirements below. We’ll get back to you with custom pricing and recommendations promptly.
            </p>

            <form id="order-enquiry-form" onSubmit={handleSubmit} noValidate>
              <div className="form-grid">
                {/* Full Name */}
                <div className="form-group">
                  <label htmlFor="enquiry-name" className="form-label">
                    Your Name <span className="required-star">*</span>
                  </label>
                  <input
                    type="text"
                    id="enquiry-name"
                    name="name"
                    className="form-control"
                    placeholder="e.g. Priya Sharma"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* Phone Number */}
                <div className="form-group">
                  <label htmlFor="enquiry-phone" className="form-label">
                    Phone / WhatsApp Number <span className="required-star">*</span>
                  </label>
                  <input
                    type="tel"
                    id="enquiry-phone"
                    name="phone"
                    className="form-control"
                    placeholder="e.g. +91 98765 43210"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* Email */}
                <div className="form-group">
                  <label htmlFor="enquiry-email" className="form-label">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    id="enquiry-email"
                    name="email"
                    className="form-control"
                    placeholder="e.g. priya@example.com"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>

                {/* Occasion */}
                <div className="form-group">
                  <label htmlFor="enquiry-occasion" className="form-label">
                    Occasion
                  </label>
                  <select
                    id="enquiry-occasion"
                    name="occasion"
                    className="form-control"
                    value={formData.occasion}
                    onChange={handleChange}
                  >
                    <option value="Birthday">🎂 Birthday Celebration</option>
                    <option value="Wedding">💍 Wedding / Engagement</option>
                    <option value="Anniversary">❤️ Anniversary</option>
                    <option value="Baby Shower">👶 Baby Shower</option>
                    <option value="Festival">🎉 Festival (Diwali, Christmas, Rakhi, etc.)</option>
                    <option value="Return Gifts">🎁 Return Gifts / Party Favours</option>
                    <option value="Corporate Gifting">🏢 Corporate Gifting</option>
                    <option value="Other">✨ Other Special Celebration</option>
                  </select>
                </div>

                {/* Product Interested In */}
                <div className="form-group">
                  <label htmlFor="enquiry-product" className="form-label">
                    Product Interested In
                  </label>
                  <select
                    id="enquiry-product"
                    name="product"
                    className="form-control"
                    value={formData.product}
                    onChange={handleChange}
                  >
                    <optgroup label="Handcrafted Chocolates">
                      <option value="Dark Chocolate">Dark Chocolate</option>
                      <option value="Milk Chocolate">Milk Chocolate</option>
                      <option value="White Chocolate">White Chocolate</option>
                      <option value="Dry Fruit Chocolates">Dry Fruit Chocolates</option>
                      <option value="Chocolate Bars">Chocolate Bars</option>
                      <option value="Theme-Based Chocolates — Customisation">
                        Theme-Based Chocolates — Customisation
                      </option>
                      <option value="Corporate Chocolate Orders">Corporate Chocolate Orders</option>
                      <option value="Chocolate Bouquets">Chocolate Bouquets</option>
                      <option value="Dates & Almonds Chocolates">Dates & Almonds Chocolates</option>
                      <option value="Bounty Bars">Bounty Bars</option>
                      <option value="Tutti Fruity White Chocolates">Tutti Fruity White Chocolates</option>
                      <option value="Wine-Shaped Chocolates">Wine-Shaped Chocolates</option>
                      <option value="Occasion Hampers">Occasion Hampers</option>
                      <option value="Flavoured Chocolates">Flavoured Chocolates</option>
                    </optgroup>
                    <optgroup label="Cakes & Fresh Bakes">
                      <option value="Celebration Cakes">Custom Celebration Cakes</option>
                      <option value="Gourmet Cupcakes">Signature Gourmet Cupcakes</option>
                      <option value="Bakery Muffins">Fresh Baked Bakery Muffins</option>
                      <option value="Fudgy Brownies">Rich Fudgy Chocolate Brownies</option>
                      <option value="Artisan Cookies">Sea-Salt Choc-Chunk Cookies</option>
                      <option value="Spiced Plum Cake">Traditional Spiced Plum Cake</option>
                    </optgroup>
                    <optgroup label="Custom Gifting">
                      <option value="Multiple Treats / Custom Hamper">Multiple Treats / Custom Hamper</option>
                    </optgroup>
                  </select>
                </div>

                {/* Quantity */}
                <div className="form-group">
                  <label htmlFor="enquiry-quantity" className="form-label">
                    Estimated Quantity
                  </label>
                  <input
                    type="text"
                    id="enquiry-quantity"
                    name="quantity"
                    className="form-control"
                    placeholder="e.g. 1 Cake (1 kg), or 25 Boxes"
                    value={formData.quantity}
                    onChange={handleChange}
                  />
                </div>

                {/* Preferred Date */}
                <div className="form-group col-span-2">
                  <label htmlFor="enquiry-date" className="form-label">
                    Preferred Date of Delivery / Pick-up
                  </label>
                  <input
                    type="date"
                    id="enquiry-date"
                    name="date"
                    className="form-control"
                    min={todayStr}
                    value={formData.date}
                    onChange={handleChange}
                  />
                </div>

                {/* Customisation Details */}
                <div className="form-group col-span-2">
                  <label htmlFor="enquiry-customisation" className="form-label">
                    Customisation Details & Theme
                  </label>
                  <input
                    type="text"
                    id="enquiry-customisation"
                    name="customisation"
                    className="form-control"
                    placeholder="e.g. Color theme (pastel pink & gold), personalized message, eggless requirement"
                    value={formData.customisation}
                    onChange={handleChange}
                  />
                </div>

                {/* Special Message */}
                <div className="form-group col-span-2">
                  <label htmlFor="enquiry-message" className="form-label">
                    Additional Message / Questions
                  </label>
                  <textarea
                    id="enquiry-message"
                    name="message"
                    className="form-control"
                    placeholder="Tell us more about your ideas, dietary preferences, or specific budget..."
                    value={formData.message}
                    onChange={handleChange}
                  ></textarea>
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-gold btn-lg" id="btn-submit-enquiry">
                  <span>Send Enquiry</span>
                  <span className="btn-icon-arrow">→</span>
                </button>
                <button
                  type="button"
                  className="btn btn-whatsapp btn-lg"
                  id="btn-whatsapp-enquiry"
                  onClick={handleWhatsAppClick}
                >
                  <span>💬 Enquire Directly on WhatsApp</span>
                </button>
                <div className="form-note">
                  🔒 We respect your privacy. Your details are only used to discuss your order with you.
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
});

export default ContactSection;
