<!-- docs/PROJECT_CONTEXT.md -->

# NEXORA Project Context（專案介紹）

> 文件版本：v2.2（2026-05-26：對齊公司範式調整 — 三人改總經理 / PM / 工程師、worklog 改 commit 訊息；見 PROJECT_RULES §0.4）
> 最後更新:2026-05-26
> 性質：靜態專案介紹、變動頻率極低
> 紀律 / 規則 / 失誤紀錄全部見 [PROJECT_RULES.md](./PROJECT_RULES.md)

---

## 文件結構

本檔只含「專案是什麼」、不含「怎麼做事」：

| 你在找 | 看哪份 |
|---|---|
| 業務脈絡、產品介紹、團隊角色 | **本檔（PROJECT_CONTEXT）** |
| 紀律、規則、失誤學習、工作流 | [PROJECT_RULES.md](./PROJECT_RULES.md) |
| 動態狀態（main HEAD / branch）| `_team/git-state.md` |
| 最近進度 / task log | **Git commit 訊息**（`git log`、2026-05-26 起；`_team/worklog.md` 停更僅保留歷史）|
| 各模組規格 | `nxXX/spec/` |

---

# § 1. 業務生態實體

NEXORA 的故事線由四個實體組成：

```
恆迎企業（30 年老字號、Crown 工作場域）
    ↓
    Crown 發現傳產痛點（無 SOP、靠經驗 + 人力）
    ↓
伊諾瓦資訊科技（2026-11 成立、Crown 創辦）
    ↓
    第一件產品：NEXORA GRID（汽車零件商 ERP）
    ↓
亞羅企業（2028 launch、Crown 計畫成立）
    ↓
    使用自家開發的 NEXORA、跟恆迎同類型業務
```

## 1.1 恆迎企業有限公司（Crown 工作場域、NEXORA 設計來源）

- **性質**：30 年老字號 VAG 專車零件商、中盤商等級
- **客戶**：保養廠 + 零件商
- **股東結構**：
  - **周哥**：公司負責人、負責財務
  - **黑哥**（Crown 爸）：實質維護供應商 + 客戶
  - **林大哥**：專心服務恆迎主力大客戶
- **Crown 在恆迎角色**：上班、發現業界痛點

### Crown 在恆迎發現的痛點（NEXORA 設計來源）

⭐ 恆迎跟很多同行有相同狀況：

- 沒有固定 SOP、業務流程仰賴經驗 + 人力
- 30 年累積知識在業務員腦中、紙本筆記散落
- 業務員離職 = 知識斷層
- 數位化程度低、跟世界接軌困難

⭐ 這些痛點 → 直接形塑 NEXORA 的設計優先級（如「業務 SOP 結構化」「30 年知識結構化」「強制資料溯源」）。

## 1.2 伊諾瓦資訊科技有限公司（Innova IT）

- **創辦人**：林翰杰（Crown）
- **成立時程**：2026-11（開設中）
- **願景**：**幫助台灣傳產數位轉型、與世界接軌**
- **第一件產品**：NEXORA GRID（汽車零件商 ERP）
- **角色**：NEXORA 開發母體

⭐ 伊諾瓦的存在意義不只是「為 Crown 自己」、是「**為台灣傳產**」。

## 1.3 NEXORA GRID

- **性質**：多租戶 SaaS ERP 系統
- **目標市場**：台灣中小型汽車零件批發商
- **初始焦點**：VAG（Volkswagen Audi Group）生態圈
- **設計來源**：恆迎 30 年業界痛點 + Crown 18 年業界經驗
- **未來應用**：亞羅企業（Yaro）= NEXORA 第一個自家使用案例

### NEXORA 三 tier 方案

| Tier | 對象 | 業務戰略 |
|---|---|---|
| **LITE** | 單店修車廠 | 基礎進銷存、輕量化、業務人員容易上手 |
| **PLUS** | 中型零件商 | 多倉 + 多部門 + 簽核流程 |
| **PRO** | 大型批發商 | 多倉 + 海外採購 + 遊戲化 + 30 年知識結構化 |

