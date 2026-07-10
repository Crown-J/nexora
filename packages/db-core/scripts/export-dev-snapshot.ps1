# packages/db-core/scripts/export-dev-snapshot.ps1
# 位置：packages/db-core/scripts/export-dev-snapshot.ps1
# 版本：v1.0（2026-07-10）
# 說明：在「公司機（資料來源）」產生輕量開發資料庫快照。
#       排除偉盟歷史交易 6 大表的「資料」（schema 仍保留），其餘全量。
#       產出 .dump（pg_dump 自訂格式、已壓縮），交給 restore-dev-snapshot.ps1 還原。
# 用法：powershell -File export-dev-snapshot.ps1 [-OutDir D:\交換] [-Port 5433]

param(
  [string]$OutDir = "$PSScriptRoot\..\snapshots",
  [string]$DbHost = "localhost",
  [int]$Port = 5433,
  [string]$User = "nexora",
  [string]$Db = "nexora_core"
)

$ErrorActionPreference = "Stop"
$pgDump = "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe"
if (-not (Test-Path $pgDump)) { $pgDump = (Get-Command pg_dump -ErrorAction Stop).Source }

# 密碼從 db-core/.env 的 DATABASE_URL 取（不寫死在腳本）
$envFile = Join-Path $PSScriptRoot "..\.env"
$dbUrl = (Get-Content $envFile | Select-String '^DATABASE_URL').Line
if ($dbUrl -match '://[^:]+:([^@]+)@') { $env:PGPASSWORD = $Matches[1] } else { throw "無法從 $envFile 解析密碼" }

# 偉盟歷史交易大表：只留 schema、不帶資料（2026-07-10 量測共約 1.7GB）
$excludeData = @(
  "public.nx04_so",       # 558 MB / 151 萬列
  "public.nx04_so_item",  # 860 MB / 286 萬列
  "public.nx02_rr",       #  35 MB / 11.8 萬列
  "public.nx02_rr_item",  # 148 MB / 59 萬列
  "public.nx04_sr",       #  35 MB / 13 萬列
  "public.nx04_sr_item"   #  47 MB / 20 萬列
)

if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Force $OutDir | Out-Null }
$stamp = Get-Date -Format "yyyyMMdd"
$outFile = Join-Path $OutDir "nexora-dev-snapshot-$stamp.dump"

$args = @("-h", $DbHost, "-p", $Port, "-U", $User, "-d", $Db, "-Fc", "-f", $outFile)
foreach ($t in $excludeData) { $args += @("--exclude-table-data", $t) }

Write-Host "pg_dump 開始（排除 $($excludeData.Count) 張大表資料）..."
& $pgDump @args
$env:PGPASSWORD = $null

$size = [math]::Round((Get-Item $outFile).Length / 1MB, 1)
Write-Host "完成：$outFile（$size MB）"
Write-Host "下一步：把檔案帶到目標機，跑 restore-dev-snapshot.ps1"
