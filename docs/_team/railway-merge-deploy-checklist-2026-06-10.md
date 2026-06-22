<!-- docs/_team/railway-merge-deploy-checklist-2026-06-10.md -->
<!-- 檔案版本：v1.1 -->
<!-- 檔案說明：2026-06-10 main 上線執行清單（nx10 移除 + 全線路重整 + W6 品牌合併、共 30 migration）。
     由 Hank 備指令、執行長親自跑。Hank 無 Railway 連線權、不執行任何步驟。
     v1.1（CTO 微調）：把 reset 提到 push 之前驗權限、失敗時線上零損失。 -->

# Railway 上線執行清單（2026-06-10）

> **背景**：本機 main 領先 `origin/main` 148 commit / 30 migration、含 nx10 砍 14 表 + W6 品牌合併（2 表 DROP）+ 重整全套。執行長已拍板「線上資料全可丟、用重置重建」。
> **執行者**：執行長（Hank 無 Railway 連線權）
> **總時間預估**：10~20 分鐘（含等待 Railway build）

---

## ⛔ 先看四個警語

1. ⚠️ **Step 2 `prisma migrate reset` 不可逆**：會 DROP 整個 public schema、所有資料消失。**必須先做 Step 1 備份**。
2. ⚠️ **本流程「先 reset、後 push」**：把唯一不確定的「reset 權限」提前驗、失敗時線上仍是舊版好的、零損失。reset 成功後到 push 完成新 nx-api 上線之間 ~5-10 分鐘 nx-api 會壞（DB 新、code 舊）。線上無人使用、可忍。
3. ⚠️ **Railway DATABASE_URL 不要落入 .env 提交**：跑完任務後從 shell 取消（`Remove-Item Env:DATABASE_URL`）。
4. ⚠️ **`prisma migrate reset` 在 CLAUDE.md 危險指令清單**：本次經執行長口頭拍板、合法。Hank 仍不執行。

---

## 預備｜DATABASE_URL 取得

到 **Railway Dashboard** → 你的專案 → **Postgres** 服務 → **Connect** 分頁 → **Public Network** 區段 → 複製整段 URI。

格式應類似：
```
postgresql://postgres:<密碼>@<host>.proxy.rlwy.net:<port>/railway
```

⭐ **複製後在尾巴加 `?sslmode=require`**（Railway Public 需要 TLS）：
```
postgresql://postgres:xxx@xxx.proxy.rlwy.net:12345/railway?sslmode=require
```

---

## 兩種策略：選一個

### 策略 A：直接做（**推薦**、線上無人用）

時序：備份 → **先試 reset 驗權限**（失敗就停、線上零損失）→ push → seed → 重啟。reset 成功後到 push 後 Railway build 完成的 ~5-10 分鐘 nx-api 會壞、可忍。

### 策略 B：先暫停服務再做（保守）

到 Railway Dashboard → nx-api 服務 → Settings → Pause Service。
做完所有步驟後再 Resume。**0 錯誤日誌**、但服務全程 unavailable。

**Hank 建議 A**。下面指令以 A 為基底、B 在每步註記差異。

⭐ **流程設計重點**：把唯一不確定的「DB reset 權限」**提到 push 之前**驗。若 reset 失敗、線上仍是舊版正常運作、未 push 無損失、立刻找 Hank 排查替代方案（例如改用有權限的連線、或改 `drop + migrate deploy`）。

---

## Step 1｜備份線上 DB（保險、即使可丟也做）

在你本機 PowerShell 跑（**不要用 Hank 的對話視窗、避免污染 env**）：

```powershell
# 1.1 設 Railway DB URL（取自上面預備步驟）
$env:DATABASE_URL = "postgresql://postgres:<填密碼>@<填host>.proxy.rlwy.net:<填port>/railway?sslmode=require"

# 1.2 確認 dev-backups/ 目錄存在
cd C:\nexora
if (-not (Test-Path dev-backups)) { New-Item -ItemType Directory dev-backups }

# 1.3 pg_dump（需本機有 PostgreSQL client、若沒裝見下方備案）
pg_dump $env:DATABASE_URL -Fc -f dev-backups\railway-pre-merge-2026-06-10.dump

# 1.4 確認檔案大小（>0 才算成功、通常 5~50 MB）
Get-Item dev-backups\railway-pre-merge-2026-06-10.dump | Select Name, Length
```

