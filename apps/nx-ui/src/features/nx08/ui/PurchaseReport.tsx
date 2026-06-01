// apps/nx-ui/src/features/nx08/ui/PurchaseReport.tsx
// v1.2 階段 H P3b：進貨報表（接 purchasing-dashboard 3 endpoint）
'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
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
import { getPoStats, getPriceCompare, getSupplierGrade } from '@/features/nx08/api';

import {
  CHART_COLORS,
  ChartWrapper,
  PageHeader,
  ResponsiveTable,
  StatCard,
  StatusBadge,
  chartTooltipStyle,
  fmtMoney,
} from './common';

export function PurchaseReport() {
  const [supplierGrade, setSupplierGrade] = useState<Awaited<ReturnType<typeof getSupplierGrade>> | null>(null);
  const [priceCompare, setPriceCompare] = useState<Awaited<ReturnType<typeof getPriceCompare>> | null>(null);
  const [poStats, setPoStats] = useState<Awaited<ReturnType<typeof getPoStats>> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sg, pc, ps] = await Promise.all([
        getSupplierGrade().catch(() => null),
        getPriceCompare().catch(() => null),
        getPoStats().catch(() => null),
      ]);
      setSupplierGrade(sg);
      setPriceCompare(pc);
      setPoStats(ps);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="進貨報表"
        subtitle="供應商分布 / 採購單統計 / 比價分析（近 90 天）"
        actions={
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#2A2A30] bg-[#0A0A0C] px-2.5 text-xs text-[#B8B8C0] hover:border-[#E8A020]/40 hover:text-[#E8A020]"
          >
            <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} /> 重新整理
          </button>
        }
      />

      {error ? (
        <div className="rounded-md border border-[#E26060]/40 bg-[#E26060]/10 px-3 py-2 text-xs text-[#E26060]">
          {error}
        </div>
      ) : null}

      {/* PO 狀態統計 */}
      {poStats ? (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#888892]">採購單統計</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard
              label="採購單總數"
              value={String(poStats.totalCount ?? 0)}
              hint={poStats.period ?? ''}
            />
            <StatCard
              label="採購金額總計"
              value={fmtMoney(poStats.totalAmount ?? 0)}
              tone="amber"
            />
            <StatCard
              label="狀態分布"
              value={`${poStats.byStatus?.length ?? 0} 種`}
              tone="muted"
            />
          </div>
          {poStats.byStatus && poStats.byStatus.length > 0 ? (
            <ChartWrapper title="採購單狀態分布" height={240}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={poStats.byStatus.map((b) => ({
                    name: b.status,
                    count: b._count?._all ?? 0,
                    amount: Number(b._sum?.totalAmount ?? 0),
                  }))}
                >
                  <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
                  <XAxis dataKey="name" stroke={CHART_COLORS.axis} fontSize={11} />
                  <YAxis stroke={CHART_COLORS.axis} fontSize={11} />
                  <Tooltip {...chartTooltipStyle} formatter={(v: number) => v.toLocaleString('zh-TW')} />
                  <Bar dataKey="count" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartWrapper>
          ) : null}
        </section>
      ) : null}

      {/* 供應商排行 */}
      {supplierGrade && supplierGrade.topSuppliers?.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#888892]">
            供應商排行（{supplierGrade.period}）
          </h2>
          <ChartWrapper title="採購金額前 10 大供應商" height={280}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={supplierGrade.topSuppliers.slice(0, 10).map((s) => ({
                  name: s.supplierName ?? s.supplierId.slice(0, 8),
                  amount: Number(s.totalAmount ?? 0),
                  poCount: s.poCount ?? 0,
                }))}
                layout="vertical"
                margin={{ left: 80 }}
              >
                <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
                <XAxis type="number" stroke={CHART_COLORS.axis} fontSize={11} />
                <YAxis dataKey="name" type="category" stroke={CHART_COLORS.axis} fontSize={11} width={80} />
                <Tooltip {...chartTooltipStyle} formatter={(v: number) => fmtMoney(v)} />
                <Bar dataKey="amount" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartWrapper>
          <ResponsiveTable
            columns={[
              {
                key: 'rank',
                label: '名次',
                hideOnMobile: true,
                render: (_: unknown, idx?: number) => <span className="font-mono">#{(idx ?? 0) + 1}</span>,
              } as never,
              {
                key: 'supplierName',
                label: '供應商',
                asTitle: true,
                render: (s) => <span>{s.supplierName ?? s.supplierId}</span>,
              },
              {
                key: 'poCount',
                label: 'PO 數',
                align: 'right',
                render: (s) => <span className="font-mono">{s.poCount}</span>,
              },
              {
                key: 'totalAmount',
                label: '採購金額',
                align: 'right',
                render: (s) => <span className="font-mono text-[#E8A020]">{fmtMoney(s.totalAmount)}</span>,
              },
            ]}
            rows={supplierGrade.topSuppliers.slice(0, 10).map((s, idx) => ({ id: s.supplierId, ...s, idx }))}
            loading={loading}
            emptyMessage="尚無供應商資料"
          />
        </section>
      ) : null}

      {/* 比價分析 */}
      {priceCompare && priceCompare.items?.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#888892]">
            比價分析（樣本 {priceCompare.sampleSize}）
          </h2>
          <ResponsiveTable
            columns={[
              {
                key: 'partNo',
                label: '料號',
                hideOnMobile: true,
                render: (it) => <span className="font-mono text-xs">{it.partNo ?? it.partId}</span>,
              },
              {
                key: 'partName',
                label: '品名',
                asTitle: true,
                render: (it) => (
                  <span>
                    <span className="font-mono text-[10px] text-[#5A5A60]">{it.partNo ?? ''}</span>{' '}
                    {it.partName ?? '—'}
                  </span>
                ),
              },
              {
                key: 'supplierCount',
                label: '供應商數',
                align: 'right',
                render: (it) => <StatusBadge status={String(it.supplierCount)} />,
              },
              {
                key: 'minPrice',
                label: '最低價',
                align: 'right',
                render: (it) => <span className="font-mono text-[#22D88F]">{fmtMoney(it.minPrice)}</span>,
              },
              {
                key: 'maxPrice',
                label: '最高價',
                align: 'right',
                render: (it) => <span className="font-mono text-[#E26060]">{fmtMoney(it.maxPrice)}</span>,
              },
              {
                key: 'avgPrice',
                label: '均價',
                align: 'right',
                render: (it) => <span className="font-mono">{fmtMoney(it.avgPrice)}</span>,
              },
            ]}
            rows={priceCompare.items.slice(0, 30).map((it, idx) => ({ id: it.partId + '_' + idx, ...it }))}
            loading={loading}
            emptyMessage="尚無比價資料"
          />
        </section>
      ) : null}

      {!loading && !supplierGrade && !poStats && !priceCompare ? (
        <div className="rounded-md border border-dashed border-[#2A2A30] bg-[#0A0A0C]/30 px-4 py-12 text-center text-xs text-[#5A5A60]">
          尚無進貨資料
        </div>
      ) : null}
    </div>
  );
}
