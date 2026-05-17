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

## 主題 19｜docs/ 平鋪重組 + 規範合一戰略 milestone（TASK-DOCS-RESTRUCTURE-AND-RULES-COMPLETE、2026-05-15）⭐⭐

### 起源

Crown 揭露 2 個痛點：
1. docs/ 太多資料夾和檔案、Claude.AI 上傳要找半天、後期難管理
2. 規範 4 份檔案（CLAUDE.md + PROJECT_CONTEXT.md 紀律段 + hank-charter.md + file-placement-suggestion.md）散落、有重複條目

3 軌 Hank audit 累積（DOC-AUDIT / RULES-AUDIT / DOCS-RESTRUCTURE-AND-RULES-DEDUPE）後、
Crown 拍 Q1=B（中度路徑、規範合一 + docs/ 平鋪、釋放 57%）/ Q2=A（三章式合一）/
Q3=A（Alex 失誤 #1~#22 重分類 [共通] 11 + [Alex] 11）/ Q4=A（root CLAUDE.md 保留 stub 指向）。

Alex 先撰寫 PROJECT_RULES.md Part I + II（563 行）+ PROJECT_CONTEXT.md v2.1（縮版 417 行）、
Hank 接力做 docs/ 重組 + Part III 撰寫 + 廢棄舊檔 + 交叉引用更新（4 軸完整收尾）。

### 設計決策

1. **頂層平鋪 5 個 `_` 前綴**：原 `_shared/` 7 子層 → `_team/` + `_reference/` + `_template/` + `_system/` + `_archive/`（-28% + 視覺扁平）
2. **規範合一三章式（Crown Q2=A）**：PROJECT_RULES.md 結構 Part I 共通 / Part II Alex / Part III Hank、Alex 寫 I+II、Hank 寫 III
3. **CLAUDE.md 保 stub 不全 rm（Crown Q4=A）**：root stub 15 行對齊 Cursor / Claude Code 自動讀取慣例
4. **hank-charter.md 廢、內容併入 Part III**：A046 / A052 / A066 / G.4 / G.7 / G.8 等工具陷阱規則完整保留
5. **file-placement-suggestion.md 歸檔**：ADR 性質、Q5-1/5-4/5-5 拍板過程歷史紀錄、不刪、mv 進 _archive 改名 `2026-04-28_file-placement-decisions.md`
6. **歷史 fact 保留範式 G.4**：_archive/ + dailylog/ 完全不動、worklog 歷史段「hank-charter §E.2 必讀順序」等文字保留（描述當時真相）
7. **git mv 全程保 history**：單一原子 commit 25 rename 全 100% similarity 偵測、git log --follow 可追
8. **POSIX sed 批次處理**：避開 PowerShell A046 中文檔陷阱、25 個 .md 跨引用 sed 一次清完
9. **dedupe with Part I 共通段**：Part III 重複條目用「對齊 §I.X.Y」交叉引用、不雙寫

### 實作歷程

| # | commit hash | 變更 | 規模 |
|---|------------|------|------|
| 軌前 | `e80079e` | Alex 兩份檔進場 + 廢舊 root PROJECT_CONTEXT.md v1.6 | +980/-787、3 檔 |
| 1 | `6948fe5` | docs/ 平鋪 git mv 大軌（25 rename 100% similarity）| 0 內容變更 |
| 2 | `09a0e7c` | 廢 stale 3 檔（version-plan + nx-model + hank-charter）| -485 |
| 3 | `8d74ac6` | PROJECT_RULES Part III 撰寫（606 行、10 章節）| +619/-14 |
| 4 | `5c5e1fc` | CLAUDE.md → stub 15 行（保 Cursor 入口）| +11/-454 |
| 5 | `af9248e` | 交叉引用 sed 批次（25 檔）+ system-arch 文件樹修 | +107/-102 |
| 6 | `020633d` | README.md 完整 rewrite 對齊 v3 平鋪結構 | +100/-79 |
| **總計** | — | — | **+1817/-1936、~60 檔** |

### 對應文件

- 規範合一：`docs/PROJECT_RULES.md` v1.0（Part I + II + III、共 1168 行）
- 專案介紹：`docs/PROJECT_CONTEXT.md` v2.1（縮版 417 行、Crown 揭露恆迎背景真相校正）
- 入口 stub：`CLAUDE.md`（root、15 行、指向 PROJECT_RULES.md）
- 平鋪結構：`docs/_team/` + `_reference/` + `_template/` + `_system/` + `_archive/`
- 索引：`docs/README.md` v3 完整 rewrite

### 戰略意義（⭐⭐ milestone）

- ⭐⭐ docs/ 簡化：78 子層 → 25 / 152 檔 → 95、頂層平鋪 + 5 個 `_` 前綴頂層
- ⭐⭐ 規範合一：4 份檔（1,932 行）→ 2 份檔（PROJECT_RULES 1,168 + PROJECT_CONTEXT 417 = 1,585 行、-18%）
- ⭐⭐ Claude.AI 上傳空間釋放 ~57%（35 檔 → 14 檔常駐）
- ⭐⭐ Alex / Hank 雙端紀律單一真相、跨對話跨工具一致
- Crown 上傳找檔痛點解決：5 個固定位置（PROJECT_CONTEXT + PROJECT_RULES + _team/3 檔）

### 殘留 / 後續軌 backlog

| # | 描述 |
|---|------|
| A075 | CLAUDE.md §X 章節錨點 drift cleanup（NX01-XX 規格內仍引用 §五~§十六、需改 §III.2~§III.4）|
| A074 | field-definitions.csv 全模組 drift 大掃描（上軌揭露、後續獨立 sweep）|
| 軌 3 | docs/ 模組層扁平化（ui/ + workflow/primary + sub 合併、Crown Q1=B 不含、後續軌）|
| 軌 4 | NX01_SUMMARY + 各 nxXX-summary.md 撰寫（Alex 寫該模組規格時同步）|

### 環境揭露

- POSIX sed batch（25 檔）：UTF-8 完整保留、無 A046 中文陷阱
- git mv 25 個 rename：100% similarity 全偵測、history 完整可 --follow
- _archive/ + dailylog/ 0 動：歷史 fact 保留範式 G.4 守住
- A066 Read-before-Edit：commit 4/5/6 每個 Edit 前必 Read、無被擋下案例

---

## 主題 20｜NX01 模組架構書 + 上傳清單 + A075 sweep + 失誤 #23~#25 補登（TASK-NX01-SUMMARY-AND-FINAL-CLEANUP、2026-05-15）⭐⭐

### 起源

主題 19 docs/ 平鋪重組 + 規範合一戰略 milestone 完成後、本對話最後一軌完整收尾。
Crown 拍板 6 軸合一：
1. NX01 模組架構書（18 spec / 8237 行 → 1 summary 壓縮）
2. A075 §X 章節錨點 sweep（NX01 specs 引用 CLAUDE.md §五~§十六 全清）
3. .cursorrules 補建（Cursor IDE 自動讀取慣例不破）
4. Claude.AI 上傳清理清單（Crown 痛點完整解決）
5. 多 Cursor 段更新（Crown 拍板放棄、走穩健單軌）
6. 失誤候選 #23/#24/#25 完整登錄

### 設計決策

1. **summary 8 維度壓縮範式**：業務語意 / 表名 ID prefix / 戰略地位 / Crown 拍板 Q / 業界 muscle memory / seed 範式 / 落地 hash / 跨軌依賴 — 每子模組 20~30 行、為 NX02~NX10 SUMMARY 樹立範式
2. **業界 muscle memory 12 條清單**：Crown 18 年 + 恆迎 30 年累積、給 NX03 接力參考、避免新模組重新發明輪子
3. **A075 sed 三模式**：[CLAUDE.md §X](path) / [CLAUDE.md](path) §X / 純文字 CLAUDE.md §X、順序紀律 §十X 在 §十 之前避免部分匹配吃掉
4. **G.4 範式守住**：殘 7 處 CLAUDE.md 引用（line number 歷史 / Document Control Log / 歷史錯誤描述）保留不動
5. **.cursorrules 新建範式**：Hank 必讀順序 7 步 + 工具紀律速查 6 條 + 自檢清單 7 項
6. **upload-cleanup-list 5 段結構**：可下架 / 可下架 NX01 / 必保留 / 未來模組範式 / 變動觸發
7. **多 Cursor 段升級「未啟動 + 願景保留」**：Crown 拍板理由完整落地、未來啟動條件 + 紀律骨架雙存
8. **失誤 #23/#24/#25 三條完整登錄**：#23 TL;DR 紀律從 stub 升級完整版 / #24 #18 強化版 / #25 #20 強化版

### 實作歷程

| # | commit hash | 變更 | 規模 |
|---|------------|------|------|
| 1 | `856938c` | NX01 模組架構書 nx01-summary.md（404 行、壓縮 -95%）| +404、1 檔 |
| 2 | `b31ed22` | A075 §X 章節錨點 sweep（12 檔、3 種模式、§四~§十六）| +59/-59、12 檔 |
| 3 | `f6d9592` | .cursorrules 新建 + upload-cleanup-list.md | +157、2 檔 |
| 4 | `9adceee` | 多 Cursor 段更新 + 失誤 #23/#24/#25 完整登錄 | +61/-24、2 檔 |
| **總計** | — | — | **+681/-83、17 檔** |

### 對應文件

- 模組架構書：`docs/nx01/nx01-summary.md`（404 行、壓縮 -95%）
- §X sweep：12 spec 全更新（new anchors PROJECT_RULES §III）
- Cursor 入口：`.cursorrules`（41 行、Hank 必讀順序 + 工具紀律速查）
- 上傳清單：`docs/_team/upload-cleanup-list.md`（113 行、5 段結構）
- 多 Cursor 段：PROJECT_RULES §I.7.3 + PROJECT_CONTEXT §7.3 雙更新
- 失誤紀錄：PROJECT_RULES §I.5 #24/#25 補 + §II.3.2 #23 升級完整版

### 揭露真相

**A075 sweep 範圍 grep verify**：
- §五~§十六 章節錨點殘留：0 處 ✅
- §四 殘留：0 處 ✅
- 新增 PROJECT_RULES §III 引用：23 處
- 殘 7 處 CLAUDE.md 全屬 G.4 歷史 fact 保留（line number / Document Control Log）

**壓縮率精確**（A041）：
- NX01 18 spec / 8237 行 → nx01-summary.md 404 行
- 壓縮率：404 / 8237 = **4.9%**（-95%）

**.cursorrules 補建 verify**：
- 本軌前 `.cursorrules` 不存在（系統 reminder 揭露「歷史殘留」、實際已 git rm）
- 本軌新建 41 行、對齊 Cursor IDE 自動讀取慣例

### 戰略意義（⭐⭐ 本對話跨度完整收尾）

- ⭐⭐ NX01 模組層完整收尾：規格 17 + impl + summary（跨對話接力 ready）
- ⭐⭐ Claude.AI 上傳清單 ready：35 → 14 上傳檔（-60%）、Crown 找檔痛點完整解決
- ⭐⭐ 失誤紀錄堆積落地：#23/#24/#25 三條（Part I 13 共通 + Part II 12 Alex = 25 條完整）
- ⭐⭐ Cursor IDE 入口對齊：CLAUDE.md root stub + .cursorrules 雙保險
- A075 章節錨點 drift 全清（NX01 內部 0 殘留）

### 後續軌 backlog

| # | 描述 | 性質 |
|---|------|------|
| A074 | field-definitions.csv 全模組 drift 大掃描 | reference cleanup |
| 戰略軌 | NX02~NX10 各模組 closure 後撰寫 nxXX-summary.md（沿用本軌範式）| 模組接力 |
| 戰略軌 | NX03 庫存（範圍 A 完整 closure）開工軌 | 下一模組 |
| 戰略軌 | Yaro 30 年資料匯入軌（PRO tier 戰略）| NX01 全 closure 後啟動 |

### 本對話跨度收尾統計

本對話累積 8 軌 + 4 軸 docs 重組 + 本軌 6 軸 final cleanup：
- 主題 10~20 共 11 個跨模組 task log（NX01 全軌跡）
- NX01 17 子規格書 + impl 全 closure（2026-05-15 ⭐⭐）
- 規範合一 milestone（4 檔 → 2 檔、釋放 -18%）
- docs/ 平鋪重組（78 子層 → 25、-68%）
- Claude.AI 上傳釋放（35 → 14 檔、-60%）
- Alex 失誤紀錄 #1~#25 全落地

---

## 主題 21｜_cursorrules 廢除 + Hank 工具紀律 §G.9 登錄（TASK-CURSOR-RULES-CLEANUP、2026-05-15）⚠️ 補正軌

### 起源

主題 20 TASK-NX01-SUMMARY-AND-FINAL-CLEANUP 軸 3「.cursorrules verify」失誤觸發：
- Hank 只 `ls -la .cursorrules`（單檔）→ 得「No such file」→ 推論「不存在」→ 跳「本軌補建」分支
- **漏既有 root `_cursorrules`**（432 行、`d4ba39c` 2026-05-11 起存在、PROJECT_CONTEXT v1.6 line 660 已揭露為「歷史殘留」）
- 結果：本軌新建 `.cursorrules`（44 行）跟既有 `_cursorrules`（432 行）並存 + 內容 70% 重複 PROJECT_RULES

Crown 拍板路線 A（補正）+ §G.9 登錄（不用 Alex #26 編號、走 Hank 工具紀律）。

### 設計決策

1. **路線 A：保 `.cursorrules`（44 行 stub）+ 廢 `_cursorrules`（432 行完整版）**
   - 對齊規範合一精神（PROJECT_RULES 為真相、Cursor / Claude 入口 stub 指向）
   - Cursor IDE 新版本（dot prefix）+ Claude Code 雙入口對齊
2. **#26 候選改走 §G.9 Hank 工具紀律**：避免 Alex 失誤編號膨脹、Hank 工具紀律歸 Part III §G
3. **§III.8 速查表 renumber**：原 §III.8.7 速查表 → §III.8.8、保編號連續

### 實作歷程

| # | commit hash | 變更 | 規模 |
|---|------------|------|------|
| 1 | `241931f` | git rm _cursorrules（432 行廢、history 保留）| -432、1 檔 |
| 2 | `b30b4d1` | PROJECT_RULES §III.8.7 §G.9 新增 + 速查表 renumber | +51/-1、1 檔 |
| **總計** | — | — | **+51/-433、2 檔** |

### §G.9 條目重點

