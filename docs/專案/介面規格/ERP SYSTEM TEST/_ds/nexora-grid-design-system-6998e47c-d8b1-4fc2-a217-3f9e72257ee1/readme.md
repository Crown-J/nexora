# NEXORA GRID — Design System

A multi-tenant SaaS **ERP** for **Taiwan auto-parts distributors** (台灣汽車零件經銷商).
The product is a web back-office dashboard (Next.js, **Traditional Chinese / 繁體中文**) with a
dark-first "reactor / steel-planet" (鋼鐵星球) surface language built on an **amber-gold** primary.

This project is the systematized design language extracted from the production front-end
codebase `apps/nx-ui`. Consuming projects link `styles.css`; designers read this guide.

---

## Product at a glance

- **Six business modules**, always referred to by their Chinese business names — never tech codes
  (the UI must never surface `NX01`, `NX02`-style internal codes):
  **核心主檔 (Core master)** · **進貨 (Purchasing)** · **庫存 (Inventory)** · **銷貨 (Sales)** ·
  **財務 (Finance)** · **報表 (Reports)**.
- **Three editions — LITE / PLUS / PRO** — differ **only by seat cap**. All modules are
  fully available on every tier; never write "upgrade to unlock" copy.
- **Document-driven workflow:** 報價 → 銷貨 → 出貨 → 收款 (quote → sales → shipment → collection),
  with documents chaining into each other.
- **Data-dense:** large master-data tables + document forms with Excel-style keyboard navigation.
- **Per-tab permission control:** the same part page shows different fields by role
  (e.g. sales sees the **sale price** but not the **purchase cost**).
- **Audience:** Taiwan SME business context; operators skew older, so the whole UI runs at a
  **110% root font** for readability.

## Sources

- **Front-end codebase (source of truth):** `apps/nx-ui` — Next.js 16 / React 19, Tailwind v4,
  shadcn-style Radix primitives, `lucide-react` icons, `recharts`, `framer-motion`.
  Global theme lives in `src/app/globals.css`; primitives in `src/components/ui`;
  ERP shells in `src/features/master-shell` and `src/components/document`.
- Fonts: **Geist** + **Geist Mono** (self-hosted via `next/font` in the app; pulled from
  Google Fonts here — see Caveats).

---

## CONTENT FUNDAMENTALS

**Language & voice.** 100% Traditional Chinese in the UI. Tone is **professional, concise, and
operational** — this is a tool people run a business in all day, not a consumer app. No marketing
fluff, no exclamation marks, no emoji in product chrome.

- **Business names only.** Always 核心主檔 / 進貨 / 庫存 / 銷貨 / 財務 / 報表. Never expose internal
  module codes (NX01…) to users.
- **Verbs are terse, ERP-conventional, and 2 characters where possible:** 新增、更正、存檔、取消、
  刪除、查詢、列印、匯出、重新整理、停用 / 啟用. "刪除" is reserved; the system uses **停用 (soft
  delete)** to protect linked records — toolbars say 停用, not 刪除, for master data.
- **Address the user warmly but briefly.** The home greeting is time-aware: 早安 / 午安 / 晚安，
  {name}. Status lines are factual: "今天還有 3 筆訂單未完成。"
- **Numbers & money** read in mono tabular figures with `NT$` prefix and thousands separators:
  `NT$ 372,000`. Quantities are plain mono integers.
- **Document & ID codes** are uppercase mono with wide tracking: `SO-2026-0118`, `QT-2026-0042`.
- **Eyebrows / form labels** are uppercase + wide-tracked, often bilingual: `公司帳號 / COMPANY ID`.
- **Hot-keys are first-class** and surfaced inline as mono chips: 新增 `Alt+A`, 存檔 `Alt+S`,
  列表/明細 `Alt+1` / `Alt+2`, module switch `Alt+X`.
- **Errors are calm, orange (warning), and coded.** Login/operation problems use the warning
  orange token (not destructive red) with a trailing `[Error Code : …]`.

---

## VISUAL FOUNDATIONS

