<!-- docs/_team/nexora-lite-v1.2-alignment-audit.md -->

# NEXORA LITE v1.2 對齊 audit 報告

> 撰寫者：Hank（Claude Code）
> 撰寫時間：2026-05-30
> 對照軸：`docs/_team/nexora-lite-blueprint-v1.2.md`（1760 行、Alex 撰寫、總經理拍板）
> 對應 main HEAD：`9cd22dd`（docs 清檔第二輪後）
> 任務性質：純 audit、不動 code、給 Alex 對藍圖 + 總經理拍板路線用

---

## §0. 圖示說明

| 狀態 | 說明 |
|-----|------|
| 🟢 已對齊 | v1.2 描述完整實作、客戶能用 |
| 🟡 部分對齊 | 核心邏輯做了、UI / 細節 / 跨模組接點還沒齊 |
| 🔴 未做 | 完全沒做 |
| ⚠️ 衝突 | 實作跟 v1.2 不一致、要決定怎麼處理 |

| 規模 | 估時 |
|------|------|
| XS | 1-2 小時（純 UI 調整 / 文案）|
| S | 半天（1 endpoint / 1 頁面）|
| M | 1-3 天（1 模組 / 一組相關功能）|
| L | 1-2 週（跨模組大改動）|
| XL | 立項（系統級重做）|

---

## §1. v1.2 §1 租戶情境（先鋒企業 + 員工分工）

| 項目 | 狀態 | 規模 | 備註 |
|------|------|------|------|
| 「先鋒企業」測試租戶 seed | 🔴 未做 | S | 目前 seed 只有 LITE / PLUS / PRO 三個「空殼」、租戶名是 `NX99TANT9900001~3`、沒有對應「先鋒企業」業務情境的 seed |
| 員工建檔 schema + UI | 🟡 部分對齊 | XS | `Nx01User` 存在、`/dashboard/base/users` 頁面在、但 v1.2 §1.3 提的「負責人 / A B 資深 / C D 中堅 / E F 新手」是業務語意、目前 seed 是 admin × 7 全綁同角色 |
| 員工分工概念（業務 / 採購 / 倉管 / 送貨）| 🔴 未做 | M | 跟 §12 角色與權限直接相關、現實無「業務」「倉管」「送貨」角色 enum、要等 v1.2 §12 重做後才能落地 |

**§1 修補總結**：1 個小 seed + 等 §12 落地後串接。

---

## §2. v1.2 §2 開戶階段（伊諾瓦運營）

| 項目 | 狀態 | 規模 | 備註 |
|------|------|------|------|
| 伊諾瓦開戶後台路由 | 🟡 部分對齊 | M | `apps/nx-api/src/nx99/tenant/tenant.controller.ts` 有 CRUD（list / get / create / update / softDelete）、但沒對應 UI 頁面 |
| 公司資料 / 統編 / 地址 / LOGO 必填卡關 | 🔴 未做 | S | 需要 UI form + LOGO 上傳元件、後端 DTO 有部分欄位、LOGO 沒看到 |
| 負責人帳號自動建 | 🟡 部分對齊 | S | `Nx01User` schema 完整、tenant.service 是否自動建負責人未確認 |
| 主倉自動建 | 🟡 部分對齊 | S | `Nx01Warehouse` 主檔在、`is_main` 旗標 schema 在（HANDOFF d.2 揭露 service 未維護） |
| 通知 Email 機制 | 🔴 未做 | M | 沒看到 mailer / email service 整合（auth 走 JWT、沒 email 寄送）|

**§2 修補總結**：1 個後台 UI（M）+ 1 個 email 機制（M）+ 開戶流程驗證細節（S × N）。**規模 L**（1-2 週）。

---

## §3. v1.2 §3 首次登入 + 雙精靈