### 方案戰略區別

- LITE：價格敏感、功能極簡、單店場景
- PLUS：成長階段企業、需多部門協作 + 內控
- PRO：批發龍頭、需戰略級資產（知識結構化、跨倉調撥、海外採購、業務遊戲化）

### Tier 差異化原則

對齊 PROJECT_RULES §I.2.1 設計哲學：

- ❌ **不**用「欄位差異」差異化（如 LITE 不能用 priceA~D / PLUS 能用）
- ✅ 用「**功能完整度**」差異化（如多倉 / 多部門 / 海外採購 / 遊戲化）

⭐ 業務 muscle memory：基礎主檔功能全 Tier 對等、戰略級功能才是 Tier 差異化點。

## 1.4 亞羅企業（Yaro Enterprise、Crown 計畫成立）

- **性質**：Crown **計畫自己經營的 B2B 汽車零件批發 / 分銷企業**
- **業務類型**：同恆迎類型（VAG 中盤商業務）
- **跟 NEXORA 關係**：**NEXORA 為亞羅量身打造**、Yaro 是 NEXORA 第一個自家使用者

⭐ 真相校正：Yaro **不是**「為了驗證 NEXORA 而開的實驗田」、是「**Crown 計畫的真實企業、使用自家系統的正常商業循環**」。

### 階段規劃

| 階段 | 範圍 | 時程 |
|---|---|---|
| **階段 1（規劃中）** | 燃油車零件 | 2028 開業初期 |
| **階段 2** | 電動車零件 | 3~5 年 |
| **階段 3** | 工業 / 機器人零件 | 5~10 年 |

- **開業時程**：**2028 launch**
- **戰略意義**：Crown 用 NEXORA 經營亞羅、體現 NEXORA「為台灣傳產設計」的實用性

### Yaro 對 NEXORA 開發的影響

⭐ Crown 18 年汽配業 muscle memory + 恆迎 30 年業界資產 = NEXORA 設計優勢：

- 業界現況：業務員「腦中記憶 + 紙本筆記」追料件對車型適配
- NEXORA 改革：part ↔ model 結構化關聯（part_model）
- 業務影響：業務員離職不再造成知識斷層、新人查料快上手

→ 這項戰略改革會在亞羅開業時優先實施（Crown 用自家系統的最大優勢）。

---

# § 2. 三人團隊配置

> 公司範式（2026-05-26、見 PROJECT_RULES §0.4-①）：Crown = **總經理**、Alex = **專案經理（PM）**、Hank = **工程師**（Alex 底下）。對總經理回報用一般員工口吻、不帶內部術語 / 編號。

## 2.1 Crown（林翰杰）— 總經理

- 創辦人 + 產品擁有者
- 18 年汽車零件業界經驗
- 拍板者：業務戰略 / 命名 / 範圍 / 驗收
- 業界 muscle memory 唯一來源
- 危險命令拍板者（push / migrate reset / rm 重要檔案）
- 治理風格：拍板簡明、不過度討論、業界語言、不擅自評估時間
- 詳細合作風格見 PROJECT_RULES §I.4

## 2.2 Alex（Claude in Claude.AI）— 專案經理（PM、Hank 上司）

- 角色：對話端整合者 + Hank 直屬上司
- 工具：Claude.AI 對話介面
- 職責：
  - 規劃架構 / 拆解任務 / 列拍板 Q
  - 寫業務意圖文件（規格書 §1~§11 業務語意）
  - 跟總經理互動 / 整合 Hank 揭露
  - 工具紀律自訂（與 Hank 對齊、見 PROJECT_RULES §0.4-⑤）
- 限制：對話記憶有限（跨對話需 verify 真相）
- 詳細紀律見 PROJECT_RULES Part II

## 2.3 Hank（Claude in Cursor IDE / Claude Code）— 工程師

