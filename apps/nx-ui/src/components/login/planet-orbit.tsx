'use client';

import { useEffect, useRef } from 'react';

/**
 * PlanetOrbit — 鋼鐵星球（對齊 Hana 成品）
 *
 * 視覺：金屬球體 hex pattern + 中央 reactor core + 3 條傾斜橢圓軌道
 * 互動：
 * - 衛星沿軌道旋轉（Hana 5 參數：起始角 / 速度 / rx / ry / tilt）
 * - 滑鼠接近球體時、3 顆衛星進入「守護模式」朝滑鼠方向圍住、平滑跟隨
 * - Hex pattern 從中心向外擴散 ripple wave（6.8s cycle，對齊 Hana @keyframes hexwave）
 * - prefers-reduced-motion 停止位移與 ripple
 */
export function PlanetOrbit({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let animationId: number;

    // 衛星持久狀態（軌道相位 + 當前實際座標、跨幀平滑跟隨用）
    type SatState = { a: number; curX: number; curY: number; initialised: boolean };
    const satStates: SatState[] = [
      { a: 0.0, curX: 0, curY: 0, initialised: false },
      { a: 2.1, curX: 0, curY: 0, initialised: false },
      { a: 4.0, curX: 0, curY: 0, initialised: false },
    ];

    // 滑鼠位置（canvas-relative、未追蹤時為 null）
    let mouseX: number | null = null;
    let mouseY: number | null = null;
    let mouseInside = false;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    // 滑鼠用 window 監聽、轉 canvas-relative，這樣滑鼠在 canvas 外（但仍在登入頁）也能讓衛星感知方向
    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
      mouseInside = true;
    };
    const onPointerLeave = () => {
      mouseInside = false;
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerleave', onPointerLeave);

    const draw = () => {
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;
      const centerX = width / 2;
      const centerY = height / 2;
      // R7：以桌面 w-80 (320px) 為基準自動縮放，避免手機容器把外圈軌道截掉
      const scale = Math.min(width, height) / 320;

      ctx.clearRect(0, 0, width, height);

      // 衛星 5 參數軌道（對齊 Hana sats）
      const SATS = [
        { sp: 0.0091, rx: 130 * scale, ry: 50 * scale, tilt: (-25 * Math.PI) / 180 },
        { sp: -0.0076, rx: 155 * scale, ry: 60 * scale, tilt: (25 * Math.PI) / 180 },
        { sp: 0.0102, rx: 110 * scale, ry: 42 * scale, tilt: (60 * Math.PI) / 180 },
      ];
      const ORBIT_GEAR = [true, false, true];

      // 守護判定：滑鼠距球心 < 守護半徑（Hana = pwRect.width * 0.62）
      const planetRadius = 38 * scale;
      const guardRadius = Math.max(planetRadius * 4.2, 130 * scale);
      let guarding = false;
      let dxm = 0;
      let dym = 0;
      let dm = 0;
      if (mouseInside && mouseX !== null && mouseY !== null) {
        dxm = mouseX - centerX;
        dym = mouseY - centerY;
        dm = Math.hypot(dxm, dym);
        guarding = dm < guardRadius;
      }

      // 先畫軌道線 + gear tick（純視覺、不受守護模式影響）
      SATS.forEach((orbit, index) => {
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(orbit.tilt);

        ctx.beginPath();
        ctx.ellipse(0, 0, orbit.rx, orbit.ry, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(160, 160, 170, ${0.25 - index * 0.05})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        if (ORBIT_GEAR[index]) {
          const tickCount = 36;
          const tickInset = 3 * scale;
          for (let t = 0; t < tickCount; t++) {
            const tickAngle = (t * Math.PI * 2) / tickCount;
            const innerX = Math.cos(tickAngle) * (orbit.rx - tickInset);
            const innerY = Math.sin(tickAngle) * (orbit.ry - tickInset);
            const outerX = Math.cos(tickAngle) * (orbit.rx + tickInset);
            const outerY = Math.sin(tickAngle) * (orbit.ry + tickInset);

            ctx.beginPath();
            ctx.moveTo(innerX, innerY);
            ctx.lineTo(outerX, outerY);
            ctx.strokeStyle = `rgba(120, 120, 130, ${0.3 - index * 0.08})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }

        ctx.restore();
      });

      // 衛星 dot：用 global 座標算（不再 translate+rotate）、守護模式 = 朝滑鼠方向 + (i-1)*0.46 offset
      SATS.forEach((orbit, index) => {
        const st = satStates[index];
        if (!reduce) st.a += orbit.sp;

        // 基本軌道位置（local → global、透過 tilt 旋轉）
        const localX = Math.cos(st.a) * orbit.rx;
        const localY = Math.sin(st.a) * orbit.ry;
        const cR = Math.cos(orbit.tilt);
        const sR = Math.sin(orbit.tilt);
        const baseGX = centerX + localX * cR - localY * sR;
        const baseGY = centerY + localX * sR + localY * cR;

        // 目標位置
        let targetX: number;
        let targetY: number;
        if (guarding && mouseX !== null && mouseY !== null) {
          const ang = Math.atan2(dym, dxm) + (index - 1) * 0.46;
          const gR = Math.max(planetRadius * 1.8, Math.min(dm * 0.66, planetRadius * 3.2));
          targetX = centerX + Math.cos(ang) * gR;
          targetY = centerY + Math.sin(ang) * gR;
        } else {
          targetX = baseGX;
          targetY = baseGY;
        }

        // 第一幀直接定位、後續平滑跟隨
        if (!st.initialised) {
          st.curX = targetX;
          st.curY = targetY;
          st.initialised = true;
        } else {
          const k = guarding ? 0.16 : 0.085;
          st.curX += (targetX - st.curX) * k;
          st.curY += (targetY - st.curY) * k;
        }

        const dx = st.curX;
        const dy = st.curY;

        // 衛星外殼（金屬灰）
        ctx.beginPath();
        ctx.arc(dx, dy, 5 * scale, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(180, 180, 190, 1)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(100, 100, 110, 0.8)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 衛星核心（amber 主色）
        ctx.beginPath();
        ctx.arc(dx, dy, 2.5 * scale, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 200, 80, 0.95)';
        ctx.fill();

        // 衛星光暈（守護模式時略放大）
        const glowRadius = (guarding ? 18 : 15) * scale;
        const gradient = ctx.createRadialGradient(dx, dy, 0, dx, dy, glowRadius);
        gradient.addColorStop(0, `rgba(255, 200, 80, ${guarding ? 0.7 : 0.5})`);
        gradient.addColorStop(1, 'rgba(255, 200, 80, 0)');
        ctx.beginPath();
        ctx.arc(dx, dy, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      });
      const planetHighlightOffset = 12 * scale;

      const planetGradient = ctx.createRadialGradient(
        centerX - planetHighlightOffset,
        centerY - planetHighlightOffset,
        0,
        centerX,
        centerY,
        planetRadius
      );
      planetGradient.addColorStop(0, 'rgba(200, 200, 210, 1)');
      planetGradient.addColorStop(0.3, 'rgba(160, 160, 170, 1)');
      planetGradient.addColorStop(0.7, 'rgba(100, 100, 110, 1)');
      planetGradient.addColorStop(1, 'rgba(60, 60, 70, 1)');

      ctx.beginPath();
      ctx.arc(centerX, centerY, planetRadius, 0, Math.PI * 2);
      ctx.fillStyle = planetGradient;
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, planetRadius, 0, Math.PI * 2);
      ctx.clip();

      const bands = [-20 * scale, -8 * scale, 8 * scale, 20 * scale];
      bands.forEach((y) => {
        ctx.beginPath();
        ctx.moveTo(centerX - planetRadius, centerY + y);
        ctx.lineTo(centerX + planetRadius, centerY + y);
        ctx.strokeStyle = 'rgba(80, 80, 90, 0.6)';
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      const hexSize = 12 * scale;
      const hexEdgeInset = 5 * scale;
      // Ripple wave 參數（對齊 Hana @keyframes hexwave、cycle 6.8s、travel 1.1s）
      const RIPPLE_CYCLE_MS = 6800;
      const RIPPLE_TRAVEL_MS = 1100;
      const rippleMaxD = planetRadius - hexEdgeInset;
      const tMs = performance.now();
      for (let row = -3; row <= 3; row++) {
        for (let col = -3; col <= 3; col++) {
          const offsetX = (row % 2) * (hexSize * 0.5);
          const hx = centerX + col * hexSize + offsetX;
          const hy = centerY + row * hexSize * 0.9;
          const dist = Math.sqrt((hx - centerX) ** 2 + (hy - centerY) ** 2);

          if (dist < planetRadius - hexEdgeInset) {
            const hexHalf = hexSize * 0.4;
            const drawHex = (sc: number) => {
              ctx.beginPath();
              for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI) / 3 - Math.PI / 6;
                const px = hx + Math.cos(angle) * hexHalf * sc;
                const py = hy + Math.sin(angle) * hexHalf * sc;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
              }
              ctx.closePath();
            };

            // 1) 底層 hex 描邊（既有靜態渲染）
            drawHex(1);
            ctx.strokeStyle = `rgba(70, 70, 80, ${0.5 - dist * 0.008})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();

            // 2) Ripple 亮點（每 hex 在自己的 phase 短暫亮一下）
            if (!reduce && rippleMaxD > 0) {
              const delayMs = (dist / rippleMaxD) * RIPPLE_TRAVEL_MS;
              let phaseT = (((tMs - delayMs) % RIPPLE_CYCLE_MS) + RIPPLE_CYCLE_MS) % RIPPLE_CYCLE_MS;
              phaseT = phaseT / RIPPLE_CYCLE_MS;
              let opacity = 0;
              let rippleScale = 1;
              if (phaseT < 0.03) {
                const k = phaseT / 0.03;
                opacity = k * 0.5;
                rippleScale = 0.85 + k * 0.37;
              } else if (phaseT < 0.1) {
                const k = (phaseT - 0.03) / 0.07;
                opacity = 0.5 * (1 - k);
                rippleScale = 1.22 - k * 0.22;
              }
              if (opacity > 0.01) {
                drawHex(rippleScale);
                ctx.fillStyle = `rgba(196, 210, 228, ${opacity.toFixed(3)})`;
                ctx.fill();
              }
            }
          }
        }
      }

      const notchCount = 24;
      const notchInnerInset = 8 * scale;
      const notchOuterInset = 4 * scale;
      for (let i = 0; i < notchCount; i++) {
        const angle = (i * Math.PI * 2) / notchCount;
        const innerR = planetRadius - notchInnerInset;
        const outerR = planetRadius - notchOuterInset;
        const x1 = centerX + Math.cos(angle) * innerR;
        const y1 = centerY + Math.sin(angle) * innerR;
        const x2 = centerX + Math.cos(angle) * outerR;
        const y2 = centerY + Math.sin(angle) * outerR;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = 'rgba(50, 50, 60, 0.7)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      const coreOuter = 12 * scale;
      const coreInner = 6 * scale;
      const coreGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreOuter);
      coreGradient.addColorStop(0, 'rgba(255, 200, 80, 0.8)');
      coreGradient.addColorStop(0.5, 'rgba(255, 180, 60, 0.4)');
      coreGradient.addColorStop(1, 'rgba(255, 160, 40, 0)');

      ctx.beginPath();
      ctx.arc(centerX, centerY, coreOuter, 0, Math.PI * 2);
      ctx.fillStyle = coreGradient;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(centerX, centerY, coreInner, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 200, 80, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.restore();

      ctx.beginPath();
      ctx.arc(centerX, centerY, planetRadius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(180, 180, 190, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const glowInner = 30 * scale;
      const glowOuter = 90 * scale;
      const glowArc = 80 * scale;
      const glowGradient = ctx.createRadialGradient(centerX, centerY, glowInner, centerX, centerY, glowOuter);
      glowGradient.addColorStop(0, 'rgba(255, 200, 80, 0.15)');
      glowGradient.addColorStop(1, 'rgba(255, 200, 80, 0)');

      ctx.beginPath();
      ctx.arc(centerX, centerY, glowArc, 0, Math.PI * 2);
      ctx.fillStyle = glowGradient;
      ctx.fill();

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
      cancelAnimationFrame(animationId);
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
    const LAYERS: Layer[] = [
      { n: 300, rMin: 0.25, rMax: 0.8, depth: 5, aMin: 0.16, aMax: 0.42, glow: 0 },
      { n: 140, rMin: 0.55, rMax: 1.4, depth: 14, aMin: 0.28, aMax: 0.6, glow: 0 },
      { n: 42, rMin: 1.1, rMax: 2.3, depth: 30, aMin: 0.42, aMax: 0.82, glow: 1 },
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
      for (let i = 0; i < 18; i++) {
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
