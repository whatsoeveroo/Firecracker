/**
 * smoke.js — Cinematic layered plume renderer  (quality pass 5)
 *
 * Core fixes over pass 4:
 *   • Blob system rework: 14–17 per large puff, spread ±0.40×, radius 0.40–0.75×,
 *     per-blob alpha 0.08–0.48 — individually invisible, collectively dense.
 *     Tight gradient (drops to 0.04 by 55% radius) means visible zone is inner 40%
 *     only, so overlapping blobs merge seamlessly with no circle boundary showing.
 *   • Macro blobs: 2–3 large (0.70–1.10×), very-low-alpha (0.04–0.09) anchor shapes
 *     that define each puff's overall lobe silhouette. Replace the ghost envelope.
 *   • Ghost envelope removed — it was producing a clean circular halo.
 *   • Puff elongation: independent stretchX / stretchY (0.65–1.45 each) per puff
 *     at spawn → flat, tall, wide, round puffs — 4–6 distinct silhouettes.
 *   • Variable wisp length: wispSteps 4–8 stored per particle → short curly
 *     source wisps vs long drifting tail tendrils look genuinely different.
 */

let smokeTime = 0;

// ── Noise ────────────────────────────────────────────────────────────────
function sn(x, y, t) {
  return (
    Math.sin(x * 0.013 + y * 0.009 + t * 0.25) * 0.52 +
    Math.sin(x * 0.027 + y * 0.019 + t * 0.40 + 1.4) * 0.30 +
    Math.sin(x * 0.054 + y * 0.038 + t * 0.65 + 2.9) * 0.18
  );
}

function curl(px, py, t) {
  return {
    cx: -sn(px + 47.2, py + 31.8, t + 2.0),
    cy:  sn(px, py, t),
  };
}

// ── Seed generators ──────────────────────────────────────────────────────

/**
 * Body blobs — many, tightly overlapping, individually very transparent.
 * Dense pockets (28%): small radius, al 0.28–0.48 — bright internal spots.
 * Light fill (72%): larger radius, al 0.08–0.22 — soft surrounding volume.
 * Key: tight gradient profile means visible zone is inner 40% of draw radius.
 * Neighbours overlap in that inner zone → clean merge, no circle boundary.
 */
function makeBlobSeeds(count) {
  return Array.from({ length: count }, () => {
    const dense = Math.random() < 0.28;
    return {
      nx:   (Math.random() - 0.5) * 0.80,    // ±0.40× curSize
      ny:   (Math.random() - 0.5) * 0.80,
      sz:   dense
              ? 0.40 + Math.random() * 0.22   // dense: 0.40–0.62×
              : 0.38 + Math.random() * 0.34,  // light: 0.38–0.72×
      al:   dense
              ? 0.28 + Math.random() * 0.20   // dense: 0.28–0.48
              : 0.08 + Math.random() * 0.14,  // light: 0.08–0.22
      dense,
      ph:   Math.random() * Math.PI * 2,
      ws:   (Math.random() - 0.5) * 0.011,
    };
  });
}

/**
 * Macro blobs — 2–3 large, extremely soft shapes per puff.
 * Radius 0.70–1.10× curSize, alpha 0.04–0.09.
 * They define the puff's overall lobe silhouette (wide, tall, rounded, etc.)
 * without any visible circular boundary — like fog, not circles.
 */
function makeMacroSeeds(count) {
  return Array.from({ length: count }, () => ({
    nx:   (Math.random() - 0.5) * 0.90,    // ±0.45× curSize offset
    ny:   (Math.random() - 0.5) * 0.90,
    sz:   0.70 + Math.random() * 0.40,     // 0.70–1.10× curSize
    al:   0.04 + Math.random() * 0.05,     // 0.04–0.09
    ph:   Math.random() * Math.PI * 2,
    ws:   (Math.random() - 0.5) * 0.006,
  }));
}

/**
 * Edge erosion seeds — tiny blobs at/beyond puff boundary.
 */
