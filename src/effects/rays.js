// ─── math helpers ────────────────────────────────────────────────────────────

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
    amp *= 0.5;
    freq *= 2.05;
  }
  return v / norm;
}

// ─── color helpers ────────────────────────────────────────────────────────────

function hexToRgb(hex = '#ffe7a8') {
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

function colorFromTemp(colorTemp, tintHex, variation, warmth) {
  const stops = [
    { at: 0,   rgb: { r: 148, g: 188, b: 255 } },
    { at: 28,  rgb: { r: 200, g: 220, b: 255 } },
    { at: 50,  rgb: { r: 242, g: 244, b: 255 } },
    { at: 72,  rgb: { r: 255, g: 228, b: 168 } },
    { at: 100, rgb: { r: 255, g: 180, b: 72  } },
  ];
  const t = clamp(colorTemp / 100) * 100;
  let lo = stops[0], hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].at && t <= stops[i + 1].at) { lo = stops[i]; hi = stops[i + 1]; break; }
  }
  const f = (t - lo.at) / Math.max(hi.at - lo.at, 0.001);
  const base = mixRgb(lo.rgb, hi.rgb, f);
  const tinted = mixRgb(base, hexToRgb(tintHex), clamp(variation / 100) * 0.55);
  return mixRgb(tinted, { r: 255, g: 244, b: 210 }, clamp(warmth / 100) * 0.28);
}

// ─── offscreen canvas ─────────────────────────────────────────────────────────

function ensureLayer(layer, w, h) {
  const tw = Math.max(1, Math.floor(w));
  const th = Math.max(1, Math.floor(h));
  if (!layer.canvas) {
    layer.canvas = document.createElement('canvas');
    layer.ctx = layer.canvas.getContext('2d');
  }
  if (layer.canvas.width !== tw || layer.canvas.height !== th) {
    layer.canvas.width = tw;
    layer.canvas.height = th;
  }
  layer.ctx.setTransform(1, 0, 0, 1, 0, 0);
  layer.ctx.clearRect(0, 0, tw, th);
  return layer;
}

// ─── shaft seed  ──────────────────────────────────────────────────────────────

function makeShaftSeed(i) {
  return {
    // length multiplier: vary dramatically so shaft tips don't align
    lengthMul:     0.52 + hash(i, i * 3.17,  2) * 0.68,
    // width of this shaft family
    widthMul:      0.45 + hash(i, i * 7.43,  5) * 1.05,
    // per-shaft brightness
    intensity:     0.40 + hash(i, i * 13.1,  8) * 0.88,
    // animation phase offset
    phase:         hash(i, i * 44.8, 14) * Math.PI * 2,
    // which cluster this seed naturally belongs to (used for grouping)
    clusterBias:   hash(i, i * 2.09, 11),
  };
}

// ─── dust particle ────────────────────────────────────────────────────────────

function spawnDust(sx, sy, maxLen, dir, spread) {
  const a = dir + (Math.random() - 0.5) * spread * 1.6;
  const d = Math.pow(Math.random(), 0.46) * maxLen * 0.96;
  return {
    x:     sx + Math.cos(a) * d,
    y:     sy + Math.sin(a) * d,
    vx:    (Math.random() - 0.5) * 0.24,
    vy:   -(0.015 + Math.random() * 0.085),
    life:   0.35 + Math.random() * 0.65,
    decay:  0.001 + Math.random() * 0.0022,
    size:   0.7 + Math.random() * 3.0,
  };
}

// ─── main effect ──────────────────────────────────────────────────────────────

