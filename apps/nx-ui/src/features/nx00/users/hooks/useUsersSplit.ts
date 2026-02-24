/**
 * File: apps/nx-ui/src/features/nx00/users/hooks/useUsersSplit.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-USERS-SPLIT-HOOK-001：Users Split View Orchestrator（URL 驅動狀態）
 *
 * Notes:
 * - URL 為單一真實來源（Single Source of Truth）
 * - query:
 *   - q: 搜尋字
 *   - page: 頁碼（1-based）
 *   - pageSize: 每頁筆數
 *   - id: 編輯目標
 *   - mode: 'new' | undefined
 *
 * API Mapping (nx-api UsersController):
 * - GET    /users
 * - GET    /users/:id
 * - POST   /users
 * - PUT    /users/:id
 * - PATCH  /users/:id/active
 * - PATCH  /users/:id/password
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/shared/api/client';

type RawAny = Record<string, any>;

export type UserVM = {
    id: string;
    username: string;
    displayName: string;
    email: string | null;
    phone: string | null;
    isActive: boolean;
    lastLoginAt: string | null;
    statusCode: string;
    remark: string | null;

    createdAt: string | null;
    createdBy: string | null;
    createdByName: string | null;

    updatedAt: string | null;
    updatedBy: string | null;
    updatedByName: string | null;
};

type UsersListResponse = {
    items: any[];
    total: number;
};

export type CreateUserInput = {
    username: string;
    displayName: string;
    password?: string; // ✅ optional（不送也可以）
    email?: string | null;
    phone?: string | null;
    isActive?: boolean;
    statusCode?: string;
    remark?: string | null;
};

export type UpdateUserInput = {
    displayName: string;
    email?: string | null;
    phone?: string | null;
    isActive?: boolean;
    statusCode?: string;
    remark?: string | null;
};

type SplitMode = 'new' | 'edit' | 'empty';

function toInt(v: string | null, fallback: number) {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-USERS-SPLIT-HOOK-001-F01
 * 說明：
 * - snake/camel 兼容：把後端回傳 normalize 成 UI 需要的 UserVM
 * - ✅ 接上 createdByName / updatedByName（displayName）
 */
