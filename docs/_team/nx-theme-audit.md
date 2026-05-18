<!-- docs/_team/nx-theme-audit.md -->

# NX-THEME-AUDIT — NEXORA 深淺兩主題真相揭露

> 性質：純諮詢、不開工、不 commit production code（僅 commit 本 audit 文件）
> 撰寫：Hank
> 日期：2026-05-18
> 觸發：Crown 揭露 NEXORA 有深淺兩風格主題、Alex 規劃 TASK-AUTH-UI-ITERATE-01-V2「橘色錯誤」推測色票只考慮深色、需 verify 主題真相
> 對齊：[NX-UI-AUDIT-01](./ui-audit-01.md) §5 元件庫 + §I.5 #22 鐵律 + §G.9 通配 grep + §I.6.3 揭露不完整每段尾標

---

## §0 結論先說（給 Alex 校正用）

⭐ **NEXORA 主題系統 = 2 軸 × 2 值 = 4 種組合**（非單一深淺切換）：

| 軸 | 值 | UI 切換 |
|---|---|---|
| **明度**（`html.light` class）| dark（預設）/ light | TopBar Sun/Moon icon、useNxThemeMode hook、localStorage `nx-ui-theme-mode` |
| **色票風格**（`html[data-nx-palette]`）| **steel**（預設、銀白底/深底反應爐金）/ classic（冷灰黑金）| TopBar palette toggle、`NxPaletteHydration` 首屏注入、localStorage |

⭐ **既有「橘色」色票分析**：
- **`--destructive`** 紅 / 紅亮（4 種主題各有色票、目前錯誤訊息用此 token）
- **`--accent`** = `--primary` amber 金（4 種主題各有色票、本身是正面色不適合 error）
- **`--color-warning`** 橘 `#e8a020`（dark）/ `#b88600`（light steel）**⭐ 對齊「橘色 = warning」業界範式、Alex 橘色錯誤應走此 token**

→ **Alex 校正建議**：「橘色錯誤」走既有 `--color-warning` token + 自製 warning 變體（vs 修改 destructive）。

---

## §1 既有深淺主題實作真相

### 1.1 技術範式（A041 精確）

```
Tailwind v4 @custom-variant dark (&:where(html:not(.light) *, .dark *));
→ 「html 上沒有 .light class」即視為 dark（預設深色）
→ 不用 next-themes lib（自製 useNxThemeMode hook）
```

對齊 `apps/nx-ui/src/app/globals.css:9`。

### 1.2 主題切換 hook（useNxThemeMode）

對齊 `apps/nx-ui/src/hooks/useNxThemeMode.ts`：

```typescript
type NxThemeMode = 'dark' | 'light' | 'system';
const STORAGE_KEY = 'nx-ui-theme-mode';

function applyMode(m: NxThemeMode) {
  if (m === 'light')      → root.classList.add('light');
  if (m === 'dark')       → root.classList.remove('light');
  if (m === 'system')     → root.classList.toggle('light', media.matches);
}
```

⭐ **預設**：**dark**（首次啟動無 `.light` class）。
⭐ **system 模式**：自動跟 `prefers-color-scheme: light` media query 切換。

### 1.3 主題切換 UI 位置（A041 = 2 處）

| 位置 | file | 行為 |
|---|---|---|
| **Home TopBar**（landing / dashboard 共用）| `apps/nx-ui/src/components/home/top-bar.tsx` 行 461-475 | Sun/Moon icon button + dropdown radio（3 mode）|
| **Layout TopBar** | `apps/nx-ui/src/components/layout/TopBar.tsx` | cycleThemeMode 循環切換 |

### 1.4 第二軸：色票風格 data-nx-palette（A041 揭露）

對齊 `NxPaletteHydration.tsx`：

```typescript
data-nx-palette ∈ { 'classic', 'steel' }
預設：'steel'
localStorage key = NX_DASHBOARD_PALETTE_STORAGE_KEY
首屏 useLayoutEffect 注入（防閃爍）
```

