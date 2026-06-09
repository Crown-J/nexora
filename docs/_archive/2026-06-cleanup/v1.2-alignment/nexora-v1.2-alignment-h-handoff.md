<!-- docs/_team/nexora-v1.2-alignment-h-handoff.md -->

# NEXORA LITE v1.2 對齊軌 階段 H closure handoff

> 撰寫者：Hank（Claude Code）
> 撰寫時間：2026-06-01
> 對應分支：`feature/v1.2-alignment-h`
> 對應 tag：`v2.0.7-alignment-h-complete`
> 前棒：`docs/_team/nexora-v1.2-alignment-f-handoff.md`
> 規格：v1.2 §10 報表（總經理 4 項拍板：報表優先於手機 / 電腦+手機一次到位 / 只做損益不做資產負債現金流 / 業績含銷貨額+毛利）

---

## §1. 本軌範圍 — P0~P6 全做

| 子任務 | 範圍 | 狀態 |
|--------|------|------|
| P0 | NX08 盤點 + 意圖書 v1.0 落檔（Alex Q1~Q7 拍板）| ✅ |
| P1 | 後端新增 `GET /nx08/dashboard/finance/pnl`（進銷淨額簡化法）| ✅ |
| P2 | recharts 2.15.0 安裝 + 共用元件（PeriodPicker / KpiCard / ChartWrapper）| ✅ |
| P3a | 個人月報（業績 + 開單 + 工作量）| ✅ |
| P3b | 進貨報表（PO狀態 + 供應商 Top 10 + 比價）| ✅ |
| P3c | 銷售報表（產品 / 客戶 / 員工 角度切換）| ✅ |
| P3d | 庫存報表（週轉 / 呆滯 / 低庫存）| ✅ |
| P3e | 損益表（進銷淨額法 + 瀑布圖 + 會計式表）| ✅ |
| P3f | 營運報表（部門 + KPI + BCG matrix、OWNER 權限）| ✅ |
| P4 | 報表手機版（ResponsiveTable 卡片化 + 圖表自動縮減）| ✅ |
| P5 | 6 報表通用 Excel 匯出（sheetjs / xlsx）| ✅ |
| P6 | closure（本檔 + tag + merge + memory）| ✅ |

## §2. 7 commits 整軌

| Commit | 範圍 |
|--------|------|
| `c80b15c` | P0 意圖書 v1.0 落檔（Alex Q1~Q7 拍板）|
| `d1c28a2` | P1 PnL endpoint（finance/pnl + 5100 排除避免重複計算）|
| `0977b4b` | P2 recharts 安裝 + 共用元件（PeriodPicker / ChartWrapper / KpiCard / CHART_COLORS）|
| `b99a395` | P3 first-batch：個人月報 + 進貨 + 銷售 3 張電腦版 |
| `a7324f4` | P3 second-batch：庫存 + 損益 + 營運 3 張電腦版 + Hub 改版 |
| `9d4c242` | P4 手機版（useIsMobile + ResponsiveTable + ChartWrapper.mobileHeight）|
| `c3c2330` | P5 Excel 匯出（useExportExcel hook + ExportButton + 6 報表全接）|

**整軌淨變動**：估算 ~2500 行新增（6 view + common + hook + 1 endpoint + 6 entry page + hub）

---

## §3. 4 項總經理拍板（NX08 核心政策）

### 3.1 報表優先於手機版

```
原方向：手機版優先（M3 階段已有「手機 dock」討論）
新方向：報表必須先做（總經理拍板）、但「報表含手機版、一次到位」
```

→ 反映於本軌：6 張報表全部桌面 + 手機適配同步交付（不分軌）。

### 3.2 只做損益、不做資產負債/現金流

```
原方向（規格 §10）：完整三大報表（PnL + Balance Sheet + Cash Flow）
新方向：只做損益（PnL）、且用「進銷淨額簡化法」
```

→ 反映於本軌：
- P1 只新加 finance/pnl 一支 endpoint
- 不動 NX05 既有 cash-flow endpoint
- 不新加資產負債相關 service / schema

### 3.3 業績 = 銷貨額 + 毛利（不是擇一）

```
原方向：個人月報「業績」一個數字
新方向：業績要含兩個數字 — 銷貨額（總額）+ 毛利（淨值）
```

→ 反映於 PersonalMonthlyReport：4 KPI 並列（銷貨額 / 毛利 / 毛利率 / 銷貨成本）。

### 3.4 PnL 進銷淨額簡化法（不做精算式 COGS）

```
原方向：銷貨成本 = lineItem 移動平均成本快照 × qty
簡化法：銷貨成本 = SUM(RR.amount) - SUM(PR.amount)（進貨 - 進退）
        = 「期間內買進的」、不對應「期間內賣出的」
        → 月關帳期間平均下、誤差可接受
```

