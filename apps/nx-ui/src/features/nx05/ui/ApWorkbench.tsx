// apps/nx-ui/src/features/nx05/ui/ApWorkbench.tsx
// v1.2 階段 F P4：應付帳款工作台（彙整視圖：採購應付 + 銷退退款）
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Coins, RefreshCw, Search } from 'lucide-react';

import { getPayableView, type ApRow, type PayableViewRow } from '@/features/nx05/api';

import { DataTable, PageHeader, StatCard, StatusBadge, fmtDate, fmtMoney } from './common';
import { PaylogCreateDialog } from './PaylogCreateDialog';

type Tab = 'all' | 'ap' | 'srAllowance';

export function ApWorkbench() {
  const [aps, setAps] = useState<Array<ApRow & { kind: 'AP' }>>([]);
  const [srs, setSrs] = useState<Array<Extract<PayableViewRow, { kind: 'SR_ALLOWANCE' }>>>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [reloadTick, setReloadTick] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [paylogDialog, setPaylogDialog] = useState<{ partnerId: string } | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void (async () => {
      try {
        const res = await getPayableView({ search });
        if (alive) {
          setAps(res.ap);
          setSrs(res.srAllowance);
        }
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

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let apTotal = 0;
    let srTotal = 0;
    let todayDue = 0;
    let overdue = 0;
    for (const r of aps) {
      const bal = Number(r.balanceAmount) || 0;
      apTotal += bal;
      const due = new Date(r.dueDate);
      due.setHours(0, 0, 0, 0);
      if (due.getTime() === today.getTime()) todayDue += bal;
      if (due < today && (r.status === 'OPEN' || r.status === 'PARTIAL')) overdue += bal;
    }
    for (const r of srs) {
      srTotal += Number(r.amount) || 0;
    }
    return { apTotal, srTotal, total: apTotal + srTotal, todayDue, overdue };
  }, [aps, srs]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="應付帳款"
        subtitle="採購單（廠商確認）+ 銷退退款（兩種來源彙整）"
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <StatCard label="未付總額" value={fmtMoney(stats.total)} tone="amber" hint={`AP ${aps.length} + SR ${srs.length} 筆`} />
        <StatCard label="採購應付" value={fmtMoney(stats.apTotal)} hint="AP Ledger" />
        <StatCard label="銷退退款" value={fmtMoney(stats.srTotal)} hint="Allowance type=S" />
        <StatCard label="逾期未付" value={fmtMoney(stats.overdue)} tone="red" />
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
            { value: 'ap', label: `採購應付（${aps.length}）` },
            { value: 'srAllowance', label: `銷退退款（${srs.length}）` },
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

        {/* 採購應付（kind=AP） */}
        {(tab === 'all' || tab === 'ap') && aps.length > 0 ? (
          <div className="space-y-2">
            {tab === 'all' ? (
              <div className="text-[11px] font-semibold text-[#888892]">採購應付（{aps.length}）</div>
            ) : null}
            <DataTable
              columns={[
                {
                  key: 'docNo',
                  label: '應付單號',
                  render: (r: ApRow) => <span className="font-mono text-[#E8E8EB]">{r.docNo}</span>,
                },
                {
                  key: 'source',
                  label: '來源',
                  render: (r: ApRow) => (
                    <span className="font-mono text-[10px] text-[#888892]">
                      {r.sourceType} · {r.poId ?? r.rrId ?? r.tiId ?? '—'}
                    </span>
                  ),
                },
                {
                  key: 'supplier',
                  label: '廠商',
                  render: (r: ApRow) => <span className="font-mono text-[10px]">{r.supplierId}</span>,
                },
                {
                  key: 'apDate',
                  label: '應付日',
                  render: (r: ApRow) => fmtDate(r.apDate),
                },
                {
                  key: 'dueDate',
                  label: '到期日',
                  render: (r: ApRow) => fmtDate(r.dueDate),
                },
                {
                  key: 'balanceAmount',
                  label: '未付餘額',
                  align: 'right',
                  render: (r: ApRow) => <span className="font-mono">{fmtMoney(r.balanceAmount)}</span>,
                },
                {
                  key: 'status',
                  label: '狀態',
                  render: (r: ApRow) => <StatusBadge status={r.displayStatus ?? r.status} />,
                },
                {
                  key: 'actions',
                  label: '操作',
                  align: 'right',
                  render: (r: ApRow) => (
                    <button
                      type="button"
                      onClick={() => setPaylogDialog({ partnerId: r.supplierId })}
                      title="開付款票據沖銷（可勾多張 AP）"
                      className="inline-flex h-6 items-center gap-1 rounded-md border border-[#E8A020]/40 bg-[#E8A020]/10 px-2 text-[10px] font-medium text-[#E8A020] hover:bg-[#E8A020]/20"
                    >
                      <Coins className="size-3" /> 沖銷
                    </button>
                  ),
                },
              ]}
              rows={aps}
              loading={loading}
              emptyMessage="尚無採購應付"
            />
          </div>
        ) : null}

        {/* 銷退退款（kind=SR_ALLOWANCE） */}
        {(tab === 'all' || tab === 'srAllowance') && srs.length > 0 ? (
          <div className="space-y-2">
            {tab === 'all' ? (
              <div className="text-[11px] font-semibold text-[#888892]">銷退退款（{srs.length}）</div>
            ) : null}
            <DataTable
              columns={[
                {
                  key: 'docNo',
                  label: '折讓單號',
                  render: (r) => <span className="font-mono text-[#E8E8EB]">{r.docNo}</span>,
                },
                {
                  key: 'date',
                  label: '日期',
                  render: (r) => fmtDate(r.date),
                },
                {
                  key: 'partnerId',
                  label: '客戶',
                  render: (r) => <span className="font-mono text-[10px]">{r.partnerId}</span>,
                },
                {
                  key: 'refArId',
                  label: '原 AR',
                  render: (r) => <span className="font-mono text-[10px] text-[#888892]">{r.refArId ?? '—'}</span>,
                },
                {
                  key: 'amount',
                  label: '退款金額',
                  align: 'right',
                  render: (r) => <span className="font-mono">{fmtMoney(r.amount)}</span>,
                },
                {
                  key: 'status',
                  label: '狀態',
                  render: (r) => <StatusBadge status={r.status} />,
                },
              ]}
              rows={srs}
              loading={loading}
              emptyMessage="尚無銷退退款"
            />
          </div>
        ) : null}

        {!loading && aps.length === 0 && srs.length === 0 ? (
          <div className="rounded-md border border-dashed border-[#2A2A30] bg-[#0A0A0C]/30 px-4 py-12 text-center text-xs text-[#5A5A60]">
            尚無應付帳款
          </div>
        ) : null}

      </section>

      <PaylogCreateDialog
        open={paylogDialog != null}
        defaultNoteType="P"
        defaultPartnerId={paylogDialog?.partnerId}
        onClose={() => setPaylogDialog(null)}
        onSuccess={() => {
          setPaylogDialog(null);
          setReloadTick((t) => t + 1);
        }}
      />
    </div>
  );
}
