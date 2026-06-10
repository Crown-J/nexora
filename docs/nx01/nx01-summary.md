<!-- docs/nx01/nx01-summary.md -->

# NX01 主檔管理 — 模組架構書（給 Claude.AI 上傳簡化版）

> 文件版本：v1.0
> 最後更新：2026-05-15
> 撰寫：Hank（整合 18 份子規格書 / 8,237 行 → 600 行壓縮）
> 性質：模組層 summary、跨對話接力 Hank / Alex 必讀
> 完整子規格在 `docs/nx01/spec/intent/`（本機 Cursor 讀、不上傳 Claude.AI）

---

# § 1. NX01 模組業務角色

## 1.1 模組定位

NX01 = **NEXORA 主檔管理層**、全 NX02~NX09 業務模組的底層基礎設施。

```
NX02 採購 / NX03 庫存 / NX04 銷貨 / NX05 財務 / NX06 物流 / NX07~NX09 PRO
                    ↓ 全部引用
NX01 主檔（user / partner / part / warehouse / model / part_model ...）
                    ↓ 引用
NX99 tenant（多租戶根）
```

**戰略意義**：
- ⭐⭐ Yaro 開業前完成主檔層、Crown 用自家 NEXORA 經營亞羅的基礎
- ⭐ 業界 30 年「業務員 muscle memory」→ 系統結構化查詢的核心改革
- ⭐ 多租戶 SaaS：所有業務表 tenant_id 隔離、跨 tenant 完全阻絕

## 1.2 17 子模組拓樸順序

```
基礎層（無依賴）：
  NX01-01 user ─┐
  NX01-02 role ─┴─→ 全模組身份 + 權限基礎

實體層（基本主檔）：
  NX01-03 partner ─→ NX01-04 address（billing + shipping）
  NX01-08 bulletin（獨立、不依賴其他主檔）
  NX01-09 address-catalog（city / district / street、全域型錄）
  NX01-10 phonetic-search（注音字典 + 索引、基礎設施）

主檔層（依賴基礎）：
  NX01-06 warehouse ─→ 倉庫實體
  NX01-07 base-catalog（part_brand / customer_grade / warehouse_type / currency / country）
  NX01-12 car-brand ─→ NX01-14 engine
                  └─→ NX01-15 vehicle-classification（transmission / drivetrain / model_type）
                  └─→ NX01-13 model（5 FK：car_brand + engine + 三分類）

戰略層（最後落地、30 年業界知識結構化核心、亞羅開業優先實施）：
  NX01-11 brand-code-rule ─→ NX01-05 part ─→ NX01-17 part-version + part-relation
                                       └─→ NX01-16 part-model ⭐⭐（料件↔車型適配）
```

## 1.3 milestone

| 日期 | 里程碑 | 狀態 |
|------|-------|------|
| 2026-04-25 | docs/ v2 結構建立、Alex 開始撰寫 NX01 規格書 | ✅ |
| 2026-05-04 | NX01-overview v1.0 + 17 子規格書清單拍板 | ✅ |
| 2026-05-06 | NX01-01~04 + 06 + 08 子規格 v1.0 落地 | ✅ |
| 2026-05-13 | NX01-10/11/12 三模組同步落地（part.service hotfix）| ✅ |
| 2026-05-13 | NX01-13 + NX01-14 + NX01-15 落地 | ✅ |
| 2026-05-14 | NX01-07 + NX01-05 落地 | ✅ |
| 2026-05-15 | NX01-17（part_version + part_relation + 軸 1 SmallInt）落地 | ✅ |
| **2026-05-15** | ⭐⭐ **NX01-16 part_model 落地、NX01 17 份子規格書 + impl 全 closure** | ✅ |

---

# § 2. 子模組壓縮（17 份 × ~30 行）

## NX01-01 user（系統使用者）

