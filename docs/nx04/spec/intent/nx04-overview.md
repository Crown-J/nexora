<!-- docs/nx04/spec/intent/nx04-overview.md -->

# NX04 銷貨管理 — 業務需求 Overview（v0.1.0）

> 性質：業務需求文件（給 Hank impl 對齊用、純需求層、不含 schema / API / 程式碼）
> 撰寫者：Alex（NEXORA 專案 PM AI）
> 拍板者：Crown（NEXORA 創辦人）
> 日期：2026-05-17
> 對應拍板：Crown 跨 5 輪需求討論共 18 題拍板 closure（2026-05-17）
> 依賴揭露：NX04-AUDIT-01 完成（schema 真相 verify ✓）
> 範圍：NEXORA NX04 銷貨管理模組、亞羅企業（Arco）量身打造
> 戰略定位：NEXORA 業務模組第四軌（接 NX02 採購、業務鏈完整化）
> Hank impl 對齊：依本文件業務需求層做、schema / service / UI 拓樸排序自決

---

## §0 文件性質

本文件為 NX04 銷貨管理模組的**業務需求總覽**、屬 Alex 業務需求層產出、不含 schema / SQL / Prisma / API / 程式碼細節（守 PROJECT_RULES §II.1.1 邊界）。

Hank impl 對齊原則：
- 本文件業務需求層 = 真相、所有衝突以本文件為準
- 拓樸決策 / migration 計畫先給 Alex review
- 遇 schema / 業務語意衝突 → 停下回報

---

## §1 NX04 業務本質

### 1.1 NX04 是什麼

**NX04 銷貨管理 = 亞羅銷售部門的工作台**。

業務本質回答 4 個核心問題：

1. **客戶要什麼？**（庫存查詢 → 報價單 / 直接銷貨）
2. **沒貨怎麼辦？**（同行調貨找料 / 客訂預約等補）
3. **怎麼出貨？**（撿包 SOP → 配送 / 自取 / 寄貨）
4. **退貨怎麼處理？**（退錢 / 折讓 / 換新品 三種並存）

### 1.2 NX04 在 NEXORA 全棧的角色

```
上游：客戶詢價（電話 / line / 業務員開單）
   ↓
NX04 銷貨完整鏈：
   庫存查詢 → 報價單 / 直接 SO → 銷貨單 → 撿包出貨 → 應收
        ↓ 沒貨補貨路徑
        同行調貨（NX02 詢價詢價 → 調貨單）
        客訂預約（CO 等補貨）
        自倉調撥（NX03 ST）
        ↓
下游：NX03 庫存（出庫 source=S）
      NX05 應收帳款（ArLedger）
      NX06 物流（配送送貨單）
```

**核心定位**：NEXORA 業務鏈起點、跨模組接點最多（10 條 reverse FK、audit-01 揭露）。

### 1.3 NEXORA 戰略意義

⭐⭐ NX04 落地 5 個業界改革候選：
1. **報價非必要**（可從 Quote 來、也可直接建 SO、對齊業界彈性）
2. **客戶預設據點 + 自動調撥**（沒貨自動最近倉調撥）
3. **配送中部分鎖單**（量/地址鎖、備註彈性）
4. **客訂預估價**（歷史成本 × 客戶等級毛利、業務員不用憑經驗）
5. **逾期自動轉現金**（15 天閾值用戶可調、業界半月 standard）

---

## §2 主使用者與權限

### 2.1 主使用者 = SALES 銷售部門

對齊亞羅 6 部門組織架構：

| 部門 | NEXORA 角色 | 跟 NX04 關係 |
|---|---|---|
| 銷售部門 | **SALES** | **NX04 主寫入者、所有業務動作執行** |
| 倉管部門 | WAREHOUSE | SR 銷退收貨執行、撿包 SOP 對齊 NX03 |
| 產品部門 | PURCHASING | 客訂單成本估算協助、跨部門 |
| 財務部門 | FINANCE | NX05 應收帳款入帳、收款執行 |
| 管理部門 | OWNER | 跨角色 read、業績審視、簽核流程（PLUS+）|

