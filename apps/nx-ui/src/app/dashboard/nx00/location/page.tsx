/**
 * File: apps/nx-ui/src/app/dashboard/nx00/location/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-LOCATION-SPLIT-ENTRY-001：Location Split Page Entry（路由入口）
 */

'use client';

import { LocationSplitView } from '@/features/nx00/location/ui/LocationSplitView';

/**
 * @FUNCTION_CODE NX00-UI-NX00-LOCATION-SPLIT-ENTRY-001-F01
 * 說明：
 * - App Router page entry
 */
export default function LocationSplitPage() {
    return <LocationSplitView />;
}