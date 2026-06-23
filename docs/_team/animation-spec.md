<!-- 檔案位置：docs/_team/animation-spec.md -->
<!-- 檔案版本：v1.0（2026-06-23 Hank 初版）-->
<!-- 檔案說明：NEXORA nx-ui 動畫雙引擎規範（framer-motion + GSAP 並存策略）。
     Hana 設計 → framer-motion；Hank 編排 → GSAP。邊界、token、SSR 規則、禁區清單。
     維護權：Hank（執行長拍板覆蓋）。 -->

# NEXORA 動畫規範（雙引擎：framer-motion + GSAP 並存）

> 位置：`docs/_team/animation-spec.md`
> 版本：v1.0（2026-06-23 Hank 初版、執行長拍板「GSAP 補強 framer-motion」）
> 對象：Hank（Claude Code）+ Hana（Claude Design）

---

## 0. 為什麼有這份

LITE 完整版 v2.1.0 已 closure、開始接第一個真實客戶前要做最後一輪 polish。執行長拍板加 GSAP 處理 framer-motion 較弱的領域，但 framer-motion 不拔（Hana 設計交付規範已定、撥不掉）。

⚠️ NEXORA 是 ERP、不是行銷頁。動畫要克制、不能拖慢操作。

---

## 1. 兩套引擎的邊界（最重要的一條）

| 引擎 | 負責 | 觸發者 |
|---|---|---|
| **framer-motion** | 元件層 micro-interaction（dialog 開合、dropdown、tab、AnimatePresence、佈局過渡） | Hana 設計交付 |
| **GSAP** | 場景編排 / 滾動驅動 / 高頻 / timeline 序列 | Hank 自己決定 |

### GSAP 才用的場景（≦ 7 個）

1. **登入 → dashboard 過場 timeline**（多元素序列）
2. **Dashboard KPI 數字滾動**（onUpdate 改 state）
3. **報表 ScrollTrigger.batch**（長頁滾動入場）
4. **報表表頭 pin**（短距離 sticky-with-animation）
5. **AutoPageGuide 22 工作台引導 spotlight**（精確元素遮罩）
6. **設定精靈步驟 timeline**（多步序列）
7. **手機版 dock 切換 quickTo**（高頻 < 16ms 切換）

⛔ 除以上 7 個場景，**新動畫先看 framer-motion 能不能做**、能做就用 framer-motion。

---

## 2. 動畫 Token（兩套共用）

| token | 值 | 用在 |
|---|---|---|
| `duration.fast` | 120ms | hover / focus / table row |
| `duration.base` | 200ms | dialog / dropdown / tab |
| `duration.slow` | 400ms | 過場 / 報表進場 |
| `duration.dramatic` | 800ms | 登入過場 / KPI 數字滾動 |
| `ease.standard` | `power2.out` / framer `[0.4,0,0.2,1]` | 預設 |
| `ease.enter` | `power3.out` / framer `[0,0,0.2,1]` | 進場 |
| `ease.exit` | `power3.in` / framer `[0.4,0,1,1]` | 退場 |
| `ease.emphasize` | `back.out(1.4)` / framer `spring{stiffness:300,damping:25}` | 強調 |
| `stagger.tight` | 30ms | 卡片列表（Hana 範本沿用） |
| `stagger.relaxed` | 80ms | 大區塊序列 |

⚠️ duration / ease 不要在 GSAP 直接寫死數字、從 `@/shared/animation/tokens.ts` 取。

---

## 3. SSR 與 Next.js 16 規則（GSAP 專用）

GSAP 跑瀏覽器、Next.js 預設 server component。動手前先：

1. **所有 GSAP 元件第一行 `'use client'`**
2. **GSAP code 必在 `useGSAP()` hook 內**（不在 `useEffect` 用 `useGSAP` 已內建 cleanup）
3. **scope 一定要傳 ref**：`useGSAP(() => {...}, { scope: containerRef })`
4. **registerPlugin 跑一次**：`gsap.registerPlugin(useGSAP, ScrollTrigger)` 放在共用 entry
5. **動態 import** 大 plugin（ScrollTrigger 本身不算大、可不動態）

