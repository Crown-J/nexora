// apps/nx-ui/src/features/home-dashboard/StatusCard.tsx
// 首頁儀表板：單卡元件
//
// 5 種狀態：
// - loading：數字位置顯示 skeleton bar
// - ok：顯示數字 + 單位（單位等寬小字）
// - error：紅字「載入失敗」
// - premium：「📌 選購套件」小章戳、灰底、不可點（KPI 類）
// - pending：「即將上線」章戳、灰底、不可點（endpoint 待擴充）

'use client';

import Link from 'next/link';
import { Clock, Sparkles } from 'lucide-react';

import type { CardCategory } from './cards.config';

type StatusCardProps = {
  title: string;
  href: string;
  category: CardCategory;
  unit: string;
  hint?: string;
  state: 'loading' | 'ok' | 'error' | 'premium' | 'pending';
  value?: string | number | null;
};

const CATEGORY_ACCENT: Record<CardCategory, string> = {
  purchase: 'border-amber-700/40 hover:border-amber-500/60',
  inventory: 'border-sky-700/40 hover:border-sky-500/60',
  sale: 'border-emerald-700/40 hover:border-emerald-500/60',
  finance: 'border-violet-700/40 hover:border-violet-500/60',
};

const CATEGORY_LABEL: Record<CardCategory, string> = {
  purchase: '採購',
  inventory: '庫存',
  sale: '銷售',
  finance: '財務',
};

function formatValue(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'number') {
    // 整數加千分位
    return v.toLocaleString('zh-TW');
  }
  return String(v);
}

export function StatusCard({ title, href, category, unit, hint, state, value }: StatusCardProps) {
  const accent = CATEGORY_ACCENT[category];
  const isPremium = state === 'premium';
  const isPending = state === 'pending';
  const disabled = isPremium || isPending;

  const inner = (
    <div
      className={[
        'relative flex h-full min-h-[120px] flex-col justify-between',
        'rounded-lg border bg-[#11111A]/60 backdrop-blur-sm p-4',
        'transition-colors',
        disabled ? 'opacity-50 cursor-not-allowed' : `cursor-pointer ${accent}`,
      ].join(' ')}
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-widest text-zinc-500">
            {CATEGORY_LABEL[category]}
          </span>
          <span className="mt-0.5 text-sm font-medium text-zinc-100">{title}</span>
        </div>
        {isPremium ? (
          <span className="flex items-center gap-1 rounded border border-amber-700/40 bg-amber-900/20 px-1.5 py-0.5 text-[10px] text-amber-300">
            <Sparkles className="size-3" />
            選購套件
          </span>
        ) : null}
        {isPending ? (
          <span className="flex items-center gap-1 rounded border border-zinc-700 bg-zinc-900/40 px-1.5 py-0.5 text-[10px] text-zinc-400">
            <Clock className="size-3" />
            即將上線
          </span>
        ) : null}
      </div>

      <div className="flex items-end justify-between">
        <div className="flex items-baseline gap-1">
          {state === 'loading' ? (
            <span className="inline-block h-7 w-16 animate-pulse rounded bg-zinc-800" />
          ) : state === 'error' ? (
            <span className="text-sm text-rose-400">載入失敗</span>
          ) : isPremium ? (
            <span className="text-xs text-zinc-500">解鎖後顯示</span>
          ) : isPending ? (
            <span className="text-xs text-zinc-500">endpoint 待擴充</span>
          ) : (
            <>
              <span className="text-2xl font-semibold text-zinc-50">
                {formatValue(value)}
              </span>
              {unit ? (
                <span className="text-xs text-zinc-500">{unit}</span>
              ) : null}
            </>
          )}
        </div>
        {hint ? (
          <span className="text-[10px] text-zinc-600">{hint}</span>
        ) : null}
      </div>
    </div>
  );

  if (disabled) {
    return inner;
  }
  return (
    <Link href={href} className="block">
      {inner}
    </Link>
  );
}