**Overall vibe.** Dark control-room / "steel planet". A near-black cool-grey canvas, frosted
glass panels floating over a faint gold reactor-glow sky, with a single warm **amber-gold**
accent doing all the highlighting. Restrained, dense, engineered — not playful.

- **Theme model.** Dark is the **default** (the product ships dark). A `.light` class on `<html>`
  flips to a warm-neutral light theme. An optional `[data-nx-palette='steel']` swaps in the pure-
  black + reactor-yellow `#FFB800` "steel planet" palette. Native `color-scheme` follows the theme
  so OS form controls stay dark.
- **Color.** Primary is amber-gold `oklch(0.78 0.14 75)` (≈ `#f4b400`); steel uses `#FFB800`.
  Surfaces are cool-grey oklch ramps (bg `L .145`, card `L .225`, sidebar `L .125`). Business
  semantics are fixed hex for stability: success `#1d9e75`, danger `#e24b4a`, warning `#e8a020`,
  info/meeting `#378add`. Avoid introducing new hues — gold + grey + the four semantics is the
  whole system.
- **Type.** Geist Sans for everything; **Geist Mono** for codes, IDs, quantities, money and
  keyboard hints (always `tabular-nums`). Wide letter-spacing (`.15–.25em`) on uppercase eyebrows,
  form labels and document codes is a signature.
- **Spacing & radius.** 4px spacing grid. Radius base **10px** (`--radius`) with sm/md/lg/xl/2xl
  derived; dashboard cards use the 16px 2xl, controls the 8px md, pills `9999px`. Controls are
  dense: 32px (sm / toolbar / table inputs), 36px (default), 48px (login fields).
- **Cards & surfaces.** Two recipes: a solid `--card` surface with a soft `shadow-sm` and a 1px
  border (master content), and the **`.nx-glass`** frosted panel — translucent fill, 12px blur,
  1px hairline border, an **inset top highlight** and a deep outer shadow (`.nx-glass-raised`) —
  used for dashboard/KPI tiles and the login card.
- **Backgrounds.** No photography. Full-bleed dark canvas with layered radial **gold/amber glow
  gradients** at the top of the viewport (reactor sky), plus an animated star/particle canvas on
  the landing & login. Light theme replaces this with a soft aurora + vignette.
- **Tables (the heart of the product).** Sticky metallic-gradient header (uppercase, wide-tracked,
  `#C8C8D0`), **zebra rows** (odd rows a 3–4% lighter wash), hover `#1A1A22`, and a **selected row**
  marked by an amber left bar (`inset 3px 0`) + amber gradient wash + inset ring. Row numbers are
  4-digit zero-padded mono (`0001`). Sort headers show an up/down chevron.
- **Borders.** 1px hairlines in `--border`, frequently softened with `color-mix(... 30–60%,
  transparent)`. Section dividers are even fainter.
- **Shadows.** Dark-friendly elevation (sm → xl) always paired with an **inset top highlight** so
  glass reads as raised. Focal elements get the **gold glow** (`--nx-glow-primary`).
- **Progress.** Two greens distinct from the gold primary: an **animated flowing-green EXP bar**
  (gamification) and a **static green goal bar**. A gold gradient bar exists for neutral progress.
- **Motion.** Subtle and functional. `var(--ease-out)` / `--ease-standard`, 150–300ms. Cards lift
  slightly on hover (`translateY(-1px)` + border→gold + deeper shadow). The only looping animations
  are the EXP-bar shimmer and the landing orbit/particles. Respect reduced-motion.
- **Hover / press.** Hover = brighten (`brightness ~1.15`) or fill with a faint accent wash; toggle-
  on and CTA controls take an amber tint (border + bg + gold text). Disabled = `opacity .5`,
  not-allowed cursor. Focus = 3px `--ring` gold ring.
- **Transparency & blur** are used deliberately: sticky TopBar (`card/80` + blur), glass panels,
  and dropdown/popover menus (`popover/95` + blur). Solid surfaces elsewhere.

---

## ICONOGRAPHY

