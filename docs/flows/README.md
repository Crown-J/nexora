# NEXORA GRID — 流程開發計畫書總覽

> 資料夾路徑：`nexora/docs/flows/`
> 維護人：Alex（PM AI）
> 最後更新：2026-04-13
> ⚠️ 本資料夾於 2026-04-13 全面重建，舊版文件已清除

---

## 一、文件用途

本資料夾存放 NEXORA 每個主流程的**開發計畫書**，供工程師 Hank 依序執行開發任務。

每份計畫書包含：
- 前端畫面規格（Mock Data）
- 模組化優化清單與產出規範
- Schema 確認清單
- Seed 資料規格
- 後端 API 清單
- 前後端串接對照
- 測試清單（供 Crown 驗收截圖）

---

## 二、開發鐵律

### 順序不可跳步

```
Phase 1 前端畫面（Mock Data）
  ↓
Phase 2 前端模組化優化（必須先做完才能進下一個計畫書）
  ↓
Phase 3 Schema 確認
  ↓
Phase 4 Seed 資料（預設資料 + 測試資料）
  ↓
Phase 5 後端 API
  ↓
Phase 6 前後端串接
  ↓
Phase 7 測試清單（Crown 驗收）
```

### 核心原則

- **不求快，求穩、求好、求可維護**
- Phase 1 全部使用 Mock Data，不等後端
- Phase 2 模組化必須在進入下一份計畫書前完成，並產出 MODULE.md 說明文件
- Schema 設計優先，後端 API 不可先於 Schema 確認
- 每個 Phase 完成後，Hank 須在計畫書底部填寫**完成記錄**

---

## 三、命名規則

### 計畫書檔名

```
PLAN_[流程代碼]_[中文流程名稱].md
```

範例：
```
PLAN_SYS_DASHBOARD_首頁儀表板.md
PLAN_SYS_LAYOUT_共用版型.md
PLAN_P-W01_國內採購主流程.md
PLAN_P-W02_國外採購主流程.md
PLAN_S-W01_國內銷售主流程.md
PLAN_I-W01_進貨主流程.md
```

### 模組說明文件檔名（Phase 2 產出）

```
MODULE_[模組名稱].md
```

存放於：`nexora/docs/modules/`

範例：
```
MODULE_SHARED_UI.md       ← 共用 UI 元件
MODULE_SHARED_HOOKS.md    ← 共用 Hook / Util
MODULE_NX02_UI.md         ← NX02 採購模組專屬元件
```

---

## 四、計畫書文件索引

### 系統基礎

| 狀態 | 檔案 | 說明 |
|------|------|------|
| 🚧 Phase 1 | [PLAN_SYS_DASHBOARD_首頁儀表板.md](./PLAN_SYS_DASHBOARD_首頁儀表板.md) | 首頁儀表板（三版本版型 / EXP BAR）|
| ⏳ 待開始 | PLAN_SYS_LAYOUT_共用版型.md | 共用版型規則（6種版型 / 快捷鍵 / 顏色）|
| ⏳ 待開始 | PLAN_SYS-W04_引導設定流程.md | 新租戶 Onboarding 引導 |

### NX02 採購管理

| 狀態 | 檔案 | 說明 |
|------|------|------|
| ⏳ 待開始 | PLAN_P-W01_國內採購主流程.md | RFQ → PO → RR |
| ⏳ 待開始 | PLAN_P-W02_國外採購主流程.md | 國外詢價 → 進口採購 |
| ⏳ 待開始 | PLAN_P-W03_退供應商流程.md | 退貨申請 → 出貨 |
| ⏳ 待開始 | PLAN_P-W04_特殊採購流程.md | 掃貨 / 機會採購 |
| ⏳ 待開始 | PLAN_P-W05_產品定價作業.md | 定價規則 / 成本異動警示 |
| ⏳ 待開始 | PLAN_P-W06_安全量最高量設定.md | 跨倉管採購設定流程 |
| ⏳ 待開始 | PLAN_P-W07_廠商管理作業.md | 廠商新增 / 季度評鑑 |
| ⏳ 待開始 | PLAN_P-W08_向供應商申請保固.md | 保固申請三端流程 |
| ⏳ 待開始 | PLAN_P-W09_新品牌產品線開發.md | 六階段新品開發 |

### NX03 庫存管理

| 狀態 | 檔案 | 說明 |
|------|------|------|
| ⏳ 待開始 | PLAN_I-W01_進貨主流程.md | 入庫 / 驗收 / 上架 |
| ⏳ 待開始 | PLAN_I-W02_出貨主流程.md | 撿貨 / 包貨 / 出庫 |
| ⏳ 待開始 | PLAN_I-W03_盤點作業.md | 定期盤點流程 |
| ⏳ 待開始 | PLAN_I-W04_庫位管理作業.md | 庫位設定 / 坪效建議 |

### NX04 銷售管理