⭐ **同行調貨業務歸 NX04**（NX02-IMPL-01 Phase 5 commit 5b 已落地 SALES role）：
- Nx02 Qt / Ti schema 雖在 NX02、業務操作者是 SALES
- 銷售業務員透過 NX02 QT / TI endpoint 找同行調料

### 2.2 權限機制 = 彈性 role_view

對齊 NX02/NX03 範式：
- 預設 SALES 操作
- 用 role_view 彈性權限
- 不設「業務員 / 銷售組長」雙層角色
- 業績權限走 role_view（看自己 vs 看部門）

---

## §3 業務功能架構

### 3.1 銷售完整 SOP（Crown Q6 揭露核心流程）

```
客戶接觸（電話 / line / 業務員開單）
   ↓
庫存查詢
   ├─ 有庫存
   │   ↓
   │   報價單（Quote）→ 客戶接受 → 銷貨單（SO）
   │   ⚠️ 報價非必要：可直接建 SO（昨天剛報過、不用再走 Quote）
   │
   └─ 沒庫存 → 客戶要幫找貨？
              ├─ 同行調貨 → 同行詢價（NX02 Rfq P）→ 報價 → 接受 → 調貨單（Ti）→ SO
              └─ 客訂預約 → 直接報定價（系統算：歷史成本 × 客戶等級毛利）→ SO
   ↓
SO 銷貨單
   ├─ 選據點（客戶預設據點優先、無庫存自動最近倉調撥）⭐
   ├─ 選取貨方式（D 配送 / P 自取 / C 寄貨）
   ↓
撿包 SOP（對齊 NX03 撿貨 → 包貨 → 包裹）
   ↓
出貨流程
   ├─ 配送前：可改單（量/地址/取貨方式都能改）
   ├─ 配送中：部分鎖（量/地址鎖、備註可改）⭐
   └─ 已送達 → SO INVOICED → NX05 應收
   ↓
必要時：銷退單（SR）→ 3 種退法（退錢 / 折讓 / 換新品）
```

### 3.2 9 大業務功能（範圍 A）

對齊 audit § 6.1 已落地 + Crown 拍板新增：

| # | 功能 | audit 狀態 | 範圍 A |
|---|---|---|---|
| 1 | 報價單（Quote 含等級定價 + 最低售價警示）| ✅ schema + service | ✅ |
| 2 | 銷貨單（SO 6 階流 + 雙段狀態）| ✅ schema + service | ✅ |
| 3 | 銷退單（SR 5 階流 + 倉管收貨）| ✅ schema + service | ✅ |
| 4 | 客訂預約（Co、translator 自動建）| ✅ schema + service | ✅ |
| 5 | 同行調貨翻譯（D3+D4、已 demo）| ✅ + 8 spec | ✅ |
| 6 | **客戶授信擋單**（Crown Q3）| 🟡 schema 已備、0 guard | ✅ 新建 |
| 7 | **銷售業績追蹤**（Crown Q4、Tier 差異化）| 🟡 schema 已備、0 service | ✅ 新建 |
| 8 | **報價簽核純記錄**（Crown Q5）| 🟡 schema status 已備、業務流 0 | ✅ 新建 |
| 9 | **銷退退款處理**（Q10 NX05 Allowance bridge）| 🟡 schema 已備、0 路徑 | ✅ 新建 |

---

## §4 客戶授信業務範式（Crown Q7 拍板）

### 4.1 4 項都做 + 系統為主手動為輔

對齊 audit § 6.2 既有 schema `creditLimit / creditStatus`：

| 機制 | 業界 muscle memory |
|---|---|
| **授信額度**（creditLimit NTD）| 超額擋單 / 預警 |
| **付款條件**（淨 30 / 月結 / 現金 / 預付）| 對齊 NX02 採購付款條件範式 |
| **黑名單**（creditStatus 標記）| 強制擋單、無法建 SO |
| **逾期應收警示**（既有單未付）| 業務員看到提示 |

