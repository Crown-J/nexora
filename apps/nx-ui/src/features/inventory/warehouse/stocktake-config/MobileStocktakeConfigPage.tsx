// apps/nx-ui/src/features/inventory/warehouse/stocktake-config/MobileStocktakeConfigPage.tsx
/**
 * TASK-BUSINESS-RESTRUCTURE Phase 10:庫存中心 · 盤點設定(手機版)。
 *
 * 入口:/dashboard/inventory/warehouse/stocktake-config
 *
 * 內容(spec PART 10.3):
 *   - 盤點週期(每月 / 每季 / 每半年 / 每年 radio)
 *   - 下次盤點日期(自動依週期推算,僅顯示)
 *   - 分區盤點 checkbox(A/B/C/D/E 區)
 *   - 高價品盤點頻率(每月 / 每季 radio)
 *   - [儲存設定](demo:toast)
 *
 * 本頁完全 local state,未串後端。Spec 對應 nx03_stocktake_setting(未來實作)。
 */

'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Settings } from 'lucide-react';

import { cx } from '@design/utils/cx';

type CycleValue = 'monthly' | 'quarterly' | 'semiannual' | 'annual';
type HighValueCycleValue = 'monthly' | 'quarterly';

const CYCLE_OPTIONS: ReadonlyArray<{ id: CycleValue; label: string; days: number }> = [
  { id: 'monthly', label: '每月', days: 30 },
  { id: 'quarterly', label: '每季', days: 90 },
  { id: 'semiannual', label: '每半年', days: 180 },
  { id: 'annual', label: '每年', days: 365 },
];

const HIGH_VALUE_OPTIONS: ReadonlyArray<{ id: HighValueCycleValue; label: string }> = [
  { id: 'monthly', label: '每月一次' },
  { id: 'quarterly', label: '每季一次' },
];

const ZONES: readonly string[] = ['A 區', 'B 區', 'C 區', 'D 區', 'E 區'];

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function calcNextStocktake(cycle: CycleValue): string {
  const target = CYCLE_OPTIONS.find((c) => c.id === cycle);
  if (!target) return '—';
  const next = new Date();
  next.setDate(next.getDate() + target.days);
  return formatDate(next);
}

interface RadioRowProps<T extends string> {
  options: ReadonlyArray<{ id: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}

function RadioRow<T extends string>({ options, value, onChange }: RadioRowProps<T>) {
  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <label
          key={opt.id}
          className={cx(
            'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors',
            value === opt.id
              ? 'border-[#E8A020]/60 bg-[#E8A020]/5'
              : 'border-white/10 bg-white/5 hover:border-white/20',
          )}
        >
          <input
            type="radio"
            name={`radio-${opt.id}`}
            checked={value === opt.id}
            onChange={() => onChange(opt.id)}
            className="sr-only"
          />
          <span
            className={cx(
              'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
              value === opt.id ? 'border-[#E8A020]' : 'border-white/30',
            )}
          >
            {value === opt.id ? <span className="h-2 w-2 rounded-full bg-[#E8A020]" /> : null}
          </span>
          <span className="text-sm text-white/80">{opt.label}</span>
        </label>
      ))}
    </div>
  );
}

interface CheckboxRowProps {
  label: string;
  checked: boolean;
  onToggle: () => void;
}

function CheckboxRow({ label, checked, onToggle }: CheckboxRowProps) {
  return (
    <label
      className={cx(
        'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors',
        checked
          ? 'border-[#E8A020]/60 bg-[#E8A020]/5'
          : 'border-white/10 bg-white/5 hover:border-white/20',
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="sr-only"
      />
      <span
        className={cx(
          'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
          checked ? 'border-[#E8A020] bg-[#E8A020]' : 'border-white/30',
        )}
      >
        {checked ? (
          <svg className="h-3 w-3 text-black" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path d="M3 6l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </span>
      <span className="text-sm text-white/80">{label}</span>
    </label>
  );
}

export function MobileStocktakeConfigPage() {
  const [cycle, setCycle] = useState<CycleValue>('quarterly');
  const [zones, setZones] = useState<readonly string[]>(['A 區', 'B 區']);
  const [highValueCycle, setHighValueCycle] = useState<HighValueCycleValue>('monthly');
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const nextDate = useMemo(() => calcNextStocktake(cycle), [cycle]);

  const toggleZone = (z: string) => {
    setZones((prev) => (prev.includes(z) ? prev.filter((x) => x !== z) : [...prev, z]));
  };

  const handleSave = () => {
    setSavedMsg(`已儲存:週期「${CYCLE_OPTIONS.find((c) => c.id === cycle)?.label}」,下次盤點 ${nextDate}`);
    setTimeout(() => setSavedMsg(null), 3000);
  };

  return (
    <div className="space-y-5 p-4 pb-[calc(env(safe-area-inset-bottom)+4rem)]">
      <header className="space-y-1">
        <h1 className="text-lg text-white">庫存中心 · 盤點設定</h1>
        <p className="text-xs text-white/50">盤點週期、分區與高價品頻率設定</p>
      </header>

      <section className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-white/60" aria-hidden />
          <span className="text-sm text-white">盤點週期</span>
        </div>
        <RadioRow options={CYCLE_OPTIONS} value={cycle} onChange={setCycle} />
        <div className="border-t border-white/10 pt-2 text-xs">
          <span className="text-white/50">下次盤點日期:</span>
          <span className="ml-2 font-mono text-white/80">{nextDate}</span>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-4">
        <div>
          <div className="text-sm text-white">分區盤點</div>
          <div className="text-xs text-white/50">勾選的分區輪流盤,避免整體停業務</div>
        </div>
        <div className="space-y-2">
          {ZONES.map((z) => (
            <CheckboxRow
              key={z}
              label={z}
              checked={zones.includes(z)}
              onToggle={() => toggleZone(z)}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-4">
        <div>
          <div className="text-sm text-white">高價品盤點頻率</div>
          <div className="text-xs text-white/50">對 A 級料號另外加高頻盤點</div>
        </div>
        <RadioRow options={HIGH_VALUE_OPTIONS} value={highValueCycle} onChange={setHighValueCycle} />
      </section>

      <button
        type="button"
        onClick={handleSave}
        className="h-11 w-full rounded-lg bg-[#E8A020] text-sm text-black transition-colors hover:bg-[#E8A020]/90"
      >
        儲存設定
      </button>

      {savedMsg ? (
        <div className="flex items-center gap-2 rounded-lg border border-[#1D9E75]/40 bg-[#1D9E75]/10 p-3 text-xs text-[#1D9E75]">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{savedMsg}</span>
        </div>
      ) : null}
    </div>
  );
}
