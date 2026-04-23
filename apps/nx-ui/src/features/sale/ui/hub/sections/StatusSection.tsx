// apps/nx-ui/src/features/sale/ui/hub/sections/StatusSection.tsx
/**
 * 銷售中心手機版「狀態追蹤」分區(預設首頁)。
 *
 * 上半 PRO 限定 KPI 卡(3 格:業績 / 毛利率 / 退貨率)
 *   - 依 MOCK_USER_ROLE 決定 personal / team / company 版本
 *   - 非 PRO 不顯示(以 useSessionMe planCode 判斷)
 *
 * 下半待辦追蹤清單(TASK-BUSINESS-RESTRUCTURE Phase 7 改以 SalesStore 衍生):
 *   - 銷售進行中:SO 未完成(waiting_* / ready_to_pick / picking / packed / delivering)
 *   - 調貨進行中:IT + TI 未完成(status != completed / cancelled)
 *   - 保固待結果:MOCK_WARRANTY_TODOS(暫維持 mock,保固 store 未來實作)
 *
 * 依 Crown 新規則,「詢價待回覆 / 待確認報價」已從待辦清單移除;
 * 業務查料時由 useHistoryRecord 主動推播提醒(參見 Step2SearchParts)。
 */

'use client';

import { useMemo } from 'react';
import { ClipboardList } from 'lucide-react';

import { useSessionMe } from '@/features/auth/hooks/useSessionMe';
import { useSalesStore } from '@/features/sale/ui/fulfillment/store';
import {
  IT_STATUS_LABEL,
  SO_STATUS_LABEL,
  TI_STATUS_LABEL,
  type IT,
  type SO,
  type SOStatus,
  type TI,
} from '@/features/sale/ui/fulfillment/types';

import { ProKPICard } from '../components/ProKPICard';
import { TodoGroup } from '../components/TodoGroup';
import {
  MOCK_KPI_DATA,
  MOCK_USER_ROLE,
  MOCK_WARRANTY_TODOS,
  type TodoItem,
  getKPILevelByRole,
} from '../mock-data/scenario';

const DAY_MS = 24 * 60 * 60 * 1000;

function daysSince(d: Date): number {
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / DAY_MS));
}

const ACTIVE_SO_STATUSES: readonly SOStatus[] = [
  'waiting_transfer',
  'waiting_supplier',
  'waiting_all',
  'ready_to_pick',
  'picking',
  'packed',
  'delivering',
];

function soToTodoItem(so: SO): TodoItem {
  return {
    id: so.id,
    docNumber: so.soNumber,
    customerCode: so.customer.code,
    customerName: so.customer.name,
    amount: so.totalAmount,
    status: SO_STATUS_LABEL[so.status],
    waitDays: daysSince(so.createdAt),
  };
}

function itToTodoItem(it: IT): TodoItem {
  const partSummary = it.items.map((i) => `${i.sku}×${i.quantity}`).join(', ');
  const fromLabels = Array.from(
    new Set(
      it.items.map((i) =>
        i.fromWarehouse === 'main'
          ? '本倉'
          : i.fromWarehouse === 'hsinchu'
            ? '新竹倉'
            : '台中倉',
      ),
    ),
  ).join('/');
  return {
    id: it.id,
    docNumber: it.itNumber,
    customerCode: it.relatedSoNumber,
    customerName: `${fromLabels} → 本倉`,
    amount: 0,
    status: IT_STATUS_LABEL[it.status],
    waitDays: daysSince(it.createdAt),
    partName: partSummary,
  };
}

function tiToTodoItem(ti: TI): TodoItem {
  const vendors = Array.from(new Set(ti.items.map((i) => i.vendorName))).join(', ');
  const partSummary = ti.items.map((i) => `${i.sku}×${i.quantity}`).join(', ');
  return {
    id: ti.id,
    docNumber: ti.tiNumber,
    customerCode: ti.relatedSoNumber,
    customerName: `同行:${vendors}`,
    amount: 0,
    status: TI_STATUS_LABEL[ti.status],
    waitDays: daysSince(ti.createdAt),
    partName: partSummary,
  };
}

export function StatusSection() {
  const session = useSessionMe();
  const isProTier = (session.planCode ?? '').toUpperCase() === 'PRO';

  const kpiLevel = getKPILevelByRole(MOCK_USER_ROLE);
  const kpiData = MOCK_KPI_DATA[kpiLevel];

  const subjectLabel =
    kpiLevel === 'personal'
      ? session.displayName || '王小明'
      : kpiLevel === 'team'
        ? '北區業務組(8 人)'
        : '全公司';

  const monthLabel = formatMonth(new Date());

  const activeSOs = useSalesStore((s) =>
    s.sos.filter((so) => ACTIVE_SO_STATUSES.includes(so.status)),
  );
  const activeIts = useSalesStore((s) =>
    s.its.filter((it) => it.status !== 'completed' && it.status !== 'cancelled'),
  );
  const activeTis = useSalesStore((s) =>
    s.tis.filter((ti) => ti.status !== 'completed' && ti.status !== 'cancelled'),
  );

  const salesTodos = useMemo(() => activeSOs.map(soToTodoItem), [activeSOs]);
  const transferTodos = useMemo(
    () =>
      [...activeIts.map(itToTodoItem), ...activeTis.map(tiToTodoItem)].sort(
        (a, b) => b.waitDays - a.waitDays,
      ),
    [activeIts, activeTis],
  );

  const totalTodoCount = salesTodos.length + transferTodos.length + MOCK_WARRANTY_TODOS.length;

  return (
    <div className="space-y-5 px-4 pt-4">
      <header className="space-y-1">
        <h1 className="text-lg text-white">銷售中心 · 狀態追蹤</h1>
        <p className="text-xs text-white/50">即時掌握您的待辦與業績</p>
      </header>

      {isProTier ? (
        <ProKPICard
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
          title="銷售進行中"
          items={salesTodos}
          emptyText="目前沒有進行中的銷貨單"
        />
        <TodoGroup
          title="調貨進行中"
          items={transferTodos}
          emptyText="目前沒有進行中的調貨單"
        />
        <TodoGroup
          title="保固待結果"
          items={MOCK_WARRANTY_TODOS}
          emptyText="目前沒有待處理的保固"
        />
      </section>

    </div>
  );
}

function formatMonth(d: Date): string {
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月`;
}