- 角色：執行者 + 真相揭露者（Alex 底下）
- 工具：Cursor IDE / Claude Code（bash / git / Edit / 直接讀寫 codebase）
- 職責：
  - 寫程式碼 / schema / migration / commit
  - grep verify codebase 真相揭露給 Alex
  - 軌前 SPEC commit 代發 / 軌中 impl / 軌後紀錄走 **commit 訊息**（§0.4-④）
- 限制：無對話記憶（跨對話開工必先讀 PROJECT_RULES + `git log`）
- 詳細紀律見 PROJECT_RULES Part III

⚠️ 周哥（恆迎公司負責人 / 財務）**不是** NEXORA 三人團隊成員、是恆迎股東角色、見 §1.1 恆迎股東結構。

---

# § 3. NEXORA 技術棧

## 3.1 核心技術

| 領域 | 選型 |
|---|---|
| 前端 | Next.js 16.1.6（nx-ui）|
| 後端 | NestJS（nx-api）|
| 資料庫 | PostgreSQL |
| ORM | Prisma v7 |
| Monorepo | pnpm |
| 部署 - API/DB | Railway |
| 部署 - Frontend | Vercel（app.nexoragrid.com）|
| DNS | Cloudflare |

## 3.2 AI 協作工具

| 工具 | 角色 |
|---|---|
| Claude.AI（Claude Opus 4.7）| Alex 對話端 |
| Cursor AI（Claude）| Hank IDE 端 |
| 未來 | 多 Cursor 並行（Alex 整合）|

## 3.3 開發工具

- DBeaver（資料庫管理）
- Supabase SQL Editor（migration workaround）
- PowerShell + DATABASE_URL override（Railway 操作）
- GitHub Desktop（commit / branch）
- v0.dev（UI prototyping）

## 3.4 業界參考資源

- 偉盟系統（legacy ERP UI 範式比對）
- Partslink（VIN / 車架號零件查詢、未來整合）

---

# § 4. NEXORA 模組代碼

## 4.1 模組編號規則（v2.0）

| 模組 | 代碼 | 業務範圍 |
|---|---|---|
| 主檔 | NX01 | 用戶 / 角色 / 客戶 / 倉庫 / 品牌 / 編碼規則 / 公告 / 地址 / 注音 / 料件 / 車型 / 引擎 / 變速 / 料件版本 / 適配 |
| 採購 | NX02 | RFQ / 採購單 / 進貨 / 暫退 |
| 庫存 | NX03 | 即時 / 調撥 / 盤點 / 異動 |
| 銷售 | NX04 | 報價 / 銷貨 / 退回 / 客戶要求 |
| 財務 | NX05 | 應收 / 應付 / 對帳 / 沖帳 |
| 物流 | NX06 | 出貨 / 配送 / 簽收 |
| 人資 | NX07 | 員工 / 部門 / 假勤 |
| 經營分析 | NX08 | 報表 / KPI / 庫存月報 |
| 知識庫 | NX09 | 公告 / 教學 / FAQ |
| 遊戲化 | NX10 | 任務 / 勳章 / 排行榜（PRO tier）|
| 系統共用 | NX98 | 共用元件 / 通用服務 |
| 系統管理 | NX99 | 租戶 / 訂閱 / 系統設定 |

## 4.2 ID 範圍標準

對齊 PROJECT_RULES §I.3 工程模式：

### nx01_user（用戶）
- `NX01USER0000001`：SYSADMIN（is_active=false、純佔位、createdBy 追溯用）
- `NX01USER0000002`：~~innova-admin（租戶層舊版）~~ **已退役 2026-06-02 Phase 6.4、is_active=false**（見 §6.5）
- `NX01USER0000003 ~ 0899999`：真實客戶員工
- `NX01USER9900001 ~ 9999999`：測試租戶員工