### 4.2 ⭐ 預期未付自動轉現金（Crown Q3 拍板）

- **觸發條件**：既有單未付超過 **15 天**（預設、用戶可調）
- **動作**：自動將該客戶後續 SO `paymentTerm` 切成「現金銷售」
- **業界 muscle memory**：業界半月 standard、避免持續累積應收
- **參數設定**：tenant 層級系統參數（用戶可調 15 / 30 / 45 / 60 天等）

⚠️ 業務員 UI 揭露：客戶有此狀態時、SO 建單頁面顯示「此客戶已逾期、自動轉現金銷售」標記。

---

## §5 銷售業績追蹤（Crown Q8 拍板 + Tier 差異化）

對齊 versionfeaturematrix.csv 範式：

| 版本 | 業績功能 |
|---|---|
| **LITE/PLUS** | 顯示毛利、用戶手動設業績目標、純記錄 |
| **PRO** | 完整 KPI 業績管理系統 |

### 5.1 LITE/PLUS 範圍

- SO / SR 顯示毛利資訊
- 業務員可手動設業績目標（簡單 form）
- 月度業績匯總（簡單統計）

### 5.2 PRO 範圍（戰略軌、本軌不做）

- 完整 KPI 業績儀表板
- 報價低於 minPrice 業績倒扣（schema 已備 `belowMinReason`）
- 業績獎金 / 提成計算
- 主管分潤
- 業績目標 vs 實績對比

### 5.3 本軌範圍

✅ LITE/PLUS（毛利顯示 + 手動目標）
🔵 PRO（KPI 系統、列範圍 B 戰略軌）

---

## §6 報價單範式（Crown Q9 拍板）

### 6.1 純記錄、不簽核

對齊 Crown 揭露業界真相：
- 業界中小企業靠**電話 / line / email 報價**
- 系統純記錄歷史、不要求客戶系統簽核
- **多業務員同步看得到**（共享記錄）

### 6.2 報價流程設計

```
業務員建 Quote
   ↓
記錄到系統（含客戶等級定價、minPrice 警示、折扣）
   ↓
業務員口頭 / line / email 跟客戶報
   ↓
客戶接受（業務員系統標記 ACCEPTED）
   ↓
轉 SO（既有 quoteId FK）
```

### 6.3 ⭐ 報價非必要

- 可從 Quote 來 → SO
- 也可**直接建 SO**（不走 Quote、quoteId nullable）
- 對齊「昨天剛報過、今天直接建單」業界場景

---

## §7 客戶預設據點 + 自動調撥（Crown Q-NX04-A=B、新建欄）

### 7.1 業界 muscle memory

- 客戶通常有「習慣取貨據點」（如北部客戶慣用台北倉）
- SO 建單時系統自動帶入客戶預設據點
- 該據點無庫存 → **自動啟用調撥**（最近的倉庫支援）

### 7.2 schema 衝擊

需新建：
- `Nx01Partner.defaultWarehouseId` FK 欄
- 屬 NX01 升版題、本軌 Hank plan 階段需含此 migration

### 7.3 自動調撥邏輯

```
客戶 SO 建單 → 預設據點 W1
   ↓
W1 庫存查詢
   ├─ 有貨 → 直接 W1 出貨
   └─ 沒貨 → 系統算「最近倉庫」（依倉庫地址 / 自定排序）
            → 自動建 NX03 ST 調撥單
            → 調撥完成 → W1 出貨
```

---

## §8 配送中鎖單機制（Crown Q-NX04-B=B 部分鎖）

### 8.1 配送階段定義

對齊 audit § 1.5 既有 `Nx04So.status`：

