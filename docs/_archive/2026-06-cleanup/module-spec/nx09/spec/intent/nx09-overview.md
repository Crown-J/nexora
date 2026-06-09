<!-- docs/nx09/spec/intent/nx09-overview.md -->

# NX09 EIP 企業資訊平台 — 業務需求 Overview（v0.2.0）

> 性質：業務需求文件（給 Hank impl 對齊用）
> 撰寫者：Alex（NEXORA 專案 PM AI）
> 拍板者：Crown（NEXORA 創辦人）
> 日期：2026-05-18
> 對應拍板：Crown 跨 3 輪需求討論共 12 題拍板 closure（v1.0 5 題 + v0.2 7 題）
> 依賴揭露：NX09-AUDIT-01 + NX09-AUDIT-02 完成（schema + 業界專業真相 verify ✓）
> 戰略定位：**EIP 企業資訊平台 + 亞羅特色（VIN/維修 SOP 業界改革 ⭐⭐⭐）**
> 變更：v1.0 → v0.2.0 整合 IMPL-02 範圍 + audit-02 5 重大揭露

---

## §0 文件性質

兩軌實作架構：
- **TASK-NX09-IMPL-01**：基礎 EIP（v1.2.0-nx09-eip-closure ✓ 已完成）
- **TASK-NX09-IMPL-02**：亞羅特色（VIN 對照 + 維修 SOP + 4 子表 + 內部 wire）

本 v0.2.0 重點為 IMPL-02 範圍、IMPL-01 內容 v1.0 保留。

audit-02 5 重大揭露重組：

| 揭露 | 真相 | 影響 |
|---|---|---|
| NX01 vehicle chain 完整 | CarBrand → Model（年份+引擎）→ PartModel | IMPL-02 直接走、不新建 |
| schema 0 VIN 欄位 | grep 全 schema → 0 hit | VIN 對照必新建表 |
| 既有 SP=「公司業務 SOP」 | KmArticle SO/BP/RG/CX/EM/OT 無預留 REPAIR | 維修 SOP 必新建表 |
| Partslink = 紙上計畫 | LKQ 北美 collision、無公開 API、商業授權 | 本軌不適合 |
| IMPL-01 closure 真實 | 11 model / 6 controller / 26 endpoint | 6 schema-only 中 3 已補、剩 4 |

---

## §1 NX09 業務本質（v1.0 保留 + audit-02 校正）

### 1.1 戰略意義
NX09 = 亞羅全公司知識入口 + NEXORA 自己使用說明書（IMPL-01）+ 亞羅汽配業專業知識（IMPL-02）。

### 1.2 兩軌業界改革候選

**IMPL-01（v1.2.0 已落地）**：
- SystemManual 內建系統操作手冊（業界中小汽配 ERP 第一個）
- Postgres FTS 全文搜尋
- EIP 統一查詢入口

**IMPL-02（本軌、業界改革候選 ⭐⭐⭐）**：
- **VIN/車型 → 料件對照**（NHTSA + 手動混合、業界中小汽配 ERP 多無）
- **維修 SOP 知識庫**（含步驟 / 工具 / 注意事項、業界差異化）
- **RepairSop ↔ PartModel 內部 wire**（查料件→看維修 SOP、業界改革 ⭐⭐⭐）

---

## §2 主使用者與權限（v1.0 保留）

對齊 NX09-IMPL-01：
- 全公司員工 + 角色客製（Crown Q4=a 拍板）
- role_view 彈性權限

---

## §3 TASK-NX09-IMPL-01 範圍（v1.2.0 已 closure）

對齊既有 docs/nx09/spec/impl/nx09-impl-01-merge-verify.md：
- 7 業務功能全 closure ✓
- SystemManual + KmArticle / Document + Postgres FTS
- 3 子表核心 endpoint（DocumentVersion + KmTag + Feedback）
- v1.2.0-nx09-eip-closure tag

---

## §4 TASK-NX09-IMPL-02 範圍 ⭐⭐⭐（本 v0.2.0 重點）