⭐ **4 種主題組合**：

| html class | data-nx-palette | 風格 |
|---|---|---|
| (none) | `steel` | **預設**：深底 + amber #FFB800 反應爐金 |
| (none) | `classic` | 深底 + oklch 冷金（oklch 0.78 0.14 75）|
| `.light` | `steel` | 奶油麥芽黃灰 + #B88600 深金 |
| `.light` | `classic` | 銀白冷灰 + oklch(0.695) 淡金 |

### §I.6.3 §1 揭露不完整

- 未 verify TopBar palette toggle 實際 UI 位置（推測 dropdown 或 secondary button、未深 grep）
- 未 verify 「system」mode 在 SSR 期間 hydration 行為（推測 useLayoutEffect 也加上）

---

## §2 既有色票真相

### 2.1 amber 主色 4 主題色票（A041 grep）

對齊 `globals.css` 4 區塊：

| 主題 | `--primary` | `--accent` | 性質 |
|---|---|---|---|
| dark + classic（`:root`、行 21-66）| `oklch(0.78 0.14 75)` ≈ amber | `oklch(0.78 0.14 75)` ≈ amber | OKLCH 統一 |
| dark + classic（`.dark`、行 68-106）| `oklch(0.78 0.14 75)` | `oklch(0.78 0.14 75)` | 同上 |
| **dark + steel**（行 109-、預設組合）| **`#ffb800`** ⭐ | **`#cc8400`** | hex 反應爐金 |
| light + classic（行 179-214）| `oklch(0.695 0.128 73)` | `oklch(0.71 0.122 73)` | 暗 amber |
| **light + steel**（行 216-260）| **`#b88600`** | **`#a67c00`** | hex 深金 |

⭐ **預設 = dark + steel = `#FFB800` amber**（NEXORA 業界改革標誌色）。

### 2.2 destructive 4 主題色票（既有「錯誤訊息」範式）

| 主題 | `--destructive` | `--destructive-foreground` |
|---|---|---|
| `:root` | `oklch(0.577 0.245 27.325)` 紅亮 | `oklch(0.95 0 0)` 近白 |
| `.dark` | `oklch(0.396 0.141 25.723)` 紅暗 | `oklch(0.637 0.237 25.331)` **紅！** ⚠️ |
| dark + steel | `oklch(0.577 0.245 27.325)` 紅亮 | `#ffffff` 白 |
| light + classic | `oklch(0.62 0.18 25)` 紅 | `oklch(0.99 0.002 260)` 白 |
| light + steel | `oklch(0.62 0.18 25)` 紅 | `#ffffff` 白 |

⚠️ **重大揭露**：`.dark` 區塊 `--destructive-foreground` 是紅色（`oklch(0.637 0.237 25.331)`）— 跟業界「白字紅底」期望不符、可能是 bug 或設計選擇（紅底 + 偏紅亮的 fg、強調感）。但**實際 dark + steel** 用的是預設 `:root` 不是 `.dark` 區塊（因為 `html.dark` class 沒被加，預設是「無 .light」走 `:root`）。

### 2.3 warning 色票（橘色既有 token）⭐

對齊 `globals.css` 行 64 / 258：

```css
:root {
  --color-warning: #e8a020;   /* 橘色、business doc CSS variable */
}

html.light[data-nx-palette='steel'] {
  --color-warning: #b88600;   /* 淺色版本：深金/橘 */
}
```

⚠️ **`--color-warning` 不是 Tailwind theme token**（不在 `@theme inline` 區塊、不能用 `bg-warning` 工具類）= 純 CSS variable、需手動引用 `var(--color-warning)`。

⭐ **Alex「橘色錯誤」可走 3 條路徑**：
- **A**：擴 `--color-warning` 為 Tailwind theme token（加 `@theme inline` + 4 主題色票補齊）
- **B**：用 `--accent`（amber 金）= 但語意衝突（accent 是正面色）
- **C**：手寫 amber-500 / orange-500 等 Tailwind 預設色（不對齊 design token）

