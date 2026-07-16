import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, RefreshCw, ChevronRight, CheckCircle2, Download, Eye } from 'lucide-react';
import { apiAuth, apiAgent, apiPDF } from '../../utils/api';
import { getDraft } from '../../utils/db';

export default function MPOHomePage() {
  const [completeness, setCompleteness] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(() => {
    const cached = localStorage.getItem('jupiter_user');
    return cached ? JSON.parse(cached) : null;
  });
  const [pdfMonth, setPdfMonth] = useState(new Date().getMonth() + 1);
  const [pdfYear, setPdfYear] = useState(new Date().getFullYear());

  const handlePDFAction = async (sheetType, action) => {
    if (!currentUser) return;
    try {
      const blob = await apiPDF.downloadSheet(sheetType, currentUser.id, pdfMonth, pdfYear);
      const file = new Blob([blob], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(file);
      
      if (action === 'view') {
        window.open(url, '_blank');
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${sheetType}_${currentUser.name.replace(/\s+/g, '_')}_${pdfMonth}_${pdfYear}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
      }
    } catch (err) {
      alert('Failed to generate PDF: ' + err.message);
    }
  };

  useEffect(() => {
    const checkCompleteness = async () => {
      try {
        const user = await apiAuth.me();
        const today = new Date();
        const dates = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date();
          d.setDate(today.getDate() - i);
          dates.push(d.toISOString().split('T')[0]);
        }

        const from = dates[dates.length - 1];
        const to = dates[0];

        const [works, orders, visits] = await Promise.all([
          apiAgent.getDailyWorks(user.id, from, to),
          apiAgent.getDailyOrders(user.id, from, to),
          apiAgent.getFieldVisits(user.id, from, to),
        ]);

        const worksDates = new Set(works.map((w) => w.date.split('T')[0]));
        const ordersDates = new Set(orders.map((o) => o.date.split('T')[0]));
        const visitsDates = new Set(visits.map((v) => v.date.split('T')[0]));

        const results = dates.map((dateStr) => {
          const draftWorks = getDraft('daily-works', dateStr);
          const draftOrders = getDraft('daily-orders', dateStr);
          const draftVisits = getDraft('field-visits', dateStr);

          const hasWorks = worksDates.has(dateStr) || !!draftWorks;
          const hasOrders = ordersDates.has(dateStr) || !!draftOrders;
          const hasVisits = visitsDates.has(dateStr) || !!draftVisits;

          return {
            dateStr,
            formattedDate: new Date(dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
            hasWorks,
            hasOrders,
            hasVisits,
            isComplete: hasWorks && hasOrders && hasVisits,
          };
        });

        setCompleteness(results);
      } catch (err) {
        console.error('Failed to compile logs status:', err);
      } finally {
        setLoading(false);
      }
    };

    checkCompleteness();
  }, []);

  return (
    <div className="container">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24 }}>Field Sales Ledger</h1>
        <p className="caption">Tap one of the cards below to log entry details for today.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 15, marginBottom: 30 }}>
        <div
          className="card"
          onClick={() => navigate('/mpo/daily-works')}
          style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '5px solid #2F6D4F' }}
        >
          <div>
            <h3 style={{ fontSize: 18 }}>Daily Works Sheet</h3>
            <p className="caption">Sheet 1: Log morning/afternoon market visits</p>
          </div>
          <ChevronRight color="#2F6D4F" />
        </div>

        <div
          className="card"
          onClick={() => navigate('/mpo/daily-orders')}
          style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '5px solid #2F6D4F' }}
        >
          <div>
            <h3 style={{ fontSize: 18 }}>Order &amp; Collection Sheet</h3>
            <p className="caption">Sheet 2: Log sales collections and cost lines</p>
          </div>
          <ChevronRight color="#2F6D4F" />
        </div>

        <div
          className="card"
          onClick={() => navigate('/mpo/field-visits')}
          style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '5px solid #2F6D4F' }}
        >
          <div>
            <h3 style={{ fontSize: 18 }}>Field Works Visit Sheet</h3>
            <p className="caption">Sheet 3: Log specialty doctor visit quantities</p>
          </div>
          <ChevronRight color="#2F6D4F" />
        </div>
      </div>

      <div className="card">
        <h2 style={{ fontSize: 16, marginBottom: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={18} color="#2F6D4F" /> Recent Logs Completeness
        </h2>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 10 }}>
            <RefreshCw style={{ animation: 'spin 1s infinite linear', color: '#2F6D4F' }} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {completeness.map((item, idx) => (
              <div
                key={item.dateStr}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: idx < 6 ? '1px solid #FAF7F0' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="mono" style={{ fontSize: 14, fontWeight: 600 }}>{item.formattedDate}</span>
                  {!item.isComplete && (
                    <span style={{ fontSize: 11, color: '#B5502F', backgroundColor: 'rgba(181,80,47,0.08)', padding: '2px 6px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <AlertTriangle size={10} /> Missing
                    </span>
                  )}
                  {item.isComplete && (
                    <span style={{ fontSize: 11, color: '#2F6D4F', backgroundColor: 'rgba(47,109,79,0.08)', padding: '2px 6px', borderRadius: 4 }}>
                      Done ✓
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ fontSize: 12, textDecoration: item.hasWorks ? 'none' : 'line-through', opacity: item.hasWorks ? 1 : 0.4 }}>Works</span>
                  <span style={{ fontSize: 12, textDecoration: item.hasOrders ? 'none' : 'line-through', opacity: item.hasOrders ? 1 : 0.4 }}>Orders</span>
                  <span style={{ fontSize: 12, textDecoration: item.hasVisits ? 'none' : 'line-through', opacity: item.hasVisits ? 1 : 0.4 }}>Visits</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h2 style={{ fontSize: 16, marginBottom: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Download size={18} color="#2F6D4F" /> Download Monthly PDF Replica
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 15 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="mpo-pdf-month">Month</label>
            <select id="mpo-pdf-month" value={pdfMonth} onChange={e => setPdfMonth(parseInt(e.target.value, 10))} className="ruled-input mono">
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{new Date(2026, i).toLocaleString('default', { month: 'long' })}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="mpo-pdf-year">Year</label>
            <select id="mpo-pdf-year" value={pdfYear} onChange={e => setPdfYear(parseInt(e.target.value, 10))} className="ruled-input mono">
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          {/* Sheet 1 */}
          <div style={{ borderBottom: '1px dashed #FAF7F0', paddingBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1F4D37', marginBottom: 8 }}>
              Sheet 1: Daily Works
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button 
                onClick={() => handlePDFAction('daily-works', 'view')} 
                className="btn btn-secondary" 
                style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, minHeight: 38, fontSize: 13, padding: '6px 12px' }}
              >
                <Eye size={15} /> View Online
              </button>
              <button 
                onClick={() => handlePDFAction('daily-works', 'download')} 
                className="btn btn-primary" 
                style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, minHeight: 38, fontSize: 13, padding: '6px 12px' }}
              >
                <Download size={15} /> Download
              </button>
            </div>
          </div>
          
          {/* Sheet 2 */}
          <div style={{ borderBottom: '1px dashed #FAF7F0', paddingBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1F4D37', marginBottom: 8 }}>
              Sheet 2: Order &amp; Collection
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button 
                onClick={() => handlePDFAction('daily-orders', 'view')} 
                className="btn btn-secondary" 
                style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, minHeight: 38, fontSize: 13, padding: '6px 12px' }}
              >
                <Eye size={15} /> View Online
              </button>
              <button 
                onClick={() => handlePDFAction('daily-orders', 'download')} 
                className="btn btn-primary" 
                style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, minHeight: 38, fontSize: 13, padding: '6px 12px' }}
              >
                <Download size={15} /> Download
              </button>
            </div>
          </div>

          {/* Sheet 3 */}
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1F4D37', marginBottom: 8 }}>
              Sheet 3: Field Visits
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button 
                onClick={() => handlePDFAction('field-visits', 'view')} 
                className="btn btn-secondary" 
                style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, minHeight: 38, fontSize: 13, padding: '6px 12px' }}
              >
                <Eye size={15} /> View Online
              </button>
              <button 
                onClick={() => handlePDFAction('field-visits', 'download')} 
                className="btn btn-primary" 
                style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, minHeight: 38, fontSize: 13, padding: '6px 12px' }}
              >
                <Download size={15} /> Download
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
