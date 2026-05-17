<!-- docs/nx09/spec/impl/nx09-impl-02-plan.md -->

# TASK-NX09-IMPL-02 — 亞羅特色軌（VIN + 維修 SOP）拓樸排序 + Migration 拆軌計畫（v0.1.0）

> 性質：實作前置計畫文件、**Q-RHYTHM-2 完整自主授權**（Crown + Alex 預批、Hank 全軌連跑、僅 Final merge 介入）
> 撰寫者：Hank
> 日期：2026-05-18
> 分支：`feature/nx09-yaro-feature`（自 main HEAD `e016b68` 切出、NX09-AUDIT-02 後）
> 對應依據：[nx09-overview v0.2.0](../intent/nx09-overview.md) + [nx09-audit-02](../../nx09-audit-02.md) + Crown 7 戰略題拍板 closure（c/a/a/b/b/a/a）
> 紀律：Q-RHYTHM-2 第九次落地、對齊 NX02~NX10 IMPL-02 範式

---

## §0 計畫文件性質

⭐ **本軌戰略意義**：
- NEXORA v1.4 八角完整化後深化期第二軌（接續 NX10 雙軌全 closure）
- 業界改革候選 ⭐⭐⭐ 全落地：VIN NHTSA + 手動混合 / 維修 SOP 結構化 / RepairSop↔PartModel 內部 wire
- NX09 雙軌 closure → 第二個「IMPL-01 + IMPL-02 全 closure」模組（前為 NX10）

Q-RHYTHM-2 範式下、plan 完成即進 Phase 1 連跑。

**Hank 紀律承諾**：plan commit 後全軌連跑、僅以下情境 stop：
- 業務語意衝突（overview v0.2.0 沒提到的新需求）
- NHTSA API 規範變動（需 key / 限制 / 不可用）
- 既有 NX01 vehicle chain（CarBrand/Model/PartModel）需動到（重大破壞、Crown 拍板）
- 全軌完成（stop 給 Crown + Alex 驗收 merge-verify）

---

## §1 範圍 8 業務功能（對齊 overview v0.2.0 §4.1）

| # | 功能 | 既有狀態 | 本軌動作 |
|---|---|---|---|
| 1 | VinLookup 新表 + service ⭐⭐⭐ | ❌ 0（schema 全棧無 VIN）| Phase 1+3：M1 新表 + Phase 3 service / controller / DTO |
| 2 | NHTSA API 整合（VIN decode）⭐⭐⭐ | ❌ 0 | Phase 3：HttpService + ENV gate + fallback |
| 3 | VinLookup → Model + PartModel 對照 | ✅ NX01 chain 完整、純讀 | Phase 3：service query 復用既有 PartModel |
| 4 | RepairSop 新表 + service ⭐⭐⭐ | ❌ 0 | Phase 1+4：M1 新表（steps JSON + tools + warnings + photos）+ Phase 4 service |
| 5 | 4 子表 endpoint 補（ArticleTag / MeetingAttendee / Minutes / Action）| ⚠️ schema-only | Phase 2：CRUD endpoint（list/get/create/update/delete）|
| 6 | RepairSop ↔ PartModel 內部 wire ⭐⭐⭐ | ❌ 0 | Phase 5：雙向查詢 service（料件→SOP / SOP→料件）|
| 7 | UI placeholder + menu.nx09 升 | ⚠️ IMPL-01 6 items | Phase 6：4 新 placeholder + menu 升至 10 items |
| 8 | 治理檔補完（plan/summary/worklog/merge-verify）| ❌ | Phase 7 |

---

## §2 拓樸排序 5 層

### L1 — schema 基礎層（Phase 1、M1 新 2 表）

⭐ **Hank Q-H1 自決**：既有 11 model（IMPL-01 後）結構 0 動 + 既有 NX01 vehicle chain 0 動。新增 2 表 1 軌 migration：

#### M1 — `nx09_impl_02_m1_vin_lookup_and_repair_sop`

