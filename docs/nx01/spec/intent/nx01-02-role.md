<!-- docs/nx01/spec/intent/nx01-02-role.md -->

# NX01-02 - 角色權限工作站子規格書

> 文件版本：v1.0（Crown 拍 5 個 Q、Alex 修訂後正式版）
> 最後更新：2026-05-05
> 撰寫者：Alex（Claude PM AI）
> 審核者：Crown Lin
> 狀態：v1.0 正式版、待 Hank push 到 docs/nx01/spec/intent/nx01-02-role.md

---

## 文件定位

NX01-02 = NX01 主檔模組的「**角色權限工作站**」子規格書。

對齊 [docs/_template/spec-template.md](docs/_template/spec-template.md) 9 段範本結構。

**範圍：**
- `nx01_role`（角色主檔、7 種 role）
- `nx01_user_role`（user × role 多對多）
- 7 種 role 在 NX01 模組的權限矩陣
- 不含跨模組權限細節（NX02~NX10 各自規格書定義）
- 不含 user 主檔（歸 NX01-01）

**戰略意義：**

role 是 NEXORA 全模組權限執行單位：
- 全業務動作前都會檢查「user 有什麼 role / 有沒有權限」
- role 改動可能影響全租戶業務跑不跑得動

**📚 工程規範索引：**
- 主檔規格書：見 [docs/nx01/spec/intent/nx01-overview.md](docs/nx01/spec/intent/nx01-overview.md)
- user 主檔：見 [docs/nx01/spec/intent/nx01-01-user.md](docs/nx01/spec/intent/nx01-01-user.md)
- 命名規則：見 [PROJECT_RULES.md](../../../PROJECT_RULES.md) §III.2
- 多租戶隔離：見 [PROJECT_RULES.md](../../../PROJECT_RULES.md) §III.2.6
- 設計哲學：見 [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) §💎
- 擴充性原則：見 [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) § 工程模式 #23

---

## § 1. 子模組定位

### 1.1 子模組是什麼

`nx01_role` + `nx01_user_role` = **NEXORA 全模組權限執行的單一真相**。

7 種 role 對齊 [CLAUDE.md line 305 nx01_role.csv](CLAUDE.md) 既有 7 筆紀錄：

| code | 中文名 | 業務角色 | 主要工作站 |
|------|--------|---------|-----------|
| `SYSADMIN` | 系統管理員 | 跨租戶系統維護 | 不直接登入（DB seed/migration 用）|
| `OWNER` | 負責人 | 老闆 / 總經理 | 全模組總覽 |
| `HR` | 人資 | 員工帳號 / 角色維護 | NX01-01 用戶管理 |
| `SALES` | 業務 | 客戶開發 / 銷貨 | NX04 銷貨工作站 |
| `PURCHASING` | 採購 | 供應商對接 / 採購 | NX02 採購工作站 |
| `WAREHOUSE` | 倉管 | 庫存 / 出貨 / 收貨 | NX03 庫存工作站 |
| `FINANCE` | 財務 | 應收應付 / 對帳 | NX05 財務工作站 |

**設計哲學對齊：**
- 設計哲學 #1「中心 = 角色工作台」：每個 role 都對應一個工作站
- 設計哲學 #13「強制資料溯源」：所有業務動作都記錄 user + role

### 1.2 業務人員視角

| 角色 | 用此子模組做什麼 | 多常用 |
|------|---------------|-------|
| OWNER | 看公司全 role 分配總覽、批准角色變動 | 不常 |
| HR | 維護 user × role（新員工分配 role / 離職撤銷）⭐ | 每月 |
| 其他 role | 看自己的 role 列表（read-only）| 不常 |
| SYSADMIN | 跨租戶看 role 配置 | 不常 |

### 1.3 跨模組引用

role 是 NEXORA 全模組權限執行單位：