| 項目 | 狀態 | 規模 | 備註 |
|------|------|------|------|
| 強制改密碼（首次登入）| 🟡 部分對齊 | S | HANDOFF.md d.2 揭露「`mustChangePassword` 旗標未在 schema 證實、首次強制改密碼流程由 auth 處理」、實際 enforce 程度需驗 |
| 匯入精靈框架 | 🔴 未做 | L | grep 全 codebase 無 `ImportWizard` / `import-wizard` / `wizardStep` |
| 7 類 Excel 匯入器（員工/客戶/廠商/倉庫/產品/進貨/銷貨/票據）| 🔴 未做 | XL | `package.json` 無 `xlsx` / `exceljs` / `papaparse` / `sheetjs` 任何 Excel 套件、需立項 |
| Excel 範本下載 | 🔴 未做 | M | 同上、需建範本生成器 |
| 匯入預覽 + 驗證（格式檢查、行錯誤標示）| 🔴 未做 | L | 與匯入精靈同軌 |
| 票據雙標機制（已上報國稅局 / 未上報）| 🔴 未做 | M | schema 無 `is_uploaded` 欄位 (待確認)、需配 §8 票據管理一起做 |
| 設定精靈（每頁第一次跳引導）| 🔴 未做 | L | grep 無 `SetupWizard` / `PageGuide` / `tour` 元件 |
| 每位員工 × 每頁面記憶旗標 | 🔴 未做 | M | schema 無 `user_page_guide` 表、需新建 |
| 頁面右上「?」按鈕（重看引導）| 🔴 未做 | S | UI 元件、跟設定精靈同軌 |
| 「精靈引導」按鈕（主畫面右上重開）| 🔴 未做 | XS | 跟匯入精靈同軌 |

**§3 修補總結**：核心就是兩個精靈 + 匯入引擎、是 v1.2 §14 階段 C+D 主菜、**規模 XL**（≥ 2 週 + 立項）。

---

## §4. v1.2 §4 電腦版主導覽（5 大分類 + 主檔中心 + 設定）

| 項目 | 狀態 | 規模 | 備註 |
|------|------|------|------|
| `/dashboard/purchase` 採購中心 hub | 🟢 已對齊 | — | hub-driven、桌面 + 手機分流、master / domestic / special 分區 |
| `/dashboard/sale` 銷售中心 hub | 🟢 已對齊 | — | 同上、4 分區（狀態追蹤 / 工作站 / 單據 / 客戶）|
| `/dashboard/inventory` 庫存中心 hub | 🟢 已對齊 | — | 同上、4 分區 + InventoryHubMobile |
| `/dashboard/finance` 財務中心 hub | 🟡 部分對齊 | — | hub UI 在、3 卡片 placeholder（應收 / 應付 / 票據 等）、點進去無頁面 |
| `/dashboard/report` 報表中心 hub | 🟡 部分對齊 | — | hub UI 在、6 卡片標 `pro`、屬 PRO 占位 |
| `/dashboard/base` 主檔中心 hub | 🟢 已對齊 | — | 鋼鐵星球範式、25+ 主檔頁面 |
| 設定中心（v1.2 §12 列 5 子頁）| 🔴 未做 | L | 無 `/dashboard/settings` 路由 |
| 5 大分類 + 主檔 + 設定的「頂部 nav」範式 | ⚠️ 衝突 | L | 目前用「頂欄星球」（HomeTopBar、每個 nxXX 一顆星球）+ 左 SubNav 動態解析、不是 v1.2 §4.2「NEXORA \| 進貨 銷貨 庫存 財務 報表 \| 主檔中心 設定 \| 王經理▼」這種橫排 nav |
| 兩套並存 UI（`/purchase` vs `/nx02`、`/sale` vs `/nx04`、`/inventory` vs `/nx03`）| ⚠️ 衝突 | L | 詳見 `nx02-nx03-nx04-audit.md` §W3、v1.2 §14 階段 A 第一個就要處理 |
| 「按權限顯示分類」| 🔴 未做 | L | 目前 nav 不過濾、無權限掛勾、要等 §12 RBAC 落地 |
| 主畫面 dashboard（今日提醒 / 快速入口 / 本月概況）| 🔴 未做 | M | `/dashboard` 根頁面是 sys-dashboard、不是 v1.2 §4.3 描述的業務 dashboard |

