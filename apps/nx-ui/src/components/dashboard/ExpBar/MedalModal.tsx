/**
 * @FUNCTION_CODE NX99-SYS-DASH-UI-010-F01
 * 牌位勳章／排行榜：遊戲化（深色黃框／反應爐金，非橘色）
 */

'use client';

import { useMemo, useState } from 'react';
import { Crown, Lock, Sparkles, TrendingDown, TrendingUp, X } from 'lucide-react';
import {
  mockExpData,
  mockLeaderboard,
  mockRankLadder,
  type LeaderPeriod,
  type MockLeaderRow,
} from '@/mocks/dashboard';
import { cx } from '@/shared/lib/cx';

type MedalModalProps = {
  open: boolean;
  onClose: () => void;
};

function rankMedal(rank: number) {
  if (rank === 1) return <Crown className="h-5 w-5 text-primary" aria-hidden />;
  if (rank === 2) return <span className="text-lg font-bold text-slate-300">2</span>;
  if (rank === 3) return <span className="text-lg font-bold text-primary">3</span>;
  return <span className="w-5 text-center text-sm font-bold text-muted-foreground">{rank}</span>;
}

function LeaderRow({
  r,
  variant,
}: {
  r: MockLeaderRow;
  variant: 'list' | 'pinned';
}) {
  const pinned = variant === 'pinned';
  return (
    <li
      className={cx(
        'flex items-center gap-2 rounded-xl border px-2 py-2 sm:gap-3 sm:px-3 sm:py-2.5',
        pinned
          ? 'border-primary/45 bg-primary/12 shadow-[0_0_20px_rgba(234,179,8,0.12)] dark:border-primary/55 dark:bg-primary/14 dark:shadow-[0_0_24px_rgba(255,184,0,0.18)]'
          : 'border-border/50 bg-card/40 dark:border-white/10 dark:bg-black/25',
      )}
    >
      <div className="flex w-8 shrink-0 justify-center">{rankMedal(r.rank)}</div>
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-xs font-bold dark:border-primary/30 dark:bg-zinc-900">
        {r.initials ?? r.name.slice(0, 1)}
        {r.level != null ? (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full border border-background bg-primary px-0.5 text-[8px] font-bold text-primary-foreground dark:border-zinc-950 dark:text-black">
            {r.level}
          </span>
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-foreground dark:text-slate-100">
          {r.isMe ? '我' : r.name}
        </div>
        {r.dept ? (
          <div className="truncate text-[10px] text-muted-foreground dark:text-slate-500">{r.dept}</div>
        ) : null}
      </div>
      <div className="shrink-0 text-right">
        <div className="text-sm font-bold tabular-nums text-foreground dark:text-white">
          {r.exp.toLocaleString()}
        </div>
        <div className="text-[9px] text-muted-foreground dark:text-slate-500">XP</div>
      </div>
      {r.trend != null && r.trend !== 0 ? (
        <div
          className={cx(
            'flex shrink-0 items-center gap-0.5 text-[10px] font-semibold',
            r.trend > 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]',
          )}
        >
          {r.trend > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          {r.trend > 0 ? '+' : ''}
          {r.trend}
        </div>
      ) : (
        <div className="w-8 shrink-0" />
      )}
    </li>
  );
}

export function MedalModal({ open, onClose }: MedalModalProps) {
  const [tab, setTab] = useState<'medals' | 'rank'>('medals');
  const [period, setPeriod] = useState<LeaderPeriod>('month');

  const lv = mockExpData.currentLevel;

  const { currentIdx, nextTier, levelsToNext } = useMemo(() => {
    let idx = 0;
    for (let i = 0; i < mockRankLadder.length; i++) {
      if (lv >= mockRankLadder[i].minLevel) idx = i;
    }
    const next = mockRankLadder[idx + 1];
    return {
      currentIdx: idx,
      nextTier: next,
      levelsToNext: next ? Math.max(0, next.minLevel - lv) : 0,
    };
  }, [lv]);

  const currentRank = mockRankLadder[currentIdx];

  if (!open) return null;

  const rows = mockLeaderboard[period];
  const others = rows.filter((r) => !r.isMe);
  const me = rows.find((r) => r.isMe);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="medal-modal-title"
    >
      <div
        className={cx(
          'relative flex max-h-[min(90dvh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border shadow-2xl sm:max-w-2xl',
          'border-border bg-card text-card-foreground',
          'dark:border-primary/40 dark:bg-gradient-to-b dark:from-[#0c0c10] dark:to-[#12121a]',
        )}
      >
        <div
          className={cx(
            'flex shrink-0 items-center justify-between border-b px-4 py-3',
            'border-border dark:border-primary/25',
          )}
        >
          <h2
            id="medal-modal-title"
            className={cx(
              'flex items-center gap-2 text-sm font-bold sm:text-base',
              'text-foreground dark:text-[#fff8e6]',
            )}
          >
            <Sparkles className="h-4 w-4 text-primary" aria-hidden />
            牌位、勳章與排行榜
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="關閉"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex shrink-0 gap-1 border-b border-border px-2 pt-2 dark:border-primary/20">
          <button
            type="button"
            onClick={() => setTab('medals')}
            className={cx(
              'rounded-t-lg px-4 py-2 text-xs font-semibold transition sm:text-sm',
              tab === 'medals'
                ? 'bg-primary/15 text-primary dark:bg-primary/20 dark:text-[#ffe9a8]'
                : 'text-muted-foreground hover:text-foreground dark:hover:text-slate-200',
            )}
          >
            牌位勳章
          </button>
          <button
            type="button"
            onClick={() => setTab('rank')}
            className={cx(
              'rounded-t-lg px-4 py-2 text-xs font-semibold transition sm:text-sm',
              tab === 'rank'
                ? 'bg-primary/15 text-primary dark:bg-primary/20 dark:text-[#ffe9a8]'
                : 'text-muted-foreground hover:text-foreground dark:hover:text-slate-200',
            )}
          >
            排行榜
          </button>
        </div>

        <div className="nx-master-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pr-3">
          {tab === 'medals' ? (
            <div className="space-y-4">
              <div
                className={cx(
                  'relative overflow-hidden rounded-2xl border p-4',
                  'border-primary/35 bg-gradient-to-br from-primary/15 via-card to-card',
                  'dark:border-primary/50 dark:from-[#1f1a0a] dark:via-[#141008] dark:to-[#0f0f12]',
                  'dark:shadow-[0_0_32px_rgba(255,184,0,0.14)]',
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/25 text-2xl shadow-inner dark:bg-primary/30">
                    ⭐
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-lg font-bold text-primary dark:text-[#ffe9a8]">{currentRank.label}</div>
                    <div className="mt-1 text-xs text-muted-foreground dark:text-slate-400">
                      當前等級：Lv.{lv}
                    </div>
                    {nextTier ? (
                      <div className="mt-2 text-[11px] text-muted-foreground dark:text-slate-500">
                        距離下一牌位「{nextTier.label}」還需{' '}
                        <span className="font-semibold text-foreground dark:text-[#fff8e6]">{levelsToNext}</span> 級
                      </div>
                    ) : (
                      <div className="mt-2 text-[11px] text-[var(--color-success)]">已達最高牌位（Mock）</div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-semibold text-muted-foreground dark:text-slate-400">所有牌位</div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {mockRankLadder.map((tier, i) => {
                    const unlocked = lv >= tier.minLevel;
                    const isCurrent = i === currentIdx;
                    const locked = !unlocked;
                    return (
                      <div
                        key={tier.code}
                        className={cx(
                          'relative flex flex-col rounded-xl border p-3 text-left transition',
                          isCurrent
                            ? 'border-primary/55 bg-primary/10 ring-1 ring-primary/25 dark:border-primary/60 dark:bg-primary/12 dark:ring-primary/25'
                            : unlocked
                              ? 'border-border/70 bg-muted/20 dark:border-white/12 dark:bg-black/30'
                              : 'border-border/40 bg-muted/10 opacity-60 dark:border-white/5 dark:bg-black/40',
                        )}
                      >
                        {isCurrent ? (
                          <span className="absolute right-2 top-2 rounded bg-primary px-1.5 py-px text-[9px] font-bold text-primary-foreground">
                            當前
                          </span>
                        ) : null}
                        <div className="flex items-center gap-2">
                          {locked ? (
                            <Lock className="h-4 w-4 text-muted-foreground dark:text-slate-500" />
                          ) : (
                            <span className="text-lg">{i === 0 ? '🛡️' : i === 1 ? '🎖️' : '✨'}</span>
                          )}
                          <span className="text-xs font-bold text-foreground dark:text-slate-100">{tier.label}</span>
                        </div>
                        <div className="mt-2 text-[10px] text-muted-foreground dark:text-slate-500">{tier.blurb}</div>
                        {locked ? (
                          <div className="mt-2 text-[9px] text-muted-foreground">未解鎖</div>
                        ) : (
                          <div className="nx-goal-bar-track mt-2 w-full">
                            <div
                              className="nx-goal-bar-fill"
                              style={{
                                width: `${Math.min(100, isCurrent ? 85 : 100)}%`,
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-3 flex flex-wrap gap-2">
                {(['week', 'month', 'all'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriod(p)}
                    className={cx(
                      'rounded-full border px-3 py-1 text-xs font-semibold transition',
                      period === p
                        ? 'border-primary/55 bg-primary/15 text-primary dark:border-primary/60 dark:bg-primary/18 dark:text-[#ffe9a8]'
                        : 'border-border/60 text-muted-foreground hover:border-border dark:border-white/15 dark:hover:border-white/25',
                    )}
                  >
                    {p === 'week' ? '本週' : p === 'month' ? '本月' : '總榜'}
                  </button>
                ))}
              </div>
              <ul className="space-y-1.5">
                {others.map((r) => (
                  <LeaderRow key={`${r.rank}-${r.name}`} r={r} variant="list" />
                ))}
              </ul>
              {me ? (
                <>
                  <div
                    className={cx(
                      'my-3 border-t border-dashed border-primary/35 dark:border-primary/45',
                    )}
                  />
                  <ul className="space-y-1.5">
                    <LeaderRow r={me} variant="pinned" />
                  </ul>
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