### 沒裝 pg_dump 的備案

選一：
- **裝 PostgreSQL client**：到 https://www.postgresql.org/download/windows/ 裝、勾「Command Line Tools」、加 PATH
- **用 Docker**（你本機已有 PostgreSQL 16 docker container）：
  ```powershell
  docker run --rm -v ${PWD}/dev-backups:/backup postgres:16-alpine pg_dump $env:DATABASE_URL -Fc -f /backup/railway-pre-merge-2026-06-10.dump
  ```

### 預期結果

```
railway-pre-merge-2026-06-10.dump  Length: ~10000000 (10 MB 級)
```

出錯：
- `pg_dump: server version: 17.x; pg_dump version: 16.x` → 用 Docker 備案、確保 version match
- `connection refused` → DATABASE_URL 錯、確認 host/port/password、確認加了 `?sslmode=require`

---

## Step 2｜⛔ 先驗證權限 + 重置線上 DB（不可逆、未 push、失敗零損失）

```powershell
# 2.1 確認 DATABASE_URL 還在 env（從 Step 1 帶過來）
echo "DATABASE_URL = $env:DATABASE_URL"   # 應顯示 Railway URL、不是 localhost

# 2.2 Prisma 7 需要 DIRECT_URL（同 DATABASE_URL 即可、Railway public 不過 PgBouncer）
$env:DIRECT_URL = $env:DATABASE_URL

# 2.3 先讀現況（純讀、確認連得上 + 看 Railway DB 落後幾支 migration）
cd C:\nexora\packages\db-core
pnpm exec prisma migrate status
```

### 預期 `migrate status` 結果

應看到「following migrations have not yet been applied」並列出本次 30 支。確認連線 OK、權限至少能 read。

```powershell
# 2.4 ⛔ 重置（Hank 已驗本機：30 migration 會按時序套用、含 W6 三階段 + nx10 砍表）
pnpm exec prisma migrate reset --force --skip-seed
```

`--force` 跳過 "確定要重置嗎" 互動 prompt（你已決策）。
`--skip-seed` 因為要在 Step 4 分開跑 seed（一步看一步）。

### 預期結果（console 會印類似）

```
Database reset successful

Applying migration `20260413120000_spec_v7_baseline`
Applying migration `20260413140000_nx99_subscription_currency_id_len`
... (共約 100+ 支 migration、含本次 30 新支)
Applying migration `20260610073140_remove_nx10_module`

The following migrations have been applied:
  ✔ ...

Database has been reset.
```

時間：~30 秒~2 分鐘。

### ⭐ 此步失敗怎麼辦（**重點**）

**未 push、線上仍是舊版好的、零損失**。停手回報 Hank。常見錯誤：

| 錯誤 | 根因 | Hank 接手方向 |
|---|---|---|
| `cannot drop schema public` | Railway 帳號權限不足 | 換用 Railway superuser 連線、或改用 `drop schema + migrate deploy` |
| `permission denied for schema public` | 同上 | 同上 |
| `connection terminated` / timeout | 網路問題 | 重跑（reset 冪等、再跑會直接成功）|
| `Migration X failed: column already exists` | schema drift | 急報 Hank 看本機 vs Railway schema 差異 |
| `connection refused` | DATABASE_URL 錯 | 重新從 Railway Dashboard 複製 URI、確認加了 `?sslmode=require` |

⚠️ Step 2 不成功絕對不要往 Step 3 推進、否則就會卡在「DB 半殘 + 線上壞 + 還沒備份完整」最糟狀態。

### Step 2 通過後：DB 已是新 schema 空庫

- Railway 上**舊** nx-api 仍在跑、但**所有 DB query 會開始崩**（找不到舊欄位/表）
- Railway log 會狂噴錯、可能進 crash loop
- **立刻往 Step 3 推**、把新 code 上線
- 策略 B：此時可去 Railway Dashboard 暫停 nx-api 服務（防 log noise）

---

## Step 3｜push main（觸發 Railway 部署新程式）

```powershell
cd C:\nexora
git push origin main
```

### 預期結果

