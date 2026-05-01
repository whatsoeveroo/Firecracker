import ParameterSlider from './ParameterSlider';

export default function ControlPanel({ effectDef, params, onChange, onRandomize, onReset, onExport }) {
  return (
    <div className="control-panel">
      <div className="section-label">PARAMETERS</div>
      <div className="params-list">
        {effectDef.params.map(param => (
          <ParameterSlider
            key={param.key}
            param={param}
            value={params[param.key]}
            onChange={onChange}
          />
        ))}
      </div>

      <div className="panel-actions">
        <button className="action-btn randomize-btn" onClick={onRandomize}>
          <span className="btn-icon">⟳</span> Randomize
        </button>
        <button className="action-btn reset-btn" onClick={onReset}>
          <span className="btn-icon">↺</span> Reset
        </button>
        <button className="action-btn export-btn" onClick={onExport}>
          <span className="btn-icon">↓</span> Export PNG
        </button>
      </div>
    </div>
  );
}
