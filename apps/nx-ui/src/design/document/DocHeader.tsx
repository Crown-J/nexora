/**
 * @FUNCTION_CODE NX00-DOC-UI-001-F01
 * 單據表頭：系統唯讀列 + 兩欄表單區
 */

'use client';

import { cx } from '@design/utils/cx';

export type DocSystemRowProps = { children: React.ReactNode; className?: string };

/** 系統欄（灰底唯讀） */
export function DocSystemRow({ children, className }: DocSystemRowProps) {
  return (
    <div
      className={cx(
        'rounded-lg border border-border/50 bg-muted/25 px-3 py-2 text-xs text-muted-foreground',
        className,
      )}
    >
      {children}
    </div>
  );
}

export type DocHeaderGridProps = { children: React.ReactNode; className?: string };

/** 採購員／業務填寫欄兩欄 grid */
export function DocHeaderGrid({ children, className }: DocHeaderGridProps) {
  return <div className={cx('grid gap-3 sm:grid-cols-2', className)}>{children}</div>;
}

export type DocHeaderProps = {
  system: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function DocHeader({ system, children, className }: DocHeaderProps) {
  return (
    <div className={cx('space-y-3', className)}>
      <DocSystemRow>{system}</DocSystemRow>
      <div className="rounded-lg border border-border/50 bg-card/40 p-3">
        <DocHeaderGrid>{children}</DocHeaderGrid>
      </div>
    </div>
  );
}