```
Enumerating objects: ...
To https://github.com/Crown-J/nexora.git
   c06e029d..2cc72094  main -> main
```

推完後：
- Vercel 開始 build 新前端（~2 分鐘）
- Railway 開始 build 新後端 Docker image（~2-5 分鐘）

### ⚠️ 此後 ~2-5 分鐘

- 舊 nx-api 仍在跑、但 Step 2 已 reset DB → 舊 code 持續崩
- Railway build 完成 → 啟動**新** nx-api → DB schema 已對齊 → **應該乾淨啟動**
- 若新 nx-api 仍崩、看 Step 5.1 排查

---

## Step 4｜重灌種子資料

```powershell
# 4.1 回 repo 根目錄
cd C:\nexora

# 4.2 跑 system 層 seed（SYSTEM 租戶 + SYSADMIN + 9 plans + view/currency/country/warehouse_type）
pnpm tsx packages/db-core/prisma/seed/index.ts --mode system
```

### 為何只跑 `--mode system`

- `--mode system` = 跑 system 層（基礎資料、所有環境必要）
- `--mode test` = 跑測試租戶（LITE/PLUS/PRO 3 個假客戶 + 測試 user）— **被 `NODE_ENV=production` 自動擋**、Railway 預設 production
- 若想灌測試租戶（給伊諾瓦 / Hana 看 demo）：
  ```powershell
  # 先暫時改 NODE_ENV、跑完改回
  $env:NODE_ENV = "development"
  pnpm tsx packages/db-core/prisma/seed/index.ts --mode all --tier all
  Remove-Item Env:NODE_ENV
  ```

### 預期結果

```
====================================
🌱 NEXORA Seed 主入口
   mode = system
   tier = all
   NODE_ENV = production
====================================
[seed:system] SYSTEM tenant created/updated
[seed:system] SYSADMIN created
[seed:system] 9 plans seeded
... (currency / country / warehouse_type)
====================================
✅ NEXORA Seed 全部完成
====================================
```

時間：~30 秒。

---

## Step 5｜重啟 + 驗證

### 5.1 確認 Railway nx-api 起來

- 進 Railway Dashboard → nx-api 服務 → Deployments → 確認最新 deploy 狀態 = `SUCCESS`
- 若還在 `Crashed`（Step 2-3 之間崩過）→ 點 **Redeploy** 或 **Restart**
- 策略 B 用戶：到此 Resume Service

### 5.2 抽測 nx-api `/health`

```powershell
# 換成你的 Railway nx-api 公開 URL（通常 xxx.up.railway.app 或自訂 domain）
curl https://<你的nx-api-railway-url>/health
```

預期：`200`、body 通常 `{"status":"ok"}` 之類。

### 5.3 抽測前端業務網址（Vercel）

```powershell
# 前端 = app.nexoragrid.com（per system-architecture.md）
foreach ($u in @("/", "/login", "/dashboard/purchase", "/dashboard/inventory", "/dashboard/sale", "/dashboard/finance", "/dashboard/report")) {
    "{0,-32} HTTP {1}" -f $u, (Invoke-WebRequest "https://app.nexoragrid.com$u" -Method Head -MaximumRedirection 0 -SkipHttpErrorCheck).StatusCode
}
```

預期：
- `/` → 308 或 200
- `/login` → 200
- `/dashboard/*` → 307（未登入會 redirect 到 /login）

### 5.4 抽測舊 nx0X 軟轉向

```powershell
# nx02 → purchase、nx08 → report 應該都軟轉到對應業務名
Invoke-WebRequest "https://app.nexoragrid.com/dashboard/nx02" -Method Get -MaximumRedirection 5 -SkipHttpErrorCheck | Select StatusCode, BaseResponse
```

### 5.5 登入測試

到 `https://app.nexoragrid.com/login` 用 SYSADMIN 帳號（seed 灌的、預設密碼 `changeme`、登入後強制改）登入、確認進得了 dashboard。

---

## 跑完後｜清乾淨

```powershell
# 清掉 shell 裡的 Railway DATABASE_URL，避免下次本機指令誤連線上
Remove-Item Env:DATABASE_URL
Remove-Item Env:DIRECT_URL
```

---

## 出事時的回滾路徑

