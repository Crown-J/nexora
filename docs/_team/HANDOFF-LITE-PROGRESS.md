<!-- docs/_team/HANDOFF-LITE-PROGRESS.md -->

# NEXORA — Hank 中段交接（LITE 階段 2 開工前）

> 撰寫者：Hank（Claude Code、2026-05-28 接 舊 Hank 班的這位）
> 撰寫時間：2026-05-28
> 對應 main HEAD：`1b41db5`（[GIT-STATE] TASK-NX00-CLEANUP closure）
> 接班對象：下一個 Hank（Claude Code）
> 觸發原因：對話視窗將滿、Crown 拍板「庫存開工前主動交接、避免做到一半斷線」
>
> ⚠️ 新 Hank 起手讀順序：
> 1. **本檔**（最新進度 + 下一個任務指令）
> 2. [docs/_team/HANDOFF.md](HANDOFF.md)（上一輪舊 Hank 封存交棒、瞭解路線轉向背景）
> 3. [docs/PROJECT_RULES.md](../PROJECT_RULES.md) §0.4 + Part I + Part III
> 4. [docs/_team/git-state.md](git-state.md)（current main / branch / tag 狀態）

---

## 1. 路線總綱

### 1.1 開發路線（2026-05-28 Crown 拍板）

NEXORA 改「**按 tier 開發**」：先把 **LITE 完整可賣**、再 PLUS、再 PRO。
不再按模組 (NX01→NX02→...) 順序、改按客戶價值順序。

**LITE 藍圖文件**：[memory: project_lite_blueprint.md](../../C--NEXORA/memory/project_lite_blueprint.md)（Alex 2026-05-28 寫）

**LITE 五大模組順序（固定）**：
1. ✅ 階段 0 partner 改制（前置、tag `v1.1.0-partner-six-classes-closure`）
2. ✅ 階段 1 進貨 NX02（tag `v1.2.0-nx02-purchase-lite-closure`）
3. 🟡 **階段 2 庫存 NX03**（← 下一個、本檔的主任務）
4. ⏸️ 階段 3 銷貨 NX04
5. ⏸️ 階段 4 財務 NX05
6. ⏸️ 階段 5 報表 NX08

### 1.2 Crown 授權邊界（重要）

| 項目 | 授權 |
|------|------|
| migration（dev DB） | ✅ 自走 |
| git push（main + feature） | ✅ 自走 |
| merge to main (`--no-ff`) | ✅ 自走 |
| tag closure | ✅ 自走 |
| commit 大小決定 | ✅ 自走（漸進式 Step-by-Step） |
| Railway production migration | ❌ **不動**（A077、累計落後 89 支、真實客戶簽約前 2~4 週才同步） |
| `.env` localhost | ❌ 不改 |
| 中間驗證 | ❌ **Crown 不做**（瀏覽器測 AI 做不到、跳過、記操作手冊、Crown 最後親測） |
| 不確定的方向 | ⚠️ 標 ⚠️ 回報 Alex 拍板、別擅自決定 |

### 1.3 收尾範式（每模組必跑）

對齊階段 1 NX02 範本：
1. **自動化驗證**：`prisma migrate status` + `nx-api build` + `nx-ui build` + 三租戶 seed 重跑
2. **操作手冊**：`docs/_team/nxXX-{module}-operation-manual.md`（每功能：路徑 / 步驟 / 預期結果 / Crown 親測 checklist / Follow-up 列誠實）
3. **closure**：commit 完整 → merge `--no-ff` main → tag `vX.Y.Z-nxXX-{module}-lite-closure` → push main + tag → 更新 `docs/_team/git-state.md` → commit + push git-state

---

## 2. 已完成階段

### 2.1 階段 0 — partner 改制 ✅