**§4 修補總結**：路由結構大致對齊、但「兩套並存」+「nav 範式不同」+「權限過濾」+「業務 dashboard」全要做。**規模 L**（1-2 週、含 v1.2 §14 階段 A）。

---

## §5. v1.2 §5 進貨作業（6 子頁面）

| 項目 | 狀態 | 規模 | 備註 |
|------|------|------|------|
| 國內進貨工作流（詢價 → 採購 → 進貨 → 退貨）| 🟢 已對齊 | — | NX02 LITE closure、`/purchase/rfq / po / rr` 路由 + 後端 controller 齊 |
| 詢價單「產生詢價文字」+ 客套話模板 | 🟢 已對齊 | — | `nx02/rfq-greeting-template` controller + UI 在 |
| 詢價單「從採購需求單拉項目」| 🟡 部分對齊 | M | 待辦池 `nx98/task-pool` 接通、但「拉項目進詢價單」UI 流程未確認 |
| 採購單分多次採購（同詢價分批）| 🟡 部分對齊 | S | rfqType=G/P 分流已做、分批採購 schema 應支援、UI 確認 |
| 國外進貨多「提貨單」階段 | 🔴 未做 | M | `/dashboard/nx02/import` 是 placeholder、`nx03/parcel` controller 在、UI 全缺 |
| 採購需求單 3 來源聚合（銷貨缺貨 / 盤點低量 / 手動）| 🟡 部分對齊 | M | 待辦池 `nx98/task-pool` 是聚合層、盤點寫入已串通、銷貨缺貨自動寫入 / 手動新增 UI 確認 |
| ⭐ 退貨選「保固」→ 自動產保固申請單 | ⚠️ 衝突 | S | v1.2 §5.5 註明「此連線狀況需要驗證、Alex 不確定既有 NX02 已實作或需要補」、Hank 掃 `nx02/purchase-return` 未見明顯 trigger、應屬未做 |
| 保固申請單 list + 詳情 + 4 結果 | 🟢 已對齊 | — | `/dashboard/nx02/warranty-claim` UI + `nx02/warranty-claim` controller |
| 客訴型保固「sourceSoId picker」| 🔴 未做 | S | NX02 FU-04、NX04 SO 已 closure 可解鎖 |
| 供應商管理（進貨角度欄位）| 🟡 部分對齊 | S | `/purchase/vendor` UI 在、欄位專注度未確認跟 v1.2 §5.6 一樣 |
| 產品管理（進貨角度欄位）+ 改號關聯 + 通用零件 | 🟡 部分對齊 | S | `/purchase/product` UI 在、改號關聯由 `nx01/part_relation` 處理、通用零件由 `nx01/part_model` 處理 |

**§5 修補總結**：80% 對齊、缺國外提貨單 UI + 退貨→保固連線 + 細節驗收。**規模 M**。

---

## §6. v1.2 §6 銷貨作業（4 子頁面）

