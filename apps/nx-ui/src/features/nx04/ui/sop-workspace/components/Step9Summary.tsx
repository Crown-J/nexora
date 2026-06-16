// apps/nx-ui/src/features/sale/ui/sop-workspace/components/Step9Summary.tsx
/**
 * STEP 9 — 完成總結
 *
 * 三大區塊（呼應 Crown 產品哲學）：
 *  1. DealSummary：本次成交數字（客戶/項目/金額/毛利/耗時）
 *  2. MonthlyPerformance：本月業績累加進度條 + 毛利率達標 + 團隊排名
 *  3. NewcomerReminder：4 個「不用」+ pitch 結語（招不到新人的解答）
 *
 * 自捷底部按鈕（不走 StepWrapper）：
 *  - 再來一次（reset 後回 STEP 1）
 *  - 回銷貨中心（router.push /dashboard/sale）
 */

'use client';

import { Check, Home, Lightbulb, RotateCcw, Trophy } from 'lucide-react';

import { cx } from '@design/utils/cx';

import { PART_BY_SKU } from '../mock-data/parts';
import { MOCK_SALES_PERSON_MONTHLY, TAX_RATE, TIER_TARGET_MARGIN } from '../mock-data/scenario';
import type { Customer, SaleSopState } from '../types';

export type Step9SummaryProps = {
  state: SaleSopState;
  onReset: () => void;
  onReturnToHub: () => void;
};

function formatNT(n: number): string {
  return `NT$ ${n.toLocaleString()}`;
}

