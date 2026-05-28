<!-- docs/_team/NEXORA_PROJECT_AUDIT_2026-05-26.md -->
# NEXORA GRID — 專案完整 Audit 報告

> **撰寫者**：Hank（Claude Code 範式、新加入工程師）
> **時間**：2026-05-26
> **對象**：Alex（PM AI）對齊累積真相 / Crown 業務驗收
> **性質**：純 audit、不改任何檔案（本報告本身除外）
> **Main HEAD**：`34b0baf`（= `origin/main`，已同步）
> **HEAD tag**：`v1.6.2-user-master-track-c-closure`
> **方法**：grep / find / git log / cat 實證；不確定處明確標「推測」
> **三人協作對齊**：Crown 業務驗收守門 + Alex 測試報告守門 + Hank 工程

---

## 真相校準（開頭重要：與任務 brief 的差異）

任務 brief 中有數處推測值，audit 實證後校正如下（供 Alex 對齊）：

| brief 推測 | 實證真相 | 出處 |
|---|---|---|
| 雙 tag v1.6.0 + v1.6.2 | ✅ 確認，無 v1.6.1。`v1.6.0`→`8a04315`（軌 A merge）、`v1.6.2`→`34b0baf`（軌 C merge = HEAD） | `git tag` |
| 業界改革「13 個」候選 | ⚠️ **不符**。docs 中編號達 **#26**，且無單一正典清單（見 §7） | 全 docs grep |
| 主檔「21 個」 | ✅ 接近。前端 base 路由 25 個命名頁；其中 **21 個前後端全接通**、4 個僅前端（見 §3） | route + module 對照 |
| 軌 0 lab「31 commit」 | ⚠️ 略有出入。handoff 載「commit 41~71 共 41 commit、lab 探索段 41~48」（見 §5） | master-shell-handoff |
| git-state 指向舊 HEAD f9a75bd | ✅ **確認**。git-state.md A 段快照 = 2026-05-18 / HEAD `f9a75bd`，落後當前 `34b0baf`（見 §10） | git-state.md |
| user-role.revoke 為 soft delete | ✅ **確認** soft delete（見 §8） | service 原始碼 |
| user-warehouse 後端 src 缺 / dist/nx00 殘留 | ✅ **完全確認**（見 §8） | find src vs dist |

---

## §1 技術棧 Audit

### 1.1 Monorepo 骨架

| 項目 | 真相 | 出處 |
|---|---|---|
| 套件管理 | **pnpm 10.29.3**（`packageManager` 鎖定） | `package.json` |
| Monorepo orchestrator | **Turborepo 2.8.21**（`turbo.json` build/dev/lint pipeline） | `turbo.json` |
| Workspace | `apps/*` + `packages/*` | `pnpm-workspace.yaml` |
| Root 名稱 | `nexora-monorepo` v0.0.1 | `package.json` |

### 1.2 後端（apps/nx-api）

| 項目 | 版本 | 備註 |
|---|---|---|
| NestJS | **^11.0.1** | common / core / platform-express |
| Prisma | **^7.4.0** | `@prisma/client` + `@prisma/adapter-pg`（driver adapter 模式） |
| DB driver | `pg` ^8.18.0 | PostgreSQL |
| Auth | `@nestjs/jwt` ^11 + `@nestjs/passport` + `passport-jwt` + `bcryptjs` ^3 | JWT + bcrypt |
| 驗證 | `class-validator` ^0.15 + `class-transformer` | DTO 驗證 |
| 測試 | **Vitest 2.1.9** + `@testcontainers/postgresql` + supertest | unit + int-spec（testcontainer 起真 PG） |

> 出處：`apps/nx-api/package.json`

### 1.3 前端（apps/nx-ui）

| 項目 | 版本 | 備註 |
|---|---|---|
| Next.js | **16.1.6** | App Router |
| React | **19.2.3** | + `babel-plugin-react-compiler` 1.0.0（React Compiler 啟用） |
| 樣式 | **Tailwind CSS v4** + `@tailwindcss/postcss` + `tw-animate-css` | |
| 元件原語 | **Radix UI**（avatar/dialog/dropdown/label/scroll-area/slot/tabs） | |
| 狀態 | **Zustand 5.0.12** | |
| 動效 | **framer-motion 12.38.0** | 鋼鐵星球質感 |
| Icon | **lucide-react 1.7.0** | |
| 日期 | `date-fns` 4 + `react-day-picker` 9 | |