| 項目 | 狀態 | 規模 | 備註 |
|------|------|------|------|
| 國內銷貨工作流（報價 → 銷貨 → 銷退）| 🟢 已對齊 | — | NX04 LITE closure、`/dashboard/nx04/{quote,sales-order,sales-return}` 全做 |
| 報價單歷史價提示 | 🟢 已對齊 | — | M3 C1 落地 |
| 報價單毛利警告 + 補填理由 | 🟢 已對齊 | — | 同上 |
| 銷貨單「拉客戶舊報價」（混合舊 + 新行）| 🟢 已對齊 | — | M3 C2 落地（拉報價 panel）|
| 銷貨單每行獨立狀態（等貨 / 補貨中 / 等撿貨 / 撿包中 / 已出貨）| 🟢 已對齊 | — | M3 C2 雙段狀態 + `combinedStatusLabel` helper |
| 同行調貨警示橫條 + 建單按鈕 | 🟢 已對齊 | — | M3 C2/C3 落地 |
| 同行調貨單從 SO 觸發 | 🟢 已對齊 | — | `createTiFromSoLines` |
| 銷退單「好品 / 壞品」分流 + 過帳前必填 | 🟢 已對齊 | — | M3 C4 落地 |
| 國外銷貨「暫不開放」處理 | ⚠️ 衝突 | XS | `/dashboard/nx04/export` 目前 redirect 到 `/sales-return`（M3 C7 改的）、v1.2 §6.3 要的是「點不進去」、要把 redirect 改成「升級提示頁」 |
| 客戶等級變更 + 核可 | 🟢 已對齊 | — | M3 C5 落地、`/dashboard/nx04/partner-grade-history` + `/dashboard/owner/grade-approvals` |
| 產品回報（業務側 → 異常回報統一管理）| 🟡 部分對齊 | S | M3 C6 抽 `IssueReportTrigger` 共用元件、QT/SO/SR detail 都套了；v1.2 §6.5 提的「客戶反映異音」這類「銷貨側回報」入口 是否在客戶 detail / 產品 detail 也要有 = Alex 拍板 |
| 業務角度「客戶管理」（等級 + 信用 + 交貨方式）| 🟡 部分對齊 | S | `/dashboard/sale/customer/info` placeholder、`/dashboard/nx04/customer` 也是 placeholder、需建專屬 view 跟主檔中心欄位分離 |

**§6 修補總結**：95% 對齊（M3 closure 結果）、缺 UI 細節（國外暫不開放頁 + 客戶銷貨角度頁）。**規模 S+S+S**。

---

## §7. v1.2 §7 庫存作業（3 子頁面）

| 項目 | 狀態 | 規模 | 備註 |
|------|------|------|------|
| 盤點作業（每日 / 週 / 月 / 不定期 / 全倉 / 庫位 / 族群）| 🟢 已對齊 | — | NX03 LITE closure、`/dashboard/inventory/stocktake` 完整 |
| 盤點差異不為 0 必填原因 | 🟢 已對齊 | — | varianceReasonCode enum + UI |
| 盤點核可 + 過帳 + 寫採購需求 | 🟢 已對齊 | — | nx98 task-pool 串通 |
| 過帳後低於安全量寫採購需求 | 🟢 已對齊 | — | M2-B inline 在 stocktake.service tx |
| 庫位管理（區 / 庫位階層）| 🟢 已對齊 | — | `/dashboard/inventory/warehouse/locations` |
| 產品維護（安全量 / 最高量 / 預設庫位）| 🟢 已對齊 | — | `/dashboard/inventory/part-stock-setting` |
| 異常回報統一表 | 🟢 已對齊 | — | `Nx03IssueReport` + `/dashboard/inventory/issue-report` |
| 庫位「A 區 / B 區」邏輯分組 UI | 🟡 部分對齊 | XS | 後端 location 主檔在、UI 是否照 v1.2 §7.3 樹狀分區待確認 |

**§7 修補總結**：95% 對齊。**規模 XS**（小細節驗收）。

---

## §8. v1.2 §8 財務作業（NX05、5 子頁面）

