<!-- docs/plans/2026-04-24_workstation-pivot-plan.md -->
# Workstation Pivot — Master Plan v1.1

> 計畫日期：2026-04-24（v1.0）/ 2026-04-25（v1.1 修訂）
> 計畫負責：Crown Lin（拍板）+ Alex（草擬）
> 對應決策：[2026-04-24_workstation-pivot.md](../decisions/2026-04-24_workstation-pivot.md)
> 文件類型：Master Plan（roadmap，不是 spec、不是 task list）
> 狀態：v1.1 完成 → 進入 Phase 0
>
> **📝 v1.1 變更摘要**：
> - Crown 拍板 3 個關鍵決定（Phase 0 接 DB / 庫存中心 5 頁歸新架構 / Pilot 換 W2 minimal slice）
> - 整合 Hank 19 項 review（4🔴 + 8🟡 + 4🟢 + 3❓），全部接受
> - Phase 2 規模從 XL 升 XXL（多 5 個庫存中心頁），可能拆 2a/2b
> - Phase 0 新增 B5 RFQ/QT API
> - 第 4 章 Pilot 整章重寫（W1 → W2 minimal slice）

---

## 一頁摘要

**這份文件存在的理由**：把決策紀要的抽象決定變成可執行的時序。

決策紀要回答「**為什麼這樣決定**」，spec 回答「**系統長怎樣**」，這份 plan 回答「**在什麼順序、依賴什麼前置條件、產出什麼可驗證的東西**」。三份文件性質不同，缺一不可。

**4 個 Phase**：

```
Phase 0：地基（L+，含 DB）
   ↓
Phase 1：Pilot 工作台（M，W2 minimal slice）  📝 v1.1：原本是 W1，改 W2 minimal slice
   ↓
Phase 2：剩餘工作台（XXL，可拆 2a/2b）  📝 v1.1：規模從 XL 升 XXL
   ↓
Phase 3：收尾（M）
```

**Pilot 工作台揭曉**：**W2 國內銷貨工作台 — minimal slice 版本**（理由見第四章）。
> 📝 v1.1 變更：原本選 W1 即時查詢報價，因 Hank C4 review 指出無法驗證 Phase 0 三大創新核心，改 W2 minimal slice。W1 移到 Phase 2 開頭做。

**規模一覽**：

| Phase | 規模 | 備註 |
|---|---|---|
| Phase 0 | L+ | Schema + Backend API（含新增 B5）+ SYS-C 翻譯器 + 接本機 Postgres |
| Phase 1 | M | Pilot = W2 minimal slice，僅驗 Phase 0 核心 |
| Phase 2 | XXL | W1 + W3 + W4 + W5 + 庫存中心 5 頁，可拆 2a/2b 平行 |
| Phase 3 | M | 教學模式邊界 + PROJECT_CONTEXT 同步 + bug 收尾 |

**關鍵里程碑**：
- M1：Phase 0 完成 → 可用 Postman 跑完整 SO lifecycle，本機 Postgres 真實寫入
- M2：Pilot W2 minimal slice demo → 業務可在手機真機完整跑過「超賣 1 項 → 自動建 IT → committed 雙帳更新」核心鏈
- M3：Phase 2 完成 → 5 工作台齊全 + 庫存中心 5 頁改讀新 API
- M4：收尾完成 → repo 內無 inconsistency、新人讀文件不混亂

---

## 一、工作項目盤點（Inventory）

從決策紀要抽出所有要做的事，每項標規模（S/M/L/XL）。

### 1.1 Schema 類

| # | 項目 | 規模 | 說明 |
|---|---|---|---|
| S1 | SO.lineItem 加 transferSource（兩欄） | M | 📝 v1.1：拆兩欄，type enum + ref FK。詳見下方範例碼 |
| S2 | committed_stock 雙帳設計（實體欄位+trigger） | L | 📝 v1.1：直接用實體欄位+trigger，不採 view 方案。Migration SQL 手寫塞進 Prisma migration |
| S3 | BX/DN 改 1:N | M | BX 加 relatedSoNumber + relatedLineItemIds[]，DN 同理 |
| S4a | IT/TI 既有欄位加 NOT NULL | S | 📝 v1.1：原 S4 拆成兩行 |
| S4b | CO 新增 relatedSoNumber + relatedLineItemId 欄位（含 NOT NULL） | S+ | 📝 v1.1：CO 是新增欄位，不是約束既有欄位 |
| S5 | lineItem 加 fulfillStatus 欄位 | S | 📝 v1.1：補 Hank C5 漏掉的層。enum: waiting_supply / in_picking / in_packing / in_delivery / delivered |

#### 📝 S1 Prisma 範例碼（v1.1 新增）

```prisma
// 不再用：
//   transferSource String  // 'transfer:Z02' / 'inquiry:D-O104' ...

// 改為兩欄：
model Nx04SoLineItem {
  // ...其他欄位
  transferSourceType  TransferSourceType  @map("transfer_source_type")
  transferSourceRef   String?             @db.VarChar(15) @map("transfer_source_ref")
  // ref 對齊 CLAUDE.md ID 欄位規則 VARCHAR(15)
  // 存 Nx01Warehouse.id（轉倉時）或 Nx01Partner.id（同行調貨時）或 Nx04Co.id
}

enum TransferSourceType {
  self      // 本倉夠
  transfer  // 自倉調撥
  inquiry   // 同行調貨
  co        // 客戶訂單
}
```

