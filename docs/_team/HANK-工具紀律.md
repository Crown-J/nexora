<!-- 檔案位置：docs/_team/HANK-工具紀律.md -->
<!-- 檔案版本：v1.0 -->
<!-- 檔案說明：Hank 工具陷阱完整解釋；CLAUDE.md §10 速查表的詳細版。
     A 系列（A041/A046/A052/A066）+ G 系列（G.4/G.8/G.9）+ Prisma 系列（PRZ-01/02）。
     CLAUDE.md 只留觸發提醒、本檔放完整解釋 + bash/SQL 範例 + 觸發紀錄。 -->

# Hank 工具紀律（完整版）

> 用法：CLAUDE.md §10 速查表記得有哪些雷；動手前看本檔對應條目取完整指引。
> 維護權：CTO（Alex）+ Hank 對齊自訂、執行長不參與。

---

## A 系列

### A041 揭露精確度紀律

**規則**：揭露範圍 / 數量時必附 `grep -c` 精確 count、不用模糊詞。

⛔ 禁用詞：「N+ 處」「多處」「一些」「不少」「大量」

✅ 必用範式：
```bash
$ grep -c "PATTERN" path/
具體數字
```

**為什麼**：
- 軌 4.5 揭露 A040「10+ 處」、實際 118 處（11.8 倍）
- 軌 4.6 揭露 A042「30+ 處」、實際 431 處（14 倍）
- 模糊詞讓執行長拍範圍決策時誤判工作量、commit 拆軌策略偏差

**觸發時機**：
- 「Step 1 grep 揭露」task 開工前
- 範圍 closure 回報給執行長時（白話、不帶代號）
- commit 訊息 / system-architecture 數量登錄時

---

### A046 PowerShell write 中文檔陷阱

**規則**：含中文的檔案禁用 PowerShell `[System.IO.File]::WriteAllText()` batch write。

⛔ 禁用：對含中文 UTF-8 檔案的 PowerShell batch（會破壞為 mojibake）

✅ 範式：
- **純 ASCII 檔案**（如 controller 純英文 + CSV 無中文）→ PowerShell batch OK
- **含中文檔案**（註解 / docstring / display string）→ 用 Edit / Write tool 逐個處理

**檢查清單**（PowerShell batch 前必跑）：
```bash
grep -lE '[一-龿]' <target-files>
```
有中文檔出現 → 切 Edit tool 處理。

---

### A052 git add 範圍精確紀律

**規則**：git add 任何時機（含 merge resolution / rebase / cherry-pick）必用具體檔案路徑、不用 `-A` 或 dir 路徑。

⛔ 禁用：`git add -A` / `git add .` / `git add <dir>/`（特別 dir 內含 untracked 時）

✅ 範式：
```bash
# Commit 階段
git add path/to/file1 path/to/file2

# Merge resolution 階段
git add path/to/conflict-file

# 大量 conflict 時也用具體檔案、不偷懶用 -A
for f in $(git diff --name-only --diff-filter=U); do
  git add "$f"
done
```

**檢查清單**（任何 git add 前必跑）：
```bash
git status --short | grep '^??'
```
有 untracked 出現 → 確認不在本軌範圍 → 用具體檔案路徑或 `git add -u <dir>`（只 stage tracked 變動）。

**為什麼禁 `-A` 任何時機**：
- merge resolution 反射動作常想用 `-A`「全部 stage 上去 commit」
- 但 working tree 可能含當時 untracked 的其他 task 檔案
- 用 `-A` 等同把「不該屬本軌」的檔案吸進本 merge commit
- 觸發後不可 revert（已 push）= 失誤永久進入 git history

---

### A066 Edit / Write 對既有檔案前必先 Read

**規則**：Edit / Write tool 對既有檔案前必先用 Read tool 讀過、否則 tool 會擋下並拋 `File has not been read yet`。

⛔ 反 pattern：
- 連續 Edit 多檔、其中某檔本對話沒 Read 過 → 被擋下、commit 部分成功 + 部分失敗
- 假設「之前 Read 過就還算」→ tool 不認可（context refresh / session 差異）

✅ 範式：
- 對既有檔案準備 Edit 前、先 Read 取得最新狀態（即使 grep 已看過內容）
- 對既有檔案重複字串（如 CreateDto + UpdateDto 結尾相同）→ 改用 `replace_all=true` 處理
- Write tool 對既有檔案同樣紀律（不只是 new file 用 Write）

**檢查清單**（Edit/Write 對既有檔案前必跑）：
```
1. 該檔本對話 Read 過嗎？沒 → Read first
2. 該檔近期被改過嗎（commit / 其他 Edit）？是 → Re-Read 取最新
3. old_string 是否重複（CreateDto + UpdateDto 結尾相同）？是 → replace_all=true
```

