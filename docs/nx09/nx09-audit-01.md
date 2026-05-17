<!-- docs/nx09/nx09-audit-01.md -->

# NX09-AUDIT-01 — 知識管理模組 schema + 既有狀態真相揭露

> 性質：純諮詢、不開工、不 commit production code（僅 commit 本 audit 文件）
> 撰寫：Hank
> 日期：2026-05-17
> 觸發：NEXORA v1.1 業務閉環完整化（main HEAD `8efedaa`、9 tag）後、Crown 啟動 NX09 知識管理前 verify
> 對齊：NX02 / NX03 / AR / NX04 / NX05 / NX06 / NX07 / NX08 audit 範式 + §I.5 #22 鐵律 + §G.9 通配 grep + §I.6.3 揭露不完整每段尾標

---

## §1 NX09 schema 真相

### 1.1 A041 精確 count

```
grep -c "^model Nx09" packages/db-core/prisma/schema.prisma
→ 10
```

### 1.2 10 個 Nx09* model（schema.prisma line 範圍 + 業務語意）

| # | Model | Line | Table | 業務語意 | 既有 endpoint |
|---|---|---|---|---|---|
| 1 | `Nx09Document`         | 5453 | nx09_document          | 公司制度文件主檔（章則彙編 / SOP / 工作說明書 / 表單 / 其他）| ✅ 完整 CRUD |
| 2 | `Nx09DocumentVersion`  | 5494 | nx09_document_version  | 文件版本紀錄（append-only 版本鏈）| ❌ 0（透過 document 衍生）|
| 3 | `Nx09KmArticle`        | 5525 | nx09_km_article        | KM 知識庫文章主檔（QA 條目、6 分類 SO/BP/RG/CX/EM/OT）| ✅ 完整 CRUD |
| 4 | `Nx09KmArticleTag`     | 5569 | nx09_km_article_tag    | 文章標籤關聯（多對多）| ❌ 0（schema-only）|
| 5 | `Nx09KmFeedback`       | 5589 | nx09_km_feedback       | 知識庫「已解決」按鈕回饋紀錄 | ❌ 0（schema-only）|
| 6 | `Nx09KmTag`            | 5614 | nx09_km_tag            | KM 標籤主檔（系統操作 / 業務流程 / 規章制度 / 客戶處理 / 緊急狀況）| ❌ 0（schema-only）|
| 7 | `Nx09Meeting`          | 5644 | nx09_meeting           | 會議主檔（產銷會議 / 週會 / 月會 / 臨時 / 教育訓練）| ✅ 完整 CRUD |
| 8 | `Nx09MeetingAction`    | 5685 | nx09_meeting_action    | 會議追蹤事項（待辦 + 負責人 + 截止）| ❌ 0（schema-only）|
| 9 | `Nx09MeetingAttendee`  | 5729 | nx09_meeting_attendee  | 會議出席紀錄（確認 / 請假 / 實際出席）| ❌ 0（schema-only）|
| 10 | `Nx09MeetingMinutes`  | 5757 | nx09_meeting_minutes   | 會議紀錄內容（決議 + 討論）| ❌ 0（schema-only）|

### 1.3 跟 NX01 主檔 FK 關係（A041 精確）

| 來源 NX01 | NX09 model | 接點欄 | 行 |
|---|---|---|---|
| Nx01Department  | Nx09Document   | deptId（適用部門、可空 = 全公司）       | 476 |
| Nx01Department  | Nx09KmArticle  | deptId（所屬部門、可空 = 跨部門）       | 477 |
| Nx01User        | Nx09KmFeedback | userId                                  | 1216 |
| Nx01User        | Nx09Meeting    | organizerId（發起人）                    | 1217 |
| Nx01User        | Nx09MeetingAction | assigneeId（負責人）                  | 1218 |
| Nx01User        | Nx09MeetingAttendee | userId                              | 1219 |
| Nx99Tenant      | 全 10 model × tenantId                  | 6 reverse list                        | 6721+ |

