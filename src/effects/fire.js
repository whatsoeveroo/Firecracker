export function createFireEffect() {
  let particles = [];

  function spawnParticle(cx, cy, params) {
    const { intensity, height, turbulence, colorTemp, flameWidth } = params;
    const spread = flameWidth * 0.5;
    return {
      x: cx + (Math.random() - 0.5) * spread,
      y: cy,
      vx: (Math.random() - 0.5) * turbulence * 0.8,
      vy: -(Math.random() * 2 + 1) * (height / 60),
      life: 1,
      decay: 0.008 + Math.random() * 0.012,
      size: Math.random() * 18 + 8,
      colorTemp,
    };
  }

  function getFireColor(life, colorTemp) {
    // colorTemp: 0 = cool (blue/white), 1 = warm (red/orange)
    const t = life;
    let r, g, b;
    if (colorTemp > 0.5) {
      // warm fire
      const warm = (colorTemp - 0.5) * 2;
      r = Math.min(255, 255);
      g = Math.min(255, Math.floor(t * (100 + warm * 60)));
      b = Math.floor(t * 20);
    } else {
      // cool fire (blue-white)
      const cool = colorTemp * 2;
      r = Math.floor(t * cool * 200);
      g = Math.floor(t * (cool * 100 + (1 - cool) * 180));
      b = Math.min(255, Math.floor(t * 255));
    }
    return `rgba(${r},${g},${b},${t * 0.85})`;
  }

  return {
    reset() {
      particles = [];
    },
    update(ctx, canvas, params, dt) {
      const cx = canvas.width / 2;
      const cy = canvas.height * 0.75;
      const { intensity, turbulence } = params;

      const spawnCount = Math.floor(intensity * 0.25 + Math.random() * intensity * 0.1);
      for (let i = 0; i < spawnCount; i++) {
        particles.push(spawnParticle(cx, cy, params));
      }

      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx + (Math.random() - 0.5) * turbulence * 0.3;
        p.vx *= 0.97;
        p.y += p.vy;
        p.life -= p.decay;
        p.size *= 0.993;

        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        grad.addColorStop(0, getFireColor(p.life, p.colorTemp));
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    },
  };
}
