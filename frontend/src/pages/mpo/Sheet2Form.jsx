import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiAuth, apiAgent, apiAdmin, OfflineError } from '../../utils/api';
import MarketSelect from '../../components/MarketSelect';

export default function Sheet2Form() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [existingId, setExistingId] = useState(null);
  const [market, setMarket] = useState('');
  const [doctorsCost, setDoctorsCost] = useState('');
  const [otherCost, setOtherCost] = useState('');
  const [dailyOrder, setDailyOrder] = useState('');
  const [dailyCollection, setDailyCollection] = useState('');
  const [remarks, setRemarks] = useState('');

  const [markets, setMarkets] = useState([]);
  const [loadingEntry, setLoadingEntry] = useState(false);
  const [msg, setMsg] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadDateData = async () => {
      setLoadingEntry(true);
      setExistingId(null);
      setMsg(null);
      try {
        const user = await apiAuth.me();
        const d = new Date(date);
        const m = d.getMonth() + 1;
        const y = d.getFullYear();

        const config = await apiAdmin.getMonthlyConfig(user.id, m, y);
        if (config && config.marketList && config.marketList.length > 0) {
          setMarkets(config.marketList);
        } else {
          const masterMarkets = await apiAdmin.getMarkets();
          setMarkets(masterMarkets.map((mk) => mk.name));
        }

        const entries = await apiAgent.getDailyOrders(user.id, date, date);
        if (entries && entries.length > 0) {
          const e = entries[0];
          setExistingId(e._id);
          setMarket(e.market || '');
          setDoctorsCost(e.doctorsCost > 0 ? String(e.doctorsCost) : '');
          setOtherCost(e.otherCost > 0 ? String(e.otherCost) : '');
          setDailyOrder(e.dailyOrder > 0 ? String(e.dailyOrder) : '');
          setDailyCollection(e.dailyCollection > 0 ? String(e.dailyCollection) : '');
          setRemarks(e.remarks || '');
        } else {
          setMarket('');
          setDoctorsCost('');
          setOtherCost('');
          setDailyOrder('');
          setDailyCollection('');
          setRemarks('');
        }
      } catch (err) {
        console.error('Failed to load entry:', err);
      } finally {
        setLoadingEntry(false);
      }
    };
    loadDateData();
  }, [date]);

  const handleSave = async (e) => {
    e.preventDefault();
    setMsg(null);
    setSubmitting(true);

    const payload = {
      market,
      doctorsCost: parseFloat(doctorsCost || 0),
      otherCost: parseFloat(otherCost || 0),
      dailyOrder: parseFloat(dailyOrder || 0),
      dailyCollection: parseFloat(dailyCollection || 0),
      remarks,
    };

    try {
      await apiAgent.submitDailyOrders(date, payload);
      setMsg({ type: 'success', text: `✅ Entry saved for ${date}! ${existingId ? '(updated)' : '(new)'}` });
      setExistingId('saved');
    } catch (err) {
      if (err instanceof OfflineError) {
        setMsg({ type: 'warning', text: 'Offline. Entry saved locally and queued for synchronization.' });
      } else {
        setMsg({ type: 'error', text: err.message || 'Submission failed' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button onClick={() => navigate('/mpo')} style={{ background: 'transparent', border: 'none', color: '#2F6D4F', cursor: 'pointer', fontSize: 16 }}>← Home</button>
        <h2 style={{ fontSize: 18, fontFamily: 'Fraunces, serif' }}>Order &amp; Collection Sheet</h2>
      </div>

      {msg && (
        <div className={msg.type === 'success' ? 'success-banner' : msg.type === 'warning' ? 'warning-banner' : 'alert-banner'}>
          {msg.text}
        </div>
      )}

      <div className="card">
        {loadingEntry && (
          <div style={{ textAlign: 'center', padding: 10, color: '#2F6D4F', fontSize: 13 }}>Loading entry for this date...</div>
        )}
        {!loadingEntry && existingId && existingId !== 'saved' && (
          <div style={{ marginBottom: 12, padding: '6px 10px', backgroundColor: 'rgba(47,109,79,0.08)', borderRadius: 4, fontSize: 13, color: '#2F6D4F', border: '1px solid rgba(47,109,79,0.2)' }}>
            ✏️ Editing existing entry for this date. Save to update.
          </div>
        )}
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label" htmlFor="date-s2">Select Date</label>
            <input
              id="date-s2"
              type="date"
              className="ruled-input mono"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <MarketSelect
            id="market-s2"
            label="Market Name"
            value={market}
            onChange={setMarket}
            markets={markets}
            required
          />

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="dailyOrder">Daily Order (TK)</label>
              <input
                id="dailyOrder"
                type="number"
                className="ruled-input mono"
                value={dailyOrder}
                onChange={(e) => setDailyOrder(e.target.value)}
                placeholder="0"
                inputMode="numeric"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="dailyCollection">Daily Collection (TK)</label>
              <input
                id="dailyCollection"
                type="number"
                className="ruled-input mono"
                value={dailyCollection}
                onChange={(e) => setDailyCollection(e.target.value)}
                placeholder="0"
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="doctorsCost">Doctors Cost (TK)</label>
              <input
                id="doctorsCost"
                type="number"
                className="ruled-input mono"
                value={doctorsCost}
                onChange={(e) => setDoctorsCost(e.target.value)}
                placeholder="0"
                inputMode="numeric"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="otherCost">Other Cost (TK)</label>
              <input
                id="otherCost"
                type="number"
                className="ruled-input mono"
                value={otherCost}
                onChange={(e) => setOtherCost(e.target.value)}
                placeholder="0"
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="remarks-s2">Remarks (Optional)</label>
            <textarea
              id="remarks-s2"
              className="ruled-input"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter remarks or details"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 10 }}
            disabled={submitting || loadingEntry}
          >
            {submitting ? 'Saving...' : existingId && existingId !== 'saved' ? 'Update Entry' : 'Save Entry'}
          </button>
        </form>
      </div>
    </div>
  );
}
