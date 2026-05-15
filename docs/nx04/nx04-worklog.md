<!-- docs/nx04/nx04-worklog.md -->

# NEXORA - NX04 - 銷售模組工作日誌

> 撰寫者：Hank
> 涵蓋範圍：NX04 銷售管理（quote / so / sales-return + SO translator 子目錄）+ NX04 主導的跨模組 task（D3 雙帳資料模型、D4 SYS-C Translator、業務 SOP 重構大塊 1、W2-mini Phase 1A 對接）
> 起算點：v7_baseline migration（2026-04-13）之後
> 對應分支：歷史散在 `main` / `feature/wp-phase0-schema` / `feature/demo-emergency` / `feature/wp-phase1-w2-mini`

---

## 結構說明

- 按主題（不按時間順序）累加、給 Alex 跨對話讀的考古手冊
- 每個主題下：起源 / 設計決策 / 實作歷程 / 踩坑 / 對應文件 五段式
- 工作量大的核心主題（D3 / D4）拆 5 小節、沿用 NX02 主題 5、NX03 主題 4 範式
- ⚠️ 標記未確認 / 待 Crown / Alex 補充
- **跨模組或公版主題不寫進本日誌**、寫進 [_team/worklog.md](../_team/worklog.md)（過帳通用規則 / 公版 component / TASK-BUSINESS-RESTRUCTURE 大塊 2 / A002 drift / 跨模組測試基礎設施演進）

---

## 主題 1｜v7_baseline + Phase5-NX04 第五批 API 落地（2026-04-14~16）

### 起源

`spec_v7_baseline` 建好 NX04 schema（quote / so / sales-return + items + audit）。Phase5「第五批 API」按序填模組（NX99 → NX01 → NX02 → NX03 → **NX04**）、本主題是 NX04 三子模組 controller + service + DTO 落地。

### 設計決策

1. **3 子模組劃分**：`quote / so / sales-return`、translator 是 so/ 內**子目錄**（後 0425 D4 加）、不算獨立 controller。⚠️ system-architecture B.1 原寫「3 + SO translator」、本日誌揭露後順手修為「3 子模組（含 SO translator 子目錄）」。
2. **POST `/nx04/so/from-quote/:quoteId`**：從 QT 開 SO 的捷徑路徑、避免使用者手動複製 QT 內容到 SO。理由：QT 採用 → SO 是業務最常見動作、做專屬 endpoint 比通用 POST + body 還清楚。
3. **SHIPPED 過帳寫 ledger**：SO 狀態 `SHIPPED` 時於單一 transaction 呼叫 `applyQtyOutWithLedger`、`sourceModule=NX04 / sourceDocType=S`。對齊 [CLAUDE.md §九] 通用過帳規則（細節見 [_team/worklog.md](../_team/worklog.md)）。
4. **sales-return 同批多筆數量驗證**：同一張 SR 多個 item 各退一部分、總和不可超過原 SO 對應 item 已出貨量。理由：避免「分批退貨各自驗證 OK、加總超量」漏洞。
5. **`Decimal` 用 `String(...)` 建構**：避免 JS number 精度損失（`0.1 + 0.2 !== 0.3`）。所有金額 / 折扣 / 稅額一律 `new Decimal(String(value))`。

### 實作歷程

- 2026-04-15~16（commits 在 `feature/sys-dashboard`）| 3 子模組 controller/service/DTO + crud-fetch 驗證腳本
- 2026-04-16（migration）`20260416120000_nx04_status_doc_currency_quote_item_created_by` | NX04 baseline drift fix（status / docNo / currency_id / quote_item / created_by 一次清）

### 踩坑 / 學到的

- **狀態轉換前讀表頭要在 tx 內**：第一版 `so.service.ts` 在 transaction 外讀 SO header、tx 內 update、tx commit 後又呼叫 `getById` 補 detail DTO — 結果有時 commit 完讀回來是 stale snapshot（tx isolation level 影響）、回 false 404。修法：detail DTO 在 tx **內** 組好、commit 後直接 return。
- **`Decimal.add`、`Decimal.times` 不能混用 number**：JS Decimal lib 看到 number 自動 cast 也會精度損失、規定**所有 Decimal 操作 input 一律 string 或 Decimal**、ESLint rule 補強。
- **快速驗證腳本要分前後 snapshot**：crud-fetch test 跑「建單 → 過帳 → 銷退」要在過帳前後讀 `nx03_stock_balance.on_hand_qty`、確認真的扣對量。否則綠燈但庫存沒動、看不出來。

### 對應文件

- 後端：[apps/nx-api/src/nx04/](../../apps/nx-api/src/nx04/)
- 過帳通用規則：[CLAUDE.md §九](../../CLAUDE.md) + [_team/worklog.md 主題 3](../_team/worklog.md)

---

## 主題 2｜NX04 銷售中心 Hub UI（2026-04-20、DEMO-R3/R4）

### 起源

0420-D 五大中心 Hub 系列、銷售中心是 D2。同期 master-cards 5-group refactor、demo session derive planCode 等改動共同形塑「業務的中心」入口。

