function spawnDustMote(cx, cy, maxLen) {
  const angle = Math.random() * Math.PI * 2;
  const dist  = Math.random() * maxLen * 0.8;
  return {
    x: cx + Math.cos(angle) * dist,
    y: cy + Math.sin(angle) * dist,
    vx: (Math.random() - 0.5) * 0.3,
    vy: -(0.05 + Math.random() * 0.15),
    life: Math.random(),
    decay: 0.003 + Math.random() * 0.004,
    size: 0.8 + Math.random() * 1.6,
  };
}

export function createRaysEffect() {
  let phase = 0;
  let motes  = [];

  return {
    reset() { phase = 0; motes = []; },

    update(ctx, canvas, params, dt) {
      const { rayCount, rayLength, angle: angleOffset, softness, opacity, atmosphere } = params;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      phase += dt * 0.28;

      const maxLen   = Math.min(canvas.width, canvas.height) * (rayLength / 100) * 0.88;
      const baseAngle = (angleOffset * Math.PI) / 180;
      const opa       = opacity / 100;

      // Seed dust motes
      const atmoStrength = (atmosphere || 0) / 100;
      while (motes.length < Math.floor(atmoStrength * 60)) {
        motes.push(spawnDustMote(cx, cy, maxLen));
      }

      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      // ── Atmospheric background haze (near center) ──
      if (atmoStrength > 0) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(1.6, 1.0); // wide horizontal haze band
        const hazeR = 90 + atmoStrength * 80;
        const hazeGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, hazeR);
        hazeGrad.addColorStop(0,   `rgba(255,245,210,${atmoStrength * 0.18})`);
        hazeGrad.addColorStop(0.5, `rgba(255,220,150,${atmoStrength * 0.07})`);
        hazeGrad.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = hazeGrad;
        ctx.beginPath();
        ctx.arc(0, 0, hazeR, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // ── Ray wedges: draw two fans (primary + faint secondary) ──
      const fans = [
        { phaseSpeed: 0.04, alpha: opa * 0.80, widthMult: 1.0, lenMult: 1.0 },
        { phaseSpeed: 0.02, alpha: opa * 0.25, widthMult: 1.6, lenMult: 0.75, offset: Math.PI / rayCount },
      ];

      for (const fan of fans) {
        for (let i = 0; i < rayCount; i++) {
          const angle   = (i / rayCount) * Math.PI * 2 + baseAngle + phase * fan.phaseSpeed;
          const wobble  = Math.sin(phase * 1.05 + i * 2.4) * 0.04;
          const rAngle  = angle + wobble + (fan.offset || 0);

          // Wedge half-angle: wider with lower softness
          const halfAng = Math.max(0.008, (1 - softness / 100) * 0.09) * Math.PI * fan.widthMult;
          const rLen    = maxLen * fan.lenMult;

          // Three sub-wedges per ray for soft falloff
          const steps = 5;
          for (let s = 0; s < steps; s++) {
            const t   = s / (steps - 1); // 0=center, 1=edge
            const off = (t - 0.5) * 2 * halfAng;
            const edgeA = rAngle + off;
            const edgeFrac = 1 - Math.abs(off) / halfAng;

            const x2 = cx + Math.cos(edgeA) * rLen;
            const y2 = cy + Math.sin(edgeA) * rLen;

            const grad = ctx.createLinearGradient(cx, cy, x2, y2);
            const rayAlpha = fan.alpha * edgeFrac * edgeFrac;
            grad.addColorStop(0,    `rgba(255,252,220,${Math.min(1, rayAlpha)})`);
            grad.addColorStop(0.15, `rgba(255,230,160,${rayAlpha * 0.85})`);
            grad.addColorStop(0.5,  `rgba(255,200,100,${rayAlpha * 0.40})`);
            grad.addColorStop(1,    'rgba(255,150,60,0)');

            // Wedge: tiny triangle slice
            const prevA = rAngle + off - halfAng / steps;
            const px1   = cx + Math.cos(prevA) * rLen;
            const py1   = cy + Math.sin(prevA) * rLen;

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(px1, py1);
            ctx.lineTo(x2, y2);
            ctx.closePath();
            ctx.fill();
          }
        }
      }

      // ── Center glow ──
      const cgR = 55;
      const cGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cgR);
      cGrad.addColorStop(0,   `rgba(255,255,230,${opa})`);
      cGrad.addColorStop(0.4, `rgba(255,220,140,${opa * 0.5})`);
      cGrad.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = cGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, cgR, 0, Math.PI * 2);
      ctx.fill();

      // ── Dust motes floating in ray volume ──
      if (atmoStrength > 0) {
        for (let i = motes.length - 1; i >= 0; i--) {
          const m = motes[i];
          m.x    += m.vx * dt * 60;
          m.y    += m.vy * dt * 60;
          m.life -= m.decay;
          if (m.life <= 0) { motes[i] = spawnDustMote(cx, cy, maxLen); continue; }

          const mAlpha = m.life * atmoStrength * opa * 0.6;
          const mGrad  = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.size);
          mGrad.addColorStop(0, `rgba(255,245,210,${mAlpha})`);
          mGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = mGrad;
          ctx.beginPath();
          ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    },
  };
}
