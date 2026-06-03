<!-- docs/_team/git-state.md -->

# NEXORA - Git 版控文件

> 文件目的：讓 Crown / Alex 隨時掌握「本地有哪些分支、各分支跟 origin 的同步狀態、誰沒 push、誰有風險」
> 撰寫者：Hank
> 結構規範：A~D 是「現況快照」（每次更新只動這四段）、E 是「維護方式」（穩定不動）

---

## A. 當前 Git 狀態快照

> **快照時間：2026-06-04 ⭐ 席次制 closure（員工啟用 + 預設密碼 + 框架 isActive 轉型修正）**
> **當前分支：`main`**（HEAD = `9544aea`「[SEATS pwd] 員工預設密碼統一改 changeme」、tag `v2.3.0-seats-enforcement`）

### A.-2 ⭐ 2026-06-04 席次制 closure（席次控管 + 員工啟用流程、12 commits）

> ⚠️ **移除前的完整存檔點**：「席次控管核心」（主檔切換啟用守門 + X/Y 席徽章 + SE-001 + 停用放行）保留為客戶日常功能；但「精靈內挑啟用 + 批次匯入」即將因方向轉向被移除（客戶端拿掉批次匯入、改 Innova 代建）。
> 此 tag = 「移除前的完整存檔點」、若日後需追溯精靈端席次 UI 邏輯、回到 `v2.3.0-seats-enforcement` 即可。

業務規則（Crown 拍板）：員工資料筆數不限、但「啟用（佔 seats、能登入）」受訂閱席次上限管制；含負責人計入。

| 階段 | Commit | 內容 |
|---|---|---|
| 段 1 | `34a130a` | 員工範本拿掉「啟用」欄、importer 一律 `isActive=false` |
| 段 1.5 | `789bbce` | 範本對齊員工編號制（latent bug、原範本沒員編欄、匯入 100% 失敗）|
| 段 5 | `b0341ea` | 後端 user.service 加 seats enforcement（`assertSeatCapacity` / `bulkActivate` / `getSeatUsage`、SE-001/002 錯誤碼）|
| 段 2 | `53f8edb` | 精靈第二步「挑啟用」UI（席次計數 + checkbox 清單 + 滿了 disable）|
| 段 3 | `d33439e` | 啟用成功後顯示預設密碼 + 首登改密提示 |
| 段 4 | `7415e45` | 主檔員工切換啟用接住席次守門 + 工具列「X/Y 席」徽章 |
| bug-02 | `cfc3786` | 修挑啟用 3 個 bug：`pageSize=200` 超 `@Max(100)` 400 / 按鈕文案 / 空狀態誤顯示 |
| bug-03 | `d15ca6e` | 修 `isActive='false'` 被錯轉成 true（class-transformer @Type Boolean 第一輪）|
| bug-04 trace | `b853179` | 暫時 trace、回報後拆 |
| bug-04 fix | `3104099` | 真因：ValidationPipe `enableImplicitConversion` 在 `@Transform` 之後 native Boolean coerce、用 `@Type(() => Object)` 避過。端到端實證 161 筆 inactive 員工撈得到 |
| pwd 統一 | `9544aea` | 員工預設密碼統一 `changeme`（後端 + 精靈 + 主檔單筆三處同步）|

**核心成果**：
- 後端 `Nx01ListQueryDto.isActive` 升級為 ValidationPipe 安全 transform、20+ list endpoint 同步修好「`isActive=false` 被吃掉」潛在 bug
- 席次守門：`current active + delta ≤ subscription.seats`、含負責人、訊息**無「升級/加購/聯絡」推銷字眼**（spec 負面斷言驗證）
- 全 codebase grep `Temp123` / `nexora@2026` = 0 殘留、員工預設密碼三處一致
- vitest 30+/30+ 全綠（pagination-isactive 10 / pagination-pipe 8 / seat-enforcement 12 / employee-template 6）
- 0 schema（純邏輯、用既有 `nx99_subscription.seats` + `nx01_user.isActive`）
- 0 Railway

詳細業務脈絡見 [HANDOFF-LITE-PROGRESS §AC §AD §AE](HANDOFF-LITE-PROGRESS.md)。

---

### A.-1 ⭐⭐ 2026-06-02 平台/租戶層分離軌 closure（main 直推 Phase 1~6、14 commits）

NEXORA 內部營運身分（伊諾瓦）與客戶員工身分（恆迎、其他）正規分離、業界 SaaS 標準。

