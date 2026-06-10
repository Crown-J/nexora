<!-- docs/nx01/spec/intent/nx01-08-bulletin.md -->

# NEXORA NX01-08 公告系統（nx01_bulletin）子規格書

> 文件版本：v1.0
> 最後更新：2026-05-06
> 狀態：拍板版、Crown 拍 Q1~Q5 + Hank 諮詢結論落地
> 撰寫：Alex（Claude PM AI）
> 對應 task：TASK-PHASE2-NX01-08-BULLETIN-SPEC-V1-01
> 性質：A 通知（既有 schema 已落地、規格書補齊 + 業務增強）

---

# § 1. 子模組定位

## 1.1 子模組是什麼

`nx01_bulletin`（內部公告）= OWNER / HR 對租戶內成員發布的「**通知公告系統**」。

業務人員（業務 / 採購 / 倉管 / 財務）登入系統首頁時、看到當前有效公告、重要公告強制 modal 跳出、user 確認「我已閱讀」後才能繼續使用系統。

性質：**A 通知**（不是 A 主檔、不是 B 型錄、不是 C 通知子系統）— 雙向資訊傳遞、含「發布 → 閱讀 → 已讀回收」完整生命週期。

## 1.2 業務人員視角

| 角色 | 用此子模組做什麼 | 多常用 |
|------|---------------|-------|
| OWNER | 發布全公司重要公告（節假日 / 政策 / 業績）| 每月 1~3 次 |
| HR | 發布人事公告（員工異動 / 教育訓練 / 福利）| 每週 1~2 次 |
| SALES / PURCHASING / WAREHOUSE / FINANCE | 看公告、點「已讀」 | 每天登入時 |
| SYSADMIN | 跨租戶發布系統公告（停機維護 / 版本升級）| 不定期 |

## 1.3 跨模組引用

- `nx01_user`（user 主檔）：發布者 + 已讀者 user FK
- `nx01_role`（角色主檔）：對象範圍 = 指定角色（多選）
- `nx01_user_team`（user-team 中介表）：「管理部門公告」對象識別 = `is_leader = true` 篩出（沿用既有欄位、Hank 諮詢揭露）
- `nx01_team`（團隊主檔）：5 部門對應之 team
- `nx01_bulletin_attachment`（附件子表、本軌新建）：附件 metadata + storage_key
- `nx99_tenant`：多租戶隔離

---

# § 2. UI 頁面

## 2.1 公告中心列表（`/dashboard/base/bulletins`）

- 顯示當前租戶所有公告（含已過期 / 草稿 / 已發布 status）
- 表格欄位：標題 / 類型 / 重要等級 / 對象範圍 / 發布日 / 截止日 / 已讀率 / 狀態
- 動作：[新增公告] / [編輯] / [預覽] / [立即發布] / [撤回] / [複製]
- 篩選：類型 / 重要等級 / 發布者 / 日期區間
- 注音搜尋：F4（標題注音碼快搜）

## 2.2 公告編輯頁（`/dashboard/base/bulletins/:id/edit`）

- 表單欄位：標題 / 內文（rich text）/ 類型 / 重要等級 / 對象範圍 / 發布日 / 截止日 / 附件
- 對象範圍 3 種：(A) 全租戶 / (B) 指定角色（多選）/ (C) 指定 user（多選）
- 重要等級 3 階：一般 / 重要 / 緊急
- 系統欄位：發布者 / 已讀人數 / 建立時間
- 動作：[儲存草稿] / [立即發布] / [排程發布]（PRO）/ [取消]

## 2.3 首頁公告 Widget（dashboard 上方）

- 登入後 dashboard 預設顯示「對我可見」的有效公告 top 5
- 「未讀」高亮、按發布日排序
- 點公告 → 開 modal 看全文 → 自動標記「已讀」

## 2.4 重要公告強制 Modal（登入觸發）

對齊 Q1 拍板：**重要跳一次、緊急每次跳**

