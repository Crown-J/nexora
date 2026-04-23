// apps/nx-ui/src/features/sale/ui/sop-workspace/components/OutOfStockDialog.tsx
/**
 * R7 Phase 7-1：SOP STEP 2「全公司無庫存」分流決策彈窗。
 *
 * 取代 Phase 5 的 InquiryDialog（語意已被推翻）。
 * 兩個選項語意差異很大：
 *   A. 向同行調貨：業務幫客戶找貨 → 建立 RFQ 詢價單 → 之後可去「同行調貨」比價採用
 *   B. 轉客戶訂單：客戶願意等下次進貨 → 建立 Customer Order 預訂單 → 下次進貨時系統提醒
 *
 * 兩者都不扣庫存、不立刻產生 SO/QT，符合 Crown 的庫存哲學：
 *   > 庫存 >= 0 是物理定律，系統必須反映物理世界
 *
 * 呼叫端（Step2SearchParts）負責 A/B 的實際 mutation + toast。
 */

'use client';

import { AlertCircle, Calendar, Search } from 'lucide-react';

interface OutOfStockDialogProps {
  part: {
    sku: string;
    name: string;
  };
  onInquiry: () => void;
  onCustomerOrder: () => void;
  onCancel: () => void;
}

export function OutOfStockDialog({
  part,
  onInquiry,
  onCustomerOrder,
  onCancel,
}: OutOfStockDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-4 sm:items-center"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="oos-dialog-title"
    >
      <div
        className="w-full max-w-md space-y-4 rounded-t-2xl border border-white/10 bg-[#1a1a1a] p-5 sm:rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 標題 */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-[#E24B4A]" aria-hidden />
            <div id="oos-dialog-title" className="text-base text-white">
              此料號全公司無庫存
            </div>
          </div>
          <div className="text-xs text-white/60">
            <span className="font-mono">{part.sku}</span> {part.name}
          </div>
          <div className="mt-2 text-xs text-white/50">請選擇處理方式</div>
        </div>

        {/* 選項 A：向同行調貨 */}
        <button
          type="button"
          onClick={onInquiry}
          className="w-full rounded-lg border border-white/10 bg-white/5 p-4 text-left transition-all hover:border-white/20"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
              <Search className="h-4 w-4 text-white/70" aria-hidden />
            </div>
            <div className="flex-1">
              <div className="mb-1 text-sm text-white">向同行調貨</div>
              <div className="text-xs text-white/60">業務幫客戶找貨</div>
              <div className="mt-1 text-xs text-white/40">
                系統建立詢價單供日後向同行比價
              </div>
            </div>
          </div>
        </button>

        {/* 選項 B：轉客戶訂單 */}
        <button
          type="button"
          onClick={onCustomerOrder}
          className="w-full rounded-lg border border-white/10 bg-white/5 p-4 text-left transition-all hover:border-white/20"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
              <Calendar className="h-4 w-4 text-white/70" aria-hidden />
            </div>
            <div className="flex-1">
              <div className="mb-1 text-sm text-white">轉客戶訂單</div>
              <div className="text-xs text-white/60">客戶願意等下次進貨</div>
              <div className="mt-1 text-xs text-white/40">
                系統記錄預訂，下次進貨時通知業務
              </div>
            </div>
          </div>
        </button>

        {/* 取消 */}
        <button
          type="button"
          onClick={onCancel}
          className="h-10 w-full text-sm text-white/50 transition-colors hover:text-white/70"
        >
          取消
        </button>
      </div>
    </div>
  );
}
