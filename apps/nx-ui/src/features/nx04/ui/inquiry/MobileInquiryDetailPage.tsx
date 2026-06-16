// apps/nx-ui/src/features/sale/ui/inquiry/MobileInquiryDetailPage.tsx
/**
 * R7 Phase 7-4:同行調貨 RFQ 詳情頁。
 *
 * 頁面節奏:
 *   上:返回 + RFQ 資訊卡（單號、客戶、料號、數量）
 *   中:同行報價列表（0 家時空狀態提示）+「新增同行報價」按鈕
 *   下:「全部不採用,結案」按鈕
 *
 * 採用後會自動 push 回列表頁並彈 toast。
 *
 * Phase 7-5 在狀態追蹤會新增「待確認報價」群組顯示生成的 QT,
 * 所以本頁只負責 RFQ→QT 的 mutation,不顯示下游 QT。
 */

'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Plus } from 'lucide-react';

import { FloatingToast, type ToastType } from '@/features/nx04/ui/sop-workspace/components/FloatingToast';

import { AdoptQuoteDialog } from './components/AdoptQuoteDialog';
import { ConfirmDialog } from './components/ConfirmDialog';
import { VendorQuoteInput } from './components/VendorQuoteInput';
import { VendorQuoteItem } from './components/VendorQuoteItem';
import { useRFQStore } from './store';

const DAY_MS = 24 * 60 * 60 * 1000;

