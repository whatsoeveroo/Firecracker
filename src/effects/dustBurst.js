export function createDustBurstEffect() {
  let particles = [];
  let burstTimer = 0;

  function spawnBurst(cx, cy, params) {
    const { volume, spread, size: particleSize, color } = params;
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);

    for (let i = 0; i < volume; i++) {
      const angle = Math.random() * Math.PI * 2;
      const halfSpread = (spread / 100) * Math.PI;
      const burstAngle = angle - Math.PI / 2 + (Math.random() - 0.5) * halfSpread * 2;
      const speed = Math.random() * 3 + 1;
      particles.push({
        x: cx + (Math.random() - 0.5) * 10,
        y: cy,
        vx: Math.cos(burstAngle) * speed,
        vy: Math.sin(burstAngle) * speed,
        life: 1,
        decay: 0.008 + Math.random() * 0.015,
        size: (Math.random() * 0.7 + 0.3) * particleSize,
        growRate: 1.01 + Math.random() * 0.015,
        r, g, b,
      });
    }
  }

  return {
    reset() {
      particles = [];
      burstTimer = 0;
    },
    update(ctx, canvas, params, dt) {
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const { rate, opacity } = params;

      burstTimer += dt;
      const interval = Math.max(0.2, 3 - rate * 0.025);
      if (burstTimer > interval) {
        burstTimer = 0;
        spawnBurst(cx, cy, params);
      }

      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.03;
        p.vx *= 0.98;
        p.vy *= 0.98;
        p.life -= p.decay;
        p.size *= p.growRate;

        if (p.life <= 0 || p.size > 120) {
          particles.splice(i, 1);
          continue;
        }

        const alpha = p.life * (opacity / 100) * 0.5;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        grad.addColorStop(0, `rgba(${p.r},${p.g},${p.b},${alpha})`);
        grad.addColorStop(0.5, `rgba(${p.r},${p.g},${p.b},${alpha * 0.4})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    },
  };
}
