import React, { createContext, useContext, useState, useEffect } from 'react';

const LOCAL_USERS_KEY = 'mch_users';
const LOCAL_CURRENT_USER_KEY = 'mch_current_user';
const LOCAL_ORDERS_KEY = 'mch_orders';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize test users & check session on mount
  useEffect(() => {
    try {
      if (!localStorage.getItem(LOCAL_USERS_KEY)) {
        const defaultUsers = [
          { name: 'Yeshashwini reddy', email: 'yeshaswinireddy32@gmail.com', password: 'password123', role: 'user' },
          { name: 'Customer User', email: 'user@test.com', password: 'password123', role: 'user' },
          { name: 'Store Admin', email: 'admin@test.com', password: 'password123', role: 'admin' },
          { name: 'Business Owner', email: 'owner@test.com', password: 'password123', role: 'owner' }
        ];
        localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(defaultUsers));
      }

      const storedUser = localStorage.getItem(LOCAL_CURRENT_USER_KEY);
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed.email === 'yeshaswinireddy32@gmail.com' && (!parsed.name || parsed.name === 'yeshaswinireddy32')) {
          parsed.name = 'Yeshashwini reddy';
          localStorage.setItem(LOCAL_CURRENT_USER_KEY, JSON.stringify(parsed));
        }
        setUser(parsed);
      }

      const storedOrders = localStorage.getItem(LOCAL_ORDERS_KEY);
      if (storedOrders) {
        setOrders(JSON.parse(storedOrders));
      } else {
        // Sample orders for demo
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
      console.warn('Auth initialization error:', e);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

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
      const users = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]');
      let matchedUser = users.find(u => u.email === cleanEmail);

      if (!matchedUser && cleanPass.length >= 6) {
        let role = 'user';
        if (cleanEmail.includes('admin')) role = 'admin';
        if (cleanEmail.includes('owner')) role = 'owner';

        const defaultName = cleanEmail === 'yeshaswinireddy32@gmail.com' ? 'Yeshashwini reddy' : cleanEmail.split('@')[0];
        matchedUser = {
          id: 'local_' + Date.now(),
          name: defaultName,
          email: cleanEmail,
          password: cleanPass,
          role
        };
        users.push(matchedUser);
        localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
      }

      if (!matchedUser || matchedUser.password !== cleanPass) {
        return { success: false, message: 'Invalid email or password.' };
      }

      const userName = (matchedUser.email === 'yeshaswinireddy32@gmail.com' && (!matchedUser.name || matchedUser.name === 'yeshaswinireddy32'))
        ? 'Yeshashwini reddy'
        : matchedUser.name;

      const sessionUser = {
        id: matchedUser.id || 'local_user',
        name: userName,
        email: matchedUser.email,
        role: matchedUser.role || 'user'
      };

      localStorage.setItem(LOCAL_CURRENT_USER_KEY, JSON.stringify(sessionUser));
      setUser(sessionUser);

      return { success: true, user: sessionUser, role: sessionUser.role };
    } catch (err) {
      return { success: false, message: err.message || 'Login failed.' };
    }
  };

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
      const users = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]');
      if (users.some(u => u.email === cleanEmail)) {
        return { success: false, message: 'An account with this email already exists.' };
      }

      const newUser = {
        id: 'local_' + Date.now(),
        name: cleanName,
        email: cleanEmail,
        password: cleanPass,
        role: 'user'
      };
      users.push(newUser);
      localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));

      const sessionUser = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: 'user'
      };
      localStorage.setItem(LOCAL_CURRENT_USER_KEY, JSON.stringify(sessionUser));
      setUser(sessionUser);

      return { success: true, user: sessionUser, role: 'user' };
    } catch (err) {
      return { success: false, message: err.message || 'Signup failed.' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(LOCAL_CURRENT_USER_KEY);
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
    localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(updatedOrders));

    return refNumber;
  };

  const getUserOrders = () => {
    if (!user) return [];
    return orders.filter(o => o.customer_email?.toLowerCase() === user.email?.toLowerCase() || o.user_id === user.id);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isInitialized,
      login,
      signup,
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