| 業務模組 | 引用方式 |
|---------|---------|
| NX01-01 用戶 | 每個 user 至少 1 role |
| NX01-03 客戶/供應商 | 業務歸屬權限檢查（SALES role 才能負責 partner type=C）|
| NX02~NX10 業務模組 | 每個業務動作前檢查 user 有對應 role |
| NX10 遊戲化 | 勳章按 role 分組（如業務勳章只 SALES 拿）|

→ role 改動可能影響全 NEXORA 業務跑不跑得動、走擴充原則 #23。

### 1.4 看 vs 改權限模型

對齊 NX01-03 §6 / NX01-01 §6 已建立的「**看 vs 改分離**」模型：

```
看（read）:多數場景開放、業務透明度高
改（write）:嚴格控制在「負責人」+ 高階 role（OWNER / HR）
```

→ 不擅自為 NX01-02 創新權限模型、延續既有。

---

## § 2. UI 頁面

### 2.1 列表頁（`/master/role`）

**顯示內容：**
- 7 種 role 列表（系統預設、不可刪不可改名）
- 每 role 欄位：code / 中文名 / 對應工作站 / 此 role 的 user 數
- 動作：[查看詳細]（read-only、role 本身不可改）

⭐ Q2 拍板（C YAGNI）：暫不支援自定義 role、未來 Yaro 真要時再開新 task

### 2.2 role 詳細頁（`/master/role/:code`）

**顯示內容：**
- role 基本資訊：code / name / description
- 此 role 的權限清單（按模組分組）
- 此 role 對應的 user 列表（連結 NX01-01）

### 2.3 user × role 分配頁（`/master/user/:id/edit` 內嵌、HR 操作）

⚠️ 此頁不是獨立頁面、是 NX01-01 user 編輯頁的一部分。

```
1. HR 進 user 編輯頁
2. 看到「角色分配」區
3. 多選 role（至少 1 個、可多 role）
4. [儲存]
5. 系統自動寫 nx01_user_role
6. 該 user 立即生效（next request 用新 role 權限）
```

⭐ Q4 拍板（A union 聯集）：任一 role 有權限就通過、詳見 §5.2

---

## § 3. 業務規則

### 3.1 PK（unique 範圍）

**`nx01_role`：**
- `code` UNIQUE（全域、不帶 tenantId、7 種 role 跨租戶共用定義）
- 對齊全域型錄精神（如 nx01_currency）

**`nx01_user_role`：**
- `(user_id, role_id)` UNIQUE（一個 user 同一 role 不重複）

### 3.2 業務檢核

**`nx01_role`：**

| 欄位 | 必填 | 格式 | 業務檢核 |
|------|-----|------|---------|
| `code` | ✅ | 大寫英文（最長 20 字元）| 7 種 + 未來自定義 |
| `name` | ✅ | 中文（最長 20 字元）| 顯示用 |
| `description` | ❌ | 中文 | 業務說明 |
| `is_system` | ✅ | boolean | true=7 種預設 / false=自定義 |
| `isActive` | ✅ | boolean | system role 永遠 true |

**`nx01_user_role`：**

| 欄位 | 必填 | 業務檢核 |
|------|-----|---------|
| `user_id` | ✅ | FK to nx01_user |
| `role_id` | ✅ | FK to nx01_role |
| `tenantId` | ✅ | 系統自動帶 |

### 3.3 跨主檔連動

| 引用主檔 | 用途 |
|---------|------|
| `nx01_user` | role 分配對象 |
| `nx99_tenant` | 多租戶隔離（user_role 帶 tenantId）|

### 3.4 跨業務模組連動

每個業務動作前的權限檢查流程：

```
1. user 發起業務動作（如建立 SO）
2. 系統 query nx01_user_role 取得 user 所有 role
3. 檢查任一 role 是否有此業務動作權限
4. 通過 → 執行 / 不通過 → 401
```

→ 詳細跨模組權限矩陣由各業務模組規格書定義（NX02~NX10）。

