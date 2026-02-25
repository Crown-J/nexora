/**
 * File: apps/nx-ui/src/features/nx00/users/hooks/useUsersSplit.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-USERS-SPLIT-HOOK-001：Users Split View Orchestrator（URL 驅動狀態）
 *
 * Notes:
 * - URL 為單一真實來源（Single Source of Truth）
 * - 統一使用 features/nx00/users/api/users.ts（避免 hook 內手刻 apiFetch）
 * - 更新成功後同步更新 list/detail（避免需要重整）
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import {
    listUsers,
    getUser,
    createUser,
    updateUser,
    setUserActive,
    changeUserPassword,
} from '@/features/nx00/users/api/users';

import type { CreateUserBody, UpdateUserBody, UserDto } from '@/features/nx00/users/types';

type SplitMode = 'empty' | 'new' | 'edit';

function getInt(v: string | null, fallback: number) {
    if (!v) return fallback;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function useUsersSplit() {
    const router = useRouter();
    const pathname = usePathname();
    const sp = useSearchParams();

    // ===== URL state =====
    const q = sp.get('q') ?? '';
    const page = getInt(sp.get('page'), 1);
    const pageSize = getInt(sp.get('pageSize'), 20);

    const selectedId = sp.get('id') ?? '';
    const modeParam = sp.get('mode'); // 'new' | null

    const splitMode: SplitMode = useMemo(() => {
        if (modeParam === 'new') return 'new';
        if (selectedId) return 'edit';
        return 'empty';
    }, [modeParam, selectedId]);

    /**
     * @FUNCTION_CODE NX00-UI-NX00-USERS-SPLIT-HOOK-001-F01
     * 說明：
     * - setQuery：以 URL 作為單一真實來源，更新 query string
     */
    const setQuery = useCallback(
        (patch: Record<string, string | null | undefined>) => {
            const next = new URLSearchParams(sp.toString());
            Object.entries(patch).forEach(([k, v]) => {
                if (v === null || v === undefined || v === '') next.delete(k);
                else next.set(k, String(v));
            });

            const qs = next.toString();
            router.replace(qs ? `${pathname}?${qs}` : pathname);
        },
        [sp, router, pathname],
    );

    // ===== list state =====
    const [items, setItems] = useState<UserDto[]>([]);
    const [total, setTotal] = useState(0);
    const [listLoading, setListLoading] = useState(false);
    const [listError, setListError] = useState<string | null>(null);

    useEffect(() => {
        let alive = true;

        setListLoading(true);
        setListError(null);

        listUsers({ q: q || undefined, page, pageSize })
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
     * @FUNCTION_CODE NX00-UI-NX00-USERS-SPLIT-HOOK-001-F02
     * 說明：
     * - createOne：新增 user
     * - 成功後：同步更新 list（若在第 1 頁則 prepend）並切到 edit（id=created.id）
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

                // 新增成功：切到 edit（同時回第 1 頁方便看到新資料）
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
     * @FUNCTION_CODE NX00-UI-NX00-USERS-SPLIT-HOOK-001-F03
     * 說明：
     * - updateOne：更新 user
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

    /**
     * @FUNCTION_CODE NX00-UI-NX00-USERS-SPLIT-HOOK-001-F04
     * 說明：
     * - setActiveOne：切換啟用狀態
     * - 成功後：detail/list 同步更新
     */
    const setActiveOne = useCallback(async (id: string, isActive: boolean) => {
        setSaving(true);
        setSaveError(null);

        try {
            const updated = await setUserActive(id, isActive);

            setDetail((d) => (d?.id === updated.id ? updated : d));
            setItems((prev) => prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)));
        } catch (e: any) {
            setSaveError(e?.message ?? '切換失敗');
        } finally {
            setSaving(false);
        }
    }, []);

    /**
     * @FUNCTION_CODE NX00-UI-NX00-USERS-SPLIT-HOOK-001-F05
     * 說明：
     * - changePasswordOne：修改密碼
     * - 成功後：不強制 reload（避免 list 抖動）；有需要可在 UI 顯示 toast
     */
    const changePasswordOne = useCallback(async (id: string, password: string) => {
        setSaving(true);
        setSaveError(null);

        try {
            await changeUserPassword(id, password);
        } catch (e: any) {
            setSaveError(e?.message ?? '修改密碼失敗');
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
        setActive: setActiveOne,
        changePassword: changePasswordOne,

        actions,
    };
}