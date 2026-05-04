// ─── math ─────────────────────────────────────────────────────────────────────

function clamp(v, lo = 0, hi = 1) { return v < lo ? lo : v > hi ? hi : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function smoothstep(t) { const c = clamp(t); return c * c * (3 - 2 * c); }
function smoothstep2(t) { const c = clamp(t); return c * c * c * (c * (c * 6 - 15) + 10); }
function fract(v) { return v - Math.floor(v); }

function hash(x, y, seed = 0) {
  return fract(Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453);
}

function valueNoise(x, y, seed = 0) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = smoothstep2(x - ix), fy = smoothstep2(y - iy);
  return lerp(
    lerp(hash(ix, iy, seed),     hash(ix + 1, iy, seed),     fx),
    lerp(hash(ix, iy + 1, seed), hash(ix + 1, iy + 1, seed), fx),
    fy,
  );
}

function fbm(x, y, seed = 0, octaves = 4) {
  let v = 0, amp = 0.56, freq = 1, norm = 0;
  for (let i = 0; i < octaves; i++) {
    v += valueNoise(x * freq, y * freq, seed + i * 13.7) * amp;
    norm += amp;
    amp  *= 0.5;
    freq *= 2.05;
  }
  return v / norm;
}

// ─── color ────────────────────────────────────────────────────────────────────

function hexToRgb(hex = '#ffffff') {
  const h = hex.replace('#', '');
  return { r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16) };
}

function mixRgb(a, b, t) {
  return { r: lerp(a.r,b.r,t), g: lerp(a.g,b.g,t), b: lerp(a.b,b.b,t) };
}

function rgba(rgb, a) {
  return `rgba(${Math.round(rgb.r)},${Math.round(rgb.g)},${Math.round(rgb.b)},${clamp(a).toFixed(4)})`;
}

function shouldUseManualBlur() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /Safari/i.test(ua) && !/Chrome|Chromium|CriOS|Edg/i.test(ua);
}

function drawLayer(ctx, source, w, h, blurPx = 0, alpha = 1, manualBlur = false) {
  ctx.save();
  ctx.globalAlpha *= alpha;

  if (!manualBlur || blurPx <= 1) {
    ctx.filter = blurPx > 0 ? `blur(${blurPx}px)` : 'none';
    ctx.drawImage(source, 0, 0, w, h);
    ctx.restore();
    return;
  }

  // Safari can render canvas filters differently from Chromium. Approximate the
  // same softening with deterministic multi-tap layer draws so Rays match Safari.
  ctx.filter = 'none';
  const radius = Math.min(48, Math.max(1.2, blurPx * 0.48));
  const taps = blurPx > 18 ? 12 : 8;
  const rings = blurPx > 18 ? 2 : 1;
  const baseAlpha = ctx.globalAlpha;
  const weight = 1 / (1.4 + taps * rings);

  ctx.globalAlpha = baseAlpha * weight * 1.4;
  ctx.drawImage(source, 0, 0, w, h);

  for (let ring = 1; ring <= rings; ring++) {
    const r = radius * (ring / rings);
    const ringAlpha = baseAlpha * weight * (rings === 2 && ring === 1 ? 1.1 : 0.82);
    for (let i = 0; i < taps; i++) {
      const a = (i / taps) * Math.PI * 2;
      ctx.globalAlpha = ringAlpha;
      ctx.drawImage(source, Math.cos(a) * r, Math.sin(a) * r, w, h);
    }
  }

  ctx.restore();
}

// ─── atmosphere mode presets ──────────────────────────────────────────────────

const ATMO = {
  clean:      { hazeMul:0.32, dustMul:0.12, softMul:0.68, strkMul:0.58, noiseMul:0.52, occMul:0.32, driftMul:0.45, motionMul:0.50, ribbonW:0.72, waveSpeed:0.50, haloStr:0.45, particleFlow:0.20 },
  dusty:      { hazeMul:0.82, dustMul:1.50, softMul:0.98, strkMul:1.00, noiseMul:0.86, occMul:0.78, driftMul:0.92, motionMul:0.80, ribbonW:1.00, waveSpeed:1.00, haloStr:0.80, particleFlow:0.75 },
  foggy:      { hazeMul:1.60, dustMul:0.28, softMul:1.60, strkMul:1.48, noiseMul:0.48, occMul:0.25, driftMul:0.62, motionMul:0.52, ribbonW:1.50, waveSpeed:0.42, haloStr:1.40, particleFlow:0.48 },
  smoky:      { hazeMul:1.28, dustMul:1.25, softMul:1.18, strkMul:1.22, noiseMul:1.38, occMul:1.50, driftMul:1.18, motionMul:0.95, ribbonW:1.25, waveSpeed:0.85, haloStr:1.10, particleFlow:1.00 },
  underwater: { hazeMul:1.90, dustMul:1.65, softMul:1.68, strkMul:1.60, noiseMul:0.88, occMul:0.42, driftMul:1.88, motionMul:1.58, ribbonW:1.72, waveSpeed:1.60, haloStr:1.65, particleFlow:1.50 },
  misty:      { hazeMul:1.05, dustMul:0.52, softMul:1.28, strkMul:1.15, noiseMul:0.65, occMul:0.38, driftMul:1.05, motionMul:0.80, ribbonW:1.15, waveSpeed:0.62, haloStr:1.05, particleFlow:0.55 },
};

// ─── offscreen canvas ─────────────────────────────────────────────────────────

function ensureLayer(layer, w, h) {
  const tw = Math.max(1, Math.floor(w)), th = Math.max(1, Math.floor(h));
  if (!layer.canvas) {
    layer.canvas = document.createElement('canvas');
    layer.ctx    = layer.canvas.getContext('2d');
  }
  if (layer.canvas.width !== tw || layer.canvas.height !== th) {
    layer.canvas.width = tw; layer.canvas.height = th;
  }
  layer.ctx.setTransform(1,0,0,1,0,0);
  layer.ctx.clearRect(0, 0, tw, th);
  return layer;
}

// ─── seeds ────────────────────────────────────────────────────────────────────

