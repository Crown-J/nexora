// apps/nx-ui/src/features/nx08/ui/PersonalMonthlyReport.tsx
// v1.2 階段 H P3a：個人月報
'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, User } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  getPersonalMonthlyReport,
  listUsersForReport,
  type PersonalMonthlyReport,
} from '@data/endpoints/nx08/api';
import { useExportExcel } from '@/features/nx08/hooks/useExportExcel';

import {
  ExportButton,
  KpiCard,
  makePeriod,
  PageHeader,
  PeriodPicker,
  StatCard,
  fmtMoney,
  type Period,
} from './common';

export function PersonalMonthlyReportView() {
  const [period, setPeriod] = useState<Period>(makePeriod('month'));
  const [data, setData] = useState<PersonalMonthlyReport | null>(null);
  const [users, setUsers] = useState<Array<{ id: string; username: string; displayName: string }>>([]);
  const [userId, setUserId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { exportToExcel, exporting } = useExportExcel();

  // 載 user 列表（讓「員工」下拉可選；後端會 enforce 權限）
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const u = await listUsersForReport();
        if (alive) setUsers(u);
      } catch {
        if (alive) setUsers([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPersonalMonthlyReport({
        periodStart: period.start,
        periodEnd: period.end,
        userId: userId || undefined,
      });
      setData(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [period.start, period.end, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="個人月報"
        subtitle="業績（銷貨額 + 毛利）/ 開單數 / 撿貨件數 / 跑客戶家數"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ExportButton
              loading={exporting}
              disabled={!data}
              onClick={async () => {
                if (!data) return;
                const userLabel = users.find((u) => u.id === userId)?.displayName ?? '我';
                await exportToExcel({
                  fileName: `個人月報_${userLabel}`,
                  meta: {
                    員工: userLabel,
                    期間: `${data.periodStart} ~ ${data.periodEnd}`,
                    視角: data.isSelf ? '自己' : '負責人視角',
                  },
                  sheets: [
                    {
                      name: '業績',
                      rows: [
                        { 項目: '銷貨額', 金額: Number(data.performance.salesAmount) },
                        { 項目: '銷貨成本', 金額: Number(data.performance.cogsAmount) },
                        { 項目: '毛利', 金額: Number(data.performance.grossProfit) },
                        { 項目: '毛利率(%)', 金額: Number(data.performance.grossMarginPct) },
                      ],
                    },
                    {
                      name: '開單數',
                      rows: [
                        { 單別: '銷貨單 SO', 張數: data.orderCounts.so },
                        { 單別: '報價單 QT', 張數: data.orderCounts.qt },
                        { 單別: '採購單 PO', 張數: data.orderCounts.po },
                      ],
                    },
                    {
                      name: '工作量',
                      rows: [
                        { 項目: '撿貨件數', 數量: Number(data.operations.pickQty) },
                        { 項目: '出貨件數', 數量: Number(data.operations.shipQty) },
                        { 項目: '跑客戶家數', 數量: data.operations.customerCount },
                      ],
                    },
                  ],
                });
              }}
            />
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#2A2A30] bg-[#0A0A0C] px-2.5 text-xs text-[#B8B8C0] hover:border-[#E8A020]/40 hover:text-[#E8A020]"
            >
              <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} /> 重新整理
            </button>
          </div>
        }
      />

      {error ? (
        <div className="rounded-md border border-[#E26060]/40 bg-[#E26060]/10 px-3 py-2 text-xs text-[#E26060]">
          {error}
        </div>
      ) : null}

      {/* 篩選列：員工 + 期間 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-md border border-[#2A2A30] bg-[#0A0A0C]/40 px-3 py-2">
          <User className="size-3.5 text-[#5A5A60]" />
          <span className="text-[10px] uppercase tracking-[0.18em] text-[#5A5A60]">員工</span>
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="h-7 rounded-md border border-[#2A2A30] bg-[#0A0A0C] px-2 text-xs text-[#E8E8EB] outline-none focus:border-[#E8A020]/60"
          >
            <option value="">— 我 —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.displayName} ({u.username})
              </option>
            ))}
          </select>
          {data && !data.isSelf ? (
            <span className="text-[10px] text-[#E8A020]">負責人視角</span>
          ) : null}
        </div>
        <PeriodPicker value={period} onChange={setPeriod} modes={['day', 'month']} />
      </div>

      {data ? (
        <>
          {/* 業績兩卡：銷貨額 + 毛利 */}
          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#888892]">業績</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <KpiCard
                label="銷貨額"
                value={fmtMoney(data.performance.salesAmount)}
                tone="amber"
                hint="SO 總額"
              />
              <KpiCard
                label="毛利"
                value={fmtMoney(data.performance.grossProfit)}
                tone="green"
                hint="銷貨額 − 成本"
              />
              <KpiCard
                label="毛利率"
                value={`${data.performance.grossMarginPct}%`}
                tone={
                  Number(data.performance.grossMarginPct) >= 20
                    ? 'green'
                    : Number(data.performance.grossMarginPct) >= 10
                      ? 'amber'
                      : 'red'
                }
              />
              <KpiCard label="銷貨成本" value={fmtMoney(data.performance.cogsAmount)} tone="muted" />
            </div>
          </section>

          {/* 開單數 3 卡 */}
          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#888892]">開單數</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard label="銷貨單 SO" value={String(data.orderCounts.so)} tone="green" />
              <StatCard label="報價單 QT" value={String(data.orderCounts.qt)} />
              <StatCard label="採購單 PO" value={String(data.orderCounts.po)} tone="amber" />
            </div>
          </section>

          {/* 工作量 3 卡 */}
          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#888892]">工作量</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard
                label="撿貨件數"
                value={fmtMoney(data.operations.pickQty)}
                hint="Nx03 撿貨單明細數量加總"
              />
              <StatCard
                label="出貨件數"
                value={fmtMoney(data.operations.shipQty)}
                hint="Nx06 送貨單明細數量加總（外務）"
              />
              <StatCard
                label="跑客戶家數"
                value={String(data.operations.customerCount)}
                tone="amber"
                hint="送貨單停靠唯一 partnerId"
              />
            </div>
          </section>

          <p className="text-[10px] text-[#5A5A60]">{data.note}</p>
        </>
      ) : loading ? (
        <div className="py-12 text-center text-xs text-[#5A5A60]">載入中...</div>
      ) : null}
    </div>
  );
}
