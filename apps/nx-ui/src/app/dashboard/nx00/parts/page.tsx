/**
 * File: apps/nx-ui/src/app/dashboard/nx00/parts/page.tsx
 * Project: NEXORA (Monorepo)
 * Purpose: NX00-UI-003 part_list（列表 + 搜尋 + 分頁 + 基本篩選）
 * Notes:
 * - 串接 NX00-API-002:
 *   - GET /nx00/parts
 *   - GET /nx00/brands | /nx00/function-groups | /nx00/part-statuses
 *   - PATCH /nx00/parts/:id/active
 * - RBAC：由後端保護（ADMIN only）；前端先做 403 友善畫面
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { listParts, setPartActive } from '@/features/nx00/api/parts';
import { listBrands, listFunctionGroups, listPartStatuses } from '@/features/nx00/api/lookups';
import type { LookupRow, PartRow, PartStatusRow } from '@/features/nx00/types';

function cn(...s: (string | false | null | undefined)[]) {
  return s.filter(Boolean).join(' ');
}

function normalizeSelect(value: string) {
  return value === '__ALL__' ? '' : value;
}

function isForbiddenError(e: any) {
  const msg = String(e?.message ?? '');
  // 你目前 apiJson 丟出來的是 res.text()，後端 403 通常會是 JSON 字串含 403
  return msg.includes('"statusCode":403') || msg.includes('403') || msg.toLowerCase().includes('forbidden');
}

function AccessDenied({ onBack }: { onBack: () => void }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl shadow-[0_25px_90px_rgba(0,0,0,0.6)] p-8">
      <div className="text-xs tracking-[0.35em] text-white/60">NX00</div>
      <div className="mt-2 text-xl font-semibold text-white/90">Access denied</div>
      <div className="mt-2 text-sm text-white/55 leading-relaxed">
        你的帳號沒有「Parts（零件主檔）」的權限。
        <br />
        請使用 ADMIN 帳號登入，或請系統管理員授權後再嘗試。
      </div>

      <div className="mt-6 flex gap-2">
        <button
          onClick={onBack}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
        >
          Back to Dashboard
        </button>
      </div>

      <div className="mt-6 text-xs text-white/35">
        （技術資訊）HTTP 403 / RBAC Forbidden
      </div>
    </div>
  );
}

export default function PartsListPage() {
  const router = useRouter();
  const sp = useSearchParams();

  // ===============================
  // @CODE nxui_nx00_parts_list_read_query_001
  // ===============================
  const page = Number(sp.get('page') || '1');
  const pageSize = Number(sp.get('pageSize') || '20');

  const keyword = sp.get('keyword') || '';
  const brandId = sp.get('brandId') || '';
  const functionGroupId = sp.get('functionGroupId') || '';
  const statusId = sp.get('statusId') || '';
  const isActive = sp.get('isActive') || ''; // '', 'true', 'false'

  const sortBy = (sp.get('sortBy') || 'partNo') as 'partNo' | 'nameZh' | 'createdAt';
  const sortDir = (sp.get('sortDir') || 'asc') as 'asc' | 'desc';

  // ===============================
  // @CODE nxui_nx00_parts_list_state_001
  // ===============================
  const [items, setItems] = useState<PartRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // ✅ RBAC UX: 403 友善畫面
  const [forbidden, setForbidden] = useState(false);

  // lookups
  const [brands, setBrands] = useState<LookupRow[]>([]);
  const [functionGroups, setFunctionGroups] = useState<LookupRow[]>([]);
  const [partStatuses, setPartStatuses] = useState<PartStatusRow[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);

  // inputs (controlled)
  const [keywordInput, setKeywordInput] = useState(keyword);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  // ===============================
  // @CODE nxui_nx00_parts_list_nav_001
  // ===============================
  function go(params: Partial<{
    page: number;
    pageSize: number;
    keyword: string;
    brandId: string;
    functionGroupId: string;
    statusId: string;
    isActive: string;
    sortBy: string;
    sortDir: string;
  }>) {
    const next = new URLSearchParams(sp.toString());

    const setOrDelete = (k: string, v: string | undefined) => {
      if (v === undefined) return;
      if (v === '') next.delete(k);
      else next.set(k, v);
    };

    if (params.page !== undefined) next.set('page', String(params.page));
    if (params.pageSize !== undefined) next.set('pageSize', String(params.pageSize));

    if (params.keyword !== undefined) {
      setOrDelete('keyword', params.keyword.trim());
      next.set('page', '1');
    }
    if (params.brandId !== undefined) {
      setOrDelete('brandId', params.brandId);
      next.set('page', '1');
    }
    if (params.functionGroupId !== undefined) {
      setOrDelete('functionGroupId', params.functionGroupId);
      next.set('page', '1');
    }
    if (params.statusId !== undefined) {
      setOrDelete('statusId', params.statusId);
      next.set('page', '1');
    }
    if (params.isActive !== undefined) {
      setOrDelete('isActive', params.isActive);
      next.set('page', '1');
    }

    if (params.sortBy !== undefined) next.set('sortBy', params.sortBy);
    if (params.sortDir !== undefined) next.set('sortDir', params.sortDir);

    router.replace(`/dashboard/nx00/parts?${next.toString()}`);
  }

  // ===============================
  // @CODE nxui_nx00_parts_list_load_lookups_002
  // ✅ 403 不炸頁，改成 forbidden
  // ===============================
  async function loadLookups() {
    setLookupLoading(true);
    try {
      const [b, fg, ps] = await Promise.all([
        listBrands({ isActive: true }),
        listFunctionGroups({ isActive: true }),
        listPartStatuses({ isActive: true }),
      ]);
      setBrands(b);
      setFunctionGroups(fg);
      setPartStatuses(ps);
    } catch (e: any) {
      if (isForbiddenError(e)) {
        setForbidden(true);
        return;
      }
      console.error(e);
    } finally {
      setLookupLoading(false);
    }
  }

  // ===============================
  // @CODE nxui_nx00_parts_list_reload_002
  // ✅ 403 不炸頁，改成 forbidden
  // ===============================
  async function reload() {
    setLoading(true);
    setErr(null);
    try {
      const r = await listParts({
        keyword: keyword || undefined,
        brandId: brandId || undefined,
        functionGroupId: functionGroupId || undefined,
        statusId: statusId || undefined,
        isActive: isActive === '' ? undefined : isActive === 'true',
        page,
        pageSize,
        sortBy,
        sortDir,
      });

      setItems(r.items);
      setTotal(r.total);
    } catch (e: any) {
      if (isForbiddenError(e)) {
        setForbidden(true);
        return;
      }
      setErr(e?.message || 'Load failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // @CODE nxui_nx00_parts_list_bootstrap_001
    loadLookups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // @CODE nxui_nx00_parts_list_watch_query_001
    setKeywordInput(keyword);
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, keyword, brandId, functionGroupId, statusId, isActive, sortBy, sortDir]);

  // ===============================
  // @CODE nxui_nx00_parts_list_toggle_active_001
  // ===============================
  async function onToggleActive(row: PartRow) {
    const next = !row.isActive;

    setItems((prev) => prev.map((x) => (x.id === row.id ? { ...x, isActive: next } : x)));

    try {
      await setPartActive(row.id, next);
    } catch (e: any) {
      setItems((prev) => prev.map((x) => (x.id === row.id ? { ...x, isActive: !next } : x)));
      alert(e?.message || 'Update failed');
    }
  }

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

  // ✅ 如果是 403：直接顯示友善畫面
  if (forbidden) {
    return (
      <div className="min-h-[calc(100vh-80px)] px-6 py-6 text-white">
        <AccessDenied onBack={() => router.push('/dashboard')} />
      </div>
    );
  }

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
                  onClick={() => go({ keyword: keywordInput.trim() })}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
                >
                  Search
                </button>
                {keyword ? (
                  <button
                    onClick={() => {
                      setKeywordInput('');
                      go({ keyword: '' });
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
                  onChange={(e) => go({ brandId: normalizeSelect(e.target.value) })}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
                >
                  <option value="__ALL__">{lookupLoading ? 'Brand (loading...)' : 'Brand (All)'}</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} · {b.name}
                    </option>
                  ))}
                </select>

                <select
                  value={functionGroupId || '__ALL__'}
                  onChange={(e) => go({ functionGroupId: normalizeSelect(e.target.value) })}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
                >
                  <option value="__ALL__">
                    {lookupLoading ? 'Function group (loading...)' : 'Function group (All)'}
                  </option>
                  {functionGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.code} · {g.name}
                    </option>
                  ))}
                </select>

                <select
                  value={statusId || '__ALL__'}
                  onChange={(e) => go({ statusId: normalizeSelect(e.target.value) })}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
                >
                  <option value="__ALL__">{lookupLoading ? 'Status (loading...)' : 'Status (All)'}</option>
                  {partStatuses.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} · {s.name}
                    </option>
                  ))}
                </select>

                <select
                  value={isActive || '__ALL__'}
                  onChange={(e) => go({ isActive: normalizeSelect(e.target.value) })}
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
                          onClick={() => onToggleActive(p)}
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
            className={cn(
              'rounded-xl border px-3 py-2 text-sm',
              page <= 1
                ? 'border-white/10 bg-white/5 text-white/30 cursor-not-allowed'
                : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'
            )}
          >
            Prev
          </button>

          <div className="text-xs text-white/35">Total: {total}</div>

          <button
            disabled={page >= totalPages}
            onClick={() => go({ page: page + 1 })}
            className={cn(
              'rounded-xl border px-3 py-2 text-sm',
              page >= totalPages
                ? 'border-white/10 bg-white/5 text-white/30 cursor-not-allowed'
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