- **Tag**：`v1.1.0-partner-six-classes-closure`（沿襲、實際 closure commit 在 `4938dd0` 之前 merge）
- **六分類**：`C` 保養廠 / `O` 同行 / `S` 供應商 / `T` 外包物流 / `B` 銀行 / `V` 一般廠商
- **同行特殊**：用獨立代號 `O` + `canTransferStock` 旗標（service create 自動帶 true）
- **客戶選單**：`partner_type IN ('C','O')` — 同行也買貨
- **供應商選單**：`partner_type='S'` only
- **調貨對象**：`partner_type='O' OR canTransferStock=true`
- **詳見**：memory `project_partner_six_classes_closure.md`

### 2.2 階段 1 — 進貨 NX02 ✅

- **Tag**：`v1.2.0-nx02-purchase-lite-closure`、merge `9bf8419`
- **14 commits 整軌**（M1 schema → M6 操作手冊）
- **核心交付**：
  - 詢價單（產生詢價文字 + 多家並排比價 + 採用建 PO）
  - 採購單 / 進貨單（驗收 + 移動平均成本）
  - 國外進貨（匯率鎖定 + 費用按金額比例攤分）
  - 退貨單 + 自動 AP 沖銷
  - 保固申請單（兩型 / 5 階段 / 4 結果 / base64 附件）
  - 客套話設定（per-tenant）
  - 供應商等級重算（A/NET90 → B/NET60 → C/NET30 → D/PREPAY）
  - 產品定價重算（cost × (1+marginPct)、fallback A=12%/B=15%/C=18%/D=22%）
- **業務分流**（看 commit message + 操作手冊）：
  - **rfqType=G 一般詢價** → adoptQt 建 **PO**
  - **rfqType=P 同行調貨** → adoptQt 建 **TI**（D4 stub、需 sourceSoItemId）
- **操作手冊**：[docs/\_team/nx02-purchase-operation-manual.md](nx02-purchase-operation-manual.md)（13 章節 + Crown 親測 checklist）
- **詳見**：memory `project_nx02_purchase_lite_closure.md`

### 2.3 NX00 命名清理 ✅

- **Tag**：`nx00-cleanup-complete`、merge `7dc3b6d`
- **Phase 1**：rm 32 個死碼（user/user-role full module + 6 module dormant UI/hooks/meta）
- **Phase 2**：搬家 + sed sweep
  - `features/nx00/*` → **`features/shared/master/*`**（9 active modules：brand/car-brand/location/lookup/part/partner/role/role-view/warehouse）
  - `features/base/nx00-*` → 去 `nx00-` 前綴（3 個）
  - `menu.nx00.ts` → `menu.base.ts`
  - `nx00_access_token` → `access_token`（⚠️ user 下次需重新登入）
  - `nxapi_nx00_*` → `nxapi_*`
- **結果**：`grep "nx00" apps/`（排除 .next）= **0 殘留**、build 全綠
- **副作用**：舊 bookmark `/dashboard/nx00*` 從此 404（redirect rules 刪除）
- **詳見**：memory `project_nx00_cleanup_closure.md`

### 2.4 main HEAD 對齊

| 項目 | 值 |
|------|----|
| main HEAD | `1b41db5`（[GIT-STATE] TASK-NX00-CLEANUP closure） |
| 最新業務 tag | `nx00-cleanup-complete` → `7dc3b6d` |
| 上一輪 closure | `v1.2.0-nx02-purchase-lite-closure` → `9bf8419` |
| origin/main | 同步 |

---

## 3. 兩個跨模組共用框架 ⭐（後續模組直接套）

階段 1 進貨意外帶出兩個 framework、所有 LITE 模組都會用：

### 3.1 nx98 共享待辦池

- **位置**：`apps/nx-api/src/nx98/task-pool/` + `apps/nx-ui/src/features/nx98/`
- **資料表**：`Nx98TaskPool`（schema.prisma、含 sourceModule + sourceDocType + sourceDocId 三軸軟連結、不建 FK）
- **三大視圖**：「我的待辦」/「部門池」/「指派他人」
- **領取機制**：unassigned → claimedByUserId（claim API）
- **跨模組接點**：各業務 service 寫入 task-pool（如「保固單建立 → 寫待辦給技術員」）
- **後續模組做法**：直接呼叫 `taskPoolService.create({ sourceModule:'nx03', sourceDocType:'stock-take', ... })` 即可

