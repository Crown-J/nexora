<!-- docs/_team/crown-regression-verify-20260519.md -->

# CROWN-REGRESSION-VERIFY 2026-05-19 — 3 議題真相揭露（純諮詢、不開工）

> 性質：純諮詢、verify 真相、stop 給 Crown 拍板
> 撰寫：Hank
> 日期：2026-05-19
> 觸發：Crown 本機 git pull + restart dev server 後預檢、揭露 3 重大「regression」截圖
> 紀律：A041 精確 count、§G.9 通配 grep、§I.6.3 揭露不完整每段尾標、「verify 真相後再行動」

---

## §1 Git branch + main HEAD 真相

### 1.1 當前真實狀態

```
當前 HEAD（feature/task-master-hub-polish）：
  1621ae9 [TASK-MASTER-HUB-POLISH] commit 8（收尾）：merge-verify
  ↑ ahead 14 commit vs main

main / origin/main HEAD（同步）：
  345c88e [TASK-MASTER-DATA-CENTER-AUDIT] 主檔中心真相 verify（v1.0 測試報告基底）
  15f29d6 [MERGE] TASK-AUTH-UI-ITERATE-01 V1 全軌完成
  7922a5f [NX-THEME-AUDIT] NEXORA 深淺兩主題真相揭露（v2 規劃前 verify）
  e30055c [TASK-AUTH-UI-ITERATE-01] commit 4（收尾）：merge-verify 文件 8 段揭露
  57df501 [FEAT] 版本號顯示（蘋果範式、hardcode v1.5.0 + suffix=beta）
```

### 1.2 V2 分支真相揭露（§G.9 通配 grep）

```bash
git branch -a | grep -iE "auth.ui|v2"：
  feature/task-auth-ui-iterate-01            ← V1 軌（已 merge）
  feature/task-auth-ui-iterate-01-v2         ← V2 軌（未 merge）
  remotes/origin/feature/task-auth-ui-iterate-01-v2  ← V2 已 push 但未 merge

git log --all | grep "v1\.5\.[12]|auth-ui-iterate"：
  6aafe16 [FIX v2] login mobile PlanetOrbit aspect-ratio fix
  a62b8de [DOC] task-auth-ui-iterate-01-v2 merge-verify 10 段揭露
  15f29d6 [MERGE] TASK-AUTH-UI-ITERATE-01 V1 全軌完成  ← main 只有 V1
  7922a5f [NX-THEME-AUDIT] NEXORA 深淺兩主題真相揭露
  e30055c [TASK-AUTH-UI-ITERATE-01] commit 4：merge-verify
  ba0003c [TASK-NX09-IMPL-02] Phase 7
```

⭐ **關鍵真相**：main 上**只有 V1 merge**、**從未有 V2 merge commit**。

### 1.3 對齊真相

```
V1 已 merge：✅ main 含 [MERGE] V1
V2 未 merge：❌ main 不含 [MERGE] V2（V2 仍在 feature branch）
v1.5.1 beta：❌ main 不含（屬 V2 累積、未 merge）
v1.5.2 beta：❌ main 不含（屬 polish 預備、本軌未動 version.ts）
```

---

## §2 AUTH UI V2 累積真相（重大揭露）

### 2.1 main 當前 AUTH UI 三檔真實狀態（vs Crown 期望範式）

| 檔案 | 當前 main 真相 | Crown 期望（V2 範式）|
|------|---------------|---------------------|
| `apps/nx-ui/src/lib/version.ts` line 16 | `NEXORA_VERSION = '1.5.0'` | V2 改 1.5.1 |
| `version.ts` 函數 | 只有 `getVersionDisplay()` / `isBetaVersion()` | V2 加 `NEXORA_BRAND` + `getVersionParts()` |
| `login-form.tsx` line 120 | `border-destructive/40 bg-destructive/10 text-destructive`（**紅色**）| V2 改 `border-warning/40 bg-warning/10 text-warning`（**橘色**）|
| `login/page.tsx` 版本號位置 | mobile line 130 在 GRID 下方 / desktop line 175 在 ERP 標語下方（**蘋果範式 V1**）| V2 改 login-card 下方 LoginVersionFooter |
| `globals.css` | 無 `--warning` token | V2 加 4 主題 warning token |

### 2.2 Crown 截圖揭露對應

```
Crown 截圖揭露：
  ⚠️ 紅色 destructive          ← main 真相、V1 範式（line 120）
  ⚠️ 版本號左下 v1.5.0          ← main 真相（version.ts line 16 = '1.5.0'）
  ⚠️ HTTP 500 + AU-999 + NW-001 ← 後端問題（§4 揭露）

⭐ 真相結論：3 議題中前 2 個「regression」實際上是 main HEAD 真實狀態、
            並非 polish 軌引入。V2 累積仍在 feature/task-auth-ui-iterate-01-v2
            分支、從未進 main。
```

