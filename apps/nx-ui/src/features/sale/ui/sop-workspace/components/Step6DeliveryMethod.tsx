// apps/nx-ui/src/features/sale/ui/sop-workspace/components/Step6DeliveryMethod.tsx
/**
 * STEP 6 — 配送方式（外務配送 / 客戶自取 / 物流寄送）
 *
 * 核心展示：系統依客戶類型與地區推薦最適合的方式（新業務不用想）。
 * 推薦邏輯：
 *   - 同行客戶 → 客戶自取（業界慣例：同行會自己來）
 *   - 偏遠客戶 → 物流寄送（通常補庫存不急）
 *   - 其他 → 外務配送（近區保養廠 30 分鐘可到）
 */

'use client';

import { Info, type LucideIcon, Package, ShoppingBag, Truck } from 'lucide-react';

import { cx } from '@design/utils/cx';

import type { Customer, DeliveryMethod, SaleSopAction, SaleSopState } from '../types';
import { StepWrapper } from './StepWrapper';

export type Step6DeliveryMethodProps = {
  state: SaleSopState;
  dispatch: React.Dispatch<SaleSopAction>;
  onBack: () => void;
  onNext: () => void;
};

type Option = {
  id: DeliveryMethod;
  icon: LucideIcon;
  title: string;
  description: string;
  detail: string;
};

const OPTIONS: readonly Option[] = [
  {
    id: 'delivery',
    icon: Truck,
    title: '外務配送',
    description: '預計 30 分鐘內送達',
    detail: '現場簽收',
  },
  {
    id: 'pickup',
    icon: ShoppingBag,
    title: '客戶自取',
    description: '適用：同行客戶、順路過來',
    detail: '產生 BOX 編號給客戶取貨',
  },
  {
    id: 'shipping',
    icon: Package,
    title: '物流寄送',
    description: '適用：南部或偏遠地區',
    detail: '通常為補庫存（不急）',
  },
];

function getRecommendedDelivery(customer: Customer): DeliveryMethod {
  if (customer.customerType === '同行') return 'pickup';
  if (customer.isRemote) return 'shipping';
  return 'delivery';
}

function getRecommendationReason(customer: Customer): string {
  if (customer.customerType === '同行') {
    return '此客戶為同行，通常會自行前來取貨';
  }
  if (customer.isRemote) {
    return '此客戶位於較偏遠地區，物流寄送最適合';
  }
  return `此客戶在${customer.address}附近，外務 30 分鐘可到`;
}

function DeliveryCard({
  option,
  isRecommended,
  isSelected,
  onSelect,
}: {
  option: Option;
  isRecommended: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const Icon = option.icon;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cx(
        'w-full rounded-lg border p-4 text-left transition-colors',
        isSelected
          ? 'border-[#E8A020]/60 bg-[#E8A020]/5'
          : 'border-white/10 bg-white/5 hover:border-white/20',
      )}
    >
      <div className="flex items-start gap-3">
        <Icon
          className={cx(
            'mt-0.5 h-5 w-5 shrink-0',
            isSelected ? 'text-[#E8A020]' : 'text-white/60',
          )}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-sm text-white">{option.title}</span>
            {isRecommended ? (
              <span className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-white/70">
                推薦
              </span>
            ) : null}
          </div>
          <div className="text-xs text-white/70">{option.description}</div>
          <div className="mt-1 text-xs text-white/50">{option.detail}</div>
        </div>
      </div>
    </button>
  );
}

export function Step6DeliveryMethod({
  state,
  dispatch,
  onBack,
  onNext,
}: Step6DeliveryMethodProps) {
  const customer = state.selectedCustomer;
  const selected = state.deliveryMethod;

  // 無客戶（不該發生，但保險）時 fallback
  if (!customer) {
    return (
      <StepWrapper canProceed={false} onBack={onBack} onNext={onNext}>
        <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-center text-sm text-white/60">
          缺少客戶資料，請回上一步重新選擇
        </div>
      </StepWrapper>
    );
  }

  const recommended = getRecommendedDelivery(customer);
  const recommendedOption = OPTIONS.find((o) => o.id === recommended);

  return (
    <StepWrapper
      canProceed={selected !== null}
      onBack={onBack}
      onNext={onNext}
      nextLabel={selected ? '下一步' : '下一步'}
      disabledHint={selected ? undefined : '請選擇配送方式'}
    >
      {/* 客戶摘要 */}
      <div className="mb-3 space-y-1 rounded-lg border border-white/10 bg-white/5 p-3">
        <div className="flex items-center gap-2">
          <span className="shrink-0 font-mono text-xs text-white/40">{customer.code}</span>
          <span className="truncate text-sm text-white">{customer.name}</span>
        </div>
        <div className="text-xs text-white/60">{customer.address}</div>
        <div className="text-xs text-white/50">類型：{customer.customerType}</div>
      </div>

      {/* 系統推薦提示 */}
      <div className="mb-4 flex items-start gap-2 rounded-lg border border-[#E8A020]/40 bg-[#E8A020]/5 p-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#E8A020]" aria-hidden />
        <div className="text-xs">
          <div className="mb-1 text-white/80">
            系統推薦：{recommendedOption?.title}
          </div>
          <div className="text-white/60">{getRecommendationReason(customer)}</div>
        </div>
      </div>

      {/* 三個選項 */}
      <div className="space-y-3">
        {OPTIONS.map((opt) => (
          <DeliveryCard
            key={opt.id}
            option={opt}
            isRecommended={opt.id === recommended}
            isSelected={selected === opt.id}
            onSelect={() => dispatch({ type: 'SET_DELIVERY_METHOD', method: opt.id })}
          />
        ))}
      </div>
    </StepWrapper>
  );
}
