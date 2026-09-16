import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';

// Import all original design stylesheets
import '../css/style.css';
import '../css/components.css';
import '../css/animations.css';
import '../css/splash-login.css';
import '../css/dashboards.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
