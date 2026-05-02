import { useState } from 'react';
import ParameterSlider from './ParameterSlider';
import PresetPanel from './PresetPanel';
import { IconRandomize, IconReset, IconExport } from '../icons';

export default function ControlPanel({
  effectDef, params, onChange,
  onRandomize, onReset, onExport,
  userPresets, onPresetLoad, onPresetSave, onPresetDelete,
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const basicParams    = effectDef.params.filter(p => !p.advanced);
  const advancedParams = effectDef.params.filter(p =>  p.advanced);
  const hasAdvanced    = advancedParams.length > 0;

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
        {basicParams.map(param => (
          <ParameterSlider
            key={param.key}
            param={param}
            value={params[param.key]}
            onChange={onChange}
          />
        ))}
      </div>

      {hasAdvanced && (
        <div className="advanced-section">
          <button
            className={`advanced-toggle ${showAdvanced ? 'open' : ''}`}
            onClick={() => setShowAdvanced(v => !v)}
          >
            <span className="advanced-toggle-arrow">{showAdvanced ? '▾' : '▸'}</span>
            Advanced
          </button>
          {showAdvanced && (
            <div className="params-list advanced-params">
              {advancedParams.map(param => (
                <ParameterSlider
                  key={param.key}
                  param={param}
                  value={params[param.key]}
                  onChange={onChange}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="panel-actions">
        <button className="action-btn randomize-btn" onClick={onRandomize}>
          <span className="btn-icon"><IconRandomize size={13} /></span> Randomize
        </button>
        <button className="action-btn reset-btn" onClick={onReset}>
          <span className="btn-icon"><IconReset size={13} /></span> Reset
        </button>
        <button className="action-btn export-btn" onClick={onExport}>
          <span className="btn-icon"><IconExport size={13} /></span> Export…
        </button>
      </div>
    </div>
  );
}
