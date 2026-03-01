/**
 * File: apps/nx-ui/src/app/dashboard/nx00/brand/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-BRAND-SPLIT-ENTRY-001：Brand Split Page Entry（路由入口）
 */

'use client';

import { BrandSplitView } from '@/features/nx00/brand/ui/BrandSplitView';

/**
 * @FUNCTION_CODE NX00-UI-NX00-BRAND-SPLIT-ENTRY-001-F01
 * 說明：
 * - App Router page entry
 */
export default function BrandSplitPage() {
    return <BrandSplitView />;
}