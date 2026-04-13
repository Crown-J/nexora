/**
 * @FUNCTION_CODE NX99-SYS-DASH-UI-004-F01
 * TopBar + 可選 KpiBar + 主內容
 */

import type { ReactNode } from 'react';
import { KpiBar } from '@/components/layout/KpiBar';
import { TopBar, type TopBarProps } from '@/components/layout/TopBar';

type MainShellProps = {
  topBarProps: TopBarProps;
  kpiBar?: ReactNode;
  children: ReactNode;
};

export function MainShell({ topBarProps, kpiBar, children }: MainShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <TopBar {...topBarProps} />
      <KpiBar>{kpiBar}</KpiBar>
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-4">{children}</main>
    </div>
  );
}