| 項目 | 狀態 | 規模 | 備註 |
|------|------|------|------|
| 應收帳款 list + 沖銷（現金 / 銷退 / 折讓）| 🔴 未做 | M | hub 只有 placeholder 卡、後端 NX05 部分 service 在（`createArFromShippedSo` 等）、UI 全缺 |
| 應付帳款 list + 沖銷 + 保固理賠沖銷 | 🔴 未做 | M | 同上 |
| 票據管理（4 種方式：現金 / 匯款 / 支票 / 信用卡）| 🔴 未做 | M | 後端 schema 待確認、UI 全缺 |
| 票據自動沖應收 / 應付 | 🔴 未做 | M | 同上 |
| 關帳作業（月末關帳 + 401 報表 + 鎖定資料）| 🔴 未做 | L | 401 報表生成 + 月份鎖定機制全缺 |
| 帳戶管理（財務角度欄位）| 🔴 未做 | S | 跟主檔中心分區編輯同軌 |

**§8 修補總結**：整模組未做、屬 v1.2 §14 階段 F。**規模 L**（1-2 週）。

---

## §9. v1.2 §9 報表（NX08、6 子頁面）

| 項目 | 狀態 | 規模 | 備註 |
|------|------|------|------|
| 個人月報 / 日報 | 🔴 未做 | M | hub 全 placeholder + `pro` 標記 |
| 進貨 / 銷售 / 庫存 / 財務 / 營運報表 | 🔴 未做 | L | 全部 placeholder、需建 dashboard + 圖表 + Excel 匯出 |
| 銷售角度切換（產品 / 客戶 / 員工）| 🔴 未做 | M | 同上 |
| 三大財報（現金流 / 損益 / 資產負債）| 🔴 未做 | XL | 屬會計專業、要會計師確認算法 |
| 員工只看自己 / 負責人看全部 | 🔴 未做 | S | 要等 §12 RBAC 落地後串接 |
| 報表匯出 Excel | 🔴 未做 | S | 跟 §3 Excel 同套件依賴 |

**§9 修補總結**：整模組未做、屬 v1.2 §14 階段 H、要依賴 §8 財務先做（報表算 KPI 用得到 AR/AP）。**規模 L+**。

---

## §10. v1.2 §10 手機版（5 dock + 4 功能選單）

| 項目 | 狀態 | 規模 | 備註 |
|------|------|------|------|
| 下方 dock 5 工作站圖示 | 🟡 部分對齊 | S | `NexoraBottomDock` 元件存在、但 v1.2 dock 列「驗收 撿貨 包貨 配送 盤點」5 個、目前 dock 排版 / 圖示確認跟 §10.1 一致 |
| 驗收工作站（mobile）| 🔴 未做 | M | `/dashboard/inventory/receiving` 路由在、實際 mobile UI 未見 |
| 撿貨工作站 | 🟡 部分對齊 | S | `MobilePickingListPage` 在、HANDOFF FU-stock-lite-03 揭露用 mock data、未接真實 API |
| 包貨工作站 + 產生包裹編號 | 🟡 部分對齊 | M | `MobilePackingListPage` 在、包裹編號生成機制未見 |
| 配送工作站 + Google Map 路線規劃 | 🟡 部分對齊 | L | `MobileDeliveryListPage` 在、`nx06/route-optimization / lalamove-integration` controller 在、Google Map 整合需確認 |
| 盤點工作站（手機掃條碼）| 🟡 部分對齊 | M | 桌面 stocktake 已完成、手機掃條碼模式未確認 |
| 浮動功能鍵 ⊕（抽屜彈出 4 大分類）| 🔴 未做 | S | grep 無 FloatingActionButton 元件、`NexoraBottomDock` 不是 v1.2 §10.4 那種抽屜 |
| 抽屜按權限過濾項目 | 🔴 未做 | S | 等 §12 RBAC 落地後串 |
| 手機版無「財務」項目 | 🟢 已對齊 | — | 目前手機本來就沒財務（財務沒做）|

**§10 修補總結**：dock UI 在、5 工作站要接真實 API、浮動鍵 + 路線規劃 + 條碼掃描全要做。**規模 L**。

---

## §11. v1.2 §11 主檔中心（8 大主檔 + 匯入 + 分區編輯）

