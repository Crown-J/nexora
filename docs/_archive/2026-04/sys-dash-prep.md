# TASK_SYS_DASH_PREP — Git 分支整理 + Demo 模式登入

> 指派：Hank
> 建立：2026-04-13
> 優先級：🔴 緊急（阻塞 Phase 1 驗收）
> 前置條件：目前 Phase 1 程式碼在 main 上尚未 commit

---

## Step 1｜Git 分支整理

依序在終端機執行：

```bash
# 1. 確認目前狀態（確認有未 commit 的變更）
git status

# 2. 暫存所有變更
git add .
git stash

# 3. 確認 main 是乾淨的
git status

# 4. 建立並切換到新分支
git checkout -b feature/sys-dashboard

# 5. 取回暫存的變更
git stash pop

# 6. 確認變更都回來了
git status

# 7. commit
git add .
git commit -m "[SYS-DASH-P1] complete Phase 1 mock UI - dashboard layout and components"

# 8. push 到遠端
git push origin feature/sys-dashboard
```

**完成後確認：**
- GitHub 上看到 `feature/sys-dashboard` 分支
- `main` 分支沒有 Phase 1 的新增檔案

---

## Step 2｜Demo 模式短路登入

### 2-1 新增 env 變數

在 `apps/nx-ui/.env.local` 加入：

```env
# Demo 模式：true = 跳過後端驗證，使用假 session
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_DEMO_USER_NAME=林翰杰
NEXT_PUBLIC_DEMO_USER_ROLE=系統管理員
NEXT_PUBLIC_DEMO_PLAN_CODE=PRO
NEXT_PUBLIC_DEMO_TENANT_NAME=恆迎企業
```

> ⚠️ `.env.local` 已在 `.gitignore`，不會 push 到遠端，安全。

### 2-2 建立 Demo Session Hook

新增檔案：`apps/nx-ui/src/hooks/useDemoSession.ts`

```typescript
// @SYS-AUTH-HOOK-001-F01
// Demo 模式假 session，NEXT_PUBLIC_DEMO_MODE=true 時生效

export interface DemoUser {
  id: string
  name: string
  role: string
  planCode: 'LITE' | 'PLUS' | 'PRO'
  tenantName: string
  avatarInitial: string
}

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

export const DEMO_USER: DemoUser = {
  id: 'DEMO-USR-001',
  name: process.env.NEXT_PUBLIC_DEMO_USER_NAME ?? 'Demo User',
  role: process.env.NEXT_PUBLIC_DEMO_USER_ROLE ?? '系統管理員',
  planCode: (process.env.NEXT_PUBLIC_DEMO_PLAN_CODE ?? 'PRO') as DemoUser['planCode'],
  tenantName: process.env.NEXT_PUBLIC_DEMO_TENANT_NAME ?? 'Demo 公司',
  avatarInitial: (process.env.NEXT_PUBLIC_DEMO_USER_NAME ?? 'D')[0],
}

export function useDemoSession() {
  return {
    isDemoMode,
    user: isDemoMode ? DEMO_USER : null,
  }
}
```

### 2-3 修改 Middleware

修改 `apps/nx-ui/src/middleware.ts`（或現有 auth middleware），在驗證邏輯最前面加入 Demo 模式判斷：

```typescript
// @SYS-AUTH-MID-001-F01
import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // Demo 模式：直接放行所有 /dashboard/* 路由
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    return NextResponse.next()
  }

  // --- 以下維持原有驗證邏輯不動 ---
  // ... 原本的 JWT / session 驗證
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
```

> ⚠️ 只加在最前面，原有驗證邏輯一行都不改、不刪。

### 2-4 修改 SysDashboardPage（或現有 session 取用點）

找到目前取用登入使用者資料的地方（如 `useSessionMe()` 或類似），加入 Demo 模式fallback：

```typescript
// @SYS-DASH-UI-001-F01
import { useDemoSession, DEMO_USER } from '@/hooks/useDemoSession'

// 在 component 內：
const { isDemoMode } = useDemoSession()
const currentUser = isDemoMode ? DEMO_USER : useSessionMe().user

// planCode 同樣：
const planCode = isDemoMode
  ? DEMO_USER.planCode
  : (currentUser?.planCode ?? 'LITE')
```

---

## Step 3｜驗證可以正常進入首頁

```
1. pnpm dev 啟動前端
2. 直接前往 http://localhost:3000/dashboard
3. 確認不被導回登入頁
4. 確認 TOP BAR 顯示「林翰杰」、租戶「恆迎企業」、版本「PRO」
5. 確認 LITE / PLUS / PRO 切換正常
```

---

## Step 4｜commit 本次變更

```bash
git add .
git commit -m "[SYS-DASH-PREP] add demo mode short-circuit auth for frontend testing"
git push origin feature/sys-dashboard
```

---

## 完成後回報給 Crown

請回報：
1. GitHub `feature/sys-dashboard` 分支連結
2. 截圖：`/dashboard` 頁面正常顯示（PRO 版型）
3. 任何 stash pop 衝突或 TypeScript 錯誤

---

## 附註：日後關閉 Demo 模式

後端重建完成後，只需要：

```env
# .env.local
NEXT_PUBLIC_DEMO_MODE=false
```

前端程式碼一行不用動。