**規則**：對「目前 / 現況 / 是否存在」斷言、必先通配 grep（find -iname / glob `*keyword*`）、不單檔 ls / stat

**反 pattern**：ls 單檔得「No such file」→ 推論「不存在」→ 跳本軌補建分支

**正 pattern**：`find . -iname "*keyword*"` 通配 → 揭露全貌（含 dot prefix / 無前綴 / 歷史殘留）→ 確認真相再決定動作

**對齊**：#18（不憑記憶 grep verify）+ #24（不憑局部訊息推論全貌）+ §III.9 開工前自檢 + G.8 範圍擴散揭露

**檢查清單 3 條**：通配 → 近似清單 → 衝突揭露

### 對應文件

- 廢除：`_cursorrules`（root、432 行、git history 保留 3 commit）
- 新增條目：`docs/PROJECT_RULES.md §III.8.7`（G.9、47 行條目）
- 保留：`.cursorrules`（root、44 行、Cursor IDE 入口）
- 保留：`CLAUDE.md`（root、16 行、Claude Code 入口）

### 戰略意義

- ⚠️ Hank 工具紀律補洞：#18 + #24 強化版針對「verify 既有狀態」場景
- ⭐ 規範合一精神落實：Cursor / Claude 兩個 root entry 入口 stub、不重述細節、純指向 PROJECT_RULES
- ⭐ Claude.AI 上傳 verify 流程可恢復：Crown 可開始清空 Claude.AI 專案重新上傳
- §III.8 紀律由 6 條 + 速查表 → 7 條 + 速查表（G.9 強化）

### 觸發失誤 + 自我吸收

⚠️ 本對話 Hank 觸發 §G.9 失誤、即時補登 + 自我吸收（對齊 #16 鐵律「揭露當輪落地」）：
- 失誤揭露：軸 3 verify 漏通配 grep
- Crown 拍板：補正軌（路線 A）+ §G.9 條目登錄
- 補正落地：本主題 21 軌 closure（commit `241931f` + `b30b4d1`）

### 後續軌 backlog

| # | 描述 |
|---|------|
| 戰略軌 | NX03 庫存（範圍 A 完整 closure）開工軌 |
| 戰略軌 | NX02~NX10 各模組 closure 後 nxXX-summary.md（沿用 NX01 範式）|

---

## 主題 22｜PROJECT_RULES + nx01-summary Yaro 敘事 drift 補正軌（TASK-YARO-NARRATIVE-DRIFT-FIX、2026-05-15）⚠️ 補正軌

### 起源

Alex verify 14 檔上傳狀態時、揭露 2 處 Yaro 敘事 drift：

- Alex 寫 PROJECT_RULES.md Part I + Hank 寫 nx01-summary.md 時、PROJECT_CONTEXT 還是 v2.0 舊版「田驗證」描述
- 之後 Alex 寫 PROJECT_CONTEXT v2.1（2026-05-15）翻轉真相：Yaro 不是田驗證、是 Crown 計畫真實 B2B 企業
- 結果規範類 PROJECT_RULES 跟 模組架構書 nx01-summary 跟 v2.1 不對齊

Crown 拍板「全部修正成正確的、對齊 PROJECT_CONTEXT v2.1」。

### 設計決策

1. **PROJECT_RULES.md §I.1.1 修 2 處**：line 88（業務實體表 Yaro row）+ line 90（戰略地位描述）
2. **nx01-summary.md 修 3 處**：line 28（戰略意義）+ line 52（拓樸戰略層）+ line 242（NX01-16 業務語意）
3. **字眼策略**：「田驗證」→「試點實驗田」（否定句強調 + grep 0 殘留）/「Yaro 戰略田驗證關鍵」→「Crown 計畫的真實企業」/「Yaro 戰略資產轉型關鍵」→「亞羅開業優先實施」
4. **G.4 範式守住**：worklog 主題 18 / 19 內文「田驗證」字眼保留（歷史 fact、PROJECT_CONTEXT v2.1 已校正紀錄）
5. **PROJECT_CONTEXT Document Control Log v2.1 自身變更紀錄保留**：line 415 描述「移除田驗證字眼歷史」、屬 v2.1 必要 meta 紀錄

### 實作歷程

| # | commit hash | 變更 | 規模 |
|---|------------|------|------|
| 1 | `fd36b60` | PROJECT_RULES.md §I.1.1 Yaro 敘事補正（line 88 + 90）| +2/-2、1 檔 |
| 2 | `da5b4eb` | nx01-summary.md Yaro 字眼補正（line 28 + 52 + 242）| +3/-3、1 檔 |
| **總計** | — | — | **+5/-5、2 檔** |

### §G.9 通配 grep verify 結果

**修前**：8 處「田驗證」字眼（PROJECT_RULES 2 / nx01-summary 1 / nx01-16-part-model 2 / PROJECT_CONTEXT 1 / worklog 2）

**修後**：5 處殘留、其中：
- ✅ 預期 G.4 保留（3 處）：
  - `PROJECT_CONTEXT.md:415`（Document Control Log v2.1 自身校正紀錄）
  - `worklog.md:1100 + 1165`（主題 18 / 19 歷史段、Crown task 明示保留）
- ⚠️ 範圍擴散揭露（2 處、§G.8 觸發、Crown 拍未列、本軌未動）：
  - `nx01-16-part-model.md:28 + 352`（規格書內 Yaro 田驗證字眼）

### §G.8 範圍擴散揭露給 Crown 拍

⚠️ Hank 軌中通配 grep 揭露 nx01-16-part-model.md 規格書內 2 處「田驗證」字眼、Crown task 未列、本軌未擅自動。

**待 Crown 拍 3 條路線**：
- (a) 後續軌補修（nx01-16 規格書本軌不動、開獨立補正軌）
- (b) G.4 範式保留（規格書屬歷史拍板版、加 HTML 註解校正、不 replace 原文）
- (c) 本軌補修（追加 commit 3、納入本軌）

⚠️ #19 揭露不完整：以上選項可能不完整、Crown 有別的考量直接說。

### 戰略意義

- ⚠️ 規範類檔 + 模組架構書 Yaro 敘事跟 PROJECT_CONTEXT v2.1 對齊
- ⭐ §G.9 通配 grep verify 範式發揮作用、揭露範圍擴散
- ⭐ §G.8 範圍擴散揭露不擅自、報 Crown 拍 nx01-16 處理路線

### 後續軌 backlog

| # | 描述 |
|---|------|
| 戰略軌 | NX03 庫存（範圍 A 完整 closure）開工軌 |
| Crown 拍 | nx01-16-part-model.md 田驗證字眼路線（a/b/c）|

---

## 主題 23｜nx01-16 規格書 G.4 範式歷史 fact 保留軌（TASK-NX01-16-HISTORICAL-FACT-PRESERVE、2026-05-15）⚠️ 補正軌

### 起源

主題 22 TASK-YARO-NARRATIVE-DRIFT-FIX 軌中 §G.9 通配 grep 揭露 nx01-16-part-model.md 規格書內 2 處「田驗證」殘留（line 28 + line 352）、Hank §G.8 範圍擴散揭露不擅自、列 3 條候選路線（a/b/c）給 Crown 拍。

Crown 拍板路線 **b（G.4 範式保留）**：規格書 = 歷史拍板版、不該事後 replace、加 HTML 註解校正即可。

對齊範式：worklog 主題 18/19 內文「田驗證」字眼保留同精神、皆屬「Phase X 拍板當時敘事」歷史 fact。

### 設計決策

1. **G.4 範式核心落實**：保留 line 28 + line 352 原文不動、各前面加 HTML 註解校正
2. **HTML 註解 4 行範式**：
   - 第 1 行：標明「v1.0 拍板當時敘事」+ 拍板日期
   - 第 2 行：Crown 後續揭露真相 + 交叉引用 PROJECT_CONTEXT.md v2.1 §1.4
   - 第 3 行：校正後正確敘事
   - 第 4 行：G.4 範式聲明 + 規則出處
3. **Document Control Log 加 v1.0-historical-note 條目**：
   - 非 v1.1 改版（規格書內容語意未變、只補歷史校正紀錄）
   - 註明範式 + Crown 揭露時間 + G.4 引用
4. **「regard 條目不升版本」紀律**：歷史 fact 校正不算 spec 改版、避免 v1.x 編號膨脹

### 實作歷程

| # | commit hash | 變更 | 規模 |
|---|------------|------|------|
| 1 | `a95679f` | nx01-16 加 HTML 註解 × 2 + DCL v1.0-historical-note 條目 | +9、1 檔 |

### §G.9 通配 grep verify 結果（A041 精確）

本軌完成後全 repo「田驗證」分佈：

| 檔案 | grep -c count | 性質 |
|------|-------------|------|
| `nx01-16-part-model.md` | 7 | 2 原文（line 32 + 361、G.4 保留）+ 5 註解/DCL（line 28 + 30 + 300 + 357 + 359、校正聲明）|
| `PROJECT_CONTEXT.md` | 1 | DCL v2.1 自身校正歷史紀錄（meta）|
| `git-state.md` | 1 | 軌摘要動態紀錄 |
| `worklog.md` | 11 | 主題 18/19/20/22 跨主題敘事紀錄（G.4）|
| **PROJECT_RULES.md** | **0** | ✅ 規範類 0 殘留 |
| **nx01-summary.md** | **0** | ✅ 模組架構書 0 殘留 |
| **CLAUDE.md** | **0** | ✅ stub 0 殘留 |
| **.cursorrules** | **0** | ✅ Cursor 入口 0 殘留 |

⭐ 規範類 + 模組架構書「田驗證」字眼完全清理、業務真相敘事檔案 G.4 範式保留歷史拍板版原貌。

### 戰略意義

- ⚠️ G.4 範式真實落地、規格書歷史拍板版 + Crown 後續校正雙層敘事兼容
- ⭐ 範式為未來 spec docs 歷史 fact 校正樹立先例（避免 replace 破壞歷史）
- ⭐ §G.8 範圍擴散揭露 → Crown 拍 → §G.4 範式落地的完整循環驗證

### 後續軌 backlog

| # | 描述 |
|---|------|
| 戰略軌 | NX03 庫存（範圍 A 完整 closure）開工軌 |
| 戰略軌 | NX02~NX10 各模組 closure 後 nxXX-summary.md（沿用 NX01 範式）|

---

> 文件版本：v1.14（主題 23 加入、nx01-16 G.4 範式歷史 fact 保留補正軌、2026-05-15）
> 上一版 v1.13（主題 22 加入、Yaro 敘事 drift 補正軌、2026-05-15）
> 上一版 v1.12（主題 21 加入、_cursorrules 廢除 + §G.9 登錄補正軌、2026-05-15）
> 上一版 v1.11（主題 20 加入、NX01-SUMMARY-AND-FINAL-CLEANUP 完整收尾 ⭐⭐、2026-05-15）
> 上一版 v1.10（主題 19 加入、docs/ 平鋪重組 + 規範合一戰略 milestone ⭐⭐、2026-05-15）
> 上一版 v1.9（主題 18 加入、NX01-16 part_model 戰略表落地 ⭐⭐ NX01 全 closure、2026-05-15）
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

---

## 主題 24｜NX03 庫存模組重塑全 closure（TASK-NX03-IMPL-01、2026-05-15 ~ 16）⭐⭐⭐

### 起源

Crown 跨 6 輪需求討論 16 題拍板 closure（2026-05-15）、Hank AUDIT-01~04 schema 真相 verify、Alex overview v1.0 業務需求落地 → Hank 跨 8 Phase 26 commit 重塑 NX03 庫存模組（NEXORA 業務模組第一彈）。

**戰略意義**：
- ⭐⭐ Yaro 倉管部門工作台、實體進銷存核心
- ⭐⭐⭐ #13 強制溯源完整落地：10 種 source 全 service writer ✓、業界第一個能查「這顆料從哪來、為什麼動」
- ⭐⭐ 動態盤點不凍結業務（snapshot + delta 公式回推）、業界改革核心
- ⭐ NX01 主檔 17 子模組 closure 後第一個業務模組重塑

### 設計決策

1. **拓樸 4 層對齊 NX01 範式**：基礎 / 實體單據 / 工作流 / 戰略接點
2. **plan §3 4 軌 migration**：M1 part_version snapshot / M2 動態盤點 / M3 報廢 / M4 重組分解
3. **10 種 source 字母分布**：P / G / S / R / T / I / X / W / M / D（每個 source 都有對應 service writer）
4. **撿包 SOP 退貨除外**（v1.1 校正）：schema `Nx03Pk.triggerSource` enum 只 S/T、退貨直接 helper 過帳
5. **Conversion 共用 service 雙路徑分派**（Crown Q-Phase6-1=c）：M 加權 / D auto (priceA) + manual (costRatio override)
6. **partVersionId M1 配套 Q-S1=B 漸進**：新 row 帶入、既有歷史 row 留 null
7. **Phase 5 commit 2 修隱性 bug**：PR 過帳邏輯整套補建（原 service 純改 status 不扣帳、production bug）

### 實作歷程（A041 = 26 commit / 4 migration）

| Phase | commit 範圍 | 主軸 | 規模 |
|---|---|---|---|
| Day-1 | commit 1~2 | 依據文件落地 + 拓樸/migration 計畫 | 2 commit |
| Day-2 | commit 3~7 | M1/M2/M3/M4 schema + helper | 5 commit / 4 migration |
| Phase 2 | commit 1~2 | L1 service（StockBalance/Ledger/PartStockSetting）| 2 commit |
| Phase 3 | commit 1~2 | L2 service（Init + StockTake M2 升級）| 2 commit |
| Phase 4 | commit 1~3 | L3 入庫 4 種（rr/sr/transfer + Q-MV1=d 不動 schema）| 3 commit |
| Phase 5 | commit 1~6 | L3 出庫 4 種 + 撿包 SOP（含 PR 修隱性 bug）| 6 commit |
| Phase 6 | commit 1~2 | L3 轉換（共用 service、M 加權 + D auto/manual）| 2 commit |
| Phase 7 | commit 1~2 | L4 跨模組 verify + guard 補強 | 2 commit |
| Phase 8 | commit 1~2 (+ §5.1 補) | overview v1.1 + summary + worklog | 2~3 commit |

### 跨模組視角總覽（NX03 觸發 / 被觸發）

