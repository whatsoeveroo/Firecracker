import { useRef, useEffect } from 'react';
import { EFFECTS } from '../effects';

export default function CanvasPreview({
  effectId, params, canvasRef,
  isPlaying,  // bool — when false, dt is zeroed so simulation freezes
  restartKey, // increment to reset the current effect
  quality,    // 'draft' | 'preview' | 'high' | 'ultra'
  onFrameCount,
}) {
  const effectRef    = useRef(null);
  const animRef      = useRef(null);
  const lastTimeRef  = useRef(null);
  const paramsRef    = useRef(params);
  const isPlayingRef = useRef(isPlaying);
  const qualityRef   = useRef(quality);
  const frameRef     = useRef(0);
  const onFrameCountRef = useRef(onFrameCount);

  // Keep refs in sync so the rAF closure always reads current values
  useEffect(() => { paramsRef.current    = params;    }, [params]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { qualityRef.current   = quality;   }, [quality]);
  useEffect(() => { onFrameCountRef.current = onFrameCount; }, [onFrameCount]);

  // Swap effect when effectId changes
  useEffect(() => {
    const def = EFFECTS.find(e => e.id === effectId);
    if (!def) return;
    if (effectRef.current) effectRef.current.reset?.();
    effectRef.current = def.factory();
    frameRef.current  = 0;
    onFrameCountRef.current?.(0);
    lastTimeRef.current = null;
  }, [effectId]);

  // Reset (without swapping) when restartKey increments
  useEffect(() => {
    if (effectRef.current) effectRef.current.reset?.();
    frameRef.current  = 0;
    onFrameCountRef.current?.(0);
    lastTimeRef.current = null;
  }, [restartKey]);

  // DPR-aware resize observer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ro = new ResizeObserver(() => {
      const dpr  = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width  = rect.width  * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
    });

    ro.observe(canvas);
    return () => ro.disconnect();
  }, [canvasRef]);

  // Main render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function tick(timestamp) {
      const rawDt = lastTimeRef.current
        ? Math.min((timestamp - lastTimeRef.current) / 1000, 0.05)
        : 0.016;
      lastTimeRef.current = timestamp;

      // Freeze simulation when paused; still draws last state
      const dt = isPlayingRef.current ? rawDt : 0;

      if (dt > 0) {
        frameRef.current += 1;
        onFrameCountRef.current?.(frameRef.current);
      }

      const dpr = window.devicePixelRatio || 1;
      const w   = canvas.width  / dpr;
      const h   = canvas.height / dpr;

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      if (effectRef.current) {
        const renderOpts = { quality: qualityRef.current, isExport: false };
        effectRef.current.update(ctx, { width: w, height: h }, paramsRef.current, dt, renderOpts);
      }

      animRef.current = requestAnimationFrame(tick);
    }

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [canvasRef]);

  return (
    <div className="canvas-wrapper">
      <canvas ref={canvasRef} className="preview-canvas" />
      <div className="canvas-crosshair" />
      <div className="canvas-label">PREVIEW</div>
    </div>
  );
}