### 4.1 業務功能（8 項）

對齊 Crown 7 戰略拍板（c/a/a/b/b/a/a）：

| # | 功能 | 範圍 | 對齊拍板 |
|---|---|---|---|
| 1 | **VinLookup 新表**（VIN 17 碼結構化）| 結構化資料 | Q1=c |
| 2 | **NHTSA API 整合**（VIN→車型自動查）| 美國國家公路交通安全管理局免費 API | Q1=c |
| 3 | **VinLookup → Model + PartModel 對照**（既有 NX01 鏈）| 業務員手動關料件 | Q1=c |
| 4 | **RepairSop 新表**（步驟 / 工具 / 注意事項 / 預估時間 / 照片）| 結構化資料 | Q2=a |
| 5 | **4 子表 endpoint 補**（ArticleTag / MeetingAttendee / Minutes / Action）| 純 CRUD | Q3=a |
| 6 | **RepairSop ↔ PartModel 內部 wire** ⭐⭐⭐（業界改革）| 查料件→看 SOP | Q6=a |
| 7 | UI placeholder 補（VinLookup / RepairSop 入口）| 純 stub | Q7=a |
| 8 | 治理檔補完（plan/summary/worklog/merge-verify）| - | - |

### 4.2 範圍 A 不涵蓋（Crown Q4/Q5=b 後續軌）

對齊 audit-02 §6 + Crown 拍板：
- auto-version + writer（TASK-NX09-IMPL-AUTO-VERSION）
- 跨模組 wire NX07/NX04/NX08（TASK-NX09-IMPL-03-CROSS-WIRE）
- 故障代碼 DTC library（TASK-NX09-IMPL-DTC-LIBRARY）
- VIN API fallback 機制（TASK-NX09-IMPL-VIN-API-FALLBACK）

---

## §5 VIN 對照（Crown Q1=c NHTSA + 手動混合）

### 5.1 業界 muscle memory

汽配業專業知識：
- 客戶來電報 VIN（車架號 17 碼）
- 業務員需查「這台車對應哪些料件」
- 業界中小 ERP 多無此功能、亞羅有 = 差異化

### 5.2 VIN 17 碼結構（audit-02 §1 揭露）

| 碼段 | 範圍 | 用途 |
|---|---|---|
| WMI | 1-3 碼 | 廠商識別（World Manufacturer Identifier）|
| VDS | 4-9 碼 | 車型描述（Vehicle Descriptor Section）|
| VIS | 10-17 碼 | 序號（Vehicle Identifier Section、含年份）|

### 5.3 NHTSA API 整合範式

對齊 Crown Q1=c：
- **VIN → 車型**：用 NHTSA decode VIN API（免費、無 key、HTTP GET）
- **車型 → 料件**：對齊既有 NX01 vehicle chain（CarBrand → Model → PartModel、業務員手動關）
- **fallback**：NHTSA 查不到（亞洲車型可能覆蓋率較低）→ 業務員手動建檔

### 5.4 schema 範式

新建 **Nx09VinLookup** 主檔：
- vin（17 碼、UNIQUE 索引）
- decodedAt（NHTSA 解析時間）
- carBrandId / modelId（FK 對齊既有 NX01 vehicle chain）
- partIds（對應料件陣列、或走 PartModel 既有對照）
- source（API / MANUAL）
- notes（業務員備註）

### 5.5 業界改革點

- 業界中小汽配 ERP 多無 VIN 對照
- NHTSA + 手動混合 = 業界改革候選 ⭐⭐⭐
- 對齊 audit-02 揭露「NX01 vehicle chain 已完整、IMPL-02 直接走」

---

## §6 維修 SOP 知識庫（Crown Q2=a 新表 RepairSop）

### 6.1 業界 muscle memory

汽配業維修 SOP：
- 換機油 SOP
- 煞車片更換 SOP
- 引擎拆裝 SOP
- 每個 SOP 含：步驟 / 工具 / 注意事項 / 預估時間 / 照片

