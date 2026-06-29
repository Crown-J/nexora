<!-- docs/_team/railway-deploy-checklist-2026-06-29.md -->
<!-- 檔案版本：v1.0 -->
<!-- 檔案說明：2026-06-29 main 上線執行清單（57 commit / 9 migration：零件重構 destructive + RBAC拆分/五層倉儲 additive）。
     由 Hank 備指令、執行長親自跑。Hank 無 Railway 連線權、不執行任何步驟。
     範式沿用 docs/_team/railway-merge-deploy-checklist-2026-06-10.md（已驗證流程）。 -->

# Railway 上線執行清單（2026-06-29）

> ✅ **已執行（2026-06-29）**：實際走「DROP SCHEMA public CASCADE + 還原本機 dump」路線（非 prisma migrate reset）。
> 線上備份 `dev-backups/railway-pre-2026-06-29.dump`（13MB、含當時 95,839 零件）；還原後 186 表 / 3 租戶 / 164 用戶 / 4003 往來 / 權限等級 3 / 貨架 5 / 零件 **0**；`git push origin main` 完成、Vercel 新前端上線。
> ⏳ 待辦：**95,839 零件待從匯入來源重灌**；建議 rotate Railway DB 密碼（曾出現在對話）。

> **背景**：本機 `main` 領先 `origin/main` **57 commit / 9 migration**。內容：
> - 零件主檔重構（destructive：砍 `nx01_brand_code_rule` 表、seg1~5 / old_code 欄、車型分類四表/欄）
> - 職務↔權限等級拆分（additive：新 `nx01_permission_level` ×3 表 + `nx01_user.permission_level_id`）
> - 五層倉儲（additive：新 `nx01_warehouse_rack` 表 + `nx01_location.rack_id`）
> - 大量純前端六層化 / 配色 / 命名（不碰 DB）
> **執行者**：執行長（Hank 無 Railway 連線權、hook 擋）
> **總時間預估**：10~20 分鐘（含等 Railway build）

---

## ⛔ 先決策：資料策略（執行長拍板）

本批含 **destructive migration**（DROP 表/欄）。兩條路選一條：

| | 策略 R：reset 重建（推薦・pre-launch 無真實客戶）| 策略 D：migrate deploy（保留資料）|
|---|---|---|
| 做法 | 砍 public schema 全重建 + seed system | 只套 9 支 pending migration、不動既有資料 |
| 資料 | **線上資料全清**（零件/測試租戶都沒了）| 保留；但 destructive migration 仍會 DROP 對應表/欄 |
| 風險 | 低（流程已驗證 2026-06-10）| 中（drift / 本機是 db-execute 套的、deploy 重跑 SQL 可能撞既有狀態）|
| 適用 | 還沒接真實客戶、線上是測試資料 | 線上已有要保留的資料 |

> Hank 建議 **策略 R**（與 2026-06-10 同、pre-launch 線上資料可丟）。以下指令以 R 為基底。
> ⚠️ 若線上已有不可丟的資料，**先停、改走策略 D**（Hank 另備 migrate deploy 版指令）。

### 策略 R 的兩個已知後果（可接受、先知道）
1. **重置後線上 0 筆零件**：零件資料是本機重構時清空重匯的、Railway 不會自動有。pre-launch 無妨；要 demo 再另跑零件匯入。
2. **內建 S 權限等級在全新空庫不會自動建**：`20260628020000` 資料遷移在空庫跑＝no-op。但 **SYSADMIN/OWNER 角色照常治理**（guard 雙認），登入/權限不受影響；S 等級之後在「權限等級」頁手動建即可。

---

## 預備｜DATABASE_URL（同 2026-06-10）

Railway Dashboard → 專案 → Postgres → Connect → Public Network → 複製 URI、尾巴加 `?sslmode=require`：
```
postgresql://postgres:<密碼>@<host>.proxy.rlwy.net:<port>/railway?sslmode=require
```
在**你本機 PowerShell** 跑（不要用 Hank 對話視窗、避免污染 env）。

---

## Step 1｜備份線上 DB（即使可丟也做）

