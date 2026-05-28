let globalTime = 0;

// Multi-octave sine noise — lightweight Perlin substitute
function noise2d(x, y, t) {
  return (
    Math.sin(x * 0.013 + y * 0.009 + t * 0.28) * 0.50 +
    Math.sin(x * 0.027 + y * 0.021 + t * 0.43 + 1.4) * 0.28 +
    Math.sin(x * 0.054 + y * 0.043 + t * 0.71 + 2.3) * 0.14 +
    Math.sin(x * 0.108 + y * 0.085 + t * 1.12 + 0.9) * 0.08
  );
}

function warpedCurl(x, y, t) {
  const wx = x + noise2d(y, x, t + 1.2) * 18;
  const wy = y + noise2d(x, y, t + 3.7) * 18;
  return {
    nx: noise2d(wx, wy, t),
    ny: noise2d(wy, wx, t + 5.1),
  };
}

function makeCluster(isLarge, isWisp) {
  const count = isLarge ? 11 : isWisp ? 4 : 7;
  return Array.from({ length: count }, () => {
    const ang  = Math.random() * Math.PI * 2;
    const dist = Math.sqrt(Math.random()); // sqrt = uniform disk distribution
    return {
      nx:  Math.cos(ang) * dist * 0.92,   // normalized offset from center (−1..1)
      ny:  Math.sin(ang) * dist * 0.92,
      sz:  0.50 + Math.random() * 0.50,   // blob size relative to particle radius
      al:  0.60 + Math.random() * 0.40,   // per-blob opacity multiplier
      ph:  Math.random() * Math.PI * 2,   // wobble phase
      ws:  (Math.random() - 0.5) * 0.055, // wobble angular speed
    };
  });
}

function makeHoles(count) {
  return Array.from({ length: count }, () => {
    const ang  = Math.random() * Math.PI * 2;
    const dist = 0.15 + Math.random() * 0.65;
    return {
      nx:  Math.cos(ang) * dist,
      ny:  Math.sin(ang) * dist,
      sz:  0.12 + Math.random() * 0.20,
      ph:  Math.random() * Math.PI * 2,
      ws:  (Math.random() - 0.5) * 0.035,
    };
  });
}

function spawnParticle(cx, cy, params) {
  const { scale, spread, verticalLift, direction, drift, speed, expansion, wisps } = params;

  const isWisp  = Math.random() < (wisps / 100) * 0.35;
  const isLarge = !isWisp && Math.random() < 0.22;

  const dirRad   = (direction / 360) * Math.PI * 2;
  const driftStr = (drift / 100) * (speed / 60) * 0.85;
  const liftStr  = (verticalLift / 100) * (speed / 60) * 1.15;
  const spreadRad= (spread / 100) * Math.PI * 0.85;
  const baseSpd  = (Math.random() * 0.45 + 0.55) * (speed / 50) * 0.52;

  const spawnAngle = -Math.PI / 2 + (Math.random() - 0.5) * spreadRad;

  const sf = scale / 100;
  let sz;
  if (isWisp)       sz = (8  + Math.random() * 20) * sf;
  else if (isLarge) sz = (68 + Math.random() * 82) * sf;
  else              sz = (20 + Math.random() * 48) * sf;
  sz = Math.max(5, sz);

  return {
    x:        cx + (Math.random() - 0.5) * (spread / 100) * 65,
    y:        cy + (Math.random() - 0.5) * 12,
    vx:       Math.cos(spawnAngle) * baseSpd * 0.22 + Math.cos(dirRad) * driftStr,
    vy:       Math.sin(spawnAngle) * baseSpd        - liftStr,
    life:     1,
    decay:    (isLarge ? 0.0009 : isWisp ? 0.0042 : 0.0020) + Math.random() * 0.0018,
    size:     sz,
    growRate: 1 + (expansion / 100) * 0.0022 + Math.random() * 0.0014,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.0028,
    phase:    Math.random() * Math.PI * 2,
    seed:     Math.random() * 80,
    isWisp,
    isLarge,
    cluster:  makeCluster(isLarge, isWisp),
    holes:    isLarge ? makeHoles(4) : (isWisp ? [] : makeHoles(2)),
  };
}

