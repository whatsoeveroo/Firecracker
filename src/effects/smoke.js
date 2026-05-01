let globalTime = 0;

// Organic curl field using summed sines
function curlX(x, y, t) {
  return (
    Math.sin(y * 0.018 + t * 0.6) * 0.5 +
    Math.sin(x * 0.022 + t * 0.9 + 1.3) * 0.3
  );
}

function spawnParticle(cx, cy, params) {
  const { spread, softness, speed, turbulence: turb } = params;
  const angle = -Math.PI / 2 + (Math.random() - 0.5) * (spread / 100) * Math.PI;
  const spd   = (Math.random() * 0.5 + 0.3) * (speed / 50) * 0.8;

  // Bimodal size: atmospheric large puffs + tighter wisps
  const large = Math.random() < 0.22;
  const size  = large
    ? 55 + Math.random() * 55
    : 15 + Math.random() * 30;

  // Warmth shifts the gray hue slightly
  const warmth = Math.random(); // 0=cool blue-gray, 1=warm beige-gray

  return {
    x: cx + (Math.random() - 0.5) * 50,
    y: cy + (Math.random() - 0.5) * 8,
    vx: Math.cos(angle) * spd + (Math.random() - 0.5) * 0.15,
    vy: Math.sin(angle) * spd,
    life: 1,
    born: globalTime,
    decay: (large ? 0.0015 : 0.003) + Math.random() * 0.003,
    size,
    growRate: 1.003 + (Math.random() * 0.004),
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.004,
    phase: Math.random() * Math.PI * 2,
    warmth,
    softness,
    turb: turb / 100,
  };
}

export function createSmokeEffect() {
  let particles = [];

  return {
    reset() { particles = []; },

    update(ctx, canvas, params, dt) {
      const { density, opacity } = params;
      const cx = canvas.width / 2;
      const cy = canvas.height * 0.64;
      globalTime += dt;

      const spawnN = Math.floor(density * 0.10 + Math.random() * density * 0.06);
      for (let i = 0; i < spawnN; i++) particles.push(spawnParticle(cx, cy, params));

      // Update
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        const cx2 = curlX(p.x, p.y, globalTime) * p.turb;
        p.x  += (p.vx + cx2 * 0.6) * dt * 60;
        p.y  += p.vy * dt * 60;
        p.vx *= 0.993;
        p.vy *= 0.994;
        p.life -= p.decay;
        p.size *= p.growRate;
        p.rotation += p.rotSpeed;
        if (p.life <= 0 || p.size > 320) particles.splice(i, 1);
      }

      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      // Draw large puffs first (background), small wisps on top
      const sorted = [...particles].sort((a, b) => b.size - a.size);

      for (const p of sorted) {
        // Alpha envelope: ramp in for first 15% of life, then fade out
        const ageFrac  = 1 - p.life; // 0=just born, 1=dead
        const alphaEnv = ageFrac < 0.12
          ? ageFrac / 0.12
          : Math.pow(p.life / 0.88, 0.7);

        const base = (opacity / 100) * alphaEnv;
        // Large particles are more transparent
        const alpha = base * (p.size > 50 ? 0.18 : 0.30);

        // Color: cool blue-gray ↔ warm beige-gray
        const rC = Math.round(155 + p.warmth * 30);
        const gC = Math.round(155 + p.warmth * 10);
        const bC = Math.round(168 - p.warmth * 25);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        const edgeStart = Math.max(0.01, (1 - p.softness / 100) * 0.25);
        const grad      = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
        grad.addColorStop(0,          `rgba(${rC},${gC},${bC},${alpha})`);
        grad.addColorStop(edgeStart,  `rgba(${rC},${gC},${bC},${alpha * 0.85})`);
        grad.addColorStop(0.65,       `rgba(${Math.round(rC*0.75)},${Math.round(gC*0.75)},${Math.round(bC*0.75)},${alpha * 0.5})`);
        grad.addColorStop(1,          'rgba(0,0,0,0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.restore();
    },
  };
}
