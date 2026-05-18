<!-- docs/_team/task-auth-ui-iterate-01-v2-merge-verify.md -->

# TASK-AUTH-UI-ITERATE-01-V2 — Merge Main 上線風險揭露

> 性質：純諮詢、stop 給 Crown + Alex 驗收（Q-RHYTHM-2：Final merge 介入）
> 撰寫：Hank
> 日期：2026-05-18
> 觸發：3 commit Q-RHYTHM-2 連跑完成（規範 v1.3 + warning 橙色 + 版本號位置升級）
> 分支：`feature/task-auth-ui-iterate-01-v2`（ahead 3 commit + 本 merge-verify commit）
> 對應依據：[nexora-error-code-spec.md](./nexora-error-code-spec.md) v1.3 + [nx-theme-audit.md](./nx-theme-audit.md) + Crown 拍板 A/a/b

---

## §0 ahead 4 commit 真實清單

```
（本 commit：merge-verify 5 段）
3af6dd2 [FEAT] version display 位置校正 + 格式升級
ba0626d [FEAT] login error UI 升級 warning 橙色 + 4 主題 design token
bb77a81 [DOC] nexora-error-code-spec v1.2 → v1.3
```

基於 main HEAD `15f29d6`（含 V1 merge）。

---

## §1 規範 v1.3 §7.3 + §13.4 + §13.5 對齊

| 規範 § | 校正內容 | 落地狀態 |
|---|---|---|
| §7.3.1 顏色分級 | destructive 紅嚴重 / warning 橙預設 | ✅ login-form text-warning |
| §7.3.2 NEXORA 預設 warning 橙 | 登入失敗 / 驗證錯誤 | ✅ 已切換 |
| §7.3.3 既有 token 揭露 | 4 主題 warning 色票 | ✅ globals.css 4 主題完整 |
| §7.3.4 元件範式 | XCircle + flex-1 column + [Error Code : XX-NNN] | ✅ 100% 對齊 |
| §7.3.4 文案 | 「請確認公司帳號、使用者帳號及密碼。」（去「登入失敗」+「與→及」+ 加「。」）| ✅ backend + frontend 全套校正 |
| §13.4 版本號位置 | logo 下方 → 登入按鈕下方 | ✅ LoginVersionFooter |
| §13.4 完整格式 | NEXORA GRID \| v1.5.1 beta | ✅ getVersionParts() 三段 |
| §13.5 4 主題色 | brand muted / version primary / suffix muted | ✅ design token 對齊 |

---

## §2 warning 橙色 4 主題切換 verify

### 2.1 既有 `--warning` token 4 主題完整（A041 grep）

```
:root                                      → #e8a020   （dark + classic 預設）
html:not(.light)[data-nx-palette='steel']  → #ffb800   （dark + steel = NEXORA 主色）
html.light[data-nx-palette='classic']      → oklch(0.5 0.12 73)   （light + classic、V2 新補）
html.light[data-nx-palette='steel']        → #b88600   （light + steel）
```

A041：`grep "\-\-warning:" apps/nx-ui/src/app/globals.css` = **4 處**（4 主題完整）。

### 2.2 @theme inline 啟用 Tailwind 工具類

```css
@theme inline {
  --color-warning: var(--warning);   // 啟用 bg-warning / text-warning / border-warning
}
```

⭐ **零硬編** — login-form 用 `bg-warning/10 / border-warning/40 / text-warning` 純工具類、4 主題自動切換。

### 2.3 rename 揭露

```
v1.2 既有：--color-warning（CSS variable）
v1.3 改為：--warning（CSS variable）+ @theme inline --color-warning: var(--warning)
```

⚠️ **理由**：避免 @theme inline 同名循環（`--color-warning: var(--color-warning)` 會循環）。
✅ **0 既有引用受影響**（grep `var(--color-warning)` 全棧 0 hit）。

---

## §3 lucide-react XCircle 圖示 + 字級保留

### 3.1 圖示

| 項目 | 值 |
|---|---|
| 圖示 | `XCircle` from lucide-react |
| 大小 | `size-5`（20px）+ `mt-0.5` 微調垂直 |
| 顏色 | 繼承父 `text-warning`（4 主題自動）|
| a11y | `aria-hidden` |

⭐ **0 新增 lib**（lucide-react 既有）。

### 3.2 字級保留 v1.2 校正

| 元素 | className | 字級 |
|---|---|---|
| 主訊息 | `text-base leading-snug` | **16px** |
| 錯誤代碼 | `text-xs opacity-70` | **12px**（規範 v1.3 §7.3.4 範例用 text-xs）|
| padding | `p-3.5` | **14px** |