- **業務語意**：NEXORA 全模組身份識別單一真相、所有「誰建的 / 誰改的」都引用 user
- **表名**：`nx01_user` + `nx01_user_role` + `nx01_user_warehouse`（PLUS）+ `nx01_user_team`
- **ID prefix**：USER（`NX01USER0000001`）
- **戰略地位**：⭐ 基礎層、無前置依賴
- **Crown 拍板（v1.0）**：SYSADMIN（NX01USER0000001、is_active=false、僅供 DB 匯入）vs 租戶 admin（NX01USER0000002、首次強制改密碼）
- **業界 muscle memory**：業務員流動率高、user 不可硬刪、走 is_active=false 軟停用
- **seed 範式**：system seed（SYSADMIN）+ default seed（每 tenant 一個 admin）
- **落地狀態**：✅ Phase 0 已落地、後續軌 NX01-01-IMPL closure
- **跨軌**：被全 NX 模組 reverse 引用 created_by / updated_by（鐵律）

## NX01-02 role（角色權限）

- **業務語意**：NEXORA 全模組權限執行單一真相、RBAC 826 筆預設權限
- **表名**：`nx01_role` + `nx01_role_view`（826 筆）+ `nx01_view`（118 個畫面代碼）
- **ID prefix**：ROLE + ROVI + VIEW
- **戰略地位**：⭐ 基礎層、無前置依賴
- **Crown 拍板（v1.0）**：7 角色（SYSADMIN / OWNER / HR / SALES / PURCHASING / WAREHOUSE / FINANCE）、原 8 個 LOGISTICS 移除 + HR_ADMIN 併入 HR
- **業界 muscle memory**：partner_type=T（外包物流）取代 LOGISTICS role、業務上更精準
- **seed 範式**：system seed（118 view + 826 role_view 預設權限）
- **落地狀態**：✅ Phase 0 落地 + 2026-05-06 角色校正
- **跨軌**：被 user_role / role_view 引用、Plan Guard 依角色判斷

## NX01-03 partner（交易對象主檔）

- **業務語意**：對外往來對象統一主檔（客戶 / 供應商 / 外包物流 / 一般廠商 / 銀行）
- **表名**：`nx01_partner`、ID prefix PTNR、`nx01_partner_credit`（信用額度）
- **戰略地位**：⭐ 跨模組高頻引用（NX02 採購 / NX04 銷貨 / NX06 物流）
- **Crown 拍板（v1.0）**：partner_type 單字元 5 種（C 客戶 / S 供應商 / T 外包物流 / V 一般廠商 / B 銀行）、舊 CUST/SUP/BOTH 移除
- **業界 muscle memory**：partner_type=B（銀行）架構上未來該獨立 nx01_bank_account 表（A-backlog）
- **seed 範式**：空表進、tenant 自加
- **落地狀態**：✅ Phase 0 + 2026-05-05 v1.0 規格
- **跨軌**：被 5+ 模組業務單據引用（PO / RR / SO / DN / AR / AP）

## NX01-04 address（地址延伸 billing + shipping）

- **業務語意**：partner 主檔的地址延伸、處理「往哪裡寄」精準資訊
- **表名**：`nx01_partner_billing_address`（一對一）+ `nx01_partner_shipping_address`（一對多）
- **ID prefix**：PTBA + PTSA
- **戰略地位**：一般、依賴 NX01-03 + NX01-09 address-catalog
- **Crown 拍板（v1.0）**：地址結構化（country / zip / city / district / street_main / street_sub）+ legacy `address` 欄位並存（擴充性原則 #23 階段 1 並存範式）
- **業界 muscle memory**：客戶送貨地址常多個（公司倉 / 修車廠 / 客戶家）、billing 一個夠
- **落地狀態**：✅ migration 已建（20260505095333_nx01_partner_address_create_2_tables）

## NX01-05 part（料號主檔）⭐⭐