### 3.2 features/shared/tiered-form 三層欄位

- **位置**：`apps/nx-ui/src/features/shared/tiered-form/`
- **三層**：
  - 🟢 **必要**（核心欄位、永遠顯示）
  - 🟡 **建議**（業務常用、Alt+L 第二段展開）
  - ⚪ **進階**（罕用、Alt+L 第三段展開）
- **API**：`<TieredFormProvider>` + `<TieredField tier="lite|expanded|all">{...}</TieredField>` + `<TieredFormToolbar />`
- **快捷鍵**：Alt+L 三段循環切換
- **後續模組做法**：表單外包 Provider、欄位 wrap TieredField、頂部放 Toolbar

---

## 4. Follow-up 押後清單（不影響核心測試、之後分批清）

階段 1 closure 時留下的、可在任何時機補：

| 編號 | 項目 | 預估 |
|------|------|------|
| FU-01 | RFQ / PO / PR / Part / Partner form 三層欄位 retrofit | 中（單模組 1~2 commit） |
| FU-02 | 各既有 UI「空畫面 / 全鍵盤 / Alt+L/T」audit | 中 |
| FU-03 | 保固附件 download 功能（目前只能 upload）| 小 |
| FU-04 | 保固「客訴型」`sourceSoId` picker（待 NX04 SO 出來才能做） | ⏸️ blocked by 階段 3 |
| FU-05 | 待辦池業務模組自動 trigger（例：保固建立 → auto 寫待辦）| 中 |
| FU-06 | 待辦池 RBAC enforce（目前任何 user 可 claim）| 中 |
| FU-07 | 待辦池 detail page（目前只有 list、點開沒頁面）| 中 |
| FU-08 | 待辦池 realtime（目前要 refresh）| 大、PLUS |
| FU-09 | NX02 hub `/dashboard/purchase/*` 舊路由整理 | 小 |

⚠️ FU-04 是 blocked by 階段 3（SO 主檔）、其他可隨時做。

---

## 5. 下一個任務 ⭐ — 階段 2 庫存（NX03）

### 5.1 需求總綱（Crown 2026-05-28 定案）

**定位**：倉管（CD 主力 / EF 協助）工作台。
入出庫不在這獨立做（進貨銷貨自動）、管：**查詢 + 盤點 + 庫位 + 異常**。

**五大功能**：
1. **盤點作業**（多頻率：日/週/隔週/季/年 × 多範圍：族群/區域 × 動態盤點 + 自動補貨通知 + 差異核可 + 原因記錄）
2. **庫位維護**（既有 Nx01Location 已有）
3. **產品維護**（最高量倉管設 + 預設庫位 + 安全量採購已做）
4. **異常回報**（5 類整合一張表、跨模組共用入口）
5. **庫存查詢**（料號 / 庫位 / 倉庫三維度）

### 5.2 落差盤點重點（給新 Hank 直接看結論）

**🟢 既有可用（不動）**：
- `Nx03StockBalance` 庫存現況、`Nx03StockLedger` 帳冊（per warehouse 維度完整）
- `Nx03StockTake + Item` 盤點單（⭐ **動態盤點 schema + service 已完整**、五軸 snapshotQty/deltaQty/formulaExpectedQty/countedQty/realDiffQty、`stocktake.service.ts:37-69, 157-184, 462-489` ledger aggregate 已實作）
- `Nx03PartStockSetting` 含 `minQty`（安全量、採購用）+ **`maxQty`（最高量、已有）**
- `Nx01Location` 庫位主檔（NX01 closure 已做）

**🔴 需補（Crown 三大拍板已定）**：

