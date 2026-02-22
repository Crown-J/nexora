/**
 * File: apps/nx-ui/src/app/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - 入口導向：/ 進來直接到 /login
 *
 * Notes:
 * - 使用 redirect（server component）
 */

import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/login');
}