function makeShaftSeed(i) {
  return {
    lengthMul:   0.54 + hash(i, i*3.17,  2) * 0.64,
    widthMul:    0.48 + hash(i, i*7.43,  5) * 1.02,
    intensity:   0.42 + hash(i, i*13.1,  8) * 0.86,
    phase:       hash(i, i*44.8, 14) * Math.PI * 2,
    clusterBias: hash(i, i*2.09, 11),
  };
}

function makeAreaSeed(i) {
  return {
    slotJitter: hash(i, i * 4.11, 101) - 0.5,
    widthMul:  0.74 + hash(i, i * 8.23, 103) * 0.92,
    lengthMul: 0.70 + hash(i, i * 5.37, 107) * 0.44,
    intensity: 0.38 + hash(i, i * 9.71, 109) * 0.78,
    phase:     hash(i, i * 2.61, 113) * Math.PI * 2,
    sideBias:  hash(i, i * 6.89, 127) - 0.5,
    edgeSkew:  (hash(i, i * 3.31, 131) - 0.5) * 0.9,
    breath:    0.55 + hash(i, i * 7.77, 137) * 0.75,
  };
}

function makeCausticSeed(i) {
  return {
    ox:    hash(i, i * 3.7,  201) - 0.5,
    oy:    hash(i, i * 7.2,  203) - 0.5,
    freq:  0.48 + hash(i, i * 5.3, 205) * 1.12,
    phase: hash(i, i * 11.1, 207) * Math.PI * 2,
    size:  0.14 + hash(i, i * 2.9,  209) * 0.22,
    drift: (hash(i, i * 4.1, 211) - 0.5) * 0.0006,
  };
}

// ─── ribbon drawing ───────────────────────────────────────────────────────────
// Trapezoid path segments with a linear gradient perpendicular to the shaft.
// Produces flat light bands with genuine dark negative space between shafts —
// unlike radial gradients which bleed in all directions and destroy gaps.

function drawRibbon(ctx, sx, sy, angle, len, halfWFn, colorFn, baseAlpha, densityFn) {
  const SEGS = 24;
  const cosA = Math.cos(angle), sinA = Math.sin(angle);
  const pc = -sinA, ps = cosA; // perpendicular direction
  for (let s = 0; s < SEGS; s++) {
    // Slight overlap between segments to eliminate seam steps
    const t0 = Math.max(0, (s - 0.1) / SEGS), t1 = Math.min(1, (s + 1.1) / SEGS);
    const tm = (t0 + t1) * 0.5;
    // Sample density at both endpoints and average for smooth cross-segment transitions
    const d = (densityFn(t0) + densityFn(tm) + densityFn(t1)) * 0.333;
    const peakA = baseAlpha * d * 0.85; // 0.85 compensates for overlap brightness
    if (peakA < 0.002) continue;
    const hw0 = halfWFn(t0), hw1 = halfWFn(t1), hw = (hw0 + hw1) * 0.5;
    if (hw < 0.4) continue;
    const x0 = sx + cosA * t0 * len, y0 = sy + sinA * t0 * len;
    const x1 = sx + cosA * t1 * len, y1 = sy + sinA * t1 * len;
    const mx = (x0 + x1) * 0.5, my = (y0 + y1) * 0.5;
    const rgb = colorFn(tm);
    const g = ctx.createLinearGradient(mx + pc*hw, my + ps*hw, mx - pc*hw, my - ps*hw);
    g.addColorStop(0.00, 'rgba(0,0,0,0)');
    g.addColorStop(0.22, rgba(rgb, peakA * 0.20));
    g.addColorStop(0.42, rgba(rgb, peakA * 0.70));
    g.addColorStop(0.50, rgba(rgb, peakA));
    g.addColorStop(0.58, rgba(rgb, peakA * 0.70));
    g.addColorStop(0.78, rgba(rgb, peakA * 0.20));
    g.addColorStop(1.00, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x0 + pc*hw0, y0 + ps*hw0);
    ctx.lineTo(x0 - pc*hw0, y0 - ps*hw0);
    ctx.lineTo(x1 - pc*hw1, y1 - ps*hw1);
    ctx.lineTo(x1 + pc*hw1, y1 + ps*hw1);
    ctx.closePath();
    ctx.fill();
  }
}