- **業務語意**：NEXORA 業務心臟、最後整合節點、25 條 reverse 引用 5 業務模組
- **表名**：`nx01_part`、ID prefix PART、`nx01_part_brand` + `nx01_part_group`
- **戰略地位**：⭐⭐ 戰略表、跨 NX02/03/04/06/08 全範圍引用
- **Crown 拍板（v1.0）**：Q1~Q9 全 A（codeRuleId NN / 跨產地 unique / UNK 佔位保留字 / 後端拼接 / 全 snapshot 範式 / type SmallInt 軸 1 升）
- **業界 muscle memory**：part_code = 業界查料唯一索引、跨產地不同料（同 OEM 號 / 不同國家不同料）
- **業界 muscle memory**：UNK 佔位（料號未補齊先建可暫填、後續業務人員補正、絕不混用 NULL）
- **業界 muscle memory（料號顯示完整格式、v1.1）**：`{零件品牌代碼} - {SEG1 SEG2 …單空格} #{產地代碼}`（例 VAG - 03H 115 562 H #DEU）；SEG4/5 用不到自動隱藏；未選編碼規則＝手動料號、不加前後綴；適用車型交給 nx01_part_model、part 不加 carBrandId
- **seed 範式**：空表進、Yaro 30 年資料走獨立匯入軌
- **落地狀態**：✅ commit `5cd62ae`（NX01-05 完整 schema + service + UNK guard + previewCode）+ production hotfix `fb1dae4`（partBrandId → carBrandId 軸翻轉）
- **跨軌**：依賴 NX01-11 brand_code_rule（codeRuleId 改選填）、被 NX01-17（part_version snapshot + part_relation 雙向 FK）+ NX01-16（part_model）+ 25 reverse 引用
- **下半場 v1.1（2026-05-27）**：codeRuleId 改選填；新增 oldCode（舊料號）/ cost（成本）；正廠對應料號子表 `nx01_part_oem_code`（一料多正廠號）；**displayCode 即時組合範式**（完整料號 `{品牌} - {SEG 單空格} #{產地}`、不存 DB）；搜尋正規化同時 match 主料號 / 替代品（正廠對應料號）

## NX01-06 warehouse（倉庫主檔）

- **業務語意**：NEXORA 庫存實體儲存單位、所有「東西放哪」紀錄都引用
- **表名**：`nx01_warehouse`、ID prefix WARE、`nx01_warehouse_type`（PLUS）
- **戰略地位**：⭐ 跨 NX03 庫存全範圍 + NX02 進貨 / NX04 出貨引用
- **Crown 拍板（v1.0）**：LITE 單倉（MW1）/ PLUS 多倉（MW1+BW1）/ PRO 預設 6 倉（HW1+MW1+BW1~4、上限無限）
- **業界 muscle memory**：6 倉模型參考自恆迎（HW 總倉 + MW 主倉 + BW 分倉）、Yaro 規劃用此架構
- **業界 muscle memory（PRO 倉真相）**：「預設 6 倉 vs 上限無限」分層、A035 algebra drift 校正 5→6（HW1+MW1+BW1+BW2+BW3+BW4=6）
- **seed 範式**：default seed（LITE/PLUS/PRO 不同筆數）
- **落地狀態**：✅ Phase 0 + 2026-05-06 v1.1 PRO 倉真相校正
- **跨軌**：所有庫存 / 進銷貨單據必含 warehouse_id
- **下半場 v1.1（2026-05-27）**：**據點 / 倉庫 / 庫位三層拆分** —— 新增 `nx01_site`（據點、公司物理分點、LITE 預設「主要倉庫(M)」1 筆）、`nx01_warehouse` 加 siteId（所屬據點）、`nx01_location` 正名為「庫位」（沿用原表、18 個庫存外鍵零影響）
- **下半場 v1.2（2026-05-27 收尾補強）**：據點/倉庫 3 drift 補齊 —— warehouse.siteId 改 NN + 真 FK（onDelete RESTRICT）；site 加結構化地址欄位 city/district/street（並存、picker 待 NX01-04 端點）；site 加 isMain + partial unique（每 tenant 一筆主據點）。⚠️ 結構化地址 picker（site + warehouse 共用）卡 NX01-04 地址端點未接

