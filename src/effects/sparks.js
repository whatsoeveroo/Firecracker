const TAU = Math.PI * 2;

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function signedPowRandom(power = 1.7) {
  return (Math.random() < 0.5 ? -1 : 1) * Math.pow(Math.random(), power);
}

function param(params, key, fallback) {
  const v = params[key];
  return Number.isFinite(v) ? v : fallback;
}

function tempColor(temp, heat, alpha) {
  const t = clamp01(temp / 100);
  const h = clamp01(heat);

  const cool = {
    r: lerp(170, 255, h),
    g: lerp(210, 250, h),
    b: lerp(255, 220, h),
  };

  const warm = {
    r: 255,
    g: lerp(65, 245, h),
    b: lerp(12, 190, h),
  };

  const neutral = {
    r: 255,
    g: lerp(115, 245, h),
    b: lerp(38, 210, h),
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

function spawnSpark(cx, cy, params, type) {
  const direction = param(params, 'direction', -90);
  const spreadAngle = param(params, 'spreadAngle', 60);
  const length = param(params, 'length', 60);
  const brightness = param(params, 'brightness', 80);
  const decay = param(params, 'decay', 50);
  const chaos = param(params, 'chaos', 34) / 100;
  const trailWidth = param(params, 'trailWidth', 45) / 100;
  const colorTemp = param(params, 'colorTemp', 58);

  const baseAngle = direction * Math.PI / 180;
  const halfSpread = spreadAngle * Math.PI / 360;
  const focused = type === 'needle' ? 2.4 : type === 'fragment' ? 1.45 : 0.85;
  const angle = baseAngle + signedPowRandom(focused) * halfSpread + rand(-0.025, 0.025) * chaos;

  const speedShape = type === 'needle' ? rand(0.95, 1.45)
                   : type === 'fragment' ? rand(0.48, 0.92)
                   : rand(0.16, 0.42);
  const speed = (180 + length * 8.8) * speedShape;
  const muzzleJitter = type === 'micro' ? 5 : 11;
  const lifeBase = type === 'needle' ? rand(0.28, 0.58)
                 : type === 'fragment' ? rand(0.45, 0.92)
                 : rand(0.18, 0.42);
  const life = lifeBase * lerp(1.38, 0.64, decay / 100);

  return {
    type,
    x: cx + rand(-muzzleJitter, muzzleJitter),
    y: cy + rand(-muzzleJitter * 0.35, muzzleJitter * 0.35),
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    age: 0,
    life,
    heat: type === 'needle' ? rand(0.78, 1) : type === 'fragment' ? rand(0.48, 0.9) : rand(0.35, 0.75),
    mass: type === 'needle' ? rand(0.65, 1.05) : type === 'fragment' ? rand(0.9, 1.8) : rand(0.35, 0.8),
    spin: rand(-2.8, 2.8),
    flicker: rand(0, TAU),
    width: (type === 'needle' ? rand(0.5, 1.25) : type === 'fragment' ? rand(0.75, 1.8) : rand(0.3, 0.75)) * lerp(0.75, 2.15, trailWidth),
    glow: brightness / 100,
    colorTemp,
    trail: [],
  };
}

function spawnBurst(cx, cy, params) {
  const sparkCount = param(params, 'sparkCount', 30);
  const direction = param(params, 'direction', -90);
  const flashSize = param(params, 'flashSize', 60);
  const particles = [];

  const needleCount = Math.max(3, Math.round(sparkCount * 0.28));
  const fragmentCount = Math.max(4, Math.round(sparkCount * 0.62));
  const microCount = Math.round(sparkCount * 0.55);

  for (let i = 0; i < needleCount; i++) particles.push(spawnSpark(cx, cy, params, 'needle'));
  for (let i = 0; i < fragmentCount; i++) particles.push(spawnSpark(cx, cy, params, 'fragment'));
  for (let i = 0; i < microCount; i++) particles.push(spawnSpark(cx, cy, params, 'micro'));

  return {
    particles,
    flash: flashSize > 0 ? {
      cx,
      cy,
      age: 0,
      life: lerp(0.055, 0.16, flashSize / 100),
      size: 28 + flashSize * 2.85,
      angle: direction * Math.PI / 180,
    } : null,
  };
}

function drawFlash(ctx, flash, params) {
  const brightness = param(params, 'brightness', 80) / 100;
  const colorTemp = param(params, 'colorTemp', 58);
  const life = 1 - clamp01(flash.age / flash.life);
  const a = Math.pow(life, 1.8) * brightness;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.translate(flash.cx, flash.cy);
  ctx.rotate(flash.angle);

  ctx.save();
  ctx.scale(2.9, 0.55);
  const cone = ctx.createRadialGradient(flash.size * 0.18, 0, 0, 0, 0, flash.size);
  cone.addColorStop(0, tempColor(colorTemp, 1, Math.min(1, a * 1.15)));
  cone.addColorStop(0.22, tempColor(colorTemp, 0.72, a * 0.56));
  cone.addColorStop(0.58, tempColor(colorTemp, 0.28, a * 0.18));
  cone.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = cone;
  ctx.beginPath();
  ctx.arc(0, 0, flash.size, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.lineCap = 'round';
  ctx.strokeStyle = tempColor(colorTemp, 1, a * 0.72);
  ctx.lineWidth = Math.max(1, flash.size * 0.018);
  ctx.beginPath();
  ctx.moveTo(-flash.size * 0.18, 0);
  ctx.lineTo(flash.size * 1.55, 0);
  ctx.stroke();

  ctx.strokeStyle = `rgba(255,245,210,${(a * 0.28).toFixed(3)})`;
  ctx.lineWidth = Math.max(1, flash.size * 0.009);
  for (const off of [-0.42, 0.42]) {
    ctx.beginPath();
    ctx.moveTo(flash.size * 0.05, 0);
    ctx.lineTo(flash.size * 0.95, flash.size * off);
    ctx.stroke();
  }

  ctx.restore();
}

function drawSpark(ctx, p) {
  const n = clamp01(p.age / p.life);
  const alive = 1 - n;
  const speed = Math.hypot(p.vx, p.vy);
  const speedGlow = clamp01(speed / 850);
  const flicker = 0.82 + Math.sin(p.age * 48 + p.flicker) * 0.18;
  const heat = clamp01((p.heat * alive + speedGlow * 0.35) * flicker);
  const alpha = Math.pow(alive, p.type === 'needle' ? 1.15 : 1.7) * p.glow;

  const trail = p.trail;
  if (trail.length > 1) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 1; i < trail.length; i++) {
      const a = trail[i - 1];
      const b = trail[i];
      const t = i / (trail.length - 1);
      const segAlpha = alpha * Math.pow(t, 1.35) * (p.type === 'micro' ? 0.55 : 1);
      const segHeat = clamp01(heat * (0.35 + t * 0.72));
      ctx.strokeStyle = tempColor(p.colorTemp, segHeat, segAlpha);
      ctx.lineWidth = Math.max(0.25, p.width * Math.pow(t, 1.15) * (p.type === 'needle' ? 1.45 : 1));
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }

  if (p.type !== 'micro') {
    const coreLen = Math.max(2, Math.min(22, speed * 0.018));
    const ang = Math.atan2(p.vy, p.vx);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(ang);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = tempColor(p.colorTemp, 1, 1);
    ctx.beginPath();
    ctx.ellipse(0, 0, coreLen, Math.max(0.45, p.width * 0.5), 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  const headSize = p.type === 'needle' ? 4.2 : p.type === 'fragment' ? 3.2 : 1.55;
  const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, headSize * (1 + speedGlow));
  grad.addColorStop(0, tempColor(p.colorTemp, 1, Math.min(1, alpha * 1.15)));
  grad.addColorStop(0.45, tempColor(p.colorTemp, 0.55, alpha * 0.44));
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

  return {
    reset() {
      particles = [];
      flashes = [];
      burstTimer = 0;
    },

    update(ctx, canvas, params, dt) {
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const brightness = param(params, 'brightness', 80);
      const burstRate = lerp(0.42, 0.18, brightness / 100);
      const gravity = lerp(40, 920, param(params, 'gravity', 45) / 100);
      const airDrag = lerp(0.10, 1.55, param(params, 'airDrag', 42) / 100);
      const chaos = param(params, 'chaos', 34) / 100;

      burstTimer += dt;
      if (burstTimer > burstRate) {
        burstTimer = 0;
        const burst = spawnBurst(cx, cy, params);
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
        const turbulence = Math.sin(p.age * 18 + p.flicker) * chaos * 22;
        p.vx = (p.vx + turbulence * dt) * drag;
        p.vy = (p.vy + gravity * dt * p.mass) * drag;
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        p.trail.push({ x: p.x, y: p.y });
        const maxTrail = p.type === 'needle' ? 18 : p.type === 'fragment' ? 13 : 7;
        while (p.trail.length > maxTrail) p.trail.shift();

        drawSpark(ctx, p);
      }

      if (particles.length > 900) particles.splice(0, particles.length - 900);
      if (flashes.length > 8) flashes.splice(0, flashes.length - 8);

      ctx.restore();
    },
  };
}
