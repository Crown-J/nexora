<!-- docs/_team/worklog.md -->

# NEXORA - SHARED - 跨模組工作日誌

> 撰寫者：Hank
> 涵蓋範圍：跨模組統合主題（不屬單一模組、需多模組視角）+ 累計範式總表（NX01~NX10 全模組）+ 工程文化範式（Phase 1 doc-restructure 累積）
> 起算點：v7_baseline migration（2026-04-13）之後
> 對應分支：歷史散在多 feature branch、Phase 1 doc-restructure 收官（`feature/wp-phase1-doc-restructure`）

---

## 結構說明

- 按主題（不按時間順序）累加 8 個跨模組主題、給 Alex 跨對話讀的考古手冊
- 每個主題下：起源 / 跨模組視角 or 配對 / 各模組連結對照表 / 統合教訓 / 對應文件
- ⚠️ **本日誌是「集大成統合」性質**（Phase 1 收官、模組 worklog 10/10 完成後）：
  - **不重述模組 worklog 內細節**、只統合「跨模組怎麼配合」+ 連結各 nxXX-worklog 對應主題
  - **末尾累計範式總表**沿用 [NX10 worklog](../nx10/nx10-worklog.md) 末尾結構（7 分類）+ 新增 **第 8 分類「工程文化範式」**（Phase 1 累積 5 條）
- 模組視角差異 + 範式集大成 = _shared 獨有價值（個別 worklog 看不到）

---

## 主題 1｜D3 雙帳資料模型 + D4 SYS-C Translator 跨模組視角總覽

### 起源

D3+D4 是 Phase 0 開幕（2026-04-25）核心 task、由 NX04 主導、但**跨 3 個模組落地**（NX02 採購 / NX03 庫存 / NX04 銷售）。NX04 worklog 主題 3+4 已完整寫 D3 設計 + D4 邏輯（5 小節 3A~3E + 4A~4E）、本主題的 _shared 獨有價值是「**3 個模組從各自視角看同一個 D3/D4 設計**」。

### 1A. NX02 採購視角：D3 帶來「調貨鏈」

D3 子帳 type='G'（同行調貨）觸發採購側兩個 schema 變動：

