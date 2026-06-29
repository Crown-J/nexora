# .claude/hooks/block-dangerous.ps1
# NEXORA 危險指令黑名單（PreToolUse hook）
# 擋三條毀滅指令：Railway 連線 / git push --force|-f / prisma migrate reset
# 觸發時回 JSON permissionDecision=deny，Claude Code 收到後不執行該 tool。
# 2026-06-29：加授權旁路——指令帶標記 NX_AUTH_OK 放行（執行長明確授權某操作時用、見下方說明）。

$ErrorActionPreference = 'Stop'

try {
    $payloadRaw = [Console]::In.ReadToEnd()
    if ([string]::IsNullOrWhiteSpace($payloadRaw)) { exit 0 }
    $payload = $payloadRaw | ConvertFrom-Json
} catch {
    exit 0
}

$tool = $payload.tool_name
$cmd = ''
$content = ''

switch ($tool) {
    'Bash'  { $cmd = [string]$payload.tool_input.command }
    'Edit'  { $content = "$([string]$payload.tool_input.new_string)`n$([string]$payload.tool_input.old_string)" }
    'Write' { $content = [string]$payload.tool_input.content }
    default { exit 0 }
}

# ============================================================
# 授權旁路（執行長 2026-06-29 定）
# 指令／內容若帶明確授權標記 NX_AUTH_OK，視為執行長已就「該次操作」明確授權、直接放行。
# ⚠️ 標記由 Claude 自行帶入＝榮譽制：仍能擋「手滑／誤觸」（未帶標記的危險指令照舊 deny），
#    但擋不住「Claude 判斷錯誤卻自行加了標記」。Claude 只在執行長明講授權某操作時才加此標記。
# ============================================================
$haystackAll = "$cmd`n$content"
if ($haystackAll -match 'NX_AUTH_OK') { exit 0 }

function Deny([string]$reason) {
    $obj = @{
        hookSpecificOutput = @{
            hookEventName            = 'PreToolUse'
            permissionDecision       = 'deny'
            permissionDecisionReason = $reason
        }
        systemMessage = $reason
    }
    $json = $obj | ConvertTo-Json -Depth 10 -Compress
    [Console]::Out.WriteLine($json)
    exit 0
}

# ============================================================
# Rule 1: Railway production 連線（執行長拍板鐵則）
# ============================================================
$railwayPattern = '(?i)(railway\.app|rlwy\.net|railway\.internal)'
$haystack = if ($tool -eq 'Bash') { $cmd } else { $content }
if ($haystack -match $railwayPattern) {
    Deny "⛔ 黑名單擋下：偵測到 Railway production 連線字串（$($Matches[0])）。執行長拍板鐵則：開發期禁碰 Railway production——那是未來放恆迎真實客戶資料的環境。要連線請執行長親自處理。"
}

# ============================================================
# Bash-only rules — 拆 shell 分隔符後逐段檢查（避開複合命令誤判）
# ============================================================
if ($tool -ne 'Bash') { exit 0 }

$segments = $cmd -split '\s*(?:&&|\|\||;|\|)\s*'

foreach ($seg in $segments) {
    if ([string]::IsNullOrWhiteSpace($seg)) { continue }

    # ----------------------------------------------------------
    # Rule 2: git push --force / -f（含 --force-with-lease）
    # ----------------------------------------------------------
    if ($seg -match '(?i)\bgit\s+push\b') {
        $hasLongForce  = $seg -match '(?i)(?:\s|^)--force(?:-with-lease)?(?:\s|=|$)'
        $hasShortForce = $seg -match '(?i)(?:\s|^)-[a-zA-Z]*f[a-zA-Z]*(?:\s|$)'
        if ($hasLongForce -or $hasShortForce) {
            Deny "⛔ 黑名單擋下：git push --force / -f 強制覆蓋遠端主線。CLAUDE.md §12 鐵律：危險命令須執行長拍板。命中段：``$seg``。若是 lease 變體也一律擋，要 push 改用無 --force/-f 的正常 push。"
        }
    }

    # ----------------------------------------------------------
    # Rule 3: prisma migrate reset（一秒清空 DB）
    # ----------------------------------------------------------
    if ($seg -match '(?i)\bprisma\s+migrate\s+reset\b') {
        Deny "⛔ 黑名單擋下：prisma migrate reset 會一秒清空整個資料庫。CLAUDE.md §12 鐵律：須執行長拍板。命中段：``$seg``。正常 migrate dev / migrate deploy 不受影響。"
    }
}

exit 0