export function createRaysEffect() {
  let phase = 0;
  let dust = [];
  const shaftSeeds = Array.from({ length: 32 }, (_, i) => makeShaftSeed(i));
  const fieldLayer = {}, shaftLayer = {}, hazeLayer = {};

  return {
    reset() {
      phase = 0;
      dust = [];
      [fieldLayer, shaftLayer, hazeLayer].forEach(l => {
        if (l.ctx) l.ctx.clearRect(0, 0, l.canvas.width, l.canvas.height);
      });
    },

    update(ctx, canvas, params, dt) {
      const {
        sourceX         = 50,
        sourceY         = 15,
        direction       = 92,
        spreadAngle     = 50,
        beamLength      = 90,
        beamWidth       = 68,
        sourceGlow      = 82,
        rayCount        = 11,
        intensity       = 76,
        softness        = 86,
        density         = 80,
        falloff         = 78,
        atmosphericHaze = 82,
        edgeFeather     = 88,
        noiseAmount     = 72,
        noiseScale      = 54,
        occlusionGaps   = 56,
        dustAmount      = 58,
        driftSpeed      = 18,
        colorTemp       = 72,
        tintColor       = '#ffe7ad',
        colorVariation  = 24,
        highlightWarmth = 54,
        flickerAmount   = 8,
        drift           = 30,
        breathing       = 18,
        turbulenceSpeed = 22,
      } = params;

      // ── timing ──────────────────────────────────────────────────────────────
      phase += dt * (0.04 + (turbulenceSpeed / 100) * 0.22);

      // ── canvas / offscreen setup ─────────────────────────────────────────────
      const W = canvas.width, H = canvas.height;
      const SCALE = 0.5;

      const field = ensureLayer(fieldLayer, W * SCALE, H * SCALE);
      const shaft = ensureLayer(shaftLayer, W * SCALE, H * SCALE);
      const haze  = ensureLayer(hazeLayer,  W * SCALE, H * SCALE);
      const fctx  = field.ctx, sctx = shaft.ctx, hctx = haze.ctx;

      fctx.scale(SCALE, SCALE);
      sctx.scale(SCALE, SCALE);
      hctx.scale(SCALE, SCALE);

      // ── derived params ───────────────────────────────────────────────────────
      const sx          = W * (sourceX / 100);
      const sy          = H * (sourceY / 100);
      const dir         = (direction * Math.PI) / 180;
      // halfSpread: angular radius of the light field
      const halfSpread  = (spreadAngle / 2 * Math.PI) / 180;
      const maxLen      = Math.hypot(W, H) * (beamLength / 100) * 0.88;
      // fieldW: half-width of the light volume in pixels (perpendicular to dir)
      const fieldW      = Math.min(W, H) * (beamWidth / 100) * 0.82;
      const cosDirX     = Math.cos(dir), sinDirY = Math.sin(dir);
      const perpX       = -sinDirY, perpY = cosDirX;

      const lightRgb    = colorFromTemp(colorTemp, tintColor, colorVariation, highlightWarmth);
      const glowRgb     = mixRgb(lightRgb, { r: 255, g: 252, b: 240 }, 0.45);

      const opa         = clamp(intensity / 100);
      const soft        = clamp(softness  / 100);
      const dens        = clamp(density   / 100);
      const fall        = clamp(falloff   / 100);
      const hazeStr     = clamp(atmosphericHaze / 100);
      const feather     = clamp(edgeFeather / 100);
      const noiseStr    = clamp(noiseAmount / 100);
      const nScale      = 0.7 + (noiseScale / 100) * 2.4;
      const occStr      = clamp(occlusionGaps / 100);
      const driftStr    = clamp(drift / 100);
      const breathAmp   = clamp(breathing / 100) * 0.055;
      const flickAmp    = clamp(flickerAmount / 100) * 0.16;
      const shaftCount  = Math.max(2, Math.round(rayCount));

      // Slow atmospheric drift phase — drives haze motion independently
      const driftPhase  = phase * (0.035 + driftStr * 0.10);
      // Fine turbulence phase — drives per-shaft breakup
      const turbPhase   = phase;

      const flickerVal  = 1 + (valueNoise(phase * 2.6, 1.4, 3) - 0.5) * flickAmp;
      const breathVal   = 1 + Math.sin(phase * 0.62) * breathAmp;
      const globalMod   = opa * flickerVal * breathVal;

      // ── SHAFT CLUSTERING ─────────────────────────────────────────────────────
      // Shafts are arranged in clusters rather than even angular spacing.
      // This creates natural groups with gaps — the "multiple shaft families" look.
      const clusterCount = Math.max(2, Math.ceil(shaftCount / 3.4));

      // Cluster center angles: irregular positions within ±halfSpread
      // (hash-based, not evenly spaced — creates asymmetric grouping)
      const clusterAngles = Array.from({ length: clusterCount }, (_, k) => {
        // Map cluster to spread range with a non-uniform distribution
        const evenSlot = k / clusterCount - 0.5 + 0.5 / clusterCount;
        // Perturb with hash to break regularity; scale by 0.78 to stay well inside spread
        const perturbedSlot = evenSlot + (hash(k, k * 5.31, 99) - 0.5) * 0.30;
        return dir + perturbedSlot * halfSpread * 2.0 * 0.78;
      });

      // Per-shaft angle: cluster center + small within-cluster offset
      const shaftAngles = Array.from({ length: shaftCount }, (_, si) => {
        const seed      = shaftSeeds[si % 32];
        const cIdx      = si % clusterCount;
        // Shafts within a cluster are tight — only 18% of halfSpread spread
        const withinOff = (seed.clusterBias - 0.5) * halfSpread * 0.36;
        return clusterAngles[cIdx] + withinOff;
      });

      // ── 1. ATMOSPHERIC HAZE LAYER ─────────────────────────────────────────────
      // The "medium" that makes light visible. Rendered as a field of FBM-displaced
      // density blobs — NOT a cone fan. Blob positions are perturbed by noise so
      // the boundary dissolves organically and extends slightly beyond the main spread.
      {
        hctx.globalCompositeOperation = 'source-over';

        // Broad near-source glow: the lit atmosphere close to the source is denser
        {
          const glowR = Math.min(W, H) * 0.28 * (1 + hazeStr * 0.4);
          const g = hctx.createRadialGradient(sx, sy, 0, sx, sy, glowR);
          g.addColorStop(0,   rgba(glowRgb, hazeStr * dens * globalMod * 0.18));
          g.addColorStop(0.3, rgba(lightRgb, hazeStr * dens * globalMod * 0.09));
          g.addColorStop(1,   'rgba(0,0,0,0)');
          hctx.fillStyle = g;
          hctx.beginPath();
          hctx.arc(sx, sy, glowR, 0, Math.PI * 2);
          hctx.fill();
        }

        // FBM-placed density blobs across the light volume
        // Use a longitudinal × lateral grid, but with strong FBM lateral perturbation
        // so blobs escape the regular grid → no geometric boundary
        const H_LONG = 10, H_LAT = 7;
        for (let li = 0; li < H_LONG; li++) {
          const tBase = (li + 0.5) / H_LONG;
          const dist  = maxLen * Math.pow(tBase, 0.72);

          // Longitudinal falloff
          const longFall = Math.pow(1 - tBase, 0.38 + fall * 1.6) * smoothstep(tBase * 8);

          for (let ai = 0; ai < H_LAT; ai++) {
            const uBase = (ai + 0.5) / H_LAT - 0.5; // [-0.5, 0.5]

            // FBM lateral perturbation — pushes blobs off the regular grid.
            // This is the key: blobs can land outside the strict spread boundary.
            const perturbFbm = fbm(
              tBase * nScale * 0.9 + driftPhase * 0.20,
              uBase * nScale * 1.8 + ai * 0.37 + driftPhase * 0.13,
              17, 3,
            );
            // Perturb by up to ±55% of fieldW beyond nominal position
            const uPerturbed = uBase + (perturbFbm - 0.5) * noiseStr * 0.7 * Math.sign(uBase || 1);
            const lateralPx  = uPerturbed * fieldW * 2.5;

            // Organic edge falloff: not a Gaussian at a fixed boundary.
            // The effective "edge" shifts with FBM, creating irregular dissolution.
            const lateralNorm  = Math.abs(uPerturbed) * 2; // 0=center, 1=fieldW edge
            const edgeFbm      = fbm(
              lateralNorm * 2.2 + phase * 0.024,
              tBase * 1.6 + li * 0.44,
              23, 2,
            );
            // feather widens the zone where edge noise has influence
            const edgeThreshold = 1.0 - feather * 0.55;
            const angEnv = smoothstep(
              clamp(1 - lateralNorm * edgeThreshold + edgeFbm * noiseStr * 0.38),
            );
            if (angEnv < 0.012) continue;

            // Density FBM (independent layer — varies with atmospheric drift)
            const densN = fbm(
              tBase * nScale * 1.3 + driftPhase * 0.24,
              uPerturbed * nScale * 2.2 + driftPhase * 0.17,
              7, 3,
            );

            const wx    = sx + cosDirX * dist + perpX * lateralPx;
            const wy    = sy + sinDirY * dist + perpY * lateralPx;
            const blobR = fieldW * (0.20 + soft * 0.25) * (0.55 + densN * 0.85);
            if (blobR < 1.5) continue;

            const noiseMod = lerp(1, lerp(0.42, 1, densN), noiseStr);
            const alpha = globalMod * hazeStr * dens * longFall * angEnv * noiseMod * 0.062;
            if (alpha < 0.004) continue;

            const g = hctx.createRadialGradient(wx, wy, 0, wx, wy, blobR);
            g.addColorStop(0,   rgba(lightRgb, alpha));
            g.addColorStop(0.45, rgba(lightRgb, alpha * 0.38));
            g.addColorStop(1,   'rgba(0,0,0,0)');
            hctx.fillStyle = g;
            hctx.beginPath();
            hctx.arc(wx, wy, blobR, 0, Math.PI * 2);
            hctx.fill();
          }
        }
      }

      // ── 2. SHAFT FIELD LAYER ──────────────────────────────────────────────────
      // Clustered shaft families drawn as blob chains.
      // Key differences from "polygon strips":
      //   • Each shaft is a sequence of overlapping radial-gradient blobs
      //   • Blob radius varies with noise → natural width variation along shaft
      //   • Shaft lengths vary (0.52–1.20×) so tips don't form a clean arc
      //   • Angular edge uses FBM-shifted falloff → no hard boundary
      //   • Occlusion FBM creates dark channel gaps through shafts
      //   • Edge-scatter blobs placed just beyond spread → atmospheric bleed
      {
        fctx.globalCompositeOperation = 'lighter';

        for (let si = 0; si < shaftCount; si++) {
          const seed       = shaftSeeds[si % 32];
          const shaftAngle = shaftAngles[si];
          const shaftLen   = maxLen * seed.lengthMul;
          // base width at midpoint; varies per seed
          const shaftW     = fieldW * seed.widthMul * 0.16 * (0.45 + soft * 0.75);

          // How far this shaft is from the beam center (angular deviation)
          const angDev     = Math.abs(shaftAngle - dir);

          // Angular envelope: FBM-perturbed so edge is organic, not a fixed cutoff.
          // The effective spread varies slightly per shaft and over time.
          const edgeFbmA = fbm(
            angDev * 2.4 + phase * 0.022,
            si * 0.53 + phase * 0.008,
            seed.phase + 31, 2,
          );
          // Wider feather = edge FBM has more influence = softer/more irregular boundary
          const effectiveHalf = halfSpread * (0.92 + feather * 0.32 + edgeFbmA * noiseStr * 0.30);
          const angEnvShaft   = smoothstep(clamp(1 - angDev / effectiveHalf));
          if (angEnvShaft < 0.015) continue;

          const BLOBS = 20;
          for (let b = 0; b < BLOBS; b++) {
            const t  = (b + 0.5) / BLOBS;

            // Longitudinal falloff: exponential × smooth ramp-up near source
            const longFall = Math.pow(1 - t, 0.42 + fall * 2.2) * smoothstep(t * 9);

            // Density noise along shaft axis (slow drift = atmospheric density shift)
            const densN = fbm(
              t * nScale * 1.7 + driftPhase * 0.16,
              si * 0.69 + driftPhase * 0.09,
              seed.phase, 3,
            );

            // Occlusion: independent FBM layer creates dark gaps/channels
            const occN = fbm(
              t * nScale * 3.4 + turbPhase * 0.13,
              si * 1.21 + turbPhase * 0.08,
              seed.phase + 17, 2,
            );
            // Threshold-based gap with smooth transition (not hard cutoff)
            const occMask = lerp(1, smoothstep(clamp((occN - 0.24) / 0.66)), occStr);

            if (longFall * occMask * angEnvShaft < 0.012) continue;

            const wx = sx + Math.cos(shaftAngle) * shaftLen * t;
            const wy = sy + Math.sin(shaftAngle) * shaftLen * t;

            // Blob radius: tapers at source and tip, peaks around t=0.4–0.6
            // FBM adds organic width variation along the shaft
            const blobR = shaftW
              * Math.pow(t, 0.50) * (1 - t * 0.28)
              * (0.65 + densN * 0.80);
            if (blobR < 1.0) continue;

            const noiseMod = lerp(1, lerp(0.42, 1, densN), noiseStr);
            const alpha = globalMod * dens * seed.intensity
                        * longFall * angEnvShaft * occMask * noiseMod
                        * 0.090;
            if (alpha < 0.002) continue;

            const blobRgb = mixRgb(lightRgb, glowRgb, (1 - t) * 0.35);
            const g = fctx.createRadialGradient(wx, wy, 0, wx, wy, blobR);
            g.addColorStop(0,    rgba(blobRgb, alpha));
            g.addColorStop(0.38, rgba(lightRgb, alpha * 0.50));
            g.addColorStop(1,    'rgba(0,0,0,0)');
            fctx.fillStyle = g;
            fctx.beginPath();
            fctx.arc(wx, wy, blobR, 0, Math.PI * 2);
            fctx.fill();
          }
        }

        // Edge-scatter blobs: very dim atmospheric light slightly beyond the spread.
        // These break the hard cone silhouette — the "edge" becomes a dissolving haze.
        // Positions are stable (hash-based) but visibility is FBM-animated.
        const SCATTER = Math.round(shaftCount * 1.8);
        for (let s = 0; s < SCATTER; s++) {
          const tS    = Math.pow(hash(s, s * 3.1, 55), 0.75);
          const side  = hash(s * 2, s, 66) > 0.5 ? 1 : -1;
          // Place just outside the main spread: 0.88–1.38× halfSpread
          const angExcess = halfSpread * (0.88 + hash(s * 3, s + 1, 88) * 0.50);
          const angS  = dir + side * angExcess;
          const distS = maxLen * tS;
          const wS    = sx + Math.cos(angS) * distS;
          const hS    = sy + Math.sin(angS) * distS;

          // FBM-animated visibility (position is fixed, density is animated)
          const visN = fbm(
            tS * nScale * 1.4 + driftPhase * 0.22,
            s * 0.51 + driftPhase * 0.15,
            55, 2,
          );
          const longFall   = Math.pow(1 - tS, 0.5 + fall * 1.5);
          const scatterAlpha = globalMod * hazeStr * dens * longFall
                             * lerp(0.25, 0.85, visN) * noiseStr * 0.028;
          if (scatterAlpha < 0.003) continue;

          const scatterR = fieldW * (0.10 + soft * 0.13);
          const g = fctx.createRadialGradient(wS, hS, 0, wS, hS, scatterR);
          g.addColorStop(0,  rgba(lightRgb, scatterAlpha));
          g.addColorStop(1,  'rgba(0,0,0,0)');
          fctx.fillStyle = g;
          fctx.beginPath();
          fctx.arc(wS, hS, scatterR, 0, Math.PI * 2);
          fctx.fill();
        }
      }

      // ── 3. FINE SHAFT RIDGE LAYER ─────────────────────────────────────────────
      // A lighter pass of narrower, slightly brighter blobs for the top-intensity shafts.
      // This adds the subtle "ridge" that makes a shaft feel like it has depth,
      // without creating visible hard lines.
      {
        sctx.globalCompositeOperation = 'lighter';

        // Only render the top half of shafts by intensity (avoids overbuilt feel)
        const sortedIndices = Array.from({ length: shaftCount }, (_, i) => i)
          .sort((a, b) => shaftSeeds[b % 32].intensity - shaftSeeds[a % 32].intensity)
          .slice(0, Math.max(2, Math.ceil(shaftCount / 2)));

        for (const si of sortedIndices) {
          const seed       = shaftSeeds[si % 32];
          const shaftAngle = shaftAngles[si];
          const shaftLen   = maxLen * seed.lengthMul;
          const ridgeW     = fieldW * seed.widthMul * 0.055 * (0.4 + soft * 0.5);

          const angDev     = Math.abs(shaftAngle - dir);
          const edgeFbmR   = fbm(angDev * 2.8 + phase * 0.018, si * 0.47 + phase * 0.006, seed.phase + 41, 2);
          const effectiveH = halfSpread * (0.92 + feather * 0.28 + edgeFbmR * noiseStr * 0.25);
          const angEnvRidge = smoothstep(clamp(1 - angDev / effectiveH));
          if (angEnvRidge < 0.02) continue;

          const RIDGE_BLOBS = 14;
          for (let b = 0; b < RIDGE_BLOBS; b++) {
            const t        = (b + 0.5) / RIDGE_BLOBS;
            const longFall = Math.pow(1 - t, 0.45 + fall * 2.1) * smoothstep(t * 8);

            const densN = fbm(
              t * nScale * 1.9 + driftPhase * 0.14,
              si * 0.73 + driftPhase * 0.07,
              seed.phase + 5, 2,
            );
            const occN  = fbm(
              t * nScale * 3.5 + turbPhase * 0.14,
              si * 1.28 + turbPhase * 0.07,
              seed.phase + 22, 2,
            );
            const occMask = lerp(1, smoothstep(clamp((occN - 0.22) / 0.68)), occStr);

            const wx = sx + Math.cos(shaftAngle) * shaftLen * t;
            const wy = sy + Math.sin(shaftAngle) * shaftLen * t;

            const blobR = ridgeW * Math.pow(t, 0.48) * (1 - t * 0.30) * (0.6 + densN * 0.8);
            if (blobR < 0.8) continue;

            const noiseMod = lerp(1, lerp(0.44, 1, densN), noiseStr);
            const alpha = globalMod * dens * seed.intensity * 0.82
                        * longFall * angEnvRidge * occMask * noiseMod * 0.095;
            if (alpha < 0.003) continue;

            const g = sctx.createRadialGradient(wx, wy, 0, wx, wy, blobR);
            g.addColorStop(0,    rgba(glowRgb, alpha));
            g.addColorStop(0.32, rgba(lightRgb, alpha * 0.55));
            g.addColorStop(1,    'rgba(0,0,0,0)');
            sctx.fillStyle = g;
            sctx.beginPath();
            sctx.arc(wx, wy, blobR, 0, Math.PI * 2);
            sctx.fill();
          }
        }
      }

      // ── 4. COMPOSITE TO MAIN CANVAS ──────────────────────────────────────────
      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      // Haze: very heavy blur — the diffuse atmospheric medium
      ctx.filter = `blur(${20 + soft * 26}px)`;
      ctx.drawImage(haze.canvas, 0, 0, W, H);

      // Field: medium blur — shaft families
      ctx.filter = `blur(${10 + soft * 18}px)`;
      ctx.drawImage(field.canvas, 0, 0, W, H);

      // Field again at larger blur: soft halo around each shaft cluster
      ctx.filter = `blur(${22 + soft * 24}px)`;
      ctx.globalAlpha = 0.35;
      ctx.drawImage(field.canvas, 0, 0, W, H);
      ctx.globalAlpha = 1;

      // Shaft ridges: light blur — subtle bright cores
      ctx.filter = `blur(${3 + soft * 9}px)`;
      ctx.drawImage(shaft.canvas, 0, 0, W, H);

      // Shaft ridges second pass at medium blur: aureole around each ridge
      ctx.filter = `blur(${10 + soft * 14}px)`;
      ctx.globalAlpha = 0.4;
      ctx.drawImage(shaft.canvas, 0, 0, W, H);
      ctx.globalAlpha = 1;

      ctx.filter = 'none';

      // ── 5. SOURCE BLOOM ───────────────────────────────────────────────────────
      if (sourceGlow > 2) {
        const glowStr = (sourceGlow / 100) * globalMod;
        const baseR   = Math.min(W, H);

        // Hot white core
        const r0 = baseR * (0.035 + glowStr * 0.055);
        const g0 = ctx.createRadialGradient(sx, sy, 0, sx, sy, r0);
        g0.addColorStop(0,    `rgba(255,255,252,${clamp(glowStr * opa * 0.98).toFixed(4)})`);
        g0.addColorStop(0.35, rgba(glowRgb, glowStr * opa * 0.58));
        g0.addColorStop(1,    'rgba(0,0,0,0)');
        ctx.fillStyle = g0;
        ctx.beginPath(); ctx.arc(sx, sy, r0, 0, Math.PI * 2); ctx.fill();

        // Warm mid-range aureole
        const r1 = baseR * (0.09 + glowStr * 0.17);
        const g1 = ctx.createRadialGradient(sx, sy, r0 * 0.25, sx, sy, r1);
        g1.addColorStop(0,    rgba(lightRgb, glowStr * opa * 0.40));
        g1.addColorStop(0.55, rgba(lightRgb, glowStr * opa * 0.12));
        g1.addColorStop(1,    'rgba(0,0,0,0)');
        ctx.fillStyle = g1;
        ctx.beginPath(); ctx.arc(sx, sy, r1, 0, Math.PI * 2); ctx.fill();

        // Wide directional scatter — elongated along beam axis
        const r2 = baseR * (0.20 + glowStr * 0.26);
        ctx.save();
        ctx.translate(sx + cosDirX * r2 * 0.10, sy + sinDirY * r2 * 0.10);
        ctx.rotate(dir);
        ctx.scale(1.55 + soft * 0.35, 0.52 + soft * 0.32);
        const g2 = ctx.createRadialGradient(0, 0, 0, 0, 0, r2);
        g2.addColorStop(0,    rgba(lightRgb, glowStr * opa * 0.20));
        g2.addColorStop(0.55, rgba(lightRgb, glowStr * opa * 0.06));
        g2.addColorStop(1,    'rgba(0,0,0,0)');
        ctx.fillStyle = g2;
        ctx.beginPath(); ctx.arc(0, 0, r2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      // ── 6. DUST / PARTICULATE ─────────────────────────────────────────────────
      // More visible than before — the medium should be actively seen.
      {
        const dustTarget = Math.floor((dustAmount / 100) * 200);
        const spread2    = halfSpread * 2;
        while (dust.length < dustTarget) dust.push(spawnDust(sx, sy, maxLen, dir, spread2));
        while (dust.length > dustTarget) dust.pop();

        const dSpeed = 0.28 + (driftSpeed / 100) * 0.95;

        for (let i = dust.length - 1; i >= 0; i--) {
          const p = dust[i];
          p.x += p.vx * dt * 60 * dSpeed;
          p.y += p.vy * dt * 60 * dSpeed;
          p.life -= p.decay;
          if (p.life <= 0) {
            dust[i] = spawnDust(sx, sy, maxLen, dir, spread2);
            continue;
          }

          const dx = p.x - sx, dy = p.y - sy;
          const dist = Math.hypot(dx, dy);
          const ang  = Math.atan2(dy, dx);
          const angD = Math.abs(Math.atan2(Math.sin(ang - dir), Math.cos(ang - dir)));
          // Slightly wider than halfSpread so particles populate the edge zone
          const angInside  = smoothstep(1 - clamp(angD / (halfSpread * 0.9 + 0.15)));
          const distFade   = 1 - clamp(dist / maxLen);
          const alpha = p.life * angInside * distFade * (dustAmount / 100) * opa * 0.36;
          if (alpha < 0.006) continue;

          const dr = p.size * (1.6 + soft * 1.3);
          const dg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, dr);
          dg.addColorStop(0,    rgba(lightRgb, alpha));
          dg.addColorStop(0.45, rgba(lightRgb, alpha * 0.28));
          dg.addColorStop(1,    'rgba(0,0,0,0)');
          ctx.fillStyle = dg;
          ctx.beginPath(); ctx.arc(p.x, p.y, dr, 0, Math.PI * 2); ctx.fill();
        }
      }

      ctx.restore();
    },
  };
}