// ── Per-particle organic blob renderer ───────────────────────
function drawParticle(ctx, p, alpha, rC, gC, bC, softnessN, breakupN, wispsN, t) {
  const r = p.size;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rotation);

  const edgePow = 1 - softnessN * 0.7; // controls edge falloff sharpness

  // ── Draw blob cluster (the organic smoke body) ─────────────
  for (const blob of p.cluster) {
    const wobble = Math.sin(t * 0.9 * blob.ws * 40 + blob.ph) * 0.08;
    const bx = (blob.nx + Math.cos(blob.ph + t * 0.12) * wobble) * r;
    const by = (blob.ny + Math.sin(blob.ph + t * 0.09) * wobble) * r;
    const br = blob.sz * r * (p.isWisp ? 0.85 : 0.72);
    const ba = alpha * blob.al * (p.isLarge ? 0.55 : p.isWisp ? 0.48 : 0.68);

    if (ba < 0.004) continue;

    const g = ctx.createRadialGradient(bx, by, br * 0.05, bx, by, br);
    const inner = (ba * (1 - edgePow * 0.35)).toFixed(4);
    const outer = '0';
    g.addColorStop(0,    `rgba(${rC},${gC},${bC},${inner})`);
    g.addColorStop(0.50, `rgba(${rC},${gC},${bC},${(ba * 0.70).toFixed(4)})`);
    g.addColorStop(0.82, `rgba(${rC},${gC},${bC},${(ba * 0.25).toFixed(4)})`);
    g.addColorStop(1,    `rgba(${rC},${gC},${bC},${outer})`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Wisp tendrils (elongated edge streaks) ────────────────
  if (p.isWisp && wispsN > 0.06) {
    const wAlpha = alpha * wispsN * 0.52;
    for (let i = 0; i < 3; i++) {
      const blob  = p.cluster[i] || p.cluster[0];
      const ang   = blob.ph + t * 0.11 + i * 2.1;
      const dist  = r * (0.50 + Math.sin(t * 0.55 + p.seed + i) * 0.15);
      const wx    = Math.cos(ang) * dist;
      const wy    = Math.sin(ang) * dist * 0.38; // flatten horizontally
      const wRad  = r * 0.72;
      const wGrad = ctx.createRadialGradient(wx, wy, 0, wx, wy, wRad);
      wGrad.addColorStop(0, `rgba(${rC},${gC},${bC},${wAlpha.toFixed(4)})`);
      wGrad.addColorStop(1, `rgba(${rC},${gC},${bC},0)`);
      ctx.fillStyle = wGrad;
      ctx.beginPath();
      ctx.ellipse(wx, wy, wRad, wRad * 0.45, ang, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── Breakup holes (destination-out transparency pockets) ──
  if (breakupN > 0.15 && p.holes.length > 0) {
    ctx.globalCompositeOperation = 'destination-out';
    for (const hole of p.holes) {
      const hAnim = Math.sin(t * 0.48 * hole.ws * 30 + hole.ph) * 0.12;
      const hx    = (hole.nx + hAnim) * r;
      const hy    = (hole.ny + hAnim * 0.6) * r;
      const hr    = hole.sz * r * (0.7 + breakupN * 0.5);
      const ha    = (breakupN * 0.58).toFixed(4);

      const hGrad = ctx.createRadialGradient(hx, hy, 0, hx, hy, hr);
      hGrad.addColorStop(0,    `rgba(0,0,0,${ha})`);
      hGrad.addColorStop(0.55, `rgba(0,0,0,${(breakupN * 0.28).toFixed(4)})`);
      hGrad.addColorStop(1,    `rgba(0,0,0,0)`);
      ctx.fillStyle = hGrad;
      ctx.beginPath();
      ctx.arc(hx, hy, hr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  ctx.restore();
}

export function createSmokeEffect() {
  let particles = [];
  let offscreen = null;
  let offCtx    = null;

  function ensureOffscreen(w, h) {
    if (!offscreen || offscreen.width !== w || offscreen.height !== h) {
      offscreen = new OffscreenCanvas(w, h);
      offCtx    = offscreen.getContext('2d');
    }
  }

  return {
    reset() {
      particles = [];
    },

    update(ctx, canvas, params, dt) {
      const {
        amount       = 50,
        scale        = 62,
        spread       = 60,
        verticalLift = 45,
        direction    = 270,
        breakup      = 42,
        wisps        = 30,
        turbulence   = 28,
        detail       = 25,
        speed        = 38,
        drift        = 18,
        expansion    = 42,
        dissipation  = 32,
        opacity      = 62,
        softness     = 68,
        tone         = 54,
        temperature  = 38,
      } = params;

      const cx = canvas.width  / 2;
      const cy = canvas.height * 0.66;
      globalTime += dt;

      // ── Spawn ──
      const rate  = (amount / 100) * 5.5;
      const spawnN= Math.floor(rate + (Math.random() < (rate % 1) ? 1 : 0));
      for (let i = 0; i < spawnN; i++) particles.push(spawnParticle(cx, cy, params));

      const maxP = Math.floor(150 + (amount / 100) * 200);
      if (particles.length > maxP) particles.splice(0, particles.length - maxP);

      // ── Update ──
      const dissipDecay = 0.0005 + (dissipation / 100) * 0.0036;
      const turbN       = turbulence / 100;

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        const { nx, ny } = warpedCurl(p.x * 0.016, p.y * 0.016, globalTime);

        p.x  += (p.vx + nx * turbN * 1.6) * dt * 60;
        p.y  += (p.vy + ny * turbN * 0.8) * dt * 60;
        p.vx *= 0.991;
        p.vy *= 0.992;
        p.life  -= p.decay + dissipDecay;
        p.size  *= p.growRate;
        p.rotation += p.rotSpeed;

        if (p.life <= 0 || p.size > 550) particles.splice(i, 1);
      }

      // ── Draw via offscreen canvas to isolate destination-out ──
      const W = canvas.width;
      const H = canvas.height;
      ensureOffscreen(W, H);
      offCtx.clearRect(0, 0, W, H);

      const softnessN   = softness    / 100;
      const breakupN    = breakup     / 100;
      const wispsN      = wisps       / 100;
      const opacityN    = opacity     / 100;
      const toneVal     = tone        / 100;   // 0=dark smoke, 1=bright white
      const tempVal     = temperature / 100;   // 0=cool blue-gray, 1=warm amber

      // Smoke color
      const grayBase = 82 + toneVal * 118;    // 82–200
      const rC = Math.round(grayBase + tempVal * 44);
      const gC = Math.round(grayBase + tempVal * 14);
      const bC = Math.round(grayBase - tempVal * 40);

      // Sort: large behind small
      const sorted = [...particles].sort((a, b) => b.size - a.size);

      offCtx.save();
      offCtx.globalCompositeOperation = 'source-over';

      for (const p of sorted) {
        const ageFrac  = 1 - p.life;
        const rampIn   = ageFrac < 0.12 ? ageFrac / 0.12 : 1.0;
        const fadeOut  = Math.pow(Math.max(0, p.life), 0.58);
        const alphaEnv = rampIn * fadeOut;
        const a        = opacityN * alphaEnv * (p.isLarge ? 0.24 : p.isWisp ? 0.22 : 0.32);

        if (a < 0.003) continue;

        drawParticle(offCtx, p, a, rC, gC, bC, softnessN, breakupN, wispsN, globalTime);
      }

      offCtx.restore();

      // Composite offscreen onto main canvas
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(offscreen, 0, 0);
      ctx.restore();
    },
  };
}
