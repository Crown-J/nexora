# Railway 上線與資料庫整備 — 計劃書（分段與優先順序）

本文件為**計劃與檢查清單**，不含實作步驟之程式變更說明細節；執行時請依序對照 `packages/db-core` 與部署環境。

**文件狀態**：MW1 範圍（NX00 + NX99）所有決策已全部定案，詳見 §1.2 與各階段定案敘述。NX01～NX07 之 `tenant_id` 策略於各 MW 波段啟動前補齊，不影響 MW1 上線。Seed 策略已於 2026-04-03 重新定案：移除真實客戶租戶（CYTIC），改為 DEMO-LITE / DEMO-PLUS 展示租戶；真實客戶資料一律透過 CSV 匯入工具導入。

**前提**：Railway PostgreSQL 目前為**空庫**（尚未套用 migration）。**P4 已定案採行「MW1 最小 baseline」**（見下方 **階段 4**）：趁無歷史包袱一次整併 migration，之後各 MW 僅疊加標準增量 migration。

**產品策略（模組分段上線）**：將 **NX00～NX07**（及內部 **NX99**）依模組拆成多個波段釋出，以降低單次上線風險。**第一波僅以 NX00 + NX99 規劃、驗證並推上線**；其餘模組待首波穩定後，再依下述「第二波段起之順序」逐段啟用。本檔之 P0～P4 為**橫向工程順序**；**MW（模組波段）為縱向釋出範圍**，兩者搭配使用。

---

## 模組波段總覽（釋出範圍）

### 第一波〔MW1〕— NX00 + NX99

**目標**：主檔／權限／租戶與訂閱等「基座」先上線並穩定（含對應 API、UI、seed、監控與 `tenant_id` 與本波表相關之決策）。

**涵義對照（`schema.prisma` 表前綴）**

| 模組 | 現行主要資料表（舉例） |
|------|------------------------|
| **NX00** | `nx00_user`、`nx00_role`、`nx00_user_role`、`nx00_user_warehouse`、`nx00_view`、`nx00_role_view`、主檔（國別／幣別／零件／品牌／倉儲／往來對象等）、`nx00_bulletin`、`nx00_calendar_event`、`nx00_audit_log` |
| **NX99** | `nx99_tenant`、`nx99_plan`、`nx99_subscription`、`nx99_subscription_item`、`nx99_product_module`、`nx99_product_module_map`、`nx99_release`、`nx99_release_item` |

**不包含（延至後續波段）**：NX01 採購、NX02 庫存、NX03 銷售報價／銷貨、NX04 應收付、NX06 單據連結，以及尚未在 schema 落地之 NX05、NX07。

**實務備註（計劃層級）**

- **DB 與 P4 對齊**：首版上線採 **MW1 最小 baseline** 時，空庫僅建立 **nx00／nx99** 相關表（與已定案之 `tenant_id` 策略）；**舊有 `prisma/migrations` 鏈可封存備查**，不再對空庫套用。後續 nx01～nx07 表於各 MW 以**增量 migration** 追加。若暫時仍為單一 schema 檔，產品面仍可依計畫「**僅開放 nx00+nx99 路由**」驗收 MW1。
- **Seed／CI／E2E**：MW1 驗收時，種子與自動化測試應**對齊產品範圍**（僅寫入／演練 nx00+nx99 相關資料與路由，或明確以環境變數跳過後續模組）。避免「畫面關了 nx01～nx07，但 `db seed` 仍寫入後續模組表」導致驗收邊界模糊。
- **P1（`tenant_id`）** 建議先完成**與 MW1 表相關**之表級清單與簽核；其餘模組表待該模組波段前再補齊，避免首波範圍發散。

**完成判準（MW1）**：Railway 上 nx00+nx99 相關功能可重複驗收通過；監控與回滾策略就緒；再進入第二波段規劃。

---

### 第二波段起之模組順序〔MW2+〕

**約定順序**（前一段穩定後再啟動下一段）：

1. **NX02** — 庫存模組（餘額、流水、盤點、調整等）  
2. **NX01** — 採購模組（詢價／進貨／採退、入庫觸發庫存異動等）  
3. **NX03** — 銷售模組（報價／銷貨／銷退、出庫觸發庫存異動等）  
4. **NX07** — 物流模組（PLUS；揀貨／裝箱／出貨單等；待 schema 落地後依本順序納入）  
5. **NX06** — 共用模組（單據串流、編號規則、狀態機／過帳規則等；現行如 `nx06_doc_link`）  
6. **NX04** — 財務模組（應收／應付、付款紀錄、帳齡等）  
7. **NX05** — 成本與報表模組（統計分析、報表／儀表板；待 schema 落地後依本順序納入）  

