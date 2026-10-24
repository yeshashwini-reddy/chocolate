import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || 'https://hwrreyawamsxdiwrprjj.supabase.co';
const supabasePublishableKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY) || '';

if (!supabasePublishableKey) {
  console.warn(
    '[Supabase] VITE_SUPABASE_PUBLISHABLE_KEY is not defined in .env.local. Please check your environment variables.'
  );
}

/**
 * Returns a persistent, unique identifier for the current browser tab.
 * Uses window.name backed by sessionStorage:
 * - When a tab is refreshed, window.name and sessionStorage preserve the ID.
 * - When a brand-new tab is opened, window.name is empty, generating a fresh tab ID.
 */
export function getTabId() {
  if (typeof window === 'undefined') return 'mch_tab_server';

  try {
    // 1. Prefer existing window.name if already tagged with our prefix
    if (window.name && window.name.startsWith('mch_tab_')) {
      try {
        window.sessionStorage?.setItem('mch_tab_id', window.name);
      } catch (_) {}
      return window.name;
    }

    const storedTabId = window.sessionStorage?.getItem('mch_tab_id');
    const navEntries = typeof performance !== 'undefined' && performance.getEntriesByType ? performance.getEntriesByType('navigation') : [];
    const isReload = navEntries.length > 0 ? navEntries[0].type === 'reload' : false;

    // 2. If this is a page reload, restore the existing tab ID from sessionStorage
    if (isReload && storedTabId && storedTabId.startsWith('mch_tab_')) {
      window.name = storedTabId;
      return storedTabId;
    }

    // 3. Brand-new tab OR duplicated tab: generate a cryptographically random, collision-safe tab ID
    const randomPart = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).substring(2, 10);
    const newTabId = `mch_tab_${randomPart}_${Date.now().toString(36)}`;

    // If this was a duplicated tab (storedTabId exists in cloned sessionStorage but window.name was empty and not a reload),
    // clone the auth token from the old tab storage key so the duplicated tab maintains session continuity
    // while having an independent GoTrue BroadcastChannel and storage key.
    if (storedTabId && storedTabId.startsWith('mch_tab_')) {
      try {
        const oldToken = window.sessionStorage?.getItem(`sb_${storedTabId}_auth_token`);
        if (oldToken) {
          window.sessionStorage?.setItem(`sb_${newTabId}_auth_token`, oldToken);
        }
      } catch (_) {}
    }

    window.name = newTabId;
    try {
      window.sessionStorage?.setItem('mch_tab_id', newTabId);
    } catch (_) {}

    return newTabId;
  } catch (_) {
    return 'mch_tab_fallback';
  }
}

/**
 * Safe tab-scoped storage adapter backed by sessionStorage with memory fallback.
 * Strictly isolates all session data within the current tab context.
 */
export function createTabStorage(tabId) {
  const memoryStore = new Map();

  return {
    getItem: (key) => {
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          const val = window.sessionStorage.getItem(key);
          if (val !== null) return val;
        }
      } catch (e) {
        console.warn('[TabStorage] Read error, falling back to in-memory store:', e);
      }
      // If reading a transient PKCE code-verifier across tabs (when an email recovery link opens in a new tab):
      if (key && key.endsWith('-code-verifier')) {
        try {
          const pkceFallback = window.localStorage?.getItem('sb_pkce_code_verifier');
          if (pkceFallback) return pkceFallback;
        } catch (_) {}
      }
      return memoryStore.get(key) ?? null;
    },
    setItem: (key, value) => {
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          window.sessionStorage.setItem(key, value);
        }
      } catch (e) {
        console.warn('[TabStorage] Write error, falling back to in-memory store:', e);
      }
      // If saving a transient PKCE code-verifier, mirror to localStorage so an email recovery link
      // opened in a new tab can exchange the code for a recovery session.
      // (Actual auth tokens are NEVER written to localStorage and stay strictly tab-isolated).
      if (key && key.endsWith('-code-verifier')) {
        try {
          window.localStorage?.setItem('sb_pkce_code_verifier', value);
        } catch (_) {}
      }
      memoryStore.set(key, value);
    },
    removeItem: (key) => {
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          window.sessionStorage.removeItem(key);
        }
      } catch (e) {
        console.warn('[TabStorage] Remove error:', e);
      }
      if (key && key.endsWith('-code-verifier')) {
        try {
          window.localStorage?.removeItem('sb_pkce_code_verifier');
        } catch (_) {}
      }
      memoryStore.delete(key);
    }
  };
}

/**
 * Clean any legacy cross-tab token from localStorage so old global sessions
 * cannot leak or interfere with tab-scoped sessions.
 */
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    const legacyKey = 'sb-hwrreyawamsxdiwrprjj-auth-token';
    if (window.localStorage.getItem(legacyKey)) {
      window.localStorage.removeItem(legacyKey);
    }
  } catch (_) {}
}

/**
 * Creates an independent, tab-scoped Supabase client.
 * Configured with:
 * - Tab-scoped storage (sessionStorage)
 * - Tab-unique storageKey to isolate GoTrue BroadcastChannels and navigator locks
 * - PKCE auth flow for robust token exchange
 * - Zero cross-tab session leakage
 */
export function createTabSupabaseClient() {
  const tabId = getTabId();
  const storage = createTabStorage(tabId);
  const storageKey = `sb_${tabId}_auth_token`;

  return createClient(
    supabaseUrl,
    supabasePublishableKey || 'placeholder-anon-key',
    {
      auth: {
        storage,
        storageKey,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    }
  );
}

// Singleton Supabase client instance for this specific tab execution context
export const supabase = createTabSupabaseClient();

export function useSupabase() {
  return supabase;
}