| Phase | Commit | 內容 |
|---|---|---|
| P1 | `a9c8d50` | schema + migration + seed：新增 `platform_admin` 表 + 首位 innova-admin |
| P2 | `6b1e7db` | backend platform auth + JWT scope + PlatformAdminGuard |
| P3 | `93aa6b6` | `/sys-admin/onboarding` 改 PlatformAdminGuard |
| P4 | `49162dd` | frontend `/platform` 路由群 + 最小必要 backend tenants endpoint |
| P5 | `16e5c66` | 獨立 `/platform/login` 登入頁 + scope-based redirect |
| P6.1 | `f949428` | 改密 UI：首次強制改密 + 平日入口 + banner 自動消失 |
| P6.2 | `6d1a0a8` | 清 TEST-PHASE3 + TEST-UTF8 髒/驗證租戶（一次性 SQL）|
| P6.3 | `66149eb` | 租戶代碼規格 TW/ZT-{6digits} 落地 + 現有測試租戶正名 |
| P6.4+5 | `b4352b0` | INNOVA 退役 + `/platform` metadata 隔離 + 驗證殘留 cleanup |
| P6.6+7 | (即將) | 文件更新 + tag |

**核心成果**：
- 客戶 `/login` 0 動、客戶 `/dashboard/*` 0 動、既有 92 支 migration 0 動
- L1 認證隔離：JWT scope `platform/tenant` 雙向 401
- L2 入口隔離：客戶端 0 連結指向平台後台、視覺徹底分離（黑底 monospace vs 星空品牌）
- 租戶代碼 TW-100001 起（正式）/ ZT-100001 起（測試）、純遞增、退租保留
- INNOVA 退役、`platform_admin` 表正規承載伊諾瓦營運身分
- Railway 100% 不碰、所有變動 localhost

詳細見 [PROJECT_CONTEXT §6.5 平台層 vs 租戶層分離架構](../PROJECT_CONTEXT.md)。

---

### A.0 ⚡ 2026-06-01 晚 INNOVA 營運主體補正（hotfix、main 直推、已被 Phase 6 取代）

LITE 完整版 closure 後、總經理啟動實測發現「開戶後台缺正式營運帳號、SYSADMIN 角色被借掛在 TEST-LITE/PLUS/PRO 的 admin 上、語意衝突」。

**Crown 拍板 A**：建 INNOVA 營運租戶 + innova-admin 超管、收回測試 admin 的 SYSADMIN 角色。

| 動的東西 | 內容 |
|---|---|
| 新檔 1 個 | `packages/db-core/prisma/seed/system/nx99_innova_tenant.ts` |
| 改 4 個 | `seed/system/index.ts` 串入 + `seed/test/{lite,plus,pro}/users.ts` 收回 SYSADMIN |
| 不動 | schema / migration / API / 既有資料 / Railway |
| Seed | 本機重跑、全綠（4 租戶：SYSTEM/INNOVA/TEST-LITE/TEST-PLUS/TEST-PRO）|

**ID 範圍補正**（PROJECT_CONTEXT §4.2 已同步）：
- `NX99TANT0000001` 由「客戶第一格」改為 INNOVA 系統保留
- `NX01USER0000002` 由「客戶第一格」改為 innova-admin 系統保留
- 真實客戶起點往後挪 1 格（tenant 0000002 / user 0000003 起）

**正式開戶帳號**（取代過去借 TEST-LITE/admin 的做法）：
- 公司帳號 `INNOVA` / 使用者 `innova-admin` / 預設密碼 `Nexoragrid2026`（首次強制改密）

詳細範式見 [docs/PROJECT_CONTEXT.md §6.4](../PROJECT_CONTEXT.md)。

---

