import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [orders, setOrders] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return window.sessionStorage?.getItem('mch_in_password_recovery') === 'true';
      } catch (_) {
        return false;
      }
    }
    return false;
  });

  // Helper to load user profile from public.profiles using auth.uid() / UUID
  const loadUserProfile = async (supabaseAuthUser) => {
    if (!supabaseAuthUser) {
      setAuthUser(null);
      setProfile(null);
      setRole(null);
      setUser(null);
      setProfileError(null);
      setProfileLoading(false);
      return { user: null, role: null, error: null };
    }

    setAuthUser(supabaseAuthUser);
    setProfileLoading(true);

    try {
      // 1. Fetch matching public.profiles row using the authenticated user's UUID
      const { data: dbProfile, error: profileErr } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, role, created_at')
        .eq('id', supabaseAuthUser.id)
        .maybeSingle();

      if (profileErr) {
        console.error('[Supabase] Profile query error:', profileErr);
        const errMsg = `Profile retrieval failed: ${profileErr.message}`;
        setProfileError(errMsg);
        setProfile(null);
        setRole(null);
        setUser(null);
        setProfileLoading(false);
        return { user: null, role: null, error: errMsg };
      }

      let resolvedProfile = dbProfile || null;
      let resolvedRole = dbProfile?.role || null;

      // 2. If table select returned no profile row, check public.get_user_role RPC
      if (!resolvedProfile) {
        try {
          const { data: rpcRole, error: rpcError } = await supabase
            .rpc('get_user_role', { user_id: supabaseAuthUser.id });

          if (rpcError) {
            console.error('[Supabase] get_user_role RPC query failed:', rpcError);
            const errMsg = `Profile not found and role check failed: ${rpcError.message}`;
            setProfileError(errMsg);
            setProfile(null);
            setRole(null);
            setUser(null);
            setProfileLoading(false);
            return { user: null, role: null, error: errMsg };
          }

          if (rpcRole) {
            resolvedRole = rpcRole;
          } else {
            const errMsg = `No profile record found in public.profiles for account (${supabaseAuthUser.email || supabaseAuthUser.id}).`;
            setProfileError(errMsg);
            setProfile(null);
            setRole(null);
            setUser(null);
            setProfileLoading(false);
            return { user: null, role: null, error: errMsg };
          }
        } catch (rpcErr) {
          const errMsg = `Profile role resolution error: ${rpcErr.message}`;
          setProfileError(errMsg);
          setProfile(null);
          setRole(null);
          setUser(null);
          setProfileLoading(false);
          return { user: null, role: null, error: errMsg };
        }
      }

      // 3. The authoritative role from database
      const finalRole = resolvedRole || 'user';

      const fullName = resolvedProfile?.full_name 
        || supabaseAuthUser.user_metadata?.full_name 
        || supabaseAuthUser.user_metadata?.name 
        || (finalRole === 'admin' ? 'Store Admin' : finalRole === 'owner' ? 'Business Owner' : (supabaseAuthUser.email ? supabaseAuthUser.email.split('@')[0] : 'Customer'));

      const resolvedUser = {
        id: supabaseAuthUser.id,
        name: fullName,
        email: resolvedProfile?.email || supabaseAuthUser.email,
        phone: resolvedProfile?.phone || supabaseAuthUser.user_metadata?.phone || null,
        role: finalRole
      };

      setProfile(resolvedProfile);
      setRole(finalRole);
      setUser(resolvedUser);
      setProfileError(null);
      setProfileLoading(false);
      return { user: resolvedUser, role: finalRole, error: null };
    } catch (err) {
      console.error('[Supabase] Unexpected error resolving profile:', err);
      const errMsg = `Unexpected error loading profile: ${err.message || 'Unknown error'}`;
      setProfileError(errMsg);
      setProfile(null);
      setRole(null);
      setUser(null);
      setProfileLoading(false);
      return { user: null, role: null, error: errMsg };
    }
  };

  // Helper to refresh profile on demand
  const refreshProfile = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        setProfileError(error.message);
        return { user: null, role: null, error: error.message };
      }
      if (session?.user) {
        return await loadUserProfile(session.user);
      }
      return { user: null, role: null, error: 'No active session' };
    } catch (err) {
      return { user: null, role: null, error: err.message };
    }
  };

  // Check Supabase session on mount & subscribe to real-time auth changes
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    // 1. Fetch current active session (restores session on page refresh)
    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!isMounted) return;
        if (error) {
          console.warn('[Supabase] Session retrieval failed:', error);
          setProfileError(error.message);
        } else if (session?.user) {
          await loadUserProfile(session.user);
        } else {
          setAuthUser(null);
          setProfile(null);
          setRole(null);
          setUser(null);
          setProfileError(null);
        }
      } catch (err) {
        console.warn('[Supabase] Session retrieval exception:', err);
      } finally {
        if (isMounted) {
          setIsInitialized(true);
          setIsLoading(false);
        }
      }
    };

    initSession();

    // 2. Subscribe to auth state changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      if (event === 'INITIAL_SESSION') {
        return;
      }
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
        try {
          window.sessionStorage?.setItem('mch_in_password_recovery', 'true');
        } catch (_) {}
        if (session?.user) {
          await loadUserProfile(session.user);
        }
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (session?.user) {
          await loadUserProfile(session.user);
        }
      } else if (event === 'SIGNED_OUT') {
        setIsPasswordRecovery(false);
        try {
          window.sessionStorage?.removeItem('mch_in_password_recovery');
        } catch (_) {}
        setAuthUser(null);
        setProfile(null);
        setRole(null);
        setUser(null);
        setProfileError(null);
        setProfileLoading(false);
      }
    });

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

      const profileResult = await loadUserProfile(data.user);
      if (profileResult?.error) {
        return {
          success: false,
          message: profileResult.error
        };
      }

      const resolvedUser = profileResult?.user;

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
      const profileResult = await loadUserProfile(data.user);

      if (profileResult?.error) {
        return {
          success: false,
          message: profileResult.error
        };
      }

      const resolvedUser = profileResult?.user;

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

  // Real Supabase Auth Forgot Password (Sends recovery email)
  const requestPasswordReset = async (email) => {
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    if (!cleanEmail || !validateEmail(cleanEmail)) {
      return { success: false, message: 'Please enter a valid email address.' };
    }

    try {
      // Construct redirect URL pointing to the dedicated reset password view on current origin
      const redirectUrl = `${window.location.origin}/#reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirectUrl
      });

      if (error) {
        return { success: false, message: error.message };
      }

      return {
        success: true,
        message: 'If an account exists with this email address, instructions to reset your password have been sent.'
      };
    } catch (err) {
      return {
        success: false,
        message: err.message || 'Failed to send password recovery link.'
      };
    }
  };

  // Real Supabase Auth Password Update (Requires active recovery session or logged-in user)
  const updatePassword = async (newPassword) => {
    const cleanPass = newPassword || '';
    if (!cleanPass || cleanPass.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters.' };
    }

    try {
      const { data, error } = await supabase.auth.updateUser({
        password: cleanPass
      });

      if (error) {
        return { success: false, message: error.message };
      }

      if (!data?.user) {
        return { success: false, message: 'Password update could not be completed. Please try again.' };
      }

      return {
        success: true,
        user: data.user,
        message: 'Password updated successfully!'
      };
    } catch (err) {
      return {
        success: false,
        message: err.message || 'Failed to update password.'
      };
    }
  };

  const clearPasswordRecovery = () => {
    setIsPasswordRecovery(false);
    try {
      window.sessionStorage?.removeItem('mch_in_password_recovery');
    } catch (_) {}
  };

  // Real Supabase Auth Logout (tab-local scope)
  const logout = async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (err) {
      console.warn('[Supabase] SignOut error:', err);
    } finally {
      clearPasswordRecovery();
      setAuthUser(null);
      setProfile(null);
      setRole(null);
      setUser(null);
    }
  };

  const createOrder = (orderData) => {
    const refNumber = 'MCH-' + Math.floor(100000 + Math.random() * 900000);

    // Persist to Supabase orders table only for authenticated users (orders.user_id is NOT NULL)
    if (user?.id) {
      const orderPayload = {
        user_id: user.id,
        order_number: refNumber,
        customer_name: orderData?.name || (user?.name || 'Customer'),
        customer_email: orderData?.email || user?.email || null,
        customer_phone: orderData?.phone || user?.phone || null,
        occasion: orderData?.occasion || null,
        product_name: orderData?.product || 'Handcrafted Confectionery',
        quantity: orderData?.quantity || 'Standard',
        preferred_date: orderData?.date || null,
        customisation_details: orderData?.customisation || null,
        special_message: orderData?.message || null,
        status: 'pending',
        total_amount: 0
      };

      supabase
        .from('orders')
        .insert(orderPayload)
        .then(({ error }) => {
          if (error) {
            console.error('[Supabase] Failed to persist order to database:', error.message);
          }
        })
        .catch((err) => {
          console.error('[Supabase] Unexpected error persisting order:', err);
        });
    }

    return refNumber;
  };

  const getUserOrders = () => {
    return [];
  };

  return (
    <AuthContext.Provider value={{
      supabase,
      user,
      authUser,
      profile,
      role: role || user?.role || null,
      loading: isLoading || !isInitialized || profileLoading,
      isLoading,
      isInitialized,
      profileLoading,
      profileError,
      refreshProfile,
      login,
      signup,
      verifyOtp,
      resendOtp,
      requestPasswordReset,
      updatePassword,
      isPasswordRecovery,
      clearPasswordRecovery,
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
