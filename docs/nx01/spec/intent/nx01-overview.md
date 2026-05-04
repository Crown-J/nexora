<!-- NEXORA - NX01 - 共用基礎模組需求規格書 v1.0 -->

# NEXORA - NX01 - 共用基礎模組需求規格書

> 文件版本：v1.0（Crown review 通過、Alex 修訂、Phase 2 軌 1 第一份正式規格書）
> 最後更新：2026-05-02
> 撰寫者：Alex（Claude PM AI）
> 審核者：Crown Lin
> 狀態：v1.0 正式版、待進「欄位細節」階段（子規格書展開）

---

## 文件定位

NX01 主檔規格書 = NX01 模組的「**業務骨架 + 共通規則 + 完整資料表清單**」。

**包含：**
- 模組業務定位
- 子模組業務分類（37 張表完整清單）
- 跨子模組共通業務規則
- 業務角色 vs 子模組權限
- LITE / PLUS / PRO Tier 差異
- 業務踩坑紀錄
- 子規格書展開計畫（含分階段實作建議）

**不包含：**
- 各資料表欄位細節（屬下個階段「欄位細節」、子規格書 NX01-XX）
- 各子模組畫面 / API（屬子規格書）
- schema 細節（屬 Hank 實作架構書 + nx01-worklog）
- 跨模組業務邏輯（屬其他模組規格書 + _shared/worklog.md）

**📚 工程規範索引：**
- 命名規則：見 [CLAUDE.md](CLAUDE.md) §五
- 必填欄位：見 [CLAUDE.md](CLAUDE.md) §六
- 多租戶隔離：見 [CLAUDE.md](CLAUDE.md) §七
- Plan Guard：見 [CLAUDE.md](CLAUDE.md) §八
- 過帳邏輯通用規則：見 [CLAUDE.md](CLAUDE.md) §九
- 重要開發原則：見 [CLAUDE.md](CLAUDE.md) §十五
- 設計哲學：見 [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) §💎
- 擴充性原則：見 [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) § 工程模式 #23

---

## § 1. 模組定位

### 1.1 NX01 是什麼

NX01 是 NEXORA 的「**共用基礎模組**」、所有業務模組的地基。

NEXORA 12 個模組分 3 層：

```
NX99 系統管理            ← 最底層（租戶 / 訂閱 / feature flag）
  ↓
NX01 共用基礎模組        ← 本模組（人 / 物 / 場 / 對象 / 型錄 / 索引）
  ↓
NX02 ~ NX10 業務模組    ← 引用 NX01 才能運作
```

### 1.2 NX01 戰略意義

NX01 不只是「主檔模組」、是 NEXORA 對齊 Yaro 雙武器的**戰略基底**：

```
Yaro 雙武器:
  武器 1:NEXORA 系統能力（Crown + Alex + Hank 在做）
  武器 2:恆迎 30 年資料庫（業務知識資產、Yaro 員工帶過來）

→ NX01 必須能承接「30 年汽車零件業界知識」結構化進系統
→ 不只是 CRUD 主檔、是業界知識的承接底盤
```

這也是 NX01 從原本「10 張表」擴張到「37 張表」的戰略原因。

### 1.3 為什麼是其他模組地基

NX02 ~ NX10 寫業務邏輯時、都會引用 NX01 主檔：

```
NX02 採購 → partner（供應商）/ part / warehouse / currency
NX03 庫存 → part / warehouse / warehouse_type / model（車型適配）
NX04 銷貨 → partner（客戶）/ part / warehouse / user / customer_grade
        / partner_billing_address / partner_shipping_address
NX05 財務 → partner / currency / partner_billing_address
NX06 物流 → partner / warehouse / partner_shipping_address
NX07 人資 → user / role
NX08 報表 → user / partner / part
NX09 知識 → user / role
NX10 遊戲化 → user / role
```

→ NX01 改動可能影響所有業務模組（請走擴充性原則 #23）。

### 1.4 業務人員視角

NX01 的核心使用者：