### 設計決策（含 Crown「中心=角色工作台」哲學早期實踐）

1. **路由 `/dashboard/sale`**：跟舊 `/dashboard/sales`（複數）並存、後者 301 → 前者。語意：sale 是業務動作、sales 是業務人員、選 sale 對齊「業務做的事」。
2. **`master-cards` 5-group refactor**（DEMO-R3）：原本 4 組（products / partners / warehouse / users）、改 5 組（多了 organization 把 warehouse 跟 department 合併）。理由：客戶 demo 看「主檔分類」要直覺、4 組不對稱（warehouse 自己一組、department 卻沒有）。
3. **demo session derive planCode**（DEMO-R4-A）：原本 home dashboard 的 plan tier 從 `mock context` 取、改成從**登入時的 `tenantCode` 反推**。理由：demo 切租戶（TEST-LITE / TEST-PLUS / TEST-PRO）就要切 plan、避免 mock 跟真 session 雙軌。
4. **mobile bottom tabs**（DEMO-R4-C）：sale/inventory/purchase 三 hub mobile 改 bottom tabs（各自 2~4 tabs），共用 `<MasterSection />` desktop+mobile 雙端。

### 實作歷程

- 2026-04-20 `9098eb8` | 0420-D2：銷售中心卡片頁 `/dashboard/sale` + sales 301 redirect
- 2026-04-22 `7ed9b40` | DEMO-R3 master-cards 5-group refactor
- 2026-04-22 `7d6da44` | DEMO-R3 master hub mobile bottom tabs + responsive cards
- 2026-04-22 `4a32096` | DEMO-R4-A home dashboard derive plan from session（不再 mock context）
- 2026-04-22 `2a40f32` | DEMO-R4-C purchase/sale/inventory hubs mobile bottom tabs

### 踩坑 / 學到的

- **`/sales` vs `/sale` 一定要選一個** + 另一個 301。原本兩條都活、書籤散落、tracking 也亂。教訓：路由命名衝突要當下解、不要兩條並活拖延。
- **demo 跟真 session 不要雙軌跑**：DEMO-R4-A 之前 demo planCode 走 mock context、真實 session 走 JWT、兩個 source of truth、互相不一致。改成 demo / 真實都走 session 之後、整個前端只看一個 planCode 來源。教訓：**single source of truth 對 demo/prod 同樣重要**、不要為 demo 開分歧。
- **5-group refactor 是業務分類問題、不是 UI 問題**：第一版想用 visual cluster（card grouping）解、其實是業務分類本身就缺 organization 這組、改資料模型才對。

### 對應文件

- 銷售中心：[apps/nx-ui/src/app/dashboard/sale/](../../apps/nx-ui/src/app/dashboard/sale/)
- 對應架構債：A027（dashboard/{nx04} vs dashboard/{sale} 並存）

---

## 主題 3｜D3 雙帳資料模型（2026-04-25、Phase 0 開幕、NX04 主導跨模組）— 核心

> 本主題是 Phase 0 的開幕之作、影響 NX02（nx02_qt 拆出）+ NX03（nx03_st_item.source_so_item_id）+ NX04（SO 主帳子帳）+ trigger 機制。**NX04 主導**、其他模組是受影響側。
> 拆 5 小節：**3A 起源 / 3B 主帳+子帳設計 / 3C 4 個 PostgreSQL triggers / 3D C-strategy 兩階段 migration / 3E D3 後續 patches（漸進演化）**。

### 3A. 起源

v6 schema `nx04_so` 是「一張單據包所有東西」、業務到貨後不確定該如何處理：
- 客戶下單 100 件、本倉只剩 50 件、其他 50 件要從別倉調撥 + 同行調貨 + 部分缺貨等採購 → 業務沒辦法在一張 SO 上表達這個複雜情境
- 結果業務開單時要嘛硬切 4 張 SO、要嘛把細節塞 remark、後段倉管 / 採購看不懂

D3 任務目標：**讓一張 SO 主帳對應 N 個子帳、每個子帳代表「一個來源 + 一個狀態」**、業務開一張單就把複雜情境表達完整。

### 3B. 主帳 + 子帳設計

```
nx04_so（主帳）              ← SO header、客戶、日期、總金額
  └─ nx04_so_item（子帳）    ← 每筆 line item，type 區分四種狀態
       type='S' (Stock)      ← 本倉現貨直出
       type='T' (Transfer)   ← 從他倉調撥
       type='G' (G-source)   ← 同行調貨（RFQ→QT→TI）
       type='B' (Backorder)  ← 缺貨待採購
       transferStatus 欄位   ← T/G 中間態子狀態（pending/adopted/transit/received）
```

**關鍵欄位**：
- `nx04_so_item.source_so_id`：自我指向（部分 split case 用、表達「這筆子帳是從另一筆 SO line 拆出」）
- `nx04_so_item.transferStatus`：T/G type 才有意義、driver 是 trigger（見 3C）
- ⚠️ `salespersonId` 沒做、欄位名用 `creatorId`（建單者≠業務歸屬、未來業務反映時起 schema patch、留 TODO）

