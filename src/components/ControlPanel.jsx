import ParameterSlider from './ParameterSlider';
import PresetPanel from './PresetPanel';

export default function ControlPanel({
  effectDef, params, onChange,
  onRandomize, onReset, onExport,
  userPresets, onPresetLoad, onPresetSave, onPresetDelete,
}) {
  return (
    <div className="control-panel">
      <PresetPanel
        effectId={effectDef.id}
        currentParams={params}
        userPresets={userPresets}
        onLoad={onPresetLoad}
        onSave={onPresetSave}
        onDelete={onPresetDelete}
      />

      <div className="divider" />

      <div className="section-label" style={{ padding: '0 0 8px' }}>PARAMETERS</div>
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
