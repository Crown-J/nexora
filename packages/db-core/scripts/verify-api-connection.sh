#!/bin/bash
# 前後端連結驗證：登入 + 列關鍵主檔
# 用法: bash scripts/verify-api-connection.sh
set -e

API=http://localhost:3001
TENANT=TW-100001
USER=Y0156
PASS='CYTIC#8412'

echo "═══════════════════════════════════════════════════"
echo " 前後端 API 連結驗證 (CYTIC TW-100001 / Y0156)"
echo "═══════════════════════════════════════════════════"
echo ""

# 1. 登入
echo "▶ 登入 ${USER} @ ${TENANT}..."
LOGIN_RESP=$(curl -s -X POST "${API}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"tenantCode\":\"${TENANT}\",\"userAccount\":\"${USER}\",\"password\":\"${PASS}\"}")
echo "  Response: $(echo "$LOGIN_RESP" | head -c 200)"
TOKEN=$(echo "$LOGIN_RESP" | grep -oP '"accessToken":"[^"]+' | cut -d'"' -f4)
if [ -z "$TOKEN" ]; then
  TOKEN=$(echo "$LOGIN_RESP" | grep -oP '"token":"[^"]+' | cut -d'"' -f4)
fi
if [ -z "$TOKEN" ]; then
  echo "  ✗ 拿不到 token"
  echo "  Full: $LOGIN_RESP"
  exit 1
fi
echo "  ✓ Token: ${TOKEN:0:30}..."
echo ""

AUTH="Authorization: Bearer ${TOKEN}"

# 2. 驗證主檔 endpoint
check() {
  local label=$1
  local path=$2
  local expected_min=$3
  local resp=$(curl -s "${API}${path}" -H "$AUTH")
  local count=$(echo "$resp" | grep -oP '"id":' | wc -l)
  local total=$(echo "$resp" | grep -oP '"total":\s*\K[0-9]+' | head -1)
  if [ -z "$total" ]; then total=$count; fi
  if [ "$count" -ge "$expected_min" ]; then
    echo "  ✓ ${label}: 拿到 ${count} 筆 (total=${total})"
  else
    echo "  ✗ ${label}: 只拿 ${count} 筆 (預期 ≥${expected_min})"
    echo "    ${path}: $(echo "$resp" | head -c 200)"
  fi
}

echo "▶ 主檔 endpoint 驗證..."
check "員工 (162)" "/nx01/users?limit=200" 100
check "部門 (5)" "/nx01/departments" 5
check "組 (5)" "/nx01/teams" 5
check "角色 (2)" "/nx01/roles" 2
check "客戶等級 (4)" "/nx01/customer-grades" 4
check "倉庫 (5)" "/nx01/warehouses" 5
check "庫位 (17)" "/nx01/locations" 10
check "Partner (4003)" "/nx01/partners?limit=50" 50
check "Brand (463)" "/nx01/brands?limit=50" 50
check "Part (95839)" "/nx01/parts?limit=50" 50
echo ""

# 3. 庫存
echo "▶ 庫存 endpoint..."
check "Stock Balance (477771)" "/nx03/stock-balance?limit=50" 50

echo ""
echo "═══════════════════════════════════════════════════"
echo " 完成"
echo "═══════════════════════════════════════════════════"
