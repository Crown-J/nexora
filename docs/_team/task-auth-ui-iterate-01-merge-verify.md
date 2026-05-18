<!-- docs/_team/task-auth-ui-iterate-01-merge-verify.md -->

# TASK-AUTH-UI-ITERATE-01 — Merge Main 上線風險揭露

> 性質：純諮詢、stop 給 Crown + Alex 驗收（Q-RHYTHM-2：Final merge 介入）
> 撰寫：Hank
> 日期：2026-05-18
> 觸發：3 commit Q-RHYTHM-2 連跑完成（規範 v1.2 + UI 字級 + 版本號）
> 分支：`feature/task-auth-ui-iterate-01`（ahead 3 commit + 本 merge-verify commit）
> 對應依據：[nexora-error-code-spec.md](./nexora-error-code-spec.md) v1.2 + Crown 拍板 a/a/a/b

---

## §0 ahead 4 commit 真實清單

```
（本 commit：merge-verify 5 段）
57df501 [FEAT] 版本號顯示（蘋果範式、hardcode v1.5.0 + suffix=beta）
f1f1769 [FEAT] login error UI iterate（字級 + 圖示 + padding）
40567cd [DOC] nexora-error-code-spec v1.1 → v1.2
```

---

## §1 規範 v1.2 §7.3 + §13 對齊

| 規範 § | 校正內容 | 落地狀態 |
|---|---|---|
| §7.3 訊息字級 | text-sm → **text-base（16px）** | ✅ login-form.tsx |
| §7.3 代碼字級 | text-[11px] → **text-[13px]** | ✅ login-form.tsx |
| §7.3 ❌ 圖示 | XCircle 紅色 mt-0.5 size-5 | ✅ lucide-react 既有、不引新 lib |
| §7.3 padding | px-4 py-3 → **p-3.5（14px）** | ✅ 對齊規範 12-16px |
| §7.3 border 強度 | destructive/35 → destructive/40 | ✅ 視覺強調 |
| §13.4 格式 | v{x.y.z} 正式 / v{x.y.z} beta 測試 | ✅ getVersionDisplay() |
| §13.5 字級 | 14px（桌面 text-sm / mobile text-[13px]）| ✅ 兩處顯示 |
| §13.5 顏色 | amber 正式 / 偏黃灰 beta | ✅ text-accent / text-amber-300/60 |
| §13.6 環境變數 | NEXT_PUBLIC_NEXORA_VERSION_SUFFIX | ✅ getVersionSuffix() |
| §13.7 預設環境 | 本機 / Railway / Vercel = beta | ✅ .env.example 已設 beta |
| §13.8 階段 1 | hardcode 常數（Crown Q4=b）| ✅ NEXORA_VERSION='1.5.0' |
| §13.8 階段 2 | NX99_release API 動態 | 🔵 A026 backlog |

---

## §2 UI 字級實測對齊

### 2.1 規範 §7.3 vs 實作對照

```tsx
// 對齊規範 v1.2 §7.3：訊息 16px / 代碼 13px / ❌ 圖示 / padding 14px
<div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3.5 text-destructive">
  <div className="flex items-start gap-2">
    <XCircle className="mt-0.5 size-5 shrink-0" aria-hidden />     // ❌ 紅色圖示、20px
    <p className="text-base leading-snug">{errorMsg.message}</p>   // 16px 主訊息
  </div>
  <p className="mt-2 pl-7 text-[13px] text-destructive/70">       // 13px 錯誤代碼
    [錯誤代碼：{errorMsg.errorCode}]
  </p>
</div>
```

### 2.2 業界對標 verify

| 元素 | NEXORA v1.2 | Gmail | Stripe | Salesforce |
|---|---|---|---|---|
| 錯誤訊息 | **16px** | 15px | 14px | 14-15px |
| 錯誤代碼 | **13px** | N/A | 12px | 13px |
| ❌ 圖示 | ✅ XCircle 20px | ✅ | ✅ | ✅ |
| padding | 14px | 16px | 12px | 16px |

⭐ NEXORA 字級略大於業界、對齊 Crown「使用者導向 = 容易上手」UX 哲學。

---

## §3 視覺圖示 ❌ 落地

對齊規範 §7.3 圖示要求：

- **圖示來源**：`lucide-react` 既有 `XCircle`（無引入新 icon lib）
- **位置**：訊息主文字左側（`flex items-start gap-2`）
- **大小**：`size-5`（20px）+ `mt-0.5` 微調垂直對齊
- **顏色**：繼承父 `text-destructive`（紅色、對齊 NEXORA design token）
- **a11y**：`aria-hidden`（裝飾性、訊息本身已 `role="alert"`）

⭐ **零新增 dependency**（規範 §7.3「不引入新 icon lib」對齊）。

---

## §4 版本號顯示對齊蘋果範式

### 4.1 顯示位置（A041 精確 = 2 處）

| 位置 | layout | 字級 | 顏色 class |
|---|---|---|---|
| 桌面（lg:flex）| 「汽車零件零售 ERP 企業管理平台」副標下方 mt-3 | text-sm（14px）| text-accent / text-amber-300/60 |
| Mobile（lg:hidden）| 「GRID」副標下方 mt-1 | text-[13px] | text-accent / text-amber-300/60 |