### nx99_tenant（租戶）
- `NX99TANT0000000`：SYSTEM（is_active=false、純佔位、createdBy 追溯用）
- `NX99TANT0000001`：~~INNOVA（租戶層舊版）~~ **已退役 2026-06-02 Phase 6.4、is_active=false**（見 §6.5）
- `NX99TANT0000002 ~ 0899999`：保留段
- `NX99TANT9900001 ~ 9999999`：測試租戶（含 ZT-100001~3 三筆既有測試、新建測試走 ZT 規格、見 §6.5）

### nx99_tenant.code（租戶代碼、登入「公司帳號」欄、Phase 6.3 正規化）
- 格式：`{前綴}-{6位流水號}`、純遞增、退租保留不跳號
- `TW-100001` 起：**正式客戶**（國碼 TW、`seq_tenant_code_tw`、首位=恆迎企業）
- `ZT-100001` 起：**測試租戶**（`seq_tenant_code_zt`、現有 ZT-100001/100002/100003 對應原 TEST-LITE/PLUS/PRO）
- `SYSTEM` / `INNOVA`：系統保留 code、永遠 is_active=false
- 系統自動產、開戶者不填、統編（`tax_id`）與登入代碼分離（資安）
- 國碼可擴充：未來 JP/US 加新 sequence（如 `seq_tenant_code_jp`）、schema 0 動

### platform_admin（平台層使用者、Phase 6.0 新表、跟 nx01_user 徹底分家）
- `PLATADMN0000001`：innova-admin（伊諾瓦營運超管、is_active=true）
- 詳見 §6.5「平台層 vs 租戶層分離架構」

⭐ 業務 muscle memory：ID 範圍是業界 audit 場景關鍵、不可破壞。

---

# § 5. NEXORA 業務模型概觀

## 5.1 業務流程鏈

```
NX01 主檔（料件 / 車型 / 客戶 / 倉庫）
    ↓
NX02 採購（RFQ → PO → 進貨 → 暫退）
    ↓
NX03 庫存（建庫存 → 調撥 → 盤點 → 異動）
    ↓
NX04 銷售（報價 → 銷貨 → 退回）
    ↓
NX05 財務（應收 / 應付 / 沖帳）
    ↓
NX06 物流（出貨 → 配送 → 簽收）
    ↓
NX08 經營分析（報表 / KPI）
```

## 5.2 7 個 ROLE 業務角色

| ROLE | 業務職責 |
|---|---|
| SYSADMIN | 跨租戶系統管理（NEXORA 內部、非客戶角色）|
| OWNER | 公司負責人、看全公司資料 |
| PURCHASING | 採購（含採購組長戰略）|
| SALES | 業務（報價 / 銷貨 / 客戶服務）|
| WAREHOUSE | 倉管（含倉管組長排序任務）|
| FINANCE | 財務（應收應付 / 沖帳）|
| HR_ADMIN | 人資（員工 / 部門 / 假勤）|

⚠️ 7 個角色非 8 個（含 HR_ADMIN）= NEXORA 業務實際範圍、對齊 PROJECT_RULES §III.2（Hank 撰寫中）。

## 5.3 16 個勳章 tier（PRO 遊戲化）

| 維度 | 4 個層級 |
|---|---|
| Tier 等級 | Bronze / Silver / Gold / Platinum |
| Rank 階級 | I / II / III / IV |

→ 4 × 4 = 16 種勳章組合、業務員 / 倉管員透過完成任務累積、PRO tier 戰略差異化。

---

# § 6. 環境配置

## 6.1 開發環境

| 環境 | 用途 | DB |
|---|---|---|
| 本機家裡 | 平日開發 | PostgreSQL localhost:5433 |
| 本機辦公室 | 平日開發 | PostgreSQL localhost:5433 |
| Railway dev | 共用測試 / 暫稱 production | Railway managed PostgreSQL |

⚠️ 當前 Railway 單一環境（暫用作 dev/staging/production），環境分離待 TASK-RAILWAY-ENV-SPLIT（第一個真實客戶簽約前 2~4 週、估 2027 Q1）。

## 6.2 Git workflow