### 3.5 軟刪除 vs 停用

**`nx01_role`：**
- 7 種 system role（is_system=true）：不可刪不可停用
- 自定義 role（is_system=false、未來功能）：可停用、不可真刪

**`nx01_user_role`：**
- 撤銷 role = 真刪 nx01_user_role 紀錄（不軟刪）
- 該 user 失去此 role 權限
- 該 user 既有業務單據紀錄不變（createdBy / updatedBy 仍是該 user）

⭐ Q5 拍板（B 提示 HR）：撤銷 SALES 時、提示 HR 手動轉手 partner、詳見 §5.3

---

## § 4. 欄位列表

### 4.1 nx01_role 欄位

⚠️ 以下欄位待 Hank grep 既有 schema 確認、可能需校正。

| 欄位 | 業務語意 | 必填 | 預設值 | 來源 |
|------|---------|-----|-------|------|
| `id` | 系統 ID | ✅ | UUID | 系統自動 |
| `code` | role 代碼（如 `SALES`）| ✅ | 無 | seed |
| `name` | 中文名（如「業務」）| ✅ | 無 | seed |
| `description` | 業務說明 | ❌ | null | seed |
| `is_system` | 系統預設 role | ✅ | true（7 種）| seed |
| `isActive` | 是否啟用 | ✅ | true | - |

### 4.2 nx01_user_role 欄位

| 欄位 | 業務語意 | 必填 | 預設值 |
|------|---------|-----|-------|
| `id` | 系統 ID | ✅ | UUID |
| `user_id` | FK to nx01_user | ✅ | 無 |
| `role_id` | FK to nx01_role | ✅ | 無 |
| `tenantId` | 多租戶隔離 | ✅ | 系統自動 |

### 4.3 系統自動欄位（不可改）

| 欄位 | 業務語意 |
|------|---------|
| `createdAt` / `updatedAt` | 系統時間戳 |
| `createdBy` / `updatedBy` | 操作者 |

### 4.4 注音索引

role 不建注音索引（型錄性質、業務人員不打 role 注音搜）。

---

## § 5. 工作流程

### 5.1 HR 新增員工 + 分配 role（標準流程）

```
1. HR 在 NX01-01 新增 user（如新業務「林小明」）
2. 在「角色分配」區選 SALES
3. [儲存]
4. 系統自動寫 nx01_user_role:
   - user_id = 林小明.id
   - role_id = SALES role.id
5. 林小明 next login → 拿到 SALES 權限
6. 可看 NX04 銷貨工作站、可建立 QT/SO/DN
```

### 5.2 user 多 role 分配

```
1. HR 編輯既有 user（如業務助理「王大華」）
2. 角色分配選 SALES + WAREHOUSE（業務 + 倉管雙 role）
3. [儲存]
4. 系統自動寫 2 筆 nx01_user_role
5. 王大華 next login:
   - 看得到 NX04 銷貨工作站（SALES 權限）
   - 看得到 NX03 庫存工作站（WAREHOUSE 權限）
   - 業務 + 倉管動作都可做
```

⭐ Q4 拍板（A union 聯集）：

```
權限檢查邏輯:
  user 有 N 個 role
  系統 query 每個 role 對應的權限清單
  union 聯集所有權限
  任一 role 有權限 → 通過
  全 role 都沒權限 → 401

範例:王大華（SALES + WAREHOUSE 雙 role）:
  - SALES 看 NX04 銷貨工作站 ✅
  - WAREHOUSE 看 NX03 庫存工作站 ✅
  - 兩者並集都看得到 ✅
  - 對應業務動作:任一 role 有權限就可做
```

### 5.3 role 撤銷（員工轉職）

```
1. HR 編輯既有 user（如業務轉採購）
2. 角色分配:
   - 移除 SALES
   - 加 PURCHASING
3. [儲存]
4. 系統自動:
   - 刪 nx01_user_role(user, SALES)
   - 加 nx01_user_role(user, PURCHASING)
5. 該 user next request 失去 SALES 權限、取得 PURCHASING 權限
```

