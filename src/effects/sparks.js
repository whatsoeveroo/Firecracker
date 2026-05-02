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

function pick(rng, items) {
  return items[Math.floor(rng() * items.length)];
}

function signedPowRandom(rng, power = 1.7) {
  return (rng() < 0.5 ? -1 : 1) * Math.pow(rng(), power);
}

function tempColor(temp, heat, alpha) {
  const t = clamp01(temp / 100);
  const h = clamp01(heat);

  const cool = {
    r: lerp(95, 255, h),
    g: lerp(180, 255, h),
    b: lerp(255, 235, h),
  };

  const warm = {
    r: 255,
    g: lerp(34, 250, h),
    b: lerp(6, 176, h),
  };

  const neutral = {
    r: 255,
    g: lerp(82, 246, h),
    b: lerp(20, 205, h),
  };

  const coldBlend = Math.max(0, 0.5 - t) * 2;
  const warmBlend = Math.max(0, t - 0.5) * 2;
  const base = coldBlend > 0
    ? {
        r: lerp(neutral.r, cool.r, coldBlend),
        g: lerp(neutral.g, cool.g, coldBlend),
        b: lerp(neutral.b, cool.b, coldBlend),
      }
    : {
        r: lerp(neutral.r, warm.r, warmBlend),
        g: lerp(neutral.g, warm.g, warmBlend),
        b: lerp(neutral.b, warm.b, warmBlend),
      };

  return `rgba(${Math.round(base.r)},${Math.round(base.g)},${Math.round(base.b)},${alpha.toFixed(3)})`;
}

function createBurstShape(cx, cy, params, rng) {
  const direction = param(params, 'direction', -90) * Math.PI / 180;
  const spread = param(params, 'spreadAngle', 60) * Math.PI / 180;
  const scatter = param(params, 'chaos', 42) / 100;
  const directional = param(params, 'directionalBurst', 70) / 100;
  const clusterCount = Math.max(2, Math.round(lerp(2, 7, scatter)));
  const clusters = [];

  for (let i = 0; i < clusterCount; i++) {
    const centered = signedPowRandom(rng, lerp(0.65, 2.9, directional));
    const rogue = rng() < scatter * 0.16;
    clusters.push({
      angle: rogue ? direction + rand(rng, -Math.PI, Math.PI) : direction + centered * spread * 0.5,
      weight: rand(rng, 0.55, 1.7),
      velocity: rand(rng, 0.72, 1.34),
      spread: spread * rand(rng, 0.035, lerp(0.22, 0.055, directional)),
      originX: cx + rand(rng, -13, 13) * scatter,
      originY: cy + rand(rng, -5, 5) * scatter,
    });
  }

  return { direction, spread, scatter, directional, clusters };
}

function spawnSpark(cx, cy, params, type, burst, rng) {
  const length = param(params, 'length', 86);
  const exposure = param(params, 'brightness', 88);
  const burnout = param(params, 'decay', 54);
  const trailWidth = param(params, 'trailWidth', 45) / 100;
  const trailLength = param(params, 'trailLength', 58) / 100;
  const colorTemp = param(params, 'colorTemp', 58);
  const cluster = pick(rng, burst.clusters);
  const typeFocus = type === 'needle' ? 3.2 : type === 'fragment' ? 1.7 : type === 'ember' ? 1.25 : 0.8;
  const angle = cluster.angle + signedPowRandom(rng, typeFocus) * cluster.spread + rand(rng, -0.018, 0.018) * burst.scatter;

  const speedShape = type === 'needle' ? rand(rng, 1.05, 1.72)
                   : type === 'fragment' ? rand(rng, 0.38, 0.88)
                   : type === 'ember' ? rand(rng, 0.16, 0.38)
                   : rand(rng, 0.12, 0.48);
  const speed = (110 + length * 10.8) * speedShape * cluster.velocity;
  const jitter = type === 'micro' ? 5 : type === 'ember' ? 10 : 13;

  const lifeBase = type === 'needle' ? rand(rng, 0.16, 0.38)
                 : type === 'fragment' ? rand(rng, 0.48, 1.12)
                 : type === 'ember' ? rand(rng, 0.9, 1.95)
                 : rand(rng, 0.08, 0.24);
  const life = lifeBase * lerp(1.55, 0.52, burnout / 100);

  return {
    type,
    x: cluster.originX + rand(rng, -jitter, jitter) * 0.65,
    y: cluster.originY + rand(rng, -jitter, jitter) * 0.22,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    age: 0,
    life,
    heat: type === 'needle' ? rand(rng, 0.86, 1)
        : type === 'fragment' ? rand(rng, 0.58, 0.95)
        : type === 'ember' ? rand(rng, 0.26, 0.62)
        : rand(rng, 0.48, 0.9),
    mass: type === 'needle' ? rand(rng, 0.45, 0.95)
        : type === 'fragment' ? rand(rng, 1.25, 2.8)
        : type === 'ember' ? rand(rng, 1.8, 3.6)
        : rand(rng, 0.25, 0.75),
    flicker: rand(rng, 0, TAU),
    shimmer: rand(rng, 22, 72),
    width: (type === 'needle' ? rand(rng, 0.42, 1.02)
        : type === 'fragment' ? rand(rng, 0.9, 2.6)
        : type === 'ember' ? rand(rng, 1.0, 2.9)
        : rand(rng, 0.22, 0.68)) * lerp(0.55, 2.25, trailWidth),
    glow: exposure / 100 * cluster.weight,
    colorTemp,
    maxTrail: Math.round((type === 'needle' ? 12 : type === 'fragment' ? 16 : type === 'ember' ? 24 : 6) * lerp(0.45, 1.75, trailLength)),
    bounced: false,
    trail: [],
  };
}

