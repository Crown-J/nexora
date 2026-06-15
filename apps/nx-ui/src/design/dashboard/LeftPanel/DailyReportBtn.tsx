/**
 * @FUNCTION_CODE NX99-SYS-DASH-UI-015-F01
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText } from 'lucide-react';
import { cx } from '@/shared/lib/cx';

export function DailyReportBtn() {
  const router = useRouter();
  const [filled, setFilled] = useState(false);

  if (filled) {
    return (
      <div
        className={cx(
          'rounded-xl border border-border bg-muted/50 px-4 py-3 text-center text-sm font-medium text-foreground',
        )}
      >
        今日日誌已完成{' '}
        <span className="tabular-nums text-[var(--color-success)]">+25 XP</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setFilled(true);
        router.push('/dashboard/report/daily-report');
      }}
      className={cx(
        'flex w-full items-center justify-center gap-2 rounded-lg border border-primary/35 bg-primary/8 py-2.5 text-sm font-medium',
        'text-primary transition hover:border-primary/50 hover:bg-primary/12',
      )}
    >
      <FileText className="h-4 w-4 opacity-80" aria-hidden />
      填寫工作日誌
    </button>
  );
}
