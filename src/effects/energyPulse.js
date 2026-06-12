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
  let burstRays = [];    // { ang, len, bend, w, life, maxLife, hotMix }
  let flashRings = [];   // { age, maxLife } — lineless volumetric release shells
  let orbStrands = [];   // plasma-orb shell filaments
  let tendrils = [];     // persistent radiating energy filaments
  let starRays = [];     // persistent reactor light rays
  let blastParts = [];   // particle-nova debris streams
  let curStyle = null;   // rebuild persistent structures on style change
  let glints = [];       // shared twinkling micro-specks (all styles)
  let fogBlobs = [];     // drifting nebular plasma clouds (all styles)
  let cycleT = 0;        // time since last emission
  let flashE = 0;        // emission flash energy, decays exponentially
  let atmoE = 0;         // atmosphere energy — absorbs releases, decays slowly
  let time = 0;
  let firstFrame = true;
  let lastW = 0, lastH = 0;

  function emitPulse(P, cx, cy, maxR) {
    // the plasma orb pulses its shell instead of throwing expanding waves
    if (P.style !== 'plasmaOrb') {
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
    }
    flashE = P.flash;
    // the surrounding medium soaks up part of each release and glows
    atmoE = Math.min(1.5, atmoE + 0.45 + P.flash * 0.55);

    // traveling highlights race outward along persistent tendrils
    for (const t of tendrils) t.pulses.push({ d: -Math.random() * 0.15 });

    // shockwave fronts carry a sparse spray of micro-debris riding with them
    if (P.style === 'shockwave') {
      const n = Math.round(8 + P.sparkAmt * 30);
      for (let i = 0; i < n; i++) {
        const ang = Math.random() * Math.PI * 2;
        const v = P.v0 * (0.75 + Math.random() * 0.45);
        blastParts.push({
          x: cx + Math.cos(ang) * 3,
          y: cy + Math.sin(ang) * 3,
          vx: Math.cos(ang) * v,
          vy: Math.sin(ang) * v,
          life: 0,
          maxLife: 0.7 + Math.random() * 1.2,
          sz: 0.4 + Math.random() * 0.9,
          hm: Math.random(),
        });
      }
    }

    // particle nova: clustered debris streams erupt from the core
    if (P.style === 'particleBlast') {
      const streams = 7 + Math.floor(Math.random() * 5);
      const perStream = Math.round((60 + P.sparkAmt * 180) / streams);
      for (let s = 0; s < streams; s++) {
        const dirAng = Math.random() * Math.PI * 2;
        const spread = 0.08 + Math.random() * 0.20;
        const vMul = 0.7 + Math.random() * 0.7;
        for (let i = 0; i < perStream; i++) {
          const ang = dirAng + (Math.random() + Math.random() - 1) * spread;
          const v = P.v0 * vMul * (0.30 + Math.pow(Math.random(), 1.6) * 1.3);
          blastParts.push({
            x: cx + Math.cos(ang) * 3,
            y: cy + Math.sin(ang) * 3,
            vx: Math.cos(ang) * v,
            vy: Math.sin(ang) * v,
            life: 0,
            maxLife: 0.9 + Math.random() * 1.9,
            sz: 0.5 + Math.random() * 1.5,
            hm: Math.random(),
          });
        }
      }
      if (blastParts.length > 1300) blastParts.splice(0, blastParts.length - 1300);
    }

    // lineless volumetric shell that races out and dies fast
    flashRings.push({ age: 0, maxLife: 0.26 + Math.random() * 0.12 });

    // burst filaments — thin light lines that snap out and die in ~0.15–0.4s
    const rayN = Math.round(10 + P.sparkAmt * 20 + P.flash * 14);
    for (let i = 0; i < rayN; i++) {
      const long = Math.random() < 0.22; // a few fast macro streaks
      burstRays.push({
        ang: Math.random() * Math.PI * 2,
        len: maxR * (0.24 + Math.random() * 0.55) * (0.5 + P.flash * 0.8) * (long ? 1.7 : 1),
        bend: (Math.random() - 0.5) * (long ? 0.2 : 0.5),
        w: long ? 0.5 + Math.random() * 1.0 : 0.6 + Math.random() * 2.0,
        life: 0,
        maxLife: (0.14 + Math.random() * 0.24) * (long ? 1.4 : 1),
        hotMix: 0.35 + Math.random() * 0.6,
      });
    }

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
      size: 0.6 + Math.random() * 1.8,
      alf: 0.35 + Math.random() * 0.65,
      wob: Math.random() * Math.PI * 2,
      kick: 0,
      heat: 0,
    };
  }

  // ── persistent blast-style structures ────────────────────────────────

  // one filament "configuration" — plasma snaps between these, it doesn't morph
  function tendrilShape() {
    return {
      ph:   Math.random() * Math.PI * 2,
      ph2:  Math.random() * Math.PI * 2,
      ampM: 0.75 + Math.random() * 0.6,
      angJ: (Math.random() - 0.5) * 0.18,
    };
  }

  function buildOrbStrands(n) {
    return Array.from({ length: n }, () => {
      const ph = Math.random() * Math.PI * 2;
      return {
        a0:   Math.random() * Math.PI * 2,
        span: 0.7 + Math.random() * 1.8,          // arc length on the shell (rad)
        drift:(Math.random() - 0.5) * 0.30,        // slow rotation
        ph,
        phT:  ph,                                  // re-strike target phase
        spd:  0.6 + Math.random() * 1.6,           // noise crawl speed
        amp:  0.05 + Math.random() * 0.10,         // wobble, fraction of shell R
        w:    0.7 + Math.random() * 1.6,
        hm:   Math.random() * 0.55,
        glow: 0.4 + Math.random() * 0.4,           // crackling brightness state
        hold: Math.random() * 0.25,                // time until next restructure
      };
    });
  }

  function buildTendrils(n, branchAmt = 0.45) {
    return Array.from({ length: n }, () => {
      const w = 0.7 + Math.random() * 1.7;
      const nBranches = Math.random() < branchAmt
        ? 1 + (Math.random() < branchAmt * 0.6 ? 1 : 0) : 0;
      const shape = tendrilShape();
      return {
        ang:  Math.random() * Math.PI * 2,
        lenF: 0.55 + Math.random() * 0.45,         // fraction of maxR
        amp:  0.05 + Math.random() * 0.11,         // sideways sway, fraction of len
        freq: 1.6 + Math.random() * 2.6,
        ph:   Math.random() * Math.PI * 2,
        spd:  0.7 + Math.random() * 1.8,
        w,
        hm:   0.15 + Math.random() * 0.5,
        pulses: [],                                 // traveling highlights {d}
        shapeCur: shape,                            // restructuring states
        shapePrev: shape,
        blend: 1,                                   // 0→1 snap between shapes
        hold: Math.random() * 0.2,                  // time until next restructure
        glow: 0.4 + Math.random() * 0.4,            // crackling brightness
        branches: Array.from({ length: nBranches }, () => ({
          at:     0.25 + Math.random() * 0.50,     // fork point along the parent
          angOff: (Math.random() < 0.5 ? -1 : 1) * (0.35 + Math.random() * 0.55),
          lenScale: 0.35 + Math.random() * 0.35,
          freq:   1.5 + Math.random() * 2.0,
          ph:     Math.random() * Math.PI * 2,
          spd:    0.8 + Math.random() * 1.5,
          w:      w * 0.65,
        })),
      };
    });
  }

  function buildStarRays(n) {
    return Array.from({ length: n }, () => {
      const long = Math.random() < 0.25;
      return {
        ang:  Math.random() * Math.PI * 2,
        lenF: (0.25 + Math.random() * 0.55) * (long ? 1.8 : 1),
        w:    long ? 0.5 + Math.random() * 0.8 : 0.6 + Math.random() * 1.6,
        tw:   Math.random() * Math.PI * 2,
        hm:   0.3 + Math.random() * 0.6,
        drift:(Math.random() - 0.5) * 0.05,
        glow: 0.3 + Math.random() * 0.4,
        hold: Math.random() * 0.3,
      };
    });
  }

  return {
    reset() {
      waves = [];
      motes = [];
      sparks = [];
      burstRays = [];
      flashRings = [];
      orbStrands = [];
      tendrils = [];
      starRays = [];
      blastParts = [];
      curStyle = null;
      glints = [];
      fogBlobs = [];
      cycleT = 0;
      flashE = 0;
      atmoE = 0;
      time = 0;
      firstFrame = true;
    },

    update(ctx, canvas, params, dt, renderOpts = {}) {
      const w = canvas.width, h = canvas.height;
      const minDim = Math.min(w, h);
      time += dt;

      // canvas was resized (e.g. first frames run on the default 300×150
      // bitmap before ResizeObserver fires) — world-anchored transients now
      // sit at stale coordinates, so drop them and re-arm the opening pulse
      if (w !== lastW || h !== lastH) {
        if (lastW > 0) {
          waves = []; sparks = []; burstRays = []; flashRings = [];
          blastParts = []; motes = [];
          for (const t of tendrils) t.pulses = [];
          firstFrame = true;
        }
        lastW = w; lastH = h;
      }

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
        fog:       (params.fog        ?? 45) / 100,
        branch:    (params.branching  ?? 45) / 100,
        cd:        (params.colorDepth ?? 55) / 100,
        coreSize:  (params.coreSize   ?? 50) / 100,
        style:     params.blastStyle  ?? 'shockwave',
      };

      // rebuild persistent structures when the blast style changes;
      // each style also inherits faint traces of the others so no
      // element ever reads as an isolated layer
      if (curStyle !== P.style) {
        curStyle = P.style;
        orbStrands = []; tendrils = []; starRays = [];
        if (P.style === 'plasmaOrb') {
          orbStrands = buildOrbStrands(14 + Math.round(P.sparkAmt * 10));
          // a few short interior tendrils writhing inside the shell
          tendrils = buildTendrils(3, P.branch * 0.4)
            .map(t => ({ ...t, lenF: t.lenF * 0.38, w: t.w * 0.8 }));
        } else if (P.style === 'tendrils') {
          tendrils = buildTendrils(9 + Math.round(P.sparkAmt * 14), P.branch);
          // faint plasma ring weaving between the filaments
          orbStrands = buildOrbStrands(5);
        } else if (P.style === 'starburst') {
          starRays = buildStarRays(18 + Math.round(P.sparkAmt * 30));
          orbStrands = buildOrbStrands(4);
        } else if (P.style === 'particleBlast') {
          // weak light beams under the debris streams
          starRays = buildStarRays(10);
        }
        blastParts = [];
      }

      const cx = w * ((params.posX ?? 50) / 100);
      const cy = h * ((params.posY ?? 50) / 100);
      const maxR = minDim * 0.55 * (range / 100);
      const coreR = minDim * (0.018 + P.coreSize * 0.05);

      // shared light physics: brightness and white-bleach rise steeply
      // toward the origin (inverse-square falloff), so every element fuses
      // into the central bloom instead of reading as a separate layer
      const expR0 = coreR * 2.0 + maxR * 0.10;
      const exposure = d => 1 / (1 + (d / expR0) * (d / expR0));

      // Travel time across maxR sets base velocity; deceleration front-loads it
      const travelT = 3.5 - (P.speed / 100) * 2.9;
      P.v0 = (maxR / travelT) * (1 + P.decel * 0.9);
      P.flash *= intensity;

      const main = hexToRgb(params.color ?? '#22ccff');
      const core = hexToRgb(params.coreColor ?? '#eaffff');
      const deep = params.deepColor
        ? hexToRgb(params.deepColor)
        : { r: main.r >> 2, g: main.g >> 2, b: Math.round(main.b * 0.45) }; // darker fallback
      const hot  = mix(main, WHITE, 0.55 + P.edgeHeat * 0.45);
      const trail = mix(main, core, 0.15);

      // layered cinematic palette: white → hot core tint → saturated main →
      // deep fringe hue in the dimmest regions; t is local light energy 0..1
      const deepMix = mix(main, deep, P.cd);
      const shade = t => {
        t = clamp01(t);
        if (t >= 0.75) return mix(core, WHITE, (t - 0.75) / 0.25);
        if (t >= 0.45) return mix(main, core, (t - 0.45) / 0.30);
        return mix(deepMix, main, t / 0.45);
      };

      // ── pulse cycle: charge → emit ──
      const period = 0.45 + ((100 - Math.min(100, rate)) * 0.038);
      cycleT += dt;
      if (firstFrame) {
        // fire immediately so the effect isn't blank at t=0 — but wait until
        // the canvas has real dimensions, or the pulse emits at a bogus center
        if (minDim > 60) {
          firstFrame = false;
          cycleT = period;
        } else {
          cycleT = 0;
        }
      }
      if (cycleT >= period) {
        cycleT = 0;
        emitPulse(P, cx, cy, maxR);
      }
      flashE *= Math.exp(-5.5 * dt);
      atmoE *= Math.exp(-0.55 * dt);

      // shared micro-glint field — tiny static specks at all distances
      if (!glints.length) {
        glints = Array.from({ length: 30 }, () => ({
          ang: Math.random() * Math.PI * 2,
          rF: 0.08 + Math.random() * 0.92,
          ph: Math.random() * Math.PI * 2,
          spd: 0.4 + Math.random() * 1.6,
          sz: 0.4 + Math.random() * 1.1,
        }));
      }

      // nebular plasma clouds — soft drifting density the filaments live in
      if (!fogBlobs.length) {
        fogBlobs = Array.from({ length: 16 }, () => ({
          ang: Math.random() * Math.PI * 2,
          rF: 0.05 + Math.pow(Math.random(), 1.4) * 0.50,
          om: (Math.random() - 0.5) * 0.12,
          szF: 0.09 + Math.random() * 0.16,
          ph: Math.random() * Math.PI * 2,
          spd: 0.3 + Math.random() * 0.8,
          hue: Math.random(),
        }));
      }
      for (const fb of fogBlobs) fb.ang += fb.om * dt;

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

      // ── update burst rays + flash shells ──
      for (let i = burstRays.length - 1; i >= 0; i--) {
        const ry = burstRays[i];
        ry.life += dt;
        if (ry.life >= ry.maxLife) burstRays.splice(i, 1);
      }
      for (let i = flashRings.length - 1; i >= 0; i--) {
        flashRings[i].age += dt;
        if (flashRings[i].age >= flashRings[i].maxLife) flashRings.splice(i, 1);
      }
      for (const t of tendrils) {
        for (let i = t.pulses.length - 1; i >= 0; i--) {
          t.pulses[i].d += dt * 1.1;
          if (t.pulses[i].d > 1.25) t.pulses.splice(i, 1);
        }
      }

      // ── plasma restructuring: filaments hold a configuration briefly,
      // then SNAP to a new one; brightness crackles with stochastic spikes
      // instead of smooth sine flicker — this is what makes the energy
      // tension visible
      for (const t of tendrils) {
        t.hold -= dt;
        if (t.hold <= 0) {
          t.shapePrev = t.shapeCur;
          t.shapeCur = tendrilShape();
          t.blend = 0;
          t.hold = 0.05 + Math.random() * 0.22;
          if (Math.random() < 0.35) t.glow = Math.max(t.glow, 0.8 + Math.random() * 0.5);
          if (Math.random() < 0.10) {
            // full re-strike: the filament dies and re-roots at a new angle
            t.ang += (Math.random() - 0.5) * 0.8;
            t.glow = 1.3;
            for (const br of t.branches) br.ph = Math.random() * Math.PI * 2;
          }
        }
        t.blend = Math.min(1, t.blend + dt * 16);  // ~60ms snap
        if (Math.random() < dt * 2.0) t.glow = Math.max(t.glow, 0.7 + Math.random() * 0.5);
        t.glow = 0.35 + (t.glow - 0.35) * Math.exp(-6.5 * dt);
      }
      for (const st of orbStrands) {
        st.hold -= dt;
        if (st.hold <= 0) {
          st.hold = 0.06 + Math.random() * 0.22;
          st.phT = st.ph + (Math.random() - 0.5) * 2.6;
          if (Math.random() < 0.28) st.glow = Math.max(st.glow, 0.9 + Math.random() * 0.4);
          if (Math.random() < 0.08) st.a0 += (Math.random() - 0.5) * 0.5;
        }
        st.ph += (st.phT - st.ph) * (1 - Math.exp(-13 * dt));
        st.glow = 0.4 + (st.glow - 0.4) * Math.exp(-6.5 * dt);
      }
      for (const sr of starRays) {
        sr.hold -= dt;
        if (sr.hold <= 0) {
          sr.hold = 0.05 + Math.random() * 0.25;
          if (Math.random() < 0.5) sr.glow = Math.max(sr.glow, 0.6 + Math.random() * 0.7);
        }
        sr.glow = 0.28 + (sr.glow - 0.28) * Math.exp(-8 * dt);
      }
      for (let i = blastParts.length - 1; i >= 0; i--) {
        const bp = blastParts[i];
        bp.life += dt;
        if (bp.life >= bp.maxLife) { blastParts.splice(i, 1); continue; }
        bp.x += bp.vx * dt;
        bp.y += bp.vy * dt;
        // gentle curl so the streams billow instead of staying laser-straight
        const sw = Math.sin(bp.x * 0.013 + bp.y * 0.011 + time * 0.7) * 26 * dt;
        const vm = Math.hypot(bp.vx, bp.vy) + 0.001;
        bp.vx += (-bp.vy / vm) * sw;
        bp.vy += ( bp.vx / vm) * sw;
        const drag = Math.exp(-0.85 * dt);
        bp.vx *= drag;
        bp.vy *= drag;
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

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // layered atmospheric bloom — the medium itself glows; it brightens
      // with charge/flash and keeps glowing after each release (atmoE)
      if (P.haze > 0.01) {
        const energy = 0.35 + charge * 0.30 + flashE * 0.55 + atmoE * 0.45;
        const breathe = 1 + atmoE * 0.06 + charge * 0.05;
        const layers = [
          { R: (coreR * 5 + maxR * 0.10) * breathe, a: 0.50, col: shade(0.62) },
          { R: maxR * 0.52 * breathe,               a: 0.24, col: mix(main, deep, P.cd * 0.35) },
          { R: maxR * 0.98 * breathe,               a: 0.12, col: mix(main, deep, P.cd * 0.80) },
        ];
        for (const L of layers) {
          const a = P.haze * intensity * energy * L.a;
          if (a <= 0.004) continue;
          const gz = ctx.createRadialGradient(cx, cy, 0, cx, cy, L.R);
          gz.addColorStop(0, rgba(L.col, a));
          gz.addColorStop(0.55, rgba(L.col, a * 0.42));
          gz.addColorStop(1, rgba(L.col, 0));
          ctx.fillStyle = gz;
          ctx.beginPath(); ctx.arc(cx, cy, L.R, 0, Math.PI * 2); ctx.fill();
        }
      }

      // nebular plasma fog — cloudy density drifting through the field
      if (P.fog > 0.01) {
        for (const fb of fogBlobs) {
          const d = fb.rF * maxR;
          const e = exposure(d);
          const pulseGlow = 0.5 + 0.5 * Math.sin(time * fb.spd * 0.7 + fb.ph * 2);
          const a = P.fog * intensity * (0.020 + 0.042 * pulseGlow)
            * (0.5 + e * 1.2 + atmoE * 0.5);
          if (a <= 0.004) continue;
          const px = cx + Math.cos(fb.ang) * d;
          const py = cy + Math.sin(fb.ang) * d;
          const R = fb.szF * maxR * (1 + 0.15 * Math.sin(time * fb.spd + fb.ph));
          const col = mix(mix(main, deep, 0.35 + 0.40 * fb.hue), WHITE, e * 0.25);
          const g = ctx.createRadialGradient(px, py, 0, px, py, R);
          g.addColorStop(0, rgba(col, a));
          g.addColorStop(0.6, rgba(col, a * 0.35));
          g.addColorStop(1, rgba(col, 0));
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(px, py, R, 0, Math.PI * 2); ctx.fill();
        }
      }

      // release shells — pure gradient annulus, no stroke: volumetric punch
      for (const fr of flashRings) {
        const p = fr.age / fr.maxLife;
        const ease = 1 - Math.pow(1 - p, 2.5);
        const r = Math.max(coreR, ease * maxR * (0.30 + P.flash * 0.35));
        const a = Math.pow(1 - p, 1.8) * P.flash * intensity * 0.55;
        if (a <= 0.01) continue;
        const rOut = r * 1.45;
        const gs = ctx.createRadialGradient(cx, cy, 0, cx, cy, rOut);
        gs.addColorStop(0, rgba(main, 0));
        gs.addColorStop(clamp01(r * 0.5 / rOut), rgba(shade(0.40), a * 0.25));
        gs.addColorStop(clamp01(r / rOut), rgba(shade(0.68), a));
        gs.addColorStop(1, rgba(main, 0));
        ctx.fillStyle = gs;
        ctx.beginPath();
        ctx.arc(cx, cy, rOut, 0, Math.PI * 2);
        ctx.fill();
      }

      // wavefronts
      for (const wv of waves) {
        if (wv.delay > 0 || wv.r < 1) continue;
        const x = wv.r / maxR;
        const env = Math.pow(1 - x, 1.35) * Math.min(1, wv.r / (thickness * 2));
        const wvE = exposure(wv.r);
        const baseA = env * intensity * wv.gain * (0.8 + wvE * 1.3);
        if (baseA <= 0.004) continue;
        const bleach = clamp01(wvE * 0.8);
        const bodyCol = shade(0.42 + wvE * 0.45);
        const edgeCol = mix(hot, WHITE, bleach * 0.5);
        const haloCol = mix(main, deep, P.cd * 0.5 * (1 - wvE));

        const distA = P.dist * 0.16 * (0.25 + x * 0.75);
        const th = thickness * (0.7 + x * 0.6);
        const shimPh = time * (2 + P.shimmer * 14);
        // how deeply the angular modulation cuts into the front
        const modDepth = 0.30 + P.breakup * 0.60 * (0.35 + 0.65 * x);

        // shared distorted shape + continuous intensity modulation along it
        const pts = new Array(SEG + 1);
        for (let i = 0; i <= SEG; i++) {
          const a = (i / SEG) * Math.PI * 2;
          const mlt = 1 + distA * (
            0.55 * Math.sin(3 * a + wv.seed) +
            0.30 * Math.sin(5 * a + wv.seed * 1.7) +
            0.15 * Math.sin(9 * a + wv.seed * 0.6 + time * (1 + P.shimmer * 6))
          );
          const raw =
            0.50 * Math.sin(2 * a + wv.seed * 1.3) +
            0.30 * Math.sin(5 * a + wv.seed * 2.7) +
            0.20 * Math.sin(11 * a - shimPh + wv.seed);
          const im = 1 - modDepth * (0.5 - 0.5 * raw);
          pts[i] = { c: Math.cos(a), s: Math.sin(a), m: mlt, im };
        }

        const tracePath = off => {
          ctx.beginPath();
          for (let i = 0; i <= SEG; i++) {
            const rr = (wv.r + off) * pts[i].m;
            const px = cx + pts[i].c * rr, py = cy + pts[i].s * rr;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
        };

        // volumetric halo — wide, very soft light hugging the front
        ctx.lineCap = 'round';
        const halos = [
          { w: th * 5.5,  a: baseA * 0.15 },
          { w: th * 11.5, a: baseA * 0.06 },
        ];
        for (const hl of halos) {
          ctx.lineWidth = hl.w;
          ctx.strokeStyle = rgba(haloCol, hl.a);
          tracePath(0);
          ctx.stroke();
        }

        // interior illumination — the medium stays lit behind the front
        if (P.after > 0.02) {
          const rOut = (wv.r + th) * (1 + distA);
          const aFill = baseA * P.after;
          const k1 = clamp01((wv.r - th * 5.5) / rOut);
          const k2 = clamp01((wv.r - th * 0.8) / rOut);
          const gi = ctx.createRadialGradient(cx, cy, 0, cx, cy, rOut);
          gi.addColorStop(0, rgba(trail, aFill * 0.04));
          gi.addColorStop(k1, rgba(trail, aFill * 0.10));
          gi.addColorStop(k2, rgba(trail, aFill * 0.22));
          gi.addColorStop(1, rgba(trail, 0));
          ctx.fillStyle = gi;
          ctx.beginPath();
          ctx.arc(cx, cy, rOut, 0, Math.PI * 2);
          ctx.fill();
        }

        // body + hot edge — constant-width strokes per pass (width changes
        // between segments showed as facet seams), alpha alone carries the
        // angular modulation; body split into soft + thin layers so the
        // front stays translucent instead of reading as a solid ribbon
        ctx.lineCap = 'butt';
        const STEP = 2;
        const edgeBase = baseA * (0.16 + P.sharp * 0.42) * (1 - x * 0.45);
        for (let i = 0; i < SEG; i += STEP) {
          const j = i + STEP;
          const segIm = (pts[i].im + pts[j].im) * 0.5;
          if (segIm <= 0.03) continue;

          const r0 = wv.r * pts[i].m, r1 = wv.r * pts[j].m;
          const x0 = cx + pts[i].c * r0, y0 = cy + pts[i].s * r0;
          const x1 = cx + pts[j].c * r1, y1 = cy + pts[j].s * r1;

          ctx.lineWidth = th * 2.3;
          ctx.strokeStyle = rgba(bodyCol, baseA * 0.26 * segIm);
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();

          ctx.lineWidth = th * 0.95;
          ctx.strokeStyle = rgba(bodyCol, baseA * 0.45 * segIm);
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();

          const edgeA = edgeBase * Math.pow(segIm, 2);
          if (edgeA > 0.006) {
            const eo = th * 0.45;
            const e0 = (wv.r + eo) * pts[i].m, e1 = (wv.r + eo) * pts[j].m;
            ctx.lineWidth = Math.max(1, th * 0.30);
            ctx.strokeStyle = rgba(edgeCol, edgeA);
            ctx.beginPath();
            ctx.moveTo(cx + pts[i].c * e0, cy + pts[i].s * e0);
            ctx.lineTo(cx + pts[j].c * e1, cy + pts[j].s * e1);
            ctx.stroke();
          }
        }
        ctx.lineCap = 'round';
      }

      // plasma orb — crawling filament strands wrapped around a breathing shell
      // (other styles carry a few faint strands as a woven plasma ring)
      if (orbStrands.length) {
        const strandGain = P.style === 'plasmaOrb' ? 1 : 0.4;
        const R = maxR * (P.style === 'plasmaOrb' ? 0.42 : 0.32)
          * (1 + charge * 0.10 + flashE * 0.20 + 0.025 * Math.sin(time * 0.9));
        // volumetric shell glow
        const sa = intensity * (0.10 + charge * 0.10 + flashE * 0.30) * strandGain;
        const sg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.35);
        sg.addColorStop(0, rgba(main, 0));
        sg.addColorStop(clamp01(R * 0.62 / (R * 1.35)), rgba(main, sa * 0.35));
        sg.addColorStop(clamp01(R / (R * 1.35)), rgba(main, sa));
        sg.addColorStop(1, rgba(main, 0));
        ctx.fillStyle = sg;
        ctx.beginPath(); ctx.arc(cx, cy, R * 1.35, 0, Math.PI * 2); ctx.fill();

        const steps = quality === 'draft' ? 14 : 24;
        const subStrands = quality === 'draft' ? 1 : 2;
        for (const st of orbStrands) {
          const a0 = st.a0 + time * st.drift;
          const baseA = intensity * (0.10 + 0.26 * st.glow)
            * (1 + charge * 0.6 + flashE * 1.6) * strandGain;
          if (baseA <= 0.01) continue;

          const strandPt = (f, braidPh, braidAmp) => {
            const a = a0 + st.span * (f - 0.5);
            let wob = R * st.amp * (
              0.55 * Math.sin(a * 3.1 + st.ph + time * st.spd) +
              0.30 * Math.sin(a * 6.7 - time * st.spd * 1.6 + st.ph * 2.3) +
              0.15 * Math.sin(a * 11.3 + time * st.spd * 0.8)
            );
            if (braidAmp) wob += braidAmp * Math.sin(f * 15 + braidPh + time * st.spd * 1.3) * Math.sin(Math.PI * f);
            const r = R + wob;
            return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
          };

          // soft halo: one smooth wide stroke, fringe-tinted
          ctx.lineWidth = st.w * 4.5;
          ctx.strokeStyle = rgba(mix(main, deep, P.cd * 0.5), baseA * 0.16);
          ctx.beginPath();
          for (let k = 0; k <= steps; k++) {
            const p = strandPt(k / steps, 0, 0);
            if (k === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
          }
          ctx.stroke();

          // fuzzy braided body: sub-strands drawn per segment with noisy
          // width/alpha so the shell reads as plasma wisps, not wires
          ctx.lineCap = 'butt';
          for (let s = 0; s < subStrands; s++) {
            const braidPh = st.ph + s * 2.4;
            const braidAmp = s === 0 ? 0 : st.w * 2.4;
            let prev = strandPt(0, braidPh, braidAmp);
            for (let k = 1; k <= steps; k++) {
              const f = k / steps;
              const pt = strandPt(f, braidPh, braidAmp);
              const env = Math.sin(Math.PI * f); // fade strand ends
              const wn = 0.55 + 0.45 * Math.sin(f * 19 + braidPh * 3.1 + time * 2.2);
              const segA = baseA * (s === 0 ? 0.55 : 0.34) * env * (0.45 + 0.55 * wn);
              if (segA > 0.008) {
                ctx.strokeStyle = rgba(shade(0.50 + st.hm * 0.35 + wn * 0.12), segA);
                ctx.lineWidth = Math.max(0.4, st.w * (0.55 + 0.65 * wn));
                ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(pt.x, pt.y); ctx.stroke();
              }
              prev = pt;
            }
          }
          ctx.lineCap = 'round';
        }
      }

      // tendrils — fuzzy braided filaments with forks, white-hot roots
      // dissolving into deep fringe color at the tips
      if (tendrils.length) {
        const tendrilGain = P.style === 'tendrils' ? 1 : 0.55;
        const steps = quality === 'draft' ? 14 : 26;
        const subStrands = quality === 'draft' ? 1 : quality === 'ultra' ? 3 : 2;

        // draws one fuzzy strand: per-segment width taper + brightness noise
        const drawFuzzy = (ptFn, n, baseW, aMul, rootT, tipT, seed) => {
          ctx.lineCap = 'butt';
          let prev = ptFn(0);
          for (let k = 1; k <= n; k++) {
            const f = k / n;
            const pt = ptFn(f);
            const wn = 0.55 + 0.45 * Math.sin(f * 17 + seed * 9.7 + time * 2.1);
            const segA = aMul * (1 - f * 0.55) * (0.45 + 0.55 * wn);
            if (segA > 0.008) {
              ctx.strokeStyle = rgba(shade(rootT + (tipT - rootT) * f + wn * 0.08), segA);
              ctx.lineWidth = Math.max(0.4, baseW * (1.5 - f) * (0.6 + 0.5 * wn));
              ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(pt.x, pt.y); ctx.stroke();
            }
            prev = pt;
          }
          ctx.lineCap = 'round';
        };

        for (const t of tendrils) {
          const len = t.lenF * maxR;
          const baseA = intensity * (0.08 + 0.30 * t.glow)
            * (1 + charge * 0.5 + flashE * 1.2) * tendrilGain;
          if (baseA <= 0.01) continue;
          // eased snap between the previous and current configuration
          const eb = t.blend * t.blend * (3 - 2 * t.blend);
          const angEff = t.ang + t.shapePrev.angJ + (t.shapeCur.angJ - t.shapePrev.angJ) * eb;
          const dx = Math.cos(angEff), dy = Math.sin(angEff);

          const shapeSway = (f, sh) => len * t.amp * sh.ampM * Math.pow(f, 0.8) * (
            0.6 * Math.sin(f * t.freq * 6.28 + sh.ph + time * t.spd * 0.3) +
            0.35 * Math.sin(f * t.freq * 9.0 + sh.ph2 - time * t.spd * 0.2)
          );
          const sway = f =>
            shapeSway(f, t.shapePrev) + (shapeSway(f, t.shapeCur) - shapeSway(f, t.shapePrev)) * eb
            // high-frequency micro-jitter: the filament visibly vibrates
            + len * 0.014 * Math.pow(f, 0.9) * Math.sin(f * 23 + time * 26 + t.ph * 7);
          const parentPt = (f, braidPh, braidAmp) => {
            const r = coreR * 0.8 + f * len;
            let s = sway(f);
            if (braidAmp) s += braidAmp * Math.sin(f * 14 + braidPh + time * t.spd * 1.3) * Math.sin(Math.PI * f);
            return { x: cx + dx * r - dy * s, y: cy + dy * r + dx * s };
          };

          // soft halo: smooth wide stroke with root-glow gradient, fringe tint
          const gx0 = cx + dx * coreR * 0.8, gy0 = cy + dy * coreR * 0.8;
          const gx1 = cx + dx * (coreR * 0.8 + len), gy1 = cy + dy * (coreR * 0.8 + len);
          const gh = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
          gh.addColorStop(0, rgba(mix(main, WHITE, 0.5), baseA * 0.30));
          gh.addColorStop(0.4, rgba(mix(main, deep, P.cd * 0.4), baseA * 0.16));
          gh.addColorStop(1, rgba(mix(main, deep, P.cd * 0.8), baseA * 0.05));
          ctx.lineWidth = t.w * 4.6;
          ctx.strokeStyle = gh;
          ctx.beginPath();
          for (let k = 0; k <= steps; k++) {
            const p = parentPt(k / steps, 0, 0);
            if (k === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
          }
          ctx.stroke();

          // braided fuzzy body
          for (let s = 0; s < subStrands; s++) {
            const braidPh = t.ph + s * 2.1;
            const braidAmp = s === 0 ? 0 : t.w * 2.2;
            drawFuzzy(
              f => parentPt(f, braidPh, braidAmp),
              steps,
              t.w * (s === 0 ? 1 : 0.7),
              baseA * (s === 0 ? 0.75 : 0.45),
              0.88, 0.14, t.ph + s,
            );
          }

          // forks — smaller fuzzy strands leaving the parent mid-way
          for (const br of t.branches) {
            const start = parentPt(br.at, 0, 0);
            const bAng = t.ang + br.angOff;
            const bdx = Math.cos(bAng), bdy = Math.sin(bAng);
            const bLen = len * (1 - br.at) * br.lenScale + len * 0.12;
            drawFuzzy(
              f => {
                const d = f * bLen;
                const bs = bLen * 0.13 * Math.pow(f, 0.8)
                  * Math.sin(f * br.freq * 6.28 + br.ph + time * br.spd);
                return { x: start.x + bdx * d - bdy * bs, y: start.y + bdy * d + bdx * bs };
              },
              Math.max(8, Math.round(steps * 0.6)),
              br.w,
              baseA * 0.55,
              0.50, 0.08, br.ph,
            );
          }
          // traveling release highlights — bright knots racing along the filament
          for (const pl of t.pulses) {
            if (pl.d < 0 || pl.d > 1) continue;
            const pt = parentPt(pl.d, 0, 0);
            const ka = intensity * (1 - pl.d * 0.6) * 0.8;
            const g = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, t.w * 7);
            g.addColorStop(0, rgba(shade(0.92), ka));
            g.addColorStop(0.4, rgba(shade(0.6), ka * 0.4));
            g.addColorStop(1, rgba(deepMix, 0));
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(pt.x, pt.y, t.w * 7, 0, Math.PI * 2); ctx.fill();
          }
        }
      }

      // starburst — crisp persistent reactor rays that flare on release
      if (starRays.length) {
        const rayGain = P.style === 'starburst' ? 1 : 0.35;
        ctx.lineCap = 'round';
        for (const sr of starRays) {
          const a = intensity * (0.05 + 0.22 * sr.glow)
            * (1 + charge * 0.7 + flashE * 2.4) * rayGain;
          if (a <= 0.01) continue;
          const ang = sr.ang + time * sr.drift;
          const L = sr.lenF * maxR * (1 + flashE * 0.35);
          const bx = cx + Math.cos(ang) * coreR * 0.6;
          const by = cy + Math.sin(ang) * coreR * 0.6;
          const tx = cx + Math.cos(ang) * L, ty = cy + Math.sin(ang) * L;
          const col = mix(main, WHITE, sr.hm);

          // soft root beam — the ray's base dissolves into the central bloom
          const rx = cx + Math.cos(ang) * L * 0.30, ry2 = cy + Math.sin(ang) * L * 0.30;
          const gr = ctx.createLinearGradient(bx, by, rx, ry2);
          gr.addColorStop(0, rgba(main, a * 0.40));
          gr.addColorStop(1, rgba(main, 0));
          ctx.lineWidth = sr.w * 6;
          ctx.strokeStyle = gr;
          ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(rx, ry2); ctx.stroke();

          const g = ctx.createLinearGradient(bx, by, tx, ty);
          g.addColorStop(0, rgba(shade(0.92), Math.min(1, a * 1.4)));
          g.addColorStop(0.3, rgba(mix(col, shade(0.55), 0.5), a * 0.7));
          g.addColorStop(0.7, rgba(shade(0.30), a * 0.35));
          g.addColorStop(1, rgba(shade(0.18), 0));
          ctx.lineWidth = sr.w * 3.4;
          ctx.strokeStyle = rgba(main, a * 0.18);
          ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(tx, ty); ctx.stroke();
          ctx.lineWidth = sr.w;
          ctx.strokeStyle = g;
          ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(tx, ty); ctx.stroke();
        }
      }

      // particle nova — motion-stretched debris streams, white-hot near the
      // origin and dimming/saturating as they fly out
      if (blastParts.length) {
        ctx.lineCap = 'round';
        for (const bp of blastParts) {
          const p = bp.life / bp.maxLife;
          const e = exposure(Math.hypot(bp.x - cx, bp.y - cy));
          const a = Math.pow(1 - p, 1.5) * intensity * 0.85 * (0.55 + e * 2.0);
          if (a <= 0.01) continue;
          const col = shade(clamp01(0.35 + e * 0.55 + bp.hm * 0.15));
          ctx.lineWidth = bp.sz * (1 + e * 1.4);
          ctx.strokeStyle = rgba(col, a);
          ctx.beginPath();
          ctx.moveTo(bp.x - bp.vx * 0.05, bp.y - bp.vy * 0.05);
          ctx.lineTo(bp.x, bp.y);
          ctx.stroke();
        }
      }

      // shared micro-glint field — tiny twinkling specks, exposure-scaled
      for (const gl of glints) {
        const d = gl.rF * maxR;
        const e = exposure(d);
        const tw = Math.pow(0.5 + 0.5 * Math.sin(time * gl.spd + gl.ph), 3);
        const a = intensity * (0.04 + 0.55 * tw) * (0.30 + e * 1.7) * (0.5 + atmoE * 0.5);
        if (a <= 0.012) continue;
        const px = cx + Math.cos(gl.ang) * d;
        const py = cy + Math.sin(gl.ang) * d;
        const col = shade(0.55 + e * 0.4);
        const rr = gl.sz * (2 + e * 3);
        const g = ctx.createRadialGradient(px, py, 0, px, py, rr);
        g.addColorStop(0, rgba(col, Math.min(1, a)));
        g.addColorStop(0.3, rgba(col, a * 0.4));
        g.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(px, py, rr, 0, Math.PI * 2); ctx.fill();
      }

      // energy motes — pinpoint core inside a faint halo, not a uniform blob
      for (const m of motes) {
        const twk = 0.55 + 0.45 * Math.sin(time * 2.6 + m.tw);
        const e = exposure(m.r);
        const a = (0.08 + 0.30 * twk) * m.alf * intensity
          * (1 + m.heat * 2.0) * P.moteAmt * (0.6 + e * 1.8);
        if (a <= 0.01) continue;
        const sz = m.size * (1 + m.heat * 0.8 + e * 0.8);
        const px = cx + Math.cos(m.ang) * m.r;
        const py = cy + Math.sin(m.ang) * m.r;
        const col = shade(clamp01(0.35 + e * 0.45 + m.heat * 0.35));
        const g = ctx.createRadialGradient(px, py, 0, px, py, sz * 5);
        g.addColorStop(0, rgba(col, Math.min(1, a * 1.6)));
        g.addColorStop(0.15, rgba(col, a * 0.55));
        g.addColorStop(0.5, rgba(col, a * 0.12));
        g.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, sz * 5, 0, Math.PI * 2);
        ctx.fill();
      }

      // burst filaments — bent tapered light lines, alive for a blink at release
      for (const ry of burstRays) {
        const p = ry.life / ry.maxLife;
        const ease = 1 - Math.pow(1 - p, 3); // fast snap out
        const base0 = coreR * (1.2 + ease * 1.0) + ease * ry.len * 0.35;
        const fade = Math.pow(1 - p, 1.7) * intensity
          * (0.7 + P.flash * 0.8) * (0.75 + exposure(base0) * 0.9);
        if (fade <= 0.01) continue;

        const base = base0;
        const tip  = coreR * 1.6 + ease * ry.len;
        if (tip - base < 2) continue;

        const bx = cx + Math.cos(ry.ang) * base, by = cy + Math.sin(ry.ang) * base;
        const tx = cx + Math.cos(ry.ang) * tip,  ty = cy + Math.sin(ry.ang) * tip;
        // control point offset perpendicular to the ray — slight organic bend
        const mid = (base + tip) * 0.5, bendOff = ry.bend * (tip - base) * 0.4;
        const mx = cx + Math.cos(ry.ang) * mid - Math.sin(ry.ang) * bendOff;
        const my = cy + Math.sin(ry.ang) * mid + Math.cos(ry.ang) * bendOff;

        const rayCol = shade(0.55 + ry.hotMix * 0.4);
        const g = ctx.createLinearGradient(bx, by, tx, ty);
        g.addColorStop(0, rgba(shade(0.9), 0));
        g.addColorStop(0.3, rgba(rayCol, fade));
        g.addColorStop(0.85, rgba(shade(0.35), fade * 0.55));
        g.addColorStop(1, rgba(shade(0.2), 0));

        ctx.lineWidth = ry.w * 3.2;
        ctx.strokeStyle = rgba(mix(main, deep, P.cd * 0.4), fade * 0.22);
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(mx, my, tx, ty); ctx.stroke();

        ctx.lineWidth = ry.w;
        ctx.strokeStyle = g;
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(mx, my, tx, ty); ctx.stroke();
      }

      // emission sparks — short streaks along their velocity
      for (const s of sparks) {
        const lf = 1 - s.life / s.maxLife;
        const e = exposure(Math.hypot(s.x - cx, s.y - cy));
        const a = lf * lf * 0.8 * intensity * (0.65 + e * 1.2);
        if (a <= 0.01) continue;
        const tx = s.x - s.vx * 0.045, ty = s.y - s.vy * 0.045;
        const g = ctx.createLinearGradient(tx, ty, s.x, s.y);
        g.addColorStop(0, rgba(shade(0.25), 0));
        g.addColorStop(1, rgba(shade(0.55 + e * 0.35), a));
        ctx.strokeStyle = g;
        ctx.lineWidth = s.w;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();
      }

      // core: haze → colored glow → hot center, scaled by charge + flash
      const coreScale = (1 + charge * 0.55 + flashE * 1.8) * flicker;
      const cR = coreR * coreScale;
      const coreA = intensity * (0.45 + charge * 0.35 + flashE * 0.8);

      const g3 = ctx.createRadialGradient(cx, cy, 0, cx, cy, cR * 4.5);
      g3.addColorStop(0, rgba(main, coreA * 0.35));
      g3.addColorStop(0.6, rgba(mix(main, deep, P.cd * 0.45), coreA * 0.12));
      g3.addColorStop(1, rgba(mix(main, deep, P.cd * 0.8), 0));
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
