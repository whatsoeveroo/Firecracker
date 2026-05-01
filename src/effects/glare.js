function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

export function createGlareEffect() {
  let phase = 0;

  return {
    reset() { phase = 0; },

    update(ctx, canvas, params, dt) {
      const { radius, brightness, softness, color, streakAmount, anamorphic } = params;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      phase += dt * 0.35;

      const { r, g, b } = hexToRgb(color);
      const pulse = 0.94 + Math.sin(phase) * 0.06;
      const er    = radius * pulse; // effective radius
      const bri   = brightness / 100;

      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      // ── Layer 1: wide outer atmospheric bloom ──
      const outerR = er * (1 + softness * 0.025);
      const outerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, outerR);
      outerGrad.addColorStop(0,    `rgba(${r},${g},${b},${bri * 0.18})`);
      outerGrad.addColorStop(0.35, `rgba(${r},${g},${b},${bri * 0.08})`);
      outerGrad.addColorStop(1,    'rgba(0,0,0,0)');
      ctx.fillStyle = outerGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
      ctx.fill();

      // ── Layer 2: medium colored glow ──
      const midGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, er);
      midGrad.addColorStop(0,    `rgba(255,255,255,${bri * 0.55})`);
      midGrad.addColorStop(0.12, `rgba(${r},${g},${b},${bri * 0.80})`);
      midGrad.addColorStop(0.45, `rgba(${r},${g},${b},${bri * 0.30})`);
      midGrad.addColorStop(1,    'rgba(0,0,0,0)');
      ctx.fillStyle = midGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, er, 0, Math.PI * 2);
      ctx.fill();

      // ── Layer 3: tight hot core ──
      const coreR = Math.max(4, er * 0.09);
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
      coreGrad.addColorStop(0,   `rgba(255,255,255,${bri})`);
      coreGrad.addColorStop(0.5, `rgba(${r},${g},${b},${bri * 0.6})`);
      coreGrad.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR * 2.5, 0, Math.PI * 2);
      ctx.fill();

      // ── Radial spiky streaks ──
      const numStreaks = Math.floor(streakAmount);
      if (numStreaks > 0) {
        for (let i = 0; i < numStreaks; i++) {
          const angle    = (i / numStreaks) * Math.PI * 2 + phase * 0.04;
          const wobble   = Math.sin(phase * 0.9 + i * 1.7) * 0.08;
          const sLen     = er * (1.6 + wobble);
          const sAlpha   = bri * (0.28 + Math.sin(phase * 0.6 + i) * 0.07);
          const sWidth   = Math.max(0.8, er * 0.028);

          const x2 = cx + Math.cos(angle + wobble) * sLen;
          const y2 = cy + Math.sin(angle + wobble) * sLen;

          const sg = ctx.createLinearGradient(cx, cy, x2, y2);
          sg.addColorStop(0,    `rgba(255,255,255,${sAlpha * 0.9})`);
          sg.addColorStop(0.08, `rgba(${r},${g},${b},${sAlpha})`);
          sg.addColorStop(0.5,  `rgba(${r},${g},${b},${sAlpha * 0.4})`);
          sg.addColorStop(1,    'rgba(0,0,0,0)');

          ctx.strokeStyle = sg;
          ctx.lineWidth   = sWidth;
          ctx.lineCap     = 'round';
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      }

      // ── Anamorphic lens streak (horizontal) ──
      const anaStrength = (anamorphic || 0) / 100;
      if (anaStrength > 0.01) {
        const streakLen = canvas.width * 0.95;
        // Main streak band
        for (let pass = 0; pass < 3; pass++) {
          const halfH  = Math.max(0.5, er * 0.012 * (3 - pass)) * anaStrength;
          const aAlpha = bri * anaStrength * [0.9, 0.45, 0.2][pass];

          const ag = ctx.createLinearGradient(cx - streakLen / 2, cy, cx + streakLen / 2, cy);
          ag.addColorStop(0,    'rgba(0,0,0,0)');
          ag.addColorStop(0.28, `rgba(${r},${g},${b},${aAlpha * 0.25})`);
          ag.addColorStop(0.44, `rgba(${r},${g},${b},${aAlpha * 0.85})`);
          ag.addColorStop(0.5,  `rgba(255,255,255,${aAlpha})`);
          ag.addColorStop(0.56, `rgba(${r},${g},${b},${aAlpha * 0.85})`);
          ag.addColorStop(0.72, `rgba(${r},${g},${b},${aAlpha * 0.25})`);
          ag.addColorStop(1,    'rgba(0,0,0,0)');

          ctx.fillStyle = ag;
          ctx.fillRect(cx - streakLen / 2, cy - halfH, streakLen, halfH * 2);
        }

        // Chromatic aberration: slight R/B separation on streak edges
        const caOffset = er * 0.015 * anaStrength;
        const caAlpha  = bri * anaStrength * 0.12;
        const caLen    = streakLen * 0.6;

        // Red channel — shifted up
        const rg = ctx.createLinearGradient(cx - caLen / 2, cy - caOffset, cx + caLen / 2, cy - caOffset);
        rg.addColorStop(0, 'rgba(0,0,0,0)');
        rg.addColorStop(0.4, `rgba(255,40,40,${caAlpha})`);
        rg.addColorStop(0.6, `rgba(255,40,40,${caAlpha})`);
        rg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rg;
        ctx.fillRect(cx - caLen / 2, cy - caOffset - 0.5, caLen, 1);

        // Blue channel — shifted down
        const bg2 = ctx.createLinearGradient(cx - caLen / 2, cy + caOffset, cx + caLen / 2, cy + caOffset);
        bg2.addColorStop(0, 'rgba(0,0,0,0)');
        bg2.addColorStop(0.4, `rgba(40,80,255,${caAlpha})`);
        bg2.addColorStop(0.6, `rgba(40,80,255,${caAlpha})`);
        bg2.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = bg2;
        ctx.fillRect(cx - caLen / 2, cy + caOffset - 0.5, caLen, 1);
      }

      ctx.restore();
    },
  };
}