**順序助記**：`NX02 → NX01 → NX03 → NX07 → NX06 → NX04 → NX05`（庫存先打底，再採購／銷售／物流，接着共用基礎建設，再財務，最後成本報表）。

**NX06 波段定位（已定案）**

NX01、NX02、NX03 上線時，單據編號與過帳規則各自內建於模組內；NX06 上線時再統一收斂為共用服務。NX06 不是 NX01～NX03 的前置條件，MW 線性順序維持不變。

**NX07（PLUS）功能開關（已定案）**

- **判斷來源**：JWT payload 的 `planCode`，登入時寫入，API 直接取用，不需再查 DB。
- **阻擋層**：後端 NestJS Middleware 統一攔截 NX07 路由（依 `planCode` 判斷）；前端 nx-ui route guard 配合隱藏選單項目。兩層並行，不過度依賴任一方。
- **LITE 租戶誤請求回應**：HTTP 403，錯誤碼 `PLAN_NOT_SUPPORTED`。

#### 模組定義對照（與產品規格一致）

| 模組代碼 | 模組名稱 | 最低版本 | 主檔／職責摘要 |
|:--------:|----------|:--------:|------------------|
| **nx00** | 系統核心 | LITE | 帳號登入、RBAC、稽核、共用主檔（零件／品牌／倉儲／往來對象等）、編碼規則與基礎設定 |
| **nx01** | 採購模組 | LITE | 詢價（選用）→ 進貨／採退、入庫與庫存異動、供應商歷程與單據串流 |
| **nx02** | 庫存模組 | LITE | 庫存餘額、流水、調整、盤點與差異；多倉 |
| **nx03** | 銷售模組 | LITE | 報價（選用）→ 銷貨／銷退、出庫與庫存異動、客戶歷程與快速開單 |
| **nx04** | 財務模組 | LITE | 應收／應付、付款紀錄、帳齡；LITE 為簡化帳務 |
| **nx05** | 成本與報表模組 | LITE | 庫存／銷售／採購統計、毛利、排行、儀表板；成本依庫存流水（FIFO／移動平均等） |
| **nx06** | 共用模組 | LITE | 跨模組單據關聯、單號規則、狀態與過帳規則、（選用）價格記憶／附件／列印等 |
| **nx07** | 物流模組 | PLUS | 揀貨／裝箱／出貨單、單據轉換與實物流向紀錄 |
| **nx99** | 內部模組 | LITE | 租戶、方案／功能開關、額度、平台參數、跨租戶稽核與維運（非單一租戶 ERP 業務本體） |

**與現行 repo 之差異**

- 截至本計劃撰寫時，`packages/db-core/prisma/schema.prisma` 已存在 **NX01、NX02、NX03、NX04、NX06** 等模型；**NX05（成本報表）、NX07（物流）尚未出現**。上表中 NX05、NX07 為**預留波段順序**，待設計與 migration 落地後再排入實際上線檢查清單。

---

## 優先順序總覽（建議執行序）

| 順序 | 階段代碼 | 名稱 | 說明 |
|:----:|:--------:|------|------|
| **P0** | 階段 0 | 連線與環境（Railway） | 本機經 **Public URL** 連上 Railway Postgres、SSL／PORT 正常，並能以客戶端執行 **DDL 手測**（建表後刪除）。**不含** `migrate deploy`（併入 **P4 baseline 產出後**驗證）。 |
| **P1** | 階段 1 | 多租戶 `tenant_id` 策略 | **MW1 範圍已定案**（見下節 1.2）；NX01～NX07 各表仍於對應波段前補齊決策與實作。 |
| **P2** | 階段 2 | `schema.prisma` 中文註解與欄位順序 | 對齊 `docs/nx00_field.csv`（NX00）與既有註解慣例；方便你追加欄位與交接。 |
| **P3** | 階段 3 | Migration 代碼化與對照表 | 目錄命名帶穩定代碼、`migrations/README.md`、各 `migration.sql` 檔頭摘要。**P4 baseline 產出後**新鏈從 **MIG001** 起編碼；舊鏈封存至 `migrations/_archive/`，不改檔名（見 **應用部署與營運**）。 |
| **P4** | 階段 4（已定案採行） | **MW1 最小 baseline** | 空庫單包（或極少包）僅含 **nx00+nx99** 與 ID／COMMENT 等必要 SQL；舊 migration 封存。之後每個 MW **只增量**往上疊。理由見 **階段 4** 正文。 |

