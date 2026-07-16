import React, { useState, useEffect } from 'react';
import { RefreshCw, UserPlus } from 'lucide-react';
import { apiAdmin } from '../../utils/api';

export default function AdminMPOAccounts() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadAgents = async () => {
    setLoading(true);
    try {
      const data = await apiAdmin.getAgents();
      setAgents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  const handleCreateAgent = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await apiAdmin.createAgent({ name, phone, password, role: 'staff' });
      setSuccess(`MPO Account for ${name} created successfully!`);
      setName('');
      setPhone('');
      setPassword('');
      loadAgents();
    } catch (err) {
      setError(err.message || 'Creation failed');
    }
  };

  const handleDeactivate = async (id, isActive) => {
    try {
      await apiAdmin.updateAgent(id, { isActive: !isActive });
      loadAgents();
    } catch (err) {
      alert('Deactivation toggle failed: ' + err.message);
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to permanently delete the account for ${name}? This action cannot be undone and will delete all associated logs.`)) {
      try {
        await apiAdmin.deleteAgent(id);
        loadAgents();
      } catch (err) {
        alert('Deletion failed: ' + err.message);
      }
    }
  };

  return (
    <div className="admin-grid-2-1">
      <div className="card">
        <h2 style={{ fontSize: 18, marginBottom: 15, fontFamily: 'Fraunces, serif' }}>Current MPO Agents</h2>
        {loading ? (
          <div style={{ textAlign: 'center' }}>
            <RefreshCw style={{ animation: 'spin 1s infinite linear', color: '#2F6D4F' }} />
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="ledger-table-container desktop-only-table">
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th>Agent Name</th>
                    <th>Phone Number</th>
                    <th style={{ textAlign: 'center' }}>Account Status</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((agent) => (
                    <tr key={agent._id}>
                      <td style={{ fontWeight: 600 }}>{agent.name}</td>
                      <td className="mono">{agent.phone}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          fontSize: 12, padding: '3px 8px', borderRadius: 4,
                          backgroundColor: agent.isActive ? 'rgba(47,109,79,0.1)' : 'rgba(181,80,47,0.1)',
                          color: agent.isActive ? '#2F6D4F' : '#B5502F',
                        }}>
                          {agent.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                          <button
                            onClick={() => handleDeactivate(agent._id, agent.isActive)}
                            className={`btn ${agent.isActive ? 'btn-danger' : 'btn-secondary'}`}
                            style={{ minHeight: 28, padding: '4px 10px', fontSize: 12 }}
                          >
                            {agent.isActive ? 'Deactivate' : 'Reactivate'}
                          </button>
                          <button
                            onClick={() => handleDelete(agent._id, agent.name)}
                            className="btn btn-danger"
                            style={{ minHeight: 28, padding: '4px 10px', fontSize: 12 }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Compact List View */}
            <div className="mobile-only-list">
              {agents.map((agent) => (
                <div key={agent._id} className="mobile-agent-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15, color: '#1F4D37' }}>{agent.name}</div>
                      <div className="mono caption" style={{ marginTop: 2 }}>{agent.phone}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{
                          fontSize: 11, padding: '3px 8px', borderRadius: 4,
                          backgroundColor: agent.isActive ? 'rgba(47,109,79,0.1)' : 'rgba(181,80,47,0.1)',
                          color: agent.isActive ? '#2F6D4F' : '#B5502F',
                        }}>
                          {agent.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => handleDeactivate(agent._id, agent.isActive)}
                          className={`btn ${agent.isActive ? 'btn-danger' : 'btn-secondary'}`}
                          style={{ minHeight: 28, padding: '3px 8px', fontSize: 11 }}
                        >
                          {agent.isActive ? 'Deactivate' : 'Reactivate'}
                        </button>
                        <button
                          onClick={() => handleDelete(agent._id, agent.name)}
                          className="btn btn-danger"
                          style={{ minHeight: 28, padding: '3px 8px', fontSize: 11 }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="card">
        <h2 style={{ fontSize: 18, marginBottom: 15, fontFamily: 'Fraunces, serif' }}>Add New Agent Account</h2>
        {error && <div className="alert-banner">{error}</div>}
        {success && <div className="success-banner">{success}</div>}

        <form onSubmit={handleCreateAgent}>
          <div className="form-group">
            <label className="form-label" htmlFor="new-name">Agent Full Name</label>
            <input
              id="new-name"
              type="text"
              className="ruled-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rakib Sarkar"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="new-phone">Phone Number (Login username)</label>
            <input
              id="new-phone"
              type="tel"
              className="ruled-input mono"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 01700000000"
              required
              inputMode="tel"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="new-password">Login Password</label>
            <input
              id="new-password"
              type="password"
              className="ruled-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 10, display: 'flex', gap: 6 }}>
            <UserPlus size={16} /> Create Account
          </button>
        </form>
      </div>
    </div>
  );
}