應用層拼字串顯示「轉倉-Z02」「同行-O104」給業務看，DB 結構化儲存。

### 1.2 Backend API 類

| # | 項目 | 規模 | 說明 |
|---|---|---|---|
| B1 | SO 建立 API + 翻譯邏輯 | L | POST /so 接受 lineItems 含 transferSource，後端翻譯器自動建 IT/TI/CO |
| B2 | committed_stock 反查 API | M | GET /part/:id/committed-stock 回傳所有未出 SO.lineItem 清單 |
| B3 | BX/DN 多筆生成 API | M | 倉管「完成包貨」可選擇生 1 張或 N 張 BX |
| B4 | 既有 API breaking change 評估 | S | 現有 SO API 哪些 caller 會中斷 |
| B5 | RFQ/QT/TI/CO REST API | M | 📝 v1.1 新增：W2 minimal slice 需要 translator 自動建 RFQ，故此 API 必須存在於 Phase 0 |

### 1.3 SYS-C 翻譯器（後端唯一）

| # | 項目 | 規模 | 說明 |
|---|---|---|---|
| Y1 | SYS-C 翻譯器 service | L | 📝 v1.1 修正：位置明確 = `apps/nx-api/src/nx04/so/sys-c-translator.service.ts`，**只在後端**。前端不 parse 不翻譯 |
| Y2 | planSoAdvance 重寫（看 fulfillStatus） | M | 📝 v1.1 修正：看 fulfillStatus（C5 補的層）不看 transferStatus |

### 1.4 Frontend 工作台類

| # | 項目 | 規模 | 說明 |
|---|---|---|---|
| W1 | 即時查詢報價工作台 | M | 📝 v1.1 變更：移到 Phase 2 開頭做，不再是 Pilot |
| W2 | 國內銷貨工作台 | XL | 含 minimal slice（Phase 1 Pilot）+ 完整版（Phase 2）|
| W2-mini | W2 最小切片版 | M | 📝 v1.1 新增：1 lineItem + 2 種 transferSource + 不可編輯。Phase 1 Pilot |
| W3 | 銷售退回工作台 | M | 純退 vs 走保固分流 |
| W4 | 同行詢價工作台 | M | 📝 v1.1 變更：規模從 S 升 M，因 RFQ/QT 從 Zustand 改後端 |
| W5 | 同行調貨工作台 | M | 從同行詢價的 QT 接力建 TI 調貨單 |

### 1.5 庫存中心 5 頁改讀新 API（v1.1 新增整段）

📝 v1.1 新增：對應決定 2 拍板「歸新架構」+ Hank B3 review。

| # | 項目 | 規模 | 說明 |
|---|---|---|---|
| W6 | 庫存中心 - 調撥工作站（transfer）改讀新 API | M | MobileTransferListPage 重接後端 |
| W7 | 庫存中心 - 同行取貨工作站（ti）改讀新 API | M | MobileInquiryPickupListPage 重接後端 |
| W8 | 庫存中心 - 撿貨工作站（picking）改讀新 API | M | MobilePickingListPage 重接後端 |
| W9 | 庫存中心 - 包貨工作站（packing）改讀新 API | M | MobilePackingListPage 重接後端 |
| W10 | 庫存中心 - 送貨工作站（delivery）改讀新 API | M | MobileDeliveryListPage 重接後端 |
| W11 | 銷售中心首頁 StatusSection 改讀新 API | S | 純讀取改寫 |

### 1.6 共用元件類

| # | 項目 | 規模 | 說明 |
|---|---|---|---|
| C1 | 料號搜尋元件 | M | 5 工作台共用 |
| C2 | 客戶選擇元件 | S | 已有雛形，抽出來通用化 |
| C3 | 明細表編輯元件 | L | 含結構化備註下拉、超賣偵測、即時毛利試算、同行 quick-add modal |
| C4 | committed_stock 視覺化元件 | M | 「物理 124 / 已承諾 -18 / 待補貨 18」三段顯示 + 反查展開 |
| C5 | 同行 quick-add modal | S | 📝 v1.1 新增：對應 Hank S3 review，下拉旁可快建同行（最少欄位） |

### 1.7 Migration 類

| # | 項目 | 規模 | 說明 |
|---|---|---|---|
| M1 | 既有 SO data 補 transferSource 值 | M | mock data 全部標 self；DEMO 4 筆情境 C/D 手工標對應值 |
| M2 | 既有 BX/DN 1:1 結構過渡 | S+ | 📝 v1.1 細化：SO.relatedBxNumber 標 deprecated 保留 1 release 週期；新邏輯一律用 BX.relatedSoNumber 反查；附 migration script 範例 |

### 1.8 文件更新類

