export function createEmbersEffect() {
  let particles = [];

  function spawnEmber(cx, cy, params) {
    const { spread } = params;
    return {
      x: cx + (Math.random() - 0.5) * spread,
      y: cy + (Math.random() - 0.5) * 20,
      vx: (Math.random() - 0.5) * 1.5,
      vy: -(Math.random() * 1.5 + 0.5),
      life: 1,
      decay: 0.006 + Math.random() * 0.01,
      size: Math.random() * 3 + 1,
      twinkle: Math.random() * Math.PI * 2,
      twinkleSpeed: Math.random() * 0.08 + 0.04,
      hue: Math.random() * 40 + 15,
    };
  }

  return {
    reset() { particles = []; },
    update(ctx, canvas, params) {
      const cx = canvas.width / 2;
      const cy = canvas.height * 0.7;
      const { intensity, spread, glow, drift, opacity } = params;

      const count = Math.floor(intensity * 0.08 + Math.random() * intensity * 0.04);
      for (let i = 0; i < count; i++) {
        particles.push(spawnEmber(cx, cy, { spread, intensity }));
      }

      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx + Math.sin(p.twinkle) * drift * 0.02;
        p.y += p.vy;
        p.vx *= 0.99;
        p.vy *= 0.995;
        p.life -= p.decay;
        p.twinkle += p.twinkleSpeed;

        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        const twinkleAlpha = 0.7 + Math.sin(p.twinkle) * 0.3;
        const alpha = p.life * twinkleAlpha * (opacity / 100);
        const r = 255;
        const g = Math.floor(p.hue * 3.5);
        const b = 30;

        if (glow > 20) {
          const glowR = p.size * (glow / 40);
          const glowGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
          glowGrad.addColorStop(0, `rgba(${r},${g},${b},${alpha * 0.5})`);
          glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = glowGrad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    },
  };
}
