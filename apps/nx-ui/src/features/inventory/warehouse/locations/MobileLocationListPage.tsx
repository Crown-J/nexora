// apps/nx-ui/src/features/inventory/warehouse/locations/MobileLocationListPage.tsx
/**
 * TASK-BUSINESS-RESTRUCTURE Phase 10:庫存中心 · 庫位管理(手機版)。
 *
 * 入口:/dashboard/inventory/warehouse/locations
 *
 * 功能:
 *   - 狀態篩選 chip:全部 / 設定一致 / 需與採購討論
 *   - 庫位 Card:位置碼、當前存放料號、庫存/上限、倉管建議 vs 採購設定、一致性徽章
 *   - 動作:
 *       設定一致    → 無按鈕
 *       需要討論    → [調整建議] / [通知採購](demo:toast)
 *
 * 資料全來自 MOCK_WAREHOUSE_LOCATIONS(本地 mock),spec 對應 nx02_stock_setting(PLUS)。
 */

'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, MapPin, Package } from 'lucide-react';

import { cx } from '@design/utils/cx';

import { DocStatusBadge, type DocStatusTone } from '@/features/inventory/workstation/shared/DocStatusBadge';
import {
  MOCK_WAREHOUSE_LOCATIONS,
  diagnoseConsistency,
  type ConsistencyStatus,
  type WarehouseLocation,
} from './mock-data';

type FilterValue = 'all' | 'consistent' | 'mismatch';

const FILTERS: ReadonlyArray<{ id: FilterValue; label: string }> = [
  { id: 'all', label: '全部' },
  { id: 'consistent', label: '設定一致' },
  { id: 'mismatch', label: '需與採購討論' },
];

const CONSISTENCY_TONE: Record<ConsistencyStatus, DocStatusTone> = {
  consistent: 'success',
  safety_mismatch: 'warn',
  max_mismatch: 'warn',
};

const CONSISTENCY_LABEL: Record<ConsistencyStatus, string> = {
  consistent: '設定一致',
  safety_mismatch: '安全量需討論',
  max_mismatch: '最高量需討論',
};

function formatNotify(action: 'adjust' | 'notify', code: string): string {
  return action === 'adjust' ? `已記錄 ${code} 的建議調整` : `已通知採購重新檢視 ${code}`;
}

function LocationCard({ loc }: { loc: WarehouseLocation }) {
  const consistency = diagnoseConsistency(loc);
  const stockRatio = loc.currentStock / Math.max(1, loc.maxCapacity);
  const stockLow = loc.currentStock < loc.safetyStockProcurement;

  const [notice, setNotice] = useState<string | null>(null);

  const handleAction = (action: 'adjust' | 'notify') => {
    setNotice(formatNotify(action, loc.code));
    setTimeout(() => setNotice(null), 2000);
  };

  return (
    <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0 text-white/40" aria-hidden />
          <span className="font-mono text-sm text-white/80">{loc.code}</span>
        </div>
        <DocStatusBadge tone={CONSISTENCY_TONE[consistency]}>
          {CONSISTENCY_LABEL[consistency]}
        </DocStatusBadge>
      </div>

      <div className="flex items-start gap-2 text-sm">
        <Package className="mt-0.5 h-4 w-4 shrink-0 text-white/40" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="shrink-0 font-mono text-xs text-white/40">{loc.partSku}</span>
            <span className="min-w-0 flex-1 truncate text-white/80">{loc.partName}</span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs">
            <span className={cx('tabular-nums', stockLow ? 'text-[#E8A020]' : 'text-white/60')}>
              庫存 {loc.currentStock} 件
            </span>
            <span className="text-white/30">/</span>
            <span className="tabular-nums text-white/50">上限 {loc.maxCapacity} 件</span>
            <span className="text-white/30">·</span>
            <span className="tabular-nums text-white/40">
              {(stockRatio * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-2 text-xs">
        <div className="space-y-1">
          <div className="text-white/40">安全量</div>
          <div className="flex items-center gap-2">
            <span className="text-white/80 tabular-nums">建議 {loc.safetyStockSuggested}</span>
          </div>
          <div
            className={cx(
              'tabular-nums',
              loc.safetyStockSuggested === loc.safetyStockProcurement
                ? 'text-white/50'
                : 'text-[#E8A020]',
            )}
          >
            採購 {loc.safetyStockProcurement}
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-white/40">最高量</div>
          <div className="flex items-center gap-2">
            <span className="text-white/80 tabular-nums">建議 {loc.maxStockSuggested}</span>
          </div>
          <div
            className={cx(
              'tabular-nums',
              loc.maxStockSuggested === loc.maxStockProcurement
                ? 'text-white/50'
                : 'text-[#E8A020]',
            )}
          >
            採購 {loc.maxStockProcurement}
          </div>
        </div>
      </div>

      {consistency !== 'consistent' ? (
        <div className="flex items-center justify-end gap-2 border-t border-white/10 pt-2">
          <button
            type="button"
            onClick={() => handleAction('adjust')}
            className="h-8 rounded border border-white/10 bg-white/5 px-3 text-xs text-white/70 transition-colors hover:border-white/20"
          >
            調整建議
          </button>
          <button
            type="button"
            onClick={() => handleAction('notify')}
            className="h-8 rounded border border-[#E8A020]/60 bg-[#E8A020]/5 px-3 text-xs text-[#E8A020] transition-colors hover:bg-[#E8A020]/10"
          >
            通知採購
          </button>
        </div>
      ) : null}

      {notice ? (
        <div className="flex items-center gap-2 rounded border border-[#1D9E75]/40 bg-[#1D9E75]/10 px-3 py-2 text-xs text-[#1D9E75]">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
          <span>{notice}</span>
        </div>
      ) : null}
    </div>
  );
}

export function MobileLocationListPage() {
  const [filter, setFilter] = useState<FilterValue>('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return MOCK_WAREHOUSE_LOCATIONS;
    if (filter === 'consistent') {
      return MOCK_WAREHOUSE_LOCATIONS.filter((l) => diagnoseConsistency(l) === 'consistent');
    }
    return MOCK_WAREHOUSE_LOCATIONS.filter((l) => diagnoseConsistency(l) !== 'consistent');
  }, [filter]);

  const mismatchCount = MOCK_WAREHOUSE_LOCATIONS.filter(
    (l) => diagnoseConsistency(l) !== 'consistent',
  ).length;

  return (
    <div className="space-y-4 p-4 pb-[calc(env(safe-area-inset-bottom)+4rem)]">
      <header className="space-y-1">
        <h1 className="text-lg text-white">庫存中心 · 庫位管理</h1>
        <p className="text-xs text-white/50">
          各庫位存放料號與坪效建議,與採購實際設定比對
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cx(
              'inline-flex h-8 items-center rounded-full border px-3 text-xs transition-colors',
              filter === f.id
                ? 'border-[#E8A020]/60 bg-[#E8A020]/10 text-[#E8A020]'
                : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="text-xs text-white/50 tabular-nums">
        共 {filtered.length} 個庫位 · 需與採購討論 {mismatchCount} 個
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-xs text-white/50">
          目前沒有符合篩選條件的庫位
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((loc) => (
            <LocationCard key={loc.code} loc={loc} />
          ))}
        </div>
      )}
    </div>
  );
}
