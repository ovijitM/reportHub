import React, { useState, useEffect } from 'react';
import { RefreshCw, Check } from 'lucide-react';
import { apiAdmin } from '../../utils/api';

export default function AdminMonthlyConfigs() {
  const [agents, setAgents] = useState([]);
  const [managers, setManagers] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  
  const [area, setArea] = useState('');
  const [region, setRegion] = useState('');
  const [target, setTarget] = useState('');
  const [salary, setSalary] = useState('');
  const [hqDA, setHqDA] = useState('');
  const [exDA, setExDA] = useState('');
  const [supervisingManager, setSupervisingManager] = useState('');
  const [assignedMarkets, setAssignedMarkets] = useState([]);
  
  const [markets, setMarkets] = useState([]);
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isCustomArea, setIsCustomArea] = useState(false);

  useEffect(() => {
    const loadInit = async () => {
      try {
        const [users, allMarkets] = await Promise.all([
          apiAdmin.getAgents(),
          apiAdmin.getMarkets()
        ]);
        setAgents(users.filter(u => u.role === 'staff'));
        setMarkets(allMarkets);
        if (users.length > 0) {
          const staffUsers = users.filter(u => u.role === 'staff');
          if (staffUsers.length > 0) setSelectedAgentId(staffUsers[0]._id);
        }
        const cached = localStorage.getItem('jupiter_user');
        if (cached) {
          const me = JSON.parse(cached);
          setManagers([{ _id: me.id, name: me.name }]);
          setSupervisingManager(me.id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadInit();
  }, []);

  useEffect(() => {
    if (!selectedAgentId) return;
    setLoading(true);
    setMsg(null);
    apiAdmin.getMonthlyConfig(selectedAgentId, month, year)
      .then(config => {
        if (config) {
          setArea(config.area);
          setRegion(config.region);
          setTarget(config.targetAmount);
          setSalary(config.perMonthSalary);
          setHqDA(config.headQuarterDA);
          setExDA(config.exQuarterDA);
          setSupervisingManager(config.supervisingManagerId || '');
          setAssignedMarkets(config.marketList || []);
          
          // Auto-detect custom area mode
          const matchExists = markets.some(m => m.area && m.area.toLowerCase() === (config.area || '').toLowerCase());
          if (config.area && !matchExists) {
            setIsCustomArea(true);
          } else {
            setIsCustomArea(false);
          }
        } else {
          setArea('');
          setRegion('');
          setTarget('');
          setSalary('');
          setHqDA('');
          setExDA('');
          setSupervisingManager('');
          setAssignedMarkets([]);
          setIsCustomArea(false);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [selectedAgentId, month, year, markets]);

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setMsg(null);

    const payload = {
      area,
      region,
      supervisingManagerId: supervisingManager || selectedAgentId,
      marketList: assignedMarkets,
      headQuarterDA: parseFloat(hqDA || 0),
      exQuarterDA: parseFloat(exDA || 0),
      perMonthSalary: parseFloat(salary || 0),
      targetAmount: parseFloat(target || 0)
    };

    try {
      await apiAdmin.saveMonthlyConfig(selectedAgentId, month, year, payload);
      setMsg({ type: 'success', text: 'Monthly settings configured successfully!' });
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Saving failed' });
    }
  };

  const handleMarketToggle = (mName) => {
    if (assignedMarkets.includes(mName)) {
      setAssignedMarkets(prev => prev.filter(m => m !== mName));
    } else {
      setAssignedMarkets(prev => [...prev, mName]);
    }
  };

  return (
    <div className="card">
      <h2 style={{ fontSize: 18, marginBottom: 15, fontFamily: 'Fraunces, serif' }}>Assign MPO Monthly Parameters</h2>
      
      {msg && (
        <div className={msg.type === 'success' ? 'success-banner' : 'alert-banner'} style={{ marginBottom: 20 }}>
          {msg.text}
        </div>
      )}

      <div className="admin-grid-1-1-1" style={{ marginBottom: 25, paddingBottom: 15, borderBottom: '1px dashed #D8D2C2' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" htmlFor="config-agent-select">Select MPO Agent</label>
          <select id="config-agent-select" value={selectedAgentId} onChange={e => setSelectedAgentId(e.target.value)} className="ruled-input" style={{ fontWeight: 600 }}>
            {agents.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" htmlFor="config-month-select">Month</label>
          <select id="config-month-select" value={month} onChange={e => setMonth(parseInt(e.target.value, 10))} className="ruled-input mono">
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{new Date(2026, i).toLocaleString('default', { month: 'long' })}</option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" htmlFor="config-year-select">Year</label>
          <select id="config-year-select" value={year} onChange={e => setYear(parseInt(e.target.value, 10))} className="ruled-input mono">
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 20 }}><RefreshCw style={{ animation: 'spin 1s infinite linear', color: '#2F6D4F' }} /></div>
      ) : (
        <form onSubmit={handleSaveConfig}>
          <div className="admin-grid-1-1">
            <div>
              <h3 style={{ fontSize: 15, marginBottom: 15, borderBottom: '1px solid #FAF7F0', paddingBottom: 5 }}>Area & Regional targets</h3>
              
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="config-area-select">Area Name</label>
                  <select
                    id="config-area-select"
                    className="ruled-input"
                    value={isCustomArea ? '__custom_area__' : area}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '__custom_area__') {
                        setIsCustomArea(true);
                        setArea('');
                      } else {
                        setIsCustomArea(false);
                        setArea(val);
                      }
                    }}
                    required={!isCustomArea}
                  >
                    <option value="">-- Select Area --</option>
                    {[...new Set(markets.map(m => m.area).filter(Boolean))].sort().map((areaName) => (
                      <option key={areaName} value={areaName}>{areaName}</option>
                    ))}
                    <option value="__custom_area__">-- Enter Custom Area --</option>
                  </select>

                  {isCustomArea && (
                    <div style={{ marginTop: 8, animation: 'fadeIn 0.2s ease' }}>
                      <input
                        id="config-area"
                        type="text"
                        className="ruled-input"
                        value={area}
                        onChange={(e) => setArea(e.target.value)}
                        placeholder="Type new Area name (e.g. Nasirnagar)"
                        required={isCustomArea}
                      />
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="config-region">Region Name</label>
                  <input id="config-region" type="text" className="ruled-input" value={region} onChange={e => setRegion(e.target.value)} placeholder="e.g. Sylhet" required />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="config-target">Monthly Target Amount (TK)</label>
                  <input id="config-target" type="number" className="ruled-input mono" value={target} onChange={e => setTarget(e.target.value)} placeholder="0" required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="config-salary">Per Month Salary (TK)</label>
                  <input id="config-salary" type="number" className="ruled-input mono" value={salary} onChange={e => setSalary(e.target.value)} placeholder="0" required />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="config-hqda">Head Quarter D/A (TK)</label>
                  <input id="config-hqda" type="number" className="ruled-input mono" value={hqDA} onChange={e => setHqDA(e.target.value)} placeholder="0" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="config-exda">Ex-Quarter D/A (TK)</label>
                  <input id="config-exda" type="number" className="ruled-input mono" value={exDA} onChange={e => setExDA(e.target.value)} placeholder="0" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Supervising Manager</label>
                <div style={{ padding: '8px 10px', backgroundColor: '#FAF7F0', border: '1px solid #D8D2C2', borderRadius: 4, fontSize: 13 }}>
                  {managers.length > 0 ? managers[0].name : 'Current Manager'} <span style={{ color: '#999', fontSize: 11 }}>(auto-assigned)</span>
                </div>
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: 15, marginBottom: 10, borderBottom: '1px solid #FAF7F0', paddingBottom: 5 }}>Select Active Markets for MPO</h3>
              <p className="caption" style={{ marginBottom: 12 }}>
                {area.trim() 
                  ? `Showing markets under Area "${area}". Check off assigned markets.` 
                  : 'Type an Area Name on the left to filter markets, or select from all:'}
              </p>
              <div style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid #D8D2C2', padding: 10, backgroundColor: '#FAF7F0', borderRadius: 4 }}>
                {(() => {
                  const filtered = markets.filter(m => {
                    if (!area.trim()) return true;
                    return m.area && m.area.toLowerCase() === area.trim().toLowerCase();
                  });

                  return (
                    <>
                      {filtered.map((m) => {
                        const mName = m.name;
                        const chkId = `market-chk-${mName.replace(/\s+/g, '-')}`;
                        return (
                          <div key={m._id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                            <input 
                              id={chkId}
                              type="checkbox" 
                              checked={assignedMarkets.includes(mName)} 
                              onChange={() => handleMarketToggle(mName)} 
                              style={{ cursor: 'pointer' }}
                            />
                            <label 
                              htmlFor={chkId}
                              style={{ fontSize: 14, cursor: 'pointer', flex: 1, userSelect: 'none', padding: '2px 0' }}
                            >
                              {mName}
                              {m.area && !area.trim() && (
                                <span style={{ marginLeft: 6, fontSize: 10, color: '#999' }}>({m.area})</span>
                              )}
                            </label>
                          </div>
                        );
                      })}
                      {filtered.length === 0 && (
                        <p className="caption" style={{ textAlign: 'center', padding: 20 }}>
                          No markets registered under Area "{area}". Add them in Master Markets, or type custom markets directly on mobile.
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ minWidth: 200, marginTop: 25, display: 'flex', gap: 6 }}><Check size={16} /> Save Configuration</button>
        </form>
      )}
    </div>
  );
}
