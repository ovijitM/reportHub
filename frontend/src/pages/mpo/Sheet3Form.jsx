import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiAuth, apiAgent, apiAdmin, OfflineError } from '../../utils/api';
import MarketSelect from '../../components/MarketSelect';
import StepperInput from '../../components/StepperInput';

export default function Sheet3Form() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [existingId, setExistingId] = useState(null);
  const [area, setArea] = useState('');
  const [market, setMarket] = useState('');
  const [morningVisit, setMorningVisit] = useState('');
  const [eveningVisit, setEveningVisit] = useState('');

  const [gyn, setGyn] = useState(0);
  const [med, setMed] = useState(0);
  const [ped, setPed] = useState(0);
  const [ortho, setOrtho] = useState(0);
  const [skin, setSkin] = useState(0);
  const [gp, setGp] = useState(0);

  const [totalVisit, setTotalVisit] = useState(0);
  const [isManualTotal, setIsManualTotal] = useState(false);

  const [markets, setMarkets] = useState([]);
  const [loadingEntry, setLoadingEntry] = useState(false);
  const [msg, setMsg] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const computedTotal = gyn + med + ped + ortho + skin + gp;

  useEffect(() => {
    if (!isManualTotal) {
      setTotalVisit(computedTotal);
    }
  }, [computedTotal, isManualTotal]);

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
        if (config) {
          setArea(config.area || '');
          if (config.marketList && config.marketList.length > 0) {
            setMarkets(config.marketList);
          } else {
            const masterMarkets = await apiAdmin.getMarkets();
            setMarkets(masterMarkets.map((mk) => mk.name));
          }
        } else {
          const masterMarkets = await apiAdmin.getMarkets();
          setMarkets(masterMarkets.map((mk) => mk.name));
        }

        const entries = await apiAgent.getFieldVisits(user.id, date, date);
        if (entries && entries.length > 0) {
          const e = entries[0];
          setExistingId(e._id);
          setMarket(e.market || '');
          setMorningVisit(e.morningVisit || '');
          setEveningVisit(e.eveningVisit || '');
          setGyn(e.gynecologistQty || 0);
          setMed(e.medicineQty || 0);
          setPed(e.pediatricQty || 0);
          setOrtho(e.orthopaedicQty || 0);
          setSkin(e.skinVdQty || 0);
          setGp(e.gpOthersQty || 0);
          setTotalVisit(e.totalVisitQty || 0);
          setIsManualTotal(e.totalVisitQtyOverridden || false);
        } else {
          setMarket('');
          setMorningVisit('');
          setEveningVisit('');
          setGyn(0); setMed(0); setPed(0); setOrtho(0); setSkin(0); setGp(0);
          setTotalVisit(0);
          setIsManualTotal(false);
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
      area,
      market,
      morningVisit,
      eveningVisit,
      gynecologistQty: gyn,
      medicineQty: med,
      pediatricQty: ped,
      orthopaedicQty: ortho,
      skinVdQty: skin,
      gpOthersQty: gp,
      totalVisitQty: totalVisit,
      totalVisitQtyOverridden: isManualTotal && computedTotal !== totalVisit,
    };

    try {
      await apiAgent.submitFieldVisits(date, payload);
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
        <h2 style={{ fontSize: 18, fontFamily: 'Fraunces, serif' }}>Field Works Visit Sheet</h2>
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
            <label className="form-label" htmlFor="date-s3">Select Date</label>
            <input
              id="date-s3"
              type="date"
              className="ruled-input mono"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="area-s3">Area</label>
              <input
                id="area-s3"
                type="text"
                className="ruled-input"
                value={area}
                readOnly
                placeholder="Auto-loaded from configuration"
              />
            </div>
            <MarketSelect
              id="market-s3"
              label="Market Name"
              value={market}
              onChange={setMarket}
              markets={markets}
              required
            />
          </div>

          <div style={{ margin: '15px 0', borderBottom: '1px dashed #D8D2C2', paddingBottom: 15 }}>
            <h3 style={{ fontSize: 14, marginBottom: 10 }}>Log Visit Scopes</h3>
            <div className="grid-2">
              <MarketSelect
                id="morning-visit"
                label="Morning Visit Market"
                value={morningVisit}
                onChange={setMorningVisit}
                markets={markets}
                optional
              />
              <MarketSelect
                id="evening-visit"
                label="Evening Visit Market"
                value={eveningVisit}
                onChange={setEveningVisit}
                markets={markets}
                optional
              />
            </div>
          </div>

          <div style={{ margin: '15px 0' }}>
            <h3 style={{ fontSize: 14, marginBottom: 10 }}>Specialty Breakdown (Doctors Count)</h3>
            <div className="grid-2">
              <StepperInput id="gyn-stepper" label="Gynecologist" value={gyn} onChange={setGyn} />
              <StepperInput id="med-stepper" label="Medicine" value={med} onChange={setMed} />
              <StepperInput id="ped-stepper" label="Pediatric" value={ped} onChange={setPed} />
              <StepperInput id="ortho-stepper" label="Orthopaedic" value={ortho} onChange={setOrtho} />
              <StepperInput id="skin-stepper" label="Skin / VD" value={skin} onChange={setSkin} />
              <StepperInput id="gp-stepper" label="GP &amp; Others" value={gp} onChange={setGp} />
            </div>
          </div>

          <div style={{ marginTop: 15, padding: 10, borderTop: '1px dashed #D8D2C2', backgroundColor: '#FAF7F0', borderRadius: 4 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" htmlFor="totalVisit" style={{ margin: 0 }}>Total Visits</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isManualTotal}
                    onChange={(e) => {
                      setIsManualTotal(e.target.checked);
                      if (!e.target.checked) setTotalVisit(computedTotal);
                    }}
                  />
                  Manual Override
                </label>
              </div>
              <input
                id="totalVisit"
                type="number"
                className="ruled-input mono"
                value={totalVisit}
                onChange={(e) => setTotalVisit(Math.max(0, parseInt(e.target.value || '0', 10)))}
                disabled={!isManualTotal}
                style={{ fontWeight: 600, color: isManualTotal ? '#B5502F' : '#1F2A24' }}
              />
              {isManualTotal && computedTotal !== totalVisit && (
                <span style={{ fontSize: 11, color: '#B5502F', marginTop: 3 }}>
                  * Total overridden manually. Specialty sum is {computedTotal}.
                </span>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 20 }}
            disabled={submitting || loadingEntry}
          >
            {submitting ? 'Saving...' : existingId && existingId !== 'saved' ? 'Update Entry' : 'Save Entry'}
          </button>
        </form>
      </div>
    </div>
  );
}