⚠️ **與 V1 differences**：
- V1：代碼 `text-[13px]` 13px
- V2：代碼 `text-xs` 12px（規範 v1.3 §7.3.4 範例對齊、tailwind default）

### 3.3 結構升級

```tsx
<div className="border-warning/40 bg-warning/10 p-3.5 text-warning rounded-lg border">
  <div className="flex items-start gap-2">
    <XCircle className="mt-0.5 size-5 shrink-0" aria-hidden />
    <div className="flex-1">
      <p className="text-base leading-snug">{errorMsg.message}</p>
      <p className="mt-1 text-xs opacity-70">[Error Code : {errorMsg.errorCode}]</p>
    </div>
  </div>
</div>
```

⭐ V2 與 V1 差異：訊息 + 代碼合併右側 `flex-1` column（V1 是代碼獨立行 + pl-7 對齊）。

### 3.4 錯誤代碼格式

| 版本 | 格式 |
|---|---|
| V1 | `[錯誤代碼：AU-002]`（中文）|
| **V2** | **`[Error Code : AU-002]`**（英文、Crown 揭露偏好）|

---

## §4 版本號位置 + 格式 + 4 主題

### 4.1 位置校正

| V1 | V2 |
|---|---|
| 桌面：副標下方 mt-3 | **移除** |
| Mobile：GRID 副標下方 mt-1 | **移除** |
| - | **新增**：login-card 下方 LoginVersionFooter mt-4 text-center |

✅ 對齊規範 v1.3 §13.4 + 業界範式（Slack / Salesforce 版本號在登入區下方）。

### 4.2 格式校正

| V1 | V2 |
|---|---|
| `v1.5.0`（純版本）| **`NEXORA GRID | v1.5.1 beta`**（品牌+版本+suffix 三段）|

### 4.3 版本號升 v1.5.0 → v1.5.1

- 對應 V1 + V2 兩次 UI iterate
- 修改 `apps/nx-ui/src/lib/version.ts` NEXORA_VERSION 常數
- 新增 NEXORA_BRAND 常數 + getVersionParts() helper

### 4.4 4 主題 design token 對齊

```tsx
<p className="mt-4 text-center font-mono text-sm tracking-[0.1em] text-muted-foreground">
  <span>{brand}</span>                                {/* NEXORA GRID, muted-foreground */}
  <span className="mx-2 opacity-50">|</span>          {/* 分隔, opacity 50% */}
  <span className="text-primary">{version}</span>     {/* v1.5.1, primary amber */}
  {suffix ? <span className="ml-2 text-muted-foreground">{suffix}</span> : null}
  {/* beta, muted-foreground */}
</p>
```

| 主題 | NEXORA GRID | v1.5.1 | beta |
|---|---|---|---|
| dark + steel | `#9ca8b8` 偏灰 | `#ffb800` amber | `#9ca8b8` |
| dark + classic | oklch(0.8) 淡白 | oklch(0.78 0.14 75) amber | oklch(0.8) |
| light + steel | `#5c5648` 暖灰 | `#b88600` 深金 | `#5c5648` |
| light + classic | oklch(0.4) 深灰 | oklch(0.695 0.128 73) | oklch(0.4) |

⭐ **零硬編顏色、純 design token、4 主題自動**。

### 4.5 字級保留

- text-sm 14px（V1 + V2 不變）
- font-mono + tracking-[0.1em]（V2 微調對齊：V1 0.15em → V2 0.1em 略密）

---

## §5 既有 --color-warning token 對齊（零硬編 verify）

### 5.1 V1 vs V2 命名差異

| V1（v1.2）| V2（v1.3）|
|---|---|
| `--color-warning` CSS var（既有 4 主題部分覆蓋）| **rename → `--warning`**（避免 @theme inline 同名衝突）|
| 未在 @theme inline | **`--color-warning: var(--warning);`** in @theme inline 啟用 Tailwind 工具類 |
| login-form 用 `text-destructive` 紅 | **`text-warning` 橙**（Tailwind 工具類）|

### 5.2 零硬編 verify（A041 grep）

```
grep -E "bg-amber|text-amber|border-amber" login-form.tsx → 0 hit（V2 後）
grep -E "bg-orange|text-orange|border-orange" login-form.tsx → 0 hit
grep -E "bg-\[#" login-form.tsx → 0 hit（無 arbitrary value）
grep -E "bg-warning|text-warning|border-warning" login-form.tsx → 4 hit ✅
```

⭐ login-form **100% 使用 design token 工具類**、4 主題自動切換。

### 5.3 light + classic 補完揭露

- V1 揭露：light + classic 缺 `--color-warning` override（會繼承 :root #e8a020）
- V2 補完：`html.light[data-nx-palette='classic']` 區塊加 `--warning: oklch(0.5 0.12 73);`（規範 v1.3 §7.3.3 對齊）

