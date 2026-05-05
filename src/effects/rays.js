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

// ─── color ───────────────────────────────────────────────────────────────────

function hexToRgb(hex = '#ffffff') {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function mixRgb(a, b, t) {
  return { r: lerp(a.r, b.r, t), g: lerp(a.g, b.g, t), b: lerp(a.b, b.b, t) };
}

function rgba(rgb, a) {
  return `rgba(${Math.round(rgb.r)},${Math.round(rgb.g)},${Math.round(rgb.b)},${clamp(a).toFixed(4)})`;
}

// ─── atmosphere behavior ──────────────────────────────────────────────────────

const ATMO = {
  clean:      { haze:0.30, dust:0.16, soft:0.72, noise:0.46, occ:0.30, motion:0.46, flow:0.25, width:0.78, halo:0.58, cool:0.00 },
  dusty:      { haze:0.86, dust:1.40, soft:0.96, noise:0.90, occ:0.74, motion:0.78, flow:0.82, width:1.00, halo:0.88, cool:0.00 },
  foggy:      { haze:1.45, dust:0.38, soft:1.42, noise:0.58, occ:0.36, motion:0.54, flow:0.52, width:1.34, halo:1.22, cool:0.08 },
  smoky:      { haze:1.18, dust:1.18, soft:1.10, noise:1.18, occ:1.22, motion:0.92, flow:1.00, width:1.12, halo:1.02, cool:0.03 },
  underwater: { haze:1.75, dust:1.55, soft:1.48, noise:0.70, occ:0.42, motion:1.35, flow:1.62, width:1.52, halo:1.34, cool:0.30 },
  misty:      { haze:1.02, dust:0.55, soft:1.18, noise:0.62, occ:0.42, motion:0.72, flow:0.62, width:1.10, halo:1.05, cool:0.02 },
};

// ─── micro particle controller ───────────────────────────────────────────────
// Per-atmosphere config: count, size (px base), speed, rise (neg=up, pos=down),
// spread (lateral fieldW multiplier), tint (0=rayRgb, 1=glowRgb), opacity.

const MICRO = {
  //             count  size   speed   rise    spread  tint   opacity
  clean:      {  count: 22,  size: 2.0,  speed: 0.12, rise: -0.014, spread: 1.05, tint: 0.70, opacity: 0.80 },
  dusty:      {  count: 58,  size: 3.2,  speed: 0.22, rise:  0.028, spread: 0.92, tint: 0.25, opacity: 0.88 },
  foggy:      {  count: 82,  size: 1.4,  speed: 0.06, rise:  0.006, spread: 1.40, tint: 0.82, opacity: 0.65 },
  smoky:      {  count: 50,  size: 2.6,  speed: 0.30, rise: -0.042, spread: 0.88, tint: 0.16, opacity: 0.75 },
  underwater: {  count: 44,  size: 3.8,  speed: 0.18, rise: -0.065, spread: 0.82, tint: 0.90, opacity: 0.90 },
  misty:      {  count: 76,  size: 1.2,  speed: 0.08, rise:  0.010, spread: 1.28, tint: 0.78, opacity: 0.60 },
};

// ─── offscreen ────────────────────────────────────────────────────────────────

function ensureCanvas(layer, w, h) {
  if (!layer.canvas) {
    layer.canvas = document.createElement('canvas');
    layer.ctx = layer.canvas.getContext('2d');
  }
  if (layer.canvas.width !== w || layer.canvas.height !== h) {
    layer.canvas.width = w;
    layer.canvas.height = h;
  }
  layer.ctx.setTransform(1, 0, 0, 1, 0, 0);
  layer.ctx.globalAlpha = 1;
  layer.ctx.globalCompositeOperation = 'source-over';
  layer.ctx.shadowBlur = 0;
  layer.ctx.shadowColor = 'rgba(0,0,0,0)';
  layer.ctx.clearRect(0, 0, w, h);
  return layer.ctx;
}

// ─── seeds ───────────────────────────────────────────────────────────────────

function makeShaftSeed(i) {
  return {
    length:    0.62 + hash(i, i * 3.17, 2) * 0.46,
    width:     0.58 + hash(i, i * 7.43, 5) * 1.05,
    intensity: 0.44 + hash(i, i * 13.1, 8) * 0.72,
    phase:     hash(i, i * 44.8, 14) * Math.PI * 2,
    bias:      hash(i, i * 2.09, 11) - 0.5,
    slot:      hash(i, i * 5.31, 19) - 0.5,
  };
}

function makeParticleSeed(i) {
  return {
    angle: hash(i, i * 2.11, 41) - 0.5,
    dist:  Math.pow(hash(i, i * 3.17, 43), 0.56),
    side:  hash(i, i * 4.97, 47) - 0.5,
    size:  hash(i, i * 8.23, 53),
    speed: hash(i, i * 6.71, 59),
    phase: hash(i, i * 9.43, 61) * Math.PI * 2,
    type:  hash(i, i * 1.83, 67),
  };
}

// ─── drawing helpers ──────────────────────────────────────────────────────────

function ellipseGlow(ctx, x, y, rx, ry, angle, rgb, alpha, stops = [0.22, 0.07]) {
  if (alpha < 0.002 || rx < 1 || ry < 1) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(Math.max(0.01, rx / ry), 1);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, ry);
  g.addColorStop(0, rgba(rgb, alpha));
  g.addColorStop(0.45, rgba(rgb, alpha * stops[0]));
  g.addColorStop(1, rgba(rgb, alpha * stops[1]));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, ry, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawShaftPlane(ctx, sx, sy, angle, len, width0, width1, rgb, alpha, options = {}) {
  if (alpha < 0.002 || len < 4 || width1 < 0.4) return;
  const ax = Math.cos(angle), ay = Math.sin(angle);
  const px = -ay, py = ax;
  const startT = options.startT ?? 0.015;
  const endT = options.endT ?? 0.96;
  const farFade = options.farFade ?? 0.10;
  const nearFade = options.nearFade ?? 0.10;
  const slices = options.slices ?? 1;
  const edgePower = options.edgePower ?? 1.18;
  const blur = options.blur ?? 0;

  ctx.save();
  ctx.globalCompositeOperation = options.blend || 'screen';
  if (blur > 0) {
    ctx.shadowColor = rgba(rgb, alpha * 0.55);
    ctx.shadowBlur = blur;
  }

  for (let s = 0; s < slices; s++) {
    const raw0 = s / slices;
    const raw1 = (s + 1) / slices;
    const overlap = slices === 1 ? 0 : 0.14;
    const t0 = lerp(startT, endT, Math.max(0, raw0 - overlap));
    const t1 = lerp(startT, endT, Math.min(1, raw1 + overlap));
    const tm = (t0 + t1) * 0.5;
    const near = smoothstep((tm - startT) / Math.max(0.001, nearFade));
    const far = smoothstep((endT - tm) / Math.max(0.001, farFade));
    const distanceFade = Math.pow(Math.max(0, 1 - tm), options.fallPower ?? 1.25);
    const sectionAlpha = alpha * near * far * (0.28 + distanceFade * 0.92);
    if (sectionAlpha < 0.0015) continue;

    const w0 = width0 + (width1 - width0) * t0;
    const w1 = width0 + (width1 - width0) * t1;
    const wm = width0 + (width1 - width0) * tm;
    const mx = sx + ax * len * tm;
    const my = sy + ay * len * tm;
    const g = ctx.createLinearGradient(mx + px * wm, my + py * wm, mx - px * wm, my - py * wm);
    g.addColorStop(0.00, 'rgba(0,0,0,0)');
    g.addColorStop(0.18, rgba(rgb, sectionAlpha * 0.12));
    g.addColorStop(0.34, rgba(rgb, sectionAlpha * 0.50));
    g.addColorStop(0.50, rgba(rgb, sectionAlpha));
    g.addColorStop(0.66, rgba(rgb, sectionAlpha * 0.50));
    g.addColorStop(0.82, rgba(rgb, sectionAlpha * 0.12));
    g.addColorStop(1.00, 'rgba(0,0,0,0)');

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(sx + ax * len * t0 + px * w0, sy + ay * len * t0 + py * w0);
    ctx.lineTo(sx + ax * len * t0 - px * w0, sy + ay * len * t0 - py * w0);
    ctx.lineTo(sx + ax * len * t1 - px * w1, sy + ay * len * t1 - py * w1);
    ctx.lineTo(sx + ax * len * t1 + px * w1, sy + ay * len * t1 + py * w1);
    ctx.closePath();
    ctx.globalAlpha = 1;
    ctx.fill();
  }
  ctx.restore();
}

function drawAtmosphericWisps(ctx, sx, sy, dir, maxLen, fieldW, rayRgb, hazeRgb, alpha, seeds, time, atmo, mode) {
  if (alpha < 0.002) return;
  const ax = Math.cos(dir), ay = Math.sin(dir);
  const px = -ay, py = ax;
  const count = mode === 'underwater' ? 12 : mode === 'smoky' ? 14 : 8;
  for (let i = 0; i < count; i++) {
    const seed = seeds[(i * 7 + 9) % seeds.length];
    // Per-wisp speed oscillation so some linger while others glide through
    const speedMul = 0.45 + 0.55 * Math.abs(Math.sin(seed.phase * 1.7 + time * 0.038));
    const drift = time * (0.015 + seed.speed * 0.032) * atmo.flow * speedMul;
    const baseU = fract(seed.dist * 0.92 + drift);
    // Curl: independent FBM fields for along-axis and cross-axis wander
    const wispCurlA = fbm(baseU * 3.5 + seed.phase,       time * 0.042 + i * 0.53, 173, 3);
    const wispCurlS = fbm(baseU * 3.1 + seed.phase + 4.2, time * 0.058 + i * 0.39, 179, 3);
    const u    = clamp(baseU + (wispCurlA - 0.5) * 0.055 * atmo.flow);
    const sideWander = (wispCurlS - 0.5) * (mode === 'underwater' ? 0.52 : 0.38) * atmo.flow;
    const side = seed.side * 0.80 + sideWander
               + Math.sin(baseU * 4.8 + seed.phase) * 0.06;
    const width = fieldW * (0.22 + Math.pow(u, 0.82) * 1.05);
    const x = sx + ax * maxLen * u + px * side * width;
    const y = sy + ay * maxLen * u + py * side * width;
    const fade = Math.pow(1 - u, 1.15) * smoothstep(1 - Math.abs(side) * 0.82);
    const local = fbm(u * 2.2 + time * 0.04, side * 2.0, 181 + i, 3);
    const a = alpha * fade * lerp(0.45, 1.0, local) * (mode === 'clean' ? 0.35 : 1);
    if (a < 0.003) continue;
    const rgb = mixRgb(hazeRgb, rayRgb, 0.28 + local * 0.26);
    // Shape variety: ~38% become elongated beam-aligned streaks, rest stay rounded blobs
    const isStreak = seed.type > 0.62;
    const rx = isStreak
      ? maxLen * (0.075 + seed.size * 0.110)
      : maxLen * (0.035 + seed.size * 0.055) * (mode === 'underwater' ? 1.45 : 1);
    const ry = isStreak
      ? fieldW * (0.008 + seed.size * 0.014)
      : fieldW * (0.035 + seed.size * 0.085) * (mode === 'smoky' ? 1.35 : 1);
    const wispAngle = isStreak ? dir + seed.side * 0.06 : dir + seed.side * 0.18;
    ellipseGlow(ctx, x, y, rx, ry, wispAngle, rgb, a * (isStreak ? 0.065 : 0.090), [0.34, 0.02]);
  }
}

function drawShaftFamily(ctx, sx, sy, angle, len, baseW, rgb, glowRgb, alpha, seed, params) {
  const {
    fieldScale, soft, fall, noiseStr, occStr, wavePhase, motionPhase, nScale,
    sourceMerge = 0.12, mode = 'dusty', totalTime: tTime = 0,
  } = params;

  const underwater = mode === 'underwater';
  const breathFreq = 0.22 + seed.intensity * 0.18;
  const breath = 1 + Math.sin(tTime * breathFreq * Math.PI * 2 + seed.phase) * params.breathAmp * 1.8;
  const length = len * (0.94 + seed.length * 0.08) * (0.96 + soft * 0.06);
  const width0 = Math.max(0.4, baseW * 0.10 * sourceMerge);
  const width1 = baseW * seed.width * fieldScale * (0.72 + soft * (underwater ? 1.18 : 0.85)) * breath;
  const flowPhase = underwater ? wavePhase * 0.72 : wavePhase;
  const densityWave = fbm(seed.phase + flowPhase * 0.58, seed.bias * 2.0 + flowPhase * 0.10, 71, underwater ? 4 : 3);
  const occWave = fbm(seed.phase - flowPhase * 0.70, seed.slot * nScale + flowPhase * 0.16, 79, underwater ? 3 : 2);
  const familyVisible = lerp(1, smoothstep((occWave - 0.30) / 0.55), occStr * 0.50);
  const densityMod = lerp(1, lerp(0.72, 1.18, densityWave), noiseStr * 0.45);
  const shaftAlpha = alpha * seed.intensity * densityMod * familyVisible;
  const haloBoost = params.haloBoost ?? 1;
  const coreMul = underwater ? 0.52 : 1;
  const bodyMul = underwater ? 1.20 : 1;

  // Wide halo, visible sheet, and narrow core. All follow the same straight
  // light direction, but width gradients keep the sides from reading as objects.
  // Underwater uses much lower blur to preserve distinct shaft edges and gaps.
  const uwBlurScale = underwater ? 0 : 1;
  drawShaftPlane(ctx, sx, sy, angle, length, width0 * (underwater ? 5.4 : 4.6), width1 * (underwater ? 3.20 : 4.40), rgb, shaftAlpha * (underwater ? 0.34 : 0.17) * haloBoost * bodyMul, {
    startT: 0.01, endT: 0.99, nearFade: 0.18, farFade: underwater ? 0.28 : 0.24, fallPower: underwater ? 0.62 : 0.65, slices: 1, blur: ((underwater ? 6 : 12) + soft * (underwater ? 8 : 22)) * uwBlurScale,
  });
  drawShaftPlane(ctx, sx, sy, angle, length, width0 * (underwater ? 3.0 : 2.40), width1 * (underwater ? 1.80 : 1.90), rgb, shaftAlpha * (underwater ? 0.38 : 0.28), {
    startT: 0.025, endT: 0.985, nearFade: 0.11, farFade: (underwater ? 0.28 : 0.24) + fall * 0.08, fallPower: (underwater ? 0.80 : 0.90) + fall * 0.22, slices: 1, blur: ((underwater ? 3 : 5) + soft * (underwater ? 5 : 10)) * uwBlurScale,
  });
  if (seed.intensity > 0.62) {
    drawShaftPlane(ctx, sx, sy, angle, length * (underwater ? 0.92 : 0.78), width0 * (underwater ? 1.10 : 0.75), width1 * (underwater ? 0.52 : 0.23), glowRgb, shaftAlpha * (underwater ? 0.18 : 0.095) * coreMul, {
      startT: 0.055, endT: 0.94, nearFade: 0.08, farFade: underwater ? 0.30 : 0.30, fallPower: underwater ? 0.90 : 1.45, slices: 1, blur: ((underwater ? 2 : 3) + soft * (underwater ? 3 : 5)) * uwBlurScale,
    });
  }
  // Ridges always enabled for underwater — the bright centerline defines each shaft
  if (seed.intensity > 0.62 && underwater) {
    drawShaftPlane(ctx, sx, sy, angle, length * 0.88, width0 * 0.60, width1 * 0.18, glowRgb, shaftAlpha * 0.14, {
      startT: 0.03, endT: 0.95, nearFade: 0.06, farFade: 0.25, fallPower: 0.95, slices: 2, blur: 1.5 + soft * 2.0,
    });
  }
  if (seed.intensity > 0.86 && !underwater) {
    drawShaftPlane(ctx, sx, sy, angle, length * 0.70, width0 * 0.42, width1 * 0.12, glowRgb, shaftAlpha * 0.070, {
      startT: 0.035, endT: 0.78, nearFade: 0.07, farFade: 0.32, fallPower: 1.75, slices: 1, blur: 1.5 + soft * 2.4,
    });
  }
}

function drawMicroParticles(ctx, sx, sy, dir, W, H, maxLen, fieldW, rayRgb, glowRgb, alpha, seeds, time, atmo, mode) {
  const mc = MICRO[mode] || MICRO.dusty;
  if (alpha < 0.003) return;
  const ax = Math.cos(dir), ay = Math.sin(dir);

  for (let i = 0; i < mc.count; i++) {
    const p = seeds[(i * 17 + 7) % seeds.length];

    // Along-beam drift — unique speed per particle
    const u = fract(p.dist * 1.07 + time * mc.speed * (0.35 + p.speed * 0.65) * atmo.flow);

    // Perpendicular: base slot + rise/fall that loops via fract so particles recycle smoothly
    const lateralPhase = fract(p.type + time * mc.rise * (0.40 + p.speed * 0.60));
    const side = (lateralPhase - 0.5) * mc.spread * 2.1
               + Math.sin(time * (0.10 + p.speed * 0.08) + p.phase * 3.5) * 0.05;

    const x = sx + ax * maxLen * u + (-ay) * side * fieldW;
    const y = sy + ay * maxLen * u +   ax  * side * fieldW;
    if (x < -4 || x > W + 4 || y < -4 || y > H + 4) continue;

    const distFade = Math.pow(1 - u, 0.42);
    const sideFade = smoothstep(1 - Math.abs(side) / (mc.spread * 1.15));
    if (distFade * sideFade < 0.018) continue;

    const r = mc.size * (0.35 + p.size * 1.30);
    const a = alpha * distFade * sideFade * mc.opacity * (0.30 + p.size * 0.55);
    if (a < 0.005 || r < 0.5) continue;

    const rgb = mixRgb(rayRgb, glowRgb, mc.tint * (0.45 + p.size * 0.55));

    if (r >= 2.0) {
      // Soft radial glow for larger micro motes
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.2);
      g.addColorStop(0,    rgba(rgb, a));
      g.addColorStop(0.40, rgba(rgb, a * 0.45));
      g.addColorStop(1,    'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r * 2.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Compact soft dot for smaller particles
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 1.8);
      g.addColorStop(0, rgba(rgb, a));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r * 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawAtmosphericDust(ctx, sx, sy, dir, maxLen, fieldW, rayRgb, glowRgb, alpha, seeds, time, atmo, mode) {
  if (alpha < 0.002) return;
  const ax = Math.cos(dir), ay = Math.sin(dir);
  const px = -ay, py = ax;
  const count = Math.min(seeds.length, Math.round(24 + alpha * 120 * atmo.dust));
  for (let i = 0; i < count; i++) {
    const p = seeds[i];
    // Per-particle speed oscillation — each particle breathes fast/slow on its own cycle
    const speedVar = 0.55 + 0.45 * Math.sin(p.phase * 2.8 + time * (0.06 + p.speed * 0.10));
    const drift = time * (0.008 + p.speed * 0.028) * atmo.flow * speedVar;
    const baseU = fract(p.dist + drift);
    // Curl displacement: two FBM samples give a 2D flow field — particles take curving paths
    const curlU = fbm(baseU * 4.2 + p.phase,       time * 0.055 + i * 0.44, 91, 3);
    const curlS = fbm(baseU * 3.8 + p.phase + 5.7, time * 0.072 + i * 0.31, 97, 3);
    const u    = clamp(baseU + (curlU - 0.5) * 0.06 * atmo.flow);
    const curlAmt = (0.18 + p.size * 0.24) * atmo.flow;
    const side = p.side * 0.70 + (curlS - 0.5) * curlAmt
               + Math.sin(baseU * 6.1 + p.phase) * 0.04;
    const width = fieldW * (0.16 + Math.pow(u, 0.72) * 1.25);
    const x = sx + ax * maxLen * u + px * side * width;
    const y = sy + ay * maxLen * u + py * side * width;
    const distFade = Math.pow(1 - u, 0.7);
    const lightFade = smoothstep(1 - Math.abs(side) / 0.88);
    // Power-law size distribution: ~70% tiny, ~22% medium, ~8% rare large
    const sizeClass = fract(p.type * 7.3 + p.phase * 0.159);
    const size = mode === 'underwater'
      ? (sizeClass > 0.85 ? 3.5 + p.size * 5.5 : sizeClass > 0.55 ? 1.2 + p.size * 2.2 : 0.4 + p.size * 0.9)
      : (sizeClass > 0.92 ? 5.0 + p.size * 10.0 : sizeClass > 0.72 ? 1.8 + p.size * 4.5 : 0.35 + p.size * 1.2);
    const a = alpha * distFade * lightFade * (0.15 + p.size * 0.45);
    if (a < 0.004) continue;
    const rgb = mixRgb(rayRgb, glowRgb, p.size * 0.28);
    const outerR = size * (mode === 'underwater' ? 2.4 : 1.8);
    const g = ctx.createRadialGradient(x, y, 0, x, y, outerR);
    g.addColorStop(0,    rgba(rgb, a));
    g.addColorStop(0.30, rgba(rgb, a * 0.55));
    g.addColorStop(0.65, rgba(rgb, a * 0.15));
    g.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, outerR, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ─── main effect ──────────────────────────────────────────────────────────────

export function createRaysEffect() {
  let phase = 0;
  let totalTime = 0;
  const shaftLayer = {};
  const shaftSeeds = Array.from({ length: 32 }, (_, i) => makeShaftSeed(i));
  const particleSeeds = Array.from({ length: 220 }, (_, i) => makeParticleSeed(i));

  return {
    reset() {
      phase = 0;
      totalTime = 0;
    },

    update(ctx, canvas, params, dt) {
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

      const W = canvas.width, H = canvas.height;
      const atmo = ATMO[atmosphereMode] || ATMO.dusty;
      const motionScale = clamp(motionAmount / 100);
      const animSpeed = clamp(animationSpeed / 100);
      const turb = 0.10 + (turbulenceSpeed / 100) * 0.42;
      phase += dt * turb * (0.45 + animSpeed * 1.35) * (0.2 + motionScale);
      totalTime += dt;

      const baseDir = (direction * Math.PI) / 180;
      const sourceMotion = atmo.motion * motionScale * (0.45 + animSpeed * 0.85);
      const sourceT = totalTime * (0.08 + animSpeed * 0.20);
      const sx = W * (sourceX / 100) + (valueNoise(sourceT, 2.1, 151) - 0.5) * W * 0.012 * sourceMotion;
      const sy = H * (sourceY / 100) + (valueNoise(sourceT * 0.9, 8.8, 157) - 0.5) * H * 0.010 * sourceMotion;
      const dir = baseDir + (valueNoise(sourceT * 0.7, 4.5, 163) - 0.5) * 0.026 * sourceMotion;
      const halfSpread = (spreadAngle * Math.PI / 180) * 0.5;
      const maxLen = Math.hypot(W, H) * (beamLength / 100) * 0.90;
      const fieldW = Math.min(W, H) * (beamWidth / 100) * 0.72;
      const ax = Math.cos(dir), ay = Math.sin(dir);

      const rayRgb = hexToRgb(rayColor);
      const hazeRgbBase = hexToRgb(hazeColor);
      const glowRgb = hexToRgb(glowColor);
      const blendFrac = clamp(colorBlend / 100);
      const hazeRgb = mixRgb(hazeRgbBase, rayRgb, atmo.cool * 0.18);

      const opa = clamp(intensity / 100);
      const soft = clamp(softness / 100) * atmo.soft;
      const dens = clamp(density / 100);
      const fall = clamp(falloff / 100);
      const haze = clamp(atmosphericHaze / 100) * atmo.haze;
      const noiseStr = clamp(noiseAmount / 100) * atmo.noise;
      const occStr = clamp(occlusionGaps / 100) * atmo.occ;
      const feather = clamp(edgeFeather / 100);
      const strkSoft = clamp(streakSoftness / 100);
      const underwater = atmosphereMode === 'underwater';
      const breathAmp = clamp(breathing / 100) * motionScale * (underwater ? 0.24 : 0.16);
      const wavePhase = totalTime * (0.10 + driftSpeed / 100 * (underwater ? 0.82 : 0.55)) * atmo.flow * (0.45 + animSpeed * 1.25);
      const motionPhase = totalTime * (0.18 + animSpeed * (underwater ? 0.82 : 0.52)) * (0.40 + motionScale * 0.95);
      const nScale = 0.7 + (noiseScale / 100) * 2.4;
      const globalPulse = 1 + (valueNoise(phase * 1.8, 1.4, 3) - 0.5) * clamp(flickerAmount / 100) * 0.10;
      const sceneBreathe = 1 + Math.sin(totalTime * 0.11) * 0.045
                             + Math.sin(totalTime * 0.073 + 1.4) * 0.028;
      const fanSweepAmp  = halfSpread * 0.18 * motionScale * (0.4 + animSpeed * 0.8);
      const fanSweepFreq = 0.055 + (driftSpeed / 100) * 0.045;
      const globalFanSweep = Math.sin(totalTime * fanSweepFreq) * fanSweepAmp;
      const lightAlpha = opa * dens * globalPulse * sceneBreathe;
      const shaftCtx = ensureCanvas(shaftLayer, W, H);
      const flowTime = totalTime * (0.22 + (drift / 100) * 0.62) * (0.45 + animSpeed * 1.05);

      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      // Broad environmental volume. These soft ellipses bake in blur via gradients.
      if (haze > 0.01) {
        const baseHaze = lightAlpha * haze;
        const broadRgb = mixRgb(hazeRgb, rayRgb, blendFrac * 0.25);
        ellipseGlow(
          ctx,
          sx + ax * maxLen * 0.34,
          sy + ay * maxLen * 0.34,
          maxLen * (0.42 + soft * 0.14),
          fieldW * (1.05 + soft * 0.68),
          dir,
          broadRgb,
          baseHaze * 0.24,
          [0.30, 0.025],
        );
        ellipseGlow(
          ctx,
          sx + ax * maxLen * 0.18,
          sy + ay * maxLen * 0.18,
          maxLen * 0.20,
          fieldW * (0.42 + soft * 0.25),
          dir,
          mixRgb(glowRgb, rayRgb, 0.50),
          baseHaze * 0.25,
          [0.28, 0.02],
        );
      }

      // Ambient fill — strength varies by mode: warm/foggy modes fill gaps with color, dark modes stay dark
      const ambFillStr = underwater ? 0.14
        : atmosphereMode === 'clean' ? 0.07
        : (atmosphereMode === 'foggy' || atmosphereMode === 'misty') ? 0.28
        : 0.22;
      ellipseGlow(ctx, sx + ax * maxLen * 0.42, sy + ay * maxLen * 0.42,
        maxLen * 0.65, fieldW * 1.35, dir,
        mixRgb(hazeRgb, rayRgb, blendFrac * 0.20), lightAlpha * haze * ambFillStr, [0.45, 0.06]);

      // Straight widening shaft families. Layout moves subtly, but centerlines stay straight.
      const shaftCount = Math.max(2, Math.round(rayCount));
      const familyCount = Math.max(3, Math.min(11, Math.round(shaftCount * (underwater ? 0.72 : 0.72))));
      const spreadUsable = halfSpread * (0.62 + feather * 0.30);
      for (let i = 0; i < familyCount; i++) {
        const seed = shaftSeeds[i % shaftSeeds.length];
        const even = familyCount === 1 ? 0 : i / (familyCount - 1) - 0.5;
        const slot = even + seed.slot * 0.20;
        // Underwater: more angular drift gives natural fan variation
        const clusterDrift = (fbm(i * 0.41, motionPhase * 0.55 + seed.phase, 117, 2) - 0.5) * halfSpread * (underwater ? 0.20 : 0.12) * motionScale;
        const shaftDriftFreq = 0.15 + seed.intensity * 0.13;
        const shaftDrift = Math.sin(totalTime * shaftDriftFreq + seed.phase * 2.1) * halfSpread * 0.08 * motionScale;
        const angle = dir + slot * spreadUsable * 2 + clusterDrift + globalFanSweep + shaftDrift;
        const edge = Math.abs(slot) * 2;
        const edgeFade = smoothstep(1 - edge * (0.64 + (1 - feather) * 0.26));
        if (edgeFade < 0.015) continue;
        const outerCool = Math.pow(Math.abs(slot) * 2, 1.4);
        const colorMix = clamp(blendFrac * (0.18 + Math.abs(slot) * 0.35) + outerCool * 0.12);
        const shaftRgb = mixRgb(rayRgb, hazeRgb, colorMix);
        const coreRgb = mixRgb(glowRgb, rayRgb, 0.42 + blendFrac * 0.18);
        const baseW = fieldW * (0.040 + soft * 0.050 + strkSoft * 0.026) * atmo.width;
        // Underwater shafts are bright — definition comes from crisp edges, not dimness
        const alpha = lightAlpha * haze * edgeFade * (0.25 + strkSoft * 0.16) * (underwater ? 0.88 : 1);
        drawShaftFamily(shaftCtx, sx, sy, angle, maxLen, baseW, shaftRgb, coreRgb, alpha, seed, {
          fieldScale: 1,
          soft,
          fall,
          noiseStr,
          occStr,
          wavePhase,
          motionPhase,
          nScale,
          breathAmp,
          haloBoost: atmo.halo,
          mode: atmosphereMode,
          sourceMerge: 0.08 + soft * 0.06,
          totalTime,
        });
      }

      // Extra broad outer sheets for cinematic layered read (not for underwater — they create blobs).
      if (!underwater) {
        const sheetCount = Math.max(2, Math.min(6, Math.round(familyCount / 3)));
        for (let i = 0; i < sheetCount; i++) {
          const seed = shaftSeeds[(i * 5 + 3) % shaftSeeds.length];
          const slot = sheetCount === 1 ? 0 : i / (sheetCount - 1) - 0.5;
          const angle = dir + slot * halfSpread * 1.18 + globalFanSweep;
          const sheetRgb = mixRgb(rayRgb, hazeRgb, 0.35 + blendFrac * 0.28);
          const sheetAlpha = lightAlpha * haze * seed.intensity * 0.14 * atmo.halo;
          const w = fieldW * (0.16 + soft * 0.15) * atmo.width * seed.width;
          drawShaftPlane(shaftCtx, sx, sy, angle, maxLen * (0.96 + seed.length * 0.06), w * 0.08, w * 2.2, sheetRgb, sheetAlpha, {
            startT: 0.035, endT: 0.99, nearFade: 0.10, farFade: 0.32, fallPower: 0.95, slices: 1, blur: 14 + soft * 20,
          });
        }
      }

      // Underwater: wide ambient volume fill as soft sheets — replaces the blob-generating liquid shafts.
      // Low alpha, low blur, spread across the full fan to simulate the ambient scatter between crisp shafts.
      if (underwater) {
        for (let i = 0; i < 5; i++) {
          const seed = shaftSeeds[(i * 4 + 2) % shaftSeeds.length];
          const slot = i / 4 - 0.5;
          const uwAngle = dir + slot * halfSpread * 1.05 + (fbm(i * 0.7, motionPhase * 0.25 + seed.phase, 233, 2) - 0.5) * halfSpread * 0.15 * motionScale + globalFanSweep;
          const uwRgb = mixRgb(rayRgb, hazeRgb, 0.30 + Math.abs(slot) * 0.15);
          const uwW = fieldW * (0.18 + soft * 0.12) * seed.width;
          // These are the ambient inter-shaft glow, kept faint and crisp
          drawShaftPlane(shaftCtx, sx, sy, uwAngle, maxLen * 1.02, uwW * 0.06, uwW * 1.8, uwRgb, lightAlpha * haze * seed.intensity * 0.12, {
            startT: 0.02, endT: 0.98, nearFade: 0.10, farFade: 0.22, fallPower: 0.65, slices: 1, blur: 6 + soft * 8,
          });
        }
      }

      // Optical falloff mask — underwater uses a slower fade so shafts reach the frame bottom.
      shaftCtx.save();
      shaftCtx.globalCompositeOperation = 'destination-in';
      const mask = shaftCtx.createLinearGradient(
        sx - ax * maxLen * 0.02,
        sy - ay * maxLen * 0.02,
        sx + ax * maxLen * 0.98,
        sy + ay * maxLen * 0.98,
      );
      if (underwater) {
        mask.addColorStop(0.00, 'rgba(255,255,255,0)');
        mask.addColorStop(0.04, 'rgba(255,255,255,0.95)');
        mask.addColorStop(0.12, 'rgba(255,255,255,1)');
        mask.addColorStop(0.60, 'rgba(255,255,255,0.92)');
        mask.addColorStop(0.82, 'rgba(255,255,255,0.52)');
        mask.addColorStop(0.95, 'rgba(255,255,255,0.08)');
        mask.addColorStop(1.00, 'rgba(255,255,255,0)');
      } else {
        mask.addColorStop(0.00, 'rgba(255,255,255,0)');
        mask.addColorStop(0.06, 'rgba(255,255,255,0.92)');
        mask.addColorStop(0.22, 'rgba(255,255,255,1)');
        mask.addColorStop(0.52, 'rgba(255,255,255,0.78)');
        mask.addColorStop(0.74, 'rgba(255,255,255,0.28)');
        mask.addColorStop(0.90, 'rgba(255,255,255,0.04)');
        mask.addColorStop(1.00, 'rgba(255,255,255,0)');
      }
      shaftCtx.fillStyle = mask;
      shaftCtx.fillRect(0, 0, W, H);
      shaftCtx.restore();

      ctx.drawImage(shaftLayer.canvas, 0, 0);

      if (underwater) {
        // Post-pass blur composite: softens shaft edges without per-slice halo seams
        ctx.filter = `blur(${Math.round(8 + soft * 10)}px)`;
        ctx.globalAlpha = 0.28;
        ctx.drawImage(shaftLayer.canvas, 0, 0);
        ctx.filter = 'none';
        ctx.globalAlpha = 1;
      }

      if (underwater) {
        // Ambient water column volume — large, soft, low-alpha
        const liquidRgb = mixRgb(rayRgb, hazeRgb, 0.34);
        ellipseGlow(ctx, sx + ax * maxLen * 0.38, sy + ay * maxLen * 0.38,
          maxLen * 0.35, fieldW * 0.55, dir, liquidRgb, lightAlpha * haze * 0.18, [0.28, 0.012]);
        ellipseGlow(ctx, sx + ax * maxLen * 0.55, sy + ay * maxLen * 0.55,
          maxLen * 0.38, fieldW * 0.90, dir, hazeRgb, lightAlpha * haze * 0.10, [0.28, 0.008]);

        // Surface caustic shimmer — bright irregular patches that travel along shafts.
        // These are the characteristic water-surface refraction pattern.
        const causticRgb = mixRgb(glowRgb, rayRgb, 0.28);
        const CAUSTIC_COUNT = 20;
        for (let ci = 0; ci < CAUSTIC_COUNT; ci++) {
          const p = particleSeeds[(ci * 7 + 4) % particleSeeds.length];
          // Drift along shaft direction, looping
          const driftU = fract(p.dist * 0.82 + wavePhase * (0.08 + p.speed * 0.06));
          const side = p.side * 0.62;
          const pulse = 0.35 + 0.65 * Math.abs(Math.sin(wavePhase * (1.4 + p.type * 2.2) + p.phase));
          const cx = sx + ax * maxLen * driftU + (-ay) * side * fieldW;
          const cy = sy + ay * maxLen * driftU + ax * side * fieldW;
          const cr = fieldW * (0.028 + p.size * 0.055);
          const ca = lightAlpha * haze * pulse * Math.pow(1 - driftU, 0.45) * smoothstep(1 - Math.abs(side) / 0.68) * 0.28;
          if (ca < 0.005) continue;
          ellipseGlow(ctx, cx, cy, cr * 2.8, cr, dir + p.side * 0.22, causticRgb, ca, [0.20, 0.02]);
        }
      }

      drawAtmosphericWisps(
        ctx,
        sx,
        sy,
        dir,
        maxLen,
        fieldW,
        rayRgb,
        hazeRgb,
        lightAlpha * haze * (0.70 + noiseStr * 0.45),
        particleSeeds,
        flowTime,
        atmo,
        atmosphereMode,
      );

      // Sparse large bokeh motes for dark-atmosphere modes (the drifting orbs visible in clean/dark references)
      if (atmosphereMode === 'clean' || atmosphereMode === 'smoky' || atmosphereMode === 'foggy' || atmosphereMode === 'misty') {
        const moteCount = atmosphereMode === 'clean' ? 6 : 4;
        for (let m = 0; m < moteCount; m++) {
          const p = particleSeeds[(m * 11 + 3) % particleSeeds.length];
          const drift = fract(p.dist * 0.6 + flowTime * (0.008 + p.speed * 0.012));
          const side  = p.side * 1.10;
          const x = sx + ax * maxLen * drift + (-ay) * side * fieldW;
          const y = sy + ay * maxLen * drift + ax * side * fieldW;
          const r = Math.min(W, H) * (0.022 + p.size * 0.038);
          const fadeDist = Math.pow(1 - drift, 0.5) * smoothstep(1 - Math.abs(side) / 1.1);
          const moteRgb = mixRgb(hazeRgb, glowRgb, 0.55 + p.type * 0.35);
          const ma = lightAlpha * haze * fadeDist * (0.18 + p.size * 0.22) * 0.55;
          if (ma < 0.004) continue;
          ellipseGlow(ctx, x, y, r * 1.8, r, dir + p.side * 0.4, moteRgb, ma, [0.25, 0.02]);
        }
      }

      // Dust and particulate. It is deterministic so browsers stay in sync.
      drawAtmosphericDust(
        ctx,
        sx,
        sy,
        dir,
        maxLen,
        fieldW,
        rayRgb,
        glowRgb,
        lightAlpha * (dustAmount / 100) * atmo.dust * 0.42,
        particleSeeds,
        flowTime * 1.24,
        atmo,
        atmosphereMode,
      );

      // Micro particle layer — atmosphere-specific tiny floating specks
      drawMicroParticles(
        ctx,
        sx, sy,
        dir,
        W, H,
        maxLen,
        fieldW,
        rayRgb,
        glowRgb,
        lightAlpha * (dustAmount / 100),
        particleSeeds,
        flowTime * 0.86,
        atmo,
        atmosphereMode,
      );

      // Source glow and directional source scatter.
      const glowStr = (sourceGlow / 100) * lightAlpha;
      if (glowStr > 0.004) {
        const baseR = Math.min(W, H);
        const hotR = baseR * (0.055 + glowStr * 0.082);
        const hot = ctx.createRadialGradient(sx, sy, 0, sx, sy, hotR);
        hot.addColorStop(0, rgba(glowRgb, Math.min(0.92, glowStr * 1.55)));
        hot.addColorStop(0.22, rgba(mixRgb(glowRgb, rayRgb, 0.35), glowStr * 0.80));
        hot.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = hot;
        ctx.beginPath();
        ctx.arc(sx, sy, hotR, 0, Math.PI * 2);
        ctx.fill();

        ellipseGlow(
          ctx,
          sx + ax * baseR * 0.040,
          sy + ay * baseR * 0.040,
          baseR * (0.22 + glowStr * 0.20),
          baseR * (0.07 + glowStr * 0.10),
          dir,
          mixRgb(rayRgb, glowRgb, 0.36),
          glowStr * 0.36,
          [0.20, 0.015],
        );
        ellipseGlow(
          ctx,
          sx + ax * baseR * 0.13,
          sy + ay * baseR * 0.13,
          baseR * (0.24 + glowStr * 0.12),
          baseR * (0.038 + glowStr * 0.050),
          dir,
          mixRgb(rayRgb, glowRgb, 0.28),
          glowStr * 0.16,
          [0.16, 0.010],
        );
      }

      ctx.restore();
    },
  };
}
