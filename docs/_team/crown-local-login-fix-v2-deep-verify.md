<!-- docs/_team/crown-local-login-fix-v2-deep-verify.md -->

# CROWN-LOCAL-LOGIN-FIX V2 — Deep Verify 真相揭露（後端完全正常）

> 性質：deep verify + 實際 curl 測試、Hank 自主跑非 destructive 命令
> 撰寫：Hank
> 日期：2026-05-19
> 觸發：Crown 揭露 Docker 一直開著、上輪 onboarding 跑完仍 500
> 紀律：A041 精確 count、§G.9 已驗、§I.6.3 揭露不完整每段尾標

---

## §1 DB 連線 + table 真相 ✅

```
$ docker ps --filter "name=nexora-postgres"
NAMES             STATUS      PORTS
nexora-postgres   Up 3 days   0.0.0.0:5433->5432/tcp
```

```
$ docker exec nexora-postgres psql -U nexora -d nexora_core -c "\dt"
（列出 100+ tables，含 nx99_tenant / nx01_user 等核心表）
```

⭐ **修正 Crown 命令真相**：
- DB name：`nexora_core`（**不是 nexora**）
- Table name：snake_case `nx99_tenant` / `nx01_user`（**不是 PascalCase Nx99Tenant / Nx01User**）
- Column name：`code` / `user_account`（**不是 tenantCode / username**）

---

## §2 Seed 真相 ✅

### 2.1 nx99_tenant 完整落地

```
       id        |   code    |       name       | is_active
-----------------+-----------+------------------+-----------
 NX99TANT0000000 | SYSTEM    | 系統內部租戶     | f
 NX99TANT9900001 | TEST-LITE | 測試公司（LITE） | t
 NX99TANT9900002 | TEST-PLUS | 測試公司（PLUS） | t
 NX99TANT9900003 | TEST-PRO  | 測試公司（PRO）  | t
(4 rows)
```

### 2.2 nx01_user admin 完整落地

```
       id        |    tenant_id    | user_account |       user_name        | is_active
-----------------+-----------------+--------------+------------------------+-----------
 NX01USER0000001 | NX99TANT0000000 | sysadmin     | 系統管理員（SYSADMIN） | f
 NX01USER9900001 | NX99TANT9900001 | admin        | 測試租戶管理員（LITE） | t
 NX01USER9900002 | NX99TANT9900002 | admin        | 測試租戶管理員（PLUS） | t
 NX01USER9900003 | NX99TANT9900003 | admin        | 測試租戶管理員（PRO）  | t
(4 rows)
```

### 2.3 總筆數驗證

```
nx99_tenant：4 筆 ✓
nx01_user：20 筆（含業務角色 user）✓
nx99_plan：9 筆 ✓
```

⭐ **DB seed 100% 落地、無漏**。

---

## §3 nx-api 啟動 + 健康真相 ✅

```
$ curl http://localhost:3001/health      → HTTP 200 ✓
$ curl http://localhost:3001/             → HTTP 404（NestJS 預期、無 root route）
$ curl http://localhost:3000/             → HTTP 307（nx-ui redirect to /login）

兩 server 都已啟動：
  - nx-api（NestJS）port 3001 ✓
  - nx-ui（Next.js）port 3000 ✓
```

---

## §4 /auth/login 真實 curl 揭露 🎉

```bash
$ curl -sS -X POST http://localhost:3001/auth/login \
    -H "Content-Type: application/json" \
    -d '{"tenantCode":"TEST-LITE","username":"admin","password":"Nexoragrid2026"}'

回應 HTTP 201：
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJOWDAxVVNFUjk5MDAwMDEi...",
  "user": {
    "id": "NX01USER9900001",
    "username": "admin",
    "display_name": "測試租戶管理員（LITE）"
  }
}
```

⭐ **後端完全正常、登入成功、簽出 JWT。**

JWT payload decode：
```
sub: NX01USER9900001
username: admin
tenantId: NX99TANT9900001
tenantCode: TEST-LITE
planCode: NEXORA-LITE-M
iat: 1779203427  exp: 1779808227（8h 有效期）
```

---

## §5 root cause + 修復真相

### 5.1 上輪推測 vs 實測對比