```powershell
$env:DATABASE_URL = "postgresql://postgres:<密碼>@<host>.proxy.rlwy.net:<port>/railway?sslmode=require"
cd C:\nexora
if (-not (Test-Path dev-backups)) { New-Item -ItemType Directory dev-backups }
pg_dump $env:DATABASE_URL -Fc -f dev-backups\railway-pre-2026-06-29.dump
Get-Item dev-backups\railway-pre-2026-06-29.dump | Select Name, Length
```
沒裝 pg_dump → 用 Docker：
```powershell
docker run --rm -v ${PWD}/dev-backups:/backup postgres:16-alpine pg_dump $env:DATABASE_URL -Fc -f /backup/railway-pre-2026-06-29.dump
```

---

## Step 2｜⛔ 先驗權限 + 重置線上 DB（不可逆、未 push、失敗零損失）

```powershell
$env:DIRECT_URL = $env:DATABASE_URL
cd C:\nexora\packages\db-core
pnpm exec prisma migrate status        # 純讀、確認連得上 + 看落後 9 支
pnpm exec prisma migrate reset --force --skip-seed
```
- `migrate status` 應列出未套用的 9 支（20260626* ×4 + 20260628* ×5）。
- reset 失敗（權限不足/連不上）→ **停手、線上仍是舊版好的、零損失、回報 Hank**。

---

## Step 3｜push main（reset 成功才推、觸發 Railway/Vercel 部署）

```powershell
cd C:\nexora
git push origin main
```
推完：Vercel build 新前端（~2 分）、Railway build 新後端（~2-5 分）。
此後 ~2-5 分舊 nx-api 會崩（DB 新 code 舊）、build 完新 nx-api 起來就乾淨。

---

## Step 4｜重灌 system 種子

```powershell
cd C:\nexora
pnpm tsx packages/db-core/prisma/seed/index.ts --mode system
```
建 SYSTEM 租戶 + SYSADMIN + plans + currency/country/warehouse_type。
（要灌測試租戶：`$env:NODE_ENV="development"` → `--mode all --tier all` → `Remove-Item Env:NODE_ENV`）

---

## Step 5｜重啟 + 驗證

1. Railway Dashboard → nx-api → Deployments 確認最新 = `SUCCESS`；若 `Crashed` 點 Restart。
2. `curl https://<nx-api-railway-url>/health` → 200。
3. 前端抽測：
```powershell
foreach ($u in @("/", "/login", "/dashboard/master/users", "/dashboard/settings/permission-levels", "/dashboard/master/warehouse-rack", "/dashboard/master/zipcode")) {
  "{0,-44} HTTP {1}" -f $u, (Invoke-WebRequest "https://app.nexoragrid.com$u" -Method Head -MaximumRedirection 0 -SkipHttpErrorCheck).StatusCode
}
```
   - `/` → 308/200、`/login` → 200、`/dashboard/*` → 307（未登入轉 /login）
4. 登入 SYSADMIN（seed 預設密碼 `changeme`、首次強制改）→ 確認進 dashboard、抽看本批新頁：權限等級 / 區域 / 貨架 / 郵遞區號 / 據點架構（五層）。

---

## 跑完後｜清 env

```powershell
Remove-Item Env:DATABASE_URL
Remove-Item Env:DIRECT_URL
```

---

## 回滾路徑

- **Step 2 reset 失敗**：未 push、線上仍舊版好、不用回滾、回報 Hank。
- **reset 中斷半殘**：`pg_restore --clean --if-exists -d $env:DATABASE_URL dev-backups\railway-pre-2026-06-29.dump` 還原後重跑 Step 2。
- **Step 5 驗證失敗**：看 Railway nx-api logs（哪個 query 炸）/ Vercel logs；急則 Vercel Deployments 把上一版 Promote、Railway rollback + 用 Step 1 dump 回滾 DB。

---

## Hank 本機已驗

| 項目 | 結果 |
|---|---|
| `tsc --noEmit` nx-api | ✅ 0 error（prisma generate 後）|
| `tsc --noEmit` nx-ui | ✅ 0 error |
| working tree | ✅ 乾淨（57 commit 全 committed）|
| 9 migration 本機套用 | ✅ localhost:5433 已套、頁面實測正常 |

## Hank 不執行（紀律）

`git push origin main` / `pg_dump` Railway / `migrate reset` Railway / Railway Dashboard — 皆執行長親自跑（Hank 無連線權、hook 擋）。Hank 備指令、出事接著查 log / 修 schema。
