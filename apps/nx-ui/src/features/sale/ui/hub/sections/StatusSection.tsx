// apps/nx-ui/src/features/sale/ui/hub/sections/StatusSection.tsx
/**
 * 銷售中心手機版「狀態追蹤」分區（預設首頁）。
 *
 * 上半 PRO 限定 KPI 卡（3 格:業績 / 毛利率 / 退貨率）
 *   - 依 MOCK_USER_ROLE 決定 personal / team / company 版本
 *   - 非 PRO 不顯示（以 useSessionMe planCode 判斷）
 *
 * 下半待辦追蹤清單（TASK-BUSINESS-RESTRUCTURE Phase 4 調整）:
 *   - 銷售進行中:MOCK_SALES_TODOS(SO 未完成;Phase 7 會改為 store 衍生)
 *   - 調貨進行中:MOCK_TRANSFER_TODOS(IT + TI;Phase 6/7 改為 store 衍生)
 *   - 保固待結果:MOCK_WARRANTY_TODOS
 *
 * 依 Crown 新規則,「詢價待回覆 / 待確認報價」已從待辦清單移除;
 * 業務查料時由 useHistoryRecord 主動推播提醒(參見 Step2SearchParts)。
 */

'use client';

import { ClipboardList } from 'lucide-react';

import { useSessionMe } from '@/features/auth/hooks/useSessionMe';

import { ProKPICard } from '../components/ProKPICard';
import { TodoGroup } from '../components/TodoGroup';
import {
  MOCK_KPI_DATA,
  MOCK_SALES_TODOS,
  MOCK_TRANSFER_TODOS,
  MOCK_USER_ROLE,
  MOCK_WARRANTY_TODOS,
  getKPILevelByRole,
} from '../mock-data/scenario';

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

  const totalTodoCount =
    MOCK_SALES_TODOS.length + MOCK_TRANSFER_TODOS.length + MOCK_WARRANTY_TODOS.length;

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
          items={MOCK_SALES_TODOS}
          emptyText="目前沒有進行中的銷貨單"
        />
        <TodoGroup
          title="調貨進行中"
          items={MOCK_TRANSFER_TODOS}
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