- 主分支：main + feature/ branches only
- 不用 develop branch
- feature branch review 後直接 merge main（--no-ff）
- ⚠️ Architecture debt A015：PROJECT_CONTEXT 既有版本錯誤提及 develop branch、本縮版已修正

## 6.3 Commit message 格式

```
[TASK-CODE] description

例：
[TASK-NX01-17-IMPL] commit 1: schema + migration + reverse
[SPEC] NX01-16 part-model v1.0 規格落地
```

## 6.4 ~~系統內建營運帳號~~（已被 6.5 平台/租戶層分離架構取代、見下節）

NEXORA 系統內有兩種「非業務客戶」的內建租戶 + 帳號，職責不重疊：

| 租戶 | 使用者 | is_active | 用途 |
|---|---|---|---|
| `SYSTEM`（`NX99TANT0000000`）| `sysadmin`（`NX01USER0000001`）| ❌ false | 純佔位、不可登入。承載 schema 強制的 `tenantId` FK，僅用於 `createdBy` 追溯 |
| **`INNOVA`**（`NX99TANT0000001`）| **`innova-admin`**（`NX01USER0000002`）| ✅ true | **伊諾瓦營運身分、跨租戶開戶用**（業務簽完約幫客戶開戶）|

### 伊諾瓦營運帳號（簽約 / 開戶用）

| 項目 | 值 |
|---|---|
| 公司帳號（登入用 tenantCode）| `INNOVA` |
| 使用者帳號 | `innova-admin` |
| 預設密碼 | `Nexoragrid2026`（首次登入強制改密、`mustChangePassword=true`）|
| 跨租戶權限 | 持 `SYSADMIN` 角色、可進 `/sys-admin/onboarding` 幫客戶開戶 |
| 訂閱方案 | 無（純營運租戶、非業務 tier）|

### 歷史補正紀錄

- **2026-06-01 之前**：SYSADMIN 角色錯掛在 `TEST-LITE/PLUS/PRO` 的 `admin` 帳號上「假裝伊諾瓦」（測試身分被借用做正式開戶、語意衝突）。
- **2026-06-01 補正**（Crown 拍板 A）：建立 INNOVA 營運主體 + innova-admin 超管、收回測試 admin 的 SYSADMIN 角色。
- **不可回退**：未來新增測試租戶（或新環境）禁止把 SYSADMIN 借掛在測試 admin 上、營運帳號永遠在 INNOVA。

### 範式守則

⚠️ 真實客戶開戶時、`tenantCode` 由 onboarding service 自動產（`T` + base36 時間戳）或業務手動指定、**永遠不會跟 `SYSTEM`/`INNOVA` 衝突**（後端有唯一性檢查）。
⚠️ 任何「跨租戶後台」功能（開戶、跨租戶 audit、系統 KPI）的權限模型只認 `INNOVA` 租戶下、持 `SYSADMIN` 角色的使用者。

---

## 6.5 平台層 vs 租戶層分離架構（Phase 1~6 軌、2026-06-02 closure）

### 6.5.1 為什麼分離

「NEXORA 內部營運身分（伊諾瓦自家）」與「客戶員工身分」是兩個本質不同的實體：

| 角色 | 屬於 | 進的後台 |
|---|---|---|
| **伊諾瓦員工**（自家、不限於開戶業務）| 平台層（`platform_admin`）| `/platform`（黑底 monospace 後台、客戶看不到入口）|
| **客戶員工**（恆迎、其他客戶）| 租戶層（`nx01_user`）| `/dashboard`（NEXORA GRID 星空背景、tier 限制）|

混在一張 `nx01_user` 表反規格也反實務（業界 SaaS 標準是 platform/tenant 兩層）。

### 6.5.2 雙層核心物件

