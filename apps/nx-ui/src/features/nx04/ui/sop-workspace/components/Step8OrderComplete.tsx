// apps/nx-ui/src/features/sale/ui/sop-workspace/components/Step8OrderComplete.tsx
/**
 * STEP 8 — 訂單成立(TASK-BUSINESS-RESTRUCTURE Phase 5 重構)
 *
 * Phase 5 前:僅用 reducer 產 placeholder SO 號 + 6 項固定自動處理文案。
 * Phase 5 後:進 STEP 8 時呼叫 SalesStore.createSO,由 SYS-C 判斷 4 情境,
 *   自動建立 SO / IT / TI / PK,並把真實 SO 號 dispatch 回 reducer。
 *   自動處理清單依情境動態展示:
 *     情境 A → 撿貨單已生成
 *     情境 B → 調撥單已生成(他倉 → 本倉)
 *     情境 C → 調貨單已生成(向同行取貨)
 *     情境 D → 同時顯示調撥 + 調貨
 *
 * SOP 只會建立 stock 類型 SO(source='stock')。
 * inquiry 類型的 SO(RFQ 採用 → QT → 客戶確認)走另一條路徑,Phase 5 範圍外。
 */

'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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

import { cx } from '@design/utils/cx';

import { useSalesStore } from '@/features/nx04/ui/fulfillment/store';
import {
  SCENARIO_LABEL,
  type IT,
  type PK,
  type SO,
  type SOItem,
  type TI,
  type WarehouseKey,
} from '@/features/nx04/ui/fulfillment/types';

import { PART_BY_SKU } from '../mock-data/parts';
import { TAX_RATE } from '../mock-data/scenario';
import type { SaleSopAction, SaleSopState } from '../types';
import { StepWrapper } from './StepWrapper';

export type Step8OrderCompleteProps = {
  state: SaleSopState;
  dispatch: React.Dispatch<SaleSopAction>;
  onBack: () => void;
  onNext: () => void;
};

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

