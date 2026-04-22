// apps/nx-ui/src/features/sale/ui/sop-workspace/components/Step8OrderComplete.tsx
/**
 * STEP 8 — 訂單成立（demo 戲劇高潮）
 *
 * 訊息：業務只做了 3 件事，其他 6 件事系統自動處理。
 *
 * UX：
 * - 上半部 OrderCompleteHeader：綠色 CheckCircle2 大圈 + 訂單號 + 建立時間
 * - 中段 AutoProcessList：6 項系統自動處理逐項淡入（250ms 間隔）
 * - 下半部 YouOnlyDidThreeThings：金色 Lightbulb + 1.選客戶 2.查料 3.建單
 *
 * 動畫：各項 mount 時 opacity-0 → opacity-100（Tailwind transition，零 CSS 依賴）
 */

'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Check,
  CheckCircle2,
  Clipboard,
  Lightbulb,
  type LucideIcon,
  Package,
  TrendingUp,
  Truck,
  User,
  Wallet,
} from 'lucide-react';

import { cx } from '@/shared/lib/cx';

import { PART_BY_SKU } from '../mock-data/parts';
import { MOCK_PK_NO, TAX_RATE } from '../mock-data/scenario';
import type { SaleSopState } from '../types';
import { StepWrapper } from './StepWrapper';

export type Step8OrderCompleteProps = {
  state: SaleSopState;
  onBack: () => void;
  onNext: () => void;
};

/** 單項淡入包裝 — 進場延遲後 opacity-0 → opacity-100（transition-all 300ms） */
function FadeInItem({ delay, children }: { delay: number; children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div
      className={cx(
        'transition-all duration-300 ease-out',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0',
      )}
    >
      {children}
    </div>
  );
}

function OrderCompleteHeader({ orderNumber }: { orderNumber: string | null }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-[#1D9E75]/40 bg-[#1D9E75]/5 p-5 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1D9E75]/20">
        <CheckCircle2 className="h-8 w-8 text-[#1D9E75]" aria-hidden />
      </div>
      <div className="text-lg text-white">訂單已建立</div>
      <div className="font-mono text-xs text-white/40">{orderNumber ?? '—'}</div>
      <div className="text-xs text-white/50">建立時間：剛剛</div>
    </div>
  );
}

type AutoProcessRow = {
  icon: LucideIcon;
  title: string;
  detail: string;
};

function buildRows(state: SaleSopState): AutoProcessRow[] {
  const items = state.quoteItems;
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const tax = Math.round(subtotal * TAX_RATE);
  const total = subtotal + tax;

  // 庫存預留：依 items 對各料號本倉/新竹倉分配
  let mainReserved = 0;
  let hsinchuReserved = 0;
  items.forEach((i) => {
    const part = PART_BY_SKU[i.sku];
    if (!part) return;
    const fromMain = Math.min(i.quantity, part.stocks.main);
    mainReserved += fromMain;
    const still = i.quantity - fromMain;
    if (still > 0) {
      hsinchuReserved += Math.min(still, part.stocks.hsinchu);
    }
  });
  const stockReservedDetail =
    hsinchuReserved > 0
      ? `本倉 ${mainReserved} + 新竹倉 ${hsinchuReserved} 個`
      : `本倉 ${mainReserved} 個`;

  const deliveryDetail =
    state.deliveryMethod === 'delivery'
      ? '外務：王大偉\n預計 30 分鐘內送達'
      : state.deliveryMethod === 'pickup'
        ? '已生成 BOX 編號\n通知客戶可來取貨'
        : state.deliveryMethod === 'shipping'
          ? '已聯繫物流公司\n預計 1~3 天送達'
          : '配送方式尚未選擇';

  const preferredNote = state.selectedCustomer
    ? `${state.selectedCustomer.name}購買偏好已更新`
    : '客戶偏好已更新';

  return [
    {
      icon: Package,
      title: '庫存已預留',
      detail: stockReservedDetail,
    },
    {
      icon: Clipboard,
      title: '撿貨單已生成',
      detail: `${MOCK_PK_NO}\n已通知倉管專員`,
    },
    {
      icon: Truck,
      title: '配送任務已建立',
      detail: deliveryDetail,
    },
    {
      icon: Wallet,
      title: '應收帳款已建立',
      detail: `NT$ ${total.toLocaleString()} 月結 30 天\n（會計可見）`,
    },
    {
      icon: TrendingUp,
      title: '業績已記錄',
      detail: `本月業績 +NT$ ${total.toLocaleString()}\n本月毛利率更新：28.3%`,
    },
    {
      icon: User,
      title: '客戶偏好已更新',
      detail: preferredNote,
    },
  ];
}

function AutoProcessRowView({ row }: { row: AutoProcessRow }) {
  const Icon = row.icon;
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1D9E75]/20">
        <Check className="h-4 w-4 text-[#1D9E75]" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm text-white/90">
          <Icon className="h-3.5 w-3.5 text-white/40" aria-hidden />
          <span>{row.title}</span>
        </div>
        <div className="mt-1 whitespace-pre-line text-xs leading-relaxed text-white/50">
          {row.detail}
        </div>
      </div>
    </div>
  );
}

function AutoProcessList({ state }: { state: SaleSopState }) {
  const rows = useMemo(() => buildRows(state), [state]);

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="mb-4 text-xs text-white/50">系統已自動處理</div>
      <div className="flex flex-col gap-3">
        {rows.map((r, idx) => (
          <FadeInItem key={`${r.title}-${idx}`} delay={idx * 250}>
            <AutoProcessRowView row={r} />
          </FadeInItem>
        ))}
      </div>
    </div>
  );
}

function YouOnlyDidThreeThings() {
  return (
    <div className="rounded-lg border border-[#E8A020]/40 bg-[#E8A020]/5 p-4">
      <div className="flex items-start gap-3">
        <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-[#E8A020]" aria-hidden />
        <div className="flex-1 space-y-2 text-xs">
          <div className="text-sm text-white/90">業務您只做了 3 件事：</div>
          <div className="space-y-1 pl-1 text-white/70">
            <div className="flex items-center gap-2">
              <span className="w-4 text-white/40">1.</span>
              <span>選客戶</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 text-white/40">2.</span>
              <span>查料 / 報價</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 text-white/40">3.</span>
              <span>建單</span>
            </div>
          </div>
          <div className="border-t border-white/10 pt-2 leading-relaxed text-white/60">
            其他 6 件事系統全部幫您做，回公司不用再打單、不用通知倉管、不用追進度
          </div>
        </div>
      </div>
    </div>
  );
}

export function Step8OrderComplete({ state, onBack, onNext }: Step8OrderCompleteProps) {
  return (
    <StepWrapper
      canProceed
      onBack={onBack}
      onNext={onNext}
      nextLabel="下一步 → 成交總結"
      tone="primary"
    >
      <div className="space-y-4">
        <OrderCompleteHeader orderNumber={state.orderNumber} />
        <AutoProcessList state={state} />
        <YouOnlyDidThreeThings />
      </div>
    </StepWrapper>
  );
}
