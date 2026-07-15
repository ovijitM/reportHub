import React, { useState, useEffect } from 'react';

/**
 * Reusable market selector supporting multiple checkbox selections
 * and a custom text input, joined with "+" (e.g. "Nasirnagar+Choin").
 */
export default function MarketSelect({
  id,
  label,
  value = '',
  onChange,
  markets = [],
  required = false,
  optional = false,
}) {
  // Parse incoming value string (e.g. "Nasirnagar+Choin+Custom")
  const parts = value ? value.split('+').map(p => p.trim()).filter(Boolean) : [];
  const selectedMarkets = parts.filter(p => markets.includes(p));
  const customParts = parts.filter(p => !markets.includes(p));
  const customValue = customParts.join('+');

  const [customText, setCustomText] = useState(customValue);

  // Sync customText when value changes from parent (e.g. on page/date load)
  useEffect(() => {
    setCustomText(customValue);
  }, [value]);

  const handleToggleMarket = (m, isChecked) => {
    let nextSelected;
    if (isChecked) {
      nextSelected = selectedMarkets.filter(x => x !== m);
    } else {
      nextSelected = [...selectedMarkets, m];
    }
    
    const newParts = [...nextSelected];
    if (customText.trim()) {
      newParts.push(customText.trim());
    }
    onChange(newParts.join('+'));
  };

  const handleCustomChange = (newCustomText) => {
    setCustomText(newCustomText);
    const newParts = [...selectedMarkets];
    if (newCustomText.trim()) {
      newParts.push(newCustomText.trim());
    }
    onChange(newParts.join('+'));
  };

  return (
    <div className="form-group" style={{ marginBottom: 18 }}>
      <label className="form-label" style={{ display: 'block', marginBottom: 6 }}>
        {label}
        {optional && (
          <span style={{ color: '#999', fontSize: 11, marginLeft: 4 }}>(optional)</span>
        )}
      </label>

      {/* Hidden input for native HTML5 validation */}
      <input
        type="text"
        id={id}
        value={value}
        onChange={() => {}}
        required={required}
        style={{
          width: 1,
          height: 1,
          opacity: 0,
          padding: 0,
          margin: 0,
          border: 'none',
          position: 'absolute',
          pointerEvents: 'none'
        }}
      />

      {/* Checkbox grid for assigned markets */}
      {markets.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px 16px',
          padding: '10px 12px',
          backgroundColor: '#FAF7F0',
          border: '1px solid #D8D2C2',
          borderRadius: 4,
          marginBottom: 8
        }}>
          {markets.map((m) => {
            const isChecked = selectedMarkets.includes(m);
            return (
              <label
                key={m}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 13,
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleToggleMarket(m, isChecked)}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ color: isChecked ? '#1F4D37' : '#555', fontWeight: isChecked ? 600 : 400 }}>
                  {m}
                </span>
              </label>
            );
          })}
        </div>
      )}

      {/* Text input for typing a custom market */}
      <div>
        <input
          type="text"
          className="ruled-input"
          value={customText}
          onChange={(e) => handleCustomChange(e.target.value)}
          placeholder="Type other custom market name (use + for multiple)"
          style={{ fontSize: 13 }}
        />
      </div>
    </div>
  );
}
