// apps/nx-ui/src/features/nx08/ui/OpsReport.tsx
// v1.2 階段 H P3f：營運報表（全公司 KPI / 部門業績 / KPI 達成 / BCG matrix、高權限）
'use client';

import { useCallback, useEffect, useState } from 'react';
import { Lock, RefreshCw } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';

import { cn } from '@/lib/utils';
import {
  getBcgMatrix,
  getDeptPerf,
  getKpiGap,
} from '@/features/nx08/api';
import { useExportExcel } from '@/features/nx08/hooks/useExportExcel';

import {
  CHART_COLORS,
  ChartWrapper,
  ExportButton,
  KpiCard,
  ResponsiveTable,
  PageHeader,
  StatCard,
  chartTooltipStyle,
  fmtMoney,
} from './common';

const BCG_COLORS: Record<string, string> = {
  STAR: CHART_COLORS.primary,
  CASH_COW: CHART_COLORS.success,
  QUESTION: CHART_COLORS.primary,
  DOG: CHART_COLORS.danger,
};

const BCG_LABEL: Record<string, string> = {
  STAR: '⭐ 明星',
  CASH_COW: '💰 金牛',
  QUESTION: '❓ 問題',
  DOG: '🐕 落水狗',
};

export function OpsReport() {
  const [dept, setDept] = useState<Awaited<ReturnType<typeof getDeptPerf>> | null>(null);
  const [kpi, setKpi] = useState<Awaited<ReturnType<typeof getKpiGap>> | null>(null);
  const [bcg, setBcg] = useState<Awaited<ReturnType<typeof getBcgMatrix>> | null>(null);
  const [loading, setLoading] = useState(false);
  const [permError, setPermError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { exportToExcel, exporting } = useExportExcel();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPermError(false);
    try {
      const [d, k, b] = await Promise.all([
        getDeptPerf().catch((e: Error) => {
          if (e.message.includes('403') || e.message.includes('401')) setPermError(true);
          return null;
        }),
        getKpiGap().catch(() => null),
        getBcgMatrix().catch(() => null),
      ]);
      setDept(d);
      setKpi(k);
      setBcg(b);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (permError) {
    return (
      <div className="space-y-6">
        <PageHeader title="營運報表" subtitle="全公司 KPI 儀表（高權限）" />
        <div className="rounded-md border border-[#E8A020]/40 bg-[#E8A020]/8 px-4 py-12 text-center">
          <Lock className="mx-auto mb-2 size-8 text-[#E8A020]" />
          <p className="text-sm text-[#E8A020]">需 SYSADMIN 或 OWNER 權限</p>
          <p className="mt-1 text-[10px] text-[#5A5A60]">營運報表為高層級儀表、請洽系統管理員授權</p>
        </div>
      </div>
    );
  }

  const totalDeptAmount = (dept?.depts ?? []).reduce(
    (acc, d) => acc + Number(d.totalAmount ?? 0),
    0,
  );
  const kpiAvgAchieve =
    (kpi?.items ?? []).reduce((acc, k) => acc + Number(k.achievePct ?? 0), 0) /
    Math.max(1, (kpi?.items ?? []).length);

  const bcgGroups = (bcg?.items ?? []).reduce<Record<string, number>>((acc, it) => {
    acc[it.category] = (acc[it.category] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <PageHeader
        title="營運報表"
        subtitle="部門業績 / KPI 達成 / BCG 商品定位（全公司、需 OWNER 權限）"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ExportButton
              loading={exporting}
              disabled={!dept && !kpi && !bcg}
              onClick={async () => {
                const sheets: Array<{ name: string; rows: Array<Record<string, unknown>> }> = [];
                if (dept?.depts?.length) {
                  sheets.push({
                    name: '部門業績',
                    rows: dept.depts.map((d, idx) => ({
                      名次: idx + 1,
                      部門: d.deptName ?? d.deptId,
                      SO張數: d.soCount,
                      業績金額: Number(d.totalAmount ?? 0),
                    })),
                  });
                }
                if (kpi?.items?.length) {
                  sheets.push({
                    name: 'KPI 達成',
                    rows: kpi.items.map((k) => ({
                      員工: k.userName ?? k.userId,
                      目標: Number(k.target),
                      實績: Number(k.actual),
                      差額: Number(k.gap),
                      達成率: Number(k.achievePct),
                    })),
                  });
                }
                if (bcg?.items?.length) {
                  sheets.push({
                    name: 'BCG 商品定位',
                    rows: bcg.items.map((it) => ({
                      料號: it.partNo ?? it.partId,
                      品名: it.partName ?? '',
                      分類: it.category,
                      成長率: Number(it.growthRate ?? 0),
                      市佔率: Number(it.marketShare ?? 0),
                    })),
                  });
                }
                await exportToExcel({
                  fileName: '營運報表',
                  meta: {
                    部門數: dept?.depts?.length ?? 0,
                    KPI追蹤人數: kpi?.items?.length ?? 0,
                    BCG商品數: bcg?.items?.length ?? 0,
                  },
                  sheets: sheets.length > 0 ? sheets : [{ name: '營運', rows: [] }],
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

      {/* 全公司 4 KPI */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#888892]">全公司指標</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <KpiCard
            label="部門數"
            value={String(dept?.depts?.length ?? 0)}
            hint="有業績的部門"
          />
          <KpiCard label="部門業績合計" value={fmtMoney(totalDeptAmount)} tone="amber" />
          <KpiCard
            label="KPI 平均達成"
            value={`${kpiAvgAchieve.toFixed(1)}%`}
            tone={kpiAvgAchieve >= 100 ? 'green' : kpiAvgAchieve >= 80 ? 'amber' : 'red'}
            hint={`共 ${kpi?.items?.length ?? 0} 人`}
          />
          <KpiCard
            label="商品定位"
            value={String(bcg?.items?.length ?? 0)}
            hint="BCG matrix 已分類"
            tone="muted"
          />
        </div>
      </section>

      {/* 部門業績 */}
      {dept?.depts && dept.depts.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#888892]">部門業績排行</h2>
          <ChartWrapper title="部門總業績" height={260}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dept.depts.map((d) => ({
                  name: d.deptName ?? d.deptId.slice(0, 8),
                  amount: Number(d.totalAmount ?? 0),
                  count: d.soCount ?? 0,
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
        </section>
      ) : null}

      {/* KPI 達成 */}
      {kpi?.items && kpi.items.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#888892]">員工 KPI 達成率</h2>
          <ResponsiveTable
            columns={[
              {
                key: 'userName',
                label: '員工',
                asTitle: true,
                render: (it) => <span>{it.userName ?? it.userId.slice(0, 8)}</span>,
              },
              {
                key: 'target',
                label: '目標',
                align: 'right',
                render: (it) => <span className="font-mono">{fmtMoney(it.target)}</span>,
              },
              {
                key: 'actual',
                label: '實績',
                align: 'right',
                render: (it) => <span className="font-mono text-[#22D88F]">{fmtMoney(it.actual)}</span>,
              },
              {
                key: 'gap',
                label: '差額',
                align: 'right',
                render: (it) => (
                  <span className={cn('font-mono', Number(it.gap) >= 0 ? 'text-[#22D88F]' : 'text-[#E26060]')}>
                    {fmtMoney(it.gap)}
                  </span>
                ),
              },
              {
                key: 'achievePct',
                label: '達成率',
                align: 'right',
                render: (it) => {
                  const pct = Number(it.achievePct ?? 0);
                  const color =
                    pct >= 100 ? 'border-[#22D88F]/40 bg-[#22D88F]/10 text-[#22D88F]'
                      : pct >= 80 ? 'border-[#E8A020]/40 bg-[#E8A020]/10 text-[#E8A020]'
                        : 'border-[#E26060]/40 bg-[#E26060]/10 text-[#E26060]';
                  return (
                    <span className={cn('inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[10px]', color)}>
                      {pct.toFixed(1)}%
                    </span>
                  );
                },
              },
            ]}
            rows={kpi.items.map((k, idx) => ({ id: k.userId + '_' + idx, ...k }))}
            loading={loading}
            emptyMessage="尚無 KPI 設定"
          />
        </section>
      ) : null}

      {/* BCG matrix */}
      {bcg?.items && bcg.items.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#888892]">
            BCG 商品定位（市佔 × 成長率）
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(bcgGroups).map(([cat, count]) => (
              <StatCard
                key={cat}
                label={BCG_LABEL[cat] ?? cat}
                value={String(count)}
                hint="項商品"
                tone={
                  cat === 'STAR' ? 'amber' :
                  cat === 'CASH_COW' ? 'green' :
                  cat === 'QUESTION' ? 'amber' :
                  'red'
                }
              />
            ))}
          </div>
          <ChartWrapper title="BCG matrix 散布圖" height={360}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
                <XAxis
                  dataKey="marketShare"
                  name="市佔率"
                  type="number"
                  stroke={CHART_COLORS.axis}
                  fontSize={11}
                  label={{ value: '市佔率 →', position: 'insideBottom', fill: CHART_COLORS.axis, fontSize: 10 }}
                />
                <YAxis
                  dataKey="growthRate"
                  name="成長率"
                  type="number"
                  stroke={CHART_COLORS.axis}
                  fontSize={11}
                  label={{ value: '成長率 ↑', angle: -90, position: 'insideLeft', fill: CHART_COLORS.axis, fontSize: 10 }}
                />
                <ZAxis range={[60, 200]} />
                <Tooltip
                  {...chartTooltipStyle}
                  cursor={{ strokeDasharray: '3 3', stroke: CHART_COLORS.grid }}
                />
                <Scatter
                  data={bcg.items.map((it) => ({
                    name: it.partName ?? it.partNo,
                    marketShare: Number(it.marketShare ?? 0),
                    growthRate: Number(it.growthRate ?? 0),
                    category: it.category,
                  }))}
                >
                  {bcg.items.map((it, idx) => (
                    <Cell key={idx} fill={BCG_COLORS[it.category] ?? CHART_COLORS.muted} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </ChartWrapper>
          <p className="text-[10px] text-[#5A5A60]">
            高成長 + 高市佔 = ⭐ 明星｜低成長 + 高市佔 = 💰 金牛｜高成長 + 低市佔 = ❓ 問題｜低成長 + 低市佔 = 🐕 落水狗
          </p>
        </section>
      ) : null}

      {!loading && !dept && !kpi && !bcg ? (
        <div className="rounded-md border border-dashed border-[#2A2A30] bg-[#0A0A0C]/30 px-4 py-12 text-center text-xs text-[#5A5A60]">
          目前無營運資料
        </div>
      ) : null}
    </div>
  );
}
