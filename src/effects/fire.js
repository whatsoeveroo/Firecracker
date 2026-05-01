// Pseudo-noise via summed sines: organic turbulence without Perlin
function turbField(x, t) {
  return (
    Math.sin(x * 0.025 + t * 2.1) * 0.45 +
    Math.sin(x * 0.041 + t * 1.4 + 1.2) * 0.35 +
    Math.sin(x * 0.017 + t * 3.0 + 0.7) * 0.20
  );
}

// Multi-stop fire color: life 0–1, colorTemp 0–1
function fireColor(life, colorTemp, alpha) {
  const warm = [
    { l: 1.0, r: 255, g: 250, b: 180 },
    { l: 0.72, r: 255, g: 140, b: 15 },
    { l: 0.40, r: 255, g: 45,  b: 4 },
    { l: 0.0,  r: 70,  g: 6,   b: 0 },
  ];
  const cool = [
    { l: 1.0, r: 200, g: 230, b: 255 },
    { l: 0.72, r: 60, g: 110, b: 255 },
    { l: 0.40, r: 18, g: 45,  b: 210 },
    { l: 0.0,  r: 4,  g: 8,   b: 60 },
  ];

  function sample(stops, v) {
    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i], b = stops[i + 1];
      if (v >= b.l) {
        const t = (v - b.l) / (a.l - b.l);
        return {
          r: Math.round(b.r + (a.r - b.r) * t),
          g: Math.round(b.g + (a.g - b.g) * t),
          b: Math.round(b.b + (a.b - b.b) * t),
        };
      }
    }
    return stops[stops.length - 1];
  }

  const w = sample(warm, life);
  const c = sample(cool, life);
  return `rgba(
    ${Math.round(c.r + (w.r - c.r) * colorTemp)},
    ${Math.round(c.g + (w.g - c.g) * colorTemp)},
    ${Math.round(c.b + (w.b - c.b) * colorTemp)},
    ${alpha.toFixed(3)})`;
}

function spawnParticle(cx, cy, params, layer) {
  const { height, turbulence, flameWidth } = params;
  // layer 0=core, 1=mid, 2=outer
  const spreadF = [0.13, 0.38, 0.72][layer];
  const speedF  = [1.90, 1.25, 0.68][layer];
  const sizeR   = [[5, 13], [13, 26], [22, 48]][layer];
  const decayR  = [[0.020, 0.028], [0.009, 0.014], [0.004, 0.007]][layer];

  const spread = flameWidth * spreadF;
  const spd    = (height / 60) * speedF;
  const ox     = cx + (Math.random() - 0.5) * spread * 0.6;

  return {
    x: cx + (Math.random() - 0.5) * spread,
    y: cy,
    vx: (Math.random() - 0.5) * (turbulence / 100) * 0.45,
    vy: -(Math.random() * spd * 0.4 + spd * 0.6),
    life: 0.88 + Math.random() * 0.12,
    decay: decayR[0] + Math.random() * (decayR[1] - decayR[0]),
    size: sizeR[0] + Math.random() * (sizeR[1] - sizeR[0]),
    layer,
    ox, // unique x for turbulence sampling
  };
}

export function createFireEffect() {
  let particles = [];
  let time = 0;

  return {
    reset() { particles = []; time = 0; },

    update(ctx, canvas, params, dt) {
      const { intensity, turbulence, colorTemp, flameWidth } = params;
      const ct = colorTemp / 100;
      const cx = canvas.width / 2;
      const cy = canvas.height * 0.78;
      time += dt;

      // Spawn per layer
      const total = intensity * 0.28;
      [0.26, 0.45, 0.29].forEach((ratio, layer) => {
        const n = Math.floor(total * ratio + Math.random() * total * ratio * 0.4);
        for (let i = 0; i < n; i++) particles.push(spawnParticle(cx, cy, params, layer));
      });

      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      // Base ground glow — ellipse flattened horizontally
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, 0.35);
      const baseR = flameWidth * 0.58;
      const baseGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, baseR);
      const bR = Math.round(255 * ct + 80 * (1 - ct));
      const bG = Math.round(150 * ct + 120 * (1 - ct));
      const bB = Math.round(20 * ct + 220 * (1 - ct));
      baseGrad.addColorStop(0,   `rgba(${bR},${bG},${bB},${(intensity / 100) * 0.55})`);
      baseGrad.addColorStop(0.5, `rgba(${Math.round(bR * 0.6)},${Math.round(bG * 0.3)},0,${(intensity / 100) * 0.2})`);
      baseGrad.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = baseGrad;
      ctx.beginPath();
      ctx.arc(0, 0, baseR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Update physics
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        const tField = turbField(p.ox, time) * (turbulence / 100) * 1.6;
        p.x  += (p.vx + tField * 0.5) * dt * 60;
        p.vx *= 0.97;
        p.y  += p.vy * dt * 60;
        p.vy *= 0.997;
        p.life -= p.decay;
        p.size *= 0.9965;
        if (p.life <= 0) particles.splice(i, 1);
      }

      // Draw outer → core so bright core renders on top
      for (let layer = 2; layer >= 0; layer--) {
        const alphaScale = [0.88, 0.62, 0.38][layer];
        for (const p of particles) {
          if (p.layer !== layer) continue;

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.scale(1.0, 1.55); // vertically stretched — flame shape

          const alpha = p.life * alphaScale;
          const grad  = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
          grad.addColorStop(0,   fireColor(p.life,                    ct, alpha));
          grad.addColorStop(0.4, fireColor(Math.max(0, p.life - 0.2), ct, alpha * 0.65));
          grad.addColorStop(1,   fireColor(Math.max(0, p.life - 0.5), ct, 0));
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // White-hot core tip: extra tight bright pass over core particles
      ctx.globalCompositeOperation = 'screen';
      for (const p of particles) {
        if (p.layer !== 0 || p.life < 0.55) continue;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(1, 1.55);
        const coreSize = p.size * 0.35;
        const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreSize);
        coreGrad.addColorStop(0, `rgba(255,255,240,${p.life * 0.55})`);
        coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(0, 0, coreSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.restore();
    },
  };
}
