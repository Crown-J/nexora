<!-- docs/nx01/spec/intent/nx01-17-part-version-relation.md -->

# NEXORA NX01-17 料號版本 + 料號關聯（nx01_part_version + nx01_part_relation）子規格書

> 文件版本：v1.0
> 最後更新:2026-05-12
> 狀態：拍板版、Crown 拍 Q1~Q8 + R 同款雙向 modal 機制 + 字母 enum 升 SmallInt 範圍 A 小範圍
> 撰寫：Alex（Claude PM AI）
> 對應 task：TASK-PHASE2-NX01-17-PART-VERSION-RELATION-SPEC-V1-01
> 性質：兩表合一規格書（part_version 戰略 audit + part_relation 內部關係表、被 part 主檔耦合）
> 拓樸位置：拓樸排序第 7 份（12 → 15 → 14 → 13 → 07 → 05 → **17** → 16）

---

# § 1. 子模組定位

## 1.1 子模組是什麼

`nx01_part_version` + `nx01_part_relation` = NEXORA **料號的兩條輔助軸**：

| 表 | 業務語意 |
|---|---|
| `nx01_part_version` | 料號**版本歷史紀錄**、戰略 audit、業務人員追溯料變動 |
| `nx01_part_relation` | 料號**之間關係**、業務查替代品 / 套件包 / 拆解品 |

兩表合一規格書理由：

- 兩表都是 part 主檔的**輔助軸**（不是獨立業務模組）
- 業務語意都圍繞「料號的延伸資訊」
- 統一拍板兩表業務邊界 + 跟 part / audit log 的角色分工

## 1.2 part_version：戰略 audit 角色

⭐ **業界 muscle memory（Hank §5 揭露）**：料號變動是業界每天的事、業務 5 種主要變動觸發版本紀錄：

| 變動類型 | 業界觸發頻率 | 業務影響 |
|---------|------------|---------|
| 價格變動 | 高（每季 / 廠商通知）| 業務報價、舊報價追溯 |
| 規格變動 | 中（廠商改版）| 料件兼容性 / 替代品 |
| 廠商變動 | 中（採購多源）| 成本 / 品質 / 退貨政策 |
| 產地變動 | 中（廠商換工廠）| 進口稅 / 客戶接受度 |
| 名稱 / spec 變動 | 低（業務人員修正）| 業務查料 |

### 跟 audit log 的角色分工

| 軸 | 角色 |
|---|---|
| part_version（業務 audit）| 業務人員 UI 直接看版本歷史、戰略級即時可查 |
| Nx01AuditLog（系統 audit）| 法規 / 稽核「誰何時改 part」、系統級、需 query |

⭐ 兩者**互補不替代**、業務 UI 走 part_version、稽核系統走 audit log。

## 1.3 part_relation：內部關係表

⭐ **業界 muscle memory（schema 註解 line 884 + Hank §6）**：5 種料號關係：

| code | 中文 | 業界場景 | 方向性 |
|------|------|---------|--------|
| 1 改號 | 廠商料號改編（舊號 → 新號）| 業界場景：8K0 819 439 → 8K0 819 439 A | 單向 |
| 2 同款 | 兩個料件等同（不同料號但功能等同）| 業界場景：原廠 vs 副廠（同功能、不同品牌）| 雙向（Q2=C 用戶決定）|
| 3 改版換周邊 | 升級版料件 | 業界場景：舊版 → 改良版 | 單向 |
| 4 組合包 | partIdFrom 是套包、partIdTo 是組成料件 | 業界場景：機油保養套包（套包 → 機油 / 濾芯 / 墊圈）| 單向 |
| 5 拆解包 | partIdFrom 是原料件、partIdTo 是拆出料件 | 業界場景：原廠氣壓計組 → 計頭 + 管線組 | 單向 |

⭐ Crown 拍板 Q8=A：5 種足夠、業界 muscle memory 完整、不擴充第 6 值。

## 1.4 業務人員視角

