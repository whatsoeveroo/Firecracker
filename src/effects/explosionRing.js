export function createExplosionRingEffect() {
  let blasts = [];
  let debrisList = [];
  let cooldown = 0;

  function spawnBlast(cx, cy, params) {
    const { force, thickness, color } = params;
    blasts.push({ r: 5, life: 1, force, thickness, color });

    const debrisCount = Math.floor(force * 0.4);
    for (let i = 0; i < debrisCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 0.5 + 0.5) * force * 0.05;
      debrisList.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.015 + Math.random() * 0.02,
        size: Math.random() * 4 + 1,
        color,
      });
    }
  }

  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  }

  return {
    reset() {
      blasts = [];
      debrisList = [];
      cooldown = 0;
    },
    update(ctx, canvas, params, dt) {
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const { force, rate, shockwave } = params;

      cooldown -= dt;
      if (cooldown <= 0) {
        cooldown = Math.max(0.4, 2.5 - rate * 0.02);
        spawnBlast(cx, cy, params);
      }

      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      // blasts
      for (let i = blasts.length - 1; i >= 0; i--) {
        const blast = blasts[i];
        blast.r += force * 0.3 * dt * 60;
        blast.life -= 0.012;

        if (blast.life <= 0) {
          blasts.splice(i, 1);
          continue;
        }

        const { r, g, b } = hexToRgb(blast.color);
        const alpha = blast.life * 0.9;

        // main ring
        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.lineWidth = blast.thickness * blast.life;
        ctx.shadowColor = `rgba(${r},${g},${b},0.4)`;
        ctx.shadowBlur = 20 * blast.life;
        ctx.beginPath();
        ctx.arc(cx, cy, blast.r, 0, Math.PI * 2);
        ctx.stroke();

        // shockwave fill
        if (shockwave > 0) {
          const swAlpha = blast.life * (shockwave / 100) * 0.15;
          const swGrad = ctx.createRadialGradient(cx, cy, blast.r * 0.7, cx, cy, blast.r);
          swGrad.addColorStop(0, 'rgba(0,0,0,0)');
          swGrad.addColorStop(1, `rgba(${r},${g},${b},${swAlpha})`);
          ctx.fillStyle = swGrad;
          ctx.beginPath();
          ctx.arc(cx, cy, blast.r, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.shadowBlur = 0;
      }

      // debris
      for (let i = debrisList.length - 1; i >= 0; i--) {
        const d = debrisList[i];
        d.x += d.vx;
        d.y += d.vy;
        d.vy += 0.06;
        d.life -= d.decay;
        d.vx *= 0.97;

        if (d.life <= 0) {
          debrisList.splice(i, 1);
          continue;
        }

        const { r, g, b } = hexToRgb(d.color);
        ctx.fillStyle = `rgba(${r},${g},${b},${d.life * 0.8})`;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.size * d.life, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    },
  };
}
