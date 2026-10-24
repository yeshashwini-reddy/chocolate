import React, { useState, useEffect } from 'react';

const PRESET_IMAGES = [
  { label: 'Truffles Box', url: 'assets/images/chocolate_truffles_box.jpg' },
  { label: 'Dark Bar', url: 'assets/images/dark_chocolate_bar.jpg' },
  { label: 'Assorted Box', url: 'assets/images/assorted_truffles.jpg' },
  { label: 'Chocolate Bouquet', url: 'assets/images/chocolate_bouquet.jpg' },
  { label: 'Celebration Cake', url: 'assets/images/custom_cake_chocolate.jpg' },
  { label: 'Fudgy Brownie', url: 'assets/images/fudge_brownie.jpg' },
  { label: 'Choco Cupcakes', url: 'assets/images/cupcakes_chocolate.jpg' },
  { label: 'Artisan Cookies', url: 'assets/images/cookies_artisan.jpg' },
  { label: 'Plum Cake', url: 'assets/images/spiced_plum_cake.jpg' }
];

const CATEGORY_OPTIONS = [
  { value: 'classic', label: 'Classic Chocolates', group: 'Chocolates' },
  { value: 'customised', label: 'Customised Chocolates', group: 'Chocolates' },
  { value: 'gifting', label: 'Luxury Gifting', group: 'Chocolates' },
  { value: 'specialty', label: 'Specialty Collection', group: 'Chocolates' },
  { value: 'flavoured', label: 'Flavoured Chocolates', group: 'Chocolates' },
  { value: 'cakes', label: 'Celebration Cakes', group: 'Cakes & Bakes' },
  { value: 'cupcakes', label: 'Cupcakes & Muffins', group: 'Cakes & Bakes' },
  { value: 'brownies', label: 'Fudgy Brownies', group: 'Cakes & Bakes' },
  { value: 'cookies', label: 'Artisan Cookies', group: 'Cakes & Bakes' },
  { value: 'plum-cake', label: 'Spiced Plum Cake', group: 'Cakes & Bakes' }
];