> 出處：`apps/nx-ui/package.json`

### 1.4 共用套件（packages/db-core）

- Prisma schema 唯一真相源 + client 產生器（`prisma generate` → `../generated/prisma`）
- Seed 三層架構 script：`seed:system` / `seed:test`（tier lite/plus/pro）→ 對應 [[project_task_seed_refactor]]
- 工具 script：`schema:from-spec`（CSV 欄位表驅動 schema 產生）、`import:parts2`、`p0:railway-ddl`
- 出處：`packages/db-core/package.json`

### 1.5 部署環境

| 證據 | 真相 |
|---|---|
| `apps/nx-api/Dockerfile` | 後端容器化存在 |
| `infra/docker/docker-compose.yml` | 本地/基礎設施 compose |
| `p0:railway-ddl` script | **Railway** DDL 測試痕跡（後端 → Railway PG，推測） |
| Vercel / Cloudflare 設定檔 | ⚠️ **未找到** `vercel.json` / `wrangler.*` / `*.toml`（除 docker 外無 PaaS 設定檔） |

> **推測**：後端走 Railway（Dockerfile + railway-ddl script），前端部署平台無設定檔證據、需 Crown/Alex 補充（可能由平台 UI 設定、非 repo 內）。

---

## §2 Repo 結構 Audit

### 2.1 apps/

```
apps/
├─ nx-api/   NestJS 後端（src/{auth, shared, nx01~nx10, nx99, prisma}）
└─ nx-ui/    Next.js 前端（src/{app, components, features, hooks, lib, mocks, shared, middleware.ts}）
```

- 後端模組制：`src/nx01` … `src/nx10` + `src/nx99`（多租戶系統層）+ `src/auth` + `src/shared`（含 rbac / plan / workflows / file-upload / errors / filters / guards）
- ⚠️ **`src/nx00` 不存在於後端 source**（重要：見 §8 user-warehouse 殘留分析）
- 前端 `src/features/`：auth, base, finance, home, inventory, layout, **master-shell**, nx00, nx01, nx02, nx03, nx06, purchase, report, sale, sales, sys-dashboard
  - ⚠️ 前端有 `features/nx00`（與後端 nx01 命名不對齊、推測為早期遺留命名）

### 2.2 packages/

```
packages/
└─ db-core/   Prisma schema + client + seed 三層 + scripts
```

### 2.3 docs/

```
docs/
├─ PROJECT_CONTEXT.md   業務介紹（16KB）
├─ PROJECT_RULES.md     規範合一手冊（54KB、Part I/II/III）
├─ README.md
├─ _team/               跨模組協作文件（見 §9）★ 本報告所在
├─ _system/  _reference/  _template/  _archive/
├─ auto-replenish/
└─ nx01 … nx10 + nx98 + nx99   每模組 {reference, spec, ui, workflow}
```

### 2.4 監控檔案命名範式

- **模組編號制**：`nx{01..10}` 業務模組 + `nx98`（DocLink）+ `nx99`（多租戶/方案系統層）
- **主檔分區**：前端路由 `/dashboard/base/{master}`（見 §3）
- **Schema 命名**：DB `nx{模組}_{實體}` snake_case；Prisma `Nx{模組}{PascalCase}`；ID `VARCHAR(15)` + `dbgenerated("gen_{table}_id()")`
- **租戶**：業務表帶 `tenant_id`；NX99 為系統層無租戶欄位
- 出處：`packages/db-core/prisma/schema.prisma` 檔頭

---

## §3 主檔狀態 Audit

### 3.1 Prisma 模型總量

- **172 個 model**（`grep -c '^model '`）橫跨 nx01~nx10 + nx98 + nx99
- 主檔集中於 **NX01**（基礎主資料模組）

### 3.2 前端 base 主檔路由（25 個命名頁 + 1 動態）

路由根：`apps/nx-ui/src/app/dashboard/base/`

