let mistTime = 0;

// Slow, wide noise for atmospheric undulation
function mistNoise(x, t) {
  return (
    Math.sin(x * 0.007 + t * 0.07) * 0.55 +
    Math.sin(x * 0.018 + t * 0.11 + 1.4) * 0.28 +
    Math.sin(x * 0.036 + t * 0.19 + 2.9) * 0.17
  );
}

// layer: 0=nearest/largest, 1=mid, 2=farthest/smallest
function spawnMistParticle(W, H, layer, params) {
  const { coverage, height, speed, direction } = params;

  const layerT = layer / 2; // 0=near, 1=far

  // Y position — all near bottom, far layers slightly higher
  const heightFrac  = (height / 100) * 0.30;
  const groundY     = H * (0.84 - heightFrac * (1 - layerT * 0.5));
  const y           = groundY - Math.random() * H * heightFrac * 0.6;

  // X — full canvas width, slightly beyond edges so drift wraps seamlessly
  const x = (Math.random() * 1.3 - 0.15) * W;

  // Particle size — near=large, far=smaller (depth)
  const depthScale = 1 - layerT * 0.42;
  const coverageF  = 0.5 + (coverage / 100) * 0.85;
  const pW = (95 + Math.random() * 175) * depthScale * coverageF;
  const pH = pW * (0.14 + Math.random() * 0.09); // very flat ellipse

  // Velocity — mostly horizontal, near layer slightly faster (parallax)
  const dirRad = (direction / 360) * Math.PI * 2;
  const spd    = (speed / 100) * 0.30 * (1 - layerT * 0.35);

  return {
    x, y,
    vx:       Math.cos(dirRad) * spd + (Math.random() - 0.5) * 0.03,
    vy:       (Math.random() - 0.5) * 0.010,
    pW, pH,
    life:     1,
    decay:    0.00012 + Math.random() * 0.00020 + layerT * 0.00008,
    rotation: (Math.random() - 0.5) * 0.07,
    rotSpeed: (Math.random() - 0.5) * 0.00010,
    phase:    Math.random() * Math.PI * 2,
    layer,
    layerT,
  };
}

function drawMistParticle(ctx, p, alpha, rC, gC, bC, softnessN) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rotation);
  // Scale to ellipse — gradient and arc both transform correctly
  ctx.scale(p.pW, p.pH);

  const e = softnessN;
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0,    `rgba(${rC},${gC},${bC},${(alpha * (1 - e * 0.22)).toFixed(4)})`);
  g.addColorStop(0.40, `rgba(${rC},${gC},${bC},${(alpha * 0.88).toFixed(4)})`);
  g.addColorStop(0.72, `rgba(${rC},${gC},${bC},${(alpha * 0.32).toFixed(4)})`);
  g.addColorStop(1,    `rgba(${rC},${gC},${bC},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function prefill(W, H, params) {
  const out = [];
  for (let layer = 0; layer < 3; layer++) {
    const count = 22 + Math.floor((params.coverage / 100) * 38);
    for (let i = 0; i < count; i++) {
      const p = spawnMistParticle(W, H, layer, params);
      p.life = 0.1 + Math.random() * 0.85; // stagger ages so nothing pops in together
      out.push(p);
    }
  }
  return out;
}

export function createMistEffect() {
  let particles   = [];
  let initialized = false;

  return {
    reset() {
      particles   = [];
      initialized = false;
    },

    update(ctx, canvas, params, dt) {
      const {
        coverage    = 75,
        height      = 35,
        density     = 60,
        speed       = 18,
        direction   = 0,
        turbulence  = 14,
        softness    = 82,
        tone        = 66,
        temperature = 28,
      } = params;

      const W = canvas.width;
      const H = canvas.height;
      mistTime += dt;

      // Pre-populate immediately on first frame for instant visual result
      if (!initialized) {
        particles   = prefill(W, H, params);
        initialized = true;
      }

      // ── Maintain target count per layer ──────────────────────
      const targets = [
        Math.floor(20 + (coverage / 100) * 38), // near
        Math.floor(18 + (coverage / 100) * 32), // mid
        Math.floor(14 + (coverage / 100) * 26), // far
      ];
      const counts = [0, 0, 0];
      for (const p of particles) counts[p.layer]++;

      for (let layer = 0; layer < 3; layer++) {
        const deficit = targets[layer] - counts[layer];
        for (let i = 0; i < Math.min(deficit, 2); i++) {
          particles.push(spawnMistParticle(W, H, layer, params));
        }
      }

      // ── Update ────────────────────────────────────────────────
      const turbN = turbulence / 100;

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        // Slow vertical undulation from noise
        const noiseV = mistNoise(p.x, mistTime) * turbN * 0.20;

        p.x += (p.vx + (Math.random() - 0.5) * turbN * 0.03) * dt * 60;
        p.y += (p.vy + noiseV) * dt * 60;
        p.life    -= p.decay;
        p.rotation += p.rotSpeed;

        // Horizontal wrap so drifting mist fills canvas continuously
        if (p.x > W + p.pW * 1.5) p.x = -p.pW * 1.5;
        if (p.x < -p.pW * 1.5)    p.x = W + p.pW * 1.5;

        if (p.life <= 0) particles.splice(i, 1);
      }

      // ── Draw (far → near for depth ordering) ─────────────────
      const densityN  = density     / 100;
      const softnessN = softness    / 100;
      const toneVal   = tone        / 100;  // 0=dark, 1=bright
      const tempVal   = temperature / 100;  // 0=cool, 1=warm

      // Mist color: cool-neutral gray with temperature shift
      const grayBase = 115 + toneVal * 90;   // 115–205
      const rC = Math.round(grayBase + tempVal * 30);
      const gC = Math.round(grayBase + tempVal * 10);
      const bC = Math.round(grayBase - tempVal * 28);

      ctx.save();
      ctx.globalCompositeOperation = 'source-over';

      const sorted = [...particles].sort((a, b) => b.layerT - a.layerT);

      for (const p of sorted) {
        const ageFrac  = 1 - p.life;
        const rampIn   = ageFrac < 0.18 ? ageFrac / 0.18 : 1;
        const fadeOut  = Math.pow(Math.max(0, p.life), 0.45);
        const alphaEnv = rampIn * fadeOut;

        // Aerial perspective: far layers slightly more transparent
        const depthA = 1 - p.layerT * 0.40;
        const a      = densityN * alphaEnv * depthA * 0.58;

        if (a < 0.003) continue;
        drawMistParticle(ctx, p, a, rC, gC, bC, softnessN);
      }

      ctx.restore();
    },
  };
}