| 維度 | 平台層 | 租戶層 |
|---|---|---|
| 資料表 | `platform_admin` | `nx01_user` |
| 範例 row | `PLATADMN0000001 / innova-admin` | `NX01USER9900001 / admin@ZT-100001`...|
| 登入入口 | `/platform/login`（隱蔽、僅平台帳號）| `/login`（客戶端、含公司帳號欄）|
| API endpoint | `POST /platform/auth/login` | `POST /auth/login` |
| JWT scope | `'platform'` | `'tenant'` |
| 守衛 | `PlatformAdminGuard` | `JwtAuthGuard` + `RolesGuard` |
| 跨層 token | ❌ 雙向 401 scope mismatch（嚴守隔離、L1 認證隔離）| ❌ 同上 |
| 入口連結 | ❌ 客戶 `/login` 0 連結指向 `/platform/login`（L2 入口隔離） | ❌ 同上 |

### 6.5.3 伊諾瓦營運帳號

| 項目 | 值 |
|---|---|
| 入口 | `http://<host>/platform/login` |
| 帳號（account）| `innova-admin` |
| 預設密碼 | `Nexoragrid2026`（首次登入強制改密、`must_change_password=true`）|
| 登入「公司帳號」欄 | ❌ 不存在（platform 登入頁無此欄、只有 account + password）|
| 跨租戶開戶權限 | `PlatformAdminGuard` 認可、進 `/platform/onboarding` |
| 訂閱 / tier | ❌ 不適用 |

### 6.5.4 SYSTEM / INNOVA 兩筆系統保留 row（退役後仍存）

| Row | 狀態 | 用途 |
|---|---|---|
| `SYSTEM`（`NX99TANT0000000`）+ `sysadmin`（`NX01USER0000001`）| `is_active=false` | Schema 強制 `tenant_id`/`created_by` FK 的佔位 |
| `INNOVA`（`NX99TANT0000001`）+ `innova-admin nx01_user`（`NX01USER0000002`）| **`is_active=false`**（Phase 6.4 退役）| 純歷史追溯、過去走 INNOVA 路徑建出來的資料（如 ZT 三筆原 TEST-*）仍引用此 row |

⚠️ 這兩筆永遠不刪、永遠 `is_active=false`、permanent retired。

### 6.5.5 客戶租戶代碼規格（Phase 6.3）

| 規格 | 內容 |
|---|---|
| 格式 | `{前綴}-{6位流水號}` |
| 前綴 | `TW`=正式客戶、`ZT`=測試租戶（未來可加 JP/US...）|
| 流水號 | 6 位實心、從 `100001` 起、`sequence` 純遞增、退租保留不跳號 |
| 開戶方式 | platform UI 自動產、開戶者不填租戶代碼、勾「測試租戶」決定前綴 |
| 統編 vs 登入代碼 | `nx99_tenant.tax_id` 報稅 / 發票用、`code` 登入「公司帳號」用、**兩者分離不混** |

### 6.5.6 歷史補正鏈

| 階段 | 狀態 |
|---|---|
| 2026-06-01 之前 | SYSADMIN 角色錯掛 TEST-LITE/PLUS/PRO admin「假裝伊諾瓦」（反規格）|
| 2026-06-01 hotfix | 建 INNOVA 租戶 + `nx01_user.innova-admin`、收回測試 admin SYSADMIN（灰色帶過渡）|
| 2026-06-02 Phase 1~6 軌 closure | 拆 `platform_admin` 表、INNOVA 退役、租戶代碼 TW/ZT-{6digits}、平台後台 UI 完整、改密 UI、metadata 分離（⭐ 正規完成）|
| ⛔ 不可回退 | 未來開新測試環境禁止把 SYSADMIN 借給 `nx01_user`、營運身分永遠在 `platform_admin` 表 |

### 6.5.7 開戶流程（給平台超管 / 業務員）

1. `http://host/platform/login` 登入（account + password、無公司帳號欄）
2. 進 `/platform`（Hub）→ 點 Onboarding
3. 填客戶資訊：
   - 公司名 / 統編 / 地址（必填）
   - 公司 LOGO（**選填**、選圖檔即自動上傳、見 §6.5.8）
   - 訂閱方案（LITE / PLUS / PRO）
   - 負責人姓名 + Email
   - **「這是測試租戶」勾選框**（不勾=正式 TW-、勾=測試 ZT-）