// Kept for source bloom fan and ridge segments where radial looks better
function drawSoftBeamSegment(c, sx, sy, angle, t0, t1, len, width, rgb, alpha, stretchMul = 0.78, core = 0.42) {
  const tm = (t0 + t1) * 0.5;
  const secLen = (t1 - t0) * len;
  if (alpha < 0.002 || width < 0.5 || secLen < 0.5) return;
  const cx = sx + Math.cos(angle) * tm * len;
  const cy = sy + Math.sin(angle) * tm * len;
  const stretch = Math.min(18, Math.max(1.2, (secLen * stretchMul) / Math.max(width, 0.5)));
  c.save();
  c.translate(cx, cy);
  c.rotate(angle);
  c.scale(stretch, 1);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, width);
  g.addColorStop(0, rgba(rgb, alpha));
  g.addColorStop(core, rgba(rgb, alpha * 0.38));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.beginPath();
  c.arc(0, 0, width, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

// ─── particles ────────────────────────────────────────────────────────────────

function spawnParticle(sx, sy, maxLen, dir, spread, mode) {
  const a = dir + (Math.random() - 0.5) * spread * 1.65;
  const d = Math.pow(Math.random(), 0.45) * maxLen * 0.96;
  const base = {
    x: sx + Math.cos(a) * d,
    y: sy + Math.sin(a) * d,
    life: 0.35 + Math.random() * 0.65,
  };
  if (mode === 'underwater') {
    return { ...base, type: 'bubble',
      vx: (Math.random() - 0.5) * 0.28,
      vy: -(0.09 + Math.random() * 0.28),
      size: 0.8 + Math.random() * 2.2,
      decay: 0.0006 + Math.random() * 0.0012,
    };
  }
  if (mode === 'foggy' || mode === 'misty') {
    return { ...base, type: 'wisp',
      vx: (Math.random() - 0.5) * 0.25,
      vy: -(0.007 + Math.random() * 0.032),
      size: 3.5 + Math.random() * 9.0,
      decay: 0.0004 + Math.random() * 0.0008,
    };
  }
  if (mode === 'smoky') {
    return { ...base, type: 'wisp',
      vx: (Math.random() - 0.5) * 0.58,
      vy: -(0.018 + Math.random() * 0.082),
      size: 2.0 + Math.random() * 5.5,
      decay: 0.0007 + Math.random() * 0.0016,
    };
  }
  // dusty / clean default
  return { ...base, type: 'mote',
    vx: (Math.random() - 0.5) * 0.42,
    vy: -(0.032 + Math.random() * 0.18),
    size: 0.7 + Math.random() * 3.2,
    decay: 0.0010 + Math.random() * 0.0022,
  };
}

// ─── main effect ──────────────────────────────────────────────────────────────

export function createRaysEffect() {
  let phase     = 0;
  let totalTime = 0;
  let particles = [];
  const shaftSeeds   = Array.from({ length: 32 }, (_, i) => makeShaftSeed(i));
  const areaSeeds    = Array.from({ length: 16 }, (_, i) => makeAreaSeed(i));
  const causticSeeds = Array.from({ length: 8  }, (_, i) => makeCausticSeed(i));
  const volumeLayer  = {}, areaLayer = {}, haloLayer = {}, streakLayer = {}, ridgeLayer = {};

  return {
    reset() {
      phase = 0; totalTime = 0; particles = [];
      [volumeLayer, areaLayer, haloLayer, streakLayer, ridgeLayer].forEach(l => {
        if (l.ctx) l.ctx.clearRect(0, 0, l.canvas.width, l.canvas.height);
      });
    },

    update(ctx, canvas, params, dt) {
      // ── unpack ─────────────────────────────────────────────────────────────
      const {
        sourceX         = 50,   sourceY         = 15,
        direction       = 92,   spreadAngle     = 50,
        beamLength      = 90,   beamWidth       = 68,
        sourceGlow      = 82,   intensity       = 76,
        softness        = 70,   density         = 80,
        falloff         = 78,   atmosphericHaze = 80,
        edgeFeather     = 88,   rayCount        = 11,
        streakSoftness  = 60,   occlusionGaps   = 56,
        noiseAmount     = 72,   noiseScale      = 54,
        dustAmount      = 58,   driftSpeed      = 18,
        atmosphereMode  = 'dusty',
        rayColor        = '#ffcc77',
        hazeColor       = '#c89040',
        glowColor       = '#ffffff',
        colorBlend      = 50,
        motionAmount    = 50,   drift           = 30,
        flickerAmount   = 8,    breathing       = 18,
        animationSpeed  = 55,   turbulenceSpeed = 22,
      } = params;

      // ── timing ─────────────────────────────────────────────────────────────
      const motionScale = clamp(motionAmount / 100);
      const animSpeed   = clamp(animationSpeed / 100);
      const animMul     = 0.6 + animSpeed * 1.4;
      const turbRate    = (0.04 + (turbulenceSpeed / 100) * 0.22) * motionScale * animMul;
      phase     += dt * turbRate;
      totalTime += dt;

      // ── atmosphere ─────────────────────────────────────────────────────────
      const atmo = ATMO[atmosphereMode] || ATMO.dusty;

      // ── geometry ───────────────────────────────────────────────────────────
      const W = canvas.width, H = canvas.height;
      const SCALE  = 0.48;
      const vol    = ensureLayer(volumeLayer,  W * SCALE, H * SCALE);
      const area   = ensureLayer(areaLayer,    W * SCALE, H * SCALE);
      const halo   = ensureLayer(haloLayer,    W * SCALE, H * SCALE);
      const strk   = ensureLayer(streakLayer,  W * SCALE, H * SCALE);
      const rdg    = ensureLayer(ridgeLayer,   W * SCALE, H * SCALE);
      const vctx = vol.ctx, actx = area.ctx, hctx = halo.ctx, sctx = strk.ctx, rctx = rdg.ctx;
      for (const c of [vctx, actx, hctx, sctx, rctx]) c.scale(SCALE, SCALE);

      // ── derived values ──────────────────────────────────────────────────────
      const baseDir    = (direction * Math.PI) / 180;
      const sourceFlow = atmo.motionMul * motionScale;
      const flutterX   = (valueNoise(phase * 0.52, 2.1, 151) - 0.5) * W * 0.015 * sourceFlow;
      const flutterY   = (valueNoise(phase * 0.47, 8.8, 157) - 0.5) * H * 0.013 * sourceFlow;
      const dirFlutter = (valueNoise(phase * 0.36, 4.5, 163) - 0.5) * 0.030 * sourceFlow;
      const sx         = W * (sourceX / 100) + flutterX;
      const sy         = H * (sourceY / 100) + flutterY;
      const dir        = baseDir + dirFlutter;
      const halfSpread = (spreadAngle / 2 * Math.PI) / 180;
      const maxLen     = Math.hypot(W, H) * (beamLength / 100) * 0.88;
      const fieldW     = Math.min(W, H) * (beamWidth / 100) * 0.82;
      const cosDirX    = Math.cos(dir), sinDirY = Math.sin(dir);
      const perpX      = -sinDirY,       perpY   =  cosDirX;

      // ── color ───────────────────────────────────────────────────────────────
      const rayRgb    = hexToRgb(rayColor);
      const hazeRgb   = hexToRgb(hazeColor);
      const glowRgb   = hexToRgb(glowColor);
      const blendFrac = clamp(colorBlend / 100);

      // ── scalars ─────────────────────────────────────────────────────────────
      const opa         = clamp(intensity / 100);
      const soft        = clamp(softness  / 100) * atmo.softMul;
      const dens        = clamp(density   / 100);
      const fall        = clamp(falloff   / 100);
      const hazeStr     = clamp(atmosphericHaze / 100) * atmo.hazeMul;
      const feather     = clamp(edgeFeather / 100);
      const noiseStr    = clamp(noiseAmount / 100) * atmo.noiseMul;
      const nScale      = 0.7 + (noiseScale / 100) * 2.4;
      const occStr      = clamp(occlusionGaps / 100) * atmo.occMul;
      const driftStr    = clamp(drift / 100) * motionScale * (0.5 + animSpeed * 1.2);
      const breathAmp   = clamp(breathing / 100) * 0.055 * motionScale;
      const flickAmp    = clamp(flickerAmount / 100) * 0.16;
      const strkSoft    = clamp(streakSoftness / 100) * atmo.strkMul;
      const dustMul     = atmo.dustMul;
      const shaftCount  = Math.max(2, Math.round(rayCount));

      // ── animation ──────────────────────────────────────────────────────────
      const driftPhase  = phase * (0.035 + driftStr * 0.10);
      const flickerVal  = 1 + (valueNoise(phase * 2.6, 1.4, 3) - 0.5) * flickAmp;
      const breathVal   = 1 + Math.sin(phase * 0.62) * breathAmp;
      const globalMod   = opa * flickerVal * breathVal;

      // Propagating occlusion wave — travels source→tip over 5–10 s
      const waveRate  = (0.3 + (driftSpeed / 100) * 1.2) * atmo.waveSpeed * motionScale * (0.5 + animSpeed * 1.5);
      const wavePhase = totalTime * waveRate;

      // Atmospheric 2D current — coherent lateral flow field
      const currentStr = atmo.particleFlow * motionScale * 0.6;
      const currentX   = (fbm(totalTime * 0.07, 0.5, 201, 2) - 0.5) * currentStr;
      const currentY   = (fbm(0.5, totalTime * 0.07, 203, 2) - 0.5) * currentStr * 0.4;

      // ── shaft clustering with per-cluster angular drift ─────────────────────
      const clusterCount  = Math.max(2, Math.ceil(shaftCount / 3.4));
      const clusterAngles = Array.from({ length: clusterCount }, (_, k) => {
        const evenSlot  = k / clusterCount - 0.5 + 0.5 / clusterCount;
        const pertSlot  = evenSlot + (hash(k, k * 5.31, 99) - 0.5) * 0.30;
        const drift     = (fbm(k * 1.7 + phase * 0.12, k * 2.3, 77, 2) - 0.5) * halfSpread * 0.30 * motionScale;
        return dir + pertSlot * halfSpread * 2.0 * 0.80 + drift;
      });
      const shaftAngles = Array.from({ length: shaftCount }, (_, si) => {
        const seed      = shaftSeeds[si % 32];
        const cIdx      = si % clusterCount;
        const withinOff = (seed.clusterBias - 0.5) * halfSpread * 0.38;
        return clusterAngles[cIdx] + withinOff;
      });

      // ────────────────────────────────────────────────────────────────────────
      // LAYER 1: ATMOSPHERIC VOLUME
      // ────────────────────────────────────────────────────────────────────────
      {
        vctx.globalCompositeOperation = 'source-over';

        if (hazeStr > 0.01) {
          const hLen    = maxLen * 0.82;
          const hWidth  = fieldW * (1.5 + soft * 0.6);
          const hCX     = sx + cosDirX * hLen * 0.42;
          const hCY     = sy + sinDirY * hLen * 0.42;
          const hStretch = Math.min(16, (hLen * 0.5) / Math.max(hWidth, 1));
          const hA = hazeStr * dens * globalMod;

          vctx.save();
          vctx.translate(hCX, hCY);
          vctx.rotate(dir);
          vctx.scale(hStretch, 1);
          const hg = vctx.createRadialGradient(0, 0, 0, 0, 0, hWidth);
          hg.addColorStop(0,    rgba(hazeRgb, hA * 0.28));
          hg.addColorStop(0.38, rgba(hazeRgb, hA * 0.15));
          hg.addColorStop(0.72, rgba(hazeRgb, hA * 0.05));
          hg.addColorStop(1,    'rgba(0,0,0,0)');
          vctx.fillStyle = hg;
          vctx.beginPath();
          vctx.arc(0, 0, hWidth, 0, Math.PI * 2);
          vctx.fill();
          vctx.restore();

          const gR = Math.min(W, H) * 0.26 * (1 + hazeStr * 0.3);
          const gg = vctx.createRadialGradient(sx, sy, 0, sx, sy, gR);
          gg.addColorStop(0,    rgba(mixRgb(glowRgb, hazeRgb, 0.5), hA * 0.22));
          gg.addColorStop(0.45, rgba(hazeRgb, hA * 0.08));
          gg.addColorStop(1,    'rgba(0,0,0,0)');
          vctx.fillStyle = gg;
          vctx.beginPath();
          vctx.arc(sx, sy, gR, 0, Math.PI * 2);
          vctx.fill();

          for (let li = 0; li < 4; li++) {
            const tBase  = (li + 0.5) / 4;
            const dist   = maxLen * Math.pow(tBase, 0.68);
            const longF  = Math.pow(1 - tBase, 0.36 + fall * 1.5) * smoothstep(tBase * 7);
            for (let ai = 0; ai < 4; ai++) {
              const uBase  = (ai + 0.5) / 4 - 0.5;
              const pertN  = fbm(tBase * nScale * 0.8 + driftPhase * 0.20, uBase * nScale * 1.6 + driftPhase * 0.13, 17, 3);
              const uP     = uBase + (pertN - 0.5) * noiseStr * 0.72 * Math.sign(uBase || 1);
              const latN   = Math.abs(uP) * 2;
              const edgeN  = fbm(latN * 2.1 + phase * 0.022, tBase * 1.5 + li * 0.42, 23, 2);
              const angEnv = smoothstep(clamp(1 - latN * (1 - feather * 0.52) + edgeN * noiseStr * 0.38));
              if (angEnv < 0.015) continue;
              const densN  = fbm(tBase * nScale * 1.2 + driftPhase * 0.24, uP * nScale * 2.0 + driftPhase * 0.16, 7, 3);
              const latPx  = uP * fieldW * 2.6;
              const wx     = sx + cosDirX * dist + perpX * latPx;
              const wy     = sy + sinDirY * dist + perpY * latPx;
              const bR     = fieldW * (0.22 + soft * 0.28) * (0.52 + densN * 0.88);
              if (bR < 1.5) continue;
              const nMod   = lerp(1, lerp(0.42, 1, densN), noiseStr);
              const alpha  = hazeStr * dens * globalMod * longF * angEnv * nMod * 0.068;
              if (alpha < 0.004) continue;
              const blobRgb = mixRgb(hazeRgb, rayRgb, blendFrac * 0.38);
              const bg = vctx.createRadialGradient(wx, wy, 0, wx, wy, bR);
              bg.addColorStop(0,   rgba(blobRgb, alpha));
              bg.addColorStop(0.5, rgba(blobRgb, alpha * 0.36));
              bg.addColorStop(1,   'rgba(0,0,0,0)');
              vctx.fillStyle = bg;
              vctx.beginPath();
              vctx.arc(wx, wy, bR, 0, Math.PI * 2);
              vctx.fill();
            }
          }
        }
      }

      // ────────────────────────────────────────────────────────────────────────
      // LAYER 2: SHAFT HALO COLUMNS
      // Soft saturated glow column around each area-band family.
      // Lighter than the glare effect's halos; purely atmospheric.
      // ────────────────────────────────────────────────────────────────────────
      {
        hctx.globalCompositeOperation = 'source-over';
        const haloStrScale = atmo.haloStr * globalMod * hazeStr * dens;
        const familyCount  = Math.max(4, Math.min(10, Math.round(4 + shaftCount * 0.25)));

        for (let li = 0; li < familyCount; li++) {
          const seed  = areaSeeds[li % areaSeeds.length];
          const slot  = familyCount === 1 ? 0 : (li / (familyCount - 1) - 0.5);
          const angleOffset = (slot + seed.slotJitter * 0.14) * halfSpread * 1.66;
          const layerAngle  = dir + angleOffset;
          const layerLen    = maxLen * seed.lengthMul * 0.88;

          const angDev  = Math.abs(Math.atan2(Math.sin(layerAngle - dir), Math.cos(layerAngle - dir)));
          const effH    = halfSpread * (0.92 + feather * 0.42);
          const angEnv  = smoothstep(clamp(1 - angDev / Math.max(0.001, effH)));
          if (angEnv < 0.015) continue;

          // Stretched ellipse centered at mid-shaft
          const haloMidLen = layerLen * 0.44;
          const hcx = sx + Math.cos(layerAngle) * haloMidLen;
          const hcy = sy + Math.sin(layerAngle) * haloMidLen;
          const hW  = fieldW * seed.widthMul * (0.18 + soft * 0.14) * atmo.ribbonW;
          const hStretchRatio = Math.min(12, layerLen * 0.34 / Math.max(hW, 1));
          const haloFade  = 1 - haloMidLen / maxLen * 0.72; // fades toward tip
          const haloAlpha = haloStrScale * seed.intensity * angEnv * haloFade * 0.072;
          if (haloAlpha < 0.003) continue;

          const haloColor = mixRgb(mixRgb(hazeRgb, rayRgb, blendFrac * 0.42), glowRgb, 0.12);

          hctx.save();
          hctx.translate(hcx, hcy);
          hctx.rotate(layerAngle);
          hctx.scale(hStretchRatio, 1);
          const hg = hctx.createRadialGradient(0, 0, 0, 0, 0, hW);
          hg.addColorStop(0,    rgba(haloColor, haloAlpha));
          hg.addColorStop(0.40, rgba(haloColor, haloAlpha * 0.42));
          hg.addColorStop(0.78, rgba(haloColor, haloAlpha * 0.10));
          hg.addColorStop(1,    'rgba(0,0,0,0)');
          hctx.fillStyle = hg;
          hctx.beginPath();
          hctx.arc(0, 0, hW, 0, Math.PI * 2);
          hctx.fill();
          hctx.restore();
        }
      }

      // ────────────────────────────────────────────────────────────────────────
      // LAYER 3: RIBBON AREA BANDS
      // Flat trapezoid shafts via drawRibbon — genuine dark gaps between families.
      // Each family = one wide band + one narrower core ribbon.
      // Density uses propagating wave: fbm(tm + wavePhase) so light patches travel.
      // ────────────────────────────────────────────────────────────────────────
      {
        actx.globalCompositeOperation = 'lighter';
        const familyCount = Math.max(4, Math.min(10, Math.round(4 + shaftCount * 0.25)));

        for (let li = 0; li < familyCount; li++) {
          const seed  = areaSeeds[li % areaSeeds.length];
          const slot  = familyCount === 1 ? 0 : (li / (familyCount - 1) - 0.5);
          const angleOffset = (slot + seed.slotJitter * 0.14) * halfSpread * 1.66;
          const layerAngle  = dir + angleOffset;
          const layerLen    = maxLen * seed.lengthMul * (0.96 + soft * 0.14);

          const angDev  = Math.abs(Math.atan2(Math.sin(layerAngle - dir), Math.cos(layerAngle - dir)));
          const edgeN   = fbm(li * 0.46 + phase * 0.010, angleOffset * 3.0, seed.phase + 61, 2);
          const effH    = halfSpread * (0.92 + feather * 0.42 + edgeN * noiseStr * 0.20);
          const angEnv  = smoothstep(clamp(1 - angDev / Math.max(0.001, effH)));
          if (angEnv < 0.015) continue;

          const centerWeight = 1 - Math.min(0.66, Math.abs(slot) * 0.26);
          const bandHW = fieldW * seed.widthMul * (0.055 + soft * 0.038) * atmo.ribbonW;
          const coreHW = bandHW * (0.26 + strkSoft * 0.16);

          const layerRgb = mixRgb(rayRgb, hazeRgb, blendFrac * (0.18 + Math.abs(slot) * 0.34));
          const coreRgb  = mixRgb(glowRgb, rayRgb, 0.38 + blendFrac * 0.18);

          const baseAlphaBand = globalMod * dens * hazeStr * seed.intensity * centerWeight * angEnv * 0.30;
          const baseAlphaCore = globalMod * dens * seed.intensity * centerWeight * angEnv * opa * 0.22;

          // halfWFn: starts at 0 (source convergence), rises fast, gentle taper at tip
          const bandHalfW = t => bandHW * smoothstep(t * 10) * (1 - t * 0.18);
          const coreHalfW = t => coreHW * smoothstep(t * 10) * (1 - t * 0.22);

          // densityFn: dramatic falloff × near-source boost × propagating wave × occlusion
          const densityFn = tm => {
            const longFall   = Math.pow(1 - tm, 1.4 + fall * 4.8) * smoothstep(tm * 7);
            const nearBoost  = 1 + (1 - clamp(tm * 3)) * 0.8;
            const waveU      = tm * nScale * 1.6 + wavePhase;
            const waveV    = li * 0.43 + seed.sideBias * 0.42;
            const smokeN   = fbm(waveU, waveV, seed.phase + 71, 4);
            const occN     = fbm(tm * nScale * 3.0 - wavePhase * 0.6, li * 0.82, seed.phase + 79, 2);
            const laneCut  = lerp(1, smoothstep(clamp((occN - 0.22) / 0.64)), occStr * 0.72);
            const densN    = lerp(1, lerp(0.26, 1.14, smokeN), noiseStr * 0.92);
            const breathV  = 1 + Math.sin(phase * seed.breath + seed.phase + li * 0.9) * breathAmp * 3.2;
            return longFall * nearBoost * laneCut * densN * breathV;
          };

          const colorFn = tm => mixRgb(layerRgb, hazeRgb, clamp((tm - 0.55) * 2.0) * blendFrac * 0.3);

          drawRibbon(actx, sx, sy, layerAngle, layerLen, bandHalfW, colorFn, baseAlphaBand, densityFn);
          drawRibbon(actx, sx, sy, layerAngle, layerLen, coreHalfW, () => coreRgb, baseAlphaCore, densityFn);
        }
      }

      // ────────────────────────────────────────────────────────────────────────
      // LAYER 4: STREAK SPINES (ribbon)
      // Narrow bright centerlines — stronger shafts get spines.
      // ────────────────────────────────────────────────────────────────────────
      {
        sctx.globalCompositeOperation = 'lighter';

        for (let si = 0; si < shaftCount; si++) {
          const seed       = shaftSeeds[si % 32];
          const shaftAngle = shaftAngles[si];
          const shaftLen   = maxLen * seed.lengthMul;
          const spineHW    = fieldW * seed.widthMul * 0.038 * (0.42 + soft * 0.36);

          const angDev = Math.abs(shaftAngle - dir);
          const edgeN  = fbm(angDev * 2.4 + phase * 0.020, si * 0.52, seed.phase + 31, 2);
          const effH   = halfSpread * (0.94 + feather * 0.34 + edgeN * noiseStr * 0.32);
          const angEnv = smoothstep(clamp(1 - angDev / Math.max(0.001, effH)));
          if (angEnv < 0.018) continue;

          const baseAlpha = globalMod * dens * seed.intensity * angEnv * opa * 0.28;

          const halfWFn = t => spineHW * smoothstep(t * 10) * (1 - t * 0.20);

          const densityFn = tm => {
            const longFall = Math.pow(1 - tm, 0.85 + fall * 3.4) * smoothstep(tm * 9);
            const waveU    = tm * nScale * 1.7 + wavePhase;
            const densN    = fbm(waveU, si * 0.70, seed.phase, 3);
            const occN     = fbm(tm * nScale * 3.4 + wavePhase * 0.5, si * 1.22, seed.phase + 17, 2);
            const occMask  = lerp(1, smoothstep(clamp((occN - 0.24) / 0.66)), occStr);
            return longFall * occMask * lerp(1, lerp(0.42, 1, densN), noiseStr);
          };

          const colorFn = tm => {
            const outerT = clamp((tm - 0.55) * 2.2) * blendFrac * 0.5;
            return mixRgb(mixRgb(glowRgb, rayRgb, clamp(tm * 4.0 + (1 - blendFrac))), hazeRgb, outerT);
          };

          drawRibbon(sctx, sx, sy, shaftAngle, shaftLen, halfWFn, colorFn, baseAlpha, densityFn);
        }

        // Edge-scatter atmospheric bleed
        const SCATTER = Math.round(shaftCount * 1.6);
        for (let s = 0; s < SCATTER; s++) {
          const tS   = Math.pow(hash(s, s * 3.1, 55), 0.75);
          const side = hash(s * 2, s, 66) > 0.5 ? 1 : -1;
          const aExc = halfSpread * (0.88 + hash(s * 3, s + 1, 88) * 0.52);
          const angS = dir + side * aExc;
          const wS   = sx + Math.cos(angS) * maxLen * tS;
          const hS   = sy + Math.sin(angS) * maxLen * tS;
          const visN = fbm(tS * nScale * 1.4 + driftPhase * 0.22, s * 0.50 + driftPhase * 0.14, 55, 2);
          const scA  = globalMod * hazeStr * dens * Math.pow(1 - tS, 0.5 + fall * 1.5) * lerp(0.22, 0.82, visN) * noiseStr * 0.028;
          if (scA < 0.003) continue;
          const scR = fieldW * (0.09 + soft * 0.12);
          const sg  = sctx.createRadialGradient(wS, hS, 0, wS, hS, scR);
          sg.addColorStop(0, rgba(hazeRgb, scA));
          sg.addColorStop(1, 'rgba(0,0,0,0)');
          sctx.fillStyle = sg;
          sctx.beginPath(); sctx.arc(wS, hS, scR, 0, Math.PI * 2); sctx.fill();
        }
      }

      // ────────────────────────────────────────────────────────────────────────
      // LAYER 5: BRIGHT RIDGE CORES
      // ────────────────────────────────────────────────────────────────────────
      {
        rctx.globalCompositeOperation = 'lighter';
        const RIDGE_SECS = 3;
        const ridgeCount = Math.max(2, Math.ceil(shaftCount * 0.55));
        const sortedIdx  = Array.from({ length: shaftCount }, (_, i) => i)
          .sort((a, b) => shaftSeeds[b % 32].intensity - shaftSeeds[a % 32].intensity)
          .slice(0, ridgeCount);

        for (const si of sortedIdx) {
          const seed       = shaftSeeds[si % 32];
          const shaftAngle = shaftAngles[si];
          const shaftLen   = maxLen * seed.lengthMul;
          const ridgeW     = fieldW * seed.widthMul * 0.060 * (0.38 + soft * 0.48);

          const angDev  = Math.abs(shaftAngle - dir);
          const edgeNR  = fbm(angDev * 2.8 + phase * 0.016, si * 0.47, seed.phase + 41, 2);
          const effHR   = halfSpread * (0.94 + feather * 0.30 + edgeNR * noiseStr * 0.28);
          const angEnvR = smoothstep(clamp(1 - angDev / Math.max(0.001, effHR)));
          if (angEnvR < 0.022) continue;

          for (let s = 0; s < RIDGE_SECS; s++) {
            const t0 = s / RIDGE_SECS, t1 = (s + 1) / RIDGE_SECS;
            const tm = (t0 + t1) * 0.5;
            const longF = Math.pow(1 - tm, 0.44 + fall * 2.1) * smoothstep(tm * 8);
            const dN    = fbm(tm * nScale * 1.9 + wavePhase * 0.8, si * 0.73, seed.phase + 5, 2);
            const oN    = fbm(tm * nScale * 3.5 + wavePhase * 0.4, si * 1.28, seed.phase + 22, 2);
            const oM    = lerp(1, smoothstep(clamp((oN - 0.22) / 0.68)), occStr);
            const nM    = lerp(1, lerp(0.44, 1, dN), noiseStr);
            const alpha = globalMod * dens * seed.intensity * 0.85 * longF * angEnvR * oM * nM * 0.18;
            if (alpha < 0.003) continue;
            const ridgeRgb = mixRgb(glowRgb, rayRgb, lerp(0.35, 0.75, tm) * (1 - blendFrac * 0.5) + blendFrac * 0.3);
            drawSoftBeamSegment(rctx, sx, sy, shaftAngle, t0, t1, shaftLen, ridgeW, ridgeRgb, alpha);
          }
        }
      }

      // ── composite ──────────────────────────────────────────────────────────
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const manualBlur = shouldUseManualBlur();

      // 1. Volume haze
      const volBlur = 22 + soft * 24;
      drawLayer(ctx, vol.canvas, W, H, volBlur, 1, manualBlur);

      // 2. Shaft halos (heavy blur — saturated column glow)
      const haloBlur = 30 + soft * 18 + strkSoft * 8;
      drawLayer(ctx, halo.canvas, W, H, haloBlur, atmo.haloStr * 0.40, manualBlur);

      // 3. Area ribbons — sharp pass
      const areaBlur = 4 + strkSoft * 8 + soft * 2;
      drawLayer(ctx, area.canvas, W, H, areaBlur, 0.92, manualBlur);

      // 4. Area ribbons — soft secondary pass
      drawLayer(ctx, area.canvas, W, H, areaBlur * 2.8 + 10, 0.14, manualBlur);

      // 5. Streak spines — controlled crispness
      const strkBlur = 3 + strkSoft * 14;
      drawLayer(ctx, strk.canvas, W, H, strkBlur, 1, manualBlur);

      // 6. Streak halo
      drawLayer(ctx, strk.canvas, W, H, strkBlur * 2.8 + 8, 0.32, manualBlur);

      // 7. Ridge cores
      const rdgBlur = 2 + soft * 6;
      drawLayer(ctx, rdg.canvas, W, H, rdgBlur, 1, manualBlur);

      // 8. Ridge aureole
      drawLayer(ctx, rdg.canvas, W, H, rdgBlur * 3.5 + 6, 0.38, manualBlur);

      ctx.filter = 'none';

      // ── source bloom ───────────────────────────────────────────────────────
      if (sourceGlow > 2) {
        const glowStr = (sourceGlow / 100) * globalMod;
        const baseR   = Math.min(W, H);

        const r0 = baseR * (0.032 + glowStr * 0.052);
        const g0 = ctx.createRadialGradient(sx, sy, 0, sx, sy, r0);
        g0.addColorStop(0,    `rgba(255,255,252,${clamp(glowStr * opa * 0.96).toFixed(4)})`);
        g0.addColorStop(0.30, rgba(glowRgb, glowStr * opa * 0.60));
        g0.addColorStop(1,    'rgba(0,0,0,0)');
        ctx.fillStyle = g0;
        ctx.beginPath(); ctx.arc(sx, sy, r0, 0, Math.PI * 2); ctx.fill();

        const r1 = baseR * (0.08 + glowStr * 0.16);
        const g1 = ctx.createRadialGradient(sx, sy, r0 * 0.22, sx, sy, r1);
        g1.addColorStop(0,    rgba(mixRgb(glowRgb, rayRgb, 0.5), glowStr * opa * 0.38));
        g1.addColorStop(0.55, rgba(rayRgb, glowStr * opa * 0.12));
        g1.addColorStop(1,    'rgba(0,0,0,0)');
        ctx.fillStyle = g1;
        ctx.beginPath(); ctx.arc(sx, sy, r1, 0, Math.PI * 2); ctx.fill();

        const r2 = baseR * (0.18 + glowStr * 0.24);
        ctx.save();
        ctx.translate(sx + cosDirX * r2 * 0.10, sy + sinDirY * r2 * 0.10);
        ctx.rotate(dir);
        ctx.scale(1.55 + soft * 0.32, 0.50 + soft * 0.30);
        const g2 = ctx.createRadialGradient(0, 0, 0, 0, 0, r2);
        g2.addColorStop(0,    rgba(rayRgb, glowStr * opa * 0.20));
        g2.addColorStop(0.55, rgba(hazeRgb, glowStr * opa * 0.06));
        g2.addColorStop(1,    'rgba(0,0,0,0)');
        ctx.fillStyle = g2;
        ctx.beginPath(); ctx.arc(0, 0, r2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        const fanLen = maxLen * (0.26 + glowStr * 0.12);
        const fanW   = fieldW * (0.44 + soft * 0.18);
        for (let fs = 0; fs < 4; fs++) {
          const t0 = fs / 5.2, t1 = (fs + 1.55) / 5.2;
          const tm = (t0 + t1) * 0.5;
          const fanA = glowStr * opa * dens * Math.pow(1 - tm, 1.55) * (0.18 + hazeStr * 0.05);
          if (fanA < 0.006) continue;
          const warmRgb = mixRgb(glowRgb, rayRgb, 0.38 + blendFrac * 0.22);
          const fw = fanW * Math.pow(Math.max(tm, 0.03), 0.42) * (1.35 - tm * 0.28);
          drawSoftBeamSegment(ctx, sx, sy, dir, t0, t1, fanLen, fw, warmRgb, fanA, 1.08, 0.52);
        }
      }

      // ── underwater caustics ────────────────────────────────────────────────
      if (atmosphereMode === 'underwater') {
        const causticStr = globalMod * hazeStr * dens * 0.18;
        for (const cs of causticSeeds) {
          const pulse = 0.5 + 0.5 * Math.cos(totalTime * cs.freq + cs.phase);
          const brt   = causticStr * pulse * (0.6 + cs.size * 2.0);
          if (brt < 0.006) continue;
          // drift position along shaft direction
          const driftAmt = (totalTime * cs.drift + cs.ox) * maxLen;
          const cx = sx + cosDirX * driftAmt + perpX * cs.oy * fieldW * 2.0;
          const cy = sy + sinDirY * driftAmt + perpY * cs.oy * fieldW * 2.0;
          const cr = fieldW * cs.size * (0.8 + pulse * 0.6);
          if (cr < 2) continue;
          const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
          const causticRgb = mixRgb(glowRgb, rayRgb, 0.3 + blendFrac * 0.3);
          cg.addColorStop(0,    rgba(causticRgb, brt));
          cg.addColorStop(0.45, rgba(causticRgb, brt * 0.28));
          cg.addColorStop(1,    'rgba(0,0,0,0)');
          ctx.fillStyle = cg;
          ctx.beginPath(); ctx.arc(cx, cy, cr, 0, Math.PI * 2); ctx.fill();
        }
      }

      // ── atmosphere-appropriate particles ───────────────────────────────────
      {
        const dustTarget = Math.floor((dustAmount / 100) * dustMul * 200);
        const spread2    = halfSpread * 2;
        while (particles.length < dustTarget) particles.push(spawnParticle(sx, sy, maxLen, dir, spread2, atmosphereMode));
        while (particles.length > dustTarget) particles.pop();

        const dSpeed = 0.26 + (driftSpeed / 100) * 0.98 * atmo.driftMul * motionScale;

        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];

          // Apply atmospheric current to velocity
          const fx = fbm(p.x * 0.0018 + currentX, p.y * 0.0018 + currentY, 301, 2);
          const fy = fbm(p.x * 0.0018 + currentX + 4.2, p.y * 0.0018 + currentY, 303, 2);
          p.vx += (fx - 0.5) * atmo.particleFlow * 0.0004;
          p.vy += (fy - 0.5) * atmo.particleFlow * 0.0002;

          p.x  += p.vx * dt * 60 * dSpeed;
          p.y  += p.vy * dt * 60 * dSpeed;
          p.life -= p.decay;
          if (p.life <= 0) { particles[i] = spawnParticle(sx, sy, maxLen, dir, spread2, atmosphereMode); continue; }

          const dx = p.x - sx, dy = p.y - sy;
          const u = dx * cosDirX + dy * sinDirY;
          const v = Math.abs(dx * perpX + dy * perpY);
          if (u <= 0) { particles[i] = spawnParticle(sx, sy, maxLen, dir, spread2, atmosphereMode); continue; }
          const uNorm = clamp(u / maxLen);
          const widthAtP = fieldW * (0.045 + Math.pow(uNorm, 0.78) * 0.58);
          const broadLight = smoothstep(1 - clamp(v / Math.max(1, widthAtP)));
          const distF = Math.pow(1 - uNorm, 0.70 + fall * 1.15);

          let streakLight = 0;
          for (let si = 0; si < Math.min(shaftCount, 18); si++) {
            const a = shaftAngles[si]; const ax = Math.cos(a), ay = Math.sin(a);
            const su = dx * ax + dy * ay;
            if (su <= 0) continue;
            const sv = Math.abs(dx * (-ay) + dy * ax);
            const seed = shaftSeeds[si % 32];
            const sW = fieldW * seed.widthMul * (0.020 + Math.pow(clamp(su / maxLen), 0.72) * 0.20);
            streakLight = Math.max(streakLight, smoothstep(1 - clamp(sv / Math.max(1, sW))) * seed.intensity);
          }

          const localLight = broadLight * (0.42 + streakLight * 0.80);
          const alpha = p.life * localLight * distF * (dustAmount / 100) * opa * 0.42;
          if (alpha < 0.006) continue;

          const pRgb = mixRgb(mixRgb(rayRgb, glowRgb, streakLight * 0.22), hazeRgb, blendFrac * 0.55);

          if (p.type === 'bubble') {
            // Ring-like with hollow center
            const dr = p.size * (1.4 + soft * 0.8);
            const bg = ctx.createRadialGradient(p.x, p.y, dr * 0.4, p.x, p.y, dr);
            bg.addColorStop(0,    'rgba(0,0,0,0)');
            bg.addColorStop(0.55, rgba(pRgb, alpha * 0.5));
            bg.addColorStop(0.80, rgba(pRgb, alpha));
            bg.addColorStop(1,    'rgba(0,0,0,0)');
            ctx.fillStyle = bg;
            ctx.beginPath(); ctx.arc(p.x, p.y, dr, 0, Math.PI * 2); ctx.fill();
          } else if (p.type === 'wisp') {
            // Large soft blob
            const dr = p.size * (1.8 + soft * 1.6);
            const wg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, dr);
            wg.addColorStop(0,    rgba(pRgb, alpha * 0.6));
            wg.addColorStop(0.38, rgba(pRgb, alpha * 0.22));
            wg.addColorStop(1,    'rgba(0,0,0,0)');
            ctx.fillStyle = wg;
            ctx.beginPath(); ctx.arc(p.x, p.y, dr, 0, Math.PI * 2); ctx.fill();
          } else {
            // mote — small crisp dot
            const dr = p.size * (1.35 + soft * 1.25);
            const dg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, dr);
            dg.addColorStop(0,    rgba(pRgb, alpha));
            dg.addColorStop(0.45, rgba(pRgb, alpha * 0.28));
            dg.addColorStop(1,    'rgba(0,0,0,0)');
            ctx.fillStyle = dg;
            ctx.beginPath(); ctx.arc(p.x, p.y, dr, 0, Math.PI * 2); ctx.fill();
          }
        }
      }

      ctx.restore();
    },
  };
}