| 主檔頁 | 後端 nx01 controller？ | 狀態 |
|---|---|---|
| users（使用者） | ✅ UserController | **已落地**（USER 主檔 98%，見 §5） |
| roles（職務） | ✅ RoleController | 已落地 |
| user-role（職務指派） | ✅ UserRoleController | 已落地（軌 B/C） |
| user-warehouse（隸屬倉庫） | ❌ **無 controller** | ⚠️ **KNOWN ISSUE**（見 §8） |
| currency（幣別） | ✅ CurrencyController | 已落地 |
| warehouses（倉庫） | ✅ WarehouseController | 已落地 |
| customer-grade（客戶分級） | ✅ CustomerGradeController | 已落地 |
| partners（往來對象） | ✅ PartnerController | 已落地 |
| parts（零件） | ✅ PartController | 已落地 |
| part-brand（零件品牌） | ✅ PartBrandController | 已落地 |
| part-group（零件群組） | ✅ PartGroupController | 已落地 |
| part-relation（零件關聯） | ✅ PartRelationController | 已落地 |
| part-model（零件↔車型） | ✅ PartModelController | 已落地（NX01-16 part↔model 改革） |
| car-brand（車廠品牌） | ✅ CarBrandController | 已落地 |
| engine（引擎） | ✅ EngineController | 已落地 |
| transmission（變速箱） | ✅ TransmissionController | 已落地 |
| drivetrain（驅動方式） | ✅ DrivetrainController | 已落地 |
| model（車型） | ✅ ModelController | 已落地 |
| model-type（車型類別） | ✅ ModelTypeController | 已落地 |
| brand-code-rule（品牌碼規則） | ✅ BrandCodeRuleController | 已落地 |
| bulletins（公告） | ✅ BulletinController | 已落地 |
| phonetic-dictionary（注音字典） | ✅ PhoneticDictionaryController | 已落地 |
| country（國家） | ❌ 無 nx01 controller | ⚠️ partial（前端有頁、後端 controller 未註冊於 `nx01.module`） |
| location（據點） | ❌ 無 nx01 controller | ⚠️ partial（同上） |
| role-view（職務權限視圖） | ❌ 無 nx01 controller | ⚠️ partial（同上） |
| `[segment]`（動態 fallback） | — | 動態路由 |

> 後端另有 `WarehouseTypeController` + `PartVersionController`（已註冊於 `nx01.module`、前端無獨立 base 頁、推測內嵌於 warehouses / part 詳細）。

### 3.3 結論

- **21 個主檔前後端全接通**（= brief「推測 21 個」基本吻合）
- **4 個前端有頁但後端 nx01 controller 缺**：`user-warehouse`（已知 bug、§8）、`country`、`location`、`role-view`（推測為降階/規劃中、需 Hank 確認是否走其他模組）
- 出處：`apps/nx-api/src/nx01/nx01.module.ts`（controllers 陣列）vs `apps/nx-ui/src/app/dashboard/base/*`
- 設計鐵律：**系統不能 hard delete**，D 鍵 = 軟刪除（`setActive=false`）→ [[project_no_hard_delete]]

---

## §4 Master Shell 範式 Audit

根目錄：`apps/nx-ui/src/features/master-shell/ui/`

### 4.1 元件清單（磁碟真相：9 個 .tsx，共 2025 行）

| 檔案 | 行數 | 角色 | 引入階段 |
|---|---|---|---|
| `MasterShell.tsx` | 469 | 主外殼（sidebar + toolbar + tab + 頁面骨架） | Stage 1-A.7（commit 55） |
| `EntityPickerDialog.tsx` | 359 | **泛型 `<T>` 實體選擇器**（跨主檔通用 picker） | 軌 B B1（commit 606bfc6） |
| `ErpToolbar.tsx` | 341 | ABCDEF 工具列 + Alt 快捷 + 批次 props | Stage 1-A.4（commit 52） |
| `MasterTable.tsx` | 314 | 泛型列表（zebra / 鍵盤導航 / 綠紅燈狀態） | Stage 1-A.5（commit 53） |
| `MasterDetail.tsx` | 143 | 詳細頁元件家族（DetailTable rows 已升 ReactNode） | Stage 1-A.6（commit 54） |
| `FormField.tsx` | 117 | 表單欄位 | 後續階段 |
| `ConfirmDialog.tsx` | 115 | 確認對話框（軌 C 擴 secondaryAction → 3-way） | Stage 1-A.3（commit 51） |
| `SearchPanel.tsx` | 94 | Alt+F inline 搜尋條（300ms debounce） | Stage 1-B.2（commit 59） |
| `ToastStack.tsx` | 73 | ToastStack 元件 **+ `useToast` hook** | Stage 1-A.2（commit 50） |

### 4.2 brief「7 元件 + 1 hook + EntityPickerDialog<T>」對照

