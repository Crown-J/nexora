'use client';

import { useEffect, useRef } from 'react';

/**
 * ParticleField — 全螢幕多層星空（對齊 Hana 成品 system-engine.js）
 *
 * 三層星：300 顆遠景（無 glow）+ 140 顆中景 + 42 顆近景（帶 glow）= 482 顆
 * 18 個有色 sprite（綠 / 藍 / 金、'lighter' 混合）+ 流星（每 9~17s 隨機）
 * 滑鼠視差：每層按 depth 偏移、近景動最多
 * prefers-reduced-motion：停止位移與閃爍、保留靜態星圖
 */
export function ParticleField({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    type Layer = { n: number; rMin: number; rMax: number; depth: number; aMin: number; aMax: number; glow: 0 | 1 };
    // 加密 50%（執行長 2026-06-15 微調：太空、提密度與層次）
    const LAYERS: Layer[] = [
      { n: 480, rMin: 0.25, rMax: 0.8, depth: 5, aMin: 0.2, aMax: 0.5, glow: 0 },
      { n: 220, rMin: 0.55, rMax: 1.4, depth: 14, aMin: 0.32, aMax: 0.68, glow: 0 },
      { n: 70, rMin: 1.1, rMax: 2.3, depth: 30, aMin: 0.48, aMax: 0.9, glow: 1 },
    ];
    const TINTS = ['225,242,240', '220,238,238', '236,240,246', '190,250,236', '150,230,255', '198,172,255'];

    type Star = { li: number; x: number; y: number; r: number; a: number; tw: number; ph: number; drift: number; col: string };
    type Sprite = { x: number; y: number; r: number; sp: number; wob: number; wf: number; wa: number; tw: number; ph: number; depth: number; hue: string };
    type Shoot = { x: number; y: number; vx: number; vy: number; life: number; max: number };

    let W = 0;
    let H = 0;
    let stars: Star[] = [];
    let sprites: Sprite[] = [];
    let shoot: Shoot | null = null;
    let nextShoot = performance.now() + 7000;
    let tx = 0;
    let ty = 0;
    let mx = 0;
    let my = 0;
    let animationId = 0;

    const buildStars = () => {
      stars = [];
      LAYERS.forEach((L, li) => {
        for (let i = 0; i < L.n; i++) {
          stars.push({
            li,
            x: Math.random(),
            y: Math.random(),
            r: L.rMin + Math.random() * (L.rMax - L.rMin),
            a: L.aMin + Math.random() * (L.aMax - L.aMin),
            tw: 0.4 + Math.random() * 1.5,
            ph: Math.random() * 6.283,
            drift: (Math.random() * 0.5 + 0.15) * (Math.random() < 0.5 ? -1 : 1),
            col: TINTS[(Math.random() * TINTS.length) | 0],
          });
        }
      });
    };

    const buildSprites = () => {
      sprites = [];
      for (let i = 0; i < 28; i++) {
        sprites.push({
          x: Math.random(),
          y: Math.random(),
          r: 2.6 + Math.random() * 4.4,
          sp: 0.004 + Math.random() * 0.012,
          wob: Math.random() * 6.283,
          wf: 0.25 + Math.random() * 0.55,
          wa: 0.008 + Math.random() * 0.02,
          tw: 0.5 + Math.random() * 1.1,
          ph: Math.random() * 6.283,
          depth: 8 + Math.random() * 22,
          hue: Math.random() < 0.74 ? '120,240,224' : Math.random() < 0.5 ? '150,228,255' : '255,212,120',
        });
      }
    };

    const resize = () => {
      W = canvas.width = Math.floor(canvas.offsetWidth * DPR);
      H = canvas.height = Math.floor(canvas.offsetHeight * DPR);
    };

    const onPointerMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const onPointerLeave = () => {
      tx = 0;
      ty = 0;
    };

    const maybeShoot = (t: number) => {
      if (!shoot && t > nextShoot) {
        const fromLeft = Math.random() < 0.5;
        shoot = {
          x: (fromLeft ? 0.05 : 0.95) * W,
          y: (0.08 + Math.random() * 0.28) * H,
          vx: (fromLeft ? 1 : -1) * (5 + Math.random() * 4) * DPR,
          vy: (1.6 + Math.random() * 1.6) * DPR,
          life: 0,
          max: 70 + Math.random() * 30,
        };
        nextShoot = t + 9000 + Math.random() * 8000;
      }
    };

    const frame = (t: number) => {
      const w = Math.floor(canvas.offsetWidth * DPR);
      const h = Math.floor(canvas.offsetHeight * DPR);
      if (w !== W || h !== H) resize();
      if (W === 0 || H === 0) {
        animationId = requestAnimationFrame(frame);
        return;
      }
      mx += (tx - mx) * 0.055;
      my += (ty - my) * 0.055;
      const ts = t * 0.001;

      ctx.clearRect(0, 0, W, H);

      // 頂部極光色帶（對齊 Hana background：左上青 #28c8b4 + 右上紫 #7854c8 + 中上金 #a07420）
      const drawAurora = (cxR: number, cyR: number, alpha: number, col: readonly [number, number, number]) => {
        const r = Math.min(W, H) * 0.7;
        const g = ctx.createRadialGradient(W * cxR, H * cyR, 0, W * cxR, H * cyR, r);
        g.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${alpha})`);
        g.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      };
      drawAurora(0.18, 0, 0.12, [40, 200, 180]);
      drawAurora(0.82, 0, 0.14, [120, 84, 200]);
      drawAurora(0.5, 0, 0.12, [160, 116, 32]);

      for (const s of stars) {
        const L = LAYERS[s.li];
        const px = (((s.x + (reduce ? 0 : ts * s.drift * 0.003)) % 1) + 1) % 1 * W + mx * L.depth * DPR;
        const py = s.y * H + my * L.depth * DPR;
        const a = s.a * (reduce ? 1 : 0.55 + 0.45 * Math.sin(ts * s.tw + s.ph));
        if (L.glow) {
          ctx.shadowBlur = 7 * DPR;
          ctx.shadowColor = `rgba(${s.col},.85)`;
        } else {
          ctx.shadowBlur = 0;
        }
        ctx.fillStyle = `rgba(${s.col},${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(px, py, s.r * DPR, 0, 6.283);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      ctx.globalCompositeOperation = 'lighter';
      for (const s of sprites) {
        if (!reduce) {
          s.y -= s.sp * 0.016;
          if (s.y < -0.06) {
            s.y = 1.06;
            s.x = Math.random();
          }
        }
        const gx = (((s.x + Math.sin(ts * s.wf + s.wob) * s.wa) % 1) + 1) % 1 * W + mx * s.depth * DPR;
        const gy = s.y * H + my * s.depth * DPR;
        const pulse = 0.5 + 0.5 * Math.sin(ts * s.tw + s.ph);
        const rr = s.r * DPR * (1 + 0.14 * Math.sin(ts * s.tw + s.ph));
        const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, rr * 4.2);
        g.addColorStop(0, `rgba(${s.hue},${(0.8 * pulse).toFixed(3)})`);
        g.addColorStop(0.32, `rgba(${s.hue},${(0.28 * pulse).toFixed(3)})`);
        g.addColorStop(1, `rgba(${s.hue},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(gx, gy, rr * 4.2, 0, 6.283);
        ctx.fill();
        ctx.fillStyle = `rgba(${s.hue},${(0.9 * pulse).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(gx, gy, rr * 0.5, 0, 6.283);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';

      if (!reduce) maybeShoot(t);
      if (shoot) {
        shoot.life++;
        shoot.x += shoot.vx;
        shoot.y += shoot.vy;
        const k = 1 - shoot.life / shoot.max;
        const x2 = shoot.x - shoot.vx * 8;
        const y2 = shoot.y - shoot.vy * 8;
        const g = ctx.createLinearGradient(x2, y2, shoot.x, shoot.y);
        g.addColorStop(0, 'rgba(255,236,198,0)');
        g.addColorStop(1, `rgba(255,244,214,${(0.6 * k).toFixed(3)})`);
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.5 * DPR;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(shoot.x, shoot.y);
        ctx.stroke();
        if (shoot.life >= shoot.max) shoot = null;
      }

      animationId = requestAnimationFrame(frame);
    };

    resize();
    buildStars();
    buildSprites();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerleave', onPointerLeave);
    animationId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: '100%', height: '100%' }}
    />
  );
}
