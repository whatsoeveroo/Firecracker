import { Fragment, useState } from 'react';
import ParameterSlider from './ParameterSlider';
import PresetPanel from './PresetPanel';
import { IconRandomize, IconReset, IconExport } from '../icons';

function groupedParams(paramList) {
  if (!paramList.some(p => p.group)) return [{ label: null, items: paramList }];
  const groups = [];
  let cur = null;
  for (const p of paramList) {
    const g = p.group || '';
    if (!cur || cur.label !== g) { cur = { label: g, items: [] }; groups.push(cur); }
    cur.items.push(p);
  }
  return groups;
}

function sectionedParams(items) {
  const sections = [];
  let cur = null;
  for (const p of items) {
    const label = p.subgroup || null;
    if (!cur || cur.label !== label) { cur = { label, items: [] }; sections.push(cur); }
    cur.items.push(p);
  }
  return sections;
}

export default function ControlPanel({
  effectDef, params, colorMode, onColorModeChange, onChange,
  onRandomize, onReset, onExport,
  userPresets, onPresetLoad, onPresetSave, onPresetDelete,
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const isVisible = param => !param.visibleWhen || param.visibleWhen(params);

  const basicParams    = effectDef.params.filter(p => !p.advanced && isVisible(p));
  const advancedParams = effectDef.params.filter(p =>  p.advanced && isVisible(p));
  const hasAdvanced    = advancedParams.length > 0;
  const groups         = groupedParams(basicParams);
  const advancedGroups = groupedParams(advancedParams);

  return (
    <div className="control-panel">
      <div className="appearance-panel">
        <div>
          <div className="section-label appearance-label">BACKPLATE</div>
          <div className="appearance-hint">Use Day for smoke and burnout detail.</div>
        </div>
        <div className="theme-toggle panel-theme-toggle" role="group" aria-label="Backplate color mode">
          <button
            type="button"
            className={`theme-toggle-btn ${colorMode === 'dark' ? 'active' : ''}`}
            aria-pressed={colorMode === 'dark'}
            onClick={() => onColorModeChange('dark')}
          >
            Dark
          </button>
          <button
            type="button"
            className={`theme-toggle-btn ${colorMode === 'day' ? 'active' : ''}`}
            aria-pressed={colorMode === 'day'}
            onClick={() => onColorModeChange('day')}
          >
            Day
          </button>
        </div>
      </div>

      <div className="divider" />

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
        {groups.map(({ label, items }) => (
          <div key={label || '_ungrouped'} className={label ? 'param-group' : undefined}>
            {label && <div className="param-group-label">{label}</div>}
            {sectionedParams(items).map(({ label: subgroup, items: subItems }) => (
              <Fragment key={subgroup || 'default'}>
                {subgroup && <div className="param-subgroup-label">{subgroup}</div>}
                {subItems.map(param => (
                  <ParameterSlider
                    key={param.key}
                    param={param}
                    value={params[param.key]}
                    onChange={onChange}
                  />
                ))}
              </Fragment>
            ))}
          </div>
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
              {advancedGroups.map(({ label, items }) => (
                <div key={label || '_advanced'} className={label ? 'param-group' : undefined}>
                  {label && <div className="param-group-label">{label}</div>}
                  {sectionedParams(items).map(({ label: subgroup, items: subItems }) => (
                    <Fragment key={subgroup || 'default'}>
                      {subgroup && <div className="param-subgroup-label">{subgroup}</div>}
                      {subItems.map(param => (
                        <ParameterSlider
                          key={param.key}
                          param={param}
                          value={params[param.key]}
                          onChange={onChange}
                        />
                      ))}
                    </Fragment>
                  ))}
                </div>
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
