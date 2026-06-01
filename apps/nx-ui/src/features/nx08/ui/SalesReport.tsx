// apps/nx-ui/src/features/nx08/ui/SalesReport.tsx
// v1.2 階段 H P3c：銷售報表（產品 / 客戶 / 員工角度切換）
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
import {
  getCustomerInsight,
  getProductSales,
  getSalesRanking,
} from '@/features/nx08/api';

import {
  CHART_COLORS,
  ChartWrapper,
  DataTable,
  PageHeader,
  StatCard,
  chartTooltipStyle,
  fmtMoney,
} from './common';

type Angle = 'product' | 'customer' | 'employee';

export function SalesReport() {
  const [angle, setAngle] = useState<Angle>('product');
  const [productData, setProductData] = useState<Awaited<ReturnType<typeof getProductSales>> | null>(null);
  const [customerData, setCustomerData] = useState<Awaited<ReturnType<typeof getCustomerInsight>> | null>(null);
  const [employeeData, setEmployeeData] = useState<Awaited<ReturnType<typeof getSalesRanking>> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (angle === 'product') {
        const data = await getProductSales();
        setProductData(data);
      } else if (angle === 'customer') {
        const data = await getCustomerInsight();
        setCustomerData(data);
      } else {
        const data = await getSalesRanking();
        setEmployeeData(data);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [angle]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="銷售報表"
        subtitle="產品 / 客戶 / 員工三角度切換、排行 + 趨勢"
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

      {/* 角度切換 */}
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-[#2A2A30] bg-[#0A0A0C]/40 px-3 py-2">
        <span className="text-[10px] uppercase tracking-[0.18em] text-[#5A5A60]">分析角度</span>
        {(
          [
            { value: 'product', label: '產品' },
            { value: 'customer', label: '客戶' },
            { value: 'employee', label: '員工' },
          ] as const
        ).map((a) => (
          <button
            key={a.value}
            type="button"
            onClick={() => setAngle(a.value)}
            className={cn(
              'rounded-md border px-2.5 py-1 text-xs transition-colors',
              angle === a.value
                ? 'border-[#E8A020]/60 bg-[#E8A020]/10 text-[#E8A020]'
                : 'border-[#3A3A42] text-[#888892] hover:border-[#5A5A60]',
            )}
          >
            {a.label}
          </button>
        ))}
      </div>

      {/* 產品角度 */}
      {angle === 'product' && productData ? (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#888892]">
            產品銷售排行（{productData.period}、Top 10）
          </h2>
          {productData.topProducts.length > 0 ? (
            <>
              <ChartWrapper title="銷售金額" height={320}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={productData.topProducts.map((p) => ({
                      name: p.partName ?? p.partNo ?? p.partId.slice(0, 8),
                      amount: p.amtSum,
                      qty: p.qtySum,
                    }))}
                    layout="vertical"
                    margin={{ left: 100 }}
                  >
                    <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
                    <XAxis type="number" stroke={CHART_COLORS.axis} fontSize={11} />
                    <YAxis dataKey="name" type="category" stroke={CHART_COLORS.axis} fontSize={11} width={100} />
                    <Tooltip {...chartTooltipStyle} formatter={(v: number) => fmtMoney(v)} />
                    <Bar dataKey="amount" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartWrapper>
              <DataTable
                columns={[
                  {
                    key: 'rank',
                    label: '名次',
                    render: (_p: unknown, idx?: number) => <span className="font-mono">#{(idx ?? 0) + 1}</span>,
                  } as never,
                  {
                    key: 'partNo',
                    label: '料號',
                    render: (p) => <span className="font-mono text-xs">{p.partNo}</span>,
                  },
                  {
                    key: 'partName',
                    label: '品名',
                    render: (p) => <span>{p.partName}</span>,
                  },
                  {
                    key: 'qtySum',
                    label: '銷量',
                    align: 'right',
                    render: (p) => <span className="font-mono">{p.qtySum.toLocaleString('zh-TW')}</span>,
                  },
                  {
                    key: 'amtSum',
                    label: '銷售金額',
                    align: 'right',
                    render: (p) => <span className="font-mono text-[#E8A020]">{fmtMoney(p.amtSum)}</span>,
                  },
                ]}
                rows={productData.topProducts.map((p, idx) => ({ id: p.partId + '_' + idx, ...p }))}
                loading={loading}
                emptyMessage="尚無產品銷售資料"
              />
            </>
          ) : (
            <div className="rounded-md border border-dashed border-[#2A2A30] bg-[#0A0A0C]/30 px-4 py-12 text-center text-xs text-[#5A5A60]">
              本期無產品銷售
            </div>
          )}
        </section>
      ) : null}

      {/* 客戶角度（VIP + 流失預警） */}
      {angle === 'customer' && customerData ? (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#888892]">客戶分析</h2>
          {customerData.vipCustomers && customerData.vipCustomers.length > 0 ? (
            <ChartWrapper title="VIP 客戶（採購金額 Top）" height={260}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={customerData.vipCustomers.slice(0, 10).map((c) => ({
                    name: c.customerName ?? c.customerId.slice(0, 8),
                    amount: Number(c.totalAmount ?? 0),
                  }))}
                  layout="vertical"
                  margin={{ left: 100 }}
                >
                  <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
                  <XAxis type="number" stroke={CHART_COLORS.axis} fontSize={11} />
                  <YAxis dataKey="name" type="category" stroke={CHART_COLORS.axis} fontSize={11} width={100} />
                  <Tooltip {...chartTooltipStyle} formatter={(v: number) => fmtMoney(v)} />
                  <Bar dataKey="amount" fill={CHART_COLORS.success} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartWrapper>
          ) : null}
          {customerData.churnRisk && customerData.churnRisk.length > 0 ? (
            <div className="rounded-md border border-[#E26060]/30 bg-[#E26060]/8 px-4 py-3">
              <h3 className="mb-2 text-xs font-semibold text-[#E26060]">⚠️ 流失預警（90 天無下單）</h3>
              <div className="space-y-1">
                {customerData.churnRisk.slice(0, 10).map((c) => (
                  <div key={c.customerId} className="flex justify-between text-xs">
                    <span>{c.customerName ?? c.customerId}</span>
                    <span className="font-mono text-[10px] text-[#5A5A60]">
                      最後下單：{c.lastOrderDate ?? '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {(!customerData.vipCustomers || customerData.vipCustomers.length === 0) &&
            (!customerData.churnRisk || customerData.churnRisk.length === 0) ? (
            <div className="rounded-md border border-dashed border-[#2A2A30] bg-[#0A0A0C]/30 px-4 py-12 text-center text-xs text-[#5A5A60]">
              尚無客戶資料
            </div>
          ) : null}
        </section>
      ) : null}

      {/* 員工角度（銷售排行） */}
      {angle === 'employee' && employeeData ? (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#888892]">員工業績排行</h2>
          {employeeData.rankings && employeeData.rankings.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatCard
                  label="員工人數"
                  value={String(employeeData.rankings.length)}
                  hint="有銷售記錄"
                />
                <StatCard
                  label="銷售總計"
                  value={fmtMoney(
                    employeeData.rankings.reduce((acc, r) => acc + Number(r.totalAmount ?? 0), 0),
                  )}
                  tone="amber"
                />
                <StatCard
                  label="平均業績"
                  value={fmtMoney(
                    employeeData.rankings.reduce((acc, r) => acc + Number(r.totalAmount ?? 0), 0) /
                      Math.max(1, employeeData.rankings.length),
                  )}
                />
              </div>
              <ChartWrapper title="員工業績排行" height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={employeeData.rankings.slice(0, 10).map((r) => ({
                      name: r.userName ?? r.userId.slice(0, 8),
                      amount: Number(r.totalAmount ?? 0),
                      soCount: r.soCount,
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
            </>
          ) : (
            <div className="rounded-md border border-dashed border-[#2A2A30] bg-[#0A0A0C]/30 px-4 py-12 text-center text-xs text-[#5A5A60]">
              尚無員工業績資料
            </div>
          )}
        </section>
      ) : null}

      {loading ? (
        <div className="py-12 text-center text-xs text-[#5A5A60]">載入中...</div>
      ) : null}
    </div>
  );
}
