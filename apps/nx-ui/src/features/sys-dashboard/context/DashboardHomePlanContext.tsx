/**
 * @FUNCTION_CODE NX99-SYS-DASH-CTX-002-F01
 * 首頁 Mock 方案切換（LITE / PLUS / PRO）：供 TopBar 與 SysDashboardPage 共用
 */

'use client';

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { mockCurrentUser, type PlanCode } from '@/mocks/dashboard';
import { useDemoSession } from '@/hooks/useDemoSession';

export type DashboardHomePlanContextValue = {
  planCode: PlanCode;
  setPlanCode: Dispatch<SetStateAction<PlanCode>>;
};

const DashboardHomePlanContext = createContext<DashboardHomePlanContextValue | null>(null);

export function DashboardHomePlanProvider({ children }: { children: ReactNode }) {
  const { user: demoUser } = useDemoSession();
  const [planCode, setPlanCode] = useState<PlanCode>(
    () => demoUser?.planCode ?? mockCurrentUser.planCode,
  );

  const value = useMemo(() => ({ planCode, setPlanCode }), [planCode]);

  return (
    <DashboardHomePlanContext.Provider value={value}>{children}</DashboardHomePlanContext.Provider>
  );
}

export function useDashboardHomePlan() {
  const ctx = useContext(DashboardHomePlanContext);
  if (!ctx) {
    throw new Error('useDashboardHomePlan must be used within DashboardHomePlanProvider');
  }
  return ctx;
}
