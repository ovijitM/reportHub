import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiAuth, apiAgent, apiAdmin, OfflineError } from '../../utils/api';
import MarketSelect from '../../components/MarketSelect';
import StepperInput from '../../components/StepperInput';

export default function Sheet1Form() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [existingId, setExistingId] = useState(null);
  const [morningMarket, setMorningMarket] = useState('');
  const [afternoonMarket, setAfternoonMarket] = useState('');
  const [doctorVisit, setDoctorVisit] = useState(0);
  const [rxSurvey, setRxSurvey] = useState('');

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

        const entries = await apiAgent.getDailyWorks(user.id, date, date);
        if (entries && entries.length > 0) {
          const e = entries[0];
          setExistingId(e._id);
          setMorningMarket(e.morningMarket || '');
          setAfternoonMarket(e.afternoonMarket || '');
          setDoctorVisit(e.doctorVisitQuantity || 0);
          setRxSurvey(e.rxProductSurvey || '');
        } else {
          setMorningMarket('');
          setAfternoonMarket('');
          setDoctorVisit(0);
          setRxSurvey('');
        }
      } catch (err) {
        console.error('Failed to load entry for date:', err);
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
      morningMarket,
      afternoonMarket,
      doctorVisitQuantity: doctorVisit,
      rxProductSurvey: rxSurvey,
    };

    try {
      await apiAgent.submitDailyWorks(date, payload);
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
        <h2 style={{ fontSize: 18, fontFamily: 'Fraunces, serif' }}>Daily Works Sheet</h2>
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
            <label className="form-label" htmlFor="date-s1">Select Date</label>
            <input
              id="date-s1"
              type="date"
              className="ruled-input mono"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <MarketSelect
            id="morningMarket"
            label="Morning Visit Market"
            value={morningMarket}
            onChange={setMorningMarket}
            markets={markets}
            required
          />

          <MarketSelect
            id="afternoonMarket"
            label="Afternoon Visit Market"
            value={afternoonMarket}
            onChange={setAfternoonMarket}
            markets={markets}
            required
          />

          <StepperInput
            id="doctor-stepper"
            label="Doctors Visited Quantity"
            value={doctorVisit}
            onChange={setDoctorVisit}
          />

          <div className="form-group">
            <label className="form-label" htmlFor="rxSurvey">Rx-Product Survey (Optional)</label>
            <textarea
              id="rxSurvey"
              className="ruled-input"
              value={rxSurvey}
              onChange={(e) => setRxSurvey(e.target.value)}
              placeholder="Enter survey notes or remarks"
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