- **important**（重要）：user 第一次登入後跳 modal、點「我已閱讀」一次後不再跳
  - 例：政策更新、員工福利說明
- **urgent**（緊急）：每次登入都跳 modal、直到 user 點「我已閱讀」一次後才停
  - 例：系統停機、合規通知、緊急人事異動
- modal 有「我已閱讀」按鈕（**強制看 5 秒才可點**、防誤點）
- user 點「我已閱讀」→ 寫入 `nx01_bulletin_read_log` → 解鎖系統
- 觸發判斷：以 `nx01_bulletin_read_log` 是否有對應紀錄為準（無紀錄 = 未讀）

## 2.5 已讀統計頁（`/dashboard/base/bulletins/:id/read-stats`、OWNER / HR 限定）

- 顯示該公告的已讀清單 / 未讀清單
- 已讀人數 / 已讀率 / 平均閱讀時間
- 動作：[催讀]（推 in-app 提醒給未讀者）

---

# § 3. 業務規則

## 3.1 PK（unique 範圍）

- `id` = 系統 ID（無業務 unique）
- 公告無「業務 code」概念、純流水 ID 即可
- 對齊 [PROJECT_RULES.md §III.2](../../../PROJECT_RULES.md) 命名規則：tenant scoped 必含 `tenantId`

## 3.2 業務檢核

| 欄位 | 必填 | 格式 | 業務檢核 |
|------|-----|------|---------|
| title | ✅ | 中/英文（最長 100 字元）| 不可全空白 |
| content | ✅ | rich text（HTML 5000 字內）| 不可空 |
| category_id | ✅ | category FK | Tier 差異（見下表） |
| importance | ✅ | enum（normal / important / urgent）| 預設 normal、跟 category 正交 |
| audience_user_ids | ❌ | user.id[] | 補充對象、可額外加掛指定 user |
| publish_at | ✅ | datetime | 預設 now、可排程未來（PRO） |
| expire_at | ❌ | datetime | null = 永久、有值需 > publish_at |

跨欄位驗證：
- `expire_at` 必 > `publish_at`
- `category_id` 必須在當前租戶可見的 category 範圍內（Tier 限制）

**category 設計（Crown 拍 Q2 + Q2-bis）：**

每個 category 包含「對象範圍」邏輯（合一維度、不是雙維度）：

| category | 對象範圍邏輯 | LITE | PLUS | PRO |
|---------|-----------|------|------|-----|
| 全公司 | 全租戶 user | ✅ | ✅ | ✅ |
| 系統 | 全租戶 user（SYSADMIN 跨租戶留未來軌）| ✅ | ✅ | ✅ |
| 管理 | `nx01_user_team.is_leader = true` 的所有 user（各部門組長、Hank 範式 B 變體）| ❌ | ✅ | ✅ |
| 產品 | `nx01_user_team` 中 team = 產品部門的 user | ❌ | ✅ | ✅ |
| 銷售 | `nx01_user_team` 中 team = 銷售部門的 user | ❌ | ✅ | ✅ |
| 倉管 | `nx01_user_team` 中 team = 倉管部門的 user | ❌ | ✅ | ✅ |
| 財務 | `nx01_user_team` 中 team = 財務部門的 user | ❌ | ✅ | ✅ |
| user 自訂 | 自訂時定義 team 範圍 | ❌ | ❌ | ✅ |

→ category 不是「公告內容性質標籤」、是「**對象範圍 = 部門 / 階層的合一概念**」
→ `audience_user_ids` 為補充欄位、可在 category 對象之外額外加掛指定 user

## 3.3 跨主檔連動

- 引用 `nx99_tenant`（多租戶隔離）
- 引用 `nx01_user`（發布者 / 已讀者 FK）
- 引用 `nx01_role`（對象範圍指定角色 FK）
- 不引用其他 NX01 業務主檔（partner / part / warehouse 不在公告對象維度）

## 3.4 跨業務模組連動

- 無業務單據引用公告（公告是「通知」性質、不是「主檔」）

## 3.5 軟刪除 vs 停用

