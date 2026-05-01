import { EFFECTS } from '../effects';

export default function EffectSelector({ activeId, onSelect }) {
  return (
    <div className="effect-selector">
      <div className="section-label">EFFECT TYPE</div>
      <div className="effect-list">
        {EFFECTS.map(fx => (
          <button
            key={fx.id}
            className={`effect-btn ${activeId === fx.id ? 'active' : ''}`}
            onClick={() => onSelect(fx.id)}
          >
            <span className="effect-icon">{fx.icon}</span>
            <span className="effect-name">{fx.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