| # | 項目 | 規模 | 說明 |
|---|---|---|---|
| D1 | PROJECT_CONTEXT.md 哲學第 2、3、7 條改寫 | S | 對應決策紀要 2.3 節 |
| D2 | 5 個工作台分別寫 spec | L 總和 | 每個工作台 1 份 spec |
| D3 | SO data model 重寫 spec | M | 含雙帳概念、transferSourceType+Ref 兩欄、fulfillStatus、BX/DN 1:N、deprecated 策略 |
| D4 | SYS-C 翻譯器 spec | M | 後端 service 設計文件 |
| D5 | navigation-context-policy.md | S | 📝 v1.1 新增：對應 Hank C3 review，跨工作台傳資料規則 |

### 1.9 教學模式邊界處理

| # | 項目 | 規模 | 說明 |
|---|---|---|---|
| T1 | /sop-demo 入口加 banner | S | 「這是教學模式，正式作業請用工作站」 |
| T2 | SOP 的 SYS-C 要不要對齊新工作台 | ❓ | 暫不決，等新工作台穩定後再評估 |
| T3 | 11 ⚠️ 中 SOP 內的 bug 順手清還是不動 | S | 屬於教學模式內部品質，可選擇延後 |

📝 v1.1 註：T1~T3 範圍縮小到只剩 /sop-demo 一條路徑，庫存中心 5 頁不再屬教學模式（已歸新架構）。

### 1.10 Housekeeping

| # | 項目 | 規模 | 說明 |
|---|---|---|---|
| H1 | feature/spec-reverse-sw01 分支處置 | S | merge / 留 reference / 廢棄三選一 |
| H2 | 架構債 A015 處理 | S | PROJECT_CONTEXT 提及 develop 但實際無，同步修正 |
| H3 | 11 ⚠️ 真 bug 開修 task | S | TIER_TARGET_MARGIN、OrderPreview、TodoGroup 等 |

**項目總數**：v1.0 = 32 項 → v1.1 = **40 項**（+8：S4 拆 2、S5 補 1、B5 補 1、W2-mini 補 1、W6~W11 加 6、C5 補 1、D5 補 1、扣掉 W1 在 Phase 1 變 Phase 2 不算新增）。

---

## 二、依賴關係圖

📝 v1.1 變更：D3/D4 改與 Schema 同層平行（虛線連下游）；新增 W6~W11 的依賴鏈。

```
                              ┌─────────────────────┐
                              │  D1: 哲學文件改寫    │  可平行
                              │  H1/H2/H3: 雜事     │  可平行
                              └─────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                   Phase 0：地基                            │
│                                                           │
│  S1   S2   S3   S4a  S4b  S5  ←── Schema             │
│   │   │    │    │    │    │     ┊                       │
│   │   │    │    │    │    │     ┊（虛線：spec 同步起步） │
│   │   │    │    │    │    │     ▼                       │
│   │   │    │    │    │    │   D3   D4   D5             │
│   ▼   ▼    ▼    ▼    ▼    ▼     │    │    │            │
│  M1   M2                          │    │    │            │
│   │   │                           │    │    │            │
│   ▼   ▼                           │    │    │            │
│  B1   B2   B3   B4   B5  ←── Backend API（含新增 B5）   │
│   │                                                       │
│   ▼                                                       │
│  Y1   Y2          ← SYS-C 翻譯器（後端唯一）              │
└──────────────────────────────────────────────────────────┘
   │
   ▼
┌──────────────────────────────────────────────────────────┐
│              Phase 1：Pilot = W2 minimal slice            │
│                                                           │
│  C1   C2   C5    ← 共用元件（含 quick-add modal）         │
│   │                                                       │
│   ▼                                                       │
│  W2-mini：W2 最小切片版                                   │
│   │                                                       │
│   ▼                                                       │
│  D2-W2-mini：W2 minimal slice 的 spec 同步寫進 repo      │
└──────────────────────────────────────────────────────────┘
   │
   ▼
┌──────────────────────────────────────────────────────────┐
│              Phase 2：剩餘工作台 + 庫存中心 5 頁             │
│              （規模 XXL，可拆 2a / 2b 平行）              │
│                                                           │
│  C3   C4   ← 重型共用元件                                 │
│   │                                                       │
│   ▼                                                       │
│  Phase 2a（銷售工作台延伸）              │ Phase 2b（庫存中心改寫）│
│  ─────────────────────────              │ ─────────────────       │
│  W2 完整版（接續 W2-mini）              │ W6  調撥                │
│  W1 即時查詢報價                          │ W7  同行取貨           │
│  W3 銷售退回                              │ W8  撿貨               │
│  W4 同行詢價                              │ W9  包貨               │
│  W5 同行調貨                              │ W10 送貨               │
│                                          │ W11 StatusSection 改寫│
│  D2-W1~W5 spec 同步                      │                        │
│                                          │                        │
└──────────────────────────────────────────────────────────┘
   │
   ▼
┌──────────────────────────────────────────────────────────┐
│                  Phase 3：收尾                            │
│                                                           │
│  T1：/sop-demo banner                                     │
│  T2：SOP SYS-C 對齊決策（看 Phase 2 學到什麼再決定）       │
│  T3：11 ⚠️ SOP bug 處理或不處理拍板                       │
│  舊 fulfillment store / useSalesStore 廢棄處理            │
│  PROJECT_CONTEXT 哲學第 2/3/7 條正式落地                  │
└──────────────────────────────────────────────────────────┘
```