- 草稿（status=draft）：可真刪
- 已發布（status=published）：只能撤回（status=withdrawn）、不可真刪
  - 已撤回公告對 user 不再可見、但保留歷史紀錄（合規性）
- 已過期：自動 status=expired、不影響歷史紀錄

---

# § 4. 欄位列表

## 4.1 業務欄位

| 欄位 | 業務語意 | 必填 | 預設值 | 來源 |
|------|---------|-----|-------|------|
| `title` | 標題 | ✅ | 無 | 發布者填 |
| `content` | 內文（rich text）| ✅ | 無 | 發布者填 |
| `category_id` | 分類 FK（連 nx01_bulletin_category）| ✅ | 全公司 | 發布者選 |
| `importance` | 重要等級（normal / important / urgent）| ✅ | normal | 發布者選 |
| `audience_user_ids` | 補充指定 user（在 category 對象外加掛）| ❌ | [] | 發布者選 |
| `publish_at` | 發布時間 | ✅ | now | 發布者填、預設 now |
| `expire_at` | 截止時間 | ❌ | null | 發布者填、null = 永久 |
| `status` | 狀態（draft / published / scheduled / withdrawn / expired）| ✅ | draft | 系統 + 發布者操作驅動 |

**附件設計（Crown 拍 Q5 + Hank 諮詢範式 C）：**

附件不在 bulletin 主表、走獨立子表 `nx01_bulletin_attachment`：

| 欄位 | 業務語意 |
|------|---------|
| `id` | 系統 ID |
| `bulletin_id` | 公告 FK |
| `storage_key` | 檔案在 storage 的 key（階段 1 本地路徑、階段 2 R2 key）|
| `mime_type` | 檔案類型（application/pdf / image/png 等） |
| `file_size` | 檔案大小（bytes） |
| `orig_filename` | 上傳時原始檔名 |
| `uploader_user_id` | 上傳者 FK |
| `created_at` | 上傳時間 |

PK：`id`、unique：無（同 bulletin 可上傳多檔）

## 4.2 系統自動欄位（不可改）

| 欄位 | 業務語意 |
|------|---------|
| `id` | 系統 ID |
| `tenantId` | 多租戶隔離（自動帶當前租戶） |
| `createdAt` / `updatedAt` | 系統時間戳 |
| `createdBy` / `updatedBy` | 操作者（從登入 user 帶） |
| `read_count` | 已讀人數（trigger 自動更新） |

## 4.3 公告分類表（`nx01_bulletin_category`、子表、Tier 差異 enum 化）

| 欄位 | 業務語意 |
|------|---------|
| `id` | 系統 ID |
| `tenantId` | 多租戶隔離 |
| `code` | 分類代碼（all / system / mgmt / product / sales / warehouse / finance / 自訂）|
| `name` | 分類名稱（顯示用）|
| `audience_logic` | 對象範圍邏輯 enum（tenant_all / system_all / leaders_all / by_team_id）|
| `team_id` | 對應 team FK（audience_logic = by_team_id 時）|
| `tier_required` | 此分類所需最低 Tier（LITE / PLUS / PRO）|
| `is_system` | 是否系統預設（true = 不可刪、false = user 自訂）|
| `sort_order` | 排序 |
| `isActive` | 是否啟用 |

LITE seed：2 筆（all / system）
PLUS seed：7 筆（all / system / mgmt / product / sales / warehouse / finance）
PRO seed：同 PLUS、user 可加自訂

→ 分類是 metadata、不是 enum 寫死、避免未來改字串卡 schema migration

## 4.4 已讀紀錄表（`nx01_bulletin_read_log`、子表）

| 欄位 | 業務語意 |
|------|---------|
| `id` | 系統 ID |
| `bulletin_id` | 公告 FK |
| `user_id` | 已讀者 FK |
| `read_at` | 已讀時間 |
| `read_duration_ms` | 閱讀時間（modal 開啟 → 點「已閱讀」毫秒數） |