| 跨模組關係 | NX03 角色 | 對應 service / 接點 |
|---|---|---|
| NX02 RR 進貨 → NX03 入庫 | 被觸發者（source=P）| rr.service.applyRrPosting（升級含 G/P 分流 + partVersionId）|
| NX02 RR 同行調貨 → NX03 入庫 | 被觸發者（source=G、Phase 4 新支援）| 同上、rr.tiId != null 判 |
| NX02 PR 退供應商 → NX03 出庫 | 被觸發者（source=R、Phase 5 補 bug）| purchase-return.service.applyPrPosting（新建）|
| NX04 SO 銷貨 → NX03 出庫 | 被觸發者（source=S）| so.service.applyShipment（升 partVersionId）|
| NX04 SR 銷退 → NX03 入庫 | 被觸發者（source=R）| sales-return.service（升 partVersionId）|
| NX03 Parcel → NX06 DN | 觸發者（出 export）| schema `Nx06DnItem.parcelId` FK 通、NX06 query 後建 DN |
| NX03 StockBalance → NX08 InventoryCache | 觸發者（period 重算）| schema 通、重算屬 NX08 範圍 backlog |

### 統合教訓

1. **Crown 紀律「先 stop 回報、不擅自推進」價值極高**：
   - Phase 4 commit 2 揭露既有 PR service 0 過帳邏輯（隱性 bug）→ Crown 拍 A 擴大範圍補建
   - Phase 5 mini-verify 揭露退貨來源 schema 不支援撿包 → Crown 拍 B overview v1.1 校正
   - Phase 7 verify 揭露 Inbound/Outbound source enum 衝突 → A026 backlog M5
2. **既有 service grep verify 必做**：
   - rr.service applyRrPosting 既有 inline 邏輯缺 inTransitQty 保留（順手修）
   - parcel.service `.includes('T')` 寫法錯誤（順手修為 `=== 'T'`、partner_type VarChar(1) 真相）
   - schema 註解 partner_type='S' vs 'C' 同行 drift（順手修 line 2122）
3. **A041 精確 count 多次救命**：grep -c 揭露既有 service 真實狀態、避免重複建單
4. **partVersionId 漸進範式（Q-S1=B）**：optional 參數、helper 8 個 callsite 0 break
5. **Conversion 共用 service 對齊範式**：Crown Q-Phase6-1=c 推薦 c 共用、降低 endpoint 數量、邏輯內部分派

### 對應文件

- 業務需求：`docs/nx03/spec/intent/nx03-overview.md` v1.1
- 模組架構書：`docs/nx03/nx03-summary.md` v1.0（本主題後產出）
- 4 份 audit：`docs/nx03/nx03-audit-01.md` ~ `04.md`
- impl plan：`docs/nx03/spec/impl/nx03-impl-01-plan.md` v0.1.0
- Phase 4 verify：`docs/nx03/nx03-impl-01-phase4-verify.md`
- Phase 5 mini-verify：`docs/nx03/nx03-impl-01-phase5-mini-verify.md`
- Phase 7 verify：`docs/nx03/spec/impl/nx03-impl-01-phase7-verify.md`

### A026 backlog 開單揭露（NX03 範圍）

1. Nx03Inbound / Outbound 4 表 + service 整批廢棄（Phase 5 殘留、source enum 衝突）
2. `TASK-NX03-IMPL-02-TEST` 獨立軌（test fixture 30+ files / ~1500 行）
3. partVersionId 既有歷史 row 回填策略（Q-S1=B 留 null 後續評估）
4. partner_type schema 註解 drift 全面掃描（跨模組）
5. StItem create 路徑加 partVersionId snap（漸進完整化）
6. RR 狀態流支援「TI 來源 RR」application-layer guard（NX02 範圍延伸）
7. 配送 D → NX06 DN 自動 trigger hook（NX06 範圍）

⭐ Crown 拍板「branch merge main 拍板 → NX03 全 closure」、進 NX04 銷貨 / NX05 財務 / 自動補貨 B 軌等下游 task。

---

## 主題 25｜AR 自動補貨建議單 B 軌全 closure（TASK-AR-IMPL-01、2026-05-16）⭐⭐⭐

### 起源

NX03 範圍 A closure（v0.3.0-nx03-closure、main HEAD 50b53815）後、Crown 立即啟動 AR B 軌。
Hank AR-AUDIT-01 v2 揭露：
- 既有 Nx02Demand（demandType=S 庫存不足）可直接作為「採購建議單」載體、不需新表
- 既有 Nx03Shortage 已有 refRfqId 接通 RFQ
- 廠牌維度真相：Nx01Part.isOem + partBrandId + Nx01PartModel.fitLevel 三層完整支援
- 兩層分類 + 副廠池銷貨比例彙整、既有 schema 100% 支援

Crown 跨 2 輪需求討論共 11 題拍板 closure（2026-05-16）→ Alex 寫 ar-overview v0.1.0 → Hank 跨 8 Phase 13 commit 落地。

**戰略意義**：
- ⭐⭐⭐ 業界中小企業 ERP 第一個能做「智能品牌替代補貨」
- ⭐⭐ Yaro 產品 / 倉管部門核心戰略工具
- ⭐ NX03 範圍 B 戰略軌、NEXORA 業務模組第二大里程碑

### 設計決策

1. **拓樸 4 層對齊 NX01/NX03 範式**：基礎 / 計算引擎 / 建議單管理 / 跨模組接點
2. **2 軌 migration**：M1 PartStockSetting +3 欄 / M2 BrandAllocationRule 新表
3. **走既有 Nx02Demand 不新建**（Crown Q-AR5 + AR-AUDIT-01 v2 推薦）
4. **配比規則 modelId 級**（Crown Q-B1=A 同 model 配比一致）
5. **manual 覆寫 system**（Crown Q-S1=A 採購策略優先）
6. **混合 scheduled + on-demand**（Crown Q-C1=D cron 主 + 手動補強）
7. **替代品牌走 application 層**（Crown Q-AR-設計-2=b 不擴 PartRelation）
8. **平均出貨排除調撥**（Crown Q-AR3、純 source=S、X 不算）
9. **UI 本軌 stub、獨立軌 backlog**（Crown Q-U1=A、對齊 NX03 範式）

### 實作歷程（A041 = 13 commit / 2 migration / 命中 plan 估 10~12 上界）

| Phase | commit 範圍 | 主軸 | 規模 |
|---|---|---|---|
| Phase 0 | 1 | plan v0.1.0 + 9 拍板 Q | 1 |
| Phase 1 | 2 | M1 + M2 schema（Hank 自跑 migrate dev）| 2 |
| Phase 2 | 1 | L1 BrandAllocationRule CRUD（5 endpoints）| 1 |
| Phase 3 | 3 | L2 計算引擎 Stage 1+2 / 3+4 / replace helper | 3 |
| Phase 4 | 2 | L3 ArSuggestionWriter / Scheduler+Controller | 2 |
| Phase 5 | 1 | L4 跨模組 verify report | 1 |
| Phase 6 | 1 | UI stub placeholder | 1 |
| Phase 7 | 1 | summary + worklog（本主題）| 1 |
| 收尾 | 1 | pre-merge / merge / push（待 Crown 拍）| - |

### 跨模組視角總覽（AR 觸發 / 被觸發）

| 跨模組關係 | AR 角色 | 對應 service / 接點 |
|---|---|---|
| NX03 → AR | 上游（讀）| stock_balance / stock_ledger(S) / part_stock_setting |
| NX01 → AR | 上游（讀）| part / part_model / part_brand / model |
| AR → Nx02Demand | 觸發者 | ArSuggestionWriter.runForWarehouse → tx.nx02Demand.create × N |
| Demand → RFQ → Po → Rr | 既有 NX02 採購鏈 | demand.refRfqId / rfq.demandId 雙向 |
| Rr → NX03 入庫 | 觸發鏈終點 | rr.service.applyRrPosting → applyQtyInWithLedger source=P |

### 統合教訓

1. **AR-AUDIT-01 v2 揭露 schema 真相 → 不需新 schema 路徑**：
   - 既有 Nx02Demand demandType=S = 業界「採購建議單」載體
   - 既有 fitLevel + isOem = 廠牌兩層分類 + 替代 100% 支援
   - 只需 2 migration（M1 + M2）、跟 NX03 4 migration 大幅縮
2. **計算引擎 4 階段清晰分離 + type export**：Stage 1~4 各自獨立 method + ShortageCandidate / ForecastResult / AllocationResult / BrandBreakdown 4 type、外部 service 可組合
3. **PartReplacementService 解耦 calculator**：Stage 4 用 partReplacement.findAftermarketAlternatives、語意清且可重用
4. **manual 覆寫 system 在 service 層解**：classifyByOemAftermarket 先找 source='M' 再 'S' 再 fallback DEFAULT、Crown Q-S1=A 完整對應
5. **不擴 @nestjs/schedule 依賴**：純 HTTP run-due endpoint、外部 cron / k8s CronJob 觸發、降部署複雜度

### 對應文件

- 業務需求：`docs/auto-replenish/spec/intent/ar-overview.md` v0.1.0
- 模組架構書：`docs/auto-replenish/ar-summary.md` v1.0（本主題後產出）
- audit：`docs/auto-replenish/ar-audit-01.md`
- impl plan：`docs/auto-replenish/spec/impl/ar-impl-01-plan.md`
- Phase 5 verify：`docs/auto-replenish/spec/impl/ar-impl-01-phase5-verify.md`

### A026 backlog 開單揭露（AR 範圍）

1. @nestjs/schedule cron decorator 註冊（外部 cron 替代）
2. per-setting calculationFrequency 細粒度 due 判斷
3. ArRunResult 持久化 batch log 表
4. N+1 query 優化（Stage 1 / Stage 4）
5. leadTimeDays schema 欄
6. **TASK-AR-IMPL-02-TEST** 獨立軌
7. **TASK-AR-IMPL-UI-01** UI 獨立軌（倉管調整 / 產品決策）
8. 預測性補貨（範圍 B 後續軌）
9. 跨倉自動調撥建議（NX03 範圍）
10. 客戶分級補貨策略

⭐ 等 Crown 拍板「branch merge main + push + tag v0.4.0-ar-closure」、進 NX04 銷貨 / NX05 財務 / TASK-AR-IMPL-02-TEST / TASK-AR-IMPL-UI-01 等下游 task。

### A026 backlog 開單揭露（NX02 範圍）

對齊 [docs/nx02/spec/impl/nx02-merge-verify.md](../nx02/spec/impl/nx02-merge-verify.md) §4.2 邊界揭露：

1. **`nx05-create-allowance-from-pr.ts` 缺 `assertFinancePeriodMutable` 校驗**
   - 既有 `nx05/allowance/allowance.service.ts` line 122 有 financePeriod guard、新 inline helper 0
   - 影響：PR POSTED 落在已關帳期、helper 仍會寫入 Allowance（既有 service 會擋）
   - 風險：低（業務責任歸 PR 過帳時機）
   - 後續軌：補強 helper 加 `assertFinancePeriodMutable` 對齊既有 service

2. **`remark` dedup `PR:<docNo>` 前綴假衝突**
   - inline helper 用 `remark.startsWith('PR:<docNo>')` 做去重
   - 既有 `nx05/allowance/allowance.service` 業務手動建單 remark 自由輸入、若正好以此 prefix 開頭會誤判 dup
   - 風險：極低（業務手動輸入不會用此慣例）
   - 後續軌：移除依賴 remark dedup、改純依賴 schema docNo unique

