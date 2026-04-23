// apps/nx-ui/src/features/sale/ui/sop-workspace/components/Step7SignMethod.tsx
/**
 * STEP 7 — 簽單方式（電子簽 vs 紙本）
 *
 * 戲劇點 4：系統懂客戶習慣
 * - 電子簽：年輕客戶、手機螢幕簽名後訂單立刻成立
 * - 紙本：傳統客戶、回公司列印 → 外務送貨時簽名帶回
 *
 * 選電子簽 → 彈出簽名板 Modal → 完成後回主畫面顯示綠色「簽名已完成」
 * 選紙本   → 留在主畫面顯示「回公司列印」提示
 */

'use client';

import { useState } from 'react';
import {
  Building2,
  CheckCircle2,
  FileText,
  Info,
  type LucideIcon,
  PenLine,
  Truck,
} from 'lucide-react';

import { cx } from '@/shared/lib/cx';

import { PART_BY_SKU } from '../mock-data/parts';
import { TAX_RATE } from '../mock-data/scenario';
import type { SaleSopAction, SaleSopState, SignMethod } from '../types';
import { SignaturePadModal } from './SignaturePadModal';
import { StepWrapper } from './StepWrapper';

export type Step7SignMethodProps = {
  state: SaleSopState;
  dispatch: React.Dispatch<SaleSopAction>;
  onBack: () => void;
  onNext: () => void;
};