| 角色 | 用 NX01 做什麼 | 多常用 |
|------|--------------|-------|
| BUSINESS_OWNER（老闆 / 總經理） | 設定主檔、看公告 | 每週 |
| HR_ADMIN（人資主管） | 維護 user / role | 每月 |
| 業務 / 採購 | 維護 partner（自己負責的客戶 / 供應商）| 每天 |
| 倉管 | 維護 part 部分欄位（庫存相關）| 每天 |
| 業務 / 倉管 | 用注音碼快搜（ㄅㄓㄑ → 避震器）| 每天 |
| SYSADMIN（系統管理員、跨租戶） | 系統初始化、租戶開通、字典維護 | 不常 |

對齊設計哲學 #1（[PROJECT_CONTEXT §💎](PROJECT_CONTEXT.md)）：「**中心 = 角色工作台**」。

### 1.5 NX01 擴充性原則應用

NX01 是 NEXORA 最基礎的模組、未來業務需求變化時、NX01 要能「**加新主檔不破壞既有**」。

**已預期的擴充情境：**

1. **加新型錄主檔**
   - 例：其他國家郵遞區號（NEXORA 拓展海外時）
   - 例：其他車型分類維度（如電動車類別）

2. **既有主檔欄位升級**
   - 例：partner.address 拆 6 欄位（已實作為 partner_billing_address / partner_shipping_address）

3. **加新業務功能對應的主檔**
   - 例：固定資產主檔 → 屬 NX05 範圍、不在 NX01

