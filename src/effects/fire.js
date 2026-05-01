// ─── Pseudo-noise: 4 summed sines for organic turbulence ─────────────────────
function noise4(x, t, freqScale) {
  const f = freqScale;
  return (
    Math.sin(x * 0.023 * f + t * 2.1)         * 0.40 +
    Math.sin(x * 0.041 * f + t * 1.4 + 1.2)   * 0.30 +
    Math.sin(x * 0.017 * f + t * 3.0 + 0.7)   * 0.20 +
    Math.sin(x * 0.061 * f + t * 4.2 + 2.1)   * 0.10
  );
}

// ─── Multi-stop fire color ────────────────────────────────────────────────────
function fireColor(life, ct, alpha) {
  const warm = [
    { l: 1.0,  r: 255, g: 255, b: 220 },
    { l: 0.78, r: 255, g: 210, b: 60  },
    { l: 0.50, r: 255, g: 90,  b: 10  },
    { l: 0.20, r: 190, g: 22,  b: 0   },
    { l: 0.0,  r: 40,  g: 4,   b: 0   },
  ];
  const cool = [
    { l: 1.0,  r: 210, g: 235, b: 255 },
    { l: 0.78, r: 70,  g: 130, b: 255 },
    { l: 0.50, r: 18,  g: 55,  b: 220 },
    { l: 0.20, r: 4,   g: 12,  b: 100 },
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

  const w = lerp(warm, life);
  const c = lerp(cool, life);
  return `rgba(${Math.round(c.r + (w.r - c.r) * ct)},${Math.round(c.g + (w.g - c.g) * ct)},${Math.round(c.b + (w.b - c.b) * ct)},${alpha.toFixed(3)})`;
}

// ─── Spawn helpers ────────────────────────────────────────────────────────────
function spawnFlame(cx, cy, params, layer, wvx, wvy) {
  const { flameHeight, flameWidth, turbulence, flickerSpeed } = params;

  const spreadF = [0.09, 0.30, 0.62][layer];
  const speedF  = [2.30, 1.55, 0.85][layer];
  const sizeR   = [[4, 13], [13, 30], [26, 56]][layer];
  const decayR  = [[0.016, 0.025], [0.008, 0.013], [0.004, 0.007]][layer];
  const lifeMax = [1.0, 0.98, 0.94][layer];

  const hScale  = flameHeight / 80;
  const spd     = hScale * speedF * (0.88 + (flickerSpeed / 100) * 0.26);
  const spread  = flameWidth * spreadF;
  const ox      = cx + (Math.random() - 0.5) * spread;

  return {
    x: ox + (Math.random() - 0.5) * 2,
    y: cy  + (Math.random() - 0.5) * (flameWidth * 0.06),
    vx: (Math.random() - 0.5) * (turbulence / 100) * 0.55 + wvx * 0.35,
    vy: -(Math.random() * spd * 0.42 + spd * 0.58),
    life:  0.78 + Math.random() * (lifeMax - 0.78),
    decay: decayR[0] + Math.random() * (decayR[1] - decayR[0]),
    size:  sizeR[0]  + Math.random() * (sizeR[1]  - sizeR[0]),
    layer,
    ox,
    flk: Math.random() * Math.PI * 2,
  };
}

function spawnEmber(cx, cy, params, wvx, wvy) {
  const { flameWidth, flameHeight } = params;
  const hScale = flameHeight / 80;
  const baseAngle = -Math.PI / 2 + Math.atan2(wvy, wvx + 1e-6) * 0.4;
  const angle = baseAngle + (Math.random() - 0.5) * 1.1;
  const spd = (1.4 + Math.random() * 2.8) * hScale;
  return {
    x: cx + (Math.random() - 0.5) * flameWidth * 0.55,
    y: cy - Math.random() * flameHeight * hScale * 0.35,
    vx: Math.cos(angle) * spd + wvx * 0.55,
    vy: Math.sin(angle) * spd,
    life:  0.65 + Math.random() * 0.35,
    decay: 0.005 + Math.random() * 0.007,
    size:  1.2 + Math.random() * 2.4,
    bright: 0.65 + Math.random() * 0.35,
  };
}

function spawnSpark(cx, cy, params, wvx, wvy) {
  const { flameWidth, flameHeight } = params;
  const hScale = flameHeight / 80;
  const baseAngle = -Math.PI / 2 + Math.atan2(wvy, wvx + 1e-6) * 0.5;
  const angle = baseAngle + (Math.random() - 0.5) * 1.4;
  const spd = (3.5 + Math.random() * 5.5) * hScale;
  return {
    x: cx + (Math.random() - 0.5) * flameWidth * 0.35,
    y: cy - Math.random() * flameHeight * hScale * 0.25,
    vx: Math.cos(angle) * spd + wvx * 0.75,
    vy: Math.sin(angle) * spd,
    pvx: 0, pvy: 0,   // previous vel for trail
    life:  0.55 + Math.random() * 0.45,
    decay: 0.016 + Math.random() * 0.024,
    len:   5 + Math.random() * 12,
  };
}

function spawnSmoke(cx, cy, params, wvx, wvy) {
  const { flameWidth, flameHeight } = params;
  const hScale = flameHeight / 80;
  return {
    x: cx + (Math.random() - 0.5) * flameWidth * 0.38,
    y: cy - flameHeight * hScale * (0.72 + Math.random() * 0.28),
    vx: (Math.random() - 0.5) * 0.38 + wvx * 0.45,
    vy: -(0.25 + Math.random() * 0.45),
    life:  0.55 + Math.random() * 0.45,
    decay: 0.0025 + Math.random() * 0.0035,
    size:  flameWidth * (0.14 + Math.random() * 0.22),
    rot:   Math.random() * Math.PI * 2,
    drot:  (Math.random() - 0.5) * 0.018,
  };
}

// ─── Main effect ──────────────────────────────────────────────────────────────
const MAX_FLAME  = 700;
const MAX_EMBERS = 180;
const MAX_SPARKS = 240;
const MAX_SMOKE  =  90;

export function createFireEffect() {
  let flames  = [];
  let embers  = [];
  let sparks  = [];
  let smokes  = [];
  let time    = 0;

  return {
    reset() { flames = []; embers = []; sparks = []; smokes = []; time = 0; },

    update(ctx, canvas, params, dt) {
      const {
        intensity, flameHeight, flameWidth, turbulence, flickerSpeed,
        windDir, windStrength, emberAmount, sparkAmount,
        bloom, heatDistortion, colorTemp, coreBrightness, smokeAmount,
      } = params;

      const ct      = colorTemp    / 100;
      const intF    = intensity    / 100;
      const flickF  = flickerSpeed / 100;
      const hScale  = flameHeight  / 80;

      // wind vector: windDir degrees — 0 = straight up (no lean)
      const wRad = (windDir * Math.PI) / 180;
      const wF   = (windStrength / 100) * 2.8;
      const wvx  =  Math.sin(wRad) * wF;
      const wvy  = -Math.abs(Math.cos(wRad)) * wF * 0.18;

      const cx = canvas.width  / 2;
      const cy = canvas.height * 0.78;

      time += dt * (0.55 + flickF * 0.90);

      // ── Spawn ────────────────────────────────────────────────────────────
      const total = intF * 42;
      [0.22, 0.48, 0.30].forEach((ratio, layer) => {
        if (flames.length >= MAX_FLAME) return;
        const n = Math.floor(total * ratio + Math.random() * total * ratio * 0.5);
        for (let i = 0; i < n && flames.length < MAX_FLAME; i++) {
          flames.push(spawnFlame(cx, cy, params, layer, wvx, wvy));
        }
      });

      if (emberAmount > 0 && embers.length < MAX_EMBERS) {
        const r = (emberAmount / 100) * intF * 1.6;
        if (Math.random() < r) embers.push(spawnEmber(cx, cy, params, wvx, wvy));
      }

      if (sparkAmount > 0 && sparks.length < MAX_SPARKS) {
        const r = (sparkAmount / 100) * intF * 0.9;
        if (Math.random() < r)       sparks.push(spawnSpark(cx, cy, params, wvx, wvy));
        if (Math.random() < r * 0.5) sparks.push(spawnSpark(cx, cy, params, wvx, wvy));
      }

      if (smokeAmount > 0 && smokes.length < MAX_SMOKE) {
        const r = (smokeAmount / 100) * intF * 0.28;
        if (Math.random() < r) smokes.push(spawnSmoke(cx, cy, params, wvx, wvy));
      }

      // ── Physics ──────────────────────────────────────────────────────────
      for (let i = flames.length - 1; i >= 0; i--) {
        const p = flames[i];
        const turb  = noise4(p.ox, time, 1.0) * (turbulence / 100) * 1.9;
        const flick = Math.sin(time * 7.5 + p.flk) * flickF * 0.28;
        p.x  += (p.vx + turb * 0.55 + wvx * 0.038 + flick) * dt * 60;
        p.vx *= 0.965;
        p.y  += (p.vy + wvy * 0.038) * dt * 60;
        p.vy *= 0.998;
        p.life  -= p.decay * (1 + flickF * 0.28);
        p.size  *= 0.9968;
        if (p.life <= 0) flames.splice(i, 1);
      }

      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i];
        e.vx += wvx * 0.014 * dt * 60;
        e.vy += 0.014 * dt * 60;      // gravity
        e.vx *= 0.994;
        e.x  += e.vx * dt * 60;
        e.y  += e.vy * dt * 60;
        e.life -= e.decay;
        if (e.life <= 0) embers.splice(i, 1);
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.pvx = s.vx; s.pvy = s.vy;
        s.vx += wvx * 0.018 * dt * 60;
        s.vy += 0.022 * dt * 60;      // gravity
        s.vx *= 0.990;
        s.x  += s.vx * dt * 60;
        s.y  += s.vy * dt * 60;
        s.life -= s.decay;
        if (s.life <= 0) sparks.splice(i, 1);
      }

      for (let i = smokes.length - 1; i >= 0; i--) {
        const s = smokes[i];
        s.x    += (s.vx + wvx * 0.04) * dt * 60;
        s.y    += s.vy * dt * 60;
        s.rot  += s.drot;
        s.size *= 1.0042;
        s.life -= s.decay;
        if (s.life <= 0) smokes.splice(i, 1);
      }

      // ── Draw ─────────────────────────────────────────────────────────────
      ctx.save();

      // 1. Ground base glow
      ctx.globalCompositeOperation = 'screen';
      ctx.save();
      ctx.translate(cx + wvx * 8, cy);
      ctx.scale(1, 0.26);
      const baseR = flameWidth * 0.68;
      const bg = ctx.createRadialGradient(0, 0, 0, 0, 0, baseR);
      const bR = Math.round(255 * ct + 55 * (1 - ct));
      const bG = Math.round(145 * ct + 75 * (1 - ct));
      const bB = Math.round(12  * ct + 210 * (1 - ct));
      bg.addColorStop(0,   `rgba(${bR},${bG},${bB},${intF * 0.68})`);
      bg.addColorStop(0.45,`rgba(${Math.round(bR*0.5)},${Math.round(bG*0.22)},0,${intF * 0.28})`);
      bg.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.arc(0, 0, baseR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 2. Flame particle layers (outer → inner, so core renders on top)
      for (let layer = 2; layer >= 0; layer--) {
        const aScale = [0.80, 0.56, 0.30][layer];
        const scaleY = [1.85, 1.65, 1.40][layer];

        for (const p of flames) {
          if (p.layer !== layer) continue;
          ctx.save();
          ctx.translate(p.x, p.y);

          // wind shear on aged particles
          const shear = wvx * (1 - p.life) * 0.035;
          ctx.transform(1, 0, shear, scaleY, 0, 0);

          const alpha = p.life * aScale * intF;
          const g = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
          g.addColorStop(0,    fireColor(p.life,                    ct, alpha));
          g.addColorStop(0.32, fireColor(Math.max(0, p.life - 0.16), ct, alpha * 0.60));
          g.addColorStop(0.68, fireColor(Math.max(0, p.life - 0.36), ct, alpha * 0.22));
          g.addColorStop(1,    'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // 3. White-hot core pass
      const cbF = coreBrightness / 100;
      for (const p of flames) {
        if (p.layer !== 0 || p.life < 0.48) continue;
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.translate(p.x, p.y);
        ctx.scale(1, 1.85);
        const cs = p.size * 0.28;
        const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, cs);
        cg.addColorStop(0,   `rgba(255,255,255,${(p.life * cbF * 0.75).toFixed(3)})`);
        cg.addColorStop(0.5, `rgba(255,245,180,${(p.life * cbF * 0.38).toFixed(3)})`);
        cg.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(0, 0, cs, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 4. Embers
      ctx.globalCompositeOperation = 'screen';
      for (const e of embers) {
        ctx.save();
        ctx.translate(e.x, e.y);
        const ea = e.life * e.bright * 0.92;
        const eg = ctx.createRadialGradient(0, 0, 0, 0, 0, e.size * 2.2);
        eg.addColorStop(0,   `rgba(255,200,80,${ea.toFixed(3)})`);
        eg.addColorStop(0.45,`rgba(255,90,18,${(ea * 0.55).toFixed(3)})`);
        eg.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = eg;
        ctx.beginPath();
        ctx.arc(0, 0, e.size * 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255,255,200,${ea.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(0, 0, e.size * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 5. Sparks (velocity-aligned streaks)
      ctx.globalCompositeOperation = 'screen';
      for (const s of sparks) {
        const spd = Math.sqrt(s.vx * s.vx + s.vy * s.vy) + 1e-6;
        const nx = s.vx / spd;
        const ny = s.vy / spd;
        const sa = s.life * 0.92;
        ctx.save();
        ctx.strokeStyle = `rgba(255,235,140,${sa.toFixed(3)})`;
        ctx.lineWidth = 1.3;
        ctx.shadowColor = `rgba(255,170,50,${(sa * 0.7).toFixed(3)})`;
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.moveTo(s.x - nx * s.len * 0.55, s.y - ny * s.len * 0.55);
        ctx.lineTo(s.x + nx * s.len * 0.45, s.y + ny * s.len * 0.45);
        ctx.stroke();
        ctx.restore();
      }

      // 6. Smoke puffs (source-over, drawn after bright layers)
      if (smokeAmount > 0) {
        ctx.globalCompositeOperation = 'source-over';
        const smF = smokeAmount / 100;
        for (const s of smokes) {
          ctx.save();
          ctx.translate(s.x, s.y);
          ctx.rotate(s.rot);
          const sa = s.life * smF * 0.20;
          const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, s.size);
          sg.addColorStop(0,   `rgba(28,22,18,${sa.toFixed(3)})`);
          sg.addColorStop(0.55,`rgba(18,15,12,${(sa * 0.45).toFixed(3)})`);
          sg.addColorStop(1,   'rgba(0,0,0,0)');
          ctx.fillStyle = sg;
          ctx.beginPath();
          ctx.arc(0, 0, s.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // 7. Bloom / outer glow envelope
      if (bloom > 5) {
        ctx.globalCompositeOperation = 'screen';
        const blF    = bloom / 100;
        const blR    = flameWidth * 1.25 * (0.45 + hScale * 0.55);
        const blCX   = cx  + wvx * 14;
        const blCY   = cy  - flameHeight * hScale * 0.38;
        const blGrad = ctx.createRadialGradient(blCX, blCY, 0, blCX, blCY, blR);
        const blR2   = Math.round(255 * ct + 55 * (1 - ct));
        const blG2   = Math.round(75  * ct + 45 * (1 - ct));
        blGrad.addColorStop(0,   `rgba(${blR2},${blG2},8,${(blF * intF * 0.24).toFixed(3)})`);
        blGrad.addColorStop(0.42,`rgba(${Math.round(blR2 * 0.55)},18,4,${(blF * intF * 0.11).toFixed(3)})`);
        blGrad.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = blGrad;
        ctx.beginPath();
        ctx.ellipse(blCX, blCY, blR, blR * 1.65, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // 8. Heat distortion (pixel-row horizontal displacement on the flame column)
      if (heatDistortion > 8) {
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
                Math.sin(row * 0.19 + time * 5.2)          * amp +
                Math.sin(row * 0.32 + time * 3.4 + 1.3)    * amp * 0.45
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
        } catch (_) {
          // tainted canvas — skip
        }
      }

      ctx.restore();
    },
  };
}
