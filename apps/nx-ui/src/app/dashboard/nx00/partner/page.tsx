/**
 * File: apps/nx-ui/src/app/dashboard/nx00/partner/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-PARTNER-SPLIT-ENTRY-001：Partner Split Page Entry（路由入口）
 */

'use client';

import { PartnerSplitView } from '@/features/nx00/partner/ui/PartnerSplitView';

/**
 * @FUNCTION_CODE NX00-UI-NX00-PARTNER-SPLIT-ENTRY-001-F01
 * 說明：
 * - App Router page entry
 */
export default function PartnerSplitPage() {
    return <PartnerSplitView />;
}