| # | Crown 拍板 | 落差 |
|---|-----------|------|
| A | **異常回報**：方案 A 獨立新表（入口 → 5 處置分流：退貨/保固/重組/分解/報廢） | 🔴 新建 `Nx03IssueReport` 表 |
| B | **庫位維度查詢**：方案 C 純從 ledger aggregate、不改 balance 結構 | 🔴 新增 query endpoint（無 schema 改動）|
| C | **自動補貨**：用 nx98 task-pool 統一入口、舊 `Nx03AutoReplenish` 表廢棄 | 🔴 task-pool 串接 + AutoReplenish 表廢用（不刪、只標 deprecated） |
| D | **盤點差異核可**：小門檻倉管自過、超過 G 簽核 | 🔴 補 `smallToleranceQty` / `approvalStatus` / `approverUserId` / `approvedAt` 4 欄位 |
| E | **盤點差異原因** enum | 🔴 補 `varianceReasonCode` enum（被偷/算錯/破損/不明）|
| F | **預設庫位** | 🔴 補 `Nx03PartStockSetting.defaultLocationId` 1 欄位 |
| G | **重組 / 分解 完整做** | ⭐ Crown 拍板「不延後、本軌做」、接既有 `Nx03Conversion + Input + Output` schema |
| H | **盤點 → nx98 補貨通知**（POSTED 後自動產生待辦） | 🔴 service 串 task-pool |
| I | **safety ≤ max 警示**（LITE 提示即可） | 🟡 service 層 warning |

**🟡 既有可用、需 UI**：
- `Nx03Disposal` 報廢單 schema + service 完整、缺 UI
- `Nx03Conversion + Input + Output` 組裝轉換 schema 已有、缺 service + UI（重組分解本軌做）

**🔴 前端 UI 幾乎空白**：
- `apps/nx-ui/src/features/nx03/` 只有 sales/ + workflow/（銷貨相關、非庫存）
- `/dashboard/nx03/workspace` 是 placeholder
- **需建：盤點工作台 / 庫存查詢三維度 / 異常回報 / 產品設定 / 庫位設定**

### 5.3 預估規模

對齊 NX02 範式、**約 14~20 commits**：
- **M1 schema**：5~7 欄位 + 1 新表（IssueReport）+ 1 migration
- **M2 backend**：盤點 task-pool 串接、IssueReport CRUD、stock-balance per-location aggregate query、PartStockSetting + Conversion service
- **M3 frontend**：5 大工作台（盤點 / 查詢 / 異常 / 產品設定 / 庫位設定）+ Disposal/Conversion UI
- **M4 整合**：safety/max warning、Inbound/Outbound 角色確認、AutoReplenish 廢用
- **M5 操作手冊** + **M6 closure**

### 5.4 Inbound/Outbound 角色（已釐清）

| 表 | 結論 |
|----|------|
| `Nx03Inbound` | 業務 caller = 0、進貨入庫**不經此表**、直接 `applyQtyInWithLedger`。保留為「手工過帳憑證」、本軌**不主動開 UI** |
| `Nx03Outbound` | 業務 caller = 0、預留銷貨接點。階段 3 銷貨才決定是否啟用 |

Crown 拍板：保留結構不廢棄、本軌不動。

### 5.5 分支策略

- 新分支：`feature/nx03-stock-lite`
- 從 main `1b41db5` 開
- 對齊 NX02 範式 Step-by-Step commit

---

## 6. 紀律（Crown 範式 / PROJECT_RULES §0.4）

| 規則 | 操作 |
|------|------|
| 對 Crown 回報 | 員工口吻、不帶內部術語 / 編號 |
| 範圍超出 | 可直接做 + 事後回報（危險命令除外） |
| worklog | ⛔ 不寫（改 commit 訊息）|
| merge-verify | ⛔ 不獨立文件（merge commit 訊息詳列）|
| 漸進式重構 | Step 完成即 commit、等核可才下一步（但 Crown 全權授權後可連續做、做好紀錄） |
| 技術債順手清 | 滿足三條件（不改外部行為 + commit 標 + 回報列）可不問清掉 |
| 不確定方向 | 標 ⚠️ 回報 Alex、別擅自決定 |
| 系統不刪資料 | 所有 master「D 刪除」實為軟刪（`isActive=false`）、UI 顯示「停用」+ `PowerOff` icon |
| 新建 / 修改檔案第一行 | 必須是路徑註解（`// apps/nx-api/src/...`） |
| 回覆語言 | 一律繁體中文 |

