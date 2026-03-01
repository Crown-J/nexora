/**
 * File: apps/nx-ui/src/features/nx00/location/hooks/useLocationSplit.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-LOCATION-SPLIT-HOOK-001：Location Split View Orchestrator（URL 驅動狀態）
 *
 * Notes:
 * - LITE：warehouseId 來自 /warehouse/single，並固定使用（不讓使用者選倉）
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSplitUrlState } from '@/shared/hooks/useSplitUrlState';
import { createLocation, getLocation, listLocation, updateLocation } from '@/features/nx00/location/api/location';
import type { CreateLocationBody, LocationDto, UpdateLocationBody } from '@/features/nx00/location/types';
import { getWarehouseSingle } from '@/features/nx00/warehouse/api/warehouse';

export function useLocationSplit() {
    const { q, page, pageSize, selectedId, splitMode, setQuery } = useSplitUrlState({ pageSize: 20 });

    // ===== LITE single warehouse =====
    const [warehouseId, setWarehouseId] = useState<string>('');
    const [warehouseReady, setWarehouseReady] = useState(false);
    const [warehouseError, setWarehouseError] = useState<string | null>(null);

    useEffect(() => {
        let alive = true;
        setWarehouseReady(false);
        setWarehouseError(null);

        getWarehouseSingle()
            .then((w) => {
                if (!alive) return;
                if (!w?.id) {
                    setWarehouseId('');
                    setWarehouseError('尚未初始化倉庫，請先到「倉庫設定（LITE）」完成初始化。');
                    return;
                }
                setWarehouseId(w.id);
            })
            .catch((e: any) => {
                if (!alive) return;
                setWarehouseId('');
                setWarehouseError(e?.message ?? '倉庫讀取失敗');
            })
            .finally(() => {
                if (!alive) return;
                setWarehouseReady(true);
            });

        return () => {
            alive = false;
        };
    }, []);

    // ===== list state =====
    const [items, setItems] = useState<LocationDto[]>([]);
    const [total, setTotal] = useState(0);
    const [listLoading, setListLoading] = useState(false);
    const [listError, setListError] = useState<string | null>(null);

    useEffect(() => {
        let alive = true;

        // 等倉庫 ready 才打 list
        if (!warehouseReady) return;

        if (!warehouseId) {
            setItems([]);
            setTotal(0);
            setListLoading(false);
            setListError(warehouseError ?? '倉庫未準備好');
            return;
        }

        setListLoading(true);
        setListError(null);

        listLocation({ q: q || undefined, page, pageSize, warehouseId })
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
    }, [q, page, pageSize, warehouseId, warehouseReady, warehouseError]);

    // ===== detail state =====
    const [detail, setDetail] = useState<LocationDto | null>(null);
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

        getLocation(selectedId)
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
        async (body: Omit<CreateLocationBody, 'warehouseId'>) => {
            if (!warehouseId) {
                setSaveError('倉庫未初始化，無法新增庫位。');
                return;
            }

            setSaving(true);
            setSaveError(null);
            try {
                const created = await createLocation({ ...body, warehouseId });

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
        [warehouseId, page, setQuery],
    );

    const updateOne = useCallback(async (id: string, body: UpdateLocationBody) => {
        setSaving(true);
        setSaveError(null);
        try {
            // LITE：避免被改到別倉（強制覆寫）
            const updated = await updateLocation(id, warehouseId ? { ...body, warehouseId } : body);

            setDetail(updated);
            setItems((prev) => prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)));
        } catch (e: any) {
            setSaveError(e?.message ?? '更新失敗');
        } finally {
            setSaving(false);
        }
    }, [warehouseId]);

    const actions = useMemo(
        () => ({
            setSearch: (nextQ: string) => setQuery({ q: nextQ, page: '1' }),
            setPage: (p: number) => setQuery({ page: String(Math.max(1, p)) }),
            setPageSize: (ps: number) => setQuery({ pageSize: String(ps), page: '1' }),

            selectLocation: (id: string) => setQuery({ id, mode: null }),
            createNew: () => setQuery({ mode: 'new', id: null }),
            closeRight: () => setQuery({ mode: null, id: null }),
        }),
        [setQuery],
    );

    return {
        warehouseId,
        warehouseReady,
        warehouseError,

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

        createLocation: createOne,
        updateLocation: updateOne,
        actions,
    };
}