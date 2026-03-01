/**
 * File: apps/nx-ui/src/features/nx00/user/hooks/useUserSplit.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-USER-SPLIT-HOOK-001：User Split View Orchestrator（URL 驅動狀態）
 *
 * Notes:
 * - URL 為單一真實來源（Single Source of Truth）
 * - 更新成功後同步更新 list items（避免需要重整）
 * - 型別一律引用 features/nx00/user/types.ts（SSOT）
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSplitUrlState } from '@/shared/hooks/useSplitUrlState';
import { createUser, getUser, listUser, updateUser } from '@/features/nx00/user/api/user';
import type { CreateUserBody, UpdateUserBody, UserDto } from '@/features/nx00/user/types';

export function useUserSplit() {
    const { q, page, pageSize, selectedId, splitMode, setQuery } = useSplitUrlState({ pageSize: 20 });

    // ===== list state =====
    const [items, setItems] = useState<UserDto[]>([]);
    const [total, setTotal] = useState(0);
    const [listLoading, setListLoading] = useState(false);
    const [listError, setListError] = useState<string | null>(null);

    useEffect(() => {
        let alive = true;
        setListLoading(true);
        setListError(null);

        listUser({ q: q || undefined, page, pageSize })
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
    const [detail, setDetail] = useState<UserDto | null>(null);
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

        getUser(selectedId)
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

    /**
     * @FUNCTION_CODE NX00-UI-NX00-USER-SPLIT-HOOK-001-F02
     * 說明：
     * - createOne：新增使用者
     * - 成功後：若在第 1 頁則 optimistic prepend；並切到 edit 模式（id=created.id）
     */
    const createOne = useCallback(
        async (body: CreateUserBody) => {
            setSaving(true);
            setSaveError(null);
            try {
                const created = await createUser(body);

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

    /**
     * @FUNCTION_CODE NX00-UI-NX00-USER-SPLIT-HOOK-001-F03
     * 說明：
     * - updateOne：更新使用者
     * - 成功後：detail 與 list 同步更新（避免重整）
     */
    const updateOne = useCallback(async (id: string, body: UpdateUserBody) => {
        setSaving(true);
        setSaveError(null);
        try {
            const updated = await updateUser(id, body);

            setDetail(updated);
            setItems((prev) => prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)));
        } catch (e: any) {
            setSaveError(e?.message ?? '更新失敗');
        } finally {
            setSaving(false);
        }
    }, []);

    // ===== actions =====
    const actions = useMemo(
        () => ({
            setSearch: (nextQ: string) => setQuery({ q: nextQ, page: '1' }),
            setPage: (p: number) => setQuery({ page: String(Math.max(1, p)) }),
            setPageSize: (ps: number) => setQuery({ pageSize: String(ps), page: '1' }),

            selectUser: (id: string) => setQuery({ id, mode: null }),
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

        createUser: createOne,
        updateUser: updateOne,
        actions,
    };
}