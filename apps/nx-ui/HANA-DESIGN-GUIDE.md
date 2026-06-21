<!-- apps/nx-ui/HANA-DESIGN-GUIDE.md -->

# HANA 設計交付規範（NEXORA GRID — nx-ui 前端）

> 位置：`apps/nx-ui/HANA-DESIGN-GUIDE.md`
> 版本：v1.0（2026-06-20 Hank 初版）
> 對象：**Hana（Claude Design 設計師）**
> 撰寫者：**Hank（Claude Code 全端核心工程師）**
> 目的：你設計完 → 我（Hank）拿到後要 1:1 還原到 nx-ui，這份規範告訴你「**用什麼格式給我、就不會走樣**」

---

## 0. 你看到這份是因為…

我們前兩輪合作（ERP SYSTEM TEST、轉場與星球規格）出現的問題：

- 你給我的是 **vanilla HTML / CSS / JS prototype**（自己的動畫 lib + 自己的 CSS 寫法）
- 我這邊是 **Next.js 16 + React 19 + Tailwind v4 + framer-motion + Radix**
- 我為了把你的東西塞進來，必須**重寫一遍**模仿效果
- 重寫過程把你的細節磨掉 → 成果跟你設計的不一樣 → 執行長不滿意

這份文件要解的就是這件事：**你用我這邊「拿到就能直接放」的格式交付**，省掉翻譯這一層。

> ⛔ **這份文件不是設計風格規範**（風格你自己抓 / 鋼鐵星球 / amber-gold 那些你都懂）。
> 這份文件**只規範「交付方式」與「技術寫法」**，讓 Hank 能 1:1 還原。

---

## 1. 你必須知道的 nx-ui 技術棧（你設計的東西要落在這套上）

| 類別 | 我用的 | 你設計時請假設 |
|---|---|---|
| 框架 | Next.js 16.1.6 + React 19 | 你的元件最終會是 `.tsx`、不是 `.html` |
| CSS | Tailwind v4（`@tailwindcss/postcss`） | 樣式用 utility class、不要 inline `style="…"` |
| 動畫 | **framer-motion 12.38**（已裝） | 元件動畫用 framer-motion 寫；CSS transition 也可，但要能 1:1 翻 |
| CSS 動畫補充 | `tw-animate-css`（已裝、Tailwind 風格 keyframe utility） | 不要自寫 `@keyframes`、用 Tailwind class 或 framer-motion |
| UI 基底 | `@radix-ui/*`（dialog / tabs / dropdown / scroll-area / avatar / label / slot） | 對話框、tab、下拉選單**請用 Radix 的結構**、不要從零做 |
| 圖示 | `lucide-react` 1.7.0 | 圖示**只用 lucide**、不要塞 SVG sprite 或自己畫 |
| 圖表 | `recharts` 2.15 | 圖表用 recharts、不要 Chart.js / D3 |
| 狀態 | `zustand` 5.0 | 你**只給 props + dummy data**、不要碰狀態管理（資料層我接） |
| 拖拉 | `@dnd-kit/*`（已裝） | 拖拉用 dnd-kit、不要 react-dnd / 自寫 mousedown |
| 表格 | 自寫 + ResponsiveTable 範式 | 表格我有既有範式（你看 `src/design/components/`） |
| 字級 | **root font 110%**（年長操作者友善） | 你設計用 `rem` / `em`、不要寫 `px`（除了 1px 邊框） |

---

## 2. 上次走樣最痛的兩個地方 — 這次怎麼避

### 2.1 動畫走樣（最痛 #1）

**根本原因：**你用的緩動曲線 / duration / 觸發時機，跟我翻譯到 framer-motion 後不一致。

**這次請這樣交：**

每個有動畫的元件，附一份「**動畫規格**」（可以放在元件 spec HTML 註解或獨立 `.motion.md`）：

```
元件：CardHover
觸發：onMouseEnter / onMouseLeave
變化：
  - scale: 1 → 1.02
  - shadow: var(--shadow-md) → var(--shadow-lg)
  - duration: 240ms
  - easing: cubic-bezier(0.22, 1, 0.36, 1)   ← 重要、寫清楚
  - delay: 0
退出：同上反向、duration 160ms
```

或更好 — **直接給我 framer-motion 寫法**（你 Claude Design 寫得出來）：

```tsx
<motion.div
  whileHover={{ scale: 1.02 }}
  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
>
```

⛔ **不要這樣交：**
- 「滑過去會放大一點」← 太模糊、會走樣
- 自寫 `transition: all 0.3s ease;` ← `ease` 是哪個 ease?走樣
- GSAP / anime.js / @keyframes 自寫 ← 我這邊翻譯時細節會掉