**原則**

- **MW1 之 P1 核心已於本檔 §1.2 全數定案**（含 RBAC、主檔、稽核、畫面定義、國別幣別、`user_warehouse`、資料隔離方式、NX99 不加冗餘 `tenant_id`）；實作前仍須完成表級 unique／index 設計（例如 `nx00_role` 之 `@@unique([tenantId, code])`）。**NX01～NX07** 各表之 `tenant_id` 於 **§1.3** 所載，於各 MW 波段啟動前補齊。
- **橫向（P0～P4）與縱向（MW1、MW2…）**：先做 **P0**，**P1 至少覆蓋 MW1 表**；P2～P3 可對齊 **MW1 釋出**節點完成；其餘模組表之註解、代碼化 migration、tenant 補齊可**隨各 MW 前伸**。
- **P0 與 P4 分工**：**P0** 只驗證連線與 DDL 能力；**`prisma migrate deploy`** 須待 **P4** 產出 MW1 baseline（與後續正式 migration 鏈）後，對目標庫一併驗證，避免舊鏈與新鏈混淆。

---

## 階段 0 — 連線與環境（Railway）〔P0〕

**目標**：遷移與應用連線一次打通。

**檢查清單**

- [ ] 後端與 Postgres **同 Railway 專案**時：`DATABASE_URL` 使用 **Private** 參考 `${{ Postgres.DATABASE_URL }}`（避免長期依賴 Public proxy 與 Egress）。
- [ ] 本機或 CI 使用 **Public** 連線時：映像為 Postgres 16 + SSL，URI 視需要帶 `sslmode=require`（以 Railway 提供的連線字串為準）。
- [ ] **區域**：資料庫若在 US West，後端 API 服務宜**同區**，降低延遲。
- [ ] **Prisma migrate**：`packages/db-core/prisma.config.ts` 使用 `DIRECT_URL ?? DATABASE_URL`；若日後使用連線池，需確認 **migrate 使用可執行 DDL 的直連**（常見：`DIRECT_URL` 專給 migrate）。

**完成判準**：本機可透過 Railway **Public URL** 成功連線至 Railway Postgres，並能執行 **DDL**（例如建立測試表後刪除）；連線參數（**SSL**、**PORT**）確認正常。**Migration 套用驗證不在本階段**，待 **P4 baseline 產出後**一併執行。

**P0 執行指令（repo 內建）**

1. 在 [packages/db-core/.env.example](packages/db-core/.env.example) 對照說明，於 `packages/db-core/.env` 新增 **`RAILWAY_DATABASE_URL`**（Railway Postgres → Connect → **Public Network** 複製 URI，建議含 `sslmode=require`）。**勿**改動本機用的 `DATABASE_URL`／`DIRECT_URL`。
2. 於 repo 根目錄執行 `pnpm --filter db-core run p0:railway-ddl`，或於 `packages/db-core` 下執行 `pnpm run p0:railway-ddl`。
3. 終端機出現 `[P0] 完成：Public URL、連線與 DDL 正常。` 即通過本階段判準。

---

## 階段 1 — 多租戶 `tenant_id` 策略〔P1〕

**目標**：業務資料可依租戶隔離；平台層與產品固定資源有明確定義。**〔MW1〕NX00 + NX99 相關之核心決策已於 1.2 定案**；**NX01～NX07** 各表仍於對應 **MW2+** 波段啟動前補齊決策與 migration。

### 1.1 現況摘要（對照 `packages/db-core/prisma/schema.prisma` — 實作前快照）

> **讀者注意**：以下為 **repo 內目前 schema 的事實描述**，**不表示** MW1 產品釋出範圍已含該模組；**1.2 定案後**實作將調整多表結構（與 P4 baseline 一併落地）。

- **已存在且必填**（現況）：`nx00_user`、`nx00_bulletin`、`nx00_calendar_event`、`nx03_*`（銷售）、`nx99_subscription` 等。
- **已存在但可為 null**（MW2+ 前須收斂）：`nx01_*`、`nx02_stock_balance`、`nx02_stock_ledger` 等。
- **現況仍無或未完全符合 1.2 者**（實作時依 1.2 調整）：含 `nx00_role`／`nx00_user_role`／`nx00_role_view`、多數業務主檔、`nx00_audit_log`、`nx00_user_warehouse` 等。
- **NX99**：`nx99_tenant` 為根；平台層表**明文禁止**冗餘 `tenant_id`（與 §1.2 一致），租戶關聯透過 `nx99_subscription` 等。

