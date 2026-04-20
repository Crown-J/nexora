/**
 * @FUNCTION_CODE NX00-DOC-UI-001-F01
 * Alt+1 列表視圖外框（主檔 nx-master-table 捲動區）
 */

'use client';

import { cx } from '@/shared/lib/cx';

export type DocListViewProps = {
  children: React.ReactNode;
  className?: string;
};

export function DocListView({ children, className }: DocListViewProps) {
  return (
    <div
      className={cx(
        'nx-master-scroll min-h-0 flex-1 overflow-auto rounded-lg border border-border/50 bg-card/30',
        className,
      )}
    >
      {children}
    </div>
  );
}
