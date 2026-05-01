function spawnBurst(cx, cy, params) {
  const { sparkCount, spreadAngle, length, brightness, direction } = params;
  const baseAngle = (direction * Math.PI) / 180;
  const halfSpread = (spreadAngle * Math.PI) / 180 / 2;
  const particles = [];

  for (let i = 0; i < sparkCount; i++) {
    const angle = baseAngle + (Math.random() - 0.5) * 2 * halfSpread;
    // Bi-modal speed: a few fast streaks + many mid-speed
    const speedMult = Math.random() < 0.2 ? (1.4 + Math.random() * 0.8) : (0.5 + Math.random() * 0.6);
    const speed = speedMult * (length / 18);

    particles.push({
      x: cx + (Math.random() - 0.5) * 8,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      maxSpeed: speed,
      decay: 0.022 + Math.random() * 0.03,
      brightness,
      width: 0.6 + Math.random() * 1.4, // trail width
      trail: [],
    });
  }

  // Micro-sparks: very small secondary scatter
  const microCount = Math.floor(sparkCount * 0.4);
  for (let i = 0; i < microCount; i++) {
    const angle = baseAngle + (Math.random() - 0.5) * 2 * Math.PI; // full scatter
    const speed = 0.5 + Math.random() * 1.5;
    particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      maxSpeed: speed,
      decay: 0.04 + Math.random() * 0.06,
      brightness: brightness * 0.6,
      width: 0.3 + Math.random() * 0.5,
      trail: [],
      micro: true,
    });
  }

  return particles;
}

export function createSparksEffect() {
  let particles = [];
  let flashes   = []; // { life, cx, cy, size, angle }
  let burstTimer = 0;

  return {
    reset() { particles = []; flashes = []; burstTimer = 0; },

    update(ctx, canvas, params, dt) {
      const { decay: decayParam, brightness, flashSize, direction } = params;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      burstTimer += dt;
      if (burstTimer > 0.32) {
        burstTimer = 0;
        particles.push(...spawnBurst(cx, cy, params));

        // Muzzle flash bloom
        if (flashSize > 0) {
          flashes.push({
            cx, cy,
            life: 1,
            size: 20 + flashSize * 2.2,
            angle: (direction * Math.PI) / 180,
          });
        }
      }

      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      // ── Muzzle flash ──
      flashes = flashes.filter(f => {
        f.life -= dt * 8; // very fast fade
        if (f.life <= 0) return false;

        const a = f.life * (brightness / 100);

        // directional oval flash in the firing direction
        ctx.save();
        ctx.translate(f.cx, f.cy);
        ctx.rotate(f.angle);
        ctx.scale(2.2, 1); // elongated along firing axis

        const fg = ctx.createRadialGradient(f.size * 0.15, 0, 0, 0, 0, f.size);
        fg.addColorStop(0,   `rgba(255,255,240,${Math.min(1, a * 1.1)})`);
        fg.addColorStop(0.3, `rgba(255,220,100,${a * 0.7})`);
        fg.addColorStop(0.7, `rgba(255,120,20,${a * 0.3})`);
        fg.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.arc(0, 0, f.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // secondary soft bloom (circular)
        const bg = ctx.createRadialGradient(f.cx, f.cy, 0, f.cx, f.cy, f.size * 1.8);
        bg.addColorStop(0, `rgba(255,200,80,${a * 0.25})`);
        bg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.arc(f.cx, f.cy, f.size * 1.8, 0, Math.PI * 2);
        ctx.fill();

        return true;
      });

      // ── Spark trails ──
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.trail.push({ x: p.x, y: p.y, vx: p.vx, vy: p.vy });
        if (p.trail.length > (p.micro ? 6 : 14)) p.trail.shift();

        p.vy += 0.05 * dt * 60; // gravity
        p.x  += p.vx * dt * 60;
        p.y  += p.vy * dt * 60;
        p.vx *= 0.985;
        p.life -= p.decay * (decayParam / 50);

        if (p.life <= 0) { particles.splice(i, 1); continue; }

        const trail = p.trail;
        if (trail.length < 2) continue;

        for (let t = 1; t < trail.length; t++) {
          const ta = trail[t - 1];
          const tb = trail[t];
          const tFrac   = t / trail.length;
          const tAlpha  = tFrac * p.life * (p.brightness / 100);
          const tWidth  = tFrac * p.width * (p.micro ? 1.0 : 2.2);

          // Color: white-hot head → orange → red tail
          const rr = 255;
          const gg = Math.floor(tFrac * (p.micro ? 120 : 180));
          const bb = Math.floor(tFrac * (p.micro ? 20 : 50));

          ctx.strokeStyle = `rgba(${rr},${gg},${bb},${tAlpha.toFixed(3)})`;
          ctx.lineWidth   = tWidth;
          ctx.lineCap     = 'round';
          ctx.beginPath();
          ctx.moveTo(ta.x, ta.y);
          ctx.lineTo(tb.x, tb.y);
          ctx.stroke();
        }

        // Bright head glow
        const headA = p.life * (p.brightness / 100);
        const hSize = p.micro ? 1.5 : 3.5;
        const hGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, hSize);
        hGrad.addColorStop(0, `rgba(255,255,220,${headA})`);
        hGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = hGrad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, hSize, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    },
  };
}