---

## §6 build / tsc verify

```
pnpm --filter=nx-api exec tsc --noEmit  → 0 error
pnpm --filter=nx-ui exec tsc --noEmit  → 0 error
```

---

## §7 破壞性 verify

| 維度 | 評估 |
|---|---|
| 既有 endpoint / API / 業務邏輯 | ✅ 0 動 |
| 既有 errorCode 結構 | ✅ 保留（AU-001/002/003/101/102/301/302/303/304/501/999 全沿用）|
| backend message 文字 | ⚠️ 11 處全升級（去「登入失敗」+「與→及」+ 加「。」）|
| frontend errorMsg structure | ✅ 不破壞（NexoraClientError 型別維持）|
| `--color-warning` → `--warning` rename | ⚠️ CSS 內部範式改名、無外部引用受影響（grep verify）|
| 既有 V1 改動（字級 + ❌ + padding） | ✅ 保留（V2 在 V1 基礎上升級）|

⚠️ **唯一行為改變**：
- 錯誤訊息顏色：紅 destructive → 橙 warning（業界範式：使用者操作問題 = warning 級）
- 文案：去「登入失敗」+ 統一句末「。」+ 「與」→「及」（Crown 業界 muscle memory）
- 版本號位置：logo 下方 → 登入按鈕下方
- 版本號格式：v1.5.0 → NEXORA GRID | v1.5.1 beta

---

## §8 A026 backlog 追加（Hank §6.4）

對齊 NX-THEME-AUDIT §6.4 + V2 浮現：

1. **TASK-DIALOG-OVERLAY-FIX**：13 自製 Dialog `bg-black/80` 寫死 → 對齊 design token reverse（Crown Q3=b 拍板留後續軌）
2. **light + classic amber 主色 WCAG AA 對比度實測**（NX-THEME-AUDIT §4.3 揭露）
3. **`.dark` destructive-foreground 紅色 bug 確認 / 修正**（NX-THEME-AUDIT §2.2）
4. **TASK-AUTH-RATE-LIMIT**：「錯誤次數累積」UX + AU-401/402 落地
5. **`--warning` 4 主題色票 WCAG AA 對比度實測**（V2 新加色票需 verify）
6. **lucide XCircle 換 ⚠️ AlertTriangle 評估**（business case：warning 級別圖示業界範式部分用 ⚠️、本軌仍用 XCircle 對齊規範 v1.3 §7.3.4 範例）

---

## §9 4 主題驗收清單（給 Crown 實測用）

⚠️ **Crown 需於 4 主題各驗收 1 次**：

| 主題 | 切換方式 | 驗收項目 |
|---|---|---|
| **dark + steel**（預設）| TopBar 確認 Moon icon + palette 'steel'（或無切換）| warning 橙 #FFB800 / brand muted / version amber |
| dark + classic | TopBar palette toggle 'classic' | warning oklch(0.78 0.14 75) |
| light + steel | TopBar Sun icon + palette 'steel' | warning #B88600 / 文字背景對比足夠 |
| light + classic | TopBar Sun + palette 'classic' | warning oklch(0.5 0.12 73) / 對比足夠 |

驗收項目 per 主題：
1. ✅ 錯誤訊息橙色顯示對比清晰（非紅、非淡到看不見）
2. ✅ XCircle 圖示與訊息色一致
3. ✅ 文案無「登入失敗」、有「公司帳號、使用者帳號及密碼。」
4. ✅ 錯誤代碼 `[Error Code : AU-002]` 顯示
5. ✅ login-card 下方版本號 `NEXORA GRID | v1.5.1 beta` 顯示
6. ✅ 版本號 v1.5.1 為 amber primary 色（與 brand/suffix muted 對比清晰）

---

## §10 結論 + Merge 建議

⭐ **建議 merge 入 main**（不需新 tag、屬「規範 v1.3 落地 + UI iterate V2」性質）：

| 維度 | 評估 |
|---|---|
| 規範 v1.3 §7.3 + §13 對齊 | ✅ 100% |
| 既有 endpoint / 業務邏輯 | ✅ 0 動 |
| tsc | ✅ 0 error |
| Crown 拍板 A/a/b 對齊 | ✅ 100%（warning 保留 destructive / §5.2 推薦色票 / 13 Dialog 後續軌）|
| 4 主題切換 design token | ✅ 零硬編 |
| 3 commit 結構 | ✅ 清晰可逐 commit revert |

stop 給 Crown + Alex 驗收（§9 4 主題實測）→ Crown 拍板 A 後 Hank 自跑 merge / push（無 tag）。

---

> 文件版本：v1.0（TASK-AUTH-UI-ITERATE-01-V2 merge-verify、10 段揭露、stop 給 Crown）
