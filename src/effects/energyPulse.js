export function createEnergyPulseEffect() {
  let rings = [];
  let phase = 0;
  let spawnTimer = 0;

  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  }

  return {
    reset() {
      rings = [];
      phase = 0;
      spawnTimer = 0;
    },
    update(ctx, canvas, params, dt) {
      const { speed, radius: maxRadius, thickness, color, intensity } = params;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      phase += dt;

      spawnTimer += dt;
      const interval = Math.max(0.1, 1.5 - speed * 0.012);
      if (spawnTimer > interval) {
        spawnTimer = 0;
        rings.push({ r: 0, life: 1 });
      }

      const { r, g, b } = hexToRgb(color);

      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      // core
      const coreGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 30 * (intensity / 100));
      coreGlow.addColorStop(0, `rgba(255,255,255,${intensity / 100})`);
      coreGlow.addColorStop(0.4, `rgba(${r},${g},${b},${(intensity / 100) * 0.6})`);
      coreGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = coreGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, 30 * (intensity / 100), 0, Math.PI * 2);
      ctx.fill();

      for (let i = rings.length - 1; i >= 0; i--) {
        const ring = rings[i];
        ring.r += speed * 0.5 * dt * 60;
        ring.life = 1 - ring.r / maxRadius;

        if (ring.life <= 0 || ring.r > maxRadius) {
          rings.splice(i, 1);
          continue;
        }

        const lineWidth = thickness * ring.life;
        const alpha = ring.life * (intensity / 100) * 0.8;

        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.lineWidth = lineWidth;
        ctx.shadowColor = `rgba(${r},${g},${b},0.5)`;
        ctx.shadowBlur = lineWidth * 3;
        ctx.beginPath();
        ctx.arc(cx, cy, ring.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      ctx.restore();
    },
  };
}
