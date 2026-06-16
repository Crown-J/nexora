// apps/nx-ui/src/features/sale/ui/sop-workspace/components/Step1SelectCustomer.tsx
/**
 * STEP 1 — 選擇客戶（Phase 2 穩重化版本）
 *
 * 設計精神：從「蝦皮風」轉「銀行 APP 風」
 * - 無 emoji、lucide-react 線條 icon
 * - 金色只用於選中淡邊（/60）和 CTA
 * - Badge 統一灰階（bg-white/10）
 * - 字型層級扁平（不用 font-bold / text-xl+）
 *
 * 列表卡：客戶代碼 + 名稱 + 等級 + 聯絡人+電話 + 地址（3 行精簡）
 * 選中詳情卡：銷售實績 3 格 + 退貨率 + 最近 2 則備註
 * 刻意不顯示 AR/付款條件/逾期 → 業務權限切割
 */

'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Search } from 'lucide-react';

import { cx } from '@design/utils/cx';

import { MOCK_CUSTOMERS } from '../mock-data/customers';
import type { Customer, SaleSopAction, SaleSopState } from '../types';
import { StepWrapper } from './StepWrapper';

export type Step1SelectCustomerProps = {
  state: SaleSopState;
  dispatch: React.Dispatch<SaleSopAction>;
  onNext: () => void;
};

function TierBadge({ tier }: { tier: Customer['tier'] }) {
  return (
    <span className="shrink-0 rounded bg-white/10 px-2 py-0.5 text-xs text-white/80">
      {tier} 級
    </span>
  );
}

function formatNT(amount: number): string {
  return `NT$ ${amount.toLocaleString()}`;
}

function CompactCustomerRow({
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
        'w-full rounded-lg border border-white/10 bg-white/5 p-4 text-left',
        'transition-colors hover:border-white/20 active:border-[#E8A020]/60',
      )}
    >
      {/* 第一行：代碼 + 名稱 + 等級 */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 font-mono text-xs text-white/40">{customer.code}</span>
          <span className="truncate text-base text-white">{customer.name}</span>
        </div>
        <TierBadge tier={customer.tier} />
      </div>

      {/* 第二行：聯絡人 · 電話 */}
      <div className="mb-0.5 text-xs text-white/60">
        {customer.contact} · {customer.phone}
      </div>

      {/* 第三行：地址 */}
      <div className="text-xs text-white/50">{customer.address}</div>
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
  const { salesStats, remarks } = customer;

  return (
    <div className="space-y-4 rounded-lg border border-[#E8A020]/60 bg-[#E8A020]/5 p-5">
      {/* 已選標記 */}
      <div className="flex items-center gap-2 text-xs text-[#E8A020]">
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
        <span>已選客戶</span>
      </div>

      {/* 客戶基本資料 */}
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-white/40">{customer.code}</span>
          <span className="text-lg font-medium text-white">{customer.name}</span>
          <TierBadge tier={customer.tier} />
        </div>
        <div className="text-xs text-white/60">
          {customer.contact} · {customer.phone}
        </div>
        <div className="text-xs text-white/50">{customer.address}</div>
      </div>

      {/* 分隔線 */}
      <div className="h-px bg-white/10" />

      {/* 銷售實績 3 格 */}
      <div>
        <div className="mb-2 text-xs text-white/50">銷售實績</div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="text-xs text-white/40">本日</div>
            <div className="mt-0.5 text-sm tabular-nums text-white/90">
              {formatNT(salesStats.today)}
            </div>
          </div>
          <div>
            <div className="text-xs text-white/40">本月</div>
            <div className="mt-0.5 text-sm tabular-nums text-white/90">
              {formatNT(salesStats.month)}
            </div>
          </div>
          <div>
            <div className="text-xs text-white/40">今年累計</div>
            <div className="mt-0.5 text-sm tabular-nums text-white/90">
              {formatNT(salesStats.yearly)}
            </div>
          </div>
        </div>
      </div>

      {/* 退貨率（淡色） */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/50">退貨率（近 3 個月）</span>
        <span className="tabular-nums text-white/70">{salesStats.returnRate}%</span>
      </div>

      {/* 分隔線 */}
      <div className="h-px bg-white/10" />

      {/* 備註（最近 1~2 則） */}
      <div>
        <div className="mb-2 text-xs text-white/50">備註</div>
        {remarks.length === 0 ? (
          <div className="text-xs text-white/40">（無）</div>
        ) : (
          <div className="space-y-2">
            {remarks.slice(0, 2).map((r, idx) => (
              <div key={idx} className="border-l-2 border-white/20 pl-3">
                <div className="text-xs text-white/40">
                  {r.author} · {r.timeAgo}
                </div>
                <div className="mt-0.5 text-xs leading-relaxed text-white/80">{r.content}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部操作 */}
      <button
        type="button"
        onClick={onReset}
        className="text-xs text-white/40 transition-colors hover:text-white/70"
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
      const hay = `${c.code} ${c.name} ${c.contact} ${c.phone}`.toLowerCase();
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
              placeholder="輸入客戶名稱、代碼或電話"
              className={cx(
                'h-11 w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-3 text-sm',
                'text-white placeholder:text-white/35',
                'transition-colors',
                'focus:border-[#E8A020]/60 focus:outline-none',
              )}
              aria-label="客戶搜尋"
            />
          </label>

          {/* 客戶列表 */}
          <section className="mt-5">
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-sm text-white/70">最近拜訪客戶</h2>
              <span className="text-xs text-white/40">共 {filtered.length} 家</span>
            </div>
            {filtered.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-xs text-white/50">
                沒有符合的客戶
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filtered.map((c) => (
                  <CompactCustomerRow
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
