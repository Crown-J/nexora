/**
 * File: apps/nx-ui/src/features/nx00/parts/hooks/usePartsSplit.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-PARTS-SPLIT-HOOK-001：Parts Split View Orchestrator（URL 驅動狀態）
 *
 * Notes:
 * - URL 為單一真實來源（Single Source of Truth）
 * - query:
 *   - q: 搜尋字
 *   - page: 頁碼（1-based）
 *   - pageSize: 每頁筆數
 *   - id: 編輯目標
 *   - mode: 'new' | undefined
 * - API base（預設沿用你 NX00 模組路由風格）：
 *   - GET    /nx00/parts
 *   - GET    /nx00/parts/:id
 *   - POST   /nx00/parts
 *   - PUT    /nx00/parts/:id
 *   - PATCH  /nx00/parts/:id/active
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/shared/api/client';

type RawAny = Record<string, any>;

export type PartVM = {
    id: string;

    partNo: string;
    oldPartNo: string | null;
    displayNo: string | null;

    nameZh: string;
    nameEn: string | null;

    brandId: string;
    brandName: string | null;

    functionGroupId: string | null;
    functionGroupName: string | null;

    statusId: string;
    statusName: string | null;

    barcode: string | null;
    isActive: boolean;
    remark: string | null;

    createdAt: string;
    createdBy: string | null;
    createdByName: string | null;

    updatedAt: string | null;
    updatedBy: string | null;
    updatedByName: string | null;
};

type PartsListResponse = {
    items: any[];
    total: number;
};

export type CreatePartInput = {
    partNo: string;
    oldPartNo?: string | null;
    displayNo?: string | null;

    nameZh: string;
    nameEn?: string | null;

    brandId: string;
    functionGroupId?: string | null;
    statusId: string;

    barcode?: string | null;
    isActive?: boolean;
    remark?: string | null;
};

export type UpdatePartInput = {
    partNo: string;
    oldPartNo?: string | null;
    displayNo?: string | null;

    nameZh: string;
    nameEn?: string | null;

    brandId: string;
    functionGroupId?: string | null;
    statusId: string;

    barcode?: string | null;
    isActive?: boolean;
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
 * @FUNCTION_CODE NX00-UI-NX00-PARTS-SPLIT-HOOK-001-F01
 * 說明：
 * - normalizePart：snake/camel 兼容
 * - 同時兼容 API 若回 brandName/functionGroupName/statusName 與 createdByName/updatedByName
 */
