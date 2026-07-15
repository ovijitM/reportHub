import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { RefreshCw, Download, UserCheck } from 'lucide-react';
import { apiAgent, apiAdmin, apiPDF } from '../../utils/api';

export default function AdminOverview() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [overview, setOverview] = useState([]);
  const [loading, setLoading] = useState(true);

  const { agentId } = useParams();
  const [selectedAgentName, setSelectedAgentName] = useState('');
  const [drillData, setDrillData] = useState({ works: [], orders: [], visits: [] });
  const [drillTab, setDrillTab] = useState('works');
  const [drillLoading, setDrillLoading] = useState(false);
  const navigate = useNavigate();

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const data = await apiAdmin.getOverview(month, year);
      setOverview(data);
      if (agentId) {
        const selected = data.find((r) => r.agentId === agentId);
        if (selected) setSelectedAgentName(selected.agentName);
      }
    } catch (err) {
      console.error('Fetch overview failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [month, year, agentId]);

  useEffect(() => {
    if (!agentId) return;
    const loadDrillDown = async () => {
      setDrillLoading(true);
      const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01`;
      const endOfMonth = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;
      try {
        const [works, orders, visits] = await Promise.all([
          apiAgent.getDailyWorks(agentId, startOfMonth, endOfMonth),
          apiAgent.getDailyOrders(agentId, startOfMonth, endOfMonth),
          apiAgent.getFieldVisits(agentId, startOfMonth, endOfMonth),
        ]);
        setDrillData({ works, orders, visits });
      } catch (err) {
        console.error('Failed to load drill down details:', err);
      } finally {
        setDrillLoading(false);
      }
    };
    loadDrillDown();
  }, [agentId, month, year]);

  const handleDownloadPDF = async (sheetType, targetAgentId, agentName) => {
    try {
      const blob = await apiPDF.downloadSheet(sheetType, targetAgentId, month, year);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${sheetType}_${agentName.replace(/\s+/g, '_')}_${month}_${year}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      alert('Failed to generate PDF: ' + err.message);
    }
  };

  const handleReviewStamp = async (entryType, entryId) => {
    try {
      const updated = await apiAdmin.reviewEntry(entryType, entryId);
      const key = entryType === 'daily-works' ? 'works' : entryType === 'daily-orders' ? 'orders' : 'visits';
      setDrillData((prev) => ({
        ...prev,
        [key]: prev[key].map((item) => (item._id === entryId ? updated : item)),
      }));
    } catch (err) {
      alert('Sign-off review stamp failed: ' + err.message);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 15, marginBottom: 20 }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" htmlFor="month-select">Month</label>
          <select
            id="month-select"
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value, 10))}
            className="ruled-input mono"
            style={{ minWidth: 150 }}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2026, i).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" htmlFor="year-select">Year</label>
          <select
            id="year-select"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            className="ruled-input mono"
            style={{ minWidth: 120 }}
          >
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 30 }}>
          <RefreshCw style={{ animation: 'spin 1s infinite linear', color: '#2F6D4F', width: 30, height: 30 }} />
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="ledger-table-container">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Agent Name</th>
                  <th>Area / Region</th>
                  <th style={{ textAlign: 'right' }}>Target Amount (TK)</th>
                  <th style={{ textAlign: 'right' }}>Actual Collections (TK)</th>
                  <th style={{ textAlign: 'right' }}>Variance (TK)</th>
                  <th>Target Progress</th>
                  <th style={{ textAlign: 'center' }}>Missing Logs</th>
                  <th style={{ textAlign: 'center' }}>PDF Replica Downloads</th>
                </tr>
              </thead>
              <tbody>
                {overview.map((row) => {
                  const pct = row.targetAmount > 0 ? Math.min(100, (row.totalCollection / row.targetAmount) * 100) : 0;
                  const variance = row.totalCollection - row.targetAmount;
                  return (
                    <tr key={row.agentId} style={{ backgroundColor: agentId === row.agentId ? 'rgba(47,109,79,0.04)' : 'transparent' }}>
                      <td>
                        <button
                          onClick={() => navigate(`/admin/history/${row.agentId}`)}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: 600, color: '#2F6D4F', textDecoration: 'underline' }}
                        >
                          {row.agentName}
                        </button>
                      </td>
                      <td>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{row.area}</div>
                        <div className="caption" style={{ fontSize: 11 }}>{row.region}</div>
                      </td>
                      <td className="mono" style={{ textAlign: 'right' }}>{row.targetAmount.toLocaleString()}</td>
                      <td className="mono" style={{ textAlign: 'right' }}>{row.totalCollection.toLocaleString()}</td>
                      <td className="mono" style={{ textAlign: 'right', color: variance >= 0 ? '#2F6D4F' : '#B5502F' }}>
                        {variance >= 0 ? `+${variance.toLocaleString()}` : variance.toLocaleString()}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="progress-bar-container" style={{ width: 80, height: 6 }}>
                            <div
                              className="progress-bar"
                              style={{ width: `${pct}%`, backgroundColor: pct < 50 ? '#B5502F' : pct < 85 ? '#C98A2C' : '#2F6D4F' }}
                            />
                          </div>
                          <span className="mono" style={{ fontSize: 11 }}>{Math.round(pct)}%</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {row.missingDaysCount > 0 ? (
                          <span style={{ color: '#B5502F', fontWeight: 600, fontSize: 12 }}>{row.missingDaysCount} days</span>
                        ) : (
                          <span style={{ color: '#2F6D4F', fontWeight: 600, fontSize: 12 }}>None</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
                          <button onClick={() => handleDownloadPDF('daily-works', row.agentId, row.agentName)} className="btn btn-secondary" style={{ padding: '4px 8px', minHeight: 28, fontSize: 10 }} title="Download Sheet 1 PDF">
                            <Download size={12} /> Works
                          </button>
                          <button onClick={() => handleDownloadPDF('daily-orders', row.agentId, row.agentName)} className="btn btn-secondary" style={{ padding: '4px 8px', minHeight: 28, fontSize: 10 }} title="Download Sheet 2 PDF">
                            <Download size={12} /> Orders
                          </button>
                          <button onClick={() => handleDownloadPDF('field-visits', row.agentId, row.agentName)} className="btn btn-secondary" style={{ padding: '4px 8px', minHeight: 28, fontSize: 10 }} title="Download Sheet 3 PDF">
                            <Download size={12} /> Visits
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Drill-down history view */}
      {agentId && (
        <div className="card" style={{ marginTop: 30, borderTop: '4px solid #2F6D4F' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed #D8D2C2', paddingBottom: 10, marginBottom: 15 }}>
            <h2 style={{ fontSize: 18, fontFamily: 'Fraunces, serif' }}>History Review: {selectedAgentName || 'Loading...'}</h2>
            <div style={{ display: 'flex', gap: 5 }}>
              <button onClick={() => setDrillTab('works')} className={`btn ${drillTab === 'works' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '5px 12px', minHeight: 32, fontSize: 11 }}>Sheet 1 (Works)</button>
              <button onClick={() => setDrillTab('orders')} className={`btn ${drillTab === 'orders' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '5px 12px', minHeight: 32, fontSize: 11 }}>Sheet 2 (Orders)</button>
              <button onClick={() => setDrillTab('visits')} className={`btn ${drillTab === 'visits' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '5px 12px', minHeight: 32, fontSize: 11 }}>Sheet 3 (Visits)</button>
              <button onClick={() => navigate('/admin')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '0 10px', fontSize: 18 }}>×</button>
            </div>
          </div>

          {drillLoading ? (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <RefreshCw style={{ animation: 'spin 1s infinite linear', color: '#2F6D4F' }} />
            </div>
          ) : (
            <div className="ledger-table-container">
              {drillTab === 'works' && (
                <table className="ledger-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Morning Market</th>
                      <th>Afternoon Market</th>
                      <th>Doctor Visits</th>
                      <th>Survey notes</th>
                      <th style={{ textAlign: 'center' }}>MPO Signed</th>
                      <th style={{ textAlign: 'center' }}>Manager Signed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drillData.works.map((item) => (
                      <tr key={item._id}>
                        <td className="mono">{new Date(item.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</td>
                        <td>{item.morningMarket}</td>
                        <td>{item.afternoonMarket}</td>
                        <td className="mono">{item.doctorVisitQuantity}</td>
                        <td>{item.rxProductSurvey}</td>
                        <td style={{ textAlign: 'center' }}>{item.mpoSignedOff ? <span style={{ color: '#2F6D4F', fontWeight: 600 }}>✓</span> : '-'}</td>
                        <td style={{ textAlign: 'center' }}>
                          {item.managerSignedOff ? (
                            <span style={{ color: '#2F6D4F', display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 600 }}><UserCheck size={14} /> Verified</span>
                          ) : (
                            <button onClick={() => handleReviewStamp('daily-works', item._id)} className="btn btn-secondary" style={{ minHeight: 26, padding: '3px 8px', fontSize: 10 }}>Stamp Approve</button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {drillData.works.length === 0 && <tr><td colSpan="7" style={{ textAlign: 'center', opacity: 0.6 }}>No entries logged for Sheet 1 this month.</td></tr>}
                  </tbody>
                </table>
              )}

              {drillTab === 'orders' && (
                <table className="ledger-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Market Name</th>
                      <th style={{ textAlign: 'right' }}>Daily Order</th>
                      <th style={{ textAlign: 'right' }}>Daily Collection</th>
                      <th style={{ textAlign: 'right' }}>Docs Cost</th>
                      <th style={{ textAlign: 'right' }}>Other Cost</th>
                      <th>Remarks</th>
                      <th style={{ textAlign: 'center' }}>Manager Signed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drillData.orders.map((item) => (
                      <tr key={item._id}>
                        <td className="mono">{new Date(item.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</td>
                        <td>{item.market}</td>
                        <td className="mono" style={{ textAlign: 'right' }}>{item.dailyOrder.toLocaleString()}</td>
                        <td className="mono" style={{ textAlign: 'right' }}>{item.dailyCollection.toLocaleString()}</td>
                        <td className="mono" style={{ textAlign: 'right' }}>{item.doctorsCost.toLocaleString()}</td>
                        <td className="mono" style={{ textAlign: 'right' }}>{item.otherCost.toLocaleString()}</td>
                        <td>{item.remarks}</td>
                        <td style={{ textAlign: 'center' }}>
                          {item.managerSignedOff ? (
                            <span style={{ color: '#2F6D4F', display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 600 }}><UserCheck size={14} /> Verified</span>
                          ) : (
                            <button onClick={() => handleReviewStamp('daily-orders', item._id)} className="btn btn-secondary" style={{ minHeight: 26, padding: '3px 8px', fontSize: 10 }}>Stamp Approve</button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {drillData.orders.length === 0 && <tr><td colSpan="8" style={{ textAlign: 'center', opacity: 0.6 }}>No entries logged for Sheet 2 this month.</td></tr>}
                  </tbody>
                </table>
              )}

              {drillTab === 'visits' && (
                <table className="ledger-table" style={{ fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Market</th>
                      <th>Morn</th>
                      <th>Even</th>
                      <th>Gyn</th>
                      <th>Med</th>
                      <th>Ped</th>
                      <th>Ortho</th>
                      <th>Skin</th>
                      <th>GP</th>
                      <th style={{ fontWeight: 600 }}>Total</th>
                      <th style={{ textAlign: 'center' }}>Manager Signed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drillData.visits.map((item) => (
                      <tr key={item._id}>
                        <td className="mono">{new Date(item.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</td>
                        <td>{item.market}</td>
                        <td className="mono">{item.morningVisitQty}</td>
                        <td className="mono">{item.eveningVisitQty}</td>
                        <td className="mono">{item.gynecologistQty}</td>
                        <td className="mono">{item.medicineQty}</td>
                        <td className="mono">{item.pediatricQty}</td>
                        <td className="mono">{item.orthopaedicQty}</td>
                        <td className="mono">{item.skinVdQty}</td>
                        <td className="mono">{item.gpOthersQty}</td>
                        <td className="mono" style={{ fontWeight: 600 }}>
                          {item.totalVisitQty}
                          {item.totalVisitQtyOverridden && <span style={{ color: '#B5502F', fontWeight: 'bold' }}>*</span>}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {item.managerSignedOff ? (
                            <span style={{ color: '#2F6D4F', display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 600 }}><UserCheck size={14} /> Verified</span>
                          ) : (
                            <button onClick={() => handleReviewStamp('field-visits', item._id)} className="btn btn-secondary" style={{ minHeight: 26, padding: '3px 8px', fontSize: 10 }}>Stamp Approve</button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {drillData.visits.length === 0 && <tr><td colSpan="12" style={{ textAlign: 'center', opacity: 0.6 }}>No entries logged for Sheet 3 this month.</td></tr>}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
