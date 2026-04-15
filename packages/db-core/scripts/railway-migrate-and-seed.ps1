# Run from any shell after Railway Postgres is empty and variables are set:
#   $env:DATABASE_URL = "<public URL>?sslmode=require"
#   $env:DIRECT_URL   = $env:DATABASE_URL   # prisma.config.ts prefers DIRECT_URL
#   pwsh -File packages/db-core/scripts/railway-migrate-and-seed.ps1
$ErrorActionPreference = 'Stop'
if (-not $env:DATABASE_URL) {
  Write-Error 'Set DATABASE_URL to the Railway Postgres public connection string first.'
}
if (-not $env:DIRECT_URL) {
  $env:DIRECT_URL = $env:DATABASE_URL
}
Set-Location (Join-Path $PSScriptRoot '..')
pnpm exec prisma migrate deploy
pnpm exec prisma db seed
Write-Host 'Done: migrate deploy + db seed against DATABASE_URL.'
