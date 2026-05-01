import { useRef, useEffect, useCallback } from 'react';
import { EFFECTS } from '../effects';

export default function CanvasPreview({ effectId, params, canvasRef: externalRef }) {
  const canvasRef = externalRef;
  const effectRef = useRef(null);
  const animRef = useRef(null);
  const lastTimeRef = useRef(null);
  const effectIdRef = useRef(effectId);
  const paramsRef = useRef(params);

  useEffect(() => { paramsRef.current = params; }, [params]);

  useEffect(() => {
    const def = EFFECTS.find(e => e.id === effectId);
    if (!def) return;

    if (effectRef.current) effectRef.current.reset();
    effectRef.current = def.factory();
    effectIdRef.current = effectId;
  }, [effectId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
    });

    resizeObserver.observe(canvas);
    return () => resizeObserver.disconnect();
  }, [canvasRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function tick(timestamp) {
      const dt = lastTimeRef.current ? Math.min((timestamp - lastTimeRef.current) / 1000, 0.05) : 0.016;
      lastTimeRef.current = timestamp;

      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      if (effectRef.current) {
        // pass a virtual canvas with logical dimensions
        const virtualCanvas = { width: w, height: h };
        effectRef.current.update(ctx, virtualCanvas, paramsRef.current, dt);
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
