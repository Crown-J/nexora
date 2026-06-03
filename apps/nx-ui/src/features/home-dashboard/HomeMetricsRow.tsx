// apps/nx-ui/src/features/home-dashboard/HomeMetricsRow.tsx
// 首頁儀表板上方：5 個等寬「可由使用者設定」數據格
//
// 2026-06-03 對齊主檔中心：glass-card + border-border/80 + text-foreground/muted-foreground
//   + Section header（業務數據 + 計數）+ hover lift（主檔卡片範式）

'use client';

import { LayoutDashboard, Plus, Settings2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { cn } from '@/lib/utils';

import { HomeSectionHeader } from './HomeSectionHeader';
import { METRIC_OPTIONS, EMPTY_METRICS, type MetricType, type MetricsPrefValue } from './metric-options.config';
import { MetricPickerModal } from './MetricPickerModal';
import { MetricRenderer } from './MetricRenderer';
import { useMetricValue } from './useMetricValue';
import { fetchMetricsPref, saveMetricsPref } from './user-pref-api';

const SLOT_COUNT = 5;

const SHELL_BASE =
  'glass-card box-border rounded-xl border border-border/80 p-4 shadow-sm transition-all duration-300 ease-out';
const SHELL_HOVER =
  'hover:-translate-y-0.5 hover:scale-[1.005] hover:border-primary/35 hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)]';

export function HomeMetricsRow() {
  const [pref, setPref] = useState<MetricsPrefValue>(EMPTY_METRICS);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchMetricsPref().then((v) => {
      if (cancelled) return;
      setPref(v);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const usedKeys = useMemo(
    () => new Set(pref.slots.filter((k): k is string => Boolean(k))),
    [pref],
  );
  const filledCount = usedKeys.size;

  async function pickForSlot(slotIndex: number, optionKey: string) {
    const newSlots = [...pref.slots];
    newSlots[slotIndex] = optionKey;
    const next = { slots: newSlots };
    setPref(next);
    setActiveSlot(null);
    try {
      await saveMetricsPref(next);
    } catch {
      // 段 F 整測時可加 toast
    }
  }

  async function clearSlot(slotIndex: number) {
    const newSlots = [...pref.slots];
    newSlots[slotIndex] = null;
    const next = { slots: newSlots };
    setPref(next);
    setActiveSlot(null);
    try {
      await saveMetricsPref(next);
    } catch {}
  }

  return (
    <section className="flex shrink-0 flex-col gap-2">
      <HomeSectionHeader
        Icon={LayoutDashboard}
        title="儀表數據"
        count={`${filledCount} / ${SLOT_COUNT} 已設定`}
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: SLOT_COUNT }).map((_, idx) => {
          const slotKey = pref.slots[idx] ?? null;
          const option = slotKey ? METRIC_OPTIONS.find((o) => o.key === slotKey) ?? null : null;
          if (!option) {
            return <EmptyMetricInvite key={idx} loaded={loaded} onClick={() => setActiveSlot(idx)} />;
          }
          return (
            <ConfiguredMetricSlot
              key={idx}
              label={option.label}
              category={option.category}
              metricType={option.metricType}
              endpoint={option.endpoint}
              onConfigure={() => setActiveSlot(idx)}
            />
          );
        })}
      </div>

      <MetricPickerModal
        slotIndex={activeSlot}
        usedKeys={usedKeys}
        onPick={(k) => activeSlot !== null && pickForSlot(activeSlot, k)}
        onClose={() => setActiveSlot(null)}
        onClear={
          activeSlot !== null && pref.slots[activeSlot]
            ? () => clearSlot(activeSlot)
            : undefined
        }
      />
    </section>
  );
}

function EmptyMetricInvite({ loaded, onClick }: { loaded: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="設定數據"
      disabled={!loaded}
      onClick={onClick}
      className={cn(
        'group flex min-h-[120px] flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border/60 bg-secondary/20 p-4 backdrop-blur-sm transition-all',
        loaded
          ? 'cursor-pointer hover:-translate-y-0.5 hover:border-primary/50 hover:bg-secondary/30 hover:text-primary'
          : 'cursor-wait opacity-40',
        'text-muted-foreground',
      )}
    >
      <Plus className="h-6 w-6" strokeWidth={1.5} />
      <span className="text-xs font-medium tracking-wide">點擊設定數據</span>
    </button>
  );
}

function ConfiguredMetricSlot({
  label,
  category,
  metricType,
  endpoint,
  onConfigure,
}: {
  label: string;
  category: string;
  metricType: MetricType;
  endpoint: string;
  onConfigure: () => void;
}) {
  const { value, loading, error } = useMetricValue(endpoint || null);

  return (
    <div className={cn(SHELL_BASE, SHELL_HOVER, 'group relative flex min-h-[120px] flex-col justify-between')}>
      <header className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{category}</span>
          <span className="mt-0.5 truncate text-sm font-semibold text-foreground" title={label}>
            {label}
          </span>
        </div>
        <button
          type="button"
          onClick={onConfigure}
          aria-label="變更數據"
          className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-secondary hover:text-foreground group-hover:opacity-100"
        >
          <Settings2 className="h-3.5 w-3.5" />
        </button>
      </header>

      <MetricRenderer metricType={metricType} value={value} loading={loading} error={error} />
    </div>
  );
}