export function MobileInquiryDetailPage() {
  const router = useRouter();
  const params = useParams<{ rfqId: string }>();
  const rfqId = params?.rfqId;

  const rfq = useRFQStore((s) =>
    rfqId ? s.rfqs.find((r) => r.id === rfqId) ?? null : null,
  );
  const removeVendorQuote = useRFQStore((s) => s.removeVendorQuote);
  const adoptVendorQuote = useRFQStore((s) => s.adoptVendorQuote);
  const abandonRFQ = useRFQStore((s) => s.abandonRFQ);

  const [showAddInput, setShowAddInput] = useState(false);
  const [adoptTargetId, setAdoptTargetId] = useState<string | null>(null);
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  if (!rfq) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="mb-2 text-base text-white">找不到此詢價單</div>
        <div className="text-xs text-white/50">可能已被結案或刪除</div>
        <button
          type="button"
          onClick={() => router.push('/dashboard/sale/inquiry')}
          className="mt-6 text-xs text-white/60 hover:text-white"
        >
          ← 返回同行調貨
        </button>
      </div>
    );
  }

  const daysSince = Math.floor((Date.now() - rfq.createdAt.getTime()) / DAY_MS);
  const isFinalized = rfq.status === 'adopted' || rfq.status === 'abandoned';

  const handleAdoptConfirm = (finalPrice: number) => {
    if (!adoptTargetId) return;
    const qt = adoptVendorQuote(rfq.id, adoptTargetId, finalPrice);
    const vendorName =
      rfq.vendorQuotes.find((v) => v.id === adoptTargetId)?.vendorName ?? '同行';
    setAdoptTargetId(null);
    setToast({
      message: `已採用 ${vendorName},已建立報價單 ${qt.qtNumber}`,
      type: 'success',
    });
    // 給 toast 顯示一下再跳頁（避免彈窗收掉同時頁面切換看不到）
    setTimeout(() => router.push('/dashboard/sale/inquiry'), 400);
  };

  const handleAbandonConfirm = () => {
    abandonRFQ(rfq.id);
    setShowAbandonConfirm(false);
    setToast({ message: `已結案 ${rfq.rfqNumber}（全部不採用）`, type: 'success' });
    setTimeout(() => router.push('/dashboard/sale/inquiry'), 400);
  };

  return (
    <div className="space-y-4 p-4 pb-[calc(env(safe-area-inset-bottom)+4rem)]">
      {/* 返回 */}
      <button
        type="button"
        onClick={() => router.push('/dashboard/sale/inquiry')}
        className="inline-flex items-center gap-1 text-xs text-white/60 transition-colors hover:text-white"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        返回 同行調貨
      </button>

      {/* RFQ 資訊卡 */}
      <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm text-white/80">{rfq.rfqNumber}</span>
          <span className="text-xs text-white/50">建立於 {daysSince} 天前</span>
        </div>

        <div className="h-px bg-white/10" />

        <InfoRow label="來源客戶">
          <span className="font-mono text-xs text-white/40">{rfq.sourceCustomer.code}</span>
          <span className="text-sm text-white">{rfq.sourceCustomer.name}</span>
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-white/70">
            {rfq.sourceCustomer.tier} 級
          </span>
        </InfoRow>

        <InfoRow label="料號">
          <span className="font-mono text-xs text-white/40">{rfq.part.sku}</span>
          <span className="text-sm text-white">{rfq.part.name}</span>
        </InfoRow>

        <div>
          <div className="mb-1 text-xs text-white/50">數量</div>
          <div className="text-sm text-white tabular-nums">{rfq.quantity} 個</div>
        </div>

        {isFinalized ? (
          <div
            className={
              rfq.status === 'adopted'
                ? 'rounded border border-[#1D9E75]/40 bg-[#1D9E75]/5 p-2 text-xs text-[#1D9E75]'
                : 'rounded border border-white/10 bg-white/5 p-2 text-xs text-white/50'
            }
          >
            {rfq.status === 'adopted'
              ? `已採用,報價單 ${rfq.relatedQtNumber}`
              : '已結案（全部不採用）'}
          </div>
        ) : null}
      </div>

      {/* 同行報價列表 */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm text-white">同行報價</div>
          <div className="text-xs text-white/50 tabular-nums">
            {rfq.vendorQuotes.length > 0
              ? `${rfq.vendorQuotes.length} 家已回覆`
              : '尚未有回覆'}
          </div>
        </div>

        {rfq.vendorQuotes.length === 0 ? (
          <div className="space-y-2 rounded-lg border border-white/10 p-6 text-center">
            <div className="text-xs text-white/40">尚未有同行回覆</div>
            <div className="text-xs text-white/50">
              打電話給同行詢價後,點下方「新增同行報價」記錄
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {rfq.vendorQuotes.map((q) => (
              <VendorQuoteItem
                key={q.id}
                quote={q}
                onAdopt={() => !isFinalized && setAdoptTargetId(q.id)}
                onRemove={() => removeVendorQuote(rfq.id, q.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* 新增同行報價 */}
      {!isFinalized ? (
        <button
          type="button"
          onClick={() => setShowAddInput(true)}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 text-sm text-white/70 transition-colors hover:border-white/40"
        >
          <Plus className="h-4 w-4" aria-hidden />
          <span>新增同行報價</span>
        </button>
      ) : null}

      {/* 其他動作 */}
      {!isFinalized ? (
        <>
          <div className="h-px bg-white/10" />
          <div className="space-y-2">
            <div className="text-xs text-white/50">其他動作</div>
            <button
              type="button"
              onClick={() => setShowAbandonConfirm(true)}
              className="h-11 w-full rounded-lg border border-white/10 text-sm text-white/50 transition-colors hover:border-[#E24B4A]/40 hover:text-[#E24B4A]"
            >
              全部不採用,結案
            </button>
          </div>
        </>
      ) : null}

      {/* 彈窗 / toast */}
      {showAddInput ? (
        <VendorQuoteInput
          rfqId={rfq.id}
          onSaved={({ vendorName }) => {
            setShowAddInput(false);
            setToast({
              message: `已記錄 ${vendorName} 的報價`,
              type: 'success',
            });
          }}
          onCancel={() => setShowAddInput(false)}
        />
      ) : null}

      {adoptTargetId ? (
        <AdoptQuoteDialog
          rfq={rfq}
          vendorQuoteId={adoptTargetId}
          onConfirm={handleAdoptConfirm}
          onCancel={() => setAdoptTargetId(null)}
        />
      ) : null}

      {showAbandonConfirm ? (
        <ConfirmDialog
          title="確定要結案嗎？"
          message="結案後這張詢價單將不再出現在待辦清單,無法恢復。"
          confirmLabel="確定結案"
          destructive
          onConfirm={handleAbandonConfirm}
          onCancel={() => setShowAbandonConfirm(false)}
        />
      ) : null}

      {toast ? (
        <FloatingToast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      ) : null}
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
