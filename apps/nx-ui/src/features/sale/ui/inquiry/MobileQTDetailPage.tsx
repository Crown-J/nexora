// apps/nx-ui/src/features/sale/ui/inquiry/MobileQTDetailPage.tsx
/**
 * R7 Phase 7-5:QT 報價單詳情頁（真實資料 + 後續流程 placeholder）。
 *
 * 顯示 QT 基本資訊:單號、客戶、料號、數量、成本、售價、毛利率、來源 RFQ。
 * 「後續流程（未來實作）」說明 TI / SO 屬 R9 範疇（Crown 單據鏈）。
 *
 * 刻意不實作「客戶確認 → 轉 SO」的 mutation,這會動到庫存,違反 Phase 7 邊界。
 */

'use client';

import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Info } from 'lucide-react';

import { useRFQStore } from './store';
import { TIER_TARGET_MARGIN } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

export function MobileQTDetailPage() {
  const router = useRouter();
  const params = useParams<{ qtId: string }>();
  const qtId = params?.qtId;

  const qt = useRFQStore((s) =>
    qtId ? s.qts.find((q) => q.id === qtId) ?? null : null,
  );

  if (!qt) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="mb-2 text-base text-white">找不到此報價單</div>
        <div className="text-xs text-white/50">可能已被刪除或未生成</div>
        <button
          type="button"
          onClick={() => router.push('/dashboard/sale?section=status')}
          className="mt-6 text-xs text-white/60 hover:text-white"
        >
          ← 返回狀態追蹤
        </button>
      </div>
    );
  }

  const daysSince = Math.floor((Date.now() - qt.createdAt.getTime()) / DAY_MS);
  const tierMargin = TIER_TARGET_MARGIN[qt.customer.tier];
  const totalCost = qt.vendorCost * qt.quantity;
  const totalSales = qt.finalPrice * qt.quantity;
  const totalMargin = totalSales - totalCost;
  const marginRate = totalSales > 0 ? (totalMargin / totalSales) * 100 : 0;
  const achievedTarget = marginRate >= tierMargin;

  return (
    <div className="space-y-4 p-4 pb-[calc(env(safe-area-inset-bottom)+4rem)]">
      <button
        type="button"
        onClick={() => router.push('/dashboard/sale?section=status')}
        className="inline-flex items-center gap-1 text-xs text-white/60 transition-colors hover:text-white"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        返回狀態追蹤
      </button>

      {/* QT 基本資訊 */}
      <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm text-white/80">{qt.qtNumber}</span>
          <span className="rounded bg-[#E8A020]/15 px-2 py-0.5 text-xs text-[#E8A020]">
            {qt.status === 'pending_customer' ? '等待客戶確認' : qt.status}
          </span>
        </div>

        <div className="text-xs text-white/50">建立於 {daysSince} 天前</div>

        <div className="h-px bg-white/10" />

        <InfoRow label="客戶">
          <span className="font-mono text-xs text-white/40">{qt.customer.code}</span>
          <span className="text-sm text-white">{qt.customer.name}</span>
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-white/70">
            {qt.customer.tier} 級
          </span>
        </InfoRow>

        <InfoRow label="料號">
          <span className="font-mono text-xs text-white/40">{qt.part.sku}</span>
          <span className="text-sm text-white">{qt.part.name}</span>
        </InfoRow>

        <InfoRow label="數量">
          <span className="text-sm text-white tabular-nums">{qt.quantity} 個</span>
        </InfoRow>

        <div className="h-px bg-white/10" />

        <div className="space-y-1.5 text-sm">
          <Row label="同行成本單價" value={`NT$ ${qt.vendorCost.toLocaleString()}`} />
          <Row
            label="建議售價"
            value={`NT$ ${qt.suggestedPrice.toLocaleString()}`}
            subtle
          />
          <Row
            label="給客戶的售價"
            value={`NT$ ${qt.finalPrice.toLocaleString()}`}
            emphasize
          />
        </div>

        <div className="h-px bg-white/10" />

        <div className="space-y-1.5 text-xs">
          <Row
            label={`總成本 (${qt.quantity} 個)`}
            value={`NT$ ${totalCost.toLocaleString()}`}
            subtle
          />
          <Row
            label={`總售額 (${qt.quantity} 個)`}
            value={`NT$ ${totalSales.toLocaleString()}`}
            subtle
          />
          <Row
            label={`預估毛利 (${qt.customer.tier} 級目標 ${tierMargin}%)`}
            value={
              <span className={achievedTarget ? 'text-[#1D9E75]' : 'text-[#E8A020]'}>
                NT$ {totalMargin.toLocaleString()} ({marginRate.toFixed(1)}%){' '}
                {achievedTarget ? '✓ 達標' : '⚠ 略低'}
              </span>
            }
          />
        </div>

        {qt.source === 'inquiry' && qt.sourceRFQNumber ? (
          <div className="border-l-2 border-white/20 pl-3 text-xs text-white/60">
            來源:同行調貨 <span className="font-mono">{qt.sourceRFQNumber}</span>
          </div>
        ) : null}
      </div>

      {/* 後續流程說明 */}
      <div className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-white/60" aria-hidden />
          <div className="text-sm text-white">後續流程(未來實作)</div>
        </div>
        <div className="space-y-1 pl-6 text-xs text-white/60">
          <div>1. 客戶確認報價 → 建立調貨單 TI</div>
          <div>2. 向同行調貨 → 貨進公司倉（庫存 +{qt.quantity}）</div>
          <div>3. 建立銷貨單 SO → 正常出貨（庫存 -{qt.quantity},回到 0）</div>
        </div>
        <div className="pl-6 pt-2 text-xs text-white/40">
          此部分預計於春酒後 R9 實作;全程庫存 &gt;= 0。
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs text-white/50">{label}</div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  subtle,
  emphasize,
}: {
  label: string;
  value: React.ReactNode;
  subtle?: boolean;
  emphasize?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className={subtle ? 'text-white/40' : 'text-white/60'}>{label}</span>
      <span
        className={
          emphasize
            ? 'text-white tabular-nums'
            : subtle
              ? 'text-white/60 tabular-nums'
              : 'text-white/80 tabular-nums'
        }
      >
        {value}
      </span>
    </div>
  );
}