- handoff 文件原文：「抽 **7 個共用 shell 元件 + 1 個 hook**」（master-shell-handoff §0）
- 真相：**`useToast` hook 內嵌於 `ToastStack.tsx`**（非獨立檔）→ 「1 hook」= useToast ✅
- 「7 元件」對應 Stage 1-A 原始抽離 + 後續（ConfirmDialog / ErpToolbar / MasterDetail / MasterTable / MasterShell / SearchPanel / FormField）；`EntityPickerDialog<T>` 為軌 B 後加的第 8 個泛型元件 ✅
- brief 框架與磁碟真相一致

### 4.3 跨主檔可重用性評估

| 元件 | 可重用性 | 說明 |
|---|---|---|
| MasterShell / ErpToolbar / MasterTable / MasterDetail / ConfirmDialog / SearchPanel / ToastStack / FormField | ⭐⭐⭐ 高 | 設計即為「所有主檔可套」、目前 USER 主檔完整驗證 |
| EntityPickerDialog`<T>` | ⭐⭐⭐ 高 | caller 提供 getId/getLabel/getDescription + search mapper，已用於 Role/Warehouse picker |
| 軌 C 新範式（staged write + isDirty + 3-way confirm + 4 攔截點） | ⭐⭐⭐ 高 | 可直接複用於零件/客戶主檔（軌 C 文件 §5 明列） |

- **目前僅 USER 主檔完整套用**；其他主檔（零件/客戶等）尚未套新 shell（推測仍用舊範式或部分套）
- 出處：`docs/_team/master-shell-handoff-2026-05-21.md`、各軌 merge-verify §5

---

## §5 USER 主檔累積 Audit（重點）

USER 主檔是當前最成熟的範式試驗田、累積 4 階段、**完成度 98%**。

### 5.1 軌 0 — Lab 探索（鋼鐵星球範式）

- 任務：`TASK-MASTER-TABLE-POLISH`，**commit 41~71（handoff 載共 41 commit）**
  - ⚠️ brief「31 commit」與 handoff「41 commit」有出入；git log `--all` 計 84 筆（含 feature 分支 + 主線重複），**以 handoff 41 commit（commit 41~71）為準**
- 階段（master-shell-handoff §2）：
  - **A 範式探索（lab）** commit 41~48：`/lab/users` 沙盒迭代鋼鐵星球視覺 + ERP 工具列（含 44.x 鋼鐵質感、43.x 鍵盤導航等子 commit）
  - **B Shell 抽離** commit 49~55：抽 7 元件 + 1 hook 進 master-shell
  - **C 推 production** commit 56~58：`/dashboard/base/users` 換掉舊 `BaseUserMasterView`（1640 行 modal 範式）
  - **D API 全接通** commit 59~69：search / paging / setActive / updateUser / createUser / listUserRoles / listUserWarehouses
  - **E bug fix** commit 70~71：400 錯誤「[object Object]」+ create/update 欄位名對齊
- 鋼鐵星球視覺鐵律：取消主題切換、鎖深灰 + 琥珀；綠燈/紅燈狀態 + ping 脈衝；金屬高光 gradient
- 出處：`docs/_team/master-shell-handoff-2026-05-21.md`、`docs/_team/task-master-table-polish-merge-verify.md`

### 5.2 軌 A — 清爽快收

- 任務：`TASK-USER-MASTER-ITERATE-TRACK-A`，commit A1 `8509ba5` + A2 `3994f73`（4 unique files、+18/-10）
- §1 使用者職務/據點設定 **降階為「批次工具」**（`minPlan: 'PRO'` + sidebar 移除）→ 業界改革 #22 v1.2 累積
- §2 Tab 切換工具列動態變化（「顯示停用」只在瀏覽 tab 顯示）
- Tag：`v1.6.0-user-master-track-a-closure`（→ merge commit `8a04315`）
- 出處：`docs/_team/task-user-master-iterate-track-a-merge-verify.md`

### 5.3 軌 B — Stage 2 補完（Picker / 批次）