## NX01-07 base-catalog（基礎型錄 5 表合一精煉）

- **業務語意**：part_brand / part_group / customer_grade / warehouse_type / currency / country 等小型錄主檔
- **表名**：5+ 個基礎型錄（精煉軌只動 part_group + customer_grade）
- **ID prefix**：PABR / PAGR / CUGR / WHTP / CURR / COUN
- **戰略地位**：基礎、跨模組高頻引用
- **Crown 拍板（v1.0）**：Q4=A 精煉路徑、只動 part_group（補後端、接通既有 UI）+ customer_grade（補 PATCH + schema unique）、其他 3 表保現況
- **業界 muscle memory**：customer_grade 4 級 A/B/C/D（毛利下限 + 售價上限）、由銷售組長管理
- **業界 muscle memory**：code 屬保留字、不開放 create / delete（對齊 warehouse_type read-only 範式、DTO whitelist 防護）
- **落地狀態**：✅ commit `e00dbde`（NX01-07 精煉軌 closure）
- **跨軌**：被 part / partner / warehouse / 報價單引用

## NX01-08 bulletin（公告系統）

- **業務語意**：OWNER / HR 對租戶內成員的通知公告系統
- **表名**：`nx01_bulletin`、ID prefix BULL
- **戰略地位**：一般、獨立、不依賴其他主檔
- **Crown 拍板（v1.0）**：3 type（S=系統 / C=公司 / R=提醒）+ is_pinned 置頂 + expired_at（NULL=永久）+ 1 個月到期預設
- **seed 範式**：空表進
- **落地狀態**：✅ Phase 0 schema + 2026-05-11 規格

## NX01-09 address-catalog（地址型錄 city / district / street）

- **業務語意**：NEXORA 全域共用台灣地址型錄、3+3 郵遞區號
- **表名**：`nx01_city` + `nx01_district` + `nx01_street`
- **戰略地位**：基礎、全域型錄（非 tenant scoped）
- **Crown 拍板（v1.0）**：3 表階層（city ─< district ─< street）+ 包含 3+3 郵遞區號
- **業界 muscle memory**：street 含主路 + 段落（如「中山北路 二段」）、業務寫地址常用此粒度
- **seed 範式**：system seed（台灣全域、非 tenant 變動）
- **落地狀態**：✅ 2026-05-11 v1.0 規格、Phase 0 schema

## NX01-10 phonetic-search（注音快搜系統）⭐

- **業務語意**：業務人員 muscle memory 級快搜基礎設施、2 表（字典 + 索引）
- **表名**：`nx01_phonetic_dictionary`（全域字典）+ `nx01_phonetic_index`（每租戶、trigger 自動同步）
- **ID prefix**：PHDI + PHIN
- **戰略地位**：⭐ 中文密集主檔（part / partner / user）快搜基礎設施
- **Crown 拍板（v1.0）**：Q1~Q5 全 A 對齊 Hank 推薦、trigger-based 同步（part / partner 第一階段）
- **業界 muscle memory**：業務員常打「ㄐㄧㄚˇ」快速找「假」「甲」「鉀」相關料、注音是中文業界 muscle memory
- **seed 範式**：phonetic_dictionary system seed（全域漢字 → 注音對照）+ phonetic_index 由 trigger 自動 populate
- **落地狀態**：✅ 三模組同步落地軌（NX01-12-IMPL-v2）、trigger attach 待 A061 後續軌

## NX01-11 brand-code-rule（品牌編碼規則）