function normalizePart(raw: RawAny): PartVM {
    const isActive =
        typeof raw.isActive === 'boolean'
            ? raw.isActive
            : typeof raw.is_active === 'boolean'
                ? raw.is_active
                : true;

    return {
        id: String(raw.id ?? ''),

        partNo: String(raw.partNo ?? raw.part_no ?? ''),
        oldPartNo: (raw.oldPartNo ?? raw.old_part_no ?? null) as string | null,
        displayNo: (raw.displayNo ?? raw.display_no ?? null) as string | null,

        nameZh: String(raw.nameZh ?? raw.name_zh ?? ''),
        nameEn: (raw.nameEn ?? raw.name_en ?? null) as string | null,

        brandId: String(raw.brandId ?? raw.brand_id ?? ''),
        brandName: (raw.brandName ?? raw.brand_name ?? null) as string | null,

        functionGroupId: (raw.functionGroupId ?? raw.function_group_id ?? null) as string | null,
        functionGroupName: (raw.functionGroupName ?? raw.function_group_name ?? null) as string | null,

        statusId: String(raw.statusId ?? raw.status_id ?? ''),
        statusName: (raw.statusName ?? raw.status_name ?? null) as string | null,

        barcode: (raw.barcode ?? null) as string | null,
        isActive,
        remark: (raw.remark ?? raw.uu_rmk ?? null) as string | null,

        createdAt: String(raw.createdAt ?? raw.created_at ?? ''),
        createdBy: (raw.createdBy ?? raw.created_by ?? null) as string | null,
        createdByName: (raw.createdByName ?? raw.created_by_name ?? null) as string | null,

        updatedAt: (raw.updatedAt ?? raw.updated_at ?? null) as string | null,
        updatedBy: (raw.updatedBy ?? raw.updated_by ?? null) as string | null,
        updatedByName: (raw.updatedByName ?? raw.updated_by_name ?? null) as string | null,
    };
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-PARTS-SPLIT-HOOK-001-F02
 * 說明：
 * - query helper：讀寫 URLSearchParams
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
 * @FUNCTION_CODE NX00-UI-NX00-PARTS-SPLIT-HOOK-001-F03
 * 說明：
 * - Parts Split orchestrator hook
 */
export function usePartsSplit() {
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
    const [items, setItems] = useState<PartVM[]>([]);
    const [total, setTotal] = useState(0);

    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);
    const [detail, setDetail] = useState<PartVM | null>(null);

    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    /**
     * @FUNCTION_CODE NX00-UI-NX00-PARTS-SPLIT-HOOK-001-F04
     * 說明：
     * - List API: GET /nx00/parts
     */
    const loadList = useCallback(async () => {
        setListLoading(true);
        setListError(null);

        try {
            const url = `/nx00/parts?q=${encodeURIComponent(q)}&page=${page}&pageSize=${pageSize}`;
            const res = await apiFetch(url);

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || `List failed (${res.status})`);
            }

            const data = (await res.json()) as PartsListResponse;
            const rawItems = Array.isArray(data.items) ? data.items : [];
            setItems(rawItems.map(normalizePart));
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
     * @FUNCTION_CODE NX00-UI-NX00-PARTS-SPLIT-HOOK-001-F05
     * 說明：
     * - Detail API: GET /nx00/parts/:id
     */
    const loadDetail = useCallback(async (id: string) => {
        if (!id) {
            setDetail(null);
            return;
        }

        setDetailLoading(true);
        setDetailError(null);

        try {
            const res = await apiFetch(`/nx00/parts/${encodeURIComponent(id)}`);

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || `Detail failed (${res.status})`);
            }

            const data = (await res.json()) as RawAny;
            setDetail(normalizePart(data));
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
            setPageSize: (nextSize: number) =>
                setMany({ pageSize: String(clamp(nextSize, 5, 200)), page: '1' }),

            selectPart: (id: string) => setMany({ id, mode: null }),
            createNew: () => setMany({ mode: 'new', id: null }),
            closeRight: () => setMany({ id: null, mode: null }),

            reload: () => {
                void loadList();
                if (splitMode === 'edit' && selectedId) void loadDetail(selectedId);
            },
        };
    }, [setMany, loadList, loadDetail, splitMode, selectedId]);

    /**
     * @FUNCTION_CODE NX00-UI-NX00-PARTS-SPLIT-HOOK-001-F06
     * 說明：
     * - Create API: POST /nx00/parts
     */
    const createPart = useCallback(
        async (input: CreatePartInput) => {
            setSaving(true);
            setSaveError(null);

            try {
                const res = await apiFetch('/nx00/parts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(input),
                });

                if (!res.ok) {
                    const text = await res.text();
                    throw new Error(text || `Create failed (${res.status})`);
                }

                const created = (await res.json()) as { id: string };
                if (created?.id) actions.selectPart(created.id);
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
     * @FUNCTION_CODE NX00-UI-NX00-PARTS-SPLIT-HOOK-001-F07
     * 說明：
     * - Update API: PUT /nx00/parts/:id
     */
    const updatePart = useCallback(
        async (id: string, input: UpdatePartInput) => {
            if (!id) return;

            setSaving(true);
            setSaveError(null);

            try {
                const res = await apiFetch(`/nx00/parts/${encodeURIComponent(id)}`, {
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
     * @FUNCTION_CODE NX00-UI-NX00-PARTS-SPLIT-HOOK-001-F08
     * 說明：
     * - Set Active API: PATCH /nx00/parts/:id/active
     */
    const setActive = useCallback(
        async (id: string, isActive: boolean) => {
            if (!id) return;

            setSaving(true);
            setSaveError(null);

            try {
                const res = await apiFetch(`/nx00/parts/${encodeURIComponent(id)}/active`, {
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

        createPart,
        updatePart,
        setActive,

        actions,
    };
}