- 任務：`TASK-USER-MASTER-ITERATE-TRACK-B`，commit B1~B5（5 commit、+764/-30）
- B1 `EntityPickerDialog<T>`（359 行新增、進 master-shell）
- B2 接 RolePicker（assignUserRole 真接 API）
- B3 擔任職務 row 操作（設為主要 / 移除）
- B4 接 WarehousePicker + 隸屬倉庫 row（⚠️ **此處引入 user-warehouse hidden bug**，見 §8）
- B5 selectionMode 批次啟用/停用 串 setUserActive
- ⚠️ 軌 B **重大 bug**：Picker 確認/row action **即時打 API**，按 C 取消後 DB 已寫入無法復原 → 軌 C C1 修正
- 出處：`docs/_team/task-user-master-iterate-track-b-merge-verify.md`

### 5.4 軌 C — dirty state + staged write + 中文 picker（最終態）

- 任務：`TASK-USER-MASTER-ITERATE-TRACK-C`，commit C1~C4（2 unique files、+488/-202）
- **C1 staged write 架構**：4 關聯操作改 staged，`performSave` 統一 apply（修軌 B 重大 bug）
- **C2 dirty state**：`isDirty` useMemo + **4 攔截點**（Tab 切換 / 左欄返回 / ESC / beforeunload）+ **3-way ConfirmDialog**（儲存後離開 / 丟棄 / 取消）
- **C3 hard delete 紀律 known issue 揭露**（純 wording）：backend stays soft、frontend「移除」→「撤銷」
- **C4 picker 中文化**：主標只顯示中文名稱（移除英文代碼前綴）、英文代碼降副標（搜尋仍可用）
- Tag：`v1.6.2-user-master-track-c-closure`（→ merge commit `34b0baf` = **當前 HEAD**）
- 出處：`docs/_team/task-user-master-iterate-track-c-merge-verify.md`

### 5.5 完成度 98% — 剩餘 2% 真相

軌 C §4.2 + §6 明列「未動 / Hank backend scope」：

1. **`user-role.service.revoke()` 仍 soft delete**（Crown 需求 3 要 hard delete）→ §8
2. **user-warehouse 後端 module 不存在**（軌 B B4 hidden bug、前端 `revokeUserWarehouse` 會 404）→ §8
3. 批次啟用/停用（B5）未 staged 化（刻意、屬批次工具情境）

→ 這 2% 即「Backend known issue」、正是 §11 建議首發軌。
→ closure 累積見 [[project_user_master_closure]]

---

## §6 NEXORA 紀律累積 Audit

### 6.1 CLAUDE.md 內容真相

- ⚠️ **已於 2026-05-15 廢棄**，內容整合進 `docs/PROJECT_RULES.md`
- 保留為 stub，對齊 Claude Code / Cursor IDE 自動讀取慣例
- 必讀順序：PROJECT_CONTEXT → PROJECT_RULES（Part I + Part III）→ git-state → worklog → nxXX
- 出處：`CLAUDE.md`（17 行 stub）

### 6.2 規範體系

- `docs/PROJECT_RULES.md`（54KB）：Part I 共通 + Part II（可跳）+ Part III Hank 段
- `.cursorrules`（2KB，root）：Cursor IDE 載體規則
- 紀律標記體系（merge-verify 文件高頻引用）：
  - **§I.6.3** 揭露不完整尾標
  - **§I.6.5 A041** 精確 commit count
  - **§III.8.7 §G.9** 通配 grep verify
  - **§I.5 / §A041 / Q-RHYTHM-2** 等節奏紀律
- 「A 系列」= Alex 失誤紀錄編號（branch `feature/alex-failure-*`、`a037`~`a045`）；與「業界改革 #」為**不同編號體系**（重要區分）

### 6.3 merge-verify 文件累積範式

每軌結束產出 `*-merge-verify.md`，固定結構：commit A041 精確表 → 變更檔案 audit → 設計決策/範式 → 風險揭露（typecheck / 未測 / 風險評估）→ 範式建立 → 後續。USER 主檔三軌（A/B/C）皆完整產出。

---

## §7 業界改革候選累積 Audit

### 7.1 重要真相：無單一正典清單

⚠️ **audit 未在 docs/ 找到「13 個業界改革候選」的單一正典列舉檔**。候選以 `業界改革 #N` 形式**散落各 task 文件/worklog/feasibility inline 追蹤**，無 charter master list。

- brief「推測 13 個」**與實證不符**：可見編號達 **#26**
- branch `feature/a043-a045-leftovers-and-charter` 的「charter」推測指 **Alex-failure A 系列憲章**、非業界改革清單
- **建議 Alex**：若需正典清單，應新建 `docs/_team/industry-reform-charter.md` 集中管理（目前是技術債）

