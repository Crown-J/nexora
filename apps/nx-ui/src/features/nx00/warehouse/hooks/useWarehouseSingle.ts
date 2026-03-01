/**
 * File: apps/nx-ui/src/features/nx00/warehouse/hooks/useWarehouseSingle.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-WAREHOUSE-SINGLE-HOOK-001：Warehouse Single Orchestrator（LITE：單筆）
 *
 * Notes:
 * - 單筆頁：沒有 list，只管理 detail / saving 狀態
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createWarehouseSingle, getWarehouseSingle, updateWarehouseSingle } from '@/features/nx00/warehouse/api/warehouse';
import type { CreateWarehouseBody, UpdateWarehouseBody, WarehouseDto } from '@/features/nx00/warehouse/types';

type Mode = 'empty' | 'new' | 'edit';

export function useWarehouseSingle() {
    const [mode, setMode] = useState<Mode>('empty');

    const [detail, setDetail] = useState<WarehouseDto | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // init/load
    useEffect(() => {
        let alive = true;
        setLoading(true);
        setError(null);

        getWarehouseSingle()
            .then((res) => {
                if (!alive) return;

                if (!res) {
                    setDetail(null);
                    setMode('new'); // 尚未初始化 → 直接進入 new（初始化）
                    return;
                }

                setDetail(res);
                setMode('edit');
            })
            .catch((e: any) => {
                if (!alive) return;
                setError(e?.message ?? '載入失敗');
                setDetail(null);
                setMode('empty');
            })
            .finally(() => {
                if (!alive) return;
                setLoading(false);
            });

        return () => {
            alive = false;
        };
    }, []);

    const createOne = useCallback(async (body: CreateWarehouseBody) => {
        setSaving(true);
        setSaveError(null);
        try {
            const created = await createWarehouseSingle(body);
            setDetail(created);
            setMode('edit');
        } catch (e: any) {
            setSaveError(e?.message ?? '初始化失敗');
        } finally {
            setSaving(false);
        }
    }, []);

    const updateOne = useCallback(async (body: UpdateWarehouseBody) => {
        setSaving(true);
        setSaveError(null);
        try {
            const updated = await updateWarehouseSingle(body);
            setDetail(updated);
            setMode('edit');
        } catch (e: any) {
            setSaveError(e?.message ?? '更新失敗');
        } finally {
            setSaving(false);
        }
    }, []);

    const actions = useMemo(
        () => ({
            // LITE 單倉：不提供 close（可保留，但通常不需要）
            // close: () => {}
        }),
        [],
    );

    return {
        mode,

        detail,
        loading,
        error,

        saving,
        saveError,

        createWarehouse: createOne,
        updateWarehouse: updateOne,
        actions,
    };
}