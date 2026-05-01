export function createSmokeEffect() {
  let particles = [];

  function spawnParticle(cx, cy, params) {
    const { spread, softness, speed } = params;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * (spread / 100) * Math.PI;
    const spd = (Math.random() * 0.5 + 0.3) * (speed / 50);
    return {
      x: cx + (Math.random() - 0.5) * 30,
      y: cy,
      vx: Math.cos(angle) * spd + (Math.random() - 0.5) * 0.3,
      vy: Math.sin(angle) * spd,
      life: 1,
      decay: 0.003 + Math.random() * 0.004,
      size: Math.random() * 30 + 20,
      growRate: 1.003 + Math.random() * 0.004,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.005,
      softness,
    };
  }

  return {
    reset() {
      particles = [];
    },
    update(ctx, canvas, params, dt) {
      const cx = canvas.width / 2;
      const cy = canvas.height * 0.65;
      const { density, opacity } = params;

      const spawnCount = Math.floor(density * 0.12 + Math.random() * 0.08 * density);
      for (let i = 0; i < spawnCount; i++) {
        particles.push(spawnParticle(cx, cy, params));
      }

      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx += (Math.random() - 0.5) * 0.05;
        p.vy *= 0.995;
        p.life -= p.decay;
        p.size *= p.growRate;
        p.rotation += p.rotSpeed;

        if (p.life <= 0 || p.size > 300) {
          particles.splice(i, 1);
          continue;
        }

        const alpha = p.life * (opacity / 100) * 0.25;
        const softEdge = 1 - p.softness / 100;
        const innerStop = softEdge * 0.3;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
        grad.addColorStop(0, `rgba(180,180,190,${alpha})`);
        grad.addColorStop(innerStop, `rgba(140,140,155,${alpha * 0.8})`);
        grad.addColorStop(1, 'rgba(80,80,90,0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.restore();
    },
  };
}