### 7.2 實證可見的候選 + status

| # | 主題（從 docs 還原） | Status | 出處 |
|---|---|---|---|
| #2 | NX07 醫療管理 / 職災追蹤 | ✅ 已落地 | nx07-summary / worklog 主題 |
| #17 | 手機介面 = NEXORA 亮點（Bottom Dock 統一範式） | ✅ 累積落地 | table-polish merge-verify |
| #21 | 封測二階（推測） | 🔵 推測/預備 | grep `#21 封測二階` |
| #22 | **主檔分區範式 v1.2 + 業務員 daily UX** | ✅ **已落地 ⭐⭐⭐**（最成熟、貫穿 USER 主檔三軌） | 多檔 |
| #23 | 組織架構 6 主檔（公司/部門/成本中心） | 🟡 規劃中/預備 | hub-polish-feasibility |
| #24 | FilterBar / 族群篩選 | ⚠️ **v1 MVP 落地後設計回退**（撤回、shared 元件留給 V2） | table-polish §13 |
| #25 | （軌 B 提及候選、主題未明） | 🔵 候選 | track-b merge-verify |
| #26 | **Contextual Navigation**（NavPlanetMenu + PageHeader 簡化） | ✅ v1 落地 | table-polish §14 |
| — | NX06：AR 命中率 + DnHandover 動態交接 + BCG matrix | ✅ 落地（3 改革 dashboard） | worklog 主題 27 |
| — | NX09：VIN NHTSA 混合 + 維修 SOP 結構化 + RepairSop↔PartModel wire | ✅ 落地（3 候選全落地） | worklog 主題 33 |
| — | NX10：八角驅動 3 跨模組 wire（動態交接/業績排行/醫章加碼） | ✅ 落地 | worklog 主題 IMPL-02 |
| — | part ↔ model 結構化關聯（part_model） | ✅ 落地（NX01-16） | PROJECT_CONTEXT |

> 部分模組改革（NX06/NX09/NX10）用「3 業界改革」描述但未配 `#N` 編號 → 編號體系本身不一致，再次佐證需正典化。

---

## §8 Backend Known Issue Audit（重要）

### 8.1 Issue ① — `user-role.service.revoke()` 為 soft delete（確認）

**檔案**：`apps/nx-api/src/nx01/user-role/user-role.service.ts`

```ts
async revoke(user, id, _dto) {
  // ... findFirst 確認存在
  const updated = await this.prisma.nx01UserRole.update({
    where: { id },
    data: { isActive: false, revokedAt: new Date() },   // ← soft delete
    select: SEL,
  });
  return this.mapRow(updated);
}
```

- **真相**：方法名為 `revoke` 但**實作為軟刪除**（`isActive=false` + `revokedAt`），非 `prisma.delete()`
- 與專案鐵律「系統不能 hard delete」[[project_no_hard_delete]] 一致；但與 Crown 需求 3「hard delete」衝突
- 前端軌 C 已誠實揭露：wording 改「撤銷」（對齊 soft delete）、import block 上方加 `⚠️ known issue` 註解
- **修復路徑**（若 Crown 確定要 hard delete）：service 改 `prisma.nx01UserRole.delete({ where: { id } })`；前端 API 介面不變、wording 可再升回「移除」
- ⚠️ **決策點**：hard delete 與專案「不刪資料」鐵律牴觸，**建議先與 Crown/Alex 對齊政策**再動（可能應維持 soft、改的是 Crown 需求而非程式）

### 8.2 Issue ② — user-warehouse 後端 module 缺失（完全確認）

| 位置 | 存在？ | 證據 |
|---|---|---|
| `apps/nx-api/src/nx01/user-warehouse/` | ❌ **不存在** | `find src` 無結果 |
| `nx01.module.ts` 註冊 UserWarehouse controller/service | ❌ **未註冊** | module providers/controllers 陣列無此項 |
| `apps/nx-api/dist/nx00/user-warehouse/` | ⚠️ **殘留** | `dist/nx00/user-warehouse/{controllers,dto,services,module}.js` |
| `apps/nx-ui/src/features/base/api/user-warehouse.ts` | ✅ 前端 client 存在 | find |
| `apps/nx-ui/src/app/dashboard/base/user-warehouse/` | ✅ 前端頁存在 | find |