### §I.6.3 §2 揭露不完整

- 未 verify `.dark` 區塊 destructive-foreground 紅色是 bug vs 故意設計
- 未 verify 其他 nx-* CSS variable 完整清單（`--nx-scroll-track`、`--nx-glow-primary` 等是否需擴 warning）

---

## §3 既有元件深淺主題支援

### 3.1 design token 對齊（自動支援深淺）

| 元件 | 對齊 token | 支援 |
|---|---|---|
| BaseMasterModalFrame（21 主檔共用）| bg-background/55 + border-border/80 + bg-card 等 | ✅ 自動跟 4 主題 |
| 登入畫面（page.tsx）| bg-card/60 + border-border/40 + text-foreground/muted-foreground 等 | ✅ 自動 |
| LoginForm | bg-secondary/50 + border-border/50 + placeholder:text-muted-foreground/50 + text-destructive | ✅ 自動 |
| shadcn/ui 12 個（button / card / dialog 等）| 全 design token | ✅ 自動 |
| sys-dashboard 元件 | `html.light .nx-dash-card` 等明確深淺處理（globals.css 行 354-377）| ✅ 兩主題明確調 |

### 3.2 ⚠️ 寫死黑色 / 未對齊主題的元件

| 元件 | 問題 | 行為 |
|---|---|---|
| **13 個自製 Dialog**（features/sale/inquiry × 3 + features/sale/sop-workspace × 7 + ConfirmDialog + 等）| `fixed inset-0 z-50 bg-black/80` 寫死 | ⚠️ 淺色主題 modal 遮罩仍黑（業界範式上「淺色 modal 遮罩」應較淡）|
| FloatingToast（features/sale/sop-workspace/components/FloatingToast.tsx）| 待 verify | ⚠️ |

⭐ **影響**：13 個自製 Dialog 在淺色主題視覺仍是黑遮罩、未來 polish 軌需對齊（A026 候選）。

### 3.3 顯式深淺處理（global CSS 行 162-260、775-940）

```
home-stars-canvas         深 0.76 / 淺 0.42 opacity
home-sky-glow             深亮金黃漸層、淺奶油暖色
nx-dash-card              html.light 改 zinc-50 / 深色用 oklch
nx-dash-frame             html.light vs default
nx-master-row-checkbox    html.light 5 種狀態
nx-master-table           html.light thead / tbody 兩色帶
gradient-text             .light 反向漸層
glass-card                .light 反向毛玻璃
login-stars               .light opacity / mix
login-shell .login-card   .light 反向 gradient
login-link                .light 顏色反向
```

⭐ 約 **20+ class 明確深淺處理**、主要在 home / dashboard / master / login 範疇。

### §I.6.3 §3 揭露不完整

- 未 verify 13 個自製 Dialog 在淺色主題實測（推測 `bg-black/80` 寫死、應改 `bg-background/80` or `bg-foreground/80` reverse token）
- 未 verify FloatingToast 是否對齊主題

---

## §4 登入畫面深淺主題真相

### 4.1 登入畫面 4 種主題視覺（基於 globals.css verify）

| 主題 | 背景 | 卡片 | 主色（amber）| 文字 |
|---|---|---|---|---|
| **dark + steel**（預設、Crown 截圖）| `#0a0a0a` 黑 | `color-mix(#1e1e1e 78% / #2a2621 22%)` 帶暖 | **`#FFB800`** 反應爐金 | `#d6dae3` 近白 |
| dark + classic | oklch(0.145) 深藍灰 | oklch(0.225) 深 | oklch(0.78 0.14 75) 冷金 | oklch(0.96) |
| **light + steel** | `#f4efd9` 奶油麥芽黃灰 | `#faf6ea` 暖白 | **`#b88600`** 深金 | `#2c2a22` 深棕 |
| light + classic | oklch(0.963) 銀白 | oklch(0.985) 近白 | oklch(0.695) 淡金 | oklch(0.245) 深灰 |

