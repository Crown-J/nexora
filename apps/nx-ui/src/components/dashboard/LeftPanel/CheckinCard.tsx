/**
 * @FUNCTION_CODE NX99-SYS-DASH-UI-012-F01
 */

'use client';

import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cx } from '@/shared/lib/cx';
import { CheckinRewardModal } from '@/components/dashboard/LeftPanel/CheckinRewardModal';

function formatElapsed(totalSec: number) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

function formatTaiwanClock(d: Date) {
  return d.toLocaleTimeString('zh-TW', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function CheckinCard() {
  const [checkedIn, setCheckedIn] = useState(false);
  const [signedAt, setSignedAt] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [rewardOpen, setRewardOpen] = useState(false);

  useEffect(() => {
    if (!checkedIn || !signedAt) return;
    const tick = () => {
      setElapsed(Math.floor((Date.now() - signedAt.getTime()) / 1000));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [checkedIn, signedAt]);

  const onSign = () => {
    setCheckedIn(true);
    setSignedAt(new Date());
  };

  return (
    <>
      <div className="nx-dash-card p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-success)]" />
            <div>
              {checkedIn ? (
                <>
                  <div className="text-sm font-semibold text-foreground tabular-nums">
                    {formatElapsed(elapsed)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatTaiwanClock(signedAt!)} 簽到
                  </div>
                </>
              ) : (
                <>
                  <div className="text-sm font-semibold text-foreground">今日簽到</div>
                  <div className="text-xs text-muted-foreground">開始您的工作日</div>
                </>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <span className="rounded-md border border-border/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
              7天
            </span>
            <button
              type="button"
              onClick={() => setRewardOpen(true)}
              className="flex items-center gap-0.5 rounded-md border border-border/60 px-1.5 py-0.5 text-[10px] text-primary hover:bg-primary/10"
            >
              獎勵
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>
        </div>
        {!checkedIn ? (
          <button
            type="button"
            onClick={onSign}
            className={cx(
              'mt-4 w-full rounded-lg border border-primary/35 bg-primary/8 py-2.5 text-sm font-medium',
              'text-primary transition hover:border-primary/50 hover:bg-primary/12',
            )}
          >
            簽到
          </button>
        ) : null}
      </div>
      <CheckinRewardModal open={rewardOpen} onClose={() => setRewardOpen(false)} streakDays={7} />
    </>
  );
}
