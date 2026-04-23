// apps/nx-ui/src/features/inventory-mobile/delivery/MobileDeliveryListPage.tsx
/**
 * TASK-BUSINESS-RESTRUCTURE Phase 7:庫存中心 · 送貨清單(DN)。
 *
 * 入口:/dashboard/inventory-mobile/delivery
 *
 * 操作:
 *   delivering → [客戶已簽收] completeDelivery → DN signed + SO → completed
 *
 * Phase 9 / 11 會擴充「順路取調貨」指引 + 組長拖拉排序;
 * Phase 7 僅提供最小化 stub 讓 PK→BX→DN 連動可跑通。
 */

'use client';

import { useMemo, useState } from 'react';
import { Building2, MapPin } from 'lucide-react';

import { cx } from '@/shared/lib/cx';

import { useSalesStore } from '@/features/sale/ui/fulfillment/store';
import type { DN, DNStatus, SO } from '@/features/sale/ui/fulfillment/types';

import { DocStatusBadge, type DocStatusTone } from '../shared/DocStatusBadge';

type FilterValue = 'all' | DNStatus;

const FILTERS: ReadonlyArray<{ id: FilterValue; label: string }> = [
  { id: 'all', label: '全部' },
  { id: 'delivering', label: '配送中' },
  { id: 'signed', label: '已簽收' },
];

const DN_TONE: Record<DNStatus, DocStatusTone> = {
  pending: 'warn',
  delivering: 'info',
  signed: 'success',
  cancelled: 'muted',
};

const DN_STATUS_LABEL: Record<DNStatus, string> = {
  pending: '待出貨',
  delivering: '配送中',
  signed: '已簽收',
  cancelled: '已取消',
};

function DNCard({
  dn,
  so,
  onSigned,
}: {
  dn: DN;
  so: SO | undefined;
  onSigned: () => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm text-white/80">{dn.dnNumber}</span>
        <DocStatusBadge tone={DN_TONE[dn.status]}>{DN_STATUS_LABEL[dn.status]}</DocStatusBadge>
      </div>

      {so ? (
        <>
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 shrink-0 text-white/40" aria-hidden />
            <span className="shrink-0 font-mono text-xs text-white/40">{so.customer.code}</span>
            <span className="min-w-0 flex-1 truncate text-white/80">{so.customer.name}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/50">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="min-w-0 flex-1 truncate">配送中(地址略)</span>
          </div>
        </>
      ) : null}

      <div className="flex items-center justify-between border-t border-white/10 pt-2 text-xs">
        <span className="text-white/50">
          包貨單 <span className="font-mono text-white/70">{dn.relatedBxNumber}</span>
        </span>
        {dn.status === 'delivering' ? (
          <button
            type="button"
            onClick={onSigned}
            className="h-8 rounded bg-[#1D9E75] px-3 text-xs text-black transition-colors hover:bg-[#1D9E75]/90"
          >
            客戶已簽收
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function MobileDeliveryListPage() {
  const dns = useSalesStore((s) => s.dns);
  const sos = useSalesStore((s) => s.sos);
  const completeDelivery = useSalesStore((s) => s.completeDelivery);

  const [filter, setFilter] = useState<FilterValue>('all');

  const sosByNumber = useMemo(() => {
    const m = new Map<string, SO>();
    for (const s of sos) m.set(s.soNumber, s);
    return m;
  }, [sos]);

  const filtered = useMemo(() => {
    const sorted = [...dns].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    if (filter === 'all') return sorted;
    return sorted.filter((dn) => dn.status === filter);
  }, [dns, filter]);

  const pendingCount = dns.filter((dn) => dn.status !== 'signed' && dn.status !== 'cancelled')
    .length;

  return (
    <div className="space-y-4 p-4 pb-[calc(env(safe-area-inset-bottom)+4rem)]">
      <header className="space-y-1">
        <h1 className="text-lg text-white">庫存中心 · 送貨清單</h1>
        <p className="text-xs text-white/50">客戶簽收後自動標記 SO 為已完成</p>
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
        共 {filtered.length} 筆 · 尚待處理 {pendingCount} 筆
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-xs text-white/50">
          目前沒有符合篩選條件的送貨單
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((dn) => (
            <DNCard
              key={dn.id}
              dn={dn}
              so={sosByNumber.get(dn.relatedSoNumber)}
              onSigned={() => completeDelivery(dn.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
