<!-- docs/_team/HANDOFF.md -->

# NEXORA — Hank 交接快照

> 撰寫者：舊 Hank（封存交棒）
> 撰寫時間：2026-05-28
> 對應 commit：本檔 commit
> 目的：路線轉向「按 tier 規劃」前的乾淨起點。新 Hank 上線先讀這份。

---

## a. main 現況

| 項目 | 值 |
|------|----|
| main HEAD | `319f105`（`[GIT-STATE] update 2026-05-28 NX01 closure`）|
| 最新 closure tag | **`v1.0-nx01-closure`** → `1487247`（NX01 主檔模組 closure）|
| origin/main | 同步（0 ahead / 0 behind，本檔 commit 後會 +1）|
| 工作區 | 乾淨（除 3 個未追蹤檔，見下「需新 Hank 判斷」）|

### 各模組 closure 狀態（依 tag 為準）

| 模組 | closure tag | 狀態 |
|------|-------------|------|
| NX01 主檔 | `v1.0-nx01-closure`（1487247）| ✅ 已 closure（含 25 主檔遷鋼鐵星球範式）|
| NX02 採購 | `v0.5.0-nx02-closure` | ✅ |
| NX03 銷貨 | `v0.3.0-nx03-closure` | ✅ |
| NX04 銷貨延伸 | `v0.6.0-nx04-closure` | ✅ |
| NX05 財務 | `v0.7.0-nx05-closure` | ✅（另有 `docs/nx05/spec/intent/` 未追蹤待整理）|
| NX06 物流 | `v0.8.0-nx06-closure` + `v0.9.0-nx06-routing-closure` | ✅（另有 `docs/nx06/spec/intent/nx06-overview.md` 未追蹤）|
| NX07 人資 | `v1.1.0-nx07-closure` | ✅ |
| NX08 報表 | `v1.0.0-nx08-closure` | ✅ |
| NX09 知識中心 | `v1.2.0-nx09-eip-closure` + `v1.5.0-nx09-yaro-feature-closure` | ✅ |
| NX10 員工激勵 | `v1.3.0-nx10-gamification-closure` + `v1.4.0-nx10-social-mission-closure` | ✅ |
| AR 自動補貨 | `v0.4.0-ar-closure` | ✅ |
| USER 主檔 軌 A/C | `v1.6.0-user-master-track-a-closure` / `v1.6.2-user-master-track-c-closure` | ✅ |
| Phase 0 / 1 | `phase0-complete` / `phase1-complete` | ✅ |

> 全 10 模組已各自 closure。**但都是「按模組」時期的產物**，新方向「按 tier 規劃」要核對落差（見 §e）。

---

## b. 分支現況

### 已 merge main、可考慮刪除（53 條）

> 全 NX01~NX10 模組分支、user-master 三軌、auth 系列、Phase 0/1、A 系列 closure 軌、各 task 分支均已 merge。詳見 `git branch --merged main`。

代表性 ✅ 已 merge：
- `feature/nx01-master-complete`（本次 NX01 25 主檔 closure，HEAD `da9f285`，merge commit `1487247`）
- `feature/nx09-yaro-feature` / `feature/nx10-social-mission` / `feature/nx07-hr` ... 各模組主軌
- `feature/task-user-master-iterate-track-a/b/c`
- `feature/a037-isleader-closure` / `a039-department-rename` / `a040-purchase-role-stale-closure` / `a042-old-role-stale-closure` / `a043-a045-leftovers-and-charter`

### 未 merge main（4 條，需新 Hank 判斷）

| 分支 | 狀態 / 建議 |
|------|-------------|
| **`feature/nx01-manual`** ⭐ | NX01 主檔操作手冊（25 檔、2656 行）。**Crown 指示不 merge main**——手冊為交付文件、Crown 另外拉下來做 Word，不進主幹。已 push origin（`cdae26f`）、隨時可取用。新 Hank 不要動。 |
| `feature/nx-ui-v0-mobile-route` | 早期分支（mobile route v0），dormant。Crown 拍「暫不動、等所有任務完開新 task 處理」（G3、2026-04-28）。 |
| `feature/spec-reverse-sw01` | 早期分支（SW01 spec reverse），dormant，同上 G3 拍板。 |
| `feature/wp-phase1-w2-mini` | Phase 1 軌 2（DEMO-02 LITE seed + customer 命名），最後 commit 在 phase1-complete 期間，目前狀態未驗。新 Hank 上線時若用得到再 audit。 |

> 詳細分支表見 `docs/_team/git-state.md` §A.1（2026-05-28 主檔 closure 後已更新 header；§A.1 列表自 2026-05-18 後未完整 full-audit、待後續軌）。

---

## c. 架構債清單（未解）

> 完整定義見 [`docs/_team/system-architecture.md`](system-architecture.md) §G。本檔僅彙整當前**未解** 🟡 / 🔴 條目，便於新 Hank 快速掃過。

