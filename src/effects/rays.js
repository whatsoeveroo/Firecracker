function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0 || 1));
  return t * t * (3 - 2 * t);
}

function fract(value) {
  return value - Math.floor(value);
}

function hash2(x, y, seed = 0) {
  return fract(Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453);
}

function valueNoise(x, y, seed = 0) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = smoothstep(0, 1, x - ix);
  const fy = smoothstep(0, 1, y - iy);
  const a = hash2(ix, iy, seed);
  const b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed);
  const d = hash2(ix + 1, iy + 1, seed);
  return lerp(lerp(a, b, fx), lerp(c, d, fx), fy);
}

function fbm(x, y, seed = 0, octaves = 4) {
  let value = 0;
  let amp = 0.56;
  let freq = 1;
  let norm = 0;

  for (let i = 0; i < octaves; i++) {
    value += valueNoise(x * freq, y * freq, seed + i * 17.13) * amp;
    norm += amp;
    amp *= 0.52;
    freq *= 2.04;
  }

  return value / norm;
}

function angleDelta(a, b) {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

function hexToRgb(hex = '#ffe7ad') {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function mixRgb(a, b, t) {
  return {
    r: lerp(a.r, b.r, t),
    g: lerp(a.g, b.g, t),
    b: lerp(a.b, b.b, t),
  };
}

function colorFromTemperature(colorTemp, tintColor, variation, warmth) {
  const stops = [
    { at: 0, rgb: { r: 135, g: 182, b: 255 } },
    { at: 35, rgb: { r: 228, g: 238, b: 255 } },
    { at: 68, rgb: { r: 255, g: 220, b: 154 } },
    { at: 100, rgb: { r: 255, g: 184, b: 78 } },
  ];
  const target = clamp(colorTemp / 100) * 100;
  let left = stops[0];
  let right = stops[stops.length - 1];

  for (let i = 0; i < stops.length - 1; i++) {
    if (target >= stops[i].at && target <= stops[i + 1].at) {
      left = stops[i];
      right = stops[i + 1];
      break;
    }
  }

  const local = (target - left.at) / (right.at - left.at || 1);
  const base = mixRgb(left.rgb, right.rgb, local);
  const tinted = mixRgb(base, hexToRgb(tintColor), clamp(variation / 100) * 0.42);
  return mixRgb(tinted, { r: 255, g: 238, b: 190 }, clamp(warmth / 100) * 0.35);
}

function toRgbaString(rgb, alpha) {
  return `rgba(${Math.round(rgb.r)},${Math.round(rgb.g)},${Math.round(rgb.b)},${clamp(alpha)})`;
}

function makeShaftSeed(index) {
  return {
    offset: (hash2(index, 1.3, 2) - 0.5) * 2,
    width: 0.72 + hash2(index, 7.4, 4) * 0.78,
    length: 0.62 + hash2(index, 13.2, 6) * 0.46,
    intensity: 0.36 + hash2(index, 19.8, 8) * 0.9,
    occlusion: hash2(index, 29.1, 11),
    phase: hash2(index, 41.8, 14) * Math.PI * 2,
  };
}

function ensureLayer(layer, width, height) {
  const targetWidth = Math.max(1, Math.floor(width));
  const targetHeight = Math.max(1, Math.floor(height));

  if (!layer.canvas) {
    layer.canvas = document.createElement('canvas');
    layer.ctx = layer.canvas.getContext('2d', { willReadFrequently: true });
  }

  if (layer.canvas.width !== targetWidth || layer.canvas.height !== targetHeight) {
    layer.canvas.width = targetWidth;
    layer.canvas.height = targetHeight;
  }

  layer.ctx.setTransform(1, 0, 0, 1, 0, 0);
  layer.ctx.clearRect(0, 0, targetWidth, targetHeight);
  return layer;
}

function spawnDust(sourceX, sourceY, maxLen, direction, spread) {
  const angle = direction + (Math.random() - 0.5) * spread * 1.35;
  const dist = Math.pow(Math.random(), 0.62) * maxLen;
  const side = (Math.random() - 0.5) * maxLen * 0.42;
  const normal = angle + Math.PI / 2;

  return {
    x: sourceX + Math.cos(angle) * dist + Math.cos(normal) * side,
    y: sourceY + Math.sin(angle) * dist + Math.sin(normal) * side,
    vx: (Math.random() - 0.5) * 0.18,
    vy: 0.01 + Math.random() * 0.035,
    life: 0.42 + Math.random() * 0.58,
    decay: 0.001 + Math.random() * 0.002,
    size: 0.45 + Math.random() * 1.85,
  };
}

function drawParticle(ctx, x, y, radius, color, alpha) {
  if (alpha <= 0.001) return;
  const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
  grad.addColorStop(0, toRgbaString(color, alpha));
  grad.addColorStop(0.42, toRgbaString(color, alpha * 0.34));
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawSourceBloom(ctx, sourceX, sourceY, radius, color, intensity, glow, time) {
  const pulse = 1 + Math.sin(time * 0.55) * 0.025;
  const outer = radius * (2.4 + glow * 2.2);
  const bloom = ctx.createRadialGradient(sourceX, sourceY, 0, sourceX, sourceY, outer);
  bloom.addColorStop(0, `rgba(255,255,246,${clamp(intensity * glow * pulse)})`);
  bloom.addColorStop(0.12, toRgbaString(color, intensity * glow * 0.72));
  bloom.addColorStop(0.34, toRgbaString(color, intensity * glow * 0.22));
  bloom.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = bloom;
  ctx.beginPath();
  ctx.arc(sourceX, sourceY, outer, 0, Math.PI * 2);
  ctx.fill();
}

function computeShaftVisibility({
  angle,
  distance,
  maxLen,
  spread,
  direction,
  sourceSize,
  fieldWidth,
  separation,
  clustering,
  edgeDissolve,
  rayCount,
  seeds,
  time,
  noiseScale,
  breakup,
  occlusion,
}) {
  const t = clamp(distance / maxLen);
  const halfSpread = Math.max(0.001, spread * 0.5);
  const delta = angleDelta(angle, direction);
  const edgeNoise = fbm(Math.cos(angle) * 1.7 + t * 2.4 + time * 0.024, Math.sin(angle) * 1.7 + t * 1.3, 91, 3);
  const edgeWidth = 0.38 + edgeDissolve * 0.72;
  const edgeWarp = (edgeNoise - 0.5) * 0.22 * edgeDissolve;
  const fan = smoothstep(1.06 + edgeWarp, Math.max(0.18, 1 - edgeWidth), Math.abs(delta) / halfSpread);
  if (fan <= 0) return { core: 0, halo: 0, shadow: 0 };

  const nearMerge = 1 - smoothstep(0.12, 0.34 + sourceSize * 0.16, t);
  const visibleCount = Math.max(1, Math.round(rayCount));
  const clusterSpread = halfSpread * (0.36 + separation * 0.72);
  const widthBase = fieldWidth * (0.09 + t * 1.15) * (1.18 - separation * 0.28);
  let core = fan * nearMerge * 0.64;
  let halo = fan * (0.12 + nearMerge * 0.18);
  let shadow = 0;

  for (let i = 0; i < visibleCount; i++) {
    const seed = seeds[i % seeds.length];
    const slot = visibleCount === 1 ? 0 : i / (visibleCount - 1) - 0.5;
    const familyOffset = slot * clusterSpread * 2 + seed.offset * halfSpread * (0.05 + clustering * 0.12);
    const cross = Math.abs(Math.sin(delta - familyOffset) * distance);
    const width = widthBase * seed.width * (0.55 + clustering * 0.52);
    const gaussianCore = Math.exp(-Math.pow(cross / Math.max(1, width * 0.42), 2));
    const gaussianHalo = Math.exp(-Math.pow(cross / Math.max(1, width * 1.15), 2));
    const lengthNoise = fbm(i * 0.31 + seed.phase, t * 1.4 + time * 0.018, seed.phase + 35, 3);
    const softEnd = seed.length * (0.78 + lengthNoise * 0.2);
    const lengthFade = smoothstep(softEnd, softEnd * 0.54, t);
    const shaftAge = t * (0.7 + noiseScale / 85);
    const band = fbm(shaftAge * 3.2 + time * 0.055, i * 0.41 + seed.phase, seed.phase, 4);
    const blocker = fbm(shaftAge * (1.25 + noiseScale / 80) + time * 0.035, i * 0.31 + seed.occlusion, seed.phase + 20, 3);
    const reveal = lerp(1, 0.46 + band * 0.8, breakup);
    const cut = lerp(1, smoothstep(0.18, 0.82, blocker), occlusion);
    const weight = seed.intensity * lengthFade * reveal * cut;
    core += gaussianCore * weight * (1.05 + separation * 0.78);
    halo += gaussianHalo * weight * (0.4 + edgeDissolve * 0.22);
    shadow += (1 - cut) * gaussianHalo * 0.4;
  }

  const separationRamp = smoothstep(0.16, 0.58, t);
  return {
    core: core * lerp(0.72, 1, separationRamp),
    halo,
    shadow,
  };
}

export function createRaysEffect() {
  let phase = 0;
  let dust = [];
  const seeds = Array.from({ length: 32 }, (_, i) => makeShaftSeed(i));
  const fieldLayer = {};

  return {
    reset() {
      phase = 0;
      dust = [];
      if (fieldLayer.ctx) fieldLayer.ctx.clearRect(0, 0, fieldLayer.canvas.width, fieldLayer.canvas.height);
    },

    update(ctx, canvas, params, dt) {
      const {
        sourceX = 76,
        sourceY = 6,
        direction = 128,
        spreadAngle = 54,
        sourceSize = 34,
        beamLength = 98,
        beamWidth = 66,
        sourceIntensity = 82,
        sourceGlow = 88,
        rayCount = 12,
        intensity = 78,
        softness = 76,
        density = 78,
        atmosphericHaze = 72,
        falloff = 78,
        fieldDepth = 68,
        scatterStrength = 76,
        beamSeparation = 66,
        beamClustering = 48,
        edgeDissolve = 64,
        noiseAmount = 54,
        noiseScale = 44,
        occlusionGaps = 46,
        edgeFeather = 78,
        coreHaloBalance = 58,
        dustAmount = 54,
        driftSpeed = 20,
        hazeDrift = 22,
        flickerAmount = 10,
        breathing = 18,
        turbulenceSpeed = 18,
        colorTemp = 72,
        tintColor = '#ffe7ad',
        colorVariation = 20,
        highlightWarmth = 54,
        bloomWarmth = 38,
      } = params;

      phase += dt * (0.055 + driftSpeed / 1200 + turbulenceSpeed / 900);

      const w = canvas.width;
      const h = canvas.height;
      const scale = Math.min(0.52, Math.max(0.38, 0.44 + (100 - softness) / 700));
      const layer = ensureLayer(fieldLayer, w * scale, h * scale);
      const fctx = layer.ctx;
      const image = fctx.createImageData(layer.canvas.width, layer.canvas.height);
      const data = image.data;

      const sx = w * (sourceX / 100);
      const sy = h * (sourceY / 100);
      const dir = (direction * Math.PI) / 180;
      const spread = (spreadAngle * Math.PI) / 180;
      const maxLen = Math.hypot(w, h) * (beamLength / 100);
      const fieldWidth = Math.min(w, h) * (0.12 + beamWidth / 150);
      const sourceRadius = Math.min(w, h) * (0.025 + sourceSize / 360);
      const baseColor = colorFromTemperature(colorTemp, tintColor, colorVariation, highlightWarmth);
      const bloomColor = mixRgb(baseColor, { r: 255, g: 232, b: 176 }, bloomWarmth / 100);
      const coolMedium = mixRgb(baseColor, { r: 170, g: 184, b: 206 }, 0.34);
      const densityAmount = density / 100;
      const atmosphere = atmosphericHaze / 100;
      const scatter = scatterStrength / 100;
      const separation = beamSeparation / 100;
      const clustering = beamClustering / 100;
      const breakup = noiseAmount / 100;
      const occlusion = occlusionGaps / 100;
      const feather = edgeFeather / 100;
      const coreBalance = coreHaloBalance / 100;
      const shimmer = flickerAmount / 100;
      const time = phase;
      const hazeFlow = time * (0.035 + hazeDrift / 230);
      const densityFlow = time * (0.025 + driftSpeed / 300);
      const sourcePulse = 1 + Math.sin(time * 0.54) * (breathing / 100) * 0.04;

      for (let py = 0; py < layer.canvas.height; py++) {
        for (let px = 0; px < layer.canvas.width; px++) {
          const x = px / scale;
          const y = py / scale;
          const dx = x - sx;
          const dy = y - sy;
          const dist = Math.hypot(dx, dy);
          const index = (py * layer.canvas.width + px) * 4;

          if (dist > maxLen * 1.16) {
            data[index + 3] = 0;
            continue;
          }

          const angle = Math.atan2(dy, dx);
          const t = clamp(dist / maxLen);
          const near = 1 - smoothstep(0.04, 0.28 + sourceSize / 240, t);
          const distanceFade = Math.pow(1 - t, 0.72 + falloff / 48);
          const visibility = computeShaftVisibility({
            angle,
            distance: dist,
            maxLen,
            spread,
            direction: dir,
            sourceSize: sourceSize / 100,
            fieldWidth,
            separation,
            clustering,
            edgeDissolve: edgeDissolve / 100,
            rayCount,
            seeds,
            time,
            noiseScale,
            breakup,
            occlusion,
          });

          const localX = Math.cos(dir) * dx + Math.sin(dir) * dy;
          const localY = -Math.sin(dir) * dx + Math.cos(dir) * dy;
          const low = fbm(localX * 0.0022 + hazeFlow, localY * 0.002 - hazeFlow * 0.7, 4, 4);
          const mid = fbm(localX * (0.006 + noiseScale / 18000) + densityFlow, localY * 0.005, 22, 4);
          const fine = fbm(localX * 0.018 + time * 0.08, localY * 0.014 - time * 0.03, 48, 3);
          const edgeField = fbm(localX * 0.003 + hazeFlow * 0.9, localY * 0.003 + densityFlow * 0.5, 67, 3);
          const fanDelta = Math.abs(angleDelta(angle, dir)) / Math.max(0.001, spread * 0.5);
          const dissolve = edgeDissolve / 100;
          const fanMask = smoothstep(1.08 + (edgeField - 0.5) * 0.34 * dissolve, 0.16 + dissolve * 0.24, fanDelta);
          const farFade = smoothstep(1.08, 0.78 - falloff / 700, t);
          const endpointErosion = smoothstep(1.02, 0.62, t + (1 - mid) * 0.16 * dissolve);
          const medium = densityAmount * lerp(0.52 + low * 0.7, 0.35 + mid * 0.96, breakup * 0.55);
          const micro = lerp(1, 0.86 + fine * 0.28, shimmer);
          const shadow = clamp(1 - visibility.shadow * 0.52);
          const mergedSource = near * fanMask * (0.65 + atmosphere * 0.35);
          const core = visibility.core * (0.48 + coreBalance * 0.66);
          const halo = visibility.halo * (0.72 - coreBalance * 0.22) * (0.8 + feather * 0.35);
          const lightVisibility = (core + halo + mergedSource) * medium * distanceFade * farFade * endpointErosion * shadow * micro * fanMask;
          const hazeOnly = fanMask * atmosphere * densityAmount * distanceFade * farFade * (0.022 + low * 0.035) * fieldDepth / 100;
          const sourceScatter = near * atmosphere * sourceIntensity / 100 * 0.34;
          const alpha = clamp((lightVisibility * scatter * intensity / 100 + hazeOnly + sourceScatter) * sourcePulse);

          const heat = clamp(core * 0.32 + near * 0.44 + bloomWarmth / 260);
          const color = mixRgb(coolMedium, bloomColor, heat);
          data[index] = clamp(color.r * alpha * 1.24, 0, 255);
          data[index + 1] = clamp(color.g * alpha * 1.18, 0, 255);
          data[index + 2] = clamp(color.b * alpha * 1.1, 0, 255);
          data[index + 3] = clamp(alpha * 255, 0, 255);
        }
      }

      fctx.putImageData(image, 0, 0);

      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.filter = `blur(${3.2 + softness / 22}px)`;
      ctx.drawImage(layer.canvas, 0, 0, w, h);
      ctx.filter = `blur(${0.65 + softness / 90}px)`;
      ctx.drawImage(layer.canvas, 0, 0, w, h);
      ctx.filter = 'none';

      drawSourceBloom(ctx, sx, sy, sourceRadius, bloomColor, sourceIntensity / 100, sourceGlow / 100, time);

      const dustTarget = Math.floor((dustAmount / 100) * 120);
      while (dust.length < dustTarget) dust.push(spawnDust(sx, sy, maxLen, dir, spread));
      while (dust.length > dustTarget) dust.pop();

      const dustSpeed = 0.2 + driftSpeed / 86 + turbulenceSpeed / 260;
      for (let i = dust.length - 1; i >= 0; i--) {
        const p = dust[i];
        const eddy = fbm(p.x * 0.006 + time * 0.06, p.y * 0.006 - time * 0.04, i, 3);
        p.x += (p.vx + (eddy - 0.5) * 0.08) * dt * 60 * dustSpeed;
        p.y += p.vy * dt * 60 * dustSpeed;
        p.life -= p.decay;

        if (p.life <= 0) {
          dust[i] = spawnDust(sx, sy, maxLen, dir, spread);
          continue;
        }

        const dx = p.x - sx;
        const dy = p.y - sy;
        const dist = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);
        const fan = smoothstep(1, 0, Math.abs(angleDelta(angle, dir)) / Math.max(0.001, spread * 0.55));
        const fade = 1 - clamp(dist / maxLen);
        const sparkle = 0.55 + fbm(p.x * 0.012, p.y * 0.012 + time * 0.08, i + 8, 3) * 0.55;
        const alpha = p.life * fan * fade * (dustAmount / 100) * atmosphere * sparkle * 0.28;
        drawParticle(ctx, p.x, p.y, p.size * (1.4 + softness / 80), bloomColor, alpha);
      }

      ctx.restore();
    },
  };
}
