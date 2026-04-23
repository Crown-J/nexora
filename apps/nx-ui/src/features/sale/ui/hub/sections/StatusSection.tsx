// apps/nx-ui/src/features/sale/ui/hub/sections/StatusSection.tsx
/**
 * R7 銷售中心手機版「狀態追蹤」分區（預設首頁）。
 *
 * 上半 PRO 限定 KPI 卡（3 格:業績 / 毛利率 / 退貨率）
 *   - 依 MOCK_USER_ROLE 決定 personal / team / company 版本
 *   - 非 PRO 不顯示（以 useSessionMe planCode 判斷）
 *
 * 下半待辦追蹤清單:
 *   - 詢價待回覆:R7 Phase 7-3 改為從 useRFQStore 動態衍生（跟同行調貨列表共用來源）
 *   - 銷售待出貨 / 保固待結果:仍從 hub/mock-data/scenario 讀靜態 mock
 *
 * 未來（Phase 7-5）還會加第 4 個群組「待確認報價」（QT pending_customer）。
 */

'use client';

import { useMemo } from 'react';
import { ClipboardList } from 'lucide-react';

import { useSessionMe } from '@/features/auth/hooks/useSessionMe';
import { useRFQStore } from '@/features/sale/ui/inquiry/store';
import type { RFQ } from '@/features/sale/ui/inquiry/types';

import { ProKPICard } from '../components/ProKPICard';
import { TodoGroup } from '../components/TodoGroup';
import type { TodoItem } from '../mock-data/scenario';
import {
  MOCK_KPI_DATA,
  MOCK_SALES_TODOS,
  MOCK_USER_ROLE,
  MOCK_WARRANTY_TODOS,
  getKPILevelByRole,
} from '../mock-data/scenario';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * RFQ → TodoItem 轉換。
 *   - amount：
 *     已 responded → 最低同行報價 × qty（成本概估，業務用來判斷值不值得追）
 *     waiting      → 0；TodoGroup 會因 partName 存在而顯示料號名替代金額
 *   - status 文字：等待同行回覆 / N 家已回覆
 *   - waitDays：建立至今的天數，由 TodoGroup 依閾值染色
 */
function rfqToTodoItem(rfq: RFQ): TodoItem {
  const waitDays = Math.floor((Date.now() - rfq.createdAt.getTime()) / DAY_MS);
  const lowestPrice =
    rfq.vendorQuotes.length > 0
      ? Math.min(...rfq.vendorQuotes.map((v) => v.price)) * rfq.quantity
      : 0;
  const statusLabel =
    rfq.vendorQuotes.length === 0
      ? '等待同行回覆'
      : `${rfq.vendorQuotes.length} 家已回覆`;

  return {
    id: rfq.id,
    docNumber: rfq.rfqNumber,
    customerCode: rfq.sourceCustomer.code,
    customerName: rfq.sourceCustomer.name,
    amount: lowestPrice,
    status: statusLabel,
    waitDays,
    partName: rfq.part.name,
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
        ? '北區業務組（8 人）'
        : '全公司';

  const monthLabel = formatMonth(new Date());

  // 從 store 衍生詢價待辦（只要 waiting / responded 都算待處理）
  const rfqs = useRFQStore((s) => s.rfqs);
  const inquiryTodos = useMemo(
    () =>
      rfqs
        .filter((r) => r.status === 'waiting' || r.status === 'responded')
        .map(rfqToTodoItem),
    [rfqs],
  );

  const totalTodoCount =
    inquiryTodos.length + MOCK_SALES_TODOS.length + MOCK_WARRANTY_TODOS.length;

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
          title="詢價待回覆"
          items={inquiryTodos}
          emptyText="目前沒有等待回覆的詢價"
        />
        <TodoGroup
          title="銷售待出貨"
          items={MOCK_SALES_TODOS}
          emptyText="目前沒有待出貨的銷售單"
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
