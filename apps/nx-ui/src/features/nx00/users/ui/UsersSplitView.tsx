/**
 * File: apps/nx-ui/src/features/nx00/users/ui/UsersSplitView.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-USERS-SPLIT-VIEW-001：Users Split View（左 list 右 form）
 *
 * Notes:
 * - 左側：list（欄位顯示選擇 / 多選 / 排序 / 自動搜尋 / 水平滾動 / 拖拉調整欄位順序 / 設定記憶）
 * - 右側：UserFormPanel
 * - List+Form 共用 UI 已抽到 shared/ui/listform
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useUsersSplit } from '@/features/nx00/users/hooks/useUsersSplit';
import { UserFormPanel } from '@/features/nx00/users/ui/UserFormPanel';
import { USERS_FIELDS, type UsersFieldKey } from '@/features/nx00/users/meta/users.fields';
import { formatDatetimeZhTw } from '@/shared/format/datetime';

import { PageHeader } from '@/shared/ui/PageHeader';
import { DataTableShell } from '@/shared/ui/listform/DataTableShell';
import { ColumnPickerPanel, type ColumnDef } from '@/shared/ui/listform/ColumnPickerPanel';
import { useListLocalPref } from '@/shared/hooks/useListLocalPref';

type SortState = { key: UsersFieldKey; dir: 'asc' | 'desc' } | null;

type UsersListConfig = {
    visibleCols: UsersFieldKey[];
    colOrder: UsersFieldKey[];
};

function buildDefs(): Record<UsersFieldKey, ColumnDef<UsersFieldKey>> {
    const map = {} as Record<UsersFieldKey, ColumnDef<UsersFieldKey>>;
    USERS_FIELDS.forEach((f) => {
        map[f.key] = {
            key: f.key,
            label: f.label,
            locked: f.key === 'username',
        };
    });
    return map;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-USERS-SPLIT-VIEW-001-F01
 * 說明：
 * - UsersSplitView
 */
