/**
 * File: apps/nx-ui/src/app/dashboard/nx00/part/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-PART-SPLIT-ENTRY-001：Part Split Page Entry（路由入口）
 */

'use client';

import { PartSplitView } from '@/features/nx00/part/ui/PartSplitView';

/**
 * @FUNCTION_CODE NX00-UI-NX00-PART-SPLIT-ENTRY-001-F01
 * 說明：
 * - App Router page entry
 */
export default function PartSplitPage() {
    return <PartSplitView />;
}