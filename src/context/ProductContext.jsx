import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import {
  fetchLiveProducts,
  createProductInDb,
  updateProductInDb,
  removeProductFromDb,
  getBaselineCatalogue
} from '../services/productService';

const ProductContext = createContext(null);

export function ProductProvider({ children }) {
  const [products, setProducts] = useState(() => getBaselineCatalogue());
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [productNotice, setProductNotice] = useState(null);
  const [fromDatabase, setFromDatabase] = useState(false);

  // Load products from Supabase
  const loadProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    const result = await fetchLiveProducts();
    setProducts(result.products || []);
    setFromDatabase(result.fromDatabase);
    setProductNotice(result.notice);
    setIsLoadingProducts(false);
  }, []);

  useEffect(() => {
    loadProducts();

    // Subscribe to Supabase Realtime changes on public.products
    let channel;
    try {
      channel = supabase
        .channel('public_products_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'products' },
          () => {
            loadProducts();
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('[ProductContext] Realtime subscription skipped:', e);
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [loadProducts]);

  // Split into Chocolates and Cakes/Bakes
  const cakeCategories = ['cakes', 'cupcakes', 'brownies', 'cookies', 'plum-cake'];

  const chocolates = products.filter(
    (p) => !cakeCategories.includes(p.category?.toLowerCase())
  );

  const cakesAndBakes = products.filter((p) =>
    cakeCategories.includes(p.category?.toLowerCase())
  );

  const handleCreateProduct = async (productData) => {
    const res = await createProductInDb(productData);
    if (res.success) {
      await loadProducts();
    }
    return res;
  };

  const handleUpdateProduct = async (id, updates) => {
    // Optimistic UI update
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === id || p.product_key === id) {
          const numPrice = updates.price !== undefined ? Number(updates.price) : p.price;
          const isAvail = updates.available !== undefined ? updates.available : updates.is_available !== undefined ? updates.is_available : p.available;
          return {
            ...p,
            ...updates,
            price: numPrice,
            priceTag: numPrice > 0 ? `₹${numPrice}` : 'Price on Request',
            available: isAvail,
            is_available: isAvail,
            needsPricing: numPrice <= 0
          };
        }
        return p;
      })
    );

    const res = await updateProductInDb(id, updates);
    await loadProducts();
    return res;
  };

  const handleToggleStock = async (id, currentStock) => {
    const nextStock = !currentStock;
    return await handleUpdateProduct(id, { available: nextStock, is_available: nextStock });
  };

  const handleRemoveProduct = async (id, key, name) => {
    const res = await removeProductFromDb(id, key, name);
    await loadProducts();
    return res;
  };

  return (
    <ProductContext.Provider
      value={{
        products,
        chocolates,
        cakesAndBakes,
        isLoadingProducts,
        productNotice,
        fromDatabase,
        refreshProducts: loadProducts,
        createProduct: handleCreateProduct,
        updateProduct: handleUpdateProduct,
        toggleStock: handleToggleStock,
        removeProduct: handleRemoveProduct
      }}
    >
      {children}
    </ProductContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
}