function makeErosionSeeds(count) {
  return Array.from({ length: count }, () => ({
    ang:   Math.random() * Math.PI * 2,
    distF: 0.62 + Math.random() * 0.43,
    szF:   0.07 + Math.random() * 0.14,
    al:    0.20 + Math.random() * 0.45,
    ph:    Math.random() * Math.PI * 2,
    ws:    (Math.random() - 0.5) * 0.008,
  }));
}

// ── Particle factory ─────────────────────────────────────────────────────
function spawnPuff(cx, cy, params, kind) {
  const { scale, direction, spread, speed, drift, lift, length, expansion } = params;

  const dirRad  = (direction / 360) * Math.PI * 2;
  const halfArc = (spread / 100) * Math.PI * 0.65;
  const angle   = dirRad + (Math.random() - 0.5) * halfArc;

  const spd    = (speed / 100) * 3.4;
  const driftF = 0.28 + (drift / 100) * 0.72;
  const liftF  = lift / 100;
  const sf     = scale / 100;
  const lenF   = 0.40 + (length / 100) * 1.20;

  let baseSize, blobCount, macroCount, erosionCount, wispSteps;

  switch (kind) {
    case 'large':
      baseSize     = (14 + Math.random() * 20) * sf;
      blobCount    = 14 + Math.floor(Math.random() * 4);  // 14–17
      macroCount   = 2  + Math.floor(Math.random() * 2);  // 2–3
      erosionCount = 8;
      wispSteps    = 0;
      break;
    case 'medium':
      baseSize     = (7 + Math.random() * 10) * sf;
      blobCount    = 9  + Math.floor(Math.random() * 4);  // 9–12
      macroCount   = 1  + Math.floor(Math.random() * 2);  // 1–2
      erosionCount = 5;
      wispSteps    = 0;
      break;
    default: // wisp
      baseSize     = (4 + Math.random() * 8) * sf;
      blobCount    = 0;
      macroCount   = 0;
      erosionCount = 0;
      wispSteps    = 4 + Math.floor(Math.random() * 5);   // 4–8
  }

  const maxSizeMult = 3.2 + Math.random() * 1.2 + (expansion / 100) * 2.0;
  const lifeFrames  = (55 + Math.random() * 45) * lenF;
  const jitterR     = kind === 'large' ? 14 : kind === 'medium' ? 7 : 4;

  // Independent per-axis stretch → flat, tall, wide, round puffs
  const stretchX = 0.65 + Math.random() * 0.80;   // 0.65–1.45
  const stretchY = 0.65 + Math.random() * 0.80;

  return {
    x:     cx + (Math.random() - 0.5) * jitterR * 2,
    y:     cy + (Math.random() - 0.5) * jitterR,
    vx:    Math.cos(angle) * spd * driftF,
    vy:    Math.sin(angle) * spd - liftF * spd * 1.15,
    life:  1.0,
    decay: 1 / lifeFrames,
    baseSize,
    maxSize:      baseSize * maxSizeMult,
    travelAngle:  angle,
    rotation:     Math.random() * Math.PI * 2,
    rotSpeed:     (Math.random() - 0.5) * 0.0013,
    seed:         Math.random() * 80,
    phase:        Math.random() * Math.PI * 2,
    kind,
    stretchX,
    stretchY,
    wispSteps,
    blobs:        blobCount    > 0 ? makeBlobSeeds(blobCount)       : [],
    macroBlobs:   macroCount   > 0 ? makeMacroSeeds(macroCount)     : [],
    erosionSeeds: erosionCount > 0 ? makeErosionSeeds(erosionCount) : [],
  };
}

