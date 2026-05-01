export function createSparksEffect() {
  let particles = [];
  let burstTimer = 0;

  function spawnBurst(cx, cy, params) {
    const { sparkCount, spreadAngle, length, brightness } = params;
    const baseAngle = -Math.PI / 2;
    const halfSpread = (spreadAngle * Math.PI) / 180 / 2;

    for (let i = 0; i < sparkCount; i++) {
      const angle = baseAngle + (Math.random() - 0.5) * 2 * halfSpread;
      const speed = (Math.random() * 0.5 + 0.5) * (length / 20);
      particles.push({
        x: cx + (Math.random() - 0.5) * 10,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.018 + Math.random() * 0.025,
        brightness,
        trail: [],
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
      const { decay: decayParam, brightness } = params;

      burstTimer += dt;
      if (burstTimer > 0.35) {
        burstTimer = 0;
        spawnBurst(cx, cy, params);
      }

      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 12) p.trail.shift();

        p.vy += 0.04; // gravity
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.98;
        p.life -= p.decay * (decayParam / 50);

        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        // draw trail
        if (p.trail.length > 1) {
          for (let t = 1; t < p.trail.length; t++) {
            const ta = p.trail[t - 1];
            const tb = p.trail[t];
            const trailLife = (t / p.trail.length) * p.life;
            const alpha = trailLife * (brightness / 100) * 0.9;
            ctx.strokeStyle = `rgba(255,${Math.floor(180 * trailLife)},${Math.floor(60 * trailLife)},${alpha})`;
            ctx.lineWidth = trailLife * 2.5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(ta.x, ta.y);
            ctx.lineTo(tb.x, tb.y);
            ctx.stroke();
          }
        }

        // bright head
        const headAlpha = p.life * (brightness / 100);
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 3);
        grad.addColorStop(0, `rgba(255,255,220,${headAlpha})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    },
  };
}