> **本軌 closure 摘要（保留紀錄）：v1.2 對齊軌 階段 I 補連線收尾 ⭐⭐⭐ LITE 完整版完成、merge feature/v1.2-alignment-i + tag v2.1.0-lite-complete**
> **上輪 closure**：v1.2 對齊軌 階段 G 手機版（merge + tag `v2.0.8-alignment-g-complete`）
> **本次更新觸發**：§E.2-#2「merge 回 main」（feature/v1.2-alignment-i、--no-ff、階段 I 補連線收尾 + LITE 完整版完成）
> **狀態摘要**：`feature/v1.2-alignment-i` = **已 merge main、可考慮刪除**
> **整軌成果**：7 commits（P0 意圖書 → P6 closure）、4 補連線項目全交付（退貨→保固自動 / 採購需求 3 來源 / 國外進貨 6 階段 UI / 11 hub placeholder redirect）；2 schema additive 變動已 apply localhost（PR.dispositionFlag + WarrantyClaim.sourcePrId/sourcePrItemId）；對齊總經理「退貨選保固自動產生」拍板 + Alex Q1~Q4（schema=a / SO mixed / 獨立路徑 / NX04 redirect）
> **⚠️ Railway production migration 同步累計落後 91 → 92 支**（階段 I **2 支 schema migration**、本軌增加 2 支、Railway 端維持落後）：dev DB 已 apply（STOP-1 總經理拍板）、`.env` 維持 localhost、觸發時機仍對齊 TASK-RAILWAY-ENV-SPLIT + 第一個真實客戶簽約前 2~4 週
> **⭐⭐⭐ LITE 完整版完成**：所有 v1.2 對齊軌階段（A/B/C/C-fu/D/E/F/G/H/I）全 closure、總經理可開始完整實測（動線文件 docs/_team/nexora-lite-complete-walkthrough.md）
>
> ⚠️ **本檔 minimal update**（2026-05-02 起累積）：§A.1 多軌 merge 分支總覽自 2026-05-18 起未 full audit、其他既有分支狀態 full audit 留後續軌

### A.1 本地分支總覽（23 條）