### G.2 待修 🟡（system-architecture.md）

| # | 一句話 | 觸發時機 / 計畫 |
|---|--------|----------------|
| A004 | Next.js 16 `middleware` deprecated → 改 `proxy` | 春酒後單獨任務 |
| A005 | `NEXT_PUBLIC_DEMO_MODE` vs `NEXT_PUBLIC_NEXORA_RUN_MODE` 雙 env 混淆 | 春酒後整併 |
| A010 | QT 型別為單料號（每 item 各建一張 QT） | 春酒後評估 |
| A012 | 桌面版銷售中心 7 項無導航卡 | R8 桌面版規劃 |
| A015 | 桌面版 `InventoryCenterHub` orphan | R8 桌面版重構 |
| A021 | `stock-balance.controller` 仍用 `@Roles('ADMIN')` 跟 B2 開放方向不一致 | 留另一 task 評估 |
| A024 | customers-catalog 命名工整連鎖感 | 待 Crown preview 確認 |
| A038 | 既有 `attachment_url` vs NX01-08 軌 3 子表附件範式並存 drift | 各模組獨立 task 處理、舊欄位逐 task 升級 |
| A053 | NX01-08 attachment 下載用 base64 替代 StreamableFile | 真實附件流量增長 OR 整合 Cloudflare R2 時 |
| **A076** ⭐ | 據點/倉庫結構化地址 picker 待接 NX01-04（schema+資料已備、UI 未接） | NX01-04 地址型錄 UI 軌啟動時順手接 site + warehouse 編輯頁；**不阻擋 NX01 closure** |
| **A077** ⭐ | Railway production migration 同步落後 **67 支**（NX02~NX10 全模組）| 對齊 **TASK-RAILWAY-ENV-SPLIT** + **第一個真實客戶簽約前 2~4 週**；在此之前 `packages/db-core/.env` 維持 localhost、不啟用 Railway 連線；`migrate deploy` all-or-nothing 不可只挑 NX01；**不阻擋 NX01 closure** |

### G.3 / G.4（順手清 / 教訓）

- 順手清：A006 / A008 / A009 / A011 / A013（小型死碼 / 命名）
- 教訓：A014（Zustand selector 禁 inline `.filter/.map/.sort`）、A017（push main 前真實 prod build 驗證）

### G.5 觀察（Crown 已知、暫存）

A025（features/nx00 殘留）/ A026（sale vs sales 並存）/ A027（dashboard 新舊路由並存）/ A028（schema.prisma 單檔 3000+ 行）/ A029（apply-checkin-reward 從未建立）

### 後續軌 backlog（worklog 主題 18~20 揭露、未進 G.2）

A057 NX01-10 注音字典資料匯入 / A058 NX01-11 規則編輯 UI / A059 features/nx00→nx01 範式遷移 / A060 NX01-10/12/15 v1.1 注音範圍對齊 / A061 NX01-10 trigger / A063~A071 軌後雜項 / A072 車型反查料件雙向 UI / A073 part 編輯頁適配 section UX / A074 field-definitions.csv 全模組 drift 大掃描 / A075 CLAUDE.md §X 章節錨點 sweep（已處理）

> ⚠️ **A 系列登錄分裂揭露**：system-architecture.md G.2 目前最新編號只到 A053；A054~A077 的條目散在 worklog.md / nx01-summary.md。新 Hank 若要新增 A 系列、建議**仍登在 system-architecture.md G**（canonical 註冊處），順手把 A054~A075 漏網的補回 G section。本次新增 A076 / A077 已直接登在 G.2。

---

## d. NX01 範圍已知待調整

下列為本次 NX01 closure 完成、但仍有後續調整空間之項目（手冊已逐頁標 ⚠️）：

### d.1 業務行為
- **售價 A/B/C/D 計算位置**：目前是**前端**依成本 × 毛利率（A=12% / B=15% / C=18% / D=22%）即時算 + 「依成本重算」按鈕。後端 `part.service` 不自動算、原樣存。**新 Hank 待評估**：是否搬到後端統一算（避免不同前端入口算法漂移）。
- **使用者撤銷職務 / 倉庫**：目前後端是 **soft delete**（`isActive=false` + `revokedAt`）。Crown 需求是 **hard delete**（避免再次指派同一 role 撞 `(userId,roleId)` unique）。前端介面不受影響、僅後端 service 改 `prisma.delete()`。追蹤：`task-user-master-iterate-track-c-merge-verify.md` C3 段。