---

## G 系列

### G.4 spec docs 歷史 fact 保留範式

**規則**：spec docs 描述「Phase 0 / 某 task 寫此 spec 時的歷史 fact」時、保留原文 + 加 HTML 註解說明 closure 後變化。

⛔ 禁用：直接 `replace_all` 升級歷史 fact list（破壞「N 個 role」歷史事實）

✅ 範式：
```markdown
意圖 §6 Q5 要求「寫入限 PURCHASE_ADMIN role」。但 apply-role.ts:8-17 只 seed 了 8 個 role：ADMIN / **PURCHASE** / SALES / WAREHOUSE / FINANCE / LOGISTICS / HR / HR_ADMIN — 沒有 PURCHASE_ADMIN。
<!-- A034/A040/A042 closure 後：8 role → 7 role（SYSADMIN/OWNER/PURCHASING/SALES/WAREHOUSE/FINANCE/HR、移除 LOGISTICS/HR_ADMIN、補 OWNER）。本段保留 Phase 0 寫此 spec 時的真相、勿覆蓋歷史描述 -->
```

**適用情境**：
- spec docs 描述「Phase X 寫此 spec 時的狀態」
- 取捨討論「當時為什麼選 X、現在升級為 Y」歷史思考
- worklog 思考歷程紀錄

**不適用情境**（直接 replace）：
- live impl spec 描述「當前 controller 用 ...」→ 全 replace 升級
- 表格 role 欄位 / code 範例 → 全 replace 升級

---

### G.8 範圍擴散可直接執行

**規則**：發現範圍超出拍板時，可直接執行 → commit 到本地分支留紀錄 → 事後回報執行長。不再停下等重拍。

⚠️ **例外（鐵律不變）**：危險命令仍須執行長拍板才動——
- `git push` 到遠端 origin
- `prisma migrate reset` / 任何 data 破壞性 migration
- `rm` 刪除重要檔案

✅ 範式：
- 範圍 Y 超出拍板 X → 直接做、commit message 寫清楚「本軌實際含 Y（超出原拍 X）、原因…」
- 完成後白話回報執行長：「報告，這個改的時候發現還要一併處理 XXX，已經做好推上去了，跟您說一聲。」（員工口吻、不帶編號）
- 仍守精確：commit / 回報引用數量用 grep -c

**檢查清單**（impl 階段發現範圍擴散時）：
```
1. 是否屬危險命令（push / migrate reset / rm 重要檔）？是 → 停、等執行長拍板
2. 否 → 直接執行 + commit 留紀錄（message 標明超出原拍範圍 + grep -c 精確影響）
3. 完成後白話回報執行長（員工口吻、結論先講、不帶代號）
```

---

### G.9 verify 既有狀態必通配 grep、不單檔 ls

**規則**：對「目前 / 現況 / 是否存在」斷言、必先通配 grep（find -iname / glob `*keyword*`）、不單檔 ls / stat。

⛔ 反 pattern：
- `ls -la .cursorrules`（單檔）得「No such file or directory」→ 推論「cursor 相關檔案不存在」
- 跳「本軌補建」分支、未查近似命名（如 `_cursorrules`、`.cursor/rules/*.mdc`）
- 結果：本軌新建 `.cursorrules`（44 行）跟既有 `_cursorrules`（432 行）並存、內容 70% 重複既有真相來源

✅ 範式：
```bash
# 開工前必跑（通配查全貌）：
find . -maxdepth N -iname "*keyword*" -not -path "./node_modules/*" -not -path "./.git/*"
# 或：
ls -la *keyword* 2>&1
# 或：
git ls-files | grep -i keyword
```

→ 揭露全貌（含同義 / 近似 / dot prefix / 歷史殘留）→ 確認真相再決定動作

**適用時機**：
- 開工前自檢「是否存在」類查詢
- 規範 / 設定檔 verify（如 `.cursorrules` / `.env` / `tsconfig.json` 等可能多版本檔）
- 任何「新建 vs 既存」分支判斷前
- 跨對話接續真相 verify（新對話新 Hank 不憑歷史記憶）

**檢查清單**：
```
1. 查詢「是否存在 X」斷言前、是否用通配（find -iname 或 glob）？
   - 否 → 改用通配查全貌
2. 通配結果是否含近似命名（dot prefix / 無前綴 / 大小寫變化）？
   - 是 → 全部列入「既存清單」、避免漏
3. 既存清單跟「新建假設」是否衝突？
   - 是 → 揭露給執行長拍（對齊 G.8 範圍擴散揭露不擅自）
```

---

## Prisma 7 系列

### PRZ-01 partial unique 每次 generate 會塞 DROP INDEX