| 角色 | 用 part_version 做什麼 | 用 part_relation 做什麼 | 多常用 |
|------|---------------------|---------------------|-------|
| PURCHASING | 看歷史價格、追溯廠商變動 | 建料號改號 / 套包關係 | 每天 |
| SALES | 看舊報價對應料號狀態、查同款替代品 | 查替代料、套包銷售 | 每天 |
| WAREHOUSE | 看料號廠商歷史 | 查套包組成 / 拆解規則 | 偶爾 |
| OWNER | 戰略決策（哪些料變動頻繁）| 維護料號關係策略 | 偶爾 |

## 1.5 跨模組引用

| 表 | 依賴 | 被依賴 |
|---|---|---|
| part_version | part（partId FK）| 無（純內部 audit）|
| part_relation | part（partIdFrom / partIdTo 雙向 FK）| 無（業務模組透過 part 引用、不直接引用 relation）|

⚠️ 對齊 #22 鐵律、本表跟其他規格書既有的引用真相：

- part_relation reverse 在 Nx01Part schema line 770~771（rev_Nx01PartRelation_partIdFrom / partIdTo）
- 無下游業務模組（NX02/03/04/06/08）直接引用、業務影響純內部

## 1.6 跟 part.type 的業務邊界

⭐ Crown 拍板 Q4=A：**不強制 type vs relationType 一致檢核**、業務人員彈性。

| 軸 | enum | 業務含義 |
|---|---|---|
| part.type | 1 專用 / 2 通用 / 3 組合 / 4 拆解 | 一個 part 是什麼類型（單體屬性） |
| part_relation.relationType | 1 改號 / 2 同款 / 3 改版換周邊 / 4 組合包 / 5 拆解包 | 兩個 part 之間什麼關係（關係屬性）|

業務情境：

- type=3 組合型 part、互補對應 relationType=4 組合包 relations（套包 → 組件）
- type=4 拆解型 part、互補對應 relationType=5 拆解包 relations（原料 → 拆出）
- 業務人員可彈性建（不強制 type=3 必有 relationType=4）、UI / 報表展示語意連貫

⚠️ Crown 業界 muscle memory：業務人員不該被系統強制建關係、彈性比一致性 ROI 高。

---

# § 2. UI 頁面

## 2.1 part_version

### 2.1.1 列表頁（`/master/part/:partId/version`）

- 從 part 主檔頁面進入、看單一料號的完整版本歷史
- 表格欄位：版本號 / 生效日期 / 結束日期 / 變動原因 / 操作人 / 更新時間
- 動作：[檢視] 完整 snapshot
- 排序：依 versionNo 倒序（新版在上）

### 2.1.2 版本詳情 modal

- 顯示該版本的完整 snapshot（codeSnapshot / nameSnapshot / partBrand / country / spec / priceA~D）
- 跟當前版本 diff highlight（哪些欄位變了）
- 顯示變動原因（changeReason）

## 2.2 part_relation

### 2.2.1 列表頁（`/master/part-relation`）⭐ 接通既有 UI

⭐ Crown 拍板 Q5=A：本軌接通既有 `BasePartRelationMasterView.tsx` 真實後端 endpoint（之前走 mock / 走 listPart API）。

- 顯示當前 tenant 全部料號關係
- 表格欄位：來源料號 / 目標料號 / 關係類型 / 備註 / 排序 / 啟用狀態
- 動作：[新增] / [編輯] / [停用 / 啟用]
- 篩選：關係類型 / 來源料號 / 目標料號 / 啟用狀態
- 搜尋：依來源 / 目標料號模糊搜尋

### 2.2.2 編輯頁

- 來源料號（partIdFrom、必填、下拉選自 nx01_part isActive=true）
- 目標料號（partIdTo、必填、下拉選自 nx01_part isActive=true）
- 關係類型（relationType、必填、enum 5 值）
- 備註（remark、可空）
- 排序（sortNo、預設 0）
- 啟用狀態（isActive、預設 true）

### 2.2.3 R 同款 modal（Q2=C）

⭐ Crown 拍板 Q2=C：建立 R 同款（relationType=2）關係時、系統 modal 提示用戶決定。

