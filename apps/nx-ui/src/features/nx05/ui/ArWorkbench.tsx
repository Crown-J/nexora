// apps/nx-ui/src/features/nx05/ui/ArWorkbench.tsx
// v1.2 階段 F P4：應收帳款工作台
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bell, RefreshCw, Search } from 'lucide-react';

import { listAr, notifyArOverdue, type ArRow } from '@/features/nx05/api';

import { DataTable, PageHeader, StatCard, StatusBadge, fmtDate, fmtMoney } from './common';

const STATUS_FILTERS = [
  { value: '', label: '全部' },
  { value: 'OPEN', label: '未到期' },
  { value: 'OVERDUE', label: '逾期' },
  { value: 'PARTIAL', label: '部分收款' },
  { value: 'PAID', label: '已收' },
];

export function ArWorkbench() {
  const [rows, setRows] = useState<ArRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [reloadTick, setReloadTick] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void (async () => {
      try {
        const res = await listAr({ page: 1, pageSize: 50, status, search });
        if (alive) setRows(res.rows);
      } catch (e) {
        if (alive) setError((e as Error).message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [status, search, reloadTick]);

  // 統計
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let total = 0;
    let todayDue = 0;
    let overdue = 0;
    for (const r of rows) {
      const bal = Number(r.balanceAmount) || 0;
      total += bal;
      const due = new Date(r.dueDate);
      due.setHours(0, 0, 0, 0);
      if (due.getTime() === today.getTime()) todayDue += bal;
      if (due < today && (r.status === 'OPEN' || r.status === 'PARTIAL')) overdue += bal;
    }
    return { total, todayDue, overdue };
  }, [rows]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="應收帳款"
        subtitle="銷貨單出貨 / 廠商退費衍生（兩種來源）"
        actions={
          <button
            type="button"
            onClick={() => setReloadTick((t) => t + 1)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#2A2A30] bg-[#0A0A0C] px-2.5 text-xs text-[#B8B8C0] hover:border-[#E8A020]/40 hover:text-[#E8A020]"
          >
            <RefreshCw className="size-3.5" /> 重新整理
          </button>
        }
      />

      {error ? (
        <div className="rounded-md border border-[#E26060]/40 bg-[#E26060]/10 px-3 py-2 text-xs text-[#E26060]">
          {error}
          <button type="button" onClick={() => setError(null)} className="ml-2 underline">
            關閉
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="未收餘額" value={fmtMoney(stats.total)} tone="amber" hint={`本頁 ${rows.length} 筆合計`} />
        <StatCard label="今日到期" value={fmtMoney(stats.todayDue)} tone="amber" />
        <StatCard label="逾期未收" value={fmtMoney(stats.overdue)} tone="red" />
      </div>

      <section className="space-y-3 rounded-md border border-[#2A2A30] bg-[#0A0A0C]/40 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border border-[#2A2A30] bg-[#0A0A0C] px-2 py-1">
            <Search className="size-3 text-[#5A5A60]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜尋單號 / 備註"
              className="h-6 w-40 bg-transparent text-xs text-[#E8E8EB] outline-none placeholder:text-[#5A5A60]"
            />
          </div>
          <span className="text-[10px] uppercase tracking-[0.18em] text-[#5A5A60]">狀態</span>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatus(f.value)}
              className={`rounded-md border px-2 py-1 text-[11px] transition-colors ${
                status === f.value
                  ? 'border-[#E8A020]/60 bg-[#E8A020]/10 text-[#E8A020]'
                  : 'border-[#3A3A42] text-[#888892] hover:border-[#5A5A60]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <DataTable<ArRow>
          columns={[
            {
              key: 'docNo',
              label: '應收單號',
              render: (r) => <span className="font-mono text-[#E8E8EB]">{r.docNo}</span>,
            },
            {
              key: 'source',
              label: '來源',
              render: (r) => (
                <span className="font-mono text-[10px] text-[#888892]">
                  {r.sourceType === 'PR' ? `PR · ${r.prId ?? '—'}` : `SO · ${r.soId ?? '—'}`}
                </span>
              ),
            },
            {
              key: 'customerId',
              label: '客戶',
              render: (r) => <span className="font-mono text-[10px]">{r.customerId}</span>,
            },
            {
              key: 'arDate',
              label: '應收日',
              render: (r) => fmtDate(r.arDate),
            },
            {
              key: 'dueDate',
              label: '到期日',
              render: (r) => fmtDate(r.dueDate),
            },
            {
              key: 'balanceAmount',
              label: '未收餘額',
              align: 'right',
              render: (r) => <span className="font-mono">{fmtMoney(r.balanceAmount)}</span>,
            },
            {
              key: 'status',
              label: '狀態',
              render: (r) => <StatusBadge status={r.displayStatus ?? r.status} />,
            },
            {
              key: 'actions',
              label: '操作',
              align: 'right',
              render: (r) => (
                <div className="flex justify-end gap-1">
                  <button
                    type="button"
                    disabled
                    title="UI 後續軌：開收款票據沖銷（後端 endpoint /nx05/paylog/with-settlements 已備）"
                    className="inline-flex h-6 cursor-not-allowed items-center gap-1 rounded-md border border-[#3A3A42] px-2 text-[10px] text-[#5A5A60]"
                  >
                    沖銷
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const remark = window.prompt('催款備註（可空、純內部記錄）：') ?? '';
                      try {
                        await notifyArOverdue(r.id, remark || undefined);
                        setReloadTick((t) => t + 1);
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                    title="記錄催款（純內部、不寄 email/簡訊）"
                    className="inline-flex h-6 items-center gap-1 rounded-md border border-[#E8A020]/40 bg-[#E8A020]/10 px-2 text-[10px] font-medium text-[#E8A020] hover:bg-[#E8A020]/20"
                  >
                    <Bell className="size-3" /> 催款
                  </button>
                </div>
              ),
            },
          ]}
          rows={rows}
          loading={loading}
          emptyMessage="尚無應收記錄"
        />
        <p className="text-[10px] text-[#5A5A60]">
          ⚠️ 沖銷（現金/銷退/折讓）+ 催款通知功能屬 P5/後續軌、本軌僅展示列表 + 統計
        </p>
      </section>
    </div>
  );
}