### 1.4 跟其他模組接點

⚠️ **重大揭露：NX09 沒有任何業務模組接點**（純 NX01 主檔 FK + Tenant）：
- NX02 採購 → ❌ 0 接點
- NX03 庫存 → ❌ 0 接點
- NX04 銷貨 → ❌ 0 接點
- NX05 財務 → ❌ 0 接點
- NX06 物流 → ❌ 0 接點
- NX07 人資 → ❌ 0 接點
- NX08 報表 → ❌ 0 接點
- NX10 遊戲化 → ❌ 0 接點（尚未軌）

⭐ **設計意涵**：NX09 是 **純獨立業務模組**（KM CRUD + 文件版本管理 + 會議追蹤）、不依賴業務單據、與其他業務模組唯一連結是 NX01 員工身份 + 部門結構。

### §I.6.3 §1 揭露不完整

- 未 verify Nx09 schema migration 拆軌數（nx09-worklog 主題 1 已揭露「0 follow-up migration、Phase5 落地完美」、本 audit 未深 grep）
- 未 verify Nx09KmArticle.viewCount / helpfulCount 是否有 writer（CRUD endpoint 是否含 view 點擊 + feedback 寫入）

---

## §2 NX09 backend service 真相

### 2.1 既有 service 列表（A041 精確 = **3 service / 3 controller / 15 endpoint**）

```
apps/nx-api/src/nx09/
├── nx09.module.ts
├── article/   (CRUD × 5、KmArticle)
├── document/  (CRUD × 5、Document + 衍生 version)
└── meeting/   (CRUD × 5、Meeting)
```

shared 層：`apps/nx-api/src/shared/nx09/nx09-pro-plan.guard.ts`（PRO 方案 guard、對齊 NX07/NX08）

### 2.2 15 endpoint 列表（純 CRUD）

| controller | endpoint | method |
|---|---|---|
| article    | `GET /nx09/article`           | list |
| article    | `GET /nx09/article/:id`       | get |
| article    | `POST /nx09/article`          | create |
| article    | `PATCH /nx09/article/:id`     | update |
| article    | `DELETE /nx09/article/:id`    | delete |
| document   | `GET /nx09/document`          | list |
| document   | `GET /nx09/document/:id`      | get |
| document   | `POST /nx09/document`         | create |
| document   | `PATCH /nx09/document/:id`    | update |
| document   | `DELETE /nx09/document/:id`   | delete |
| meeting    | `GET /nx09/meeting`           | list |
| meeting    | `GET /nx09/meeting/:id`       | get |
| meeting    | `POST /nx09/meeting`          | create |
| meeting    | `PATCH /nx09/meeting/:id`     | update |
| meeting    | `DELETE /nx09/meeting/:id`    | delete |

### 2.3 schema-only 6 model（0 endpoint）

對齊 §1.2 揭露：
- **Nx09DocumentVersion**（透過 document patch 衍生：每次 update document 自動寫一版？需 verify service 真實行為）
- **Nx09KmArticleTag**（文章標籤關聯）+ **Nx09KmTag**（標籤主檔）+ **Nx09KmFeedback**（已解決回饋）
- **Nx09MeetingAction**（追蹤事項）+ **Nx09MeetingAttendee**（出席紀錄）+ **Nx09MeetingMinutes**（會議紀錄）

⚠️ **schema 完整 / endpoint 只做骨架**：3 大主檔（article / document / meeting）CRUD 落地、6 周邊子表 schema-only 等後續軌補。

### 2.4 worklog 揭露的設計範式

對齊 `docs/nx09/nx09-worklog.md` 主題 1+2：
- ⭐ **「穩定模組真誠揭露」最純粹例**（NX05 2 follow-up / NX06 1 / **NX09 0**）
- ⭐ **document 多版本設計（append-only 版本鏈）**：DocumentVersion 表單獨存所有版本歷史、Document 主表記 current_ver、append-only 不 mutate
- ⭐ **「3 個但相似度低、不抽」抽象判準**：article / document / meeting 三個業務本質都是 CRUD、相似但語意不同（QA / 制度 / 會議）、不抽共用 base

