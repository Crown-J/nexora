<!-- docs/nx09/spec/intent/nx09-overview.md -->

# NX09 EIP 企業資訊平台 — 業務需求 Overview（v1.0）

> 性質：業務需求文件（給 Hank impl 對齊用）
> 撰寫者：Crown 直接拍板 + Hank 從 Crown TASK-NX09-IMPL-01 prompt formalize（Alex 本輪未寫）
> 拍板者：Crown（NEXORA 創辦人）
> 日期：2026-05-17
> 對應拍板：Crown 5 戰略題拍板 closure（Q1=全要 / Q2=b 拆 2 軌 / Q3=b FTS / Q4=a 全員+角色 / Q5=b SystemManual 新表）
> 依賴揭露：NX09-AUDIT-01 完成（schema 真相 verify ✓）
> 戰略定位：NEXORA v1.1 後第二個收尾軌（剩 NX09 + NX10、本軌 9/11 → 10/11）
> 紀律：Q-RHYTHM-2 第六次落地

---

## §0 文件性質

⚠️ **重戰場升級**：Crown 揭露 NX09 = **EIP 企業資訊平台**（不是純小知識庫）。

業務本質回答：
- 員工從哪查公司知識？→ **NX09 KM**
- 員工從哪查系統怎麼用？→ **NX09 SystemManual ⭐**（NEXORA 自己的使用說明書、業界 ERP 標配）
- 主管從哪查 SOP / 章則？→ **NX09 Document**
- 怎麼找？→ **NX09 全文搜尋（Postgres FTS）**

兩軌拆分（Crown Q2=b）：
- **TASK-NX09-IMPL-01**：基礎 EIP + SystemManual（本軌）
- **TASK-NX09-IMPL-02**：亞羅特色（VIN/維修 SOP + 跨模組接點、後續軌）

Hank impl 對齊原則：
- 本文件業務需求 = 真相
- Q-RHYTHM-2 全軌連跑紀律
- 技術細節 Hank 自決

---

## §1 NX09 業務本質

### 1.1 NX09 是什麼

**NX09 EIP 企業資訊平台 = NEXORA v1.1 後員工查資訊的單一入口**：

- KM 知識庫（FAQ / SOP / 公告 / 訓練）
- Document 制度文件（規格 / 規章 / 廠商文件 / 版本歷史）
- **SystemManual 系統操作手冊**（NEXORA 各 endpoint 自帶說明、業界 SAP / Oracle / Microsoft Dynamics 標配）⭐
- 全文搜尋（跨 KM / Document / SystemManual）
- 會議追蹤（既有 Phase5 落地、本軌 0 動）

### 1.2 NX09 在 NEXORA 全棧的角色

```
員工查資訊 → NX09 EIP（KM / Document / SystemManual / 全文搜尋）
        ↓
跨模組整合候選（IMPL-02 後續軌）：
  NX07 Training → NX09 Document（教育訓練文件入庫）
  NX04 SR → NX09 KmArticle（業務問題沉澱知識）
  NX02 PR → NX09 KmArticle（採購退貨 FAQ）
  NX08 dashboard → NX09 KM 熱門排行
```

### 1.3 NEXORA 戰略意義

⭐⭐⭐ NX09-IMPL-01 落地 3 個業界改革候選：

1. **SystemManual 內建系統操作手冊**（業界 ERP 標配、NEXORA 第一個內建 featureKey 對應）
2. **Postgres FTS 全文搜尋**（純 Postgres 原生、不裝 Elasticsearch、業界中小 ERP 罕見）
3. **EIP 統一查詢入口**（KM + Document + Manual 跨表搜尋）

---

## §2 主使用者與權限（Crown Q4=a 全員 + 角色客製）

| 角色 | dashboard 重點 |
|---|---|
| **全公司員工** | 查詢 KM / Document / SystemManual / 全文搜尋 |
| **HR_ADMIN** | KM / Document / Training 管理 |
| **SYSADMIN** | SystemManual 管理（系統手冊定義）|
| **OWNER** | 全部 + 跨部門 KM 統計 |