| Status | 業務階段 | 鎖單規則 |
|---|---|---|
| DRAFT | 草稿 | 全可改 |
| CONFIRMED | 確認 | 全可改 |
| PICKING | 撿貨中 | 全可改 |
| **SHIPPED** | **配送中** ⭐ | **部分鎖**（量/地址鎖、備註可改）|
| INVOICED | 已開立 | 不可改、只能取消重建 |
| CANCELLED | 已取消 | — |

### 8.2 部分鎖 application guard

- 鎖：量、地址、取貨方式、客戶
- 不鎖：備註、業務員、後續配送相關標記

⚠️ 對齊 Crown 揭露「送貨員已出發、只能取消重建」精神。

---

## §9 客訂預估價（Crown Q-NX04-C=B、系統算）

### 9.1 業界 muscle memory

- 客訂單 = 客戶要的料目前缺貨、要採購商承諾預訂
- **不走詢價**（直接報定價、業務員不用憑經驗）
- 系統算：**歷史成本 × 客戶等級毛利**

### 9.2 計算公式

```
客訂預估價 = max(
   歷史採購成本均價（近 90 天 Po 平均、對齊 AR 範式）
   × (1 + 客戶等級毛利率)
   ,
   minPrice 最低售價（schema 已備）
)
```

### 9.3 客戶等級毛利

- 對齊 audit § 1.4 既有 `Nx01CustomerGrade` + Quote.customerGradeId
- 每個客戶等級有預設毛利率（VIP 10% / 一般 20% / 散客 30%）
- 業務員可手動覆寫（同 NX02 比價分析 source M/S 範式）

---

## §10 銷退退款業務範式（Crown Q10 拍板）

### 10.1 3 種並存（對齊 audit § 6.2 既有 returnType N/E）

| 退法 | 業務 | 落地路徑 |
|---|---|---|
| **退錢給客戶** | 客戶要求退款 | NX05 Allowance allowanceType='S' |
| **折讓下次採購** | 不退錢、折讓客戶帳上 | NX05 ArLedger 沖帳（同 NX02 Phase 5 範式）|
| **換新品**（returnType=E）| 不退錢、換新貨 | NX04 SR + 新 SO 連動 |

### 10.2 對齊 NX02 範式

NX02-IMPL-01 Phase 5 commit 5a 已建 `nx05-create-allowance-from-pr.ts` 範式：
- NX04 仿建 `nx05-create-allowance-from-sr.ts`（allowanceType='S'）
- 跨模組 helper、不污染 NX05 service

---

## §11 跨模組接點

### 11.1 上游接點

| 上游 | 提供 | NX04 用途 |
|---|---|---|
| NX01 partner | 客戶主檔 + 預設據點 + 授信 | Quote/SO/SR customerId |
| NX01 customer_grade | 客戶等級 + 毛利率 | Quote 等級定價、客訂預估 |
| NX01 part / part_model | 料件主檔 | Quote/SO 選料 |
| NX03 stock_balance | 即時庫存 | 庫存查詢、缺貨判斷 |
| NX02 partner_part | 廠商↔料件主檔 | 同行調貨來源（藉 NX02 Qt/Ti）|

### 11.2 下游接點

| 下游 | 接收 | NX04 觸發 |
|---|---|---|
| NX03 庫存 | source=S 出庫 / source=R 入庫 | SO POSTED / SR POSTED |
| NX03 撿包 SOP | Pk/Pl/Parcel | SO CONFIRMED 自動建 Pk |
| NX02 採購 | Rfq stub（D4 翻譯）+ Ti（D3 同行調貨）| translator 自動建 |
| NX02 客訂預約 | Co | translator 自動建 |
| NX05 應收帳款 | ArLedger / Allowance | SO INVOICED / SR POSTED |
| NX06 物流 | 送貨單（配送類型 D）| Parcel COMPLETED |

### 11.3 跨業務歸屬清單

對齊 NX02-IMPL-01 拍板：
- **同行調貨 schema** 屬 NX02、**業務操作** 屬 NX04（SALES role 已開）
- **應收入帳** 屬 NX05（NX04 通知、NX05 入帳）
- **物流配送** 屬 NX06（NX04 觸發、NX06 執行）