### §I.6.3 §2 揭露不完整

- 未 verify document.patch 是否自動寫 DocumentVersion 一筆（worklog 主題 2 揭露 append-only 設計、但 service 行為 0 grep verify）
- 未 verify article CRUD 是否含 view / feedback 子表操作（schema 有 helpfulCount 累計欄、無對應 endpoint）

---

## §3 NX09 frontend 真相

### 3.1 既有 app/dashboard/nx09（A041 精確 = **1 page**）

```
apps/nx-ui/src/app/dashboard/nx09/
└── workspace/
    └── page.tsx   (NX09-WS-UI-001-F01)
```

### 3.2 features/nx09（A041 精確 = **0 檔**）

```
find apps/nx-ui/src/features -ipath '*nx09*'  → 0 results
```

⚠️ **features/nx09 不存在**（對比 NX06 已有 features/nx06/push-subscription.ts）。

### 3.3 menu.nx09.ts（A041 精確 = **不存在**）

```
ls apps/nx-ui/src/features/layout/config/menu.nx09*  → No such file
grep -n 'nx09\|Nx09' apps/nx-ui/src/features/layout/config/side-menu.ts  → 0 matches
```

⚠️ **side-menu.ts 0 wire nx09**（對比 menu.nx02-08 全在）。

### §I.6.3 §3 揭露不完整

- 未 verify workspace placeholder 是否有 desc 升級記錄

---

## §4 既有 demo 揭露

### 4.1 從 codebase + worklog 推斷

- ✅ **真實落地（NX09-IMPL phase5 v7_baseline、Phase5-NX08/NX09 同批）**：article / document / meeting 3 主檔 CRUD（15 endpoint）+ workspace placeholder
- ✅ **真實落地**：DocumentVersion append-only 版本鏈設計（worklog 主題 2）
- ⚠️ **schema-only 沒 endpoint**：DocumentVersion / KmArticleTag / KmTag / KmFeedback / MeetingAction / MeetingAttendee / MeetingMinutes 7 model
- ❌ **UI 0 demo**：只有 1 placeholder、無真實 article browser / document viewer / meeting calendar
- ❌ **跨模組整合 0**（純 NX01 主檔 FK、無業務模組接點）

### 4.2 對比其他模組 demo 狀態

| 模組 | 真實 demo backend | UI 落地 |
|---|---|---|
| NX02-06 + AR + NX07 | ✅ 完整業務 demo | ⚠️ stub placeholder |
| NX08 | ✅ 12 + 22 endpoint | ⚠️ 22 placeholder |
| NX07 | ✅ 47 endpoint（IMPL-01 後）| ⚠️ 8 placeholder（IMPL-01 後）|
| **NX09（本軌前）** | ✅ 15 endpoint（純 CRUD）| ❌ 1 placeholder（同 NX07 IMPL-01 前）|

### §I.6.3 §4 揭露不完整

- 未 verify production 是否有真實 article / document / meeting 落地資料
- 未 verify 「最純粹穩定模組」狀態是否 IMPL-01 後仍維持（如本軌加 endpoint 即破壞純粹性）

---

## §5 NX09 vs 9 軌範式對齊

### 5.1 partVersionId 配套

- ⭐ **N/A**：NX09 純知識管理 + 文件 + 會議、不寫 stock_ledger / paylog 等 ledger 表
- 對齊 NX05 / NX06 / NX08 / NX07 純非 ledger 模組範式

### 5.2 跟其他模組接點完整度

| 接點 | 真相 |
|---|---|
| NX09 → NX01（Department + User）| ✅ 6 reverse FK 在 |
| NX09 → 業務模組（NX02/04/05/06）| ❌ 0 接點（純獨立業務模組）|
| 業務模組 → NX09 SOP / KM | ❌ 0 反向接點（業務模組未引用 KM）|