業務流程：

1. 業務人員建料號關係：partIdFrom=A、partIdTo=B、relationType=2 同款
2. [儲存] → 系統 API 回傳 `{ created: ..., reverseHint: { suggested: true, message: '建議同時建立反向關係 B→A 同款？' } }`
3. 前端 modal 跳出：「料號 A 同款料號 B 已建、是否同時建立 B 同款 A？」
4. 用戶選 [是] → 系統再建一筆反向關係（B→A）
5. 用戶選 [否] → 只保留單向

⭐ R 同款業界 muscle memory：A 等同 B、B 也等同 A、對等關係、所以系統「建議」雙向、但用戶自決（不強制）。

⚠️ 其他 4 種 relationType（改號 / 改版 / 組合 / 拆解）都是單向、無 modal 提示。

---

# § 3. 業務規則

## 3.1 PK + unique 範圍

| 表 | PK | unique |
|---|---|---|
| part_version | id | (tenantId, partId, versionNo) |
| part_relation | id | **(tenantId, partIdFrom, partIdTo, relationType)** ⭐ Q6=A 補 |

## 3.2 業務檢核：part_version

| 欄位 | 必填 | 格式 | 業務檢核 |
|------|-----|------|---------|
| partId | ✅ | FK | 對應 part 必存在、tenant 內 |
| versionNo | ✅ | INT | tenant + partId 內遞增、起始 1 |
| effectiveFrom | ✅ | DateTime | 版本生效日（part.updatedAt 同源）|
| effectiveTo | ❌ | DateTime | 結束日、最新版留空、舊版自動填上一版生效日 |
| codeSnapshot | ✅ | VARCHAR(50) | part.code 當時值 |
| nameSnapshot | ✅ | VARCHAR(200) | part.name 當時值 |
| partBrandIdSnapshot | ❌ | VARCHAR(15) | part.partBrandId 當時值 |
| countryIdSnapshot | ❌ | VARCHAR(15) | part.countryId 當時值 |
| specSnapshot | ❌ | VARCHAR(200) | part.spec 當時值 |
| priceA~D Snapshot | ❌ | Decimal(14,4) × 4 | part.priceA~D 當時值 |
| changeReason | ❌ | VARCHAR(500) | 業務人員填、變動原因 |

⭐ Crown 拍板 Q1=A：**全 snapshot** 範式、每次 part update 完整 copy 上述欄位寫入 part_version。

## 3.3 業務檢核：part_relation

| 欄位 | 必填 | 格式 | 業務檢核 |
|------|-----|------|---------|
| partIdFrom | ✅ | FK | 對應 part 必存在 + isActive=true + 同 tenant |
| partIdTo | ✅ | FK | 對應 part 必存在 + isActive=true + 同 tenant |
| relationType | ✅ | SmallInt | enum 1~5 |
| remark | ❌ | VARCHAR(200) | |
| sortNo | ✅ | INT | 預設 0 |
| isActive | ✅ | bool | 預設 true |

### 3.3.1 service 層業務檢核（Q7=A 拍板）

⭐ Crown 拍板 Q7=A：以下檢核走 service 層（彈性、不在 DB CHECK）：

- **自關聯防護**：partIdFrom !== partIdTo（業務人員可能誤建「料號 A → 料號 A」）
- **跨 tenant 防護**：partIdFrom.tenantId === current tenant && partIdTo.tenantId === current tenant
- **isActive 檢核**：兩端 part 都必 isActive=true（不能對停用料建新關係）
- **unique 衝突檢核**：(tenantId, partIdFrom, partIdTo, relationType) 已存在則拒絕

### 3.3.2 R 同款雙向處理（Q2=C 拍板）

- relationType=2 同款建立成功時、API 回傳 `reverseHint: { suggested: true, message: ... }`
- 前端 modal 處理用戶決定
- 用戶選 [是] → 前端再呼叫 API 建反向關係（B→A、relationType=2）
- 不在後端 service 自動建（保用戶自決邏輯清晰、避免黑箱）