### 1.2 〔MW1〕已定案 — 租戶隔離與平台層

以下為**產品／架構拍板**，後續 schema、API、seed、P4 baseline 應與之一致。

| 議題 | 決定 | 說明（摘要） |
|------|------|----------------|
| **RBAC：`nx00_role`、`nx00_user_role`、`nx00_role_view`** | **每租戶一套** | 材料行客群各自命名角色（業務、倉管、老闆等），不採全系統共用。**於上列三表新增 `tenant_id`（FK → `nx99_tenant`）**；`nx00_role` 代碼唯一性改為**租戶內**唯一（例如 `@@unique([tenantId, code])`）。`nx00_role_view` 連結「租戶內角色」與**全系統共用**之 `nx00_view`。 |
| **畫面定義：`nx00_view`** | **全系統共用（平台維護）** | 畫面清單為產品固定，租戶不可自訂路由表。**不新增 `tenant_id`**。 |
| **業務主檔**（零件、零件品牌、汽車品牌、倉庫、儲位、往來對象、零件族群、料號規則、零件關聯等） | **每租戶一套** | 料號、倉庫、客戶／供應商等均為各店自有資料，必須隔離。**於相關表新增 `tenant_id`**（含 `nx00_part`、`nx00_part_brand`、`nx00_car_brand`、`nx00_warehouse`、`nx00_location`、`nx00_partner`、`nx00_part_group`、`nx00_brand_code_role`、`nx00_part_relation` 等；實作時以 schema 完整掃描補齊）。 |
| **稽核 `nx00_audit_log`** | **加 `tenant_id`，且 NOT NULL** | 稽核查詢以租戶 filter 為主，避免技術債。寫入時由操作者所屬租戶或業務上下文注入。 |
| **國別／幣別 `nx00_country`、`nx00_currency`** | **平台共用（不加 `tenant_id`）** | **ISO** 參考資料由**平台統一維護**，材料行不自訂；**seed** 寫入平台層，租戶透過關聯引用即可。 |
| **使用者據點 `nx00_user_warehouse`** | **加 `tenant_id`，NOT NULL** | 與 `nx00_user`、`nx00_warehouse` 同為每租戶，DB 層直接約束，不依賴應用層保證。 |
| **資料隔離方式** | **應用層（nx-api 主動帶 WHERE tenant_id）** | MVP 階段由 nx-api 所有查詢主動帶租戶條件；PostgreSQL RLS 留待未來有多工程師或資安要求時再啟用。 |
| **NX99 表冗餘 `tenant_id`** | **明文禁止** | `nx99_plan`、`nx99_product_module` 等平台層表絕不加 `tenant_id`；租戶關聯透過 `nx99_subscription` 處理即可，冗餘欄位只會造成混亂。 |

### 1.3 仍待各 MW 前決策／收斂

- **NX01～NX07** 各表之 `tenant_id` 必填與否、複合 unique／索引策略、由 nullable 轉 NOT NULL 之資料修補策略：於**各該 MW 波段啟動前**補齊決策並簽核。

### 1.4 實作階段（本計劃書不展開程式碼）

- 更新 schema、migration（含 P4 baseline）、seed、API：**nx-api** 查詢／寫入主動帶租戶條件（見 §1.2「資料隔離方式」）；PostgreSQL RLS 不在 MVP 啟用。
- `tenant_id` 由 nullable 改 NOT NULL 前需資料修補腳本；**新建空庫無歷史資料時可直接 NOT NULL**。

**完成判準（MW1）**：**§1.2** 所列表之 **DDL／索引／唯一鍵／FK** 與種子資料在 review 通過，即視為 MW1 schema 定稿；**NX01～NX07** 依 **§1.3** 於各波段啟動前另列清單簽核。

---

## 階段 2 — `schema.prisma` 中文註解與欄位順序〔P2〕

**目標**

- NX00：欄位順序與說明對齊 `docs/nx00_field.csv`。
- NX99：補齊與 MW1 相關模型之 `///` 中文與欄位順序約定。
- 其餘模組（NX01～NX07 等）：可**隨各 MW 啟動前**再分批補齊，不必阻塞 MW1。
- 全模型長期目標：scalar 欄位盡量有 `///` 中文；外鍵欄位標註指向之表／語意；反向 relation 陣列可維持精簡。