⭐ Q5 拍板（B 提示 HR）：撤銷 SALES role 時的業務處理

```
1. HR 試圖移除 user 的 SALES role
2. 系統檢查:該 user 負責多少 partner（partner.sales_user_id = user.id）
3. 如有 → 跳警告:
   「該 user 負責 X 個 partner、撤銷 SALES role 後將無法管理這些 partner、
    請先轉手給其他 SALES 再撤銷 role」
4. HR 確認:
   - 選項 1:取消撤銷、先去 NX01-03 partner 工作站手動轉手
   - 選項 2:強制撤銷（HR 知情、之後再分配）
5. HR 強制撤銷後:
   - 該 user 失去 SALES 權限
   - 該 user 仍是 partner.sales_user_id（直到手動轉手）
   - 待轉手 partner 列表會出現在 OWNER 工作站待辦事項
```

對齊「不擅自自動轉手、HR 知情才能適當分配」原則。
不對齊 NX01-01 §5.4 自動轉手流程（那是「離職」場景、本場景是「角色變更」、不一定離職）。

### 5.4 異常：撤銷 user 的所有 role

```
1. HR 試圖移除 user 所有 role（剩 0 role）
2. 系統 401:「user 至少需 1 個 role、請先加新 role 再移除舊 role」
3. 對齊 §3.2 業務檢核（user 至少 1 role）
```

### 5.5 異常：HR 試圖改自己 role

```
1. HR 編輯自己 user
2. 試圖移除 HR role
3. 系統 401:「不可改自己的 role、避免提權問題」
4. 對齊 NX01-01 §5.5 提權保護
```

### 5.6 system role 保護

```
1. SYSADMIN（或誤操作 DB）試圖刪 7 種 system role
2. DB 層 trigger 阻擋（is_system=true 不可 DELETE）
3. 對齊 PROJECT_CONTEXT 工程模式 #4「trigger 做 invariant」
```

---

## § 6. 角色權限

| 角色 | 看 role 列表 | 改 role | 分配 user role | 撤銷 user role | 改自己 role |
|------|-------------|---------|---------------|----------------|-----------|
| SYSADMIN | ✅（跨租戶）| ❌（system role 不可改）| ✅ | ✅ | ✅ |
| OWNER | ✅（自己租戶）| ❌ | ✅ | ✅ | ❌ |
| HR | ✅（自己租戶）| ❌ | ✅ ⭐ | ✅ ⭐ | ❌（提權保護）|
| SALES / PURCHASING / WAREHOUSE / FINANCE | ✅（自己 role 看 read-only）| ❌ | ❌ | ❌ | ❌ |

**關鍵權限規則：**

⭐ **HR 是 user × role 分配的主要操作人**：
- OWNER 有權但通常委派
- 其他業務 role 純 read-only

⭐ **提權保護（對齊 NX01-01 §5.5）**：
- HR 不能改自己 role
- 同 HR 之間可互改 role（互相制衡）

⭐ **OWNER 階層繼承（Q3 拍板 A）**：
- OWNER 自動繼承所有下級 role 權限（HR + SALES + PURCHASING + WAREHOUSE + FINANCE）
- 不必明確分配其他 role 給 OWNER user
- 對齊「老闆視野最高、看全部、做全部」業界 muscle memory
- 實作:權限檢查時、OWNER role 直接通過所有業務權限
- 例外:不繼承 SYSADMIN 權限（跨租戶權限、保留給系統管理員）

⭐ **system role 不可改**：
- 7 種 role 是 NEXORA 預設、不開放改名 / 刪除
- 改 = 影響全 NEXORA 業務邏輯

---

## § 7. Tier 差異（對齊 PROJECT_RULES.md §I.1.2 版本方案）

