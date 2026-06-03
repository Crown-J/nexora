// apps/nx-ui/src/features/home-dashboard/HomeMetricsRow.tsx
// 首頁儀表板上方：5 個等寬「可由使用者設定」數據格
//
// 段 A：純殼（5 格邀請框）
// 段 B（本軌）：點 + 跳 modal、依權限過濾、KPI 鎖、後端 nx01_user_pref 持久化（非 localStorage）
// 段 C：依 metricType 接 endpoint 數字、render 4 種圖
//
// 設計語言：bg-[#11111A]/70 backdrop-blur-sm / border zinc-800 / accent amber / rounded-xl

'use client';

import { Plus, Settings2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { METRIC_OPTIONS, EMPTY_METRICS, type MetricType, type MetricsPrefValue } from './metric-options.config';
import { MetricPickerModal } from './MetricPickerModal';
import { MetricRenderer } from './MetricRenderer';
import { useMetricValue } from './useMetricValue';
import { fetchMetricsPref, saveMetricsPref } from './user-pref-api';

const SLOT_COUNT = 5;

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

  async function pickForSlot(slotIndex: number, optionKey: string) {
    const newSlots = [...pref.slots];
    newSlots[slotIndex] = optionKey;
    const next = { slots: newSlots };
    setPref(next);
    setActiveSlot(null);
    try {
      await saveMetricsPref(next);
    } catch {
      // 段 F 整測時可加 toast；段 B 失敗不擋 UI
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
    } catch {
      // ignore
    }
  }

  return (
    <section className="w-full">
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

/** 空格邀請框：「+ 點擊設定數據」、虛線 */
function EmptyMetricInvite({ loaded, onClick }: { loaded: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="設定數據"
      disabled={!loaded}
      onClick={onClick}
      className={[
        'group flex aspect-[3/2] min-h-[140px] flex-col items-center justify-center gap-2',
        'rounded-xl border-2 border-dashed border-zinc-800',
        'bg-[#11111A]/40 backdrop-blur-sm transition-colors',
        loaded ? 'hover:border-amber-500/60 hover:bg-[#1a1a25] cursor-pointer' : 'opacity-40 cursor-wait',
        'text-zinc-600 hover:text-amber-300',
      ].join(' ')}
    >
      <Plus className="size-7" strokeWidth={1.5} />
      <span className="text-sm font-medium tracking-wide">點擊設定數據</span>
    </button>
  );
}

/** 已設定格：拉 endpoint 顯示數字、右上齒輪改 */
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
    <div
      className={[
        'group relative flex aspect-[3/2] min-h-[140px] flex-col justify-between',
        'rounded-xl border border-zinc-800 bg-[#11111A]/70 backdrop-blur-sm p-4',
        'transition-colors hover:border-amber-500/30',
      ].join(' ')}
    >
      <header className="flex items-start justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-widest text-zinc-500">{category}</span>
          <span className="mt-0.5 text-sm font-medium text-zinc-100">{label}</span>
        </div>
        <button
          type="button"
          onClick={onConfigure}
          aria-label="變更數據"
          className="rounded p-1 text-zinc-600 opacity-0 transition-opacity hover:bg-zinc-900 hover:text-zinc-200 group-hover:opacity-100"
        >
          <Settings2 className="size-4" />
        </button>
      </header>

      <MetricRenderer metricType={metricType} value={value} loading={loading} error={error} />
    </div>
  );
}
