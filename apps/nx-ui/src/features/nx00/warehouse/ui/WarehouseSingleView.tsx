/**
 * File: apps/nx-ui/src/features/nx00/warehouse/ui/WarehouseSingleView.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-WAREHOUSE-SINGLE-VIEW-001：Warehouse Single View（LITE：單筆設定頁）
 */

'use client';

import { PageHeader } from '@/shared/ui/PageHeader';
import { useWarehouseSingle } from '@/features/nx00/warehouse/hooks/useWarehouseSingle';
import { WarehouseFormPanel } from '@/features/nx00/warehouse/ui/WarehouseFormPanel';

export function WarehouseSingleView() {
    const vm = useWarehouseSingle();

    return (
        <>
            <PageHeader title="倉庫設定（LITE）" />

            <div className="flex h-[calc(100vh-200px)] gap-3">
                <div className="w-full">
                    <WarehouseFormPanel
                        mode={vm.mode}
                        detail={vm.detail}
                        loading={vm.loading}
                        error={vm.error}
                        saving={vm.saving}
                        saveError={vm.saveError}
                        canEdit={true}
                        onCreate={vm.createWarehouse}
                        onUpdate={vm.updateWarehouse}
                    />
                </div>
            </div>
        </>
    );
}