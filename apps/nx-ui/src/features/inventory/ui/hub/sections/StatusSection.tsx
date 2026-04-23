// apps/nx-ui/src/features/inventory/ui/hub/sections/StatusSection.tsx
/**
 * TASK-BUSINESS-RESTRUCTURE Phase 8~10:庫存中心手機版「狀態追蹤」分區(預設首頁)。
 *
 * 上半 PRO 限定 KPI 卡(倉管版):
 *   - 倉管員:撿貨速度 / 包貨速度 / 誤差率
 *   - 組長:  團隊效率 / 調度完成率 / 調撥準確率
 *   - 主管:  整體準時率 / 庫存週轉率 / 盤點差異率
 *
 * 下半待辦追蹤清單(SalesStore 動態衍生):
 *   - 撿貨待處理:PK 未 completed
 *   - 包貨待處理:BX 未 completed
 *   - 送貨待處理:DN 未 signed / cancelled
 *
 * 倉管不接觸客戶,但 TodoItem 仍顯示「客戶」為「關聯 SO 的客戶」,讓倉管知道哪張是急件。
 */

'use client';

import { useMemo } from 'react';
import { ClipboardList } from 'lucide-react';

import { useSessionMe } from '@/features/auth/hooks/useSessionMe';
import { useSalesStore } from '@/features/sale/ui/fulfillment/store';
import {
  BX_STATUS_LABEL,
  DN_STATUS_LABEL,
  PK_STATUS_LABEL,
  type BX,
  type DN,
  type PK,
  type SO,
} from '@/features/sale/ui/fulfillment/types';

import { TodoGroup } from '@/features/sale/ui/hub/components/TodoGroup';
import type { TodoItem } from '@/features/sale/ui/hub/mock-data/scenario';

import { InventoryProKPICard } from '../components/InventoryProKPICard';
import {
  MOCK_INVENTORY_KPI,
  MOCK_INVENTORY_USER_ROLE,
  getInventoryKPILevelByRole,
} from '../mock-data/scenario';

const DAY_MS = 24 * 60 * 60 * 1000;

function daysSince(d: Date): number {
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / DAY_MS));
}

function pkToTodoItem(pk: PK, so: SO | undefined): TodoItem {
  const totalQty = pk.items.reduce((s, i) => s + i.quantity, 0);
  return {
    id: pk.id,
    docNumber: pk.pkNumber,
    customerCode: so?.customer.code ?? pk.relatedSoNumber,
    customerName: so?.customer.name ?? '—',
    amount: 0,
    status: PK_STATUS_LABEL[pk.status],
    waitDays: daysSince(pk.createdAt),
    partName: `${pk.items.length} 項 / ${totalQty} 件`,
  };
}

function bxToTodoItem(bx: BX, so: SO | undefined): TodoItem {
  const qtyLabel = so
    ? `${so.items.length} 項 / ${so.items.reduce((s, i) => s + i.quantity, 0)} 件`
    : '明細待查';
  return {
    id: bx.id,
    docNumber: bx.bxNumber,
    customerCode: so?.customer.code ?? bx.relatedSoNumber,
    customerName: so?.customer.name ?? '—',
    amount: 0,
    status: BX_STATUS_LABEL[bx.status],
    waitDays: daysSince(bx.createdAt),
    partName: qtyLabel,
  };
}

function dnToTodoItem(dn: DN, so: SO | undefined): TodoItem {
  return {
    id: dn.id,
    docNumber: dn.dnNumber,
    customerCode: so?.customer.code ?? dn.relatedSoNumber,
    customerName: so?.customer.name ?? '—',
    amount: 0,
    status: DN_STATUS_LABEL[dn.status],
    waitDays: daysSince(dn.createdAt),
    partName: '配送中',
  };
}

export function StatusSection() {
  const session = useSessionMe();
  const isProTier = (session.planCode ?? '').toUpperCase() === 'PRO';

  const kpiLevel = getInventoryKPILevelByRole(MOCK_INVENTORY_USER_ROLE);
  const kpiData = MOCK_INVENTORY_KPI[kpiLevel];

  const subjectLabel =
    kpiLevel === 'personal'
      ? session.displayName || '倉管員'
      : kpiLevel === 'team'
        ? '北區倉管組(5 人)'
        : '全公司';

  const monthLabel = formatMonth(new Date());

  const sos = useSalesStore((s) => s.sos);
  const activePks = useSalesStore((s) => s.pks.filter((p) => p.status !== 'completed'));
  const activeBxs = useSalesStore((s) => s.bxs.filter((b) => b.status !== 'completed'));
  const activeDns = useSalesStore((s) =>
    s.dns.filter((d) => d.status !== 'signed' && d.status !== 'cancelled'),
  );

  const sosByNumber = useMemo(() => {
    const m = new Map<string, SO>();
    for (const s of sos) m.set(s.soNumber, s);
    return m;
  }, [sos]);

  const pickingTodos = useMemo(
    () => activePks.map((pk) => pkToTodoItem(pk, sosByNumber.get(pk.relatedSoNumber))),
    [activePks, sosByNumber],
  );
  const packingTodos = useMemo(
    () => activeBxs.map((bx) => bxToTodoItem(bx, sosByNumber.get(bx.relatedSoNumber))),
    [activeBxs, sosByNumber],
  );
  const deliveryTodos = useMemo(
    () => activeDns.map((dn) => dnToTodoItem(dn, sosByNumber.get(dn.relatedSoNumber))),
    [activeDns, sosByNumber],
  );

  const totalTodoCount = pickingTodos.length + packingTodos.length + deliveryTodos.length;

  return (
    <div className="space-y-5 px-4 pt-4">
      <header className="space-y-1">
        <h1 className="text-lg text-white">庫存中心 · 狀態追蹤</h1>
        <p className="text-xs text-white/50">即時掌握撿包送進度與倉管 KPI</p>
      </header>

      {isProTier ? (
        <InventoryProKPICard
          level={kpiLevel}
          data={kpiData}
          monthLabel={monthLabel}
          subjectLabel={subjectLabel}
        />
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-white/60" aria-hidden />
            <span className="text-sm text-white">待辦追蹤</span>
          </div>
          <span className="text-xs text-white/50 tabular-nums">
            共 {totalTodoCount} 筆需要處理
          </span>
        </div>

        <TodoGroup
          title="撿貨待處理"
          items={pickingTodos}
          emptyText="目前沒有待撿貨的單據"
        />
        <TodoGroup
          title="包貨待處理"
          items={packingTodos}
          emptyText="目前沒有待包貨的單據"
        />
        <TodoGroup
          title="送貨待處理"
          items={deliveryTodos}
          emptyText="目前沒有待送貨的單據"
        />
      </section>
    </div>
  );
}

function formatMonth(d: Date): string {
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月`;
}
