/**
 * File: apps/nx-ui/src/features/nx00/location/ui/LocationSplitView.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-LOCATION-SPLIT-VIEW-001：Location Split View（左 list 右 form）
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/shared/ui/PageHeader';
import { DataTableShell } from '@/shared/ui/listform/DataTableShell';
import { ColumnPickerPanel, type ColumnDef } from '@/shared/ui/listform/ColumnPickerPanel';
import { useListLocalPref } from '@/shared/hooks/useListLocalPref';
import { formatDatetimeZhTw } from '@/shared/format/datetime';
import { cx } from '@/shared/lib/cx';

import { useLocationSplit } from '@/features/nx00/location/hooks/useLocationSplit';
import { LocationFormPanel } from '@/features/nx00/location/ui/LocationFormPanel';
import { LOCATION_FIELDS, type LocationFieldKey } from '@/features/nx00/location/meta/location.fields';
import type { LocationDto } from '@/features/nx00/location/types';

type SortState = { key: LocationFieldKey; dir: 'asc' | 'desc' } | null;

type LocationListConfig = {
    visibleCols: LocationFieldKey[];
    colOrder: LocationFieldKey[];
};

function buildDefs(): Record<LocationFieldKey, ColumnDef<LocationFieldKey>> {
    const map = {} as Record<LocationFieldKey, ColumnDef<LocationFieldKey>>;
    LOCATION_FIELDS.forEach((f) => {
        map[f.key] = {
            key: f.key,
            label: f.label,
            locked: f.key === 'code',
        };
    });
    return map;
}

export function LocationSplitView() {
    const vm = useLocationSplit();

    // ===== 搜尋（debounce）=====
    const [searchInput, setSearchInput] = useState(vm.q);

    useEffect(() => setSearchInput(vm.q), [vm.q]);

    useEffect(() => {
        const t = setTimeout(() => {
            if (searchInput !== vm.q) vm.actions.setSearch(searchInput);
        }, 350);
        return () => clearTimeout(t);
    }, [searchInput, vm.q, vm.actions]);

    // ===== 欄位定義 =====
    const allKeys = useMemo(() => LOCATION_FIELDS.map((f) => f.key), []);
    const defaultVisible = useMemo(() => LOCATION_FIELDS.filter((f) => f.inList).map((f) => f.key), []);
    const defaultOrder = useMemo(() => LOCATION_FIELDS.map((f) => f.key), []);
    const defsByKey = useMemo(() => buildDefs(), []);

    // ===== list 設定（localStorage）=====
    const pref = useListLocalPref<LocationListConfig>('nx00.location.listConfig', 1, {
        visibleCols: defaultVisible,
        colOrder: defaultOrder,
    });

    const [showColsPanel, setShowColsPanel] = useState(false);

    const resetToAllSelected = () => {
        pref.setValue({ visibleCols: allKeys, colOrder: defaultOrder });
    };

    const visibleFieldDefs = useMemo(() => {
        const lockedKey: LocationFieldKey = 'code';
        const visible = pref.value?.visibleCols?.includes(lockedKey)
            ? pref.value.visibleCols
            : ([lockedKey, ...(pref.value?.visibleCols ?? [])] as LocationFieldKey[]);

        const ordered = (pref.value?.colOrder ?? []).filter((k) => visible.includes(k));

        return LOCATION_FIELDS.filter((f) => ordered.includes(f.key)).sort((a, b) => ordered.indexOf(a.key) - ordered.indexOf(b.key));
    }, [pref.value]);

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
            return;
        }
        const next: Record<string, boolean> = {};
        allIdsOnPage.forEach((id) => (next[id] = true));
        setSelectedIds(next);
    };

    const toggleOne = (id: string) => {
        setSelectedIds((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    // ===== 排序（前端本地，作用於當頁）=====
    const [sort, setSort] = useState<SortState>(null);

    const toggleSort = (key: LocationFieldKey) => {
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

            if (typeof av === 'boolean' || typeof bv === 'boolean') return (Number(Boolean(av)) - Number(Boolean(bv))) * dir;

            if (sort.key.endsWith('At')) {
                const at = av ? new Date(av).getTime() : 0;
                const bt = bv ? new Date(bv).getTime() : 0;
                return (at - bt) * dir;
            }

            // levelNo / sortNo：數字排序
            if (sort.key === 'levelNo' || sort.key === 'sortNo') {
                const an = Number(av ?? 0);
                const bn = Number(bv ?? 0);
                return (an - bn) * dir;
            }

            return String(av ?? '').localeCompare(String(bv ?? ''), 'zh-Hant') * dir;
        });

        return arr;
    }, [vm.items, sort]);

    const pageCount = useMemo(() => {
        if (vm.total <= 0) return 1;
        return Math.max(1, Math.ceil(vm.total / vm.pageSize));
    }, [vm.total, vm.pageSize]);

    const renderCell = (row: LocationDto, key: LocationFieldKey) => {
        const v = (row as any)[key];

        if (key.endsWith('At')) return v ? formatDatetimeZhTw(v) : '-';
        if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
        if (v === null || v === undefined || v === '') return '-';
        return String(v);
    };

    const stickyLeftKeys = useMemo<LocationFieldKey[]>(() => ['code'], []);

    return (
        <>
            <PageHeader title="庫位基本資料" />

            {vm.warehouseError && (
                <div className="mb-3 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
                    {vm.warehouseError}
                </div>
            )}

            <div className="flex h-[calc(100vh-200px)] gap-3">
                {/* LEFT: LIST */}
                <div className="relative flex w-[58%] flex-col rounded-xl border border-white/10 bg-white/5 p-3">
                    {/* TOOLBAR */}
                    <div className="mb-3 flex items-center gap-2">
                        <button
                            className="rounded-lg border border-white/10 bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/15 disabled:opacity-40"
                            onClick={vm.actions.createNew}
                            disabled={!vm.warehouseId}
                            title={!vm.warehouseId ? '請先初始化倉庫' : '新增庫位'}
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
                                placeholder="輸入後自動搜尋（代碼 / 名稱 / 區域 / 架 / 層 / 格）"
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

                    <ColumnPickerPanel
                        open={showColsPanel}
                        onClose={() => setShowColsPanel(false)}
                        title="顯示欄位（可拖拉排序）"
                        allKeys={allKeys}
                        defsByKey={defsByKey}
                        visibleKeys={pref.value.visibleCols}
                        orderKeys={pref.value.colOrder}
                        onChangeVisibleKeys={(next) => pref.setValue({ ...pref.value, visibleCols: next })}
                        onChangeOrderKeys={(next) => pref.setValue({ ...pref.value, colOrder: next })}
                        onResetAllSelected={resetToAllSelected}
                    />

                    {vm.listError && <div className="mb-2 text-xs text-red-300">{vm.listError}</div>}
                    {vm.listLoading && <div className="mb-2 text-xs text-white/60">載入中...</div>}

                    <DataTableShell>
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 z-10 bg-black/60 backdrop-blur supports-[backdrop-filter]:bg-black/40">
                                <tr className="border-b border-white/10">
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
                                                className={cx(
                                                    'whitespace-nowrap px-3 py-2 text-left text-[11px] font-semibold text-white/70',
                                                    sticky && 'sticky left-[44px] z-20 border-r border-white/5 bg-black/60',
                                                )}
                                                style={sticky ? ({ backdropFilter: 'blur(6px)' } as any) : undefined}
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
                                                </div>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>

                            <tbody className="text-white/85">
                                {viewItems.map((r, idx) => {
                                    const activeRow = vm.selectedId === r.id && vm.splitMode === 'edit';

                                    return (
                                        <tr
                                            key={r.id}
                                            className={cx(
                                                'border-b border-white/5 transition-colors hover:bg-white/[0.06]',
                                                idx % 2 === 0 ? 'bg-white/[0.02]' : 'bg-transparent',
                                                activeRow && 'bg-white/[0.10]',
                                            )}
                                        >
                                            <td className="sticky left-0 z-10 border-r border-white/5 bg-black/20 px-2 py-2">
                                                <input type="checkbox" checked={Boolean(selectedIds[r.id])} onChange={() => toggleOne(r.id)} />
                                            </td>

                                            {visibleFieldDefs.map((f) => {
                                                const sticky = stickyLeftKeys.includes(f.key);
                                                return (
                                                    <td
                                                        key={f.key}
                                                        className={cx(
                                                            'whitespace-nowrap px-3 py-2 text-sm text-white/85',
                                                            sticky && 'sticky left-[44px] z-10 border-r border-white/5 bg-black/20',
                                                        )}
                                                        onClick={() => vm.actions.selectLocation(r.id)}
                                                        style={{ cursor: 'pointer' }}
                                                    >
                                                        {renderCell(r, f.key)}
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
                    <LocationFormPanel
                        mode={vm.splitMode}
                        detail={vm.detail}
                        loading={vm.detailLoading}
                        error={vm.detailError}
                        saving={vm.saving}
                        saveError={vm.saveError}
                        canEdit={true}
                        onClose={vm.actions.closeRight}
                        onCreate={vm.createLocation}
                        onUpdate={vm.updateLocation}
                    />
                </div>
            </div>
        </>
    );
}