export function UsersSplitView() {
    const vm = useUsersSplit();

    // ===== 搜尋（debounce）=====
    const [searchInput, setSearchInput] = useState(vm.q);

    useEffect(() => setSearchInput(vm.q), [vm.q]);

    useEffect(() => {
        const t = setTimeout(() => {
            if (searchInput !== vm.q) vm.actions.setSearch(searchInput);
        }, 350);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchInput, vm.q]);

    // ===== 欄位定義 =====
    const allKeys = useMemo(() => USERS_FIELDS.map((f) => f.key), []);
    const defaultVisible = useMemo(() => USERS_FIELDS.filter((f) => f.inList).map((f) => f.key), []);
    const defaultOrder = useMemo(() => USERS_FIELDS.map((f) => f.key), []);
    const defsByKey = useMemo(() => buildDefs(), []);

    // ===== list 設定（localStorage / 帳號綁定）=====
    const pref = useListLocalPref<UsersListConfig>('nx00.users.listConfig', 1, {
        visibleCols: defaultVisible,
        colOrder: defaultOrder,
    });

    const [showColsPanel, setShowColsPanel] = useState(false);

    /**
     * @FUNCTION_CODE NX00-UI-NX00-USERS-SPLIT-VIEW-001-F02
     * 說明：
     * - 防守：pref.value 可能被舊 localStorage 資料污染（缺欄位/型別錯誤）
     * - 這裡統一 normalize，確保後面永遠不會讀到 undefined
     */
    const normalizedConfig = useMemo<UsersListConfig>(() => {
        const raw = pref.value as any;

        const visibleCols = Array.isArray(raw?.visibleCols) ? (raw.visibleCols as UsersFieldKey[]) : defaultVisible;
        const colOrder = Array.isArray(raw?.colOrder) ? (raw.colOrder as UsersFieldKey[]) : defaultOrder;

        // 過濾掉不存在的 key（避免 schema 變動）
        const filteredVisible = visibleCols.filter((k) => allKeys.includes(k));
        const filteredOrder = colOrder.filter((k) => allKeys.includes(k));

        // username 必須存在（避免全關掉導致空表/怪 UI）
        const lockedKey: UsersFieldKey = 'username';
        const ensuredVisible = filteredVisible.includes(lockedKey)
            ? filteredVisible
            : ([lockedKey, ...filteredVisible] as UsersFieldKey[]);

        // order 補齊缺少的 key（避免拖拉時順序陣列不完整）
        const orderSet = new Set(filteredOrder);
        const completedOrder = [...filteredOrder, ...allKeys.filter((k) => !orderSet.has(k))];

        return {
            visibleCols: ensuredVisible.length > 0 ? ensuredVisible : ([lockedKey] as UsersFieldKey[]),
            colOrder: completedOrder,
        };
    }, [pref.value, defaultVisible, defaultOrder, allKeys]);

    const resetToAllSelected = () => {
        pref.setValue({ visibleCols: allKeys, colOrder: defaultOrder });
    };

    const visibleFieldDefs = useMemo(() => {
        const visible = normalizedConfig.visibleCols;

        const ordered = normalizedConfig.colOrder.filter((k) => visible.includes(k));

        return USERS_FIELDS.filter((f) => ordered.includes(f.key)).sort((a, b) => ordered.indexOf(a.key) - ordered.indexOf(b.key));
    }, [normalizedConfig]);

    // ===== 多選 checkbox =====
    const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

    useEffect(() => {
        setSelectedIds({});
    }, [vm.page, vm.pageSize, vm.q]);

    const allIdsOnPage = useMemo(() => vm.items.map((x) => x.id), [vm.items]);
    const allSelected = useMemo(
        () => allIdsOnPage.length > 0 && allIdsOnPage.every((id) => selectedIds[id]),
        [allIdsOnPage, selectedIds],
    );
    const selectedCount = useMemo(() => Object.values(selectedIds).filter(Boolean).length, [selectedIds]);

    const toggleAll = () => {
        if (allSelected) {
            setSelectedIds({});
        } else {
            const next: Record<string, boolean> = {};
            allIdsOnPage.forEach((id) => (next[id] = true));
            setSelectedIds(next);
        }
    };

    const toggleOne = (id: string) => {
        setSelectedIds((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    // ===== 排序（前端本地，作用於當頁）=====
    const [sort, setSort] = useState<SortState>(null);

    const toggleSort = (key: UsersFieldKey) => {
        setSort((prev) => {
            if (!prev || prev.key !== key) return { key, dir: 'asc' };
            if (prev.dir === 'asc') return { key, dir: 'desc' };
            return null;
        });
    };

    const viewItems = useMemo(() => {
        const arr = [...vm.items];
        if (!sort) return arr;

        arr.sort((a: any, b: any) => {
            const av = a[sort.key];
            const bv = b[sort.key];
            const dir = sort.dir === 'asc' ? 1 : -1;

            if (typeof av === 'boolean' || typeof bv === 'boolean') {
                return (Number(Boolean(av)) - Number(Boolean(bv))) * dir;
            }

            if (sort.key.endsWith('At')) {
                const at = av ? new Date(av).getTime() : 0;
                const bt = bv ? new Date(bv).getTime() : 0;
                return (at - bt) * dir;
            }

            return String(av ?? '').localeCompare(String(bv ?? ''), 'zh-Hant') * dir;
        });

        return arr;
    }, [vm.items, sort]);

    const pageCount = useMemo(() => {
        if (vm.total <= 0) return 1;
        return Math.max(1, Math.ceil(vm.total / vm.pageSize));
    }, [vm.total, vm.pageSize]);

    // ===== 欄位值渲染（含 datetime format）=====
    const renderCell = (u: any, key: UsersFieldKey) => {
        const v = u[key];

        if (key.endsWith('At')) return formatDatetimeZhTw(v ?? null);
        if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
        if (v === null || v === undefined || v === '') return '-';
        return String(v);
    };

    // ===== sticky-left 欄位（checkbox + username）=====
    const stickyLeftKeys = useMemo<UsersFieldKey[]>(() => ['username'], []);

    return (
        <>
            <PageHeader title="使用者基本資料" />

            <div className="flex h-[calc(100vh-200px)] gap-3">
                {/* LEFT: LIST */}
                <div className="relative flex w-[58%] flex-col rounded-xl border border-white/10 bg-white/5 p-3">
                    {/* TOOLBAR */}
                    <div className="mb-3 flex items-center gap-2">
                        <button
                            className="rounded-lg border border-white/10 bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/15"
                            onClick={vm.actions.createNew}
                        >
                            新增
                        </button>

                        <button
                            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80 hover:bg-white/10"
                            onClick={() => setShowColsPanel((v) => !v)}
                        >
                            欄位
                        </button>

                        <div className="flex flex-1 items-center gap-2">
                            <input
                                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                                placeholder="輸入後自動搜尋（username / displayName）"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Escape') setSearchInput('');
                                    if (e.key === 'Enter') vm.actions.setSearch(searchInput);
                                }}
                            />
                        </div>

                        <div className="text-xs text-white/60">
                            Page {vm.page} / {pageCount}
                        </div>

                        <select
                            className="rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-xs text-white/80 outline-none"
                            value={String(vm.pageSize)}
                            onChange={(e) => vm.actions.setPageSize(Number(e.target.value))}
                        >
                            <option value="10">10/page</option>
                            <option value="20">20/page</option>
                            <option value="50">50/page</option>
                            <option value="100">100/page</option>
                        </select>
                    </div>

                    {/* Column Picker */}
                    <ColumnPickerPanel
                        open={showColsPanel}
                        onClose={() => setShowColsPanel(false)}
                        title="顯示欄位（可拖拉排序）"
                        allKeys={allKeys}
                        defsByKey={defsByKey}
                        visibleKeys={normalizedConfig.visibleCols}
                        orderKeys={normalizedConfig.colOrder}
                        onChangeVisibleKeys={(next) => pref.setValue({ ...normalizedConfig, visibleCols: next })}
                        onChangeOrderKeys={(next) => pref.setValue({ ...normalizedConfig, colOrder: next })}
                        onResetAllSelected={resetToAllSelected}
                    />

                    {vm.listError && <div className="mb-2 text-xs text-red-300">{vm.listError}</div>}
                    {vm.listLoading && <div className="mb-2 text-xs text-white/60">載入中...</div>}

                    {/* TABLE */}
                    <DataTableShell>
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 z-10 bg-black/60 backdrop-blur supports-[backdrop-filter]:bg-black/40">
                                <tr className="border-b border-white/10">
                                    {/* checkbox */}
                                    <th
                                        className="sticky left-0 z-20 w-[44px] border-r border-white/5 bg-black/60 px-2 py-2 text-left"
                                        style={{ backdropFilter: 'blur(6px)' }}
                                    >
                                        <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                                    </th>

                                    {visibleFieldDefs.map((f) => {
                                        const sticky = stickyLeftKeys.includes(f.key);
                                        return (
                                            <th
                                                key={f.key}
                                                className={[
                                                    'whitespace-nowrap px-3 py-2 text-left text-[11px] font-semibold text-white/70',
                                                    sticky ? 'sticky left-[44px] z-20 border-r border-white/5 bg-black/60' : '',
                                                ].join(' ')}
                                                style={sticky ? ({ backdropFilter: 'blur(6px)' } as any) : undefined}
                                                title="表頭"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="tracking-wide">{f.label}</span>

                                                    {f.sortable && (
                                                        <button
                                                            className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-white/70 hover:bg-white/10"
                                                            onClick={() => toggleSort(f.key)}
                                                            title="排序"
                                                        >
                                                            {sort?.key === f.key ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}
                                                        </button>
                                                    )}

                                                    {f.filterable && (
                                                        <span className="text-[10px] text-white/35" title="篩選（下一步補）">
                                                            ⌕
                                                        </span>
                                                    )}
                                                </div>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>

                            <tbody className="text-white/85">
                                {viewItems.map((u, idx) => {
                                    const activeRow = vm.selectedId === u.id && vm.splitMode === 'edit';

                                    return (
                                        <tr
                                            key={u.id}
                                            className={[
                                                'border-b border-white/5 transition-colors',
                                                idx % 2 === 0 ? 'bg-white/[0.02]' : 'bg-transparent',
                                                'hover:bg-white/[0.06]',
                                                activeRow ? 'bg-white/[0.10]' : '',
                                            ].join(' ')}
                                        >
                                            {/* checkbox (sticky left) */}
                                            <td className="sticky left-0 z-10 border-r border-white/5 bg-black/20 px-2 py-2">
                                                <input
                                                    type="checkbox"
                                                    checked={Boolean(selectedIds[u.id])}
                                                    onChange={() => toggleOne(u.id)}
                                                />
                                            </td>

                                            {visibleFieldDefs.map((f) => {
                                                const sticky = stickyLeftKeys.includes(f.key);
                                                return (
                                                    <td
                                                        key={f.key}
                                                        className={[
                                                            'whitespace-nowrap px-3 py-2 text-sm text-white/85',
                                                            sticky ? 'sticky left-[44px] z-10 border-r border-white/5 bg-black/20' : '',
                                                        ].join(' ')}
                                                        onClick={() => vm.actions.selectUser(u.id)}
                                                        style={{ cursor: 'pointer' }}
                                                    >
                                                        {renderCell(u, f.key)}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}

                                {!vm.listLoading && viewItems.length === 0 && (
                                    <tr>
                                        <td className="px-3 py-10 text-center text-xs text-white/60" colSpan={visibleFieldDefs.length + 1}>
                                            無資料
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </DataTableShell>

                    {/* FOOTER */}
                    <div className="mt-3 flex items-center justify-between">
                        <button
                            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10 disabled:opacity-40"
                            onClick={() => vm.actions.setPage(vm.page - 1)}
                            disabled={vm.page <= 1}
                        >
                            Prev
                        </button>

                        <div className="flex items-center gap-3 text-xs text-white/60">
                            <span>Total: {vm.total}</span>
                            <span>Selected: {selectedCount}</span>
                        </div>

                        <button
                            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10 disabled:opacity-40"
                            onClick={() => vm.actions.setPage(vm.page + 1)}
                            disabled={vm.page >= pageCount}
                        >
                            Next
                        </button>
                    </div>
                </div>

                {/* RIGHT: FORM */}
                <div className="w-[42%]">
                    <UserFormPanel
                        mode={vm.splitMode}
                        detail={vm.detail}
                        loading={vm.detailLoading}
                        error={vm.detailError}
                        saving={vm.saving}
                        saveError={vm.saveError}
                        canEdit={true} // TODO: 之後接 RBAC
                        onClose={vm.actions.closeRight}
                        onCreate={vm.createUser}
                        onUpdate={vm.updateUser}
                    />
                </div>
            </div>
        </>
    );
}