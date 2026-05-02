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

  return { particles, flash };
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
  let burstTimer = 0;
  let rng = Math.random;
  let lastSeed = null;

  return {
    reset() {
      particles = [];
      flashes = [];
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
      }

      ctx.save();
      ctx.globalCompositeOperation = 'screen';

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

      ctx.restore();
    },
  };
}