- **業務語意**：part_code_2 結構化編碼規則定義表、業界戰略核心
- **表名**：`nx01_brand_code_rule`、ID prefix BCOR
- **戰略地位**：⭐ 部品編碼業界戰略、SEG 動態定義（seg1~5 各組字數）
- **Crown 拍板（v1.0）**：Q3=B 軸翻轉 partBrandId → carBrandId（業界真相校正）、seg JSON 結構 / brand_sort 排列順序
- **業界 muscle memory**：VAG 料號 brand_sort=23145（不是 12345）、每品牌排列順序業界已成 muscle memory
- **業界 muscle memory**：跨品牌 unique 不存在（恆迎 18 年沒發生過、Crown #13 過度防呆校正）
- **落地狀態**：✅ commit `fb1dae4`（production blocker hotfix：part.service auto-vivify 廢棄、codeRuleId NN）+ 三模組同步軌
- **跨軌**：part.codeRuleId 改選填 FK
- **下半場 v1.1（2026-05-27）**：**軸翻轉 carBrandId → partBrandId**（對應零件品牌、同品牌可多規則以 name 區分）；拿掉 JSON segDefinitions / segCount / sourceCodePrefix，改 SEG1~5 字數欄位；**分隔符欄位移除**（全 NEXORA 料號 SEG 一律單空格）

## NX01-12 car-brand（汽車品牌型錄）

- **業務語意**：汽車品牌主檔、VAG 生態圈核心（VW / Audi / Skoda / SEAT 等）
- **表名**：`nx01_car_brand`、ID prefix CABR
- **戰略地位**：⭐ NX01-13 model + NX01-14 engine + NX01-15 三分類的上游
- **Crown 拍板（v1.0）**：seed 4 個 VAG 子品牌全 DEU（業界真相校正、原 5 個全 TWN drift 修正）+ name_en + logo_url 補
- **業界 muscle memory**：VAG = Volkswagen Audi Group、4 大品牌德國總部、台灣經銷生態
- **seed 範式**：default seed（4 個 VAG 子品牌、跨 tenant 預載）
- **落地狀態**：✅ 三模組同步落地軌（NX01-12-IMPL-v2、`8b0a6bc` merge）
- **跨軌**：被 NX01-13 model.carBrandId NN + NX01-14 engine + NX01-11 brand_code_rule 引用

## NX01-13 model（車型主檔）⭐

- **業務語意**：具體車輛單位（如「Golf 7 GTI 2017~2024 年式」）、30 年資料承接核心
- **表名**：`nx01_model`、ID prefix MODL
- **戰略地位**：⭐ A 主檔、被 NX01-16 part_model 戰略引用
- **Crown 拍板（v1.0）**：Q1=A modelYearFrom/To INT 結構化（業界備註「17>24」→ 2017+2024）/ Q2=A code+name 雙欄位（業界縮寫 G7-GTI + 正式全名 Golf 7 GTI）/ Q3=A carBrandId NN
- **業界 muscle memory**：業界用「備註欄」自由文字記車型（G7 GTI / Golf7 GTI / Golf 7 代 GTI 全指同車）、NEXORA 改革成結構化 code + name 雙欄位
- **業界 muscle memory**：改款處理走「拆 model」（G7-GTI-前期 vs G7-GTI-後期）、不在 part_model 重複記年份
- **seed 範式**：空表進、tenant 自加（每店家車型清單不同）
- **落地狀態**：✅ commit `17e646f`（NX01-13 + NX01-15 三表同步軌）
- **跨軌**：5 個上游 FK（carBrand NN + engine/transmission/drivetrain/model_type 全 nullable）+ 被 NX01-16 part_model 引用

## NX01-14 engine（引擎資料）