PK：`(bulletin_id, user_id)`（同一 user 對同公告只記一筆）

---

# § 5. 工作流程

## 5.1 OWNER 發布全公司重要公告（標準流程）

1. 進「公告中心」→ [新增公告]
2. 填標題 / 內文 / 選分類 = 全公司 / 重要等級 = important
3. 預覽 → [立即發布]
4. 系統寫入 `status=published`、依分類 audience_logic 計算對象 user 集合
5. 所有對象 user 下次登入觸發強制 modal（important = 跳一次、urgent = 每次跳直到已讀）
6. user 點「我已閱讀」→ 寫 `nx01_bulletin_read_log`
7. OWNER 在已讀統計頁看「20/30 已讀」、可催讀未讀者

## 5.2 OWNER 發布管理部門公告（給各部門組長）

1. 進「公告中心」→ [新增公告]
2. 填標題 / 內文 / 選分類 = 管理（PLUS+）/ 重要等級 = normal
3. 系統依 audience_logic = leaders_all、grep `nx01_user_team.is_leader = true` 的 user
4. 例：採購組長阿明 + 物流組長阿華 + 銷售組長阿賢 + 倉管組長阿龍 + 財務組長阿芬 = 5 人
5. 5 人下次登入看到此公告（normal 不跳 modal、首頁 widget 顯示）

## 5.3 HR 發布部門公告（如「銷售部門開會通知」）

1. 進「公告中心」→ [新增公告]
2. 填標題 / 內文 / 選分類 = 銷售（PLUS+）/ 重要等級 = normal
3. 系統依 audience_logic = by_team_id（銷售部門 team_id）grep 對應 user
4. 銷售部門 user 看到此公告

## 5.4 SYSADMIN 發布系統公告（跨租戶、未來軌）

- 本軌範圍：tenant scoped only（SYSADMIN 不跨租戶發）
- 跨租戶系統公告留到 NX99 或未來軌

## 5.5 異常：對象 user 已離職

- 公告對象指定 user = 5 個、其中 1 個離職（user.isActive=false）
- 該離職 user 不再列入「未讀統計」分母（業務語意：離職不計）
- 如果離職 user 之前已讀、紀錄保留

## 5.6 異常：發布後想撤回

- OWNER 發現公告內容寫錯
- 進公告詳細頁 → [撤回] → 確認對話框（提示「撤回後不可恢復、需重新發布」）
- 系統設 `status=withdrawn`、所有 user 立即看不到此公告
- 已讀紀錄保留（合規性、不刪 read_log）

---

# § 6. 角色權限

| 角色 | 看公告 | 發布 / 編輯 | 撤回 | 看已讀統計 |
|------|-------|-----------|-----|----------|
| SYSADMIN | ✅ 全租戶 | ✅ 自己發的 | ✅ 自己發的 | ✅ |
| OWNER | ✅ 對自己可見 | ✅ 全分類 | ✅ 自己發的 | ✅ |
| HR | ✅ 對自己可見 | ✅ category=hr | ✅ 自己發的 | ✅ |
| SALES / PURCHASING / WAREHOUSE / FINANCE | ✅ 對自己可見 | ❌ | ❌ | ❌ |

「對自己可見」= audience_type 對應 user 角色 + 在發布期內 + 未撤回。

---

# § 7. Tier 差異

| 功能 | LITE | PLUS | PRO |
|------|------|------|-----|
| 基礎發布 / 閱讀 / 已讀標記 | ✅ | ✅ | ✅ |
| 重要 modal（important 跳一次 / urgent 每次跳）| ✅ | ✅ | ✅ |
| 公告分類 | 2 種（全公司 / 系統）| 7 種（+ 5 部門：管理 / 產品 / 銷售 / 倉管 / 財務）| 7 種 + user 自訂 |
| 補充對象（audience_user_ids 額外加掛）| ✅ | ✅ | ✅ |
| 排程發布（status=scheduled 狀態驅動）| ❌ | ❌ | ✅ |
| in-app 推播（未讀者催讀）| ❌ | ✅ 單次 | ✅ 排程定期 |
| 已讀統計（含閱讀時間）| 基本人數 | 完整統計 | 完整統計 + 匯出 |
| 附件上傳（依賴 file-upload 階段 1）| 1 附件 | 5 附件 | 無上限 |