## 3.4 跨主檔連動

- part_version.partId → nx01_part：part update 時 service tx 同步寫入 version（Q1=A）
- part_relation.partIdFrom / partIdTo → nx01_part：雙向 FK、ON DELETE RESTRICT
- 兩表 ON DELETE：part 不可真刪、只能停用、保護 reverse 引用

## 3.5 軟刪除 vs 停用

- part_relation isActive=false → 業務 UI 不顯示（如「替代品查詢」隱藏停用關係）、歷史保留
- part_version **無 isActive 概念**（版本紀錄永久保留、不停用）

---

# § 4. 欄位列表

## 4.1 part_version（13 業務欄位 + 5 audit）

| 群組 | 欄位 | type | nullable | default |
|------|------|------|---------|---------|
| 識別 | partId | VARCHAR(15) FK | NN | 無 |
| 識別 | versionNo | INT | NN | 無 |
| 期間 | effectiveFrom | DateTime | NN | 無 |
| 期間 | effectiveTo | DateTime | nullable | null |
| Snapshot | codeSnapshot | VARCHAR(50) | NN | 無 |
| Snapshot | nameSnapshot | VARCHAR(200) | NN | 無 |
| Snapshot | partBrandIdSnapshot | VARCHAR(15) | nullable | null |
| Snapshot | countryIdSnapshot | VARCHAR(15) | nullable | null |
| Snapshot | specSnapshot | VARCHAR(200) | nullable | null |
| Snapshot | priceASnapshot | Decimal(14,4) | nullable | null |
| Snapshot | priceBSnapshot | Decimal(14,4) | nullable | null |
| Snapshot | priceCSnapshot | Decimal(14,4) | nullable | null |
| Snapshot | priceDSnapshot | Decimal(14,4) | nullable | null |
| 變動 | changeReason | VARCHAR(500) | nullable | null |
| 系統 | id + tenantId + audit 5 | 系統自動 | - | - |

## 4.2 part_relation（6 業務欄位 + 5 audit）

| 群組 | 欄位 | type | nullable | default |
|------|------|------|---------|---------|
| 關係 | partIdFrom | VARCHAR(15) FK | NN | 無 |
| 關係 | partIdTo | VARCHAR(15) FK | NN | 無 |
| 關係 | relationType | **SmallInt** ⭐ Q3 拍 | NN | 無 |
| 屬性 | remark | VARCHAR(200) | nullable | null |
| 屬性 | sortNo | INT | NN | 0 |
| 屬性 | isActive | bool | NN | true |
| 系統 | id + tenantId + audit 5 | 系統自動 | - | - |

⭐ Crown 拍板 Q3=B 小範圍：part_relation.relationType 從 VARCHAR(1) 升 SmallInt（同時升 part.type 從 VARCHAR(1) 升 SmallInt）。其他模組 enum 升級走 A069 / A070 後續軌、本軌不擴張。

## 4.3 系統 seed 策略：空表進

兩表都不 seed、tenant 開通後業務自加：

- part_version：part 變動才寫
- part_relation：業務需要才建關係

---

# § 5. 工作流程

## 5.1 part_version 寫入機制（Q3 部分 + 本軌新建）

⭐ Crown 拍板：**tx 同步寫入**（part.update 同 transaction 內寫 part_version）

業務流程：

1. PURCHASING 進 part 編輯頁、改 priceA = 1850（原 1800）
2. [儲存] → service.part.update
3. service 內部 transaction：
   - 寫 part（更新 priceA + priceUpdatedAt + priceUpdatedBy）
   - **同步寫 part_version**（全 snapshot 13 欄、versionNo = 上一版 +1、effectiveFrom = now()）
   - 寫 audit log（通用稽核）
4. tx commit
5. UI 跳轉、顯示成功

⭐ Crown 業界 muscle memory：tx 同步保證資料溯源完整、不漏寫。

## 5.2 versionNo 遞增邏輯

- 首次 part create：寫 version 1
- 每次 part update：寫 version (max(versionNo) + 1)
- effectiveTo 自動填上一版：上一版的 effectiveTo = 新版 effectiveFrom