→ 反映於 finance-dashboard.service.pnl：
- 收入 = SUM(SO.totalAmount) - SUM(SR.totalAmount)（銷貨 - 銷退）
- 成本 = SUM(RR.amount) - SUM(PR.amount)（進貨 - 進退）
- 毛利 = 收入 - 成本
- 費用 = SUM(Paylog WHERE payType='EX' AND accountCode.category='E')
- 排除 5100 銷貨成本（避免重複計算）
- 淨利 = 毛利 - 費用

⚠️ **個人月報的銷貨成本仍用 `part.cost × qty` 簡化**（不是 lineItem cost snapshot）— 移動平均算法列後續軌。

---

## §4. Alex Q1~Q7 拍板

| Q | 題目 | 拍板 |
|---|------|------|
| Q1 | NX08 既有 endpoint 用 vs 新做 | **c: 既有齊全直接用** |
| Q2 | PnL 是否新加 endpoint | **a: 新加 finance/pnl 一支** |
| Q3 | 期間選擇器範式 | **a: 浮動抽屜（後改 inline PeriodPicker、視覺更輕）** |
| Q4 | 圖表庫 | **a: recharts**（與 demo/home 一致、暗色主題） |
| Q5 | 個人月報前端 SUM vs 後端 SUM | **b: 後端直接 SUM 單次返回**（避免 4 calls） |
| Q6 | 是否補 seed | **既有齊全、不補** |
| Q7 | 匯出格式 | **a: sheetjs xlsx** |

---

## §5. 6 張報表交付清單

### 5.1 個人月報（/dashboard/report/personal）

- 員工下拉（負責人視角、預設「我」）
- 期間：日 / 月（PeriodPicker modes=['day', 'month']）
- 業績 4 KPI：銷貨額 / 毛利 / 毛利率（依% tone）/ 銷貨成本
- 開單 3 卡：SO / QT / PO
- 工作量 3 卡：撿貨件數（Nx03Pk）/ 出貨件數（Nx06Dn）/ 跑客戶家數（DnStop distinct partnerId）

後端：`GET /nx08/dashboard/sales-rep/personal-monthly-report?periodStart=&periodEnd=&userId=`

### 5.2 進貨報表（/dashboard/report/purchase）

- PO 狀態統計（BarChart 縱向）
- 供應商排行（橫向 BarChart Top 10 + 表格）
- 比價分析（料號 × 供應商數 / min/max/avg）

後端：既有 `purchasing/po-stats` + `purchasing/supplier-grade` + `purchasing/price-compare`

### 5.3 銷售報表（/dashboard/report/sales）

- 角度切換：產品 / 客戶 / 員工
- 產品：Top 10 橫向 BarChart + 表格
- 客戶：VIP 排行 BarChart + 流失預警紅卡（90 天無下單）
- 員工：3 KPI（人數/總計/平均）+ 排行 BarChart

後端：既有 `sales-rep/product-sales` + `sales-rep/customer-insight` + `owner/sales-ranking`

### 5.4 庫存報表（/dashboard/report/inventory）

- 摘要 3 卡（週轉品項 / 呆滯品項 / 低庫存警報）
- Tab 切換：週轉 / 呆滯品 / 低庫存警報
- 低庫存頁含「⚠️ 共 N 項低於安全庫存」紅條 + 缺料量 = max(安全庫存 − 現有, 0)

後端：既有 `warehouse-staff/turnover` + `warehouse-staff/dormant` + `warehouse-staff/low-stock-alert`

### 5.5 損益表（/dashboard/report/pnl）

- 期間選擇（5 mode：日/月/季/年/自訂）
- 4 KPI：銷貨淨額 / 毛利 / 營業費用 / 營業淨利
- 損益結構瀑布 BarChart（收入 → 銷退 → 成本 → 毛利 → 費用 → 淨利）
- 會計式表格（嵌套 ± 行、毛利/淨利強調色）
- 費用明細表（按 5xxx 科目、5100 排除）

後端：**P1 新增** `GET /nx08/dashboard/finance/pnl?periodStart=&periodEnd=`

### 5.6 營運報表（/dashboard/report/ops、需 OWNER）

- 403/401 → Lock icon 權限不足提示卡
- 全公司 4 KPI（部門數 / 業績合計 / KPI 平均達成 / 商品定位數）
- 部門業績排行（橫向 BarChart）
- 員工 KPI 達成率表格（≥100 綠 / ≥80 琥珀 / <80 紅 三色 badge）
- BCG matrix ScatterChart（市佔 × 成長率、4 色 Cell）+ 4 象限分組統計

後端：既有 `owner/dept-perf` + `owner/kpi-gap` + `strategy/bcg-matrix`

---

## §6. 共用元件 / hook 範式

### 6.1 features/nx08/ui/common.tsx

