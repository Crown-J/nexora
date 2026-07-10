# packages/db-core/scripts/restore-dev-snapshot.ps1
# 位置：packages/db-core/scripts/restore-dev-snapshot.ps1
# 版本：v1.0（2026-07-10）
# 說明：在「新開發機（家用機/新工程師機）」還原輕量快照。
#       會建立 nexora 角色與 nexora_core 資料庫（已存在則跳過/報錯提示）。
# 前置：已安裝 PostgreSQL 16、知道 postgres 超級使用者密碼。
# 用法：powershell -File restore-dev-snapshot.ps1 -DumpFile C:\交換\nexora-dev-snapshot-20260710.dump [-Port 5432]
# ⚠️ 還原後記得把 packages/db-core/.env 等四個 .env 的 DATABASE_URL 埠號改成本機實際埠號。

param(
  [Parameter(Mandatory = $true)][string]$DumpFile,
  [string]$DbHost = "localhost",
  [int]$Port = 5432,
  [string]$NexoraPassword = "nexora"
)

$ErrorActionPreference = "Stop"
$bin = "C:\Program Files\PostgreSQL\16\bin"
if (-not (Test-Path "$bin\pg_restore.exe")) { $bin = Split-Path (Get-Command pg_restore -ErrorAction Stop).Source }
if (-not (Test-Path $DumpFile)) { throw "找不到快照檔：$DumpFile" }

# 以 postgres 超級使用者建角色 + 資料庫（密碼互動輸入、不落地）
Write-Host "== 步驟 1/3：建立角色 nexora 與資料庫 nexora_core（會問 postgres 密碼）=="
& "$bin\psql.exe" -h $DbHost -p $Port -U postgres -c "DO `$`$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='nexora') THEN CREATE ROLE nexora LOGIN PASSWORD '$NexoraPassword'; END IF; END `$`$;"
& "$bin\psql.exe" -h $DbHost -p $Port -U postgres -c "SELECT 'exists' FROM pg_database WHERE datname='nexora_core'" -t -A | Tee-Object -Variable dbExists | Out-Null
if ($dbExists -notmatch 'exists') {
  & "$bin\psql.exe" -h $DbHost -p $Port -U postgres -c "CREATE DATABASE nexora_core OWNER nexora"
} else {
  Write-Host "⚠️ nexora_core 已存在——若要重灌請先手動 DROP DATABASE（本腳本不做破壞性動作）"
}

Write-Host "== 步驟 2/3：pg_restore 還原（會再問一次 postgres 密碼）=="
& "$bin\pg_restore.exe" -h $DbHost -p $Port -U postgres -d nexora_core --no-owner --role=nexora $DumpFile

Write-Host "== 步驟 3/3：驗證 =="
$env:PGPASSWORD = $NexoraPassword
& "$bin\psql.exe" -h $DbHost -p $Port -U nexora -d nexora_core -t -A -c "SELECT '零件 ' || count(*) FROM nx01_part UNION ALL SELECT '庫存餘額 ' || count(*) FROM nx03_stock_balance UNION ALL SELECT '夥伴 ' || count(*) FROM nx01_partner"
$env:PGPASSWORD = $null
Write-Host "完成。接著：改四個 .env 的 DATABASE_URL 埠號 → pnpm --filter @nexora/db-core exec prisma generate"
