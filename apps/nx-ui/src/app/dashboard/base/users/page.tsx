// apps/nx-ui/src/app/dashboard/base/users/page.tsx
/**
 * NEXORA 使用者主檔（鋼鐵星球範式，commit 58 取代 BaseUserMasterView）
 *
 * 設計：
 * - 內容由 features/base/users/UserMasterPage 提供（與 /lab/users 共用同一份元件）
 * - DashboardShell 已加 bypass（pathname === '/dashboard/base/users'），跳過外層 chrome 避免雙 shell
 * - 既有 BaseUserMasterView.tsx 暫留在 codebase（features/base/users/BaseUserMasterView.tsx），無人 import，觀察一週後可刪
 */
'use client';

import { UserMasterPage } from '@/features/base/users/UserMasterPage';

export default function BaseUsersPage() {
  return <UserMasterPage />;
}
