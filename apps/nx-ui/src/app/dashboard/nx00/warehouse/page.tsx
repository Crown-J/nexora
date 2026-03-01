/**
 * File: apps/nx-ui/src/app/dashboard/nx00/warehouse/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-WAREHOUSE-SINGLE-ENTRY-001：Warehouse Single Page Entry（LITE：單筆設定）
 *
 * Notes:
 * - LITE：單倉（單筆）設定頁，不提供多筆清單
 */

'use client';

import { WarehouseSingleView } from '@/features/nx00/warehouse/ui/WarehouseSingleView';

/**
 * @FUNCTION_CODE NX00-UI-NX00-WAREHOUSE-SINGLE-ENTRY-001-F01
 * 說明：
 * - App Router page entry
 */
export default function WarehouseSinglePage() {
    return <WarehouseSingleView />;
}