**Nx09VinLookup**（VIN 17 碼結構化主檔）：
- `id` VARCHAR(15) PK（gen_nx09_vin_lookup_id()）
- `tenantId` VARCHAR(15) FK
- `vin` VARCHAR(17) — UNIQUE per tenant
- `carBrandId` VARCHAR(15) FK Nx01CarBrand?（NHTSA decode 出可空）
- `modelId` VARCHAR(15) FK Nx01Model?（業務員可後補關聯）
- `source` VARCHAR(10) — `API` / `MANUAL`
- `decodedAt` Timestamp?（NHTSA decode 時間）
- `rawApiResponse` Text?（NHTSA raw JSON 留存、debug + 補錄用）
- `notes` VARCHAR(500)?（業務員備註）
- `isActive` Boolean default true
- audit 6 欄（createdAt/By + updatedAt/By + tenantId FK reverse）

**Nx09RepairSop**（維修 SOP 結構化主檔）：
- `id` VARCHAR(15) PK（gen_nx09_repair_sop_id()）
- `tenantId` VARCHAR(15) FK
- `code` VARCHAR(30) — tenant unique（如 `OIL-CHG-001`）
- `title` VARCHAR(200)
- `category` VARCHAR(20) — `ENGINE`/`BRAKE`/`ELECTRIC`/`MAINTAIN`/`SUSPENSION`/`AC`/`TRANS`/`OTHER`
- `steps` Text（JSON 陣列：`[{seq, description, tool, warning, imageUrl}]`）
- `tools` Text?（JSON 陣列）
- `warnings` Text?（JSON 陣列）
- `estimatedMinutes` Int?
- `photos` Text?（JSON 陣列 URL）
- `carModelFilter` VARCHAR(15)? FK Nx01Model?（適用車型過濾、可空 = 通用）
- `difficulty` SmallInt default 1（1-5）
- `isActive` Boolean default true
- `remark` VARCHAR(500)?
- audit 6 欄

#### M1.5 — RepairSop ↔ PartModel 關聯（雙向 wire 後端）

考慮 N:M 關聯設計選擇：
- **選項 A**：JSON 陣列存 `Nx09RepairSop.partModelIds`（簡單但無 FK 完整性）
- **選項 B** ⭐：**獨立 link 表 `Nx09RepairSopPartModel`**（sopId + partModelId UNIQUE、有 FK 完整性 + 反向查詢 index）

⭐ **Hank Q-H2 自決**：採 **B 獨立 link 表**（對齊既有 Nx01PartModel link 表範式 + NX09KmArticleTag 多對多範式）：

**Nx09RepairSopPartModel**（RepairSop ↔ PartModel link 表）：
- `id` VARCHAR(15) PK
- `repairSopId` VARCHAR(15) FK
- `partModelId` VARCHAR(15) FK Nx01PartModel
- `notes` VARCHAR(200)?（為什麼這料件適用此 SOP）
- audit 2 欄（createdAt/By）
- UNIQUE (`repairSopId`, `partModelId`)

**性質**：純 additive、新 3 表（VinLookup + RepairSop + RepairSopPartModel）+ 0 既有 ALTER + 0 backfill 衝突。

### L2 — 4 子表 endpoint 補（Phase 2、Crown Q3=a 全補）

⭐ **Hank Q-H3 自決**：對齊 IMPL-01 KmTag/Feedback 範式、純 CRUD 5 endpoint × 4 子表 = 20 endpoint。但部分子表 schema 不適 update（如 ArticleTag link 表純 create/delete），實際範圍：

- **Nx09SubTablesService 升級**（既有 service 已含 3 子表 4 endpoint、本軌加擴）
- 補 endpoint：
  - **ArticleTag**：list + create + delete（attach/detach、不 update）= 3 endpoint
  - **MeetingAction**：list + get + create + update + delete = 5 endpoint
  - **MeetingAttendee**：list + create + update + delete = 4 endpoint（attend status patch）
  - **MeetingMinutes**：list + get + create + update + delete = 5 endpoint

預估 +17 endpoint 補 4 子表。

### L3 — VinLookup service + NHTSA 整合（Phase 3）

- **Nx09VinLookupService**：
  - listMine（依 tenantId + filter source）
  - getById
  - getByVin（VIN UNIQUE 查、業務員手動入 VIN 查既有 record）
  - decodeFromNhtsa（HTTP GET NHTSA + 解析 carBrand/model 對照既有 NX01 + 寫 VinLookup）
  - upsertManual（業務員手動補資料、source='MANUAL'）
  - patch / delete

- **Nx09VinLookupController** `/nx09/vin-lookup`：
  - GET `/` list
  - GET `/:id` get
  - GET `/by-vin/:vin` getByVin
  - POST `/decode` decodeFromNhtsa（body: {vin}）
  - POST `/` manual create
  - PATCH `/:id` patch
  - DELETE `/:id` delete
  - GET `/:id/parts` → 走 modelId → Nx01PartModel → parts 列表（業界改革核心 query）