### 5.3 模組層治理（summary / audit / phase / closure）落後程度

| 治理檔 | NX02 | NX03 | NX04 | NX05 | NX06 | NX07 | NX08 | **NX09** |
|---|---|---|---|---|---|---|---|---|
| audit-01 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **🆕 本檔**|
| overview spec | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| impl-01 plan | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| summary | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| merge verify | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| worklog | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ v1.0（2 主題、~3700 字、穩定模組光譜最純粹例）|

⚠️ **NX09 治理落後 2 階段**（無 spec / 無 audit / 無 plan / 無 summary / 無 merge verify、僅 worklog v1.0 2 主題揭露既有狀態）— 同 NX07 IMPL-01 前狀態。

### §I.6.3 §5 揭露不完整

- 未 verify NX10 遊戲化模組治理檔狀態（本軌不涉及）

---

## §6 業界場景候選揭露 ⭐ Crown 拍板池

### 6.1 NX09 業務本質（對齊 nxtable.csv 102-111 + worklog）

**NX09 知識管理 = 公司內部知識資產的「圖書館 + 規章 + 會議室記憶」**：
- KM 知識庫（QA-style、可搜尋、可標籤、可回饋）→ **Phase 2 RAG 向量化候選**（nxtable csv 102 揭露）
- Document 制度文件庫（章則 / SOP / 工作說明書 / 表單）+ append-only 版本鏈
- 會議系統（主檔 + 出席 + 紀錄 + 追蹤事項）

### 6.2 業界 muscle memory 候選池（中小汽配 ERP / 知識管理）

| # | 業務功能 | 業界範式 | 既有 schema | 既有 endpoint | ⭐ 評等 |
|---|---|---|---|---|---|
| 1  | **SOP 文件管理**（標準作業流程、章則彙編）| 既有 Document + DocumentVersion | ✅ schema 完整 | ✅ document CRUD 5 | ⭐⭐⭐ 已落地 |
| 2  | **文件多版本歷史**（append-only 版本鏈）| 既有 DocumentVersion | ✅ schema | ❌ schema-only（worklog 揭露透過 document patch 衍生、需 verify）| ⭐⭐ |
| 3  | **KM QA 知識庫**（問題 + 答案、可搜尋）| 既有 KmArticle | ✅ schema 完整 | ✅ article CRUD 5 | ⭐⭐⭐ 已落地 |
| 4  | **KM 標籤系統**（多對多）| 既有 KmTag + KmArticleTag | ✅ schema | ❌ 0 endpoint | ⭐⭐ 業界必備 |
| 5  | **KM 解決率統計**（helpfulCount / viewCount）| 既有 KmArticle 欄 + KmFeedback | ⚠️ schema 在 / writer 0 | ❌ 0 endpoint | ⭐⭐ 業界必備 |
| 6  | **會議主檔 + 出席 + 紀錄 + 追蹤**（5 子表）| 既有 Meeting + 4 子表 | ✅ schema 完整 | ⚠️ Meeting CRUD only / 4 子表 0 | ⭐⭐⭐ 業界必備 |
| 7  | **教育訓練文件**（接合 NX07 Training）| NX07 既有 Training 表 | ❌ NX09 schema 無連 | ❌ | ⭐⭐ 候選跨模組 wire |
| 8  | **VIN / 車型 → 料件對照表**（汽配業界知識）| ❌ schema 無 | ❌ | ❌ | ⭐⭐⭐ 亞羅汽配特色候選 |
| 9  | **維修知識庫**（料件維修 / 故障排除）| 既有 KmArticle 可重用（category 擴）| ⚠️ schema 可承載 | ❌ | ⭐⭐ 汽配業界候選 |
| 10 | **FAQ 常見問題庫**（KM 子集）| 既有 KmArticle 可承載 | ✅ | ✅（透過 CRUD）| ⭐ |
| 11 | **員工內部知識分享**（員工貢獻、按讚）| 既有 KmFeedback 可承載 | ⚠️ schema | ❌ | ⭐ |
| 12 | **廠商規格文件**（規格表 / 安裝指南）| Document 可承載（docCategory 擴）| ✅ schema | ✅ document CRUD | ⭐⭐ |
| 13 | **客戶服務知識庫**（接合 NX04 客訴）| 既有 KmArticle category=CX 客戶處理 | ✅ schema | ❌（schema 在 / wire 0）| ⭐⭐ |
| 14 | **會議追蹤事項管理**（待辦自動提醒）| 既有 MeetingAction | ⚠️ schema | ❌ 0 endpoint | ⭐⭐ 業界必備 |
| 15 | **會議出席率統計**（出席 / 請假）| 既有 MeetingAttendee | ⚠️ schema | ❌ 0 endpoint | ⭐⭐ |
| 16 | **全文搜尋**（KM + Document 一站搜）| 跨表 SQL ILIKE or Postgres FTS | ❌ 0 service | ❌ | ⭐⭐⭐ 業界必備 |
| 17 | **RAG 向量化** ⭐（AI 候選、Phase 2）| KmArticle.question/answer 結構化 | ⚠️ schema 有結構 / 行為 0 | ❌ | 🔵 後續軌 AI 戰略 |
| 18 | **跨模組整合**（NX07 Training / NX02 RR 標案文件）| ❌ 0 schema 接點 | ❌ | ❌ | ⭐ 後續軌 |