### 3C. 4 個 PostgreSQL triggers

> ⚠️ trigger 細節**我沒在原始碼層級重新驗證**、依 spec 文件為真相。要 audit 直接 grep `migrations/*.sql` 找 trigger 定義。

4 個 trigger 角色：
1. **transferStatus 自動推進**：T/G type 子帳的中間態（pending → adopted → transit → received）由 trigger 維護、business code 不直接寫 transferStatus
2. **子帳狀態回算主帳**：所有子帳完成（type='S' 已扣帳 / type='T' 收貨 / type='G' 收貨 / type='B' 解除）→ 主帳自動 `READY_TO_SHIP`
3. **type='S' 直接扣 stock_balance**：避免 application 層忘記寫
4. **D3 status 反映機制**：主帳狀態 enum 變動時級聯影響子帳

**用 trigger 而非 application 邏輯的理由**：
- 主帳狀態是「**衍生事實**」（從子帳推導出來）、不該手動寫 — 寫 trigger 強制單一來源
- 跨 service 寫子帳時不可能每個 service 都記得回算主帳、trigger 是兜底
- ⚠️ **副作用**：trigger 跟 D4 Translator 的 transaction 有 coupling 風險（4E 寫進 D4-impl spec 警告）

### 3D. C-strategy 兩階段 migration

D3 schema patch 要對既有 SO 資料平滑落地、選 **C-strategy** 兩階段：

```
Stage 1: phase0_so_data_model（nullable + add column）
  - 加 type / transferStatus / source_so_id 欄位、全 nullable
  - 既有 SO 不動、新欄位 NULL
  - triggers 加上去（對 NULL 子帳不觸發）

Stage 2: phase0_so_data_model_tighten（NOT NULL + backfill）
  - backfill 既有 SO 補 type='S'（推定本倉現貨）
  - type / transferStatus 改 NOT NULL
  - 新增約束（CHECK type IN ('S','T','G','B') 等）
```

**為什麼分兩階段**：
- 一階段加 NOT NULL + backfill 在大表上會 lock、生產 DB 風險高
- 兩階段 migration 第一階段「加欄位 nullable」幾乎瞬間、第二階段 backfill 可分批
- 對齊 prod migration best practice

### 3E. D3 後續 patches（漸進演化的紀錄）

> Alex 觀察：類似 NX01 主題 5「DEMO-02 widening 兩波」漸進演化、本小節寫「為什麼演化到現在的形貌」。

D3 落地後、後續 task 不斷對 D3 schema 加 patch（不是 D3 本身錯、是業務需求接續推進）：

| Patch | 觸發 | 目的 | commit |
|-------|------|------|--------|
| **D3-i** drop NOT NULL on `nx03_st_item.source_so_item_id` | D4 Translator 推進需要建 IT stub 時還沒 SO line 反查 | nullable 讓 stub 階段先寫、後 backfill | `a16a755` |
| **D3-ii** add `nx02_qt` table | B5 RFQ/QT 業務分離（一張 RFQ N 張 QT） | 從 nx02_rfq 拆 nx02_qt 獨立表 | `c80dee2` |
| **D3-iii** §2.1 v1.1 patch | D5 Navigation Policy 揭露 SO 主帳 status enum 缺一個 | spec 補完、schema 加 enum 值 | `001cfb3` |
| **D3-iv** add `nx02_rfq.source_so_item_id`（B5-A） | B5 業務「採用 QT 反查 SO line 更新 transferStatus」做不到 | 反查欄位 nullable + FK | `1cdb094` |

**漸進演化的教訓**：D3 第一版做完不代表結束、新業務 task（D4 / B5 / D5）會從各自視角揭露 D3 schema 不足、要保留「**D3 schema 可加 patch、但要在 D3 主軸上**」的彈性。每個 patch commit message 都引用觸發任務、形成可追溯演化鏈。

### 對應文件

- 意圖：[docs/nx04/spec/intent/so-data-model-intent.md](spec/intent/so-data-model-intent.md)
- 實作：[docs/nx04/spec/impl/d3-impl_so-schema.md](spec/impl/d3-impl_so-schema.md) / [docs/nx04/spec/impl/d3-trigger.md](spec/impl/d3-trigger.md)
- 跨模組影響：[NX02 主題 5](../nx02/nx02-worklog.md)（nx02_qt + nx02_rfq.source_so_item_id）/ [NX03 主題 1](../nx03/nx03-worklog.md)（nx03_st_item.source_so_item_id nullable）

---

## 主題 4｜D4 SYS-C Translator（2026-04-25~26、純 NX04）— 核心

> 拆 5 小節：**4A 起源 / 4B Translator 入口 / 4C RefreshmentDocCreator / 4D TransferSourceResolver / 4E vitest infra + trigger coupling 警告**。

### 4A. 起源

D3 子帳 `type='T'/'G'/'B'` 中間態需要「自動建對應單據」：
- type='T'（自倉調撥）→ 自動開 IT 調撥單（NX03）
- type='G'（同行調貨）→ 自動開 RFQ 詢價單（NX02）
- type='B'（缺貨）→ 等 D4 後續決定

