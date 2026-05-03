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

// multi-octave FBM — 4 octaves, tunable lacunarity/gain
function fbm(x, y, seed = 0, octaves = 4, lacunarity = 2.05, gain = 0.5) {
  let v = 0, amp = 0.56, freq = 1, norm = 0;
  for (let i = 0; i < octaves; i++) {
    v += valueNoise(x * freq, y * freq, seed + i * 13.7) * amp;
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
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

// Perceptual color temperature: cool blue → neutral white → warm gold
function colorFromTemp(colorTemp, tintHex, variation, warmth) {
  const stops = [
    { at: 0,   rgb: { r: 148, g: 188, b: 255 } }, // moonlight blue
    { at: 28,  rgb: { r: 200, g: 220, b: 255 } }, // cool daylight
    { at: 50,  rgb: { r: 242, g: 244, b: 255 } }, // neutral white
    { at: 72,  rgb: { r: 255, g: 228, b: 168 } }, // warm afternoon
    { at: 100, rgb: { r: 255, g: 180, b: 72  } }, // golden hour
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

// ─── offscreen canvas helpers ─────────────────────────────────────────────────

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

// ─── shaft family seeds ───────────────────────────────────────────────────────

function makeShaftSeed(i) {
  // deterministic but visually irregular
  const h1 = hash(i, i * 3.17, 2);
  const h2 = hash(i, i * 7.43, 5);
  const h3 = hash(i, i * 13.1, 8);
  const h4 = hash(i, i * 2.09, 11);
  return {
    // lateral offset within spread, in [-1, 1]
    slot: (h1 - 0.5) * 2,
    // width multiplier
    width: 0.28 + h2 * 1.1,
    // intensity multiplier
    intensity: 0.38 + h3 * 0.88,
    // length multiplier
    length: 0.78 + h4 * 0.42,
    // animation phase offset
    phase: hash(i, i * 44.8, 14) * Math.PI * 2,
    // cross-fade / grouping seed
    group: Math.floor(h2 * 3),
  };
}

// ─── dust particle ────────────────────────────────────────────────────────────

function spawnDust(sx, sy, maxLen, dir, spread) {
  const a = dir + (Math.random() - 0.5) * spread * 1.4;
  const d = Math.pow(Math.random(), 0.52) * maxLen * 0.92;
  return {
    x: sx + Math.cos(a) * d,
    y: sy + Math.sin(a) * d,
    vx: (Math.random() - 0.5) * 0.22,
    vy: -(0.02 + Math.random() * 0.10),
    life: 0.3 + Math.random() * 0.7,
    decay: 0.0012 + Math.random() * 0.0022,
    size: 0.6 + Math.random() * 2.2,
  };
}

// ─── main effect ──────────────────────────────────────────────────────────────

export function createRaysEffect() {
  let phase = 0;
  let dust = [];

  // 32 shaft seeds — more than we'll ever draw, indexed modulo
  const shaftSeeds = Array.from({ length: 32 }, (_, i) => makeShaftSeed(i));

  // offscreen layers for multi-pass rendering
  const fieldLayer  = {};  // broad volumetric light field
  const shaftLayer  = {};  // internal shaft ridges
  const hazeLayer   = {};  // atmospheric haze / scatter

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
        sourceX          = 50,
        sourceY          = 15,
        direction        = 92,
        spreadAngle      = 50,
        beamLength       = 90,
        beamWidth        = 68,
        sourceGlow       = 82,
        rayCount         = 11,
        intensity        = 76,
        softness         = 86,
        density          = 80,
        falloff          = 78,
        atmosphericHaze  = 82,
        edgeFeather      = 88,
        noiseAmount      = 72,
        noiseScale       = 54,
        occlusionGaps    = 56,
        dustAmount       = 58,
        driftSpeed       = 18,
        colorTemp        = 72,
        tintColor        = '#ffe7ad',
        colorVariation   = 24,
        highlightWarmth  = 54,
        flickerAmount    = 8,
        drift            = 30,
        breathing        = 18,
        turbulenceSpeed  = 22,
      } = params;

      // ── timing ──────────────────────────────────────────────────────────────
      const turbRate = 0.06 + (turbulenceSpeed / 100) * 0.28;
      phase += dt * turbRate;

      // ── canvas geometry ──────────────────────────────────────────────────────
      const W = canvas.width;
      const H = canvas.height;

      // offscreen scale — balance quality vs cost
      const SCALE = 0.5;
      const fw = W * SCALE, fh = H * SCALE;

      const field  = ensureLayer(fieldLayer,  fw, fh);
      const shaft  = ensureLayer(shaftLayer,  fw, fh);
      const haze   = ensureLayer(hazeLayer,   fw, fh);
      const fctx   = field.ctx;
      const sctx   = shaft.ctx;
      const hctx   = haze.ctx;

      // apply scale transform to all three offscreen contexts
      fctx.scale(SCALE, SCALE);
      sctx.scale(SCALE, SCALE);
      hctx.scale(SCALE, SCALE);

      // ── derived params ───────────────────────────────────────────────────────
      const sx         = W * (sourceX / 100);
      const sy         = H * (sourceY / 100);
      const dir        = (direction * Math.PI) / 180;
      const halfSpread = (spreadAngle * Math.PI) / 180 * 0.5;
      const maxLen     = Math.hypot(W, H) * (beamLength / 100) * 0.88;

      // base field width: independent of spread — controls volumetric cylinder width
      const fieldWidthPx = Math.min(W, H) * (beamWidth / 100) * 0.85;

      const lightRgb   = colorFromTemp(colorTemp, tintColor, colorVariation, highlightWarmth);
      // slightly cooler/desaturated variant for shadow intervals
      const shadowRgb  = mixRgb(lightRgb, { r: 155, g: 175, b: 210 }, 0.35);

      const opa        = clamp(intensity / 100);
      const soft       = clamp(softness / 100);
      const dens       = clamp(density / 100);
      const fall       = clamp(falloff / 100);
      const hazeStr    = clamp(atmosphericHaze / 100);
      const feather    = clamp(edgeFeather / 100);
      const noiseStr   = clamp(noiseAmount / 100);
      const nScale     = 0.8 + (noiseScale / 100) * 2.2;
      const occStr     = clamp(occlusionGaps / 100);
      const driftStr   = clamp(drift / 100);
      const breathAmp  = clamp(breathing / 100) * 0.06;
      const flickAmp   = clamp(flickerAmount / 100) * 0.14;
      const shaftCount = Math.max(2, Math.round(rayCount));

      // global flicker: low-frequency noise driven
      const flickerVal = 1 + (valueNoise(phase * 2.8, 1.3, 3) - 0.5) * flickAmp;
      // breathing: slow sinusoidal intensity pulse
      const breathVal  = 1 + Math.sin(phase * 0.7) * breathAmp;
      const globalMod  = opa * flickerVal * breathVal;

      // ── perpendicular axis helpers ───────────────────────────────────────────
      const cosDirX = Math.cos(dir);
      const sinDirY = Math.sin(dir);
      const perpX   = -sinDirY;   // unit perpendicular to dir
      const perpY   =  cosDirX;

      // ── 1. ATMOSPHERIC HAZE LAYER ────────────────────────────────────────────
      // A broad soft radial field — the "medium that makes light visible"
      // Drawn in the direction of light travel with elliptical falloff
      {
        hctx.save();
        hctx.globalCompositeOperation = 'source-over';

        // primary haze volume: elongated radial gradient along beam axis
        const hazeR = maxLen * 0.95;
        const hazeW = fieldWidthPx * (1.4 + soft * 0.6);

        // transform to beam-local space for elliptical gradient
        hctx.translate(sx + cosDirX * hazeR * 0.35, sy + sinDirY * hazeR * 0.35);
        hctx.rotate(dir);
        hctx.scale(1, hazeW / Math.max(hazeR, 1));

        const hg = hctx.createRadialGradient(0, 0, 0, 0, 0, hazeR);
        const hazeAlpha = hazeStr * dens * globalMod;
        hg.addColorStop(0,    rgba(lightRgb, hazeAlpha * 0.22));
        hg.addColorStop(0.18, rgba(lightRgb, hazeAlpha * 0.14));
        hg.addColorStop(0.55, rgba(shadowRgb, hazeAlpha * 0.06));
        hg.addColorStop(1,    'rgba(0,0,0,0)');
        hctx.fillStyle = hg;
        hctx.beginPath();
        hctx.ellipse(0, 0, hazeR, hazeR, 0, 0, Math.PI * 2);
        hctx.fill();
        hctx.restore();

        // secondary angular feathering: angular density falloff from beam center
        hctx.save();
        hctx.globalCompositeOperation = 'source-over';
        // angular haze fan — much softer spread with strong feathered edge
        const fanR = maxLen * 1.05;
        const angHazeAlpha = hazeStr * dens * globalMod * (0.07 + feather * 0.06);
        // draw as a blurred wedge: step through angular slices
        const fanSlices = 18;
        for (let s = 0; s < fanSlices; s++) {
          const t0 = s / fanSlices, t1 = (s + 1) / fanSlices;
          const a0 = dir - halfSpread * (1 + feather * 0.7) + t0 * halfSpread * 2 * (1 + feather * 0.7);
          const a1 = dir - halfSpread * (1 + feather * 0.7) + t1 * halfSpread * 2 * (1 + feather * 0.7);
          const angDist = Math.abs((t0 + t1) * 0.5 - 0.5) * 2; // 0=center, 1=edge
          const edgeFade = smoothstep(1 - angDist * (1 - feather * 0.5));
          if (edgeFade < 0.004) continue;
          hctx.beginPath();
          hctx.moveTo(sx, sy);
          hctx.arc(sx, sy, fanR, a0, a1);
          hctx.closePath();
          hctx.fillStyle = rgba(lightRgb, angHazeAlpha * edgeFade);
          hctx.fill();
        }
        hctx.restore();
      }

      // ── 2. BROAD VOLUMETRIC FIELD ────────────────────────────────────────────
      // Sample-based density field: for each of R radial slices × A angular slices,
      // compute an FBM-modulated density and stamp a soft elliptical blob.
      // This creates the broad non-geometric light volume.
      {
        fctx.globalCompositeOperation = 'lighter';
        const RADIAL_STEPS = 28;
        const ANG_STEPS    = 20;
        const driftPhase   = phase * (0.08 + driftStr * 0.18);

        for (let ri = 0; ri < RADIAL_STEPS; ri++) {
          const tRaw = (ri + 0.5) / RADIAL_STEPS;
          const t    = Math.pow(tRaw, 0.72); // bias samples toward source
          const dist = maxLen * t;

          // longitudinal falloff: exponential × smooth
          const longFall = Math.pow(1 - t, 0.45 + fall * 2.2) * smoothstep(t * 12);

          for (let ai = 0; ai < ANG_STEPS; ai++) {
            const uRaw   = (ai + 0.5) / ANG_STEPS - 0.5;   // [-0.5, +0.5]
            const angOff = uRaw * halfSpread * 2;
            const beamAng = dir + angOff;

            // ── angular density: Gaussian envelope + feathered edges ──
            const edgeU = Math.abs(uRaw) * 2;                // 0 = centre, 1 = edge
            const angEnv = Math.exp(-edgeU * edgeU * (3.5 + feather * 2.5));
            if (angEnv < 0.008) continue;

            // ── world position of this sample ──
            const wx = sx + Math.cos(beamAng) * dist;
            const wy = sy + Math.sin(beamAng) * dist;

            // ── FBM modulation: low-frequency density variance ──
            const ns = fbm(
              tRaw * nScale * 1.2 + driftPhase * 0.22,
              uRaw * nScale * 2.4 + ai * 0.41 + driftPhase * 0.12,
              7, 3,
            );

            // ── occlusion: independent FBM layer creates dark channels ──
            const occ = fbm(
              tRaw * nScale * 2.1 + driftPhase * 0.18,
              uRaw * nScale * 3.8 + ai * 0.77 + phase * 0.09,
              13, 3, 2.1, 0.48,
            );
            const occMask = lerp(1, smoothstep((occ - 0.25) / 0.65), occStr * 0.85);

            // ── field blob width at this sample ──
            const blobW = fieldWidthPx * (0.068 + soft * 0.032) * (1 + t * 0.3) * (0.7 + ns * 0.55);
            if (blobW < 1) continue;

            // ── sample alpha ──
            // at noiseAmount=0: uniform field; at 100: strongly FBM-modulated
            const noiseMod = lerp(1, lerp(0.55, 1, ns), noiseStr);
            const alpha = globalMod * dens * longFall * angEnv * occMask * noiseMod * 0.042;
            if (alpha < 0.001) continue;

            const blobGrad = fctx.createRadialGradient(wx, wy, 0, wx, wy, blobW);
            blobGrad.addColorStop(0,   rgba(lightRgb, alpha));
            blobGrad.addColorStop(0.5, rgba(lightRgb, alpha * 0.38));
            blobGrad.addColorStop(1,   'rgba(0,0,0,0)');
            fctx.fillStyle = blobGrad;
            fctx.beginPath();
            fctx.arc(wx, wy, blobW, 0, Math.PI * 2);
            fctx.fill();
          }
        }
      }

      // ── 3. INTERNAL SHAFT RIDGES ─────────────────────────────────────────────
      // Narrower, brighter shaft families that live inside the broad field.
      // Each shaft is a chain of overlapping segments, not a hard line.
      {
        sctx.globalCompositeOperation = 'lighter';

        const shaftDriftPhase = phase * (0.06 + driftStr * 0.14);

        for (let si = 0; si < shaftCount; si++) {
          const seed   = shaftSeeds[si % shaftSeeds.length];
          // place shaft within spread using seed slot + even distribution
          const slotBase = shaftCount > 1 ? (si / (shaftCount - 1) - 0.5) : 0;
          const slotDrift = Math.sin(phase * (0.18 + driftStr * 0.22) + seed.phase) * driftStr * 0.12;
          const slot   = slotBase * 0.88 + seed.slot * 0.12 + slotDrift;

          // shaft direction: within spread, with subtle animated wander
          const shaftAngle = dir + slot * halfSpread * 1.85;

          // shaft length modulated by seed + breathing
          const shaftLen = maxLen * seed.length * breathVal;

          // shaft width — narrower than field, varies per seed
          const shaftW = fieldWidthPx * seed.width * 0.22 * (0.5 + soft * 0.7);

          // shaft intensity — vary meaningfully so some are dominant, some subtle
          const shaftOpa = globalMod * dens * seed.intensity;

          // angular envelope: how far this shaft is from field center
          const angFrac  = Math.abs(slot); // 0 = center, ~1 = edge
          const angFade  = smoothstep(1 - angFrac * (1.1 - feather * 0.5));
          if (angFade < 0.01) continue;

          // per-shaft noise sample along its axis
          const shaftNsSeed = seed.phase;

          const SEGS = 22;
          for (let seg = 0; seg < SEGS; seg++) {
            const t0 = seg / SEGS;
            const t1 = (seg + 1) / SEGS;
            const tm = (t0 + t1) * 0.5;

            // longitudinal falloff
            const longFall = Math.pow(1 - tm, 0.5 + fall * 2.0) * smoothstep(tm * 10);

            // FBM density along shaft — creates breaks and intensity ridges
            const ns = fbm(
              tm * nScale * 1.8 + shaftDriftPhase * 0.14,
              si * 0.83 + shaftDriftPhase * 0.09,
              shaftNsSeed, 3,
            );
            // occlusion breaks
            const occ = fbm(
              tm * nScale * 3.1 + phase * 0.11,
              si * 1.24 + phase * 0.07,
              shaftNsSeed + 17, 2,
            );
            const occMask = lerp(1, smoothstep((occ - 0.18) / 0.72), occStr);

            // noiseStr controls how strongly FBM modulates shaft brightness (not a gate)
            const noiseMod  = lerp(1, lerp(0.45, 1.0, ns), noiseStr);
            const segAlpha  = shaftOpa * angFade * longFall * occMask * noiseMod * 0.11;
            if (segAlpha < 0.002) continue;

            const wx0 = sx + Math.cos(shaftAngle) * shaftLen * t0;
            const wy0 = sy + Math.sin(shaftAngle) * shaftLen * t0;
            const wx1 = sx + Math.cos(shaftAngle) * shaftLen * t1;
            const wy1 = sy + Math.sin(shaftAngle) * shaftLen * t1;

            // segment width tapers from 0 at source → max → tapers at tip
            const tapW  = shaftW * Math.pow(tm, 0.55) * (1 - tm * 0.25);
            const halfW = Math.max(tapW * 0.5, 1.5);

            // draw as a lateral gradient quad: bright center, feathered edges
            // use 3 sub-lanes so we get the cross-profile
            const LANES = 5;
            for (let lane = 0; lane < LANES; lane++) {
              const u0 = (lane / LANES - 0.5);
              const u1 = ((lane + 1) / LANES - 0.5);
              const um = (u0 + u1) * 0.5;
              const edge = Math.abs(um) * 2;
              const coreProfile = Math.pow(1 - edge, 1.8 + feather * 2.4);
              if (coreProfile < 0.005) continue;

              const laneAlpha = segAlpha * coreProfile;

              const lx0a = wx0 + perpX * halfW * 2 * u0;
              const ly0a = wy0 + perpY * halfW * 2 * u0;
              const lx0b = wx0 + perpX * halfW * 2 * u1;
              const ly0b = wy0 + perpY * halfW * 2 * u1;
              const lx1a = wx1 + perpX * halfW * 2 * u0;
              const ly1a = wy1 + perpY * halfW * 2 * u0;
              const lx1b = wx1 + perpX * halfW * 2 * u1;
              const ly1b = wy1 + perpY * halfW * 2 * u1;

              // lighter color toward center lane
              const laneRgb = mixRgb(lightRgb, { r: 255, g: 252, b: 240 }, coreProfile * 0.35);
              sctx.fillStyle = rgba(laneRgb, laneAlpha * 0.13);
              sctx.beginPath();
              sctx.moveTo(lx0a, ly0a);
              sctx.lineTo(lx0b, ly0b);
              sctx.lineTo(lx1b, ly1b);
              sctx.lineTo(lx1a, ly1a);
              sctx.closePath();
              sctx.fill();
            }
          }
        }
      }

      // ── 4. COMPOSITE TO MAIN CANVAS ─────────────────────────────────────────
      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      // haze: heaviest blur — the "medium" layer
      const hazeBlur = 16 + soft * 28;
      ctx.filter = `blur(${hazeBlur}px)`;
      ctx.drawImage(haze.canvas, 0, 0, W, H);

      // field: medium blur — volumetric body
      const fieldBlur = 12 + soft * 20;
      ctx.filter = `blur(${fieldBlur}px)`;
      ctx.drawImage(field.canvas, 0, 0, W, H);

      // shafts: light blur only — preserve shaft readability
      const shaftBlur = 3 + soft * 10;
      ctx.filter = `blur(${shaftBlur}px)`;
      ctx.drawImage(shaft.canvas, 0, 0, W, H);

      // second shaft pass at slightly larger blur for soft aureole
      ctx.filter = `blur(${shaftBlur + 6 + soft * 8}px)`;
      ctx.globalAlpha = 0.45;
      ctx.drawImage(shaft.canvas, 0, 0, W, H);
      ctx.globalAlpha = 1;

      ctx.filter = 'none';

      // ── 5. SOURCE BLOOM ─────────────────────────────────────────────────────
      // Multi-ring bloom: tight hot core → warm aureole → wide scatter
      if (sourceGlow > 2) {
        const glowStr = (sourceGlow / 100) * globalMod;
        const baseR   = Math.min(W, H);

        // hot inner core
        const r0 = baseR * (0.04 + glowStr * 0.06);
        const g0 = ctx.createRadialGradient(sx, sy, 0, sx, sy, r0);
        g0.addColorStop(0,   `rgba(255,255,252,${clamp(glowStr * opa * 0.95)})`);
        g0.addColorStop(0.4, rgba(lightRgb, glowStr * opa * 0.55));
        g0.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = g0;
        ctx.beginPath(); ctx.arc(sx, sy, r0, 0, Math.PI * 2); ctx.fill();

        // warm aureole
        const r1 = baseR * (0.10 + glowStr * 0.16);
        const g1 = ctx.createRadialGradient(sx, sy, r0 * 0.3, sx, sy, r1);
        g1.addColorStop(0,   rgba(lightRgb, glowStr * opa * 0.38));
        g1.addColorStop(0.5, rgba(mixRgb(lightRgb, shadowRgb, 0.2), glowStr * opa * 0.12));
        g1.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = g1;
        ctx.beginPath(); ctx.arc(sx, sy, r1, 0, Math.PI * 2); ctx.fill();

        // wide directional scatter: elongated along beam axis
        const r2 = baseR * (0.22 + glowStr * 0.28);
        ctx.save();
        ctx.translate(sx + cosDirX * r2 * 0.12, sy + sinDirY * r2 * 0.12);
        ctx.rotate(dir);
        ctx.scale(1.6 + soft * 0.4, 0.55 + soft * 0.35);
        const g2 = ctx.createRadialGradient(0, 0, 0, 0, 0, r2);
        g2.addColorStop(0,   rgba(lightRgb, glowStr * opa * 0.18));
        g2.addColorStop(0.6, rgba(lightRgb, glowStr * opa * 0.05));
        g2.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = g2;
        ctx.beginPath(); ctx.arc(0, 0, r2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      // ── 6. DUST / PARTICULATE ────────────────────────────────────────────────
      {
        const dustTarget = Math.floor((dustAmount / 100) * 180);
        while (dust.length < dustTarget) dust.push(spawnDust(sx, sy, maxLen, dir, halfSpread * 2));
        while (dust.length > dustTarget) dust.pop();

        const dSpeed = 0.3 + (driftSpeed / 100) * 0.9;

        for (let i = dust.length - 1; i >= 0; i--) {
          const p = dust[i];
          p.x += p.vx * dt * 60 * dSpeed;
          p.y += p.vy * dt * 60 * dSpeed;
          p.life -= p.decay;
          if (p.life <= 0) {
            dust[i] = spawnDust(sx, sy, maxLen, dir, halfSpread * 2);
            continue;
          }

          const dx  = p.x - sx, dy  = p.y - sy;
          const dist = Math.hypot(dx, dy);
          const ang  = Math.atan2(dy, dx);
          const angDiff = Math.abs(Math.atan2(Math.sin(ang - dir), Math.cos(ang - dir)));
          const angInside = smoothstep(1 - clamp(angDiff / (halfSpread * 0.85 + 0.15)));
          const distFade  = 1 - clamp(dist / maxLen);
          const alpha = p.life * angInside * distFade * (dustAmount / 100) * opa * 0.28;
          if (alpha < 0.005) continue;

          const dr = p.size * (1.8 + soft * 1.2);
          const dg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, dr);
          dg.addColorStop(0,   rgba(lightRgb, alpha));
          dg.addColorStop(0.5, rgba(lightRgb, alpha * 0.3));
          dg.addColorStop(1,   'rgba(0,0,0,0)');
          ctx.fillStyle = dg;
          ctx.beginPath(); ctx.arc(p.x, p.y, dr, 0, Math.PI * 2); ctx.fill();
        }
      }

      ctx.restore();
    },
  };
}
