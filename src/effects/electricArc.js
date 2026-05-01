export function createElectricArcEffect() {
  let bolts = [];
  let phase = 0;
  let boltTimer = 0;

  function generateBolt(x1, y1, x2, y2, roughness, depth) {
    if (depth === 0) return [{ x: x1, y: y1 }, { x: x2, y: y2 }];
    const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * roughness;
    const my = (y1 + y2) / 2 + (Math.random() - 0.5) * roughness;
    return [
      ...generateBolt(x1, y1, mx, my, roughness / 2, depth - 1),
      ...generateBolt(mx, my, x2, y2, roughness / 2, depth - 1).slice(1),
    ];
  }

  function spawnBolt(cx, cy, params) {
    const { reach, branches } = params;
    const angle = Math.random() * Math.PI * 2;
    const dist = reach * (0.4 + Math.random() * 0.6);
    const x2 = cx + Math.cos(angle) * dist;
    const y2 = cy + Math.sin(angle) * dist;
    const points = generateBolt(cx, cy, x2, y2, reach * 0.3, 5);

    const subBolts = [];
    if (branches > 1) {
      const branchCount = Math.floor(Math.random() * branches * 0.4) + 1;
      for (let b = 0; b < branchCount; b++) {
        const idx = Math.floor(points.length * (0.2 + Math.random() * 0.5));
        const sp = points[idx];
        const ba = angle + (Math.random() - 0.5) * Math.PI;
        const bd = dist * (0.2 + Math.random() * 0.4);
        const bx2 = sp.x + Math.cos(ba) * bd;
        const by2 = sp.y + Math.sin(ba) * bd;
        subBolts.push(generateBolt(sp.x, sp.y, bx2, by2, reach * 0.15, 4));
      }
    }

    return { points, subBolts, life: 1, decay: 0.08 + Math.random() * 0.08 };
  }

  return {
    reset() {
      bolts = [];
      phase = 0;
      boltTimer = 0;
    },
    update(ctx, canvas, params, dt) {
      const { intensity, color, reach, flicker } = params;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      phase += dt;

      boltTimer += dt;
      const interval = Math.max(0.05, 0.3 - intensity * 0.002);
      if (boltTimer > interval) {
        boltTimer = 0;
        const count = Math.ceil(intensity * 0.05);
        for (let i = 0; i < count; i++) {
          bolts.push(spawnBolt(cx, cy, params));
        }
      }

      function hexToRgb(hex) {
        return {
          r: parseInt(hex.slice(1, 3), 16),
          g: parseInt(hex.slice(3, 5), 16),
          b: parseInt(hex.slice(5, 7), 16),
        };
      }

      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      const { r, g, b } = hexToRgb(color);

      for (let i = bolts.length - 1; i >= 0; i--) {
        const bolt = bolts[i];
        bolt.life -= bolt.decay;
        if (bolt.life <= 0) { bolts.splice(i, 1); continue; }

        const flickerAlpha = bolt.life * (flicker > 50 ? (0.5 + Math.random() * 0.5) : 1);

        function drawPath(points, width, alpha) {
          if (points.length < 2) return;
          ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
          ctx.lineWidth = width;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.shadowColor = `rgba(${r},${g},${b},${alpha * 0.5})`;
          ctx.shadowBlur = width * 4;
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          for (let j = 1; j < points.length; j++) {
            ctx.lineTo(points[j].x, points[j].y);
          }
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        drawPath(bolt.points, 2.5, flickerAlpha * 0.9);
        drawPath(bolt.points, 1, Math.min(1, flickerAlpha * 1.2));

        bolt.subBolts.forEach(sub => {
          drawPath(sub, 1.2, flickerAlpha * 0.5);
        });
      }

      // center glow
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 25);
      coreGrad.addColorStop(0, `rgba(255,255,255,${intensity / 100})`);
      coreGrad.addColorStop(0.4, `rgba(${r},${g},${b},${(intensity / 100) * 0.6})`);
      coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 25, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    },
  };
}