不能讓業務手動 N 步開單（業務根本搞不清楚要開哪幾張）。SYS-C（System Choreographer）就是這個自動分流的入口。

### 4B. Translator 入口

```
POST /nx04/so/translator
  ↓ controller (translator.controller.ts)
  ↓ service (translator.service.ts)：分析 SO items → 4 情境分流
  ↓ A: 本倉有貨        → type='S'、不需建額外單
  ↓ B: 他倉調撥        → 建 IT stub
  ↓ C: 同行調貨        → 建 RFQ stub
  ↓ D: 調撥+調貨混合   → 建 IT + RFQ
```

**設計重點**：
- Translator 是**純函式分析 + 副作用建單**、分析邏輯抽 `analyzeSO()` pure function、便於單元測試
- 1 個 Translator request → N 個 stub（IT/RFQ）一次建完、單一 transaction
- 失敗 rollback 整批

### 4C. RefreshmentDocCreator（補單產生器）

`refreshment-doc-creator.ts` 負責建 stub：
- `createItStub()` → 建 NX03 IT 調撥單、寫 `source_so_item_id`（反查 SO line）
- `createRfqStub()` → 建 NX02 RFQ 詢價單、寫 `source_so_item_id`（B5-A 後加的反查欄位）
- 寫 stub 同時、把 SO line `transferStatus` 設為 'pending'、trigger 後續會推進

**為什麼叫「Refreshment」**：
- 「補單」對應「補水」、語意是「主單已開、後續要的子單是補出來的」
- 命名揭露 D3 雙帳的核心隱喻：**主帳是商業承諾、子帳是執行細節、Refreshment 把細節補進來**

### 4D. TransferSourceResolver（調貨來源解析）

`transfer-source-resolver.ts`：給 SO line type='T'、決定**從哪個倉**調撥。
- 規則：依倉序（主倉 → 分倉 hsinchu / taichung / kaohsiung）找有貨的第一個倉
- 多倉混合：依 priority 補足、不夠的進 type='G'

**為什麼抽出獨立檔案**：
- Translator service 主邏輯只看「分什麼類」、不該管「從哪個倉」
- 倉序規則未來可能依租戶 customize（PRO 客戶要換倉序）、抽出來方便 override
- 跟 SYS-C 分析邏輯（features/sale/ui/fulfillment/sysC.ts）對齊：分析 vs 執行分離

### 4E. vitest infra 引入 + trigger coupling 警告

#### vitest infra 引入

D4 是 nx-api 第一個寫單元測試的模組（之前用 fetch script 驗證 CRUD）。引入 vitest：
- `apps/nx-api/vitest.config.ts` 第一次寫
- `pnpm test` 跑 unit + integration（兩種 spec naming：`*.spec.ts` / `*.int-spec.ts`）
- 26 unit tests for D4 translator（純函式邏輯）

⚠️ B5（NX02 主題 5）後續加 `fileParallelism: false`（兩個 .int-spec.ts 並行 race 撞 fixture）— 跨模組測試基礎設施演進、已寫進 [_team/worklog.md 主題 7](../_team/worklog.md) 統合。

#### trigger coupling 警告（D4-impl spec amend）

D4 寫 stub 時會觸發 D3 trigger（transferStatus、主帳狀態回算）、若 trigger 跑得慢 + Translator transaction 沒設 lock_timeout → 整個 SYS-C request 卡住。

D4-impl spec amend（commit `f9ef049`）加兩條警告：
1. **trigger coupling**：trigger 內 SQL 要簡單、不能跨表 join 太多、避免拖慢 Translator
2. **lock_timeout WARN**：Translator transaction 開頭 `SET LOCAL lock_timeout = '5s'`、5 秒內拿不到鎖直接 abort、不要無限等

### 實作歷程

- 2026-04-25 `78e24a1` | D3 impl + trigger specs（D4 前置）
- 2026-04-25 `afa84d0` | apply D3 schema + 4 triggers（C-strategy 兩階段 migration）
- 2026-04-25 `3a2b8ba` | D4 translator intent + impl specs
- 2026-04-25 `f9ef049` | D4-impl amend：trigger coupling warning + lock_timeout WARN
- 2026-04-25 `3543aff` | add vitest infra to nx-api
- 2026-04-25 `2656dab` | D4 translator service + DTO + Controller + Exception filter
- 2026-04-25 `a16a755` | D3 patch: drop NOT NULL on st_item.source_so_item_id
- 2026-04-26 `46823bb` | D4 translator unit + integration tests（26 unit）

### 踩坑 / 學到的

- **trigger + application transaction 是雙刃劍**：trigger 強制 source of truth、但跑在 Translator transaction 內、慢的 trigger 拖慢業務 API。教訓：**寫 trigger 前要 audit 內部 SQL 複雜度、絕不在 trigger 內跑跨表 aggregation**。
- **單元測試對純函式 vs 副作用要分離**：`analyzeSO()` 純函式、26 個 unit test 直接餵 input 看 output；副作用部分（建 stub 寫 DB）是 integration test、自帶 fixture。教訓：**抽純函式不只是 testability、是 logic 跟 IO 解耦**。
- **「Refreshment」隱喻命名**對協作友善：團隊看到 `RefreshmentDocCreator` 馬上懂語意、不用查文件。教訓：**核心隱喻命名比技術術語更有溝通價值**（甚至跨非英語母語團隊）。

