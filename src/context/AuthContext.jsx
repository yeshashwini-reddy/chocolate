import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const LOCAL_ORDERS_KEY = 'mch_orders';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Helper to load user profile from public.profiles
  const loadUserProfile = async (supabaseAuthUser) => {
    if (!supabaseAuthUser) {
      setAuthUser(null);
      setProfile(null);
      setRole(null);
      setUser(null);
      return null;
    }

    try {
      setAuthUser(supabaseAuthUser);

      // 1. Fetch matching public.profiles row using the authenticated user's UUID
      const { data: dbProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, role, created_at')
        .eq('id', supabaseAuthUser.id)
        .maybeSingle();

      let resolvedProfile = dbProfile || null;
      let resolvedRole = dbProfile?.role || null;

      // 2. If table select returned no role or had permission issues, query public.get_user_role RPC
      if (!resolvedRole) {
        try {
          const { data: rpcRole, error: rpcError } = await supabase
            .rpc('get_user_role', { user_id: supabaseAuthUser.id });
          if (!rpcError && rpcRole) {
            resolvedRole = rpcRole;
          }
        } catch (rpcErr) {
          console.warn('[Supabase] get_user_role RPC query failed:', rpcErr);
        }
      }

      // 3. Fallback to auth metadata if present, else 'user'
      if (!resolvedRole) {
        resolvedRole = supabaseAuthUser.app_metadata?.role || supabaseAuthUser.user_metadata?.role || 'user';
      }

      const fullName = resolvedProfile?.full_name 
        || supabaseAuthUser.user_metadata?.full_name 
        || supabaseAuthUser.user_metadata?.name 
        || (supabaseAuthUser.email ? supabaseAuthUser.email.split('@')[0] : 'Customer');

      const resolvedUser = {
        id: supabaseAuthUser.id,
        name: fullName,
        email: resolvedProfile?.email || supabaseAuthUser.email,
        phone: resolvedProfile?.phone || supabaseAuthUser.user_metadata?.phone || null,
        role: resolvedRole
      };

      setProfile(resolvedProfile);
      setRole(resolvedRole);
      setUser(resolvedUser);
      return resolvedUser;
    } catch (err) {
      console.warn('[Supabase] Error resolving profile:', err);
      let fallbackRole = 'user';
      try {
        const { data: rpcRole } = await supabase.rpc('get_user_role', { user_id: supabaseAuthUser.id });
        if (rpcRole) fallbackRole = rpcRole;
      } catch (_) {}

      const fallbackUser = {
        id: supabaseAuthUser.id,
        name: supabaseAuthUser.user_metadata?.full_name || supabaseAuthUser.user_metadata?.name || supabaseAuthUser.email?.split('@')[0] || 'Customer',
        email: supabaseAuthUser.email,
        phone: supabaseAuthUser.user_metadata?.phone || null,
        role: fallbackRole
      };
      setProfile(null);
      setRole(fallbackRole);
      setUser(fallbackUser);
      return fallbackUser;
    }
  };

  // Check Supabase session on mount & subscribe to real-time auth changes
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    // 1. Fetch current active session (restores session on page refresh)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      if (session?.user) {
        await loadUserProfile(session.user);
      } else {
        setAuthUser(null);
        setProfile(null);
        setRole(null);
        setUser(null);
      }
      setIsInitialized(true);
      setIsLoading(false);
    }).catch((err) => {
      console.warn('[Supabase] Session retrieval failed:', err);
      if (isMounted) {
        setIsInitialized(true);
        setIsLoading(false);
      }
    });

    // 2. Subscribe to auth state changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (session?.user) {
          await loadUserProfile(session.user);
        }
      } else if (event === 'SIGNED_OUT') {
        setAuthUser(null);
        setProfile(null);
        setRole(null);
        setUser(null);
      }
    });

    // 3. Load persisted local orders
    try {
      const storedOrders = localStorage.getItem(LOCAL_ORDERS_KEY);
      if (storedOrders) {
        setOrders(JSON.parse(storedOrders));
      } else {
        const defaultOrders = [
          {
            id: 'ord-1',
            order_number: 'MCH-882314',
            customer_name: 'Priya Sharma',
            customer_email: 'user@test.com',
            customer_phone: '+91 98765 43210',
            category: 'Celebration Cakes',
            quantity: '1 Cake (1.5 kg)',
            preferred_date: '2026-09-24',
            custom_message: 'Pastel gold drip cake for milestone celebration',
            status: 'processing',
            created_at: new Date(Date.now() - 86400000 * 2).toISOString()
          },
          {
            id: 'ord-2',
            order_number: 'MCH-734190',
            customer_name: 'Customer User',
            customer_email: 'user@test.com',
            customer_phone: '+91 98765 43210',
            category: 'Handcrafted Chocolates',
            quantity: '10 Assorted Truffle Boxes',
            preferred_date: '2026-09-18',
            custom_message: 'Wedding return gift hampers with gold satin ribbon',
            status: 'completed',
            created_at: new Date(Date.now() - 86400000 * 6).toISOString()
          }
        ];
        localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(defaultOrders));
        setOrders(defaultOrders);
      }
    } catch (e) {
      console.warn('Orders initialization error:', e);
    }

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Real Supabase Auth Login
  const login = async (email, password) => {
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const cleanPass = password || '';

    if (!cleanEmail || !validateEmail(cleanEmail)) {
      return { success: false, message: 'Please enter a valid email address.' };
    }
    if (!cleanPass) {
      return { success: false, message: 'Please enter your password.' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPass
      });

      if (error) {
        return { success: false, message: error.message };
      }

      if (!data?.user) {
        return { success: false, message: 'Invalid email or password.' };
      }

      const resolvedUser = await loadUserProfile(data.user);

      return {
        success: true,
        user: resolvedUser,
        role: resolvedUser?.role || 'user',
        session: data.session
      };
    } catch (err) {
      return { success: false, message: err.message || 'Login failed.' };
    }
  };

  // Real Supabase Auth Signup (Triggers confirmation OTP email)
  const signup = async (name, email, password, confirmPassword) => {
    const cleanName = name ? name.trim() : '';
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const cleanPass = password || '';
    const cleanConfirm = confirmPassword || '';

    if (!cleanName) return { success: false, message: 'Please enter your full name.' };
    if (!cleanEmail || !validateEmail(cleanEmail)) return { success: false, message: 'Please enter a valid email address.' };
    if (!cleanPass || cleanPass.length < 6) return { success: false, message: 'Password must be at least 6 characters.' };
    if (cleanPass !== cleanConfirm) return { success: false, message: 'Passwords do not match.' };

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPass,
        options: {
          data: {
            full_name: cleanName
          }
        }
      });

      if (error) {
        return { success: false, message: error.message };
      }

      // Check if user already exists (Supabase security feature: empty identities array)
      if (data?.user?.identities && data.user.identities.length === 0) {
        return { success: false, message: 'An account with this email already exists.' };
      }

      if (!data?.user) {
        return { success: false, message: 'Signup failed. Please try again.' };
      }

      // Email confirmation OTP is pending; do not establish verified session yet!
      return {
        success: true,
        email: cleanEmail,
        user: data.user,
        requiresOtpVerification: true
      };
    } catch (err) {
      return { success: false, message: err.message || 'Signup failed.' };
    }
  };

  // Real Supabase Auth OTP Verification
  const verifyOtp = async (email, token) => {
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const cleanToken = token ? token.trim() : '';

    if (!cleanEmail) {
      return { success: false, message: 'Email address is required.' };
    }
    if (!cleanToken || cleanToken.length !== 6) {
      return { success: false, message: 'Please enter a valid 6-digit verification code.' };
    }

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: 'email'
      });

      if (error) {
        return { success: false, message: error.message || 'Invalid or expired verification code.' };
      }

      if (!data?.user) {
        return { success: false, message: 'Verification could not be completed. Please try again.' };
      }

      // Establish authenticated session and fetch user profile from public.profiles
      const resolvedUser = await loadUserProfile(data.user);

      return {
        success: true,
        user: resolvedUser,
        role: resolvedUser?.role || 'user',
        session: data.session
      };
    } catch (err) {
      return { success: false, message: err.message || 'Verification failed. Please try again.' };
    }
  };

  // Real Supabase Auth Resend OTP
  const resendOtp = async (email) => {
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    if (!cleanEmail) {
      return { success: false, message: 'Email address is required.' };
    }

    try {
      const { data, error } = await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail
      });

      if (error) {
        return { success: false, message: error.message || 'Failed to resend verification code. Please try again.' };
      }

      return { success: true, message: 'Verification code resent successfully.' };
    } catch (err) {
      return { success: false, message: err.message || 'Failed to resend verification code.' };
    }
  };

  // Real Supabase Auth Logout
  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[Supabase] SignOut error:', err);
    } finally {
      setAuthUser(null);
      setProfile(null);
      setRole(null);
      setUser(null);
    }
  };

  const createOrder = (orderData) => {
    const refNumber = 'MCH-' + Math.floor(100000 + Math.random() * 900000);
    const newOrder = {
      id: 'ord-' + Date.now(),
      order_number: refNumber,
      user_id: user ? user.id : null,
      customer_name: orderData.name,
      customer_email: orderData.email,
      customer_phone: orderData.phone,
      category: orderData.product || 'General inquiry',
      preferred_date: orderData.date || null,
      quantity: orderData.quantity || 'Standard',
      custom_message: orderData.customisation ? `${orderData.customisation} - ${orderData.message}` : (orderData.message || ''),
      status: 'pending',
      created_at: new Date().toISOString()
    };

    const updatedOrders = [newOrder, ...orders];
    setOrders(updatedOrders);
    try {
      localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(updatedOrders));
    } catch (_) {}

    // Async sync to Supabase orders table when authenticated
    if (user?.id) {
      supabase.from('orders').insert({
        user_id: user.id,
        customer_name: orderData.name,
        customer_email: orderData.email,
        customer_phone: orderData.phone,
        occasion: orderData.occasion || null,
        product_name: orderData.product || 'Handcrafted Confectionery',
        quantity: orderData.quantity || 'Standard',
        preferred_date: orderData.date || null,
        customisation_details: orderData.customisation || null,
        special_message: orderData.message || null,
        status: 'pending',
        total_amount: 0
      }).then(({ error }) => {
        if (error) console.warn('[Supabase] Order sync note:', error.message);
      }).catch((e) => {
        console.warn('[Supabase] Order sync exception:', e);
      });
    }

    return refNumber;
  };

  const getUserOrders = () => {
    if (!user) return [];
    return orders.filter(o => o.customer_email?.toLowerCase() === user.email?.toLowerCase() || o.user_id === user.id);
  };

  return (
    <AuthContext.Provider value={{
      user,
      authUser,
      profile,
      role: role || user?.role || null,
      loading: isLoading || !isInitialized,
      isLoading,
      isInitialized,
      login,
      signup,
      verifyOtp,
      resendOtp,
      logout,
      orders,
      createOrder,
      getUserOrders
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