function OrderCompleteHeader({
  orderNumber,
  scenarioLabel,
}: {
  orderNumber: string | null;
  scenarioLabel: string | null;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-[#1D9E75]/40 bg-[#1D9E75]/5 p-5 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1D9E75]/20">
        <CheckCircle2 className="h-8 w-8 text-[#1D9E75]" aria-hidden />
      </div>
      <div className="text-lg text-white">訂單已建立</div>
      <div className="font-mono text-xs text-white/40">{orderNumber ?? '—'}</div>
      {scenarioLabel ? (
        <div className="rounded bg-white/10 px-2 py-0.5 text-xs text-white/70">
          {scenarioLabel}
        </div>
      ) : null}
      <div className="text-xs text-white/50">建立時間:剛剛</div>
    </div>
  );
}

type AutoProcessRow = {
  icon: LucideIcon;
  title: string;
  detail: string;
};

function warehouseLabel(wh: WarehouseKey): string {
  return wh === 'main' ? '本倉' : wh === 'hsinchu' ? '新竹倉' : '台中倉';
}

function buildRows(
  state: SaleSopState,
  so: SO | null,
  pk: PK | null,
  its: readonly IT[],
  tis: readonly TI[],
): AutoProcessRow[] {
  const items = state.quoteItems;
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const tax = Math.round(subtotal * TAX_RATE);
  const total = subtotal + tax;

  let stockTitle = '庫存已預留';
  let stockDetail = '';
  if (!so) {
    stockDetail = '準備中';
  } else if (so.scenario === 'A') {
    const totalQty = items.reduce((s, i) => s + i.quantity, 0);
    stockDetail = `本倉 ${totalQty} 個已鎖定`;
  } else if (so.scenario === 'B') {
    stockTitle = '調撥單已建立';
    stockDetail = its
      .map((it) => {
        const fromLabel = it.items.map((i) => warehouseLabel(i.fromWarehouse)).join(', ');
        const qty = it.items.reduce((s, i) => s + i.quantity, 0);
        return `${it.itNumber}\n${fromLabel} → 本倉 共 ${qty} 個`;
      })
      .join('\n');
  } else if (so.scenario === 'C') {
    stockTitle = '調貨單已建立';
    stockDetail = tis
      .map((ti) => {
        const vendors = Array.from(new Set(ti.items.map((i) => i.vendorName))).join(', ');
        const qty = ti.items.reduce((s, i) => s + i.quantity, 0);
        return `${ti.tiNumber}\n向 ${vendors} 取貨 共 ${qty} 個`;
      })
      .join('\n');
  } else {
    stockTitle = '調撥 + 調貨並行';
    const itLines = its.map((it) => it.itNumber).join(', ');
    const tiLines = tis.map((ti) => ti.tiNumber).join(', ');
    stockDetail = `${itLines}\n${tiLines}`;
  }

  let pickingTitle = '撿貨單已生成';
  let pickingDetail: string;
  if (!so) {
    pickingDetail = '準備中';
  } else if (pk) {
    pickingDetail = `${pk.pkNumber}\n已通知倉管專員`;
  } else {
    pickingTitle = '撿貨單:待備齊後自動生成';
    pickingDetail = `將於 ${so.scenario === 'B' ? '調撥' : so.scenario === 'C' ? '調貨' : '備齊'}完成後自動建立`;
  }

  const deliveryDetail =
    state.deliveryMethod === 'delivery'
      ? '外務:王大偉\n預計 30 分鐘內送達'
      : state.deliveryMethod === 'pickup'
        ? '已生成 BOX 編號\n通知客戶可來取貨'
        : state.deliveryMethod === 'shipping'
          ? '已聯繫物流公司\n預計 1~3 天送達'
          : '配送方式尚未選擇';

  const preferredNote = state.selectedCustomer
    ? `${state.selectedCustomer.name}購買偏好已更新`
    : '客戶偏好已更新';

  return [
    { icon: Package, title: stockTitle, detail: stockDetail },
    { icon: Clipboard, title: pickingTitle, detail: pickingDetail },
    { icon: Truck, title: '配送任務已建立', detail: deliveryDetail },
    {
      icon: Wallet,
      title: '應收帳款已建立',
      detail: `NT$ ${total.toLocaleString()} 月結 30 天\n(會計可見)`,
    },
    {
      icon: TrendingUp,
      title: '業績已記錄',
      detail: `本月業績 +NT$ ${total.toLocaleString()}\n本月毛利率更新:28.3%`,
    },
    { icon: User, title: '客戶偏好已更新', detail: preferredNote },
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

function YouOnlyDidThreeThings() {
  return (
    <div className="rounded-lg border border-[#E8A020]/40 bg-[#E8A020]/5 p-4">
      <div className="flex items-start gap-3">
        <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-[#E8A020]" aria-hidden />
        <div className="flex-1 space-y-2 text-xs">
          <div className="text-sm text-white/90">業務您只做了 3 件事:</div>
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
            其他 6 件事系統全部幫您做,回公司不用再打單、不用通知倉管、不用追進度
          </div>
        </div>
      </div>
    </div>
  );
}

export function Step8OrderComplete({
  state,
  dispatch,
  onBack,
  onNext,
}: Step8OrderCompleteProps) {
  const createSO = useSalesStore((s) => s.createSO);
  const soNumber = state.orderNumber;
  const so = useSalesStore((s) =>
    soNumber ? (s.sos.find((x) => x.soNumber === soNumber) ?? null) : null,
  );
  const pk = useSalesStore((s) =>
    so?.relatedPkNumber
      ? (s.pks.find((x) => x.pkNumber === so.relatedPkNumber) ?? null)
      : null,
  );
  const allIts = useSalesStore((s) => s.its);
  const allTis = useSalesStore((s) => s.tis);

  const relatedIts = useMemo(
    () =>
      so
        ? so.relatedItNumbers
            .map((n) => allIts.find((x) => x.itNumber === n))
            .filter((it): it is IT => Boolean(it))
        : [],
    [so, allIts],
  );
  const relatedTis = useMemo(
    () =>
      so
        ? so.relatedTiNumbers
            .map((n) => allTis.find((x) => x.tiNumber === n))
            .filter((ti): ti is TI => Boolean(ti))
        : [],
    [so, allTis],
  );

  // 僅第一次進 STEP 8 時觸發 store.createSO;後續重新渲染不再重建
  const didCreateRef = useRef(false);
  useEffect(() => {
    if (didCreateRef.current) return;
    const customer = state.selectedCustomer;
    if (!customer || state.quoteItems.length === 0) return;
    didCreateRef.current = true;

    const soItems: SOItem[] = state.quoteItems.map((q) => {
      const part = PART_BY_SKU[q.sku];
      return {
        sku: q.sku,
        name: part?.name ?? q.sku,
        quantity: q.quantity,
        unitPrice: q.unitPrice,
        unitCost: part?.unitCost ?? 0,
        source: 'stock',
      };
    });

    try {
      const r = createSO({
        customer: {
          code: customer.code,
          name: customer.name,
          tier: customer.tier,
        },
        items: soItems,
      });
      dispatch({ type: 'SET_ORDER_NUMBER', orderNumber: r.so.soNumber });
    } catch (error) {
      console.error('[Step8] SalesStore.createSO 失敗:', error);
    }
  }, [createSO, dispatch, state.quoteItems, state.selectedCustomer]);

  const scenarioLabel = so
    ? `備貨情境 ${so.scenario}:${SCENARIO_LABEL[so.scenario]}`
    : null;

  const rows = useMemo(
    () => buildRows(state, so, pk, relatedIts, relatedTis),
    [state, so, pk, relatedIts, relatedTis],
  );

  return (
    <StepWrapper
      canProceed
      onBack={onBack}
      onNext={onNext}
      nextLabel="下一步 → 成交總結"
      tone="primary"
    >
      <div className="space-y-4">
        <OrderCompleteHeader
          orderNumber={state.orderNumber}
          scenarioLabel={scenarioLabel}
        />
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
        <YouOnlyDidThreeThings />
      </div>
    </StepWrapper>
  );
}