4. 系統自動產 `tenantCode`（TW-100001 或 ZT-100004...）+ 自動產初始密碼
5. 客戶用該 `tenantCode` + Email + 初始密碼從 `/login` 登入、首次跳改密

### 6.5.8 LOGO 上傳範式（2026-06-02 軌外補做）

- **上傳**：開戶頁 file input 選檔即觸發 `POST /sys-admin/onboarding/upload-logo`（multipart、`PlatformAdminGuard`）
- **儲存**：本地 `<cwd>/.uploads/{platformAdminId}/onboarding/{yyyy}/{mm}/{uuid}.{ext}`、階段 2 接 Cloudflare R2
- **存 DB**：`nx99_tenant.logo_url` 寫的是 storage_key（路徑、非完整 URL）
- **客戶端讀檔**：`GET /files/public/logos/{tenantPrefix}/{yyyy}/{mm}/{filename}` 無 auth、限 image MIME（png/jpeg/gif/webp）、限 `onboarding` module、四級 path param 嚴格 regex 驗證
- **選填**：不上傳開戶仍可開通、`logo_url=null`、客戶可之後在設定補（未實作）
- **限制**：單檔 ≤ 10 MiB、只 PNG/JPEG/GIF/WebP
- **不在本軌範圍**：LOGO 替換 UI、orphan 檔案 cleanup、R2 遷移、crop/resize 預處理

---

# § 7. 關鍵業務戰略決策

## 7.1 NX01 全 closure 戰略 milestone（2026-05-15）

⭐⭐ NX01 17 份子規格書 + impl 全 100% closure：

- 7 份規格書本對話跨度完成（NX01-12/14/15/13/07/05/17/16）
- 60+ Hank commits 落地
- 業務影響：NEXORA 主檔層收尾、業務模組層（NX02 採購起跑）可開始
- 後續路徑：NX02 採購群進場 → NX03~NX10 漸進 → Yaro 開業前資料匯入軌（恆迎 30 年業界資料 / Crown 18 年知識結構化進系統）

## 7.2 Workstation 架構 pivot（2026-04-24）

- 從「SOP flow-style UI」轉「5 workstation action-style UI」
- 5 個工作站：即時查詢報價 / 國內銷貨 / 銷售退回 / 同行詢價 / 同行調貨
- 核心設計：Option C「soft lock + 強制 source 標記」（受控超賣）
- 物理庫存 ≥ 0、會計帳可負（D3 雙帳）
- 工作站 = 動作 / SOP = 教學材料 / SYS-C = 翻譯層
- legacy SOP 9 步流程保留在 /sop-demo 教學模式

## 7.3 多 Cursor 協作願景（Crown 揭露、當前不啟動）

⚠️ **2026-05-15 Crown 拍板：多 Cursor 不啟動、單軌作業**

- 當前範式：單 Cursor 開工、Alex 串連 Crown → Hank、穩健優先
- 未來路徑選項：多 Cursor 並行（Alex 從「整合者」升級到「多 Cursor 總調度者 + 跨軌一致性守門員」）
- 啟動條件（保留）：Crown 駕馭心智頻寬 + 業務時程逼到需提速時觸發
- 紀律骨架見 PROJECT_RULES §I.7.3（未來啟動後依此執行、現階段不依此行動）

⭐ Crown 拍板理由：AI 速度太快、多軌並行心智負荷可能過重；單軌時程已來得及 Yaro 2028 launch。

---

# § 8. 文件導航

## 8.1 跨對話接力時必讀

對齊 PROJECT_RULES §I.8.1：

