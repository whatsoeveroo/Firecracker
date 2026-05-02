const TAU = Math.PI * 2;

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function param(params, key, fallback) {
  const v = params[key];
  return Number.isFinite(v) ? v : fallback;
}

function makeRng(seed) {
  if (!Number.isFinite(seed) || seed <= 0) return Math.random;

  let s = Math.floor(seed) >>> 0;
  return () => {
    s += 0x6D2B79F5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rand(rng, min, max) {
  return min + rng() * (max - min);
}

function signedPowRandom(rng, power = 1.6) {
  return (rng() < 0.5 ? -1 : 1) * Math.pow(rng(), power);
}

function heatColor(temp, heat, alpha) {
  const h = clamp01(heat);
  const t = clamp01(temp / 100);

  const cool = {
    r: lerp(115, 235, h),
    g: lerp(185, 252, h),
    b: lerp(255, 255, h),
  };
  const neutral = {
    r: 255,
    g: lerp(48, 238, h),
    b: lerp(10, 188, h),
  };
  const warm = {
    r: 255,
    g: lerp(26, 244, h),
    b: lerp(4, 132, h),
  };

  const coldMix = Math.max(0, 0.5 - t) * 2;
  const warmMix = Math.max(0, t - 0.5) * 2;
  const c = coldMix > 0
    ? {
        r: lerp(neutral.r, cool.r, coldMix),
        g: lerp(neutral.g, cool.g, coldMix),
        b: lerp(neutral.b, cool.b, coldMix),
      }
    : {
        r: lerp(neutral.r, warm.r, warmMix),
        g: lerp(neutral.g, warm.g, warmMix),
        b: lerp(neutral.b, warm.b, warmMix),
      };

  return `rgba(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)},${alpha.toFixed(3)})`;
}

function makeBurst(params, rng, cx, cy) {
  const direction = param(params, 'direction', -90) * Math.PI / 180;
  const spread = param(params, 'spreadAngle', 50) * Math.PI / 180;
  const scatter = param(params, 'chaos', 40) / 100;
  const directional = param(params, 'directionalBurst', 72) / 100;
  const clusterCount = Math.max(2, Math.round(lerp(2, 6, scatter)));
  const clusters = [];

  for (let i = 0; i < clusterCount; i++) {
    const rogue = rng() < scatter * 0.13;
    const centered = signedPowRandom(rng, lerp(0.7, 3.2, directional));
    clusters.push({
      angle: rogue ? direction + rand(rng, -Math.PI, Math.PI) : direction + centered * spread * 0.5,
      spread: spread * rand(rng, 0.05, lerp(0.25, 0.055, directional)),
      speed: rand(rng, 0.7, 1.35),
      weight: rand(rng, 0.72, 1.35),
      x: cx + rand(rng, -9, 9) * scatter,
      y: cy + rand(rng, -4, 4) * scatter,
    });
  }

  return { direction, scatter, directional, clusters };
}

function chooseCluster(clusters, rng) {
  return clusters[Math.floor(rng() * clusters.length)];
}

function spawnParticle(params, rng, burst, type) {
  const velocity = param(params, 'length', 90);
  const exposure = param(params, 'brightness', 88) / 100;
  const particleLife = param(params, 'particleLife', 46) / 100;
  const burnout = param(params, 'decay', 56) / 100;
  const trailLength = param(params, 'trailLength', 55) / 100;
  const trailWidth = param(params, 'trailWidth', 32) / 100;
  const heatTemp = param(params, 'colorTemp', 58);
  const scatter = param(params, 'chaos', 40) / 100;
  const cluster = chooseCluster(burst.clusters, rng);

  const focus = type === 'needle' ? 3.1 : type === 'fragment' ? 1.55 : 0.85;
  const angle = cluster.angle + signedPowRandom(rng, focus) * cluster.spread + rand(rng, -0.055, 0.055) * scatter;
  const speedScale = type === 'needle' ? rand(rng, 1.05, 1.82)
                   : type === 'fragment' ? rand(rng, 0.38, 0.95)
                   : rand(rng, 0.14, 0.52);
  const speed = (120 + velocity * 10.3) * speedScale * cluster.speed;

  const baseLife = type === 'needle' ? rand(rng, 0.11, 0.32)
                 : type === 'fragment' ? rand(rng, 0.42, 1.02)
                 : rand(rng, 0.055, 0.18);
  const life = baseLife * lerp(0.35, 2.2, particleLife);
  const mass = type === 'needle' ? rand(rng, 0.45, 0.9)
             : type === 'fragment' ? rand(rng, 1.15, 2.85)
             : rand(rng, 0.22, 0.62);

  const jitter = type === 'micro' ? 4.5 : 9;
  return {
    type,
    x: cluster.x + rand(rng, -jitter, jitter),
    y: cluster.y + rand(rng, -jitter * 0.28, jitter * 0.28),
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    age: 0,
    life,
    heat: type === 'needle' ? rand(rng, 0.84, 1)
        : type === 'fragment' ? rand(rng, 0.46, 0.92)
        : rand(rng, 0.55, 1),
    cooling: lerp(0.75, 2.6, burnout) * (type === 'micro' ? 1.65 : 1),
    mass,
    width: (type === 'needle' ? rand(rng, 0.32, 0.86)
        : type === 'fragment' ? rand(rng, 0.82, 2.25)
        : rand(rng, 0.18, 0.5)) * lerp(0.55, 2.1, trailWidth),
    trailMax: Math.max(2, Math.round((type === 'needle' ? 12 : type === 'fragment' ? 18 : 5) * lerp(0.35, 1.8, trailLength))),
    glow: exposure * cluster.weight,
    colorTemp: heatTemp,
    noisePhase: rand(rng, 0, TAU),
    noiseRate: rand(rng, 9, 31),
    bounced: false,
    trail: [],
  };
}

function spawnAtmosphere(cx, cy, params, rng, burst) {
  const gas = param(params, 'gasPlume', 0) / 100;
  const smoke = param(params, 'smokeAmount', 0) / 100;
  const smokeDrift = param(params, 'smokeDrift', 45) / 100;
  const lens = param(params, 'lensFlare', 0) / 100;
  const spill = param(params, 'spillGlow', 0) / 100;
  const flash = param(params, 'flashSize', 62) / 100;
  const temp = param(params, 'colorTemp', 58);
  const any = gas + smoke + lens + spill;
  if (any <= 0.001) return null;

  const plumeBlobs = [];
  const smokeBlobs = [];
  const streaks = [];
  const plumeCount = Math.round(lerp(3, 12, gas));
  const smokeCount = Math.round(lerp(2, 14, smoke));
  const direction = burst.direction;
  const directional = burst.directional;
  const scatter = burst.scatter;

  for (let i = 0; i < plumeCount; i++) {
    const t = (i + rand(rng, 0.08, 0.9)) / plumeCount;
    plumeBlobs.push({
      t,
      side: signedPowRandom(rng, 1.2) * lerp(5, 22, scatter) * (0.3 + t),
      radius: lerp(10, 54, gas) * rand(rng, 0.55, 1.25) * (0.72 + t * 0.95),
      stretch: rand(rng, 0.8, 1.75),
      alpha: rand(rng, 0.18, 0.58) * gas,
      heat: rand(rng, 0.45, 1) * (1 - t * 0.45),
    });
  }

  for (let i = 0; i < smokeCount; i++) {
    const t = rand(rng, 0.06, 1);
    smokeBlobs.push({
      t,
      side: signedPowRandom(rng, 0.95) * lerp(8, 42, scatter + smokeDrift * 0.5) * (0.45 + t),
      radius: lerp(13, 72, smoke) * rand(rng, 0.65, 1.55) * (0.75 + t),
      stretch: rand(rng, 0.75, 1.65),
      alpha: rand(rng, 0.035, 0.13) * smoke,
      warm: rand(rng, 0.15, 0.75),
    });
  }

  const streakCount = Math.round(lerp(1, 4, lens));
  for (let i = 0; i < streakCount; i++) {
    streaks.push({
      offset: signedPowRandom(rng, 1.3) * lerp(2, 16, scatter),
      length: rand(rng, 0.62, 1.3),
      width: rand(rng, 0.45, 1.2),
      alpha: rand(rng, 0.28, 0.75) * lens,
    });
  }

  return {
    x: cx,
    y: cy,
    age: 0,
    life: lerp(0.16, 0.72, Math.max(gas, smoke, spill)),
    direction,
    directional,
    scatter,
    gas,
    smoke,
    smokeDrift,
    lens,
    spill,
    flash,
    temp,
    plumeBlobs,
    smokeBlobs,
    streaks,
  };
}

function spawnBurst(cx, cy, params, rng) {
  const count = param(params, 'sparkCount', 52);
  const fragmentWeight = param(params, 'fragmentWeight', 44) / 100;
  const microAmount = param(params, 'microAmount', 38) / 100;
  const flashCore = param(params, 'flashSize', 62);
  const burst = makeBurst(params, rng, cx, cy);
  const particles = [];

  const needles = Math.max(1, Math.round(count * lerp(0.48, 0.18, fragmentWeight)));
  const fragments = Math.max(1, Math.round(count * lerp(0.24, 0.82, fragmentWeight)));
  const micros = Math.round(count * lerp(0.05, 1.1, microAmount));

  for (let i = 0; i < needles; i++) particles.push(spawnParticle(params, rng, burst, 'needle'));
  for (let i = 0; i < fragments; i++) particles.push(spawnParticle(params, rng, burst, 'fragment'));
  for (let i = 0; i < micros; i++) particles.push(spawnParticle(params, rng, burst, 'micro'));

  const flash = flashCore > 0 ? {
    x: cx,
    y: cy,
    angle: burst.direction,
    age: 0,
    life: lerp(0.028, 0.105, flashCore / 100),
    size: lerp(6, 34, flashCore / 100),
    energy: flashCore / 100,
    directional: burst.directional,
    scatter: burst.scatter,
    rays: Array.from({ length: Math.round(lerp(3, 9, flashCore / 100)) }, () => ({
      a: burst.direction + signedPowRandom(rng, 1.5) * lerp(0.25, 0.95, 1 - burst.directional) + rand(rng, -0.18, 0.18) * burst.scatter,
      l: rand(rng, 0.45, 1.25),
      w: rand(rng, 0.45, 1.25),
    })),
  } : null;

  return { particles, flash, atmosphere: spawnAtmosphere(cx, cy, params, rng, burst) };
}

function drawAtmosphereSmoke(ctx, a) {
  if (a.smoke <= 0) return;

  const n = clamp01(a.age / a.life);
  const life = Math.pow(1 - n, 1.15);
  const travel = 120 * a.smokeDrift * n;
  const dx = Math.cos(a.direction);
  const dy = Math.sin(a.direction);
  const px = -dy;
  const py = dx;

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  for (const b of a.smokeBlobs) {
    const dist = (26 + a.smoke * 150) * b.t + travel;
    const x = a.x + dx * dist + px * b.side * (1 + n * 0.7);
    const y = a.y + dy * dist + py * b.side * (1 + n * 0.7) - 14 * n * a.smokeDrift;
    const r = b.radius * (1 + n * 1.15);
    const alpha = b.alpha * life;
    if (alpha <= 0.002) continue;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a.direction + b.side * 0.01);
    ctx.scale(b.stretch, 1 / b.stretch);
    const g = ctx.createRadialGradient(0, 0, r * 0.05, 0, 0, r);
    const warm = Math.round(105 + b.warm * 70);
    g.addColorStop(0, `rgba(${warm},${Math.round(warm * 0.72)},${Math.round(warm * 0.42)},${alpha.toFixed(3)})`);
    g.addColorStop(0.48, `rgba(94,82,68,${(alpha * 0.42).toFixed(3)})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawAtmosphereLight(ctx, a) {
  const n = clamp01(a.age / a.life);
  const life = Math.pow(1 - n, 1.85);
  const dx = Math.cos(a.direction);
  const dy = Math.sin(a.direction);
  const px = -dy;
  const py = dx;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  if (a.spill > 0) {
    for (let i = 0; i < 3; i++) {
      const side = (i - 1) * 7 * (0.4 + a.scatter);
      const r = lerp(18, 80, a.spill) * (1 + i * 0.32) * (1 + n * 0.55);
      const x = a.x + dx * i * 10 + px * side;
      const y = a.y + dy * i * 10 + py * side;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, heatColor(a.temp, 0.8, a.spill * life * 0.18));
      g.addColorStop(0.55, heatColor(a.temp, 0.32, a.spill * life * 0.055));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    }
  }

  if (a.gas > 0) {
    for (const b of a.plumeBlobs) {
      const dist = (18 + a.gas * 170) * b.t;
      const x = a.x + dx * dist + px * b.side;
      const y = a.y + dy * dist + py * b.side;
      const r = b.radius * (1 + n * 0.42);
      const alpha = b.alpha * life;
      if (alpha <= 0.003) continue;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a.direction + b.side * 0.006);
      ctx.scale(lerp(0.85, 1.7, a.directional) * b.stretch, 1 / b.stretch);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0, `rgba(255,255,245,${Math.min(1, alpha * 0.95).toFixed(3)})`);
      g.addColorStop(0.22, heatColor(a.temp, Math.max(0.65, b.heat), alpha * 0.82));
      g.addColorStop(0.64, heatColor(a.temp, b.heat * 0.42, alpha * 0.28));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  if (a.lens > 0) {
    ctx.lineCap = 'round';
    for (const s of a.streaks) {
      const len = lerp(35, 260, a.lens) * s.length * lerp(0.45, 1.35, a.directional);
      const ox = px * s.offset;
      const oy = py * s.offset;
      ctx.strokeStyle = `rgba(255,232,170,${(s.alpha * life * 0.38).toFixed(3)})`;
      ctx.lineWidth = Math.max(0.45, s.width * lerp(0.5, 1.7, a.lens));
      ctx.beginPath();
      ctx.moveTo(a.x - dx * len * 0.18 + ox, a.y - dy * len * 0.18 + oy);
      ctx.lineTo(a.x + dx * len + ox * 0.35, a.y + dy * len + oy * 0.35);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawFlash(ctx, flash, params) {
  const exposure = param(params, 'brightness', 88) / 100;
  const temp = param(params, 'colorTemp', 58);
  const n = clamp01(flash.age / flash.life);
  const alive = Math.pow(1 - n, 2.4) * exposure * flash.energy;
  if (alive <= 0.01) return;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  const core = ctx.createRadialGradient(flash.x, flash.y, 0, flash.x, flash.y, flash.size);
  core.addColorStop(0, `rgba(255,255,255,${Math.min(1, alive * 1.65).toFixed(3)})`);
  core.addColorStop(0.22, heatColor(temp, 1, alive * 0.92));
  core.addColorStop(0.58, heatColor(temp, 0.45, alive * 0.28));
  core.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(flash.x, flash.y, flash.size, 0, TAU);
  ctx.fill();

  ctx.translate(flash.x, flash.y);
  ctx.rotate(flash.angle);
  ctx.lineCap = 'round';
  for (const ray of flash.rays) {
    const len = flash.size * lerp(0.9, 2.8, flash.directional) * ray.l;
    const side = Math.sin(ray.a - flash.angle) * flash.size * 0.25 * flash.scatter;
    ctx.save();
    ctx.rotate(ray.a - flash.angle);
    ctx.strokeStyle = heatColor(temp, 1, alive * 0.58);
    ctx.lineWidth = Math.max(0.7, flash.size * 0.035 * ray.w);
    ctx.beginPath();
    ctx.moveTo(-flash.size * 0.12, side * 0.15);
    ctx.lineTo(len, side);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

function drawParticle(ctx, p, exposure) {
  const n = clamp01(p.age / p.life);
  const alive = 1 - n;
  const speed = Math.hypot(p.vx, p.vy);
  const cooling = Math.pow(alive, p.cooling);
  const heat = clamp01(p.heat * cooling + clamp01(speed / 1250) * 0.25);
  const alpha = Math.pow(alive, p.type === 'micro' ? 2.15 : 1.3) * p.glow;

  if (p.trail.length > 1) {
    ctx.lineCap = p.type === 'needle' ? 'butt' : 'round';
    for (let i = 1; i < p.trail.length; i++) {
      const a = p.trail[i - 1];
      const b = p.trail[i];
      const t = i / (p.trail.length - 1);
      const localHeat = clamp01(heat * (0.12 + t * 1.05));
      const segAlpha = alpha * Math.pow(t, p.type === 'needle' ? 2.0 : 1.25) * (p.type === 'micro' ? 0.45 : 1);
      const width = Math.max(0.16, p.width * Math.pow(t, 1.28));

      ctx.strokeStyle = heatColor(p.colorTemp, localHeat, segAlpha);
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();

      if (exposure > 0.88 && t > 0.78 && p.type === 'needle') {
        ctx.strokeStyle = `rgba(220,245,255,${((exposure - 0.88) * 2.4 * segAlpha).toFixed(3)})`;
        ctx.lineWidth = Math.max(0.12, width * 0.28);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }

  if (alpha <= 0.01) return;

  const head = p.type === 'needle' ? 2.2 : p.type === 'fragment' ? 3.4 : 1.25;
  const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, head);
  g.addColorStop(0, exposure > 0.9 && p.type === 'needle'
    ? `rgba(235,248,255,${Math.min(1, alpha).toFixed(3)})`
    : heatColor(p.colorTemp, 1, Math.min(1, alpha)));
  g.addColorStop(0.5, heatColor(p.colorTemp, heat, alpha * 0.38));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p.x, p.y, head, 0, TAU);
  ctx.fill();
}

export function createSparksEffect() {
  let particles = [];
  let flashes = [];
  let atmospheres = [];
  let burstTimer = 0;
  let rng = Math.random;
  let lastSeed = null;

  return {
    reset() {
      particles = [];
      flashes = [];
      atmospheres = [];
      burstTimer = 0;
      lastSeed = null;
    },

    update(ctx, canvas, params, dt) {
      const seed = Math.round(param(params, 'randomSeed', 0));
      if (seed !== lastSeed) {
        rng = makeRng(seed);
        lastSeed = seed;
      }

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const exposure = param(params, 'brightness', 88) / 100;
      const burstRate = lerp(0.5, 0.18, exposure);
      const gravity = lerp(0, 1150, param(params, 'gravity', 44) / 100);
      const airDrag = lerp(0.02, 1.75, param(params, 'airDrag', 36) / 100);
      const scatter = param(params, 'chaos', 40) / 100;
      const bounce = param(params, 'deflection', 0) / 100;
      const floorY = cy + canvas.height * 0.33;

      burstTimer += dt;
      if (burstTimer >= burstRate) {
        burstTimer = 0;
        const burst = spawnBurst(cx, cy, params, rng);
        particles.push(...burst.particles);
        if (burst.flash) flashes.push(burst.flash);
        if (burst.atmosphere) atmospheres.push(burst.atmosphere);
      }

      for (let i = atmospheres.length - 1; i >= 0; i--) {
        const a = atmospheres[i];
        a.age += dt;
        if (a.age >= a.life) {
          atmospheres.splice(i, 1);
          continue;
        }
        drawAtmosphereSmoke(ctx, a);
      }

      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      for (let i = atmospheres.length - 1; i >= 0; i--) {
        drawAtmosphereLight(ctx, atmospheres[i]);
      }

      for (let i = flashes.length - 1; i >= 0; i--) {
        const f = flashes[i];
        f.age += dt;
        if (f.age >= f.life) {
          flashes.splice(i, 1);
          continue;
        }
        drawFlash(ctx, f, params);
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.age += dt;
        if (p.age >= p.life) {
          particles.splice(i, 1);
          continue;
        }

        const drag = Math.max(0, 1 - airDrag * dt / p.mass);
        const drift = Math.sin(p.age * p.noiseRate + p.noisePhase) * scatter * 42;
        const kick = (rng() - 0.5) * scatter * 28;
        p.vx = (p.vx + (drift + kick) * dt) * drag;
        p.vy = (p.vy + gravity * dt * p.mass) * drag;
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        if (bounce > 0 && !p.bounced && p.y > floorY && p.vy > 45 && p.type === 'fragment') {
          p.y = floorY;
          p.vy *= -lerp(0.12, 0.42, bounce) / p.mass;
          p.vx *= lerp(0.5, 0.88, bounce) * (rng() < 0.5 ? -1 : 1);
          p.life *= lerp(0.55, 0.82, bounce);
          p.heat *= 0.62;
          p.bounced = true;
        }

        p.trail.push({ x: p.x, y: p.y });
        while (p.trail.length > p.trailMax) p.trail.shift();
        drawParticle(ctx, p, exposure);
      }

      if (particles.length > 900) particles.splice(0, particles.length - 900);
      if (flashes.length > 5) flashes.splice(0, flashes.length - 5);
      if (atmospheres.length > 5) atmospheres.splice(0, atmospheres.length - 5);

      ctx.restore();
    },
  };
}
