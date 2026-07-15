import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { RefreshCw, LogOut } from 'lucide-react';
import { apiAuth } from './utils/api';
import { isOnline, syncOfflineQueue, getQueue } from './utils/db';

// Component and page imports
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import MPOHomePage from './pages/mpo/MPOHomePage';
import Sheet1Form from './pages/mpo/Sheet1Form';
import Sheet2Form from './pages/mpo/Sheet2Form';
import Sheet3Form from './pages/mpo/Sheet3Form';
import AdminDashboard from './pages/admin/AdminDashboard';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const cached = localStorage.getItem('jupiter_user');
    return cached ? JSON.parse(cached) : null;
  });
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('jupiter_token'));
  
  // App-wide sync states
  const [isDeviceOnline, setIsDeviceOnline] = useState(isOnline());
  const [offlineQueueCount, setOfflineQueueCount] = useState(getQueue().length);
  const [syncStatus, setSyncStatus] = useState(null);

  // Trigger loading initial profile on startup
  useEffect(() => {
    const handleAuthExpired = () => {
      setToken(null);
      setCurrentUser(null);
      localStorage.removeItem('jupiter_user');
    };
    window.addEventListener('auth_expired', handleAuthExpired);

    if (token) {
      const cached = localStorage.getItem('jupiter_user');
      if (cached) {
        setLoading(false);
      }

      apiAuth.me()
        .then(user => {
          setCurrentUser(user);
          localStorage.setItem('jupiter_user', JSON.stringify(user));
        })
        .catch((err) => {
          console.warn('Profile sync failed. Keeping cached credentials:', err);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    return () => window.removeEventListener('auth_expired', handleAuthExpired);
  }, [token]);

  // Online/Offline status listeners & queue auto-sync trigger
  useEffect(() => {
    const handleOnline = () => {
      setIsDeviceOnline(true);
      triggerQueueSync();
    };
    const handleOffline = () => {
      setIsDeviceOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (isOnline()) {
      triggerQueueSync();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const triggerQueueSync = () => {
    if (getQueue().length === 0) return;
    setSyncStatus('syncing');
    
    const apiCallFn = async (url, method, body) => {
      const token = localStorage.getItem('jupiter_token');
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Sync HTTP error');
      }
      return await res.json();
    };

    syncOfflineQueue(apiCallFn, (id, status) => {
      const q = getQueue();
      setOfflineQueueCount(q.length);
      if (q.length === 0) {
        setSyncStatus('success');
        setTimeout(() => setSyncStatus(null), 3000);
      }
    }).catch(err => {
      console.error('Queue sync error:', err);
      setSyncStatus('failed');
    });
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setToken(localStorage.getItem('jupiter_token'));
    localStorage.setItem('jupiter_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    apiAuth.logout();
    setToken(null);
    setCurrentUser(null);
    localStorage.removeItem('jupiter_user');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flex: 1, justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#FAF7F0' }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw style={{ animation: 'spin 1s infinite linear', color: '#2F6D4F', width: 36, height: 36 }} />
          <p style={{ marginTop: 10, fontFamily: 'Fraunces, serif', fontStyle: 'italic', color: '#1F4D37' }}>Loading Jupiter Field Ledger...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      {currentUser && (
        <div className="nav-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link to="/" style={{ textDecoration: 'none' }}>
              <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 700, fontSize: 18, color: '#2F6D4F' }}>Jupiter Health</span>
            </Link>
            <span className="caption">| {currentUser.name} ({currentUser.role.toUpperCase()})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={triggerQueueSync}>
              <span className={`sync-dot ${!isDeviceOnline ? 'failed' : offlineQueueCount > 0 ? 'queued' : 'synced'}`} />
              <span style={{ fontSize: 12, cursor: 'pointer' }}>
                {offlineQueueCount > 0 ? `${offlineQueueCount} pending` : isDeviceOnline ? 'Synced' : 'Offline'}
              </span>
            </div>
            <button onClick={handleLogout} style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#B5502F' }}>
              <LogOut size={18} />
            </button>
          </div>
        </div>
      )}

      <Routes>
        {/* Auth routes */}
        <Route 
          path="/login" 
          element={
            currentUser ? (
              <Navigate to={currentUser.role === 'staff' ? '/mpo' : '/admin'} replace />
            ) : (
              <LoginPage onLoginSuccess={handleLoginSuccess} />
            )
          } 
        />

        {/* MPO Staff Protected Routes */}
        <Route 
          path="/mpo" 
          element={
            <ProtectedRoute user={currentUser} requiredRole="staff">
              <MPOHomePage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/mpo/daily-works" 
          element={
            <ProtectedRoute user={currentUser} requiredRole="staff">
              <Sheet1Form />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/mpo/daily-orders" 
          element={
            <ProtectedRoute user={currentUser} requiredRole="staff">
              <Sheet2Form />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/mpo/field-visits" 
          element={
            <ProtectedRoute user={currentUser} requiredRole="staff">
              <Sheet3Form />
            </ProtectedRoute>
          } 
        />

        {/* Manager/Admin Protected Routes */}
        <Route 
          path="/admin/*" 
          element={
            <ProtectedRoute user={currentUser} requiredRole={['manager', 'admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />

        {/* Root Redirect handler */}
        <Route 
          path="/" 
          element={
            currentUser ? (
              <Navigate to={currentUser.role === 'staff' ? '/mpo' : '/admin'} replace />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />

        {/* Wildcard Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