兩處皆 `font-mono tracking-[0.15em]`（對齊既有 amber font 範式）。

### 4.2 beta vs 正式切換邏輯（A041 verify）

| env | suffix | getVersionDisplay() | isBetaVersion() | 顏色 class |
|---|---|---|---|---|
| `NEXT_PUBLIC_NEXORA_VERSION_SUFFIX=beta` | `'beta'` | `'v1.5.0 beta'` | `true` | text-amber-300/60（偏黃灰）|
| `NEXT_PUBLIC_NEXORA_VERSION_SUFFIX=` | `''` | `'v1.5.0'` | `false` | text-accent（amber #FFB800）|
| unset | `''` | `'v1.5.0'` | `false` | text-accent |
| `NEXT_PUBLIC_NEXORA_VERSION_SUFFIX=alpha` | `'alpha'` | `'v1.5.0 alpha'` | `false` | text-accent |

⚠️ **isBetaVersion() = `.toLowerCase() === 'beta'`** 嚴格判 beta（其他 suffix 如 alpha / rc / preview 走正式視覺）= 揭露：未來若要區分 alpha/rc 視覺需擴 helper。

---

## §5 環境變數 + hardcode 常數驗證

### 5.1 為何 hardcode 不讀 package.json（Crown Q4=b 拍板理由）

```
apps/nx-ui/package.json    version='0.1.0'   ← Next scaffold 預設、stale
package.json               version='0.0.1'   ← root 初值、stale
git tag main HEAD          v1.5.0-nx09-yaro-feature-closure ← 真實業務版本 ⭐

→ hardcode 在 src/lib/version.ts 對齊業務 tag
→ 每次 NEXORA-vX.Y.Z-xxx-closure tag 發布時 Crown 拍板更新此常數
```

### 5.2 .env.example 補完

```
# 版本號後綴（NEXORA 錯誤代碼規範 v1.2 §13）
NEXT_PUBLIC_NEXORA_VERSION_SUFFIX=beta
```

對齊規範 §13.7：本機 / Railway / Vercel / 封測 = beta。

### 5.3 build / tsc verify

```
pnpm --filter=nx-ui exec tsc --noEmit  → 0 error
```

---

## §6 破壞性 verify

| 維度 | 評估 |
|---|---|
| 既有 login UI（不含 error 區）| ✅ 100% 保留（PlanetOrbit / ParticleField / 表單 / Loading spinner 0 動）|
| 既有 error UI 範式 | ⚠️ 結構升級（單行 → 圖示 + 訊息 + 代碼 3 區塊）|
| 既有 errorMsg props 型別 | ✅ 不破壞（NexoraClientError 結構維持）|
| 既有 callLoginApi / setToken / router.replace flow | ✅ 0 動 |
| 既有 demo mode | ✅ 0 動 |

⚠️ **唯一行為改變**：error 顯示視覺加大 + 加 ❌ 圖示 + 加版本號顯示（純 UI、無業務邏輯改變）。

---

## §7 A026 backlog 補登

對齊規範 §13.8 §13.9 + 本軌實作浮現：

1. **NX99_release API 動態抓版本**（規範 §13.8 階段 2、TASK-VERSION-DYNAMIC-FETCH）
2. **Changelog 連結**（規範 §13.9、點擊版本號跳 release 詳情）
3. **Top bar 整合版本號**（規範 §13.9、全 NEXORA 一致顯示）
4. **環境警告視覺差異**（規範 §13.9、測試 vs 正式更明顯區隔）
5. **alpha / rc / preview suffix 視覺擴展**（isBetaVersion 只判 'beta'、其他 suffix 走正式色、揭露擴展需求）
6. **正式版觸發 SOP**：首位客戶簽約 → Crown 拍板 NEXT_PUBLIC_NEXORA_VERSION_SUFFIX 清空 → 更新 NEXORA_VERSION 常數 + tag
7. **errorMsg split 主/副訊息**（規範 §7.3 範例分兩行、實作合併單行、未來 backend 結構化 message 後 frontend 對齊）

---

## §8 結論 + Merge 建議

⭐ **建議 merge 入 main**（不需新 tag、屬「UI iterate」性質）：

| 維度 | 評估 |
|---|---|
| 規範 v1.2 §7.3 + §13 對齊 | ✅ 100% |
| 既有 endpoint / API / 業務邏輯 | ✅ 0 動 |
| tsc | ✅ 0 error |
| Crown 拍板 a/a/a/b 對齊 | ✅ 100%（v1.5.0 / suffix=beta / Alex 提供 v1.2 / hardcode 集中）|
| 業界改革對齊 | ⭐ 蘋果版本範式 + Crown A026 #6 closure |
| 3 commit 結構 | ✅ 清晰可逐 commit revert |

stop 給 Crown + Alex 驗收 → Crown 拍板 A 後 Hank 自跑 merge / push（無 tag）。

---

> 文件版本：v1.0（TASK-AUTH-UI-ITERATE-01 merge-verify、8 段揭露、stop 給 Crown）