1. **nx02_qt 拆表**（從 nx02_rfq 拆出）
   - 業務本質：一張 RFQ 可對應 N 張 QT（多家供應商各自報價）
   - migration：`20260425100300_phase0_b5_nx02_qt`
   - 詳見：[NX02 主題 5](../nx02/nx02-worklog.md#主題-5b5-rfqqt-api--demo-02-nx02-schema-widening-phase-0-收官2026-04-25-28)

2. **nx02_rfq.source_so_item_id 反查**
   - 業務本質：「這張 RFQ 是給哪個 SO line 調貨的？」要可回溯
   - migration：`20260427014134_phase0_b5_rfq_source_so_item`

**採購側看 D3 = 多了一條「SO line → RFQ → QT → PO → RR」調貨業務鏈**。傳統採購流程沒有「源頭可回溯到銷貨單」的概念、D3 把這條鏈打通。

### 1B. NX03 庫存視角：D3 帶來「調撥鏈」+ nullable 妥協

D3 子帳 type='T'（公司內倉間調撥）觸發庫存側 schema 變動：

- **nx03_st_item.source_so_item_id NULLABLE**
  - 業務本質：D4 Translator stub 階段先建 IT 調撥單、SO line 還沒對應上、需 nullable
  - migration：`20260425100200_phase0_st_item_source_so_nullable`（NOT NULL → nullable）
  - 詳見：[NX03 主題 1](../nx03/nx03-worklog.md) Migration 列表

**庫存側看 D3 = 多了一條「SO 子帳 type=T → ST 調撥單 → 移倉」鏈、nullable 是 D4 推進過程的妥協**（不是設計初衷、是業務需要先建單後 wire）。

### 1C. NX04 銷售視角：D3 主導模組（連結完整版）

NX04 是 D3 主導模組、主帳子帳設計 + 4 個 PostgreSQL triggers + C-strategy 兩階段 migration 都在 NX04 控制下。**完整版見 [NX04 主題 3](../nx04/nx04-worklog.md#主題-3d3-雙帳資料模型2026-04-25phase-0-開幕nx04-主導跨模組-核心)**、本日誌不重述。

### 1D. D4 Translator 的「跨模組補單」機制

D4 SYS-C Translator 是 NX04 內子目錄（`apps/nx-api/src/nx04/so/translator/`）、但**運作時會跨模組「補單」**：

| 情境 | 主帳 | 子帳 type | D4 補單跨模組對象 |
|------|------|----------|-----------------|
| A | SO | S（本倉現貨）| 無補單、純 NX03 扣帳 |
| B | SO | T（調撥）| 補 **NX03 ST 調撥單** |
| C | SO | G（同行調貨）| 補 **NX02 RFQ + QT** |
| D | SO | B（缺貨採購）| 補 **NX02 PO + RR**（依採購流程）|

**Translator = 「業務寫一張 SO、系統自動展開為跨模組 N 張單」**。NX04 主題 4 寫了完整邏輯、本日誌只標明跨模組補單性質、不重述實作。

### 跨模組教訓

- **「跨模組補單」是 D4 獨有設計、傳統 ERP 業務模組各自獨立、D4 是 NEXORA 跟傳統 ERP 最大差異點**
- **D3/D4 落地需要 3 個模組同步 schema 改動**：NX02 拆 qt + 加 source_so_item_id / NX03 改 nullable / NX04 加 type + transferStatus + triggers — 跨模組同源歷史債清理範式（Hank 拍 Alex 推、Crown 拍即可）
- **「stub 階段」設計妥協**（NX03 nullable）：D4 推進需要先建單後 wire、schema 必須容許中間狀態。教訓：**新業務鏈落地時、先檢查中間狀態 schema 約束**

### 對應文件

- 規格：[docs/nx04/spec/intent/so-data-model-intent.md](../nx04/spec/intent/so-data-model-intent.md) / [d3-impl_so-schema.md](../nx04/spec/impl/d3-impl_so-schema.md) / [d3-trigger.md](../nx04/spec/impl/d3-trigger.md) / [d4-impl_translator.md](../nx04/spec/impl/d4-impl_translator.md)
- 模組視角：[NX02 主題 5](../nx02/nx02-worklog.md) / [NX03 主題 1](../nx03/nx03-worklog.md) / [NX04 主題 3+4](../nx04/nx04-worklog.md)
- 系統架構：[system-architecture.md §B.2~B.3](team/system-architecture.md)

---

## 主題 2｜A002 schema drift 統合（跨 4 模組）

### 起源

A002 是 v6 historical drift 的跨模組統合：DB 存單字元、schema / 業務 token 改字串、**靜默 mismatch**（沒撞 error、但 query 比對失敗）。各模組 worklog migration 列表帶過、_shared 統合「8 處 drift 全貌」。

### 跨模組分布

| migration | 影響模組 | drift 內容 |
|-----------|---------|-----------|
| `20260421152710_fix_schema_drift`（DRIFT-FIX-01）| NX01 / NX02 / NX07 / NX08 | 8 處 drift 一次性收斂 |

8 處 drift 主要分兩類：

1. **狀態欄位 default mismatch**（4 處）
   - **NX07 status**：DB 存 `'N'/'P'/'D'`、API token `'NORMAL'/'POSTED'/'DRAFT'` — 詳見 [NX07 主題 1](../nx07/nx07-worklog.md)
   - **NX08 nx08_monthly_report.status**：default mismatch — 詳見 [NX08 主題 1](../nx08/nx08-worklog.md)
   - 其他 2 處：跨模組同模式（DB 單字元 / API token）

2. **Index 漏寫**（4 處）
   - 業務查詢必加 `WHERE tenant_id = :tenantId`、但 4 個業務表沒對應 index → query plan 退化全表掃
   - 詳見 migration SQL（`20260421152710_fix_schema_drift` 含 4 個 `CREATE INDEX`）

### 跨模組教訓

- **A002 是 v6 → v7 schema 演進過程的歷史殘跡**：v7_baseline 改了狀態 ENUM token、但沒同步更新 default + 沒補 index、形成「schema vs DB vs API」三方 drift
- **靜默 mismatch 比 loud error 更危險**：query 不報錯、業務 logic 全錯
- **跨模組 drift 一次性收斂比逐模組修更省**：DRIFT-FIX-01 一個 migration 修 8 處、不分 8 個 commit

### 對應文件

- migration：`packages/db-core/prisma/migrations/20260421152710_fix_schema_drift/`
- 各模組 migration 列表：[NX01 主題 1](../nx01/nx01-worklog.md) / [NX02 主題 1](../nx02/nx02-worklog.md) / [NX07 主題 1](../nx07/nx07-worklog.md) / [NX08 主題 1](../nx08/nx08-worklog.md)
- 系統架構：[system-architecture.md §G.1](team/system-architecture.md)（A002 已解決條目）

---

## 主題 3｜過帳通用規則統合（跨 4 模組）

### 起源

過帳是「業務動作 → 寫 stock_ledger / paylog」的物理約束。CLAUDE.md §九 是**工程規範**、本日誌是**各模組實作位置 + 跨模組踩坑統合**。

### 跨模組實作位置

| 模組 | 實作位置 | 觸發點 | sourceModule / sourceDocType |
|------|---------|--------|------------------------------|
| NX02 | `apps/nx-api/src/nx02/rr/rr.service.ts` | RR POSTED | NX02 / I |
| NX02 | `apps/nx-api/src/nx02/purchase-return/...` | PR POSTED | NX02 / R |
| NX03 | `apps/nx-api/src/shared/nx03/nx03-inventory.ts`（核心 helper）| inbound POSTED / outbound SHIPPED / stocktake POSTED / transfer RECEIVED | NX03 / I,O,T,X |
| NX04 | `apps/nx-api/src/nx04/so/so.service.ts` | SO SHIPPED | NX04 / S |
| NX05 | `apps/nx-api/src/shared/nx05/nx05-paylog-posting.ts` | paylog CR/CP POSTED + VOIDED 沖回 | NX05 / P, V |

⭐ **NX03 抽 `nx03-inventory.ts` 是跨模組統合點**：所有庫存過帳（NX02 入庫 / NX04 出庫 / NX03 自身）都呼叫這個 helper、不重複實作。

### 跨模組踩坑（多模組共同）

1. **必須單一 transaction**：第一版多模組都踩過「先 update header.status、再用另一個 client 寫 ledger」、結果 status 寫了但 ledger 沒寫、庫存對不上
2. **balance + ledger 同步寫是物理約束**：分開寫不可能對齊、必須 `prisma.$transaction(async (tx) => { ... })` 內完成
3. **移動平均成本入庫公式**：`新均價 = (舊qty × 舊avg + qty_in × unit_cost) / (舊qty + qty_in)`、出庫均價不變
4. **stock_ledger.source\* 是跨模組反查的關鍵**：未來查 ledger 反推「這筆異動是哪個業務動作造成」、不需 join 多表

### 跨模組對偶設計（NX05 paylog 跟 NX03 stock 對比）

| 維度 | NX03 stock 過帳 | NX05 paylog 過帳 |
|------|----------------|------------------|
| 業務本質 | 物理操作（實體貨）| 數字操作（金額帳）|
| 沖回設計 | 不可逆、開反向業務單（SR/IB）| VOIDED 直接狀態變、開反向 paylog |
| Audit trail | 跨表審計（原單 + 反向業務單）| 雙紀錄保留（原 paylog + 反向 paylog）|

詳細對比見 [NX05 主題 3](../nx05/nx05-worklog.md#主題-3paylog-過帳邏輯crcp--voided-沖回)。

### 對應文件

- 工程規範：[CLAUDE.md §九](../../CLAUDE.md)
- 各模組實作：[NX02 主題 1](../nx02/nx02-worklog.md) / [NX03 主題 1](../nx03/nx03-worklog.md) / [NX04 主題 1](../nx04/nx04-worklog.md) / [NX05 主題 3](../nx05/nx05-worklog.md)

---

## 主題 4｜公版 component（DocLayout 等 6 個、跨 NX02/NX04 demo 用）

### 起源

TASK-0421（2026-04-21、5 張 demo 單據）首次抽出公版 component、跨 NX02 三張（RF/PO/RR）+ NX04 兩張（QT/SO）共 5 張單據共用。本日誌統合「6 個公版 component 全貌」+ 各模組用法對照、避免 NX02 / NX04 worklog 各自寫一遍重複。

### 6 個公版 component

| Component | 用途 | 位置 |
|-----------|------|------|
| `DocLayout` | 單據頁版型骨架（Header + Tabs + Body）| `apps/nx-ui/src/shared/ui/doc/` |
| `DocListView` | 列表頁（filter + table + pagination）| 同上 |
| `DocDetailView` | 詳細頁（Header + ItemTable + Footer）| 同上 |
| `DocHeader` | 表頭（單號 / 日期 / 狀態 / 客供商）| 同上 |
| `DocItemTable` | 明細表（鍵盤導向、多列輸入）| 同上 |
| `docStatus` | 狀態 badge（DRAFT / POSTED / VOIDED 等）| 同上 |

### 跨模組使用對照

| 模組 | 單據 | FUNCTION_CODE | 詳見 |
|------|------|--------------|------|
| NX02 | RFQ | `NX02-RFQ-UI-001-F01` | [NX02 主題 3](../nx02/nx02-worklog.md#主題-3task-0421-五單據-demonx02-三張rf--po--rr) |
| NX02 | PO | `NX02-PO-UI-002-F01` | 同上 |
| NX02 | RR | `NX02-RR-UI-001-F01` | 同上 |
| NX04 | QT | `NX04-QT-UI-001-F01` | [NX04 主題 7](../nx04/nx04-worklog.md#主題-7task-0421-兩張-demo-單據qt--so-短主題) |
| NX04 | SO | `NX04-SO-UI-001-F01` | 同上 |

### 跨模組踩坑

- **第一版「太通用」反而難用**：DocItemTable 想 props 全配置（renderCell / inputClassName / disableRowDelete / ...）、結果三張單據用法都不同、每張傳 10+ props、可讀性比不抽象還差。後來收窄成「2~3 個必要 prop + barrel 匯出 + 單據自己 wrapper」
- **mock data 命名跟 schema 對齊很重要**：第一版亂取（`供應商 / 金額`）、後來接 API 全要重命名（`partnerId / totalAmount`）
- **「3 個相似實作是抽象最佳時機」首次驗證**：NX02 三張 RF/PO/RR 是抽象最佳輸入、不是憑空想配置（沿用後來成為「抽象判準 ≥3 + 相似度高」範式 — 見累計範式總表）

### 對應文件

- DEMO 路徑短網址 redirect：[apps/nx-ui/next.config.ts](../../apps/nx-ui/next.config.ts)
- 各模組用法：[NX02 主題 3](../nx02/nx02-worklog.md) / [NX04 主題 7](../nx04/nx04-worklog.md)

---

## 主題 5｜TASK-BUSINESS-RESTRUCTURE 大塊 2 跨中心連動（SO→PK→BX→DN）

### 起源

TASK-BUSINESS-RESTRUCTURE 分 3 大塊：
- **大塊 1**：純 NX04 業務 SOP 重構 — [NX04 主題 6](../nx04/nx04-worklog.md#主題-6task-business-restructure-大塊-1-業務-sop-重構2026-04-23)
- **大塊 2**：**跨 3 模組（NX02/NX04/NX06）SO→PK→BX→DN 跨中心連動** — _shared 統合（本主題）
- **大塊 3**：純 NX03 庫存中心 4 分區 — [NX03 主題 3](../nx03/nx03-worklog.md#主題-3task-business-restructure-大塊-3-庫存中心-4-分區重構2026-04-23)

大塊 2 是「**一筆銷貨在不同中心的 5 張單據連動**」、本日誌統合。

### 跨中心連動 4 段業務鏈

```
業務輸入                     倉管處理                       物流處理         財務處理
    │                            │                              │                │
    ▼                            ▼                              ▼                ▼
   SO    ────────────────►    PK   ────────►    BX   ────►    DN    ────►    AR
（銷貨中心、NX04）   （庫存中心、NX03）   （庫存中心、NX03）   （物流中心、NX06） （財務、NX05）

共用流水號：
  SO-202604-Z01-00061
  PK-202604-Z01-00061
  BX-202604-Z01-00061
  DN-202604-Z01-00061
  AR-202604-Z01-00061
```

### 跨中心 helper 統合

| 動作 | 觸發模組 | 接收側 | helper |
|------|---------|--------|--------|
| SO SHIPPED → 自動建 PK 撿貨單 | NX04 | NX03 | （需 audit、可能 trigger 在 D3 內已實作）|
| PK COMPLETED → 自動建 BX 包裹 | NX03 | NX03 | （NX03 內部）|
| BX 完成 → 自動建 DN 送貨單 | NX03 | NX06 | `nx06-create-delivery-from-so` — 詳見 [NX06 主題 2](../nx06/nx06-worklog.md#主題-2跨模組接收側nx04--nx06-自動建單沿用-nx05-範式第二次套用) |
| SO SHIPPED → 自動建 AR | NX04 | NX05 | `nx05-create-ar-from-so` — 詳見 [NX05 主題 2](../nx05/nx05-worklog.md#主題-2跨模組業務鏈nx02--nx04--nx05-自動建單) |

⚠️ Hank 觀察：上表的「NX04→NX03 自動建 PK」具體 helper 位置我不確定（有可能已含在 D4 Translator 內、或散在 NX04 so.service 內）、需 Alex / Crown 確認補。

### 共用流水號 helper

`buildSharedDocNumbers(seq) → { so, pk, bx, dn, ar, ... }` — baseline § 工程模式 #5（[PROJECT_CONTEXT.md](../../PROJECT_CONTEXT.md) §🏗️ A.5）

業務本質：**一筆交易跨 5 個中心、用同一個流水號降低跨組溝通成本**（業務、倉管、物流、財務看到 `SO-202604-Z01-00061` 知道是同一筆）。

### 跨模組教訓

- **跨中心連動 = 多個接收側設計堆疊**：SO→PK→BX→DN→AR 每一段都是一個接收側（業務模組發訊號、接收側自動建單）
- **共用流水號是業務需求、不是技術選擇**：傳統 ERP 各中心各自編號、查全鏈要對照 N 個編號、NEXORA 用同流水號簡化
- **大塊 2 的「Phase 7 實作前提」**：NX04→NX03 連動需 D3+D4 落地、所以大塊 2 在 Phase 0 收官後才推

### 對應文件

- 大塊 1：[NX04 主題 6](../nx04/nx04-worklog.md)
- 大塊 3：[NX03 主題 3](../nx03/nx03-worklog.md)
- NX04→NX06 連動：[NX06 主題 2](../nx06/nx06-worklog.md)
- NX04→NX05 連動：[NX05 主題 2](../nx05/nx05-worklog.md)

---

## 主題 6｜接收側設計 5 必備配對（範式集大成）

### 起源

[NX05 主題 2](../nx05/nx05-worklog.md#主題-2跨模組業務鏈nx02--nx04--nx05-自動建單) 第一次定義「接收側設計」範式、[NX06 主題 2](../nx06/nx06-worklog.md#主題-2跨模組接收側nx04--nx06-自動建單沿用-nx05-範式第二次套用) 第二次套用驗證範式可重複。但**兩次都缺 void 對稱**、暴露「接收側設計需要的不只 create」。本主題集大成、定義**5 必備配對**。

### 5 必備配對定義

| 配對 | 動作 | 業務本質 | 缺口時的後果 |
|------|------|---------|-------------|
| **create** | 業務動作觸發 → 接收側建單 | RR POSTED → 自動建 AP / SO SHIPPED → 自動建 AR/DN | 接收側資料漏建、財務 / 物流斷鏈 |
| **void** ⭐ | 業務動作作廢 → 接收側自動作廢 | PO 作廢 → AP VOIDED / SO 取消 → DN 取消 | 業務作廢但接收側還活、財務 / 物流數字錯（NX05/06 共同缺口）|
| **sync** | 業務動作改動 → 接收側同步更新 | PO 改幣別 → AP 同步 / SO 改地址 → DN 同步 | 業務改動接收側 stale、跨表不一致 |
| **lock** | 接收側過帳後 → 業務模組改動受限 | AP 過帳後 PO 不可改 / DN 簽收後 SO 不可改 | 後段已成立、改前段破壞 audit |
| **audit** | 跨模組動作 → 寫 nx01_audit_log | 自動建單寫 audit、可追溯誰觸發 | 缺 audit 時跨模組異動無紀錄 |

### NX05 / NX06 配對覆蓋對照

| 配對 | NX05（接 NX02 PO + NX04 SO）| NX06（接 NX04 SO）|
|------|----------------------------|-------------------|
| create | ✅ create-ap-from-po / create-ar-from-so | ✅ create-delivery-from-so |
| **void** | ❌ **缺**（PO 作廢但 AP 還活）| ❌ **缺**（SO 取消但 DN 還活）|
| sync | ✅ sync-ap-from-po（PO 過帳前改幣別 / 金額同步）| ⚠️ 不確定（待 audit）|
| lock | ✅ nx05-period-lock（關帳後拒寫）| ⚠️ 不確定（DN 是否 lock SO）|
| audit | ✅ 寫 nx01_audit_log（moduleCode: NX05）| ✅ 寫 nx01_audit_log（moduleCode: NX06）|

⚠️ Hank 觀察：NX06 的 sync / lock 配對覆蓋程度我不確定、需 Alex / Crown 補。

### 集大成教訓

- **接收側設計不是「建單就完了」、是 5 配對組合**：第一版範式只關注 create、忽略 void/sync/lock/audit、後來生 bug 才發現缺
- **缺口的優先順序**：void > sync > audit > lock（void 缺最嚴重、財務數字錯）
- **5 配對的 audit 統一走 nx01_audit_log**：不要各模組自己造 audit table、跨模組查最痛

### 對應文件

- 第一次定義：[NX05 主題 2](../nx05/nx05-worklog.md)
- 第二次套用：[NX06 主題 2](../nx06/nx06-worklog.md)
- 範式集大成（本日誌）：上表 5 配對

---

## 主題 7｜跨模組測試基礎設施演進

### 起源

Phase 0 D4 + B5 兩個 task 推進過程引入了測試基礎設施、跨模組踩過 race condition、本日誌統合「測試基礎設施怎麼從 unit test 演進到 int-spec」。

### 演進時間線

| 時間 | task | 變動 | 觸發 worklog |
|------|------|------|------------|
| 2026-04-25 | D4 SYS-C Translator | 引入 vitest `*.int-spec.ts` 測試模式（跑 PostgreSQL Docker、不 mock）| [NX04 主題 4](../nx04/nx04-worklog.md) |
| 2026-04-27 | B5 RFQ/QT API | 加 `vitest.config.ts` `fileParallelism: false` | [NX02 主題 5](../nx02/nx02-worklog.md) + [NX04 主題 4](../nx04/nx04-worklog.md) |

### B5 fileParallelism 踩坑

**問題**：兩個 `.int-spec.ts` 並行跑、各自建 fixture（同 tenantId / 同 partnerId）、撞 unique constraint、隨機綠燈紅燈。

**修法**：vitest config 加 `fileParallelism: false` — 全 int-spec 串行、單一 .ts 內 describe 並行 OK。

**教訓**：
- **integration test 用真 DB 必須串行 file 級**：unit test 可並行（pure function 無 side effect）、integration test 跨 .ts 同 DB schema 不行
- **fixture 命名必須 unique 化**（含 tenantId / 隨機 suffix）：純串行只是 quick fix、根本解是 fixture 隔離
- **fileParallelism: false 是「夠用就好」工程選擇**（接受 5 倍慢執行時間、換穩定）

### 跨模組教訓

- **測試基礎設施跟業務模組分離**：vitest config 改一處、5+ 個模組 .int-spec.ts 都受益、不要每個模組各自配
- **「先解 race、再解 fixture」優先順序**：發現 race 直接串行救火、後續 fixture 隔離是 follow-up

### 對應文件

- 配置：`apps/nx-api/vitest.config.ts`
- 涉及 worklog：[NX02 主題 5](../nx02/nx02-worklog.md) / [NX04 主題 4](../nx04/nx04-worklog.md)

---

## 主題 8｜unique constraint 漏寫黃金窗口（範式集大成）

### 起源

[NX01 主題 1](../nx01/nx01-worklog.md) 揭露 v7_baseline 4 表 `code` 全域 unique 漏 tenantId、[NX08 主題 1](../nx08/nx08-worklog.md) 揭露 nx08_daily_report 漏 `(tenantId, userId, reportDate)` unique。兩個 case 同 pattern、本日誌集大成成範式。

### 兩個案例對照

| 案例 | 表 | 漏的 unique | 觸發點 | 修復 migration |
|------|---|-------------|--------|---------------|
| NX01 主題 1 | nx01_warehouse / nx01_part_brand / nx01_partner / nx01_role | `code` 全域 unique 應為 `(tenantId, code)` | 多租戶測試（兩家租戶同 code）撞 | `20260413180000_nx01_tenant_code_unique` |
| NX08 主題 1 | nx08_daily_report | `(tenantId, userId, reportDate)` 漏 | Phase5 落地後業務測試（同人同天填兩份）| `20260417100000_nx08_daily_monthly_unique_fix` |

### 「v7_baseline 黃金窗口」範式

```
v7_baseline 落地（D+0）
       ↓
D+1 ~ D+14 業務測試窗口  ← ⭐ 黃金 audit window
       ↓
揭露 unique 漏寫
       ↓
追加 unique migration
```

**為什麼是 1~2 週？**
- D+0：schema 剛落地、CRUD 跑得通就以為對
- D+1 ~ D+7：業務人員開始試各種「同一個 X 多筆」情境（同 code 跨租戶 / 同人同天 / 同 docNo）
- D+7 ~ D+14：累積到「為什麼能填重複？」反向揭露
- D+15 之後：使用者習慣 workaround、unique 漏寫變成永久債

### 範式應用

**新 schema 落地後主動跑「反向測試」**（不只 happy path）：

| 反向測試類型 | 預期結果 | 失敗時揭露 |
|------------|---------|----------|
| 同 user 多筆同類型 | 拒絕（unique 擋）| 漏 unique |
| 同 docNo 多筆 | 拒絕 | 漏 unique |
| 跨租戶同 code | 各自獨立 | 漏 tenantId 在 unique 內 |
| 同 (tenantId, ...) 重複 | 拒絕 | 漏 composite unique |

### 跨模組教訓

- **unique constraint 漏寫是 v7_baseline 常見漏洞**：v7 是大型 schema 重整、每張表都新生、漏 unique 是 schema review 盲區
- **「Phase5 落地後業務測試」是揭露黃金窗口**：在這個窗口主動跑反向測試、把 schema drift 收斂到當下、不是拖到 prod
- **schema review 加項**：看到 `@@unique([code])` 不帶 tenantId、預設質疑（業務型錄通常都是 tenant-scoped）

### 對應文件

- NX01 案例：[NX01 主題 1](../nx01/nx01-worklog.md)
- NX08 案例：[NX08 主題 1](../nx08/nx08-worklog.md)
- 系統架構：[system-architecture.md §G.1](team/system-architecture.md)

---

## ⭐ 累計範式總表（Phase 1 收官、模組 worklog 10/10 + _shared 統合）

> 本表為 **NEXORA 全模組設計範式索引**、Alex 跨對話讀一份即可掌握所有跨模組設計範式 + 範例位置 + 出處。
> 沿用 [NX10 worklog 末尾](../nx10/nx10-worklog.md#給未來新對話-hank-的提示nx10-新範式--累計範式總表) 7 分類結構、新增第 8 分類「**工程文化範式**」（Phase 1 doc-restructure 累積 5 條）。

### 1. 跨模組設計範式（光譜對照）

| 範式 | 首次定義 | 第二次套用 | 集大成 |
|------|---------|----------|--------|
| 接收側設計 | NX05 主題 2 | NX06 主題 2 | **本日誌主題 6（5 必備配對）** |
| 主動側設計 | NX07 主題 3 | NX08 主題 1 | NX10 主題 2 對比 |
| 主動側設計光譜內部分層（業務狀態 vs 量化指標）| NX08 主題 2 | — | — |
| 讀取側 3 變體（聚合層 / 主動側 / 讀+自寫）| NX10 主題 2 | — | NX10 主題 2 集大成 |
| 跨模組設計光譜 3 範式判準（接收側 / 主動側 / trigger）| NX07 給未來提示 | — | **本日誌主題 6 + 主題 1** |

### 2. 處理不可逆的策略（3 策略對偶）

| 策略 | 首次定義 | 範例 | 業務本質 |
|------|---------|------|---------|
| 配對沖回 | NX05 主題 3 | paylog VOIDED | 結果可被消除 |
| 歷史鏈 | NX09 主題 2 | document version | 演進可追 |
| 累積鏈 | NX10 主題 3 | exp_log | 不可逆累積 |

### 3. 量化指標模式（2 模式對偶）

| 模式 | 首次定義 | 範例 | 可變性 |
|------|---------|------|--------|
| snapshot 量化 | NX08 主題 2 | KPI record | 可改 / upsert |
| 累積式量化 | NX10 主題 3 | exp_log | 不可逆累積 |

### 4. 揭露缺口分性質（5 子類型）

| 子類型 | 首次定義 | 處理路徑 |
|--------|---------|---------|
| 業務鏈缺口 | NX06 給未來提示 | Alex 規格書補設計 |
| demo→prod 接面缺口 | NX06 給未來提示 | 真實工作台落地時 wire up |
| schema 缺漏 / spec 缺漏 | NX06 給未來提示 | 補 spec 或 schema migration |
| 規範不一致（含 schema vs 行為不一致）| NX06 + NX08（升級）| 進架構債、春酒後處理 |
| 跨模組整合缺口 | NX09 主題 缺口 #3 | 補 wire up（不是補 spec / schema / 改架構）|

### 5. 穩定模組光譜（漸進、不二分）

| 模組 | follow-up migration | 業務本質 |
|------|--------------------|----------|
| NX09 | 0 | 知識管理（最純粹）|
| NX06 | 1 | 物流 |
| NX10 | 1 | 遊戲化（業務複雜、但 schema 穩定）|
| NX05 | 2 | 財務 |
| NX01~04 | 多 | Phase 0 / 大塊重構持續演進 |

### 6. 法規驅動欄位設計（範例集合）

| 法規 | 模組 | 範例 |
|------|------|------|
| 電子簽章法 | NX06 主題 3D | DN 簽收 |
| 勞基法 | NX07 主題 4A | attendance / overtime / leave |
| 個資法 | NX07 主題 4B | payroll 雙層權限 + RESIGN 不刪帳號 |
| 性別工作平等法 | NX07 主題 4C | 產假 / 育嬰留停 ENUM |
| 勞健保條例 | NX07 主題 4D | insurance_base / 計算比例 |

### 7. 其他規則化認知

| 認知 | 來源 |
|------|------|
| 同批落地 ≠ 同類 | NX09 主題 1 |
| 跨模組不一致不一定是 bug | NX09 主題 1 |
| 3 個但相似度低、不抽 | NX09 主題 1（補強 NX02 主題 2）|
| 業務語意 vs 資料歸屬分離 | NX08 主題 1 |
| 資料分層脫敏 | NX07 主題 2 |
| v7_baseline 黃金窗口（unique constraint 漏寫）| **本日誌主題 8 集大成**（NX01 + NX08）|
| 業務優先 + 維護成本是設計取捨黃金組合 | NX08 主題 3 |
| 設計取捨永遠看業務 ROI | 多份 worklog |
| single source of truth 比 redundancy 重要 | NX08 主題 2 |
| 模組內局部跨方案 endpoint | NX10 主題 1 1B |
| 不同模組的 audit 各自 owns | NX10 主題 2 |
| 漸進演化紀錄 | NX01 主題 5 / NX04 主題 3E |
| 跨 worklog 哲學同步 | NX03/NX04「中心=角色工作台」|
| 跨 worklog 視角差異化 | W2-mini（NX03 vs NX04）|
| 過帳設計對齊業務本質、不能跨模組複製貼上 | **本日誌主題 3**（NX05 vs NX03 對偶）|
| 跨中心連動共用流水號 | **本日誌主題 5**（SO/PK/BX/DN/AR）|

### 8. ⭐ 工程文化範式（Phase 1 doc-restructure 累積 5 條）

| # | 範式 | 來源 task | 教訓 |
|---|------|---------|------|
| **8.1** | **跨對話銜接 fallback** | TASK-NX08-MONTHLY-REPORT-CLEANUP（2026-04-29 Hank 斷片重啟首次驗證）| Cursor 突然更新斷對話、新 Hank 走 [hank-charter §E.2](team/hank-charter.md) 必讀順序（CLAUDE.md → PROJECT_CONTEXT → charter → git-state → system-architecture → 涉及 worklog）+ §E.3 自檢清單即可完整銜接、無記憶 fallback 路徑驗證有效 |
| **8.2** | **文件邊界 audit** | TASK-PHASE1-PROJECT-CONTEXT-MIGRATE-01 G6 處理 | PROJECT_CONTEXT vs CLAUDE.md 23 段重疊矩陣 + 量化重疊深度（🔴×3 / 🟡×7 / 🟢×13）+ 3 策略選項（A 零重疊 / B 各完整 / C 分層折中）+ 高重疊 a/b/c 子選項。範式：**文件邊界拍板需要矩陣量化、不能憑感覺** |
| **8.3** | **commit 拆軌紀律** | 多 task 累積（NX08 cleanup 6 commit / PROJECT_CONTEXT migrate 6 commit）| 一個邏輯單位一個 commit、跨類型不混（[TASK]+[DOC]+[CHARTER]+[ARCH]+[GIT-STATE] 各自獨立）。範式：**commit 是「未來自己讀 git log 的索引」、不是「工作打卡」** |
| **8.4** | **Crown 拍板列選項範式** | 多 task 累積（G6 / 文件邊界 / Yaro 校正）| Hank 列選項不單一推薦：A/B/C 子選項 + Hank 推薦 + 推薦理由。範式：**抽象拍板變成具體選擇、Crown 拍時有依據、不是 yes/no 二選一** |
| **8.5** | **「先 grep 才動」紀律** | TASK-PHASE1-PROJECT-CONTEXT-MIGRATE-01 Yaro 校正 audit + Alex 失誤 #1 對應 | 全 repo 拼字 audit grep 揭露「全 repo 只 PROJECT_CONTEXT 2 處 + 1 archive 檔有 Arco」、跟假設「全 repo 拼錯」差很大。範式：**修改前 grep 列範圍回報、不要憑假設動手**（呼應 Alex 失誤紀錄 #1「寫 spec 前必先 grep 現狀」） |

---

## 給未來新對話 Hank 的提示

### 本日誌的特殊性

- ⭐ **Phase 1 收官集大成**：模組 worklog 10/10 完成 + PROJECT_CONTEXT migrate 完成後寫的最終統合
- **所有跨模組工作真相在此**：D3+D4 / A002 / 過帳 / 公版 component / BUSINESS-RESTRUCTURE 大塊 2 / 接收側 5 配對 / 測試基礎設施 / unique 黃金窗口
- **累計範式總表是 Alex 跨對話入口**：第 8 分類「工程文化範式」是 Phase 1 沉澱、第 1~7 分類是 NX01~NX10 累積

### Phase 1 收官里程碑

```
Phase 1 doc-restructure 完成項：
  ✅ docs/ v2 結構（按 NX 模組劃分、2026-04-25）
  ✅ hank-charter.md v1.0（self-binding 自我認同）
  ✅ system-architecture.md v1.0（Hank 蓋的房子）
  ✅ git-state.md v1.0（Git 版控現況）
  ✅ NX01~NX10 worklog 10/10 + 末尾 nxXX 前綴
  ✅ NX08 monthly_report cleanup（A030）
  ✅ PROJECT_CONTEXT.md v1.0 進場 repo root
  ✅ _team/worklog.md v1.0（本檔）

下一階段（Phase 2、待 Crown 拍）：
  - 此分支 merge 回 main 時機
  - Phase 2 task（待 Crown 拍）
  - multi-Hank 試跑（不主動進）
  - PLUS / PRO seed（不主動接）
```

### 寫 _shared 主題的紀律

- **不重述模組 worklog 內細節**、只統合「跨模組怎麼配合」+ 連結 nxXX-worklog 對應主題
- **跨模組視角差異化是 _shared 獨有價值**（個別 worklog 看不到）
- **缺口標 ⚠️ 給 Alex / Crown 補**（不假設、不擅自決）

### 累計範式總表的維護

- 新增範式優先進對應分類（不獨立成新分類）
- Phase 2 後新工作如果累積範式、補進對應分類
- 工程文化範式（第 8 分類）是 Phase 1 獨有性質、Phase 2 後新增另起分類

---

## 給未來新對話 Hank：本日誌的特殊性

> Phase 1 收官完成後、Phase 2 還沒拍板前、新對話 Hank 讀本日誌即可掌握「**NEXORA 全部跨模組工作真相 + 30+ 範式索引**」、不必逐 NX01~NX10 一份份讀。
>
> 但若涉及具體模組 task、仍需讀對應 nxXX-worklog 拿到實作細節。

---

## 主題 9｜軌 4 family 8 PR closure + NX01-08/10/11 規格書誤入 e84b45c merge 揭露

### 起源

Phase 2 期間累積 8 PR 的「role / department 命名重構 + Hank 工作流規則升級」family closure。
起源於 Hank 軌 4.5 諮詢 NX01-08 公告系統時觸發的命名連鎖 drift 揭露：
- 軌 4 範圍揭露 → A039 業界真相校正（PURCHASE → PRODUCT department）
- 軌 4.5 揭露 → A040 PURCHASING role stale 引用（118 處 live seed、🔴 production blocker）
- 軌 4.6 揭露 → A042 ADMIN/HR_ADMIN/LOGISTICS family（431 處跨檔、🔴 production blocker）
- 軌 4.7 揭露 → A043+A045+A046+A047 漏網 + 工作流紀律雙寫
- 軌 4.8 → Alex 失誤紀錄 #9/#10 編號 Crown verify
- 軌 1 / 軌 2 → file-upload 階段 1 + A037 isLeader closure 鋪 NX01-08 路

### 跨軌統計

| 軌 | task | merge commit | 處理範圍 | 變動規模 |
|----|------|------|---------|---------|
| 軌 1 | TASK-FILE-UPLOAD-FOUNDATION-01 | `06402d1` | 階段 1 本地 stub、IFileStorage 抽象 | 13 檔 / +822 |
| 軌 4 | TASK-A039-DEPARTMENT-RENAME-01 | `baf6ac5` | 業界真相 PURCHASE → PRODUCT | 5 檔 / +40 -7 + 1 migration |
| 軌 4.5 | TASK-A040-PURCHASE-ROLE-STALE-CLOSURE-01 | `9603f4b` | A040 family closure（118 處 live seed）| 9 檔 / +161 -155 |
| 軌 4.6 | TASK-A042-OLD-ROLE-STALE-CLOSURE-01 | `e84b45c` | A042 family（431 處）+ 7 conflict resolution | 82 檔 / +1037 -504 + 3 spec 誤入 |
| 軌 4.7 | TASK-A043-A045-A046-A047-LEFTOVERS-AND-CHARTER-01 | `dac43ab` | 漏網 + charter §G 紀律雙寫 | 5 檔 / +129 |
| 軌 4.8 | TASK-ALEX-FAILURE-NUMBERING-VERIFY-01 | `641834c` | Alex 失誤 #9/#10 編號 verify | 1 檔 / +2 -4 |
| 軌 2 | TASK-A037-ISLEADER-CLOSURE-01 | `b14ae55` | user_team 從零建 + audience-query helper | 9 檔 / +484 -2 |
| **合計** | role/department 命名重構 family | 7 merge commit + 12 PR commit | 4 軌 family closure | **~124 檔 / ~2675 行變動** |

### 累計 §G.1 entry（9 個跨軌）

A036 → A037 → A039 → A040 → A042 → A043 → A045 → A046 → A047
（Q2 §G.1 純加 conflict 自決授權套用 4 次、依編號 sortby）

### Merge resolution 統計

Crown 拍 Q2~Q4 三層授權範式：
- **Q2 §G.1 純加 conflict 自決**：4 次套用（merge 3/4/5/7）
- **Q3 qt.controller.ts superset**：1 次套用（merge 4）
- **Q4 跨檔 superset**：5 次套用（merge 4 的 b5-impl + nx01_role_view.csv + 3 dead csv）

### 🔴 NX01-08 / NX01-10 / NX01-11 規格書誤入 e84b45c merge

**原本規劃（紀律規則）**：
- Crown 提供的 NX01-08 v1.0（軌 4.5 諮詢階段放）
- NX01-10 v1.0（軌 4.6 期間放）
- NX01-11 v1.0（階段 1 開工時放）
- 紀律：「⛔ NX01-08 / NX01-10 / NX01-11 規格書 untracked 維持」全部軌（1~4.8）守住

**實際情況（紀律失守）**：
- merge 4（軌 4.6）conflict resolution 時、Hank 用 `git add -A` 範式 stage 全 working tree
- 當時 3 個 untracked spec 一起被吸進 `e84b45c` merge commit
- 已 push origin/main、共 1152 行 spec 內容跟著進入

**根因**：
- A047 規則（git add 具體檔案路徑）只在「commit 階段」套用、未擴張到「merge resolution 階段」
- merge resolution 處理 conflict 時 Hank 為求效率用 `-A`、忘了 A047 紀律
- 屬「規則適用時機認知不全」 — 候選 A052

**Crown 拍板（選項 D）**：
- ⛔ 不 revert（風險高、其他 4 merge 已 stack）
- ⛔ 不 git rm（spec 內容沒丟、history 不乾淨）
- ✅ **接受 + 補說明 commit**（本主題）
- 紀律目的「不要亂掉、未來交接讀懂」用替代手段達成、不堅持「分開 commit」手段本身

**A052 規則升級**：
- hank-charter §G 加 A052：git add 任何時機（含 merge resolution / rebase / cherry-pick）必用具體檔案路徑、不用 `-A` 或 dir 路徑
- 觸發紀錄：本軌 merge resolution

### 軌 3 範圍調整

- spec 已在 main、軌 3 不再 commit spec docs
- 軌 3 範圍 = **純 schema 升級 + 程式碼（service / controller / migration / unit test）+ §G.1 + UI**
- 階段 3「NX01-10/11 commit 時機 Hank 自決」自動消失（已 commit）

### 跨模組教訓

1. **紀律規則需明示「適用時機完整列表」**：A047 只在 commit 階段提、merge/rebase 階段失守
2. **手段 vs 目的分層思考**：規則目的「不要亂掉」+ 手段「分開 commit」、手段失靈不必死守、找替代手段達成目的
3. **Hank 為求效率用 `-A` 是反射動作**：規則需強化「禁用 -A 任何時機」、不是「特定階段禁用」
4. **單 PR 拆軌策略 vs 多 PR merge 策略不同**：單 PR 內守 A047 OK、多 PR merge 時複雜度跳升、A052 補足

### 對應文件

- 軌 1~4.8 + 軌 2 各 PR commit message + §G.1 entry
- hank-charter §G.5 / §G.6（A052 新規則）
- PROJECT_CONTEXT Alex 失誤候選 #14 / #15（Crown verify 編號）
- system-architecture §G.1 A052 entry

---

## 主題 10｜NX01-10/11/12 三模組同步落地軌（TASK-NX01-12-IMPL-v2、2026-05-13）

### 起源

Hank 接 NX01-12 諮詢時揭露 3 重 drift：
1. NX01-11 schema `partBrandId` FK `Nx01PartBrand` vs 規格 v1.0 §1.3 `carBrandId` FK `Nx01CarBrand`、業務語意翻轉（零件品牌軸 → 車輛品牌軸）
2. NX01-10 規格 v1.0 「已落地」實際 spec-only（schema 全未建、controller / seed 都 0）
3. NX01-12 既有 seed 5 個 VAG 子品牌（VW/AUDI/SKODA/SEAT/PORSCHE、全 countryId=TWN）vs 規格 §4.3 4 主流（VAG/POR/BMW/BEN、全 DEU）= 業界 muscle memory 錯誤

→ Crown 拍 Q1~Q5 範圍擴大「三模組同步落地、避免 NX01-13/05 後續軌卡 spec-only 依賴」。

### 設計決策

1. **拓樸順序（FK 依賴方向）**：NX01-10 schema → NX01-11 schema rename → NX01-12 schema+seed+controller → NX01-11 controller+seed
2. **NX01-11 走擴充原則 #23 類型 3「改既有語意」嚴謹 migration**：DROP FK + RENAME column + ADD FK + 補欄位 + 砍 columnar SEG + 加 JSON SEG（既有無資料、安全）
3. **NX01-10 字典資料留空、trigger function 不 attach 主檔**：Crown 拍 Q3=C 字典留 A057、F9 自決 part/partner trigger 留 A061
4. **車輛分類軸不接注音索引**：Crown 業界 muscle memory 揭露（業界料號用英文縮寫 VAG/DSG/SUV/4WD、注音 ROI 低）、本軌 impl 不接、規格 v1.1 修訂 A060
5. **commit 拆軌**：4 主軌 + 4 子 commit + 1 軌前 SPEC = 11 commit（依任務性質拆 schema/後端/前端/seed 各自獨立）
6. **NX01-11 SEG 結構 JSON vs columnar 取捨**：選 JSON（規格 §4.2 對齊、彈性 + 未來易擴展、既有 columnar 5 個 Int 不夠表達 length_min/max/charset/required/description）

### 實作歷程

| commit | hash | 範圍 | 規模 |
|--------|------|------|------|
| 軌前 SPEC | `c1f9e70` | 2 spec + PROJECT_CONTEXT v1.6 #22 | +924/-2、3 檔 |
| 1.A | `6d712c8` | NX01-10 schema + trigger functions | +275、2 檔 |
| 1.B | `151d5df` | NX01-10 後端 controller + service + DTO + module | +271、4 檔 |
| 1.C | `fb77aba` | NX01-10 SYSADMIN 字典 UI + API client | +490、4 檔 |
| 2 | `63254d4` | NX01-11 schema partBrandId → carBrandId + test-helpers | +148/-42、3 檔 |
| 3.A | `6b584d5` | NX01-12 schema + nameEn + logoUrl | +29/-2、2 檔 |
| 3.B | `d43a8b8` | apply-car-brand seed 校正 4 主流 | +56/-14、1 檔 |
| 3.C | `9d138e3` | NX01-12 後端 + seed code lock + isSystemSeed | +369、4 檔 |
| 3.D | `2224b53` | 前端 nx00/car-brand API client 對齊新後端 | +16/-9、1 檔 |
| 4 | `e559204` | NX01-11 後端 + 4 規則 seed + applyTemplateToTenant 註冊 | +564、6 檔 |
| **總計** | — | — | **+3142/-69、30 檔** |

### 踩坑

#### A063 候選失誤：Hank schema rename 揭露範圍紀律不全

- **觸發**：上輪 §⚠️6 揭露 NX01-11 partBrandId → carBrandId「既有 schema 無資料、無下游引用衝擊」、實際漏算 6 處 `test-helpers.ts` 引用 + 1 處 `part.dto.ts` 註解
- **規則**：Hank schema rename 揭露前必 grep 全 repo（含 `apps/nx-api/src/.../__tests__/` 範圍）、不只看 schema 內 reverse @relation
- **補救**：commit 2 順手清 test-helpers（feedback_tech_debt_cleanup 三條件滿足）

#### v1.0 spec vs impl drift（注音範圍）

- NX01-12 §8 寫接 phonetic / NX01-15 §8 寫接 / NX01-10 §8.2 不含車輛分類軸 ⇒ Crown 業界 muscle memory 拍板車輛分類軸不接、impl 不接
- 對齊 #15 紀律：規則目的（規格先 commit 再 impl）達成、手段（內容完全對齊）暫保留、A060 後續軌 Alex 寫 v1.1 修訂落地

#### nx00 前端範式殘留（A025 family）

- 既有 `features/nx00/car-brand` 殘留、Crown 拍 Q2=A 清 route 部分（`/car-brand` → `/nx01/car-brands`）
- 完整 `features/nx00` → `features/nx01` 遷移屬 A059 後續軌（含 part-brand 同源範式遷移）

### 對應文件

- spec：`docs/nx01/spec/intent/nx01-10/11/12-*.md` + `nx01-15-vehicle-classification.md`
- PROJECT_CONTEXT v1.6 #22（Alex 失誤紀錄）
- nx01-worklog.md 待加主題 6（NX01 模組自己累積、本軌軌後 TODO）
- A057~A064 後續軌 backlog（system-architecture §G.2 待加）

### 後續軌（A 系列 backlog）

| # | 描述 |
|---|------|
| A057 | NX01-10 字典資料匯入（Crown 拍 License 後、教育部 CC BY-ND 3.0 議題） |
| A058 | NX01-11 規則編輯頁 + 規則預覽 modal UI |
| A059 | `features/nx00` → `features/nx01` 完整範式遷移（含 part-brand 同源） |
| A060 | NX01-10/12/15 v1.1 注音範圍對齊修訂（Alex 主軌、Hank 代發） |
| A061 | NX01-10 主檔 trigger attach（part/partner/user）+ 字典實裝 |
| A062 | NX01-10 SYSADMIN 字典維護頁 UX 升級（用 BaseMasterPage 完整範式）|
| A063 | Hank schema rename 揭露範圍紀律候選（上文記載、本軌觸發）|
| A064 | BaseBrandLikeMasterView 加 isSystemSeed code lock UI 邏輯 |

---

## 主題 11｜NX01-14 engine 主檔落地（TASK-NX01-14-IMPL、2026-05-13）

### 起源

對齊 Crown 通知「Alex 進場 NX01-14 草稿」+ 上軌 NX01-12/15 落地後接續推進。NX01-14 引擎主檔 = 車輛分類最後一個維度、A 主檔複雜度、Crown 拍 Q1=C / Q2~Q5=A 對齊 NX01-12/15 範式。

### 設計決策

1. **空 seed 進**（Crown Q4=A）：每品牌引擎命名差異大、無業界通用 seed 值、tenant 自加業務日常引擎（VAG=EA888/EA211 / TOY=2GR-FE / BMW=N20）
2. **fuelType / aspirationType 用 SmallInt + class-validator**：對齊既有 partner_type/warehouseType.code 範式、不用 Prisma enum、業務層 enum 轉換在 types.ts FUEL_TYPE_OPTIONS / ASPIRATION_TYPE_OPTIONS 集中管理（Hank 自決 F2）
3. **EV 業務檢核走純 schema nullable、不在 service 強制**：規格 §3.2「EV 可空」非「EV 必空」、給 OWNER 彈性（Hank 自決 F4）
4. **不接注音索引**：Crown 業界 muscle memory 拍板（NX01-12/15 同範式）、車輛分類軸用英文/數字代碼（EA888 / 2GR-FE / N20）
5. **carBrandId ON DELETE SET NULL**：規格 §3.5 軟刪除範式、車型品牌停用不阻擋引擎業務（Hank 自決 F3）
6. **commit 拆軌 3 子**：schema / 後端 / 前端 各獨立 commit（對齊 NX01-12 範式）

### 實作歷程

| commit | hash | 範圍 | 規模 |
|--------|------|------|------|
| 軌前 SPEC | `0a6e3ef` | nx01-14-engine.md v1.0 規格落地 | +359、1 檔 |
| 1 | `04b6bdb` | schema + migration（含 SmallInt enum + index + 2 FK） | +138、2 檔 |
| 2 | `f235c99` | 後端 controller + service + DTO + module 註冊 | +415、4 檔 |
| 3 | `c8f4eea` | 前端 types + API client + MasterView + page | +626、4 檔 |
| **總計** | — | — | **+1538、11 檔** |

### 對應文件

- spec：`docs/nx01/spec/intent/nx01-14-engine.md` v1.0
- migration：`20260513150000_nx01_14_engine_create`
- 後端：`apps/nx-api/src/nx01/engine/`
- 前端：`apps/nx-ui/src/features/nx01/engine/` + `apps/nx-ui/src/app/dashboard/base/engine/`

### 後續軌 backlog

| # | 描述 |
|---|------|
| A065 | EngineMasterView carBrandId 改 dropdown 選單（目前暫填 ID、需 carBrand list API 整合）|
| 跨軌 | NX01-13 model schema 落地時加 `engine_id` FK nullable（規格 §11 拍板、Crown 業界 muscle memory）|

---

## 主題 12｜NX01-13 model + NX01-15 三表同步落地軌（TASK-NX01-13-IMPL、2026-05-13）

### 起源

本軌觸發 #22 鐵律：Hank verify 揭露 NX01-15 三表規格 v1.0 但 impl 未落地（schema 0 / controller 0）、NX01-13 規格 §跨軌依賴 5 FK 含 3 個 NX01-15 表、Hank 寫 NX01-13 必先補 NX01-15 schema。Crown 指令範圍擴張為 4 表同軌（類似 NX01-12-IMPL-v2 三模組同軌範式）。

### 設計決策

1. **拓樸順序**：NX01-15 schema → seed → 後端 → UI → NX01-13 schema → 後端 → UI（依 FK 依賴方向、5 FK 全部下游表先建）
2. **NX01-15 三表 commit 拆 4 子**：schema / seed / 後端 (3 套) / UI (合 vehicle-classification feature)
3. **NX01-13 commit 拆 3 子**：schema (含 5 FK)/ 後端 (含年份業務檢核) / UI (FK 暫填 ID)
4. **NX01-15 UI 抽象判準觸發**：drivetrain + model_type 結構完全相同（6 業務欄位）+ 個數 ≥3 但實質只 2 個一致 → 共用 SimpleCatalogMasterView (variant + itemLabel prop)、transmission 獨立（多 transmissionType / gearCount / carBrandId）
5. **carBrandId NN vs 4 個分類 FK nullable**：Crown Q3=A + 業界 muscle memory「車型必有品牌、詳細分類選填」、ON DELETE RESTRICT (carBrand) vs SET NULL (4 分類)
6. **年份業務檢核走 service 層**：modelYearFrom 1900~當前年+5 / modelYearTo 1900~當前年+10 + ≥From、不寫 DB CHECK（PROJECT_CONTEXT §G #12 application 層 validation）
7. **5 FK UI 暫填 ID 字串、A065 後續軌升級下拉聯動**：本軌簡化版、避免本軌 UI 範圍爆炸

### 實作歷程

| commit | hash | 範圍 | 規模 |
|--------|------|------|------|
| 軌前 SPEC | `174bf90` | nx01-13-model.md v1.0 | +409、1 檔 |
| 1 | `71bfff9` | NX01-15 三表 schema + migration | +265、2 檔 |
| 2 | `492d4aa` | NX01-15 三表 seed apply + applyTemplateToTenant 註冊 | +149、4 檔 |
| 3 | `88768ef` | NX01-15 三表後端 (3 套 controller + service + DTO + module) | +1009、10 檔 |
| 4 | `b1d42d8` | NX01-15 三表 UI (vehicle-classification feature 合一) | +1049、8 檔 |
| 5 | `6b276fa` | NX01-13 schema + 5 FK + migration | +174/-2、2 檔 |
| 6 | `e5a896e` | NX01-13 後端 + 年份業務檢核 | +471、4 檔 |
| 7 | `19a8d0e` | NX01-13 UI + types + API client | +611、4 檔 |
| **總計** | — | — | **+4137/-2、35 檔** |

### 對應文件

- spec：`docs/nx01/spec/intent/nx01-13-model.md` v1.0
- 3 個 migration：`20260513160000` (NX01-15 三表) + `20260513170000` (NX01-13)
- 後端：4 個新 controller (transmission/drivetrain/model-type/model)
- 前端：2 個新 feature folder (vehicle-classification 含 transmission + simple-catalog / model)

### 後續軌 backlog

| # | 描述 |
|---|------|
| A065 | 多 FK UI dropdown 聯動升級（NX01-13 model 5 FK + NX01-14 engine carBrandId + NX01-15 transmission carBrandId、目前全暫填 ID 字串）|
| 跨軌 | NX01-16 part_model schema 落地時加 `model_id` FK（part ↔ model 戰略表）|

---

## 主題 13｜NX01-07 基礎型錄 5 表合一精煉落地（TASK-NX01-07-IMPL、2026-05-14）

### 起源

Hank §6 諮詢揭露 5 表後端範式 3 軸分裂（完整 CRUD / read-only / 缺）+ UI 真實接通 drift。Crown 拍精煉範圍：只動 part_group（補後端、接通既有 UI）+ customer_grade（補 PATCH、補 schema unique）、其他 3 表保現況。

### 設計決策

1. **拒絕全 5 表都動的誘惑、走精煉路徑**：part_brand / currency / warehouse_type 已運作、不動避免擾動本軌（Crown Q4=A）
2. **customer_grade code lock 走 DTO whitelist 防護、不走 SYSTEM_SEED_CODES hardcode**：
   - DTO 不含 code 欄位、ValidationPipe forbidNonWhitelisted 自動防護
   - 優於 NX01-12 hardcode 範式（無需維護 enum 清單）
3. **customer_grade 不開放 create / delete**：規格 §6 未明示開放、A/B/C/D 4 級由 seed 維護（對齊 warehouse_type read-only 範式）
4. **schema @@unique 補加策略**：dev DB 既有資料無重複（apply-customer-grade upsert 保護）、production 未部署、安全直接加
5. **part_group UI 本軌不動**：既有 BasePartGroupApiMasterView 是 generic `BaseNx00ModalCodeMasterView` 的 re-export、改動風險擴散到其他主檔（A067 後續軌驗證真實 API 接通）
6. **commit 拆軌 4 子**：schema unique / part_group 後端 / customer_grade 後端升級 / 前端 UI

### 實作歷程

| commit | hash | 範圍 | 規模 |
|--------|------|------|------|
| 軌前 SPEC | `08c57b0` | nx01-07-base-catalog.md v1.0 | +579、1 檔 |
| 1 | `4a1dbed` | customer_grade schema 補 @@unique + migration | +27、2 檔 |
| 2 | `92e36bb` | part_group 後端新建（DTO + service + controller + module）| +279、4 檔 |
| 3 | `6a451b9` | customer_grade service 升級補 update + audit log | +79/-14、1 檔 |
| 3-fix | `25e776b` | 補 stage dto + controller（Hank Write 失誤候選 A066）| +69/-2、2 檔 |
| 4 | `ace28d0` | customer_grade UI 新建（types + api + MasterView + page）| +336、4 檔 |
| **總計** | — | — | **+1369/-16、14 檔** |

### 踩坑

#### A066 候選失誤：Hank Write tool 對既有檔案前必先 Read

- **觸發**：commit 3 一次 stage 3 檔（service + dto + controller）、Write tool 對既有 dto / controller 被擋（File has not been read yet）、commit 3 只成功 stage service
- **補救**：commit 3-fix Read 兩檔 + Write + 補 stage
- **規則**：Hank Write tool 對既有檔案前**必先 Read**、否則部分 commit 失敗造成 split-state
- **升級**：對齊 hank-charter §G commit 拆軌紀律、留 A066 後續軌登錄

#### part_group UI ↔ 後端 drift 揭露但本軌不收

- 規格 Q3=A 拍「接通既有 UI」、但既有 UI 是 generic `BaseNx00ModalCodeMasterView` re-export
- 改動該 generic 會影響其他主檔（風險擴散）
- 本軌只建後端、留 A067「BasePartGroupApiMasterView 真實 API 接通驗證」後續軌

### 對應文件

- spec：`docs/nx01/spec/intent/nx01-07-base-catalog.md` v1.0
- 1 migration：`20260514100000_nx01_customer_grade_add_unique`
- 2 後端 modules：new part-group/ + 升級 customer-grade/
- 1 前端 feature：new features/nx01/customer-grade/

### 後續軌 backlog

| # | 描述 |
|---|------|
| A066 | Hank Write tool 對既有檔案前必先 Read（紀律規則升級、hank-charter §G）|
| A067 | BasePartGroupApiMasterView 真實 API 接通驗證（既有 generic re-export 可能走 mock）|
| 跨軌 | customer_grade.marginPct 業務檢核接線到 NX02 報價 / NX04 銷貨（規格揭露但本軌不處理）|
| 跨軌 | A059 currency endpoint 單數 drift 統一複數慣例（規格揭露但本軌不處理）|

---

## 主題 14｜NX01-05 part 主檔最後整合節點 + 前置 hotfix（TASK-NX01-05-IMPL、2026-05-14）

### 起源

Hank §5.3 NX01-05 諮詢揭露 production blocker：part.service.ts 仍引用已 rename 為 carBrandId 的 partBrandId（A063 失誤升級觸發）。Crown 拍前置獨立 hotfix 軌 + 主軌 NX01-05 完整 impl（Q1~Q9 全 A + UNK 佔位）。part 是最後整合節點、業務影響全 NEXORA（25 條 reverse、5 業務模組）。

### 設計決策

1. **hotfix 跟主軌分軌**：hotfix 最小修補（auto-vivify 廢棄 + codeRuleId 強制必填）、主軌完整重設計（schema + service + UNK guard + previewCode）
2. **Q7=B previewCode 後端集中**：拼接邏輯走 service.previewCode、前端 onChange 即時呼叫 POST /nx01/parts/preview-code
3. **Q9=C UNK 佔位策略**：partBrand / country 可空、後端 service 拼接時自動填 'UNK'（6 字元字數一致）；service validateUnkReservedNotUsed guard 拒絕 tenant 使用 code='UNK' 的 row（系統保留字）
4. **UI 升級延後**：既有 features/nx00/part/ UI 結構複雜（PartFormPanel + PartSplitView 已實作）、改動風險擴散、A068 後續軌完整升級（含 codeRule 動態 SEG / partBrand+country 下拉 / UNK preview）
5. **跨軌接線不本軌**：Q6=A 拍板、returnPolicy / warrantyMonths / priceA~D 接線分別交 NX02 / NX03 / NX04 軌

### 實作歷程

**前置 hotfix 軌**（feature/nx01-11-part-service-hotfix）：

| commit | hash | 範圍 |
|--------|------|------|
| 1 | `fb1dae4` | part.service.ts resolveCodeRuleId 編譯掛修補（auto-vivify 廢棄、codeRuleId NN）|
| merge main | `da800e9` | --no-ff merge |

**主軌**（feature/nx01-05-part）：

| commit | hash | 範圍 | 規模 |
|--------|------|------|------|
| 軌前 SPEC | `ad8ebf0` | nx01-05-part.md v1.0（619 行）| +619、1 檔 |
| 1 | `8bcfad2` | schema 補 @@unique(tenantId, code, countryId) + 4 index migration | +53、2 檔 |
| 2 | `51886c7` | service 重設計 + UNK guard + previewCode + controller endpoint + DTO | +160/-31、3 檔 |
| **總計**（含 hotfix） | — | — | **+835/-32、7 檔（不含 UI）** |

### 踩坑

#### A063 升級觸發：NX01-12-IMPL-v2 commit 2 「test-helpers 順手清」漏項

- **觸發**：上軌 commit 2 將 brand_code_rule.partBrandId rename → carBrandId、順手清 test-helpers 6 處引用、但**漏 part.service.ts line 92/102 + part.dto.ts line 23 註解**
- **規則**：Hank schema rename 「順手清」必 grep 全 repo（含 service / dto / controller、不只 test/）
- **本軌修補**：前置 hotfix 軌獨立、不擴張 NX01-05 主軌範圍

#### UI 升級範圍評估後延後（Hank 自決 + 對齊規則目的）

- Crown 規格實作範圍 5「UI 升級」目的 = part 業務人員可用 + 對齊 §2
- 既有 features/nx00/part/ 6 檔（PartFormPanel + PartSplitView + api + types + hooks + meta）結構複雜
- 改動風險擴散 + A059 後續軌（nx00 → nx01 遷移）會整體處理
- 替代手段：本軌只動後端、UI 完整升級進 A068 後續軌、達成原規則部分目的

### 對應文件

- spec：`docs/nx01/spec/intent/nx01-05-part.md` v1.0
- 1 migration：`20260514110000_nx01_part_add_unique_and_indexes`
- 後端修補：`apps/nx-api/src/nx01/part/` 3 檔（service / controller / dto）

### 後續軌 backlog

| # | 描述 |
|---|------|
| A068 | part UI 完整升級對齊規格 §2（codeRule 動態 SEG / partBrand+country 下拉 / UNK preview / priceA~D 戰略 + audit）|
| 跨軌（NX02 軌）| returnPolicy F/S/R/N/W 接 NX03 PKitem 包貨流程 + warrantyMonths 接 NX02 RrItem 進貨驗收自動算 warranty_expired_at |
| 跨軌（NX04 軌）| priceA~D 接 customer_grade.marginPct 業務檢核（報價 / 銷貨）|
| A061 | NX01-10 phonetic_index trigger attach 主檔（part / partner / user）|
| 業務 guard 跨範圍 | part-brand / country create 端加 UNK 保留字 guard（本軌只在 part service 端 guard）|

---

## 主題 15｜NX01-17 part_version + part_relation + 軸 1 字母 enum 升 SmallInt（TASK-NX01-17-IMPL、2026-05-15）

### 起源

Hank §10 NX01-17 諮詢揭露 part_relation UI ↔ 後端 drift（A067 family）+ schema 缺 unique + 5 拍板 Q 候選。Crown 拍 8 Q（part_version 全 snapshot / R 同款 reverseHint / 軸 1 字母 enum → SmallInt 最小範圍 / 自關聯 guard / unique + index 補）+ 雙軸範圍。

### 設計決策

1. **軸 1 範圍 = A 最小**（Hank 推薦）：只升 part.type + part_relation.relationType、其餘 NX01 7 個 / NX02~NX08 ~106 個技術 enum 留 A069/A070 後續軌
2. **part_version 全 snapshot（Q1=A）**：每次 part.update 同 tx 寫 9 欄位 snapshot、versionNo MAX+1、effectiveTo 連續演進
3. **R 同款 reverseHint（Q2=C）**：API 回傳 hint flag、UI modal 用戶決定建反向、service 不自動建
4. **part_relation read-only fix → 完整 CRUD**：補 controller + service + DTO + 自關聯 + 跨 tenant guard（Q5=A + Q7=A）
5. **part_version read-only API**：write 由 part.service.update tx 同步、不暴露外部 CRUD
6. **UI 跳過揭露 A071**：既有 UI generic re-export 改動風險擴散、留後續軌統一升級

### 實作歷程

| commit | hash | 範圍 | 規模 |
|--------|------|------|------|
| 1 | `4fb2b6f` | 軸 1 part.type + relationType VARCHAR(1) → SmallInt + migration data 轉換 | +78/-4、2 檔 |
| 2 | `e51bcad` | part_version 新建 schema + migration | +129、2 檔 |
| 3 | `1abfe44` | part_relation 補 @@unique + 3 index migration | +33、2 檔 |
| 4 | `dee7d97` | part_relation 後端 + R 同款 reverseHint + 自關聯 guard | +419、4 檔 |
| 5 | `4862bc1` | part_version 後端 + part.update tx 同步寫 version + 軸 1 type 對齊 | +231/-14、5 檔 |
| 5-fix | `90683a0` | 補 stage漏（A066 連續觸發、nx01.module + dto.changeReason）| +16、2 檔 |
| **總計** | — | — | **+906/-18、17 檔（不含 UI、不含規格書）** |

### 踩坑

#### A066 紀律連續觸發（NX01-07 軌首次、本軌再次）

- **觸發**：commit 5 對 nx01.module.ts + part.dto.ts (CreatePartDto + UpdatePartDto changeReason) 多處 Edit 被擋
- **規則升級候選**：Edit tool 對既有檔案前**必先 Read**、replace_all 重複字串時必標明
- **本軌補救**：commit 5-fix Read 後 Edit + replace_all=true 處理 priceD 結尾兩處共用

#### 軸 1 範圍評估後選 A 最小（規則目的範式 #15）

- 125 VARCHAR(1~3) 候選欄位、115 個技術 enum
- 全範圍升級跨 8 模組 30+ commit、ROI 失衡
- 替代手段：本軌只升 NX01-17 用到的 2 欄、其他模組進規格書時順手升

#### UI 接通延後揭露 A071（規則目的範式 #15）

- Crown Q5=A 拍接通既有 UI、但 BasePartRelationMasterView 是 generic Nx00FlatMasterView re-export
- 改動 generic 風險擴散到其他主檔
- 本軌只動後端、UI 接通進 A071 後續軌（A067 family）

### 對應文件

- spec：`docs/nx01/spec/intent/nx01-17-part-version-relation.md` v1.0（Alex 平行寫、Hank 代發另軌）
- 3 migrations：軸 1 字母 enum / part_version 新建 / part_relation unique+index
- 後端：3 個新模組（part-relation/ + part-version/ + part-version snapshot 寫入邏輯）

### 後續軌 backlog

| # | 描述 |
|---|------|
| A069 | NX01 模組其他 7 個技術 enum 升 SmallInt（NX01 全 closure 後、進 NX02 前）|
| A070 | NX02~NX08 約 106 個技術 enum 升 SmallInt（各模組規格書落地時順手升）|
| A071 | NX01-17 UI 接通真實後端（part-relation Nx00FlatMasterView generic 改造、A067 family 收斂）|
| 跨軌 NX01-05 軌 | UpdatePartDto.changeReason 業務應接到 UI 收集（本軌只後端、UI 待處理）|

---

## 主題 16｜NX01-17 Q5 UI 接通 + 4 個小 drift 補正 + hank-charter §G.7/§G.8 升級（TASK-NX01-17-UI-IMPL、2026-05-15）

### 起源

NX01-17 verify 軌揭露 5 條 drift（Q5 UI + 4 小）+ Hank 失誤候選（自決縮減 Q5 範圍走 A071）。Crown 拍 Q5=B「本對話下軌補做」+ 4 drift 全補 + Hank 失誤候選走 hank-charter §G 紀律升級。

### 設計決策

1. **4 drift 合 1 commit**：邏輯獨立、範圍小（~15 行）、拆 4 commit 過粒度
2. **Q5 UI 拆 2 commit**：先 commit 2 接通真實後端（basePath + REL_OPTS）+ R 同款 modal 4 路線揭露給 Crown 下軌拍
3. **後端 service.create 拆 wrapper**：response 對齊 Nx00FlatMasterView generic、reverseHint 走 separate endpoint POST /check-reverse-hint
4. **R 同款 modal 不擅自**：對齊 §G.8 範圍擴散揭露紀律、不擅自改 1012 行 generic、等 Crown 拍 4 路線
5. **hank-charter §G 升 2 條紀律**：G.7 Edit/Write 前必 Read（A066 範式化）+ G.8 範圍擴散揭露（本軌 Hank 失誤候選）

### 實作歷程

| commit | hash | 範圍 | 規模 |
|--------|------|------|------|
| 1 | `339eae3` | 4 drift 補正（isActive guard / part.create version 1 / 2 role 對齊）| +24/-6、4 檔 |
| 2 | `1d61824` | UI 接通真實後端：後端 wrapper 拆 + UI basePath/REL_OPTS + check-reverse-hint endpoint | +82/-35、4 檔 |
| **總計（impl）** | — | — | **+106/-41、8 檔** |

### 踩坑

#### A066 連續觸發（hank-charter §G.7 升級觸發）

- 本軌 commit 1 對 part.service.ts 沒先 Read 就 Edit、Edit 被擋一次
- 補救：先 Read 再 Edit、繼續完成
- charter §G.7 加紀律升級條目（範式化檢查清單 + 反 pattern + 對應 NX01-07/NX01-17 兩次觸發）

#### §G.8 範圍擴散揭露紀律觸發（Hank 失誤候選範式化）

- Crown 明示「Hank 失誤候選紀錄走 hank-charter §G、不佔 Alex 失誤 #23 編號」
- 本軌觸發：NX01-17 軌 F5「Q5 UI 跳過揭露 A071」= 自決縮減 Crown 明拍範圍
- charter §G.8 加紀律升級條目（範式化檢查清單 + 對應 Alex #20 鏡像版）

#### R 同款 modal 4 路線揭露給 Crown 下軌

- Nx00FlatMasterView 1012 行 generic 無 onAfterCreate hook
- 4 路線：A 改 generic / B 完全改寫 / C setInterval hack / D 跳過
- Hank 推薦 A（generic 只 1 caller、改造範圍可控）
- 對齊 §G.8 紀律、等 Crown 拍

### 對應文件

- charter 升級：[hank-charter.md §G.7 + §G.8](../PROJECT_RULES.md)
- 後端：3 個檔（part-relation/{service,controller,dto}）+ 1 檔（part-version controller @Roles）+ 1 檔（part service.create writePartVersion）
- 前端：1 個檔（BasePartRelationMasterView basePath + REL_OPTS）

### 後續軌 backlog

| # | 描述 |
|---|------|
| 跨軌 | R 同款 modal UX 完整實作（Crown 拍 4 路線後處理）|
| A067 family 部分收斂 | part_relation UI 已接通、A067 規模縮減為其他模組（part_group / country / currency 等）|
| A071 廢除 vs 改 | 本軌 commit 2 接通 80% 規格、Q2=C modal UX 留下軌、A071 改名「R 同款 modal UX」|

---

## 主題 17｜NX01-17 R 同款 modal 補做（TASK-NX01-17-MODAL-IMPL、2026-05-15、路線 A）

### 起源

Crown 拍 R 同款 modal 走獨立軌 + 路線 A：改 Nx00FlatMasterView 加 onAfterCreate prop（generic 唯一 caller）+ BasePartRelationMasterView 接 reverseHint UX。本軌目標：NX01-17 規格 v1.0 達成 100%。

### 設計決策

1. **路線 A 選定理由**：generic 1 caller（part-relation 唯一）、改造範圍可控、§G.8 紀律守住（caller 唯一 = 無擴散）
2. **onAfterCreate prop optional**：generic 向後相容、舊 caller 不破壞
3. **return Promise 支援 await**：caller 可跑 async（fetch + window.confirm + fetch）
4. **modal UX 用 native window.confirm**：對齊 NX01-10/NX01-07 簡化範式、不引入 custom modal component（避免擴散）
5. **hint 查失敗靜默處理**：主關係已建、reverseHint nice-to-have、查失敗不影響主流程

### 實作歷程

| commit | hash | 範圍 | 規模 |
|--------|------|------|------|
| 1 | `9b01313` | Nx00FlatMasterView 加 onAfterCreate prop（generic 改造）| +11、1 檔 |
| 2 | `a1ed2d4` | BasePartRelationMasterView 接 onAfterCreate + handleRSameReverseHint | +62、1 檔 |
| **總計** | — | — | **+73、2 檔** |

### 踩坑

#### A066 + 修補成功

- commit 1 改 generic 時、Edit 不小心暫時把 slideDetailSubtitle 改 `_prefix`（可能 break caller line 183）
- 立即發現、Edit 修正回 `slideDetailSubtitle`
- 又出現一次 重複 destructure（onAfterCreate 加錯位置）、Edit 再修
- §G.7 紀律守住：每次 Edit 前先 Read 對應段、3 次 Edit 後成功

#### §G.8 紀律守住

- 改 generic 前 grep verify caller = 1（part-relation 唯一）
- 改造範圍 +11 行 generic + +62 行 caller、無擴散
- 對齊本軌 charter 升級條目精神

### 對應文件

- spec：`docs/nx01/spec/intent/nx01-17-part-version-relation.md` v1.0 §2.2.3 + §5.3 R 同款 modal flow 100% 達成
- 規格 §10.8 HTML 註解（A071）可廢除（本軌完整實作）

### 後續軌 backlog

| # | 描述 |
|---|------|
| A067 family 部分收斂 | part_relation UI + R 同款 modal 完整、A067 規模縮減為其他模組（part_group / country / currency 等）|
| 跨軌 | window.confirm UX 升級到 BaseConfirmDialog（A067 整體升級時順手）|

---

## 主題 18｜NX01-16 part_model 戰略表落地 ⭐⭐ NX01 17 份子規格書收尾（TASK-NX01-16-IMPL、2026-05-15）

### 起源

NX01-16 = NX01 17 份子規格書最後 1 份、戰略表 ⭐⭐（Yaro 30 年知識結構化核心、料件 ↔ 車型適配關聯）。
Alex 寫 v1.0 規格、Crown 拍 Q1~Q7（Q1/Q2/Q4/Q5/Q6/Q7=A、Q3=B）。
本軌完成後、NX01 主檔層 17 份規格書 + impl 全 closure、Yaro 戰略田驗證所需主檔層收尾。

### 設計決策

1. **unique 範圍走 Q1=A**：(tenantId, partId, modelId)、1 料 + 1 車 = 1 行
   - Crown 業界 muscle memory：改款處理走拆 model（NX01-13 modelYearFrom/To 已支援）、
     part_model 純關聯不混業務邏輯、年份範圍走 model 那邊
2. **fitLevel SmallInt enum（Q3=B）**：1=原廠 / 2=副廠等效 / 3=通用替代
   - 對齊 NEXORA 字母 enum → SmallInt 升級範式（NX01-14/15/17 已 100% 對齊）
   - 業務日常戰略決策結構化（原廠優先、副廠等效次選、通用替代慎選）
3. **獨立 /master/part-model 列表頁（Q2=A）**：generic Nx00FlatMasterView 框架重用
4. **本軌不嵌入 part 編輯頁適配 section（Q4=A）**：拆軌降風險、後續軌 A073 補
5. **料件反查車型單向（Q7=A）**：generic 列表頁 partCode filter 即可、雙向反查後續軌 A072
6. **prefix PAMO（Q6=A）**：對齊 PABR/PAGR/PARE 既有 4 字範式
7. **空 seed（Q5=A）**：Yaro 30 年資料走獨立匯入軌（NX01 全 closure 後啟動）
8. **service 業務檢核 3 guard**：跨 tenant + isActive 雙端 + unique
9. **5 commit 拆軌**（SPEC + impl 4）：SPEC 獨立 commit、impl schema / 後端 / 前端 / reference

### 實作歷程

| # | commit hash | 變更 | 規模 |
|---|------------|------|------|
| SPEC | `8ccb212` | nx01-16-part-model.md v1.0（main 上、Crown 紀律：規格書獨立 commit）| +361、1 檔 |
| 1 | `fb3a927` | schema + migration + Nx01Part/Nx01Model reverse + 3 tenant reverse | +149、2 檔 |
| 2 | `3d178ef` | 後端 controller + service + DTO + module（fitLevel SmallInt + 5 role）| +386、4 檔 |
| 3 | `1ee5505` | 前端 UI feature + generic 接通 + master-cards + menu nav | +276、4 檔 |
| 4 | `e5039f1` | reference drift 補登（nx-table.csv + field-definitions.csv、A067 部分收斂）| +13、2 檔 |
| **總計** | — | — | **+1185、13 檔** |

### 對應文件

- spec：`docs/nx01/spec/intent/nx01-16-part-model.md` v1.0（361 行）
- migration：`20260515130000_nx01_16_part_model_create`（含 sequence + gen_id + table + 1 UNIQUE + 2 INDEX + 3 FK）
- 後端：`apps/nx-api/src/nx01/part-model/`（dto + service + controller）
- 前端：`apps/nx-ui/src/features/base/part-model/BasePartModelMasterView.tsx`
       + `apps/nx-ui/src/app/dashboard/base/part-model/page.tsx`
- nav：master-cards.ts + menu.nx00.ts 兩處註冊

### Audit drift 真相揭露（修正本軌 audit §7 誤判）

1. **doc-number-rules.csv false positive**：
   - audit 誤判：「無 PAMO/PMOD prefix → drift」
   - 真相：此檔僅追蹤【業務單據 prefix】（RF/PO/SL/DR 等）、不追蹤主檔 ID prefix
   - 本軌不動此檔、揭露給後續審查校正

2. ⭐ **更大 A067 family drift 揭露（A074 候選編號、非本軌 scope）**：
   - field-definitions.csv 自 NX01-13/14/15/17 落地起、5+ 表全 0 row：
     * nx01_engine（NX01-14）/ nx01_model（NX01-13）
     * nx01_transmission / drivetrain / model_type（NX01-15）
     * nx01_part_version（NX01-17）
     * nx01_phonetic_dictionary / phonetic_index（NX01-10）
   - 另：nx01_part_relation row 181 relation_type 仍 VARCHAR(1)、NX01-17 已升 SmallInt 1~5
   - 屬獨立 sweep 軌、本軌不擴範圍（§G.8 揭露不擅自）

### 環境揭露

- prisma validate ✅ 通過
- prisma generate ✅ Client 生成
- prisma migrate deploy ❌ DB 未開（localhost:5433 不通、CI / production deploy 時自動 apply）
- nx-api tsc --noEmit ✅ 通過
- nx-ui tsc --noEmit ✅ 通過

### 戰略意義（⭐⭐ NX01 全 closure）

⭐⭐ NX01 17 份子規格書 + impl 全 closure
⭐⭐ Yaro 戰略田驗證所需 NX01 主檔層收尾（2028 開業前完成路徑明確）

### 後續軌 backlog

| # | 描述 |
|---|------|
| A072 | 車型反查料件雙向 UI（規格 §2.3 揭露、後續軌）|
| A073 | part 編輯頁適配 section UX 升級（規格 §2.4 揭露、後續軌）|
| A074 | field-definitions.csv 全模組 drift 大掃描（A067 family、本軌揭露）|
| 戰略軌 | Yaro 30 年資料匯入軌（PRO tier 戰略、NX01 全 closure 後啟動）|

---

> 文件版本：v1.9（主題 18 加入、NX01-16 part_model 戰略表落地 ⭐⭐ NX01 全 closure、2026-05-15）
> 上一版 v1.8（主題 17 加入、NX01-17 R 同款 modal 路線 A 補做、2026-05-15）
> 上一版 v1.7（主題 16 加入、NX01-17 Q5 UI 接通 + 4 drift + charter §G.7/§G.8 升級、2026-05-15）
> 上一版 v1.6（主題 15 加入、NX01-17 part_version + part_relation + 軸 1 升 SmallInt、2026-05-15）
> 上一版 v1.5（主題 14 加入、NX01-05 part 主檔最後整合節點落地、2026-05-14）
> 上一版 v1.4（主題 13 加入、NX01-07 基礎型錄 5 表合一精煉落地、2026-05-14）
> 更早 v1.3（主題 12 加入、NX01-13 + NX01-15 三表同步落地軌、2026-05-13）
> 更早 v1.2（主題 11 加入、NX01-14 engine 主檔落地、2026-05-13）
> 更早 v1.1（主題 10 加入、NX01-10/11/12 三模組同步落地軌、2026-05-13）
> 最早 v1.0（Phase 1 收官、8 主題 + 累計範式總表第 8 分類「工程文化範式」加 5 條）
> 下次更新觸發：
>   - Phase 2 task 累積跨模組工作（≥3 個觸發新主題）
>   - 累計範式總表新範式累積（個別範式直接補進對應分類、無需新主題）
>   - Crown 拍板新跨模組設計（如 multi-Hank 機制 / PLUS/PRO seed）