**關鍵依賴規則**：
- Schema (S1~S5) 是所有東西的根，先動
- Migration (M1, M2) 緊跟 Schema
- Backend API (B1~B5) 依賴 Schema
- SYS-C (Y1, Y2) 依賴 Schema + Backend
- 所有 Frontend 都依賴 Phase 0 完整完成
- D3/D4/D5 spec 與 Schema 同步起步（不是事後補）
- D1 哲學改寫 / Housekeeping 全可平行
- 📝 v1.1：庫存中心 5 頁（W6~W10）+ StatusSection（W11）依賴 Phase 0 + C3/C4，可與 Phase 2a 平行

---

## 三、階段拆分（Phases）

### Phase 0：地基

**包含項目**：S1, S2, S3, S4a, S4b, S5, M1, M2, B1, B2, B3, B4, **B5（v1.1 新增）**, Y1, Y2, D3, D4, **D5（v1.1 新增）**

**規模**：L+

**完成定義**（📝 v1.1 修訂）：可以用 Postman 跑完整 SO lifecycle，**真實寫入本機 Docker Postgres**。

具體：
1. 啟動本機 Docker Postgres（既有 R7 dev 環境）
2. 跑 Prisma migration（含 trigger SQL）建 schema
3. 跑 seed 建測試資料
4. 開 Postman，載入「Phase 0 SO Lifecycle」collection
5. 按 Run，依序打：
   - POST /so（建單，5 個 lineItems：3 self + 1 transfer + 1 inquiry）
   - 系統自動建 1 張 IT（Z02 那項）+ 1 張 RFQ（同行那項）
   - GET /part/:id/committed-stock 回傳負數來源清單
   - POST /it/:id/complete → 對應 lineItem fulfillStatus 推進
   - POST /pk（自動建撿貨單）
   - POST /pk/:id/complete → lineItem fulfillStatus = in_packing
   - POST /bx（業務手動建 2 張包貨單，分別包不同 lineItem 組合）
   - POST /bx/:id/complete → lineItem fulfillStatus = in_delivery
   - POST /dn（每張 BX 對應 DN）
   - POST /dn/:id/sign → lineItem fulfillStatus = delivered
6. 檢查 SO.status = completed（所有 lineItem 都 delivered）
7. 全程 NestJS logger 印 trace log，可即時查看翻譯器運作

**可驗證 demo**：Postman collection（共享給 Crown）+ terminal trace log。

**為什麼是地基**：上面 lifecycle 跑通，所有工作台都不用擔心後端會壞。

**注意**：
- 📝 v1.1：本 Phase **接真實 DB**（不是 in-memory），demo 跑 Postman + trace log
- 不含 UI 工作
- 文件 D3/D4/D5 與 Schema 同步寫
- 既有 R7 fulfillment store / useSalesStore 與這條新後端鏈**並存**，前端 mock 維持原狀，新 API 是另一條路

---

### Phase 1：Pilot = W2 minimal slice

📝 v1.1 整章重寫：原本是 W1 即時查詢報價，改為 W2 minimal slice。

**包含項目**：C1, C2, C5, W2-mini, D2-W2-mini

**規模**：M

**完成定義**：業務可以在手機真機完整跑過「超賣 1 項 → 自動建 IT → committed 雙帳更新 → trace 看到 SO/IT 連動」核心鏈。

#### W2 minimal slice 範圍精確定義

```
✅ 包含：
- 業務可選客戶（用 C2 元件）
- 業務可加 1 項 lineItem（且只能 1 項）
- 該 lineItem 數量可超過本倉庫存（觸發超賣偵測）
- 結構化備註下拉支援 2 種：
    self（本倉夠時隱藏）
    transfer:Z02（本倉不夠時強制下拉、選項只給 Z02 一個）
- 送出後後端 SYS-C translator 自動：
    建 SO（status = waiting_supply）
    建 1 張 IT（針對 transfer 的 lineItem）
    committed_stock 雙帳更新
- 業務畫面顯示「物理 / 已承諾 / 待補貨」三段（用 C4 雛形）
- IT 完成後 SO.lineItem.fulfillStatus 推進

❌ 不包含：
- 多 lineItem
- inquiry / co 兩種 transferSource（含 RFQ 自動建立 — 雖然 Phase 0 B5 已備妥）
- 明細編輯（建完即建完，不能改）
- 取貨方式 / 簽單方式
- 多倉選擇（transfer 只給 Z02）
- PK/BX/DN 後段（Phase 1 demo 只跑到 SO+IT 建立完成就停）
- 同行 quick-add modal（C5 在 Phase 1 不啟用，留 Phase 2）
```

**可驗證 demo**：手機真機跑一輪，搭配 Postman/trace log 對照後端動作。

#### 為什麼選 W2 minimal slice 當 Pilot

完整論述見第四章。

---

### Phase 2：剩餘工作台 + 庫存中心 5 頁