| 狀態 | 檔案 | 說明 |
|------|------|------|
| ⏳ 待開始 | PLAN_S-W01_國內銷售主流程.md | 報價 → 銷貨 → 出貨 |
| ⏳ 待開始 | PLAN_S-W02_國外銷售主流程.md | 國外報價 / 出口流程 |
| ⏳ 待開始 | PLAN_S-W03_銷退流程.md | 銷退申請 → 入庫 |
| ⏳ 待開始 | PLAN_S-W04_客戶開發作業.md | 客戶開發 / 潛在客戶 |
| ⏳ 待開始 | PLAN_S-W05_客戶分級管理.md | 客戶等級 / 價格授權 |
| ⏳ 待開始 | PLAN_S-W06_客戶需求回饋.md | 需求登記 / 追蹤 |

### NX05 財務管理

| 狀態 | 檔案 | 說明 |
|------|------|------|
| ⏳ 待開始 | PLAN_F-W01_應收帳款催收.md | AR 催收流程 |
| ⏳ 待開始 | PLAN_F-W02_月結請款作業.md | 月結請款 / 對帳 |
| ⏳ 待開始 | PLAN_F-W03_關帳作業.md | 月底關帳 / 自動 + 手動 |
| ⏳ 待開始 | PLAN_F-W04_應付帳款作業.md | AP 管理 |
| ⏳ 待開始 | PLAN_F-W05_收付款作業.md | 收款 / 付款登記 |
| ⏳ 待開始 | PLAN_F-W06_票據管理作業.md | 票據收發 / 到期追蹤 |
| ⏳ 待開始 | PLAN_F-W07_折讓作業.md | 折讓申請 / 核准 |

### NX06 物流管理

| 狀態 | 檔案 | 說明 |
|------|------|------|
| ⏳ 待開始 | PLAN_L-W01_送貨作業.md | 送貨單 / 電子簽收 |
| ⏳ 待開始 | PLAN_L-W02_調貨取貨作業.md | 跨倉調貨物流 |
| ⏳ 待開始 | PLAN_L-W03_國際物流作業.md | 國際運輸 / 關務 |
| ⏳ 待開始 | PLAN_L-W04_退貨取件作業.md | 退貨取件流程 |

### NX07 人資管理（PRO）

| 狀態 | 檔案 | 說明 |
|------|------|------|
| ⏳ 待開始 | PLAN_H-W01_出勤打卡作業.md | 打卡 / 出勤記錄 |
| ⏳ 待開始 | PLAN_H-W02_請假加班申請.md | 請假 / 加班申請流程 |
| ⏳ 待開始 | PLAN_H-W03_薪資計算作業.md | 薪資計算 / 加密傳送 |
| ⏳ 待開始 | PLAN_H-W04_員工異動作業.md | 到職 / 調職 / 離職 |
| ⏳ 待開始 | PLAN_H-W05_績效考核作業.md | KPI 考核流程 |
| ⏳ 待開始 | PLAN_H-W06_教育訓練作業.md | 訓練計畫 / 記錄 |

### NX08 經營分析（PRO）

| 狀態 | 檔案 | 說明 |
|------|------|------|
| ⏳ 待開始 | PLAN_R-W00_個人日月報表.md | 個人日報 / 月報填寫 |
| ⏳ 待開始 | PLAN_R-W01_經營分析報表.md | 總覽 / HPA / BCG |
| ⏳ 待開始 | PLAN_R-W02_銷售分析報表.md | 銷售趨勢 / 客戶分析 |
| ⏳ 待開始 | PLAN_R-W03_採購分析報表.md | 採購趨勢 / 廠商分析 |
| ⏳ 待開始 | PLAN_R-W04_庫存產品分析.md | 庫存周轉 / ABC 分析 |
| ⏳ 待開始 | PLAN_R-W05_廠商分析報表.md | 廠商績效 |
| ⏳ 待開始 | PLAN_R-W06_財務分析報表.md | 財務健康指標 |
| ⏳ 待開始 | PLAN_R-W07_人資分析報表.md | 出勤 / 績效統計 |

### NX09 知識管理（PRO）

| 狀態 | 檔案 | 說明 |
|------|------|------|
| ⏳ 待開始 | PLAN_NX09-W01_知識管理作業.md | KM 建立 / 搜尋 |
| ⏳ 待開始 | PLAN_NX09-W02_文件庫作業.md | 文件上傳 / 版本管理 |
| ⏳ 待開始 | PLAN_NX09-W03_會議管理作業.md | 會議記錄 / 決議追蹤 |

### NX10 遊戲化系統（PRO）

| 狀態 | 檔案 | 說明 |
|------|------|------|
| ⏳ 待開始 | PLAN_NX10-W01_遊戲化任務系統.md | 任務 / EXP / 簽到 |
| ⏳ 待開始 | PLAN_NX10-W02_遊戲化轉職系統.md | 晉升 / 調部門 |

---

## 五、狀態說明