**規則**：partial unique 每次 generated migration 必檢查並手動移除 `DROP INDEX`。

⛔ 問題：prisma 7 不支援 partial unique（`WHERE is_main = true` 之類）。`prisma migrate dev --create-only` 每次都會把這類 index 視為「schema 沒宣告的 drift」、產生 `DROP INDEX` 想清掉。

✅ 對應 partial unique 的索引（業務 invariant）：
- `nx01_site_tenant_id_is_main_unique`（每 tenant 只 1 個主據點）
- `nx01_warehouse_tenant_id_is_main_unique`（每 tenant 只 1 個主倉）

✅ 範式：每次跑 `prisma migrate dev --create-only` 後、**先打開 generated migration.sql、grep `DROP INDEX`、把上面兩個索引的 DROP 行刪掉**、再 apply。

⚠️ 反 pattern：直接 apply generated migration → 業務 invariant 被無聲移除、之後同 tenant 可建多個 isMain=true、DB 層守門失效。

---

### PRZ-02 multi-clause RENAME 吞 ALTER COLUMN

**規則**：prisma 7 RENAME CONSTRAINT + ALTER COLUMN 不能混 multi-clause。

⛔ 問題：prisma 7 generator 把 PK rename 跟 ALTER COLUMN SET DATA TYPE 寫進同一個 `ALTER TABLE ... RENAME ..., ALTER COLUMN ...;`，但 PostgreSQL 邏輯上 RENAME 是 separate top-level command；混 multi-clause 時 RENAME 後面的 ALTER COLUMN sub-action **被無聲吞掉、no error**。

✅ 範式：apply 前先檢查 migration.sql、若 `ALTER TABLE` 同 statement 同時含 `RENAME CONSTRAINT` 跟 `ALTER COLUMN`，**拆成兩個獨立 statement**：

```sql
-- BAD（prisma generator 寫法、會吞 ALTER COLUMN）：
ALTER TABLE "xxx" RENAME CONSTRAINT "pk_xxx" TO "xxx_pkey",
ALTER COLUMN "a" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "b" SET DATA TYPE TIMESTAMP(3);

-- GOOD（拆開、PG 正確處理）：
ALTER TABLE "xxx" RENAME CONSTRAINT "pk_xxx" TO "xxx_pkey";
ALTER TABLE "xxx"
  ALTER COLUMN "a" SET DATA TYPE TIMESTAMP(3),
  ALTER COLUMN "b" SET DATA TYPE TIMESTAMP(3);
```

⚠️ 反 pattern：apply 後不 verify 直接過、無聲失敗的 op 無法察覺、長期 schema drift 累積。

---

### PRZ-03（衍生規則）：破壞性 migration apply 後必 verify

✅ apply 含 `ALTER COLUMN SET DATA TYPE` / `DROP DEFAULT` / `DROP INDEX` / `RENAME CONSTRAINT` 的 migration 後、必跑 `information_schema.columns` / `pg_indexes` / `pg_constraint` 確認真的生效。**不能假設 `\i migration.sql` 沒報 error 就等於成功**（multi-clause sub-action 失敗會無聲）。

業務測試範式：對 partial unique、跑 INSERT 第二筆衝突資料、看 DB 是否擋。

**檢查清單**（每次 schema breaking migration apply 後）：
```
1. 含 partial unique？ → generated migration 內的 DROP INDEX 兩行是否移除
2. 含 RENAME CONSTRAINT + ALTER COLUMN？ → 是否拆成獨立 statement
3. 套用後跑 verify SQL（pg_indexes / pg_constraint / information_schema.columns）
4. partial unique 業務測試（INSERT 預期衝突資料、看 DB 擋下）
```

---

## 速查表（CLAUDE.md §10 那張、本檔做完整解釋）

| 規則 | 觸發時機 | 動作 |
|---|---|---|
| A041 揭露精確 | 揭露範圍 / 數量 | `grep -c` 精確 count |
| A046 PowerShell 中文檔 | 編輯含中文檔 | 切 Edit / Write tool |
| A052 git add 精確 | 任何 git add 時機 | 用具體檔案路徑、禁 `-A` |
| A066 Read-before-Edit | Edit/Write 既有檔 | 先 Read、必要時 replace_all=true |
| G.4 歷史 fact 保留 | spec 歷史描述 | 加 HTML 註解、不 replace |
| G.8 範圍擴散可執行 | impl 階段超範圍 | 直接做 + commit + 事後回報（危險命令除外）|
| G.9 verify 通配 grep | 「是否存在」斷言前 | 通配 grep、禁單檔 ls |
| PRZ-01 partial unique | 每次 migrate dev | 移除誤產 DROP INDEX |
| PRZ-02 multi-clause | RENAME + ALTER COLUMN | 拆獨立 statement + verify |
