import React from 'react';

/**
 * Reusable +/- stepper number input.
 *
 * Props:
 *   id     - input id
 *   label  - label text
 *   value  - number
 *   onChange - called with new number value
 *   min    - minimum value (default 0)
 */
export default function StepperInput({ id, label, value, onChange, min = 0 }) {
  const decrement = () => onChange(Math.max(min, value - 1));
  const increment = () => onChange(value + 1);

  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>{label}</label>
      <div className="stepper-container">
        <div
          className="stepper-btn"
          onClick={decrement}
          role="button"
          aria-label={`Decrease ${label}`}
        >
          -
        </div>
        <input
          id={id}
          type="number"
          className="stepper-value"
          value={value}
          onChange={(e) => onChange(Math.max(min, parseInt(e.target.value || '0', 10)))}
          inputMode="numeric"
        />
        <div
          className="stepper-btn"
          onClick={increment}
          role="button"
          aria-label={`Increase ${label}`}
        >
          +
        </div>
      </div>
    </div>
  );
}