| 項目 | 狀態 | 規模 | 備註 |
|------|------|------|------|
| `/dashboard/base` 主檔中心 hub | 🟢 已對齊 | — | 鋼鐵星球範式、25+ 主檔頁面 |
| 8 大主檔（客戶 / 供應商 / 同行 / 銀行 / 廠商 / 產品 / 倉庫庫位 / 員工）| 🟢 已對齊 | — | 客戶/供應商/同行/銀行/廠商走 `partners`（六分類 C/O/S/T/B/V）+ 產品 `parts` + 倉庫 `warehouses` + 員工 `users` |
| 每主檔「新增 / 匯入 / 匯出」| 🔴 未做 | L | 匯入需 Excel 套件（§3 提）、目前 UI 看到 parts 頁「匯出」按鈕但顯示「尚未開放」（HANDOFF d.4 揭露）、匯入完全沒做 |
| Excel 範本下載 + 上傳預覽 | 🔴 未做 | L | 跟 §3 匯入精靈同軌 |
| ⭐ 主檔分區編輯範式 | 🔴 未做 | L | v1.2 §11 + §6.4 + §8.6 描述「同份客戶在主檔中心看完整 4 區、在銷貨看銷貨欄位、在財務看財務欄位、各自不互相覆蓋」、目前實作不是這樣（`/sale/customer/info` 是 placeholder、無分區編輯範式）|
| 員工主檔角色關聯（綁角色）| 🟡 部分對齊 | S | `Nx01UserRole` + `/dashboard/base/user-role` 頁面在、改完 v1.2 §12 後角色定義會大改、屆時要同步調 UI |

**§11 修補總結**：hub 在、8 主檔在、但匯入 + 分區編輯範式全沒做。**規模 L**（屬 v1.2 §14 階段 E）。

---

## §12. v1.2 §12 設定（5 子頁面）

| 項目 | 狀態 | 規模 | 備註 |
|------|------|------|------|
| `/dashboard/settings` 設定中心 | 🔴 未做 | S | 完全沒有設定中心路由 |
| 公司資料編輯（含 LOGO）| 🔴 未做 | S | 跟 §2 開戶後台同檔資料、編輯介面缺 |
| ⭐ 角色與權限管理頁面 | ⚠️ 衝突 | XL | `/dashboard/base/role-view` 有 `RoleViewMatrix` 元件 + `nx01/role-view` controller、但範式是「畫面 × 權限矩陣」、不是 v1.2 §12.2「負責人從零建角色 + 自由命名 + 勾權限」。需要全面重做 RBAC、屬 v1.2 §14 階段 B ⭐ 核心 |
| 系統提供權限項目清單 | 🔴 未做 | L | 目前 controller 寫死 `@Roles('SYSADMIN','OWNER',...)`、要抽出 enum 給 UI 顯示給負責人勾 |
| 「複製角色」功能 | 🔴 未做 | S | 等 RBAC 重做後落地 |
| 「停用角色」級聯失效 | 🔴 未做 | S | 同上 |
| 系統參數（毛利率 ABCD / 客套話 / 起算日）| 🔴 未做 | M | 目前毛利率寫在 master-cards.ts seed、客套話有 `rfq-greeting-template`、起算日 `data_start_date` 完全沒做 |
| 帳號管理（停用 / 重設密碼 / 負責人保底）| 🟡 部分對齊 | S | `/dashboard/base/users` 可以管 user、`isActive` 旗標在、「負責人不能停用」工程保底要驗證 |
| 引導精靈重開 | 🔴 未做 | S | 跟 §3 設定精靈同軌、重置入口缺 |

**§12 修補總結**：⭐ 是 v1.2 §14 階段 B 核心、整個 RBAC 系統要重做。**規模 XL**（≥ 立項）。

---

## §13. v1.2 §13 不在 LITE 範圍（確認沒做的就是沒做）

