<!-- docs/nx08/spec/intent/nx08-overview.md -->

# NX08 報表分析 — 業務需求 Overview（v0.1.0）

> 性質：業務需求文件（給 Hank impl 對齊用）
> 撰寫者：Alex（NEXORA 專案 PM AI）
> 拍板者：Crown（NEXORA 創辦人）
> 日期：2026-05-18
> 對應拍板：Crown 5 戰略題拍板 closure（全照推）
> 依賴揭露：NX08-AUDIT-01 完成（schema 真相 verify ✓）
> 戰略定位：NEXORA 業務閉環延伸、跨模組數據聚合、Crown / 主管戰略入口
> 紀律：Q-RHYTHM-2 第四次落地

---

## §0 文件性質

本文件為 NX08 報表分析模組業務需求總覽、整合 audit-01 揭露 + Crown 5 戰略拍板。

Hank impl 對齊原則：
- 本文件業務需求 = 真相、所有衝突以本文件為準
- 對齊 Q-RHYTHM-2 全軌連跑紀律
- schema migration / service / UI / ETL 詳細範式 Hank 自決

---

## §1 NX08 業務本質

### 1.1 NX08 是什麼

**NX08 報表分析 = NEXORA 業務閉環的「眼睛」**、跨模組數據聚合給 7 種角色看。

業務本質回答 5 個核心問題：

1. **業務員賣得怎樣？**（個人業績 + 客戶分析 + 商品銷量）
2. **庫存健康嗎？**（周轉率 + 滯銷品 + 缺貨警示）
3. **採購效率？**（廠商分析 + 比價歷史 + 採購額）
4. **財務狀況？**（應收應付 + 月結 + 現金流）
5. **公司整體？**（Crown 主管跨部門綜合戰略）

### 1.2 NX08 在 NEXORA 全棧的角色

```
上游（業務閉環第一階段全 closure ✓）：
NX02 採購 → 採購額 / 廠商分析 / 比價歷史
NX03 庫存 → 周轉率 / 滯銷品 / ABC 分類
NX04 銷貨 → 業績 / 客戶分析 / 商品銷量
NX05 財務 → 應收應付 / 月結 / 現金流
NX06 物流 → 配送成本 / 路線效率 / 動態交接統計
AR 自動補貨 → 命中率 / 替代品牌追蹤
        ↓
NX08 報表聚合：
   7 角色 dashboard + 業務閉環延伸指標
        ↓
下游：Crown / 主管戰略決策
```

**核心定位**：業務閉環第一階段達成後、Crown 看 NEXORA 的入口。

### 1.3 NEXORA 戰略意義

⭐⭐⭐ NX08 落地 3 個業界改革候選：

1. **AR 補貨建議命中率 dashboard**（接合 AR closure 智能補貨）
2. **DnHandover 動態交接統計 dashboard**（接合 NX06 動態交接、業界第一個）
3. **BCG matrix 商品分類 + HPA trend**（業界 schema 多有、行為少落地）

---

## §2 主使用者與權限 — 7 角色 dashboard

對齊 Crown Q2=b 完整版：

| 角色 | dashboard 重點 |
|---|---|
| **SALES 業務員** | 個人業績 / 客戶分析 / 商品銷量 |
| **WAREHOUSE 倉管** | 庫存周轉 / 滯銷品 / 缺貨警示 |
| **WAREHOUSE 倉管組長** | 配送成本 / 路線效率 / 動態交接統計 ⭐ |
| **PURCHASING 採購** | 廠商分析 / 比價歷史 / 採購額 |
| **FINANCE 財務** | 應收應付 / 月結 / 現金流 |
| **OWNER 主管** | 部門業績 / 跨業務員比較 / 業績目標 |
| **Crown 戰略** | 跨部門綜合 / BCG matrix / 戰略指標 ⭐ |

### 2.2 權限機制 = 彈性 role_view

對齊 NX02~NX06 範式：
- 預設角色看自己對應 dashboard
- 用 role_view 彈性權限（如：OWNER 可看所有 dashboard）
- 業務員只能看自己業績、主管看全部門

---

## §3 業務功能架構

### 3.1 NX08 範圍 A 業務功能（7 角色 × N dashboard）

對齊 audit § 6 揭露 20 dashboard 候選池 + Crown 拍板：

#### 業務員 dashboard
1. **個人銷售業績**（月度銷售額 + 目標達成率 + 趨勢）
2. **客戶分析**（VIP 客戶 / 流失客戶 / 客單價）
3. **商品銷量排行**（熱銷 / 滯銷 / 利潤率）