| 分支 | 同步狀態 | 最新 commit | 訊息摘要 |
|------|---------|-------------|---------|
| `main` ⭐ | ✅ 同步 | merge commit | **⚠️ MERGE feature/v1.2-alignment-i（v1.2 對齊軌 階段 I 補連線收尾 closure ⭐ LITE 完整版完成、tag `v2.1.0-lite-complete`）** |
| `feature/v1.2-alignment-i` | ✅ 同步、**已 merge main、可考慮刪除** | merge commit | 7 commits 整軌：P0 意圖書 / P1 schema STOP-1 (PR.dispositionFlag + WarrantyClaim.sourcePrId/sourcePrItemId) / P2 退貨→保固 service hook / P3 採購需求 3 來源（SO hook + manual POST + UI）/ P4 國外進貨 6 階段 UI / P5 hub 11 redirect / P6 closure |
| `feature/v1.2-alignment-g` | ✅ 同步、**已 merge main、可考慮刪除** | merge commit | 8 commits 整軌：P0 意圖書 / P1 殼層 dock+FAB / P2+P3 撿貨+包貨接 API / P4+P5 配送+驗收+BarcodeScanner / P6 盤點掃碼 / P7 closure |
| `feature/v1.2-alignment-h` | ✅ 同步、**已 merge main、可考慮刪除** | merge commit | 7 commits 整軌：P0 意圖書 / P1 finance/pnl endpoint / P2 recharts + 共用元件 / P3 first-batch 個人+進貨+銷售 / P3 second-batch 庫存+損益+營運+Hub / P4 手機版（ResponsiveTable）/ P5 Excel 匯出（useExportExcel） |
| `feature/v1.2-alignment-f` | ✅ 同步、**已 merge main、可考慮刪除** | merge commit | 12 commits 整軌：P0 意圖書 / P1 schema 多來源+401 旗標 / P2 §8.5 修正 / P3 7 子項+主管直接改 / P4 5 頁面 / P5-schema 3 變動 / P5 application / P5-B 4 dialog（票據/折讓/保固/沖銷檢視） |
| `feature/v1.2-alignment-e` | ✅ 同步、**已 merge main、可考慮刪除** | merge commit | 8 commits 整軌：P1 framework / P2 partner / P3 part / P4 warehouse+user / P5 SatelliteSection / P6 closure（STEP-2 清 DEMO + A1~A4 補 part + B1~B5 補 user + 砍舊版） |
| `feature/v1.2-alignment-d` | ✅ 同步、**已 merge main、可考慮刪除** | merge commit | 4 commits：D1 framework / D2 22 guides / D3 AutoPageGuide / D4 reset page |
| `feature/nx04-sales-lite` | ✅ 同步、**已 merge main、可考慮刪除** | merge commit | 17 commits 整軌：STEP-0 / M1 schema / M2-C1~C6 backend / M3-C1~C7 frontend（5 工作台 + 1 共用元件）/ M4 整合驗證 / M5 操作手冊 |
| `feature/nx03-stock-lite` | ✅ 同步、**已 merge main、可考慮刪除** | merge commit | 11 commits 整軌：M1 schema / M2-A~F backend / M3-1~M3-3b frontend（5 畫面）/ M4 整合驗證 / M5 操作手冊 |
| `feature/nx00-cleanup` | ✅ 同步、**已 merge main、可考慮刪除** | merge commit | P1 rm 32 死碼 / P2 9 module 搬 features/shared/master + sed sweep |
| `feature/nx02-purchase-lite` | ✅ 同步、**已 merge main、可考慮刪除** | `bb91268` | 進貨整軌：M1 schema+migration / M2 backend×6 / M3 frontend / M3-redo×5 / M4 nx98 task-pool / M5 tiered-form / M6 手冊 |
| `feature/nx01-partner-six-classes` | ✅ 同步、**已 merge main、可考慮刪除** | `4938dd0` | partner_type 六分類 C/O/S/T/B/V + canTransferStock + 17 service filter + DTO enum 清 + 前端 UI + seed 空殼 + 4 nx00 孤兒刪 + _ddl_fragment 對齊 |
| `feature/nx01-16-historical-fact-preserve` | ✅ 同步、**已 merge main、可考慮刪除** | `b71fa07` | nx01-16 加 HTML 註解 × 2 + DCL v1.0-historical-note + worklog 主題 23 |
| `feature/yaro-narrative-drift-fix` | ✅ 同步、**已 merge main、可考慮刪除** | `75cc2bf` | PROJECT_RULES + nx01-summary Yaro 字眼補正 + worklog 主題 22 |
| `feature/cursor-rules-cleanup` | ✅ 同步、**已 merge main、可考慮刪除** | `0a80839` | git rm _cursorrules + PROJECT_RULES §III.8.7 §G.9 + worklog 主題 21 |
| `feature/nx01-summary-and-final-cleanup` | ✅ 同步、**已 merge main、可考慮刪除** | `6c6dc49` | NX01 summary + A075 sweep + .cursorrules + upload-list + 多 Cursor + #23~#25 + worklog 主題 20 |
| `feature/docs-restructure-and-rules-complete` | ✅ 同步、**已 merge main、可考慮刪除** | `95c6abc` | docs/ 平鋪 + Part III + CLAUDE stub + 交叉引用 + README + worklog 主題 19 |
| `feature/nx01-16-part-model` | ✅ 同步、**已 merge main、可考慮刪除** | `e598ad4` | NX01-16 spec + schema + 後端 + 前端 + reference drift + worklog 主題 18 |
| `feature/nx01-17-r-modal` | ✅ 同步、**已 merge main、可考慮刪除** | `8769eef` | R 同款 modal 路線 A：generic onAfterCreate prop + caller handler + worklog 主題 17 |
| `feature/nx01-17-ui-and-drift-fix` | ✅ 同步、**已 merge main、可考慮刪除** | `d11cffa` | Q5 UI 接通 + 4 drift 補正 + charter §G.7/§G.8 升級 + worklog 主題 16 |
| `feature/nx01-17-part-version-relation` | ✅ 同步、**已 merge main、可考慮刪除** | `2fb31ac` | 軸 1 字母 enum SmallInt + part_version + part_relation 後端 + worklog 主題 15 |
| `feature/nx01-05-part` | ✅ 同步、**已 merge main、可考慮刪除** | `5cd62ae` | NX01-05 spec + schema unique+4 index + service 重設計 + UNK guard + previewCode + worklog 主題 14 |
| `feature/nx01-11-part-service-hotfix` | ✅ 同步、**已 merge main、可考慮刪除** | `fb1dae4` | 🔴 Production blocker hotfix：part.service auto-vivify 廢棄、codeRuleId NN |
| `feature/nx01-07-base-catalog` | ✅ 同步、**已 merge main、可考慮刪除** | `e00dbde` | NX01-07 spec + customer_grade unique + part_group 後端 + customer_grade UI + worklog 主題 13 |
| `feature/nx01-13-model` | ✅ 同步、**已 merge main、可考慮刪除** | `17e646f` | NX01-13 model + NX01-15 三表 spec + schema + 後端 + 前端 + worklog 主題 12 |
| `feature/nx01-14-engine` | ✅ 同步、**已 merge main、可考慮刪除** | `f7d41b0` | NX01-14 engine spec + schema + 後端 + 前端 + worklog 主題 11 |
| `feature/nx01-12-car-brand` | ✅ 同步、**已 merge main、可考慮刪除** | `8b0a6bc` | NX01-10/11/12 + 2 spec + worklog 主題 10 + PROJECT_CONTEXT v1.6 #22 |
| `feature/alex-failure-17-21` | ✅ 同步、**已 merge main、可考慮刪除** | `ae70773` | Alex 失誤紀錄 #17~#21 補登 + PROJECT_CONTEXT v1.5 |
| `feature/wp-phase1-doc-restructure` | ✅ 同步、**已 merge main、可考慮刪除** | `b20dfb9` | GIT-STATE update 2026-04-29 Phase 1 收官 |
| `feature/wp-phase1-w2-mini` | ✅ 同步 | `5a34664` | WP-PHASE1-DEMO02 customer 命名規則調整 |
| `feature/wp-phase0-schema` | ✅ 同步 | `7652c43` | WP-PHASE0-B2 stock reverse lookup API |
| `feature/demo-emergency` | ✅ 同步 | `0df5a84` | TASK-BUSINESS-RESTRUCTURE 大塊 3 Phase 10（**G1 已 push**） |
| `feature/home-modals-settings` | ✅ 同步 | `76ad3ae` | 首頁 Modal / 使用者設定 / TopBar（**G2 已建 upstream**） |
| `feature/NX99-multitenancy` | ✅ 同步 | `e9fc3bd` | NX-UI Redesign login/home + PWA |
| `feature/base-master-hub` | ✅ 同步 | `3b45e2e` | 首頁 |
| `feature/nx-ui-v0-mobile-route` | ✅ 同步 | `8a65160` | DOC dailylog structure + 20260326 |
| `feature/nx03-sales-flow-hub` | ✅ 同步 | `b33f529` | NX03 銷貨工作台四區塊 + Alt+A |
| `feature/spec-reverse-sw01` | ✅ 同步 | `d2bdce2` | TASK-SPEC-REVERSE-S-W01 dailylog |
| `feature/sys-dashboard` | ✅ 同步 | `9096c2b` | NX01 default seed upsert keys fix |

