/**
 * File: apps/nx-ui/src/shared/hooks/useRowSelection.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-SHARED-ROWSEL-001：Row selection（多選/全選/重置）
 *
 * Notes:
 * - 用於 DataTable 多選：提供 selectedMap / allSelected / selectedCount / toggleAll / toggleOne / clear
 * - resetDeps 改變時自動清空選取（例如 page/q/pageSize 改變）
 */

'use client';

import { useEffect, useMemo, useState } from 'react';

export function useRowSelection(idsOnPage: string[], resetDeps: any[] = []) {
    const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

    useEffect(() => {
        setSelectedIds({});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, resetDeps);

    const allSelected = useMemo(
        () => idsOnPage.length > 0 && idsOnPage.every((id) => selectedIds[id]),
        [idsOnPage, selectedIds],
    );

    const selectedCount = useMemo(() => Object.values(selectedIds).filter(Boolean).length, [selectedIds]);

    const toggleAll = () => {
        if (allSelected) {
            setSelectedIds({});
            return;
        }
        const next: Record<string, boolean> = {};
        idsOnPage.forEach((id) => (next[id] = true));
        setSelectedIds(next);
    };

    const toggleOne = (id: string) => {
        setSelectedIds((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const clear = () => setSelectedIds({});

    return { selectedIds, setSelectedIds, allSelected, selectedCount, toggleAll, toggleOne, clear } as const;
}