✅ **可接受的動畫格式（任選一種、最好兩種都附）：**
1. **framer-motion code**（首選、我直接複製貼上）
2. **Tailwind class**（用 `animate-*` / `transition-*` / `duration-*` / `ease-*`）
3. **規格文字**（duration + easing 函數名 + 變化值，三件齊全）

### 2.2 布局走樣（最痛 #2）

**根本原因：**你用 `position: absolute` + `transform: translate(-50%, -50%)` + 寫死 `width: 800px` 那種「絕對座標式」布局，到我這邊一接，父容器條件不同、padding / gap 不同、響應式不同 → 整個崩。

**這次請這樣設計：**

- 用 **flex / grid** 為主、`absolute` 只用在「真的要疊」的情境（popover / tooltip / 卡片光暈）
- 寫尺寸用 **rem** 或 **Tailwind spacing class**（`w-64` / `gap-4` / `px-6`），不要寫死 px
- 響應式請明確標 **斷點**：`md:` (768px) / `lg:` (1024px) / `xl:` (1280px)
- **桌面與手機**請分開出兩張設計稿（這系統手機版很重要、見既有 `src/design` 結構）

⛔ **不要這樣交：**
```css
.card { position: absolute; top: 120px; left: 50%; transform: translateX(-50%); width: 840px; }
```

✅ **這樣交：**
```tsx
<div className="mx-auto w-full max-w-4xl px-6">
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
    {/* ... */}
  </div>
</div>
```

或附**佈局規格**：
```
容器：max-width 64rem (max-w-4xl)、置中（mx-auto）、水平 padding 1.5rem
網格：1 欄 → md 斷點換 2 欄；gap 1rem → md 斷點 1.5rem
```

---

## 3. 你交給我的內容 — 目錄結構

請以 zip 交付、解開後長這樣：

```
hana-handoff-YYYYMMDD/
├── README.md                  ← 這次交什麼、改了哪些頁、有沒有動骨架（見 §12）
├── pages/                     ← 每頁一個資料夾
│   ├── 01-master-employee/    ← 用業務中文名 + 編號、不要露 NX 代碼
│   │   ├── desktop.html       ← 桌面 prototype
│   │   ├── mobile.html        ← 手機 prototype
│   │   ├── desktop.png        ← screenshot
│   │   ├── mobile.png         ← screenshot
│   │   ├── spec.md            ← 元件規格 + 動畫規格 + 佈局規格
│   │   └── motion.tsx         ← framer-motion code 範例（如有動畫）
│   └── 02-master-partner/
│       └── ...
├── components/                ← 跨頁共用元件（如果你新增了）
│   ├── glow-card/
│   │   ├── preview.html
│   │   ├── spec.md
│   │   └── motion.tsx
│   └── ...
├── tokens/                    ← 你提議的新 token（如果有）
│   └── proposed-tokens.css    ← 用 CSS variable、跟既有 globals.css 同格式
└── changes-vs-existing.md     ← 你跟既有 nx-ui 的差異對照（見 §12）
```

⛔ **不要交：**
- `node_modules/` / 整包 build artifact / 你 prototype 的 vanilla JS engine（`*-engine.js`）
- 任何 `.psd` / `.fig` / Figma 連結（我吃不到、要寫程式碼/規格）
- 字型檔（我這邊用 Geist + Geist Mono、自己會處理）

---

## 4. 樣式怎麼寫

### 4.1 既有 token 系統（**請用、不要另起一套**）

`apps/nx-ui/src/design/styles/tokens.css` 已有完整 OKLCH 主題變數：

```css
--background / --foreground
--card / --card-foreground
--primary / --primary-foreground       ← amber-gold 主色
--secondary / --muted / --accent
--destructive
--border / --input / --ring
--chart-1 ~ --chart-5
--sidebar-*                            ← 側邊系
--radius                               ← 0.625rem
```

你設計時請**直接用這些變數**（`var(--primary)` 或 Tailwind `text-primary` / `bg-card`），不要寫死 `#d4a017` 之類的色碼。

### 4.2 新增 token

如果你**真的**需要新色 / 新尺寸：
1. 別碰 `tokens.css`（我來改）
2. 在 `tokens/proposed-tokens.css` 寫提議、附**理由**（既有 token 不夠用在哪）
3. 我這邊收到會評估、合進 `tokens.css`

### 4.3 字級

- root font 110%（已在 `:root` 寫死）
- 你寫尺寸用 `text-sm` / `text-base` / `text-lg` Tailwind class
- 不要寫 `font-size: 14px`、用 `text-sm`

### 4.4 動畫黑名單套件

⛔ 不要在 prototype 引用：
- GSAP
- anime.js
- AOS
- jQuery animate
- styled-components / emotion
- 自寫 `@keyframes`（除非附對應的 framer-motion 或 tw-animate class 版本）