#### 倉管 dashboard
4. **庫存周轉率**（按倉 / 按品牌 / 按料件）
5. **滯銷品警示**（N 天無動銷 / 高庫存金額）
6. **缺貨警示**（低於 safetyQty / 預期缺貨）

#### 倉管組長 dashboard ⭐
7. **配送成本分析**（自家 vs Lalamove / 油錢估算）
8. **路線效率**（平均配送時間 / 距離 / 簽收率）
9. **動態交接統計**（接合 NX06、業界改革候選 ⭐⭐⭐）

#### 採購 dashboard
10. **廠商分析**（採購額 / OTD 準時率 / 良率）
11. **比價歷史**（同料件多廠商價格趨勢）
12. **採購額統計**（月度 / 國內 vs 國外）

#### 財務 dashboard
13. **應收帳款**（未付 / 逾期 / 帳齡分析）
14. **應付帳款**（未付 / 即將到期）
15. **現金流預測**（未來 30/60/90 天）

#### 主管 dashboard
16. **部門業績**（業務 / 倉管 / 採購）
17. **跨業務員比較**（業績排行 + 達成率）
18. **業績目標 vs 實績**

#### Crown 戰略 dashboard ⭐
19. **跨部門綜合**（採購 → 庫存 → 銷貨 → 應收完整鏈）
20. **BCG matrix 商品分類**（明星 / 金牛 / 問題 / 狗）
21. **戰略指標**（AR 命中率 / 動態交接效率 / 業界改革指標）

⭐ **共 21 dashboard 候選**（7 角色 × 3 dashboard 平均）。

### 3.2 業界改革候選 ⭐⭐⭐（範圍 A 重點）

#### 改革 1：AR 補貨建議命中率 dashboard
- 接合 AR 自動補貨 closure
- 顯示：建議單 → 採購單 → 入庫 鏈完整命中率
- 業界中小 ERP 0、NEXORA 第一個

#### 改革 2：DnHandover 動態交接統計
- 接合 NX06-IMPL-02 動態交接 closure
- 顯示：交接次數 / 節省時間 / 跨外務員協作效率
- **業界第一個動態交接統計 dashboard**

#### 改革 3：BCG matrix + HPA trend
- 商品分類自動標記（明星 / 金牛 / 問題 / 狗）
- 業界 schema 多有、行為少落地
- 對齊 audit 揭露 Nx08DailyReport 既有 hpaTrend 欄

---

## §4 Cache 表處置（Crown Q1=c 保留）

對齊 Crown 拍板：
- ✅ Nx08*Cache 6 表 schema 保留
- ❌ 本軌不啟動 writer / ETL
- 🔵 後續軌（封測二階評估後啟動）

### 4.1 既有 6 Cache 表
- Nx08PurchaseCache（採購快取）
- Nx08InventoryCache（庫存快取）
- Nx08SalesCache（銷貨快取）
- Nx08ApCache（應付快取）
- Nx08ArCache（應收快取）
- Nx08DeliveryCache（配送快取）

### 4.2 本軌策略：即時 SQL 聚合

對齊 audit § 4 揭露既有 monthly 即時 SQL 聚合範式：
- dashboard 走即時 SQL 聚合（不依賴 Cache）
- 規模升級後（NX08-IMPL-02）再啟動 Cache ETL
- 對齊 NX05 / NX06 「保守落地」範式

---

## §5 ETL 排程機制（Crown Q4=b 外部 cron）

對齊 NX05 ArStatement 範式 + Crown 拍板：

### 5.1 範式：純 HTTP endpoint
- Hank 不註冊 @nestjs/schedule cron decorator
- 提供 POST /nx08/etl/run-* endpoint
- 外部 cron / k8s CronJob 觸發
- **production 0 自動執行風險**

### 5.2 ETL endpoint 候選
- POST /nx08/etl/run-daily-report（每日報表）
- POST /nx08/etl/run-monthly-summary（每月匯總）
- POST /nx08/etl/refresh-cache（封測二階啟動）

---

## §6 UI 落地策略（Crown Q3=a 純 stub）

對齊 NX02~NX06 範式：

### 6.1 範圍 A 範圍
- 21 placeholder UI（7 角色 dashboard 入口）
- API hint（指向對應 endpoint）
- menu.nx08.ts 建立
- side-menu wire

### 6.2 範圍不涵蓋（後續軌 TASK-NX08-IMPL-UI-01）
- 真實 chart（Recharts / Chart.js 整合）
- 互動式 dashboard
- 自訂報表設計器