### 2.3 揭露 Crown 記憶可能混淆點

```
記憶混淆假設 A（高機率）：
  Crown 認為 V2 已 merge、實際還在 feature branch 待 Crown 拍板 4-theme + mobile fix verify
  → 「上輪 v1.5.1 beta 落地真相」實際是 V2 feature branch 內容、未 main 化

記憶混淆假設 B（低機率）：
  Crown 在另一台機器看到的是 feature/task-auth-ui-iterate-01-v2 dev server
  → 本機 pull main + restart 後、自然回 V1 範式

兩假設都不算 regression、是 git 真實狀態。
```

---

## §3 Polish 軌是否動到 AUTH UI 真相

### 3.1 polish 軌 8 commit 改動範圍（§G.9 通配 grep）

```bash
git log feature/task-master-hub-polish -- \
  apps/nx-ui/src/lib/version.ts \
  apps/nx-ui/src/components/login/login-form.tsx \
  apps/nx-ui/src/app/login/page.tsx \
  apps/nx-ui/src/app/globals.css

結果：
  ✅ globals.css：1 commit（commit 1、字級 100%→110%）
  ❌ version.ts：0 commit
  ❌ login-form.tsx：0 commit
  ❌ login/page.tsx：0 commit
```

### 3.2 commit 1 globals.css 改動內容（純 CSS）

```css
:root {
  font-size: var(--nx-root-font-size, 110%);  /* ← polish 軌唯一加的一行 */
  color-scheme: dark;
  --background: oklch(...);
  ...
}
```

**影響範圍**：
- ✅ 所有 rem-based Tailwind token 跟著放大（text-sm / gap-N 等）
- ❌ 不可能影響：destructive 顏色、版本號內容、版本號位置、後端 API
- ❌ font-size 改 110% 與「v1.5.0」「紅色 destructive」「HTTP 500」三議題**因果鏈為 0**

### 3.3 紀律邊界 verify

```
polish 軌邊界對齊規範 §I.5：
  ✅ hub 入口頁 (page.tsx / master-cards.ts)
  ✅ hub 周邊元件（MobileSectionTabs / BaseMasterQuickNav）
  ✅ hub 卡片 UI（VersionBadge / UpgradePromptDialog）
  ✅ /pricing 新建
  ✅ TopBar 整合（PlanChip + HomeTopBar + 2 shell）
  ✅ 字級 110%（global CSS、無 layout 改動）
  ❌ 不動 login / version.ts / nexora-error / 後端

軌邊界紀律：完美 ✓
```

---

## §4 後端 HTTP 500 真相

### 4.1 推測點（純諮詢、需 Crown 本機 verify）

```
HTTP 500 = 後端伺服器內部錯誤、與 frontend 完全無關。
AU-999 = frontend fallback 錯誤代碼（login/page.tsx getError）：
  - 對應 toNexoraClientError fallback message：'帳號或密碼錯誤 / 或 API 無回應'
  - 觸發時機：catch (e: unknown) 接到非預期錯誤
NW-001 = 推測為 network error 範式（待 verify nexora-error-code-spec.md）
```

### 4.2 可能原因（按機率序）

```
A. NestJS 後端 (nx-api) 未啟動（高機率）
   → 確認：cd apps/nx-api; npm run dev / pnpm dev
   → 看 console 是否有「Application is running on port 3001」

B. DATABASE_URL 連線異常（中機率）
   → 確認：.env / .env.local 中 DATABASE_URL 真實值
   → Railway DB 是否在線（postgres）
   → Prisma migrate 狀態是否 sync

C. /auth/login route 內部錯誤（低機率）
   → 看 nx-api console error log
   → 推測：JWT secret 未設、Prisma client 未生成、tenant_code 對應的 Nx99Tenant 不存在

D. CORS / proxy 設定（低機率）
   → frontend (3000) → backend (3001) proxy 設定
   → next.config rewrites 是否生效
```

### 4.3 polish 軌與 HTTP 500 因果鏈

```
polish 軌改動範圍：
  ✅ frontend CSS / JSX / 新檔
  ❌ 無 backend 改動
  ❌ 無 schema migration
  ❌ 無 .env 改動
  ❌ 無 next.config 改動

HTTP 500 起源因果鏈 = 0%（純 backend 議題）
```

---

## §5 Crown 戰略下一步建議

