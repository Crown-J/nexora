/**
 * File: apps/nx-ui/src/app/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - 入口導向：/ 進來直接到 /login
 * - v3.0.0 開發期免登入打開時：直接到 /dashboard、不經過登入頁
 *
 * Notes:
 * - 使用 redirect（server component）
 */

import { redirect } from 'next/navigation';

import { isDevOpenAuth } from '@data/auth/dev-open';

export default function Home() {
  redirect(isDevOpenAuth() ? '/dashboard' : '/login');
}