⭐ = 當前 HEAD 所在（main、Phase 1 落地後）
✅ = 12 條分支全部跟 origin 同步、無 ahead / 無未 push 工作
⚠️ `feature/wp-phase1-doc-restructure` 已完整 merge main（merge commit `5d4dbac`）、**可刪本地分支**、待 Crown 拍

### A.2 Tag

> ⚠️ 下表為節錄（早期 + 最新）；完整 tag 清單以 `git tag` 為準（NX02~NX10 各模組 closure tag v0.3.0 ~ v1.5.0 + user-master track A/C v1.6.0 / v1.6.2 等已落地）。

| Tag | 指向 commit | 含義 |
|-----|------------|------|
| `phase0-complete` | `259855c` | Phase 0 收官（schema + translator + APIs merge） |
| `phase1-complete` | `5d4dbac` | Phase 1 doc-restructure 收官（11 worklog + 4 基礎設施文件 + 35+ 範式 + PROJECT_CONTEXT） |
| `v1.6.2-user-master-track-c-closure` | — | USER 主檔軌 A+B+C 全軌完成（master-shell 範式建立） |
| `v1.0-nx01-closure` | `1487247` | **NX01 主檔模組 closure**（25 主檔鋼鐵星球範式對齊：命名統一 / 指派管理 / SYSADMIN 鎖定 / 表格工具 / 國家後端 / 下拉鍵盤 / 模組收合 / 據點庫位拆分 / 料號規則重做 / 零件重做 / 完整料號格式 / 3 drift 補強）|
| `v1.1.0-partner-six-classes-closure` | `0cb89e3` | **LITE 藍圖階段 0 partner 改制 closure**（partner_type 六分類：C=保養廠 / O=同行 / S=供應商 / T=外包物流 / B=銀行 / V=一般廠商 + canTransferStock 旗標、17 service filter + DTO enum 清 + 前端 UI + seed 空殼 + 4 nx00 孤兒刪、Crown 2026-05-28 拍板）|
| `v1.2.0-nx02-purchase-lite-closure` | `9bf8419` | **LITE 藍圖階段 1 進貨模組 closure**（NX02 + nx98 共用核心 + tiered-form framework）14 commits 整軌：詢價→比價→PO/TI 分流→驗收+移動平均+國外攤分→自動 AP / 保固單兩型+附件+5階段+4結果 / 客套話設定 / 供應商等級重算 / 產品定價重算 / 共享待辦池框架 / 三層欄位框架 / 操作手冊 |
| `v1.3.0-nx03-stock-lite-closure` ⭐ | `7ae0c2a` | **LITE 藍圖階段 2 庫存模組 closure**（NX03）11 commits 整軌：M1 schema 1 新表 + 4 欄位 + AutoReplenish 標 deprecated / M2-A~F backend（盤點核可 + nx98 補貨通知 + 庫存查詢 3 維度 + IssueReport 跨模組異常 + PartStockSetting）/ M3-1~M3-3b frontend 5 畫面（盤點工作台 / 庫存查詢 / 庫位 / 產品設定 / 異常回報 / 重組分解）/ M4 整合驗證 / M5 操作手冊 13 章節 |
| `v2.3.0-seats-enforcement` ⭐ | `9544aea` | **席次制 closure**（員工啟用 + seats 守門 + 預設密碼 + 框架 isActive 轉型修正）12 commits 整軌、見 §A.-2。**移除前的完整存檔點**：精靈內挑啟用 + 批次匯入即將因方向轉向被移除（客戶端拿掉批次匯入、改 Innova 代建）；席次控管核心（主檔切換啟用守門 + X/Y 席徽章 + SE-001 + 停用放行）保留為客戶日常功能 |