### 4.2 既有 login 明確深淺處理（globals.css 行 850-）

```css
.light .login-stars                  → opacity 反向（暗主題亮、亮主題淡）
.light .login-shell .login-card      → 反向 gradient
.light .login-shell .login-link      → 連結顏色反向
```

⭐ 登入畫面**已完整對齊 4 主題**（既有 design token + 明確 `.light` overrides）。

### 4.3 amber 主色在淺色主題效果

```
dark + steel    #FFB800   → 對比強、視覺亮眼（業界改革標誌色）
light + steel   #B88600   → 較深、與淺色背景對比清晰
light + classic oklch(0.695)  → 淡金、可能對比偏弱（待實測）
```

⚠️ 未實測截圖、推測 light + classic 主色對比偏弱（業界 a11y 標準 WCAG AA 需 4.5:1）。

### §I.6.3 §4 揭露不完整

- 未實測登入畫面在 light + steel / light + classic 截圖（Hank 無瀏覽器截圖能力、需 Crown 開瀏覽器測）
- 未 verify TopBar palette 切換在 login 路由是否可用（推測 login 沒 TopBar、palette 預設 steel）

---

## §5 Crown「橘色錯誤」深淺色票建議

### 5.1 業界範式對齊

| 顏色 | 業界語意 | NEXORA 既有 token |
|---|---|---|
| 紅 | error / destructive / 危險 | `--destructive` 4 主題色票 ✅ |
| **橘** | **warning / 注意** | `--color-warning` 2 變體（dark/light steel）⚠️ 缺 classic |
| 黃 | caution / 強調 | （無）|
| 藍 | info / 連結 | `--accent` / `--primary` amber（NEXORA 用 amber 取代藍）|
| 綠 | success | `--color-success` `#1d9e75` |

⭐ Crown「橘色錯誤」對齊業界「warning 橘色」範式（vs `destructive` 紅）。

### 5.2 推薦色票（4 主題 × 3 元素 = 12 色票）

對齊既有 `--color-warning` token 擴充：

| 主題 | 背景（bg）| 邊框（border）| 文字（text）| 圖示 |
|---|---|---|---|---|
| **dark + steel** | `rgba(232, 160, 32, 0.12)` | `rgba(232, 160, 32, 0.45)` | `#ffb800` | XCircle `#ffb800` |
| dark + classic | `rgba(232, 160, 32, 0.12)` | `rgba(232, 160, 32, 0.45)` | `oklch(0.78 0.14 75)` | 同 |
| **light + steel** | `rgba(184, 134, 0, 0.08)` | `rgba(184, 134, 0, 0.35)` | `#b88600` | XCircle `#b88600` |
| light + classic | `rgba(200, 150, 20, 0.08)` | `rgba(200, 150, 20, 0.35)` | `oklch(0.5 0.12 73)` | 同 |

⭐ **核心策略**：
- 背景：主色 8-12% alpha（淡橘填充）
- 邊框：主色 35-45% alpha（明顯但不喧囂）
- 文字 + 圖示：主色 100%（高對比）

### 5.3 落地建議 — 3 選 1

#### A（推薦 ⭐）：擴 `--color-warning` 為 Tailwind theme token

```css
/* globals.css */
:root { --color-warning: #e8a020; }
.dark, html:not(.light)[data-nx-palette='steel'] { --color-warning: #ffb800; }
html.light[data-nx-palette='classic'], html.light:not([data-nx-palette]) { --color-warning: #c89614; }
html.light[data-nx-palette='steel'] { --color-warning: #b88600; }

@theme inline {
  --color-warning: var(--color-warning);  /* 啟用 bg-warning / text-warning / border-warning */
}
```