### 對應文件

- 意圖：[docs/nx04/spec/intent/translator-intent.md](spec/intent/translator-intent.md)
- 實作：[docs/nx04/spec/impl/d4-impl_translator.md](spec/impl/d4-impl_translator.md)
- 後端：[apps/nx-api/src/nx04/so/translator/](../../apps/nx-api/src/nx04/so/translator/)

---

## 主題 5｜DEMO-R6 銷貨 SOP mobile demo（2026-04-22）

> ⚠️ **本主題屬 demo / mock 階段、未來 W2-mini 真實落地時可能整套重寫。** 紀錄目的是踩坑 + 設計脈絡（給未來真實落地參考）、不是「最終 NEXORA codebase」。對齊 NX02 主題 4 demo disclaimer 模式。

### 起源

Crown demo 排期、要把「銷貨 SOP 整套流程」做成 mobile workspace（demo 給客戶看銷售業務怎麼跑單）。Phase5 後端 / 桌面工作台都不適合 mobile demo、R6 在 demo-emergency branch 上做。

### 設計決策

1. **STEP 1~9 步驟卡**：把銷貨 SOP 拆 9 個步驟、每步驟 mobile 全頁卡片、上下滑切。
2. **「穩重風格」foundation**（phase 2-1）：不用花俏動畫、按鈕 / 卡片 / 字體偏向傳統 ERP 風格。理由：客戶是傳統汽車零件業、demo 太現代風會讓客戶覺得「這不是給我用的」。
3. **STEP 8 訂單成立後系統自動化清單逐項淡入**：模擬「業務按下『成立』後系統做了 N 件事」（建 SO / 建 PK / 建 BX / 通知倉管 / 通知物流）、用淡入動畫表達自動化。
4. **STEP 9 業績累計 + 新業務提醒**：成立後立刻看「今日業績 / 月累計 / 新業務待跟進」、demo 業務人員工作節奏。
5. **手風琴 STEP 2**（phase 2-2）：客戶基本資料展開收合、ImageLightbox 看圖。

### 實作歷程

- 2026-04-22 `4454e1d` | DEMO-R6 phase 1：mobile workspace infra + STEP 1-2
- 2026-04-22 `04c2327` | DEMO-R6 phase 2-1：穩重風格 foundation + STEP 1 改造
- 2026-04-22 `5797be4` | DEMO-R6 phase 2-2：STEP 2 手風琴 + ImageLightbox
- 2026-04-22 `694372d` | DEMO-R6 phase 2-3：STEP 3~6 報價 / 方式 / 客戶決定 / 配送
- 2026-04-22 `42e6e24` | DEMO-R6 phase 3-1：STEP 7 簽單方式 + state foundation
- 2026-04-22 `4fea20f` | DEMO-R6 phase 3-2：STEP 8 訂單成立 + 系統自動化清單淡入
- 2026-04-22 `606fcff` | DEMO-R6 phase 3-3：STEP 9 完成總結 + 業績累計 + 新業務提醒

### 踩坑 / 學到的

- **「穩重風格」是業界 muscle memory 問題、不是設計品味問題**：第一版用現代 mobile UI（圓角大、漸層色、流暢動畫），客戶看了說「這不像 ERP、像玩具」。改穩重風格（直角、單色、簡單 transition）後客戶覺得「這才像我們在用的東西」。教訓：**B2B demo 要對齊客戶 visual muscle memory、不是設計師美感**。
- **逐項淡入比一次出現更有「自動化」感**：STEP 8 系統清單第一版一次出現、客戶反應「這跟列印報表一樣、沒有 AI 感」。改逐項淡入（每項 200ms 間隔）後反應變「哇好像系統真的在做事」。教訓：**動畫時序傳達「正在發生」、靜態列表只傳達「結果」**。
- **mobile SOP 9 步是極限**：原本想 12 步、客戶滑到第 5 步就累、改 9 步且每步 ≤ 1 屏剛好。教訓：mobile 步驟數有上限、不是越多越完整越好。

### 對應文件

- ⚠️ **本主題的具體實作（mobile 9 步驟、穩重風格 foundation 等）可能不會進 NEXORA 真實 codebase**、僅作為 demo 設計參考。真實 W2-mini 落地（主題 8）會基於 NX04 規格書 + workflow 重新設計。
- 業務流程：[docs/nx04/workflow/primary/s-w01-domestic-sales.md](workflow/primary/s-w01-domestic-sales.md)（Alex 寫的真實流程）

---

## 主題 6｜TASK-BUSINESS-RESTRUCTURE 大塊 1 業務 SOP 重構（2026-04-23）