---

## 7. 環境提醒

### 7.1 工具鏈

- **Prisma 7**：`migrate dev` / `migrate reset` **不會**自動跑 seed（v6 才會）。新環境要手動跑：
  ```bash
  pnpm db:seed   # 三租戶 LITE/PLUS/PRO 開通
  ```
- **GitHub CLI（`gh`）沒裝**：**PR 要 Crown 手動開**。Hank 只 push branch + 給 PR title + body 模板讓 Crown 貼。
- **shell**：Windows PowerShell + Bash 都可用、`Bash` tool 處理 sed/find/grep（dist 是 gitignored、build 產物無關 source 殘留）
- **pnpm workspaces**：根目錄 `pnpm` 跑全套；單包用 `pnpm --filter <pkg>`

### 7.2 三租戶 seed 狀態

| Tier | tenantId | 狀態 |
|------|----------|------|
| LITE | `NX99TANT9900001` | 空殼（admin + 系統範本、無假業務資料） |
| PLUS | `NX99TANT9900002` | 空殼 |
| PRO | `NX99TANT9900003` | 空殼 |

Crown 自己放真實業務資料測（部分模組）、其他模組 Crown 依操作手冊親測。

### 7.3 schema migration 累計

- dev DB：**89 migrations applied**、`migrate status` up to date
- Railway production：**累計落後 89 支**（A077、`.env` 維持 localhost、真實客戶簽約前 2~4 週才同步、本軌不動）

### 7.4 公司範式（PROJECT_RULES §0.4）

- **Crown** = 總經理（創辦人）
- **Alex** = 專案經理 PM（AI）
- **Hank** = 工程師（AI、Cursor IDE / Claude Code 載體、就是接班的你）
- 對 Crown 用一般員工口吻、不要說「Hank」「Alex」內部術語、用「我」「PM」即可

---

## 8. 新 Hank 起手 checklist

接班第一件事跑：

```bash
git log --oneline -10              # 看最近進度
git status                         # 確認工作區乾淨
git tag | grep -E "(nx00|nx02|partner)" # 看 closure tag
cat docs/_team/HANDOFF-LITE-PROGRESS.md # 讀本檔
cat docs/_team/git-state.md             # 對齊 main / branch / tag
```

然後跟 Alex 確認「庫存階段 2 開工、本檔 §5 三大拍板對齊、開 `feature/nx03-stock-lite`」。

---

## 9. 相關文件索引

| 文件 | 用途 |
|------|------|
| [HANDOFF.md](HANDOFF.md) | 上一輪舊 Hank 封存交棒（瞭解路線轉向）|
| [git-state.md](git-state.md) | 當前 main / branch / tag 狀態（每 closure 更新）|
| [nx02-purchase-operation-manual.md](nx02-purchase-operation-manual.md) | NX02 進貨操作手冊（Crown 親測用、本軌交付範本）|
| `../PROJECT_RULES.md` | 規範合一手冊（§0.4 + Part I + Part III Hank 段必讀）|
| `../PROJECT_CONTEXT.md` | 業務介紹（Yaro / 恆迎 / 三人團隊）|
| memory `project_lite_blueprint.md` | LITE 藍圖（Alex 2026-05-28 寫的五階段路線）|
| memory `project_nx02_purchase_lite_closure.md` | NX02 closure 摘要 + 業務規則 |
| memory `project_nx00_cleanup_closure.md` | NX00 命名清理 closure |
| memory `project_partner_six_classes_closure.md` | partner 六分類 closure |

---

> 收尾：交棒完成、main 工作區乾淨。
> 新 Hank：直接讀 §5 進階段 2 庫存（NX03）開工。
> Crown / Alex：等新 Hank 起手確認、給開工指令。