```tsx
'use client';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useRef } from 'react';

export function MyAnimatedSection() {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    gsap.from('.card', { y: 30, autoAlpha: 0, stagger: 0.08 });
  }, { scope: ref });
  return <div ref={ref}>{/* cards */}</div>;
}
```

---

## 4. 無障礙：`prefers-reduced-motion` 鐵律

每個 GSAP 場景都要包 `matchMedia` 處理 reduce-motion：

```tsx
useGSAP(() => {
  const mm = gsap.matchMedia();
  mm.add({
    reduceMotion: '(prefers-reduced-motion: reduce)',
    normal: '(prefers-reduced-motion: no-preference)',
  }, (ctx) => {
    if (ctx.conditions?.reduceMotion) {
      gsap.set('.card', { autoAlpha: 1, y: 0 });
      return;
    }
    gsap.from('.card', { y: 30, autoAlpha: 0, stagger: 0.08 });
  });
}, { scope: ref });
```

⚠️ 汽配老闆很多 50+ 歲、有暈動症的會調 reduce-motion、不做這個會被罵。

---

## 5. 效能鐵律

| 該做 | 不該做 |
|---|---|
| `x` / `y` / `scale` / `rotation` / `autoAlpha` | `width` / `height` / `top` / `left` / `margin` |
| 高頻互動（mousemove / 拖拉 / scroll）用 `gsap.quickTo()` | 每次更新 `gsap.to()` |
| 多元素同動用 `stagger` | 多個 `gsap.to()` + 手動 delay |
| 列表進場用 `ScrollTrigger.batch` | 為每張卡建一個 ScrollTrigger |
| 元件 unmount 時 `useGSAP` 自動清 | 用 `useEffect` 但忘記 `ctx.revert()` |
| `autoAlpha: 0` （含 visibility:hidden、不擋點擊） | `opacity: 0` 的元素還能擋點擊 |

---

## 6. 禁區清單（這些地方絕不加動畫）

| 區域 | 原因 |
|---|---|
| 表單欄位輸入 / blur | 影響打字速度 |
| 表格 row hover | 每天看幾百筆、會崩潰 |
| 表格儲存格選取 / 多選 | 操作員會煩 |
| TopNav / 主選單 click | 重複動作不能拖 |
| 自動完成 / 下拉建議 | 必須 instant |
| 送出按鈕 click → response（業務動作） | 不要假動畫、要真 loading state |
| 任何 `tw-animate-css` 已涵蓋的微動 | 不再加 GSAP/framer |

---

## 7. 檔案結構

```
apps/nx-ui/src/design/motion/
  ├── scatter/                # 既有 CSS 散開過場（保留、不動）
  │   └── ScatterPageGate.tsx
  └── gsap/                   # 本軌新增
      ├── tokens.ts           # duration / ease / stagger 常數
      ├── register.ts         # gsap.registerPlugin 入口（client only）
      ├── useReducedMotion.ts # SSR-safe hook
      ├── KPICounter.tsx      # 數字滾動共用元件
      ├── FadeInOnScroll.tsx  # ScrollTrigger.batch 共用元件
      └── index.ts            # barrel
```

import：`@design/motion/gsap`（tsconfig 已設 `@design/*` → `design/*`）

⚠️ `register.ts` 只在 client component 第一次 import 時跑、不要在 layout 上層 import（會打破 SSR）。
⚠️ ScatterPageGate（頁切換 radial 散開）已用 CSS transition、本軌不替換、不重做頁切換。

---

## 8. Hana 那邊不變的事

Hana 交付的 `motion.tsx` 仍然是 framer-motion code、Hank 不改規範。
**Scroll-linked 動畫 / Timeline 編排 / KPI 數字滾動 Hana 不必設計**、寫成「請 Hank 處理」即可（HANA-DESIGN-GUIDE.md 下次改版補一行）。

---

## 9. commit code

GSAP 整合軌統一前綴：`[GSAP-FW-Sn]` n = 階段編號（0-7）。整軌 closure tag `v2.3.0-animation-framework`。

---

## 10. 版本歷史

- **v1.0**（2026-06-23）執行長拍板「GSAP 補強 framer-motion」、Hank 寫初版