---

## §12 範圍 closure 定義

### 12.1 範圍 A 涵蓋（9 業務功能）

| # | 功能 | 範圍 A |
|---|---|---|
| 1 | 報價單（Quote + 等級定價 + minPrice）| ✅ |
| 2 | 銷貨單（SO + 雙段狀態 + 部分鎖）| ✅ |
| 3 | 銷退單（SR + 3 種退法）| ✅ |
| 4 | 客訂預約（Co + 預估價系統算）| ✅ |
| 5 | 同行調貨翻譯（D3+D4 已 demo）| ✅ |
| 6 | 客戶授信擋單（含逾期 15 天自動轉現金）| ✅ |
| 7 | 銷售業績追蹤（LITE/PLUS 毛利顯示）| ✅ |
| 8 | 報價簽核純記錄（多業務員共享）| ✅ |
| 9 | 銷退退款（NX05 Allowance bridge）| ✅ |

### 12.2 範圍 A closure 標準

- 9 業務功能 schema + service + endpoint 全落地
- 銷售完整 SOP（庫存查詢 → 報價/詢價 → SO → 撿包出貨）接通
- 跨模組接點 NX03 / NX02 / NX05 / NX06 service 層全接通
- 客戶預設據點 + 自動調撥邏輯落地
- 配送中部分鎖 application guard 完整
- 客訂預估價算法落地（歷史成本 × 客戶等級毛利）
- 逾期 15 天自動轉現金（用戶可調參數）

### 12.3 範圍 A 不涵蓋

- PRO 完整 KPI 業績管理系統 → **範圍 B 戰略軌**
- 報價低於 minPrice 業績倒扣 → 範圍 B
- 業績獎金 / 提成計算 → 範圍 B 或 NX08 報表延伸
- 客戶分級補貨策略（VIP 庫存優先）→ 後續軌
- 銷售前後場景管理（業務員手機現場開單）→ PRO 候選

---

## §13 範圍 B 戰略軌（NX04 上線後啟動）

### 13.1 PRO 完整 KPI 業績管理

- 業績儀表板（個人 / 部門 / 公司）
- 報價低於 minPrice 業績倒扣
- 業績獎金 / 提成計算（業務員 + 主管分潤）
- 業績目標 vs 實績對比
- 客戶 / 商品 / 業務員多維度業績分析

→ 屬獨立戰略軌、規模類似 AR B 軌（10~15 commit）。

---

## §14 後續軌 backlog

### 14.1 範圍 B 完成後候選

- 客戶分級補貨策略（VIP / A / B / C 庫存優先）
- 銷售前後場景管理（PRO 業務員手機現場）
- 客戶定期報表 / 對帳單（月結客戶）
- 退換貨換新（returnType N/E 完整化）

### 14.2 NX04 既有殘留處理（audit-01 揭露）

- features/sale + features/sales + features/nx03/sales 3 namespace 清理
- menu.nx04.ts 嚴重 drift 修正（內容是 NX05 財務、href 指 /dashboard/nx05/*）
- Nx04SoItem.itemStatus @deprecated 清理
- Nx04So.sourceType @deprecated 清理

### 14.3 範圍 A 完成後預備

- TASK-NX04-IMPL-UI-01（UI 獨立軌）
- TASK-NX04-IMPL-02-TEST（測試獨立軌、補 Quote/SO/SR/Co 4 業務 0 spec）

---

## §15 文件變更歷史

| 版本 | 日期 | 變更摘要 |
|---|---|---|
| v0.1.0 | 2026-05-17 | 首版、整合 Crown 5 輪 18 題拍板 + NX04-AUDIT-01 揭露 |

---

> **本文件純業務需求層、不含 schema / API / 程式碼細節**
> Hank 後續 impl 階段對齊本文件業務需求、schema / service / UI 拓樸排序自決
> 任何 schema / API 設計衝突、以本文件業務需求為真相
