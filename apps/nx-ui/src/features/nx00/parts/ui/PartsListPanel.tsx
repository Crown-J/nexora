/**
 * File: apps/nx-ui/src/features/nx00/parts/ui/PartsListPanel.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-PARTS-LIST-UI-001：Parts List Panel（列表/搜尋/分頁）
 *
 * Notes:
 * - render-only：不允許在此檔案呼叫 API
 * - 由上層注入 items/handlers
 */

'use client';

import type { PartVM } from '../hooks/usePartsSplit';

type Props = {
    q: string;
    page: number;
    pageSize: number;
    total: number;

    loading: boolean;
    error: string | null;

    items: PartVM[];
    selectedId: string;

    onSearch: (q: string) => void;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;

    onSelect: (id: string) => void;
    onCreateNew: () => void;
    onReload: () => void;
};

export function PartsListPanel(props: Props) {
    const {
        q,
        page,
        pageSize,
        total,
        loading,
        error,
        items,
        selectedId,
        onSearch,
        onPageChange,
        onPageSizeChange,
        onSelect,
        onCreateNew,
        onReload,
    } = props;

    const pageCount = Math.max(1, Math.ceil(total / pageSize));

    return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-white/80">零件基本資料</div>

                <div className="flex items-center gap-2">
                    <button
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
                        onClick={onReload}
                        type="button"
                    >
                        重新整理
                    </button>

                    <button
                        className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs text-emerald-200 hover:bg-emerald-500/30"
                        onClick={onCreateNew}
                        type="button"
                    >
                        新增
                    </button>
                </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
                <input
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                    placeholder="搜尋（料號 / 品名）"
                    value={q}
                    onChange={(e) => onSearch(e.target.value)}
                />

                <select
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                    value={String(pageSize)}
                    onChange={(e) => onPageSizeChange(Number(e.target.value))}
                >
                    {[10, 20, 50, 100].map((n) => (
                        <option key={n} value={String(n)}>
                            {n}/page
                        </option>
                    ))}
                </select>
            </div>

            <div className="mt-3 text-xs text-white/50">
                Page {page} / {pageCount}（total: {total}）
            </div>

            {error ? (
                <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                    {error}
                </div>
            ) : null}

            <div className="mt-3 overflow-hidden rounded-xl border border-white/10">
                <div className="grid grid-cols-12 bg-white/5 px-3 py-2 text-xs text-white/60">
                    <div className="col-span-4">料號</div>
                    <div className="col-span-4">品名</div>
                    <div className="col-span-2">品牌</div>
                    <div className="col-span-2">啟用</div>
                </div>

                {loading ? (
                    <div className="p-4 text-sm text-white/60">Loading...</div>
                ) : items.length === 0 ? (
                    <div className="p-4 text-sm text-white/60">No data.</div>
                ) : (
                    <div className="divide-y divide-white/10">
                        {items.map((it) => {
                            const active = it.id === selectedId;
                            return (
                                <button
                                    key={it.id}
                                    className={[
                                        'grid w-full grid-cols-12 px-3 py-2 text-left text-sm',
                                        active ? 'bg-emerald-500/10' : 'hover:bg-white/5',
                                    ].join(' ')}
                                    onClick={() => onSelect(it.id)}
                                    type="button"
                                >
                                    <div className="col-span-4 text-white/90">{it.partNo}</div>
                                    <div className="col-span-4 text-white/70">{it.nameZh}</div>
                                    <div className="col-span-2 text-white/60">{it.brandName ?? '-'}</div>
                                    <div className="col-span-2 text-white/60">{it.isActive ? 'TRUE' : 'FALSE'}</div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="mt-3 flex items-center justify-end gap-2">
                <button
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10 disabled:opacity-40"
                    onClick={() => onPageChange(page - 1)}
                    disabled={page <= 1}
                    type="button"
                >
                    上一頁
                </button>
                <button
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10 disabled:opacity-40"
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= pageCount}
                    type="button"
                >
                    下一頁
                </button>
            </div>
        </div>
    );
}