→ Tier 限制由 Plan Guard 強制（對齊既有 NX99 plan-guard 範式）
→ 分類數量限制由 `nx01_bulletin_category.tier_required` 欄位控制、不寫死 enum

---

# § 8. 注音索引

## 8.1 是否需注音索引

✅ 需要、`title` 欄位接注音索引、F4 快搜對齊 NX01-10 注音快搜系統範式。

## 8.2 trigger 來源欄位

`title`（標題）

## 8.3 trigger 觸發時機

- INSERT bulletin → 同步寫 `nx01_phonetic_index`
- UPDATE bulletin.title → 同步更新 `nx01_phonetic_index`
- DELETE bulletin → 同步刪 `nx01_phonetic_index`

對齊 NX01-10 標準範式、本軌不展開細節。

---

# § 9. Document Control Log

| 版本 | 日期 | 撰寫 | 變更摘要 |
|------|------|------|---------|
| v0.1.0 | 2026-05-06 | Alex | 初版草稿、9 段完整、§10 列 5 個 Q 給 Crown 拍 |
| v1.0 | 2026-05-06 | Alex | Crown 拍 Q1~Q5 + Hank 諮詢結論落地：(1) 重要 modal 拆 important/urgent 邏輯 (2) category 改 metadata 子表設計、Tier 差異 2/7/7+自訂 (3) 排程狀態驅動 (4) 已讀完整顯示 (5) 附件走 nx01_bulletin_attachment 子表 + file-upload 階段 1 本地 stub (6) 「管理部門」對象 = `nx01_user_team.is_leader = true` 沿用既有欄位、0 schema 變動 |

---

# § 10. 待 Hank grep 確認項

（v1.0 升版後此段取代原 §10 待拍 Q）

1. `nx01_bulletin` schema 既有欄位 vs 本規格書 § 4 業務欄位差異
   - 既有 schema 已落地、本軌升級需評估遷移路徑
2. `nx01_bulletin_read_log` 是否已建（schema 揭露）
3. `nx01_bulletin_attachment` 子表新建（依賴軌 1 file-upload-foundation）
4. `nx01_bulletin_category` 子表新建（含 LITE/PLUS/PRO 分層 seed）
5. 既有 controller endpoints vs 本規格書 § 2 UI 動作對應
6. 強制 modal 機制：前端既有實作 vs 本規格書 § 2.4（含 important/urgent 差異邏輯）
7. 注音索引 trigger 是否含 `bulletin.title`
8. `nx01_user_team.is_leader = true` 篩查 query 範式（依賴軌 2 A037-closure 應用層補完）

---

# § 11. 跨軌依賴

NX01-08 v1.0 實作分 3 軌：

| 軌 | 任務 | 依賴 |
|----|------|------|
| 軌 1 | TASK-FILE-UPLOAD-FOUNDATION-01（階段 1 本地 stub）| 無、先做、給 NX01-08 + 後續模組鋪路 |
| 軌 2 | TASK-A037-ISLEADER-CLOSURE-01（is_leader 應用層補完 + seed 補 leader 指派）| 無、可並行軌 1 |
| 軌 3 | TASK-PHASE2-NX01-08-BULLETIN-IMPL-01（NX01-08 主軌實作）| 軌 1 + 軌 2 完成 |

軌 1 階段 2（接 R2）= 未來 task、不在本軌範圍。

---

> 本拍板版 v1.0 對齊 spec-template v1.0、11 段完整（§1~§9 + §10 Hank grep 待確認 + §11 跨軌依賴）、Crown 拍 Q1~Q5 + Hank 諮詢範式 B 變體 / 範式 C + R2 階段 1 stub 全部落地。
