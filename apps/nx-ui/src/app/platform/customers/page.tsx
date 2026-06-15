// apps/nx-ui/src/app/platform/customers/page.tsx
// 平台層 vs 租戶層分離軌 Phase 4：平台後台客戶租戶列表

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { listTenants, type ListTenantsResponse, type TenantSummary } from '@data/endpoints/platform/tenants/api';

export default function PlatformCustomersPage() {
  const [data, setData] = useState<ListTenantsResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    listTenants({ search: submittedSearch || undefined, page: 1, limit: 50 })
      .then((d) => {
        if (cancelled) return;
        setData(d);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setErr(e instanceof Error ? e.message : 'load failed');
      });
    return () => {
      cancelled = true;
    };
  }, [submittedSearch]);

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmittedSearch(search.trim());
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-[10px] tracking-[0.3em] uppercase text-zinc-600">Platform / Customers</p>
        <h1 className="text-2xl tracking-tight text-zinc-100">客戶租戶</h1>
        {data ? (
          <p className="text-xs text-zinc-500">
            共 {data.pagination.total} 筆（SYSTEM / INNOVA 系統保留不列）
          </p>
        ) : null}
      </header>

      <form onSubmit={onSearchSubmit} className="flex gap-2 max-w-md">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜尋 code / name / 統編"
          className="flex-1 bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
        />
        <button
          type="submit"
          className="px-4 py-2 border border-zinc-700 text-xs uppercase tracking-wider text-zinc-300 hover:border-zinc-500 hover:text-zinc-100"
        >
          Search
        </button>
      </form>

      {err ? (
        <div className="border border-red-900 bg-red-950 text-red-300 text-xs p-3">{err}</div>
      ) : null}

      {data ? (
        <div className="border border-zinc-800 bg-zinc-950 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 uppercase tracking-wider">
                <th className="text-left p-3">Code</th>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Plan</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Tax ID</th>
                <th className="text-left p-3">Owner</th>
                <th className="text-left p-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {data.data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-zinc-600">
                    尚無客戶租戶
                  </td>
                </tr>
              ) : (
                data.data.map((t) => <Row key={t.id} t={t} />)
              )}
            </tbody>
          </table>
        </div>
      ) : !err ? (
        <div className="text-zinc-600 text-xs">loading...</div>
      ) : null}
    </div>
  );
}

function Row({ t }: { t: TenantSummary }) {
  return (
    <tr className="border-b border-zinc-900 hover:bg-zinc-900/50">
      <td className="p-3">
        <Link
          href={`/platform/customers/${t.id}`}
          className="text-zinc-100 hover:text-amber-300 font-medium"
        >
          {t.code}
        </Link>
      </td>
      <td className="p-3 text-zinc-300">{t.name}</td>
      <td className="p-3 text-zinc-400">{t.planCode ?? '—'}</td>
      <td className="p-3">
        <span
          className={[
            'px-1.5 py-0.5 text-[10px] uppercase tracking-wider border',
            t.isActive
              ? 'border-emerald-800 text-emerald-300 bg-emerald-950'
              : 'border-zinc-700 text-zinc-500',
          ].join(' ')}
        >
          {t.isActive ? 'active' : 'inactive'}
        </span>
      </td>
      <td className="p-3 text-zinc-500 font-mono">{t.taxId ?? '—'}</td>
      <td className="p-3 text-zinc-400">
        {t.contactName ?? '—'}
        {t.contactEmail ? <div className="text-zinc-600 text-[11px]">{t.contactEmail}</div> : null}
      </td>
      <td className="p-3 text-zinc-500 text-[11px]">
        {new Date(t.createdAt).toLocaleDateString('zh-TW')}
      </td>
    </tr>
  );
}
