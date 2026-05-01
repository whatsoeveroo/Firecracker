export function createGlareEffect() {
  let phase = 0;

  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  }

  return {
    reset() {
      phase = 0;
    },
    update(ctx, canvas, params, dt) {
      const { radius, brightness, softness, color, streakAmount } = params;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      phase += dt * 0.4;

      const { r, g, b } = hexToRgb(color);
      const pulse = 0.92 + Math.sin(phase) * 0.08;
      const effectiveRadius = radius * pulse;

      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      // core glow
      const glowRadius = effectiveRadius * (1 + softness * 0.01);
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
      grad.addColorStop(0, `rgba(255,255,255,${brightness / 100})`);
      grad.addColorStop(0.15, `rgba(${r},${g},${b},${(brightness / 100) * 0.9})`);
      grad.addColorStop(0.5, `rgba(${r},${g},${b},${(brightness / 100) * 0.4})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
      ctx.fill();

      // streaks
      const numStreaks = Math.floor(streakAmount);
      for (let i = 0; i < numStreaks; i++) {
        const angle = (i / numStreaks) * Math.PI * 2 + phase * 0.05;
        const streakLen = effectiveRadius * (1.5 + Math.sin(phase + i) * 0.2);
        const streakWidth = Math.max(1, radius * 0.03);
        const alpha = (brightness / 100) * (0.3 + Math.sin(phase * 0.7 + i) * 0.1);

        const x1 = cx + Math.cos(angle) * streakLen * 0.05;
        const y1 = cy + Math.sin(angle) * streakLen * 0.05;
        const x2 = cx + Math.cos(angle) * streakLen;
        const y2 = cy + Math.sin(angle) * streakLen;

        const streakGrad = ctx.createLinearGradient(x1, y1, x2, y2);
        streakGrad.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
        streakGrad.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.strokeStyle = streakGrad;
        ctx.lineWidth = streakWidth;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // bright center
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 0.1);
      coreGrad.addColorStop(0, `rgba(255,255,255,${brightness / 100})`);
      coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    },
  };
}
