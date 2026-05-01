export default function ParameterSlider({ param, value, onChange }) {
  if (param.type === 'color') {
    return (
      <div className="param-row">
        <div className="param-header">
          <span className="param-label">{param.label}</span>
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