✅ 可以引用：
- framer-motion
- Tailwind `animate-*` / `tw-animate-css` 的 class
- CSS `transition`（規格要寫清 duration + easing 函數）

---

## 5. 元件層級對應（我這邊的分層）

我這邊 `src/design/` 的分層：

| 層 | 路徑 | 範例 | 對應你設計時的概念 |
|---|---|---|---|
| **primitives** | `src/design/primitives/` | button / card / dialog / input / tabs | 原子元件、Radix 包裝、樣式最小 |
| **components** | `src/design/components/` | NexoraBottomDock / PageHeader / form / listform / master-batch | 組合元件、有業務語意 |
| **layout** | `src/design/layout/` | NxAppBackdrop / HexBulgeField | 整頁框架 / 背景 |
| **home** | `src/design/home/` | HomeTopBar / SharedPlanetRoot | 首頁與星球視覺 |
| **login** | `src/design/login/` | LoginPageView | 登入流 |
| **motion** | `src/design/motion/` | ScatterPageGate | 跨頁轉場動畫 |
| **theme** | `src/design/theme/` | 主題切換 | 多套主題 |

**你設計時**請在 `spec.md` 標清：「這個元件是 primitives 級 / components 級 / 整頁」，我吃進來時就放對地方。

---

## 6. 套件白名單（你只能引用這些）

prototype 裡可以引用：

```
react
react-dom
next                  ← 你大概不會用、但 import 方式請對齊
framer-motion         ← 動畫首選
lucide-react          ← 唯一圖示來源
recharts              ← 唯一圖表來源
@radix-ui/react-*     ← dialog/tabs/dropdown/scroll-area/avatar/label/slot
@dnd-kit/*            ← 拖拉
class-variance-authority / clsx / tailwind-merge   ← class 組合
date-fns              ← 日期
react-day-picker      ← 日期選擇器
xlsx                  ← Excel 匯出（如有）
html5-qrcode          ← 條碼掃描（手機版用）
```

⛔ **不在白名單的請不要用**（會增加我整合成本）：
- moment.js / dayjs（用 date-fns）
- antd / mui / chakra / mantine（我們用 Radix + 自寫）
- Chart.js / D3（用 recharts）
- styled-components / emotion / stitches（用 Tailwind）
- redux / mobx / jotai（我用 zustand、且不需要你管狀態）

---

## 7. 狀態與資料界線（**重要**）

**你只負責 UI、不負責資料層。**

- 你的 prototype 用 **dummy data**（hard-code 在元件裡或單獨 `.data.ts`）
- **不要**接 API、不要 fetch、不要 useEffect 撈資料
- **不要**寫 zustand store / Context Provider
- 把資料當 **props** 傳進你的元件，我接手時把 props 接到真 API
- 範例：

```tsx
// ✅ 這樣交
type EmployeeCardProps = { name: string; role: string; dept: string; avatarUrl?: string; }
export function EmployeeCard({ name, role, dept, avatarUrl }: EmployeeCardProps) { ... }

// 旁邊放 demo 用：
export const demoEmployee: EmployeeCardProps = { name: '王小明', role: '業務專員', dept: '銷售部' };
```

我吃進來會把 `demoEmployee` 換成真 API hook、props 不動。

---

## 8. 命名與語言鐵則

| 規則 | 範例 |
|---|---|
| **業務中文名**、**絕不**露 NX 代碼 | ✅ 「核心主檔 / 進貨 / 庫存 / 銷貨 / 財務 / 報表」<br>⛔ 「NX01 / NX02 / nx-master / nx-purchase」 |
| 動詞庫（兩字優先） | 新增、更正、存檔、取消、查詢、列印、匯出、停用、啟用 |
| **「停用」不是「刪除」** | master 軟刪除一律寫「停用」、icon 用 `PowerOff` |
| 三版不寫升級話術 | ⛔ 「升級 PRO 解鎖此功能」← LITE/PLUS/PRO 只差人數上限、所有功能都在 |
| 語氣 | 專業、簡潔、運營口吻；無 emoji、無感嘆號、無行銷詞 |
| 時間問候 | 早安 / 午安 / 晚安（系統會自動切） |

---

## 9. Token / 主題切換（既有兩套）

`<html>` 上的 class 控制主題：

- 預設（無 class）= **深色**（鋼鐵星球、amber-gold 金主色）
- `.light` = 淺色（TopBar 切到時加）
- 還有 `html[data-nx-palette]`：`classic`（冷灰黑金）/ `steel`（鋼鐵星球）

你設計時：
- 預設用深色版（首要）
- 淺色版**也要附**（不能跳過、執行長會切）

---

## 10. 響應式斷點（Tailwind v4 預設）