> ⚠️ **進行中、未來持續演進。** 對齊 NX03 主題 5 production disclaimer 模式（不是 demo 拋棄式）。
> ⚠️ BUSINESS-RESTRUCTURE **大塊 2** 跨多模組（SO→PK→BX→DN 跨中心、IT 調撥、SYS-C 4 情境）見 [_team/worklog.md 主題 5](../_team/worklog.md)。**大塊 1 純 NX04 業務 SOP** 寫進本日誌。**大塊 3** 純 NX03 已寫 [NX03 主題 3](../nx03/nx03-worklog.md)。

### 起源

DEMO-R7 phase 7 缺貨分流 + RFQ 詳情頁落地後、Crown 揭露原 R6/R7 業務流程設計有實質業務缺漏。大塊 1 是「**業務 SOP 不是 demo、要當真實系統來重構**」、Phase 1~4 收斂前面 R6/R7 demo 中的 4 個破洞。

### 設計決策（Crown 親口、Phase 1~4 對應）

#### Crown 哲學落地（跟 NX03 主題 3「中心=角色工作台」同步）

> 「業務的中心 = 銷售中心（包含查庫存等業務需要的功能）」

**對 NX04 銷售中心的影響**：
- 業務在銷售中心做完所有事（查庫存、開 SO、跟進、跟業務有關的客戶維護）
- **「客戶維護」是銷售中心第 4 分區**（vs NX03 庫存中心的「倉位管理」）
- 業務不需要進庫存中心（倉管的世界）
- 業務查庫存是 inline 在銷貨流程內（B2 反查 API 對接 W2-mini）、不是切去庫存中心查

#### 4 個 Phase 對應

1. **Phase 1（bug 修復）**：STEP 5「上一步」迴圈 bug — 點上一步後狀態 reset 但 router push 又回來、無限 loop。修：state 跟 navigation 解耦、上一步只動 state、不 push router。
2. **Phase 2（歷史報價 + MarginAlert）**：S03 查料時主動推「**1 個月內同對象同品項**」歷史報價提醒（Crown 親口：「若是一個月內有相同對象相同品項都要跳出提醒」）。MarginAlert 即時計算毛利、達標綠 / 略低金（target-5）/ 過低紅、業務改價時即時更新避免無意識砍價。
3. **Phase 3（STEP 5 重構 5 選項 + AddMoreDialog）**：客戶回應從 3 選項擴 5 選項（accept_all / partial_accept / price_adjust / consider / reject）、加「碎片化詢問」追加品項機制（業務按下「客戶接受」後客戶又問下一個料、彈 AddMoreDialog 問「還要查 / 沒了」）。
4. **Phase 4（狀態追蹤移除詢/報群組）**：依 Crown 新規則「追蹤清單只放需採取行動的單」、StatusSection 移除「詢價待回覆」「待確認報價」兩群組（R7 phase 7 才剛加就移除）、改「銷售進行中 / 調貨進行中 / 保固待結果」3 群組。

### 實作歷程

- 2026-04-23 `7847be8` | TASK-BUSINESS-RESTRUCTURE 大塊 1：業務 SOP 重構 Phase 1~4

### 踩坑 / 學到的

- **「demo 流程做到後才發現業務缺漏」是 spec-by-demo 的真實成本**：R6/R7 demo 跑了一輪、客戶看了之後 Crown 揭露 4 個業務破洞（迴圈 bug / 歷史報價提醒 / 5 選項 / 詢報群組）。教訓：**demo 不只揭露 UI 問題、揭露業務模型問題**。早期 Hank 想「先 spec 完整再 demo」、Crown 經驗反過來「demo 揭露 spec 才能寫真」。
- **「碎片化詢問」是業界真實 pain point**：Crown 親口場景「客戶說 X 報多少、業務報了之後客戶說那 Y 呢」是傳統 ERP 沒處理過的、AddMoreDialog 是創新。教訓：**ERP 業務細節要從業界對話 muscle memory 取、不能憑空想**。
- **追蹤清單只放「需採取行動的單」**是 inversion：原本想「追蹤所有未完成」、Crown 反過來「**未完成不等於需採取行動**」。詢價/報價屬於「等」、銷貨/調貨屬於「動」、追蹤清單只給「動」。改提醒邏輯：詢/報的「相同對象相同品項 1 個月內」由 `useHistoryRecord` hook 在 S03 查料時主動推、不放追蹤清單。
- **R7 phase 7 才剛加就刪是健康訊號**：詢/報追蹤群組才加完一天就因為 Crown 新規則刪掉、看似浪費、實是 demo→重構的正常節奏。教訓：**重構刪掉前一天的工作不要心疼、那是 spec 演進的代價、不是失敗**。

### 對應文件

- 對應 NX03 主題 3「中心=角色工作台」哲學跨 worklog 同步（業務 vs 倉管視角）
- 業務流程：[docs/nx04/workflow/primary/s-w01-domestic-sales.md](workflow/primary/s-w01-domestic-sales.md)
- 對應架構債：✅ A007（store 拆分、本主題 + 大塊 2 共同落實）

---

## 主題 7｜TASK-0421 兩張 demo 單據（QT / SO）— 短主題

