/**
 * File: apps/nx-ui/src/features/inventory/workspace/ui/InventoryWorkspacePage.tsx
 *
 * Purpose:
 * - 庫存作業工作台殼層（NX03_WAREHOUSE_WORKSPACE）：Tab、流程節點、作業區、PRO KPI 占位
 * - Badge 數字接 GET /nx02/balance/dashboard（useDashboard）
 *
 * @FUNCTION_CODE NX03-INV-WS-UI-001-F01
 */

'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { useSessionMe } from '@/features/auth/hooks/useSessionMe';
import { useDashboard } from '@/features/nx03/dashboard/hooks/useDashboard';
import type { Nx02DashboardDto } from '@data/endpoints/nx03/dashboard/api/dashboard';
import { cx } from '@/shared/lib/cx';

type WorkspaceTab = 'inbound' | 'outbound' | 'stocktake';

type FlowNodeDef = {
  key: string;
  label: string;
  href: string;
  /** 自 dashboard 取值；null 表示顯示 —（待採購／物流 API） */
  badgeFrom?: (d: Nx02DashboardDto) => number | null;
};

const INBOUND_NODES: FlowNodeDef[] = [
  { key: 'arrive', label: '待到貨', href: '/dashboard/purchase/po' },
  { key: 'recv', label: '驗收', href: '/dashboard/purchase/rr' },
  { key: 'return', label: '退貨', href: '/dashboard/purchase/pr' },
  { key: 'post', label: '入帳', href: '/dashboard/purchase/rr' },
  {
    key: 'putaway',
    label: '分貨上架',
    href: '/dashboard/inventory/stock-replenishment',
    // TODO: 分貨任務 API 就緒後替換
  },
  { key: 'done_in', label: '完成', href: '/dashboard/inventory/ledger' },
];

const OUTBOUND_NODES: FlowNodeDef[] = [
  { key: 'pick', label: '待撿貨', href: '/dashboard/sale/so' },
  {
    key: 'abnormal',
    label: '異常',
    href: '/dashboard/inventory/shortage',
    badgeFrom: (d) => d.shortage.openCount,
  },
  { key: 'pack', label: '包貨', href: '/dashboard/sale/so' },
  { key: 'ship', label: '出貨', href: '/dashboard/sale/so' },
  { key: 'done_out', label: '完成', href: '/dashboard/inventory/ledger' },
];

const STOCKTAKE_NODES: FlowNodeDef[] = [
  { key: 'pending', label: '待盤點', href: '/dashboard/inventory/stocktake' },
  {
    key: 'counting',
    label: '盤點中',
    href: '/dashboard/inventory/stocktake',
    badgeFrom: (d) => d.stockTake.inProgressCount,
  },
  { key: 'diff', label: '差異確認', href: '/dashboard/inventory/stocktake' },
  { key: 'exc', label: '異常處理', href: '/dashboard/inventory/stocktake' },
  { key: 'done_st', label: '完成', href: '/dashboard/inventory/stocktake' },
];

function formatBadge(d: Nx02DashboardDto | null, fn?: (x: Nx02DashboardDto) => number | null): string {
  if (!fn || !d) return '—';
  const v = fn(d);
  return v == null ? '—' : String(v);
}

function InventoryWorkspaceKpiBar() {
  return (
    <div className="rounded-xl border border-border/70 bg-card/40 px-4 py-3 text-xs text-muted-foreground">
      <div className="font-medium text-foreground">庫存 KPI（PRO）</div>
      <p className="mt-1 leading-relaxed">
        撿貨／包貨效率、驗收上架效率、庫存錯誤率等將串接 NX07／倉管績效資料；此區為占位。
      </p>
    </div>
  );
}

export function InventoryWorkspacePage() {
  const { planCode } = useSessionMe();
  const showProKpi = planCode === 'PRO';
  const { data, loading, error } = useDashboard();
  const [tab, setTab] = useState<WorkspaceTab>('inbound');

  const nodes = useMemo(() => {
    switch (tab) {
      case 'inbound':
        return INBOUND_NODES;
      case 'outbound':
        return OUTBOUND_NODES;
      case 'stocktake':
        return STOCKTAKE_NODES;
      default:
        return INBOUND_NODES;
    }
  }, [tab]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <header className="shrink-0 space-y-1">
        <p className="text-xs tracking-[0.35em] text-muted-foreground">INVENTORY</p>
        <h1 className="text-2xl font-semibold text-foreground">庫存作業工作台</h1>
        <p className="text-sm text-muted-foreground">入庫、出庫、盤點流程節點與快捷連結</p>
      </header>

      {error ? (
        <div className="shrink-0 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
          {error}
        </div>
      ) : null}

      {showProKpi ? <InventoryWorkspaceKpiBar /> : null}

      <div className="flex shrink-0 gap-1 rounded-xl border border-border/60 bg-secondary/15 p-1">
        {(
          [
            ['inbound', '入庫'],
            ['outbound', '出庫'],
            ['stocktake', '盤點'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cx(
              'flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
              tab === id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="shrink-0 rounded-xl border border-border/60 bg-card/30 px-3 py-3">
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">流程節點</div>
        <div className="mt-2 flex min-h-[120px] flex-wrap items-center gap-2">
          {nodes.map((n, i) => (
            <div key={n.key} className="flex items-center gap-2">
              {i > 0 ? <span className="text-muted-foreground/50">→</span> : null}
              <Link
                href={n.href}
                className={cx(
                  'inline-flex min-w-[4.5rem] flex-col items-center gap-1 rounded-lg border border-border/70 bg-card/60 px-2.5 py-2 text-center transition hover:border-primary/40 hover:bg-primary/5',
                )}
              >
                <span className="text-[11px] font-medium text-foreground">{n.label}</span>
                <span className="tabular-nums text-[10px] text-muted-foreground">
                  {loading && !data ? '…' : formatBadge(data, n.badgeFrom)}
                </span>
              </Link>
            </div>
          ))}
        </div>
      </div>

      <div className="nx-master-scroll flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain rounded-xl border border-border/60 bg-card/20 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">作業區</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          點選上方節點前往對應單據或列表。後續可在此內嵌待辦清單、掃描與節點專屬表單（I-W01／I-W02／I-W03）。
        </p>
        <ul className="mt-4 list-inside list-disc space-y-1.5 text-sm text-muted-foreground">
          <li>
            <Link className="text-primary underline-offset-2 hover:underline" href="/dashboard/inventory/workspace">
              返回庫存模組首頁
            </Link>
          </li>
          <li>
            <Link className="text-primary underline-offset-2 hover:underline" href="/dashboard/inventory/warehouse-setting">
              庫位與安全量設定
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