- **業務語意**：引擎主檔、含引擎代碼 + 排氣量 + 燃料類型
- **表名**：`nx01_engine`、ID prefix ENGN
- **戰略地位**：⭐ 被 NX01-13 model 引用（nullable）
- **Crown 拍板（v1.0）**：fuelType SmallInt enum（1=汽油 / 2=柴油 / 3=油電 / 4=純電 / 5=氫能）軸 1 字母升 SmallInt
- **業界 muscle memory**：引擎代碼業界縮寫慣例（如 EA888 第三代 = VAG 2.0 TSI 汽油 245HP）
- **業界 muscle memory**：fuelType 5 級分類 = NEXORA 未來電動車 / 氫能擴充預留
- **seed 範式**：空表進、tenant 自加（每店家熟悉的引擎清單）
- **落地狀態**：✅ commit `f7d41b0`（NX01-14 IMPL closure）

## NX01-15 vehicle-classification（車輛 3 分類合併）

- **業務語意**：transmission（變速箱）+ drivetrain（傳動）+ model_type（車體類型）3 個型錄合併
- **表名**：`nx01_transmission` + `nx01_drivetrain` + `nx01_model_type`（B 型錄）
- **ID prefix**：TRMS + DRVT + MDLT
- **戰略地位**：基礎型錄、被 NX01-13 model 引用（全 nullable、進階用戶選填）
- **Crown 拍板（v1.0）**：transmissionType / drivetrainType / modelType 全 SmallInt enum 軸 1
- **業界 muscle memory**：詳細分類進階用戶選填（基礎用戶只填 carBrand + model）、UI 不強迫填滿
- **落地狀態**：✅ 三表同步落地軌（部分 commit `17e646f`）

## NX01-16 part-model（料件車型適配）⭐⭐

- **業務語意**：料件 ↔ 車型適配關聯表、30 年業界知識結構化核心、亞羅開業優先實施
- **表名**：`nx01_part_model`、ID prefix PAMO
- **戰略地位**：⭐⭐ NX01 17 份子規格書最後 1 份、NX01 主檔層收尾
- **Crown 拍板（v1.0）**：Q1=A unique=(tenantId, partId, modelId) 1料1車1行 / Q3=B fitLevel SmallInt enum（1=原廠 / 2=副廠等效 / 3=通用替代）/ Q4=A 本軌不嵌 part 編輯頁適配 section（後續軌 A073）/ Q5=A 空表進
- **業界 muscle memory**：業務員 30 年腦中記憶 + 紙本筆記「G7 GTI 機油濾芯 06L 115 562」→ NEXORA 結構化 part ↔ model 關聯查詢
- **業界 muscle memory**：fitLevel 3 級戰略決策結構化（原廠優先、副廠等效次選、通用替代慎選）
- **業界 muscle memory**：改款處理走拆 model（NX01-13 已支援）、part_model 純關聯不混業務邏輯
- **seed 範式**：空表進、Yaro 30 年資料走獨立匯入軌（PRO tier 戰略、NX01 全 closure 後啟動）
- **落地狀態**：✅ commit `e598ad4`（NX01-16 完整、SPEC `8ccb212` + impl 5 commit、main `906636a`）⭐⭐ NX01 全 closure
- **跨軌**：依賴 NX01-05 part + NX01-13 model（兩端 RESTRICT FK）+ 被未來 part 編輯頁 / NX02 採購 / NX04 銷售引用

## NX01-17 part-version + part-relation（料號版本 + 關聯）

- **業務語意**：part_version（每次 part update 全 snapshot）+ part_relation（料件關聯：改號 / 同款 / 改版換周邊 / 組合包 / 拆解包）
- **表名**：`nx01_part_version` + `nx01_part_relation`、ID prefix PAVE + PARE
- **戰略地位**：⭐ A 主檔、依賴 NX01-05 part
- **Crown 拍板（v1.0）**：Q1=A 全 snapshot 範式（每 part update 完整 copy 9 欄位） / Q3=B-小範圍 relationType 軸 1 字母 enum 升 SmallInt（1=改號 / 2=同款 / 3=改版換周邊 / 4=組合包 / 5=拆解包）/ Q5=A 接通 part-relation UI（generic Nx00FlatMasterView）
- **業界 muscle memory**：R 同款 = 業務語意對稱（A↔B 兩端 fitLevel 等效）、R 建立後 reverseHint API + window.confirm 提示建反向
- **業界 muscle memory**：part_version 全 snapshot 對應業界「改料號保留歷史價」場景、不可只記 diff
- **落地狀態**：✅ 3 commit closure：`2fb31ac`（part_version + relation + 軸 1 升 SmallInt）+ `d11cffa`（Q5 UI 接通）+ `8769eef`（R 同款 modal 路線 A）
- **跨軌**：part_version 跟 part.create / part.update 同 transaction 寫入（tx 同步）+ part_relation 雙向 FK 自關聯

