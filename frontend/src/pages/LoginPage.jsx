import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiAuth } from '../utils/api';

export default function LoginPage({ onLoginSuccess }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const user = await apiAuth.login(phone, password);
      onLoginSuccess(user);
      navigate(user.role === 'staff' ? '/mpo' : '/admin');
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 'calc(100vh - 80px)' }}>
      <div className="card" style={{ padding: '30px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 25 }}>
          <h1 style={{ fontSize: 26, fontFamily: 'Fraunces, serif' }}>Jupiter Health Care</h1>
          <h2 style={{ fontSize: 18, color: '#2F6D4F', fontFamily: 'Fraunces, serif', fontStyle: 'italic', marginTop: 3 }}>Allen Pharma Field Sales</h2>
          <p className="caption" style={{ marginTop: 8 }}>Log in with your phone number to fill or review sheets</p>
        </div>

        {error && <div className="alert-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="phone">Phone Number</label>
            <input
              id="phone"
              type="tel"
              className="ruled-input mono"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 01700000000"
              required
              autoComplete="tel"
              inputMode="tel"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="ruled-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 10 }} disabled={submitting}>
            {submitting ? 'Authenticating...' : 'Sign In to Ledger'}
          </button>
        </form>
      </div>
      <div style={{ textAlign: 'center', fontSize: 12, opacity: 0.6 }}>
        <p>© 2026 Jupiter Health Care &amp; Allen Pharma.</p>
        <p>For internal use only.</p>
      </div>
    </div>
  );
}
