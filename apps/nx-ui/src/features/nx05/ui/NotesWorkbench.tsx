// apps/nx-ui/src/features/nx05/ui/NotesWorkbench.tsx
// v1.2 階段 F P4：票據管理（4 種收付款方式：現金 / 匯款 / 支票 / 信用卡）
'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';

import { listNotes, type NoteRow } from '@/features/nx05/api';

import { DataTable, PageHeader, StatCard, StatusBadge, fmtDate, fmtMoney } from './common';

type Tab = 'all' | 'receipt' | 'payment';

const PM_LABEL: Record<string, string> = {
  CASH: '現金',
  TRANSFER: '匯款',
  CHECK: '支票',
  CREDIT: '信用卡',
};

export function NotesWorkbench() {
  const [rows, setRows] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [reloadTick, setReloadTick] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void (async () => {
      try {
        const res = await listNotes({ page: 1, pageSize: 100, search });
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
  }, [search, reloadTick]);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (tab === 'receipt') return r.noteType?.toUpperCase() === 'R';
        if (tab === 'payment') return r.noteType?.toUpperCase() === 'P';
        return true;
      }),
    [rows, tab],
  );

  const stats = useMemo(() => {
    let receiptTotal = 0;
    let paymentTotal = 0;
    for (const r of rows) {
      const amt = Number(r.amount) || 0;
      if (r.noteType?.toUpperCase() === 'R') receiptTotal += amt;
      else paymentTotal += amt;
    }
    return { receiptTotal, paymentTotal };
  }, [rows]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="票據管理"
        subtitle="所有收付款行為（現金 / 匯款 / 支票 / 信用卡）"
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
        <StatCard label="收款總額" value={fmtMoney(stats.receiptTotal)} tone="green" />
        <StatCard label="付款總額" value={fmtMoney(stats.paymentTotal)} tone="amber" />
        <StatCard
          label="淨流入"
          value={fmtMoney(stats.receiptTotal - stats.paymentTotal)}
          tone={stats.receiptTotal - stats.paymentTotal >= 0 ? 'green' : 'red'}
        />
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
          <span className="text-[10px] uppercase tracking-[0.18em] text-[#5A5A60]">分類</span>
          {[
            { value: 'all', label: '全部' },
            { value: 'receipt', label: '收款' },
            { value: 'payment', label: '付款' },
          ].map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setTab(f.value as Tab)}
              className={`rounded-md border px-2 py-1 text-[11px] transition-colors ${
                tab === f.value
                  ? 'border-[#E8A020]/60 bg-[#E8A020]/10 text-[#E8A020]'
                  : 'border-[#3A3A42] text-[#888892] hover:border-[#5A5A60]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <DataTable<NoteRow>
          columns={[
            {
              key: 'docNo',
              label: '票據單號',
              render: (r) => <span className="font-mono text-[#E8E8EB]">{r.docNo}</span>,
            },
            {
              key: 'noteType',
              label: '收/付',
              render: (r) => (
                <span className={r.noteType?.toUpperCase() === 'R' ? 'text-[#22D88F]' : 'text-[#E8A020]'}>
                  {r.noteType?.toUpperCase() === 'R' ? '收款' : '付款'}
                </span>
              ),
            },
            {
              key: 'paymentMethod',
              label: '方式',
              render: (r) => <span>{PM_LABEL[r.paymentMethod?.toUpperCase()] ?? r.paymentMethod ?? '—'}</span>,
            },
            {
              key: 'partnerId',
              label: '對象',
              render: (r) => <span className="font-mono text-[10px]">{r.partnerId}</span>,
            },
            {
              key: 'noteDate',
              label: '日期',
              render: (r) => fmtDate(r.noteDate),
            },
            {
              key: 'amount',
              label: '金額',
              align: 'right',
              render: (r) => <span className="font-mono">{fmtMoney(r.amount)}</span>,
            },
            {
              key: 'status',
              label: '狀態',
              render: (r) => <StatusBadge status={r.status} />,
            },
          ]}
          rows={filtered}
          loading={loading}
          emptyMessage="尚無票據記錄"
        />
        <p className="text-[10px] text-[#5A5A60]">
          ⚠️ 新增收款 / 付款 + 自動沖應收應付功能屬 P5/後續軌、本軌僅展示列表 + 統計
        </p>
      </section>
    </div>
  );
}
