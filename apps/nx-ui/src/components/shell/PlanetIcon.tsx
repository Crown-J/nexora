// apps/nx-ui/src/components/shell/PlanetIcon.tsx
// NX00 TopBar 小星球（dock 觸發按鈕用、對齊 Hana 登入畫面大星球的縮小版）
// 含動畫：
//  - hex 紋理層 140s 自轉（animateTransform）
//  - reactor core 3.8s 呼吸（r 跳動）
//  - core halo 3.8s opacity 起伏
//  - hex ripple wave 用 CSS @keyframes hexwave 6.8s（client mount 後 inject、避免 SSR hydration）
// 對齊：Hana NEXORA 系統.html 行 471-519（SVG 星球）+ 行 387-388（hexwave keyframes）

'use client';

import { useEffect, useId, useRef, useState } from 'react';

type Props = {
  size?: number;
};

export function PlanetIcon({ size = 46 }: Props) {
  // useId 避免同頁多個 PlanetIcon 的 gradient/pattern id 撞名
  const id = useId().replace(/[:#]/g, '');
  const M = `m_${id}`;
  const S = `s_${id}`;
  const C = `c_${id}`;
  const CH = `ch_${id}`;
  const FA = `fa_${id}`;
  const HF = `hf_${id}`;
  const RG = `rg_${id}`;
  const CP = `cp_${id}`;
  const layerRef = useRef<SVGGElement>(null);
  // SSR 無 window、第一次 render 給 false（含動畫）、client mount 後 lazy initializer 跑出真實值
  const [reduce] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  // hex ripple wave：在 mount 後逐 hex cell 注入 <circle> + CSS animation
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer || reduce) return;
    const NS = 'http://www.w3.org/2000/svg';
    const cx = 100;
    const cy = 100;
    const R = 94;
    const maxD = 95;
    const cycle = 6.8;
    const travel = 1.1;
    const vstep = 11.5;
    const created: SVGCircleElement[] = [];
    for (let row = -1; row < 20; row++) {
      const y = 5.75 + row * vstep;
      if (y < -6 || y > 206) continue;
      const even = (((row % 2) + 2) % 2) === 0;
      for (let i = -1; i < 12; i++) {
        const x = (even ? 10 : 0) + i * 20;
        if (x < -6 || x > 206) continue;
        const d = Math.hypot(x - cx, y - cy);
        if (d > R) continue;
        const c = document.createElementNS(NS, 'circle');
        c.setAttribute('cx', String(x));
        c.setAttribute('cy', String(y));
        c.setAttribute('r', '5');
        c.setAttribute('class', 'nx-planet-hexcell');
        c.style.animation = `nx-planet-hexwave ${cycle}s linear infinite`;
        c.style.animationDelay = `${((d / maxD) * travel).toFixed(2)}s`;
        layer.appendChild(c);
        created.push(c);
      }
    }
    return () => {
      created.forEach((el) => el.remove());
    };
  }, [reduce]);

  return (
    <>
      {/* 全域 keyframes 注入一次（多個 PlanetIcon 共用）*/}
      <style>{`
        @keyframes nx-planet-hexwave {
          0%, 100% { opacity: 0; transform: scale(.85); }
          3%       { opacity: .5; transform: scale(1.22); }
          10%      { opacity: 0; transform: scale(1); }
        }
        @keyframes nx-planet-core-breath {
          0%, 100% { opacity: .55; }
          50%      { opacity: .95; }
        }
        .nx-planet-hexcell {
          transform-box: fill-box;
          transform-origin: center;
          fill: #c4d2e4;
          opacity: 0;
          filter: drop-shadow(0 0 1.5px rgba(200,220,248,.7));
        }
      `}</style>
      <svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block' }}
      >
        <defs>
          <radialGradient id={M} cx="38%" cy="33%" r="64%">
            <stop offset="0" stopColor="#d6dbe3" />
            <stop offset=".34" stopColor="#9aa0ab" />
            <stop offset=".62" stopColor="#5e646e" />
            <stop offset=".86" stopColor="#363c45" />
            <stop offset="1" stopColor="#242a33" />
          </radialGradient>
          <radialGradient id={S} cx="38%" cy="33%" r="66%">
            <stop offset=".5" stopColor="rgba(0,0,0,0)" />
            <stop offset=".88" stopColor="rgba(8,10,14,.26)" />
            <stop offset="1" stopColor="rgba(8,10,14,.5)" />
          </radialGradient>
          <radialGradient id={C} cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#fff8e6" />
            <stop offset=".34" stopColor="#ffd368" />
            <stop offset=".68" stopColor="#f4a92a" />
            <stop offset="1" stopColor="rgba(180,110,10,0)" />
          </radialGradient>
          <radialGradient id={CH} cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="rgba(255,210,110,.6)" />
            <stop offset="1" stopColor="rgba(244,170,40,0)" />
          </radialGradient>
          <radialGradient id={FA} cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#fff" />
            <stop offset=".62" stopColor="#fff" />
            <stop offset=".92" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
          <mask id={HF}>
            <circle cx="100" cy="100" r="100" fill={`url(#${FA})`} />
          </mask>
          <pattern id={RG} width="20" height="23" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="#c4cad4" strokeWidth="1.1">
              <circle cx="10" cy="5.75" r="6" />
              <circle cx="0" cy="17.25" r="6" />
              <circle cx="20" cy="17.25" r="6" />
              <circle cx="10" cy="28.75" r="6" />
            </g>
          </pattern>
          <clipPath id={CP}>
            <circle cx="100" cy="100" r="99" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${CP})`}>
          {/* 金屬球體 */}
          <circle cx="100" cy="100" r="99" fill={`url(#${M})`} />
          {/* hex 紋理層：140s 自轉 */}
          <g mask={`url(#${HF})`} opacity=".5">
            <rect x="0" y="0" width="200" height="200" fill={`url(#${RG})`} />
            {!reduce && (
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 100 100"
                to="360 100 100"
                dur="140s"
                repeatCount="indefinite"
              />
            )}
          </g>
          {/* 陰影層 */}
          <circle cx="100" cy="100" r="99" fill={`url(#${S})`} />
          {/* hex ripple wave 動態注入層 */}
          <g ref={layerRef} />
          {/* core halo：3.8s opacity 呼吸 */}
          <circle cx="100" cy="100" r="42" fill={`url(#${CH})`}>
            {!reduce && (
              <animate
                attributeName="opacity"
                values=".55;.95;.55"
                dur="3.8s"
                repeatCount="indefinite"
              />
            )}
          </circle>
          {/* reactor core：3.8s 半徑跳動 */}
          <circle cx="100" cy="100" r="15" fill={`url(#${C})`}>
            {!reduce && (
              <animate
                attributeName="r"
                values="13;17;13"
                dur="3.8s"
                repeatCount="indefinite"
              />
            )}
          </circle>
          {/* 核心光點 */}
          <circle cx="100" cy="100" r="5.5" fill="#fff8e6" />
        </g>
        {/* 邊緣金光圈 */}
        <circle cx="100" cy="100" r="98" fill="none" stroke="rgba(255,222,150,.32)" strokeWidth="1.4" />
      </svg>
    </>
  );
}