### 6.3 亞羅汽配業特色候選 ⭐⭐⭐

對齊 nxtable csv 102 RAG 向量化提示 + 汽配業 muscle memory：

- ⭐⭐⭐ **VIN / 車型 → 料件對照表**（業界中小汽配 ERP 多無、KmArticle 可承載 or 新表）
- ⭐⭐⭐ **維修 SOP 知識庫**（KmArticle category 擴 / Document 章則彙編）
- ⭐⭐ **故障代碼 → 維修方案知識庫**（KM QA 結構天然適合）
- ⭐⭐ **客戶服務 FAQ 自動回覆**（接合 RAG + Phase 2 AI 戰略軌）

### 6.4 跨模組整合候選（後續軌）

- NX07 Training → NX09 Document（教育訓練文件入庫）
- NX02 RR / NX04 SR → NX09 KmArticle（業務問題沉澱知識庫）
- NX08 dashboard → NX09 KM 熱門排行（dashboard 整合知識熱度）
- NX10 遊戲化 → NX09 KmArticle（員工貢獻 KM 累計 exp、獎勵範式）

### §I.6.3 §6 揭露不完整

- 未 verify Crown 對「亞羅汽配特色」候選優先級（VIN / 車型 / 維修 SOP）
- 未 verify Crown 對「全文搜尋」是否本軌啟動 vs Phase 2 RAG 軌
- 未 verify Crown 對 6 schema-only 子表 endpoint 補齊是否本軌
- 未 verify Crown 對跨模組整合（NX07 Training / NX04 SR → KmArticle）優先級

---

## §7 IMPL plan 預告（給 Alex 寫 overview 對齊用）

對齊 NX02~NX08 audit → IMPL-01 範式預告、NX09 推測 plan 框架（最小化、貼合「穩定模組真誠揭露」精神）：