function normalizeUser(raw: RawAny): UserVM {
    const displayName = (raw.displayName ?? raw.display_name ?? '') as string;
    const email = (raw.email ?? null) as string | null;
    const phone = (raw.phone ?? null) as string | null;

    const isActive =
        typeof raw.isActive === 'boolean'
            ? raw.isActive
            : typeof raw.is_active === 'boolean'
                ? raw.is_active
                : true;

    const lastLoginAt = (raw.lastLoginAt ?? raw.last_login_at ?? null) as string | null;
    const statusCode = (raw.statusCode ?? raw.uu_sta ?? raw.status_code ?? 'A') as string;
    const remark = (raw.remark ?? raw.uu_rmk ?? null) as string | null;

    const createdAt = (raw.createdAt ?? raw.created_at ?? null) as string | null;
    const createdBy = (raw.createdBy ?? raw.created_by ?? null) as string | null;
    const updatedAt = (raw.updatedAt ?? raw.updated_at ?? null) as string | null;
    const updatedBy = (raw.updatedBy ?? raw.updated_by ?? null) as string | null;

    // ✅ 後端應回 createdByName/updatedByName（camel）
    // 兼容 snake: created_by_name / updated_by_name
    const createdByName = (raw.createdByName ?? raw.created_by_name ?? null) as string | null;
    const updatedByName = (raw.updatedByName ?? raw.updated_by_name ?? null) as string | null;

    return {
        id: String(raw.id ?? ''),
        username: String(raw.username ?? ''),
        displayName: displayName ?? '',
        email,
        phone,
        isActive,
        lastLoginAt,
        statusCode,
        remark,
        createdAt,
        createdBy,
        createdByName,
        updatedAt,
        updatedBy,
        updatedByName,
    };
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-USERS-SPLIT-HOOK-001-F02
 * 說明：
 * - 取得 query 值並提供寫回 URL 的 helper
 */
function useQueryHelpers() {
    const router = useRouter();
    const pathname = usePathname();
    const sp = useSearchParams();

    const get = useCallback((key: string) => sp.get(key), [sp]);

    const setMany = useCallback(
        (patch: Record<string, string | null | undefined>, opts?: { replace?: boolean }) => {
            const next = new URLSearchParams(sp.toString());

            Object.entries(patch).forEach(([k, v]) => {
                if (v === null || v === undefined || v === '') next.delete(k);
                else next.set(k, v);
            });

            const qs = next.toString();
            const url = qs ? `${pathname}?${qs}` : pathname;

            if (opts?.replace) router.replace(url);
            else router.push(url);
        },
        [router, pathname, sp],
    );

    return { get, setMany };
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-USERS-SPLIT-HOOK-001-F03
 * 說明：
 * - Users Split orchestrator hook
 */
export function useUsersSplit() {
    const { get, setMany } = useQueryHelpers();

    const q = get('q') ?? '';
    const page = toInt(get('page'), 1);
    const pageSize = clamp(toInt(get('pageSize'), 20), 5, 200);

    const selectedId = get('id') ?? '';
    const mode = (get('mode') ?? '') === 'new' ? 'new' : '';

    const splitMode: SplitMode = useMemo(() => {
        if (mode === 'new') return 'new';
        if (selectedId) return 'edit';
        return 'empty';
    }, [mode, selectedId]);

    const [listLoading, setListLoading] = useState(false);
    const [listError, setListError] = useState<string | null>(null);
    const [items, setItems] = useState<UserVM[]>([]);
    const [total, setTotal] = useState(0);

    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);
    const [detail, setDetail] = useState<UserVM | null>(null);

    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    /**
     * @FUNCTION_CODE NX00-UI-NX00-USERS-SPLIT-HOOK-001-F04
     * 說明：
     * - List API: GET /users
     */
    const loadList = useCallback(async () => {
        setListLoading(true);
        setListError(null);

        try {
            const url = `/users?q=${encodeURIComponent(q)}&page=${page}&pageSize=${pageSize}`;
            const res = await apiFetch(url);

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || `List failed (${res.status})`);
            }

            const data = (await res.json()) as UsersListResponse;
            const rawItems = Array.isArray(data.items) ? data.items : [];
            const vmItems = rawItems.map(normalizeUser);

            setItems(vmItems);
            setTotal(Number.isFinite(data.total) ? data.total : 0);
        } catch (err) {
            setListError(err instanceof Error ? err.message : 'Load list failed.');
            setItems([]);
            setTotal(0);
        } finally {
            setListLoading(false);
        }
    }, [q, page, pageSize]);

    /**
     * @FUNCTION_CODE NX00-UI-NX00-USERS-SPLIT-HOOK-001-F05
     * 說明：
     * - Detail API: GET /users/:id
     */
    const loadDetail = useCallback(async (id: string) => {
        if (!id) {
            setDetail(null);
            return;
        }

        setDetailLoading(true);
        setDetailError(null);

        try {
            const res = await apiFetch(`/users/${encodeURIComponent(id)}`);

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || `Detail failed (${res.status})`);
            }

            const data = (await res.json()) as RawAny;
            setDetail(normalizeUser(data));
        } catch (err) {
            setDetailError(err instanceof Error ? err.message : 'Load detail failed.');
            setDetail(null);
        } finally {
            setDetailLoading(false);
        }
    }, []);

    useEffect(() => {
        if (splitMode === 'new') {
            setDetail(null);
            return;
        }
        if (splitMode === 'edit') void loadDetail(selectedId);
        if (splitMode === 'empty') setDetail(null);
    }, [splitMode, selectedId, loadDetail]);

    useEffect(() => {
        void loadList();
    }, [loadList]);

    const actions = useMemo(() => {
        return {
            setSearch: (nextQ: string) => setMany({ q: nextQ, page: '1' }, { replace: true }),
            setPage: (nextPage: number) => setMany({ page: String(Math.max(1, nextPage)) }),
            setPageSize: (nextSize: number) => setMany({ pageSize: String(clamp(nextSize, 5, 200)), page: '1' }),
            selectUser: (id: string) => setMany({ id, mode: null }),
            createNew: () => setMany({ mode: 'new', id: null }),
            closeRight: () => setMany({ id: null, mode: null }),
            reload: () => {
                void loadList();
                if (splitMode === 'edit' && selectedId) void loadDetail(selectedId);
            },
        };
    }, [setMany, loadList, loadDetail, splitMode, selectedId]);

    /**
     * @FUNCTION_CODE NX00-UI-NX00-USERS-SPLIT-HOOK-001-F06
     * 說明：
     * - Create API: POST /users
     */
    const createUser = useCallback(
        async (input: CreateUserInput) => {
            setSaving(true);
            setSaveError(null);

            try {
                const res = await apiFetch('/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(input),
                });

                if (!res.ok) {
                    const text = await res.text();
                    throw new Error(text || `Create failed (${res.status})`);
                }

                const created = (await res.json()) as { id: string };
                if (created?.id) actions.selectUser(created.id);
                actions.reload();
            } catch (err) {
                setSaveError(err instanceof Error ? err.message : 'Create failed.');
            } finally {
                setSaving(false);
            }
        },
        [actions],
    );

    /**
     * @FUNCTION_CODE NX00-UI-NX00-USERS-SPLIT-HOOK-001-F07
     * 說明：
     * - Update API: PUT /users/:id
     */
    const updateUser = useCallback(
        async (id: string, input: UpdateUserInput) => {
            if (!id) return;

            setSaving(true);
            setSaveError(null);

            try {
                const res = await apiFetch(`/users/${encodeURIComponent(id)}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(input),
                });

                if (!res.ok) {
                    const text = await res.text();
                    throw new Error(text || `Update failed (${res.status})`);
                }

                actions.reload();
            } catch (err) {
                setSaveError(err instanceof Error ? err.message : 'Update failed.');
            } finally {
                setSaving(false);
            }
        },
        [actions],
    );

    /**
     * @FUNCTION_CODE NX00-UI-NX00-USERS-SPLIT-HOOK-001-F08
     * 說明：
     * - Change Password API: PATCH /users/:id/password
     */
    const changePassword = useCallback(
        async (id: string, password: string) => {
            if (!id) return;

            setSaving(true);
            setSaveError(null);

            try {
                const res = await apiFetch(`/users/${encodeURIComponent(id)}/password`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password }),
                });

                if (!res.ok) {
                    const text = await res.text();
                    throw new Error(text || `Change password failed (${res.status})`);
                }

                actions.reload();
            } catch (err) {
                setSaveError(err instanceof Error ? err.message : 'Change password failed.');
            } finally {
                setSaving(false);
            }
        },
        [actions],
    );

    /**
     * @FUNCTION_CODE NX00-UI-NX00-USERS-SPLIT-HOOK-001-F09
     * 說明：
     * - Set Active API: PATCH /users/:id/active
     */
    const setActive = useCallback(
        async (id: string, isActive: boolean) => {
            if (!id) return;

            setSaving(true);
            setSaveError(null);

            try {
                const res = await apiFetch(`/users/${encodeURIComponent(id)}/active`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ isActive }),
                });

                if (!res.ok) {
                    const text = await res.text();
                    throw new Error(text || `Set active failed (${res.status})`);
                }

                actions.reload();
            } catch (err) {
                setSaveError(err instanceof Error ? err.message : 'Set active failed.');
            } finally {
                setSaving(false);
            }
        },
        [actions],
    );

    return {
        q,
        page,
        pageSize,
        selectedId,
        splitMode,

        listLoading,
        listError,
        items,
        total,

        detailLoading,
        detailError,
        detail,

        saving,
        saveError,

        createUser,
        updateUser,
        changePassword,
        setActive,

        actions,
    };
}