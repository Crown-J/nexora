/**
 * @FUNCTION_CODE NX99-SYS-DASH-UI-011-F01
 */

'use client';

import { X } from 'lucide-react';
import { mockCheckinRewards } from '@/mocks/dashboard';

type Props = { open: boolean; onClose: () => void; streakDays: number };

export function CheckinRewardModal({ open, onClose, streakDays }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold">簽到獎勵</div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-secondary"
            aria-label="關閉"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">目前連續簽到 {streakDays} 天（Mock）</p>
        <ul className="space-y-2 text-xs">
          {mockCheckinRewards.map((r) => (
            <li
              key={r.days}
              className="flex justify-between rounded-lg border border-border/50 px-2 py-1.5"
            >
              <span>{r.days} 天</span>
              <span className="text-primary">+{r.xp} XP</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
