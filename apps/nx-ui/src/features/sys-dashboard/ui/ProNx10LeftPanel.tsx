/**
 * @FUNCTION_CODE NX99-SYS-DASH-UI-023-F01
 * PRO 首頁區塊三：簽到／工作日誌（單按鈕邏輯）／本月 KPI
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { mockNx10, mockProMonthlyKpi } from '@/mocks/dashboard';
import { cx } from '@/shared/lib/cx';

function formatElapsed(totalSec: number) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

function formatTaiwanClock(d: Date) {
  return d.toLocaleTimeString('zh-TW', { hour: 'numeric', minute: '2-digit', hour12: true });
}

const dailyReportHref = '/dashboard/report/daily';

const goldBtn =
  'w-full rounded-lg border border-amber-500/45 bg-gradient-to-r from-[#E8A020] to-[#F5C842] py-2.5 text-sm font-semibold text-amber-950 shadow-sm transition hover:brightness-105';

type KpiBarTone = 'success' | 'warn' | 'danger';

function kpiBarTone(current: number, target: number): KpiBarTone {
  if (target <= 0) return 'warn';
  const ratio = current / target;
  if (ratio >= 1) return 'success';
  if (ratio >= 0.9) return 'warn';
  return 'danger';
}

function kpiFillStyle(tone: KpiBarTone): string {
  if (tone === 'success') return 'linear-gradient(90deg, #1D9E75 0%, #2ad08f 100%)';
  if (tone === 'warn') return 'linear-gradient(90deg, #E8A020 0%, #F5C842 100%)';
  return 'linear-gradient(90deg, #E24B4A 0%, #f06b5c 100%)';
}

type Props = {
  className?: string;
};

export function ProNx10LeftPanel({ className }: Props) {
  const router = useRouter();
  const [checkedIn, setCheckedIn] = useState(mockNx10.checkedIn);
  const [signedAt, setSignedAt] = useState<Date | null>(() =>
    mockNx10.checkinTime
      ? new Date(mockNx10.checkinTime)
      : mockNx10.checkedIn
        ? new Date()
        : null,
  );
  const [elapsed, setElapsed] = useState(0);
  const [dailyReportDone] = useState(mockNx10.dailyReportDone);

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
    <div className={cx('nx-dash-card flex min-h-0 flex-col gap-4 p-4', className)}>
      {!checkedIn ? (
        <button type="button" onClick={onSign} className={goldBtn}>
          簽到
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-2">
            <span
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-success)]"
              aria-hidden
            />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground tabular-nums">
                {formatElapsed(elapsed)}
              </div>
              {signedAt ? (
                <div className="text-xs text-muted-foreground">
                  {formatTaiwanClock(signedAt)} 簽到
                </div>
              ) : null}
            </div>
          </div>
          {dailyReportDone ? (
            <button
              type="button"
              onClick={() => router.push(dailyReportHref)}
              className={cx(
                'flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-success)]/45',
                'bg-[var(--color-success)]/12 py-2.5 text-sm font-semibold text-[var(--color-success)] transition hover:bg-[var(--color-success)]/18',
              )}
            >
              <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} />
              今日日誌已完成
            </button>
          ) : (
            <button type="button" onClick={() => router.push(dailyReportHref)} className={goldBtn}>
              填寫工作日誌
            </button>
          )}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col border-t border-border/60 pt-3">
        <div className="mb-2 shrink-0">
          <div className="text-sm font-semibold text-foreground">本月目標</div>
          <div className="text-xs text-muted-foreground">{mockProMonthlyKpi.yearMonth}</div>
        </div>
        <ul className="nx-master-scroll min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-0.5" role="list">
          {mockProMonthlyKpi.items.map((item) => {
            const tone = kpiBarTone(item.current, item.target);
            const pct = item.target > 0 ? Math.min(100, Math.round((item.current / item.target) * 100)) : 0;
            return (
              <li key={`${item.type}-${item.label}`}>
                <div className="mb-1 flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="shrink-0 rounded-md border border-border/70 bg-muted/50 px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
                      {item.type}
                    </span>
                    <span className="text-xs font-medium text-foreground sm:text-sm">{item.label}</span>
                    {item.inverted ? (
                      <span className="text-[10px] text-muted-foreground">（反向：越高越好）</span>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {item.current} / {item.target}
                  </span>
                </div>
                <div
                  className={cx(
                    'relative h-2 w-full overflow-hidden rounded-full',
                    'bg-gradient-to-r from-amber-200/25 via-amber-100/15 to-amber-200/20',
                    'shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] dark:from-amber-950/40 dark:via-amber-900/25 dark:to-amber-950/35',
                  )}
                >
                  <div
                    className="absolute inset-y-0 left-0 rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
                    style={{
                      width: `${pct}%`,
                      background: kpiFillStyle(tone),
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
