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

// ─── atmosphere mode presets ──────────────────────────────────────────────────
// Each mode multiplies base param values to produce distinct physical behavior.
// hazeMul:   atmospheric volume density
// dustMul:   particle count
// softMul:   global diffusion softness
// strkMul:   streak layer blur scale (controls streak crispness for this mode)
// noiseMul:  FBM modulation depth
// occMul:    occlusion gap strength
// driftMul:  atmospheric drift speed
// motionMul: overall motion magnitude

const ATMO = {
  clean:      { hazeMul:0.32, dustMul:0.14, softMul:0.68, strkMul:0.58, noiseMul:0.52, occMul:0.32, driftMul:0.45, motionMul:0.50 },
  dusty:      { hazeMul:0.82, dustMul:1.50, softMul:0.98, strkMul:1.00, noiseMul:0.86, occMul:0.78, driftMul:0.92, motionMul:0.80 },
  foggy:      { hazeMul:1.60, dustMul:0.28, softMul:1.60, strkMul:1.48, noiseMul:0.48, occMul:0.25, driftMul:0.62, motionMul:0.52 },
  smoky:      { hazeMul:1.28, dustMul:1.25, softMul:1.18, strkMul:1.22, noiseMul:1.38, occMul:1.50, driftMul:1.18, motionMul:0.95 },
  underwater: { hazeMul:1.90, dustMul:1.65, softMul:1.68, strkMul:1.60, noiseMul:0.88, occMul:0.42, driftMul:1.88, motionMul:1.58 },
  misty:      { hazeMul:1.05, dustMul:0.52, softMul:1.28, strkMul:1.15, noiseMul:0.65, occMul:0.38, driftMul:1.05, motionMul:0.80 },
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

// ─── shaft seed ───────────────────────────────────────────────────────────────

function makeShaftSeed(i) {
  return {
    lengthMul:   0.54 + hash(i, i*3.17,  2) * 0.64,  // shaft length variation: 0.54–1.18×
    widthMul:    0.48 + hash(i, i*7.43,  5) * 1.02,  // width multiplier
    intensity:   0.42 + hash(i, i*13.1,  8) * 0.86,  // per-shaft brightness
    phase:       hash(i, i*44.8, 14) * Math.PI * 2,  // FBM phase offset
    clusterBias: hash(i, i*2.09, 11),                 // for cluster assignment
  };
}

// ─── elongated section drawing ────────────────────────────────────────────────
// Draw one shaft section as an ellipse stretched along the beam direction.
// This eliminates circular blob artifacts — the section's shape is naturally
// elongated (like a streak) rather than circular.
//
// Implementation: translate to section mid-point, rotate to shaft angle, scale
// x-axis by the section's length-to-width ratio. The radial gradient drawn in
// this stretched space appears as an ellipse in world space.

function drawSection(c, sx, sy, angle, t0, t1, len, width, rgb, alpha) {
  const tm     = (t0 + t1) * 0.5;
  const secLen = (t1 - t0) * len;
  const tapW   = width * Math.pow(tm, 0.46) * (1 - tm * 0.24);
  if (tapW < 0.6 || secLen < 0.6 || alpha < 0.002) return;

  const cx = sx + Math.cos(angle) * tm * len;
  const cy = sy + Math.sin(angle) * tm * len;

  c.save();
  c.translate(cx, cy);
  c.rotate(angle);
  // Stretch x (along shaft) so the circle becomes an elongated ellipse
  const stretch = Math.min(14, (secLen * 0.54) / Math.max(tapW, 0.5));
  c.scale(stretch, 1);

  const g = c.createRadialGradient(0, 0, 0, 0, 0, tapW);
  g.addColorStop(0,    rgba(rgb, alpha));
  g.addColorStop(0.42, rgba(rgb, alpha * 0.52));
  g.addColorStop(1,    'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.beginPath();
  c.arc(0, 0, tapW, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

// ─── dust particle ────────────────────────────────────────────────────────────

function spawnDust(sx, sy, maxLen, dir, spread) {
  const a = dir + (Math.random() - 0.5) * spread * 1.65;
  const d = Math.pow(Math.random(), 0.45) * maxLen * 0.96;
  return {
    x:    sx + Math.cos(a) * d,
    y:    sy + Math.sin(a) * d,
    vx:   (Math.random() - 0.5) * 0.26,
    vy:  -(0.014 + Math.random() * 0.088),
    life: 0.35 + Math.random() * 0.65,
    decay:0.0010 + Math.random() * 0.0022,
    size: 0.7 + Math.random() * 3.2,
  };
}

// ─── main effect ──────────────────────────────────────────────────────────────

export function createRaysEffect() {
  let phase = 0;
  let dust  = [];
  const shaftSeeds  = Array.from({ length: 32 }, (_, i) => makeShaftSeed(i));
  const volumeLayer = {}, streakLayer = {}, ridgeLayer = {};

  return {
    reset() {
      phase = 0; dust = [];
      [volumeLayer, streakLayer, ridgeLayer].forEach(l => {
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
        turbulenceSpeed = 22,
      } = params;

      // ── timing ─────────────────────────────────────────────────────────────
      const motionScale = clamp(motionAmount / 100);
      const turbRate    = (0.04 + (turbulenceSpeed / 100) * 0.22) * motionScale;
      phase += dt * turbRate;

      // ── atmosphere mode multipliers ─────────────────────────────────────────
      const atmo = ATMO[atmosphereMode] || ATMO.dusty;

      // ── geometry ───────────────────────────────────────────────────────────
      const W = canvas.width, H = canvas.height;
      const SCALE   = 0.48;  // slightly above 0.5 for a bit more quality
      const vol   = ensureLayer(volumeLayer, W * SCALE, H * SCALE);
      const strk  = ensureLayer(streakLayer, W * SCALE, H * SCALE);
      const rdg   = ensureLayer(ridgeLayer,  W * SCALE, H * SCALE);
      const vctx  = vol.ctx, sctx = strk.ctx, rctx = rdg.ctx;
      vctx.scale(SCALE, SCALE);
      sctx.scale(SCALE, SCALE);
      rctx.scale(SCALE, SCALE);

      // ── derived values ──────────────────────────────────────────────────────
      const sx         = W * (sourceX / 100);
      const sy         = H * (sourceY / 100);
      const dir        = (direction * Math.PI) / 180;
      const halfSpread = (spreadAngle / 2 * Math.PI) / 180;
      const maxLen     = Math.hypot(W, H) * (beamLength / 100) * 0.88;
      const fieldW     = Math.min(W, H) * (beamWidth / 100) * 0.82;
      const cosDirX    = Math.cos(dir), sinDirY = Math.sin(dir);
      const perpX      = -sinDirY,       perpY   =  cosDirX;

      // ── color system ────────────────────────────────────────────────────────
      // Three direct colors + a blend amount.
      // Within streaks: glow color near source, ray color for body, haze toward edges.
      // Within haze layer: haze color.
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
      const driftStr    = clamp(drift / 100) * motionScale;
      const breathAmp   = clamp(breathing / 100) * 0.055 * motionScale;
      const flickAmp    = clamp(flickerAmount / 100) * 0.16;
      const strkSoft    = clamp(streakSoftness / 100) * atmo.strkMul;
      const dustMul     = atmo.dustMul;
      const shaftCount  = Math.max(2, Math.round(rayCount));

      // ── animation ──────────────────────────────────────────────────────────
      const driftPhase  = phase * (0.035 + driftStr * 0.10);
      const turbPhase   = phase;
      const flickerVal  = 1 + (valueNoise(phase * 2.6, 1.4, 3) - 0.5) * flickAmp;
      const breathVal   = 1 + Math.sin(phase * 0.62) * breathAmp;
      const globalMod   = opa * flickerVal * breathVal;

      // ── shaft clustering ────────────────────────────────────────────────────
      // Group shafts into clusters at irregular angular positions.
      // Gaps between clusters = the "multiple separate shaft families" look.
      const clusterCount = Math.max(2, Math.ceil(shaftCount / 3.4));
      const clusterAngles = Array.from({ length: clusterCount }, (_, k) => {
        const evenSlot     = k / clusterCount - 0.5 + 0.5 / clusterCount;
        const perturbedSlot = evenSlot + (hash(k, k * 5.31, 99) - 0.5) * 0.30;
        return dir + perturbedSlot * halfSpread * 2.0 * 0.80;
      });
      const shaftAngles = Array.from({ length: shaftCount }, (_, si) => {
        const seed     = shaftSeeds[si % 32];
        const cIdx     = si % clusterCount;
        const withinOff = (seed.clusterBias - 0.5) * halfSpread * 0.38;
        return clusterAngles[cIdx] + withinOff;
      });

      // ────────────────────────────────────────────────────────────────────────
      // LAYER 1: ATMOSPHERIC VOLUME (haze)
      // One large directional ellipse for the broad light volume,
      // plus 16 FBM-displaced smaller blobs for density variation.
      // No blob chains → no repeated circular artifacts in the volume layer.
      // ────────────────────────────────────────────────────────────────────────
      {
        vctx.globalCompositeOperation = 'source-over';

        if (hazeStr > 0.01) {
          // Primary volume: single elongated ellipse along beam axis
          const hLen    = maxLen * 0.82;
          const hWidth  = fieldW * (1.5 + soft * 0.6);
          const hCX     = sx + cosDirX * hLen * 0.42;
          const hCY     = sy + sinDirY * hLen * 0.42;
          const hStretch = Math.min(16, (hLen * 0.5) / Math.max(hWidth, 1));

          vctx.save();
          vctx.translate(hCX, hCY);
          vctx.rotate(dir);
          vctx.scale(hStretch, 1);
          const hg = vctx.createRadialGradient(0, 0, 0, 0, 0, hWidth);
          const hA = hazeStr * dens * globalMod;
          hg.addColorStop(0,    rgba(hazeRgb, hA * 0.28));
          hg.addColorStop(0.38, rgba(hazeRgb, hA * 0.15));
          hg.addColorStop(0.72, rgba(hazeRgb, hA * 0.05));
          hg.addColorStop(1,    'rgba(0,0,0,0)');
          vctx.fillStyle = hg;
          vctx.beginPath();
          vctx.arc(0, 0, hWidth, 0, Math.PI * 2);
          vctx.fill();
          vctx.restore();

          // Near-source glow: the densest atmospheric region
          const gR = Math.min(W, H) * 0.26 * (1 + hazeStr * 0.3);
          const gg = vctx.createRadialGradient(sx, sy, 0, sx, sy, gR);
          gg.addColorStop(0,    rgba(mixRgb(glowRgb, hazeRgb, 0.5), hA * 0.22));
          gg.addColorStop(0.45, rgba(hazeRgb, hA * 0.08));
          gg.addColorStop(1,    'rgba(0,0,0,0)');
          vctx.fillStyle = gg;
          vctx.beginPath();
          vctx.arc(sx, sy, gR, 0, Math.PI * 2);
          vctx.fill();

          // 4×4 FBM-displaced density variation blobs
          // These modulate the volume's density without adding repeated circular artifacts
          // (they're at a very different scale from the streaks and heavily blurred)
          const H_LONG = 4, H_LAT = 4;
          for (let li = 0; li < H_LONG; li++) {
            const tBase  = (li + 0.5) / H_LONG;
            const dist   = maxLen * Math.pow(tBase, 0.68);
            const longF  = Math.pow(1 - tBase, 0.36 + fall * 1.5) * smoothstep(tBase * 7);

            for (let ai = 0; ai < H_LAT; ai++) {
              const uBase  = (ai + 0.5) / H_LAT - 0.5;
              // FBM lateral displacement — blobs escape the regular grid
              const pertN  = fbm(tBase * nScale * 0.8 + driftPhase * 0.20, uBase * nScale * 1.6 + driftPhase * 0.13, 17, 3);
              const uP     = uBase + (pertN - 0.5) * noiseStr * 0.72 * Math.sign(uBase || 1);
              const latPx  = uP * fieldW * 2.6;

              // Organic edge: FBM-shifted boundary, not hard Gaussian
              const latN   = Math.abs(uP) * 2;
              const edgeN  = fbm(latN * 2.1 + phase * 0.022, tBase * 1.5 + li * 0.42, 23, 2);
              const angEnv = smoothstep(clamp(1 - latN * (1 - feather * 0.52) + edgeN * noiseStr * 0.38));
              if (angEnv < 0.015) continue;

              const densN  = fbm(tBase * nScale * 1.2 + driftPhase * 0.24, uP * nScale * 2.0 + driftPhase * 0.16, 7, 3);
              const wx     = sx + cosDirX * dist + perpX * latPx;
              const wy     = sy + sinDirY * dist + perpY * latPx;
              const bR     = fieldW * (0.22 + soft * 0.28) * (0.52 + densN * 0.88);
              if (bR < 1.5) continue;

              const nMod   = lerp(1, lerp(0.42, 1, densN), noiseStr);
              const alpha  = hazeStr * dens * globalMod * longF * angEnv * nMod * 0.068;
              if (alpha < 0.004) continue;

              // Blend hazeColor toward rayColor based on colorBlend
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
      // LAYER 2: SHAFT STREAKS
      // Each shaft: 4 elongated sections (not 20 circular blobs).
      // Each section is a stretched ellipse aligned with the shaft direction.
      // Result: clean directional streaks with no repeated-circle artifacts.
      // FBM modulates per-section alpha for natural density variation and gaps.
      // ────────────────────────────────────────────────────────────────────────
      {
        sctx.globalCompositeOperation = 'lighter';
        const SECTIONS = 4;

        for (let si = 0; si < shaftCount; si++) {
          const seed       = shaftSeeds[si % 32];
          const shaftAngle = shaftAngles[si];
          const shaftLen   = maxLen * seed.lengthMul;
          // Shaft cross-section width; feather widens the shaft
          const shaftW     = fieldW * seed.widthMul * 0.19 * (0.42 + soft * 0.68);

          // Angular envelope: FBM-perturbed boundary (not hard Gaussian)
          const angDev = Math.abs(shaftAngle - dir);
          const edgeN  = fbm(angDev * 2.4 + phase * 0.020, si * 0.52 + phase * 0.007, seed.phase + 31, 2);
          const effH   = halfSpread * (0.94 + feather * 0.34 + edgeN * noiseStr * 0.32);
          const angEnv = smoothstep(clamp(1 - angDev / effH));
          if (angEnv < 0.018) continue;

          for (let s = 0; s < SECTIONS; s++) {
            const t0 = s / SECTIONS, t1 = (s + 1) / SECTIONS;
            const tm = (t0 + t1) * 0.5;

            const longFall = Math.pow(1 - tm, 0.40 + fall * 2.2) * smoothstep(tm * 9);

            // FBM density: one call per section (not per pixel) — crisp sections
            const densN = fbm(tm * nScale * 1.7 + driftPhase * 0.16, si * 0.70 + driftPhase * 0.09, seed.phase, 3);
            const occN  = fbm(tm * nScale * 3.4 + turbPhase  * 0.14, si * 1.22 + turbPhase  * 0.09, seed.phase + 17, 2);
            const occMask = lerp(1, smoothstep(clamp((occN - 0.24) / 0.66)), occStr);

            const nMod  = lerp(1, lerp(0.42, 1, densN), noiseStr);
            const alpha = globalMod * dens * seed.intensity * longFall * angEnv * occMask * nMod * 0.24;
            if (alpha < 0.003) continue;

            // Color: blend from glowColor near source → rayColor → hazeColor at tips
            const outerT  = clamp((tm - 0.55) * 2.2) * blendFrac * 0.5; // haze at tips
            const secRgb  = mixRgb(mixRgb(glowRgb, rayRgb, clamp(tm * 4.0 + (1 - blendFrac))), hazeRgb, outerT);
            const finalRgb = mixRgb(secRgb, rayRgb, 1 - blendFrac * 0.6);

            drawSection(sctx, sx, sy, shaftAngle, t0, t1, shaftLen, shaftW, finalRgb, alpha);
          }
        }

        // Edge-scatter: dim atmospheric bleed slightly beyond spread boundary
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
      // LAYER 3: BRIGHT RIDGE CORES
      // Narrow bright centerlines for the top-intensity shafts.
      // Gives the "streak has a bright spine" quality without hard lines.
      // Only the dominant shafts get ridges — others remain soft.
      // ────────────────────────────────────────────────────────────────────────
      {
        rctx.globalCompositeOperation = 'lighter';
        const RIDGE_SECS = 3;
        const ridgeCount = Math.max(2, Math.ceil(shaftCount * 0.55));

        // Render only the brightest shafts
        const sortedIdx = Array.from({ length: shaftCount }, (_, i) => i)
          .sort((a, b) => shaftSeeds[b % 32].intensity - shaftSeeds[a % 32].intensity)
          .slice(0, ridgeCount);

        for (const si of sortedIdx) {
          const seed       = shaftSeeds[si % 32];
          const shaftAngle = shaftAngles[si];
          const shaftLen   = maxLen * seed.lengthMul;
          const ridgeW     = fieldW * seed.widthMul * 0.060 * (0.38 + soft * 0.48);

          const angDev  = Math.abs(shaftAngle - dir);
          const edgeNR  = fbm(angDev * 2.8 + phase * 0.016, si * 0.47 + phase * 0.006, seed.phase + 41, 2);
          const effHR   = halfSpread * (0.94 + feather * 0.30 + edgeNR * noiseStr * 0.28);
          const angEnvR = smoothstep(clamp(1 - angDev / effHR));
          if (angEnvR < 0.022) continue;

          for (let s = 0; s < RIDGE_SECS; s++) {
            const t0 = s / RIDGE_SECS, t1 = (s + 1) / RIDGE_SECS;
            const tm = (t0 + t1) * 0.5;
            const longF = Math.pow(1 - tm, 0.44 + fall * 2.1) * smoothstep(tm * 8);
            const dN    = fbm(tm * nScale * 1.9 + driftPhase * 0.14, si * 0.73 + driftPhase * 0.07, seed.phase + 5, 2);
            const oN    = fbm(tm * nScale * 3.5 + turbPhase  * 0.14, si * 1.28 + turbPhase  * 0.07, seed.phase + 22, 2);
            const oM    = lerp(1, smoothstep(clamp((oN - 0.22) / 0.68)), occStr);
            const nM    = lerp(1, lerp(0.44, 1, dN), noiseStr);
            const alpha = globalMod * dens * seed.intensity * 0.85 * longF * angEnvR * oM * nM * 0.18;

            // Ridge uses glowColor mixed toward rayColor for a bright warm core
            const ridgeRgb = mixRgb(glowRgb, rayRgb, lerp(0.35, 0.75, tm) * (1 - blendFrac * 0.5) + blendFrac * 0.3);
            drawSection(rctx, sx, sy, shaftAngle, t0, t1, shaftLen, ridgeW, ridgeRgb, alpha);
          }
        }
      }

      // ── composite ──────────────────────────────────────────────────────────
      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      // Volume haze: very heavy blur — the diffuse atmospheric medium
      const volBlur = 22 + soft * 24;
      ctx.filter = `blur(${volBlur}px)`;
      ctx.drawImage(vol.canvas, 0, 0, W, H);

      // Streak body: controlled by streakSoftness — crisp or dreamy
      const strkBlur  = 5 + strkSoft * 18;
      ctx.filter = `blur(${strkBlur}px)`;
      ctx.drawImage(strk.canvas, 0, 0, W, H);

      // Streak halo: extra soft pass of streaks for depth/glow
      ctx.filter = `blur(${strkBlur * 2.8 + 8}px)`;
      ctx.globalAlpha = 0.32;
      ctx.drawImage(strk.canvas, 0, 0, W, H);
      ctx.globalAlpha = 1;

      // Ridge: sharpest pass — preserves streak spine visibility
      const rdgBlur = 2 + soft * 6;
      ctx.filter = `blur(${rdgBlur}px)`;
      ctx.drawImage(rdg.canvas, 0, 0, W, H);

      // Ridge aureole: soft glow around each spine
      ctx.filter = `blur(${rdgBlur * 3.5 + 6}px)`;
      ctx.globalAlpha = 0.38;
      ctx.drawImage(rdg.canvas, 0, 0, W, H);
      ctx.globalAlpha = 1;

      ctx.filter = 'none';

      // ── source bloom ───────────────────────────────────────────────────────
      if (sourceGlow > 2) {
        const glowStr = (sourceGlow / 100) * globalMod;
        const baseR   = Math.min(W, H);

        // Hot core: glowColor
        const r0 = baseR * (0.032 + glowStr * 0.052);
        const g0 = ctx.createRadialGradient(sx, sy, 0, sx, sy, r0);
        g0.addColorStop(0,    `rgba(255,255,252,${clamp(glowStr * opa * 0.96).toFixed(4)})`);
        g0.addColorStop(0.30, rgba(glowRgb, glowStr * opa * 0.60));
        g0.addColorStop(1,    'rgba(0,0,0,0)');
        ctx.fillStyle = g0;
        ctx.beginPath(); ctx.arc(sx, sy, r0, 0, Math.PI * 2); ctx.fill();

        // Mid aureole: rayColor
        const r1 = baseR * (0.08 + glowStr * 0.16);
        const g1 = ctx.createRadialGradient(sx, sy, r0 * 0.22, sx, sy, r1);
        g1.addColorStop(0,    rgba(mixRgb(glowRgb, rayRgb, 0.5), glowStr * opa * 0.38));
        g1.addColorStop(0.55, rgba(rayRgb, glowStr * opa * 0.12));
        g1.addColorStop(1,    'rgba(0,0,0,0)');
        ctx.fillStyle = g1;
        ctx.beginPath(); ctx.arc(sx, sy, r1, 0, Math.PI * 2); ctx.fill();

        // Wide directional scatter: elongated ellipse along beam
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
      }

      // ── dust / particulate ─────────────────────────────────────────────────
      {
        const dustTarget = Math.floor((dustAmount / 100) * dustMul * 200);
        const spread2    = halfSpread * 2;
        while (dust.length < dustTarget) dust.push(spawnDust(sx, sy, maxLen, dir, spread2));
        while (dust.length > dustTarget) dust.pop();

        const dSpeed = 0.26 + (driftSpeed / 100) * 0.98 * atmo.driftMul * motionScale;

        for (let i = dust.length - 1; i >= 0; i--) {
          const p = dust[i];
          p.x += p.vx * dt * 60 * dSpeed;
          p.y += p.vy * dt * 60 * dSpeed;
          p.life -= p.decay;
          if (p.life <= 0) { dust[i] = spawnDust(sx, sy, maxLen, dir, spread2); continue; }

          const dx = p.x - sx, dy = p.y - sy;
          const dist = Math.hypot(dx, dy);
          const ang  = Math.atan2(dy, dx);
          const angD = Math.abs(Math.atan2(Math.sin(ang - dir), Math.cos(ang - dir)));
          const inside  = smoothstep(1 - clamp(angD / (halfSpread * 0.92 + 0.14)));
          const distF   = 1 - clamp(dist / maxLen);
          const alpha   = p.life * inside * distF * (dustAmount / 100) * opa * 0.38;
          if (alpha < 0.006) continue;

          const dr = p.size * (1.5 + soft * 1.2);
          const dg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, dr);
          // Particle color: mix ray/haze color based on blend
          const pRgb = mixRgb(rayRgb, hazeRgb, blendFrac * 0.55);
          dg.addColorStop(0,    rgba(pRgb, alpha));
          dg.addColorStop(0.45, rgba(pRgb, alpha * 0.28));
          dg.addColorStop(1,    'rgba(0,0,0,0)');
          ctx.fillStyle = dg;
          ctx.beginPath(); ctx.arc(p.x, p.y, dr, 0, Math.PI * 2); ctx.fill();
        }
      }

      ctx.restore();
    },
  };
}