| 上輪推測 | 實測真相 | 結論 |
|---------|---------|------|
| Docker PostgreSQL 未啟動（⭐⭐⭐⭐）| UP 3 days、accepting connections | ❌ 排除 |
| Migration 未跑（⭐⭐⭐）| _prisma_migrations 已套用、100+ tables | ❌ 排除 |
| Seed 未跑（⭐⭐）| 4 tenants + 20 users + 9 plans 全在 | ❌ 排除 |
| nx-api 未啟動 | port 3001 UP + /health 200 | ❌ 排除 |
| /auth/login 內部 bug | curl 直打 200 + JWT 簽出 | ❌ 排除 |

⭐ **後端鏈路 100% 正常**、curl 從 host 直打 nx-api 完全成功。

### 5.2 真正 root cause 推測（按機率重排）

| 機率 | 真相假設 | 揭露 |
|------|---------|------|
| ⭐⭐⭐⭐ | Browser **bundle cache 舊版本**（pre-V2 / pre-polish） | hard refresh / 清 cache 可解 |
| ⭐⭐⭐ | Crown 截圖時 nx-api **還沒 ready**、現在已恢復 | 重試即可 |
| ⭐⭐ | nx-ui dev server **HMR 沒同步**到 V2 + polish 改動 | restart nx-ui dev server |
| ⭐ | Browser **CORS preflight 失敗**、curl 無 origin header 不受影響 | 看 browser console NetworkError |
| ⭐ | Browser **cookies / localStorage 殘留**舊 token | 清 localStorage + session storage |

### 5.3 Crown 立即可試驗 step（按優先序）

```
=== Step A：hard refresh（最快）===
瀏覽器開 http://localhost:3000/login
Ctrl + Shift + R（強制 reload、bypass cache）
重新登入 TEST-LITE / admin / Nexoragrid2026

=== Step B：清 browser storage（次快）===
DevTools → Application → Storage → Clear site data
重新登入

=== Step C：restart nx-ui dev server ===
Crown 本機 nx-ui terminal：Ctrl+C
$ pnpm dev
等「✓ Ready in Xms」
重新登入

=== Step D：直接 curl 從本機 verify ===
（已驗證、可成功）

=== Step E：看 browser console Network tab ===
DevTools → Network → 點失敗的 /auth/login request
揭露：
  - Request URL（應為 http://localhost:3001/auth/login）
  - Status Code（真實 status）
  - Response body（真實錯誤訊息）
  - Console Error（CORS / 路徑錯誤等）
```

### 5.4 Hank 自主跑的非 destructive 命令

```
✅ docker ps（read-only）
✅ docker exec ... psql -c "\dt"（read-only SELECT）
✅ docker exec ... psql -c "SELECT ..."（read-only）
✅ curl http://localhost:3001/...（read-only HTTP probe）
✅ Get-NetTCPConnection（read-only）

❌ 未跑：pnpm prisma:migrate（無需、已套用）
❌ 未跑：pnpm seed（無需、已落地）
❌ 未跑：docker compose up/down（無需、UP 3 days）
❌ 未啟動 / 停止任何 dev server（Crown 本機運作中）
❌ 未動代碼
```

---

## §6 揭露不完整（規範 §I.6.3）

```
1. Hank 不知道 Crown browser 真實 console Network tab error
2. Hank 不知道 Crown nx-ui restart 後 HMR 狀態
3. Hank curl 從本機成功、但 browser 從 localhost:3000 fetch localhost:3001 是否有額外 issue 未驗證
4. browser cookies / localStorage 殘留狀態 Hank 無法 verify
5. ⚠️ 若 Crown step A~E 試完仍失敗：請貼 DevTools Network tab 截圖、Hank 再 deep verify
```

---

## §7 預期結論

```
後端鏈路真相 100% 正常：
  ✅ Docker UP
  ✅ DB tables（migration 已套用）
  ✅ Seed（4 tenants + 20 users）
  ✅ nx-api UP（/health 200）
  ✅ /auth/login 直 curl 成功（HTTP 201 + JWT）

Crown 端推測 root cause：
  ⭐ Browser cache / HMR 沒同步（最高機率）

Crown 立即可解：
  hard refresh（Ctrl+Shift+R）或清 site data
```

---

⭐ **後端無需修復**（已 100% 健康）。
⭐ **Hank 無代碼變更**（紀律邊界維持、無 destructive 命令）。
⭐ **等 Crown step A~E 試驗結果**（若仍失敗、貼 browser console 揭露下一步）。
