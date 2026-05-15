<!-- docs/nx09/nx09-worklog.md -->

# NEXORA - NX09 - 知識管理模組工作日誌

> 撰寫者：Hank
> 涵蓋範圍：NX09 知識管理（article / document / meeting）
> 起算點：v7_baseline migration（2026-04-13）之後
> 對應分支：歷史在 `feature/sys-dashboard` → merge 進 `main`

---

## 結構說明

- 按主題（不按時間順序）累加 2 個主題、給 Alex 跨對話讀的考古手冊
- 每個主題下：起源 / 設計決策 / 實作歷程 / 踩坑 / 對應文件 五段式
- ⚠️ NX09 是 **「穩定模組真誠揭露」範式第三例 + 最純粹例**（0 個 follow-up migration、Phase5 落地完美）
- **跨模組或公版主題不寫進本日誌**、寫進 [_team/worklog.md](../_team/worklog.md)（過帳通用規則 / 公版 component / A002 schema drift / 接收側設計 5 個必備配對）

---

## 主題 1｜v7_baseline + Phase5-NX09 第九批 API 落地（PRO 純業務模組）

### 起源

`spec_v7_baseline` 建好 NX09 schema（article / document / document_version / meeting / meeting_attendee 等）。Phase5「第九批 API」NX08 跟 NX09 同批落地（`Phase5-NX08/NX09`）— 但兩個模組業務本質**完全不同**。

> ⚠️ **NX09 沒 spec/intent、有 workflow/primary 3 份**（跟 NX05~08 同模式）：Alex 寫過業務流程、業務真相在 [dailylog/20260414.md](../../dailylog/20260414.md) Phase5-NX08/NX09 段落 + 3 份 workflow 文件。

### NX09 vs NX08 — 同批落地 ≠ 同類

| 維度 | NX08 聚合層 | NX09 純業務模組 |
|------|------------|----------------|
| **資料 ownership** | 不擁有業務原始資料（read NX01/07 為主）| **擁有 KM 資料**（article / document / meeting）|
| **業務本質** | 視角組合 + 即時聚合 | KM CRUD + 版本管理 |
| **同批落地（Phase5-NX08/NX09 第九批）** | ✓ | ✓ |

**關鍵認知**：**同批落地 ≠ 同類**。NX08/NX09 共用 PRO guard、commit message 寫在一起、但設計範式（聚合層 vs 純業務）完全不同。教訓：**模組分類看業務本質、不看 commit batch / Phase 編號**。

### NX09 是「穩定模組真誠揭露」最純粹例

| 模組 | follow-up migration | 業務本質 | 穩定光譜位置 |
|------|--------------------|---------|------------|
| NX05 | 2（paylog_status / ar_ap_closing）| 財務 | 「Phase5 落地後微調 2 次」|
| NX06 | 1（dn_logistics_status_gps_intl）| 物流 | 「Phase5 落地後微調 1 次」|
| NX09 ⭐ | **0** | 知識管理 | **「Phase5 落地完美、零變動」** |

**穩定光譜揭露**：穩定模組不是 0/1 二分、是漸進光譜（0 / 1 / 2）。NX09 是光譜最純粹端、Phase5 落地後完全零變動 — 業務本質決定（KM CRUD 是傳統業務、沒 Phase 0 業務模型升級需求 / 沒 demo 重構壓力 / 沒大塊跨中心連動）。

### 設計決策

#### 3 子模組（業務功能）

```
nx09/
├── nx09.module.ts
├── article/    ← 知識文章：標籤篩選、軟刪 is_active
├── document/   ← 文件庫：版本列、PATCH 新增 version、軟刪（見主題 2）
└── meeting/    ← 會議管理：出席者 / 會議紀錄 / 追蹤 action、軟刪 status=X
```

#### 結構簡化：每子模組各自 list-query DTO

NX09 跟 NX02/03/05/07 等抽 `shared/nxXX-list-query.dto.ts` 不同、每子模組各自寫 DTO：
- `nx09-article-list-query.dto.ts`（在 article/）
- `nx09-document-list-query.dto.ts`（在 document/）
- `nx09-meeting-list-query.dto.ts`（在 meeting/）

**為什麼不抽共用**：
- 3 個子模組查詢欄位差異大（article 有 tags、document 有 version、meeting 有 attendee）
- 抽共用 DTO 反而要塞 N 個 optional 欄位、可讀性下降
- 「3 個相似實作是抽象最佳時機」的反例（沿用 [NX02 主題 2](../nx02/nx02-worklog.md) 提到的時機判斷）— **3 個但相似度低、不抽**

#### 1 個共用 utils（shared/nx09/）

