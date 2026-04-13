/**
 * @FUNCTION_CODE NX99-SYS-DASH-UI-015-F01
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cx } from '@/shared/lib/cx';

export function DailyReportBtn() {
  const router = useRouter();
  const [filled, setFilled] = useState(false);

  if (filled) {
    return (
      <div
        className={cx(
          'rounded-2xl border border-[var(--color-success)]/40 bg-[var(--color-success)]/10 px-4 py-3 text-center text-sm font-medium',
          'text-[var(--color-success)]',
        )}
      >
        ✓ 今日日誌已完成 +25 XP
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setFilled(true);
        router.push('/dashboard/nx08/daily-report');
      }}
      className={cx(
        'w-full rounded-2xl py-3 text-sm font-semibold text-primary-foreground',
        'bg-gradient-to-r from-[#e8a020] to-[#f5c842] shadow-sm hover:opacity-95',
      )}
    >
      📄 填寫工作日誌
    </button>
  );
}
