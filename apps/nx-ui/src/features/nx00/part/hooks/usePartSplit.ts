/**
 * File: apps/nx-ui/src/features/nx00/part/hooks/usePartSplit.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-PART-SPLIT-HOOK-001：Part Split View Orchestrator（URL 驅動狀態）
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSplitUrlState } from '@/shared/hooks/useSplitUrlState';
import { createPart, getPart, listPart, updatePart } from '@/features/nx00/part/api/part';
import type { CreatePartBody, PartDto, UpdatePartBody } from '@/features/nx00/part/types';

export function usePartSplit() {
    const { q, page, pageSize, selectedId, splitMode, setQuery } = useSplitUrlState({ pageSize: 20 });

    // ===== list state =====
    const [items, setItems] = useState<PartDto[]>([]);
    const [total, setTotal] = useState(0);
    const [listLoading, setListLoading] = useState(false);
    const [listError, setListError] = useState<string | null>(null);

    useEffect(() => {
        let alive = true;
        setListLoading(true);
        setListError(null);

        listPart({ q: q || undefined, page, pageSize })
            .then((res) => {
                if (!alive) return;
                setItems(res.items ?? []);
                setTotal(res.total ?? 0);
            })
            .catch((e: any) => {
                if (!alive) return;
                setListError(e?.message ?? '載入失敗');
            })
            .finally(() => {
                if (!alive) return;
                setListLoading(false);
            });

        return () => {
            alive = false;
        };
    }, [q, page, pageSize]);

    // ===== detail state =====
    const [detail, setDetail] = useState<PartDto | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);

    useEffect(() => {
        let alive = true;

        if (splitMode !== 'edit' || !selectedId) {
            setDetail(null);
            setDetailError(null);
            setDetailLoading(false);
            return;
        }

        setDetailLoading(true);
        setDetailError(null);

        getPart(selectedId)
            .then((res) => {
                if (!alive) return;
                setDetail(res);
            })
            .catch((e: any) => {
                if (!alive) return;
                setDetailError(e?.message ?? '載入失敗');
            })
            .finally(() => {
                if (!alive) return;
                setDetailLoading(false);
            });

        return () => {
            alive = false;
        };
    }, [splitMode, selectedId]);

    // ===== save state =====
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const createOne = useCallback(
        async (body: CreatePartBody) => {
            setSaving(true);
            setSaveError(null);
            try {
                const created = await createPart(body);

                if (page === 1) {
                    setItems((prev) => {
                        if (prev.some((x) => x.id === created.id)) return prev;
                        return [created, ...prev];
                    });
                }
                setTotal((t) => t + 1);

                setQuery({ mode: null, id: created.id, page: '1' });
            } catch (e: any) {
                setSaveError(e?.message ?? '新增失敗');
            } finally {
                setSaving(false);
            }
        },
        [setQuery, page],
    );

    const updateOne = useCallback(async (id: string, body: UpdatePartBody) => {
        setSaving(true);
        setSaveError(null);
        try {
            const updated = await updatePart(id, body);
            setDetail(updated);
            setItems((prev) => prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)));
        } catch (e: any) {
            setSaveError(e?.message ?? '更新失敗');
        } finally {
            setSaving(false);
        }
    }, []);

    const actions = useMemo(
        () => ({
            setSearch: (nextQ: string) => setQuery({ q: nextQ, page: '1' }),
            setPage: (p: number) => setQuery({ page: String(Math.max(1, p)) }),
            setPageSize: (ps: number) => setQuery({ pageSize: String(ps), page: '1' }),

            selectPart: (id: string) => setQuery({ id, mode: null }),
            createNew: () => setQuery({ mode: 'new', id: null }),
            closeRight: () => setQuery({ mode: null, id: null }),
        }),
        [setQuery],
    );

    return {
        q,
        page,
        pageSize,
        selectedId,
        splitMode,

        items,
        total,
        listLoading,
        listError,

        detail,
        detailLoading,
        detailError,

        saving,
        saveError,

        createPart: createOne,
        updatePart: updateOne,
        actions,
    };
}