| Util | 用途 |
|------|------|
| `nx09-pro-plan.guard.ts` | PRO 版本 gate（thin wrapper、re-export `nexora-pro-plan`、跟 NX07/NX08 同 source）|

#### 軟刪策略對比

3 個子模組軟刪欄位**不一致**（揭露歷史殘跡）：
- article / document：`is_active=false`（NX01 主檔風格）
- meeting：`status='X'`（NX02/03 業務單據風格）

⚠️ **這個不一致是 v7_baseline 殘跡**、業務語意上 article/document 是「主檔風格」（資源、可被引用）、meeting 是「業務單據風格」（事件、有狀態流）。**不一致是合理的**、不是 bug。

### 實作歷程

- 2026-04-13 `c210ce2` | SYS-DASH-P5 complete all backend API modules（NX09 含在內）
- 2026-04-14 dailylog | Phase5-NX08/NX09 落地（articles + documents + meetings + Nx09ProPlanGuard）
- **之後零 commit / 零 migration**（穩定光譜最純粹端）

### 踩坑 / 學到的

- **「3 個但相似度低、不抽」的判準延伸**：[NX02 主題 2](../nx02/nx02-worklog.md) 揭露「3 個相似實作是抽象最佳時機」、本主題揭露**反例**「3 個但相似度低、不抽更易讀」。教訓：**抽象判準不只看『實作個數 ≥3』、還要看『相似度』**。3 個相似度高 → 抽；3 個相似度低 → 各自寫。
- **軟刪欄位跨模組不一致是合理的、不是 drift**：第一版我以為要把 article/document/meeting 統一軟刪欄位、Crown 拍板「**主檔風格用 is_active、業務單據風格用 status='X'`、不要強制統一**」。教訓：**「跨模組不一致」不一定是 bug、要看業務語意分類**（NX01 主檔 vs NX02/3 業務單據是兩個風格）。
- **「同批落地 ≠ 同類」是模組分類學陷阱**：寫 worklog 才意識到 NX08/NX09 雖同批 Phase5 第九批 API、但範式完全不同（聚合層 vs 純業務）。Phase 編號 / commit batch 是工程組織單位、不是業務分類單位。教訓：**讀 dailylog 看 Phase 編號分組時、要分業務本質再判斷模組類別**。

### Migration 列表（NX09 直接相關）

| Migration | 性質 |
|-----------|------|
| `20260413120000_spec_v7_baseline` | NX09 schema 建立（article / document / document_version / meeting / meeting_attendee 等） |

⭐ **0 個 follow-up migration**（穩定光譜最純粹端）

### 對應文件

- 後端：[apps/nx-api/src/nx09/](../../apps/nx-api/src/nx09/) + [shared/nx09/nx09-pro-plan.guard.ts](../../apps/nx-api/src/shared/nx09/nx09-pro-plan.guard.ts)
- 業務流程：[docs/nx09/workflow/primary/nx09-w01-knowledge-management.md](workflow/primary/nx09-w01-knowledge-management.md) / `w02-document-library.md` / `w03-meeting-management.md`
- 業務真相來源：[dailylog/20260414.md](../../dailylog/20260414.md) Phase5-NX08/NX09 段落

---

## 主題 2｜document 多版本設計（append-only 版本鏈）

### 起源

知識文件改版 ≠ 業務資料修正：
- 業務資料修正：客戶名稱拼錯改一下、PATCH 直接改 header 即可
- 知識文件改版：SOP 流程更新、合約版本演進、規範修訂 — **改版要保留歷史**（合規 + 還原 + 變更紀錄）

如果 document 用一般 PATCH 改 header、改完上一版就消失、無法回溯「這份文件 3 個月前長什麼樣」。NX09 設計了 **append-only 版本鏈**：每次改版 INSERT 一筆 `nx09_document_version`、document header 只指向當前 version。

### 設計決策

#### API 行為

```
GET  /nx09/documents              → 列表（document header + currentVersionId）
GET  /nx09/documents/:id          → 單筆（含當前 version 內容）
GET  /nx09/documents/:id/versions → 該文件所有 version 歷史鏈
POST /nx09/documents              → 建立 document + version 1
PATCH /nx09/documents/:id         → INSERT 新 version + 更新 currentVersionId
                                    （不 update 既有 version、是 append）
