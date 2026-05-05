export default function ParameterSlider({ param, value, onChange }) {
  if (param.type === 'toggle') {
    const checked = value === 'on' || value === true;

    const trackStyle = {
      position: 'relative',
      width: 30,
      height: 16,
      borderRadius: 999,
      background: checked ? 'var(--accent-bg-mid)' : 'var(--bg-raised)',
      border: checked ? '1px solid var(--accent-dim)' : '1px solid var(--border)',
      boxShadow: checked ? '0 0 8px var(--accent-glow)' : 'none',
      transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s',
      flexShrink: 0,
    };

    const knobStyle = {
      position: 'absolute',
      top: 2,
      left: 2,
      width: 10,
      height: 10,
      borderRadius: '50%',
      background: checked ? 'var(--accent)' : 'var(--text-dim)',
      transform: checked ? 'translateX(14px)' : 'translateX(0)',
      transition: 'transform 0.15s, background 0.15s',
    };

    return (
      <div className="param-row" style={{ padding: '9px 0' }}>
        <div className="param-header" style={{ alignItems: 'center', marginBottom: 0 }}>
          <span className="param-label">{param.label}</span>
          {param.hint && <span className="param-hint">{param.hint}</span>}
          <button
            type="button"
            aria-pressed={checked}
            onClick={() => onChange(param.key, checked ? 'off' : 'on')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              border: 0,
              background: 'transparent',
              color: checked ? 'var(--accent)' : 'var(--text-dim)',
              cursor: 'pointer',
              fontFamily: 'var(--font)',
              padding: 0,
              flexShrink: 0,
            }}
          >
            <span style={trackStyle}>
              <span style={knobStyle} />
            </span>
            <span style={{ minWidth: 18, fontSize: 10, fontWeight: 500, letterSpacing: '0.04em', textAlign: 'right' }}>
              {checked ? 'On' : 'Off'}
            </span>
          </button>
        </div>
      </div>
    );
  }

  if (param.type === 'color') {
    return (
      <div className="param-row">
        <div className="param-header">
          <span className="param-label">{param.label}</span>
          {param.hint && <span className="param-hint">{param.hint}</span>}
          <span className="param-value color-swatch-preview" style={{ background: value }} />
        </div>
        <input
          type="color"
          value={value}
          onChange={e => onChange(param.key, e.target.value)}
          className="color-input"
        />
      </div>
    );
  }

  if (param.type === 'select') {
    return (
      <div className="param-row">
        <div className="param-header">
          <span className="param-label">{param.label}</span>
          {param.hint && <span className="param-hint">{param.hint}</span>}
        </div>
        <select
          className="select-input"
          value={value}
          onChange={e => onChange(param.key, e.target.value)}
        >
          {param.options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    );
  }

  const pct = ((value - param.min) / (param.max - param.min)) * 100;

  return (
    <div className="param-row">
      <div className="param-header">
        <span className="param-label">{param.label}</span>
        {param.hint && <span className="param-hint">{param.hint}</span>}
        <span className="param-value">{Math.round(value)}</span>
      </div>
      <div className="slider-track">
        <div className="slider-fill" style={{ width: `${pct}%` }} />
        <input
          type="range"
          min={param.min}
          max={param.max}
          value={value}
          onChange={e => onChange(param.key, Number(e.target.value))}
          className="slider-input"
        />
      </div>
    </div>
  );
}