---

# § 3. 整體跨軌依賴圖（v1.0 全落地）

```
nx99_tenant
   ↑（tenantId 多租戶根、所有業務表必含）
   │
   ├── nx01_user ─→ nx01_role ─→ nx01_role_view（826 預設權限）
   │            └─→ nx01_user_role / user_warehouse / user_team
   │
   ├── nx01_partner ─→ nx01_partner_billing_address（一對一）
   │              └─→ nx01_partner_shipping_address（一對多）
   │              └─→ nx01_partner_credit
   │
   ├── nx01_bulletin（獨立）
   ├── nx01_city ─< nx01_district ─< nx01_street（全域型錄）
   ├── nx01_phonetic_dictionary（全域）+ nx01_phonetic_index（trigger）
   │
   ├── nx01_warehouse ─→ nx01_warehouse_type（PLUS）
   ├── nx01_part_brand / part_group / customer_grade / currency / country（型錄）
   │
   ├── nx01_car_brand ─< nx01_engine
   │                 ├─< nx01_transmission
   │                 ├─< nx01_drivetrain
   │                 ├─< nx01_model_type
   │                 └─< nx01_model（5 FK 全綠燈）
   │
   ├── nx01_brand_code_rule（carBrandId 軸翻轉後）
   │       ↑（codeRuleId NN）
   │       │
   ├── nx01_part ─< nx01_part_version（snapshot 範式）
   │           └─< nx01_part_relation（5 SmallInt 類型）
   │           └─< nx01_part_model ⭐⭐ ─→ nx01_model（料件↔車型適配）
   │           └─< 25 reverse（NX02/03/04/06/08 全範圍）
```

---

# § 4. 業界 muscle memory 沉澱清單（給 NX03 庫存接力參考）

Crown 18 年 + 恆迎 30 年累積、NX01 開發過程沉澱核心：

1. **業界備註自由文字 → NEXORA 結構化**（NX01-13 / NX01-16）
   - 業界用「備註欄」記車型 / 適配料、自由文字導致無法數據分析
   - NEXORA 改革：結構化 code + name + enum + FK 關聯

2. **業務員 muscle memory → 系統查詢**（NX01-10 注音 / NX01-16 part_model）
   - 業務員「腦中記憶 + 紙本筆記」追料件適配
   - NEXORA 改革：part ↔ model 結構化關聯 + 注音快搜

3. **6 倉模型參考自恆迎**（NX01-06）
   - HW 總倉 + MW 主倉 + BW1~BW4 分倉
   - 「預設 vs 上限」分層、PRO tier 上限無限

4. **VAG 生態圈 + 德國原廠**（NX01-12）
   - 4 個子品牌（VW / Audi / Skoda / SEAT）全 DEU
   - VAG 料號 brand_sort=23145（業界 muscle memory 排列）

5. **軸翻轉糾錯範式**（NX01-11）
   - 寫 spec 時憑直覺寫 partBrandId、業界真相應該是 carBrandId
   - production hotfix 必先做、再進主軌

6. **改款處理走拆 model**（NX01-13 / NX01-16）
   - Golf 7 GTI 2020 改款 → 拆 G7-GTI-前期 + G7-GTI-後期
   - part_model 純關聯、不重複記年份