權限機制 = 既有 viewPermission（A=全員 / M=主管 / D=指定部門）+ Nx09ProPlanGuard。

---

## §3 業務功能架構

### 3.1 NX09-IMPL-01 範圍（本軌、Crown Q1+Q2 拍板）

對齊 audit § 6 18 候選池 + Crown 5 戰略拍板：

| # | 功能 | audit 狀態 | 本軌 |
|---|---|---|---|
| 1 | KmArticle 主檔升級（FAQ / SOP / 公告 / 訓練 4 大分類）| ✅ schema + service | ✅ 擴 category enum |
| 2 | Document 主檔升級（規格 / 規章 / 廠商文件 / 版本歷史）| ✅ schema + service | ✅ 擴 docCategory enum |
| 3 | **SystemManual 新表 ⭐**（NEXORA 系統操作手冊）| ❌ 0 | ✅ 新建 |
| 4 | **Postgres FTS 全文搜尋 ⭐**（跨 3 主檔）| ❌ 0 | ✅ 新建（tsvector + simple/jieba）|
| 5 | 3 子表 core endpoint（DocumentVersion / KmTag / KmFeedback）| ⚠️ schema-only | ✅ 補核心 endpoint |
| 6 | UI 純 stub + menu.nx09 + side-menu wire | ❌ 0 menu | ✅ 6 placeholder + menu + wire |
| 7 | 治理檔補完（spec/audit/plan/summary/merge-verify）| ❌ 治理落後 2 階段 | ✅ 全補完 |

### 3.2 IMPL-02 範圍（後續軌、本軌 0 動）

對齊 Crown Q2=b「拆 2 軌」+ audit § 6.3 亞羅特色：

- VIN / 車型 → 料件對照表 ⭐⭐⭐（亞羅汽配特色）
- 維修 SOP 知識庫 ⭐⭐⭐
- 故障代碼 → 維修方案 KM
- 跨模組接點（NX07 Training / NX04 SR / NX08 dashboard → NX09）
- DocumentVersion 自動寫入（document.patch 自動衍生一版）
- KmArticle viewCount / helpfulCount 自動累計 writer
- RAG Phase 2 戰略軌（KmArticle.question/answer 結構化向量化）

---

## §4 SystemManual ⭐（Crown Q5=b 新表）

### 4.1 業界範式對標

業界 ERP 標配（員工不需另查 doc）：
- SAP：每個 transaction code 有 F1 help
- Oracle：APEX / EBS 內建 help text
- Microsoft Dynamics：每個 form 有 help context

NEXORA 範式：
- 每個 endpoint / UI feature 有 featureKey
- featureKey 對應 SystemManual 文章（title / content / screenshots / steps）
- 「？」按鈕（UI wire 留 TASK-NX09-IMPL-UI-MANUAL-WIRE 後續軌）

### 4.2 featureKey 命名規範初版

```
模組.功能.動作

範例：
  nx04.so.create       — NX04 SO 建立
  nx04.so.patch        — NX04 SO 修改
  nx05.ar.statement    — NX05 AR 對帳單
  nx06.handover.create — NX06 動態交接建立
  nx07.salary.confirm  — NX07 薪資 CONFIRMED
  nx08.dashboard.bcg   — NX08 BCG matrix dashboard
```

### 4.3 schema 欄位（最小化、Hank 自決細節）

- id / tenantId
- featureKey VARCHAR(50) UNIQUE
- title / content（Text）/ steps（JSON）/ screenshots（JSON URL 陣列）
- version / category / isActive
- createdBy / updatedBy + audit

### 4.4 本軌邊界

- ✅ 純後端 service + endpoint + 1 placeholder UI
- ❌ NEXORA UI「？」按鈕 wire（後續軌 TASK-NX09-IMPL-UI-MANUAL-WIRE）
- ❌ 大量 system manual seed 資料（範例 seed 留後續軌）

---

## §5 Postgres FTS 全文搜尋（Crown Q3=b）

### 5.1 技術範式

對齊 Crown 拍板「純 Postgres 原生、不裝 Elasticsearch」：

