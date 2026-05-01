export function createRaysEffect() {
  let phase = 0;

  return {
    reset() {
      phase = 0;
    },
    update(ctx, canvas, params, dt) {
      const { rayCount, rayLength, angle: angleOffset, softness, opacity } = params;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      phase += dt * 0.3;

      const maxLen = Math.min(canvas.width, canvas.height) * (rayLength / 100) * 0.9;

      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      for (let i = 0; i < rayCount; i++) {
        const angle =
          (i / rayCount) * Math.PI * 2 +
          (angleOffset * Math.PI) / 180 +
          phase * 0.04;
        const wobble = Math.sin(phase * 1.1 + i * 2.3) * 0.06;
        const actualAngle = angle + wobble;

        // ray width narrows with softness
        const halfWidth = Math.max(0.005, (1 - softness / 100) * 0.06) * Math.PI;
        const segments = 3;

        for (let s = 0; s < segments; s++) {
          const off = ((s - 1) / segments) * halfWidth;
          const rayAngle = actualAngle + off;
          const xEnd = cx + Math.cos(rayAngle) * maxLen;
          const yEnd = cy + Math.sin(rayAngle) * maxLen;

          const grad = ctx.createLinearGradient(cx, cy, xEnd, yEnd);
          const a = (opacity / 100) * (1 - Math.abs(off) / halfWidth) * 0.7;
          grad.addColorStop(0, `rgba(255,245,200,${Math.min(1, a)})`);
          grad.addColorStop(0.3, `rgba(255,200,100,${a * 0.6})`);
          grad.addColorStop(1, 'rgba(255,150,50,0)');

          ctx.strokeStyle = grad;
          ctx.lineWidth = Math.max(1, (1 - Math.abs(off) / halfWidth) * maxLen * 0.04);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(xEnd, yEnd);
          ctx.stroke();
        }
      }

      // center glow
      const centerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40);
      centerGrad.addColorStop(0, `rgba(255,255,220,${opacity / 100})`);
      centerGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = centerGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 40, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    },
  };
}