預估 8 endpoint。

#### NHTSA 整合範式

- **HttpService** 走 NestJS `@nestjs/axios`（既有 NX04 sales-performance 等模組已用 axios）
- **ENV**：`NHTSA_API_ENABLED=true`（預設 true、deploy 0 設定）
- **fallback**：try/catch wrap、API 失敗 / timeout / 404 → return `source='MANUAL'` + null fields + log warn
- **brand 對照**：NHTSA `Make` 欄位 → 比對 Nx01CarBrand.nameEn（case-insensitive）、無對應 → 留 null
- **timeout**：5 秒（亞洲查不到時 graceful）

### L4 — RepairSop service（Phase 4）

- **Nx09RepairSopService**：
  - list（含 category filter + carModelFilter filter）
  - getById（include steps + tools + photos）
  - create / patch / delete
  - findByCarModel（依車型查可用 SOP、業界改革 query）

- **Nx09RepairSopController** `/nx09/repair-sop`：
  - GET `/` list
  - GET `/:id` get
  - GET `/by-model/:modelId` findByCarModel
  - POST `/` create
  - PATCH `/:id` patch
  - DELETE `/:id` delete

預估 6 endpoint。

### L5 — RepairSop ↔ PartModel 內部 wire（Phase 5、業界改革 ⭐⭐⭐）

- **Nx09RepairSopPartModelService**（link 表 + 雙向查詢）：
  - linkParts（POST：SOP 關聯多個 PartModel）
  - unlinkPart（DELETE：解除單一關聯）
  - listSopsByPart（partId / partModelId → SOP 列表、業界改革查詢方向 1）
  - listPartsBySop（sopId → 料件清單、業界改革查詢方向 2）

- **Nx09RepairSopController** 擴 + Nx09VinLookupController 共用：
  - POST `/repair-sop/:id/parts` linkParts
  - DELETE `/repair-sop/:id/parts/:partModelId` unlinkPart
  - GET `/repair-sop/:id/parts` listPartsBySop（含 part snapshot + part_model fitLevel）
  - GET `/repair-sop/by-part-model/:partModelId` listSopsByPart

預估 4 endpoint。

### L6 — UI 4 placeholder + menu.nx09 升（Phase 6）

新增 4 placeholder：
- `/dashboard/nx09/vin-lookup` ⭐⭐⭐
- `/dashboard/nx09/repair-sop` ⭐⭐⭐
- `/dashboard/nx09/article-tag`（標籤管理）
- `/dashboard/nx09/meeting-detail`（會議 4 子表整合入口、Action + Attendee + Minutes）

menu.nx09.ts 升級：
- 既有 6 items → 10 items（分 2 group：EIP 基礎 + 亞羅特色 ⭐⭐⭐）

升 workspace desc（v1.0 IMPL-01 → v2.0 IMPL-02 closure）。

---

## §3 Migration 拆軌策略（A041 估 = **1 軌 schema**）

對齊 Crown Q5=b（跨模組 wire 後續軌）+ Q4=b（auto-version 後續軌）= 本軌純加 2 主表 + 1 link 表、0 ALTER 既有。

| 軌 | migration | 範圍 |
|---|---|---|
| M1 | `nx09_impl_02_m1_vin_lookup_and_repair_sop` | 新 3 表（VinLookup + RepairSop + RepairSopPartModel link）+ ID generator function × 3 + index |

---

## §4 commit 拆軌（A041 估 = **8 commit**、命中 Crown 估 7-10 預算 80%）

| Phase | commit | 範圍 |
|---|---|---|
| Phase 0 | 1 | plan v0.1.0 + overview v0.2.0 連帶 commit（本檔）|
| Phase 1 | 1 | M1 schema migration（3 新表 + ID generator + Prisma schema）|
| Phase 2 | 1 | 4 子表 endpoint 補（ArticleTag + 3 Meeting 子表）|
| Phase 3 | 1 | VinLookup service + NHTSA HttpService 整合 + DTO + controller |
| Phase 4 | 1 | RepairSop service + DTO + controller |
| Phase 5 | 1 | RepairSop ↔ PartModel 雙向 wire service + controller endpoints |
| Phase 6 | 1 | UI 4 placeholder + menu.nx09 升 10 items + workspace desc |
| Phase 7 | 1 | docs（summary v2.0 + worklog 主題 3 + _team 主題 33 + merge-verify）|