### 情境 A：Step 2 reset 失敗（權限不足 / 連不上）

**最安全的失敗時點**。未 push、線上仍是舊版好的。不用回滾、直接停手回報 Hank。

### 情境 B：Step 2 reset 跑到一半中斷（網路斷 / Ctrl+C）

DB 可能半殘（部分 migration 已套、部分沒套）。用 Step 1 備份還原：

```powershell
pg_restore --clean --if-exists -d $env:DATABASE_URL dev-backups\railway-pre-merge-2026-06-10.dump
```

還原後重跑 Step 2 即可。

### 情境 C：Step 4 seed 失敗、DB schema 對但無資料

不嚴重。修 seed 錯誤、重跑 `pnpm tsx ... --mode system` 即可（seed 多半 idempotent）。

### 情境 D：Step 5 驗證失敗（網址報錯 / 登入不上）

- 看 Railway Dashboard nx-api logs（最直接、看哪個 query 炸）
- 看 Vercel Dashboard 前端 build / runtime logs
- 急 case 把 Vercel 部署 rollback 到上一個 production（Vercel Dashboard → Deployments → 上一個 → Promote）+ Railway 也 rollback、但**注意 DB 已是新 schema、舊 code 會繼續崩**、需用 Step 1 dump 回滾 DB 才能讓舊版完整復活

---

## 全流程速查（命令彙整、按順序、⭐ 新順序：先 reset 驗權限再 push）

```powershell
# === 預備 ===
$env:DATABASE_URL = "postgresql://postgres:<密碼>@<host>.proxy.rlwy.net:<port>/railway?sslmode=require"
$env:DIRECT_URL   = $env:DATABASE_URL

# === Step 1：備份 ===
cd C:\nexora
if (-not (Test-Path dev-backups)) { New-Item -ItemType Directory dev-backups }
pg_dump $env:DATABASE_URL -Fc -f dev-backups\railway-pre-merge-2026-06-10.dump
Get-Item dev-backups\railway-pre-merge-2026-06-10.dump | Select Name, Length

# === Step 2：先驗權限 + reset DB（⛔ 不可逆、未 push、失敗零損失） ===
cd C:\nexora\packages\db-core
pnpm exec prisma migrate status                      # 純讀、確認連得上
pnpm exec prisma migrate reset --force --skip-seed   # 失敗→停手回報 Hank、線上仍是舊版好

# === Step 3：push（reset 成功才推、減少新 code 啟動失敗風險） ===
cd C:\nexora
git push origin main

# === Step 4：seed system 層 ===
pnpm tsx packages/db-core/prisma/seed/index.ts --mode system

# === Step 5：驗證（Railway Dashboard 看 nx-api status + curl /health + 開瀏覽器測） ===

# === 清 env ===
Remove-Item Env:DATABASE_URL
Remove-Item Env:DIRECT_URL
```

---

## Hank 本機已驗證的部分

| 項目 | 結果 |
|---|---|
| `tsc --noEmit` nx-api | ✅ 0 error（prisma generate 後） |
| `tsc --noEmit` nx-ui | ✅ 0 error |
| 30 migration 內容掃 | ✅ 含 18 DROP TABLE + 11 DROP COLUMN、皆預期 |
| 本機 dev 兩端起來 + 抽測 | ✅ 業務網址全 200、nx0X 軟轉向正常 |
| 段 0~5 合 main + 3 redirect 補 | ✅ 完成、commit `2cc72094` |

→ **本機端可控部分全綠**、剩 Railway 端執行。

---

## Hank 不執行什麼

| 動作 | 為什麼 | 改誰做 |
|---|---|---|
| `git push origin main` | 屬危險動作、推遠端需執行長拍 | 執行長 Step 2 |
| `pg_dump` Railway | Hank 沒 Railway 連線權（hook 擋） | 執行長 Step 1 |
| `prisma migrate reset` Railway | 不可逆、Hank 不執行 destructive | 執行長 Step 3 |
| `prisma db seed` Railway | 同上、需 DATABASE_URL 指 Railway | 執行長 Step 4 |
| Railway Dashboard 操作 | Hank 看不到 dashboard | 執行長 |

— Hank 備指令、執行長拍板 + 跑、出事 Hank 接著支援查 log / 修 schema。
