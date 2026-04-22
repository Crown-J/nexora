// apps/nx-ui/src/features/sale/ui/sop-workspace/components/Step1SelectCustomer.tsx
/**
 * STEP 1 — 選擇客戶
 *
 * 戲劇亮點 2（客戶等級自動套價）的舞台：
 * - 選完客戶，卡片變金邊展開
 * - 帶出等級 A/B/C/D、當月毛利率、主要車型、系統偏好提示
 * - 刻意「不顯示」AR / 付款條件 / 逾期 → 對應 Crown 說的權限切割
 *
 * UX：
 * - 上方搜尋框：依名稱 / 聯絡人 / 電話 filter
 * - 未選時：列出所有最近拜訪客戶（緊湊卡片）
 * - 選中：僅保留選中客戶大卡（含詳情），下方多一個「選其他客戶」按鈕
 */

'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, Award, BarChart3, Car, Lightbulb, Search, Sparkles, User } from 'lucide-react';

import { cx } from '@/shared/lib/cx';

import { MOCK_CUSTOMERS } from '../mock-data/customers';
import type { Customer, SaleSopAction, SaleSopState } from '../types';
import { StepWrapper } from './StepWrapper';

export type Step1SelectCustomerProps = {
  state: SaleSopState;
  dispatch: React.Dispatch<SaleSopAction>;
  onNext: () => void;
};

const TIER_COLOR: Record<Customer['tier'], { badge: string; label: string }> = {
  A: { badge: 'bg-[#E8A020] text-black', label: 'A 級' },
  B: { badge: 'bg-[#3B82F6] text-white', label: 'B 級' },
  C: { badge: 'bg-white/20 text-white', label: 'C 級' },
  D: { badge: 'bg-white/10 text-white/60', label: 'D 級' },
};

function TierBadge({ tier }: { tier: Customer['tier'] }) {
  const meta = TIER_COLOR[tier];
  return (
    <span
      className={cx(
        'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider',
        meta.badge,
      )}
    >
      {meta.label}
    </span>
  );
}

function CompactCustomerCard({
  customer,
  onSelect,
}: {
  customer: Customer;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cx(
        'group w-full rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left',
        'transition-all duration-200 hover:border-white/25 hover:bg-white/[0.06] active:scale-[0.99]',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-base font-semibold text-white/95">
              🏪 {customer.name}
            </span>
            <TierBadge tier={customer.tier} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-white/55">
            <span>{customer.contact}</span>
            <span>·</span>
            <span>{customer.mainVehicle}</span>
            <span>·</span>
            <span>上次拜訪 {customer.lastVisit}</span>
          </div>
        </div>
        <ArrowRight
          className="h-4 w-4 shrink-0 text-white/30 transition-colors group-hover:text-white/70"
          aria-hidden
        />
      </div>
    </button>
  );
}

function SelectedCustomerCard({
  customer,
  onReset,
}: {
  customer: Customer;
  onReset: () => void;
}) {
  return (
    <div className="rounded-2xl border-2 border-[#E8A020] bg-[#E8A020]/[0.06] p-5 shadow-[0_8px_24px_rgba(232,160,32,0.15)]">
      {/* 已選標記 */}
      <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#E8A020]">
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
        已選客戶
      </div>

      {/* 客戶抬頭 */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-white">🏪 {customer.name}</h3>
          <div className="mt-1 text-xs text-white/60">
            {customer.customerType} · {customer.address}
          </div>
        </div>
        <TierBadge tier={customer.tier} />
      </div>

      {/* 聯絡資訊 */}
      <div className="mt-4 grid grid-cols-1 gap-2 text-sm">
        <div className="flex items-center gap-2 text-white/80">
          <User className="h-4 w-4 text-white/40" aria-hidden />
          <span>{customer.contact}</span>
          <span className="text-white/35">·</span>
          <span className="tabular-nums text-white/60">{customer.phone}</span>
        </div>
      </div>

      {/* 業務指標（毛利率） */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-white/10 bg-black/30 p-3">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/40">
            <Award className="h-3 w-3" aria-hidden />
            客戶等級
          </div>
          <div className="mt-1 text-xl font-bold text-[#E8A020]">{customer.tier}</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/30 p-3">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/40">
            <BarChart3 className="h-3 w-3" aria-hidden />
            本月毛利率
          </div>
          <div className="mt-1 text-xl font-bold text-[#1D9E75] tabular-nums">
            {customer.monthlyGrossMargin}%
          </div>
        </div>
      </div>

      {/* 主要車型 */}
      <div className="mt-3 rounded-lg border border-white/10 bg-black/30 p-3">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/40">
          <Car className="h-3 w-3" aria-hidden />
          主要車型
        </div>
        <div className="mt-1 text-sm font-medium text-white/90">{customer.mainVehicle}</div>
      </div>

      {/* 系統提示 */}
      <div className="mt-3 flex items-start gap-2 rounded-lg border border-[#1D9E75]/30 bg-[#1D9E75]/[0.08] p-3">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[#1D9E75]" aria-hidden />
        <div className="text-[11px] leading-relaxed text-white/80">
          <div className="font-semibold text-[#1D9E75]">系統提示</div>
          <div className="mt-0.5">
            此客戶常買 {customer.preferredBrand}
            <br />
            下一步查料會自動套用 {customer.tier} 級售價
          </div>
        </div>
      </div>

      {/* 重選 */}
      <button
        type="button"
        onClick={onReset}
        className="mt-4 inline-flex h-9 items-center text-xs text-white/50 transition-colors hover:text-white/80"
      >
        ← 改選其他客戶
      </button>
    </div>
  );
}

export function Step1SelectCustomer({
  state,
  dispatch,
  onNext,
}: Step1SelectCustomerProps) {
  const [keyword, setKeyword] = useState('');

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return MOCK_CUSTOMERS;
    return MOCK_CUSTOMERS.filter((c) => {
      const hay = `${c.name} ${c.contact} ${c.phone}`.toLowerCase();
      return hay.includes(kw);
    });
  }, [keyword]);

  const selected = state.selectedCustomer;

  return (
    <StepWrapper
      canProceed={selected !== null}
      onNext={onNext}
      nextLabel={selected ? '下一步 → 查詢料號' : '下一步'}
      disabledHint={selected ? undefined : '請先選擇一位客戶'}
    >
      {selected ? (
        <SelectedCustomerCard
          customer={selected}
          onReset={() => dispatch({ type: 'CLEAR_CUSTOMER' })}
        />
      ) : (
        <>
          {/* 搜尋框 */}
          <label className="relative block">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
              aria-hidden
            />
            <input
              type="search"
              inputMode="search"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="輸入客戶名稱、聯絡人或電話"
              className={cx(
                'h-11 w-full rounded-lg border border-white/15 bg-white/[0.04] pl-9 pr-3 text-sm',
                'text-white placeholder:text-white/35',
                'focus:border-[#E8A020] focus:bg-black/40 focus:outline-none focus:ring-2 focus:ring-[#E8A020]/30',
                'transition-colors',
              )}
              aria-label="客戶搜尋"
            />
          </label>

          {/* 最近拜訪 */}
          <section className="mt-5">
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold text-white/85">最近拜訪客戶</h2>
              <span className="text-[11px] text-white/40">共 {filtered.length} 家</span>
            </div>
            {filtered.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/15 p-6 text-center text-xs text-white/50">
                沒有符合的客戶
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filtered.map((c) => (
                  <CompactCustomerCard
                    key={c.id}
                    customer={c}
                    onSelect={() => dispatch({ type: 'SELECT_CUSTOMER', customer: c })}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </StepWrapper>
  );
}
