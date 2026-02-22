/**
 * File: apps/nx-ui/src/features/nx00/parts/ui/PartsListView.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-PARTS-LIST-UI-001：Parts List UI（render only）
 *
 * Notes:
 * - 本檔案只負責畫面，不直接呼叫 API
 * - 所有資料與操作由 usePartsList() 提供
 * - 路由 query（page/pageSize/keyword/filters/sort）由 hook 讀取並透過 go() 寫回 URL
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { cx } from '@/shared/lib/cx';
import { usePartsList } from '@/features/nx00/parts/hooks/usePartsList';

function cn(...s: (string | false | null | undefined)[]) {
  return s.filter(Boolean).join(' ');
}

function normalizeSelect(value: string) {
  return value === '__ALL__' ? '' : value;
}

export function PartsListView() {
  const router = useRouter();
  const { query, state, actions } = usePartsList();

  const {
    page,
    pageSize,
    keyword,
    brandId,
    functionGroupId,
    statusId,
    isActive,
    sortBy,
    sortDir,
  } = query;

  const {
    items,
    total,
    totalPages,
    loading,
    err,
    brands,
    functionGroups,
    partStatuses,
  } = state;

  const { go, toggleActive } = actions;

  // 受控輸入：避免使用者打字就一直 reload
  const [keywordInput, setKeywordInput] = useState(keyword);

  useEffect(() => {
    setKeywordInput(keyword);
  }, [keyword]);

  const brandNameMap = useMemo(() => {
    const m = new Map<string, string>();
    brands.forEach((x) => m.set(x.id, x.name));
    return m;
  }, [brands]);

  const functionGroupNameMap = useMemo(() => {
    const m = new Map<string, string>();
    functionGroups.forEach((x) => m.set(x.id, x.name));
    return m;
  }, [functionGroups]);

  const statusNameMap = useMemo(() => {
    const m = new Map<string, string>();
    partStatuses.forEach((x) => m.set(x.id, x.name));
    return m;
  }, [partStatuses]);

  return (
    <div className="min-h-[calc(100vh-80px)] px-6 py-6 text-white">
      {/* header */}
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <div className="text-sm tracking-[0.35em] text-white/70">NX00</div>
          <h1 className="text-xl font-semibold">Parts</h1>
          <div className="text-xs text-white/35">NX00-UI-003 · list / search</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/dashboard/nx00/parts/new')}
            className="rounded-xl border border-[#39ff14]/40 bg-[#39ff14] px-4 py-2 text-sm font-medium text-black hover:bg-[#39ff14]/90"
          >
            + New
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl shadow-[0_25px_90px_rgba(0,0,0,0.6)]">
        {/* filters */}
        <div className="p-4 flex flex-col gap-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <div className="flex items-center gap-2">
                <input
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  placeholder="Search partNo / nameZh"
                  className="w-[280px] rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[#39ff14]/40 focus:ring-4 focus:ring-[#39ff14]/10"
                />

                <button
                  onClick={() => go({ keyword: keywordInput.trim(), page: 1 })}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
                >
                  Search
                </button>

                {keyword ? (
                  <button
                    onClick={() => {
                      setKeywordInput('');
                      go({ keyword: '', page: 1 });
                    }}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/60 hover:bg-white/10"
                  >
                    Clear
                  </button>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={brandId || '__ALL__'}
                  onChange={(e) => go({ brandId: normalizeSelect(e.target.value), page: 1 })}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
                >
                  <option value="__ALL__">Brand (All)</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} · {b.name}
                    </option>
                  ))}
                </select>

                <select
                  value={functionGroupId || '__ALL__'}
                  onChange={(e) => go({ functionGroupId: normalizeSelect(e.target.value), page: 1 })}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
                >
                  <option value="__ALL__">Function group (All)</option>
                  {functionGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.code} · {g.name}
                    </option>
                  ))}
                </select>

                <select
                  value={statusId || '__ALL__'}
                  onChange={(e) => go({ statusId: normalizeSelect(e.target.value), page: 1 })}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
                >
                  <option value="__ALL__">Status (All)</option>
                  {partStatuses.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} · {s.name}
                    </option>
                  ))}
                </select>

                <select
                  value={isActive || '__ALL__'}
                  onChange={(e) => go({ isActive: normalizeSelect(e.target.value), page: 1 })}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
                >
                  <option value="__ALL__">Active (All)</option>
                  <option value="true">Active = ON</option>
                  <option value="false">Active = OFF</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-white/60">
              <span>
                Page {page} / {totalPages}
              </span>

              <select
                value={pageSize}
                onChange={(e) => go({ pageSize: Number(e.target.value), page: 1 })}
                className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}/page
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => go({ sortBy: e.target.value })}
                className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
              >
                <option value="partNo">Sort: partNo</option>
                <option value="nameZh">Sort: nameZh</option>
                <option value="createdAt">Sort: createdAt</option>
              </select>

              <select
                value={sortDir}
                onChange={(e) => go({ sortDir: e.target.value })}
                className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
              >
                <option value="asc">asc</option>
                <option value="desc">desc</option>
              </select>
            </div>
          </div>
        </div>

        <div className="h-px bg-white/10" />

        {/* body */}
        {err ? (
          <div className="p-4 text-sm text-red-200">{err}</div>
        ) : loading ? (
          <div className="p-4 text-sm text-white/50">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-white/50">
                <tr className="border-b border-white/10">
                  <th className="p-3 text-left">Part No</th>
                  <th className="p-3 text-left">Name (ZH)</th>
                  <th className="p-3 text-left">Brand</th>
                  <th className="p-3 text-left">Function</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Active</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {items.map((p) => (
                  <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                    <td className="p-3">
                      <div className="font-medium text-white/90">{p.partNo}</div>
                      <div className="text-xs text-white/30">{p.id}</div>
                    </td>

                    <td className="p-3 text-white/80">
                      <div className="text-white/90">{p.nameZh}</div>
                      <div className="text-xs text-white/35">{p.nameEn || '-'}</div>
                    </td>

                    <td className="p-3 text-white/70">{brandNameMap.get(p.brandId) || p.brandId}</td>

                    <td className="p-3 text-white/60">
                      {p.functionGroupId
                        ? functionGroupNameMap.get(p.functionGroupId) || p.functionGroupId
                        : '-'}
                    </td>

                    <td className="p-3 text-white/60">{statusNameMap.get(p.statusId) || p.statusId}</td>

                    <td className="p-3">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full border px-2 py-1 text-xs',
                          p.isActive
                            ? 'border-[#39ff14]/30 bg-[#39ff14]/10 text-[#39ff14]'
                            : 'border-white/10 bg-white/5 text-white/50'
                        )}
                      >
                        {p.isActive ? 'ON' : 'OFF'}
                      </span>
                    </td>

                    <td className="p-3 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => router.push(`/dashboard/nx00/parts/${p.id}`)}
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => toggleActive(p)}
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
                        >
                          {p.isActive ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {items.length === 0 ? (
                  <tr>
                    <td className="p-6 text-center text-white/40" colSpan={7}>
                      No data
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}

        {/* footer */}
        <div className="p-4 flex items-center justify-between">
          <button
            disabled={page <= 1}
            onClick={() => go({ page: page - 1 })}
            className={cx(
              'rounded-xl border px-3 py-2 text-sm',
              page <= 1
                ? 'cursor-not-allowed border-white/10 bg-white/5 text-white/30'
                : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'
            )}
          >
            Prev
          </button>

          <div className="text-xs text-white/35">Total: {total}</div>

          <button
            disabled={page >= totalPages}
            onClick={() => go({ page: page + 1 })}
            className={cx(
              'rounded-xl border px-3 py-2 text-sm',
              page >= totalPages
                ? 'cursor-not-allowed border-white/10 bg-white/5 text-white/30'
                : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'
            )}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}