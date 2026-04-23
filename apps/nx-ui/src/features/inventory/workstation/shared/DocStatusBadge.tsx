// apps/nx-ui/src/features/inventory/workstation/shared/DocStatusBadge.tsx
/**
 * 庫存中心手機版工作站共用狀態徽章。
 *
 * 4 種 tone 對應單據進度:
 *   warn    #E8A020  待處理 / pending 類(需要倉管動作)
 *   info    #4D8FE8  進行中 / in_transit 類(已接手未完成)
 *   success #1D9E75  已完成
 *   muted   white/60 取消 / 其他
 */

'use client';

import { cx } from '@/shared/lib/cx';

export type DocStatusTone = 'warn' | 'info' | 'success' | 'muted';

const TONE_CLASS: Record<DocStatusTone, string> = {
  warn: 'bg-[#E8A020]/15 text-[#E8A020]',
  info: 'bg-[#4D8FE8]/15 text-[#4D8FE8]',
  success: 'bg-[#1D9E75]/15 text-[#1D9E75]',
  muted: 'bg-white/10 text-white/60',
};

export function DocStatusBadge({
  tone,
  children,
}: {
  tone: DocStatusTone;
  children: React.ReactNode;
}) {
  return (
    <span className={cx('rounded px-2 py-0.5 text-xs', TONE_CLASS[tone])}>{children}</span>
  );
}