### 6.2 schema 範式（不複用 KmArticle）

對齊 audit-02 §3 揭露「既有 SP=公司業務 SOP、不是汽車維修」：

新建 **Nx09RepairSop** 主檔：
- title / category（如「引擎」「煞車」「電裝」「保養」）
- steps（步驟陣列 JSON、含順序）
- tools（工具陣列）
- warnings（注意事項）
- estimatedMinutes（預估時間）
- photos（照片陣列）
- carModelFilter（適用車型過濾、cross-ref NX01 Model）
- partModelIds（連動料件、見 §7 內部 wire）

### 6.3 業界改革點

- 業界中小 ERP 維修 SOP 結構化罕見（多為純文字檔）
- 含 carModelFilter + partModelIds = 跟料件業務閉環
- 業界改革候選 ⭐⭐⭐

---

## §7 RepairSop ↔ PartModel 內部 wire（Crown Q6=a 業界改革 ⭐⭐⭐）

### 7.1 業務情境

```
業務員查料件
   ↓
顯示「這料件有對應的維修 SOP」（業界少見）
   ↓
員工點 SOP 連結 → 看完整步驟 / 工具 / 注意事項
```

反向：
```
業務員查 RepairSop
   ↓
顯示「這 SOP 涉及的料件清單」+ 庫存狀態
```

### 7.2 wire 範式（NX09 內部、不跨模組）

- RepairSop.partModelIds 反向關聯
- 透過 NX01 PartModel 既有對照
- service layer 提供「料件 → SOP」+「SOP → 料件」雙向查詢

### 7.3 業界改革點

- 查料件直接帶業界專業知識（SOP）= 業務員 muscle memory 升級
- 業界中小汽配 ERP 0、亞羅差異化 ⭐⭐⭐
- 屬 NX09 內部 wire、不涉跨模組（跨模組留 IMPL-03）

---

## §8 4 子表 endpoint 補（Crown Q3=a 全補）

### 8.1 4 子表清單

對齊 audit-02 §5 揭露 IMPL-01 剩餘 schema-only：
- ArticleTag（KmArticle 標籤）
- MeetingAttendee（會議與會者）
- MeetingMinutes（會議紀錄）
- MeetingAction（會議行動項目）

### 8.2 範式

純 CRUD endpoint 補：
- 5 endpoint 範式（list / get / create / update / delete）
- 對齊 IMPL-01 KmTag / Feedback 範式

---

## §9 NHTSA API 整合範式

### 9.1 API 真相

對齊 audit-02 §2 揭露：
- NHTSA = 美國國家公路交通安全管理局
- **免費 API、無 key**
- HTTP GET：`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/{vin}?format=json`
- 回傳：車型 / 年份 / 引擎 / 廠商 / 燃料類型

### 9.2 整合範式

- 純 HTTP GET、無認證
- 走 NestJS HttpService（既有）
- ENV `NHTSA_API_ENABLED` 預設 true（free API、deploy 0 設定）
- fallback：API 失敗 / 亞洲車型查不到 → 業務員手動建檔

### 9.3 亞洲車型覆蓋率

⚠️ Alex 揭露：NHTSA 主要美國車輛、亞洲車型（Toyota / Honda / Hyundai 等）覆蓋率較低、Hank verify 時可揭露具體覆蓋情況。

亞羅實際車型分佈（memory 既知）：VAG 70% + 亞系 20% + 歐美 10%。

---

## §10 跨模組接點

### 10.1 IMPL-02 範圍

對齊 Crown Q5=b 拍板「跨模組 wire 後續軌」：
- ✅ 內部 wire（RepairSop ↔ PartModel）本軌做
- ❌ 跨模組 wire（NX07 / NX04 / NX08）本軌 0

### 10.2 上游接點（read-only）

| 上游 | 提供 | NX09 用途 |
|---|---|---|
| NX01 CarBrand / Model | 車型主檔 | VinLookup 對照 |
| NX01 Part / PartModel | 料件主檔 + 車型對照 | VinLookup + RepairSop 連動 |

