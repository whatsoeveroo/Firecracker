import { useState, useRef, useCallback, useEffect } from 'react';
import EffectSelector from './components/EffectSelector';
import ControlPanel   from './components/ControlPanel';
import CanvasPreview  from './components/CanvasPreview';
import PlaybackBar    from './components/PlaybackBar';
import ExportModal    from './components/ExportModal';
import { EFFECTS }   from './effects';
import { getUserPresets, saveUserPreset, deleteUserPreset } from './effects/presets';
import { IconLogoMark } from './icons';
import './App.css';

const ACCENTS = {
  orange:  { '--accent':'#e85d26','--accent-glow':'rgba(232,93,38,0.2)','--accent-dim':'#8a3010','--slider-fill':'#e85d26','--accent-bg-faint':'rgba(232,93,38,0.08)','--accent-bg-soft':'rgba(232,93,38,0.12)','--accent-bg-mid':'rgba(232,93,38,0.18)','--accent-bg-strong':'rgba(232,93,38,0.22)','--accent-glow-hard':'rgba(232,93,38,0.4)' },
  red:     { '--accent':'#e83a3a','--accent-glow':'rgba(232,58,58,0.2)','--accent-dim':'#8a1010','--slider-fill':'#e83a3a','--accent-bg-faint':'rgba(232,58,58,0.08)','--accent-bg-soft':'rgba(232,58,58,0.12)','--accent-bg-mid':'rgba(232,58,58,0.18)','--accent-bg-strong':'rgba(232,58,58,0.22)','--accent-glow-hard':'rgba(232,58,58,0.4)' },
  green:   { '--accent':'#2ec76a','--accent-glow':'rgba(46,199,106,0.2)','--accent-dim':'#0f6a30','--slider-fill':'#2ec76a','--accent-bg-faint':'rgba(46,199,106,0.08)','--accent-bg-soft':'rgba(46,199,106,0.12)','--accent-bg-mid':'rgba(46,199,106,0.18)','--accent-bg-strong':'rgba(46,199,106,0.22)','--accent-glow-hard':'rgba(46,199,106,0.4)' },
  blue:    { '--accent':'#4a8fff','--accent-glow':'rgba(74,143,255,0.2)','--accent-dim':'#1a4a9a','--slider-fill':'#4a8fff','--accent-bg-faint':'rgba(74,143,255,0.08)','--accent-bg-soft':'rgba(74,143,255,0.12)','--accent-bg-mid':'rgba(74,143,255,0.18)','--accent-bg-strong':'rgba(74,143,255,0.22)','--accent-glow-hard':'rgba(74,143,255,0.4)' },
  purple:  { '--accent':'#9b6fff','--accent-glow':'rgba(155,111,255,0.2)','--accent-dim':'#5a2aaa','--slider-fill':'#9b6fff','--accent-bg-faint':'rgba(155,111,255,0.08)','--accent-bg-soft':'rgba(155,111,255,0.12)','--accent-bg-mid':'rgba(155,111,255,0.18)','--accent-bg-strong':'rgba(155,111,255,0.22)','--accent-glow-hard':'rgba(155,111,255,0.4)' },
  neutral: { '--accent':'#a8a8bc','--accent-glow':'rgba(168,168,188,0.15)','--accent-dim':'#484860','--slider-fill':'#a8a8bc','--accent-bg-faint':'rgba(168,168,188,0.07)','--accent-bg-soft':'rgba(168,168,188,0.10)','--accent-bg-mid':'rgba(168,168,188,0.14)','--accent-bg-strong':'rgba(168,168,188,0.18)','--accent-glow-hard':'rgba(168,168,188,0.28)' },
};

const ACCENT_SWATCHES = [
  { key: 'orange',  color: '#e85d26' },
  { key: 'red',     color: '#e83a3a' },
  { key: 'green',   color: '#2ec76a' },
  { key: 'blue',    color: '#4a8fff' },
  { key: 'purple',  color: '#9b6fff' },
  { key: 'neutral', color: '#a8a8bc' },
];

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