---

## §7 客戶端 extranet（Crown Q5=b 後續軌）

對齊 NX06-IMPL-02 Q3 「不做客戶推播」精神：
- ❌ 本軌不做（客戶不登入 NEXORA）
- 🔵 範圍 B 戰略軌（封測二階評估）

候選：
- 客戶看自己應收帳款 / 月結對帳單
- 客戶看自己配送進度
- 客戶看自己採購歷史

---

## §8 跨模組接點

### 8.1 上游接點（業務閉環第一階段資料源）

| 上游 | 提供 | NX08 用途 |
|---|---|---|
| NX02 採購 | Po / Rfq / Rr / Pr | 採購 dashboard |
| NX03 庫存 | stock_balance / stock_ledger | 庫存 dashboard |
| NX04 銷貨 | So / Sr / Quote | 業績 dashboard |
| NX05 財務 | AP / AR / Allowance / Closing | 財務 dashboard |
| NX06 物流 | Dn / DnItem / DnHandover | 配送 dashboard ⭐ |
| AR 補貨 | Demand / BrandAllocationRule | AR 命中率 ⭐ |
| NX01 主檔 | Partner / Part / User | 維度資料 |

### 8.2 對齊 audit § 1 揭露
- 8 reverse FK 全 NX01 主檔層 ✓
- **0 業務模組接點** ⚠️（NX02/04/05/06/AR 全無 reverse FK）
- 本軌補：6 業務模組 reverse FK 加入（schema migration）

---

## §9 範圍 closure 定義

### 9.1 範圍 A 涵蓋

| # | 功能 | 範圍 A |
|---|---|---|
| 1 | 7 角色 21 dashboard 入口 | ✅ UI stub |
| 2 | 即時 SQL 聚合 service（7 角色聚合 endpoint）| ✅ |
| 3 | 業界改革 dashboard（AR 命中率 / 動態交接 / BCG matrix）⭐ | ✅ |
| 4 | ETL HTTP endpoint（純 trigger、外部 cron 呼叫）| ✅ |
| 5 | 6 業務模組 reverse FK 補入 NX08*Cache schema | ✅ |
| 6 | menu.nx08.ts + side-menu wire | ✅ |
| 7 | 治理檔補完（summary / worklog / merge-verify）| ✅ |

### 9.2 範圍 closure 標準

- 21 dashboard placeholder 落地（純 stub + API hint）
- 7 個 dashboard 聚合 service + endpoint
- 3 業界改革 dashboard 完整 schema + service
- ETL HTTP endpoint 範式（外部 cron）
- Cache 表 schema 保留 + 6 業務模組 reverse FK 補
- 治理檔對齊 NX02~NX06 範式

### 9.3 範圍 A 不涵蓋（後續軌）

- 真實 chart UI（TASK-NX08-IMPL-UI-01）
- Cache writer / ETL real run（TASK-NX08-IMPL-02-CACHE）
- 客戶端 extranet（範圍 B 戰略軌）
- 自訂報表設計器（PRO 級候選）
- AI 預測分析（戰略 C 軌）

---

## §10 範圍 B 戰略軌（NX08 上線後啟動）

### 10.1 後續候選

- 客戶端 extranet（客戶 portal）
- 真實 chart UI（Recharts / Chart.js）
- Cache writer / ETL real run（效能優化）
- 自訂報表設計器
- AI 預測分析（銷售預測 / 庫存預測 / 客戶流失預測）

---

## §11 後續軌 backlog

### 11.1 NX08 既有殘留處理

- features/nx08/ 0 子模組（建立）
- menu.nx08.ts 0 檔（建立）
- side-menu wire（補）
- dashboard 1 placeholder → 21 placeholder

### 11.2 範圍 A 完成後預備

- TASK-NX08-IMPL-UI-01（UI 真實 chart 獨立軌）
- TASK-NX08-IMPL-02-CACHE（Cache writer / ETL 啟動）
- TASK-NX08-IMPL-02-TEST（測試獨立軌、補 0 spec）

---

## §12 文件變更歷史

| 版本 | 日期 | 變更摘要 |
|---|---|---|
| v0.1.0 | 2026-05-18 | 首版、整合 Crown 5 戰略題拍板 + NX08-AUDIT-01 |

---

> **本文件純業務需求層、不含 schema / API / 程式碼細節**
> Hank IMPL-01 階段對齊本文件、技術細節 Hank 自決
> Q-RHYTHM-2 全軌連跑套用、預估 12~15 commit