function OrderPreview({ state }: { state: SaleSopState }) {
  const customer = state.selectedCustomer;
  const items = state.quoteItems;
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const tax = Math.round(subtotal * TAX_RATE);
  const total = subtotal + tax;

  const deliveryLabel =
    state.deliveryMethod === 'delivery'
      ? '外務配送（30 分鐘內）'
      : state.deliveryMethod === 'pickup'
        ? '客戶自取（BOX 編號）'
        : state.deliveryMethod === 'shipping'
          ? '物流寄送（1~3 天）'
          : '—';

  return (
    <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="text-xs text-white/50">訂單預覽</div>

      {/* 訂單號 */}
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-white/40" aria-hidden />
        <span className="font-mono text-sm text-white/90">
          {state.orderNumber ?? '生成中…'}
        </span>
      </div>

      {/* 客戶 */}
      {customer ? (
        <div className="flex items-center gap-2 text-sm">
          <Building2 className="h-4 w-4 shrink-0 text-white/40" aria-hidden />
          <span className="font-mono text-xs text-white/40">{customer.code}</span>
          <span className="truncate text-white/90">{customer.name}</span>
        </div>
      ) : null}

      {/* 分隔線 */}
      <div className="h-px bg-white/10" />

      {/* 項目清單 */}
      <div>
        <div className="mb-2 text-xs text-white/50">項目（{items.length} 項）</div>
        <div className="space-y-1 text-xs text-white/70">
          {items.map((item) => {
            const part = PART_BY_SKU[item.sku];
            return (
              <div key={item.sku} className="flex items-center gap-2">
                <span className="shrink-0 font-mono text-white/40">{item.sku}</span>
                <span className="min-w-0 flex-1 truncate">{part?.name ?? ''}</span>
                <span className="shrink-0 tabular-nums text-white/60">×{item.quantity}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 分隔線 */}
      <div className="h-px bg-white/10" />

      {/* 總金額 */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-white/80">總金額</span>
        <span className="text-sm font-medium tabular-nums text-white">
          NT$ {total.toLocaleString()}
        </span>
      </div>

      {/* 配送 */}
      <div className="flex items-center gap-2 text-xs">
        <Truck className="h-3.5 w-3.5 text-white/40" aria-hidden />
        <span className="text-white/60">配送：{deliveryLabel}</span>
      </div>
    </div>
  );
}

type SignOption = {
  id: SignMethod;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  description: string;
  detail: string;
  scenario: string;
};

const OPTIONS: readonly SignOption[] = [
  {
    id: 'electronic',
    icon: PenLine,
    title: '電子簽名',
    subtitle: '現場完成',
    description: '客戶手機螢幕簽名',
    detail: '訂單立刻成立',
    scenario: '適用：年輕客戶、習慣數位化的保養廠',
  },
  {
    id: 'paper',
    icon: FileText,
    title: '紙本簽單',
    subtitle: '回公司列印',
    description: '適用：傳統習慣紙本的客戶',
    detail: '回公司列印 → 外務送貨時簽名帶回',
    scenario: '適用：老派客戶、保險公司請款',
  },
];

function SignOptionCard({
  option,
  isSelected,
  onSelect,
}: {
  option: SignOption;
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
        <div
          className={cx(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
            isSelected ? 'bg-[#E8A020]/20' : 'bg-white/10',
          )}
        >
          <Icon
            className={cx('h-5 w-5', isSelected ? 'text-[#E8A020]' : 'text-white/60')}
            aria-hidden
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-base text-white">{option.title}</span>
            <span className="text-xs text-white/40">（{option.subtitle}）</span>
          </div>
          <div className="mb-1 text-xs text-white/70">{option.description}</div>
          <div className="mb-2 text-xs text-white/50">{option.detail}</div>
          <div className="border-l-2 border-white/20 pl-2 text-xs text-white/40">
            {option.scenario}
          </div>
        </div>

        {isSelected ? (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-[#E8A020]" aria-hidden />
        ) : null}
      </div>
    </button>
  );
}

export function Step7SignMethod({ state, dispatch, onBack, onNext }: Step7SignMethodProps) {
  const [showPad, setShowPad] = useState(false);

  const selected = state.signMethod;
  const customer = state.selectedCustomer;

  const canProceed =
    selected === 'electronic' ? state.hasSigned : selected === 'paper' ? true : false;

  const disabledHint = !selected
    ? '請選擇簽單方式'
    : selected === 'electronic' && !state.hasSigned
      ? '請完成電子簽名'
      : undefined;

  const handleSelect = (id: SignMethod) => {
    dispatch({ type: 'SET_SIGN_METHOD', method: id });
    if (id === 'electronic') {
      setShowPad(true);
    }
  };

  return (
    <>
      <StepWrapper
        canProceed={canProceed}
        onBack={onBack}
        onNext={onNext}
        nextLabel={canProceed ? '下一步 → 訂單成立' : '下一步'}
        disabledHint={disabledHint}
      >
        <div className="space-y-4">
          <OrderPreview state={state} />

          <div className="text-xs text-white/50">請客戶選擇簽單方式</div>

          <div className="space-y-3">
            {OPTIONS.map((opt) => (
              <SignOptionCard
                key={opt.id}
                option={opt}
                isSelected={selected === opt.id}
                onSelect={() => handleSelect(opt.id)}
              />
            ))}
          </div>

          {/* 電子簽 已完成提示 */}
          {selected === 'electronic' && state.hasSigned ? (
            <div className="flex items-center gap-2 rounded-lg border border-[#1D9E75]/40 bg-[#1D9E75]/5 p-3">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#1D9E75]" aria-hidden />
              <div className="flex-1 text-xs text-white/80">簽名已完成，可以進入下一步</div>
              <button
                type="button"
                onClick={() => setShowPad(true)}
                className="text-xs text-white/50 transition-colors hover:text-white/80"
              >
                重新簽名
              </button>
            </div>
          ) : null}

          {/* 紙本 提示 */}
          {selected === 'paper' ? (
            <div className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 p-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-white/60" aria-hidden />
              <div className="space-y-1 text-xs text-white/70">
                <div>已登記「紙本簽單」</div>
                <div className="text-white/50">回公司後系統自動：</div>
                <div className="space-y-0.5 pl-2 text-white/60">
                  <div>• 生成訂單 PDF</div>
                  <div>• 外務帶紙本送貨</div>
                  <div>• 客戶現場簽名後外務帶回</div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </StepWrapper>

      {showPad ? (
        <SignaturePadModal
          customerContact={customer?.contact}
          onComplete={() => {
            setShowPad(false);
            dispatch({ type: 'COMPLETE_SIGNATURE' });
          }}
          onCancel={() => {
            setShowPad(false);
            dispatch({ type: 'CLEAR_SIGN_METHOD' });
          }}
        />
      ) : null}
    </>
  );
}
