import { getQuality } from '../utils/qualityLevels';

// ─── Color palettes ──────────────────────────────────────────────────────────
// Each palette: 5 stops as [life, r, g, b], life 1.0 → 0.0 (hot → cold)
const PALETTES = {
  natural:    [[1.0,255,255,235],[0.78,255,215,45],[0.52,255,95,8],[0.25,205,24,2],[0.0,36,5,0]],
  deepOrange: [[1.0,255,240,178],[0.78,255,152,26],[0.52,220,64,3],[0.25,136,18,0],[0.0,18,2,0]],
  wildfire:   [[1.0,255,255,172],[0.78,255,193,14],[0.52,255,70,0],[0.25,172,27,3],[0.0,27,3,0]],
  gas:        [[1.0,215,242,255],[0.78,72,162,255],[0.52,7,72,255],[0.25,3,16,112],[0.0,0,3,28]],
  blue:       [[1.0,182,220,255],[0.78,52,112,255],[0.52,10,38,192],[0.25,2,7,82],[0.0,0,1,18]],
  jet:        [[1.0,255,255,248],[0.78,255,244,162],[0.52,255,144,28],[0.25,170,68,10],[0.0,28,5,0]],
  plasma:     [[1.0,255,232,255],[0.78,216,88,255],[0.52,128,10,255],[0.25,52,0,168],[0.0,8,0,32]],
};

const _palKeys = Object.keys(PALETTES);
const _palIdx  = Object.fromEntries(_palKeys.map((k, i) => [k, i]));

// LUT — keyed (lq×7 + pid)×11 + tq, max 1617 entries
const _clut = new Map();

function paletteRGB(life, palKey, ct) {
  const lq  = Math.round(life * 20);     // 0-20
  const pid = _palIdx[palKey] ?? 0;      // 0-6
  const tq  = Math.round(ct * 0.10);    // 0-10
  const k   = (lq * 7 + pid) * 11 + tq;
  if (_clut.has(k)) return _clut.get(k);

  const stops = PALETTES[palKey] ?? PALETTES.natural;
  const lv = lq / 20;
  let r = stops[stops.length - 1][1];
  let g = stops[stops.length - 1][2];
  let b = stops[stops.length - 1][3];
  for (let i = 0; i < stops.length - 1; i++) {
    const [al, ar, ag, ab] = stops[i];
    const [bl, br, bg, bb] = stops[i + 1];
    if (lv >= bl) {
      const t = (lv - bl) / (al - bl);
      r = br + (ar - br) * t;
      g = bg + (ag - bg) * t;
      b = bb + (ab - bb) * t;
      break;
    }
  }

  // colorTemp 0-100 shifts warmth: 50 = neutral, <50 = cool tint, >50 = warm tint
  const shift = (ct - 50) / 50;
  const v = {
    r: Math.round(Math.max(0, Math.min(255, r + shift * 28))),
    g: Math.round(Math.max(0, Math.min(255, g + shift * 8))),
    b: Math.round(Math.max(0, Math.min(255, b - shift * 32))),
  };
  _clut.set(k, v);
  return v;
}