📝 v1.1 變更：規模從 XL 升 XXL，可拆 2a/2b 平行。

**包含項目**：
- Phase 2a（銷售工作台延伸）：C3, C4, W2 完整版, W1, W3, W4, W5, D2-W1/W2/W3/W4/W5
- Phase 2b（庫存中心改寫）：W6, W7, W8, W9, W10, W11

**規模**：XXL（可拆 2a + 2b 平行降到 L + L）

**完成定義**：5 工作台都可獨立操作 + 庫存中心 5 頁讀新 API + StatusSection 讀新 API + 工作台間連動測過。

**進場順序建議**：

```
Step 2.1：C3 + C4 重型共用元件（必須先完成，Phase 2a/2b 共用）
Step 2.2：Phase 2a 與 Phase 2b 同時開啟（如果有人力平行）

  Phase 2a：
    W2 完整版（從 minimal slice 擴充）
    W1 即時查詢報價
    W4 同行詢價
    W5 同行調貨（依賴 W2 + W4）
    W3 銷售退回（最獨立，最後做）

  Phase 2b：
    W6~W10 庫存中心 5 頁改讀新 API
    W11 StatusSection 改讀新 API

Step 2.3：跨工作台連動測試
    W2 → W6（建單後倉管調撥工作站看到）
    W2 → W7（同行調貨後同行取貨工作站看到）
    W2 → W8 → W9 → W10（撿貨/包貨/送貨完整鏈）
```

**完成定義細節**：

| 工作台 | 完成定義 |
|---|---|
| W2 完整版 | 多 lineItem + 全 4 種 transferSource + 明細編輯（依 Q7 規則）+ 取貨/簽單方式 |
| W1 | 4 子區（查庫存/看庫位/看歷史/立即報價），keystroke 切換 |
| W3 | 選原 SO + 選退項 + 純退/走保固分流 + 產出後續單據 |
| W4 | 從 W2 觸發的 inquiry → 自動建 RFQ → 收同行報價 → 選用 → 產 QT |
| W5 | QT 接力建 TI 調貨單 + 入庫追蹤 |
| W6~W10 | 5 頁倉管 workstation 改讀新 API，可看到 W2 建出的 SO/IT/TI/PK/BX/DN |
| W11 | 銷售中心首頁 StatusSection 顯示新 API 的 SO 進度 |

**可平行降規模的條件**：
- C3/C4 完成後，Phase 2a 跟 Phase 2b 可同時推進（需要兩條 feature 分支）
- Phase 2b 5 頁互相獨立，可一頁一頁來
- W5 必須等 W2 + W4 都基本可用才能開
- W3 可隨時插隊

---

### Phase 3：收尾

**包含項目**：T1, T2, T3, D1, H1, H2, H3 + 舊 fulfillment store / useSalesStore 廢棄

**規模**：M

**完成定義**：repo 內無 inconsistency，新人讀文件不會混亂。

具體：
1. /sop-demo 入口有 banner 標示「教學模式」
2. PROJECT_CONTEXT.md 哲學第 2、3、7 條改寫到位（正式落地）
3. 11 ⚠️ 真 bug 全部修完或標「保留現狀」
4. 舊 store 處理：
   - useSalesStore：教學模式 /sop-demo 仍在用 → 鎖定不擴充、加 deprecated 註解
   - 庫存中心 5 頁的 useSalesStore consumer：Phase 2b 已切到新 API，這裡確認舊 import 全清掉
5. SO.relatedBxNumber 等 deprecated 欄位的 1 release 週期到期，正式刪除
6. feature/spec-reverse-sw01 分支處置完成
7. 架構債 A015、A016 都標為「已處理」
8. 所有新增 spec 的交叉引用補齊

---

## 四、Pilot = W2 minimal slice

📝 v1.1 整章重寫。

### 4.1 Pilot 拍板：W2 minimal slice

對應 Hank C4 review + Crown 決定 3 拍板。

### 4.2 為什麼換 Pilot

#### Phase 0 三大創新驗證表（核心邏輯）

| 維度 | W1（原 Pilot） | W2 minimal slice（新 Pilot） |
|---|---|---|
| 創新 1：transferSource + 結構化備註 | ❌ 完全不碰 | ✅ 直接驗 |
| 創新 2：SYS-C 翻譯器 | ❌ 完全不碰 | ✅ 直接驗 |
| 創新 3：committed_stock 雙帳寫入 | ✅ 唯讀顯示 | ✅ **寫入** + 唯讀 |

#### 一句話結論

> **W2 minimal slice 是 Phase 1 階段唯一能「端到端」驗證 Phase 0 三大創新的選擇**。
>
> W1 只能驗單點，W2 minimal slice 能驗整條鏈：「業務操作 → translator → SO 寫入 → IT 自動建立 → committed 雙帳更新 → 顯示給業務」。
>
> ERP 系統的核心風險永遠在「整條鏈」，不在「單點」。

#### 風險曲線對比