function spawnBurst(cx, cy, params, rng) {
  const sparkCount = param(params, 'sparkCount', 46);
  const fragmentWeight = param(params, 'fragmentWeight', 48) / 100;
  const microAmount = param(params, 'microAmount', 48) / 100;
  const flashSize = param(params, 'flashSize', 66);
  const burst = createBurstShape(cx, cy, params, rng);
  const particles = [];

  const needleCount = Math.max(2, Math.round(sparkCount * lerp(0.44, 0.18, fragmentWeight)));
  const fragmentCount = Math.max(2, Math.round(sparkCount * lerp(0.28, 0.86, fragmentWeight)));
  const microCount = Math.round(sparkCount * lerp(0.1, 1.25, microAmount));
  const emberCount = Math.round(fragmentCount * lerp(0.18, 0.62, fragmentWeight));

  for (let i = 0; i < needleCount; i++) particles.push(spawnSpark(cx, cy, params, 'needle', burst, rng));
  for (let i = 0; i < fragmentCount; i++) particles.push(spawnSpark(cx, cy, params, 'fragment', burst, rng));
  for (let i = 0; i < microCount; i++) particles.push(spawnSpark(cx, cy, params, 'micro', burst, rng));
  for (let i = 0; i < emberCount; i++) particles.push(spawnSpark(cx, cy, params, 'ember', burst, rng));

  return {
    particles,
    flash: flashSize > 0 ? {
      cx,
      cy,
      age: 0,
      life: lerp(0.04, 0.17, flashSize / 100),
      size: 24 + flashSize * 3.2,
      angle: burst.direction,
      directional: burst.directional,
      scatter: burst.scatter,
    } : null,
  };
}