### 5.1 Hank 業界 muscle memory 推測真相核心點

```
推測核心點（高機率）：
  ⭐ Crown 記憶將 V2 內容當成 main 已 merge 真相
  ⭐ V2 (v1.5.1 beta + 橘色 warning + NEXORA_BRAND + LoginVersionFooter) 還在
     feature/task-auth-ui-iterate-01-v2 分支、未 merge
  ⭐ 後端 HTTP 500 是獨立議題、與 polish 軌無關
```

### 5.2 Crown 本機修復建議步驟（按優先序）

```
Step 1：確認 main 狀態（5 秒）
  $ git -C c:/nexora log main --oneline -5
  預期：HEAD 是 345c88e、含 V1 不含 V2

Step 2：確認 V2 branch 狀態（10 秒）
  $ git -C c:/nexora log feature/task-auth-ui-iterate-01-v2 --oneline -10
  預期：含 v1.5.1 beta + NEXORA_BRAND 等 V2 改動

Step 3：Crown 戰略拍板（30 秒）
  選 A：V2 確實要 merge → 拍板「TASK-AUTH-UI-ITERATE V2 merge to main」
        → 順手 merge V2 進 main（Crown final merge 權威）
        → 然後 polish 軌再 rebase / merge 到 V2 後的 main
  選 B：V2 暫不 merge → 主視覺保持 V1（v1.5.0 + 紅色 destructive）
        → polish 軌正常 final merge

Step 4：後端 HTTP 500 修復（5~30 分鐘、與本軌無關）
  $ cd apps/nx-api && npm run dev
  - 看 console error log
  - 確認 DATABASE_URL 連線
  - 確認 nx99_tenant seed 存在
  - 確認 JWT secret 已設
```

### 5.3 是否需要 Hank 順手修一個 regression-fix commit

```
❌ Hank 不應修這 3 議題，理由：
  1. 紀律邊界：3 議題都不是 polish 軌引入（§3 因果鏈為 0）
  2. V2 merge 屬 Q-RHYTHM-2 Final merge 權威（Crown 拍板才能 merge V2）
  3. 後端 HTTP 500 是純後端議題、本軌 frontend polish
  4. 若 Hank「順手修」會混淆軌邊界、破壞 Q-RHYTHM-2 紀律

✅ Hank 推薦動作：
  - 純諮詢回報（本檔）
  - 等 Crown 拍板選 A / B
  - polish 軌 final merge 不受影響、可獨立進行
```

### 5.4 polish 軌 final merge 與 V2 的關係

```
情境 A：V2 先 merge、polish 軌後 merge
  → polish 軌需 rebase 到 V2 後 main（version.ts / login-form.tsx 不衝突、純 hub 範圍）
  → 預估 rebase 時間 0 衝突、直接快速 forward
  → 推薦此情境（V2 累積優先入 main）

情境 B：polish 軌先 merge、V2 後 merge
  → V2 merge 時無衝突（V2 改 login + version、polish 改 hub + pricing + topbar）
  → 預估 V2 merge 時間 0 衝突
  → 也可

情境 C：polish 軌 merge、V2 永遠不 merge
  → 主視覺長期 V1 範式（v1.5.0 + 紅色 destructive）
  → 不推薦（V2 是 Crown 已 verify 的橘色 warning + 4 主題 token 累積、應 closure）

⭐ Hank 推薦情境 A：V2 先 merge、polish 後 merge。
```

---

## §6 揭露不完整（規範 §I.6.3）

```
1. NW-001 錯誤代碼起源未 verify nexora-error-code-spec.md（推測為 network error）
2. 後端 nx-api 真實 console error log 未取得（需 Crown 本機 verify）
3. DATABASE_URL 真實連線狀態未 verify（屬 .env / Railway 範圍）
4. V2 是否 Crown 已 verify 完 4-theme + mobile fix 未確認（屬 [task-auth-ui-iterate-01-v2-merge-verify.md] 範圍）
5. v1.5.2 beta 版本號是否該 polish 軌升版未拍板（Crown 戰略題、純諮詢未答）
6. 本檔純諮詢、無代碼改動、無 schema migration、無 backend 改動
```

---

**等 Crown 拍板**（純諮詢、不開工）：
- §2 V2 merge 戰略（情境 A 推薦）
- §4 後端 HTTP 500 修復（與本軌無關、Crown 本機操作）
- §5 polish 軌 final merge 不受影響、可獨立 Q-RHYTHM-2 第 12 次穩定

⭐ Q-RHYTHM-2 紀律：純諮詢不動代碼、verify 真相後再行動、Crown 業務 muscle memory 最權威。
