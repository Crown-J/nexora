// apps/nx-ui/src/features/sale/ui/inquiry/MobileInquiryListPage.tsx
/**
 * R7 Phase 7-3：同行調貨 RFQ 列表頁。
 *
 * 入口：工作站 → 同行調貨（/dashboard/sale/inquiry）
 * 功能：
 *   - 狀態篩選 chip（全部 / 待回覆 / 已回覆 / 已採用）
 *   - RFQ 列表（依 createdAt 由新到舊，store 內已保證）
 *   - 點項目跳 /dashboard/sale/inquiry/[rfqId]
 *
 * Phase 7-3 不實作詳情頁互動（那是 7-4）。
 */

'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { cx } from '@design/utils/cx';
import { InquiryListItem } from './components/InquiryListItem';
import { useRFQStore } from './store';
import type { RFQStatus } from './types';

type FilterValue = 'all' | RFQStatus;

interface FilterDef {
  id: FilterValue;
  label: string;
}

const FILTERS: readonly FilterDef[] = [
  { id: 'all', label: '全部' },
  { id: 'waiting', label: '待回覆' },
  { id: 'responded', label: '已回覆' },
  { id: 'adopted', label: '已採用' },
];

export function MobileInquiryListPage() {
  const router = useRouter();
  const rfqs = useRFQStore((s) => s.rfqs);
  const [filter, setFilter] = useState<FilterValue>('all');

  const filteredRFQs = useMemo(() => {
    if (filter === 'all') return rfqs;
    return rfqs.filter((r) => r.status === filter);
  }, [rfqs, filter]);

  return (
    <div className="space-y-4 p-4 pb-[calc(env(safe-area-inset-bottom)+4rem)]">
      <header className="space-y-1">
        <h1 className="text-lg text-white">銷售中心 · 同行調貨</h1>
        <p className="text-xs text-white/50">處理缺貨料號的詢價比價</p>
      </header>

      {/* 狀態篩選 chips */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const isActive = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cx(
                'inline-flex h-8 items-center rounded-full border px-3 text-xs transition-colors',
                isActive
                  ? 'border-[#E8A020]/60 bg-[#E8A020]/10 text-[#E8A020]'
                  : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20',
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div className="text-xs text-white/50 tabular-nums">共 {filteredRFQs.length} 筆</div>

      {filteredRFQs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-xs text-white/50">
          目前沒有符合篩選條件的詢價單
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRFQs.map((rfq) => (
            <InquiryListItem
              key={rfq.id}
              rfq={rfq}
              onClick={() => router.push(`/dashboard/sale/inquiry/${rfq.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