// ── Per-puff renderer ────────────────────────────────────────────────────
function drawPuff(ctx, p, baseAlpha, rC, gC, bC, blR, blG, blB, softnessN, backlightV, breakupN, t) {
  const age     = 1 - p.life;
  const growT   = Math.pow(age, 1.5);
  const curSize = p.baseSize + (p.maxSize - p.baseSize) * growT;
  if (curSize < 1) return;

  ctx.save();
  ctx.translate(p.x, p.y);

  // ── WISP: path-traced tendril ────────────────────────────────────────
  // Variable STEPS (4–8) per wisp — short source puffs vs long tail tendrils.
  if (p.kind === 'wisp') {
    const wAlpha = baseAlpha * 1.05;
    if (wAlpha < 0.003) { ctx.restore(); return; }

    const curlAng = sn(p.x * 0.007, p.y * 0.007, t * 0.28 + p.seed) * 0.55;
    ctx.rotate(p.travelAngle + curlAng);

    const halfLen  = curSize * (2.8 + age * 5.5);
    const halfWid  = curSize * (0.28 + age * 0.14);
    const STEPS    = p.wispSteps;

    for (let s = 0; s < STEPS; s++) {
      const frac = s / (STEPS - 1);
      const px = frac * halfLen;
      const py = sn(
        p.x * 0.009 + frac * 1.8,
        p.y * 0.009 + frac * 0.7,
        t * 0.22 + p.seed + frac * 0.9
      ) * halfWid * 2.0;

      const cr = halfWid * Math.max(0.08, 1.0 - frac * 0.78);
      const ca = wAlpha
        * Math.pow(Math.sin(frac * Math.PI * 0.9 + 0.1), 0.7)
        * (1.0 - frac * 0.45);

      if (ca < 0.003 || cr < 0.5) continue;

      const cg = ctx.createRadialGradient(px, py, 0, px, py, cr);
      cg.addColorStop(0,    `rgba(${rC},${gC},${bC},${ca.toFixed(4)})`);
      cg.addColorStop(0.55, `rgba(${rC},${gC},${bC},${(ca * 0.38).toFixed(4)})`);
      cg.addColorStop(1,    `rgba(${rC},${gC},${bC},0)`);
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(px, py, cr, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    return;
  }

  // ── BODY PUFF ────────────────────────────────────────────────────────
  ctx.rotate(p.rotation);
  // Per-puff stretch: flat/tall/wide/round silhouette diversity
  ctx.scale(p.stretchX, p.stretchY);

  const isLarge   = p.kind === 'large';
  const bodyAlpha = baseAlpha * (isLarge ? 0.68 : 0.82);

  // Layer 0 — Macro blobs (lobe-defining shapes, fog-soft, no circle boundary)
  for (const m of p.macroBlobs) {
    const wt = t * m.ws * 60 + m.ph;
    const mx = (m.nx + Math.sin(wt) * 0.04) * curSize;
    const my = (m.ny + Math.cos(wt * 0.72) * 0.03) * curSize;
    const mr = m.sz * curSize;
    const ma = bodyAlpha * m.al;
    if (ma < 0.002 || mr < 2) continue;

    const mg = ctx.createRadialGradient(mx, my, 0, mx, my, mr);
    mg.addColorStop(0,    `rgba(${rC},${gC},${bC},${ma.toFixed(4)})`);
    mg.addColorStop(0.45, `rgba(${rC},${gC},${bC},${(ma * 0.58).toFixed(4)})`);
    mg.addColorStop(0.75, `rgba(${rC},${gC},${bC},${(ma * 0.15).toFixed(4)})`);
    mg.addColorStop(1,    `rgba(${rC},${gC},${bC},0)`);
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Layer 1 — Main blob cluster
  // Tight gradient: visible zone is inner ~40% of draw radius.
  // Overlapping blobs merge in that zone → no discrete circle outline.
  for (const blob of p.blobs) {
    const wt = t * blob.ws * 60 + blob.ph;
    const bx = (blob.nx + Math.sin(wt)        * 0.06) * curSize;
    const by = (blob.ny + Math.cos(wt * 0.78) * 0.05) * curSize;
    const br = blob.sz * curSize;
    const ba = bodyAlpha * blob.al;
    if (ba < 0.003 || br < 1.5) continue;

    let bg;
    if (blob.dense) {
      // Dense pocket: holds opacity to ~55% radius, then hard drop
      bg = ctx.createRadialGradient(bx, by, br * 0.04, bx, by, br);
      bg.addColorStop(0,    `rgba(${rC},${gC},${bC},${(ba * 1.00).toFixed(4)})`);
      bg.addColorStop(0.30, `rgba(${rC},${gC},${bC},${(ba * 0.85).toFixed(4)})`);
      bg.addColorStop(0.55, `rgba(${rC},${gC},${bC},${(ba * 0.30).toFixed(4)})`);
      bg.addColorStop(0.75, `rgba(${rC},${gC},${bC},${(ba * 0.04).toFixed(4)})`);
      bg.addColorStop(1,    `rgba(${rC},${gC},${bC},0)`);
    } else {
      // Light fill: very soft — nearly invisible at 45% radius
      bg = ctx.createRadialGradient(bx, by, 0, bx, by, br);
      bg.addColorStop(0,    `rgba(${rC},${gC},${bC},${(ba * 0.60).toFixed(4)})`);
      bg.addColorStop(0.45, `rgba(${rC},${gC},${bC},${(ba * 0.25).toFixed(4)})`);
      bg.addColorStop(0.72, `rgba(${rC},${gC},${bC},${(ba * 0.05).toFixed(4)})`);
      bg.addColorStop(1,    `rgba(${rC},${gC},${bC},0)`);
    }
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
  }

  // Layer 2 — Edge erosion micro-blobs
  if (age > 0.16 && breakupN > 0.06 && p.erosionSeeds.length > 0) {
    const erosionFade = Math.min(1, (age - 0.16) / 0.32);
    for (const e of p.erosionSeeds) {
      const wt  = t * e.ws * 60 + e.ph;
      const ang = e.ang + wt;
      const ex  = Math.cos(ang) * e.distF * curSize;
      const ey  = Math.sin(ang) * e.distF * curSize;
      const er  = e.szF * curSize * (1.0 + breakupN * 0.8);
      const ea  = bodyAlpha * e.al * breakupN * erosionFade;
      if (ea < 0.003 || er < 1) continue;

      const eg = ctx.createRadialGradient(ex, ey, 0, ex, ey, er);
      eg.addColorStop(0,    `rgba(${rC},${gC},${bC},${ea.toFixed(4)})`);
      eg.addColorStop(0.55, `rgba(${rC},${gC},${bC},${(ea * 0.28).toFixed(4)})`);
      eg.addColorStop(1,    `rgba(${rC},${gC},${bC},0)`);
      ctx.fillStyle = eg;
      ctx.beginPath();
      ctx.arc(ex, ey, er, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Layer 3 — Backlight rim
  if (backlightV > 0.02 && age > 0.20) {
    const rimFade  = Math.min(1, (age - 0.20) / 0.42);
    const rimAlpha = baseAlpha * backlightV * rimFade * 0.55;
    if (rimAlpha > 0.003) {
      const rimIn  = curSize * (0.52 + softnessN * 0.16);
      const rimOut = curSize * (0.92 + softnessN * 0.10);
      const rg = ctx.createRadialGradient(0, 0, rimIn, 0, 0, rimOut);
      rg.addColorStop(0,    `rgba(${blR},${blG},${blB},0)`);
      rg.addColorStop(0.62, `rgba(${blR},${blG},${blB},${(rimAlpha * 0.40).toFixed(4)})`);
      rg.addColorStop(1,    `rgba(${blR},${blG},${blB},${rimAlpha.toFixed(4)})`);
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(0, 0, rimOut * 1.02, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

// ── Public factory ───────────────────────────────────────────────────────
export function createSmokeEffect() {
  let particles = [];

  return {
    reset() { particles = []; },

    update(ctx, canvas, params, dt) {
      const {
        amount      = 55,
        scale       = 65,
        length      = 65,
        direction   = 275,
        spread      = 35,
        speed       = 35,
        drift       = 50,
        lift        = 60,
        expansion   = 50,
        dissipation = 40,
        turbulence  = 35,
        breakup     = 45,
        wisps       = 40,
        detail      = 30,
        opacity     = 70,
        tone        = 50,
        temperature = 45,
        backlight   = 15,
        softness    = 72,
      } = params;

      const cx = canvas.width  / 2;
      const cy = canvas.height * 0.68;
      smokeTime += dt;

      // ── Spawn ──────────────────────────────────────────────────────
      const amtF    = amount / 100;
      const rate    = amtF * 3.0;
      const wispAmt = (wisps / 100) * amtF;

      const rL = rate * 0.22;
      const rM = rate * 0.62;
      const rW = wispAmt * 0.20;

      const stoch = r => Math.floor(r) + (Math.random() < r % 1 ? 1 : 0);

      for (let i = 0; i < stoch(rL); i++) particles.push(spawnPuff(cx, cy, params, 'large'));
      for (let i = 0; i < stoch(rM); i++) particles.push(spawnPuff(cx, cy, params, 'medium'));
      for (let i = 0; i < stoch(rW); i++) particles.push(spawnPuff(cx, cy, params, 'wisp'));

      const maxP = Math.floor(80 + amtF * 220);
      if (particles.length > maxP) particles.splice(0, particles.length - maxP);

      // ── Update ─────────────────────────────────────────────────────
      const turbN   = turbulence / 100;
      const dissipF = 0.0003 + (dissipation / 100) * 0.0028;

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        const { cx: ncx, cy: ncy } = curl(p.x * 0.011, p.y * 0.011, smokeTime);
        p.x  += (p.vx + ncx * turbN * 1.4) * dt * 60;
        p.y  += (p.vy + ncy * turbN * 0.8) * dt * 60;
        p.vx *= 0.992;
        p.vy *= 0.993;
        p.life     -= (p.decay + dissipF) * dt * 60;
        p.rotation += p.rotSpeed;
        if (p.life <= 0) particles.splice(i, 1);
      }

      // ── Draw ────────────────────────────────────────────────────────
      const opacityN  = opacity     / 100;
      const softnessN = softness    / 100;
      const toneVal   = tone        / 100;
      const tempVal   = temperature / 100;
      const blV       = backlight   / 100;
      const breakupN  = breakup     / 100;
      const detailN   = detail      / 100;

      // Neutral cinematic grey — symmetric around temperature=0.5
      const grayBase  = 88 + toneVal * 82;
      const tempShift = (tempVal - 0.5) * 44;
      const rC = Math.round(Math.min(215, grayBase + tempShift));
      const gC = Math.round(Math.min(215, grayBase + tempShift * 0.28));
      const bC = Math.round(Math.min(215, grayBase - tempShift * 0.82));

      const blR = Math.round(Math.min(230, rC + blV * 82));
      const blG = Math.round(Math.min(230, gC + blV * 64));
      const blB = Math.round(Math.min(230, bC + blV * 36));

      ctx.save();
      ctx.globalCompositeOperation = 'source-over';

      const sorted = [...particles].sort((a, b) => {
        const order = { large: 0, medium: 1, wisp: 2 };
        return order[a.kind] !== order[b.kind]
          ? order[a.kind] - order[b.kind]
          : b.baseSize - a.baseSize;
      });

      for (const p of sorted) {
        const age = 1 - p.life;

        const rampIn   = age < 0.10 ? age / 0.10 : 1.0;
        const fadeOut  = p.life < 0.35 ? Math.pow(p.life / 0.35, 0.62) : 1.0;
        const alphaEnv = rampIn * fadeOut;

        const kindScale = p.kind === 'large'  ? 0.58
                        : p.kind === 'medium' ? 0.78
                        :                       0.88;

        const effectiveSoftness = Math.max(0.05, softnessN - detailN * 0.25);
        const baseAlpha = opacityN * alphaEnv * kindScale;
        if (baseAlpha < 0.004) continue;

        drawPuff(
          ctx, p, baseAlpha,
          rC, gC, bC, blR, blG, blB,
          effectiveSoftness, blV, breakupN,
          smokeTime
        );
      }

      ctx.restore();
    },
  };
}
