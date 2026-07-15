import React, { useState, useEffect } from 'react';
import { RefreshCw, ChevronDown, ChevronRight, MapPin, Plus, Edit2, Trash2 } from 'lucide-react';
import { apiAdmin } from '../../utils/api';

export default function AdminMasterMarkets() {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Registration Form states
  const [newMarketsText, setNewMarketsText] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [customArea, setCustomArea] = useState('');
  const [isCustomAreaMode, setIsCustomAreaMode] = useState(false);
  
  // Editing Form states
  const [editingMarket, setEditingMarket] = useState(null);
  const [editName, setEditName] = useState('');
  const [editArea, setEditArea] = useState('');
  const [editCustomArea, setEditCustomArea] = useState('');
  const [isEditCustomAreaMode, setIsEditCustomAreaMode] = useState(false);

  // Accordion state (stores whether an area is expanded: { [areaName]: boolean })
  const [expandedAreas, setExpandedAreas] = useState({});
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadMarkets = async () => {
    setLoading(true);
    try {
      const allMarkets = await apiAdmin.getMarkets();
      setMarkets(allMarkets);
      
      // Auto-expand all areas on initial load so the database is visible
      const uniqueAreas = [...new Set(allMarkets.map(m => m.area || 'Unassigned Area'))];
      const initialExpanded = {};
      uniqueAreas.forEach(areaName => {
        initialExpanded[areaName] = true;
      });
      setExpandedAreas(initialExpanded);
    } catch (err) {
      console.error('Failed to load markets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMarkets();
  }, []);

  // Extract unique areas from the loaded markets database
  const existingAreas = [...new Set(markets.map(m => m.area).filter(Boolean))].sort();

  const handleAreaChange = (e) => {
    const val = e.target.value;
    setSelectedArea(val);
    if (val === '__new_area__') {
      setIsCustomAreaMode(true);
      setCustomArea('');
    } else {
      setIsCustomAreaMode(false);
      setCustomArea('');
    }
  };

  const handleAddMarkets = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    const targetArea = isCustomAreaMode ? customArea.trim() : selectedArea.trim();
    if (!targetArea) {
      setError('Please select or specify an Area name.');
      setSubmitting(false);
      return;
    }

    // Split input markets by comma, trim, filter empty lines
    const marketNames = newMarketsText
      .split(',')
      .map(name => name.trim())
      .filter(Boolean);

    if (marketNames.length === 0) {
      setError('Please enter at least one market name.');
      setSubmitting(false);
      return;
    }

    try {
      // Register all markets sequentially/concurrently
      await Promise.all(
        marketNames.map(name => apiAdmin.createMarket(name, targetArea))
      );

      setSuccess(`Successfully added ${marketNames.length} market(s) under Area "${targetArea}"!`);
      setNewMarketsText('');
      setCustomArea('');
      setIsCustomAreaMode(false);
      
      // Select the newly added or updated Area in the dropdown
      setSelectedArea(targetArea);
      
      // Reload list and ensure this Area is expanded in accordion
      await loadMarkets();
      setExpandedAreas(prev => ({ ...prev, [targetArea]: true }));
    } catch (err) {
      setError(err.message || 'One or more markets failed to register. They may already exist.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarketClick = (m) => {
    setEditingMarket(m);
    setEditName(m.name);
    setEditArea(m.area || '');
    setIsEditCustomAreaMode(false);
    setEditCustomArea('');
    setError('');
    setSuccess('');
  };

  const handleUpdateMarket = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    
    const targetArea = isEditCustomAreaMode ? editCustomArea.trim() : editArea.trim();
    if (!targetArea) {
      setError('Please select or specify an Area name.');
      setSubmitting(false);
      return;
    }

    try {
      await apiAdmin.updateMarket(editingMarket._id, {
        name: editName.trim(),
        area: targetArea
      });
      setSuccess(`Market "${editName}" updated successfully!`);
      setEditingMarket(null);
      await loadMarkets();
    } catch (err) {
      setError(err.message || 'Failed to update market');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMarket = async () => {
    if (!window.confirm(`Are you sure you want to delete market "${editingMarket.name}"?`)) {
      return;
    }
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      await apiAdmin.deleteMarket(editingMarket._id);
      setSuccess(`Market "${editingMarket.name}" deleted successfully.`);
      setEditingMarket(null);
      await loadMarkets();
    } catch (err) {
      setError(err.message || 'Failed to delete market');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleArea = (areaName) => {
    setExpandedAreas(prev => ({
      ...prev,
      [areaName]: !prev[areaName]
    }));
  };

  // Group loaded markets by Area Name
  const groupedMarkets = markets.reduce((acc, m) => {
    const areaName = m.area ? m.area.trim() : 'Unassigned Area';
    if (!acc[areaName]) {
      acc[areaName] = [];
    }
    acc[areaName].push(m);
    return acc;
  }, {});

  const sortedGroupedAreas = Object.keys(groupedMarkets).sort();

  return (
    <div className="admin-grid-2-1">
      <div className="card">
        <h2 style={{ fontSize: 18, marginBottom: 10, fontFamily: 'Fraunces, serif' }}>Area Database</h2>
        <p className="caption" style={{ marginBottom: 20 }}>
          Click an Area header below to expand/collapse. **Click any market pill tag** to edit, reassign, or delete it.
        </p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 25 }}>
            <RefreshCw style={{ animation: 'spin 1s infinite linear', color: '#2F6D4F' }} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sortedGroupedAreas.map((areaName) => {
              const list = groupedMarkets[areaName];
              const isExpanded = !!expandedAreas[areaName];
              return (
                <div 
                  key={areaName} 
                  style={{
                    border: '1px solid #D8D2C2',
                    borderRadius: 6,
                    overflow: 'hidden',
                    backgroundColor: '#FFFFFF'
                  }}
                >
                  {/* Collapsible Area Header */}
                  <div
                    onClick={() => toggleArea(areaName)}
                    style={{
                      padding: '12px 15px',
                      backgroundColor: '#FAF7F0',
                      borderBottom: isExpanded ? '1px solid #D8D2C2' : 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      userSelect: 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <MapPin size={16} color="#2F6D4F" />
                      <span style={{ fontWeight: 600, color: '#1F4D37', fontSize: 15 }}>
                        {areaName}
                      </span>
                      <span className="caption" style={{ fontSize: 12, backgroundColor: 'rgba(31, 42, 36, 0.08)', padding: '2px 8px', borderRadius: 10 }}>
                        {list.length} {list.length === 1 ? 'market' : 'markets'}
                      </span>
                    </div>
                    <div>
                      {isExpanded ? (
                        <ChevronDown size={18} color="#999" />
                      ) : (
                        <ChevronRight size={18} color="#999" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Markets Body */}
                  {isExpanded && (
                    <div style={{ padding: 15, backgroundColor: '#FFFFFF' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {list.map((m) => (
                          <div 
                            key={m._id} 
                            onClick={() => handleMarketClick(m)}
                            title="Click to edit or delete"
                            style={{ 
                              fontSize: 13, 
                              backgroundColor: editingMarket && editingMarket._id === m._id 
                                ? '#B5502F' 
                                : 'rgba(47,109,79,0.06)', 
                              color: editingMarket && editingMarket._id === m._id 
                                ? '#FFFFFF' 
                                : '#2F6D4F', 
                              padding: '6px 12px', 
                              borderRadius: 20, 
                              border: editingMarket && editingMarket._id === m._id 
                                ? '1px solid #B5502F' 
                                : '1px solid rgba(47,109,79,0.15)',
                              fontWeight: 500,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              transition: 'all 0.15s ease-in-out',
                              userSelect: 'none'
                            }}
                            className="market-pill-tag"
                          >
                            <span>{m.name}</span>
                            <Edit2 size={10} style={{ opacity: 0.6 }} />
                          </div>
                        ))}
                        {list.length === 0 && (
                          <span className="caption" style={{ fontStyle: 'italic' }}>No markets in this area.</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {markets.length === 0 && (
              <p className="caption" style={{ textAlign: 'center', padding: 30 }}>
                No Areas or Markets registered yet. Use the form on the right to register them.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Edit Market or Register Markets Panel */}
      {editingMarket ? (
        <div className="card" style={{ border: '1px solid #B5502F', boxShadow: '0 4px 12px rgba(181, 80, 47, 0.08)' }}>
          <h2 style={{ fontSize: 18, marginBottom: 15, fontFamily: 'Fraunces, serif', color: '#B5502F', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Edit2 size={18} /> Manage Market
          </h2>
          {error && <div className="alert-banner">{error}</div>}
          {success && <div className="success-banner">{success}</div>}

          <form onSubmit={handleUpdateMarket}>
            <div className="form-group">
              <label className="form-label" htmlFor="edit-market-name">Market Name</label>
              <input
                id="edit-market-name"
                type="text"
                className="ruled-input"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                required
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="edit-area-select">Parent Area</label>
              <select
                id="edit-area-select"
                className="ruled-input"
                value={editArea}
                onChange={e => {
                  const val = e.target.value;
                  setEditArea(val);
                  setIsEditCustomAreaMode(val === '__new_area__');
                }}
                required={!isEditCustomAreaMode}
                disabled={submitting}
              >
                <option value="">-- Select Existing Area --</option>
                {existingAreas.map((areaName) => (
                  <option key={areaName} value={areaName}>{areaName}</option>
                ))}
                <option value="__new_area__">-- Register New Area --</option>
              </select>
            </div>

            {isEditCustomAreaMode && (
              <div className="form-group" style={{ animation: 'fadeIn 0.2s ease' }}>
                <label className="form-label" htmlFor="edit-custom-area">New Area Name</label>
                <input
                  id="edit-custom-area"
                  type="text"
                  className="ruled-input"
                  value={editCustomArea}
                  onChange={e => setEditCustomArea(e.target.value)}
                  placeholder="e.g. Nasirnagar"
                  required={isEditCustomAreaMode}
                  disabled={submitting}
                />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', backgroundColor: '#B5502F', borderColor: '#B5502F' }}
                disabled={submitting}
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
              
              <button 
                type="button" 
                className="btn btn-danger" 
                style={{ width: '100%' }}
                onClick={handleDeleteMarket}
                disabled={submitting}
              >
                Delete Market
              </button>
              
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ width: '100%' }}
                onClick={() => setEditingMarket(null)}
                disabled={submitting}
              >
                Cancel / Back
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="card">
          <h2 style={{ fontSize: 18, marginBottom: 15, fontFamily: 'Fraunces, serif' }}>Register Markets</h2>
          {error && <div className="alert-banner">{error}</div>}
          {success && <div className="success-banner">{success}</div>}

          <form onSubmit={handleAddMarkets}>
            {/* Select or Create Area */}
            <div className="form-group">
              <label className="form-label" htmlFor="area-select">Parent Area</label>
              <select
                id="area-select"
                className="ruled-input"
                value={selectedArea}
                onChange={handleAreaChange}
                required={!isCustomAreaMode}
                disabled={submitting}
              >
                <option value="">-- Select Existing Area --</option>
                {existingAreas.map((areaName) => (
                  <option key={areaName} value={areaName}>{areaName}</option>
                ))}
                <option value="__new_area__">-- Register New Area --</option>
              </select>
            </div>

            {isCustomAreaMode && (
              <div className="form-group" style={{ animation: 'fadeIn 0.2s ease' }}>
                <label className="form-label" htmlFor="custom-area-input">New Area Name</label>
                <input
                  id="custom-area-input"
                  type="text"
                  className="ruled-input"
                  value={customArea}
                  onChange={(e) => setCustomArea(e.target.value)}
                  placeholder="Type new Area name (e.g. Nasirnagar)"
                  required={isCustomAreaMode}
                  disabled={submitting}
                />
              </div>
            )}

            {/* Bulk Markets list */}
            <div className="form-group">
              <label className="form-label" htmlFor="market-names-input">Market Names</label>
              <textarea
                id="market-names-input"
                className="ruled-input"
                value={newMarketsText}
                onChange={(e) => setNewMarketsText(e.target.value)}
                placeholder="Enter market names separated by commas (e.g. Choin, Fandauk, Sarail, Sonail)"
                style={{ minHeight: 90 }}
                required
                disabled={submitting}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: 10, display: 'flex', gap: 6 }}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <RefreshCw style={{ animation: 'spin 1s infinite linear' }} size={16} /> Adding...
                </>
              ) : (
                <>
                  <Plus size={16} /> Register Markets
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