### 10.3 後續軌（IMPL-03）

對齊 Crown Q5=b：
- NX07 Training → KmArticle category=TRAINING
- NX04 SR 銷退原因 → KmArticle FAQ 候選
- NX08 dashboard 熱門文章排行

---

## §11 範圍 closure 定義

### 11.1 TASK-NX09-IMPL-02 範圍 closure（8 項）

對齊 Crown 7 戰略拍板：
- VinLookup 新表 + service + endpoint（含 NHTSA 整合）
- RepairSop 新表 + service + endpoint（含 carModelFilter + partModelIds）
- 4 子表 endpoint 補（ArticleTag / MeetingAttendee / Minutes / Action）
- RepairSop ↔ PartModel 內部 wire（雙向查詢）
- NHTSA API service（含 fallback）
- UI 4~6 placeholder 補（VinLookup / RepairSop / 4 子表入口）
- menu.nx09 升級
- 治理檔補完

### 11.2 範圍 closure 標準

- 既有 IMPL-01 26 endpoint 0 改、純加強
- 2 新表 schema migration（VinLookup + RepairSop）
- 4 子表 CRUD endpoint 完整
- 內部 wire RepairSop ↔ PartModel 雙向查詢落地
- NHTSA API mock fallback（API 失敗時 graceful degrade）
- UI placeholder 補完
- 治理檔對齊 NX02~NX10 範式

### 11.3 範圍不涵蓋（後續軌）

對齊 Crown Q4/Q5=b 拍板：
- auto-version + writer（TASK-NX09-IMPL-AUTO-VERSION）
- 跨模組 wire NX07/NX04/NX08（TASK-NX09-IMPL-03-CROSS-WIRE）
- VIN API fallback 機制升級（TASK-NX09-IMPL-VIN-API-FALLBACK）
- 故障代碼 DTC library（TASK-NX09-IMPL-DTC-LIBRARY）
- RAG 向量化（TASK-NX09-IMPL-04-RAG）
- 真實 UI（TASK-NX09-IMPL-UI-01）
- 「？」按鈕全站 wire（TASK-NX09-IMPL-UI-MANUAL-WIRE）

---

## §12 後續軌 backlog（9 軌候選池、audit-02 §7 揭露）

- TASK-NX09-IMPL-03-CROSS-WIRE（NX07/NX04/NX08 跨模組）
- TASK-NX09-IMPL-04-RAG（Phase 2 向量化、pgvector）
- TASK-NX09-IMPL-VIN-API-FALLBACK（亞洲車型補充）
- TASK-NX09-IMPL-UI-01（真實 UI + 文件閱讀器）
- TASK-NX09-IMPL-UI-MANUAL-WIRE（「？」按鈕全站）
- TASK-NX09-IMPL-AUTO-VERSION（DocumentVersion 自動寫入）
- TASK-NX09-IMPL-DTC-LIBRARY（故障代碼庫）
- TASK-NX09-IMPL-YARO-IMPORT（亞羅既有資料 import）
- TASK-NX09-IMPL-02-TEST（service + FTS + VIN 整合 unit test）

---

## §13 文件變更歷史

| 版本 | 日期 | 變更摘要 |
|---|---|---|
| v0.1.0 | 2026-05-18 | 首版、整合 IMPL-01 5 拍板 |
| v1.0 | 2026-05-18 | Hank formalize from Crown TASK |
| v0.2.0 | 2026-05-18 | 升版整合 IMPL-02 範圍（VIN/維修 SOP）+ audit-02 5 重大揭露 + Crown 7 戰略拍板（c/a/a/b/b/a/a）|

---

> **本文件純業務需求層、不含 schema / API / 程式碼細節**
> Hank IMPL-02 階段對齊本文件 §4-§11、技術細節 Hank 自決
> Q-RHYTHM-2 第九次落地、預估 7~10 commit / 1~2 小時
> NX09 兩軌全 closure = 第二個雙軌完整化模組
