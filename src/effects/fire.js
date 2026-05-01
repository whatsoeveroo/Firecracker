import { getQuality } from '../utils/qualityLevels';

// ─── Color LUT — cached (life×20, ct×10) → {r,g,b} ─────────────────────────
const _clut = new Map();
function fireRGB(life, ct) {
  const lq = Math.round(life * 20);
  const cq = Math.round(ct  * 10);
  const k  = lq * 11 + cq;
  if (_clut.has(k)) return _clut.get(k);

  const warm = [
    { l: 1.0,  r: 255, g: 255, b: 235 },  // white-hot tip
    { l: 0.78, r: 255, g: 215, b: 45  },  // bright yellow
    { l: 0.52, r: 255, g: 95,  b: 8   },  // vivid orange
    { l: 0.25, r: 205, g: 24,  b: 2   },  // deep red
    { l: 0.0,  r: 36,  g: 5,   b: 0   },  // black base
  ];
  const cool = [
    { l: 1.0,  r: 210, g: 235, b: 255 },
    { l: 0.78, r: 70,  g: 130, b: 255 },
    { l: 0.52, r: 18,  g: 55,  b: 220 },
    { l: 0.25, r: 4,   g: 12,  b: 100 },
    { l: 0.0,  r: 1,   g: 3,   b: 28  },
  ];

  function lerp(stops, v) {
    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i], b = stops[i + 1];
      if (v >= b.l) {
        const t = (v - b.l) / (a.l - b.l);
        return { r: b.r + (a.r - b.r) * t, g: b.g + (a.g - b.g) * t, b: b.b + (a.b - b.b) * t };
      }
    }
    return stops[stops.length - 1];
  }

  const lv = lq / 20;
  const w = lerp(warm, lv);
  const c = lerp(cool, lv);
  const v = { r: Math.round(c.r + (w.r - c.r) * ct), g: Math.round(c.g + (w.g - c.g) * ct), b: Math.round(c.b + (w.b - c.b) * ct) };
  _clut.set(k, v);
  return v;
}