### d.2 schema 已備、service / UI 未維護
- **倉庫**：`is_main`（主倉旗標）、`manager_user_id`（倉管主管）、結構化地址欄位（city/district/street + 巷弄門牌）schema 都在，但 `warehouse.service` 的 SEL / DTO 完全沒處理。tier 倉數（LITE 1 / PLUS 2 / PRO 6）為**種子配置**、後端**無上限檢查**。
- **倉別 `flowMode`（C/D）**：在 `nx01_warehouse_type` 型錄上、不在倉庫本身；倉庫 service 無相關邏輯。
- **使用者鎖帳號**：`failedLoginCount` / `lockedUntil` 兩欄存在於 `Nx01User` schema，但 `user.service` 完全沒讀寫（鎖定邏輯在 auth 模組）。`mustChangePassword` 旗標**未在 schema 證實**，首次強制改密碼流程由 auth 處理。

### d.3 命名 / 編號待確認（手冊標 ⚠️）
- 頁面代碼：手冊 13 變速箱 / 14 傳動方式 / 15 車體類型 三頁共標 NX01-15；16 據點 / 18 庫位 / 22 幣別 / 21 國家確切 spec 編號待 Alex 補對應。
- 國家代碼新增框 placeholder 仍寫舊兩碼 `TW`、實際資料用 ISO alpha-3（`TWN`），屬 A033 family stale 範例，未阻擋功能。
- `car-brand` 設定檔 `category='車型字典'`、但 hub / 側選單導覽走「產品與料號」——頂列麵包屑顯示 `車型字典`、小不一致。

### d.4 其他揭露
- `brand-code-rule` spec 文件 §3~§5 仍保留 v1.0 舊內文（車品牌 / JSON / 分隔符），文件頂部已聲明被 v1.1 取代；手冊以 schema / service 為準。
- `role-view` service **不寫 audit log**（與其他主檔不同）。
- `parts` 頁的「匯出」目前顯示「尚未開放」、未真正輸出檔案。

---

## e. ⚠️ 重要提醒給接手者（按優先級）

### e.1 路線已轉向「按 tier 規劃」、不再「按模組做」
Crown 即將開新 Hank、從 **LITE 版整體重新規劃**。
- 既有 NX02~NX10 程式碼全部是「按模組做」時期的產物——功能可能跑、但**版本切割（LITE / PLUS / PRO）的一致性沒有逐模組驗過**。
- 新方向上線後，要核對「LITE 版到底打開哪些功能、藏哪些 PLUS / PRO」與既有程式的落差。
- 主檔層的 `minPlan` 設定（master-cards.ts）是目前唯一較完整的 tier 切割，但僅止於前端 hub 卡片可見性、**非後端 security gate**（路由守門待 `TASK-NX99-PLAN-MIDDLEWARE` 軌）。

### e.2 Crown 即將改 `partner_type`（對齊恆迎分類）
- 影響面：NX01 往來對象（主檔本身）+ **NX02 採購 / NX03 銷貨 / NX04 / NX05 / NX08 報表** 至少 5 個模組。
- 現有 `partner_type` 選項已是 Crown 2026-05-26 拍板版（客戶 C / 供應商 S / 運輸商 T / 廠商 V / 銀行 B / 客戶兼供應商 BOTH + 舊碼 CUST / SUP），但即將再調以對齊恆迎業界分類。
- 動之前先 grep 全 repo `partner_type` 使用點、列影響清單給 Crown 拍。

### e.3 Railway production 還是落後 67 支 migration（A077）
- `.env` 維持 localhost、**不要碰 Railway**。
- 觸發時機：對齊 `TASK-RAILWAY-ENV-SPLIT` + **首位真實客戶簽約前 2~4 週**。
- `prisma migrate deploy` 是 all-or-nothing、會一次套 NX02~NX10 全部 67 支；不可只挑 NX01。

---

## 給新 Hank 的起手三步

1. **讀 `docs/PROJECT_RULES.md`**（規範合一手冊、§0.4 公司範式 + Part I + Part III 必讀）+ **本檔**。
2. **`git log --oneline -20`** + **`git tag`** 看最近進度與 closure tag。
3. **跑一次 `pnpm dev`**（localhost:5433 + Next.js + Nest）驗證本機環境，再開新軌。

---

## 工作區 / 未追蹤檔備註

下列 3 個檔案在 main 上未追蹤（舊 Hank **未動、未提交**），留給新 Hank 判斷：

- `docs/_team/NEXORA_PROJECT_AUDIT_2026-05-26.md` — Crown 自製 / Alex 自製的 audit 文件、屬參考性質
- `docs/nx05/spec/intent/` — NX05 spec intent 新加（多檔）、需 Alex 確認是否定稿
- `docs/nx06/spec/intent/nx06-overview.md` — NX06 spec overview 新加、同上

> 三檔均在 `git status` 顯示為 untracked，本檔 commit **不**含這些檔。新 Hank 上線後請先跟 Alex 確認再決定 commit 或捨棄。

---

> 封存完畢。`feature/nx01-manual` 已 push origin、不 merge main；NX01 closure tag `v1.0-nx01-closure` 已 push。
> 舊 Hank 簽出。
