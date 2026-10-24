/**
 * MADHURI'S CHOCO HEAVEN - PRODUCT DATA SERVICE
 * Authoritative Supabase Products integration with BRAND_CONFIG fallback
 */
import { supabase } from '../supabaseClient';
import { BRAND_CONFIG } from '../config/brandConfig';

/**
 * Baseline fallback catalogue compiled from BRAND_CONFIG
 */
export const getBaselineCatalogue = () => {
  const chocolates = (BRAND_CONFIG.chocolates || []).map((c) => ({
    ...c,
    product_key: c.id,
    price: typeof c.price === 'number' ? c.price : 0,
    price_tag: c.priceTag || (c.price ? `₹${c.price}` : 'Price on Request'),
    available: true,
    is_available: true,
    needsPricing: !c.price || c.price <= 0
  }));

  const cakes = (BRAND_CONFIG.cakesAndBakes || []).map((b) => ({
    ...b,
    product_key: b.id,
    price: typeof b.price === 'number' ? b.price : 0,
    price_tag: b.priceTag || (b.price ? `₹${b.price}` : 'Price on Request'),
    available: true,
    is_available: true,
    needsPricing: !b.price || b.price <= 0
  }));

  return [...chocolates, ...cakes];
};

/**
 * Fetch products from Supabase public.products, merging with UI metadata
 */
export async function fetchLiveProducts() {
  const baseline = getBaselineCatalogue();
  const baselineMap = new Map();
  baseline.forEach((p) => {
    baselineMap.set(p.product_key, p);
    baselineMap.set(p.id, p);
  });

  try {
    const { data: dbProducts, error } = await supabase
      .from('products')
      .select('*')
      .order('name');

    if (error) {
      console.warn('[productService] Supabase products query notice:', error.message);
      return {
        products: baseline,
        fromDatabase: false,
        notice: error.message
      };
    }

    if (!dbProducts || dbProducts.length === 0) {
      return {
        products: baseline,
        fromDatabase: false,
        notice: 'No products in database table. Displaying brand configuration.'
      };
    }

    // Merge Supabase rows with rich frontend metadata (e.g. flavours, occasions, icons)
    const merged = dbProducts.map((row) => {
      const match = baselineMap.get(row.product_key) || baselineMap.get(row.id);
      const numPrice = Number(row.price) || 0;
      const isStockAvailable = row.available ?? row.is_available ?? true;
      const priceTag = row.price_tag || (numPrice > 0 ? `₹${numPrice}` : 'Price on Request');
      const needsPricing = numPrice <= 0 || priceTag === 'Price on Request';

      return {
        id: row.id,
        dbId: row.id,
        product_key: row.product_key || row.id,
        name: row.name || match?.name || 'Handcrafted Treat',
        shortName: match?.shortName || row.name,
        desc: row.description || match?.desc || '',
        price: numPrice,
        priceTag: priceTag,
        category: row.category || match?.category || 'chocolates',
        categoryLabel: row.category_label || match?.categoryLabel || row.category || 'Confectionery',
        image: row.image_url || match?.image || 'assets/images/chocolate_truffles_box.jpg',
        tags: Array.isArray(row.tags) && row.tags.length > 0 ? row.tags : (match?.tags || []),
        available: isStockAvailable,
        is_available: isStockAvailable,
        needsPricing,
        type: match?.type || 'standard',
        isProminent: match?.isProminent || false,
        badge: match?.badge || null,
        flavours: match?.flavours || null,
        supportedOccasions: match?.supportedOccasions || null,
        actionText: match?.actionText || 'Customise & Enquire',
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    });

    return {
      products: merged,
      fromDatabase: true,
      notice: null
    };
  } catch (err) {
    console.warn('[productService] Product fetch exception:', err);
    return {
      products: baseline,
      fromDatabase: false,
      notice: err.message
    };
  }
}

/**
 * Add a new product to Supabase public.products
 */
export async function createProductInDb(productData) {
  const cleanName = productData.name?.trim();
  if (!cleanName) {
    return { success: false, message: 'Product name is required.' };
  }

  // Generate URL/key-friendly slug
  let slug = (productData.product_key || cleanName)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  if (!slug) slug = 'product-' + Date.now();

  const numPrice = Number(productData.price) || 0;
  if (numPrice < 0) {
    return { success: false, message: 'Price cannot be negative.' };
  }

  const priceTag = numPrice > 0 ? `₹${numPrice}` : 'Price on Request';
  const category = (productData.category || 'classic').trim().toLowerCase();
  const categoryLabel = productData.categoryLabel?.trim() || productData.category || 'Classic Chocolates';

  const tags = Array.isArray(productData.tags)
    ? productData.tags
    : typeof productData.tags === 'string'
    ? productData.tags.split(',').map((t) => t.trim()).filter(Boolean)
    : [];

  const isAvailable = productData.available ?? productData.is_available ?? true;

  const payload = {
    product_key: slug,
    name: cleanName,
    description: productData.description?.trim() || '',
    price: numPrice,
    price_tag: priceTag,
    category,
    category_label: categoryLabel,
    image_url: productData.image_url?.trim() || productData.image?.trim() || 'assets/images/chocolate_truffles_box.jpg',
    tags,
    available: isAvailable,
    is_available: isAvailable
  };

  try {
    const { data, error } = await supabase
      .from('products')
      .insert(payload)
      .select()
      .single();

    if (error) {
      if (error.code === '23505' || error.message.includes('unique')) {
        return { success: false, message: `Product key "${slug}" already exists. Please choose a unique key.` };
      }
      return { success: false, message: error.message };
    }

    return { success: true, product: data, message: `"${cleanName}" added to catalogue.` };
  } catch (err) {
    return { success: false, message: err.message || 'Failed to create product in database.' };
  }
}

/**
 * Edit an existing product in Supabase public.products
 */
export async function updateProductInDb(idOrKey, updates) {
  if (!idOrKey) {
    return { success: false, message: 'Product ID or key is required.' };
  }

  const payload = {};

  if (updates.name !== undefined) payload.name = updates.name.trim();
  if (updates.description !== undefined) payload.description = updates.description.trim();
  if (updates.category !== undefined) payload.category = updates.category.trim();
  if (updates.category_label !== undefined || updates.categoryLabel !== undefined) {
    payload.category_label = (updates.category_label || updates.categoryLabel).trim();
  }
  if (updates.image_url !== undefined || updates.image !== undefined) {
    payload.image_url = (updates.image_url || updates.image).trim();
  }
  if (updates.tags !== undefined) {
    payload.tags = Array.isArray(updates.tags)
      ? updates.tags
      : typeof updates.tags === 'string'
      ? updates.tags.split(',').map((t) => t.trim()).filter(Boolean)
      : [];
  }

  // Availability updates: keep both available and is_available synchronized
  if (updates.available !== undefined || updates.is_available !== undefined) {
    const isAvail = updates.available ?? updates.is_available;
    payload.available = Boolean(isAvail);
    payload.is_available = Boolean(isAvail);
  }

  // Price updates
  if (updates.price !== undefined) {
    const numPrice = Number(updates.price) || 0;
    if (numPrice < 0) {
      return { success: false, message: 'Price cannot be negative.' };
    }
    payload.price = numPrice;
    payload.price_tag = numPrice > 0 ? `₹${numPrice}` : 'Price on Request';
  }

  payload.updated_at = new Date().toISOString();

  try {
    // Attempt match by UUID id first, fallback to product_key
    let query = supabase.from('products').update(payload);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrKey);

    if (isUuid) {
      query = query.eq('id', idOrKey);
    } else {
      query = query.eq('product_key', idOrKey);
    }

    const { data, error } = await query.select();

    if (error) {
      return { success: false, message: error.message };
    }

    return {
      success: true,
      product: data?.[0] || null,
      message: 'Product updated successfully.'
    };
  } catch (err) {
    return { success: false, message: err.message || 'Failed to update product.' };
  }
}