function fc(life, ct, alpha) {
  const { r, g, b } = fireRGB(life, ct);
  return `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
}

// ─── Noise — per-frame bucket cache keyed at 8px resolution ──────────────────
// Cleared at the start of each update(), giving hits across particles sharing
// the same ~8px column without cross-frame contamination.
const _nc = new Map();

function noise4(x, t) {
  const bk = Math.round(x / 8);
  if (_nc.has(bk)) return _nc.get(bk);
  const xf = bk * 8;
  const v = (
    Math.sin(xf * 0.023 + t * 2.1)         * 0.40 +
    Math.sin(xf * 0.041 + t * 1.4 + 1.2)   * 0.30 +
    Math.sin(xf * 0.017 + t * 3.0 + 0.7)   * 0.20 +
    Math.sin(xf * 0.061 + t * 4.2 + 2.1)   * 0.10
  );
  _nc.set(bk, v);
  return v;
}

// ─── Spawners ────────────────────────────────────────────────────────────────
function spawnFlame(cx, cy, params, layer, wvx, wvy, tongueX) {
  const { flameHeight, flameWidth, turbulence, flickerSpeed } = params;
  const spreadF = [0.07, 0.28, 0.60][layer];
  const speedF  = [2.50, 1.60, 0.88][layer];
  const sizeR   = [[4, 12], [12, 26], [22, 50]][layer];
  const decayR  = [[0.020, 0.028], [0.010, 0.015], [0.004, 0.007]][layer];

  const hScale = flameHeight / 80;
  const spd    = hScale * speedF * (0.88 + (flickerSpeed / 100) * 0.26);
  const spread = flameWidth * spreadF;

  // Layer 0 anchors to tongue positions for distinct tongue silhouettes
  const ox = layer === 0 && tongueX !== undefined
    ? tongueX + (Math.random() - 0.5) * spread * 0.9
    : cx + (Math.random() - 0.5) * spread;

  return {
    x: ox, y: cy + (Math.random() - 0.5) * (flameWidth * 0.04),
    vx: (Math.random() - 0.5) * (turbulence / 100) * 0.5 + wvx * 0.3,
    vy: -(Math.random() * spd * 0.42 + spd * 0.58),
    life:  0.78 + Math.random() * 0.22,
    decay: decayR[0] + Math.random() * (decayR[1] - decayR[0]),
    size:  sizeR[0]  + Math.random() * (sizeR[1]  - sizeR[0]),
    layer, ox,
    flk: Math.random() * Math.PI * 2,
  };
}

function spawnEmber(cx, cy, params, wvx, wvy) {
  const { flameWidth, flameHeight } = params;
  const hScale = flameHeight / 80;
  const ang = -Math.PI / 2 + Math.atan2(wvy, wvx + 1e-6) * 0.4 + (Math.random() - 0.5) * 1.1;
  const spd = (1.4 + Math.random() * 2.8) * hScale;
  return {
    x: cx + (Math.random() - 0.5) * flameWidth * 0.5,
    y: cy - Math.random() * flameHeight * hScale * 0.35,
    vx: Math.cos(ang) * spd + wvx * 0.55,
    vy: Math.sin(ang) * spd,
    life: 0.65 + Math.random() * 0.35,
    decay: 0.005 + Math.random() * 0.007,
    size: 1.2 + Math.random() * 2.4,
    bright: 0.65 + Math.random() * 0.35,
  };
}

function spawnSpark(cx, cy, params, wvx, wvy) {
  const { flameWidth, flameHeight } = params;
  const hScale = flameHeight / 80;
  const ang = -Math.PI / 2 + Math.atan2(wvy, wvx + 1e-6) * 0.5 + (Math.random() - 0.5) * 1.4;
  const spd = (3.5 + Math.random() * 5.5) * hScale;
  return {
    x: cx + (Math.random() - 0.5) * flameWidth * 0.32,
    y: cy - Math.random() * flameHeight * hScale * 0.22,
    vx: Math.cos(ang) * spd + wvx * 0.75,
    vy: Math.sin(ang) * spd,
    life: 0.55 + Math.random() * 0.45,
    decay: 0.016 + Math.random() * 0.024,
    len: 5 + Math.random() * 12,
  };
}

function spawnSmoke(cx, cy, params, wvx) {
  const { flameWidth, flameHeight } = params;
  const hScale = flameHeight / 80;
  return {
    x: cx + (Math.random() - 0.5) * flameWidth * 0.35,
    y: cy - flameHeight * hScale * (0.75 + Math.random() * 0.28),
    vx: (Math.random() - 0.5) * 0.35 + wvx * 0.45,
    vy: -(0.22 + Math.random() * 0.40),
    life: 0.55 + Math.random() * 0.45,
    decay: 0.0022 + Math.random() * 0.003,
    size: flameWidth * (0.15 + Math.random() * 0.22),
    rot: Math.random() * Math.PI * 2,
    drot: (Math.random() - 0.5) * 0.015,
  };
}

// ─── Base caps (scaled by quality.capScale at runtime) ───────────────────────
const BASE_CAPS = { flames: 580, embers: 150, sparks: 200, smokes: 75 };

// ─── Effect factory ──────────────────────────────────────────────────────────
export function createFireEffect() {
  let flames = [], embers = [], sparks = [], smokes = [];
  let time = 0;

  return {
    reset() { flames = []; embers = []; sparks = []; smokes = []; time = 0; },

    update(ctx, canvas, params, dt, renderOpts = {}) {
      _nc.clear();  // invalidate noise bucket cache each frame

      const ql = getQuality(renderOpts.quality ?? 'preview');
      const {
        intensity, flameHeight, flameWidth, turbulence, flickerSpeed,
        windDir, windStrength, emberAmount, sparkAmount,
        bloom, heatDistortion, colorTemp, coreBrightness, smokeAmount,
      } = params;

      const ct     = colorTemp    / 100;
      const intF   = intensity    / 100;
      const flickF = flickerSpeed / 100;
      const hScale = flameHeight  / 80;
      const ss     = ql.spawnScale;
      const cs     = ql.capScale;

      const wRad = (windDir * Math.PI) / 180;
      const wF   = (windStrength / 100) * 2.8;
      const wvx  =  Math.sin(wRad) * wF;
      const wvy  = -Math.abs(Math.cos(wRad)) * wF * 0.18;

      const cx = canvas.width  / 2;
      const cy = canvas.height * 0.78;

      time += dt * (0.55 + flickF * 0.90);

      // Global flicker — shared coherent pulse that modulates spawn and draw
      const globalFlk = (
        Math.sin(time * 5.8)        * 0.50 +
        Math.sin(time * 11.3 + 0.7) * 0.30 +
        Math.sin(time * 17.8 + 1.4) * 0.20
      );  // range ≈ −1..+1

      // Tongue hotspots — 3 anchor points along the base for layer-0 particles
      // giving the characteristic multi-tongue silhouette
      const numTongues = 3;
      const tongues = Array.from({ length: numTongues }, (_, i) => {
        const base = (i / (numTongues - 1) - 0.5) * flameWidth * 0.6;
        return cx + base + Math.sin(time * 2.8 + i * 2.1) * flameWidth * 0.06;
      });

      // ── Spawn ──────────────────────────────────────────────────────────
      const capFlame = BASE_CAPS.flames * cs | 0;
      const total    = intF * 38 * ss * (1 + globalFlk * 0.12);
      [0.24, 0.46, 0.30].forEach((ratio, layer) => {
        if (flames.length >= capFlame) return;
        const n = Math.floor(total * ratio + Math.random() * total * ratio * 0.4);
        for (let i = 0; i < n && flames.length < capFlame; i++) {
          const tx = layer === 0 ? tongues[i % numTongues] : undefined;
          flames.push(spawnFlame(cx, cy, params, layer, wvx, wvy, tx));
        }
      });

      if (ql.enableEmbers && emberAmount > 0 && embers.length < (BASE_CAPS.embers * cs | 0)) {
        if (Math.random() < (emberAmount / 100) * intF * 1.5 * ss)
          embers.push(spawnEmber(cx, cy, params, wvx, wvy));
      }

      if (ql.enableSparks && sparkAmount > 0 && sparks.length < (BASE_CAPS.sparks * cs | 0)) {
        const r = (sparkAmount / 100) * intF * 0.85 * ss;
        if (Math.random() < r)       sparks.push(spawnSpark(cx, cy, params, wvx, wvy));
        if (Math.random() < r * 0.4) sparks.push(spawnSpark(cx, cy, params, wvx, wvy));
      }

      if (ql.enableSmoke && smokeAmount > 0 && smokes.length < (BASE_CAPS.smokes * cs | 0)) {
        if (Math.random() < (smokeAmount / 100) * intF * 0.26 * ss)
          smokes.push(spawnSmoke(cx, cy, params, wvx));
      }

      // ── Physics ────────────────────────────────────────────────────────
      for (let i = flames.length - 1; i >= 0; i--) {
        const p = flames[i];
        const turb  = noise4(p.ox, time) * (turbulence / 100) * 2.0;
        const flick = Math.sin(time * 7.5 + p.flk) * flickF * 0.28;
        p.x  += (p.vx + turb * 0.55 + wvx * 0.04 + flick) * dt * 60;
        p.vx *= 0.965;
        p.y  += (p.vy + wvy * 0.038) * dt * 60;
        p.vy *= 0.998;
        p.life  -= p.decay * (1 + flickF * 0.28);
        p.size  *= 0.9970;
        if (p.life <= 0) flames.splice(i, 1);
      }

      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i];
        e.vx += wvx * 0.014 * dt * 60;
        e.vy += 0.014 * dt * 60;
        e.vx *= 0.994; e.x += e.vx * dt * 60; e.y += e.vy * dt * 60;
        e.life -= e.decay;
        if (e.life <= 0) embers.splice(i, 1);
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.vx += wvx * 0.018 * dt * 60;
        s.vy += 0.022 * dt * 60;
        s.vx *= 0.990; s.x += s.vx * dt * 60; s.y += s.vy * dt * 60;
        s.life -= s.decay;
        if (s.life <= 0) sparks.splice(i, 1);
      }

      for (let i = smokes.length - 1; i >= 0; i--) {
        const s = smokes[i];
        s.x += (s.vx + wvx * 0.04) * dt * 60;
        s.y += s.vy * dt * 60;
        s.rot += s.drot; s.size *= 1.004;
        s.life -= s.decay;
        if (s.life <= 0) smokes.splice(i, 1);
      }

      // ── Draw ───────────────────────────────────────────────────────────
      ctx.save();
      const stops = ql.gradientStops;

      // 1. Ground glow — warm pool at the base, pulsing with global flicker
      ctx.globalCompositeOperation = 'screen';
      ctx.save();
      const glowPulse = 1 + globalFlk * 0.08;
      ctx.translate(cx + wvx * 8, cy);
      ctx.scale(1, 0.24);
      const bR2 = Math.round(255 * ct + 55 * (1 - ct));
      const bG2 = Math.round(140 * ct + 70 * (1 - ct));
      const bB2 = Math.round(10  * ct + 200 * (1 - ct));
      const bgG = ctx.createRadialGradient(0, 0, 0, 0, 0, flameWidth * 0.72 * glowPulse);
      bgG.addColorStop(0,   `rgba(${bR2},${bG2},${bB2},${(intF * 0.72).toFixed(3)})`);
      bgG.addColorStop(0.4, `rgba(${bR2 >> 1},${bG2 >> 2},0,${(intF * 0.30).toFixed(3)})`);
      bgG.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = bgG;
      ctx.beginPath();
      ctx.arc(0, 0, flameWidth * 0.72 * glowPulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 2. Flame layers — back-to-front (layer 2 first, layer 0 last)
      // Wind shear: lean increases with height (lower life = higher = more lean)
      const windShear = wvx * 0.065;
      const scaleYs   = [1.90, 1.68, 1.42];
      const aScales   = [0.82, 0.58, 0.30];

      for (let layer = 2; layer >= 0; layer--) {
        const aS = aScales[layer];
        const sY = scaleYs[layer];

        for (const p of flames) {
          if (p.layer !== layer) continue;
          // Skip near-invisible particles to save fill + gradient work
          const alpha = p.life * aS * intF;
          if (alpha < 0.018) continue;

          ctx.save();
          ctx.translate(p.x, p.y);
          // Shear lean increases as particle rises (1 - life → more lean at top)
          ctx.transform(1, 0, windShear * (1 - p.life), sY, 0, 0);

          const g = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);

          if (stops === 2) {
            g.addColorStop(0, fc(p.life, ct, alpha));
            g.addColorStop(1, 'rgba(0,0,0,0)');
          } else if (stops === 3) {
            g.addColorStop(0,    fc(p.life,                    ct, alpha));
            g.addColorStop(0.48, fc(Math.max(0, p.life - 0.22), ct, alpha * 0.40));
            g.addColorStop(1,    'rgba(0,0,0,0)');
          } else {
            g.addColorStop(0,    fc(p.life,                    ct, alpha));
            g.addColorStop(0.30, fc(Math.max(0, p.life - 0.14), ct, alpha * 0.62));
            g.addColorStop(0.65, fc(Math.max(0, p.life - 0.34), ct, alpha * 0.24));
            g.addColorStop(1,    'rgba(0,0,0,0)');
          }

          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // 3. White-hot core (High / Ultra only)
      if (ql.corePass) {
        const cbF = coreBrightness / 100;
        for (const p of flames) {
          if (p.layer !== 0 || p.life < 0.52) continue;
          const cAlpha = p.life * cbF * 0.76;
          if (cAlpha < 0.02) continue;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.transform(1, 0, windShear * (1 - p.life), 1.90, 0, 0);
          const cs2 = p.size * 0.26;
          const cg  = ctx.createRadialGradient(0, 0, 0, 0, 0, cs2);
          cg.addColorStop(0,   `rgba(255,255,255,${cAlpha.toFixed(3)})`);
          cg.addColorStop(0.5, `rgba(255,248,185,${(cAlpha * 0.38).toFixed(3)})`);
          cg.addColorStop(1,   'rgba(0,0,0,0)');
          ctx.fillStyle = cg;
          ctx.beginPath();
          ctx.arc(0, 0, cs2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // 4. Embers — glowing dots with soft halo
      if (ql.enableEmbers) {
        for (const e of embers) {
          const ea = e.life * e.bright * 0.94;
          if (ea < 0.02) continue;
          ctx.save();
          ctx.translate(e.x, e.y);
          const eg = ctx.createRadialGradient(0, 0, 0, 0, 0, e.size * 2.5);
          eg.addColorStop(0,   `rgba(255,210,90,${ea.toFixed(3)})`);
          eg.addColorStop(0.5, `rgba(255,85,14,${(ea * 0.48).toFixed(3)})`);
          eg.addColorStop(1,   'rgba(0,0,0,0)');
          ctx.fillStyle = eg;
          ctx.beginPath();
          ctx.arc(0, 0, e.size * 2.5, 0, Math.PI * 2);
          ctx.fill();
          // Bright hot center dot
          ctx.fillStyle = `rgba(255,255,210,${Math.min(1, ea * 1.1).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(0, 0, e.size * 0.42, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // 5. Sparks — motion-blurred streaks with bright tip
      if (ql.enableSparks) {
        for (const s of sparks) {
          const spd2 = Math.sqrt(s.vx * s.vx + s.vy * s.vy) + 1e-6;
          const nx = s.vx / spd2, ny = s.vy / spd2;
          const sa = s.life * 0.94;
          if (sa < 0.02) continue;
          ctx.save();
          // Tail fades out
          const grad = ctx.createLinearGradient(
            s.x - nx * s.len * 0.60, s.y - ny * s.len * 0.60,
            s.x + nx * s.len * 0.40, s.y + ny * s.len * 0.40,
          );
          grad.addColorStop(0,   `rgba(255,200,60,0)`);
          grad.addColorStop(0.6, `rgba(255,230,120,${(sa * 0.7).toFixed(3)})`);
          grad.addColorStop(1,   `rgba(255,255,200,${sa.toFixed(3)})`);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(s.x - nx * s.len * 0.60, s.y - ny * s.len * 0.60);
          ctx.lineTo(s.x + nx * s.len * 0.40, s.y + ny * s.len * 0.40);
          ctx.stroke();
          ctx.restore();
        }
      }

      // 6. Smoke — dark wisps above the flame
      if (ql.enableSmoke && smokeAmount > 0) {
        ctx.globalCompositeOperation = 'source-over';
        const smF = smokeAmount / 100;
        for (const s of smokes) {
          const sa2 = s.life * smF * 0.22;
          if (sa2 < 0.005) continue;
          ctx.save();
          ctx.translate(s.x, s.y);
          ctx.rotate(s.rot);
          const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, s.size);
          sg.addColorStop(0,   `rgba(24,19,15,${sa2.toFixed(3)})`);
          sg.addColorStop(0.5, `rgba(15,12,10,${(sa2 * 0.42).toFixed(3)})`);
          sg.addColorStop(1,   'rgba(0,0,0,0)');
          ctx.fillStyle = sg;
          ctx.beginPath();
          ctx.arc(0, 0, s.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        ctx.globalCompositeOperation = 'screen';
      }

      // 7. Bloom — soft elliptical halo around flame column
      if (ql.enableBloom && bloom > 5) {
        const blF  = bloom / 100;
        const blR  = flameWidth * 1.30 * (0.45 + hScale * 0.55);
        const blCX = cx + wvx * 16;
        const blCY = cy - flameHeight * hScale * 0.40;
        const blG  = ctx.createRadialGradient(blCX, blCY, 0, blCX, blCY, blR);
        const blR2 = Math.round(255 * ct + 50 * (1 - ct));
        const blG2 = Math.round(72  * ct + 42 * (1 - ct));
        blG.addColorStop(0,   `rgba(${blR2},${blG2},6,${(blF * intF * 0.26).toFixed(3)})`);
        blG.addColorStop(0.4, `rgba(${blR2 >> 1},16,3,${(blF * intF * 0.12).toFixed(3)})`);
        blG.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = blG;
        ctx.beginPath();
        ctx.ellipse(blCX, blCY, blR, blR * 1.70, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // 8. Heat distortion (High / Ultra only)
      if (ql.enableDistortion && heatDistortion > 8) {
        try {
          const hd   = heatDistortion / 100;
          const colH = Math.floor(flameHeight * hScale * 1.1);
          const colW = Math.floor(flameWidth  * 1.4);
          const rx   = Math.max(0, Math.floor(cx + wvx * 10 - colW * 0.5));
          const ry   = Math.max(0, Math.floor(cy - colH));
          const rw   = Math.min(colW, canvas.width  - rx);
          const rh   = Math.min(colH, canvas.height - ry);

          if (rw > 4 && rh > 4) {
            const img = ctx.getImageData(rx, ry, rw, rh);
            const src = new Uint8ClampedArray(img.data);
            const dst = img.data;
            for (let row = 0; row < rh; row++) {
              const frac = 1 - row / rh;
              const amp  = frac * frac * hd * 4.5;
              const off  = Math.round(
                Math.sin(row * 0.19 + time * 5.2)       * amp +
                Math.sin(row * 0.32 + time * 3.4 + 1.3) * amp * 0.45
              );
              for (let col = 0; col < rw; col++) {
                const sc = Math.max(0, Math.min(rw - 1, col + off));
                const di = (row * rw + col) * 4;
                const si = (row * rw + sc)  * 4;
                dst[di]     = src[si];
                dst[di + 1] = src[si + 1];
                dst[di + 2] = src[si + 2];
                dst[di + 3] = src[si + 3];
              }
            }
            ctx.putImageData(img, rx, ry);
          }
        } catch (_) { /* tainted canvas */ }
      }

      ctx.restore();
    },
  };
}
