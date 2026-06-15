/**
 * @FUNCTION_CODE NX99-SYS-DASH-UI-002-F01
 * PRO 各模組共用 KPI 列（Phase 1 占位，首頁以 EXP BAR 為主）
 */

import type { ReactNode } from 'react';
import { cx } from '@design/utils/cx';

type KpiBarProps = {
  children?: ReactNode;
  className?: string;
};

export function KpiBar({ children, className }: KpiBarProps) {
  if (!children) return null;
  return (
    <div
      className={cx(
        'border-b border-border/60 bg-card/40 px-4 py-2 text-sm text-muted-foreground backdrop-blur-sm',
        className,
      )}
    >
      {children}
    </div>
  );
}
