import { useState } from 'react';
import { exportVideo, snapshotPNG, downloadBlob } from '../utils/exporter';

const RESOLUTIONS   = [512, 1024, 2048];
const FPS_OPTS      = [24, 30, 60];
const DURATION_OPTS = [5, 10, 15, 30];
const QUALITIES     = [
  { id: 'preview', label: 'Preview' },
  { id: 'high',    label: 'High'    },
  { id: 'ultra',   label: 'Ultra'   },
];

const FORMAT_OPTS = [
  { value: 'webm', label: 'WebM' },
  { value: 'mp4',  label: 'MP4'  },
  { value: 'mov',  label: 'MOV'  },
  { value: 'png',  label: 'PNG'  },
];

export default function ExportModal({ effectDef, params, liveCanvasRef, onClose }) {
  const [format,     setFormat]     = useState('webm');
  const [background, setBackground] = useState('black');
  const [duration,   setDuration]   = useState(5);
  const [fps,        setFps]        = useState(30);
  const [resolution, setResolution] = useState(1024);
  const [quality,    setQuality]    = useState('high');
  const [progress,   setProgress]   = useState(null);  // null = idle
  const [error,      setError]      = useState(null);

  const running = progress !== null;
  const isVideo = format !== 'png';
  const supportsAlpha = format === 'webm';

  async function handleExport() {
    setError(null);
    setProgress(0);

    try {
      let blob;

      if (format === 'png') {
        // Snapshot current live frame
        blob = await snapshotPNG(liveCanvasRef.current);
        downloadBlob(blob, `firecracker-${effectDef.id}-${Date.now()}.png`);
      } else {
        const exportBackground = supportsAlpha ? background : 'black';
        blob = await exportVideo(
          effectDef.factory,
          params,
          { format, duration, fps, resolution, exportQuality: quality, background: exportBackground },
          p => setProgress(p),
        );
        downloadBlob(blob, `firecracker-${effectDef.id}-${duration}s-${resolution}p-${fps}fps.${format}`);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setProgress(null);
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={e => { if (e.target === e.currentTarget && !running) onClose(); }}
    >
      <div className="modal-panel">
        <div className="modal-header">
          <span className="modal-title">EXPORT — {effectDef.label.toUpperCase()}</span>
          <button className="modal-close" onClick={onClose} disabled={running}>✕</button>
        </div>

        <div className="modal-body">
          <ModalRow label="Format">
            <SegControl
              value={format}
              onChange={setFormat}
              options={FORMAT_OPTS}
            />
          </ModalRow>

          {isVideo && <>
            <ModalRow label="Background">
              {supportsAlpha ? (
                <>
                  <SegControl
                    value={background}
                    onChange={setBackground}
                    options={[
                      { value: 'black',       label: 'Black'       },
                      { value: 'transparent', label: 'Transparent' },
                    ]}
                  />
                  <div className="modal-note">
                    {background === 'transparent'
                      ? 'VP9 alpha — compatible with AE & Blender'
                      : 'Black bg — Screen/Add blend in AE / Blender'}
                  </div>
                </>
              ) : (
                <div className="modal-note">
                  H.264 export uses a baked black background. Use WebM for transparency.
                </div>
              )}
            </ModalRow>

            <ModalRow label="Duration">
              <SegControl
                value={duration}
                onChange={setDuration}
                options={DURATION_OPTS.map(d => ({ value: d, label: `${d}s` }))}
              />
            </ModalRow>

            <ModalRow label="FPS">
              <SegControl
                value={fps}
                onChange={setFps}
                options={FPS_OPTS.map(f => ({ value: f, label: String(f) }))}
              />
            </ModalRow>

            <ModalRow label="Resolution">
              <SegControl
                value={resolution}
                onChange={setResolution}
                options={RESOLUTIONS.map(r => ({ value: r, label: `${r}px` }))}
              />
            </ModalRow>

            <ModalRow label="Quality">
              <SegControl
                value={quality}
                onChange={setQuality}
                options={QUALITIES.map(q => ({ value: q.id, label: q.label }))}
              />
            </ModalRow>

            <div className="modal-estimate">
              ~{duration}s at {fps}fps · {resolution}×{resolution}px ·&nbsp;
              {format === 'webm'
                ? 'frame-accurate render when WebCodecs is available'
                : `${format.toUpperCase()} H.264 real-time render`}
            </div>
          </>}
        </div>

        {error && <div className="modal-error">{error}</div>}

        {running && (
          <div className="modal-progress-wrap">
            <div className="modal-progress-bar" style={{ width: `${Math.round((progress ?? 0) * 100)}%` }} />
            <span className="modal-progress-label">{Math.round((progress ?? 0) * 100)}%</span>
          </div>
        )}

        <div className="modal-footer">
          <button className="modal-cancel" onClick={onClose} disabled={running}>
            Cancel
          </button>
          <button className="modal-export-action" onClick={handleExport} disabled={running}>
            {running ? 'Exporting…' : '↓ Export'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalRow({ label, children }) {
  return (
    <div className="modal-row">
      <span className="modal-row-label">{label}</span>
      <div className="modal-row-control">{children}</div>
    </div>
  );
}

function SegControl({ value, onChange, options }) {
  return (
    <div className="seg-control">
      {options.map(o => (
        <button
          key={o.value}
          className={`seg-btn ${value === o.value ? 'seg-active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
