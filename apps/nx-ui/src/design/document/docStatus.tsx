/**
 * @FUNCTION_CODE NX00-DOC-UI-001-F01
 * 單據狀態 badge（公版共用）
 */

'use client';

import { cx } from '@design/utils/cx';

export type DocStatusLetter = 'D' | 'S' | 'R' | 'C' | 'P' | 'V' | 'X' | 'B' | string;

/** 草稿 D、已送出 S、已回覆 R、完成 C／過帳 P、作廢 V／X */
export function docStatusBadgeClass(status: string): string {
  const u = status.toUpperCase();
  if (u === 'D') return 'bg-muted text-muted-foreground';
  if (u === 'S') return 'bg-sky-600/20 text-sky-950 dark:text-sky-50';
  if (u === 'R' || u === 'B') return 'bg-orange-500/20 text-orange-950 dark:text-orange-50';
  if (u === 'C' || u === 'P') return 'bg-emerald-600/20 text-emerald-950 dark:text-emerald-50';
  if (u === 'V' || u === 'X') return 'bg-muted text-muted-foreground line-through';
  return 'bg-muted text-muted-foreground';
}

export function DocStatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <span className={cx('inline-flex rounded-md px-2 py-0.5 text-xs font-semibold', docStatusBadgeClass(status))}>
      {label}
    </span>
  );
}