| 狀態符號 | 說明 |
|---------|------|
| ⏳ 待開始 | 計畫書尚未建立 |
| 🚧 Phase N | 進行中，標示當前 Phase |
| ✅ 已完成 | 所有 Phase 通過 Crown 驗收 |
| 🔒 封存 | 功能凍結，不再修改 |

---

## 六、Hank 完成記錄規範

每份計畫書底部必須有「**完成記錄**」區塊，每個 Phase 完成後由 Hank 填寫，**不可略過**。

### 格式規範

```markdown
---

## 完成記錄

### Phase 1｜前端畫面（Mock Data）
- **完成時間**：YYYY-MM-DD HH:MM
- **完成人**：Hank
- **本次修改摘要**：
  - 建立 TopBar.tsx，含公告 Dropdown 與使用者 Dropdown
  - 建立 ExpBar.tsx，含 MedalModal 兩個 Tab
  - 建立 DashboardPage.tsx，planCode prop 控制三版型切換
  - Mock Data 集中存放於 src/mocks/dashboard.ts
- **已知問題 / 待確認**：
  - CalendarGrid 在 Safari 有對齊偏移，待修
- **Crown 驗收結果**：⏳ 待驗收

---

### Phase 2｜前端模組化優化
- **完成時間**：YYYY-MM-DD HH:MM
- **完成人**：Hank
- **本次修改摘要**：
  - 抽離 Badge、ProgressBar、Modal、Dropdown 至 components/shared/ui/
  - 建立 useKeyboardShortcut、useRealTimeClock hooks
  - 產出 MODULE_SHARED_UI.md 與 MODULE_SHARED_HOOKS.md
- **已知問題 / 待確認**：（無）
- **Crown 驗收結果**：✅ 2026-04-15 通過
```

### 填寫規則

1. 每個 Phase 完成後**當天**填寫，不可事後補填
2. **完成時間**精確到分鐘（`YYYY-MM-DD HH:MM`）
3. **本次修改摘要**條列實際建立/修改的檔案或功能，不寫空話
4. **已知問題**如無則填「（無）」，不可留空
5. **Crown 驗收結果** 由 Crown 親自填寫：`✅ YYYY-MM-DD 通過` 或 `❌ YYYY-MM-DD 退回：[原因]`
6. 退回後 Hank 修正再次提交，Crown 填寫新的驗收結果，**舊記錄保留不刪除**

---

## 七、全域開發規範

### 程式碼規範

```
- className 合併：使用 cx（from @/shared/lib/cx），不用 clsx
- Prisma 設定：使用 prisma.config.ts，不用 schema.prisma 設定區塊
- 全局 ValidationPipe 已啟用，DTO 必須完整定義
- 所有檔案頭部加上 @FUNCTION_CODE 標記，格式：模組-功能-層級-編號-函式
  範例：// @NX03-WKFL-UI-001-F01
- Git commit 格式：[TASK-CODE] 動詞 + 說明
  範例：[PLAN-SYS-DASH-P1] add TopBar and BulletinDropdown
```

### 顏色系統（全域 CSS 變數）

```css
--color-primary:       #E8A020;               /* 橘金主色 */
--color-primary-light: #F5C842;               /* 漸層亮色 */
--color-primary-bg:    rgba(232,160,32,0.15); /* 微金底色 */
--color-success:       #1D9E75;               /* 綠色 */
--color-danger:        #E24B4A;               /* 紅色 */
--color-warning:       #E8A020;               /* 橘色警示 */
--color-meeting:       #378ADD;               /* 會議藍 */
```

### 資料表命名慣例

- 所有資料表以 `nxNN_` 為前綴（例：`nx02_rfq`、`nx03_stock_balance`）
- 外鍵在 UI 一律顯示 `CODE+NAME`，送出仍使用 `id`
- 狀態轉移必須走服務層狀態機驗證，不可任意寫值
- 寫入單據時，明細保留快照欄位（如 `part_no`、`part_name`、`unit_price_snapshot`）
- 所有單據變更需寫入稽核紀錄（Audit Log）

### 庫存異動規則

會影響庫存的流程（入庫 / 出庫 / 盤點 / 調撥）需同時更新：
- `nx03_stock_balance`（庫存台帳）
- `nx03_stock_txn`（庫存異動明細）

---

## 八、相關文件路徑

| 類型 | 路徑 |
|------|------|
| 畫面規劃文件 | `nexora/docs/ui/` |
| 流程開發計畫書 | `nexora/docs/flows/`（本資料夾）|
| 路由標準表（v2.0 語意化）| `nexora/docs/flows/ROUTE_TABLE_v2.0_路由標準表.md` |
| 模組說明文件 | `nexora/docs/modules/` |
| 截圖存放 | `nexora/docs/screenshots/[流程代碼]/` |
| 欄位定義 CSV | `nexora/docs/spec/nx0x_field_v1.csv` |
| 每日工作日誌 | `nexora/dailylog/YYYYMMDD.md` |