| 斷點 | 寬度 | 用途 |
|---|---|---|
| `sm` | ≥ 640px | 大手機橫向 |
| `md` | ≥ 768px | 平板直向 |
| `lg` | ≥ 1024px | 平板橫向 / 小筆電 |
| `xl` | ≥ 1280px | 桌機 |
| `2xl` | ≥ 1536px | 大桌機 |

**手機優先**：你的 base style 是手機、用 `md:` `lg:` 往上加，不要反過來。

---

## 11. 一頁完整交付範例（給你照抄）

```
pages/01-master-employee/
├── desktop.html             ← prototype、可在瀏覽器打開看
├── mobile.html              ← 手機版 prototype
├── desktop.png              ← 桌面截圖（重要狀態各一張）
├── mobile.png               ← 手機截圖
├── EmployeeListPage.tsx     ← React + Tailwind 寫法、附 dummy data
├── motion.tsx               ← framer-motion code（如有動畫）
└── spec.md                  ← 規格、見下方範本

spec.md 範本：
---
頁面：員工列表（核心主檔 / 組織架構 / 員工）
層級：整頁（不是 primitive / 不是 component）

【布局】
- 桌面：左 280px 篩選欄 + 右 flex-1 表格、外層 max-w-screen-2xl 置中
- 手機：篩選欄收到頂部 collapsable、表格全寬卡片化

【動畫】
1. 篩選欄 collapse/expand：framer-motion AnimatePresence、height 0 ↔ auto、duration 240ms、ease easeInOut
2. 表格列 hover：bg from card → card-hover、duration 120ms、ease linear
3. 卡片首次進場：staggered fade-in、stagger 30ms、duration 200ms、ease easeOut

【元件依賴】
- primitives：Button、Input、Avatar、Card
- components：PageHeader、QuickSearch、Toast（既有）
- 新增：FilterPanel（這次新做、放 components/）

【dummy data】
- 10 筆員工（檔在 EmployeeListPage.tsx 底部 export）

【主題】
- 預設深色已做、淺色版也附（截圖 desktop-light.png）

【動到骨架？】
- 否（top bar / dock 沒動）
---
```

---

## 12. 動到骨架請寫進 README（**重要**）

執行長已凍結的骨架：
- **TopBar**（`src/design/home/HomeTopBar.tsx`）
- **BottomDock**（`src/design/components/NexoraBottomDock.tsx`）

如果這次你動了這兩塊（任何視覺 / 互動 / 結構改動），請在 zip 根目錄 `README.md` 寫：

```
【動到骨架】
- TopBar：[改了什麼、為什麼]
- BottomDock：[改了什麼、為什麼]
```

我看到會先 hold、跟執行長確認再吃。

**沒動骨架**也請寫一行：「本次未動骨架」。

---

## 13. 差異對照（`changes-vs-existing.md`）

如果你動了既有元件（例如改 PageHeader 樣式），請在這份對照表寫：

| 元件 | 既有路徑 | 你改了什麼 | 理由 |
|---|---|---|---|
| PageHeader | `src/design/components/page-header/` | 增加副標欄位、圖示移右 | 員工列表需要顯示部門副標 |

讓我吃進來時知道哪些是「合進既有檔」、哪些是「新增獨立檔」。

---

## 14. 你不確定時 — 怎麼問

prototype 旁可以放 `questions.md`，列你不確定的點：

```
1. 員工卡片右上角的「狀態」徽章，深色用 amber 還是 emerald？
2. 表格分頁列要不要做手機版？看你之前的 ResponsiveTable 範式好像桌機 only
3. ……
```

我會在吃進來前先回你。

---

## 15. 速查

| 你想做… | 怎麼做 |
|---|---|
| 加動畫 | framer-motion 寫法 + 規格（duration + easing 必標） |
| 加色 | 用既有 `--primary` / `--accent` 變數；要新色寫 `proposed-tokens.css` |
| 加圖示 | lucide-react |
| 加圖表 | recharts |
| 寫表單 | Radix label + 既有 `components/form/` 範式 |
| 寫對話框 | Radix dialog + 既有 `primitives/dialog.tsx` |
| 寫 tab | Radix tabs + 既有 `primitives/tabs.tsx` |
| 寫下拉 | Radix dropdown-menu |
| 寫日期選擇 | react-day-picker（已裝） |
| 拖拉 | @dnd-kit |
| 條碼掃描 | html5-qrcode |
| 動骨架 | **先跟執行長確認**、然後在 README 註明 |

---

## 16. 最後 — 給你一句話的原則

> **你的 prototype 應該是 Hank 可以直接 copy / paste 到 nx-ui 的 React 元件、而不是要再「翻譯一次」的設計稿。**

如果某段你不確定能不能直接套，把選擇權留給我：寫成「方案 A：framer-motion、方案 B：CSS transition」兩個版本、我選一個。

謝謝 Hana。我們合作順利。

— Hank