- 從 NX05 common re-export：PageHeader / StatCard / DataTable / StatusBadge / fmt*
- 新加：
  - `PeriodPicker`（5 mode：日/月/季/年/自訂、可指定 modes prop 限縮）
  - `KpiCard`（精簡 StatCard、含 delta ▲▼ 預留）
  - `ChartWrapper`（recharts 容器、暗色、新加 mobileHeight 預設 height × 0.7）
  - `CHART_COLORS`（8 色 series + primary/success/danger/muted/grid/axis/tooltipBg）
  - `chartTooltipStyle`（recharts Tooltip 暗色共用）
  - **P4**：`useIsMobile(breakpoint=640)`、`ResponsiveTable<T>`（asTitle / hideOnMobile 屬性）
  - **P5**：`ExportButton`（Download icon、hover 綠）

### 6.2 features/nx08/api/index.ts

NX08 API client、6 報表所需 8 endpoint：

- `getPersonalMonthlyReport()` — **新加（P1+P3a）**
- `getSupplierGrade()` / `getPriceCompare()` / `getPoStats()` — 既有
- `getProductSales()` / `getCustomerInsight()` / `getSalesRanking()` — 既有
- `getInventoryTurnover()` / `getDormantParts()` / `getLowStockAlert()` — 既有
- `getPnL()` — **新加（P1）**
- `getDeptPerf()` / `getKpiGap()` / `getBcgMatrix()` — 既有
- `listUsersForReport()` — 沿用 NX01 user list

### 6.3 features/nx08/hooks/useExportExcel.ts（P5）

```ts
exportToExcel({
  fileName: string,         // 不含 .xlsx，自動 append _YYYYMMDD.xlsx
  sheets: Array<{ name, rows, columnOrder? }>,
  meta?: Record<string, string|number>,  // 自動產 _匯出資訊 sheet
})
```

範式：
- meta = **重現此次匯出的篩選條件**（不是報表標題）
- 數字一律 Number 型別（Excel 可直接 SUM 驗算 — 總經理需求）
- 自動欄寬（最長字串 × 1.2、min 8 max 30）
- 損益表用負數呈現銷退/成本/費用（可直接 SUM）

---

## §7. 桌面 vs 手機適配範式（P4）

| 元件 | 桌面 (≥640px) | 手機 (<640px) |
|------|--------------|--------------|
| KpiCard / StatCard grid | `sm:grid-cols-4` | `grid-cols-1` 單欄 |
| ResponsiveTable | DataTable（原樣） | 卡片清單（asTitle 當卡標題、hideOnMobile 隱藏） |
| ChartWrapper | height | mobileHeight 預設 height × 0.7 |
| PeriodPicker / Tab / 角度切換 | inline | flex-wrap 自動換行 |
| PnL 會計式表格 | text-xs | text-[11px] |

**桌面零影響**（ResponsiveTable 桌面 = DataTable）。

---

## §8. 0 schema 變動

本軌新加 1 endpoint（finance/pnl）+ 純讀取既有資料、**0 schema 變動**、**0 migration**、**Railway 不需 deploy**。

⚠️ Railway production migration 同步累計落後維持 91 支（階段 H 0 增加）。

---

## §9. 下一棒可選方向

| 方向 | 範疇 | 推估 |
|------|------|------|
| **v1.2 階段 G 設定精靈內容** | 階段 D framework 已就緒、需各模組補真實引導內容 | 中 |
| **v1.2 §11 NX06 物流模組** | 出貨單 / 路線 / 司機 dashboard / 簽收 | 大 |
| **v1.2 §12 NX07 工務模組** | 派工單 / 工時 / 維保 / SLA | 大 |
| **NX08 報表 v2 — 移動平均 COGS** | 個人月報銷貨成本用 lineItem cost snapshot | 小 |
| **NX08 報表 v2 — Excel 圖表** | 匯出時把圖表也嵌入 xlsx（xlsx-style-plus）| 小 |
| **手機 dock 範式（blueprint §10.2~§10.5）** | 5 工作站 dock + 浮動功能鍵抽屜 | 中 |
| **TASK-RAILWAY-ENV-SPLIT** | dev/prod env 分離 + 91 支 migration 上 Railway | 大、第一客戶簽約前必做 |

---

## §10. 三大提醒（給下一棒 Hank）

1. **`.env` 維持 localhost**：階段 H 0 schema 變動、Railway 不需碰。下次有 schema 變動仍需總經理拍板。
2. **報表 PnL 用簡化法**：未來個人月報如要改「精算 COGS」、需動 Nx04SoItem 加 costSnapshot 欄、`moving_avg` 算法在 PR/RR 落帳時凍結。
3. **手機 dock 範式未做**：本軌只做 6 報表的手機適配、blueprint §10.2~§10.5 全套手機 shell（dock + 浮動功能鍵）尚未啟動。

---

## §11. 階段 H closure 驗收

- ✅ 7 commits 全 push
- ✅ build pass（nx-api + nx-ui）
- ✅ 0 schema 變動
- ✅ 6 報表桌面 + 手機 + 匯出 三模式全交付
- ✅ 對齊總經理 4 項拍板
- ✅ 對齊 Alex Q1~Q7 決策

**handoff 結束、下一棒可挑 §9 任一方向。**