**Alex 跨對話接力**：
1. **本檔（PROJECT_CONTEXT.md）**：業務脈絡、什麼是 NEXORA
2. **PROJECT_RULES.md Part I + II**：共通紀律 + Alex 紀律（特別 §0.4 公司範式）
3. 對應模組 `nxXX-summary.md`：功能層級簡化版
4. `_team/git-state.md`：main HEAD 真相
5. `git log --oneline`：最近進度（§0.4-④；worklog 已停更、僅歷史）

**Hank 跨對話開工**：
1. **PROJECT_RULES.md Part I + III**：共通紀律 + Hank 紀律（特別 §0.4 公司範式）
2. `_team/git-state.md`：main HEAD + branch 狀態
3. `git log --oneline`：最近進度（§0.4-④；worklog 已停更、僅歷史）
4. 對應模組 `spec/`：impl 真相來源

## 8.2 本機 docs/ 結構

```
docs/
├── PROJECT_CONTEXT.md          ← 本檔
├── PROJECT_RULES.md            ← 規範合一
├── _team/                      ← 三人團隊動態
├── _reference/                 ← 跨模組真相表
├── _template/                  ← spec 範本
├── _system/                    ← 系統層
├── _archive/                   ← 一次性歷史
└── nx01~nx10/                  ← 各模組
```

## 8.3 Claude.AI 上傳檔（精簡）

對齊 Crown 「上傳要找半天」痛點解決：

| 固定上傳 | 用途 |
|---|---|
| `PROJECT_CONTEXT.md` | 本檔（業務脈絡）|
| `PROJECT_RULES.md` | 規範合一 |
| `_team/git-state.md` | main HEAD 真相 |
| `_team/system-architecture.md` | 蓋的房子快照 |
| `_team/worklog.md` | 跨模組 task log |
| `nxXX/nxXX-summary.md` | 對應模組功能層級 |

⭐ 每次更新只看 5~6 個固定位置、其他 spec / impl 詳細版本機 Cursor 讀。

---

# Document Control Log

| 版本 | 日期 | 撰寫 | 變更摘要 |
|------|------|------|---------|
| v1.0~v1.6 | 2026-04 至 2026-05-13 | Alex | 紀律段 + 業務段 + 失誤紀錄混合（787 行）|
| v2.0 | 2026-05-15 | Alex | ⭐ 縮版：紀律 / 規則 / 失誤紀錄全部移至 PROJECT_RULES.md、本檔僅保留專案介紹（業務脈絡 / Tier 方案 / 三人團隊 / 技術棧 / 模組代碼 / 業務模型概觀 / 環境 / 關鍵戰略決策 / 文件導航）。對齊 Crown 拍板 Q1=B 中度路徑、釋放 PROJECT_CONTEXT 紀律段 ~500 行進 PROJECT_RULES Part I/II。 |
| v2.1 | 2026-05-15 | Alex | Crown 揭露真相校正：(1) §1 完整重寫業務生態實體：加恆迎企業有限公司（30 年老字號 VAG 中盤商、Crown 工作場域 + NEXORA 設計來源、股東結構周哥/黑哥/林大哥）+ 伊諾瓦資訊科技（願景幫台灣傳產數位轉型）+ NEXORA GRID（為亞羅量身打造）+ 亞羅企業（Crown 計畫的真實 B2B 企業、不是田驗證實驗田）四個實體。(2) §1.4 Yaro 角色翻轉：移除「NEXORA PRO tier 田驗證關鍵」+「不是 demo / 試點」等誤導字眼、改成「Crown 用自家系統的正常商業循環」。(3) §2.4 移除周哥（恆迎股東、非 NEXORA 三人團隊成員、移到 §1.1 介紹）。(4) §7.1 修正 NX01 全 closure 戰略意義字眼。本版對齊 Crown 揭露的完整故事線：恆迎痛點 → 伊諾瓦成立 → NEXORA 開發 → 亞羅應用。 |

---

> 本檔是 NEXORA「**專案是什麼**」單一真相。
> 紀律 / 規則 / 失誤學習 / 工作流見 [PROJECT_RULES.md](./PROJECT_RULES.md)。
> 動態狀態 / task log 見 `_team/`。