完整 backlog 10 項（含 UI 獨立軌 / 供應商評核 / forecast / 預付款 / 寄賣 / stage_history / TEST 軌 / DEMO-CLEANUP / NX08 cache / Allowance 工作流）見 [docs/nx02/nx02-summary.md §8](../nx02/nx02-summary.md#-8-backloga026-子項對齊-overview-10--plan-53)。

⭐ 等 Crown 拍板「branch merge main + push + tag v0.5.0-nx02-closure」、進 TASK-NX02-IMPL-UI-01 / TASK-NX02-IMPL-02-TEST / TASK-NX02-DEMO-CLEANUP / NX02 範圍 B（供應商評核）等下游 task。

### A026 backlog 開單揭露（NX04 範圍）

對齊 [docs/nx04/spec/impl/nx04-merge-verify.md](../nx04/spec/impl/nx04-merge-verify.md) §5.2 主要風險 + production 前 verify 拍板：

1. **CreditGuard 4 機制 production 前 verify customer creditStatus 分佈**
   - 風險：既有客戶 creditStatus='F' 凍結 / unpaidAr 超 creditLimit → SO 建單 throw Forbidden
   - 影響：production 既有黑名單 / 超額客戶 SO 流被切斷
   - 後續軌：merge 前 query Nx01Partner GROUP BY creditStatus、SUM unpaidAr vs creditLimit 分佈
   - mitigation：若分佈高風險、短期 disable so.service.create 內 creditGuard.check call

2. **autoTransfer production 前 verify partId × warehouse 倉庫支援覆蓋度**
   - 風險：SO DRAFT→CONFIRMED transit 因部分料件無倉庫支援 throw BadRequest
   - 影響：業務員需手動處理（不是 production 立即斷裂、是 transit 流被擋）
   - 後續軌：query stock_balance GROUP BY partId、評估「無倉庫支援」料件比例
   - mitigation：若覆蓋度低、短期 disable autoCreateTransferFromSo call

3. **nx05-create-allowance-from-sr.ts 缺 assertFinancePeriodMutable 校驗**
   - 仿 NX02 既知邊界（同 nx05-create-allowance-from-pr.ts、之前已登 A026）
   - 風險：低（業務責任歸 SR 過帳時機）
   - 後續軌：補強 helper 加 financePeriod guard 對齊既有 NX05 Allowance service

4. **SR returnAction schema 持久化**（Phase 3c 揭露）
   - 本軌純 dto in-memory、SR row 無法持久化 returnAction
   - 風險：低（業務語意上 R/D/X 只在 POSTED transit 即時分流、過帳後查歷史可從 Nx05Allowance.disposalMethod 反推）
   - 後續軌：可加 schema 欄持久化、對齊 NX02 returnMode F/P/A 範式

5. **autoCreateTransferFromSo 多倉湊 + 地理距離算法**
   - 本軌純單一最近倉（warehouse.sortNo asc）、不足直接 throw
   - 後續軌：多倉湊（從 N 個倉湊 qty）+ 地理距離計算（取代 sortNo）

完整 backlog 13 項見 [docs/nx04/nx04-summary.md §8](../nx04/nx04-summary.md#-8-backloga026-子項對齊-overview-1314--plan-53--phase-5-verify-8)。

⭐ 等 Crown 拍板「branch merge main + push + tag v0.6.0-nx04-closure」、進 TASK-NX04-IMPL-UI-01 / TASK-NX04-IMPL-02-TEST / TASK-NX04-DEMO-CLEANUP / NX04 範圍 B（PRO KPI 業績）等下游 task。

### A026 backlog 開單揭露（NX05 範圍）

對齊 [docs/nx05/spec/impl/nx05-merge-verify.md](../nx05/spec/impl/nx05-merge-verify.md) §5.2 主要風險 + Q-RHYTHM-2 首次落地：

1. **FinancePeriod 校驗 production 前 verify**
   - 風險：本軌補強 2 Allowance helper +assertFinancePeriodMutable、production 既有 PR/SR POSTED 在已關帳期間呼叫會 throw
   - 影響：production 既有 PR/SR POSTED 流可能在關帳期間被擋
   - 後續軌：merge 前 query 既有 Closing CLOSED 期間 PR/SR POSTED 紀錄分佈
   - mitigation：若有歷史紀錄、改 Closing.status='OPEN' reopen 或回滾此校驗

2. **AccountCode application 層 seed-on-tenant-create**
   - 本軌：純 INSERT 對既有所有 tenant、新 tenant 開戶後無 seed
   - 風險：低（新 tenant 開戶後手動跑 seed 或加 application 層 hook）
   - 後續軌：NEXORA tenant 開戶流加 AccountCode seed hook（NX99 tenant.service 升）

3. **note.service CLEARED 觸發 Paylog**（Phase 3c 揭露）
   - 本軌：純文件揭露、留 TASK-NX05-NOTE-PAYLOG 獨立軌
   - 風險：低（業務員手動建 Paylog 沖 AR/AP 仍可運作）
   - 後續軌：升 note.service.update CLEARED 分流自動建 Paylog

4. **createApFromPostedRr / Ti 純 export 不 wire**
   - 本軌：2 新 helper 純 export、不 wire 到 NX02 既有 rr.service / TI 處理流（避免改 NX02 production）
   - 風險：低（LITE 路徑 / TI 過帳 目前手動 path、helper 待 wire）
   - 後續軌：NX02 LITE 路徑 / TI service 啟動時 wire 2 helper

5. **cron decorator 註冊（AR 對帳單每月 1 號）**
   - 本軌：純 endpoint、cron 留 backlog
   - 對齊 AR M1 範式（@nestjs/schedule 或外部 cron）
   - 後續軌：cron decorator + 自動 trigger logic

6. **全 7 子模組 0 test spec**
   - 本軌：純加 3 新 service / 2 helper、未補 test
   - 後續軌：TASK-NX05-IMPL-02-TEST 獨立軌（補 7+3 service 全 0 spec 缺口）

7. **features/finance/FinanceCenterHub.tsx 命名孤兒**
   - 本軌：純 文件揭露、留 TASK-NX05-DEMO-CLEANUP 獨立軌
   - 風險：低（pivot 後殘留、不影響 production）

完整 backlog 14 項見 [docs/nx05/nx05-summary.md §8](../nx05/nx05-summary.md)。

⭐⭐⭐ **Q-RHYTHM-2 首次落地完成**：Crown + Alex 預批 + Hank 全軌連跑 12 commit / 1 migration / 1~2 小時 → stop 給 Crown + Alex 驗收 → Crown 拍板 merge。

⭐ 等 Crown 拍板「branch merge main + push + tag v0.7.0-nx05-closure」、進 TASK-NX05-IMPL-UI-01 / TASK-NX05-IMPL-02-TEST / TASK-NX05-DEMO-CLEANUP / TASK-NX05-NOTE-PAYLOG / NX05 範圍 B（401 報表）等下游 task。

---

## 主題 26｜NX06 物流模組基礎軌全 closure（TASK-NX06-IMPL-01、2026-05-17）⭐⭐⭐

### 起源

NX05 v0.7.0 closure 後、Crown 立即啟動 NX06 物流基礎軌（NEXORA 業務閉環第一階段最後一塊拼圖）。
Hank NX06-AUDIT-01 揭露：
- 既有 3 model（Dn / DnStop / DnItem）設計成熟、4 物流類型 + GPS + 簽收 + 國際 + 異常欄全完整
- 既有 11 ts file（dn-logistics.service 797 lines + 4 controller + DTOs）+ 0 test
- 缺口：印表機 / Lalamove / 配送成本 / 配單 / 跨模組 helper SR/Parcel/PaylogEX / UI menu

Crown 跨 13 題拍板 closure（Q-RHYTHM-2 第二次落地、Crown + Alex 全程預批、Hank 全軌連跑）→ Hank 跨 6 Phase 8 commit 落地（2026-05-17）。

**戰略意義**：
- ⭐⭐ Lalamove API 半自動整合（業界改革：傳統手動 call 司機 → 半自動派單）
- ⭐⭐ 件項層級異常追蹤（W=送錯 / Q=數量 / D=破損 / O=其他）
- ⭐⭐ 配送成本內部記錄（汽配業界客戶不另收運費、月底會計入帳）
- ⭐ NEXORA 業務閉環第一階段全 closure（採購 + 庫存 + 銷貨 + 自動補貨 + 財務 + 物流）

### 設計決策

1. **schema 衝擊最小**（既有 3 model 設計成熟、僅 2 migration 補 1+5 欄、ALTER ADD COLUMN nullable）
2. **dn-logistics.service 不動既有 createXxx/patchDn/簽收路徑**（Phase 3 邊界守住、僅 +3 method 異常+成本）
3. **Lalamove 純 service shell + 環境變數可關**（`LALAMOVE_API_ENABLED` 預設 false = mock）
4. **熱感印表機純 backend 標記**（藍牙 SDK 屬前端 mobile UI 軌）
5. **3 cross-module helper 中 1 wire + 2 pure export**（SR wire 入 sales-return.service / Parcel + PaylogEX 後續軌啟動）
6. **NX05 Nx05DocKind 加 'EX' kind 擴充**（reuse PY-prefix + nx05Paylog 查詢路徑、既有 RC/CP 0 動）
7. **UI 純 stub 5 placeholder + menu.nx06.ts**（Crown Q-U1=c 拍板、TASK-NX06-IMPL-UI-01 獨立軌 backlog）

### 實作歷程（8 commit / 2 migration / 命中 plan 估 12 commit 預算 67%）

| Phase | commit 範圍 | 主軸 | 規模 |
|---|---|---|---|
| Phase 0 | 1 | plan v0.1.0 + 13 拍板 Q | 1 |
| Phase 1 | 2 | M1 (DnItem.internalCost) + M2 (Dn 5 欄 印表機+Lalamove) | 2 |
| Phase 2 | 1 | L1 新建 3 service + DnOps controller 預留 | 1 |
| Phase 3 | 1 | L2 dn-logistics.service 升級（DN/ITEM SEL 補欄 + 3 method）+ DnOps | 1 |
| Phase 4 | 1 | L4 3 cross-module helper + sales-return wire + NX05 docKind EX | 1 |
| Phase 5 | 1 | UI 5 placeholder + menu.nx06.ts + side-menu wire | 1 |
| Phase 6 | 1 | summary + worklog（本主題）+ merge-verify | 1 |
| 收尾 | 1 | pre-merge / merge / push（待 Crown 拍）| - |

### 跨模組視角總覽（NX06 觸發 / 被觸發）

| 跨模組關係 | NX06 角色 | 對應 service / 接點 |
|---|---|---|
| NX04 SO SHIPPED → NX06 DELIVERY | 接收 | createDeliveryDnFromShippedSo（既有 wire）|
| NX04 SR POSTED+R/D → NX06 RETURN_PICKUP | 接收 | createReturnPickupFromPostedSr（本軌 wire）|
| NX03 Parcel → NX06 DnItem | 接收（pure export 不 wire）| createDnItemsFromParcel |
| NX06 DN COMPLETED → NX05 PaylogEX | 觸發（pure export 不 wire）| createPaylogExFromDnCost |
| Lalamove webhook → NX06 DnItem.internalCost | 接收 | LalamoveIntegrationService.handleWebhook |

### 統合教訓

1. **schema 真相揭露 → 衝擊最小**：audit-01 揭露既有 3 model 已含 4 物流類型 + GPS + 簽收 + 國際 + 異常欄，本軌僅補 6 欄 nullable，避免 schema 結構大改。
2. **Q-RHYTHM-2 第二次驗證**：NX05 12 commit / NX06 8 commit，pattern 穩定（plan → M1+M2 → L1 → L2 → L4 → UI → docs）。
3. **dn-logistics.service 邊界守住**：既有 950+ lines service 升級 +3 method、0 動既有 createXxx/patchDn/簽收路徑、避免重構債滾雪球。
4. **cross-module helper wire 策略**：1 wire（SR）+ 2 pure export（Parcel + PaylogEX），降低本軌外部依賴、後續軌可獨立啟動。
5. **Lalamove + 印表機外部整合**：service shell + env toggle + 邊界明確（webhook endpoint 屬 DevOps、藍牙 SDK 屬前端），避免本軌綁外部基礎建設。

### 對應文件

- 業務需求：`docs/nx06/spec/intent/nx06-overview.md`
- 模組架構書：`docs/nx06/nx06-summary.md` v1.0（本主題後產出）
- audit：`docs/nx06/nx06-audit-01.md`
- impl plan：`docs/nx06/spec/impl/nx06-impl-01-plan.md`
- merge verify：`docs/nx06/spec/impl/nx06-merge-verify.md`

### A026 backlog 開單揭露（NX06 範圍）

1. **TASK-NX06-IMPL-02 路線優化**（dual-track 預告、Crown 拍板啟動條件 = 本軌 closure）
   - GPS 軌跡 vs 單點權衡（本軌單點、後續軌可能加軌跡 schema）
   - Lalamove real API 啟動（環境變數 + 公網 webhook endpoint + Lalamove 商家 API key）
   - DN COMPLETED → NX05 PaylogEX wire 入 patchDn 終態 hook
   - NX03 Parcel → DnItem attach 流程（半自動 wire）
2. **TASK-NX06-IMPL-UI-01 UI 獨立軌**：5 placeholder → 真實工作台 + GPS 地圖 component + 藍牙 SDK 對接
3. **TASK-NX06-IMPL-02-TEST**：service shell + helper unit test
4. **DN cost 攤分策略**（目前 webhook COMPLETED + actualFee 只寫第一筆 item.internalCost、應按 qty 加權攤分）
5. **Lalamove webhook 認證**（目前無 signature 校驗、production 啟動前須加 HMAC 校驗）
6. **stop 異常 vs DN 整體狀態解耦**（目前 stop.status='E' 不自動推進 DN 主檔狀態、後續軌可加聚合規則）
7. **配單 dispatch 多司機支援**（目前單一 driverUserId、後續軌可加 co-driver）
8. **internalCost 對單一 item 限制**（目前 SetItemInternalCost 單 item、若 DN 多 stop 多 item 需批次 API）

⭐⭐⭐ **Q-RHYTHM-2 第二次落地完成**：Crown + Alex 預批 + Hank 全軌連跑 8 commit / 2 migration → stop 給 Crown + Alex 驗收 → Crown 拍板 merge。

### A026 補登（Crown 拍板 merge 時新增）

9. **TASK-NX06-LALAMOVE-WIRE**（封測二階）：申請 Lalamove 沙盒帳號 + 商家 API key + 公網 webhook endpoint + HMAC 校驗 → 設 `LALAMOVE_API_ENABLED=true` 啟用 real API
10. **TASK-NX06-PRINTER-WIRE**（封測二階）：採購熱感印表機（Brother / Epson / 漢印 / 芝商熱敏、NTD 2000~5000）+ 前端藍牙 SDK 對接 + 實地測試列印格式
11. **SR POSTED R/D 自動建 RETURN_PICKUP DN 草稿 production 前 verify**：merge 前 Crown 接受 mock + 框架、production 前 verify
    - query 既有 SR POSTED + R/D 路徑分佈（會多寫 nx06_dn DRAFT 筆數）
    - verify 客戶主檔地址覆蓋率（無地址會 skip、不 throw）
    - verify 倉管組長後續手動 PATCH driverUserId / dispatch 流程順暢度

✅ **2026-05-17 18:00 closure**：merge 完成、push 到 origin main、tag `v0.8.0-nx06-closure` 落地。

⭐ 後續軌啟動：TASK-NX06-IMPL-02（路線優化）/ TASK-NX06-IMPL-UI-01 / TASK-NX06-IMPL-02-TEST / TASK-NX06-LALAMOVE-WIRE / TASK-NX06-PRINTER-WIRE。

---

## 主題 27｜NX06 路線優化 + 動態任務轉派全 closure（TASK-NX06-IMPL-02、2026-05-17）⭐⭐⭐ 業界改革候選最強

### 起源

NX06-IMPL-01（v0.8.0）closure 後 Crown 立即啟動 IMPL-02（同日連跑）。NX06-AUDIT-02 5 段技術選型 verify + Crown 5 戰略題拍板（Q1=100/日 → 需 VRP / Q2=c iOS+Android PWA / Q3=a 不做客戶推播 / Q4=a polling 10s / Q5=a 同軌全部）→ Alex 寫 overview v0.2.0 + 18 拍板 → Hank Q-RHYTHM-2 第三次落地、7 commit 全軌連跑。

**戰略意義**：
- ⭐⭐⭐ 中小汽配 ERP 業界第一個動態任務轉派（Crowdsourced Routing 簡化版）
- ⭐⭐ 亞羅核心競爭力（送貨快速 = 市場差異化）
- ⭐⭐ NEXORA 業務閉環第一階段最強拼圖（NX06 範圍 A 全 closure）

### 設計決策

1. **schema 衝擊小**（3 軌新 schema + 1 軌 drift 結算）
2. **dn-logistics.service 0 動既有路徑**（純 additive listActiveForMap method）
3. **OR-Tools 改 pure-js heuristic**（避免 npm 安裝風險、100/日 規模 NN + greedy 夠用）
4. **Google Maps + web-push 全 env toggle mock fallback**（同 Lalamove 範式、Crown 後續軌補 key）
5. **動態交接 3 步驟演算法**：半徑 5km + 任務量平衡 + ETA、半自動倉管組長拍板
6. **PWA infra 既有完整**（前軌已建）、僅升 sw.js v2 push handler + 加客戶端訂閱 helper
7. **M4 drift 結算誠實揭露**（auto-gen 含 pre-existing drift、不隱藏）

### 實作歷程（7 commit / 7 Phase / 命中 plan 估 14 預算 50% ✓）

| Phase | commit | 主軸 | 規模 |
|---|---|---|---|
| Phase 0 | 1 | plan v0.1.0 + overview v0.2.0 | 1 |
| Phase 1 | 1 | 4 migration（M1+M2+M3+M4）| 1 |
| Phase 2-4 | 1（合併）| 4 service + 2 helper + dn-logistics + module | 1 |
| Phase 5 | 1 | sw.js v2 + push subscription helper | 1 |
| Phase 6 | 1 | UI 7 placeholder + menu 升 | 1 |
| Phase 7 | 1 | summary v0.2.0 + worklog + merge-verify | 1 |
| 收尾 | 1 | merge / push / tag v0.9.0（待 Crown）| - |

### 跨模組視角總覽（NX06-IMPL-02 觸發 / 被觸發）

| 跨模組關係 | NX06 角色 | 對應 service |
|---|---|---|
| 純 NX06 內部 | 全 self-contained | 0 cross-module helper 變動 |
| 既有 IMPL-01 4 helper 0 動 | 對前軌 0 影響 | createDeliveryFromSo / createReturnPickupFromSr / createDnItemFromParcel / createPaylogFromDnCost |

⭐ **本軌 0 跨模組 wire**（路線優化是 NX06 純內部演算法、無需外部模組接點）。

### 統合教訓

1. **Q-RHYTHM-2 第三次驗證**：NX05 12 commit / NX06-IMPL-01 8 commit / NX06-IMPL-02 7 commit、節奏穩定、Hank 自決越來越乾淨
2. **schema 衝擊估算範式**：audit-02 揭露既有 lastLat/Lng 已備 → 演算法只需 3 新欄 + 2 新表、避免大改 schema
3. **外部 API 整合 mock 範式套用第三次**（Lalamove / Google Maps / web-push）：service shell + env toggle、Crown API key 不阻擋封測
4. **dn-logistics.service 邊界三次守住**（IMPL-01 Phase 3 不動既有 / IMPL-01 Phase 4 不動既有 / IMPL-02 Phase 4 +1 method 純 additive）：穩定模組升級的安全範式
5. **drift 結算誠實揭露**（M4 包入 pre-existing drift、不隱藏、留 A026 backlog drift-audit 軌）：避免技術債靜默累積

### 對應文件

- 業務需求：`docs/nx06/spec/intent/nx06-overview-v02.md` v0.2.0
- 模組架構書：`docs/nx06/nx06-summary.md` § 9（本主題後產出）
- audit-02：`docs/nx06/nx06-audit-02.md`
- impl plan：`docs/nx06/spec/impl/nx06-impl-02-plan.md`
- merge verify：`docs/nx06/spec/impl/nx06-impl-02-merge-verify.md`

### A026 backlog 開單揭露（IMPL-02 範圍）

1. **TASK-NX06-GOOGLE-MAPS-WIRE**：Crown 申請 Google Cloud API key + 設 GOOGLE_MAPS_API_ENABLED=true
2. **TASK-NX06-WEB-PUSH-WIRE**：install web-push npm + VAPID key 生成 + 設 WEB_PUSH_ENABLED=true
3. **TASK-NX06-EMAIL-FALLBACK**：iOS 15- 用戶 Email 推播 fallback（封測後評估設備分佈）
4. **TASK-NX06-GEOCODE-ADDRESS**：DN.stop.address → lat/lng（取代 lastLat/Lng 假設、提升演算法精度）
5. **TASK-NX06-OR-TOOLS-WIRE**：規模升級（> 200/日）後裝完整 VRP solver
6. **TASK-NX06-DRIVER-HEARTBEAT**：dispatch heartbeat 獨立 endpoint（業務語意分離）
7. **TASK-NX06-DRIFT-AUDIT**：M4 pre-existing drift 來源追溯
8. **TASK-NX06-IMPL-UI-01**：UI 真實 component（地圖 / 外務員 PWA / route view、IMPL-01+02 12 placeholder 全升）
9. **TASK-NX06-IMPL-03**：客戶端配送通知（範圍 B 戰略軌）
10. **TASK-NX06-IMPL-04**：dashboard SSE 升級（規模化後）

⭐⭐⭐ **Q-RHYTHM-2 第三次落地完成**：Crown + Alex 預批 + Hank 全軌連跑 7 commit / 4 migration → stop 給 Crown + Alex 驗收 → Crown 拍板 merge。

### A026 補登（Crown 拍板 merge 時 6 項）

對齊 [NX06-IMPL-02 merge-verify §8 後續軌預告](../nx06/spec/impl/nx06-impl-02-merge-verify.md)：

1. **TASK-NX06-GOOGLE-MAPS-WIRE**：Crown 申請 Google Cloud API key 到後設 `GOOGLE_MAPS_API_KEY` + `GOOGLE_MAPS_API_ENABLED=true` 啟用 real Distance Matrix API
2. **TASK-NX06-WEB-PUSH-WIRE**：`pnpm add web-push` + VAPID key 生成 + 設 `WEB_PUSH_ENABLED=true` 啟用 real push send
3. **TASK-NX06-DRIFT-AUDIT**：M4 pre-existing drift 來源追溯（nx01_warehouse FK / nx01_partner_shipping_address 索引 / nx01_brand_code_rule DEFAULT / RenameIndex × N 等、釐清前軌哪一波 schema vs SQL 偏差）
4. **TASK-NX06-IMPL-UI-01**：UI 真實 component（地圖 + 外務員 PWA + route view、IMPL-01+02 共 12 placeholder 全升真實 UI）
5. **TASK-NX06-IMPL-03**：客戶端配送通知（範圍 B 戰略軌、line / SMS / email）
6. **TASK-NX06-IMPL-04**：dashboard SSE 升級（規模化後 polling → SSE）

✅ **2026-05-17 closure**：merge 完成、push origin main、tag `v0.9.0-nx06-routing-closure` 落地。

⭐⭐⭐ **NEXORA 業務閉環第一階段戰略完成**（採購 + 庫存 + 銷貨 + 自動補貨 + 財務 + 物流基礎 + 物流路線優化）= 5 個 ⭐⭐⭐ 戰略軌 closure 累積（NX03 / AR / NX04 / NX05 / NX06）。

---

## 主題 28｜NX08 報表分析模組 IMPL Q-RHYTHM-2 落地（TASK-NX08-IMPL-01、2026-05-17）⭐⭐⭐ 業務閉環延伸第 8 軌

### 起源

NX06-IMPL-02 closure（v0.9.0、業務閉環第一階段全 closure）後 Crown 立即啟動 NX08 報表分析（業務模組第 8 軌）。NX08-AUDIT-01 9 段揭露 + Crown 5 戰略題拍板（全照推 Q1=c / Q2=b / Q3=a / Q4=b / Q5=b）→ Alex 寫 nx08-overview v0.1.0 → Hank Q-RHYTHM-2 第四次落地、6 commit / 5 Phase 全軌連跑。

**戰略意義**：
- ⭐⭐⭐ NEXORA 業務閉環延伸第 8 軌、Crown 看 NEXORA 的入口
- ⭐⭐⭐ 3 業界改革 dashboard（AR 命中率 + DnHandover 動態交接 + BCG matrix 自動標記）
- ⭐⭐ 7 角色 × 21 dashboard + ETL HTTP endpoint 範式

### 設計決策

1. Cache 0 writer（Q1=c）：8 既有 + 3 新 doc-level Cache 全 schema-only、後續軌 ETL
2. 即時 SQL 聚合範式（對齊既有 monthly-report、不依賴 Cache）
3. 7 角色 dashboard + 3 業界改革 inline（不另抽 service、內嵌對應角色）
4. ETL HTTP endpoint shell（外部 cron 範式、不裝 @nestjs/schedule、mock 同 Lalamove）
5. UI 純 stub 21 placeholder + menu.nx08 8 group + side-menu wire（同 NX02-06 範式）
6. 既有 4 service + 12 endpoint 0 動（穩定模組升級紀律第四次驗證）
7. 3 doc-level Cache snapshot 解 audit-01 §5.2 揭露的 0 業務模組接點缺口

### 實作歷程（6 commit / 5 Phase / 命中 plan 估 8-10 預算 ✓）

| Phase | commit | 主軸 | 規模 |
|---|---|---|---|
| Phase 0 | 1 | plan v0.1.0 + overview v0.1.0 | 1 |
| Phase 1 | 1 | M1 3 doc-level Cache + M2 drift 結算 + 修 NX06 M4 header | 1 |
| Phase 2-3 合併 | 1 | 7 dashboard + 3 業界改革 inline + ETL + module wire | 1 |
| Phase 4 | 1 | UI 22 placeholder + menu.nx08 + side-menu wire | 1 |
| Phase 5 | 1 | summary v1.0 + worklog 主題 4 + _team 主題 28（本主題）+ merge-verify | 1 |
| 收尾 | 1 | merge / push / tag v1.0.0（待 Crown）| - |

### 跨模組視角總覽（NX08 純 read-only 聚合）

| 跨模組關係 | NX08 角色 | 對應 service |
|---|---|---|
| NX02 採購 → NX08 | read | PurchasingDashboard.poStats / arRecallHitRate |
| NX03 庫存 → NX08 | read | WarehouseStaffDashboard.turnover / dormant / lowStockAlert |
| NX04 銷貨 → NX08 | read | SalesRepDashboard + OwnerDashboard + StrategyDashboard.bcgMatrix |
| NX05 財務 → NX08 | read | FinanceDashboard.{ar,ap,cashFlow} |
| NX06 物流 → NX08 | read | WarehouseLeadDashboard.{deliveryCost,routeEfficiency,handoverStats ⭐⭐⭐} |
| AR 自動補貨 → NX08 | read | PurchasingDashboard.arRecallHitRate ⭐⭐⭐ |
| NX01 KPI → NX08 | read | OwnerDashboard.kpiGap / SalesRepDashboard.personalSales |

⭐ **本軌 0 cross-module helper 變動**（純 read-only、上游 production 行為 0 改變）。

### 統合教訓

1. **Q-RHYTHM-2 第四次驗證穩定**（NX05 12 / NX06-IMPL-01 8 / NX06-IMPL-02 7 / NX08 6 commit）：每次更省、Hank 自決越來越乾淨。
2. **「即時 SQL 聚合先行、Cache 後續軌」範式**：保守落地（不為效能 premature optimization）+ Q-RHYTHM-2 Hank Q-H 自決 mock 範式套用 4 次（Lalamove / Google Maps / web-push / ETL）。
3. **業界改革 inline 不另抽 service**（Hank Q-H5）：避免過度切割、業務語意明確、3 個改革 method 落在 3 個不同角色 dashboard（warehouseLead/purchasing/strategy）。
4. **Prisma checksum 教訓**（從 NX06 M4 + 本軌 fix）：migration 應用後不可修改檔案內容（包括註解）、揭露走外部路徑（commit message / worklog / merge-verify）。
5. **doc-level snapshot Cache 範式新建**（per-doc 而非 per-partner-aggregated）：解決 audit-01 揭露的 0 業務模組接點、為後續軌 ETL writer 做 schema 準備。

### 對應文件

- 業務需求：`docs/nx08/spec/intent/nx08-overview.md` v0.1.0
- 模組架構書：`docs/nx08/nx08-summary.md` v1.0（本主題後產出）
- audit-01：`docs/nx08/nx08-audit-01.md`
- impl plan：`docs/nx08/spec/impl/nx08-impl-01-plan.md`
- merge verify：`docs/nx08/spec/impl/nx08-impl-01-merge-verify.md`

### A026 backlog 開單揭露（IMPL-01 範圍）

1. **TASK-NX08-IMPL-UI-01**：UI 真實 chart（21 placeholder → Recharts / Chart.js）
2. **TASK-NX08-IMPL-02-CACHE**：ETL writer 啟動（refresh-cache 真實寫入 11 Cache）
3. **TASK-NX08-IMPL-02-TEST**：service + ETL unit test
4. **TASK-NX08-IMPL-03-EXTRANET**：客戶端 portal（範圍 B、Crown Q5=b 後續軌）
5. **TASK-NX08-IMPL-04-DESIGNER**：自訂報表設計器（PRO 級候選）
6. **TASK-NX08-IMPL-05-AI**：AI 預測分析（銷售 / 庫存 / 客戶流失）
7. **dashboard 即時 SQL 聚合性能 verify**（規模化後）
8. **BCG matrix 演算法精度升級**（true market share、非 top-quartile proxy）

⭐⭐⭐ **Q-RHYTHM-2 第四次落地完成**：Crown + Alex 預批 + Hank 全軌連跑 6 commit / 2 migration → stop 給 Crown + Alex 驗收 → Crown 拍板 merge。

### A026 補登（Crown 拍板 merge 時 7 項）

對齊 [NX08-IMPL-01 merge-verify §8](../nx08/spec/impl/nx08-impl-01-merge-verify.md) + Crown 補登：

1. **commit `b4f4139` message drift**（Phase 2-3 合併 commit 開頭誤寫 "TASK-NX08-IMPL-02"、實際是 IMPL-01 Phase 2-3、內容正確不阻擋、純文字 drift、揭露在此供 git log 查詢時參考）
2. **TASK-NX08-IMPL-UI-01**：UI 真實 chart（21 placeholder → Recharts / Chart.js）
3. **TASK-NX08-IMPL-02-CACHE**：ETL writer 啟動（refresh-cache 真實寫入 11 Cache）
4. **TASK-NX08-IMPL-02-TEST**：service + ETL unit test
5. **TASK-NX08-IMPL-03-EXTRANET**：客戶端 portal（範圍 B、Crown Q5=b 後續軌）
6. **TASK-NX08-IMPL-04-DESIGNER**：自訂報表設計器（PRO 級候選）
7. **TASK-NX08-IMPL-05-AI**：AI 預測分析（銷售 / 庫存 / 客戶流失）

✅ **2026-05-17 closure**：merge 完成、push origin main、tag `v1.0.0-nx08-closure` 落地。

⭐⭐⭐ **NEXORA 主版本 v1.0 達成**（業務閉環第一階段 + 報表分析全 closure、production-ready milestone）= **6 個 ⭐⭐⭐ 戰略軌 closure 累積**（NX03 / AR / NX04 / NX05 / NX06 IMPL-01+02 / NX08）+ 3 業界改革 dashboard 入口完整。

---

## 主題 29｜NX07 人資模組治理補齊 + 跨模組 wire（TASK-NX07-IMPL-01、2026-05-17）⭐⭐⭐ 業務閉環完整化最後一塊

### 起源

NEXORA v1.0.0（NX08 closure）後 Crown 啟動 NX07（業務模組第 9 軌、剩 3 之一）。⚠️ NX07 特殊：**backend 已最完整（16 model / 37 endpoint）、frontend 最落後（1 placeholder）、治理檔落後 2 階段** → 本軌 = 治理補齊 + 跨模組 wire + UI stub + 醫療管理補強（不是建新模組）。

NX07-AUDIT-01 9 段揭露 + Crown 5 戰略題拍板（b/a/a/a/b 全照推）→ Alex 寫 nx07-overview v0.1.0 → Hank Q-RHYTHM-2 第五次落地、7 commit / 6 Phase。

**戰略意義**：
- ⭐⭐⭐ NX04 業績 → NX07 薪資加給 wire（業界中小汽配 ERP 第一個）
- ⭐⭐⭐ NX07 薪資 → NX05 Paylog wire（業務閉環完整化最後一塊：採購 + 銷貨 + **發薪** 三大現金流 100% 接入）
- ⭐ 醫療管理 + 職災追蹤（亞羅特色、汽配業勞工健康）

### 設計決策

1. 既有 16 model + 37 endpoint 0 動（Q-RHYTHM-2 紀律 + Crown Q5=b）
2. 醫療管理 2 新表（MedicalRecord + Injury）
3. NX04→NX07 wire = service-level + 手動觸發（對齊 NX05 ArStatement / NX08 ETL 範式）
4. NX07→NX05 Paylog wire = helper + wire 入 payroll.service.patch CONFIRMED transition
5. payroll.patch wire try/catch wrap（helper 失敗不阻擋 salary CONFIRMED）
6. UI 7+1 placeholder + menu.nx07（8 items 單 group）+ side-menu wire
7. 雙層脫敏 + 主動側既有範式 0 動（穩定模組升級紀律第五次套用）

### 實作歷程（7 commit / 6 Phase / 命中 plan 估 8-10 預算）

| Phase | commit | 主軸 | 規模 |
|---|---|---|---|
| Phase 0 | 1 | plan v0.1.0 + overview v0.1.0 | 1 |
| Phase 1 | 1 | M1 醫療 2 表 + M2 drift 結算 | 1 |
| Phase 2 | 1 | Nx07MedicalService + Controller（9 endpoint）| 1 |
| Phase 3 | 1 | SalaryAccrualService.applyKpiBonus ⭐⭐⭐ | 1 |
| Phase 4 | 1 | createPaylogFromConfirmedSalary helper + wire payroll.patch ⭐⭐⭐ | 1 |
| Phase 5 | 1 | UI 7+1 placeholder + menu.nx07 + side-menu wire | 1 |
| Phase 6 | 1 | summary v1.0 + worklog 主題 5 + _team 主題 29（本主題）+ merge-verify | 1 |
| 收尾 | 1 | merge / push / tag v1.1.0（待 Crown）| - |

### 業務閉環完整化最後一塊里程碑 ⭐⭐⭐

NEXORA 三大現金流 100% wire 進 NX05 Paylog：

| 現金流 | wire helper | 落地軌 / tag |
|---|---|---|
| **採購** | createApFromConfirmedPo + createApFromPostedRr + createApFromPostedTi | v0.5.0-nx02-closure |
| **銷貨** | createArFromShippedSo + createAllowanceFromSalesReturn | v0.6.0-nx04 + v0.7.0-nx05 |
| **發薪** | **createPaylogFromConfirmedSalary** | **本軌 v1.1.0 ⭐⭐⭐** |

### 跨模組視角總覽

| 跨模組關係 | NX07 角色 | wire 範式 |
|---|---|---|
| NX01 User → NX07 | 員工身份（既有 11 reverse FK）| - |
| NX01 KpiTemplate → NX07 SalaryComponent | KPI 規則模板 | 既有 FK + 本軌 wire 用 |
| NX04 SO → NX07 SalaryRecord（業績獎金）⭐⭐⭐ | 接收（service-level query 計算）| Nx07SalaryAccrualService.applyKpiBonus |
| NX07 SalaryRecord → NX05 Paylog（發薪）⭐⭐⭐ | 觸發（helper wire 入 payroll.patch）| createPaylogFromConfirmedSalary |
| NX01 Department → NX07 | 部門結構 | 既有 employee-change.newDepartmentId |

### 統合教訓

1. **Q-RHYTHM-2 第五次驗證穩定**（NX05 12 / NX06-IMPL-01 8 / NX06-IMPL-02 7 / NX08 6 / NX07 7 commit）：每軌規模平均、Hank 自決越成熟。
2. **「穩定模組升級紀律」第五次套用**：既有 backend 0 改、純加強 + 跨模組 wire + 治理檔補齊範式定型。
3. **service-level wire vs helper wire 範式分離**：query-heavy 跨模組（NX04→NX07）走 service-level；過帳鏈 wire（NX07→NX05）走 helper + 注入既有 service。
4. **業務閉環完整化第三大現金流接入里程碑**：NEXORA 至此真正成為「三大現金流全閉環的中小汽配 ERP」。
5. **治理檔範式定型 7 軌**（NX02/03/04/05/06/08/07）：plan → audit → impl plan → summary → merge-verify → worklog 流程穩定。

### 對應文件

- 業務需求：`docs/nx07/spec/intent/nx07-overview.md` v0.1.0
- 模組架構書：`docs/nx07/nx07-summary.md` v1.0（本主題後產出）
- audit-01：`docs/nx07/nx07-audit-01.md`
- impl plan：`docs/nx07/spec/impl/nx07-impl-01-plan.md`
- merge verify：`docs/nx07/spec/impl/nx07-impl-01-merge-verify.md`

### A026 backlog 開單揭露（IMPL-01 範圍）

1. **TASK-NX07-IMPL-UI-01**：UI 真實表單（員工 / 出勤 / 薪資 form + 個人 + 主管 dashboard）
2. **TASK-NX07-IMPL-02-SCHEDULE**：班表系統完整化（schedule × 3 表 endpoint + UI）
3. **TASK-NX07-IMPL-03-EMPLOYEE-PROFILE**：員工主檔擴充（學歷 / 證照 / 緊急聯絡人）
4. **TASK-NX07-IMPL-04-IP-WHITELIST**：IpWhitelist + GPS attendance.checkin wire
5. **TASK-NX07-IMPL-05-SCHEMA-ENDPOINT**：7 schema-only model endpoint 補齊
6. **TASK-NX07-IMPL-06-HANDOVER-BONUS**：NX06 DnHandover → 動態交接獎金 wire
7. **TASK-NX07-IMPL-02-TEST**：service + helper unit test
8. **accountCode 6130 vs 6111 spec-seed drift verify**（Crown spec vs seed）

⭐⭐⭐ **Q-RHYTHM-2 第五次落地完成**：Crown + Alex 預批 + Hank 全軌連跑 7 commit / 2 migration → stop 給 Crown + Alex 驗收 → Crown 拍板 merge。

### A026 補登（Crown 拍板 merge 時 9 項）

對齊 [NX07-IMPL-01 merge-verify §7](../nx07/spec/impl/nx07-impl-01-merge-verify.md) + Crown 補登：

1. **accountCode 6111 vs 6130 spec drift verify**（Alex overview 失誤、Hank 用 seed 真實值 6111 修正、透明揭露、production 前複查）
2. **payroll.patch CONFIRMED 多建 Paylog DRAFT production 前 verify**（既有 NX07 SalaryRecord CONFIRMED 路徑會多寫 nx05_paylog DRAFT、會計手動 POSTED、純 additive 但需 production 前 query 現有 CONFIRMED salary 確認流程順暢）
3. **TASK-NX07-IMPL-UI-01**（UI 真實表單：員工 / 出勤 / 薪資 + 個人 + 主管 dashboard）
4. **TASK-NX07-IMPL-02-SCHEDULE**（班表系統完整化：schedule × 3 表 endpoint + UI）
5. **TASK-NX07-IMPL-03-EMPLOYEE-PROFILE**（員工主檔擴充：學歷 / 證照 / 緊急聯絡人）
6. **TASK-NX07-IMPL-04-IP-WHITELIST**（IpWhitelist + GPS attendance.checkin wire）
7. **TASK-NX07-IMPL-05-SCHEMA-ENDPOINT**（7 schema-only model endpoint 補齊）
8. **TASK-NX07-IMPL-06-HANDOVER-BONUS**（NX06 DnHandover → 動態交接獎金 wire）
9. **TASK-NX07-IMPL-02-TEST**（service + helper unit test）

✅ **2026-05-17 closure**：merge 完成、push origin main、tag `v1.1.0-nx07-closure` 落地。

⭐⭐⭐ **NEXORA 主版本 v1.1 達成**（業務閉環完整化第三大現金流接入 NX05 Paylog、採購 + 銷貨 + 發薪 100%）= **7 個 ⭐⭐⭐ 戰略軌 closure 累積**（NX03 / AR / NX04 / NX05 / NX06 IMPL-01+02 / NX08 / NX07）+ 3 業界改革 wire（NX04→NX07 業績獎金 + NX07→NX05 Paylog 發薪 + 醫療管理 + 職災追蹤）。

---

## 主題 30｜NX09 EIP 重戰場升級 Q-RHYTHM-2 落地（TASK-NX09-IMPL-01、2026-05-17）⭐⭐⭐ 業界 ERP 標配 SystemManual + Postgres FTS

### 起源

NEXORA v1.1.0（NX07 closure）後 Crown 啟動 NX09（業務模組第 10 軌、剩 NX09 + NX10、9/11 → 10/11）。⚠️ Crown 重戰場升級揭露：**NX09 = EIP 企業資訊平台**（不是純小知識庫）。

本軌特殊：backend 完整（10 model / 15 endpoint、worklog 揭露「最純粹穩定模組」、0 follow-up migration）+ frontend 最落後（1 placeholder）+ 治理檔落後 2 階段 → 本軌 = EIP 補強 + 既有升級 + 治理補齊 + UI stub。

NX09-AUDIT-01 9 段揭露 + Crown 5 戰略題拍板（Q1=全要 / Q2=b 拆軌 / Q3=b FTS / Q4=a 全員+角色 / Q5=b SystemManual 新表）→ Hank Q-RHYTHM-2 第六次落地。

⚠️ 特殊狀態：overview v1.0 由 Hank 從 Crown TASK formalize（Alex 本輪未寫）。新範式建立：「Crown TASK 完整時 Hank 可自決 formalize、不 stop」。

**戰略意義**：
- ⭐⭐⭐ SystemManual 內建系統操作手冊（業界 SAP/Oracle/MS Dynamics 標配、中小汽配 ERP 第一個）
- ⭐⭐⭐ Postgres FTS 全文搜尋（純 Postgres 原生、不裝 Elasticsearch、中小 ERP 罕見）
- ⭐⭐ EIP 統一查詢入口

### 設計決策

1. 既有 10 model + 15 endpoint 0 動（Crown「既有 100% 保留」+ Q-RHYTHM-2 紀律）
2. SystemManual 新表（featureKey UNIQUE + 命名 regex `模組.功能.動作`）
3. Postgres FTS 純原生（tsvector + simple + GIN + trigger + backfill）
4. KmArticle DTO @IsIn 純擴（9 enum、純強化 validation）
5. 3 子表 core endpoint only（Hank Q-H3 避免本軌膨脹）
6. UI 6 placeholder + menu.nx09 + side-menu wire（同 NX02-08 範式）
7. Hank 從 Crown TASK formalize overview（Alex 本輪未寫範式建立）

### 實作歷程（7 commit / 7 Phase / 命中 plan 估 8-9 預算）

| Phase | commit | 主軸 | 規模 |
|---|---|---|---|
| 0 | 1 | overview v1.0（從 Crown formalize）+ plan v0.1.0 | 1 |
| 1 | 1 | M1 SystemManual + M2 FTS tsvector + M3 drift | 1 |
| 2-4 合併 | 1 | DTO @IsIn 擴 + SystemManual + FTS + module wire | 1 |
| 5 | 1 | 3 子表 core endpoint | 1 |
| 6 | 1 | UI 5+1 placeholder + menu.nx09 + side-menu wire | 1 |
| 7 | 1 | summary v1.0 + worklog 主題 3 + _team 主題 30（本主題）+ merge-verify | 1 |
| 收尾 | 1 | merge / push / tag v1.2.0（待 Crown）| - |

### 跨模組視角總覽（本軌 0 跨模組 wire）

⭐ 本軌純 NX09 內部 + NX01 主檔 FK（Crown Q2=b 拆軌：跨模組接點留 IMPL-02 後續軌）。

### 統合教訓

1. **Q-RHYTHM-2 第六次驗證穩定**（NX05 12 / NX06-IMPL-01 8 / NX06-IMPL-02 7 / NX08 6 / NX07 7 / NX09 7 commit）：節奏穩定、Hank 自決越成熟。
2. **「穩定模組升級紀律」第六次套用**：既有 backend 0 改、純加強 + 治理檔補齊範式定型 6 次。
3. **「Alex spec 缺、Hank 從 Crown TASK formalize」新範式建立**（本軌首例）：Crown TASK 完整含拍板 + 範圍 + 細節時、Hank 可自決 formalize 為 spec/intent/overview。spec 缺不 stop、Crown prompt 即 spec 源頭。
4. **Prisma drift 結算第四次**（NX06 + NX08 + NX07 + NX09）：標準化處理流程（rename M2/M3/M4 + resolve --applied + DELETE 舊 record）。
5. **Postgres FTS 替代 Elasticsearch 範式**：tsvector + `Unsupported()` + `$queryRaw` + `PrismaNs.sql` tagged template 對 Prisma 不完整支援的 PG 特性。

### 對應文件

- 業務需求：`docs/nx09/spec/intent/nx09-overview.md` v1.0
- 模組架構書：`docs/nx09/nx09-summary.md` v1.0
- audit-01：`docs/nx09/nx09-audit-01.md`
- impl plan：`docs/nx09/spec/impl/nx09-impl-01-plan.md`
- merge verify：`docs/nx09/spec/impl/nx09-impl-01-merge-verify.md`

### A026 backlog 開單揭露（IMPL-01 範圍）

1. **TASK-NX09-IMPL-02-YARO-FEATURE**（亞羅特色 VIN / 維修 SOP / 故障代碼 ⭐⭐⭐）
2. **TASK-NX09-IMPL-03-CROSS-WIRE**（跨模組接點 NX07/NX04/NX02/NX08）
3. **TASK-NX09-IMPL-04-RAG**（Phase 2 RAG 向量化、pgvector / OpenAI embedding ⭐）
4. **TASK-NX09-IMPL-UI-01**（UI 真實 chart + 文件閱讀器 + 全文搜尋 UI）
5. **TASK-NX09-IMPL-UI-MANUAL-WIRE**（NEXORA UI「？」按鈕 wire SystemManual ⭐）
6. **TASK-NX09-IMPL-AUTO-VERSION**（DocumentVersion 自動寫入 + KM viewCount writer）
7. **TASK-NX09-IMPL-MEETING-FULL**（會議子表 endpoint 補齊：Attendee / Minutes / Action）
8. **TASK-NX09-IMPL-02-TEST**（service + FTS unit test）

⭐⭐⭐ **Q-RHYTHM-2 第六次落地完成**：Crown + Alex 預批 + Hank 全軌連跑 7 commit / 3 migration → stop 給 Crown + Alex 驗收 → Crown 拍板 merge。

### A026 補登（Crown 拍板 merge 時 10 項）

對齊 [NX09-IMPL-01 merge-verify §7](../nx09/spec/impl/nx09-impl-01-merge-verify.md) + Crown 補登：

1. **overview formalize 紀律演進**（Hank 自決 formalize、Crown TASK 即 spec 源頭、新範式建立）
2. **tsvector trigger production 前 verify**（既有 KmArticle/Document INSERT/UPDATE 行為、production migration 前複查）
3. **TASK-NX09-IMPL-02-YARO-FEATURE**（VIN / 維修 SOP / 故障代碼、亞羅特色 ⭐⭐⭐）
4. **TASK-NX09-IMPL-03-CROSS-WIRE**（跨模組接點 NX07 / NX04 / NX02 / NX08 → NX09）
5. **TASK-NX09-IMPL-04-RAG**（Phase 2 RAG 向量化、pgvector / OpenAI embedding ⭐）
6. **TASK-NX09-IMPL-UI-01**（UI 真實表單 + 文件閱讀器 + 全文搜尋 UI）
7. **TASK-NX09-IMPL-UI-MANUAL-WIRE**（NEXORA UI「？」按鈕 wire SystemManual ⭐）
8. **TASK-NX09-IMPL-AUTO-VERSION**（DocumentVersion 自動寫入 + KM viewCount writer）
9. **TASK-NX09-IMPL-MEETING-FULL**（會議子表 endpoint 補齊：Attendee / Minutes / Action）
10. **TASK-NX09-IMPL-02-TEST**（service + FTS unit test）

✅ **2026-05-17 closure**：merge 完成、push origin main、tag `v1.2.0-nx09-eip-closure` 落地。

⭐⭐⭐ **NEXORA 主版本 v1.2 達成**（EIP 重戰場升級、業界中小汽配 ERP 第一個 SystemManual + Postgres FTS）= **8 個 ⭐⭐⭐ 戰略軌 closure 累積**（NX03 / AR / NX04 / NX05 / NX06 IMPL-01+02 / NX08 / NX07 / NX09）+ EIP 統一查詢入口落地。剩 NX10 遊戲化（10/11 → 11/11）。

---

## 主題 31｜NX10 八角基礎軌 Q-RHYTHM-2 落地（TASK-NX10-IMPL-01、2026-05-17）⭐⭐⭐ 業務模組 11/11 100%

### 起源

NEXORA v1.2.0（NX09 EIP closure）後 Crown 啟動 NX10（**業務模組最後 1 軌**、本軌 closure 即 **11/11 100%**）。⚠️ Crown 揭露設計哲學：**NX10 = Yu-kai Chou 八角框架（Octalysis Framework）**、9 schema-only model 對應 8 角驅動力、非隨機功能。NX10-AUDIT-01 9 段揭露（含 Crown 16 vs schema 真實 20 medal levels drift 修正）+ Crown 4 戰略題拍板（a/b/a/a）→ Hank Q-RHYTHM-2 第七次落地。

本軌（IMPL-01）= 八角基礎軌、對應驅動力 #2 #4 #6 #7 #8（成就/佔有/稀缺/好奇/損失）；下軌（IMPL-02）對應 #1 #3 #5（使命/賦權/社交）+ 跨模組 wire。

**戰略意義**：
- ⭐⭐⭐ 業務模組 11/11 100% 達成（NEXORA 業務全模組落地）
- ⭐⭐⭐ 八角框架完整落地（中小汽配 ERP 業界第一個完整 gamification）
- ⭐⭐ 驚喜寶箱 + 衝刺（業界 gamification 經典範式）
- ⭐ A029 老債撈回（worklog 主題 1D）

### 設計決策

1. 既有 14 model + 11 endpoint 0 動（Crown「既有 100% 保留」+ Q-RHYTHM-2 紀律）
2. 醫章 20 levels seed（修正 Crown 16 vs schema 真實 20）
3. SurpriseBox 驅動力 #7 新建（隨機 boxType 30%E/30%R/40%N + 隨機 Exp）
4. Sprint 驅動力 #6 新建（限時挑戰、3 sprintType WS/ME/QR）
5. A029 撈回（M2 seed 7 STREAK + checkin.service tenantId filter 移除）
6. 0 跨模組 wire（Crown Q3=a 留 IMPL-02）
7. UI 6 placeholder + menu.nx10 + side-menu wire

### 實作歷程（7 commit / 6 Phase / 命中 plan 估 7-8 預算）

| Phase | commit | 主軸 | 規模 |
|---|---|---|---|
| Phase 0 | 1 | plan v0.1.0 + overview v0.1.0（八角框架）| 1 |
| Phase 1 | 1 | M1 seed（20 medal + 5 TaskTemplate）| 1 |
| Phase 2-4 合併 | 1 | M2 STREAK seed + A029 撈回 + SurpriseBox + Sprint + module wire | 1 |
| Phase 5 | 1 | UI 5+1 placeholder + menu.nx10 + side-menu wire | 1 |
| Phase 6 | 1 | summary v1.0 + worklog 主題 4 + _team 主題 31（本主題）+ merge-verify | 1 |
| 收尾 | 1 | merge / push / tag v1.3.0（待 Crown）| - |

### 跨模組視角總覽（本軌 0 跨模組 wire）

⭐ Crown Q3=a 拍板對齊：本軌純 NX10 內部 + NX01 主檔 FK（跨模組 wire 留 IMPL-02 後續軌）。

| IMPL-02 跨模組 wire 候選 | 八角驅動力 | 業界改革等級 |
|---|---|---|
| NX06 DnHandover → NX10 動態交接獎勵 | #5 社交 | ⭐⭐⭐ 業界第一 |
| NX04 SO 業績 → NX10 排行榜 | #2 成就 | ⭐⭐ |
| NX07 SalaryComponent → NX10 業績加成 | #4 佔有 + #1 使命 | ⭐⭐ |
| NX09 KmArticle → NX10 學習任務 | #2 成就 | ⭐ |

### 統合教訓

1. **Q-RHYTHM-2 第七次驗證穩定**（NX05 12 / NX06-IMPL-01 8 / NX06-IMPL-02 7 / NX08 6 / NX07 7 / NX09 7 / NX10 7 commit）：節奏穩定、Hank 自決越成熟。
2. **「穩定模組升級紀律」第七次套用**：既有 backend 0 改、純加強 + 治理檔補齊範式定型 7 次。
3. **0 prisma drift 罕見**（連 4 軌 NX06+NX08+NX07+NX09 drift 後本軌 0 drift）：純 INSERT seed 無 constraint 名稱差異、新範式建立「純 seed migration 0 drift」。
4. **VARCHAR 寬度檢查新風險條目**：VARCHAR(10) 限制踩坑（PLATINUM_III 11 字）、新增 plan §7 風險範式「seed 前 grep schema VARCHAR 寬度」。
5. **A029 老債撈回新範式**：「老債」實際是「schema 設計（global unique）vs 服務查詢（tenantId filter）的不一致」、撈回 = seed + service line fix（純 additive）。

### 對應文件

- 業務需求：`docs/nx10/spec/intent/nx10-overview.md` v0.1.0
- 模組架構書：`docs/nx10/nx10-summary.md` v1.0
- audit-01：`docs/nx10/nx10-audit-01.md`
- impl plan：`docs/nx10/spec/impl/nx10-impl-01-plan.md`
- merge verify：`docs/nx10/spec/impl/nx10-impl-01-merge-verify.md`

### A026 backlog 開單揭露（IMPL-01 範圍）

1. **TASK-NX10-IMPL-02-SOCIAL-MISSION** ⭐⭐⭐（團隊任務 + 帶新人 + 轉職 + 跨模組 wire 含 NX06 動態交接獎勵 ⭐⭐⭐）
2. **TASK-NX10-IMPL-UI-01**（UI 真實勳章 panel + 排行榜 chart + 任務列表 + 驚喜寶箱動畫 + 衝刺倒數計時器）
3. **TASK-NX10-IMPL-02-TEST**（service + Sprint/SurpriseBox unit test）
4. **TASK-NX10-IMPL-03-CROSS-MODULE-DASHBOARD**（NX08 OwnerDashboard 加 NX10 員工成長 dashboard）
5. **TASK-NX10-SCHEMA-DRIFT-AUDIT**（schema global code unique vs 服務 tenantId filter 不一致釐清）

⭐⭐⭐ **Q-RHYTHM-2 第七次落地完成**：Crown + Alex 預批 + Hank 全軌連跑 7 commit / 2 migration → stop 給 Crown + Alex 驗收 → Crown 拍板 merge。

### A026 補登（Crown 拍板 merge 時 5 項）

對齊 [NX10-IMPL-01 merge-verify §7](../nx10/spec/impl/nx10-impl-01-merge-verify.md) + Crown 補登：

1. **VARCHAR(10) 縮寫 PLAT_/DIA_ UI 完整名對應**（UI 軌處理 PLATINUM/DIAMOND 完整名顯示）
2. **TASK-NX10-IMPL-02-SOCIAL-MISSION** ⭐⭐⭐（八角 #1 #3 #5 + 跨模組 wire：NX06 動態交接獎勵 + NX04 業績 + NX07 薪資加成 + 團隊任務 + 帶新人 + 轉職）
3. **TASK-NX10-IMPL-UI-01**（UI 真實勳章 panel + 排行榜 chart + 任務列表 + 驚喜寶箱動畫 + 衝刺倒數計時器）
4. **TASK-NX10-IMPL-02-TEST**（service + Sprint/SurpriseBox unit test）
5. **TASK-NX10-IMPL-03-CROSS-MODULE-DASHBOARD**（NX08 OwnerDashboard 加 NX10 員工成長 dashboard）

✅ **2026-05-17 closure**：merge 完成、push origin main、tag `v1.3.0-nx10-gamification-closure` 落地。

⭐⭐⭐ **NEXORA 主版本 v1.3 達成 + 業務模組 11/11 IMPL-01 階段 100%**（NEXORA 業務全模組落地里程碑）= **9 個 ⭐⭐⭐ 戰略軌 closure 累積**（NX03 / AR / NX04 / NX05 / NX06 IMPL-01+02 / NX08 / NX07 / NX09 / NX10）+ 八角框架 5 角完整落地（驚喜寶箱 #7 + 衝刺 #6 + 醫章 20 levels #2 + 點數 #4 + 排行 #2#8）。

---

## ⭐⭐⭐ 模組覆蓋進度總表（v1.3 達成時點）

| # | 軌 | 模組 | tag | 狀態 |
|---|---|---|---|---|
| 1 | NX03 | 庫存 | v0.3.0 | ✅ |
| 2 | AR | 自動補貨 | v0.4.0 | ✅ |
| 3 | NX02 | 採購 | v0.5.0 | ✅ |
| 4 | NX04 | 銷貨 | v0.6.0 | ✅ |
| 5 | NX05 | 財務 | v0.7.0 | ✅ |
| 6 | NX06 | 物流基礎 | v0.8.0 | ✅ |
| 7 | NX06 | 路線優化 + 動態交接 | v0.9.0 | ✅ |
| 8 | NX08 | 報表分析 | v1.0.0 | ✅ |
| 9 | NX07 | 人資 | v1.1.0 | ✅ |
| 10 | NX09 | EIP 企業資訊平台 | v1.2.0 | ✅ |
| 11 | NX10 | 八角遊戲化 | v1.3.0 | ✅ **本軌 closure ⭐⭐⭐** |

⭐⭐⭐ **業務模組 IMPL-01 階段 11/11 100% 達成**、Q-RHYTHM-2 7 次落地驗證穩定。
🔵 後續軌池：NX06-IMPL-02（已 closure）+ NX10-IMPL-02（八角 #1#3#5 + 跨模組 wire）+ 各模組 UI 真實獨立軌 + 跨模組 dashboard 整合 + test 軌。

---

## 主題 32｜NX10 社交+使命+跨模組 wire 軌 Q-RHYTHM-2 落地（TASK-NX10-IMPL-02、2026-05-17）⭐⭐⭐ 八角 8 角完整化

### 起源

緊接 IMPL-01 closure（v1.3.0、`8e6e103`）後 Crown 啟動 IMPL-02、目標：八角剩 3 角（#1 使命 / #3 賦權 / #5 社交）+ 3 跨模組 helper wire（業界改革 ⭐⭐⭐）。5 schema-only model 既有 schema 100% 完整（IMPL-01 audit 揭露）、本軌 **0 migration**、純 service + endpoint + wire 升級。**Q-RHYTHM-2 第八次落地**。

戰略意義：
- ⭐⭐⭐ 八角框架 **8/8 完整化**（IMPL-01 5 角 + 本軌 3 角、業界第一個完整 gamification）
- ⭐⭐⭐ 3 跨模組 wire 業界改革（NX06 動態交接獎勵 + NX04 業績排行 + NX07 醫章加碼）
- ⭐⭐ 轉職 3 階審核（業界中小汽配 ERP 首套系統化轉職機制）
- ⭐ Q-RHYTHM-2 第八次驗證、5 commit 連跑、命中 plan 估 9-11 預算 55%

### 設計決策

1. **0 schema migration**（5 schema-only model 既有完整、純 service 升級、A041 估 0 軌精準命中）
2. **TeamTask service**（驅動力 #5）— targetType AT/KP/DR/OT、taskCycle W/M、團隊達標全員 Exp
3. **Mentorship service**（#5 + #1）— HR_ADMIN 指派配對、結束 issueReward 500 Exp 給 mentor
4. **Promotion 3 階審核 service** ⭐⭐⭐（#3 + #2 + #1）— 階段 1 系統驗證 + 階段 2 OWNER 推薦 + 階段 3 HR_ADMIN 審核 → execute 寫 NX01 user.roleId
5. **3 跨模組 helper + wire**（業界改革 ⭐⭐⭐）：
   - createRewardFromHandover ⭐⭐⭐ → NX06 dynamic-handover COMPLETED 雙方各 25 Exp
   - updateRankingFromPerformance → NX04 SO SHIPPED tier-based Exp（>10萬+50/>1萬+20/+5）
   - applyMedalBonusToSalary → NX07 applyKpiBonus 醫章 tier ×1~×1.2 加碼
6. **try/catch wrap 紀律**：3 wire 全部 isolated、helper 失敗不阻擋上游主流程
7. **冪等紀律**：reason/calcBasis prefix 標記去重（HANDOVER:/SO_SHIPPED:/MEDAL-BONUS:）
8. UI 4 placeholder + menu.nx10 6→10 items

### 實作歷程（5 commit / 5 Phase / 命中 plan 估 9-11 預算 55%）

| Phase | commit | 主軸 | 規模 |
|---|---|---|---|
| Phase 0 | `b9476da` | plan v0.1.0（8 functions + 0 migration）| 1 |
| Phase 2-4 合併 | `d966358` | TeamTask + Mentorship + Promotion 3 階審核 + module wire | 1 |
| Phase 5 | `ea479ec` | 3 cross-module helper + wire ⭐⭐⭐ | 1 |
| Phase 6 | `7661a9a` | UI 4 placeholder + menu.nx10 10 items + workspace desc | 1 |
| Phase 7 | （本 commit）| summary v2.0 + worklog 主題 5 + _team 主題 32（本主題）+ merge-verify | 1 |
| 收尾 | 1 | merge / push / tag v1.4.0（待 Crown）| - |

### 跨模組視角總覽（本軌 ⭐⭐⭐ 3 wire 落地）

本軌 = **NEXORA 跨模組 wire 集大成軌**、3 wire 串起 NX04 / NX06 / NX07 → NX10：

| wire | helper | 上游 → 下游 | 業界改革等級 |
|---|---|---|---|
| 1 | createRewardFromHandover | NX06 handover COMPLETED → 雙方 +25 Exp | ⭐⭐⭐ 業界第一 |
| 2 | updateRankingFromPerformance | NX04 SO SHIPPED → tier-based +5/+20/+50 Exp | ⭐⭐ |
| 3 | applyMedalBonusToSalary | NX07 KPI 加給 end → 醫章 tier ×1~×1.2 加碼 | ⭐⭐ |

剩餘候選（後續軌 IMPL-03+）：
- NX09 KmArticle → 學習任務 Exp wire（#2 成就 ⭐）

### 統合教訓（Q-RHYTHM-2 第八次落地）

1. **Q-RHYTHM-2 第八次驗證穩定**（NX05 12 / NX06-01 8 / NX06-02 7 / NX08 6 / NX07 7 / NX09 7 / NX10-01 7 / NX10-02 5 commit）：節奏穩定、Hank 自決越成熟、IMPL-02 軌規模本身比 IMPL-01 小。
2. **「IMPL-02 模式」初次驗證**：當模組 IMPL-01 已 closure + schema 完整、IMPL-02 = 純 service 升級 + 跨模組 wire（0 migration、5 commit 完成）、規模約 IMPL-01 70%。可作為「成熟模組深化軌」標準範式。
3. **跨模組 wire 失敗策略 4 範式集大成**（見 NX10 worklog 主題 5 §A）：遊戲化 wire（try/catch + 冪等）= 最容忍策略、與財務 wire（同步 + 強耦合）對照分明。
4. **冪等 prefix 範式集大成**（見 NX10 worklog 主題 5 §B）：6 helper 全部 prefix 標記、跨模組 wire 第一道防線。

### 對應文件

- 業務需求：`docs/nx10/spec/intent/nx10-overview.md` v1.0
- 模組架構書：`docs/nx10/nx10-summary.md` v2.0
- audit-01：`docs/nx10/nx10-audit-01.md`
- impl plan：`docs/nx10/spec/impl/nx10-impl-02-plan.md`
- merge verify：`docs/nx10/spec/impl/nx10-impl-02-merge-verify.md`
- 主題：`docs/nx10/nx10-worklog.md` 主題 5

### A026 backlog 開單揭露（IMPL-02 範圍）

1. **TASK-NX10-SEED-MEDAL-BONUS-COMPONENT**（系統範本 MEDAL_BONUS component seed、本軌 applyMedalBonusToSalary 走 fallback）
2. **TASK-NX10-IMPL-HANDOVER-REWARD-API**（GET 動態交接 Exp 歷史 endpoint、配合 UI placeholder 真實化）
3. **TASK-NX10-PROMOTION-VERIFY-FULL**（Promotion 階段 1 系統驗證升級：minTenureMonths / KpiRate / noPenaltyDays 真實實作）
4. **TASK-NX10-IMPL-02-TEST**（TeamTask + Mentorship + Promotion + 3 helper unit test）

⭐⭐⭐ **Q-RHYTHM-2 第八次落地完成**：Crown + Alex 預批 + Hank 全軌連跑 5 commit / 0 migration → stop 給 Crown + Alex 驗收 → Crown 拍板 merge → tag v1.4.0-nx10-social-mission-closure。

---

## 主題 33｜NX09 亞羅汽配特色軌（VIN + 維修 SOP）Q-RHYTHM-2 落地（TASK-NX09-IMPL-02、2026-05-18）⭐⭐⭐ 3 業界改革候選全落地

### 起源

緊接 NEXORA v1.4（NX10 雙軌全 closure、八角 8/8 完整化）後 Crown 啟動深化期第二軌：NX09 亞羅汽配特色（VIN/維修 SOP）。NX09-AUDIT-02 8 段業界專業真相 verify（含 Partslink = 紙上計畫 / NHTSA 真實免費 / NX01-16 PartModel 已落地等 5 重大揭露）+ Crown 7 戰略題拍板 closure（c/a/a/b/b/a/a）→ Hank Q-RHYTHM-2 第九次落地。

戰略意義：
- ⭐⭐⭐ **3 業界改革候選全落地**：VIN NHTSA 混合 / 維修 SOP 結構化 / RepairSop↔PartModel 內部 wire 雙向查詢
- ⭐⭐⭐ NX09 雙軌完整化（IMPL-01 EIP + IMPL-02 亞羅特色）= **第二個雙軌完整模組**（前 NX10）
- ⭐⭐ NX01-12~16 vehicle chain 完整化價值兌現（NX01 主檔層 → NX09 業務層直接走、不重建 schema）
- ⭐ Q-RHYTHM-2 第九次穩定驗證、7 commit 連跑、命中 plan 估 8 預算 100%

### 設計決策

1. **0 既有 schema ALTER**（3 新表 + 4 reverse relations、既有 IMPL-01 26 endpoint 100% 保留）
2. VinLookup 主檔（VIN 17 字 UNIQUE per tenant + 對齊 NX01 vehicle chain FK + source API/MANUAL + rawApiResponse）
3. **NHTSA vPIC API 整合**（純 fetch + ENV NHTSA_API_ENABLED + 5s AbortController timeout + graceful fallback）
4. **case-insensitive Make 比對 Nx01CarBrand.nameEn**（NHTSA Make 對照 NEXORA 車型品牌）
5. RepairSop 主檔（code unique + 8 category enum + steps/tools/warnings/photos JSON + carModelFilter FK + difficulty 1-5）
6. **RepairSopPartModel link 表**（FK 完整性 + UNIQUE 兩端 + index 兩端、雙向 wire ⭐⭐⭐）
7. 4 子表 endpoint 全補（ArticleTag 3 + MeetingAction 5 + MeetingAttendee 4 + MeetingMinutes 5 = 17 endpoint）
8. UI 4 placeholder + menu.nx09 6→10 items

### 實作歷程（7 commit / 6 Phase / 命中 plan 估 8 預算 100%）

| Phase | commit | 主軸 | 規模 |
|---|---|---|---|
| Phase 0 | `c80b613` | plan v0.1.0 + overview v0.2.0（Alex 寫）連帶 commit | 1 |
| Phase 1 | `5ea30d7` | M1 3 新表 + M2 constraint naming drift（第 5 次同範式）| 1 |
| Phase 2 | `7cd2c97` | 4 子表 endpoint 補（+17 endpoint）| 1 |
| Phase 3 | `ebf3fd5` | VinLookup + NHTSA client + 8 endpoint ⭐⭐⭐ | 1 |
| Phase 4+5 合併 | `31b2d6e` | RepairSop CRUD 6 + 雙向 wire 4 = 10 endpoint ⭐⭐⭐ | 1 |
| Phase 6 | `25ac493` | UI 4 placeholder + menu.nx09 10 items + workspace desc | 1 |
| Phase 7 | （本 commit）| summary v2.0 + worklog 主題 4 + _team 主題 33（本主題）+ merge-verify | 1 |
| 收尾 | 1 | merge / push / tag v1.5.0（待 Crown）| - |

### 跨模組視角總覽（本軌 0 跨模組 wire、純 NX09 內部 + NX01 上游讀）

對齊 Crown Q5=b 拍板：本軌純內部 wire（RepairSop↔PartModel）+ NX01 vehicle chain 上游讀。跨模組 wire 全留 IMPL-03。

| 接點 | 本軌 |
|---|---|
| NX01 CarBrand / Model / PartModel | ✅ 上游 read-only（VinLookup + RepairSop carModelFilter + link 表）|
| NX07 Training → NX09 Document | ❌ IMPL-03 |
| NX04 SR → NX09 KmArticle | ❌ IMPL-03 |
| NX08 dashboard → NX09 KM 熱門 | ❌ IMPL-03 |

### 統合教訓（Q-RHYTHM-2 第九次落地）

1. **Q-RHYTHM-2 第九次穩定驗證**（NX05 12 / NX06-01 8 / NX06-02 7 / NX08 6 / NX07 7 / NX09-01 7 / NX10-01 7 / NX10-02 5 / **NX09-02 7** commit）：節奏穩定、Hank 自決越成熟。
2. **「IMPL-02 軌」第二次驗證**（前 NX10-IMPL-02）：當 IMPL-01 closure + schema 完整 + 業務需求清晰、IMPL-02 規模約 IMPL-01 60-80%。範式定型為「成熟模組深化軌」。
3. **HTTP client 範式集大成**（NX06 Google Maps + Lalamove + NX09 NHTSA = 3 例）：付費 API mock fallback / 免費 API graceful empty + 業務員 fallback 路徑。
4. **link 表 vs JSON 陣列選擇判準**：FK 完整性 + 反向查詢需求 → link 表勝過 JSON。NX01PartModel / Nx09KmArticleTag / Nx09RepairSopPartModel 三例對齊。
5. **Prisma constraint naming drift 第 5 次同範式**：「純 INSERT/seed migration 0 drift；CREATE TABLE + FK 帶 hand-written 必走 M2 對齊」定型 5 次。

### 對應文件

- 業務需求：`docs/nx09/spec/intent/nx09-overview.md` v0.2.0
- 模組架構書：`docs/nx09/nx09-summary.md` v2.0
- audit-02：`docs/nx09/nx09-audit-02.md`
- impl plan：`docs/nx09/spec/impl/nx09-impl-02-plan.md`
- merge verify：`docs/nx09/spec/impl/nx09-impl-02-merge-verify.md`
- 主題：`docs/nx09/nx09-worklog.md` 主題 4

### A026 backlog 開單揭露（IMPL-02 範圍）

1. **TASK-NX09-IMPL-03-CROSS-WIRE** ⭐⭐⭐（NX07 Training / NX04 SR / NX02 PR / NX08 dashboard → NX09 wire）
2. **TASK-NX09-IMPL-04-RAG** ⭐（pgvector + OpenAI embedding 向量化）
3. **TASK-NX09-IMPL-VIN-API-FALLBACK**（亞洲車型補充：VSCC / 其他第三方 API）
4. **TASK-NX09-IMPL-DTC-LIBRARY**（OBD-II DTC 故障代碼庫 → RepairSop wire）
5. **TASK-NX09-IMPL-UI-01**（真實 UI + 文件閱讀器 + 全文搜尋 UI + VIN 查詢面板 + 維修 SOP 步驟編輯器）
6. **TASK-NX09-IMPL-UI-MANUAL-WIRE**（「？」按鈕全站 wire SystemManual、IMPL-01 backlog 沿用）
7. **TASK-NX09-IMPL-AUTO-VERSION**（DocumentVersion 自動寫入 + KmArticle viewCount writer）
8. **TASK-NX09-IMPL-REPAIRSOP-SEED**（業務員首日範例 SOP seed）
9. **TASK-NX09-IMPL-02-TEST**（VinLookup + RepairSop + NHTSA + 雙向 wire unit test）

⭐⭐⭐ **Q-RHYTHM-2 第九次落地完成**：Crown + Alex 預批 + Hank 全軌連跑 7 commit / 1 主 migration（+ 1 drift 對齊）→ stop 給 Crown + Alex 驗收 → Crown 拍板 merge → tag v1.5.0-nx09-yaro-feature-closure。

### A026 補登候選

1. **NHTSA 亞洲車型實測覆蓋率紀錄**（production 上線後 7 天統計、判斷是否啟動 VIN-API-FALLBACK）
2. **RepairSop seed 案例**（業界改革落地需「首日可用」、無 seed = 業務員無範例）
3. **VIN 17 字 checksum 校驗**（業界進階）— 本軌只驗 length=17、未驗 checksum

### NEXORA 模組覆蓋進度更新

| 模組 | IMPL-01 | IMPL-02 | tag |
|---|---|---|---|
| NX09 | ✅ v1.2.0-nx09-eip-closure | ✅ **v1.5.0-nx09-yaro-feature-closure（待 Crown）** | - |
| NX10 | ✅ v1.3.0 | ✅ v1.4.0 | - |

⭐⭐⭐ **雙軌完整化模組 2/11**（NX09 + NX10）。後續軌雙軌完整化候選：NX06（已 IMPL-02 closure、IMPL-03 待）。

