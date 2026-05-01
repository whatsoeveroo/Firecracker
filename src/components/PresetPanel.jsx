import { useState } from 'react';
import { BUILT_IN_PRESETS } from '../effects/presets';

export default function PresetPanel({ effectId, currentParams, userPresets, onLoad, onSave, onDelete }) {
  const [saveOpen,  setSaveOpen]  = useState(false);
  const [saveName,  setSaveName]  = useState('');
  const [saveError, setSaveError] = useState('');

  const builtIn = BUILT_IN_PRESETS[effectId] || [];
  const user    = (userPresets[effectId] || []);

  function handleSave() {
    const name = saveName.trim();
    if (!name) { setSaveError('Name required'); return; }
    onSave(name, currentParams);
    setSaveName('');
    setSaveOpen(false);
    setSaveError('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') { setSaveOpen(false); setSaveError(''); setSaveName(''); }
  }

  return (
    <div className="preset-panel">
      <div className="preset-header">
        <span className="section-label">PRESETS</span>
        <button
          className={`preset-save-toggle ${saveOpen ? 'active' : ''}`}
          onClick={() => { setSaveOpen(o => !o); setSaveError(''); setSaveName(''); }}
          title="Save current settings as a preset"
        >
          + Save
        </button>
      </div>

      {saveOpen && (
        <div className="preset-save-form">
          <input
            className="preset-name-input"
            placeholder="Preset name…"
            value={saveName}
            onChange={e => { setSaveName(e.target.value); setSaveError(''); }}
            onKeyDown={handleKeyDown}
            autoFocus
            maxLength={32}
          />
          <button className="preset-save-confirm" onClick={handleSave}>Save</button>
          {saveError && <span className="preset-save-error">{saveError}</span>}
        </div>
      )}

      {/* Built-in presets */}
      {builtIn.length > 0 && (
        <div className="preset-group">
          <div className="preset-group-label">Built-in</div>
          <div className="preset-chips">
            {builtIn.map(p => (
              <button
                key={p.name}
                className="preset-chip"
                onClick={() => onLoad(p.params)}
                title={p.name}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* User presets */}
      {user.length > 0 && (
        <div className="preset-group">
          <div className="preset-group-label">Saved</div>
          <div className="preset-chips">
            {user.map(p => (
              <div key={p.name} className="preset-chip-row">
                <button
                  className="preset-chip user-chip"
                  onClick={() => onLoad(p.params)}
                  title={p.name}
                >
                  {p.name}
                </button>
                <button
                  className="preset-delete"
                  onClick={() => onDelete(p.name)}
                  title="Delete preset"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