## 5.3 part_relation 建立流程（含 R 同款 modal）

業界 muscle memory 場景：業務人員建料號改號關係：

1. 進 part-relation 列表 → [新增]
2. 選 partIdFrom = 舊料號（8K0 819 439）、partIdTo = 新料號（8K0 819 439 A）
3. 選 relationType = 1 改號
4. [儲存] → service 檢核（自關聯 + 跨 tenant + unique + isActive）
5. 寫入 nx01_part_relation
6. UI 跳轉、顯示成功

### R 同款 modal 流程（特殊）

1. partIdFrom = 原廠 part、partIdTo = 副廠 part、relationType = 2 同款
2. [儲存] → service 檢核 + 寫入
3. API 回傳 `{ created: relation, reverseHint: { suggested: true, message: '建議建立反向關係' } }`
4. 前端 modal 跳出
5. 用戶 [是] → 前端再 POST API 建 B→A 反向關係
6. 用戶 [否] → 結束、保留單向

## 5.4 異常：自關聯

- 業務人員填 partIdFrom = partIdTo = 同一料號
- service 拒絕：「來源料號跟目標料號不可相同」

## 5.5 異常：跨 tenant 引用

- 業務人員（不可能正常觸發、僅 SYSADMIN 跨租戶可能）試圖建跨 tenant 關係
- service 拒絕：「料號必須屬於當前租戶」

## 5.6 異常：unique 衝突

- 業務人員建 partIdFrom = A、partIdTo = B、relationType = 1（已存在）
- service 拒絕：「相同來源 / 目標 / 關係類型已存在」

## 5.7 部分料號版本查詢場景

業務人員場景：客戶問「2023 年 1 月當時這料號的價格是多少？」

1. SALES 進 part 主檔頁面 → 點 [版本歷史]
2. 看到 versionNo 5（生效 2023-02-15）/ versionNo 4（生效 2023-01-10）/ ...
3. 點 versionNo 4 → modal 顯示 priceASnapshot = 1750
4. 回答客戶「2023 年 1 月當時 A 級客戶建議售價是 1750」

⭐ 對齊 Crown 業界 muscle memory：版本歷史是業務日常追溯場景、UI 友善優於 audit log query。

---

# § 6. 角色權限

## 6.1 part_version（read-only、系統自動寫入）

| 角色 | 看 | 改 | 刪除 |
|------|---|---|------|
| SYSADMIN | ✅ 全租戶 | ❌（系統自動）| ❌ |
| OWNER | ✅ 自租戶 | ❌（系統自動）| ❌ |
| PURCHASING / SALES / WAREHOUSE | ✅（read-only）| ❌ | ❌ |
| FINANCE / HR | ✅（read-only）| ❌ | ❌ |

⭐ part_version 完全系統自動寫入（part.update 同 tx）、業務人員無法手動編輯、保資料溯源完整性。

## 6.2 part_relation

| 角色 | 看 | 新增 | 改 | 停用 / 啟用 | 刪除 |
|------|---|------|---|-----------|------|
| SYSADMIN | ✅ 全租戶 | ✅ | ✅ | ✅ | ✅（未被引用時）|
| OWNER | ✅ 自租戶 | ✅ | ✅ | ✅ | ✅（未被引用時）|
| **PURCHASING** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **SALES** | ✅ | ✅ | ✅ | ✅ | ✅ |
| WAREHOUSE | ✅（read-only）| ❌ | ❌ | ❌ | ❌ |
| FINANCE / HR | ✅（read-only）| ❌ | ❌ | ❌ | ❌ |

⭐ PURCHASING / SALES 都可建關係（業務日常需求高、改號 / 同款 / 套包都會用）。

---

# § 7. Tier 差異

| 功能 | LITE | PLUS | PRO |
|------|------|------|-----|
| 看 part_version（read-only）| ✅ | ✅ | ✅ |
| part 變動自動寫 version | ✅ | ✅ | ✅ |
| part_relation CRUD | ✅ | ✅ | ✅ |
| R 同款 modal 提示 | ✅ | ✅ | ✅ |
| 5 種 relationType 全開放 | ✅ | ✅ | ✅ |

