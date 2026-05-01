import { useState, useRef, useCallback } from 'react';
import EffectSelector from './components/EffectSelector';
import ControlPanel from './components/ControlPanel';
import CanvasPreview from './components/CanvasPreview';
import { EFFECTS } from './effects';
import './App.css';

function getDefaults(effectId) {
  return { ...EFFECTS.find(e => e.id === effectId).defaults };
}

function randomizeParams(effectDef) {
  const out = {};
  effectDef.params.forEach(p => {
    if (p.type === 'color') {
      const h = Math.floor(Math.random() * 360);
      const s = 70 + Math.floor(Math.random() * 30);
      const l = 50 + Math.floor(Math.random() * 30);
      const hslToHex = (h, s, l) => {
        l /= 100; s /= 100;
        const a = s * Math.min(l, 1 - l);
        const f = n => {
          const k = (n + h / 30) % 12;
          const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
          return Math.round(255 * color).toString(16).padStart(2, '0');
        };
        return `#${f(0)}${f(8)}${f(4)}`;
      };
      out[p.key] = hslToHex(h, s, l);
    } else {
      const range = p.max - p.min;
      out[p.key] = p.min + Math.random() * range;
    }
  });
  return out;
}

export default function App() {
  const [effectId, setEffectId] = useState('fire');
  const [params, setParams] = useState(() => getDefaults('fire'));
  const canvasRef = useRef(null);

  const activeEffect = EFFECTS.find(e => e.id === effectId);

  const handleEffectChange = useCallback((id) => {
    setEffectId(id);
    setParams(getDefaults(id));
  }, []);

  const handleParamChange = useCallback((key, value) => {
    setParams(p => ({ ...p, [key]: value }));
  }, []);

  const handleRandomize = useCallback(() => {
    setParams(randomizeParams(activeEffect));
  }, [activeEffect]);

  const handleReset = useCallback(() => {
    setParams(getDefaults(effectId));
  }, [effectId]);

  const handleExport = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `firecracker-${effectId}-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [effectId]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">
          <span className="logo-icon">⬡</span>
          <span className="logo-text">FIRECRACKER</span>
        </div>
        <div className="header-tagline">VFX Generator</div>
        <div className="header-effect-name">{activeEffect.label}</div>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <EffectSelector activeId={effectId} onSelect={handleEffectChange} />
        </aside>

        <main className="preview-area">
          <CanvasPreview
            effectId={effectId}
            params={params}
            canvasRef={canvasRef}
          />
        </main>

        <aside className="params-sidebar">
          <ControlPanel
            effectDef={activeEffect}
            params={params}
            onChange={handleParamChange}
            onRandomize={handleRandomize}
            onReset={handleReset}
            onExport={handleExport}
          />
        </aside>
      </div>
    </div>
  );
}