- 3 主檔（KmArticle / Document / SystemManual）加 tsvector 欄
- tsvector trigger 自動更新（同 Postgres FTS 標準範式）
- 中文分詞：
  - 首選 `simple` 配置（無需安裝插件、英文+數字+CJK 字元分詞）
  - 可選 `pg_jieba`（Hank verify 安裝可行性、不裝則 simple）

### 5.2 Search service 範式

- `GET /nx09/search?q=...&scope=km|doc|manual|all`
- query: tsquery + ts_rank 排序 + snippet（headline）
- 對齊既有 monthly-report 範式（純 SQL 聚合）

### 5.3 邊界

- 本軌：純 SQL FTS、tsvector + tsquery
- 後續軌：RAG Phase 2 向量化（pgvector / OpenAI embedding）

---

## §6 跨模組接點

### 6.1 本軌（IMPL-01）

⭐ **本軌 0 跨模組 wire**（純 NX09 內部 + Nx01User / Nx01Department）。

### 6.2 IMPL-02 範圍（後續軌）

- NX07 Training → NX09 Document（教育訓練文件入庫）
- NX04 SR → NX09 KmArticle（業務問題沉澱）
- NX02 PR → NX09 KmArticle（採購退貨 FAQ）
- NX08 dashboard → NX09 KM 熱門排行

---

## §7 範圍 closure 定義

### 7.1 範圍 A 涵蓋

| # | 功能 | 範圍 A |
|---|---|---|
| 1 | KmArticle 主檔升級（4 大分類）| ✅ |
| 2 | Document 主檔升級（規格/規章/廠商/版本）| ✅ |
| 3 | SystemManual 新表 + service + endpoint ⭐ | ✅ |
| 4 | Postgres FTS 全文搜尋 + tsvector schema ⭐ | ✅ |
| 5 | 3 子表核心 endpoint（DocVersion / KmTag / Feedback）| ✅ |
| 6 | UI 6 placeholder + menu.nx09 + side-menu wire | ✅ |
| 7 | 治理檔補完 | ✅ |

### 7.2 範圍 closure 標準

- 既有 15 endpoint 行為 100% 保留
- 1 新表 + 3 主檔 tsvector schema 純 additive
- FTS service + endpoint 純新增
- 3 子表 endpoint 補（schema 已備）
- UI placeholder + menu + wire
- 治理檔對齊 NX02~NX08 範式

### 7.3 範圍不涵蓋（IMPL-02 後續軌）

- VIN / 車型 → 料件對照表（亞羅特色）
- 維修 SOP 知識庫
- 跨模組接點 wire
- DocumentVersion 自動寫入
- KmArticle 統計 writer
- RAG Phase 2 向量化
- 「？」按鈕 UI wire
- 大量 SystemManual seed

---

## §8 後續軌 backlog

- TASK-NX09-IMPL-02-YARO-FEATURE：亞羅特色（VIN / 維修 SOP / 故障代碼）
- TASK-NX09-IMPL-03-CROSS-WIRE：跨模組接點（NX07 / NX04 / NX02 / NX08 wire）
- TASK-NX09-IMPL-04-RAG：Phase 2 RAG 向量化（pgvector / embedding）
- TASK-NX09-IMPL-UI-01：UI 真實表單 + 文件閱讀器 + 全文搜尋 UI
- TASK-NX09-IMPL-UI-MANUAL-WIRE：NEXORA UI「？」按鈕 wire SystemManual
- TASK-NX09-IMPL-AUTO-VERSION：DocumentVersion 自動寫入 + KM 統計 writer
- TASK-NX09-IMPL-02-TEST：service + FTS unit test

---

## §9 文件變更歷史

| 版本 | 日期 | 變更摘要 |
|---|---|---|
| v1.0 | 2026-05-17 | 首版、Crown 5 戰略題拍板 + Hank 從 Crown TASK 直接 formalize（Alex 本輪未寫） + NX09-AUDIT-01 整合 |

---

> **本文件純業務需求層、不含 schema / API / 程式碼細節**
> Hank IMPL-01 階段對齊本文件、技術細節 Hank 自決
> Q-RHYTHM-2 全軌連跑套用、預估 12~15 commit