**完成判準**：`pnpm exec prisma validate`（於 `packages/db-core`）通過；**MW1 範圍內**之註解與順序足以支撐首波上線與後續追加欄位。

**依賴**：**1.2 已定案**；大規模欄位調整與註解可與 **P4 baseline** 同一輪處理，減少來回修改。

---

## 階段 3 — Migration 代碼化與對照表〔P3〕

**目標**

- 目錄命名保留 Prisma 可排序的時間前綴，並插入穩定代碼（例如 `MIG001`）與簡短 slug。
- 新增 `packages/db-core/prisma/migrations/README.md`：代碼 ↔ 目錄名 ↔ 功能摘要（中文）。
- 各 `migration.sql` 檔頭 3～5 行：代碼、中文目的、注意事項。

**完成判準**：空庫 `migrate deploy` 順序正確；人可從代碼查到遷移用途。

**依賴**：**P4 baseline 產出後**於全新 migration 目錄從 **MIG001** 起代碼化；舊鏈封存至 `migrations/_archive/` 不改檔名（見 **應用部署與營運**）。

---

## 階段 4 — Baseline 合併（已定案採行）〔P4〕

**策略（已定案）**：採 **MW1 最小 baseline** — 針對 **Railway 空庫**、無既有 `_prisma_migrations` 包袱，以**單一（或極少）** migration 目錄建立 **僅含 nx00 + nx99** 之表結構（並含 **1.2** 已定案之 `tenant_id`／索引／唯一鍵調整），並合併 **ID 產生函式**、`COMMENT ON` 等（對照現有歷史 `init`、`prisma/sql/id_generators.sql`、以及舊鏈中仍有效之片段）。

**理由（摘要）**

- Railway Postgres **空庫**，無需對既有線上庫做 migration 更名對齊。
- 現有 **migration 鏈**中曾混有探索／對齊用 SQL，長期維護成本高；**一次整乾淨**後，目錄與代碼化（P3）可從頭對齊。
- 之後 **MW2、MW3…** 僅以**標準增量 migration** 往上疊，符合模組分段上線節奏。

**舊鏈處理**：將現有 `packages/db-core/prisma/migrations/` 內歷史目錄**移出** Prisma 讀取路徑（例如 `migrations/_archive/…` 或 repo 外備份），**僅供人類查考**；全新 baseline 目錄置於 `prisma/migrations/` 下，空庫只跑新鏈。

**目標**：**CREATE TABLE 物理欄位順序**與 **P2／`nx00_field.csv`** 及定案 schema 一致；MW1 deploy + seed 可重複驗證。

**依賴**：**1.2 已定案**；**P2** 於 MW1 範圍之欄位順序與註解定稿；再產 baseline，避免重做。

**風險與注意**：本機若曾用**舊鏈**建過 DB，需 **`db reset`** 或建新庫再 deploy；團隊需知悉**僅新 baseline 為準**。

---

## Railway 儀表板對照備註（目前設定）

以下依你提供的 Railway 畫面整理，**無需改 schema**，屬部署設定檢查：

- 資料庫 **無資料表**：與「先完成 migration 再寫入」一致。
- **Private Network**：後端應優先使用 `${{ Postgres.DATABASE_URL }}`。
- **Public Network**：有 Egress 成本；本機一次性 migrate 可接受時仍建議確認 SSL。
- **Postgres 16、SSL 映像**：客戶端連線參數需相容。
- **Volume**：無法水平 Replica 為正常限制；與 Prisma 無直接衝突。

---

## 應用部署與營運（已定案）

### 連線雙軌

- 本機執行 migrate：`.env` 使用 Railway **Public URL**
- Railway nx-api Variables：使用 Private `${{ Postgres.DATABASE_URL }}`
- nx-api start command **不含** `prisma migrate deploy`

### Migration 代碼化時點

P4 baseline 產出後，新目錄直接從 **MIG001** 起編碼；舊鏈封存至 `migrations/_archive/`，不改檔名，不再維護。

### Seed 範圍（已重新定案）

**Seed 目的**：建立系統初始化所需的最小資料，以及供展示用的完整假資料租戶。  
Seed 不包含任何真實客戶資料；真實客戶資料一律透過 **CSV 匯入工具**（另見任務規劃）匯入。