### A.3 工作樹狀態

```
On branch main
Your branch is up to date with 'origin/main'.
nothing to commit, working tree clean
```

> ⚠️ 本檔在 main 分支 update。本軌（席次制）main 直推、無 feature 分支。
> ⚠️ 本次 closure 含：
>   12 個 commits（席次五段 + bug-02/03/04 + pwd 統一）
>   + 1 個 tag（`v2.3.0-seats-enforcement` 指向 `9544aea`、已 push origin）
>   + 1 個 [GIT-STATE]（本檔、main 分支上 commit）

---

## B. 各 Feature Branch 對應的 Task

| 分支 | 對應 Task | 狀態 |
|------|----------|------|
| `feature/nx01-17-part-version-relation` | **TASK-NX01-17-IMPL**（軸 1 字母 enum 升 SmallInt 最小範圍 part.type+relationType + 軸 2 part_version 新建 + part_relation 補 unique/index/CRUD + R 同款 reverseHint + worklog 主題 15）| ✅ 全部收官、merge main（6 commit、+906/-18、17 檔不含 UI 跳過 A071）|
| `feature/nx01-05-part` | **TASK-NX01-05-IMPL**（NX01-05 part 最後整合節點：schema unique + 4 index + service 重設計 + UNK guard + previewCode + worklog 主題 14）| ✅ 全部收官、merge main（3 commit、+835/-31、7 檔不含 UI）|
| `feature/nx01-11-part-service-hotfix` | **🔴 HOTFIX-NX01-11-PART-SERVICE**（A063 升級觸發、NX01-12-IMPL-v2 commit 2 漏 sync、編譯掛修補）| ✅ 收官、merge main（1 commit、+31/-30、1 檔）|
| `feature/nx01-07-base-catalog` | **TASK-NX01-07-IMPL**（NX01-07 基礎型錄精煉：part_group 後端新建 + customer_grade schema unique + PATCH + 前端 UI + worklog 主題 13）| ✅ 全部收官、merge main（5 commit、+1369/-16、14 檔）|
| `feature/nx01-13-model` | **TASK-NX01-13-IMPL**（NX01-13 model + NX01-15 三表前置 spec + schema + 後端 + 前端 + worklog 主題 12、#22 鐵律觸發本軌擴張）| ✅ 全部收官、merge main（8 commit、+4187/-5、34 檔）|
| `feature/nx01-14-engine` | **TASK-NX01-14-IMPL**（NX01-14 engine 主檔 spec + schema + 後端 + 前端 + worklog 主題 11）| ✅ 全部收官、merge main（4 commit、+1582/-2、12 檔）|
| `feature/nx01-12-car-brand` | **TASK-NX01-12-IMPL-v2**（NX01-10 phonetic 基礎設施 + NX01-11 schema FK 翻轉 + NX01-12 schema/seed/controller + 2 spec + worklog 主題 10 + PROJECT_CONTEXT v1.6 #22） | ✅ 全部收官、merge main（11 commit、+3220/-70、27 檔） |
| `feature/alex-failure-17-21` | **TASK-PROJECT-CONTEXT-FAILURE-17-21**（Alex 失誤 #17~#21 補登 + PROJECT_CONTEXT v1.5）| ✅ 收官、merge main（merge commit `e9f0efe`）|
| `feature/wp-phase1-doc-restructure` | **TASK-PHASE1-DOC-RESTRUCTURE-01** + **TASK-PHASE1-NX01~10-WORKLOG** + **TASK-NX08-MONTHLY-REPORT-CLEANUP** + **TASK-WORKLOG-RENAME** + **TASK-PHASE1-PROJECT-CONTEXT-MIGRATE-01** + **TASK-PHASE1-SHARED-WORKLOG-01** + **TASK-PHASE1-MERGE-MAIN-01** | ✅ 全部收官、merge main、tag `phase1-complete` |
| `feature/wp-phase1-w2-mini` | TASK-PHASE1-W2-MINI（W2-mini 庫存 + DEMO-02 LITE seed） | 進行中 |
| `feature/wp-phase0-schema` | WP-PHASE0（schema + translator + APIs） | ✅ 已收官（tag `phase0-complete`） |
| `feature/demo-emergency` | TASK-BUSINESS-RESTRUCTURE（大塊 1~3、Phase 1~10） | 進行中（已 push 至 origin） |
| `feature/home-modals-settings` | UI 首頁 Modal / 使用者設定（沒明確 task code） | 已 push、待 Crown 確認 status |
| `feature/NX99-multitenancy` | NX99 多租戶 + login/home redesign | 早期（待 Crown 確認狀態） |
| `feature/base-master-hub` | 主檔 hub / 首頁 | 早期（待 Crown 確認狀態） |
| `feature/nx-ui-v0-mobile-route` | mobile route v0 | 早期（待 Crown 確認狀態） |
| `feature/nx03-sales-flow-hub` | NX03 銷貨工作台四區塊 | 早期（待 Crown 確認狀態） |
| `feature/spec-reverse-sw01` | TASK-SPEC-REVERSE-S-W01 | 早期（待 Crown 確認狀態） |
| `feature/sys-dashboard` | sys-dashboard / NX01 seed fix | 早期（待 Crown 確認狀態） |