export default function OwnerProductModal({
  isOpen,
  onClose,
  onSave,
  product = null,
  existingKeys = []
}) {
  const isEdit = Boolean(product);

  const [formData, setFormData] = useState({
    name: '',
    product_key: '',
    category: 'classic',
    categoryLabel: 'Classic Chocolates',
    price: '',
    image: 'assets/images/chocolate_truffles_box.jpg',
    description: '',
    tags: '',
    available: true
  });

  const [errorMsg, setErrorMsg] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [keyManuallyEdited, setKeyManuallyEdited] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        product_key: product.product_key || product.id || '',
        category: product.category || 'classic',
        categoryLabel: product.categoryLabel || product.category_label || 'Classic Chocolates',
        price: product.price !== undefined && product.price !== null ? String(product.price) : '',
        image: product.image || product.image_url || 'assets/images/chocolate_truffles_box.jpg',
        description: product.desc || product.description || '',
        tags: Array.isArray(product.tags) ? product.tags.join(', ') : (product.tags || ''),
        available: product.available ?? product.is_available ?? true
      });
      setKeyManuallyEdited(true);
    } else {
      setFormData({
        name: '',
        product_key: '',
        category: 'classic',
        categoryLabel: 'Classic Chocolates',
        price: '',
        image: 'assets/images/chocolate_truffles_box.jpg',
        description: '',
        tags: 'Handcrafted, Premium',
        available: true
      });
      setKeyManuallyEdited(false);
    }
    setErrorMsg(null);
  }, [product, isOpen]);

  if (!isOpen) return null;

  const handleNameChange = (e) => {
    const val = e.target.value;
    setFormData((prev) => {
      const updates = { ...prev, name: val };
      if (!isEdit && !keyManuallyEdited) {
        updates.product_key = val
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
      }
      return updates;
    });
  };

  const handleCategorySelect = (e) => {
    const catVal = e.target.value;
    const opt = CATEGORY_OPTIONS.find((c) => c.value === catVal);
    setFormData((prev) => ({
      ...prev,
      category: catVal,
      categoryLabel: opt ? opt.label : catVal
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validation
    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      setErrorMsg('Product name is required.');
      return;
    }

    let slug = formData.product_key.trim().toLowerCase();
    if (!slug) {
      slug = trimmedName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    if (!slug) {
      setErrorMsg('A valid unique product key / slug is required.');
      return;
    }

    // Check duplicate key when adding
    if (!isEdit && existingKeys.includes(slug)) {
      setErrorMsg(`Product key "${slug}" already exists in the catalogue. Please choose a different key.`);
      return;
    }

    // Price validation
    const parsedPrice = parseFloat(formData.price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setErrorMsg('Price must be a valid non-negative number (e.g. 299). Enter 0 if Price on Request.');
      return;
    }

    const payload = {
      name: trimmedName,
      product_key: slug,
      category: formData.category,
      category_label: formData.categoryLabel,
      price: parsedPrice,
      image_url: formData.image.trim() || 'assets/images/chocolate_truffles_box.jpg',
      image: formData.image.trim() || 'assets/images/chocolate_truffles_box.jpg',
      description: formData.description.trim(),
      tags: formData.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      available: formData.available,
      is_available: formData.available
    };

    setIsSubmitting(true);
    try {
      const result = await onSave(payload, product);
      if (result && result.success === false) {
        setErrorMsg(result.message || 'Failed to save product.');
      } else {
        onClose();
      }
    } catch (err) {
      setErrorMsg(err.message || 'An error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(6px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        className="admin-card-box"
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: '#1e100b',
          border: '1px solid var(--border-gold)',
          borderRadius: 'var(--radius-md)',
          padding: '28px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.6)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-gold)', paddingBottom: '14px' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--gold-300)', margin: 0, fontSize: '1.4rem' }}>
            {isEdit ? '✏️ Edit Product & Pricing' : '✨ Add New Product to Catalogue'}
          </h2>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            style={{ padding: '4px 10px', fontSize: '0.9rem', borderColor: 'var(--border-subtle)' }}
            onClick={onClose}
            disabled={isSubmitting}
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              color: '#fca5a5',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '18px',
              fontSize: '0.88rem'
            }}
          >
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Row 1: Name and Slug */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', color: 'var(--gold-300)', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 600 }}>
                Product Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                className="checkout-input"
                placeholder="e.g. Hazelnut Praline Truffles"
                value={formData.name}
                onChange={handleNameChange}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', color: 'var(--gold-300)', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 600 }}>
                Unique Product Key / Slug <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                className="checkout-input"
                placeholder="e.g. hazelnut-praline-truffles"
                value={formData.product_key}
                disabled={isEdit}
                onChange={(e) => {
                  setKeyManuallyEdited(true);
                  setFormData((prev) => ({ ...prev, product_key: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '') }));
                }}
                required
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px', display: 'block' }}>
                {isEdit ? 'Key is locked to preserve historical order links.' : 'Used for unique database identification and URLs.'}
              </span>
            </div>
          </div>

          {/* Row 2: Category and Price */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', color: 'var(--gold-300)', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 600 }}>
                Category <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                className="checkout-input"
                value={formData.category}
                onChange={handleCategorySelect}
                style={{ background: '#150b08', color: 'var(--text-cream)' }}
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    [{c.group}] {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', color: 'var(--gold-300)', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 600 }}>
                Selling Price in INR (₹) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="number"
                step="1"
                min="0"
                className="checkout-input"
                placeholder="e.g. 349 (or 0 for Price on Request)"
                value={formData.price}
                onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                required
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px', display: 'block' }}>
                {Number(formData.price) > 0 ? `Selling for ₹${formData.price}` : 'Price 0 will show as "Price on Request" & require enquiry.'}
              </span>
            </div>
          </div>

          {/* Row 3: Image URL and Presets */}
          <div>
            <label style={{ display: 'block', color: 'var(--gold-300)', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 600 }}>
              Product Image URL
            </label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="text"
                className="checkout-input"
                placeholder="assets/images/... or https://..."
                value={formData.image}
                onChange={(e) => setFormData((prev) => ({ ...prev, image: e.target.value }))}
                style={{ flex: 1 }}
              />
              <img
                src={formData.image || 'assets/images/chocolate_truffles_box.jpg'}
                alt="Preview"
                style={{
                  width: '46px',
                  height: '46px',
                  objectFit: 'cover',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-gold)',
                  background: '#150b08'
                }}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'assets/images/chocolate_truffles_box.jpg';
                }}
              />
            </div>

            {/* Image Presets Selector */}
            <div style={{ marginTop: '8px' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginRight: '6px' }}>Pick from verified assets:</span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                {PRESET_IMAGES.map((img) => (
                  <button
                    key={img.url}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, image: img.url }))}
                    style={{
                      background: formData.image === img.url ? 'var(--gold-400)' : 'rgba(212, 163, 115, 0.1)',
                      color: formData.image === img.url ? '#150b08' : 'var(--text-muted)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '12px',
                      padding: '3px 8px',
                      fontSize: '0.72rem',
                      cursor: 'pointer'
                    }}
                  >
                    {img.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 4: Description */}
          <div>
            <label style={{ display: 'block', color: 'var(--gold-300)', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 600 }}>
              Description
            </label>
            <textarea
              className="checkout-input"
              rows="3"
              placeholder="e.g. Silky 65% dark chocolate shells filled with handcrafted roasted hazelnut ganache."
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Row 5: Tags and Stock Availability */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', alignItems: 'center' }}>
            <div>
              <label style={{ display: 'block', color: 'var(--gold-300)', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 600 }}>
                Product Tags (comma-separated)
              </label>
              <input
                type="text"
                className="checkout-input"
                placeholder="e.g. Best Seller, Eggless, 60% Dark"
                value={formData.tags}
                onChange={(e) => setFormData((prev) => ({ ...prev, tags: e.target.value }))}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-cream)' }}>
                <input
                  type="checkbox"
                  checked={formData.available}
                  onChange={(e) => setFormData((prev) => ({ ...prev, available: e.target.checked }))}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--gold-400)' }}
                />
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                  Active & In Stock in Customer Store
                </span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px', borderTop: '1px solid var(--border-gold)', paddingTop: '16px' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-gold"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : isEdit ? '💾 Update Product' : '✨ Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