UI 改動：
```tsx
<div className="rounded-lg border border-warning/40 bg-warning/10 p-3.5 text-warning">
  <XCircle className="size-5 shrink-0" />
  ...
</div>
```

✅ 4 主題自動切換、對齊既有 token 範式、零硬編。

#### B：建新 `--color-error-warning` 專用 token

⚠️ 過度設計（與 warning 重疊、增加維護）。

#### C：手寫 Tailwind 預設 amber / orange

```tsx
<div className="border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400">
```

⚠️ 不對齊既有 design token、4 主題切換手動寫 + 對齊不可控。

### §I.6.3 §5 揭露不完整

- 未 verify Crown「橘色錯誤」具體期望色票（vs warning 業界範式）
- 未 verify 是否要保留紅色 destructive 範式給「真實 error」（區分 warning 橘 vs error 紅）
- 未實測推薦色票 4 主題 a11y WCAG AA 對比度（≥ 4.5:1）

---

## §6 戰略總覽（給 Alex 寫 v2 用）

### 6.1 主題系統真相速查

```
明度切換：html.light class（dark 預設 = 無 class）
色票切換：html[data-nx-palette]={steel|classic}（預設 steel）
4 種組合：dark+steel / dark+classic / light+steel / light+classic
切換 UI：TopBar Sun/Moon + palette toggle
hook：useNxThemeMode（localStorage `nx-ui-theme-mode`）
hydration：NxPaletteHydration（localStorage data-nx-palette）
@custom-variant dark (&:where(html:not(.light) *, .dark *));
```

### 6.2 「橘色錯誤」推薦做法（給 Alex v2）

⭐ **走 §5.3 A**：擴 `--color-warning` 為 Tailwind theme token + 4 主題色票補齊 + `text-warning/bg-warning/border-warning` 工具類化。

對齊規範 v1.2 §7.3：
```tsx
<div className="rounded-lg border border-warning/40 bg-warning/10 p-3.5 text-warning">
  <div className="flex items-start gap-2">
    <XCircle className="mt-0.5 size-5 shrink-0" aria-hidden />
    <p className="text-base leading-snug">{errorMsg.message}</p>
  </div>
  <p className="mt-2 pl-7 text-[13px] text-warning/70">
    [錯誤代碼：{errorMsg.errorCode}]
  </p>
</div>
```

### 6.3 ⚠️ Crown 拍板題

1. 確認「橘色 = warning（注意）」vs 「橘色 = error（取代紅）」？
   - 若 warning：保留紅 destructive、新加橘 warning 二元範式 ⭐ 推薦
   - 若取代 error：移除 destructive 用橘、單一範式
2. 4 主題色票具體值（§5.2 推薦 vs Crown 客製）
3. 13 個自製 Dialog 黑遮罩是否本軌一併修（A026 候選）

### 6.4 A026 backlog

1. 13 個自製 Dialog `bg-black/80` 寫死 → 對齊 design token reverse
2. light + classic amber 主色對比度 WCAG AA 實測
3. `--color-warning` 完整 4 主題擴 token（含 dark+classic 缺值）
4. `.dark` 區塊 destructive-foreground 紅色 bug 確認 / 修正

---

## §7 §I.6.3 揭露不完整總清單

1. **§1** TopBar palette toggle 實際 UI 位置 + system mode SSR hydration
2. **§2** `.dark` destructive-foreground 紅色 bug vs 故意
3. **§3** 13 個自製 Dialog 淺色實測 + FloatingToast 對齊
4. **§4** 4 主題登入畫面實測截圖（Hank 無瀏覽器截圖、需 Crown）
5. **§5** Crown 橘色語意拍板（warning vs error 取代）

---

> 文件版本：v1.0（NX-THEME-AUDIT 純諮詢、7 段揭露 + 12 色票建議 + 4 種主題組合 + Alex v2 §6 策略）
> 待 Crown 拍板 §6.3（3 題）→ Alex 寫 v2 plan