function DealSummary({
  customer,
  itemCount,
  totalQty,
  total,
  margin,
  marginRate,
}: {
  customer: Customer;
  itemCount: number;
  totalQty: number;
  total: number;
  margin: number;
  marginRate: number;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-[#1D9E75]/40 bg-[#1D9E75]/5 p-5 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1D9E75]/20">
        <Trophy className="h-7 w-7 text-[#1D9E75]" aria-hidden />
      </div>
      <div className="text-lg text-white">成交！</div>

      <div className="w-full space-y-2 border-t border-white/10 pt-3 text-left text-sm">
        <div className="flex items-center justify-between">
          <span className="text-white/50">客戶</span>
          <span className="text-white/90">
            <span className="font-mono text-xs text-white/40">{customer.code}</span>{' '}
            {customer.name}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-white/50">項目</span>
          <span className="tabular-nums text-white/90">
            {itemCount} 款共 {totalQty} 個
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-white/50">金額</span>
          <span className="tabular-nums text-white/90">{formatNT(total)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-white/50">毛利</span>
          <span className="tabular-nums text-white/90">
            {formatNT(margin)} ({marginRate.toFixed(1)}%)
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-white/50">耗時</span>
          <span className="text-white/90">約 5 分鐘（從掏手機）</span>
        </div>
      </div>
    </div>
  );
}

function MonthlyPerformance({
  thisDealTotal,
  customerTier,
}: {
  thisDealTotal: number;
  customerTier: Customer['tier'];
}) {
  const m = MOCK_SALES_PERSON_MONTHLY;
  const newActual = m.monthlyActualWithoutThisDeal + thisDealTotal;
  const achievement = (newActual / m.monthlyTarget) * 100;
  const reachedSales = achievement >= 100;

  const targetMargin = TIER_TARGET_MARGIN[customerTier];
  const reachedMargin = m.monthlyMarginRate >= targetMargin;

  const newDealCount = m.monthlyDealCountWithoutThisDeal + 1;

  return (
    <div className="space-y-4 rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs text-white/50">本月業績累計</div>
        <div className="text-xs text-white/40">{m.name}</div>
      </div>

      {/* 業績進度條 */}
      <div>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-white/70">業績</span>
          <span className="tabular-nums text-white/90">
            {formatNT(Math.round(newActual))}
            <span className="ml-1 text-xs text-white/40">
              / {m.monthlyTarget.toLocaleString()}
            </span>
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-[#E8A020] transition-all duration-700"
            style={{ width: `${Math.min(achievement, 100)}%` }}
          />
        </div>
        <div className="mt-1 flex items-center justify-between text-xs">
          <span className="text-white/50">達成率</span>
          <span className={reachedSales ? 'text-[#1D9E75]' : 'text-[#E8A020]'}>
            {achievement.toFixed(1)}%　{reachedSales ? '達標' : '接近達標'}
          </span>
        </div>
      </div>

      <div className="h-px bg-white/10" />

      {/* 毛利率 */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-white/70">本月毛利率</span>
        <span className={reachedMargin ? 'text-[#1D9E75]' : 'text-[#E8A020]'}>
          {m.monthlyMarginRate}%　{reachedMargin ? '達標' : '略低'}
        </span>
      </div>

      {/* 成交數 + 排名 */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-white/70">本月成交</span>
        <span className="tabular-nums text-white/90">
          {newDealCount} 單
          <span className="ml-2 text-xs text-white/40">
            團隊 #{m.teamRank} / {m.teamSize}
          </span>
        </span>
      </div>
    </div>
  );
}

function NewcomerReminder() {
  const items = [
    '不用背客戶等級',
    '不用背料號對應',
    '不用回公司查庫存',
    '不用擔心價格報錯',
  ];
  return (
    <div className="rounded-lg border border-[#E8A020]/40 bg-[#E8A020]/5 p-4">
      <div className="flex items-start gap-3">
        <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-[#E8A020]" aria-hidden />
        <div className="flex-1">
          <div className="mb-3 text-sm text-white/90">給新業務的提醒</div>
          <div className="mb-3 text-xs text-white/70">
            您剛剛跟著系統走完了一次完整銷售流程，而且：
          </div>
          <div className="mb-3 space-y-1.5 pl-1 text-xs text-white/70">
            {items.map((t) => (
              <div key={t} className="flex items-center gap-2">
                <Check className="h-3 w-3 shrink-0 text-[#1D9E75]" aria-hidden />
                <span>{t}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-white/10 pt-2 text-xs leading-relaxed text-white/80">
            新業務也能像老業務一樣，專業地服務客戶
          </div>
        </div>
      </div>
    </div>
  );
}

export function Step9Summary({ state, onReset, onReturnToHub }: Step9SummaryProps) {
  const customer = state.selectedCustomer;
  const items = state.quoteItems;

  // 沒客戶（直跳 step 9）走 fallback，不該發生
  if (!customer || items.length === 0) {
    return (
      <div className="flex min-h-[calc(100dvh-170px)] flex-col">
        <div className="flex-1 px-4 pb-28 pt-4">
          <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-center text-sm text-white/60">
            缺少訂單資料，請從頭開始流程
          </div>
        </div>
        <BottomBar onReset={onReset} onReturnToHub={onReturnToHub} />
      </div>
    );
  }

  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const tax = Math.round(subtotal * TAX_RATE);
  const total = subtotal + tax;
  const cost = items.reduce((s, i) => {
    const part = PART_BY_SKU[i.sku];
    return s + (part ? part.unitCost * i.quantity : 0);
  }, 0);
  const margin = subtotal - cost;
  const marginRate = subtotal > 0 ? (margin / subtotal) * 100 : 0;

  return (
    <div className="flex min-h-[calc(100dvh-170px)] flex-col">
      <div className="flex-1 px-4 pb-28 pt-4">
        <div className="space-y-4">
          <DealSummary
            customer={customer}
            itemCount={items.length}
            totalQty={totalQty}
            total={total}
            margin={margin}
            marginRate={marginRate}
          />
          <MonthlyPerformance thisDealTotal={total} customerTier={customer.tier} />
          <NewcomerReminder />
        </div>
      </div>
      <BottomBar onReset={onReset} onReturnToHub={onReturnToHub} />
    </div>
  );
}

function BottomBar({
  onReset,
  onReturnToHub,
}: {
  onReset: () => void;
  onReturnToHub: () => void;
}) {
  return (
    <nav
      aria-label="成交後操作"
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-black/95 px-4 py-3 backdrop-blur"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onReset}
          className={cx(
            'inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-white/20 text-sm text-white/80',
            'transition-colors hover:border-white/40 active:scale-[0.98]',
          )}
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          再來一次
        </button>
        <button
          type="button"
          onClick={onReturnToHub}
          className={cx(
            'inline-flex h-12 flex-[2] items-center justify-center gap-2 rounded-lg',
            'bg-[#E8A020] text-sm font-medium text-black shadow-[0_6px_18px_rgba(232,160,32,0.35)]',
            'transition-colors hover:bg-[#E8A020]/90 active:scale-[0.98]',
          )}
        >
          <Home className="h-4 w-4" aria-hidden />
          回銷貨中心
        </button>
      </div>
    </nav>
  );
}