> ⚠️ 「早期」分支共 6 條、可能是已合併到 main 的歷史分支。建議 Crown 拍板：保留 / 刪本地 / 刪 origin。

---

## C. 未 Push 的本地工作

✅ **無未 push 工作**（main 已 push 含 Phase 1 merge、tag `phase1-complete` 已 push、本次 GIT-STATE commit 即將 push）。

Phase 1 收官 task 全部已 push 完成：

| task | commit 範圍 | push 時間 |
|------|------------|----------|
| TASK-NX08-MONTHLY-REPORT-CLEANUP + TASK-WORKLOG-RENAME | `f531680..2a92e1d` 共 6 commit | 2026-04-29 上午 |
| TASK-PHASE1-PROJECT-CONTEXT-MIGRATE-01 | `7d705fe..4b0bc89` 共 6 commit | 2026-04-29 中午 |
| TASK-PHASE1-SHARED-WORKLOG-01 | `df5e93c..b20dfb9` 共 3 commit | 2026-04-29 下午 |
| TASK-PHASE1-MERGE-MAIN-01 | merge commit `5d4dbac` + tag `phase1-complete` | 2026-05-02 |

歷史風險點全數解除：
- `feature/demo-emergency` G1 ✅ push 完成（`0df5a84`）
- `feature/home-modals-settings` G2 ✅ push 完成 + upstream tracking（`76ad3ae`）

---

## D. 重要分歧點

### D.1 兩條 Phase 1 並行分支（doc-restructure 已 merge）

```
main (5d4dbac, ⭐ Phase 1 落地、tag phase1-complete)
  │
  ├── feature/wp-phase1-w2-mini      (5a34664) — DEMO-02 LITE seed + 客戶命名（仍進行中）
  └── feature/wp-phase1-doc-restructure (b20dfb9, ✅ 已 merge main、可考慮刪除)
```

