// apps/nx-ui/src/features/nx08/ui/InventoryReport.tsx
// v1.2 階段 H P3d：庫存報表（週轉 / 呆滯 / 低庫存）
'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Boxes, RefreshCw, Timer } from 'lucide-react';

import { cn } from '@design/utils/cn';
import { FadeInOnScroll } from '@design/motion/gsap';
import {
  getDormantParts,
  getInventoryTurnover,
  getLowStockAlert,
} from '@data/endpoints/nx08/api';
import { useExportExcel } from '@/features/nx08/hooks/useExportExcel';

import { ExportButton, PageHeader, ResponsiveTable, StatCard, StatusBadge, fmtMoney } from './common';

type Tab = 'turnover' | 'dormant' | 'lowStock';

export function InventoryReport() {
  const [tab, setTab] = useState<Tab>('turnover');
  const [turnover, setTurnover] = useState<Awaited<ReturnType<typeof getInventoryTurnover>> | null>(null);
  const [dormant, setDormant] = useState<Awaited<ReturnType<typeof getDormantParts>> | null>(null);
  const [lowStock, setLowStock] = useState<Awaited<ReturnType<typeof getLowStockAlert>> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { exportToExcel, exporting } = useExportExcel();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tv, dm, ls] = await Promise.all([
        getInventoryTurnover().catch(() => null),
        getDormantParts().catch(() => null),
        getLowStockAlert().catch(() => null),
      ]);
      setTurnover(tv);
      setDormant(dm);
      setLowStock(ls);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const turnoverCount = turnover?.items?.length ?? 0;
  const dormantCount = dormant?.items?.length ?? 0;
  const lowStockCount = lowStock?.items?.length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="庫存報表"
        subtitle="週轉 / 呆滯品 / 低庫存警告（含安全庫存比對）"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ExportButton
              loading={exporting}
              disabled={!turnover && !dormant && !lowStock}
              onClick={async () => {
                const sheets: Array<{ name: string; rows: Array<Record<string, unknown>> }> = [];
                if (turnover?.items?.length) {
                  sheets.push({
                    name: '週轉',
                    rows: turnover.items.map((it) => ({
                      料號: it.partNo ?? it.partId,
                      品名: it.partName ?? '',
                      現有庫存: it.onHandQty ?? 0,
                      出貨量: it.soldQty ?? 0,
                      週轉率: it.turnoverRate ?? '',
                    })),
                  });
                }
                if (dormant?.items?.length) {
                  sheets.push({
                    name: '呆滯品',
                    rows: dormant.items.map((it) => ({
                      料號: it.partNo ?? it.partId,
                      品名: it.partName ?? '',
                      滯留庫存: it.onHandQty ?? 0,
                      最後動向: it.lastMovementDate ?? '',
                      滯留天數: it.dormantDays ?? 0,
                    })),
                  });
                }
                if (lowStock?.items?.length) {
                  sheets.push({
                    name: '低庫存警報',
                    rows: lowStock.items.map((it) => ({
                      料號: it.partNo ?? it.partId,
                      品名: it.partName ?? '',
                      現有庫存: it.onHandQty ?? 0,
                      安全庫存: it.safetyStock ?? 0,
                      缺料量: it.shortageQty ?? Math.max(0, (it.safetyStock ?? 0) - (it.onHandQty ?? 0)),
                    })),
                  });
                }
                await exportToExcel({
                  fileName: '庫存報表',
                  meta: {
                    期間: turnover?.period ?? '當前',
                    週轉品項數: turnoverCount,
                    呆滯品項數: dormantCount,
                    低庫存警報數: lowStockCount,
                  },
                  sheets: sheets.length > 0 ? sheets : [{ name: '庫存', rows: [] }],
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

      <FadeInOnScroll
        className="space-y-6"
        triggerKey={`${tab}-${!!turnover}-${!!dormant}-${!!lowStock}`}
      >
      {/* 摘要 3 卡 */}
      <div data-fade className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="週轉品項" value={String(turnoverCount)} hint="近期有出貨" tone="green" />
        <StatCard label="呆滯品項" value={String(dormantCount)} hint=">90 天無動向" tone="amber" />
        <StatCard label="低庫存警報" value={String(lowStockCount)} hint="低於安全庫存" tone="red" />
      </div>

      {/* Tab 切換 */}
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-[#2A2A30] bg-[#0A0A0C]/40 px-3 py-2">
        <span className="text-[10px] uppercase tracking-[0.18em] text-[#5A5A60]">明細視角</span>
        {(
          [
            { value: 'turnover' as const, label: '週轉', icon: Boxes },
            { value: 'dormant' as const, label: '呆滯品', icon: Timer },
            { value: 'lowStock' as const, label: '低庫存警報', icon: AlertTriangle },
          ]
        ).map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors',
                tab === t.value
                  ? 'border-[#E8A020]/60 bg-[#E8A020]/10 text-[#E8A020]'
                  : 'border-[#3A3A42] text-[#888892] hover:border-[#5A5A60]',
              )}
            >
              <Icon className="size-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* 週轉明細 */}
      {tab === 'turnover' && turnover ? (
        <section data-fade className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#888892]">
            庫存週轉率 {turnover.period ? `（${turnover.period}）` : ''}
          </h2>
          <ResponsiveTable
            columns={[
              {
                key: 'partNo',
                label: '料號',
                hideOnMobile: true,
                render: (it) => <span className="font-mono text-[14px]">{it.partNo ?? it.partId.slice(0, 8)}</span>,
              },
              {
                key: 'partName',
                label: '品名',
                asTitle: true,
                render: (it) => (
                  <span>
                    <span className="font-mono text-[10px] text-[#5A5A60]">{it.partNo ?? it.partId.slice(0, 8)}</span>{' '}
                    {it.partName ?? '—'}
                  </span>
                ),
              },
              {
                key: 'onHandQty',
                label: '現有庫存',
                align: 'right',
                render: (it) => <span className="font-mono">{(it.onHandQty ?? 0).toLocaleString('zh-TW')}</span>,
              },
              {
                key: 'soldQty',
                label: '出貨量',
                align: 'right',
                render: (it) => (
                  <span className="font-mono text-[#22D88F]">
                    {(it.soldQty ?? 0).toLocaleString('zh-TW')}
                  </span>
                ),
              },
              {
                key: 'turnoverRate',
                label: '週轉率',
                align: 'right',
                render: (it) => (
                  <span className="font-mono text-[#E8A020]">{it.turnoverRate ?? '—'}</span>
                ),
              },
            ]}
            rows={(turnover.items ?? []).map((it, idx) => ({ id: it.partId + '_' + idx, ...it }))}
            loading={loading}
            emptyMessage="尚無週轉資料"
          />
        </section>
      ) : null}

      {/* 呆滯品 */}
      {tab === 'dormant' && dormant ? (
        <section data-fade className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#888892]">呆滯品（建議處置）</h2>
          <ResponsiveTable
            columns={[
              {
                key: 'partNo',
                label: '料號',
                hideOnMobile: true,
                render: (it) => <span className="font-mono text-[14px]">{it.partNo ?? it.partId.slice(0, 8)}</span>,
              },
              {
                key: 'partName',
                label: '品名',
                asTitle: true,
                render: (it) => (
                  <span>
                    <span className="font-mono text-[10px] text-[#5A5A60]">{it.partNo ?? it.partId.slice(0, 8)}</span>{' '}
                    {it.partName ?? '—'}
                  </span>
                ),
              },
              {
                key: 'onHandQty',
                label: '滯留庫存',
                align: 'right',
                render: (it) => <span className="font-mono">{(it.onHandQty ?? 0).toLocaleString('zh-TW')}</span>,
              },
              {
                key: 'lastMovementDate',
                label: '最後動向',
                render: (it) => <span className="font-mono text-[14px]">{it.lastMovementDate ?? '—'}</span>,
              },
              {
                key: 'dormantDays',
                label: '滯留天數',
                align: 'right',
                render: (it) => (
                  <StatusBadge status={`${it.dormantDays ?? 0} 天`} />
                ),
              },
            ]}
            rows={(dormant.items ?? []).map((it, idx) => ({ id: it.partId + '_' + idx, ...it }))}
            loading={loading}
            emptyMessage="目前無呆滯品 🎉"
          />
        </section>
      ) : null}

      {/* 低庫存警報 */}
      {tab === 'lowStock' && lowStock ? (
        <section data-fade className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#888892]">低庫存警報</h2>
          {(lowStock.items ?? []).length > 0 ? (
            <div className="rounded-md border border-[#E26060]/30 bg-[#E26060]/8 px-3 py-2 text-xs text-[#E26060]">
              ⚠️ 共 {(lowStock.items ?? []).length} 項低於安全庫存、請優先補貨
            </div>
          ) : null}
          <ResponsiveTable
            columns={[
              {
                key: 'partNo',
                label: '料號',
                hideOnMobile: true,
                render: (it) => <span className="font-mono text-[14px]">{it.partNo ?? it.partId.slice(0, 8)}</span>,
              },
              {
                key: 'partName',
                label: '品名',
                asTitle: true,
                render: (it) => (
                  <span>
                    <span className="font-mono text-[10px] text-[#5A5A60]">{it.partNo ?? it.partId.slice(0, 8)}</span>{' '}
                    {it.partName ?? '—'}
                  </span>
                ),
              },
              {
                key: 'onHandQty',
                label: '現有庫存',
                align: 'right',
                render: (it) => <span className="font-mono text-[#E26060]">{(it.onHandQty ?? 0).toLocaleString('zh-TW')}</span>,
              },
              {
                key: 'safetyStock',
                label: '安全庫存',
                align: 'right',
                render: (it) => <span className="font-mono">{(it.safetyStock ?? 0).toLocaleString('zh-TW')}</span>,
              },
              {
                key: 'shortageQty',
                label: '缺料量',
                align: 'right',
                render: (it) => (
                  <span className="font-mono text-[#E8A020]">
                    {(it.shortageQty ?? Math.max(0, (it.safetyStock ?? 0) - (it.onHandQty ?? 0))).toLocaleString('zh-TW')}
                  </span>
                ),
              },
            ]}
            rows={(lowStock.items ?? []).map((it, idx) => ({ id: it.partId + '_' + idx, ...it }))}
            loading={loading}
            emptyMessage="所有品項庫存充足 ✅"
          />
          <p className="text-[10px] text-[#5A5A60]">
            缺料量 = max(安全庫存 − 現有庫存, 0)。建議連結至採購補單。
          </p>
        </section>
      ) : null}
      </FadeInOnScroll>
    </div>
  );
}