**真相還原**：
- 後端曾有 `nx00/user-warehouse` 模組（舊命名體系）→ 模組重構為 `nx01` 時 **user-warehouse 未一併遷移到 `src/nx01`**，只留 `dist/nx00`（舊 build 殘留、非當前 source 產物，因 `src/nx00` 已不存在）
- 當前 `nest build` 只會產生 `dist/nx01/*`（無 user-warehouse）→ **執行期沒有任何 live controller 服務此 endpoint**
- 後果：前端 `assignUserWarehouse` / `revokeUserWarehouse` / list 呼叫 → **404**（軌 C §4.2 已揭露）
- 引入點：軌 B B4（commit `0bc2a73`）接 WarehousePicker 時假設後端存在

**修復路徑**（雙步）：
1. 在 `src/nx01/` 新建 `user-warehouse/{controller,service,dto}`（可參照 `user-role` 範式：list/getById/assign/revoke/setPrimary/setActive，操作 `Nx01UserWarehouse` 模型）
2. 註冊進 `nx01.module.ts`（controllers + providers）
3. （hygiene）清除 `dist/nx00` 殘留（屬建置產物、可重建）
- 對齊 soft delete 鐵律：revoke 同走 `isActive=false`（與 user-role 一致）

---

## §9 Docs 累積 Audit

### 9.1 docs/_team/ 全清單（28 檔）

| 類別 | 檔案 |
|---|---|
| **基礎設施** | `git-state.md`、`worklog.md`（157KB）、`system-architecture.md` |
| **USER 主檔系列** | `master-shell-handoff-2026-05-21.md`、`task-master-table-polish-merge-verify.md`、`task-user-master-iterate-feasibility.md`、`task-user-master-iterate-track-a-merge-verify.md`、`-track-b-`、`-track-c-` |
| **master hub 系列** | `task-master-data-center-audit.md`、`task-master-hub-improve-merge-verify.md`、`task-master-hub-polish-feasibility.md`、`task-master-hub-polish-merge-verify.md` |
| **auth 系列** | `task-auth-error-code-merge-verify.md`、`task-auth-ui-iterate-01-merge-verify.md`、`-v2-`、`nexora-error-code-spec.md`、`login-page-feature-audit.md` |
| **crown 驗證系列** | `crown-local-login-fix-merge-verify.md`、`-v2-deep-verify.md`、`crown-regression-verify-20260519.md` |
| **audit 系列** | `ui-audit-01.md`、`ui-audit-02-crud-pattern.md`、`nx-theme-audit.md`、`nx02-04-flow-audit-01.md`、`nx06-pwa-audit-01.md` |
| **其他** | `upload-cleanup-list.md` |
| **★ 本報告** | `NEXORA_PROJECT_AUDIT_2026-05-26.md` |

### 9.2 merge-verify 系列狀態

- USER 主檔三軌（A/B/C）merge-verify 文件**齊全且詳實**（含 A041 精確 commit count + 風險揭露 + 未測清單）
- 範式品質高、為三人協作守門的核心產物

### 9.3 git-state.md / worklog.md 狀態 → 見 §10（hygiene）

---

## §10 Hygiene 待辦 Audit

### 10.1 git-state.md A 段快照過期（確認 brief 推測）

- A 段快照時間：**2026-05-18**、HEAD = **`f9a75bd`**（TASK-NX09-IMPL-02 merge / v1.5.0）
- 當前實際 HEAD = **`34b0baf`**（落後 8+ 個 task 軌）
- A.1 本地分支總覽、A.2 Tag（只到 `phase1-complete`）、A.3 工作樹 **全部過期**
- Tag 表完全沒有 v0.3~v1.6 系列（實際 `git tag` 有 18 個 tag）
- **待辦**：更新 git-state.md A~D 段至 `34b0baf`（含 18 tags + USER 主檔三軌 + 分支清理建議）
- 出處：`docs/_team/git-state.md` §A

### 10.2 worklog.md 缺 USER 主檔全段（確認）

- worklog 最後一條：**主題 33**（NX09、2026-05-18）
- ⚠️ **完全沒有** TASK-MASTER-TABLE-POLISH（commit 41~71）、TASK-USER-MASTER-ITERATE TRACK-A/B/C 的條目
- grep `TRACK-A|TRACK-B|TRACK-C|TASK-USER-MASTER-ITERATE|TASK-MASTER-TABLE-POLISH` 於 worklog → **0 命中**
- **待辦**：補主題 34+（USER 主檔範式 + master-shell 抽離 + 三軌）
- 出處：`docs/_team/worklog.md`（tail = 主題 33）

