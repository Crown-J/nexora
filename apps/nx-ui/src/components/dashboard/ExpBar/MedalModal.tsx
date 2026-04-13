/**
 * @FUNCTION_CODE NX99-SYS-DASH-UI-010-F01
 * 牌位勳章 / 排行榜 Modal
 */

'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { cx } from '@/shared/lib/cx';
import {
  mockLeaderboard,
  mockMedalTiers,
  type LeaderPeriod,
} from '@/mocks/dashboard';

type MedalModalProps = {
  open: boolean;
  onClose: () => void;
};

export function MedalModal({ open, onClose }: MedalModalProps) {
  const [tab, setTab] = useState<'medals' | 'rank'>('medals');
  const [period, setPeriod] = useState<LeaderPeriod>('week');

  if (!open) return null;

  const rows = mockLeaderboard[period];

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="medal-modal-title"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <h2 id="medal-modal-title" className="text-sm font-semibold text-foreground">
            排位與勳章
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="關閉"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-1 border-b border-border/60 px-2 pt-2">
          <button
            type="button"
            onClick={() => setTab('medals')}
            className={cx(
              'rounded-t-lg px-3 py-2 text-xs font-medium transition',
              tab === 'medals'
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            牌位勳章
          </button>
          <button
            type="button"
            onClick={() => setTab('rank')}
            className={cx(
              'rounded-t-lg px-3 py-2 text-xs font-medium transition',
              tab === 'rank'
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            排行榜
          </button>
        </div>

        <div className="max-h-[min(70vh,420px)] overflow-y-auto p-4">
          {tab === 'medals' ? (
            <ul className="space-y-3">
              {mockMedalTiers.map((t) => (
                <li
                  key={t.code}
                  className="rounded-xl border border-border/60 bg-secondary/20 px-3 py-2"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{t.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {t.unlocked ? '已解鎖' : '未解鎖'}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#e8a020] to-[#f5c842]"
                      style={{ width: `${Math.round(t.progress * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div>
              <div className="mb-3 flex gap-2">
                {(['week', 'month', 'all'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriod(p)}
                    className={cx(
                      'rounded-lg border px-2.5 py-1 text-xs transition',
                      period === p
                        ? 'border-primary/50 bg-primary/10 text-primary'
                        : 'border-border/60 text-muted-foreground hover:border-border',
                    )}
                  >
                    {p === 'week' ? '本週' : p === 'month' ? '本月' : '總榜'}
                  </button>
                ))}
              </div>
              <ul className="space-y-1">
                {rows.map((r) => (
                  <li
                    key={`${r.rank}-${r.name}`}
                    className={cx(
                      'flex items-center justify-between rounded-lg border px-3 py-2 text-sm',
                      'isMe' in r && r.isMe
                        ? 'border-[#e8a020]/60 bg-[var(--color-primary-bg)] text-foreground'
                        : 'border-border/40 bg-card/40',
                    )}
                  >
                    <span className="tabular-nums text-muted-foreground">#{r.rank}</span>
                    <span className="flex-1 px-3 font-medium">{r.name}</span>
                    <span className="tabular-nums text-xs text-muted-foreground">
                      {r.exp.toLocaleString()} XP
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
