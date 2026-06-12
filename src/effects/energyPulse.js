/**
 * energyPulse.js — Cinematic shockwave / energy pulse renderer  (pass 2)
 *
 * Rebuilt from the flat-ring version:
 *   • Pulse cycle with anticipation: the core swells and flickers during a
 *     charge phase, then releases with an emission flash before each wavefront.
 *   • Wavefronts decelerate as they expand (1/(1+k·age) velocity decay) and are
 *     drawn in three passes: soft inner afterglow trail, colored body, and a
 *     white-hot leading edge — instead of a single uniform stroke.
 *   • Per-wave radial distortion (3 sine harmonics, growing with radius) and
 *     angular breakup so fronts read as plasma, not vector circles.
 *   • Ambient energy motes drift around the source, get pulled inward while
 *     the core charges, and are kicked outward + heated when a front passes.
 *   • Emission sparks streak out at each release; ambient haze breathes with
 *     the charge/flash envelope.
 */

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function mix(a, b, t) {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

const rgba = (c, a) => `rgba(${c.r},${c.g},${c.b},${Math.max(0, Math.min(1, a))})`;
const clamp01 = v => Math.max(0, Math.min(1, v));
const WHITE = { r: 255, g: 255, b: 255 };

export function createEnergyPulseEffect() {
  let waves = [];        // { r, v, age, delay, seed, gain }
  let motes = [];        // { ang, r, om, tw, size, kick, heat, wob }
  let sparks = [];       // { x, y, vx, vy, life, maxLife, w }
  let cycleT = 0;        // time since last emission
  let flashE = 0;        // emission flash energy, decays exponentially
  let time = 0;
  let firstFrame = true;

  function emitPulse(P, cx, cy, maxR) {
    const gap = 0.10 + 0.04 * Math.random();
    for (let i = 0; i < P.waveCount; i++) {
      waves.push({
        r: 0,
        v: P.v0 * (0.92 + Math.random() * 0.16),
        age: 0,
        delay: i * gap,
        seed: Math.random() * 1000,
        gain: 1 - i * 0.18,
      });
    }
    flashE = P.flash;

    const n = Math.round(P.sparkAmt * 26);
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const v = P.v0 * (0.45 + Math.random() * 0.95);
      sparks.push({
        x: cx + Math.cos(ang) * 4,
        y: cy + Math.sin(ang) * 4,
        vx: Math.cos(ang) * v,
        vy: Math.sin(ang) * v,
        life: 0,
        maxLife: 0.35 + Math.random() * 0.6,
        w: 0.8 + Math.random() * 1.4,
      });
    }
  }

  function spawnMote(maxR, coreR) {
    return {
      ang: Math.random() * Math.PI * 2,
      r: coreR * 1.4 + Math.random() * (maxR * 0.85 - coreR * 1.4),
      om: (Math.random() - 0.5) * 0.5,
      tw: Math.random() * Math.PI * 2,
      size: 0.8 + Math.random() * 1.8,
      wob: Math.random() * Math.PI * 2,
      kick: 0,
      heat: 0,
    };
  }

  return {
    reset() {
      waves = [];
      motes = [];
      sparks = [];
      cycleT = 0;
      flashE = 0;
      time = 0;
      firstFrame = true;
    },

    update(ctx, canvas, params, dt, renderOpts = {}) {
      const w = canvas.width, h = canvas.height;
      const minDim = Math.min(w, h);
      time += dt;

      // ── normalize params (with fallbacks for old saved presets) ──
      const rate       = params.rate       ?? params.speed ?? 40;
      const range      = params.range      ?? (params.radius ? params.radius / 4 : 80);
      const thickness  = params.thickness  ?? 7;
      const intensity  = (params.intensity ?? 85) / 100;
      const P = {
        waveCount: Math.round(params.waveCount ?? 2),
        chargeUp:  (params.chargeUp   ?? 55) / 100,
        flash:     (params.flash      ?? 65) / 100,
        speed:     (params.speed      ?? 55),
        decel:     (params.deceleration ?? 45) / 100,
        sharp:     (params.sharpness  ?? 60) / 100,
        after:     (params.afterglow  ?? 45) / 100,
        dist:      (params.distortion ?? 30) / 100,
        breakup:   (params.breakup    ?? 25) / 100,
        shimmer:   (params.shimmer    ?? 40) / 100,
        moteAmt:   (params.motes      ?? 45) / 100,
        sparkAmt:  (params.sparks     ?? 50) / 100,
        edgeHeat:  (params.edgeHeat   ?? 65) / 100,
        haze:      (params.haze       ?? 35) / 100,
        coreSize:  (params.coreSize   ?? 50) / 100,
      };

      const cx = w * ((params.posX ?? 50) / 100);
      const cy = h * ((params.posY ?? 50) / 100);
      const maxR = minDim * 0.55 * (range / 100);
      const coreR = minDim * (0.018 + P.coreSize * 0.05);

      // Travel time across maxR sets base velocity; deceleration front-loads it
      const travelT = 3.5 - (P.speed / 100) * 2.9;
      P.v0 = (maxR / travelT) * (1 + P.decel * 0.9);
      P.flash *= intensity;

      const main = hexToRgb(params.color ?? '#22ccff');
      const core = hexToRgb(params.coreColor ?? '#eaffff');
      const hot  = mix(main, WHITE, 0.55 + P.edgeHeat * 0.45);
      const trail = mix(main, core, 0.15);

      // ── pulse cycle: charge → emit ──
      const period = 0.45 + ((100 - Math.min(100, rate)) * 0.038);
      cycleT += dt;
      if (firstFrame) {
        // fire immediately so the effect isn't blank at t=0
        firstFrame = false;
        cycleT = period;
      }
      if (cycleT >= period) {
        cycleT = 0;
        emitPulse(P, cx, cy, maxR);
      }
      flashE *= Math.exp(-6.5 * dt);

      // charge glow ramps over the last portion of the cycle
      const chargeFrac = 0.25 + P.chargeUp * 0.45;
      const cp = clamp01((cycleT / period - (1 - chargeFrac)) / chargeFrac);
      const charge = cp * cp * (3 - 2 * cp) * P.chargeUp; // smoothstep
      const flicker = 1 + charge * 0.14 * Math.sin(time * 43 + Math.sin(time * 17) * 3);

      // ── update waves ──
      for (let i = waves.length - 1; i >= 0; i--) {
        const wv = waves[i];
        if (wv.delay > 0) { wv.delay -= dt; continue; }
        wv.age += dt;
        wv.v = P.v0 / (1 + P.decel * 2.4 * wv.age);
        wv.r += wv.v * dt;
        if (wv.r >= maxR) waves.splice(i, 1);
      }

      // ── update motes ──
      const targetMotes = Math.round(P.moteAmt * 70);
      while (motes.length < targetMotes) motes.push(spawnMote(maxR, coreR));
      if (motes.length > targetMotes) motes.length = targetMotes;
      for (const m of motes) {
        m.ang += m.om * dt;
        m.wob += dt * 1.7;
        m.r += Math.sin(m.wob) * 6 * dt;
        // gathered inward while the core charges
        m.r -= charge * 38 * dt * (0.3 + m.r / maxR);
        // shoved outward when a wavefront passes
        for (const wv of waves) {
          if (wv.delay <= 0 && Math.abs(wv.r - m.r) < 16) {
            m.kick = Math.max(m.kick, wv.v * 0.5);
            m.heat = 1;
          }
        }
        m.r += m.kick * dt;
        m.kick *= Math.exp(-3.2 * dt);
        m.heat *= Math.exp(-2.6 * dt);
        if (m.r > maxR || m.r < coreR * 0.7) {
          Object.assign(m, spawnMote(maxR, coreR));
          m.r = coreR * 1.4 + Math.random() * maxR * 0.3;
        }
      }

      // ── update sparks ──
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life += dt;
        if (s.life >= s.maxLife) { sparks.splice(i, 1); continue; }
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vx *= Math.exp(-2.8 * dt);
        s.vy *= Math.exp(-2.8 * dt);
      }

      // ── render ──
      const quality = renderOpts.quality ?? 'high';
      const SEG = quality === 'draft' ? 60 : quality === 'preview' ? 90 : 120;
      const CHUNKS = 15;

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // ambient haze, breathing with charge and flash
      if (P.haze > 0.01) {
        const hazeR = maxR * (0.55 + charge * 0.12 + flashE * 0.25);
        const hazeA = P.haze * intensity * (0.10 + charge * 0.10 + flashE * 0.30);
        const gz = ctx.createRadialGradient(cx, cy, 0, cx, cy, hazeR);
        gz.addColorStop(0, rgba(main, hazeA));
        gz.addColorStop(0.6, rgba(main, hazeA * 0.4));
        gz.addColorStop(1, rgba(main, 0));
        ctx.fillStyle = gz;
        ctx.fillRect(cx - hazeR, cy - hazeR, hazeR * 2, hazeR * 2);
      }

      // wavefronts
      for (const wv of waves) {
        if (wv.delay > 0 || wv.r < 1) continue;
        const x = wv.r / maxR;
        const env = Math.pow(1 - x, 1.35) * Math.min(1, wv.r / (thickness * 2));
        const baseA = env * intensity * wv.gain;
        if (baseA <= 0.004) continue;

        const distA = P.dist * 0.16 * (0.25 + x * 0.75);
        const shimA = 1 + P.shimmer * 0.22 * Math.sin(time * 18 + wv.seed);
        const th = thickness * (0.7 + x * 0.6);

        // shared distorted shape for all passes
        const pts = new Array(SEG + 1);
        for (let i = 0; i <= SEG; i++) {
          const a = (i / SEG) * Math.PI * 2;
          const mlt = 1 + distA * (
            0.55 * Math.sin(3 * a + wv.seed) +
            0.30 * Math.sin(5 * a + wv.seed * 1.7) +
            0.15 * Math.sin(9 * a + wv.seed * 0.6 + time * (1 + P.shimmer * 6))
          );
          pts[i] = { c: Math.cos(a), s: Math.sin(a), m: mlt };
        }

        const passes = [
          { off: -th * 1.5, w: th * (3.6 - P.sharp * 1.4), a: baseA * 0.30 * P.after, col: trail },
          { off: 0,         w: th,                          a: baseA * 0.85,          col: main  },
          { off: th * 0.45, w: Math.max(1, th * 0.38),      a: baseA * (0.35 + P.sharp * 0.65), col: hot },
        ];

        const bk = P.breakup * 0.85 * (0.35 + 0.65 * x);
        const perChunk = SEG / CHUNKS;

        for (const pass of passes) {
          if (pass.a <= 0.004) continue;
          ctx.lineWidth = pass.w;
          if (bk < 0.02) {
            ctx.strokeStyle = rgba(pass.col, pass.a * shimA);
            ctx.beginPath();
            for (let i = 0; i <= SEG; i++) {
              const rr = (wv.r + pass.off) * pts[i].m;
              const px = cx + pts[i].c * rr, py = cy + pts[i].s * rr;
              if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.stroke();
          } else {
            for (let cI = 0; cI < CHUNKS; cI++) {
              const midA = ((cI + 0.5) / CHUNKS) * Math.PI * 2;
              const gapN = Math.pow(0.5 + 0.5 * Math.sin(midA * 4 + wv.seed * 2.1), 2);
              const segA = pass.a * shimA * (1 - bk * gapN);
              if (segA <= 0.004) continue;
              ctx.strokeStyle = rgba(pass.col, segA);
              ctx.beginPath();
              const i0 = Math.floor(cI * perChunk);
              const i1 = Math.ceil((cI + 1) * perChunk);
              for (let i = i0; i <= i1; i++) {
                const rr = (wv.r + pass.off) * pts[i].m;
                const px = cx + pts[i].c * rr, py = cy + pts[i].s * rr;
                if (i === i0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
              }
              ctx.stroke();
            }
          }
        }
      }

      // energy motes
      for (const m of motes) {
        const twk = 0.55 + 0.45 * Math.sin(time * 2.6 + m.tw);
        const a = (0.10 + 0.30 * twk) * intensity * (1 + m.heat * 2.2) * P.moteAmt;
        if (a <= 0.01) continue;
        const sz = m.size * (1 + m.heat * 1.6);
        const px = cx + Math.cos(m.ang) * m.r;
        const py = cy + Math.sin(m.ang) * m.r;
        const col = m.heat > 0.3 ? mix(main, WHITE, m.heat * 0.7) : main;
        const g = ctx.createRadialGradient(px, py, 0, px, py, sz * 3);
        g.addColorStop(0, rgba(col, a));
        g.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, sz * 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // emission sparks — short streaks along their velocity
      for (const s of sparks) {
        const lf = 1 - s.life / s.maxLife;
        const a = lf * lf * 0.8 * intensity;
        if (a <= 0.01) continue;
        const tx = s.x - s.vx * 0.045, ty = s.y - s.vy * 0.045;
        const g = ctx.createLinearGradient(tx, ty, s.x, s.y);
        g.addColorStop(0, rgba(main, 0));
        g.addColorStop(1, rgba(mix(main, WHITE, 0.5), a));
        ctx.strokeStyle = g;
        ctx.lineWidth = s.w;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();
      }

      // core: haze → colored glow → hot center, scaled by charge + flash
      const coreScale = (1 + charge * 0.55 + flashE * 1.5) * flicker;
      const cR = coreR * coreScale;
      const coreA = intensity * (0.45 + charge * 0.35 + flashE * 0.8);

      const g3 = ctx.createRadialGradient(cx, cy, 0, cx, cy, cR * 4.5);
      g3.addColorStop(0, rgba(main, coreA * 0.35));
      g3.addColorStop(1, rgba(main, 0));
      ctx.fillStyle = g3;
      ctx.beginPath(); ctx.arc(cx, cy, cR * 4.5, 0, Math.PI * 2); ctx.fill();

      const g2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, cR * 1.9);
      g2.addColorStop(0, rgba(mix(main, core, 0.5), coreA * 0.7));
      g2.addColorStop(1, rgba(main, 0));
      ctx.fillStyle = g2;
      ctx.beginPath(); ctx.arc(cx, cy, cR * 1.9, 0, Math.PI * 2); ctx.fill();

      const g1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, cR);
      g1.addColorStop(0, rgba(WHITE, coreA));
      g1.addColorStop(0.45, rgba(core, coreA * 0.85));
      g1.addColorStop(1, rgba(core, 0));
      ctx.fillStyle = g1;
      ctx.beginPath(); ctx.arc(cx, cy, cR, 0, Math.PI * 2); ctx.fill();

      ctx.restore();
    },
  };
}