→ 兩表核心功能全 Tier 對等支援、無 Tier 差異
→ 對齊 NX01-12 / NX01-14 / NX01-15 / NX01-13 / NX01-07 / NX01-05 拍板：輔助主檔功能不是訂閱差異化欄位

---

# § 8. 注音索引

❌ **兩表都不接入注音索引**。

⭐ 對齊 Crown 業界 muscle memory + #22 鐵律：

- part_version：純 audit 紀錄、業務人員不會搜尋 version、走 partId 反查
- part_relation：純內部關係、業務人員不會搜尋 relation、走 partId 反查

注音索引保留給中文密集主檔（part / partner / user）、本軌不擴張。

---

# § 9. Document Control Log

| 版本 | 日期 | 撰寫 | 變更摘要 |
|------|------|------|---------|
| v1.0 | 2026-05-12 | Alex | 初版拍板版、11 段完整。Crown 拍 Q1~Q8 + R 同款 modal 機制 + 字母 enum 升 SmallInt 範圍 A 小範圍。Q1=A（part_version 全 snapshot）/ Q2=C（R 同款系統 modal 提示用戶決定）/ Q3=B-小範圍（part.type + part_relation.relationType 升 SmallInt、其他模組 enum 升級走 A069 / A070 後續軌）/ Q4=A（type vs relationType 不強制一致）/ Q5=A（本軌接通既有 part_relation UI）/ Q6=A（補 unique + 3 個 index）/ Q7=A（自關聯 + 跨 tenant 防護走 service 層）/ Q8=A（5 種 relationType 足夠）。整合 Hank §1~§10 諮詢真相揭露：(1) part_relation schema 已建 9 業務欄位、part_version 完全未建從零建。(2) part_relation UI 已建後端缺（A067 同 family）、本軌接通。(3) schema 缺 unique + index、本軌補。(4) part.type vs relationType 重疊邊界揭露（type 單體屬性 / relationType 關係屬性、互補不衝突）。(5) part_version 跟 audit log 角色分工（業務 UI vs 系統稽核、互補不替代）。(6) part_version tx 同步寫入（part.update 同 transaction）保資料溯源完整。本規格書直接走 v1.0、未經 v0.1.0、依拓樸排序第 7 份、Hank audit 真相 + Crown 業界 muscle memory 已沉澱可直接拍板。|

---

# § 10. 待 Hank grep 確認項

1. part_relation schema 既有狀態（Hank §1 verify、line 875~905、9 業務欄位 + 5 audit、無 unique / index）
   - 本軌補 @@unique([tenantId, partIdFrom, partIdTo, relationType])
   - 本軌補 3 個 index：(tenantId, partIdFrom) / (tenantId, partIdTo) / (tenantId, relationType)

2. part_relation.relationType 升 SmallInt（軸 1 範圍 A 小範圍）
   - VARCHAR(1) → SmallInt
   - migration 含 data 轉換：S→1 / R→2 / C→3 / B→4 / F→5
   - dev DB 既有 row 0（schema 已建無資料、Hank §1.2 verify）= 安全

3. part.type 升 SmallInt（軸 1 範圍 A 小範圍）
   - VARCHAR(1) → SmallInt
   - migration 含 data 轉換：A→1 / B→2 / C→3 / D→4
   - dev DB 既有 part row 量 Hank verify（預期少、開發階段）

4. part_version schema 從零建（Hank §B.1 plan 對齊）
   - 13 業務欄位 + 5 audit（對齊本規格 §4.1）
   - @@unique([tenantId, partId, versionNo])
   - @@index([tenantId, partId])
   - prefix NX01PAVE（gen_nx01_part_version_id 函式）