| 項目 | 狀態 | 備註 |
|------|------|------|
| 國外銷貨 | 🟡 部分對齊 | `/dashboard/nx04/export` redirect 到 sales-return、應改「升級提示」（§6 列了）|
| 打卡系統 | 🟢 已對齊（沒做）| NX07 HR 有部分 controller、屬 PLUS、目前 UI 無打卡入口 |
| 個人日報自動跑（沒打卡）| 🟢 已對齊（沒做）| §9 報表全沒做、個人月報屬 manual |
| 跨租戶 SYSADMIN 管理 | 🟡 部分對齊 | `/nx99/tenants` controller 在、但 SYSADMIN cross-tenant 管理流程未見明顯 UI |
| 多倉庫複雜調撥 | 🟢 已對齊（LITE 簡化）| `nx03/transfer` 在、LITE 限制單一主倉 |
| 銷售 KPI / 客戶分析 | 🟢 已對齊（沒做）| `/dashboard/report` 全部 `pro` |
| 系統預設角色範本 | ⚠️ 衝突 | 目前 seed 有 `admin` 角色預設、v1.2 §13 說「用戶完全從零建」、要等 §12 RBAC 重做後 seed 清空 |
| 自訂權限項目 | 🟢 已對齊（沒做）| 權限 enum 寫死在 codebase（符合 v1.2）|

**§13 觀察**：「不該做」基本沒做、有 1 個 ⚠️（預設 admin 角色）等 §12 重做時順手清。

---

## §X. 修補的依賴順序

### X.1 阻塞關係

```
v1.2 §14 階段 B（RBAC 重做）⭐ 是所有其他階段的前置依賴

階段 B 不做完、所有後續模組撞「沒對齊新權限」：
├─ §1 員工分工（要新角色 enum）
├─ §4 主導覽按權限顯示
├─ §10 手機版浮動鍵按權限過濾
├─ §11 員工主檔綁角色
├─ §13 用戶完全從零建角色（清掉預設 admin）
└─ §9 員工只看自己報表

→ B 階段是「卡關」、必須先做
```

### X.2 推薦順序

```
1. 階段 A：介面骨架重整（v1.2 §14 排第一）
   ─ 解決兩套並存 UI（/purchase vs /nx02 等）
   ─ 主導覽改 5 大分類業務語意
   ─ menu.nxXX.ts 檔名 off-by-one 修正

2. 階段 B：⭐ 權限系統重做（v1.2 §12 核心）
   ─ 抽 permission enum
   ─ 角色管理頁面（自由命名 + 勾權限 + 複製 + 停用）
   ─ 員工綁角色 UI
   ─ Controller @Roles 全部改新 enum
   ─ 各頁面按權限顯示

3. 階段 C：開戶後台 + 匯入精靈
   ─ NX99 tenant 後台 UI
   ─ Excel 套件評估 + 7 類匯入器
   ─ 票據雙標
   ─ 資料起算點

4. 階段 D：設定精靈框架
   ─ user_page_guide 表
   ─ 每頁第一次跳邏輯
   ─ 「?」按鈕重看
   ─ 22 工作台引導內容

5. 階段 E：主檔分區編輯
   ─ 同份資料、各模組看自己欄位
   ─ 主檔中心顯示完整 4 區

6. 階段 F：NX05 財務作業
   ─ AR / AP / 票據 / 關帳 / 帳戶管理

7. 階段 G：手機版補齊
   ─ 5 dock 接真實 API
   ─ 包裹編號 / 配送路線

8. 階段 H：NX08 報表
   ─ 6 大報表
   ─ 個人月報
   ─ 三大財報

9. 階段 I：補連線 + 收尾
   ─ 退貨→保固連線
   ─ 採購需求 3 來源
   ─ 國外進貨 UI
   ─ 整體 closure
```

⚠️ A 跟 B 高度耦合（改 nav 結構 + 改權限同時影響每個頁面）、可考慮 A+B 合併一輪做完。

---

## §Y. 修補總規模預估