**遵循的原則：** 詳見 [PROJECT_CONTEXT § 工程模式 #23 擴充性原則](PROJECT_CONTEXT.md)。

| 擴充類型 | NX01 對應做法 | 範例 |
|---------|-------------|------|
| 加新東西 | 新主檔走「型錄型」分類、自由加 | 加 nx01_phonetic_dictionary 字典表 |
| 升級既有結構 | 走 3 階段演進（並存 → 遷移 → 廢棄） | partner.address 拆 6 欄位 |
| 改既有語意 | 走兩階段 migration（嚴謹流程） | partner_type 從 CUST/SUP 改 C/S/T/V/B（已完成）|

---

## § 2. 子模組總覽（37 張表）

### 2.1 子模組分類（業務骨架）

NX01 的 37 張表按「**業務維護人 + 業務性質**」分 4 大類：

```
A. 主檔型     業務人員直接維護的核心主檔
B. 型錄型     系統 / 管理者建立、業務人員選用
C. 通知型     跨模組共用通知
D. 索引型     系統自動維護、業務人員無感
```

### 2.2 完整資料表清單（截至 v1.0 / 2026-05-02）

#### 🟢 已實作 controller（10 個 / Phase 5 落地）

| # | 表名 | 業務語意 | 分類 | 主要維護人 |
|---|------|---------|------|----------|
| 1 | nx01_user | 系統使用者帳號 | A 主檔 | HR_ADMIN |
| 2 | nx01_role | 角色權限 | A 主檔 | HR_ADMIN |
| 3 | nx01_part | 料號主檔 | A 主檔 | 採購 / 倉管 |
| 4 | nx01_part_brand | 部品品牌 | B 型錄 | SYSADMIN / BUSINESS_OWNER |
| 5 | nx01_partner | 客戶 / 供應商主檔（含 5 種類型 C/S/T/V/B）| A 主檔 | 業務 / 採購 |
| 6 | nx01_warehouse | 倉庫主檔 | A 主檔 | BUSINESS_OWNER / 倉管 |
| 7 | nx01_warehouse_type | 倉別類型 | B 型錄 | SYSADMIN |
| 8 | nx01_customer_grade | 客戶等級 | B 型錄 | BUSINESS_OWNER |
| 9 | nx01_currency | 幣別 | B 型錄 | SYSADMIN（全域）|
| 10 | nx01_bulletin | 內部公告 | C 通知 | BUSINESS_OWNER / HR_ADMIN |

#### 🟡 schema 已建未實作（11 個）

**本輪確認啟用（3 張、階段 C 進場）：**

| # | 表名 | 業務語意 | 分類 |
|---|------|---------|------|
| 11 | nx01_car_brand | 汽車品牌（VAG / Toyota / BMW 等）| B 型錄 |
| 12 | nx01_brand_code_rule | 品牌編碼規則 ⭐ | B 型錄 |
| 13 | nx01_part_group | 部品族群 | B 型錄 |

**暫保留（8 張、階段 D、看後續業務需求）：**

| # | 表名 | 業務語意 | 分類 | 待拍 |
|---|------|---------|------|------|
| 14 | nx01_department | 部門 | A 主檔 | NX07 邊界 |
| 15 | nx01_team | 團隊 | A 主檔 | NX07 邊界 |
| 16 | nx01_audit_log | 稽核紀錄 | D 索引 | 跨模組 |
| 17 | nx01_country | 國家 | B 型錄 | 海外擴展時 |
| 18 | nx01_location | 位置 | A 主檔 | 待業務驗證 |
| 19 | nx01_calendar_event | 行事曆事件 | C 通知 | 待業務驗證 |
| 20 | nx01_discount_code | 折扣碼 | B 型錄 | 待業務驗證 |
| 21 | nx01_kpi_template | KPI 模板 | B 型錄 | 待業務驗證 |

#### 🆕 第一輪需求新增（5 張、地址相關、階段 B）

| # | 表名 | 業務語意 | 分類 |
|---|------|---------|------|
| 22 | nx01_city | 縣市（約 22 筆）| B 型錄 |
| 23 | nx01_district | 鄉鎮市區（約 368 筆）| B 型錄 |
| 24 | nx01_street | 路街（含 3+3 郵遞區號、數萬筆）⭐ | B 型錄 |
| 25 | nx01_partner_billing_address | 客戶收帳地址（一對一）| A 主檔 |
| 26 | nx01_partner_shipping_address | 客戶送貨地址（一對多 + is_default）| A 主檔 |

#### 🆕 第二輪需求新增（9 張、汽車產品深度分類）⭐ 戰略表（階段 C）

**車輛分類維度（5 張）：**

| # | 表名 | 業務語意 | 分類 |
|---|------|---------|------|
| 27 | nx01_model | 車型基本資料（如 Golf 7 代）| A 主檔 |
| 28 | nx01_engine | 引擎資料（含引擎代碼 / 排氣量）| A 主檔 |
| 29 | nx01_transmission | 變速箱資料 | A 主檔 |
| 30 | nx01_drivetrain | 傳動方式（前驅 / 後驅 / 四驅）| B 型錄 |
| 31 | nx01_model_type | 車體類型（轎車 / 休旅 / 旅行）| B 型錄 |

**零件關聯層（3 張）：**

| # | 表名 | 業務語意 | 分類 |
|---|------|---------|------|
| 32 | nx01_part_model | 零件車型關聯（哪零件適合哪車型）⭐ | A 主檔 |
| 33 | nx01_part_version | 零件版本紀錄 | A 主檔 |
| 34 | nx01_part_relation | 零件關聯（替代品 / 升級品 / 套件）| A 主檔 |

⭐ `nx01_part_model` 是「30 年知識結構化」核心 = Yaro 戰略資產轉型關鍵。

#### 🆕 第四輪需求新增（2 張、注音快搜、階段 B）

⚠️ 第三輪 5 個進階功能歸軌 2、不在 NX01 範圍。

| # | 表名 | 業務語意 | 分類 |
|---|------|---------|------|
| 35 | nx01_phonetic_dictionary | 漢字注音字典（全域型錄）| B 型錄 |
| 36 | nx01_phonetic_index | 主檔注音快搜索引（每租戶、trigger 自動同步）| D 索引 |

#### TBD（1 張）

| # | 表名 | 業務語意 | 分類 |
|---|------|---------|------|
| 37 | （TBD）| Crown 後續提需求時補 | - |

---

### 2.3 子模組分類統計

```
分類      | 已實作 | 已建未實作 | 新增 | 合計
---------|--------|----------|------|------
A 主檔型 |   5    |    3      |  10  |  18
B 型錄型 |   4    |    7      |   8  |  19
C 通知型 |   1    |    1      |   0  |   2
D 索引型 |   0    |    1      |   1  |   2
---------|--------|----------|------|------
合計     |  10    |   12      |  19  |  41 (含 1 TBD)
```

### 2.4 子模組關係圖

```
人:
  user────< role
  user────< 各業務單據（誰建的）

物:
  part────> part_brand
       ────> part_group
       ────> warehouse（預設倉）
       ────< part_model（多對多）── model（車型）
                                 ── engine（引擎）
                                 ── transmission（變速箱）
       ────< part_version（版本歷史）
       ────< part_relation（替代品 / 升級品）

  car_brand────< model
  model────> model_type / drivetrain

場:
  warehouse────> warehouse_type

  city────< district────< street（含 3+3 郵遞區號）
  street────< partner_billing_address
        ────< partner_shipping_address

對象:
  partner────> customer_grade
         ────> currency（預設交易幣別）
         ────< partner_billing_address（一對一）
         ────< partner_shipping_address（一對多）

通知:
  bulletin（獨立、不依賴其他主檔）

索引:
  phonetic_dictionary（全域、漢字 → 注音對照）
  phonetic_index（每租戶、主檔 → 注音碼快搜、trigger 自動同步）
       └ 監聽:nx01_part / nx01_partner（第一階段）
              其他主檔（之後擴充）
```

---

## § 3. 跨子模組共通業務規則

### 3.1 多租戶隔離

所有 NX01 主檔表都帶 `tenantId`、跨租戶資料完全隔離。

詳見 [CLAUDE.md §七 多租戶隔離](CLAUDE.md)。

**全域型錄例外**（不帶 tenantId、所有租戶共用）：
- `nx01_currency`（國際幣別 ISO 標準）
- `nx01_warehouse_type`（倉別類型、跨業界通用）
- `nx01_country`（國家、待啟用）
- `nx01_city` / `nx01_district` / `nx01_street`（台灣行政區、共用）
- `nx01_phonetic_dictionary`（漢字字典、全域共用）

### 3.2 軟刪除 vs 停用

NX01 主檔不能「真刪除」、只能停用（`isActive = false`）：

| 動作 | 業務含義 | 系統行為 |
|------|---------|---------|
| 停用（`isActive = false`）| 該主檔暫不交易 / 不可選 | 既有歷史單據可查、不可新增單據 |
| 真刪除 | ❌ 不允許 | 會破壞歷史單據引用 |

**判斷規則：**
- 主檔只要被任何單據引用過 → 不能真刪、只能停用
- 沒被引用過的可真刪（純 metadata error 修正）

→ 對齊設計哲學 #13「**強制資料溯源**」。

### 3.3 命名規則

- `code` 欄位大寫英文 + 數字（如 `VW-001`、`AUD2024`）
- `code` unique 範圍 = `(tenantId, code)`（不是全域）
- `name` 欄位：中文 / 英文皆可、長度上限 50 字元

詳見 [CLAUDE.md §五 DB / Prisma / ID 命名規則](CLAUDE.md)。

### 3.4 必填欄位規則

每個 NX01 主檔的必填欄位：
- `code`、`name`、`tenantId`（系統自動）
- `createdAt` / `updatedAt`（系統自動）
- `createdBy` / `updatedBy`（系統自動、來自登入 user）

業務必填欄位由各子規格書定義。

詳見 [CLAUDE.md §六 必填欄位規則](CLAUDE.md)。

### 3.5 與其他模組的依賴方向

**單向依賴：** NX02 ~ NX10 引用 NX01、NX01 不反過來引用業務模組。

→ NX01 改動可能影響所有業務模組（請走擴充性原則 #23）。

### 3.6 注音快搜跨主檔機制

**業務情境：**

```
業務人員 / 倉管:
  打「ㄅㄓㄑ」+ F4 → 列出「避震器 / 避震器上座 / 避震器底座」

→ 不必打全名、業界 muscle memory 級快搜
```

**技術機制：**

```
1. 全域字典:nx01_phonetic_dictionary（漢字 → 注音對照、~10000 字）
2. 索引同步:trigger 監聽主檔（如 nx01_part）insert/update
            自動算出注音碼（如「ㄅㄓㄑ」）寫入 nx01_phonetic_index
3. 快搜:UI 打注音碼 → query nx01_phonetic_index → 回主檔資料

→ 對齊 PROJECT_CONTEXT 工程模式 #4「trigger 做 invariant」
→ 注音碼產生:半自動（程式預生 + 業務人員可改、處理多音字）
```

**第一階段支援的主檔：**
- `nx01_part`（料號）
- `nx01_partner`（客戶 / 供應商）

**之後可擴充：** `nx01_warehouse` / 業務單據 / 其他。

### 3.7 新加 NX01 子模組的檢查清單

對齊 [PROJECT_CONTEXT § 工程模式 #23 擴充性原則](PROJECT_CONTEXT.md)：

```
☐ 業務分類確定（A 主檔 / B 型錄 / C 通知 / D 索引）
☐ tenantId 多租戶隔離（除非全域型錄）
☐ code 命名規則對齊（大寫 + tenant-scoped unique）
☐ 必填欄位列出（含系統自動的 5 欄）
☐ 跟既有 NX01 子模組的關係明確
☐ 跨模組引用標明（NX02-NX10 哪些會引用）
☐ 子規格書編號接續分配（NX01-NN）
☐ Document Control Log 紀錄新增
☐ 注音索引（如為主檔型）：trigger 是否要監聽?
```

---

## § 4. 業務角色 vs 子模組權限

### 4.1 SYSADMIN（系統管理員、跨租戶）

- 可看 / 改：所有租戶的所有主檔
- 主要維護：全域型錄（currency / warehouse_type / city / district / street / phonetic_dictionary）
- 不開放 UI 登入、僅供 DB seed/migration 使用

### 4.2 BUSINESS_OWNER（老闆 / 總經理）

- 可看 / 改：自己租戶內所有 NX01 主檔
- 主要維護：warehouse / customer_grade / bulletin / car_brand / part_brand
- 通常會委派給 HR_ADMIN / 業務 / 採購

### 4.3 HR_ADMIN（人資主管）

- 可看 / 改：user / role
- 不可看 / 改：part / partner（不是人資業務）
- 可看 bulletin（公告對象之一）

### 4.4 業務 / 採購 / 倉管

- 可看自己負責範圍內的主檔
- 可改自己建立的主檔（如業務改自己客戶）
- 不可改他人建立的主檔（除非 BUSINESS_OWNER 授權）
- 可使用注音快搜跨主檔查詢

→ 詳細權限矩陣由 NX01-02 角色權限子規格書定義。

---

## § 5. LITE / PLUS / PRO Tier 差異（v1.0 拍板版）

NX01 主檔層面的 tier 差異：

### LITE（單店 / 小團隊）

```
目標客群:單店汽修廠 / 小型汽車材料行
功能:
  - 倉庫數限制 1
  - user 數限制 5
  - customer_grade 預設 1 級（不開放自定）
  - 多幣別:不開放（只 TWD）
  - 注音快搜:✅ 支援（核心體感、必須開放）
  - 地址 3+3 結構化:✅ 支援（寄帳單必要）
  - 汽車產品深度分類:不開放（用 part + part_brand 簡單版）
```

### PLUS（中型 / 多倉）

```
目標客群:中型汽車零件商
功能:
  - 倉庫數限制 5
  - user 數限制 30
  - customer_grade 開放（最多 10 級）
  - 多幣別:開放（TWD + 國外多幣別）
  - 注音快搜:✅ 支援
  - 地址 3+3 結構化:✅ 支援
  - 汽車產品深度分類:✅ 開放
```

### PRO（大型 / 多廠 / 海外、Yaro 主場）

```
目標客群:大型汽車零件批發商 / 連鎖經銷
功能:
  - 倉庫數無限
  - user 數無限
  - customer_grade 無限
  - 多幣別無限
  - 注音快搜:✅ 支援
  - 地址 3+3 結構化:✅ 支援
  - 汽車產品深度分類:✅ 完整開放 ⭐ Yaro 戰略
  - 30 年資料庫遷移服務:加值服務（NEXORA 顧問協助匯入）
  - 進階功能（自動補貨 / 路線優化 / 自動配單 / 資產殘值 / 自動推預算）:✅ 完整開放
```

→ Tier 差異會影響 Plan Guard 設計（[CLAUDE.md §八](CLAUDE.md)）。

---

## § 6. 業務踩坑紀錄

### 6.1 v7_baseline 黃金窗口（unique 漏 tenantId）

**事件：** 2026-04-13 v7 baseline 落地當天、發現 `Nx01Warehouse / Nx01PartBrand / Nx01Partner / Nx01Role` 的 `code` 設為**全域 unique**、跨租戶撞號。

**解法：** 同日加 migration 改成 `(tenantId, code)` composite unique。

**教訓：**
- Schema review 時看到 `@@unique([code])` 不帶 tenantId、預設質疑
- v7_baseline 後 1~2 週是「**黃金 audit 窗口**」、業務測試會揭露所有 unique 缺漏

詳見 [_shared/worklog.md 主題 8](docs/_shared/worklog.md)、[nx01-worklog 主題 1](docs/nx01/nx01-worklog.md)。

### 6.2 partner_type 單字元定案史

**演進：**
1. 早期：`partner_type` 用 `CUST` / `SUP` / `BOTH` 字串
2. 中期：發現「BOTH」無法擴充、新類型難加
3. 定案：改單字元 `C` / `S` / `T` / `V` / `B`

**業務語意：** C=客戶 / S=供應商 / T=外包物流 / V=一般廠商 / B=銀行

**教訓：** 早期不留擴充空間 → 加新類型要全 repo update。對應擴充原則 #23 類型 3。

### 6.3 Banker（B）未來獨立 nx01_bank_account

**現況：** `partner_type = 'B'` 暫時把銀行當 partner 處理。

**未來：** 銀行架構上應獨立 `nx01_bank_account` 表（屬性不同：分行 / 帳號 / SWIFT）。

詳見 [CLAUDE.md §十五#7](CLAUDE.md) partner_type B 註解。

### 6.4 擴充性踩坑預期

未來可能遇到的擴充性挑戰：

1. **海外擴展撞型錄不足**
   - currency 從 TWD 擴到多幣別
   - country 從台灣擴到全球
   - 各國郵遞區號表（如日本 / 美國 / 中國）

2. **partner.address 拆 6 欄位（已對齊 v1.0 設計）**
   - 拆 2 張表：billing_address（一對一）+ shipping_address（一對多）
   - 走擴充原則類型 2「升級既有結構」3 階段演進
   - 階段 1 並存 → 階段 2 遷移 → 階段 3 廢棄舊 address

3. **汽車產品深度分類資料來源**
   - 9 張車輛 + 零件關聯表的初始資料來源
   - Crown 揭露：靠 Yaro 員工（恆迎背景）2028 開業時帶入
   - 不是「從 0 建立」、是「30 年知識結構化」
   - 風險：若資料遷移品質差、戰略價值打折

4. **注音字典維護**
   - phonetic_dictionary ~10000 字、初次匯入後極少改
   - 但多音字校正可能要業務人員手動 override
   - 對齊半自動策略（程式預生 + 業務可改）

5. **role 從 8 種擴充到更多**
   - 現有 8 種已對齊 Yaro 業界實際
   - 未來其他客戶可能需要更細的角色

---

## § 7. 子規格書展開計畫

### 7.1 階段建議

NX01 共 37+ 張表、不可能一次寫完所有子規格書。對齊擴充原則 #23 + Crown 戰略時程（2028 開業）：

#### 階段 A：基礎業務跑（已完成、Phase 1 收官）

- 已實作 10 張表（nx01_user / role / part / partner / warehouse / 等）
- 子規格書：Hank 跟 Phase 5 直接實作、Alex 之後補規格書

#### 階段 B：業務人員效率（Phase 2 ~ 2028 開業前）

新增表：7 張、按 dependency 分 3 波實作

**第 1 波（最先做、業務直接體感）：**
- nx01_phonetic_dictionary ⭐ 注音字典（全域、一次匯入）
- nx01_phonetic_index ⭐ 注音索引（trigger 監聽 part / partner）
- 理由：業界 muscle memory 級快搜、Yaro 員工從恆迎來會立刻有感

**第 2 波（地址相關、寄帳單必要）：**
- nx01_city
- nx01_district
- nx01_street（含 3+3 郵遞區號）
- nx01_partner_billing_address
- nx01_partner_shipping_address
- 理由：寄帳單必要

**第 3 波（啟用既有 schema、業務人員效率）：**
- nx01_part_brand 加強（既有實作 + brand_code_rule 整合）
- nx01_brand_code_rule
- nx01_part_group
- 理由：業務人員效率提升

#### 階段 C：汽車產品深度分類（2028 開業前完成、戰略表）⭐

新增表：9 張、按 dependency 分 3 波實作

**第 1 波（基礎汽車分類）：**
- nx01_car_brand
- nx01_model_type（車體類型）
- nx01_drivetrain（傳動方式）
- 理由：建 model 前要先有分類

**第 2 波（車型核心）：**
- nx01_engine
- nx01_transmission
- nx01_model ⭐ 車型 = 30 年資料承接核心
- 理由：model 引用 engine + transmission + model_type + drivetrain

**第 3 波（零件關聯、最戰略）：**
- nx01_part_model ⭐⭐ 30 年知識結構化核心
- nx01_part_version
- nx01_part_relation
- 理由：part_model 引用 part + model（兩邊都要建好）

→ 階段 C 是 Yaro 戰略核心、必須 2028 開業前完成。

#### 階段 D：輔助主檔（業務真要時、暫保留）

8 張暫保留 schema：
- Department / Team / AuditLog（人）
- Country / Location / CalendarEvent（場 / 通知）
- DiscountCode / KpiTemplate（型錄）

→ 業務真要時、再寫子規格書 + 啟用 schema。

### 7.2 子規格書清單（v1.0 拍板版、共 16 份）

對齊 Q3 拍板「合併型錄類」+ Q4 拍板「partner 1 份通用」：

| 編號 | 子規格書名稱 | 階段 | 字數預估 |
|------|------------|------|---------|
| NX01-01 | 用戶管理工作站 | A | 3000~5000 |
| NX01-02 | 角色權限工作站 | A | 3000~5000 |
| NX01-03 | 客戶/供應商主檔工作站（含 5 種 partner_type + 地址 + 注音搜尋）| A+B | 8000~12000 |
| NX01-04 | 料號主檔工作站（含品牌編碼 + 注音搜尋）| A+B | 6000~9000 |
| NX01-05 | 倉庫主檔 | A | 3000~5000 |
| NX01-06 | 基礎型錄管理（part_brand / warehouse_type / customer_grade / currency / part_group 5 個合併）| A+B | 6000~8000 |
| NX01-07 | 公告系統 | A | 3000~5000 |
| NX01-08 | 地址型錄系統（city / district / street）| B | 4000~6000 |
| NX01-09 | 注音快搜系統（dictionary / index）| B | 4000~6000 |
| NX01-10 | 品牌編碼規則 | B | 3000~5000 |
| NX01-11 | 汽車品牌型錄（car_brand）| C | 2000~3000 |
| NX01-12 | 車型基本資料（model）| C | 4000~6000 |
| NX01-13 | 引擎資料（engine）| C | 3000~5000 |
| NX01-14 | 車輛分類型錄（transmission / drivetrain / model_type 3 個合併）| C | 4000~6000 |
| NX01-15 | 零件車型關聯（part_model）⭐ | C | 5000~7000 |
| NX01-16 | 零件版本 + 關聯（part_version + part_relation 合併）| C | 4000~6000 |

合計 16 份子規格書、預估 65000~99000 字。

### 7.3 新加子規格書的編號規則

對應擴充性原則 #23 紀律：

```
新加 NX01 子規格書 = 接續編號、不插隊

範例:
  - 加日本郵遞區號 → NX01-17（接續、不插進中間）
  - 之後加員工部門相關 → NX01-18
  - 編號穩定、跨對話讀文件不混亂
```

### 7.4 NX01 規格書群版本演進（v1.0 拍板版）

對齊 Q5 拍板「階段 A+B 算 v1.0」：

```
v1.0 = 階段 A（已實作）+ 階段 B 完成
       9 份子規格書（NX01-01 ~ NX01-10、其中 partner 1 份通用）
       業務跑得起來、對齊 multi-Hank 試跑時程
       
v2.0 = 階段 C 完成（再加 6 份 = 共 15 份）
       戰略表完整、對齊 Yaro 2028 開業
       
v3.0 = 階段 D 完成（再加 8 份 = 共 23 份）
       輔助主檔完整、對齊長期業務擴張
```

→ 對齊規格書版號慣例（v1.0 = 業務可跑、v2.0 = 戰略完整、v3.0 = 全模組覆蓋）

### 7.5 子規格書範本

對齊 UNI_IMS 風格 + NEXORA 設計哲學：

```
NX01-XX [子模組名稱]子規格書 v0.1.0

§ 1. 子模組定位（業務人員視角、用什麼任務）
§ 2. UI 頁面（列表 / 詳細 / 搜尋 / 編輯）
§ 3. 業務規則
  3.1 PK（unique 範圍）
  3.2 業務檢核（必填 / 格式 / 跨欄位）
  3.3 跨主檔連動（引用其他主檔）
  3.4 跨業務模組連動（哪些單據會引用此主檔）
§ 4. 欄位列表（每個欄位：業務語意 / 必填 / 預設值 / 來源）
§ 5. 工作流程（如倉管維護 part 跟採購維護 part 的差異）
§ 6. 角色權限（誰可看 / 誰可改）
§ 7. Tier 差異（LITE/PLUS/PRO 在此子模組的差異）
§ 8. 注音索引（如為主檔型、是否要 trigger 同步 phonetic_index）
§ 9. Document Control Log
```

---

## § 8. Document Control Log

| 版本 | 日期 | 撰寫者 | 變更摘要 |
|------|------|-------|---------|
| v0.1.0 | 2026-05-02 | Alex | 初稿（Phase 2 軌 1 第一份規格書） |
| v0.2.0 | 2026-05-02 | Alex | Crown + Alex 盤點 37 張表完成（4 輪需求發散）|
| v1.0 | 2026-05-02 | Alex | Crown 拍 5 個 Q、修訂後正式版 |

**v1.0 主要變更（vs v0.2.0）：**

對應 Crown 拍板的 5 個 Q：

- **Q1（業務優先序）**：§7.1 階段 B/C 內細排 3 波（dependency 順序 + 業務體感優先）
- **Q2（Tier 差異）**：§5 修正 PLUS 規模（5 倉/30 user/10 級）+ PRO 加值服務（30 年資料遷移 + 進階功能）
- **Q3（合併型錄）**：§7.2 子規格書數從 24 份降為 16 份（簡單型錄合併、複雜業務獨立）
- **Q4（partner 1 份）**：NX01-03 改為「客戶/供應商主檔工作站」（涵蓋 5 種 partner_type）、移除 NX01-04 獨立供應商
- **Q5（v1.0 完成標準）**：§7.4 v1.0 = 階段 A+B（9 份子規格書）/ v2.0 = 階段 C / v3.0 = 階段 D

---

## § 9. 下一階段：欄位細節（子規格書展開）

v1.0 通過後、進「欄位細節」階段：

```
1. Crown 拍下一階段第一個子規格書（如 NX01-01 用戶管理工作站）
2. Alex 寫該子規格書 v0.1.0 草稿
3. Crown review → 拍 → 升 v1.0
4. Crown 把 v1.0 給 Hank → Hank push 到 docs/nx01/spec/intent/01-user.md
5. Hank 跟著子規格書實作 schema + service + UI
6. 重複以上、累積 9 份子規格書 = 階段 B 完成 = NX01 規格書 v1.0 落地
```

**Multi-Hank 試跑啟動時機：** _shared/worklog.md 完成 + NX01 第一份子規格書（如 NX01-03 客戶/供應商主檔工作站）寫完 → Crown 開兩個 Cursor、Hank-Frontend / Hank-Backend 並行試跑。

詳見 [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) Phase 2 規劃。

---

*文件結束。NX01 主檔規格書 v1.0 落地、待進子規格書階段。*