5. part_version 寫入機制（Q1=A + Q3 tx 同步拍板）
   - service.part.update 內部 transaction：寫 part + 寫 part_version（全 snapshot）+ 寫 audit log
   - versionNo 遞增邏輯：max(versionNo) + 1 per (tenantId, partId)
   - effectiveTo 自動填上一版：上一版 effectiveTo = 新版 effectiveFrom

6. part_relation controller + service + DTO
   - 對齊 NX01-12 範式（CRUD + audit log + class-validator）
   - service 業務檢核：自關聯 / 跨 tenant / unique / isActive（Q7=A）
   - SmallInt enum @Min(1) @Max(5) class-validator
   - R 同款 reverseHint 回傳機制（Q2=C）

7. part_version controller + service + DTO
   - read-only：GET list (依 partId) / GET byId（看完整 snapshot）
   - 無 POST / PATCH / DELETE（系統自動寫入、業務人員不可改）

8. UI 接通既有 BasePartRelationMasterView（Q5=A）
   - 切換 endpoint：listPart → /nx01/part-relations
   - 加 R 同款 modal 處理 reverseHint
   - 加 5 種 relationType SmallInt → 中文 enum 顯示（對齊 NX01-14/15 範式）
   - part_version UI 暫不本軌建（service 已支援、UI 可走後續軌）

9. A067 family 揭露（本軌只清 part_relation）
   - 既有 BasePartRelationMasterView 切真實後端 = 清 part_relation 的 A067
   - 其他 A067 family（part_group 等）走獨立軌

---

# § 11. 跨軌依賴

| 方向 | 對象 | 關係 | impl 狀態 |
|------|------|------|----------|
| 依賴（前置）| `nx01_part`（NX01-05、上軌剛升級）| partId / partIdFrom / partIdTo FK | ✅ 落地 |
| 兄弟關係 | NX01-12 brand_code_rule | part 透過 codeRule 引用 brand | ✅ 落地 |
| 被依賴（無）| 無業務模組直接引用本兩表 | reverse 純 NX01 內部 | - |

### 跨軌字母 enum 升級揭露（backlog）

- **A069**：NX01 模組其他 7 個技術 enum 升 SmallInt（partner.partnerType / partner.creditStatus / warehouse_type.code / warehouse_type.flowMode / customer_grade.code / part.returnPolicy / brand_code_rule.sourceCodePrefix）= NX01 全 closure 後、進 NX02 前處理
- **A070**：NX02~NX08 約 106 個技術 enum 升 SmallInt = 各模組規格書落地時順手升、不獨立大軌

實作切點建議（給 Hank impl 階段參考、Hank §C.1 已 plan）：

- **commit 1**：part.type + relationType VARCHAR(1) → SmallInt（schema + migration data 轉換）
- **commit 2**：part_version 新建 schema + migration（sequence / gen_id / FK / index / unique）
- **commit 3**：part_relation schema 補 unique + 3 index migration
- **commit 4**：part_relation 後端 controller + service + DTO（含自關聯 / 跨 tenant guard + R 同款 reverseHint）
- **commit 5**：part_version 後端 controller + service + DTO + 接入 part.update tx 同步寫 version
- **commit 6**：part / part_relation service / DTO 改 SmallInt enum + class-validator @Min/@Max
- **commit 7**：UI 接通 part-relation 真實 API + R 同款 modal

---

> 本拍板版 v1.0 對齊 spec-template + NX01-12/14/15/13/07/05 範式、11 段完整、Crown 拍 Q1~Q8 落地。
> ⭐ 兩表合一規格書、part_version 戰略 audit + part_relation 內部關係表、皆是 part 主檔輔助軸。
> ⭐ Crown 業界 muscle memory：part_version tx 同步寫入保資料溯源、R 同款 modal 用戶決定雙向、5 種 relationType 業界完整、字母 enum 漸進升 SmallInt（本軌 2 欄、A069 / A070 後續軌）。
> ⚠️ part.type vs part_relation.relationType 不強制一致檢核（Q4=A）、業務人員彈性 ROI 高於系統一致性。
> ⚠️ A067 family 揭露：本軌只清 part_relation UI 接通、其他模組 UI 已建後端缺走獨立軌。