### Y.1 各 v1.2 章節規模統計

| v1.2 章節 | 落差規模 | 對齊度 |
|----------|---------|--------|
| §1 租戶情境 | S | 30% |
| §2 開戶後台 | L | 20% |
| §3 雙精靈 + 匯入 | XL | 5% |
| §4 主導覽 | L | 60% |
| §5 進貨 | M | 80% |
| §6 銷貨 | S+S+S | 95% |
| §7 庫存 | XS | 95% |
| §8 財務 | L | 5% |
| §9 報表 | L+ | 0% |
| §10 手機 | L | 40% |
| §11 主檔中心 | L | 50% |
| §12 設定（RBAC ⭐）| XL | 10% |
| §13 不在範圍確認 | XS | 90% |

### Y.2 總估時

| 階段 | 主要範圍 | 規模 | 估時 |
|------|---------|------|------|
| A | 介面骨架重整 | L | 1-2 週 |
| B ⭐ | RBAC 重做 | XL | 2-3 週（立項）|
| C | 開戶後台 + 匯入 | XL | 2-3 週（立項）|
| D | 設定精靈 | L | 1-2 週 |
| E | 主檔分區編輯 | L | 1-2 週 |
| F | NX05 財務 | L | 1-2 週 |
| G | 手機補齊 | L | 1-2 週 |
| H | NX08 報表 | L+ | 2 週（含三大財報立項）|
| I | 補連線收尾 | M | 3-5 天 |

**總估時：12-18 週**（A+B 並做可省 1-2 週、B 落後可同時做 C-F 部分頁面但 RBAC 整合期會 rework）。

### Y.3 最大落差

1. ⭐ **§12 RBAC 系統重做**（XL、卡關後續所有模組）
2. **§3 雙精靈 + Excel 匯入引擎**（XL、需立項評估 Excel 套件）
3. **§8 財務模組**（L、整模組未做）
4. **§9 報表模組**（L+、含三大財報）
5. **§4 兩套並存 UI 整合**（L、影響每個頁面）

### Y.4 立即可做的小落差（XS / S）

對齊度高的 §6 / §7 / §13：
- 國外銷貨 redirect 改「升級提示頁」（XS）
- 庫位「A 區 / B 區」樹狀分組驗收（XS）
- 銷貨側「客戶管理」頁面（S）
- 產品回報入口在 partner / part detail 補（S）
- 客訴型保固 sourceSoId picker（S、解鎖 NX02 FU-04）

可在 v1.2 §14 階段 A 前先做 / 順手做、不阻擋主軌。

---

## §Z. 給 Alex 的快速行動清單

1. ⭐ **拍板：A + B 並做 vs 分階段做？**
   - 並做：1 輪 nav 改造 + RBAC 重做、總時短但風險高
   - 分階段：A 先穩定、B 接著做、安全但長
   
2. **拍板：Excel 套件選型**（§3）
   - `xlsx` 輕量、社群活躍、但有 CVE 歷史
   - `exceljs` 功能完整、體積大
   - `papaparse` 純 CSV、組合 server 端 xlsx 解析
   
3. **拍板：「先鋒企業」seed**
   - 純 LITE 空殼（目前狀態）
   - 加 7 人組織 + 業務情境 seed（v1.2 §1.3）

4. **拍板：6 個 XS/S 落差是否優先做**（§Y.4）
   - 不阻擋主軌、可順手清

5. **拍板：B 階段 RBAC 重做的範圍**
   - 整套 controller `@Roles` 重做 + 前端 nav / 卡片過濾
   - or 雙軌過渡（舊 SYSADMIN/OWNER 系列保留、新 user-defined-role 並存）

⚠️ 5 個拍板一次給、Hank 開新 audit 軌或進入階段 A。

---

> 本 audit 完成、純現況盤點對照 v1.2、不含修補實作。
> 等 Alex 拍板 + 總經理拍路線後、再分階段進入修補。