| Phase 候選 | 範圍 |
|---|---|
| Phase 0 plan | overview v0.1.0 + Q-RHYTHM-2 拍板 |
| Phase 1 schema | M1 可能新增 VIN 對照表 / 維修 SOP 表（亞羅特色）or 0 schema 動 |
| Phase 2 service | 補 6 schema-only 子表 endpoint（KmTag / KmArticleTag / KmFeedback / MeetingAction / MeetingAttendee / MeetingMinutes）+ Document version diff |
| Phase 3 search | 全文搜尋 service（純 SQL ILIKE 或 Postgres FTS、Q-RHYTHM-2 mock fallback）|
| Phase 4 跨模組 wire | NX07 Training / NX04 SR → NX09 KmArticle（候選）|
| Phase 5 UI stub | 4-6 placeholder（KM / Document / Meeting / Tag / Search + 亞羅特色入口）+ menu.nx09 + side-menu wire |
| Phase 6 docs | summary + worklog 主題 3 + _team 主題 30 + merge-verify |

**戰略題待 Crown 拍板**（推估 5-8 題）：
1. **亞羅汽配特色範圍**（A=本軌新建 VIN/維修 SOP 表 / B=後續軌 / C=KmArticle category 擴複用）
2. **6 schema-only 子表 endpoint 補齊**（A=本軌全補 / B=分軌 / C=保留 schema-only）
3. **全文搜尋**（A=本軌純 SQL ILIKE / B=後續軌 Postgres FTS / C=Phase 2 RAG 同步）
4. **跨模組整合**（NX07 Training / NX04 SR / NX08 dashboard → KM）
5. **DocumentVersion 自動寫入**（patch document 自動寫一版 vs 手動 patch）
6. **KmArticle viewCount / helpfulCount writer**（自動累計 vs 手動 endpoint）
7. **RAG Phase 2 戰略軌啟動條件**（本軌完成 / 規模化後 / Crown 拍板）
8. **UI 範圍**（純 stub / KM 全文搜尋 UI / 文件閱讀器）

---

## §8 §I.6.3 揭露不完整總清單

本 audit 已盡力 verify、剩餘需 Crown / Alex / HR / 業務員補揭露：

1. **§1** Nx09 schema migration 拆軌數（nx09-worklog 主題 1 揭露「0 follow-up migration」、本 audit 未深 grep）
2. **§2** document.patch 是否自動寫 DocumentVersion
3. **§2** article CRUD 是否含 view 點擊 + feedback 寫入累計欄
4. **§3** workspace placeholder desc 升級歷史
5. **§4** production 真實 row 落地狀態
6. **§4** 「最純粹穩定模組」狀態 IMPL-01 後維持否
7. **§6** Crown 對亞羅汽配特色 / 全文搜尋 / 6 schema-only / 跨模組整合 / RAG / UI 範圍拍板
8. **§7** 5-8 戰略題確切答案

---

## §9 與 nx09-worklog v1.0 對齊揭露

對齊 [docs/nx09/nx09-worklog.md](../nx09-worklog.md) 主題 1-2：

- 主題 1：v7_baseline + Phase5-NX09 第九批 API 落地（PRO 純業務模組）
  - NX09 vs NX08 同批落地 ≠ 同類（NX08 聚合層 / NX09 純業務）
  - ⭐ NX09「穩定模組真誠揭露」最純粹例（0 follow-up migration）
- 主題 2：document 多版本設計（append-only 版本鏈）

worklog 已揭露範式：
- 「3 個但相似度低、不抽」抽象判準（補強 NX02 主題 2）

⭐ 本 audit-01 補揭：
- 10 model / 3 controller / 15 endpoint A041 精確
- 0 業務模組接點重大揭露（純獨立業務模組）
- 6 schema-only model（schema 完整 / endpoint 0）
- 18 業務候選池 + 亞羅汽配特色（VIN / 維修 SOP）+ RAG Phase 2 戰略
- 治理檔落後 2 階段（同 NX07 IMPL-01 前）

---

> 文件版本：v1.0（NX09-AUDIT-01 純諮詢、9 段揭露 + 10 model schema + 15 endpoint + 1 placeholder + 18 業務功能候選池 + 亞羅汽配特色 ⭐⭐⭐）
> 待 Crown 拍板 5-8 戰略題（§7 末段）→ Alex 寫 nx09-overview v0.1.0 → Hank 寫 nx09-impl-01-plan
