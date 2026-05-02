import { EFFECTS } from '../effects';
import { EFFECT_ICONS } from '../icons';

export default function EffectSelector({ activeId, onSelect }) {
  return (
    <div className="effect-selector">
      <div className="section-label">Effect Type</div>
      <div className="effect-list">
        {EFFECTS.map(fx => {
          const Icon = EFFECT_ICONS[fx.icon];
          return (
            <button
              key={fx.id}
              className={`effect-btn ${activeId === fx.id ? 'active' : ''}`}
              onClick={() => onSelect(fx.id)}
            >
              <span className="effect-icon">
                {Icon ? <Icon size={14} /> : null}
              </span>
              <span className="effect-name">{fx.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