⭐ 8 commit + 1 收尾 merge = 9、命中 Crown 估 7-10 預算 80%、命中 Hank audit-02 §6.1 推薦組合 100%。

---

## §5 Hank 自決 Q 揭露（Q-H1 ~ Q-H6）

對齊 Q-RHYTHM-2 紀律：

- **Q-H1**：schema 設計（新 3 表 vs 2 表 + JSON）→ **3 表 + link 表（B 選項）**（NX01PartModel 範式對齊、FK 完整性）
- **Q-H2**：RepairSop↔PartModel N:M 設計 → **獨立 link 表 Nx09RepairSopPartModel**（vs JSON 陣列）
- **Q-H3**：4 子表 endpoint 範圍 → **核心 CRUD 全補**（17 endpoint、ArticleTag 3 endpoint 因 link 表本質）
- **Q-H4**：NHTSA fallback 設計 → **try/catch wrap + 5s timeout + log warn、不阻擋 upstream**
- **Q-H5**：brand 對照範式 → **case-insensitive Make 比對 Nx01CarBrand.nameEn、無對應留 null（業務員後補）**
- **Q-H6**：UI placeholder 數 → **4 個**（VinLookup / RepairSop / ArticleTag / MeetingDetail）

---

## §6 風險揭露 + mitigation

| # | 風險 | mitigation |
|---|---|---|
| 1 | NHTSA API 亞洲車型覆蓋率低 | fallback `source='MANUAL'` + log warn、業務員手動補 |
| 2 | NHTSA API 5xx / timeout | try/catch + 5s timeout + return manual mode |
| 3 | VIN 重複（同 tenant 多筆同 VIN）| schema UNIQUE 約束 + service upsertOrPatch 範式 |
| 4 | RepairSop ↔ PartModel link 表規模成長 | UNIQUE (sopId, partModelId) + index 兩端 |
| 5 | ID generator function 命名衝突 | 對齊既有 gen_nx09_*_id() 範式（gen_nx09_vin_lookup_id / gen_nx09_repair_sop_id / gen_nx09_repair_sop_part_model_id）|
| 6 | 既有 IMPL-01 endpoint 行為破壞 | service + controller 全純新建、0 改既有 + tsc 0 error 每 commit 驗 |

---

## §7 邊界揭露（Crown 拍板對齊）

| Crown 拍板 | 本軌實作 |
|---|---|
| Q1=c VIN NHTSA + 手動混合 | ✅ NHTSA decode + MANUAL source 雙路徑 |
| Q2=a RepairSop 新表（不複用 KmArticle）| ✅ Nx09RepairSop 獨立 schema |
| Q3=a 4 子表 endpoint 全補 | ✅ Phase 2 補 17 endpoint |
| Q4=b auto-version 後續軌 | ❌ 本軌不做（TASK-NX09-IMPL-AUTO-VERSION 留 backlog）|
| Q5=b 跨模組 wire 後續軌 | ❌ 本軌不做（TASK-NX09-IMPL-03-CROSS-WIRE 留 backlog）|
| Q6=a RepairSop↔PartModel 內部 wire 本軌做 | ✅ Phase 5 雙向查詢 |
| Q7=a UI 純 stub | ✅ Phase 6 4 placeholder（無真實表單）|

---

## §8 預估 endpoint 增量

| 階段 | 既有 | 新增 | 總 |
|---|---|---|---|
| IMPL-01 closure | 26 | - | 26 |
| Phase 2（4 子表）| 26 | +17 | 43 |
| Phase 3（VinLookup）| 43 | +8 | 51 |
| Phase 4（RepairSop）| 51 | +6 | 57 |
| Phase 5（內部 wire）| 57 | +4 | 61 |
| **IMPL-02 closure** | - | **+35** | **61** |

A041 估：IMPL-02 後 NX09 共 **8 controller / 61 endpoint**（IMPL-01 6/26 + IMPL-02 +2 controller +35 endpoint）。

---

> 文件版本：v0.1.0（NX09-IMPL-02 plan、Q-RHYTHM-2 第九次落地、8 Phase / 1 migration / 預估 +35 endpoint）
> 下次更新觸發：Phase 1 schema migration commit 起算
