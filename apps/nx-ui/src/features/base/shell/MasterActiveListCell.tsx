'use client';

import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  isActive: boolean;
  /** 僅圖示、不顯示「啟用／停用」文字（小螢幕仍只顯示圖示） */
  compact?: boolean;
};

/**
 * 主檔列表「啟用」欄：淺色柔和標籤；深色用較實底色 + 亮邊框，避免與斑馬列融在一起。
 */
export function MasterActiveListCell({ isActive, compact = false }: Props) {
  return (
    <td className="whitespace-nowrap px-2 py-2.5" aria-label={isActive ? '啟用' : '停用'}>
      <span
        className={cn(
          'inline-flex max-w-full items-center gap-1.5 rounded-full border px-1.5 py-0.5 text-[11px] font-semibold leading-tight tracking-tight',
          isActive
            ? 'border-emerald-600/22 bg-emerald-600/[0.09] text-emerald-900/80 shadow-sm dark:border-emerald-400/75 dark:bg-emerald-950/90 dark:text-emerald-100 dark:shadow-[0_0_0_1px_rgba(52,211,153,0.35),inset_0_1px_0_0_rgba(255,255,255,0.12)]'
            : 'border-rose-600/20 bg-rose-600/[0.08] text-rose-900/75 shadow-sm dark:border-rose-400/70 dark:bg-rose-950/88 dark:text-rose-100 dark:shadow-[0_0_0_1px_rgba(251,113,133,0.32),inset_0_1px_0_0_rgba(255,255,255,0.1)]',
        )}
      >
        <span
          className={cn(
            'inline-flex size-5 shrink-0 items-center justify-center rounded-full ring-1 ring-inset',
            isActive
              ? 'bg-emerald-700/[0.1] ring-emerald-700/15 dark:bg-emerald-900/95 dark:ring-emerald-300/55'
              : 'bg-rose-700/[0.09] ring-rose-700/12 dark:bg-rose-900/95 dark:ring-rose-300/50',
          )}
          aria-hidden
        >
          {isActive ? (
            <Check
              className="size-3 text-emerald-800 dark:text-emerald-50 dark:drop-shadow-[0_0_8px_rgba(110,231,183,0.55)]"
              strokeWidth={2.75}
            />
          ) : (
            <X
              className="size-3 text-rose-800 dark:text-rose-100 dark:drop-shadow-[0_0_8px_rgba(254,180,193,0.45)]"
              strokeWidth={2.75}
            />
          )}
        </span>
        {!compact ? (
          <span className="hidden truncate sm:inline sm:max-w-[4.5rem] sm:pr-0.5">{isActive ? '啟用' : '停用'}</span>
        ) : null}
      </span>
    </td>
  );
}
