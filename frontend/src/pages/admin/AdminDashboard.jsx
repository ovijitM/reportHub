import React from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { TrendingUp, Users, Settings, MapPin } from 'lucide-react';
import AdminOverview from './AdminOverview';
import AdminMPOAccounts from './AdminMPOAccounts';
import AdminMonthlyConfigs from './AdminMonthlyConfigs';
import AdminMasterMarkets from './AdminMasterMarkets';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const subPath = location.pathname.replace('/admin/', '').replace('/admin', '');
  const activeTab = subPath.startsWith('history') ? 'overview' : subPath || 'overview';

  return (
    <div className="container-desktop">
      <div className="admin-header-row">
        <div>
          <h1 style={{ fontSize: 24 }}>Manager Control Panel</h1>
          <p className="caption">Review daily submissions, assign financial configurations, and download PDFs</p>
        </div>
        <div className="admin-nav-buttons">
          <button
            onClick={() => navigate('/admin')}
            className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, minHeight: 38, padding: '5px 12px', fontSize: 13, display: 'flex', gap: 5 }}
          >
            <TrendingUp size={14} /> Overview
          </button>
          <button
            onClick={() => navigate('/admin/agents')}
            className={`btn ${activeTab === 'agents' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, minHeight: 38, padding: '5px 12px', fontSize: 13, display: 'flex', gap: 5 }}
          >
            <Users size={14} /> MPO Accounts
          </button>
          <button
            onClick={() => navigate('/admin/configs')}
            className={`btn ${activeTab === 'configs' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, minHeight: 38, padding: '5px 12px', fontSize: 13, display: 'flex', gap: 5 }}
          >
            <Settings size={14} /> Monthly Targets
          </button>
          <button
            onClick={() => navigate('/admin/markets')}
            className={`btn ${activeTab === 'markets' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, minHeight: 38, padding: '5px 12px', fontSize: 13, display: 'flex', gap: 5 }}
          >
            <MapPin size={14} /> Area Database
          </button>
        </div>
      </div>

      <Routes>
        <Route path="/" element={<AdminOverview />} />
        <Route path="/agents" element={<AdminMPOAccounts />} />
        <Route path="/configs" element={<AdminMonthlyConfigs />} />
        <Route path="/markets" element={<AdminMasterMarkets />} />
        <Route path="/history/:agentId" element={<AdminOverview />} />
      </Routes>
    </div>
  );
}