⭐ 對齊 [PROJECT_RULES.md §I.1.2「版本方案」](../../../PROJECT_RULES.md) 真相、不擅自定義 user 數上限。

### LITE（基礎版）

- 7 種 system role 全開放
- 自定義 role：❌ 不開放
- user 數限制：1~10 人（依 user 上限、對齊 NX01-01 §7）
- 多 role 分配：✅ 開放

### PLUS（進階版）

- 7 種 system role 全開放
- 自定義 role：❌ 不開放
- user 數限制：5~30 人
- 多 role 分配：✅ 開放
- 部門 × role 矩陣：✅ 開放（業務按部門分組）

### PRO（專業版、Yaro 主場）

- 7 種 system role 全開放
- 自定義 role：❌ 暫不開放（Q2 拍板 C YAGNI、未來真要時再開新 task）
- user 數限制：10~100 人
- 多 role 分配：✅ 開放
- 部門 × role 矩陣：✅ 開放（業務按部門分組）
- 跨部門 role 共享：✅ 開放
- OWNER 階層繼承：✅（對齊 §6 Q3 拍板）

→ Tier 限制由 Plan Guard 強制（[PROJECT_RULES.md §III.2.7](../../../PROJECT_RULES.md)）。

---

## § 8. 注音索引

role 不建注音索引（§4.4 已說明）。

理由：
- role 是型錄、不是業務常打搜尋對象
- 7 種 role 數量少、列表全顯示即可

---

## § 9. Document Control Log

| 版本 | 日期 | 撰寫者 | 變更摘要 |
|------|------|-------|---------|
| v0.1.0 | 2026-05-05 | Alex | 初稿（NX01 第五份子規格書、對齊 spec-template + CLAUDE.md 7 種 role 真相）|
| v1.0 | 2026-05-05 | Alex | Crown 拍 5 個 Q、修訂後正式版 |

**v1.0 主要變更（vs v0.1.0）：**

對應 Crown 拍板的 5 個 Q：

- **Q1（權限矩陣放哪）**：C 折中、本子規格書列大方向、各子規格書補細節
- **Q2（自定義 role）**：C YAGNI、PRO tier 暫不開放、未來真要時再開新 task
- **Q3（role 階層繼承）**：A 階層繼承、OWNER 自動繼承下級權限（§6 落地）
- **Q4（多 role 衝突）**：A union 聯集、任一 role 有權限就通過（§5.2 落地）
- **Q5（撤銷 role 處理）**：B 提示 HR 手動轉手 partner（§5.3 落地）

---

## § 10. 待 Hank grep 確認項

⚠️ 以下事項 Hank push 前主動確認:

A. 既有 nx01_role schema 確認:
   - 是否已有 7 筆 role 紀錄（對齊 CLAUDE.md line 305 nx01_role.csv ALL 7 筆）
   - role.code 是否對齊本規格書命名（SYSADMIN / OWNER / HR / SALES / PURCHASING / WAREHOUSE / FINANCE）
   - 如命名 drift → 屬本子規格書「規格書 vs schema 對齊」議題、合併到 user + role schema 補建 task 處理

B. nx01_user_role 既有 schema 確認:
   - 多對多表是否已建
   - (user_id, role_id) composite unique 是否落地
   - tenantId 多租戶隔離是否落地

C. 既有 7 筆 role 中文名 / description 對齊:
   - 對齊 Crown 拍板 7 種 role 中文名（系統管理員 / 負責人 / 人資 / 業務 / 採購 / 倉管 / 財務）
   - 如 schema 既有不對齊 → 揭露 drift、合併到 schema 補建 task

→ 此項由 Hank push 時主動揭露、不阻塞規格書落地。
→ 缺欄位 / 命名 drift → 合併到 NX01-USER+ROLE schema 補建 task（對齊軌 E 揭露的 A034 候選）。

---

*文件結束。NX01-02 子規格書 v1.0 完成、待 Hank push docs/nx01/spec/intent/nx01-02-role.md。*
