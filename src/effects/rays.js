function hexToRgb(hex = '#ffe7a8') {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function mixChannel(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function rgba(rgb, alpha) {
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${clamp(alpha, 0, 1)})`;
}

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
  const beamSeeds = Array.from({ length: 36 }, (_, i) => {
    const seed = Math.sin((i + 1) * 31.415) * 0.5 + 0.5;
    return {
      length: 0.74 + seed * 0.34,
      width:  0.72 + (Math.sin((i + 3) * 12.989) * 0.5 + 0.5) * 0.72,
      phase:  Math.sin((i + 5) * 78.233) * Math.PI,
    };
  });

  return {
    reset() { phase = 0; motes = []; },

    update(ctx, canvas, params, dt) {
      const {
        rayCount,
        rayLength,
        angle: angleOffset,
        softness,
        opacity,
        atmosphere,
        color,
        sourceX = 50,
        sourceY = 50,
        beamWidth = 55,
        falloff = 65,
        occlusion = 35,
        drift = 35,
      } = params;

      const cx = canvas.width * (sourceX / 100);
      const cy = canvas.height * (sourceY / 100);
      phase += dt * 0.28;

      const longestDim = Math.hypot(canvas.width, canvas.height);
      const maxLen   = longestDim * (rayLength / 100) * 0.78;
      const baseAngle = (angleOffset * Math.PI) / 180;
      const opa       = opacity / 100;
      const soft      = softness / 100;
      const widthNorm = beamWidth / 100;
      const fallNorm  = falloff / 100;
      const driftNorm = drift / 100;
      const lightRgb  = hexToRgb(color);
      const warmRgb   = {
        r: mixChannel(lightRgb.r, 255, 0.52),
        g: mixChannel(lightRgb.g, 244, 0.48),
        b: mixChannel(lightRgb.b, 198, 0.42),
      };

      const atmoStrength = (atmosphere || 0) / 100;
      const targetMotes = Math.floor(atmoStrength * (70 + rayCount * 2));
      while (motes.length < targetMotes) {
        motes.push(spawnDustMote(cx, cy, maxLen));
      }
      while (motes.length > targetMotes) motes.pop();

      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      if (atmoStrength > 0) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(baseAngle * 0.18);
        ctx.scale(1.65 + atmoStrength * 0.7, 0.82 + soft * 0.5);
        const hazeR = Math.min(canvas.width, canvas.height) * (0.18 + atmoStrength * 0.22);
        const hazeGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, hazeR);
        hazeGrad.addColorStop(0,   rgba(warmRgb, atmoStrength * opa * 0.22));
        hazeGrad.addColorStop(0.5, rgba(lightRgb, atmoStrength * opa * 0.08));
        hazeGrad.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = hazeGrad;
        ctx.beginPath();
        ctx.arc(0, 0, hazeR, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      const occlusionStrength = (occlusion || 0) / 100;
      const fans = [
        { phaseSpeed: 0.04, alpha: opa * 0.82, widthMult: 1.0, lenMult: 1.0, blur: 1 },
        { phaseSpeed: 0.02, alpha: opa * 0.28, widthMult: 1.75, lenMult: 0.82, offset: Math.PI / rayCount, blur: 0.72 },
      ];

      for (const fan of fans) {
        for (let i = 0; i < rayCount; i++) {
          const seed    = beamSeeds[i % beamSeeds.length];
          const angle   = (i / rayCount) * Math.PI * 2 + baseAngle + phase * fan.phaseSpeed * driftNorm;
          const wobble  = Math.sin(phase * (0.72 + driftNorm) + seed.phase) * 0.06 * driftNorm;
          const rAngle  = angle + wobble + (fan.offset || 0);
          const halfAng = (0.012 + widthNorm * 0.15) * Math.PI * seed.width * fan.widthMult;
          const rLen    = maxLen * fan.lenMult * seed.length;
          const shadowGate = 1 - occlusionStrength * (0.25 + 0.75 * (Math.sin(i * 1.83 + phase * 0.55) * 0.5 + 0.5));
          const steps = Math.max(5, Math.round(5 + soft * 5));

          for (let s = 0; s < steps; s++) {
            const t   = s / (steps - 1);
            const off = (t - 0.5) * 2 * halfAng;
            const edgeA = rAngle + off;
            const edgeFrac = Math.pow(1 - Math.abs(off) / halfAng, 1.1 + soft);

            const x2 = cx + Math.cos(edgeA) * rLen;
            const y2 = cy + Math.sin(edgeA) * rLen;

            const grad = ctx.createLinearGradient(cx, cy, x2, y2);
            const rayAlpha = fan.alpha * edgeFrac * fan.blur * shadowGate;
            const midAlpha = rayAlpha * (0.24 + fallNorm * 0.52);
            grad.addColorStop(0,    rgba({ r: 255, g: 255, b: 245 }, rayAlpha * 0.88));
            grad.addColorStop(0.12, rgba(lightRgb, rayAlpha * 0.85));
            grad.addColorStop(0.46, rgba(warmRgb, midAlpha));
            grad.addColorStop(0.82, rgba(warmRgb, rayAlpha * 0.1 * fallNorm));
            grad.addColorStop(1,    'rgba(0,0,0,0)');

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

      if (occlusionStrength > 0.01) {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        const bandCount = 3 + Math.round(occlusionStrength * 4);
        for (let i = 0; i < bandCount; i++) {
          const shadeAngle = baseAngle + Math.PI * 0.5 + i * (Math.PI * 2 / bandCount) + phase * 0.025 * driftNorm;
          const bandLen = maxLen * (0.35 + i * 0.08);
          const bandWidth = 8 + occlusionStrength * 34;
          const x = cx + Math.cos(shadeAngle) * bandLen * 0.25;
          const y = cy + Math.sin(shadeAngle) * bandLen * 0.25;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(shadeAngle + Math.PI / 2);
          const cutGrad = ctx.createLinearGradient(-bandLen, 0, bandLen, 0);
          cutGrad.addColorStop(0, 'rgba(0,0,0,0)');
          cutGrad.addColorStop(0.45, `rgba(0,0,0,${occlusionStrength * 0.18})`);
          cutGrad.addColorStop(0.55, `rgba(0,0,0,${occlusionStrength * 0.18})`);
          cutGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = cutGrad;
          ctx.fillRect(-bandLen, -bandWidth / 2, bandLen * 2, bandWidth);
          ctx.restore();
        }
        ctx.restore();
        ctx.globalCompositeOperation = 'screen';
      }

      const cgR = Math.min(canvas.width, canvas.height) * (0.06 + soft * 0.045);
      const cGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cgR);
      cGrad.addColorStop(0,   `rgba(255,255,245,${opa})`);
      cGrad.addColorStop(0.4, rgba(lightRgb, opa * 0.58));
      cGrad.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = cGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, cgR * 1.45, 0, Math.PI * 2);
      ctx.fill();

      if (atmoStrength > 0) {
        for (let i = motes.length - 1; i >= 0; i--) {
          const m = motes[i];
          m.x    += m.vx * dt * 60 * (0.5 + driftNorm);
          m.y    += m.vy * dt * 60 * (0.5 + driftNorm);
          m.life -= m.decay;
          if (m.life <= 0) { motes[i] = spawnDustMote(cx, cy, maxLen); continue; }

          const dx = m.x - cx;
          const dy = m.y - cy;
          const distanceFade = 1 - clamp(Math.hypot(dx, dy) / maxLen, 0, 1);
          const mAlpha = m.life * atmoStrength * opa * (0.24 + distanceFade * 0.52);
          const moteSize = m.size * (1 + soft * 0.7);
          const mGrad  = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, moteSize);
          mGrad.addColorStop(0, rgba(lightRgb, mAlpha));
          mGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = mGrad;
          ctx.beginPath();
          ctx.arc(m.x, m.y, moteSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    },
  };
}