### 10.3 其他 hygiene 待辦

| 項 | 說明 | 級別 |
|---|---|---|
| `dist/nx00` 殘留 | 舊 build 產物（含 user-warehouse 等死碼）、與 src 不一致 | 中（清理 + rebuild） |
| 前端 `features/nx00` 命名 | 與後端 nx01 命名不對齊、推測遺留 | 低（需確認再動） |
| `.tmp-docker-test/` | root 暫存目錄（4/3 建立） | 低 |
| 已 merge 分支未刪 | git-state §A.1 多條標「可考慮刪除」、且該清單本身已過期 | 低（待 git-state 更新後一併處理） |
| `country` / `location` / `role-view` 後端 controller 缺 | 需確認是否走其他模組或待落地 | 中（需 Hank 確認） |
| 業界改革無正典清單 | §7、建議集中管理 | 中（文件債） |

> ⚠️ 本報告為純 audit，以上 hygiene **未執行任何修改**（不 push / 不 migrate / 不 rm）。

---

## §11 結論與建議首發軌

### 11.1 主要發現摘要

1. **技術棧現代且一致**：Next 16 / React 19（含 Compiler）/ NestJS 11 / Prisma 7 / pnpm 10 / Turbo 2、172 model、NX01~NX10 模組制成熟。
2. **USER 主檔 = 範式試驗田**：鋼鐵星球視覺 + master-shell 9 元件 + 軌 A/B/C 完整紀律（staged write + dirty state + 3-way confirm），**98% closure**、tag v1.6.2 = HEAD。
3. **master-shell 高可重用**：但目前僅 USER 主檔完整套用，其他主檔待擴散。
4. **2 個明確 backend known issue**（§8）= 剩餘 2%：user-role.revoke soft delete（政策決策點）+ user-warehouse module 缺失（404 bug）。
5. **文件 hygiene 落後**：git-state.md / worklog.md 停在 2026-05-18，缺整個 USER 主檔軌（§10）。
6. **業界改革無正典清單**：編號達 #26、散落 inline、brief「13 個」不符（§7）。

### 11.2 建議首發軌（Claude Code 新範式測試）

> **建議：`TASK-USER-WAREHOUSE-BACKEND-CLOSURE`** — 補完 user-warehouse 後端 module（§8 Issue ②）

| 評估項 | 內容 |
|---|---|
| **為何首發** | 規模小、邊界清晰、有現成範式（`user-role` module 可 1:1 參照）、修復明確 404 bug、不碰政策爭議 |
| **規模推測** | ⭐ 小（~1 controller + 1 service + 1 dto + module 註冊、推測 3~5 檔 / ~200 行 / < 2 小時） |
| **範式價值** | 驗證 Claude Code「自由發揮 + 完成操作手冊」範式：grep 現況 → 仿 user-role → typecheck → merge-verify 文件，完整跑一輪三人協作守門 |
| **風險** | 低（純新增、不改既有行為、soft delete 對齊鐵律） |
| **前置** | 確認 `Nx01UserWarehouse` schema 欄位（schema 已有此 model）+ 前端 `user-warehouse.ts` client 期望的 endpoint 形狀 |

> **次選**：`user-role.revoke` hard delete —— ⚠️ **不建議首發**，因牽涉「系統不能刪資料」鐵律的政策決策，應先由 Crown/Alex 拍板政策方向，非單純工程任務。

> **第三**：文件 hygiene（git-state + worklog 補登）—— 適合作為任一軌的「軌後收尾」綁定，不必獨立首發。

---

## 揭露（Hank stop）

- **報告檔案路徑**：`docs/_team/NEXORA_PROJECT_AUDIT_2026-05-26.md`（本檔、唯一新增/修改檔）
- **未執行任何 destructive 命令**（無 push / migrate / rm）；純 audit + 單一報告產出
- **方法論**：全程 git/grep/find/cat 實證；推測處已明確標「推測」/「⚠️」
- **待 Crown/Alex 對齊的決策點**：
  1. user-role hard delete 政策（§8.1）—— 改程式 or 改需求？
  2. 業界改革正典清單是否要建（§7）
  3. country/location/role-view 後端歸屬（§3.3 / §10.3）
- **建議首發軌**：`TASK-USER-WAREHOUSE-BACKEND-CLOSURE`（§11.2）