**Seed 租戶清單（定案）：**

| 租戶代碼 | 名稱 | 用途 | 方案 |
|---------|------|------|------|
| `DEV-INNOVA` | Innova IT（開發用） | 開發測試，平台管理員帳號所在租戶 | PRO |
| `DEMO-LITE` | NEXORA 展示版（基礎） | 向客戶展示 LITE 方案功能範圍 | LITE |
| `DEMO-PLUS` | NEXORA 展示版（進階） | 向客戶展示 PLUS 方案功能範圍 | PLUS |

**各租戶 Seed 資料範圍：**

| 資料類型 | DEV-INNOVA | DEMO-LITE | DEMO-PLUS |
|---------|-----------|-----------|-----------|
| 租戶基本資料 | ✅ | ✅ | ✅ |
| 使用者（admin） | ✅ | ✅ | ✅ |
| 角色（ADMIN/SALES/WH） | ✅ | ✅ | ✅ |
| 廠牌主檔 | — | ✅ 含假資料 | ✅ 含假資料 |
| 倉庫主檔 | — | ✅ 含假資料 | ✅ 含假資料 |
| 往來對象主檔 | — | ✅ 含假資料 | ✅ 含假資料 |
| 零件主檔 | — | ✅ 含假資料 | ✅ 含假資料 |
| 庫存／單據（NX01～NX03） | — | 待 MW2+ 波段補充 | 待 MW2+ 波段補充 |

**重要原則：**

- CYTIC（恆迎企業）**不在 Seed 中**，為真實客戶，資料透過 CSV 匯入工具導入
- 展示時直接登入 `DEMO-LITE` 或 `DEMO-PLUS` 帳號，資料完整，不需要切換 demo 模式
- 各 MW 波段上線時，同步擴充 DEMO 租戶的對應假資料

### 真實客戶資料匯入策略（已定案）

真實客戶（如 CYTIC 恆迎企業）的歷史資料，透過 **CSV 匯入工具** 匯入，不寫入 Seed。

**匯入順序（依外鍵依賴）：**

```
1. nx00_part_brand（廠牌，無外鍵依賴）
2. nx00_car_brand（汽車品牌，無外鍵依賴）
3. nx00_part_group（零件族群，無外鍵依賴）
4. nx00_warehouse（倉庫，無外鍵依賴）
5. nx00_partner（往來對象，無外鍵依賴）
6. nx00_location（庫位，依賴 warehouse）
7. nx00_brand_code_role（料號規則，依賴 part_brand）
8. nx00_part（零件，依賴 part_brand、part_group）
9. nx00_part_relation（零件關聯，依賴 part x2）
```

`nx00_country` 與 `nx00_currency` 為平台共用，不需匯入。

CSV 匯入工具為獨立任務，待 MW1 seed 重構完成後啟動實作。

### 備份與還原

MVP 依賴 Railway 預設備份，不額外演練還原。上線前確認 Railway Backups 頁面位置與還原入口即可。

### 監控與健康檢查

nx-api 提供 `GET /health` 端點（回傳 200 + 服務狀態）。Railway 部署失敗通知依平台預設設定。日誌匯出與進階告警留待 MVP 後視需求再加。

### 前端部署

nx-ui 部署於 Vercel（`app.nexoragrid.com`）；正式環境 `NEXT_PUBLIC_API_URL` 指向 Railway nx-api Public URL；CORS 白名單於 nx-api 設定，允許 `app.nexoragrid.com`。

### NX99／平台維運（已定案）

- **平台管理員身分**：使用 `nx00_user` + `PLATFORM_ADMIN` 特殊角色區分，MVP 階段不另開帳號表。
- **操作權限**：NX99 API 與畫面僅限 `PLATFORM_ADMIN` 角色存取（MVP 階段僅 Crown 持有此角色）。
- **強制控制**：MVP 不要求 2FA 或 IP 白名單，複雜密碼 + JWT 即可。
- **平台稽核**：MVP 不做平台操作稽核紀錄，未來有多人操作 NX99 時再加。

---

## 文件維護

- 本計劃書路徑：`docs/flows/11-railway-db-and-tenant-prep.md`
- 相關程式根源：`packages/db-core/prisma/schema.prisma`、`packages/db-core/prisma/migrations/`、`docs/nx00_field.csv`

若調整 **MW 順序**、**P0～P4**、**§1.2** 或 **應用部署與營運**之已定案內容，請同步修訂並維持 `README.md` 索引連結。