⭐ **Phase 1 doc-restructure 收官清單**（已完成、merge commit `5d4dbac`）：
- ✅ docs/ v2 結構（按 NX 模組劃分）
- ✅ hank-charter.md / system-architecture.md / git-state.md / file-placement-suggestion.md（三人團隊規範）
- ✅ NX01~NX10 worklog 10/10 + nxXX 前綴 rename
- ✅ NX08 monthly_report cleanup（A030）
- ✅ PROJECT_CONTEXT.md v1.0 進場 repo root
- ✅ _team/worklog.md v1.0（8 主題跨模組統合 + 累計範式總表 8 分類）
- ✅ Yaro 拼字校正全 repo

⚠️ `feature/wp-phase1-doc-restructure` 已完整 merge main、本地分支可刪、待 Crown 拍（不主動刪、紀律守住）。

`feature/wp-phase1-w2-mini` 仍進行中（Phase 1 軌 2、DEMO-02 LITE seed）、跟 doc-restructure 改動範圍不重疊：
- w2-mini 改 `packages/db-core/prisma/seed/demo/`
- doc-restructure 改 `docs/_team/` + `CLAUDE.md` + `README.md` + `_cursorrules` + `PROJECT_CONTEXT.md`

**w2-mini 完成後 merge 回 main、不會 conflict**（範圍隔離已驗證）。

### D.2 `home-modals-settings` 跟 `NX99-multitenancy` 共享 commit `e9fc3bd`

兩條分支都包含 `[NX-UI] Redesign login/home experience with PWA and theme updates` 這個 commit。
代表它們從同一個基底分歧出來、可能是早期實驗。

**待 Crown 確認：** 這是不是已被取代的 WIP、要不要清理。

---

## E. 維護方式（Hank 自己提的建議）

### E.1 為什麼不每次 commit 都更新？

- 每 commit 更新成本太高、會 inflate 我的工作流
- git log 本身就是 commit 真相、不需要在 .md 裡重複
- 這份文件是「快照地圖」、不是「commit 紀錄簿」

### E.2 觸發更新的 5 個時機

| # | 時機 | 為什麼 |
|---|------|-------|
| 1 | 切新分支 | 新分支要登錄到 §A.1 表格 + §B 對應 task |
| 2 | merge 回 main / 刪除分支 | 表格要拿掉舊分支 |
| 3 | 大量 commit 後（≥ 5 個或跨 task） | 確保 §A.1 表格的 commit hash 不過期 |
| 4 | Crown 主動詢問 Git 狀態 | 順便重新生成 |
| 5 | **跨機器切換時更新**（家裡↔辦公室） | 換機器前先 push、新機器先讀 git-state 對齊 |

### E.3 由誰觸發？

- **Hank 自己觸發**：上面 4 個時機任一達成、我自動更新
- **Crown 觸發**：說「更新 git-state」、我立即重新生成

### E.4 更新方式

- 只動「快照區塊」（§A ~ §D）
- 「維護方式」（§E）穩定不動
- commit 訊息：`[GIT-STATE] update YYYY-MM-DD <簡述>`
- 例：`[GIT-STATE] update 2026-04-29 demo-emergency pushed`

### E.5 下次更新時機（預測）

- Phase 2 第一個 task 啟動時（如 NX01 主檔規格書相關 implementation）、觸發時機 #1（切新分支）
- 或 `feature/wp-phase1-w2-mini` merge main 時、觸發時機 #2
- 或 Crown 拍刪 `feature/wp-phase1-doc-restructure` 本地分支時、觸發時機 #2
- 或 Phase 2 task 累積 ≥5 commit、觸發時機 #3
- 或下次 Hank 切到家裡 / 辦公室機器時、觸發時機 #5

### E.6 不寫的東西

- 不寫每個 commit 的細節（git log 已是真相）
- 不寫業務邏輯說明（規格書 / 工作日誌的事）
- 不寫未來規劃（Alex / Crown 的事）

---

## 給 Crown 的拍板事項（2026-04-28 已全數拍板）

| 編號 | 議題 | Crown 拍板 | 執行結果 |
|-----|------|-----------|---------|
| G1 | `feature/demo-emergency` 6 commit 未 push | ☑ push | ✅ 已 push（commit `5e7a952..0df5a84`） |
| G2 | `feature/home-modals-settings` 整條沒 upstream | ☑ push | ✅ 已 push + 建 upstream tracking |
| G3 | 6 條早期分支 | ☑ 暫不動（等所有任務完開新 task 處理） | — 留 |
| G4 | E.2 觸發更新時機 | ☑ 同意 + 加第 5 條「跨機器切換時更新」 | ✅ 已加入 §E.2-#5 |