const COLOR_MODE_STORAGE_KEY = 'firecracker-color-mode';

function getInitialColorMode() {
  if (typeof window === 'undefined') return 'dark';

  try {
    const savedMode = window.localStorage.getItem(COLOR_MODE_STORAGE_KEY);
    return savedMode === 'day' ? 'day' : 'dark';
  } catch {
    return 'dark';
  }
}

export default function App() {
  const [effectId,    setEffectId]    = useState('fire');
  const [params,      setParams]      = useState(() => getDefaults('fire'));
  const [userPresets, setUserPresets] = useState(() => getUserPresets());
  const [accentKey,   setAccentKey]   = useState('orange');
  const [colorMode,   setColorMode]   = useState(getInitialColorMode);

  const [isPlaying,   setIsPlaying]   = useState(true);
  const [loop,        setLoop]        = useState(true);
  const [frameCount,  setFrameCount]  = useState(0);
  const [restartKey,  setRestartKey]  = useState(0);
  const [quality,     setQuality]     = useState('preview');
  const [autoRestart, setAutoRestart] = useState(false);
  const [showExport,  setShowExport]  = useState(false);

  const canvasRef    = useRef(null);
  const activeEffect = EFFECTS.find(e => e.id === effectId);

  useEffect(() => {
    document.documentElement.dataset.theme = colorMode;
    try {
      window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, colorMode);
    } catch {
      // The mode still applies for this session when storage is unavailable.
    }
  }, [colorMode]);

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
      if (paramDef?.restartOnChange) setRestartKey(k => k + 1);
    }
  }, [autoRestart, effectId]);

  const handleRandomize    = useCallback(() => setParams(randomizeParams(activeEffect)), [activeEffect]);
  const handleReset        = useCallback(() => setParams(getDefaults(effectId)), [effectId]);
  const handleRestart      = useCallback(() => setRestartKey(k => k + 1), []);
  // Apply presets over the effect defaults, not the previous params —
  // otherwise keys a preset doesn't define (e.g. blastStyle) stick around
  const handlePresetLoad   = useCallback((p)    => setParams({ ...getDefaults(effectId), ...p }), [effectId]);
  const handlePresetSave   = useCallback((n, p) => setUserPresets({ ...saveUserPreset(effectId, n, p) }), [effectId]);
  const handlePresetDelete = useCallback((n)    => setUserPresets({ ...deleteUserPreset(effectId, n) }), [effectId]);

  return (
    <div className="app" style={ACCENTS[accentKey]}>
      <header className="app-header">
        <div className="logo">
          <span className="logo-icon"><IconLogoMark size={20} /></span>
          <span className="logo-text">FIRECRACKER</span>
        </div>
        <div className="header-tagline">VFX Generator</div>
        <div className="accent-picker">
          {ACCENT_SWATCHES.map(s => (
            <button
              key={s.key}
              className={`accent-swatch${accentKey === s.key ? ' active' : ''}`}
              style={{ background: s.color }}
              onClick={() => setAccentKey(s.key)}
              title={s.key}
            />
          ))}
        </div>
        <div className="header-effect-name">{activeEffect.label}</div>
        <div className="theme-toggle" role="group" aria-label="Backplate color mode">
          <button
            type="button"
            className={`theme-toggle-btn ${colorMode === 'dark' ? 'active' : ''}`}
            aria-pressed={colorMode === 'dark'}
            onClick={() => setColorMode('dark')}
          >
            Dark
          </button>
          <button
            type="button"
            className={`theme-toggle-btn ${colorMode === 'day' ? 'active' : ''}`}
            aria-pressed={colorMode === 'day'}
            onClick={() => setColorMode('day')}
          >
            Day
          </button>
        </div>
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
            colorMode={colorMode}
            onColorModeChange={setColorMode}
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