function fc(life, palKey, ct, alpha) {
  const { r, g, b } = paletteRGB(life, palKey, ct);
  return `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
}

// ─── Noise with per-frame 8px bucket cache ───────────────────────────────────
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
function spawnFlame(cx, cy, params, layer, wvx, wvy, tongueX, velF) {
  const { flameHeight, flameWidth, turbulence, flickerSpeed } = params;
  const layerSpread = [0.07, 0.28, 0.60][layer];
  const speedF      = [2.55, 1.62, 0.88][layer];
  const sizeR       = [[4, 11], [11, 25], [21, 49]][layer];
  const decayR      = [[0.020, 0.028], [0.010, 0.015], [0.004, 0.007]][layer];

  const hScale = flameHeight / 80;
  // velocity scales base speed; capped at 4× to avoid crazy particle flight
  const vMult = Math.max(0.1, Math.min(4.0, velF));
  const spd   = hScale * speedF * vMult * 1.6 * (0.88 + (flickerSpeed / 100) * 0.26);
  const spread = flameWidth * layerSpread;

  const ox = layer === 0 && tongueX !== undefined
    ? tongueX + (Math.random() - 0.5) * spread * 0.82
    : cx + (Math.random() - 0.5) * spread;

  // Fan lateral velocity — wider flames spread outward at the edges
  const lateralBias = (ox - cx) / Math.max(1, flameWidth * 0.5);  // −1..+1
  const lateralV    = lateralBias * Math.max(0, (flameWidth - 80) / 300) * 0.60;

  // Faster jets decay quicker, giving a crisper, more defined silhouette
  const decayMult = 0.65 + Math.min(vMult, 2.0) * 0.30;

  return {
    x: ox, y: cy + (Math.random() - 0.5) * (flameWidth * 0.03),
    vx: (Math.random() - 0.5) * (turbulence / 100) * 0.5 + wvx * 0.3 + lateralV,
    vy: -(Math.random() * spd * 0.42 + spd * 0.58),
    life: 0.80 + Math.random() * 0.20,
    decay: (decayR[0] + Math.random() * (decayR[1] - decayR[0])) * decayMult,
    size:  sizeR[0] + Math.random() * (sizeR[1] - sizeR[0]),
    layer, ox,
    flk: Math.random() * Math.PI * 2,
  };
}

function spawnEmber(cx, cy, params, wvx, wvy, velF) {
  const { flameWidth, flameHeight } = params;
  const hScale = flameHeight / 80;
  const vMult  = Math.max(0.6, Math.min(3.0, velF));
  const ang    = -Math.PI / 2 + Math.atan2(wvy, wvx + 1e-6) * 0.4 + (Math.random() - 0.5) * 1.1;
  const spd    = (1.4 + Math.random() * 2.8) * hScale * vMult;
  return {
    x: cx + (Math.random() - 0.5) * flameWidth * 0.5,
    y: cy - Math.random() * flameHeight * hScale * 0.35,
    vx: Math.cos(ang) * spd + wvx * 0.55,
    vy: Math.sin(ang) * spd,
    life: 0.65 + Math.random() * 0.35,
    decay: 0.005 + Math.random() * 0.006,
    size: 1.2 + Math.random() * 2.2,
    bright: 0.68 + Math.random() * 0.32,
    px: 0, py: 0,
  };
}

function spawnSpark(cx, cy, params, wvx, wvy, velF) {
  const { flameWidth, flameHeight } = params;
  const hScale = flameHeight / 80;
  const vMult  = Math.max(0.6, Math.min(3.0, velF));
  const ang    = -Math.PI / 2 + Math.atan2(wvy, wvx + 1e-6) * 0.5 + (Math.random() - 0.5) * 1.4;
  const spd    = (3.5 + Math.random() * 5.5) * hScale * vMult;
  return {
    x: cx + (Math.random() - 0.5) * flameWidth * 0.30,
    y: cy - Math.random() * flameHeight * hScale * 0.22,
    vx: Math.cos(ang) * spd + wvx * 0.75,
    vy: Math.sin(ang) * spd,
    life: 0.55 + Math.random() * 0.45,
    decay: 0.014 + Math.random() * 0.022,
    // sparks lengthen with velocity for jet-like streaks
    len: (5 + Math.random() * 12) * Math.max(0.8, vMult * 0.7),
  };
}

function spawnSmoke(cx, cy, params, wvx) {
  const { flameWidth, flameHeight } = params;
  const hScale = flameHeight / 80;
  return {
    x: cx + (Math.random() - 0.5) * flameWidth * 0.35,
    y: cy - flameHeight * hScale * (0.72 + Math.random() * 0.30),
    vx: (Math.random() - 0.5) * 0.34 + wvx * 0.44,
    vy: -(0.20 + Math.random() * 0.38),
    life: 0.55 + Math.random() * 0.45,
    decay: 0.0020 + Math.random() * 0.0028,
    size: flameWidth * (0.15 + Math.random() * 0.22),
    rot: Math.random() * Math.PI * 2,
    drot: (Math.random() - 0.5) * 0.013,
  };
}

// ─── Base caps (scaled by quality.capScale) ──────────────────────────────────
const BASE_CAPS = { flames: 560, embers: 140, sparks: 190, smokes: 70 };

// ─── Effect factory ──────────────────────────────────────────────────────────
export function createFireEffect() {
  let flames = [], embers = [], sparks = [], smokes = [];
  let time = 0;

  return {
    reset() { flames = []; embers = []; sparks = []; smokes = []; time = 0; },

    update(ctx, canvas, params, dt, renderOpts = {}) {
      _nc.clear();

      const ql = getQuality(renderOpts.quality ?? 'preview');
      const {
        intensity, flameHeight, flameWidth, turbulence, flickerSpeed,
        windDir, windStrength, emberAmount, sparkAmount,
        bloom, heatDistortion, colorTemp = 50, coreBrightness, smokeAmount,
        colorPreset = 'natural', velocity = 50,
      } = params;

      const ct     = colorTemp;      // 0-100, passed to paletteRGB (50=neutral)
      const intF   = intensity / 100;
      const flickF = flickerSpeed / 100;
      const hScale = flameHeight / 80;
      const velF   = velocity / 100;   // 0.05 → 2.0
      const ss     = ql.spawnScale;
      const cs     = ql.capScale;

      const wRad = (windDir * Math.PI) / 180;
      const wF   = (windStrength / 100) * 2.8;
      const wvx  =  Math.sin(wRad) * wF;
      const wvy  = -Math.abs(Math.cos(wRad)) * wF * 0.18;

      const cx = canvas.width  / 2;
      const cy = canvas.height * 0.78;

      time += dt * (0.55 + flickF * 0.90);

      // Coherent global flicker (shared pulse, not per-particle)
      const globalFlk = (
        Math.sin(time * 5.8)        * 0.50 +
        Math.sin(time * 11.3 + 0.7) * 0.30 +
        Math.sin(time * 17.8 + 1.4) * 0.20
      );

      // Tongue anchor points — more tongues for wider flames
      const numTongues = Math.max(3, Math.min(7, Math.floor(flameWidth / 40)));
      const tongues = Array.from({ length: numTongues }, (_, i) => {
        const base = numTongues > 1
          ? (i / (numTongues - 1) - 0.5) * flameWidth * 0.64
          : 0;
        return cx + base + Math.sin(time * 2.8 + i * 2.1) * flameWidth * 0.05;
      });

      // ── Spawn ──────────────────────────────────────────────────────────
      const capFlame = BASE_CAPS.flames * cs | 0;
      const total    = intF * 36 * ss * (1 + globalFlk * 0.10);
      [0.26, 0.44, 0.30].forEach((ratio, layer) => {
        if (flames.length >= capFlame) return;
        const n = Math.floor(total * ratio + Math.random() * total * ratio * 0.4);
        for (let i = 0; i < n && flames.length < capFlame; i++) {
          const tx = layer === 0 ? tongues[i % numTongues] : undefined;
          flames.push(spawnFlame(cx, cy, params, layer, wvx, wvy, tx, velF));
        }
      });

      if (ql.enableEmbers && emberAmount > 0 && embers.length < (BASE_CAPS.embers * cs | 0)) {
        if (Math.random() < (emberAmount / 100) * intF * 1.4 * ss)
          embers.push(spawnEmber(cx, cy, params, wvx, wvy, velF));
      }

      if (ql.enableSparks && sparkAmount > 0 && sparks.length < (BASE_CAPS.sparks * cs | 0)) {
        const r = (sparkAmount / 100) * intF * 0.80 * ss;
        if (Math.random() < r)       sparks.push(spawnSpark(cx, cy, params, wvx, wvy, velF));
        if (Math.random() < r * 0.4) sparks.push(spawnSpark(cx, cy, params, wvx, wvy, velF));
      }

      if (ql.enableSmoke && smokeAmount > 0 && smokes.length < (BASE_CAPS.smokes * cs | 0)) {
        if (Math.random() < (smokeAmount / 100) * intF * 0.25 * ss)
          smokes.push(spawnSmoke(cx, cy, params, wvx));
      }

      // ── Physics ────────────────────────────────────────────────────────
      for (let i = flames.length - 1; i >= 0; i--) {
        const p = flames[i];
        const turb  = noise4(p.ox, time) * (turbulence / 100) * 2.0;
        const flick = Math.sin(time * 7.5 + p.flk) * flickF * 0.28;
        p.x  += (p.vx + turb * 0.55 + wvx * 0.04 + flick) * dt * 60;
        p.vx *= 0.966;
        p.y  += (p.vy + wvy * 0.038) * dt * 60;
        p.vy *= 0.998;
        p.life  -= p.decay * (1 + flickF * 0.28);
        p.size  *= 0.9972;
        if (p.life <= 0) flames.splice(i, 1);
      }

      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i];
        e.px = e.x; e.py = e.y;
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

      // Y stretch increases with velocity: jet flames are narrow and very tall
      const vClamp = Math.min(velF, 2.0);
      const scaleYs   = [1.90 + vClamp * 0.62, 1.68 + vClamp * 0.32, 1.42 + vClamp * 0.16];
      const aScales   = [0.82, 0.58, 0.30];
      const windShear = wvx * 0.065;

      // 1. Ground glow — palette-tinted, pulsing with global flicker
      ctx.globalCompositeOperation = 'screen';
      ctx.save();
      const glowPulse = 1 + globalFlk * 0.07;
      ctx.translate(cx + wvx * 8, cy);
      ctx.scale(1, 0.24);
      const { r: gR, g: gG, b: gB } = paletteRGB(0.62, colorPreset, ct);
      const bgG = ctx.createRadialGradient(0, 0, 0, 0, 0, flameWidth * 0.76 * glowPulse);
      bgG.addColorStop(0,   `rgba(${gR},${gG},${gB},${(intF * 0.70).toFixed(3)})`);
      bgG.addColorStop(0.42,`rgba(${gR >> 1},${gG >> 2},0,${(intF * 0.27).toFixed(3)})`);
      bgG.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = bgG;
      ctx.beginPath();
      ctx.arc(0, 0, flameWidth * 0.76 * glowPulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 2. Flame layers — back-to-front (layer 2 outermost, layer 0 core)
      for (let layer = 2; layer >= 0; layer--) {
        const aS = aScales[layer];
        const sY = scaleYs[layer];
        for (const p of flames) {
          if (p.layer !== layer) continue;
          const alpha = p.life * aS * intF;
          if (alpha < 0.016) continue;

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.transform(1, 0, windShear * (1 - p.life), sY, 0, 0);

          const g = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
          if (stops === 2) {
            g.addColorStop(0, fc(p.life, colorPreset, ct, alpha));
            g.addColorStop(1, 'rgba(0,0,0,0)');
          } else if (stops === 3) {
            g.addColorStop(0,    fc(p.life,                    colorPreset, ct, alpha));
            g.addColorStop(0.48, fc(Math.max(0, p.life - 0.22), colorPreset, ct, alpha * 0.38));
            g.addColorStop(1,    'rgba(0,0,0,0)');
          } else {
            g.addColorStop(0,    fc(p.life,                    colorPreset, ct, alpha));
            g.addColorStop(0.30, fc(Math.max(0, p.life - 0.14), colorPreset, ct, alpha * 0.62));
            g.addColorStop(0.65, fc(Math.max(0, p.life - 0.34), colorPreset, ct, alpha * 0.24));
            g.addColorStop(1,    'rgba(0,0,0,0)');
          }

          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // 3. White-hot core (High / Ultra)
      if (ql.corePass) {
        const cbF = coreBrightness / 100;
        const { r: cR, g: cG, b: cB } = paletteRGB(1.0, colorPreset, ct);
        const wr = Math.round(Math.min(255, cR + (255 - cR) * 0.80));
        const wg = Math.round(Math.min(255, cG + (255 - cG) * 0.80));
        const wb = Math.round(Math.min(255, cB + (255 - cB) * 0.80));
        for (const p of flames) {
          if (p.layer !== 0 || p.life < 0.52) continue;
          const cAlpha = p.life * cbF * 0.76;
          if (cAlpha < 0.02) continue;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.transform(1, 0, windShear * (1 - p.life), scaleYs[0], 0, 0);
          const cs2 = p.size * 0.26;
          const cg  = ctx.createRadialGradient(0, 0, 0, 0, 0, cs2);
          cg.addColorStop(0,   `rgba(${wr},${wg},${wb},${cAlpha.toFixed(3)})`);
          cg.addColorStop(0.5, `rgba(${cR},${cG},${cB},${(cAlpha * 0.38).toFixed(3)})`);
          cg.addColorStop(1,   'rgba(0,0,0,0)');
          ctx.fillStyle = cg;
          ctx.beginPath();
          ctx.arc(0, 0, cs2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // 4. Embers — palette-tinted glow + motion trail at high velocity
      if (ql.enableEmbers) {
        const { r: eR, g: eG, b: eB } = paletteRGB(0.70, colorPreset, ct);
        const { r: eCR, g: eCG, b: eCB } = paletteRGB(0.95, colorPreset, ct);
        for (const e of embers) {
          const ea = e.life * e.bright * 0.94;
          if (ea < 0.02) continue;

          // Motion trail for fast embers (velF > 0.9)
          if (velF > 0.9 && e.px !== 0) {
            const dx = e.x - e.px, dy = e.y - e.py;
            const tLen = Math.sqrt(dx * dx + dy * dy);
            if (tLen > 0.5) {
              ctx.save();
              const tg = ctx.createLinearGradient(e.px, e.py, e.x, e.y);
              tg.addColorStop(0, `rgba(${eR},${eG >> 1},0,0)`);
              tg.addColorStop(1, `rgba(${eR},${eG},${eB},${(ea * 0.45).toFixed(3)})`);
              ctx.strokeStyle = tg;
              ctx.lineWidth = e.size * 0.55;
              ctx.beginPath();
              ctx.moveTo(e.px, e.py);
              ctx.lineTo(e.x, e.y);
              ctx.stroke();
              ctx.restore();
            }
          }

          ctx.save();
          ctx.translate(e.x, e.y);
          const eg = ctx.createRadialGradient(0, 0, 0, 0, 0, e.size * 2.5);
          eg.addColorStop(0,   `rgba(${eR},${eG},${eB},${ea.toFixed(3)})`);
          eg.addColorStop(0.5, `rgba(${eR >> 1},${eG >> 2},0,${(ea * 0.44).toFixed(3)})`);
          eg.addColorStop(1,   'rgba(0,0,0,0)');
          ctx.fillStyle = eg;
          ctx.beginPath();
          ctx.arc(0, 0, e.size * 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = `rgba(${eCR},${eCG},${eCB},${Math.min(1, ea * 1.1).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(0, 0, e.size * 0.42, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // 5. Sparks — gradient streaks, palette-tinted, length scales with velocity
      if (ql.enableSparks) {
        const { r: sR, g: sG, b: sB } = paletteRGB(0.90, colorPreset, ct);
        for (const s of sparks) {
          const spd2 = Math.sqrt(s.vx * s.vx + s.vy * s.vy) + 1e-6;
          const nx = s.vx / spd2, ny = s.vy / spd2;
          const sa = s.life * 0.94;
          if (sa < 0.02) continue;
          ctx.save();
          const tg = ctx.createLinearGradient(
            s.x - nx * s.len * 0.62, s.y - ny * s.len * 0.62,
            s.x + nx * s.len * 0.38, s.y + ny * s.len * 0.38,
          );
          tg.addColorStop(0,   'rgba(0,0,0,0)');
          tg.addColorStop(0.6, `rgba(${sR},${sG},${sB >> 1},${(sa * 0.62).toFixed(3)})`);
          tg.addColorStop(1,   `rgba(${sR},${sG},${sB},${sa.toFixed(3)})`);
          ctx.strokeStyle = tg;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(s.x - nx * s.len * 0.62, s.y - ny * s.len * 0.62);
          ctx.lineTo(s.x + nx * s.len * 0.38, s.y + ny * s.len * 0.38);
          ctx.stroke();
          ctx.restore();
        }
      }

      // 6. Smoke — dark wispy puffs above the column
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
          sg.addColorStop(0,   `rgba(22,17,13,${sa2.toFixed(3)})`);
          sg.addColorStop(0.5, `rgba(14,11,9,${(sa2 * 0.40).toFixed(3)})`);
          sg.addColorStop(1,   'rgba(0,0,0,0)');
          ctx.fillStyle = sg;
          ctx.beginPath();
          ctx.arc(0, 0, s.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        ctx.globalCompositeOperation = 'screen';
      }

      // 7. Bloom — soft halo using palette mid color, taller for high velocity
      if (ql.enableBloom && bloom > 5) {
        const blF   = bloom / 100;
        const blRX  = flameWidth * 1.28 * (0.45 + hScale * 0.55);
        const blRY  = blRX * (1.70 + vClamp * 0.22);  // taller at high velocity
        const blCX  = cx + wvx * 16;
        const blCY  = cy - flameHeight * hScale * 0.40;
        const { r: blR, g: blG } = paletteRGB(0.52, colorPreset, ct);
        const blGrd = ctx.createRadialGradient(blCX, blCY, 0, blCX, blCY, blRX);
        blGrd.addColorStop(0,   `rgba(${blR},${blG},6,${(blF * intF * 0.24).toFixed(3)})`);
        blGrd.addColorStop(0.42,`rgba(${blR >> 1},${blG >> 2},2,${(blF * intF * 0.11).toFixed(3)})`);
        blGrd.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = blGrd;
        ctx.beginPath();
        ctx.ellipse(blCX, blCY, blRX, blRY, 0, 0, Math.PI * 2);
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
        } catch {
          // Heat distortion is optional; ignore unsupported canvas readback paths.
        }
      }

      ctx.restore();
    },
  };
}