```
若 Pilot 選 W1（原方案）：
  Phase 0 ✅ → Phase 1 W1 ✅ → Phase 2 W2 真實場景 → 💥 發現 SYS-C 設計缺陷
  → 回頭改 Schema → 重 refactor 1~2 週

若 Pilot 選 W2 minimal slice（新方案）：
  Phase 0 ✅ → Phase 1 W2-mini → 💥 早期發現問題 → 修正 → Phase 2 順
  → 總時間反而短
```

### 4.3 為什麼不選其他工作台

| 工作台 | 不選原因 |
|---|---|
| **W1 即時查詢報價** | 只驗單點（committed 顯示），不碰核心鏈 |
| **W3 銷售退回** | 業務頻率低、跟其他工作台連動少 |
| **W4 同行詢價** | 依賴 W2 + W5 才有完整意義，獨立做不能驗連動 |
| **W5 同行調貨** | 依賴 W2 + W4，根本沒辦法當第一個 |
| **W2 完整版** | XL 規模，當 Pilot 太重，失敗時浪費太多 code |

### 4.4 W2 minimal slice 完成後的「學到什麼」清單

預期會釐清以下事項：

- transferSource 兩欄結構（type + ref）在前端表單實際長相
- committed_stock 雙帳數字怎麼顯示業務最看得懂
- SYS-C translator 在自動建 IT 時的 race condition 表現（有沒有實際 deadlock）
- C1 料號搜尋元件的 props 設計穩不穩定
- C2 客戶選擇元件的 props 設計穩不穩定
- 跨工作台 navigation context 在 W2-mini → 倉管工作站的傳遞模式（Phase 0 已寫 D5 policy，這裡實證）
- 哪些 mock data 在 W2-mini 場景特別需要（影響 DEMO 資料設計）
- W1 之後做的時候，C1/C2 是不是真的可以重用

這些學到的東西**必須回寫到 spec**，再進入 Phase 2。

### 4.5 W1 改放 Phase 2 開頭做的新價值

W1 原本當 Pilot 是「成熟既有 keystroke 鏈」的代表作。改放 Phase 2 後，新的價值是：
- C1 + C2 已在 W2-mini 階段成熟，W1 直接重用
- 已有 W2 完整版的 SO 資料可看歷史，不用 mock
- 立即報價直接走 Phase 0 的 B5 RFQ/QT API，不再有 data layer 疑問
- 對 Crown 而言，從「新工作台」進入這個熟悉的偉盟風格 UI，會有「啊終於」的成就感

---

## 五、風險清單

📝 v1.1 變更：C1/C2/C3 風險已由 review 拍板處理；C5/C6/C8 內容更新；新增 v1.1 新風險。

### 5.1 committed_stock 設計選擇（v1.1 已決）

📝 v1.1 修訂：原本 plan v1.0 列三方案 a/b/c 漸進升級，Hank C1 review 指出升級會 breaking。

**決定**：Phase 0 直接用**方案 b（實體欄位 + trigger）**。

理由：
- 業務反查負庫存來源是核心功能，view 版掃全表效能天花板低
- trigger 一次寫好就鎖住，之後不會再動
- Prisma 不直接支援 trigger，但 migration 可手寫 SQL 塞進來（沿用 TASK-SCHEMA-DRIFT-FIX-01 做法）

實作位置：`prisma/migrations/xxx_committed_stock_trigger/migration.sql`

### 5.2 庫存搶單的並發控制（v1.1 已決）

📝 v1.1 修訂：原本用 SERIALIZABLE，Hank C2 review 指出會 abort 風暴。

**決定**：用 **advisory lock on (tenantId, partId)** 或 SELECT ... FOR UPDATE。

理由：業界 ERP 標準做法、可預測性高、避免 retry loop。

實作位置：B1 SO 建立 service 內，建單前對該 lineItem 對應的 part 加鎖。

### 5.3 「同行調貨」的 quick-add 機制（v1.1 已決）

📝 v1.1 新增：對應 Hank S3 review。

**決定**：下拉旁加「+ 新增同行」按鈕，最少欄位 quick-add（代碼+名稱+電話）。

實作位置：C5 元件，Phase 2 啟用（Phase 1 W2-mini 不需要）。

### 5.4 navigation context policy（v1.1 細化）

📝 v1.1 修訂：對應 Hank C3 review。

**Policy 4 條**：
1. 進入目標工作台的 useEffect 一次性 consume + clear
2. Context missing 時必須有 fallback，工作台能獨立跑
3. Payload 用 TS discriminated union + version field
4. Phase 1 開頭產出 D5 文件 `docs/spec/_shared/navigation-context-policy.md`

### 5.5 R7 SOP code 與 Phase 0 新 SYS-C 物理隔離（v1.1 細化）

📝 v1.1 修訂：對應 Hank B3 review。

**舊 SYS-C 路徑**：
- `features/sale/ui/sop-workspace/`（教學模式專用）
- 不再有庫存中心 5 頁的 consumer（已切走）

**新 SYS-C 路徑**：
- `apps/nx-api/src/nx04/so/sys-c-translator.service.ts`（後端唯一）
- 前端只有「狀態組合 helper」(`features/sale/lib/status-composer/`)，讀取用，不 mutation