> 對應 [NX02 主題 3](../nx02/nx02-worklog.md)（NX02 三張 RF/PO/RR）。公版 component 跨模組共用、見 [_team/worklog.md 主題 4](../_team/worklog.md)。本主題只記 QT/SO 兩張 demo 用法。

### 起源

TASK-0421 五單據 demo、NX02 三張（RF/PO/RR）+ NX04 兩張（QT/SO）一次到位、走同一套公版 component。NX04 兩張 demo 的特殊點寫在這。

### 設計決策

1. **QT 低於最低售價紅字提示**：報價單表單填單價時、若低於 part 設定的最低售價（`Nx01Part.minPrice`）→ 紅字 + tooltip 警示「低於最低售價」。理由：避免業務無意識砍價（呼應主題 6 MarginAlert 同精神）。
2. **QT 已發出顯示「轉銷貨」占位**：QT 狀態 `SENT` 後 detail 頁多一個按鈕「轉銷貨單」、demo 階段是 placeholder（真實邏輯後續 D4 Translator 對接）。
3. **SO 配送地址必填**：customer 有 default address 自動帶入、可改、不可空。理由：銷貨單沒地址 = 物流單無法產生（後段 NX06 物流會卡）。
4. **SO 已備貨列不可刪**：SO line item 若已 `transferStatus='received'`（自倉貨已到 / 同行貨已到）→ 該列鎖定 delete 按鈕。理由：刪了會導致 stock_balance 對不上。

### 實作歷程

- 2026-04-21 `12748d0` | TASK-0421：5 張 demo 單據（含 NX04 兩張）+ 公版 component
- FUNCTION_CODE：
  - `NX04-QT-UI-001-F01` → `/dashboard/sale/qt`
  - `NX04-SO-UI-001-F01` → `/dashboard/sale/so`

### 踩坑 / 學到的

- **「最低售價紅字」UX 比 hard-block 友善**：第一版想直接擋 submit、Crown 改紅字提示 + 允許 submit。理由：業務有時就是要破最低價（VIP 客戶 / 清庫存）、系統警示但不擋、信任使用者判斷。教訓：**警告 vs hard-block 的取捨：可逆 / 業務 override 場景用警告、不可逆 / 系統一致性場景用 block**。
- **「已備貨不可刪」是業務跟系統一致性的妥協**：原本想 lock 整張 SO、太嚴。改 lock 已備貨的 line item、其他 line 還可改。教訓：**鎖定粒度要看業務操作粒度、不是 schema 表級**。

### 對應文件

- 公版 component 細節 → 見 [_team/worklog.md 主題 4](../_team/worklog.md)
- 跨模組關聯：[NX02 主題 3](../nx02/nx02-worklog.md)（同 TASK-0421、NX02 三張）

---

## 主題 8｜W2-mini Phase 1A 對接 D4 Translator（進行中）

> ⚠️ **進行中、Phase 1A~1D 落地時補 v1.1。** 對齊 NX03 主題 5 production disclaimer 模式。
> 跟 [NX03 主題 5](../nx03/nx03-worklog.md) 角度差異化：NX03 側重「庫存查詢 + 撞缺貨」、**本日誌側重「SO 開單 → D4 Translator → 4 情境分流」**。
> Store mismatch 完整對照表 NX03 主題 5 已寫、本日誌不重述、一句帶過。

### 起源

W2-mini 是「**第一個串真 API 的桌面工作站**」。從 NX04 視角：W2-mini 的核心動作是「**業務開 SO → D4 Translator 自動分析 4 情境 → 補 IT/RFQ stub**」。NX03 主題 5 側重前段（查庫存撞缺貨）、本主題側重後段（SO 開單觸發 D4）。

### 設計決策（NX04 視角）

1. **SO 開單路徑 W2-mini 走真 API**：對接 D4 Translator endpoint `POST /nx04/so/translator`、不再 client mock。
2. **`useSalesStore.createSO` 走 adapter 層**：依 `USE_REAL_API` feature flag 決定 mock vs 真 API。Store action 簽章不變、底層 adapter 切換。
3. **4 情境分流前端展示**：W2-mini 桌面節點 4 「送 SO」按下後、根據 D4 回傳的 scenario（A/B/C/D）顯示對應跳轉：
   - A（本倉現貨）→ 直接 PK 撿貨頁
   - B（他倉調撥）→ IT 調撥單
   - C（同行調貨）→ W4 RFQ 採購工作台
   - D（混合）→ 並行兩條跳轉