- **System:** **`lucide-react`** is the single icon set across the product — thin (2px) rounded-cap
  stroke icons on a 24×24 grid, rendered at 13–18px in chrome and 16px in nav. Use lucide names
  directly (Search, Plus, Pencil, Save, Power/PowerOff, RefreshCcw, Download, Filter, Columns3,
  ChevronDown/Left/Right, Bell, Megaphone, Sun/Moon, User, Building2, Lock, ArrowRight, Eye/EyeOff,
  CheckSquare, ArrowUpDown, LayoutDashboard, …).
  - In React, import from `lucide-react`.
  - In static HTML mocks, use this kit's `ui_kits/erp/Icons.jsx` (`<NXIcon name="search" />`) — it
    carries the real lucide path data for the subset the kit needs. Add paths as needed.
- **Emoji:** a couple of legacy emoji survive in the production TopBar (📢 公告, 🔔 通知) but the
  systematized direction replaces these with lucide `Megaphone` / `Bell`. **Do not add new emoji**
  to product chrome.
- **Brand mark:** the **steel-planet** logo — a grey hex-textured planet with a glowing gold
  reactor core, orbited by gold satellites on iron gear-tick orbits. Provided as PNG
  (`assets/logo-icon-512.png`, `-192`) and the original SVG (`assets/logo-mark.svg`). The wordmark
  is "NEXORA GRID" with **GRID** in gold. A lightweight CSS-only planet variant exists in the app
  (`brand-planet-logo.tsx`) for inline use.
- No illustration library; the only decorative art is the canvas star-field / orbit on landing.

---

## INDEX / MANIFEST

**Root**
- `styles.css` — the entry point consumers link (imports only).
- `tokens/` — `fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `effects.css`.
- `assets/` — `logo-icon-512.png`, `logo-icon-192.png`, `favicon-32.png`, `apple-touch-icon.png`,
  `favicon.ico`, `logo-mark.svg`.
- `SKILL.md` — Agent-Skill front-matter for use in Claude Code.

**Foundations** (`guidelines/foundations/`) — Design-System-tab specimen cards
- Colors: primary, surfaces, neutrals, semantics, steel palette, light, charts.
- Type: scale, families, tracking, tabular figures.
- Spacing: radius, scale, elevation & glass.
- Brand: logo, EXP & goal bars.

**Components** (`components/`) — reusable React primitives (window namespace
`NEXORAGRIDDesignSystem_6998e4`)
- `core/` — **Button**, **Badge**, **Card** (+ Header/Title/Description/Content/Footer).
- `forms/` — **Input**, **FormField**, **Select**, **Checkbox**.
- `forms/` — **Input**, **FormField**, **Select**, **Checkbox**, **FieldBadge**.
- `erp/` — **PlanBadge**, **DocStatusBadge**, **ToolbarButton**, **StatCard**.

  *FieldBadge* carries the four fixed field-semantic chips used across every document form:
  必填 / 建立後不可改 / 系統自動 / 進階.

**UI kits** (`ui_kits/`) — full click-through product recreations
- `erp/` — login → dashboard → 核心主檔 (master table) → 銷貨 (document workflow).
  Screens: `LoginScreen`, `HomeScreen`, `MasterScreen`, `DocumentScreen`, `TopBar`, `App`;
  plus `Icons.jsx` (lucide subset) and `data.js` (mock data).
- `purchase/` — **進貨 · 採購單** list + detail. The 9-stage purchase-order workflow
  (草稿→待核准→已核准→已寄廠商→廠商確認→部分驗收→全部驗收→結案, +作廢) with a
  `StatusTimeline`, a 9-status `PoStatusBadge`, state-dependent action buttons, line-item
  table (我方料號＋廠牌料號), and a role switch demonstrating per-role cost visibility
  (業務 sees no 單價/金額). Reuses the ERP kit's `TopBar`/`Icons`/`fallback`.
  This is the shared pattern for the other 進貨 documents (採購需求/詢價/進貨驗收/退供應商).

---

## CAVEATS

- **Fonts** are pulled from **Google Fonts** (Geist + Geist Mono) rather than the app's self-hosted
  `next/font` binaries. Visually identical family; swap in `.woff2` + `@font-face` if you need
  offline/self-hosted assets.
- Component bundle (`_ds_bundle.js`) is generated by the compiler; component specimen cards and the
  UI kit render once it is built.