**並存原則**：
- /sop-demo 路由不調用新 API（資料源仍是前端 mock + Zustand）
- 新工作台不調用舊 reducer
- Phase 3 收尾時舊 useSalesStore 在庫存中心 5 頁的 import 全清

### 5.6 BX/DN 1:N migration 細節（v1.1 細化）

📝 v1.1 修訂：對應 Hank C6 review。

**deprecated 策略**：
- SO.relatedBxNumber 標 `@deprecated`，保留 1 release 週期給教學模式用
- 新邏輯一律用 `BX.findMany({ where: { relatedSoNumber } })` 反查
- Phase 3 收尾時正式刪除 deprecated 欄位

**Migration script 範例**（v1.1 給）：
```sql
-- 把 SO_54.relatedPkNumber 對應的單一 BX 改成「1 BX 對全部 lineItems」結構
INSERT INTO nx04_bx (related_so_number, related_line_item_ids, ...)
SELECT
  so.so_number,
  array_agg(li.id),
  ...
FROM nx04_so so
JOIN nx04_so_line_item li ON li.so_id = so.id
WHERE so.related_bx_number = 'BX-OLD-001'
GROUP BY so.so_number;
```

### 5.7 依賴圖 D3/D4/D5 位置（v1.1 已修）

📝 v1.1 修訂：對應 Hank C7 review。

D3/D4/D5 改畫成與 S1~S5 同層平行（虛線連到下游 B1~B5 / Y1~Y2），表示「spec 與 schema 同步起步、實作驗證後修訂」。

### 5.8 W4 規模與 B5 API 範疇（v1.1 已調）

📝 v1.1 新增：對應 Hank C8 review。

W4 規模 S → M（因為底層 RFQ/QT 從 Zustand 改讀後端，是 data layer 完全換掉）。
新增 B5 RFQ/QT/TI/CO REST API 入 Phase 0 範疇。

### 5.9 共用元件的設計權威（v1.0 留）

C1~C5 是工作台共用，每個工作台都想客製會 fork。

**緩解**：共用元件設計變更必須走決策（不能 Hank 自己擴充），spec 內明確標「此元件由 Wx, Wy, Wz 共用，變更需 PM 同意」。

### 5.10 Phase 2 規模管理（v1.1 新增風險）

📝 v1.1 新增：因 v1.1 把庫存中心 5 頁納入 Phase 2，規模升到 XXL。

**風險**：Phase 2 太大、單一 sequential 跑會拖很久。

**緩解**：
- 拆 Phase 2a（銷售工作台延伸）+ Phase 2b（庫存中心改寫）平行
- 需要 2 條 feature 分支
- 如果只有 Hank 一人，建議 Phase 2a 完整跑完再進 Phase 2b（順序：W2→W4→W5→W3→W1→W6~W11）

---

## 六、規模一覽表

📝 v1.1 更新：含新增項目。

```
Schema       S1(M) S2(L) S3(M) S4a(S) S4b(S+) S5(S)
Backend API  B1(L) B2(M) B3(M) B4(S) B5(M)  ← v1.1 新增 B5
SYS-C        Y1(L) Y2(M)
Frontend     W1(M) W2(XL) W2-mini(M) W3(M) W4(M) W5(M)
              W6(M) W7(M) W8(M) W9(M) W10(M) W11(S)  ← v1.1 新增 W6~W11
共用元件     C1(M) C2(S) C3(L) C4(M) C5(S)  ← v1.1 新增 C5
Migration    M1(M) M2(S+)
文件         D1(S) D2(L 總和) D3(M) D4(M) D5(S)  ← v1.1 新增 D5
教學模式     T1(S) T2(❓) T3(S)
Housekeeping H1(S) H2(S) H3(S)
```

**規模分布統計**（v1.1）：
- S 類：14 項
- M 類：18 項
- L 類：5 項
- XL 類：1 項（W2 完整版）
- S+ 類：2 項
- L+ 類：0 項（Phase 0 整體 L+ 但個別項目最大是 L）
- ❓ 類：1 項（T2）

**Phase 規模呼應**：

| Phase | 內含 | 規模合計 | v1.0→v1.1 變化 |
|---|---|---|---|
| Phase 0 | S1~S5 + M1~M2 + B1~B5 + Y1~Y2 + D3~D5 | L+ | L → L+（多 B5、D5、S5）|
| Phase 1 | C1+C2+C5+W2-mini+D2-W2-mini | M | L → M（W2-mini 比 W1 範圍更小）|
| Phase 2 | C3+C4 + W1~W5 完整版 + W6~W11 + D2 全套 | XXL | XL → XXL（多庫存中心 5 頁）|
| Phase 3 | T1+T3+D1+H1~H3 + 舊 store 廢棄 | M | M（不變）|

---

## 七、不在這份計畫範圍的事

📝 v1.1 變更：刪掉「不接 DB」那條。