4. **節點 5 出貨追蹤對接 B2 反查**：用 [NX03 主題 4 B2 API](../nx03/nx03-worklog.md#主題-4b2-stock-reverse-lookup-api) 顯示「這 SO 的 5 種狀態現況」。
5. **Store mismatch**：useSalesStore 8 actions 只 1/8 對接 D4（`createSO`）、其餘保留 mock。詳細對照表見 [NX03 主題 5](../nx03/nx03-worklog.md)、本日誌不重述。

### 4 sub-phase 規劃（1A~1D）

- **Phase 1A 桌面骨架（~1 週）**：路由 `/dashboard/sale/w2/` + 節點 1（查庫存）+ 節點 4（送 SO type='S'）+ 節點 5（出貨追蹤）— **本主題側重 1A 的「送 SO」對接 D4**
- **Phase 1B 桌面完整節點**：type='T'/'G'/'B' + 節點 2/3/6 + 跳 W6/W4
- **Phase 1C 手機精簡 3 節點**
- **Phase 1D 整合測試 + Crown 親測 5~10 次**

### 實作歷程（prep 階段）

- 2026-04-27 `87e39d0` | W2 inventory + DEMO-02 seed planning
- 2026-04-27 `278c85d` | W2-mini intent v1.0
- 2026-04-27 `eb2140b` | W2-mini impl spec v1.0 + DEMO-02 spec amend
- 2026-04-28~ ⏸ Phase 1A 未啟動、等 Alex review impl spec 5 取捨

### 踩坑 / 學到的（prep 階段揭露）

- **D4 Translator 是「第一個對接真 API 的非 CRUD 業務 endpoint」**：之前 W2-mini 之外的工作站都是 client mock + 桌面 demo。D4 Translator 對接後、NX04 進入「**真實業務 SYS-C 自動分流**」階段。teach Alex 寫規格時要區分 CRUD endpoint vs SYS-C endpoint：CRUD 簡單、SYS-C 是業務邏輯核心。
- **跨 worklog 視角差異化**：NX03 主題 5 跟本主題寫同一個 W2-mini、但角度不同（庫存 vs SO）— 教訓：**多模組共用工作的 worklog 處理策略**：每個模組從**自己的視角**寫、不重述、互引用。

### 對應文件

- 工作站規劃：[docs/nx04/spec/intent/w2-mini-intent.md](spec/intent/w2-mini-intent.md)
- impl spec：[docs/nx04/spec/impl/w2-mini-impl.md](spec/impl/w2-mini-impl.md)
- 跨模組關聯：[NX03 主題 5](../nx03/nx03-worklog.md)（W2-mini 庫存查詢視角 + Store mismatch 完整對照表）/ [NX02 主題 5](../nx02/nx02-worklog.md)（B5 RFQ/QT API 對接）

---

## 統整：NX04 Migration 列表（v7_baseline 之後）

| Migration | 主題 | 性質 |
|-----------|------|------|
| `20260413120000_spec_v7_baseline` | 主題 1 | NX04 schema 建立（quote / so / sales-return + items） |
| `20260416120000_nx04_status_doc_currency_quote_item_created_by` | 主題 1 | NX04 baseline drift fix（一次清 status / docNo / currency / quote_item / created_by） |
| `20260425100000_phase0_so_data_model` | 主題 3（D3）| Stage 1：D3 主帳+子帳 schema + 4 triggers + nullable 階段 |
| `20260425100100_phase0_so_data_model_tighten` | 主題 3（D3）| Stage 2：backfill + NOT NULL + CHECK 約束 |
| `20260425100200_phase0_st_item_source_so_nullable` | 主題 3（D3-i）| D4 推進需求 drop NOT NULL（影響 NX03 schema、見 NX03 主題 1）|
| `20260425100300_phase0_b5_nx02_qt` | 主題 3（D3-ii）| B5 業務分離加 nx02_qt（影響 NX02 schema、見 NX02 主題 5）|
| `20260427014134_phase0_b5_rfq_source_so_item` | 主題 3（D3-iv）| B5-A 反查欄位（影響 NX02 schema）|

---

## 給未來新對話 Hank 的提示

- 本日誌沿用 [NX01](../nx01/nx01-worklog.md) / [NX02](../nx02/nx02-worklog.md) / [NX03](../nx03/nx03-worklog.md) worklog 五段式結構
- **核心主題拆 5 小節**（D3 主題 3 / D4 主題 4）— 對齊 NX02 主題 5、NX03 主題 4 範式（單主題工作量大）
- **「中心=角色工作台」哲學跨 NX03/NX04 兩份 worklog 同步紀錄**（業務在銷售中心 vs 倉管在庫存中心）— Alex 觀察認可：**跨 worklog 哲學同步是好事**、不是重複
- **「漸進演化」紀錄範式**（D3 主題 3E / NX01 主題 5 兩波 widening）：寫「為什麼演化到現在」比寫「最終樣子」對 Alex 寫規格更有用
- **跨 worklog 視角差異化**（W2-mini 在 NX03 vs NX04 兩份 worklog 各從自己視角寫）— 多模組共用工作的處理策略
- 跨模組或公版（過帳通用規則 / 公版 component / BUSINESS-RESTRUCTURE 大塊 2 / A002 / 跨模組測試基礎設施演進）**不寫進本日誌**、已寫進 [_team/worklog.md](../_team/worklog.md) 統合
- 下一輪預期：[docs/nx05/nx05-worklog.md](../nx05/nx05-worklog.md)（NX05 財務模組、Phase5-NX05 + AR/AP + 過帳邏輯）

---

> 文件版本：v1.0（初版、含進行中 W2-mini Phase 1A prep）
> 下次更新觸發：W2-mini Phase 1A~1D 落地 / D3/D4 後續 patch / NX04 業務新 spec