function drawFlash(ctx, flash, params) {
  const exposure = param(params, 'brightness', 88) / 100;
  const colorTemp = param(params, 'colorTemp', 58);
  const life = 1 - clamp01(flash.age / flash.life);
  const a = Math.pow(life, 2.1) * exposure;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.translate(flash.cx, flash.cy);
  ctx.rotate(flash.angle);

  ctx.save();
  ctx.scale(lerp(1.15, 3.45, flash.directional), lerp(1.15, 0.46, flash.directional));
  const cone = ctx.createRadialGradient(flash.size * 0.14, 0, 0, 0, 0, flash.size);
  cone.addColorStop(0, tempColor(colorTemp, 1, Math.min(1, a * 1.35)));
  cone.addColorStop(0.16, `rgba(255,255,255,${Math.min(1, a * 0.65).toFixed(3)})`);
  cone.addColorStop(0.34, tempColor(colorTemp, 0.72, a * 0.48));
  cone.addColorStop(0.72, tempColor(colorTemp, 0.22, a * 0.13));
  cone.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = cone;
  ctx.beginPath();
  ctx.arc(0, 0, flash.size, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.lineCap = 'round';
  ctx.strokeStyle = tempColor(colorTemp, 1, a * 0.82);
  ctx.lineWidth = Math.max(1, flash.size * 0.014);
  ctx.beginPath();
  ctx.moveTo(-flash.size * 0.14, 0);
  ctx.lineTo(flash.size * lerp(0.85, 1.95, flash.directional), 0);
  ctx.stroke();

  ctx.strokeStyle = `rgba(255,245,220,${(a * 0.24).toFixed(3)})`;
  ctx.lineWidth = Math.max(1, flash.size * 0.007);
  for (const off of [-0.32, 0.28, 0.58]) {
    ctx.beginPath();
    ctx.moveTo(flash.size * 0.04, 0);
    ctx.lineTo(flash.size * lerp(0.35, 1.1, flash.directional), flash.size * off * (0.45 + flash.scatter));
    ctx.stroke();
  }

  ctx.restore();
}

function drawSpark(ctx, p, exposure) {
  const n = clamp01(p.age / p.life);
  const alive = 1 - n;
  const speed = Math.hypot(p.vx, p.vy);
  const speedGlow = clamp01(speed / 980);
  const coolCurve = p.type === 'ember' ? Math.pow(alive, 2.8) : Math.pow(alive, 1.65);
  const flicker = 0.78 + Math.sin(p.age * p.shimmer + p.flicker) * 0.22;
  const heat = clamp01((p.heat * coolCurve + speedGlow * 0.32) * flicker);
  const burnout = p.type === 'needle' ? Math.pow(alive, 1.05)
                : p.type === 'micro' ? Math.pow(alive, 2.4)
                : p.type === 'ember' ? Math.pow(alive, 2.15)
                : Math.pow(alive, 1.55);
  const alpha = burnout * p.glow;
  const trail = p.trail;

  if (trail.length > 1) {
    ctx.lineCap = p.type === 'needle' ? 'butt' : 'round';
    ctx.lineJoin = 'round';

    for (let i = 1; i < trail.length; i++) {
      const a = trail[i - 1];
      const b = trail[i];
      const t = i / (trail.length - 1);
      const localHeat = clamp01(heat * (0.15 + t * 0.95));
      const tailCooling = Math.pow(t, p.type === 'needle' ? 1.9 : 1.25);
      const segAlpha = alpha * tailCooling * (p.type === 'micro' ? 0.48 : 1);
      const width = Math.max(0.18, p.width * Math.pow(t, 1.35) * (p.type === 'needle' ? 0.92 : 1));

      ctx.strokeStyle = tempColor(p.colorTemp, localHeat, segAlpha);
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();

      if (exposure > 0.82 && t > 0.74 && p.type !== 'ember') {
        ctx.strokeStyle = `rgba(220,245,255,${((exposure - 0.82) * 1.8 * segAlpha).toFixed(3)})`;
        ctx.lineWidth = Math.max(0.15, width * 0.34);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }

  const hotHead = p.type !== 'ember' && alpha > 0.03;
  if (hotHead) {
    const coreLen = Math.max(1.5, Math.min(28, speed * 0.018));
    const ang = Math.atan2(p.vy, p.vx);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(ang);
    ctx.fillStyle = exposure > 0.88 ? `rgba(225,245,255,${Math.min(1, alpha).toFixed(3)})` : tempColor(p.colorTemp, 1, Math.min(1, alpha));
    ctx.beginPath();
    ctx.ellipse(0, 0, coreLen, Math.max(0.32, p.width * 0.36), 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  const headSize = p.type === 'needle' ? 2.7 : p.type === 'fragment' ? 3.8 : p.type === 'ember' ? 3.2 : 1.35;
  const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, headSize * (1 + speedGlow));
  grad.addColorStop(0, tempColor(p.colorTemp, hotHead ? 1 : heat, Math.min(1, alpha * 1.1)));
  grad.addColorStop(0.42, tempColor(p.colorTemp, heat * 0.62, alpha * 0.34));
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(p.x, p.y, headSize * (1 + speedGlow), 0, TAU);
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
      const burstRate = lerp(0.48, 0.16, exposure);
      const gravity = lerp(0, 1180, param(params, 'gravity', 45) / 100);
      const airDrag = lerp(0.02, 1.85, param(params, 'airDrag', 42) / 100);
      const scatter = param(params, 'chaos', 42) / 100;
      const bounce = param(params, 'deflection', 0) / 100;
      const floorY = cy + canvas.height * 0.33;

      burstTimer += dt;
      if (burstTimer > burstRate) {
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
        const swirl = Math.sin(p.age * (11 + scatter * 28) + p.flicker) * scatter * 28;
        const randomKick = (rng() - 0.5) * scatter * 34;
        p.vx = (p.vx + (swirl + randomKick) * dt) * drag;
        p.vy = (p.vy + gravity * dt * p.mass) * drag;
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        if (bounce > 0 && !p.bounced && p.y > floorY && p.vy > 40 && p.type !== 'micro' && p.type !== 'needle') {
          p.y = floorY;
          p.vy *= -lerp(0.12, 0.48, bounce) / p.mass;
          p.vx *= lerp(0.55, 0.88, bounce) * (rng() < 0.5 ? 1 : -1);
          p.life *= lerp(0.55, 0.78, bounce);
          p.heat *= 0.68;
          p.bounced = true;
        }

        p.trail.push({ x: p.x, y: p.y });
        while (p.trail.length > p.maxTrail) p.trail.shift();

        drawSpark(ctx, p, exposure);
      }

      if (particles.length > 980) particles.splice(0, particles.length - 980);
      if (flashes.length > 8) flashes.splice(0, flashes.length - 8);

      ctx.restore();
    },
  };
}