| # | 排除項目 | 原因 |
|---|---|---|
| ~~7.1~~ | ~~後端 API 接到實際 PostgreSQL~~ | 📝 v1.1 刪除：Phase 0 直接接 |
| 7.1 | 多語系（i18n） | 整個專案都還沒做 |
| 7.2 | NX10 遊戲化跟新工作台的整合 | 等新工作台穩定後另案 |
| 7.3 | 國外銷售工作台（S-W02 範疇） | 本計畫只處理 S-W01 國內銷售 |
| 7.4 | NX05 財務、NX07 人資的相關連動 | 跨模組整合另案 |
| 7.5 | 真實客戶上線前的壓測 | 已是獨立 task TASK-STRESS-TEST-01 |
| 7.6 | 行動裝置以外的桌面版 | 本計畫只看手機版 |
| 7.7 | 教學模式的進階優化 | 包含「教學模式內 SYS-C 對齊新工作台」這類進階題，等新工作台穩定後再評估 |
| 7.8 | NX04 之外其他模組的 schema 改動 | 本計畫只動 NX04 銷貨相關 |

---

## 八、附錄

### 8.1 與決策紀要的對應表

| 工作項目 | 對應決策章節 |
|---|---|
| S1 transferSource 兩欄 | 4.2 Q5 規則 2、5.1 |
| S2 committed_stock 雙帳 | 4.2 Q5 規則 4、5.1 |
| S3 BX/DN 1:N | 4.3 Q6 |
| S4a/S4b IT/TI/CO 必填關聯 | 4.2 Q5 規則 3 |
| S5 fulfillStatus | 4.3 Q6（新增層）|
| Y1/Y2 SYS-C 重寫 | 4.2 Q5 全篇 |
| W1~W5 5 工作台 | 2.2 全篇 |
| W6~W11 庫存中心 5 頁改讀 | 決定 2 拍板（v1.1 新增）|
| T1~T3 教學模式 | 4.5 Q8 |
| D1 PROJECT_CONTEXT 改寫 | 2.3 全篇 |
| 風險 5.4 navigation policy | 6.3（暫不決定）+ Hank C3 review |

### 8.2 與既有 PROJECT_CONTEXT 哲學的對應

| 哲學條目 | 影響 | 落地時機 |
|---|---|---|
| 第 1 條 中心 = 角色工作台 | 強化 | 全程適用 |
| 第 2 條 庫存 >= 0 | 修正為「物理 vs 會計分離」 | Phase 0 草稿、Phase 3 正式落地 |
| 第 3 條 工作站 = SOP | 修正為「工作站 = 動作；SOP 留教學」 | Phase 1 開始時草稿、Phase 3 正式落地 |
| 第 4 條 追蹤清單 | 不變 | N/A |
| 第 5 條 5 選項客戶回應 | 不變（仍適用 W2） | N/A |
| 第 6 條 追加品項 | 不變 | N/A |
| 第 7 條 SYS-C 4 情境 | 修正為「翻譯器」 | Phase 0 落地、Phase 3 正式更新 |
| 第 8 條 共用流水號 | 不變 | N/A |
| 第 9 條 歷史報價毛利警覺 | 強化（W1 核心功能） | Phase 2 W1 落地 |
| 第 10 條 組長排序 | 不變 | N/A |

### 8.3 階段命名約定

```
Phase 0：feature/wp-phase0-schema
         feature/wp-phase0-api
         feature/wp-phase0-sysc
         feature/wp-phase0-rfq-api  ← v1.1 新增（B5）

Phase 1：feature/wp-phase1-pilot-w2-mini  ← v1.1 變更

Phase 2a：feature/wp-phase2a-w2-full
          feature/wp-phase2a-w1
          feature/wp-phase2a-w3
          feature/wp-phase2a-w4
          feature/wp-phase2a-w5

Phase 2b：feature/wp-phase2b-warehouse-transfer
          feature/wp-phase2b-warehouse-ti
          feature/wp-phase2b-warehouse-picking
          feature/wp-phase2b-warehouse-packing
          feature/wp-phase2b-warehouse-delivery
          feature/wp-phase2b-status-section

Phase 3：feature/wp-phase3-cleanup
         feature/wp-phase3-philosophy-sync
```

每條 branch 完成後 review → merge 回 main。

### 8.4 commit 訊息規範

📝 v1.1 補：新增 [WP-MISC] 前綴。

```
[WP-PHASE-0] schema: add transferSource type + ref columns to so_line_item
[WP-PHASE-0] api: rewrite POST /so with translator service
[WP-PHASE-0] api: add B5 rfq/qt rest endpoints
[WP-PHASE-1] pilot: implement w2 minimal slice
[WP-PHASE-2a] w2: full edition with all 4 transfer source types
[WP-PHASE-2b] warehouse-transfer: switch to new api
[WP-PHASE-3] cleanup: remove deprecated relatedBxNumber field
[WP-MISC] docs: project_context philosophy sync (第 2/3/7 條)
[WP-MISC] chore: housekeeping — handle feature/spec-reverse-sw01 branch
```

---

## 九、版本歷史

| 日期 | 版本 | 變動 |
|---|---|---|
| 2026-04-24 | 1.0 | 初版，Alex 草擬，Crown 拍板進入 review 流程 |
| 2026-04-25 | 1.1 | Crown 拍板 3 個關鍵決定 + 整合 Hank 19 項 review 全部接受 |

---

*文件結束*
