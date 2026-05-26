// apps/nx-ui/src/app/lab/users/page.tsx
/**
 * NEXORA Lab：使用者主檔範式（鋼鐵星球）
 *
 * 此頁原為 lab 沙盒（commit 41-56 累積 16 次迭代）。
 * 內容已抽出至 features/base/users/UserMasterPage 共用元件，
 * 由本頁與 /dashboard/base/users（commit 58 後）共同使用。
 *
 * 此 lab 路徑保留供未來範式迭代沙盒使用，可隨時切回 dashboard chrome（無 DashboardShell）。
 */
'use client';

import { UserMasterPage } from '@/features/base/users/UserMasterPage';

export default function LabUsersPage() {
  return <UserMasterPage />;
}