7. **fitLevel 3 級戰略決策**（NX01-16）
   - 原廠優先、副廠等效次選、通用替代慎選
   - 業界 30 年 muscle memory 結構化

8. **UNK 佔位保留字**（NX01-05）
   - 料號未補齊先建可暫填 UNK、業務人員補正、絕不混用 NULL
   - 系統保留字 DTO whitelist 防護

9. **全 snapshot vs diff**（NX01-17）
   - part 改料號保留歷史價場景、必全 snapshot 9 欄位、不可只記 diff

10. **partner_type 5 字元定案**（NX01-03）
    - C/S/T/V/B 替代 CUST/SUP/BOTH、B（銀行）未來獨立 nx01_bank_account

11. **業界否定的擔憂不寫進 spec**（Alex #13、NX01-11 觸發）
    - 恆迎 18 年沒發生過的 case、Crown 拍 v1.0 不做、不過度防呆

12. **角色精煉 7 種**（NX01-02）
    - LOGISTICS 移除 / HR_ADMIN 併入 HR、partner_type=T 取代物流角色

---

# § 5. 後續軌 backlog（NX01 closure 後仍有）

| # | 描述 | 性質 |
|---|------|------|
| A057 | NX01-10 注音字典資料匯入 | 資料運營 |
| A058 | NX01-11 規則編輯頁 + 預覽 modal UI | UI 升級 |
| A059 | features/nx00 → features/nx01 範式遷移 | refactor |
| A060 | NX01-10/12/15 v1.1 注音範圍對齊修訂 | Alex 主軌 |
| A061 | NX01-10 主檔 trigger attach | trigger 啟用 |
| A063~A071 | drift / 軌後雜項收斂 | A 系列 |
| A072 | NX01-16 車型反查料件雙向 UI | UI 升級 |
| A073 | NX01-05 part 編輯頁適配 section UX 升級 | UI 升級 |
| A074 | field-definitions.csv 全模組 drift 大掃描 | reference cleanup |
| A075 | CLAUDE.md §X 章節錨點 sweep（本軌已處理）| ✅ |
| 戰略軌 | Yaro 30 年資料匯入軌（PRO tier 戰略）| NX01 全 closure 後啟動 |

---

# § 6. 上游 / 下游接力

## 6.1 NX01 接力 NX03 庫存（範圍 A 完整 closure）

NX03 庫存將引用：
- `nx01_part`（料號真相、必含 codeRuleId）
- `nx01_warehouse`（倉庫實體）
- `nx01_part_model`（適配查詢、業務員「查料 → 適配車型」基礎）
- `nx01_part_version`（過帳成本歷史）
- `nx01_user` / `nx01_partner`（操作者 / 客戶供應商）

NX03 業界 muscle memory 預期：
- 物理庫存 ≥ 0（D3 雙帳）
- 移動平均成本（入庫均價 / 出庫均價不變）
- stock_ledger source 欄位精準（NX02 進貨 P / NX03 開帳 I 等）
- 撿貨 / 包貨 SOP 流程化（PK → BX 共用流水號）

## 6.2 跨對話接力指南

新對話 Alex / Hank 接力 NX01 相關任務時、跳到此 summary 對應子模組段、即可掌握：
- 業務語意（1~2 句）
- 拍板 Q 摘要
- 落地 commit hash
- 業界 muscle memory 揭露
- 跨軌依賴

完整子規格在本機 `docs/nx01/spec/intent/` 18 份檔（不上傳 Claude.AI、Cursor 讀）。

---

> 本 v1.0 = NX01 17 子規格書 + impl 全 closure 後沉澱版（2026-05-15）
> 壓縮率：8,237 行（18 份 spec）→ ~470 行（本檔）= **-94%**
> 用途：跨對話接力快速 onboarding、Claude.AI 上傳常駐
> 詳細真相：本機 `docs/nx01/spec/intent/` + `docs/nx01/nx01-worklog.md` + `docs/_team/worklog.md`
