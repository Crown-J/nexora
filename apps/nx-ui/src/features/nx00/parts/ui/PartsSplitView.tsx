/**
 * File: apps/nx-ui/src/features/nx00/parts/ui/PartsSplitView.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-PARTS-SPLIT-UI-001：Parts Split View（List + Form）
 *
 * Notes:
 * - render-only（資料與 actions 由 hook 注入）
 * - 左：列表 / 右：新增/編輯表單
 */

'use client';

import { PartsListPanel } from './PartsListPanel';
import { PartFormPanel } from './PartFormPanel';
import { usePartsSplit } from '../hooks/usePartsSplit';

export function PartsSplitView() {
    const vm = usePartsSplit();

    return (
        <div className="grid grid-cols-12 gap-4">
            <div className="col-span-7">
                <PartsListPanel
                    q={vm.q}
                    page={vm.page}
                    pageSize={vm.pageSize}
                    total={vm.total}
                    loading={vm.listLoading}
                    error={vm.listError}
                    items={vm.items}
                    selectedId={vm.selectedId}
                    onSearch={vm.actions.setSearch}
                    onPageChange={vm.actions.setPage}
                    onPageSizeChange={vm.actions.setPageSize}
                    onSelect={vm.actions.selectPart}
                    onCreateNew={vm.actions.createNew}
                    onReload={vm.actions.reload}
                />
            </div>

            <div className="col-span-5">
                <PartFormPanel
                    mode={vm.splitMode}
                    selectedId={vm.selectedId}
                    detail={vm.detail}
                    loading={vm.detailLoading}
                    error={vm.detailError}
                    saving={vm.saving}
                    saveError={vm.saveError}
                    onClose={vm.actions.closeRight}
                    onCreate={vm.createPart}
                    onUpdate={vm.updatePart}
                    onSetActive={vm.setActive}
                />
            </div>
        </div>
    );
}