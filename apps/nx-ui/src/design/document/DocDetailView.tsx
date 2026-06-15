/**
 * @FUNCTION_CODE NX00-DOC-UI-001-F01
 * Alt+2 明細視圖外框（表頭 + 明細 + 底部操作區）
 */

'use client';

import { cx } from '@design/utils/cx';

export type DocDetailViewProps = {
  /** 表頭區（DocHeader 等） */
  header: React.ReactNode;
  /** 明細上方工具列（選填） */
  itemToolbar?: React.ReactNode;
  /** 明細表格本體 */
  children: React.ReactNode;
  /** 底部固定列（選填） */
  footer?: React.ReactNode;
  className?: string;
};

export function DocDetailView({ header, itemToolbar, children, footer, className }: DocDetailViewProps) {
  return (
    <div className={cx('flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden', className)}>
      <div className="shrink-0">{header}</div>
      {itemToolbar ? <div className="shrink-0">{itemToolbar}</div> : null}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
      {footer ? <div className="shrink-0 border-t border-border/50 pt-2">{footer}</div> : null}
    </div>
  );
}
