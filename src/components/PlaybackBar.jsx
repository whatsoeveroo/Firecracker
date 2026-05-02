import { QUALITY_LEVELS } from '../utils/qualityLevels';

export default function PlaybackBar({
  isPlaying, onPlay, onPause, onRestart,
  loop, onLoopToggle,
  frameCount,
  quality, onQualityChange,
  autoRestart, onAutoRestartToggle,
}) {
  return (
    <div className="playback-bar">
      {/* Transport */}
      <div className="pb-group pb-transport">
        <button
          className={`pb-btn pb-play ${isPlaying ? 'pb-btn-active' : ''}`}
          onClick={isPlaying ? onPause : onPlay}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button className="pb-btn" onClick={onRestart} title="Restart simulation">
          ↺
        </button>
        <button
          className={`pb-btn ${loop ? 'pb-btn-active' : ''}`}
          onClick={onLoopToggle}
          title="Toggle loop"
        >
          ⟳
        </button>
        <span className="pb-frame" title="Frame counter">
          F&thinsp;{String(frameCount).padStart(5, '0')}
        </span>
      </div>

      <div className="pb-divider" />

      {/* Quality */}
      <div className="pb-group pb-quality-group">
        <span className="pb-section-label">PREVIEW</span>
        <div className="pb-segs">
          {Object.values(QUALITY_LEVELS).map(ql => (
            <button
              key={ql.id}
              className={`pb-seg ${quality === ql.id ? 'pb-seg-active' : ''}`}
              onClick={() => onQualityChange(ql.id)}
            >
              {ql.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pb-divider" />

      {/* Auto-restart */}
      <div className="pb-group">
        <label className="pb-toggle" title="Restart simulation when a simulation parameter changes">
          <span className="pb-toggle-track">
            <input
              type="checkbox"
              checked={autoRestart}
              onChange={e => onAutoRestartToggle(e.target.checked)}
            />
            <span className="pb-toggle-knob" />
          </span>
          <span className="pb-toggle-label">Auto-restart</span>
        </label>
      </div>
    </div>
  );
}