/**
 * Remove or Archive a product from the active catalogue
 * Preserves historical order references safely
 */
export async function removeProductFromDb(productId, productKey, productName) {
  try {
    // 1. Check if product is referenced in historical order items
    let hasOrderHistory = false;
    try {
      const { data: items, error } = await supabase
        .from('order_items')
        .select('id')
        .ilike('product_name', `%${productName}%`)
        .limit(1);

      if (!error && items && items.length > 0) {
        hasOrderHistory = true;
      }
    } catch (_) {
      // order_items lookup optional
    }

    // 2. If referenced in historical orders, safely archive by marking unavailable
    if (hasOrderHistory) {
      await updateProductInDb(productId || productKey, { available: false, is_available: false });
      return {
        success: true,
        archived: true,
        message: `"${productName}" is linked to previous order receipts. It has been safely archived and marked Out of Stock to protect historical records.`
      };
    }

    // 3. Otherwise safely delete unreferenced product from catalogue
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId);
    let query = supabase.from('products').delete();

    if (isUuid) {
      query = query.eq('id', productId);
    } else if (productKey) {
      query = query.eq('product_key', productKey);
    } else {
      query = query.eq('name', productName);
    }

    const { error: delError } = await query;
    if (delError) {
      // Fallback to archive if delete fails due to foreign key constraint
      await updateProductInDb(productId || productKey, { available: false, is_available: false });
      return {
        success: true,
        archived: true,
        message: `"${productName}" was marked Out of Stock / Archived.`
      };
    }

    return {
      success: true,
      archived: false,
      message: `"${productName}" has been removed from catalogue.`
    };
  } catch (err) {
    return { success: false, message: err.message || 'Failed to delete product.' };
  }
}