DELETE /nx09/documents/:id        → 軟刪（is_active=false、versions 保留）
```

#### 直接 PATCH vs append version 5 維度對比

| 維度 | 直接 PATCH（一般業務模組）| append version（NX09 採用）|
|------|--------------------------|--------------------------|
| **歷史保留** | 無、改了就丟 | 完整 audit trail |
| **還原機制** | 無 | 任意 version 可回溯 |
| **業務語意** | 「修正」（小錯）| 「改版」（業界 KM 標準）|
| **儲存成本** | 低（單筆）| 高（每改一次多一筆）|
| **適用場景** | 一般業務資料 | 法規 / 合規敏感資料（KM 文件、合約、SOP）|

NX09 documents 選 append version：**KM 文件改版的歷史本身是業務資產、不是儲存成本問題**。

### NEXORA 處理不可逆的兩種策略對比

> Alex 觀察建議揭露：跟 [NX05 主題 3 paylog VOIDED](../nx05/nx05-worklog.md#主題-3paylog-過帳邏輯crcp--voided-沖回) 同精神「業務動作不可逆」、但**變體不同**。

| 策略 | 範式 | 範例 | 業務語意 |
|------|------|------|---------|
| **配對沖回**（雙紀錄）| 原紀錄標 VOIDED + 開反向紀錄沖回 | NX05 paylog 沖回（CR 收款 → 開反向 CR 沖、原 CR 標 VOIDED） | 會計學「沖一抵一」、雙紀錄保留 |
| **歷史鏈**（多紀錄）| append 新紀錄、所有歷史保留、header 指向 current | NX09 document version | 業界 KM「版本演進」、time-travel 可任意回溯 |

**選哪種策略**：
- 業務本質「**動作可被沖銷、結果可被消除**」（如付款、過帳）→ 配對沖回
- 業務本質「**動作有時序演進、歷史有業務價值**」（如改版、合約修訂）→ 歷史鏈

兩種策略都是「**不可逆 + 保留歷史**」、但儲存模式跟 query 模式不同。

### 實作歷程

- 2026-04-13 `c210ce2` 內 | document.service + document_version 表 + PATCH 新增 version 邏輯

### 踩坑 / 學到的

- **「append 不是 update」是 service 層必須強制**：第一版 PATCH 想直接 `prisma.document.update()`、但這樣 version 表沒寫進、歷史鏈斷掉。改 service 強制 `prisma.documentVersion.create()` + `prisma.document.update({ currentVersionId: newVersion.id })` 在同 tx 內完成。教訓：**append-only 設計要 service 層強制 INSERT、不能讓 caller 走 update path**。
- **`currentVersionId` 是 query 優化、不是業務必要**：第一版只有 version 表、document header 沒 currentVersionId、每次查當前版本要 `MAX(version_no) WHERE document_id = ?`、N+1 嚴重。加 `currentVersionId` 欄位 + service 維護一致性、簡單 JOIN 解決。教訓：**append-only 設計常見的 query 痛點、用「指標欄位」優化、付出寫入時雙更新成本換查詢效能**。
- **「不可逆 + 保留歷史」有兩種策略**（本主題揭露）：之前我以為「不可逆」就是 NX05 paylog VOIDED 那種、寫 NX09 才意識到「歷史鏈」是另一種、跟 paylog 不同變體。教訓：**設計範式有對偶 / 變體時要明確命名兩端**（沿用 NX07 主題 3「主動側 / 接收側」對偶教訓）。

### 對應文件

- document.service：[apps/nx-api/src/nx09/document/](../../apps/nx-api/src/nx09/document/)
- 跨模組關聯：[NX05 主題 3](../nx05/nx05-worklog.md)（paylog VOIDED 配對沖回、本主題對比變體 = 歷史鏈）
- 業務流程：[docs/nx09/workflow/primary/nx09-w02-document-library.md](workflow/primary/nx09-w02-document-library.md)

---

## 揭露的設計缺口（NX09 全部 4 個、揭露缺口分性質範式新增第 5 子類型）

| # | 缺口 | 性質 | 處理路徑 |
|---|------|------|---------|
| 1 | 沒 spec/intent 目錄（雖有 workflow/primary 3 份）| **schema-spec 缺漏** | Alex 寫 NX09 業務 spec |
| 2 | document version 沒 diff 機制（無法 compare 版本差異）| **業務鏈缺口** | Alex 規格書補設計 + 後端加 diff endpoint |
| 3 | meeting 沒整合 nx01_calendar_event 行事曆 | **跨模組整合缺口 ⭐新子類型** | 補 wire up（不是補 spec / schema / 改架構） |
| 4 | KM 文件沒全文搜尋（純 SQL LIKE）| **schema 缺漏** | 補 PostgreSQL FTS / Elasticsearch、後續 task |

### ⭐ 缺口 #3「跨模組整合缺口」新子類型揭露

> Alex 觀察建議：缺口 #3 不屬現有 4 性質、規範升級

「揭露缺口分性質」範式（[NX06 主題 3+ 給未來提示](../nx06/nx06-worklog.md) 定義 4 性質）需擴展第 5 子類型：

| 性質 | 判斷準則 | 處理路徑 |
|------|---------|---------|
| 業務鏈缺口 | 業務鏈缺一環、單模組業務不完整 | Alex 規格書補設計 |
| demo→prod 接面缺口 | demo 跑通但真實落地沒對接 | 真實工作台落地時 wire up |
| schema 缺漏 / spec 缺漏 | schema 沒做 / spec 沒寫 | 補 spec 或 schema migration |
| 規範不一致 | 跨模組規範不一致 / schema vs 行為不一致 | 進架構債、春酒後處理 |
| **跨模組整合缺口 ⭐新** | **兩個模組已存在功能、但之間沒 wire up**（業務本身完整、schema 兩邊都有、純粹少做 wire up）| **補 wire up**（單純整合、不是補 spec / schema / 改架構） |

NX09 缺口 #3 是 #5「跨模組整合」典型例：
- NX09 meeting CRUD 完整（不是業務鏈缺口）
- NX01 calendar_event schema 存在（不是 schema 缺漏）
- 兩邊都做、缺的是「meeting 建立時自動建 calendar_event」這個 wire up

---

## 給未來新對話 Hank 的提示

- 本日誌沿用 [NX01](../nx01/nx01-worklog.md) ~ [NX08](../nx08/nx08-worklog.md) worklog 五段式結構
- ⚠️ **「穩定模組光譜」範式**（本日誌建立、Crown 拍板）：穩定模組不是 0/1 二分、是漸進光譜：
  | 模組 | follow-up migration | 業務本質 |
  |------|--------------------|----------|
  | NX05 | 2 | 財務 |
  | NX06 | 1 | 物流 |
  | NX09 | 0 | 知識管理 |
  Phase5 落地後越無 follow-up、越偏穩定光譜末端、業務本質越「傳統 CRUD」。
- ⚠️ **「append-only 版本鏈」範式**（本日誌主題 2 建立、NX09 documents 首例）：適用 KM 文件、合約、法規敏感資料、SOP 規範。未來若有類似業務（NX10 medal 升級紀錄? / NX02 part 改版?）可參考。
- ⚠️ **「NEXORA 處理不可逆的兩種策略」範式**（本日誌主題 2 末尾揭露）：
  | 策略 | 範例 | 適用場景 |
  |------|------|---------|
  | 配對沖回（雙紀錄）| NX05 paylog VOIDED | 業務動作可被沖銷、結果可被消除 |
  | 歷史鏈（多紀錄）| NX09 document version | 業務動作有時序演進、歷史有業務價值 |
  選哪種：看「**結果可逆 vs 演進可追**」業務本質。
- ⚠️ **「揭露缺口分性質」範式升級到 5 子類型**（本日誌缺口 #3 建立）：加「**跨模組整合缺口**」（兩模組已存在功能、缺 wire up、處理路徑：補 wire up、不是補 spec / schema / 改架構）。
- ⚠️ **「同批落地 ≠ 同類」認知**（本日誌主題 1 揭露）：Phase 編號 / commit batch 是工程組織單位、不是業務分類單位。NX08/NX09 同批 Phase5 第九批 API、但業務本質完全不同。
- ⚠️ **「跨模組不一致不一定是 bug」認知**（本日誌主題 1 踩坑揭露）：軟刪欄位 article/document `is_active=false` vs meeting `status='X'`、是主檔風格 vs 業務單據風格的合理差異、不是 drift。讀 v7_baseline schema 時要分清楚。
- ⚠️ **「3 個但相似度低、不抽」抽象判準延伸**（本日誌主題 1 揭露）：補強 [NX02 主題 2](../nx02/nx02-worklog.md)「3 個相似實作是抽象最佳時機」、加上「相似度高才抽、低就各自寫」判準。
- 跨模組或公版（過帳通用規則 / 公版 component / A002 schema drift / 接收側設計 5 個必備配對 / 跨模組測試基礎設施演進 / 「不可逆」兩種策略對比 / 「揭露缺口」5 子類型）**不寫進本日誌**、已寫進 [_team/worklog.md](../_team/worklog.md) 統合
- 下一輪預期：[docs/nx10/nx10-worklog.md](../nx10/nx10-worklog.md)（NX10 遊戲化、PRO 模組、checkin/exp/medal/tasks/leaderboard、Phase5-NX10 + nx10_checkin_log 1 個 follow-up migration、預期工作量介於穩定模組跟 NX01~04 之間）

---

> 文件版本：v1.0（初版、2 主題、~3700 字、穩定模組光譜最純粹例）
> 下次更新觸發：document version diff 補上 / meeting 整合 calendar_event wire up / KM 全文搜尋 / NX09 出現新工作（先 audit 性質）
