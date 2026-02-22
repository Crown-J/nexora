/**
 * File: apps/nx-ui/src/app/dashboard/nx00/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-ROOT-001：NX00 模組入口（預設導向）
 *
 * Notes:
 * - 使用 Next.js redirect（Server Side）
 * - 不需要 'use client'
 */

import { redirect } from 'next/navigation';

export default function Nx00RootPage() {
  redirect('/dashboard/nx00/users');
}