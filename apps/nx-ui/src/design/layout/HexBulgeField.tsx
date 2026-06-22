// apps/nx-ui/src/design/layout/HexBulgeField.tsx
// 淺色版背景互動：原 snowflake 紋理「會凸起來」的版本
// - canvas 取代 NxAppBackdrop 的 CSS background-image url()、形狀/間距/顏色完全相同
// - 滑鼠靠近時、半徑內個別 snowflake 放大 + 增亮、其他保持原本 alpha 0.09
// - tile 52×91、SVG path 從 28×49 viewBox 拉 ×1.857（跟原 CSS url() 規格一致）
// - 與 ParticleField 互斥：深色用粒子、淺色用本層（NxAppBackdrop 已條件 render）

'use client';

import { useEffect, useRef } from 'react';

// 原 NxAppBackdrop SVG url() 內那個 snowflake / 編織六角的 path（28×49 viewBox 內）
const PATTERN_PATH =
  'M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5H28v2.31h-.01L17 42.15V49h-2z';

// 對齊原 LIGHT_BG_SIZE = '52px 91px' (NxAppBackdrop)
const TILE_W = 52;
const TILE_H = 91;
// 原 SVG viewBox 28×49、tile 是 52×91、所以縮放 ×1.857
const PATH_SCALE = TILE_W / 28; // ≈ 1.857

// 影響半徑 + 變色參數
// 設計：snowflake 形狀 / 大小 / 位置全不變、只在滑鼠半徑內改顏色（灰藍 → 淡橘）+ 增亮
const INFLUENCE = 120; // 滑鼠影響半徑 px
const BASE_ALPHA = 0.09; // 跟原 CSS url() fill-opacity='0.09' 一致
const PEAK_ALPHA = 0.4; // 滑鼠中心透明度上限
// 色票：遠處灰藍 #7d8aa0 = rgb(125,138,160)、近處淡橘 #ffb874 = rgb(255,184,116)
const FAR_R = 125, FAR_G = 138, FAR_B = 160;
const NEAR_R = 255, NEAR_G = 184, NEAR_B = 116;

type Cell = { cx: number; cy: number };

export function HexBulgeField({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const ctx2d = canvasEl.getContext('2d');
    if (!ctx2d) return;
    // 提早 capture non-null
    const canvas: HTMLCanvasElement = canvasEl;
    const ctx: CanvasRenderingContext2D = ctx2d;
    const path = new Path2D(PATTERN_PATH);

    let cells: Cell[] = [];
    let mouseX = -9999;
    let mouseY = -9999;
    let dpr = 1;
    let cssW = 0;
    let cssH = 0;
    let rafId = 0;

    function buildGrid() {
      dpr = window.devicePixelRatio || 1;
      cssW = window.innerWidth;
      cssH = window.innerHeight;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // 每 tile 中心點記錄（用來算滑鼠距離）
      cells = [];
      const cols = Math.ceil(cssW / TILE_W) + 2;
      const rows = Math.ceil(cssH / TILE_H) + 2;
      for (let row = -1; row < rows; row++) {
        for (let col = -1; col < cols; col++) {
          cells.push({
            cx: col * TILE_W + TILE_W / 2,
            cy: row * TILE_H + TILE_H / 2,
          });
        }
      }
    }

    function draw() {
      ctx.clearRect(0, 0, cssW, cssH);
      const R2 = INFLUENCE * INFLUENCE;

      // 單純色票 lerp、形狀 / 位置 / 大小都不動
      // 遠處：灰藍 alpha 0.09（跟原本 CSS url() 一致）
      // 近處：淡橘 alpha 0.75（用 smoothstep 平滑漸變）
      for (const c of cells) {
        const dx = c.cx - mouseX;
        const dy = c.cy - mouseY;
        const d2 = dx * dx + dy * dy;

        let r = FAR_R;
        let g = FAR_G;
        let b = FAR_B;
        let alpha = BASE_ALPHA;

        if (d2 < R2) {
          const t = 1 - Math.sqrt(d2) / INFLUENCE;
          const eased = t * t * (3 - 2 * t); // smoothstep
          r = FAR_R + (NEAR_R - FAR_R) * eased;
          g = FAR_G + (NEAR_G - FAR_G) * eased;
          b = FAR_B + (NEAR_B - FAR_B) * eased;
          alpha = BASE_ALPHA + (PEAK_ALPHA - BASE_ALPHA) * eased;
        }

        ctx.save();
        ctx.translate(c.cx, c.cy);
        ctx.scale(PATH_SCALE, PATH_SCALE);
        ctx.translate(-14, -24.5);
        ctx.fillStyle = `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha.toFixed(3)})`;
        ctx.fill(path);
        ctx.restore();
      }

      rafId = requestAnimationFrame(draw);
    }

    function onPointerMove(e: PointerEvent) {
      mouseX = e.clientX;
      mouseY = e.clientY;
    }
    function onPointerLeave() {
      mouseX = -9999;
      mouseY = -9999;
    }
    function onResize() {
      buildGrid();
    }

    buildGrid();
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('resize', onResize);
    rafId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={className}
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}
    />
  );
}
