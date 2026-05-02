import { useState, useRef, useCallback } from 'react';
import EffectSelector from './components/EffectSelector';
import ControlPanel   from './components/ControlPanel';
import CanvasPreview  from './components/CanvasPreview';
import PlaybackBar    from './components/PlaybackBar';
import ExportModal    from './components/ExportModal';
import { EFFECTS }   from './effects';
import { getUserPresets, saveUserPreset, deleteUserPreset } from './effects/presets';
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
          const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
          return Math.round(255 * c).toString(16).padStart(2, '0');
        };
        return `#${f(0)}${f(8)}${f(4)}`;
      };
      out[p.key] = hslToHex(h, s, l);
    } else if (p.type === 'select') {
      const opts = p.options;
      out[p.key] = opts[Math.floor(Math.random() * opts.length)].value;
    } else if (p.min !== undefined && p.max !== undefined) {
      out[p.key] = p.min + Math.random() * (p.max - p.min);
    }
  });
  return out;
}

export default function App() {
  const [effectId,    setEffectId]    = useState('fire');
  const [params,      setParams]      = useState(() => getDefaults('fire'));
  const [userPresets, setUserPresets] = useState(() => getUserPresets());

  // ── Playback state ──────────────────────────────────────────────────────
  const [isPlaying,   setIsPlaying]   = useState(true);
  const [loop,        setLoop]        = useState(true);
  const [frameCount,  setFrameCount]  = useState(0);
  const [restartKey,  setRestartKey]  = useState(0);

  // ── Quality ─────────────────────────────────────────────────────────────
  const [quality,     setQuality]     = useState('preview');

  // ── Auto-restart on simulation-affecting param change ───────────────────
  const [autoRestart, setAutoRestart] = useState(false);

  // ── Export modal ─────────────────────────────────────────────────────────
  const [showExport,  setShowExport]  = useState(false);

  const canvasRef    = useRef(null);
  const activeEffect = EFFECTS.find(e => e.id === effectId);

  const handleEffectChange = useCallback((id) => {
    setEffectId(id);
    setParams(getDefaults(id));
    setFrameCount(0);
  }, []);

  const handleParamChange = useCallback((key, value) => {
    setParams(p => ({ ...p, [key]: value }));

    if (autoRestart) {
      const def = EFFECTS.find(e => e.id === effectId);
      const paramDef = def?.params.find(p => p.key === key);
      if (paramDef?.restartOnChange) {
        setRestartKey(k => k + 1);
      }
    }
  }, [autoRestart, effectId]);

  const handleRandomize = useCallback(() => {
    setParams(randomizeParams(activeEffect));
  }, [activeEffect]);

  const handleReset = useCallback(() => {
    setParams(getDefaults(effectId));
  }, [effectId]);

  const handleRestart = useCallback(() => {
    setRestartKey(k => k + 1);
  }, []);

  const handlePresetLoad = useCallback((presetParams) => {
    setParams(prev => ({ ...prev, ...presetParams }));
  }, []);

  const handlePresetSave = useCallback((name, currentParams) => {
    const updated = saveUserPreset(effectId, name, currentParams);
    setUserPresets({ ...updated });
  }, [effectId]);

  const handlePresetDelete = useCallback((name) => {
    const updated = deleteUserPreset(effectId, name);
    setUserPresets({ ...updated });
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

      <PlaybackBar
        isPlaying={isPlaying}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onRestart={handleRestart}
        loop={loop}
        onLoopToggle={() => setLoop(l => !l)}
        frameCount={frameCount}
        quality={quality}
        onQualityChange={setQuality}
        autoRestart={autoRestart}
        onAutoRestartToggle={setAutoRestart}
      />

      <div className="app-body">
        <aside className="sidebar">
          <EffectSelector activeId={effectId} onSelect={handleEffectChange} />
        </aside>

        <main className="preview-area">
          <CanvasPreview
            effectId={effectId}
            params={params}
            canvasRef={canvasRef}
            isPlaying={isPlaying}
            restartKey={restartKey}
            quality={quality}
            onFrameCount={setFrameCount}
          />
        </main>

        <aside className="params-sidebar">
          <ControlPanel
            effectDef={activeEffect}
            params={params}
            onChange={handleParamChange}
            onRandomize={handleRandomize}
            onReset={handleReset}
            onExport={() => setShowExport(true)}
            userPresets={userPresets}
            onPresetLoad={handlePresetLoad}
            onPresetSave={handlePresetSave}
            onPresetDelete={handlePresetDelete}
          />
        </aside>
      </div>

      {showExport && (
        <ExportModal
          effectDef={activeEffect}
          params={params}
          liveCanvasRef={canvasRef}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}
