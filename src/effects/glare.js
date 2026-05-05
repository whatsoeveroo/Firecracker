const TAU = Math.PI * 2;
const WHITE = { r: 255, g: 255, b: 255 };

function clamp(v, min = 0, max = 1) {
  return Math.max(min, Math.min(max, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(t) {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
}

function easeInOut(t) {
  const x = clamp(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function heroCurve(t, power = 1.45, knee = 0.62) {
  const x = clamp(t);
  const shaped = Math.pow(x, power);
  const highLift = smoothstep((x - knee) / Math.max(0.001, 1 - knee));
  return clamp(shaped + highLift * 0.45, 0, 1.45);
}

function wrap01(v) {
  return ((v % 1) + 1) % 1;
}

function lagPhase(phase, lag) {
  return wrap01(phase - lag);
}

function getValue(params, key, fallback) {
  return params[key] ?? fallback;
}

function hexToRgb(hex = '#ffffff') {
  const clean = String(hex).replace('#', '').padEnd(6, 'f').slice(0, 6);
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function rgba(c, a) {
  return `rgba(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)},${clamp(a)})`;
}

function mixRgb(a, b, t) {
  const x = clamp(t);
  return {
    r: lerp(a.r, b.r, x),
    g: lerp(a.g, b.g, x),
    b: lerp(a.b, b.b, x),
  };
}

function hashNoise(seed, index) {
  const x = Math.sin((seed + 1) * 127.1 + index * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function qualityFactor(renderOpts) {
  switch (renderOpts?.quality) {
    case 'draft': return 0.5;
    case 'preview': return 0.72;
    case 'ultra': return 1.15;
    case 'high':
    default: return 1;
  }
}

function createLayer() {
  const canvas = document.createElement('canvas');
  return { canvas, ctx: canvas.getContext('2d'), width: 0, height: 0 };
}

function createGlowPipeline() {
  const layers = {
    core: createLayer(),
    bloom: createLayer(),
    halo: createLayer(),
    starburst: createLayer(),
    detail: createLayer(),
  };

  function prepareLayer(layer, width, height, scale) {
    const pixelWidth = Math.max(1, Math.ceil(width * scale));
    const pixelHeight = Math.max(1, Math.ceil(height * scale));
    if (layer.width !== pixelWidth || layer.height !== pixelHeight) {
      layer.canvas.width = pixelWidth;
      layer.canvas.height = pixelHeight;
      layer.width = pixelWidth;
      layer.height = pixelHeight;
    }

    const ctx = layer.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, pixelWidth, pixelHeight);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'lighter';
    ctx.filter = 'none';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }

  return {
    layers,
    prepare(width, height, scale) {
      Object.values(layers).forEach(layer => prepareLayer(layer, width, height, scale));
    },
  };
}

function addStops(gradient, stops) {
  stops.forEach(([stop, color]) => gradient.addColorStop(stop, color));
}

function drawRadial(ctx, x, y, radius, stops) {
  if (radius <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  addStops(g, stops);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fill();
}

function drawEllipseRadial(ctx, x, y, radiusX, radiusY, stops, rotation = 0) {
  if (radiusX <= 0 || radiusY <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(radiusX / radiusY, 1);
  drawRadial(ctx, 0, 0, radiusY, stops);
  ctx.restore();
}

function drawCoatingArcHaze(ctx, x, y, radiusX, radiusY, color, alpha, opts = {}) {
  if (alpha <= 0) return;
  const seed = opts.seed ?? 1;
  const count = opts.count ?? 7;
  const rotation = opts.rotation ?? 0;
  const breakup = opts.breakup ?? 0.45;
  const softness = opts.softness ?? 0.7;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < count; i++) {
    const n = hashNoise(seed, i + 210);
    if (n < breakup * 0.2) continue;
    const a = rotation + hashNoise(seed, i + 240) * TAU;
    const span = lerp(0.08, 0.22, hashNoise(seed, i + 270));
    const px = x + Math.cos(a) * radiusX * lerp(0.76, 1.04, n);
    const py = y + Math.sin(a) * radiusY * lerp(0.76, 1.04, hashNoise(seed, i + 300));
    const tangent = a + Math.PI / 2 + (hashNoise(seed, i + 330) - 0.5) * 0.38;
    const arcLength = Math.max(radiusX, radiusY) * span;
    const arcWidth = Math.max(2, Math.min(radiusX, radiusY) * lerp(0.018, 0.07, softness) * lerp(0.6, 1.5, n));
    drawEllipseRadial(ctx, px, py, arcLength, arcWidth, [
      [0, rgba(mixRgb(color, WHITE, 0.12), alpha * lerp(0.08, 0.22, n))],
      [0.42, rgba(color, alpha * lerp(0.04, 0.12, n))],
      [1, 'rgba(0,0,0,0)'],
    ], tangent);
  }
  ctx.restore();
}

function colorModePalette(mode) {
  const palettes = {
    naturalWarm: {
      source: '#ffe6aa', coating: '#8fd8ff', warmth: 0.62, saturation: 0.42, spread: 0.2,
      core: '#fff9e8', mid: '#ffc675', outer: '#7fc8ff', halo: '#9fe5ff', spike: '#fff1bf',
    },
    neutralWhite: {
      source: '#f8fbff', coating: '#b7d4ff', warmth: 0.5, saturation: 0.2, spread: 0.12,
      core: '#ffffff', mid: '#eaf2ff', outer: '#b6d6ff', halo: '#d7e7ff', spike: '#ffffff',
    },
    golden: {
      source: '#ffd27a', coating: '#9fdcff', warmth: 0.78, saturation: 0.58, spread: 0.28,
      core: '#fff7d7', mid: '#ffb34f', outer: '#ffdf7d', halo: '#78d9ff', spike: '#ffe08d',
    },
    sunset: {
      source: '#ffad72', coating: '#b6e58c', warmth: 0.88, saturation: 0.68, spread: 0.38,
      core: '#fff1c4', mid: '#ff7f4f', outer: '#d66dff', halo: '#71e0bc', spike: '#ffd37b',
    },
    coolBlue: {
      source: '#aeeaff', coating: '#5aa8ff', warmth: 0.22, saturation: 0.54, spread: 0.42,
      core: '#f1fdff', mid: '#8ee7ff', outer: '#597dff', halo: '#5de4ff', spike: '#baf4ff',
    },
    electric: {
      source: '#74f7ff', coating: '#8f72ff', warmth: 0.16, saturation: 0.78, spread: 0.64,
      core: '#f7ffff', mid: '#52f1ff', outer: '#4966ff', halo: '#c765ff', spike: '#aafcff',
    },
    multicolorFringe: {
      source: '#ffe6ba', coating: '#79d8ff', warmth: 0.56, saturation: 0.82, spread: 0.9,
      core: '#fffdf4', mid: '#ffc66c', outer: '#65b8ff', halo: '#ff7bd9', spike: '#d8fff0',
    },
    vintageAmber: {
      source: '#ffbe72', coating: '#ffd08c', warmth: 0.9, saturation: 0.58, spread: 0.34,
      core: '#fff1c2', mid: '#f28b3f', outer: '#d95f38', halo: '#ffc46f', spike: '#ffd891',
    },
    sciFiCyan: {
      source: '#9ff8ff', coating: '#58a8ff', warmth: 0.14, saturation: 0.74, spread: 0.62,
      core: '#f6ffff', mid: '#56ecff', outer: '#3f73ff', halo: '#65fff0', spike: '#adf8ff',
    },
  };
  return palettes[mode] || palettes.naturalWarm;
}

function lensStyleProfile(style) {
  const profiles = {
    breathingGlow: { intensity: 1, size: 1, softness: 1.04, burst: 1, halo: 1, bloom: 1 },
    hotCore: { intensity: 1.16, size: 0.88, softness: 0.82, burst: 1.35, halo: 0.78, bloom: 0.92 },
    softBloom: { intensity: 0.88, size: 1.14, softness: 1.22, burst: 0.36, halo: 1.32, bloom: 1.28 },
    apertureStar: { intensity: 1.06, size: 0.94, softness: 0.9, burst: 1.5, halo: 1.12, bloom: 0.92 },
    anamorphicCross: { intensity: 1.06, size: 0.92, softness: 0.92, burst: 1.42, halo: 0.9, bloom: 0.9 },
    solarHalo: { intensity: 0.98, size: 1.18, softness: 1.14, burst: 0.82, halo: 1.5, bloom: 1.24 },
    electricCore: { intensity: 1.14, size: 0.86, softness: 0.9, burst: 1.28, halo: 1.08, bloom: 0.94 },
    vintageBulb: { intensity: 0.92, size: 1.08, softness: 1.16, burst: 0.58, halo: 1.22, bloom: 1.1 },
    needleStar: { intensity: 1.1, size: 0.78, softness: 0.74, burst: 1.75, halo: 0.7, bloom: 0.78 },
    photographicBloom: { intensity: 1, size: 0.98, softness: 1, burst: 0.95, halo: 0.94, bloom: 0.96 },
  };
  return profiles[style] || profiles.breathingGlow;
}

function styledParams(params) {
  const profile = lensStyleProfile(getValue(params, 'lensStyle', 'breathingGlow'));
  const burstShape = getValue(params, 'burstShape', 'softStar');
  const burstAmount = getValue(params, 'burstAmount', 24);
  const burstIntensity = getValue(params, 'burstIntensity', 58) / 100;
  const burstSize = getValue(params, 'burstSize', 48) / 100;
  const burstDensity = getValue(params, 'burstDensity', 48) / 100;
  const amountCurve = heroCurve(burstAmount / 100, 1.18, 0.58);
  const intensityCurve = heroCurve(burstIntensity, 1.44, 0.68);
  const sizeCurve = heroCurve(burstSize, 1.28, 0.64);
  const densityCurve = heroCurve(burstDensity, 1.18, 0.62);
  const sourceShape = getValue(params, 'sourceShape', 'round');
  const direction = getValue(params, 'glareDirection', 'radial');
  const angleStrength = getValue(params, 'angleStrength', 28) / 100;
  const sourceProfile = sourceShapeProfile(sourceShape);
  const directionalBoost = direction === 'radial' ? 0 : angleStrength * 0.28;
  const colorSpread = getValue(params, 'colorSpread', 20);
  const fringeAmount = getValue(params, 'fringeAmount', 16);
  const existingStarburst = getValue(params, 'starburstAmount', 16);
  const derivedStarburst = burstShape === 'none' || burstAmount <= 0.01
    ? 0
    : Math.max(existingStarburst, burstAmount * lerp(0.24, 1.04 + directionalBoost, intensityCurve) * lerp(0.72, 1.18, amountCurve));
  const derivedSharpness = lerp(getValue(params, 'burstSharpness', 42), lerp(22, 86, intensityCurve) * sourceProfile.sharpness, 0.5);
  const derivedSoftness = lerp(getValue(params, 'burstSoftness', 58), lerp(90, 28, intensityCurve) * sourceProfile.softness, 0.42);
  const derivedComplexity = lerp(getValue(params, 'patternComplexity', 46), lerp(22, 98, densityCurve), 0.66);
  const burstPresence = lerp(0.72, 1.72, amountCurve) * lerp(0.82, 1.28 + directionalBoost, intensityCurve) * sourceProfile.burst;
  const burstReach = lerp(0.82, 1.66 + directionalBoost, sizeCurve) * sourceProfile.reach;
  return {
    ...params,
    intensity: clamp(getValue(params, 'intensity', 74) * profile.intensity, 0, 120),
    size: clamp(getValue(params, 'size', 56) * profile.size, 0, 120),
    softness: clamp(getValue(params, 'softness', 80) * profile.softness, 0, 120),
    burstAmount: clamp(burstAmount * profile.burst * burstPresence, 0, 260),
    burstHeroPower: clamp(lerp(0.82, 1.52, intensityCurve) * lerp(0.86, 1.22, amountCurve), 0.65, 2.05),
    burstReachPower: clamp(burstReach, 0.72, 2.05),
    burstSharpness: clamp(derivedSharpness, 0, 100),
    burstSoftness: clamp(derivedSoftness, 0, 100),
    starburstAmount: clamp(derivedStarburst * profile.burst * sourceProfile.star, 0, 165),
    starburstShape: burstShapeToStarburstShape(burstShape),
    patternComplexity: clamp(derivedComplexity, 0, 100),
    spikeLength: clamp(getValue(params, 'spikeLength', 58) * burstReach, 0, 190),
    spikeSharpness: clamp(lerp(getValue(params, 'spikeSharpness', 52), lerp(28, 90, intensityCurve) * sourceProfile.sharpness, 0.48), 0, 100),
    spikeGlow: clamp(lerp(getValue(params, 'spikeGlow', 58), lerp(42, 96, intensityCurve), 0.54), 0, 112),
    secondarySpikeAmount: clamp(lerp(getValue(params, 'secondarySpikeAmount', 22), lerp(8, 92, densityCurve), 0.66), 0, 120),
    microGlintAmount: clamp(lerp(getValue(params, 'microGlintAmount', 24), lerp(6, 84, densityCurve), 0.58), 0, 115),
    glintAmount: clamp(lerp(getValue(params, 'glintAmount', 26), lerp(8, 88, densityCurve), 0.56), 0, 120),
    burstAsymmetry: clamp(lerp(getValue(params, 'burstAsymmetry', 36), lerp(18, 68, densityCurve), 0.44), 0, 100),
    burstBreakup: clamp(lerp(getValue(params, 'burstBreakup', 42), lerp(22, 74, densityCurve), 0.46), 0, 100),
    burstLayerRichness: clamp(lerp(getValue(params, 'burstLayerRichness', 48), lerp(26, 112, densityCurve), 0.62), 0, 125),
    burstCoreCoupling: clamp(lerp(getValue(params, 'burstCoreCoupling', 72), lerp(58, 96, intensityCurve), 0.44), 0, 110),
    burstBloomCoupling: clamp(lerp(getValue(params, 'burstBloomCoupling', 46), lerp(38, 88, amountCurve), 0.5), 0, 105),
    sourceSize: clamp(getValue(params, 'sourceSize', 42) * sourceProfile.coreSize, 0, 130),
    coreClip: clamp(getValue(params, 'coreClip', 78) * sourceProfile.coreClip, 0, 110),
    spectralSplit: clamp(Math.max(getValue(params, 'spectralSplit', 18), colorSpread * 0.92), 0, 100),
    chromaticAberration: clamp(Math.max(getValue(params, 'chromaticAberration', 18), fringeAmount * 0.9), 0, 100),
    haloFringing: clamp(Math.max(getValue(params, 'haloFringing', 24), colorSpread * 0.82), 0, 100),
    burstFringeAmount: clamp(Math.max(getValue(params, 'burstFringeAmount', 18), fringeAmount * 0.96), 0, 100),
    haloAmount: clamp(getValue(params, 'haloAmount', 42) * profile.halo, 0, 120),
    bloomExpansion: clamp(getValue(params, 'bloomExpansion', 44) * profile.bloom, 0, 120),
  };
}

function burstShapeToStarburstShape(shape) {
  const map = {
    none: 'none',
    softStar: 'softDiffraction',
    fourPoint: 'fourPoint',
    crossStar: 'crossFilter',
    sixPoint: 'sixPoint',
    eightPoint: 'eightPoint',
    diffractionBloom: 'softDiffraction',
    flowerBurst: 'softDiffraction',
    needleStar: 'needleStar',
    anamorphicCross: 'anamorphicCross',
  };
  return map[shape] || 'softDiffraction';
}

function sourceShapeProfile(shape) {
  const profiles = {
    none: { coreSize: 0, coreClip: 0.72, burst: 0.18, star: 0.12, reach: 0.78, sharpness: 0.62, softness: 1.34 },
    round: { coreSize: 1, coreClip: 1, burst: 0.92, star: 0.9, reach: 0.95, sharpness: 0.92, softness: 1.1 },
    star: { coreSize: 0.78, coreClip: 1.2, burst: 1.56, star: 1.62, reach: 1.38, sharpness: 1.28, softness: 0.78 },
    needle: { coreSize: 0.58, coreClip: 1.26, burst: 1.48, star: 1.5, reach: 1.58, sharpness: 1.42, softness: 0.66 },
    cross: { coreSize: 0.74, coreClip: 1.18, burst: 1.34, star: 1.42, reach: 1.38, sharpness: 1.2, softness: 0.76 },
    diffraction: { coreSize: 0.92, coreClip: 1.08, burst: 1.24, star: 1.32, reach: 1.12, sharpness: 0.98, softness: 1.14 },
    donut: { coreSize: 1.2, coreClip: 0.78, burst: 0.66, star: 0.62, reach: 0.94, sharpness: 0.72, softness: 1.28 },
    softBlob: { coreSize: 1.34, coreClip: 0.82, burst: 0.48, star: 0.42, reach: 0.78, sharpness: 0.62, softness: 1.36 },
    anamorphicPoint: { coreSize: 0.68, coreClip: 1.2, burst: 1.36, star: 1.46, reach: 1.72, sharpness: 1.18, softness: 0.84 },
  };
  return profiles[shape] || profiles.round;
}

function drawSoftStreak(ctx, x, y, angle, length, width, color, alpha, opts = {}) {
  if (alpha <= 0 || length <= 0 || width <= 0) return;
  const start = opts.start ?? 0;
  const end = opts.end ?? 1;
  const seed = opts.seed ?? 1;
  const complexity = opts.complexity ?? 0.4;
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const px = -uy;
  const py = ux;
  const centerT = (start + end) * 0.5;
  const span = Math.abs(end - start);
  const cx = x + ux * length * centerT;
  const cy = y + uy * length * centerT;
  const hazeLength = length * span * lerp(0.28, 0.48, complexity);
  const hazeWidth = width * lerp(3.8, 8.5, complexity);

  drawEllipseRadial(ctx, cx, cy, hazeLength, hazeWidth, [
    [0, rgba(color, alpha * 0.16)],
    [0.28, rgba(color, alpha * 0.08)],
    [0.74, rgba(color, alpha * 0.018)],
    [1, 'rgba(0,0,0,0)'],
  ], angle);

  const samples = Math.max(5, Math.round(lerp(7, 16, complexity)));
  for (let i = 0; i < samples; i++) {
    const t = lerp(start, end, (i + 0.5) / samples);
    const falloff = Math.pow(1 - Math.abs((i + 0.5) / samples - 0.42) * 1.55, 2);
    const n = hashNoise(seed, i + 10);
    if (n < complexity * 0.12) continue;
    const jitter = (hashNoise(seed, i + 40) - 0.5) * width * complexity * 1.8;
    const sx = x + ux * length * t + px * jitter;
    const sy = y + uy * length * t + py * jitter;
    const localW = width * lerp(0.55, 1.65, n) * lerp(1.25, 0.5, t);
    const localL = length * span / samples * lerp(1.8, 4.8, hashNoise(seed, i + 70));
    drawEllipseRadial(ctx, sx, sy, localL, Math.max(0.5, localW), [
      [0, rgba(mixRgb(color, WHITE, 0.18), alpha * clamp(falloff) * lerp(0.16, 0.42, n))],
      [0.45, rgba(color, alpha * clamp(falloff) * 0.11)],
      [1, 'rgba(0,0,0,0)'],
    ], angle);
  }
}

function drawBurstBlob(ctx, x, y, angle, distance, radiusX, radiusY, color, alpha, opts = {}) {
  const seed = opts.seed ?? 1;
  const wobble = opts.wobble ?? 0.18;
  const px = x + Math.cos(angle) * distance + (hashNoise(seed, 3) - 0.5) * radiusY * wobble;
  const py = y + Math.sin(angle) * distance + (hashNoise(seed, 7) - 0.5) * radiusY * wobble;
  drawEllipseRadial(ctx, px, py, radiusX, radiusY, [
    [0, rgba(mixRgb(color, WHITE, 0.2), alpha)],
    [0.36, rgba(color, alpha * 0.36)],
    [0.78, rgba(color, alpha * 0.07)],
    [1, 'rgba(0,0,0,0)'],
  ], angle);
}

function withFilter(ctx, filter, draw) {
  const prev = ctx.filter;
  ctx.filter = filter;
  draw();
  ctx.filter = prev;
}

function breathingCurve(rawPhase, mode, params) {
  if (mode === 'static') return 0.58;
  if (mode === 'slowPulse') return 0.5 + 0.5 * Math.sin((rawPhase - 0.18) * TAU);
  if (mode === 'heartbeat') {
    const p1 = Math.exp(-Math.pow((rawPhase - 0.18) / 0.055, 2));
    const p2 = Math.exp(-Math.pow((rawPhase - 0.32) / 0.085, 2)) * 0.55;
    return clamp(p1 + p2);
  }
  if (mode === 'flickeringBulb') {
    const seed = getValue(params, 'imperfectionSeed', 311);
    const base = 0.5 + 0.5 * Math.sin(rawPhase * TAU);
    const flutter = hashNoise(seed, Math.floor(rawPhase * 64)) * 0.28 + Math.sin(rawPhase * TAU * 9.5) * 0.12;
    return clamp(base * 0.68 + flutter);
  }

  const attack = getValue(params, 'attack', 40) / 100;
  const peakHold = getValue(params, 'peakHold', 12) / 100;
  const decay = getValue(params, 'decay', 48) / 100;
  const attackEnd = clamp(attack, 0.12, 0.7);
  const holdEnd = clamp(attackEnd + peakHold * 0.22, attackEnd, 0.82);
  const decayEnd = clamp(holdEnd + decay * 0.62, holdEnd + 0.08, 1);

  if (rawPhase < attackEnd) return easeInOut(rawPhase / attackEnd);
  if (rawPhase < holdEnd) return 1;
  if (rawPhase < decayEnd) return 1 - smoothstep((rawPhase - holdEnd) / (decayEnd - holdEnd));
  return smoothstep((rawPhase - decayEnd) / Math.max(0.001, 1 - decayEnd)) * 0.08;
}

function computeBreathingEnvelope(params, phase) {
  const mode = getValue(params, 'breathingMode', 'breathingGlow');
  const phaseOffset = getValue(params, 'phaseOffset', 0) / 100;
  const rawPhase = wrap01(phase + phaseOffset);
  const strength = getValue(params, 'pulseStrength', 68) / 100;
  const peak = getValue(params, 'peakBrightness', 82) / 100;
  const curve = lerp(0.72, 1.8, getValue(params, 'brightnessCurve', 58) / 100);
  const micro = getValue(params, 'microFlicker', 8) / 100;
  const seed = getValue(params, 'imperfectionSeed', 311);

  let brightness = breathingCurve(rawPhase, mode, params);
  brightness = Math.pow(clamp(brightness), curve);
  const flicker = (hashNoise(seed, Math.floor((phase + 1) * 120)) - 0.5) * micro * 0.08;
  brightness = clamp(brightness + flicker);

  const bloomLag = getValue(params, 'bloomLag', 18) / 100 * 0.18;
  const haloLag = getValue(params, 'haloLag', 28) / 100 * 0.22;
  const starLag = getValue(params, 'starburstLag', 10) / 100 * 0.16;
  const bloom = Math.pow(clamp(breathingCurve(lagPhase(rawPhase, bloomLag), mode, params)), 0.72);
  const halo = Math.pow(clamp(breathingCurve(lagPhase(rawPhase, haloLag), mode, params)), 0.82);
  const star = Math.pow(clamp(breathingCurve(lagPhase(rawPhase, starLag), mode, params)), 1.45);

  return {
    phase: rawPhase,
    brightness: lerp(
      lerp(0.92, 0.74, strength),
      1 + strength * lerp(0.14, 0.58, peak),
      brightness,
    ),
    hot: brightness,
    bloom: lerp(0.86, 1 + strength * 0.68, bloom),
    halo: lerp(0.82, 1 + strength * 0.52, halo),
    star: lerp(0.12, 0.28 + strength * 0.98, star),
    relax: 1 - brightness,
    detail: clamp(brightness * 0.65 + halo * 0.35),
  };
}

function computeSafeRenderScale(canvas, params, size, softness, env) {
  const mode = getValue(params, 'frameFitMode', 'safe');
  const globalScale = getValue(params, 'globalScale', getValue(params, 'effectScale', 76)) / 100;
  if (mode === 'fill') return clamp(globalScale, 0.25, 1.4);

  const safeMargin = getValue(params, 'safeMargin', mode === 'overscan' ? 24 : 18) / 100;
  const overscan = getValue(params, 'overscanAmount', 10) / 100;
  const minDim = Math.min(canvas.width, canvas.height);
  const centerLimit = minDim * 0.5 * lerp(0.96, 0.58, safeMargin);
  const expectedRadius = minDim * lerp(0.11, 0.52, smoothstep(size)) * lerp(0.86, 1.15, softness)
    * lerp(1.4, 3.8, softness) * lerp(0.75, 1.55, env.bloom * getValue(params, 'bloomExpansion', 62) / 100);
  const safeScale = expectedRadius > 0 ? clamp(centerLimit / expectedRadius, 0.38, 1) : 1;
  const modeBias = mode === 'fit' ? 1.08 : mode === 'overscan' ? lerp(0.86, 1.02, overscan) : 0.98;
  return clamp(globalScale * lerp(1, safeScale, mode === 'fill' ? 0 : 0.9) * modeBias, 0.25, 1.2);
}

function buildColorSystem(params, env) {
  const palette = colorModePalette(getValue(params, 'colorMode', 'naturalWarm'));
  const source = mixRgb(hexToRgb(getValue(params, 'sourceColor', palette.source)), hexToRgb(palette.source), 0.5);
  const coreTint = mixRgb(hexToRgb(getValue(params, 'coreTint', palette.core)), hexToRgb(palette.core), 0.55);
  const midTint = mixRgb(hexToRgb(getValue(params, 'midGlowTint', palette.mid)), hexToRgb(palette.mid), 0.58);
  const outerTint = mixRgb(hexToRgb(getValue(params, 'outerBloomTint', palette.outer)), hexToRgb(palette.outer), 0.62);
  const haloTint = mixRgb(hexToRgb(getValue(params, 'haloEdgeTint', palette.halo)), hexToRgb(palette.halo), 0.48);
  const spikeTint = mixRgb(hexToRgb(getValue(params, 'spikeTint', palette.spike)), hexToRgb(palette.spike), 0.42);
  const warmth = clamp(getValue(params, 'warmth', palette.warmth * 100) / 100 * 0.72 + palette.warmth * 0.28);
  const saturation = clamp(getValue(params, 'saturation', palette.saturation * 100) / 100 * 0.78 + palette.saturation * 0.36);
  const spread = clamp(getValue(params, 'colorSpread', palette.spread * 100) / 100 * 1.05 + palette.spread * 0.42);
  const fringe = getValue(params, 'fringeAmount', getValue(params, 'spectralSplit', 18)) / 100;
  const bloomBias = getValue(params, 'bloomTintBias', 46) / 100;
  const warmCool = getValue(params, 'warmCoolBalance', warmth * 100) / 100;
  const coating = hexToRgb(getValue(params, 'coatingColor', palette.coating));
  const coatingTint = getValue(params, 'coatingTint', 50) / 100;
  const hueOffset = getValue(params, 'fringeHueOffset', 50) / 100;
  const tintMix = getValue(params, 'tintMix', 48) / 100;
  const coatingShift = getValue(params, 'opticalCoatingShift', 50) / 100;
  const warm = { r: 255, g: 196, b: 112 };
  const cool = { r: 118, g: 184, b: 255 };
  const amber = { r: 255, g: 143, b: 72 };
  const cyan = { r: 100, g: 225, b: 255 };
  const magenta = { r: 255, g: 116, b: 228 };
  const green = { r: 135, g: 255, b: 196 };
  const temp = warmCool >= 0.5
    ? mixRgb(source, warm, (warmCool - 0.5) * 0.72)
    : mixRgb(source, cool, (0.5 - warmCool) * 0.72);
  const saturatedMid = mixRgb(temp, midTint, saturation * 0.55);
  const bloom = mixRgb(saturatedMid, env.hot > 0.82 ? WHITE : (warmth > 0.5 ? warm : cool), bloomBias * 0.18);
  const coatingBase = mixRgb(mixRgb(amber, cyan, coatingTint), coating, 0.34 + spread * 0.28);
  const coatingMix = mixRgb(coatingBase, hueOffset > 0.5 ? magenta : green, Math.abs(hueOffset - 0.5) * 0.38 * spread);
  const haloBase = mixRgb(mixRgb(bloom, haloTint, saturation * 0.45), coatingMix, 0.16 + spread * 0.38);
  const spikeBase = mixRgb(mixRgb(bloom, spikeTint, saturation * 0.58), WHITE, 0.08 + env.hot * 0.14);
  const outer = mixRgb(mixRgb(bloom, outerTint, saturation * 0.56), warmth > 0.5 ? amber : cyan, 0.12 + spread * 0.26);

  return {
    core: mixRgb(mixRgb(temp, coreTint, tintMix * 0.28), WHITE, 0.36 + env.hot * 0.48),
    bloom,
    outer,
    halo: haloBase,
    spike: spikeBase,
    streak: mixRgb(spikeBase, coatingMix, 0.18 + spread * 0.22),
    warm,
    cool,
    amber: mixRgb(amber, midTint, saturation * 0.22),
    cyan: mixRgb(cyan, outerTint, saturation * 0.24),
    magenta: mixRgb(magenta, haloTint, saturation * 0.18),
    green: mixRgb(green, coatingMix, saturation * 0.18),
    coating: coatingMix,
    fringeA: mixRgb(amber, magenta, hueOffset * 0.55),
    fringeB: mixRgb(cyan, green, (1 - hueOffset) * 0.5),
    spread: clamp(spread + fringe * 0.3),
    coatingShift,
  };
}

function drawHotCore(ctx, x, y, baseRadius, colors, env, params) {
  const intensity = getValue(params, 'intensity', 78) / 100;
  const coreClip = getValue(params, 'coreClip', 86) / 100;
  const falloff = getValue(params, 'coreFalloff', 54) / 100;
  const tightness = getValue(params, 'coreTightness', 64) / 100;
  const sourceSize = getValue(params, 'sourceSize', getValue(params, 'size', 56)) / 100;
  const sourceShape = getValue(params, 'sourceShape', 'round');
  const hotContract = lerp(1.34, 0.58, env.hot * tightness);
  const coreRadius = baseRadius * lerp(0.08, 0.28, sourceSize) * hotContract;
  const power = intensity * env.brightness;

  if (sourceShape === 'none' || sourceSize <= 0.001) {
    drawRadial(ctx, x, y, baseRadius * lerp(0.24, 0.56, getValue(params, 'softness', 78) / 100), [
      [0, rgba(colors.core, power * 0.18)],
      [0.42, rgba(colors.bloom, power * 0.12)],
      [1, 'rgba(0,0,0,0)'],
    ]);
    return;
  }

  if (sourceShape === 'softBlob') {
    drawEllipseRadial(ctx, x + coreRadius * 0.08, y - coreRadius * 0.04, coreRadius * 4.4, coreRadius * 3.2, [
      [0, rgba(WHITE, power * 0.38)],
      [0.24, rgba(colors.core, power * 0.54)],
      [0.68, rgba(colors.bloom, power * 0.24 * falloff)],
      [1, 'rgba(0,0,0,0)'],
    ], -0.18);
    return;
  }

  if (sourceShape === 'donut') {
    drawRadial(ctx, x, y, coreRadius * 4.2, [
      [0, 'rgba(0,0,0,0)'],
      [0.18, rgba(colors.cool, power * 0.03)],
      [0.36, rgba(WHITE, power * 0.62)],
      [0.52, rgba(colors.core, power * 0.44)],
      [0.82, rgba(colors.bloom, power * 0.18 * falloff)],
      [1, 'rgba(0,0,0,0)'],
    ]);
    drawRadial(ctx, x, y, coreRadius * 1.3, [
      [0, 'rgba(0,0,0,0)'],
      [0.65, rgba(colors.cool, power * 0.035)],
      [1, 'rgba(0,0,0,0)'],
    ]);
    return;
  }

  drawRadial(ctx, x, y, coreRadius * lerp(5.5, 2.6, coreClip), [
    [0, `rgba(255,255,255,${clamp(power * 0.95)})`],
    [0.08, `rgba(255,255,255,${clamp(power * coreClip)})`],
    [0.25, rgba(colors.core, power * 0.72)],
    [0.62, rgba(colors.bloom, power * 0.24 * falloff)],
    [1, 'rgba(0,0,0,0)'],
  ]);

  drawRadial(ctx, x, y, coreRadius * 0.95, [
    [0, 'rgba(255,255,255,1)'],
    [0.62, `rgba(255,255,255,${clamp(0.72 + env.hot * 0.28)})`],
    [1, 'rgba(255,255,255,0)'],
  ]);

  if (sourceShape === 'anamorphicPoint') {
    drawSoftStreak(ctx, x, y, 0, coreRadius * 8.5, coreRadius * 0.16, colors.streak, power * 0.16, {
      start: -0.42,
      end: 0.42,
      seed: getValue(params, 'imperfectionSeed', 311) + 120,
      complexity: 0.28,
    });
  }

  const shapeSpikes = {
    star: { count: 16, length: 7.2, alpha: 0.24, haze: 0.16, color: colors.amber },
    needle: { count: 10, length: 7.8, alpha: 0.2, haze: 0.1, color: colors.spike },
    cross: { count: 4, length: 7.0, alpha: 0.2, haze: 0.12, color: colors.streak },
    diffraction: { count: 22, length: 4.2, alpha: 0.095, haze: 0.12, color: colors.halo },
  }[sourceShape];
  if (shapeSpikes) {
    const seed = getValue(params, 'imperfectionSeed', 311);
    const softness = getValue(params, 'burstSoftness', 58) / 100;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    withFilter(ctx, `blur(${lerp(0.8, 5.2, softness) * (sourceShape === 'needle' ? 0.58 : 1)}px)`, () => {
      for (let i = 0; i < shapeSpikes.count; i++) {
        const a = (i / shapeSpikes.count) * TAU + (hashNoise(seed, i + 1280) - 0.5) * 0.035;
        const localLength = coreRadius * shapeSpikes.length * lerp(0.48, 1.28, hashNoise(seed, i + 1290));
        const rayColor = i % 3 === 0 ? shapeSpikes.color : colors.streak;
        drawSoftStreak(ctx, x, y, a, localLength, coreRadius * lerp(0.045, 0.13, softness), rayColor, power * shapeSpikes.alpha, {
          start: 0,
          end: 0.92,
          seed: seed + i * 37,
          complexity: sourceShape === 'diffraction' ? 0.56 : 0.32,
        });
        drawSoftStreak(ctx, x, y, a, localLength * 0.72, coreRadius * lerp(0.18, 0.44, softness), colors.warm, power * shapeSpikes.haze, {
          start: 0,
          end: 0.72,
          seed: seed + i * 43,
          complexity: 0.44,
        });
      }
    });
    drawRadial(ctx, x, y, coreRadius * lerp(2.1, 3.4, softness), [
      [0, rgba(WHITE, power * 0.72)],
      [0.18, rgba(colors.amber, power * 0.34)],
      [0.52, rgba(colors.streak, power * 0.12)],
      [1, 'rgba(0,0,0,0)'],
    ]);
    ctx.restore();
  }
}

function drawBurstCore(ctx, x, y, baseRadius, colors, env, params) {
  const amount = getValue(params, 'burstAmount', getValue(params, 'starburstAmount', 16)) / 100;
  if (amount <= 0.01) return;

  const shape = getValue(params, 'burstShape', 'softStar');
  const cfg = burstShapeConfig(shape);
  if (cfg.count <= 0) return;
  const density = getValue(params, 'burstDensity', 48) / 100;
  const count = Math.max(4, Math.round(lerp(cfg.count * 0.6, cfg.count * 1.55, density)));
  const seed = getValue(params, 'imperfectionSeed', 311);
  const rotation = getValue(params, 'burstRotation', getValue(params, 'spikeRotation', 0)) * Math.PI / 180;
  const burstSize = getValue(params, 'burstSize', 52) / 100;
  const softness = getValue(params, 'burstSoftness', 58) / 100;
  const sharpness = getValue(params, 'burstSharpness', getValue(params, 'spikeSharpness', 42)) / 100;
  const asymmetry = getValue(params, 'burstAsymmetry', 36) / 100;
  const breakup = getValue(params, 'burstBreakup', 42) / 100;
  const richness = getValue(params, 'burstLayerRichness', 48) / 100;
  const secondary = getValue(params, 'secondarySpikeAmount', getValue(params, 'secondarySpikes', 18)) / 100;
  const glints = getValue(params, 'microGlintAmount', getValue(params, 'glintAmount', 26)) / 100;
  const coreCoupling = getValue(params, 'burstCoreCoupling', 72) / 100;
  const bloomCoupling = getValue(params, 'burstBloomCoupling', 46) / 100;
  const fringe = getValue(params, 'burstFringeAmount', getValue(params, 'fringeAmount', 16)) / 100;
  const heroPower = getValue(params, 'burstHeroPower', 1);
  const reachPower = getValue(params, 'burstReachPower', 1);
  const corePower = amount * env.star * getValue(params, 'intensity', 78) / 100 * heroPower;
  const burstRadius = baseRadius * lerp(0.14, 1.02, Math.pow(burstSize, 0.86)) * cfg.length * reachPower * lerp(0.78, 1.28, env.hot * coreCoupling);
  const colorA = mixRgb(colors.spike, WHITE, 0.22);
  const colorB = mixRgb(colors.halo, colors.fringeB, clamp(colors.spread * 0.35 + fringe * 0.25));

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  withFilter(ctx, `blur(${lerp(7, 1.4, sharpness) * lerp(1.2, 0.72, env.hot)}px)`, () => {
    for (let i = 0; i < count; i++) {
      const base = rotation + (i / count) * TAU;
      const asym = (hashNoise(seed, i + 1700) - 0.5) * 0.28 * asymmetry;
      const a = base + asym;
      const reach = burstRadius * lerp(0.48, 1.42, hashNoise(seed, i + 1730)) * lerp(0.94, 1.2, heroPower - 1);
      const width = baseRadius * lerp(0.012, 0.082, hashNoise(seed, i + 1760)) * lerp(1.65, 0.66, env.hot * sharpness) * lerp(0.78, 1.55, softness);
      const c = i % 3 === 0 ? colorB : colorA;
      if (hashNoise(seed, i + 1810) > breakup * 0.2) {
        drawBurstBlob(ctx, x, y, a, reach * 0.35, reach * lerp(0.22, 0.46, softness), width * lerp(2.1, 3.8, softness), c, corePower * lerp(0.24, 0.58, sharpness), {
          seed: seed + i * 19,
          wobble: 0.24 + asymmetry * 0.26,
        });
      }
      drawBurstBlob(ctx, x, y, a, reach * lerp(0.58, 0.9, richness), reach * lerp(0.12, 0.3, softness), width * lerp(0.9, 1.8, softness), c, corePower * lerp(0.1, 0.3, richness), {
        seed: seed + i * 23,
        wobble: 0.34 + asymmetry * 0.36,
      });
    }

    const petalCount = Math.max(0, Math.round(count * cfg.petals * lerp(0.6, 1.8, richness)));
    for (let i = 0; i < petalCount; i++) {
      const a = rotation + (i / Math.max(1, petalCount)) * TAU + (hashNoise(seed, i + 1900) - 0.5) * 0.24;
      const reach = burstRadius * lerp(0.25, 0.7, hashNoise(seed, i + 1930));
      drawBurstBlob(ctx, x, y, a, reach, reach * 0.3, baseRadius * lerp(0.035, 0.11, softness), colors.halo, corePower * richness * 0.12, {
        seed: seed + i * 29,
        wobble: 0.55,
      });
    }
  });

  if (cfg.cross > 0) {
    const crossLength = burstRadius * lerp(1.8, 4.25, Math.pow(burstSize, 0.78)) * cfg.cross;
    const crossWidth = baseRadius * lerp(0.015, 0.06, softness);
    withFilter(ctx, `blur(${lerp(8, 2.4, sharpness)}px)`, () => {
      drawSoftStreak(ctx, x, y, rotation, crossLength, crossWidth * 2.8, colors.spike, corePower * 0.16, {
        start: -0.34,
        end: 0.34,
        seed: seed + 3700,
        complexity: 0.42 + density * 0.25,
      });
      drawSoftStreak(ctx, x, y, rotation + Math.PI / 2, crossLength * lerp(0.35, 0.8, cfg.cross), crossWidth * 1.8, colors.halo, corePower * 0.09, {
        start: -0.3,
        end: 0.3,
        seed: seed + 3800,
        complexity: 0.36 + density * 0.2,
      });
    });
  }

  if (secondary > 0.01) {
    const microCount = Math.round(lerp(4, 24, secondary) * lerp(0.65, 1.4, density));
    for (let i = 0; i < microCount; i++) {
      const a = rotation + hashNoise(seed, i + 3900) * TAU;
      const d = burstRadius * lerp(0.1, 0.82, hashNoise(seed, i + 3920));
      const r = baseRadius * lerp(0.006, 0.028, hashNoise(seed, i + 3940));
      drawBurstBlob(ctx, x, y, a, d, r * lerp(1.8, 5.5, glints), r, i % 2 ? colors.fringeA : colors.fringeB, corePower * secondary * glints * 0.08, {
        seed: seed + i * 31,
        wobble: 0.5,
      });
    }
  }

  drawRadial(ctx, x, y, baseRadius * lerp(0.12, 0.28, env.hot), [
    [0, rgba(WHITE, corePower * 0.62)],
    [0.32, rgba(colors.spike, corePower * lerp(0.16, 0.3, bloomCoupling))],
    [1, 'rgba(0,0,0,0)'],
  ]);
  ctx.restore();
}

function drawInnerBloom(ctx, x, y, baseRadius, colors, env, params) {
  const intensity = getValue(params, 'intensity', 78) / 100;
  const inner = getValue(params, 'innerBloom', 78) / 100;
  const softness = getValue(params, 'softness', 78) / 100;
  const radius = baseRadius * lerp(0.55, 1.18, softness) * lerp(0.82, 1.22, env.bloom);
  drawRadial(ctx, x, y, radius, [
    [0, rgba(WHITE, intensity * inner * env.brightness * 0.36)],
    [0.18, rgba(colors.bloom, intensity * inner * env.brightness * 0.45)],
    [0.52, rgba(colors.outer, intensity * inner * env.bloom * 0.14)],
    [1, 'rgba(0,0,0,0)'],
  ]);

  const seed = getValue(params, 'imperfectionSeed', 311);
  const irregularity = getValue(params, 'opticalImperfection', getValue(params, 'glassScatter', 30)) / 100;
  const lobes = 5;
  for (let i = 0; i < lobes; i++) {
    const a = (i / lobes) * TAU + (hashNoise(seed, i + 1800) - 0.5) * 0.7;
    const d = radius * lerp(0.04, 0.16, hashNoise(seed, i + 1830)) * irregularity;
    drawEllipseRadial(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, radius * lerp(0.34, 0.62, hashNoise(seed, i + 1860)), radius * lerp(0.24, 0.46, hashNoise(seed, i + 1890)), [
      [0, rgba(i % 2 ? colors.warm : colors.cool, intensity * inner * env.bloom * 0.025 * irregularity)],
      [0.58, rgba(colors.bloom, intensity * inner * env.bloom * 0.009 * irregularity)],
      [1, 'rgba(0,0,0,0)'],
    ], a);
  }
}

function drawOuterBloom(ctx, x, y, baseRadius, colors, env, params) {
  const intensity = getValue(params, 'intensity', 78) / 100;
  const outer = getValue(params, 'outerBloom', 72) / 100;
  const expansion = getValue(params, 'bloomExpansion', 62) / 100;
  const softness = getValue(params, 'softness', 78) / 100;
  const blackLift = getValue(params, 'blackLift', 18) / 100;
  const radius = baseRadius * lerp(1.4, 3.8, softness) * lerp(0.75, 1.55, env.bloom * expansion);
  drawRadial(ctx, x, y, radius, [
    [0, rgba(colors.bloom, intensity * outer * env.bloom * 0.11)],
    [0.28, rgba(colors.outer, intensity * outer * env.bloom * 0.065)],
    [0.66, rgba(colors.cool, intensity * outer * (0.012 + blackLift * 0.014) * env.halo)],
    [1, 'rgba(0,0,0,0)'],
  ]);

  drawEllipseRadial(ctx, x + radius * 0.035, y - radius * 0.018, radius * 0.9, radius * 0.58, [
    [0, rgba(colors.warm, intensity * outer * env.bloom * 0.034)],
    [0.48, rgba(colors.halo, intensity * outer * env.bloom * 0.014)],
    [1, 'rgba(0,0,0,0)'],
  ], -0.18);

  drawEllipseRadial(ctx, x - radius * 0.025, y + radius * 0.022, radius * 0.72, radius * 0.5, [
    [0, rgba(colors.cool, intensity * outer * env.halo * 0.018)],
    [0.55, rgba(colors.outer, intensity * outer * env.halo * 0.008)],
    [1, 'rgba(0,0,0,0)'],
  ], 0.22);
}

function drawHalation(ctx, x, y, baseRadius, colors, env, params) {
  const amount = getValue(params, 'haloAmount', getValue(params, 'haloStrength', 42)) / 100;
  const radius = baseRadius * lerp(0.75, 1.8, getValue(params, 'haloRadius', 54) / 100) * env.halo;
  drawRadial(ctx, x, y, radius, [
    [0, rgba(colors.warm, amount * env.brightness * 0.08)],
    [0.36, rgba(colors.halo, amount * env.halo * 0.04)],
    [0.74, rgba(colors.cool, amount * env.halo * 0.012)],
    [1, 'rgba(0,0,0,0)'],
  ]);
}

function drawApertureRing(ctx, x, y, radius, colors, alpha, params, env, sidesOverride) {
  const sides = sidesOverride ?? Math.max(5, Math.round(getValue(params, 'petalCount', 8)));
  const seed = getValue(params, 'imperfectionSeed', 311);
  ctx.save();
  withFilter(ctx, `blur(${lerp(1, 7, getValue(params, 'haloSoftness', 64) / 100)}px)`, () => {
    drawRadial(ctx, x, y, radius * 1.12, [
      [0.42, 'rgba(0,0,0,0)'],
      [0.64, rgba(colors.halo, alpha * env.halo * 0.026)],
      [0.82, rgba(colors.coating, alpha * env.halo * 0.014)],
      [1, 'rgba(0,0,0,0)'],
    ]);
    drawCoatingArcHaze(ctx, x, y, radius, radius * lerp(0.86, 1, getValue(params, 'haloEllipticity', 20) / 100), colors.halo, alpha * env.halo * 0.78, {
      count: Math.max(4, Math.round(sides * 0.8)),
      breakup: getValue(params, 'haloBreakup', 38) / 100,
      rotation: getValue(params, 'haloRotation', 0) * Math.PI / 180,
      softness: getValue(params, 'haloSoftness', 64) / 100,
      seed,
    });
    for (let i = 0; i < sides; i++) {
      const a = getValue(params, 'haloRotation', 0) * Math.PI / 180 + (i / sides) * TAU;
      const px = x + Math.cos(a) * radius * 0.76;
      const py = y + Math.sin(a) * radius * 0.76;
      drawEllipseRadial(ctx, px, py, radius * 0.12, radius * 0.03, [
        [0, rgba(colors.coating, alpha * env.halo * 0.024)],
        [0.8, 'rgba(0,0,0,0)'],
        [1, 'rgba(0,0,0,0)'],
      ], a);
    }
  });
  ctx.restore();
}

function drawCoronaPetals(ctx, x, y, baseRadius, colors, env, params) {
  const amount = getValue(params, 'coronaAmount', 42) / 100;
  const petals = Math.max(4, Math.round(getValue(params, 'petalCount', 10)));
  const seed = getValue(params, 'imperfectionSeed', 311);
  const radius = baseRadius * lerp(0.85, 2.2, getValue(params, 'haloRadius', 54) / 100);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * TAU + Math.sin(env.phase * TAU + i) * 0.012;
    const length = radius * lerp(0.42, 0.88, hashNoise(seed, i + 220));
    const width = radius * lerp(0.08, 0.18, hashNoise(seed, i + 250));
    const px = x + Math.cos(a) * radius * 0.22;
    const py = y + Math.sin(a) * radius * 0.22;
    withFilter(ctx, `blur(${lerp(5, 15, getValue(params, 'haloSoftness', 64) / 100)}px)`, () => {
      drawSoftStreak(ctx, px, py, a, length, width, i % 2 ? colors.halo : colors.outer, amount * env.halo * 0.09, {
        start: 0.02,
        end: 0.9,
        seed: seed + i * 17,
        complexity: 0.7,
      });
    });
  }
  ctx.restore();
}

function drawHaloPattern(ctx, x, y, baseRadius, colors, env, params) {
  const shape = getValue(params, 'haloShape', 'round');
  const amount = getValue(params, 'haloAmount', 42) / 100;
  if (amount <= 0.01 || shape === 'none') return;

  const opacity = amount * getValue(params, 'haloOpacity', 58) / 100;
  const count = Math.max(1, Math.round(getValue(params, 'haloCount', shape === 'doubleHalo' ? 2 : 1)));
  const separation = getValue(params, 'ringSeparation', 48) / 100;
  const radiusBase = baseRadius * lerp(0.9, 2.4, getValue(params, 'haloRadius', 54) / 100);
  const ellipse = lerp(1, 0.54, getValue(params, 'haloEllipticity', shape === 'ellipse' ? 56 : 18) / 100);
  const rotation = getValue(params, 'haloRotation', 0) * Math.PI / 180;

  if (shape === 'corona' || shape === 'radialPetals') {
    drawCoronaPetals(ctx, x, y, baseRadius, colors, env, params);
  }

  for (let i = 0; i < count; i++) {
    const r = radiusBase * (1 + i * lerp(0.22, 0.62, separation)) * env.halo;
    const localAlpha = opacity * lerp(1, 0.45, i / Math.max(1, count));
    if (shape === 'ellipse') {
      drawEllipseRadial(ctx, x, y, r * 1.24, r * ellipse, [
        [0, 'rgba(0,0,0,0)'],
        [0.42, rgba(colors.halo, localAlpha * 0.018)],
        [0.62, rgba(colors.coating, localAlpha * 0.052)],
        [0.8, rgba(colors.cool, localAlpha * 0.018)],
        [1, 'rgba(0,0,0,0)'],
      ], rotation);
    } else if (shape === 'apertureRing') {
      drawApertureRing(ctx, x, y, r, colors, localAlpha, params, env);
    } else if (shape === 'doubleHalo') {
      drawCoatingArcHaze(ctx, x, y, r, r * lerp(0.88, 1, i * 0.4), i % 2 ? colors.cool : colors.halo, localAlpha * 0.42, {
        count: 6 + i * 2,
        breakup: getValue(params, 'haloBreakup', 42) / 100,
        softness: getValue(params, 'haloSoftness', 64) / 100,
        seed: getValue(params, 'imperfectionSeed', 311) + i * 31,
      });
      drawRadial(ctx, x, y, r * 1.18, [
        [0.46, 'rgba(0,0,0,0)'],
        [0.68, rgba(colors.halo, localAlpha * 0.032)],
        [0.86, rgba(colors.coating, localAlpha * 0.014)],
        [1, 'rgba(0,0,0,0)'],
      ]);
    } else if (shape === 'corona' || shape === 'radialPetals') {
      drawCoatingArcHaze(ctx, x, y, r * 0.82, r * 0.78, colors.halo, localAlpha * 0.25, {
        count: 8,
        breakup: 0.56,
        softness: getValue(params, 'haloSoftness', 64) / 100,
        seed: getValue(params, 'imperfectionSeed', 311) + i * 51,
      });
    } else {
      drawRadial(ctx, x, y, r, [
        [0, 'rgba(0,0,0,0)'],
        [0.52, rgba(colors.halo, localAlpha * 0.026)],
        [0.68, rgba(WHITE, localAlpha * 0.03)],
        [0.8, rgba(colors.cool, localAlpha * 0.014)],
        [1, 'rgba(0,0,0,0)'],
      ]);
    }
  }
}

function starShapeConfig(shape, params) {
  const map = {
    none: { count: 0, length: 0, cross: 0 },
    fourPoint: { count: 4, length: 0.9, cross: 0 },
    sixPoint: { count: 6, length: 0.86, cross: 0 },
    eightPoint: { count: 8, length: 0.82, cross: 0 },
    crossFilter: { count: 4, length: 1.18, cross: 0.55 },
    anamorphicCross: { count: 4, length: 1.28, cross: 1 },
    softDiffraction: { count: 12, length: 0.58, cross: 0 },
    needleStar: { count: 8, length: 1.45, cross: 0.1 },
  };
  const selected = map[shape] || map.softDiffraction;
  return {
    count: selected.count || Math.round(getValue(params, 'spikeCount', 8)),
    length: selected.length,
    cross: selected.cross,
  };
}

function burstShapeConfig(shape) {
  const map = {
    none: { count: 0, length: 0, cross: 0, petals: 0 },
    softStar: { count: 10, length: 0.82, cross: 0, petals: 0.25 },
    fourPoint: { count: 4, length: 0.98, cross: 0, petals: 0.1 },
    needleStar: { count: 8, length: 1.25, cross: 0.08, petals: 0.05 },
    crossStar: { count: 4, length: 1.05, cross: 0.45, petals: 0.12 },
    sixPoint: { count: 6, length: 0.95, cross: 0, petals: 0.16 },
    eightPoint: { count: 8, length: 0.9, cross: 0, petals: 0.16 },
    diffractionBloom: { count: 14, length: 0.64, cross: 0, petals: 0.55 },
    flowerBurst: { count: 12, length: 0.72, cross: 0, petals: 0.85 },
    anamorphicCross: { count: 4, length: 1.08, cross: 1, petals: 0.08 },
  };
  return map[shape] || map.softStar;
}

function glareDirectionAngles(direction) {
  const map = {
    horizontal: [0],
    vertical: [Math.PI / 2],
    diag45: [Math.PI / 4],
    'diag-45': [-Math.PI / 4],
    cross: [0, Math.PI / 2],
    anamorphic: [0, Math.PI / 4],
  };
  return map[direction] || [];
}

function primaryOpticalAxis(x, y, canvas, params) {
  const angles = glareDirectionAngles(getValue(params, 'glareDirection', 'radial'));
  if (angles.length) return angles[0];

  const cx = canvas.width * 0.5;
  const cy = canvas.height * 0.5;
  if (Math.abs(x - cx) + Math.abs(y - cy) > 4) {
    return Math.atan2(cy - y, cx - x);
  }

  const seed = getValue(params, 'imperfectionSeed', 311);
  return -Math.PI / 7 + (hashNoise(seed, 1440) - 0.5) * 0.22;
}

function drawStarburstPattern(ctx, x, y, baseRadius, colors, env, params) {
  const shape = getValue(params, 'starburstShape', 'softDiffraction');
  const amount = getValue(params, 'starburstAmount', getValue(params, 'starburst', 26)) / 100;
  const cfg = starShapeConfig(shape, params);
  if (amount <= 0.01 || cfg.count <= 0) return;

  const seed = getValue(params, 'imperfectionSeed', 311);
  const complexity = getValue(params, 'patternComplexity', 46) / 100;
  const lengthParam = getValue(params, 'spikeLength', 58) / 100;
  const thicknessParam = getValue(params, 'spikeThickness', 30) / 100;
  const sharpness = getValue(params, 'spikeSharpness', 52) / 100;
  const taper = getValue(params, 'spikeTaper', 66) / 100;
  const glow = getValue(params, 'spikeGlow', 58) / 100;
  const breakup = getValue(params, 'spikeBreakup', 46) / 100;
  const rotation = getValue(params, 'spikeRotation', 0) * Math.PI / 180;
  const secondary = getValue(params, 'secondarySpikes', 24) / 100;
  const glints = getValue(params, 'glintAmount', 26) / 100;
  const active = amount * env.star;
  const length = baseRadius * lerp(0.55, 2.55, lengthParam) * cfg.length * lerp(0.72, 1.08, env.hot);
  const thickness = baseRadius * lerp(0.003, 0.026, thicknessParam) * lerp(1.55, 0.82, env.hot * sharpness);

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < cfg.count; i++) {
    const base = rotation + (i / cfg.count) * TAU + (hashNoise(seed, i + 300) - 0.5) * 0.075 * complexity;
    for (let dir = 0; dir < 2; dir++) {
      const a = base + dir * Math.PI;
      const localLength = length * lerp(0.72, 1.18, hashNoise(seed, i * 5 + dir + 330));
      const alpha = active * lerp(0.035, 0.1, sharpness) * lerp(0.62, 1.08, hashNoise(seed, i + 380));
      withFilter(ctx, `blur(${lerp(5, 1.1, sharpness) * lerp(1.25, 0.65, env.hot)}px)`, () => {
        drawSoftStreak(ctx, x, y, a, localLength, thickness * lerp(6.2, 3.1, taper), colors.spike, alpha * glow * 0.78, {
          start: 0.02,
          end: 0.72,
          seed: seed + i * 101 + dir * 41,
          complexity,
        });
      });
      drawSoftStreak(ctx, x, y, a, localLength * lerp(0.38, 0.58, sharpness), Math.max(0.2, thickness * 0.44), mixRgb(colors.spike, WHITE, 0.24), alpha * 0.28, {
        start: 0.02,
        end: 0.6,
        seed: seed + i * 107 + dir * 53,
        complexity: complexity * 0.6,
      });

      const glintCount = Math.round(lerp(1, 5, glints) * complexity);
      for (let g = 0; g < glintCount; g++) {
        if (hashNoise(seed, i * 29 + g + 420) < breakup * 0.32) continue;
        const s = lerp(0.15, 0.84, hashNoise(seed, i * 31 + g + 440));
        const px = x + Math.cos(a) * localLength * s;
        const py = y + Math.sin(a) * localLength * s;
        drawEllipseRadial(ctx, px, py, localLength * lerp(0.01, 0.028, hashNoise(seed, i * 37 + g + 460)), Math.max(0.35, thickness * 0.74), [
          [0, rgba(g % 2 ? colors.fringeB : colors.fringeA, alpha * 0.28 * glints)],
          [0.55, rgba(g % 2 ? colors.cool : colors.warm, alpha * 0.07 * glints)],
          [1, 'rgba(0,0,0,0)'],
        ], a);
      }
    }
  }

  if (cfg.cross > 0) {
    const hLength = baseRadius * lerp(2.4, 5.8, lengthParam) * cfg.cross;
    const vLength = hLength * (shape === 'anamorphicCross' ? 0.38 : 0.72);
    const alpha = active * 0.18;
    withFilter(ctx, `blur(${lerp(6, 2, sharpness)}px)`, () => {
      drawSoftStreak(ctx, x, y, 0, hLength, thickness * lerp(7, 3.6, sharpness), colors.cool, alpha * 0.52, {
        start: -0.38,
        end: 0.38,
        seed: seed + 610,
        complexity: 0.48 + complexity * 0.42,
      });
      drawSoftStreak(ctx, x, y, Math.PI / 2, vLength, thickness * lerp(4, 2.4, sharpness), colors.warm, alpha * 0.24, {
        start: -0.34,
        end: 0.34,
        seed: seed + 640,
        complexity: 0.35 + complexity * 0.32,
      });
    });
  }

  if (secondary > 0.01) {
    for (let i = 0; i < cfg.count; i++) {
      const a = rotation + (i / cfg.count) * TAU + Math.PI / cfg.count;
      drawSoftStreak(ctx, x, y, a, length * 0.36, thickness * 0.75, colors.coating, active * secondary * 0.032, {
        start: 0.02,
        end: 0.8,
        seed: seed + i * 73,
        complexity: complexity * 0.55,
      });
    }
  }
  ctx.restore();
}

function drawGlareStructure(ctx, x, y, baseRadius, colors, env, params) {
  const direction = getValue(params, 'glareDirection', 'radial');
  const strength = getValue(params, 'angleStrength', 28) / 100;
  const layers = Math.max(1, Math.round(getValue(params, 'layerCount', 2)));
  const angles = glareDirectionAngles(direction);
  if (!angles.length || strength <= 0.01) return;

  const seed = getValue(params, 'imperfectionSeed', 311);
  const intensity = getValue(params, 'intensity', 78) / 100;
  const softness = getValue(params, 'softness', 78) / 100;
  const burstSoftness = getValue(params, 'burstSoftness', 58) / 100;
  const sourceShape = getValue(params, 'sourceShape', 'round');
  const shapeBoost = sourceShape === 'anamorphicPoint' ? 1.45
    : sourceShape === 'cross' ? 1.24
      : sourceShape === 'star' ? 1.18
        : sourceShape === 'none' ? 0.72
          : 1;
  const isAnamorphic = direction === 'anamorphic';
  const powerCurve = heroCurve(strength, 0.92, 0.32);
  const reach = baseRadius * lerp(1.9, isAnamorphic ? 12.5 : 7.6, powerCurve) * lerp(0.86, 1.36, env.hot) * shapeBoost;
  const widthBase = baseRadius * lerp(0.018, isAnamorphic ? 0.082 : 0.13, softness) * lerp(0.72, 1.36, burstSoftness) * lerp(0.9, 1.34, powerCurve);
  const centerPower = intensity * env.brightness * lerp(0.34, 1.82, powerCurve) * shapeBoost;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  angles.forEach((angle, ai) => {
    const coreLength = reach * lerp(0.18, 0.46, powerCurve);
    const coreWidth = widthBase * lerp(0.44, 1.22, burstSoftness);
    withFilter(ctx, `blur(${lerp(5.6, 0.8, powerCurve) * lerp(1.25, 0.78, burstSoftness) * lerp(1.05, 0.68, env.hot)}px)`, () => {
      drawSoftStreak(ctx, x, y, angle, coreLength, coreWidth, mixRgb(colors.streak, WHITE, 0.3), centerPower * 0.88, {
        start: -0.48,
        end: 0.48,
        seed: seed + ai * 911 + 4200,
        complexity: 0.2 + powerCurve * 0.3,
      });
    });

    drawEllipseRadial(ctx, x, y, coreLength * 0.44, coreWidth * lerp(2.8, 6.2, burstSoftness), [
      [0, rgba(WHITE, centerPower * 0.72)],
      [0.18, rgba(colors.streak, centerPower * 0.62)],
      [0.58, rgba(colors.halo, centerPower * 0.2)],
      [1, 'rgba(0,0,0,0)'],
    ], angle);

    drawEllipseRadial(ctx, x, y, coreLength * 0.22, coreWidth * lerp(0.5, 1.3, burstSoftness), [
      [0, rgba(WHITE, centerPower * 0.95)],
      [0.3, rgba(colors.amber, centerPower * 0.36)],
      [1, 'rgba(0,0,0,0)'],
    ], angle);

    for (let i = 0; i < layers; i++) {
      const t = layers === 1 ? 0 : i / (layers - 1);
      const offset = (i - (layers - 1) / 2) * baseRadius * 0.028 * strength;
      const px = x + Math.cos(angle + Math.PI / 2) * offset;
      const py = y + Math.sin(angle + Math.PI / 2) * offset;
      const localReach = reach * lerp(0.66, 1.42, t) * lerp(0.92, 1.12, hashNoise(seed, i + ai * 31 + 4900));
      const localWidth = widthBase * lerp(3.8, 0.72, t) * lerp(1.18, 0.76, env.hot);
      const alpha = intensity * env.detail * lerp(0.34, 0.075, t) * lerp(0.72, 2.25, powerCurve);
      withFilter(ctx, `blur(${lerp(18, 1.8, powerCurve) * lerp(1.18, 0.72, env.hot) * lerp(0.8, 1.25, burstSoftness)}px)`, () => {
        drawSoftStreak(ctx, px, py, angle, localReach, localWidth, i % 2 ? colors.halo : colors.streak, alpha, {
          start: -0.5,
          end: 0.5,
          seed: seed + i * 53 + ai * 701,
          complexity: 0.34 + powerCurve * 0.34,
        });
      });
      if (i === layers - 1 || t > 0.45) {
        drawSoftStreak(ctx, px, py, angle, localReach * 0.78, Math.max(0.6, localWidth * 0.22), mixRgb(colors.streak, WHITE, 0.16), alpha * 0.64, {
          start: -0.46,
          end: 0.46,
          seed: seed + i * 79 + ai * 809,
          complexity: 0.24 + powerCurve * 0.24,
        });
      }
    }

    const beadCount = Math.max(2, Math.round(lerp(2, 9, powerCurve) * Math.min(1.45, layers / 3)));
    for (let b = 0; b < beadCount; b++) {
      const side = b % 2 ? 1 : -1;
      const d = coreLength * lerp(0.18, 0.92, (b + 1) / (beadCount + 1)) * side;
      const px = x + Math.cos(angle) * d;
      const py = y + Math.sin(angle) * d;
      drawEllipseRadial(ctx, px, py, baseRadius * lerp(0.018, 0.055, powerCurve), baseRadius * lerp(0.006, 0.018, softness), [
        [0, rgba(WHITE, centerPower * 0.34)],
        [0.42, rgba(b % 2 ? colors.fringeA : colors.fringeB, centerPower * 0.16)],
        [1, 'rgba(0,0,0,0)'],
      ], angle);
    }

    const filamentAlpha = centerPower * colors.spread * lerp(0.04, 0.14, powerCurve);
    const sideOffset = widthBase * lerp(1.2, 4.8, burstSoftness);
    [-1, 1].forEach((side, fi) => {
      drawSoftStreak(
        ctx,
        x + Math.cos(angle + Math.PI / 2) * sideOffset * side,
        y + Math.sin(angle + Math.PI / 2) * sideOffset * side,
        angle,
        reach * lerp(0.28, 0.7, powerCurve),
        Math.max(0.55, widthBase * lerp(0.18, 0.42, burstSoftness)),
        fi ? colors.fringeA : colors.fringeB,
        filamentAlpha,
        {
          start: -0.46,
          end: 0.46,
          seed: seed + ai * 1031 + fi * 97,
          complexity: 0.28 + powerCurve * 0.34,
        },
      );
    });

    const ghostCount = Math.max(0, layers - 1);
    for (let g = 0; g < ghostCount; g++) {
      const side = g % 2 ? 1 : -1;
      const d = reach * lerp(0.18, 0.46, (g + 1) / Math.max(1, ghostCount + 1)) * side;
      const px = x + Math.cos(angle) * d;
      const py = y + Math.sin(angle) * d;
      drawEllipseRadial(ctx, px, py, baseRadius * lerp(0.08, 0.18, strength), baseRadius * lerp(0.018, 0.05, softness), [
        [0, rgba(g % 2 ? colors.fringeA : colors.fringeB, intensity * strength * env.halo * 0.09)],
        [0.52, rgba(colors.coating, intensity * strength * env.halo * 0.026)],
        [1, 'rgba(0,0,0,0)'],
      ], angle);
    }
  });
  ctx.restore();
}

function drawSoftPolygonGhost(ctx, x, y, radius, sides, color, alpha, rotation = 0) {
  if (alpha <= 0 || radius <= 0) return;
  const points = Math.max(5, Math.round(sides));
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.globalCompositeOperation = 'screen';
  ctx.filter = `blur(${Math.max(1.5, radius * 0.08)}px)`;
  ctx.beginPath();
  for (let i = 0; i < points; i++) {
    const a = (i / points) * TAU;
    const r = radius * lerp(0.84, 1.08, hashNoise(points + radius, i + 33));
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  const g = ctx.createRadialGradient(0, 0, radius * 0.12, 0, 0, radius);
  g.addColorStop(0, rgba(mixRgb(color, WHITE, 0.22), alpha * 0.24));
  g.addColorStop(0.46, rgba(color, alpha * 0.09));
  g.addColorStop(0.76, rgba(color, alpha * 0.035));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.filter = 'none';
  ctx.restore();
}

function drawCinematicVeil(ctx, x, y, canvas, baseRadius, colors, env, params) {
  const intensity = getValue(params, 'intensity', 78) / 100;
  const halo = getValue(params, 'haloAmount', 42) / 100;
  const spread = getValue(params, 'colorSpread', 18) / 100;
  const bloom = getValue(params, 'bloomExpansion', 52) / 100;
  const directional = getValue(params, 'angleStrength', 24) / 100;
  const amount = clamp((intensity * 0.34 + halo * 0.3 + bloom * 0.26 + directional * 0.16) * env.halo);
  if (amount <= 0.04) return;

  const seed = getValue(params, 'imperfectionSeed', 311);
  const angle = primaryOpticalAxis(x, y, canvas, params) + (hashNoise(seed, 1580) - 0.5) * 0.34;
  const span = Math.max(canvas.width, canvas.height);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  withFilter(ctx, `blur(${lerp(18, 42, bloom)}px)`, () => {
    drawEllipseRadial(ctx, x, y, span * lerp(0.28, 0.52, bloom), span * lerp(0.16, 0.32, halo), [
      [0, rgba(mixRgb(colors.bloom, WHITE, 0.18), amount * 0.06)],
      [0.36, rgba(colors.halo, amount * 0.026)],
      [0.74, rgba(colors.coating, amount * spread * 0.014)],
      [1, 'rgba(0,0,0,0)'],
    ], angle);

    const ox = x - Math.cos(angle) * baseRadius * lerp(0.4, 1.1, spread);
    const oy = y - Math.sin(angle) * baseRadius * lerp(0.4, 1.1, spread);
    drawEllipseRadial(ctx, ox, oy, span * 0.44, span * 0.2, [
      [0, rgba(colors.fringeB, amount * spread * 0.028)],
      [0.42, rgba(colors.outer, amount * 0.018)],
      [1, 'rgba(0,0,0,0)'],
    ], angle + 0.18);
  });
  ctx.restore();
}

function drawCinematicCoatingHalo(ctx, x, y, canvas, baseRadius, colors, env, params) {
  const halo = getValue(params, 'haloAmount', 42) / 100;
  const spread = getValue(params, 'colorSpread', 18) / 100;
  const layers = Math.max(1, Math.round(getValue(params, 'layerCount', 2)));
  const directionPower = getValue(params, 'angleStrength', 24) / 100;
  const amount = clamp((halo * 0.58 + spread * 0.34 + directionPower * 0.18 + layers * 0.035) * env.halo);
  if (amount <= 0.08) return;

  const seed = getValue(params, 'imperfectionSeed', 311);
  const axis = primaryOpticalAxis(x, y, canvas, params);
  const maxDim = Math.max(canvas.width, canvas.height);
  const sourceOffset = baseRadius * lerp(0.1, 0.8, spread);
  const cx = x - Math.cos(axis) * sourceOffset;
  const cy = y - Math.sin(axis) * sourceOffset;
  const count = Math.min(4, Math.max(1, layers + (spread > 0.5 ? 1 : 0)));

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / (count - 1);
    const r = maxDim * lerp(0.24, 0.62, t) * lerp(0.82, 1.18, hashNoise(seed, i + 1660));
    const rx = r * lerp(0.86, 1.3, hashNoise(seed, i + 1680));
    const ry = r * lerp(0.44, 0.82, hashNoise(seed, i + 1700));
    const px = cx + Math.cos(axis + Math.PI) * baseRadius * lerp(0.08, 0.62, t);
    const py = cy + Math.sin(axis + Math.PI) * baseRadius * lerp(0.08, 0.62, t);
    const color = i % 3 === 0 ? colors.coating : i % 3 === 1 ? colors.fringeB : colors.fringeA;
    drawCoatingArcHaze(ctx, px, py, rx, ry, color, amount * lerp(0.22, 0.08, t), {
      seed: seed + i * 101,
      count: Math.round(lerp(5, 11, spread)),
      rotation: axis + lerp(-0.45, 0.45, hashNoise(seed, i + 1720)),
      breakup: lerp(0.5, 0.82, spread),
      softness: 0.84,
    });
  }
  ctx.restore();
}

function drawCinematicGhosts(ctx, x, y, canvas, baseRadius, colors, env, params) {
  const halo = getValue(params, 'haloAmount', 42) / 100;
  const spread = getValue(params, 'colorSpread', 18) / 100;
  const directionPower = getValue(params, 'angleStrength', 24) / 100;
  const layers = Math.max(1, Math.round(getValue(params, 'layerCount', 2)));
  const sourceShape = getValue(params, 'sourceShape', 'round');
  const styleBoost = sourceShape === 'anamorphicPoint' || sourceShape === 'star' || sourceShape === 'diffraction' ? 1.22
    : sourceShape === 'softBlob' ? 0.78
      : 1;
  const amount = clamp((halo * 0.4 + spread * 0.34 + directionPower * 0.34 + layers * 0.05) * env.halo * styleBoost);
  if (amount <= 0.07) return;

  const seed = getValue(params, 'imperfectionSeed', 311);
  const axis = primaryOpticalAxis(x, y, canvas, params);
  const ux = Math.cos(axis);
  const uy = Math.sin(axis);
  const pxAxis = -uy;
  const pyAxis = ux;
  const maxDim = Math.max(canvas.width, canvas.height);
  const count = Math.round(lerp(3, 8, clamp(amount)) * Math.min(1.4, 0.75 + layers * 0.18));

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < count; i++) {
    const t = (i + 1) / (count + 1);
    const side = i % 2 ? 1 : -1;
    const distance = maxDim * lerp(0.1, 0.48, t) * side;
    const wobble = (hashNoise(seed, i + 1810) - 0.5) * baseRadius * lerp(0.06, 0.32, spread);
    const gx = x + ux * distance + pxAxis * wobble;
    const gy = y + uy * distance + pyAxis * wobble;
    const local = amount * lerp(0.42, 0.08, t) * lerp(0.76, 1.22, hashNoise(seed, i + 1830));
    const color = i % 4 === 0 ? colors.fringeB : i % 4 === 1 ? colors.coating : i % 4 === 2 ? colors.fringeA : colors.halo;
    const rx = baseRadius * lerp(0.055, 0.28, hashNoise(seed, i + 1850)) * lerp(0.8, 1.55, spread);
    const ry = rx * lerp(0.34, 0.88, hashNoise(seed, i + 1870));

    withFilter(ctx, `blur(${lerp(2, 9, t) * lerp(0.7, 1.4, spread)}px)`, () => {
      drawEllipseRadial(ctx, gx, gy, rx, ry, [
        [0, rgba(mixRgb(color, WHITE, 0.2), local * 0.34)],
        [0.38, rgba(color, local * 0.12)],
        [0.8, rgba(colors.coating, local * 0.026)],
        [1, 'rgba(0,0,0,0)'],
      ], axis + (hashNoise(seed, i + 1890) - 0.5) * 0.8);
    });

    if (i % 2 === 0 && spread > 0.18) {
      drawCoatingArcHaze(ctx, gx, gy, rx * 1.9, ry * 2.2, color, local * 0.42, {
        seed: seed + i * 173,
        count: 4 + Math.round(spread * 5),
        rotation: axis,
        breakup: 0.72,
        softness: 0.86,
      });
    }

    if (i % 3 === 1 && amount > 0.28) {
      drawSoftPolygonGhost(
        ctx,
        gx + pxAxis * rx * 0.24,
        gy + pyAxis * rx * 0.24,
        rx * lerp(0.55, 1.15, hashNoise(seed, i + 1910)),
        6 + Math.round(hashNoise(seed, i + 1930) * 3),
        color,
        local * 0.34,
        axis + hashNoise(seed, i + 1950) * TAU,
      );
    }

    if (t < 0.72) {
      drawRadial(ctx, gx, gy, Math.max(1, baseRadius * lerp(0.01, 0.028, hashNoise(seed, i + 1970))), [
        [0, rgba(WHITE, local * 0.38)],
        [0.34, rgba(color, local * 0.18)],
        [1, 'rgba(0,0,0,0)'],
      ]);
    }
  }
  ctx.restore();
}

function drawChromaticEdges(ctx, x, y, baseRadius, colors, env, params) {
  const chroma = getValue(params, 'chromaticAberration', getValue(params, 'spectralSplit', 18)) / 100;
  const split = Math.max(getValue(params, 'spectralSplit', 18), getValue(params, 'fringeAmount', 18)) / 100;
  const haloFringe = getValue(params, 'haloFringing', getValue(params, 'ghostFringing', 24)) / 100;
  if (Math.max(chroma, split, haloFringe) <= 0.01) return;
  const radius = baseRadius * lerp(0.8, 2.2, env.halo);
  const offset = baseRadius * (0.015 + split * 0.075);
  drawRadial(ctx, x - offset, y, radius, [
    [0.38, 'rgba(0,0,0,0)'],
    [0.68, rgba(colors.fringeA, chroma * env.halo * 0.028)],
    [1, 'rgba(0,0,0,0)'],
  ]);
  drawRadial(ctx, x + offset, y, radius, [
    [0.38, 'rgba(0,0,0,0)'],
    [0.7, rgba(colors.fringeB, split * env.halo * 0.034)],
    [1, 'rgba(0,0,0,0)'],
  ]);
  drawRadial(ctx, x, y, radius * 0.82, [
    [0.48, 'rgba(0,0,0,0)'],
    [0.68, rgba(colors.magenta, haloFringe * env.halo * 0.016)],
    [0.88, rgba(colors.fringeB, haloFringe * env.halo * 0.01)],
    [1, 'rgba(0,0,0,0)'],
  ]);
}

function drawGlassScatter(ctx, x, y, canvas, baseRadius, colors, env, params, q) {
  const scatter = getValue(params, 'glassScatter', 30) / 100;
  const dust = getValue(params, 'dustAmount', 14) / 100;
  const scratches = getValue(params, 'scratchAmount', 8) / 100;
  const noise = getValue(params, 'noiseAmount', 10) / 100;
  const amount = Math.max(scatter, dust, scratches, noise);
  if (amount <= 0.01) return;

  const seed = getValue(params, 'imperfectionSeed', 311);
  const count = Math.round((8 + scatter * 34 + dust * 24) * q);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < count; i++) {
    const a = hashNoise(seed, i + 810) * TAU;
    const d = baseRadius * lerp(0.28, 2.9, hashNoise(seed, i + 830));
    const px = x + Math.cos(a) * d;
    const py = y + Math.sin(a) * d;
    const r = lerp(0.45, 2.4, hashNoise(seed, i + 850));
    drawRadial(ctx, px, py, r * lerp(1.2, 3.5, scatter), [
      [0, rgba(WHITE, env.detail * amount * 0.03)],
      [0.4, rgba(i % 2 ? colors.halo : colors.bloom, env.detail * amount * 0.018)],
      [1, 'rgba(0,0,0,0)'],
    ]);
  }

  const scratchCount = Math.round((1 + scratches * 6) * q);
  for (let i = 0; i < scratchCount; i++) {
    const a = hashNoise(seed, i + 920) * TAU;
    const d = baseRadius * lerp(0.6, 2.4, hashNoise(seed, i + 940));
    drawSoftStreak(
      ctx,
      x + Math.cos(a) * d,
      y + Math.sin(a) * d,
      a + Math.PI / 2 + (hashNoise(seed, i + 960) - 0.5) * 0.9,
      lerp(12, 42, hashNoise(seed, i + 980)),
      0.45,
      colors.halo,
      env.detail * scratches * 0.012,
      { start: -0.38, end: 0.38, seed: seed + i * 67, complexity: 0.35 },
    );
  }
  ctx.restore();
}

function compositeBloomPasses(ctx, layers, width, height, params, env) {
  const bloomPass = getValue(params, 'bloomPassStrength', 82) / 100;
  const blur = getValue(params, 'blurRadius', 68) / 100;
  const threshold = getValue(params, 'thresholdFeel', 62) / 100;
  const haloSoft = getValue(params, 'haloSoftness', 64) / 100;

  function draw(layer, alpha, radius = 0, mode = 'screen') {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = mode;
    ctx.globalAlpha = alpha;
    ctx.filter = radius > 0 ? `blur(${radius}px)` : 'none';
    ctx.drawImage(layer.canvas, 0, 0, width, height);
    ctx.restore();
  }

  draw(layers.bloom, bloomPass * 0.35 * env.bloom, lerp(18, 70, blur));
  draw(layers.bloom, bloomPass * 0.5, lerp(5, 22, blur));
  draw(layers.halo, 0.62 * env.halo, lerp(7, 24, haloSoft));
  draw(layers.starburst, 0.48, lerp(5, 16, blur));
  draw(layers.core, bloomPass * 0.26 * threshold, lerp(3, 12, blur), 'lighter');
  draw(layers.halo, 0.22, lerp(1, 5, haloSoft));
  draw(layers.starburst, 0.24, lerp(0.8, 3.5, blur));
  draw(layers.detail, 0.72, lerp(0.5, 3, blur));
  draw(layers.core, 1, 0, 'lighter');
}

export function createGlareEffect() {
  let time = 0;
  let pipeline = null;

  return {
    reset() { time = 0; },

    update(ctx, canvas, params, dt, renderOpts = {}) {
      if (!pipeline && typeof document !== 'undefined') pipeline = createGlowPipeline();
      const renderParams = styledParams(params);

      const speed = getValue(renderParams, 'breathingSpeed', getValue(renderParams, 'speed', 24)) / 100;
      time += dt * lerp(0.018, 0.36, speed);

      const q = qualityFactor(renderOpts) * clamp(getValue(renderParams, 'qualityScale', 84) / 84, 0.4, 1.25);
      const scale = clamp(q, 0.36, 1);
      const env = computeBreathingEnvelope(renderParams, time);
      const colors = buildColorSystem(renderParams, env);
      const x = canvas.width * (getValue(renderParams, 'sourceX', getValue(renderParams, 'positionX', 50)) / 100);
      const y = canvas.height * (getValue(renderParams, 'sourceY', getValue(renderParams, 'positionY', 50)) / 100);
      const size = getValue(renderParams, 'size', 56) / 100;
      const softness = getValue(renderParams, 'softness', 78) / 100;
      const safeScale = computeSafeRenderScale(canvas, renderParams, size, softness, env);
      const baseRadius = Math.min(canvas.width, canvas.height) * lerp(0.11, 0.52, smoothstep(size)) * lerp(0.86, 1.15, softness) * safeScale;

      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = clamp(getValue(renderParams, 'blendBias', 82) / 100, 0.25, 1.2);

      if (pipeline) {
        pipeline.prepare(canvas.width, canvas.height, scale);
        const { layers } = pipeline;
        drawHotCore(layers.core.ctx, x, y, baseRadius, colors, env, renderParams);
        drawBurstCore(layers.starburst.ctx, x, y, baseRadius, colors, env, renderParams);
        drawInnerBloom(layers.bloom.ctx, x, y, baseRadius, colors, env, renderParams);
        drawOuterBloom(layers.bloom.ctx, x, y, baseRadius, colors, env, renderParams);
        drawHalation(layers.halo.ctx, x, y, baseRadius, colors, env, renderParams);
        drawCinematicVeil(layers.halo.ctx, x, y, canvas, baseRadius, colors, env, renderParams);
        drawHaloPattern(layers.halo.ctx, x, y, baseRadius, colors, env, renderParams);
        drawCinematicCoatingHalo(layers.halo.ctx, x, y, canvas, baseRadius, colors, env, renderParams);
        drawGlareStructure(layers.starburst.ctx, x, y, baseRadius, colors, env, renderParams);
        drawStarburstPattern(layers.starburst.ctx, x, y, baseRadius, colors, env, renderParams);
        drawCinematicGhosts(layers.detail.ctx, x, y, canvas, baseRadius, colors, env, renderParams);
        drawChromaticEdges(layers.detail.ctx, x, y, baseRadius, colors, env, renderParams);
        drawGlassScatter(layers.detail.ctx, x, y, canvas, baseRadius, colors, env, renderParams, q);
        compositeBloomPasses(ctx, layers, canvas.width, canvas.height, renderParams, env);
      } else {
        drawOuterBloom(ctx, x, y, baseRadius, colors, env, renderParams);
        drawInnerBloom(ctx, x, y, baseRadius, colors, env, renderParams);
        drawBurstCore(ctx, x, y, baseRadius, colors, env, renderParams);
        drawHalation(ctx, x, y, baseRadius, colors, env, renderParams);
        drawCinematicVeil(ctx, x, y, canvas, baseRadius, colors, env, renderParams);
        drawHaloPattern(ctx, x, y, baseRadius, colors, env, renderParams);
        drawCinematicCoatingHalo(ctx, x, y, canvas, baseRadius, colors, env, renderParams);
        drawGlareStructure(ctx, x, y, baseRadius, colors, env, renderParams);
        drawStarburstPattern(ctx, x, y, baseRadius, colors, env, renderParams);
        drawCinematicGhosts(ctx, x, y, canvas, baseRadius, colors, env, renderParams);
        drawChromaticEdges(ctx, x, y, baseRadius, colors, env, renderParams);
        drawGlassScatter(ctx, x, y, canvas, baseRadius, colors, env, renderParams, q);
        drawHotCore(ctx, x, y, baseRadius, colors, env, renderParams);
      }

      ctx.restore();
    },
  };
}
