// apps/nx-ui/src/features/shared-planet/SharedPlanetRoot.tsx
// NX00 共享星球（單一 #planetWrap 在 login 與 TopBar 兩位置間飛行）
// 對齊 Hana 規格 (轉場與星球規格.html § Planet)：
// - 一顆星球、兩個位置：position fixed 440×440、z-60、不論在哪頁都浮在最上層
// - PlanetSlot 在 login / TopBar 各放佔位、SharedPlanet 用 transform 飛到 slot rect 中心
// - 常駐動畫：halo 5.6s 呼吸 / reactor 3.8s 呼吸 / 環紋 140s 自轉 / hexwave 6.8s 距離延遲漣漪
// - 飛行：雙段轉場 — 先飛中央放大 1.12（0.8s）→ 800ms 後縮進 TopBar slot（0.95s）

'use client';

import {
  createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';

// 支援同 id 多 element（LoginPage mobile + desktop 兩處都用 login slot、依 viewport 顯示一個）
type SlotMap = Record<string, HTMLElement[]>;
type PlanetMode = 'idle' | 'flight';
type CurrentSlot = 'login' | 'topbar';

// 三顆守護衛星（對齊 Hana 規格 §Planet 衛星段、Hana NEXORA 系統.html sats）
type Sat = { a: number; sp: number; rx: number; ry: number; tilt: number };
const SATS: Sat[] = [
  { a: 0.0, sp: 0.55, rx: 0.66, ry: 0.30, tilt: (18 * Math.PI) / 180 },
  { a: 2.1, sp: -0.46, rx: 0.66, ry: 0.30, tilt: (78 * Math.PI) / 180 },
  { a: 4.0, sp: 0.62, rx: 0.66, ry: 0.30, tilt: (132 * Math.PI) / 180 },
];

function Satellites({ active, planetRef }: { active: boolean; planetRef: React.RefObject<HTMLDivElement | null> }) {
  const r0 = useRef<HTMLDivElement>(null);
  const r1 = useRef<HTMLDivElement>(null);
  const r2 = useRef<HTMLDivElement>(null);
  const refs = [r0, r1, r2];

  useEffect(() => {
    if (!active || typeof window === 'undefined') {
      refs.forEach((r) => {
        if (r.current) r.current.style.opacity = '0';
      });
      return;
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const sats: Sat[] = SATS.map((s) => ({ ...s }));
    // 衛星跨幀位置（unscaled planet 內座標、平滑跟隨）
    const satPos = [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }];
    // 滑鼠狀態（viewport 座標）
    let mX = -9999;
    let mY = -9999;
    let mActive = false;
    const onPointerMove = (e: PointerEvent) => {
      mX = e.clientX;
      mY = e.clientY;
      mActive = true;
    };
    const onPointerLeave = () => { mActive = false; };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerleave', onPointerLeave);

    let last = performance.now();
    let raf = 0;
    const H = 220; // half BASE 440
    const BASE_W = 440;
    const step = (t: number) => {
      let dt = (t - last) / 1000;
      last = t;
      if (dt < 0 || dt > 0.1) dt = 0.016;

      // 滑鼠 → planet 內座標（除 planet scale 才能對齊 unscaled satdot translate）
      const planetRect = planetRef.current?.getBoundingClientRect();
      let dxm = 0;
      let dym = 0;
      let dm = 0;
      let guarding = false;
      if (planetRect && planetRect.width > 1 && mActive) {
        const cx = planetRect.left + planetRect.width / 2;
        const cy = planetRect.top + planetRect.height / 2;
        const planetScale = planetRect.width / BASE_W;
        dxm = (mX - cx) / planetScale;
        dym = (mY - cy) / planetScale;
        dm = Math.hypot(dxm, dym);
        guarding = dm < BASE_W * 0.62;
      }

      sats.forEach((s, i) => {
        if (!reduce) s.a += s.sp * dt;
        // 基本軌道位置（unscaled、含 tilt 旋轉）
        const ox = Math.cos(s.a) * s.rx * H;
        const oy = Math.sin(s.a) * s.ry * H;
        const ct = Math.cos(s.tilt);
        const st = Math.sin(s.tilt);
        const bx = ox * ct - oy * st;
        const by = ox * st + oy * ct;

        // 守護模式：聚到游標那一側
        let tX: number;
        let tY: number;
        if (guarding) {
          const ang = Math.atan2(dym, dxm) + (i - 1) * 0.46;
          const gR = Math.max(H * 0.62, Math.min(dm * 0.66, H * 1.02));
          tX = Math.cos(ang) * gR;
          tY = Math.sin(ang) * gR;
        } else {
          tX = bx;
          tY = by;
        }

        // 平滑跟隨（守護模式更快）
        const k = guarding ? 0.16 : 0.085;
        satPos[i].x += (tX - satPos[i].x) * k;
        satPos[i].y += (tY - satPos[i].y) * k;

        const depth = Math.sin(s.a);
        const sc = guarding ? 1.16 : (0.8 + 0.32 * (depth * 0.5 + 0.5));
        const op = guarding ? 1 : (0.55 + 0.45 * (depth * 0.5 + 0.5));
        const el = refs[i].current;
        if (el) {
          el.style.transform = `translate(${satPos[i].x.toFixed(1)}px, ${satPos[i].y.toFixed(1)}px) scale(${sc.toFixed(2)})`;
          el.style.opacity = op.toFixed(2);
          el.style.zIndex = (guarding || depth >= 0) ? '6' : '1';
        }
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <>
      <div ref={r0} className="nx-sp-satdot" style={{ opacity: 0 }} />
      <div ref={r1} className="nx-sp-satdot" style={{ opacity: 0 }} />
      <div ref={r2} className="nx-sp-satdot" style={{ opacity: 0 }} />
    </>
  );
}

type PlanetCtx = {
  registerSlot: (id: string, el: HTMLElement | null) => () => void;
  /** 第一段：飛到 viewport 中央上方、放大 1.12、預設 .8s easing */
  flyToCenter: (durationMs?: number) => Promise<void>;
  /** 第二段：飛到指定 slot rect、預設 .95s easing；TopBar slot 自動放大 ×2 */
  flyTo: (slotId: string, durationMs?: number) => Promise<void>;
};

const Ctx = createContext<PlanetCtx | null>(null);

export function usePlanet(): PlanetCtx {
  const c = useContext(Ctx);
  if (!c) {
    // 沒包 Provider 時降級到 no-op
    return {
      registerSlot: () => () => {},
      flyToCenter: async () => {},
      flyTo: async () => {},
    };
  }
  return c;
}

// ============ PlanetSlot：佔位 ============

export function PlanetSlot({ id, className, style }: { id: string; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const { registerSlot } = usePlanet();
  useEffect(() => {
    return registerSlot(id, ref.current);
  }, [id, registerSlot]);
  // 佔位本身不可見（真實星球在 SharedPlanet 內飛來停泊）
  return <div ref={ref} className={className} style={{ ...style, opacity: 0 }} aria-hidden />;
}

// ============ Planet SVG（440×440 viewBox 200×200 大尺寸版） ============

function PlanetSVG({ uid }: { uid: string }) {
  const layerRef = useRef<SVGGElement>(null);
  const reduce = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // hexwave 漣漪：mount 後注入 SVG circles + CSS animation
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer || reduce) return;
    const NS = 'http://www.w3.org/2000/svg';
    const cx = 100, cy = 100, R = 94, maxD = 95, cycle = 6.8, travel = 1.1, vstep = 11.5;
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
        c.setAttribute('class', 'nx-sp-hexcell');
        c.style.animation = `nx-sp-hexwave ${cycle}s linear infinite`;
        c.style.animationDelay = `${((d / maxD) * travel).toFixed(2)}s`;
        layer.appendChild(c);
        created.push(c);
      }
    }
    return () => { created.forEach((el) => el.remove()); };
  }, [reduce]);

  // id 後綴避免多顆 PlanetSVG 撞名（雖然 SharedPlanet 只有一顆、預留）
  const M = `m_${uid}`, S = `s_${uid}`, C = `c_${uid}`, CH = `ch_${uid}`;
  const FA = `fa_${uid}`, HF = `hf_${uid}`, RG = `rg_${uid}`, CP = `cp_${uid}`;

  return (
    <svg className="nx-sp-sphere-svg" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
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
        <circle cx="100" cy="100" r="99" fill={`url(#${M})`} />
        {/* hex 紋理層 140s 自轉 */}
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
        <circle cx="100" cy="100" r="99" fill={`url(#${S})`} />
        {/* hexwave 漣漪動態注入 */}
        <g ref={layerRef} />
        {/* core halo 3.8s 呼吸 */}
        <circle cx="100" cy="100" r="42" fill={`url(#${CH})`}>
          {!reduce && (
            <animate attributeName="opacity" values=".55;.95;.55" dur="3.8s" repeatCount="indefinite" />
          )}
        </circle>
        {/* reactor core 3.8s 半徑跳動 */}
        <circle cx="100" cy="100" r="15" fill={`url(#${C})`}>
          {!reduce && (
            <animate attributeName="r" values="13;17;13" dur="3.8s" repeatCount="indefinite" />
          )}
        </circle>
        <circle cx="100" cy="100" r="5.5" fill="#fff8e6" />
      </g>
      <circle cx="100" cy="100" r="98" fill="none" stroke="rgba(255,222,150,.32)" strokeWidth="1.4" />
    </svg>
  );
}

// ============ SharedPlanetRoot：Provider + SharedPlanet（單一顆 fixed 440） ============

const BASE = 440;

export function SharedPlanetRoot({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const planetRef = useRef<HTMLDivElement>(null);
  const slotsRef = useRef<SlotMap>({});
  const modeRef = useRef<PlanetMode>('idle');
  const [, forceRender] = useState(0);
  const tick = useCallback(() => forceRender((v) => v + 1), []);
  // 當前目標 slot（衛星僅在 'login' 時顯示）
  const currentSlot: CurrentSlot = pathname === '/login' ? 'login' : 'topbar';

  const registerSlot = useCallback((id: string, el: HTMLElement | null): (() => void) => {
    if (!el) return () => {};
    slotsRef.current[id] = [...(slotsRef.current[id] ?? []), el];
    tick();
    return () => {
      slotsRef.current[id] = (slotsRef.current[id] ?? []).filter((x) => x !== el);
      tick();
    };
  }, [tick]);

  // 找該 id 第一個可見（width > 1）的 element
  const findVisibleSlot = useCallback((id: string): HTMLElement | null => {
    const list = slotsRef.current[id] ?? [];
    for (const el of list) {
      const r = el.getBoundingClientRect();
      if (r.width > 1 && r.height > 1) return el;
    }
    return null;
  }, []);

  // 計算 slot rect → transform string（inner tryOnce 避免 self-reference）
  const placeAt = useCallback((slotId: string, transition: string) => {
    if (typeof window === 'undefined') return;
    const el = planetRef.current;
    if (!el) return;
    let retry = 0;
    const tryOnce = () => {
      const slot = findVisibleSlot(slotId);
      if (!slot) {
        if (retry++ < 40) requestAnimationFrame(tryOnce);
        return;
      }
      const r = slot.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const scale = (r.width / BASE) * (slotId === 'topbar' ? 2 : 1);
      const dx = cx - window.innerWidth / 2;
      const dy = cy - window.innerHeight / 2;
      el.style.transition = transition;
      el.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${scale.toFixed(4)})`;
    };
    tryOnce();
  }, [findVisibleSlot]);

  // 自動依 pathname 切預設位置（idle 時直跳、無轉場）
  useLayoutEffect(() => {
    if (modeRef.current !== 'idle') return;
    const target = pathname === '/login' ? 'login' : 'topbar';
    placeAt(target, 'none');
  }, [pathname, placeAt]);

  // resize 重定位
  useEffect(() => {
    const onResize = () => {
      if (modeRef.current !== 'idle') return;
      const target = pathname === '/login' ? 'login' : 'topbar';
      placeAt(target, 'none');
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [pathname, placeAt]);

  // 第一段：飛到 viewport 中央上方 + 放大 1.12（對齊 Hana A/B 段第 1 步）
  const flyToCenter = useCallback(async (durationMs = 800) => {
    if (typeof window === 'undefined') return;
    const el = planetRef.current;
    if (!el) return;
    modeRef.current = 'flight';
    el.style.transition = `transform ${durationMs}ms cubic-bezier(.45,0,.25,1)`;
    el.style.transform = `translate(0px, ${(window.innerHeight * -0.06).toFixed(1)}px) scale(1.12)`;
    await new Promise((r) => setTimeout(r, durationMs + 20));
  }, []);

  // 第二段：飛到指定 slot rect（對齊 A/B 段第 2 步）
  const flyTo = useCallback(async (slotId: string, durationMs = 950) => {
    if (typeof window === 'undefined') return;
    modeRef.current = 'flight';
    placeAt(slotId, `transform ${durationMs}ms cubic-bezier(.6,0,.2,1)`);
    await new Promise((r) => setTimeout(r, durationMs + 20));
    modeRef.current = 'idle';
  }, [placeAt]);

  const ctxValue: PlanetCtx = {
    registerSlot,
    flyToCenter,
    flyTo,
  };

  return (
    <Ctx.Provider value={ctxValue}>
      {/* 全域 keyframes + halo / reactor / hexwave 樣式 */}
      <style>{`
        @keyframes nx-sp-breathe {
          0%, 100% { opacity: .5; transform: translate(-50%, -50%) scale(.94); }
          50% { opacity: .95; transform: translate(-50%, -50%) scale(1.06); }
        }
        @keyframes nx-sp-breathe-core {
          0%, 100% { opacity: .6; transform: translate(-50%, -50%) scale(.86); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.12); }
        }
        @keyframes nx-sp-hexwave {
          0%, 100% { opacity: 0; transform: scale(.85); }
          3%       { opacity: .5; transform: scale(1.22); }
          10%      { opacity: 0; transform: scale(1); }
        }
        .nx-sp-hexcell {
          transform-box: fill-box;
          transform-origin: center;
          fill: #c4d2e4;
          opacity: 0;
          filter: drop-shadow(0 0 2px rgba(200,220,248,.7));
        }
        .nx-shared-planet {
          position: fixed;
          left: 50%;
          top: 50%;
          width: ${BASE}px;
          height: ${BASE}px;
          margin: ${-BASE / 2}px 0 0 ${-BASE / 2}px;
          z-index: 60;
          pointer-events: none;
          will-change: transform;
        }
        /* 修正：原 inset:0 + translate(-50%,-50%) keyframe 撞、halo 被推到左上角。
           改回 left/top 50% + width/height 62% 的 Hana .halo-outer 範式、translate 才會正確置中。
           移除 blur(4px) + 降飽和 (.32 -> .22)、避免一坨過亮金暈淹掉 hex 紋理。 */
        .nx-sp-halo {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 62%;
          height: 62%;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(244,170,40,.22), rgba(244,170,40,.06) 44%, transparent 68%);
          animation: nx-sp-breathe 5.6s ease-in-out infinite;
        }
        .nx-sp-sphere {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 46%;
          height: 46%;
          transform: translate(-50%, -50%);
          z-index: 2;
          border-radius: 50%;
          overflow: hidden;
          background: #161b21;
          box-shadow:
            inset 10px 12px 26px -16px rgba(255,255,255,.38),
            0 0 56px -6px rgba(217,164,49,.45),
            0 16px 44px -12px rgba(0,0,0,.62);
        }
        .nx-sp-sphere-svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }
        .nx-sp-spec {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          z-index: 3;
          mix-blend-mode: screen;
          background: radial-gradient(circle at 34% 27%, rgba(255,250,235,.7), rgba(255,250,235,0) 20%);
        }
        .nx-sp-reactor {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 24%;
          height: 24%;
          transform: translate(-50%, -50%);
          z-index: 4;
          border-radius: 50%;
          pointer-events: none;
          mix-blend-mode: screen;
          background: radial-gradient(circle, #fff7e2 0%, #ffd368 26%, #f4a92a 50%, rgba(180,110,10,0) 76%);
          box-shadow: 0 0 22px 4px rgba(244,170,40,.6);
          animation: nx-sp-breathe-core 3.8s ease-in-out infinite;
        }
        /* 三顆守護衛星樣式 */
        .nx-sp-satdot {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 17px;
          height: 17px;
          margin: -8.5px 0 0 -8.5px;
          border-radius: 50%;
          pointer-events: none;
          will-change: transform, opacity;
          background: radial-gradient(circle at 38% 36%, #ffffff, #dfe4ec 46%, #9aa2af 100%);
          box-shadow: 0 0 10px 2px rgba(222,232,246,.9), 0 0 22px 5px rgba(180,200,232,.42);
          transition: opacity .4s ease;
        }
        @media (prefers-reduced-motion: reduce) {
          .nx-sp-halo, .nx-sp-reactor { animation: none; }
        }
      `}</style>
      <div ref={planetRef} className="nx-shared-planet">
        <div className="nx-sp-halo" />
        <div className="nx-sp-sphere">
          <PlanetSVG uid="root" />
          <div className="nx-sp-spec" />
        </div>
        <div className="nx-sp-reactor" />
        {/* 三顆守護衛星（只在 login slot 時顯示、滑鼠靠近時聚到游標側）*/}
        <Satellites active={currentSlot === 'login'} planetRef={planetRef} />
      </div>
      {children}
    </Ctx.Provider>
  );
}
