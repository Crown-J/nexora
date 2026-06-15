// apps/nx-ui/src/features/nx08/ui/PnLReport.tsx
// v1.2 階段 H P3e：損益表（接 P1 finance/pnl endpoint、進銷淨額簡化法）
'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { cn } from '@/lib/utils';
import { getPnL, type PnL } from '@data/endpoints/nx08/api';
import { useExportExcel } from '@/features/nx08/hooks/useExportExcel';

import {
  CHART_COLORS,
  ChartWrapper,
  ExportButton,
  KpiCard,
  ResponsiveTable,
  PageHeader,
  PeriodPicker,
  chartTooltipStyle,
  fmtMoney,
  makePeriod,
  type Period,
} from './common';

export function PnLReport() {
  const [period, setPeriod] = useState<Period>(makePeriod('month'));
  const [data, setData] = useState<PnL | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { exportToExcel, exporting } = useExportExcel();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPnL({ periodStart: period.start, periodEnd: period.end });
      setData(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [period.start, period.end]);

  useEffect(() => {
    void load();
  }, [load]);

  const gm = Number(data?.grossMarginPct ?? 0);
  const op = Number(data?.opMarginPct ?? 0);
  const operatingIncome = Number(data?.operatingIncome ?? 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="損益表 PnL"
        subtitle="進銷淨額簡化法、收入 − 成本 = 毛利、毛利 − 費用 = 營業淨利"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ExportButton
              loading={exporting}
              disabled={!data}
              onClick={async () => {
                if (!data) return;
                await exportToExcel({
                  fileName: '損益表',
                  meta: { 期間: `${data.periodStart} ~ ${data.periodEnd}`, 算法: '進銷淨額簡化法' },
                  sheets: [
                    {
                      name: '損益表',
                      rows: [
                        { 科目: '銷貨總額', 金額: Number(data.revenue.gross) },
                        { 科目: '（−）銷退', 金額: -Number(data.revenue.return) },
                        { 科目: '銷貨淨額', 金額: Number(data.revenue.net) },
                        { 科目: '（−）銷貨成本', 金額: -Number(data.cogs) },
                        { 科目: '營業毛利', 金額: Number(data.grossProfit) },
                        { 科目: '毛利率(%)', 金額: Number(data.grossMarginPct) },
                        { 科目: '（−）營業費用', 金額: -Number(data.opex.total) },
                        { 科目: '營業淨利', 金額: Number(data.operatingIncome) },
                        { 科目: '營業淨利率(%)', 金額: Number(data.opMarginPct) },
                      ],
                    },
                    {
                      name: '費用明細',
                      rows: (data.opex.detail ?? []).map((d) => ({
                        科目代號: d.accountCode,
                        科目名稱: d.accountName ?? '',
                        金額: Number(d.amount),
                      })),
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

      <PeriodPicker value={period} onChange={setPeriod} />

      {data ? (
        <>
          {/* 三大數字 KPI */}
          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#888892]">關鍵指標</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <KpiCard label="銷貨淨額" value={fmtMoney(data.revenue.net)} tone="amber" hint="銷貨 − 銷退" />
              <KpiCard label="毛利" value={fmtMoney(data.grossProfit)} tone="green" hint={`毛利率 ${gm.toFixed(1)}%`} />
              <KpiCard label="營業費用" value={fmtMoney(data.opex.total)} tone="red" hint="費用合計" />
              <KpiCard
                label="營業淨利"
                value={fmtMoney(operatingIncome)}
                tone={operatingIncome >= 0 ? 'green' : 'red'}
                hint={`淨利率 ${op.toFixed(1)}%`}
              />
            </div>
          </section>

          {/* 損益表結構（瀑布視覺） */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#888892]">損益結構</h2>
            <ChartWrapper title="收入 → 毛利 → 淨利" height={280}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: '銷貨總額', value: Number(data.revenue.gross), tone: CHART_COLORS.primary },
                    { name: '銷退', value: -Number(data.revenue.return), tone: CHART_COLORS.danger },
                    { name: '銷貨成本', value: -Number(data.cogs), tone: CHART_COLORS.primary },
                    { name: '毛利', value: Number(data.grossProfit), tone: CHART_COLORS.success },
                    { name: '營業費用', value: -Number(data.opex.total), tone: CHART_COLORS.danger },
                    { name: '營業淨利', value: operatingIncome, tone: operatingIncome >= 0 ? CHART_COLORS.success : CHART_COLORS.danger },
                  ]}
                >
                  <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
                  <XAxis dataKey="name" stroke={CHART_COLORS.axis} fontSize={11} />
                  <YAxis stroke={CHART_COLORS.axis} fontSize={10} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip {...chartTooltipStyle} formatter={(v: number) => fmtMoney(v)} />
                  <Bar dataKey="value" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartWrapper>
          </section>

          {/* 表格式損益表（會計師看法） */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#888892]">損益表（會計式）</h2>
            <div className="overflow-hidden rounded-md border border-[#2A2A30]">
              <table className="w-full text-[11px] sm:text-xs">
                <tbody className="divide-y divide-[#1A1A20]">
                  <tr>
                    <td className="px-2 py-2 text-[#B8B8C0] sm:px-3">銷貨總額</td>
                    <td className="px-3 py-2 text-right font-mono">{fmtMoney(data.revenue.gross)}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 pl-6 text-[#888892]">（−）銷退</td>
                    <td className="px-3 py-2 text-right font-mono text-[#E26060]">({fmtMoney(data.revenue.return)})</td>
                  </tr>
                  <tr className="bg-[#0A0A0C]/40 font-semibold">
                    <td className="px-3 py-2">銷貨淨額</td>
                    <td className="px-3 py-2 text-right font-mono text-[#E8A020]">{fmtMoney(data.revenue.net)}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 pl-6 text-[#888892]">（−）銷貨成本</td>
                    <td className="px-3 py-2 text-right font-mono text-[#E26060]">({fmtMoney(data.cogs)})</td>
                  </tr>
                  <tr className="bg-[#0A0A0C]/40 font-semibold">
                    <td className="px-3 py-2 text-[#22D88F]">
                      <TrendingUp className="mr-1 inline size-3.5" />
                      營業毛利
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-[#22D88F]">
                      {fmtMoney(data.grossProfit)} <span className="text-[10px] text-[#5A5A60]">({gm.toFixed(1)}%)</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 pl-6 text-[#888892]">（−）營業費用</td>
                    <td className="px-3 py-2 text-right font-mono text-[#E26060]">({fmtMoney(data.opex.total)})</td>
                  </tr>
                  <tr className={cn('font-bold', operatingIncome >= 0 ? 'bg-[#22D88F]/8' : 'bg-[#E26060]/8')}>
                    <td className={cn('px-3 py-2', operatingIncome >= 0 ? 'text-[#22D88F]' : 'text-[#E26060]')}>
                      {operatingIncome >= 0 ? (
                        <TrendingUp className="mr-1 inline size-3.5" />
                      ) : (
                        <TrendingDown className="mr-1 inline size-3.5" />
                      )}
                      營業淨利
                    </td>
                    <td className={cn('px-3 py-2 text-right font-mono', operatingIncome >= 0 ? 'text-[#22D88F]' : 'text-[#E26060]')}>
                      {fmtMoney(operatingIncome)} <span className="text-[10px] text-[#5A5A60]">({op.toFixed(1)}%)</span>
                    </td>
                  </tr>
                  {/* 02 對齊第二批 C 軌 CP2 2026-06-06：未開發票金額底部呈現（總經理拍板） */}
                  {data.revenue.noInvoice !== undefined ? (
                    <tr className="bg-[#0A0A0C]/30">
                      <td className="px-3 py-2 pl-6 text-[10px] uppercase tracking-wider text-[#888892]">
                        其中：未開發票銷貨（含 {data.revenue.noInvoiceCount ?? 0} 筆）
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-[10px] text-[#888892]">
                        {fmtMoney(data.revenue.noInvoice)}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>

          {/* 費用明細（按 5xxx 會計科目） */}
          {data.opex.detail && data.opex.detail.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#888892]">
                費用明細（按會計科目、排除 5100 銷貨成本）
              </h2>
              <ResponsiveTable
                columns={[
                  {
                    key: 'accountCode',
                    label: '科目代號',
                    hideOnMobile: true,
                    render: (it) => <span className="font-mono text-xs">{it.accountCode}</span>,
                  },
                  {
                    key: 'accountName',
                    label: '科目名稱',
                    asTitle: true,
                    render: (it) => (
                      <span>
                        <span className="font-mono text-[10px] text-[#5A5A60]">{it.accountCode}</span>{' '}
                        {it.accountName ?? '—'}
                      </span>
                    ),
                  },
                  {
                    key: 'amount',
                    label: '金額',
                    align: 'right',
                    render: (it) => <span className="font-mono text-[#E26060]">{fmtMoney(it.amount)}</span>,
                  },
                ]}
                rows={data.opex.detail.map((d, idx) => ({ id: d.accountCode + '_' + idx, ...d }))}
                loading={loading}
                emptyMessage="本期無費用明細"
              />
            </section>
          ) : null}

          <p className="text-[10px] text-[#5A5A60]">{data.note}</p>
        </>
      ) : loading ? (
        <div className="py-12 text-center text-xs text-[#5A5A60]">載入中...</div>
      ) : null}
    </div>
  );
}
