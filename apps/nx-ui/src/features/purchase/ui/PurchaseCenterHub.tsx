/**
 * @FUNCTION_CODE NX02-DASH-UI-001-F01
 * 採購中心首頁：群組標題（同主檔中心）+ Hub 卡 + 主流程 →→ + 進貨頂部虛線（延遲量測／僅監聽流程列容器）
 */

'use client';

import type { ReactNode } from 'react';
import { useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  ClipboardList,
  FileText,
  Package,
  PackageCheck,
  RotateCcw,
  Shield,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { mockPurchaseCounts } from '@/mocks/purchase-hub';
import { hubCardShellBaseClass } from '@/shared/lib/hubCardDimensions';
import { cn } from '@/lib/utils';

const BRANCH_STROKE = 'rgba(232,160,32,0.4)';
const FLOW_SOLID = '#E8A020';
const BADGE_GOLD = '#E8A020';
const BRANCH_DASH = '6 4';

type SubItem = { label: string; href: string };

type PurchaseCardConfig = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  subItems: SubItem[];
  countKind: 'pending' | 'total';
  countKey: keyof typeof mockPurchaseCounts;
};

const CARD_BASE = cn(
  hubCardShellBaseClass,
  'flex flex-col transition-all duration-300 ease-out',
  'hover:-translate-y-0.5 hover:scale-[1.01] hover:brightness-[1.03]',
  'hover:border-[#E8A020]/55 hover:shadow-[0_0_24px_rgba(232,160,32,0.22),0_12px_40px_rgba(0,0,0,0.28)]',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  'data-[state=open]:border-[#E8A020]/50 data-[state=open]:shadow-md',
);

const managementCards: PurchaseCardConfig[] = [
  {
    id: 'product',
    title: '產品管理',
    description: '零件定價/安全量',
    icon: Package,
    countKind: 'total',
    countKey: 'product',
    subItems: [
      { label: '新增料號', href: '/dashboard/base/parts' },
      { label: '料號列表', href: '/dashboard/base/parts' },
      { label: '定價管理', href: '/dashboard/purchase/product' },
      { label: '安全量設定', href: '/dashboard/purchase/product' },
    ],
  },
  {
    id: 'vendor',
    title: '廠商管理',
    description: '廠商新增/評鑑/談判',
    icon: Building2,
    countKind: 'total',
    countKey: 'vendor',
    subItems: [
      { label: '新增廠商', href: '/dashboard/base/partners' },
      { label: '廠商列表', href: '/dashboard/base/partners' },
      { label: '季度評鑑', href: '/dashboard/purchase/vendor' },
    ],
  },
];

const domesticMain: PurchaseCardConfig[] = [
  {
    id: 'domestic-rfq',
    title: '詢價單',
    description: '供應商詢價與報價彙整',
    icon: ClipboardList,
    countKind: 'pending',
    countKey: 'rfq',
    subItems: [
      { label: '新增詢價單', href: '/dashboard/nx01/rfq/new' },
      { label: '詢價單列表', href: '/dashboard/nx01/rfq' },
      { label: '待回覆詢價單', href: '/dashboard/nx01/rfq' },
    ],
  },
  {
    id: 'domestic-po',
    title: '進貨單',
    description: '採購訂單與交期追蹤',
    icon: FileText,
    countKind: 'pending',
    countKey: 'po',
    subItems: [
      { label: '新增進貨單', href: '/dashboard/nx01/po/new' },
      { label: '進貨單列表', href: '/dashboard/nx01/po' },
      { label: '待確認進貨單', href: '/dashboard/nx01/po' },
    ],
  },
  {
    id: 'domestic-receipt',
    title: '驗收入庫',
    description: '到貨驗收與入帳',
    icon: PackageCheck,
    countKind: 'pending',
    countKey: 'receipt',
    subItems: [
      { label: '待驗收列表', href: '/dashboard/nx01/rr' },
      { label: '驗收作業', href: '/dashboard/nx01/rr' },
      { label: '已驗收記錄', href: '/dashboard/nx01/rr' },
    ],
  },
];

const domesticBranchReturn: PurchaseCardConfig = {
  id: 'domestic-return',
  title: '退貨',
  description: '退供應商',
  icon: RotateCcw,
  countKind: 'pending',
  countKey: 'return',
  subItems: [
    { label: '新增退貨單', href: '/dashboard/nx01/pr/new' },
    { label: '退貨單列表', href: '/dashboard/nx01/pr' },
  ],
};

const domesticBranchWarranty: PurchaseCardConfig = {
  id: 'domestic-warranty',
  title: '保固申請',
  description: '向廠商申請保固',
  icon: Shield,
  countKind: 'pending',
  countKey: 'warranty',
  subItems: [
    { label: '新增保固申請', href: '/dashboard/purchase/domestic?focus=warranty' },
    { label: '保固申請列表', href: '/dashboard/purchase/domestic?focus=warranty' },
  ],
};

const specialMain: PurchaseCardConfig[] = domesticMain.map((c) => ({
  ...c,
  id: c.id.replace('domestic-', 'special-'),
}));

const specialReturn: PurchaseCardConfig = {
  ...domesticBranchReturn,
  id: 'special-return',
};

function countBadge(c: PurchaseCardConfig): string {
  const row = mockPurchaseCounts[c.countKey];
  if (c.countKind === 'total' && 'total' in row) return `${row.total}`;
  if ('pending' in row) return `${row.pending}`;
  return '—';
}

/** 終點小三角（↓），尖端略伸入卡片頂緣內側 */
function downArrowPoints(cx: number, cardTopY: number): string {
  const tipY = cardTopY + 5;
  const baseY = cardTopY;
  return `${cx},${tipY} ${cx - 4.5},${baseY} ${cx + 4.5},${baseY}`;
}

function SolidFlowArrow() {
  return (
    <div className="hidden w-9 shrink-0 items-center md:flex" aria-hidden>
      <div className="flex w-full min-w-[2rem] flex-row items-center gap-0">
        <div className="h-0.5 min-w-0 flex-1 rounded-full" style={{ backgroundColor: FLOW_SOLID }} />
        <span className="shrink-0 text-sm font-semibold leading-none" style={{ color: FLOW_SOLID }}>
          →→
        </span>
      </div>
    </div>
  );
}

function SolidFlowArrowMobile() {
  return (
    <div className="flex justify-center py-1 md:hidden" aria-hidden>
      <span className="text-sm font-semibold" style={{ color: FLOW_SOLID }}>
        →→
      </span>
    </div>
  );
}

/** 與主檔中心群組標題同式：text-sm font-semibold、底部分隔線 */
function PurchaseGroupHeading({ id, title }: { id: string; title: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border/70 pb-2">
      <h2 id={id} className="text-sm font-semibold tracking-wide text-foreground">
        {title}
      </h2>
    </div>
  );
}

type BranchGeom = {
  w: number;
  h: number;
  paths: { key: string; d: string }[];
  arrows: { key: string; points: string }[];
};

function BranchOverlay({
  rootRef,
  poRef,
  returnRef,
  warrantyRef,
  mode,
}: {
  rootRef: React.RefObject<HTMLDivElement | null>;
  poRef: React.RefObject<HTMLDivElement | null>;
  returnRef: React.RefObject<HTMLDivElement | null>;
  warrantyRef: React.RefObject<HTMLDivElement | null>;
  mode: 'domestic' | 'special';
}) {
  const [geom, setGeom] = useState<BranchGeom | null>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let debounceTimer: number | undefined;

    function measure() {
      const el = rootRef.current;
      const po = poRef.current;
      const ret = returnRef.current;
      const war = mode === 'domestic' ? warrantyRef.current : null;
      if (!el || !po || !ret) return;

      const rootR = el.getBoundingClientRect();
      const poR = po.getBoundingClientRect();
      const retR = ret.getBoundingClientRect();
      const warR = war?.getBoundingClientRect();

      const w = rootR.width;
      const h = rootR.height;
      if (w <= 0 || h <= 0) return;

      const cx = (r: DOMRect) => r.left - rootR.left + r.width / 2;
      const top = (r: DOMRect) => r.top - rootR.top;

      const xPo = cx(poR);
      const yPoTop = top(poR);
      const xRet = cx(retR);
      const yRetTop = top(retR);

      const paths: { key: string; d: string }[] = [];
      const arrows: { key: string; points: string }[] = [];

      const yMidReturn = yPoTop - 20;
      paths.push({
        key: 'return',
        d: `M ${xPo} ${yPoTop} L ${xPo} ${yMidReturn} L ${xRet} ${yMidReturn} L ${xRet} ${yRetTop}`,
      });
      arrows.push({ key: 'return', points: downArrowPoints(xRet, yRetTop) });

      if (mode === 'domestic' && warR) {
        const xWar = cx(warR);
        const yWarTop = top(warR);
        const yMidWarranty = yPoTop - 40;
        paths.push({
          key: 'warranty',
          d: `M ${xPo} ${yPoTop} L ${xPo} ${yMidWarranty} L ${xWar} ${yMidWarranty} L ${xWar} ${yWarTop}`,
        });
        arrows.push({ key: 'warranty', points: downArrowPoints(xWar, yWarTop) });
      }

      setGeom({ w, h, paths, arrows });
    }

    function scheduleMeasure() {
      if (debounceTimer !== undefined) window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        debounceTimer = undefined;
        measure();
      }, 100);
    }

    const initialTimer = window.setTimeout(() => measure(), 100);

    const ro = new ResizeObserver(() => {
      scheduleMeasure();
    });
    ro.observe(root);

    return () => {
      window.clearTimeout(initialTimer);
      if (debounceTimer !== undefined) window.clearTimeout(debounceTimer);
      ro.disconnect();
    };
  }, [mode, rootRef, poRef, returnRef, warrantyRef]);

  if (!geom) return null;

  return (
    <svg
      className="pointer-events-none absolute left-0 top-0 z-0 h-full w-full overflow-visible"
      width="100%"
      height="100%"
      viewBox={`0 0 ${geom.w} ${geom.h}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      {geom.paths.map((p) => (
        <path
          key={p.key}
          d={p.d}
          fill="none"
          stroke={BRANCH_STROKE}
          strokeWidth={2}
          strokeDasharray={BRANCH_DASH}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {geom.arrows.map((a) => (
        <polygon key={a.key} points={a.points} fill={BRANCH_STROKE} stroke="none" />
      ))}
    </svg>
  );
}

function PurchaseMenuCard({ card }: { card: PurchaseCardConfig }) {
  const Icon = card.icon;
  const badge = countBadge(card);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={CARD_BASE}>
          <div className="flex shrink-0 items-start justify-between gap-2">
            <div
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/80',
                'bg-secondary/50 text-primary',
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
            </div>
          </div>
          <div className="mt-1.5 min-h-0 flex-1 space-y-0.5 pr-11">
            <h3 className="line-clamp-1 text-sm font-semibold leading-tight text-foreground">{card.title}</h3>
            <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">{card.description}</p>
          </div>
          <span
            className={cn(
              'pointer-events-none absolute bottom-3 right-3 rounded-full border px-2 py-0.5 text-[11px] font-semibold tabular-nums',
            )}
            style={{
              color: BADGE_GOLD,
              borderColor: 'rgba(232,160,32,0.45)',
              backgroundColor: 'rgba(232,160,32,0.12)',
            }}
          >
            {badge}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" sideOffset={8} className="glass-card w-60 border-border/80 p-1 shadow-lg">
        <DropdownMenuSeparator className="my-1 bg-border/50" />
        {card.subItems.map((item) => (
          <DropdownMenuItem key={item.label} asChild className="cursor-pointer">
            <Link href={item.href}>{item.label}</Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="my-1 bg-border/50" />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CardWrap({ children, cardRef }: { children: ReactNode; cardRef?: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div ref={cardRef} className="relative z-10 flex w-[220px] shrink-0 justify-center">
      {children}
    </div>
  );
}

function DomesticFlow() {
  const [a, b, c] = domesticMain;
  const rootRef = useRef<HTMLDivElement>(null);
  const poRef = useRef<HTMLDivElement>(null);
  const retRef = useRef<HTMLDivElement>(null);
  const warRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={rootRef} className="relative w-full min-w-0 overflow-visible pt-12">
      <BranchOverlay rootRef={rootRef} poRef={poRef} returnRef={retRef} warrantyRef={warRef} mode="domestic" />
      <div className="relative z-10 flex min-w-0 flex-col items-stretch gap-6 md:flex-row md:flex-nowrap md:items-center md:justify-start md:overflow-x-auto md:pb-1">
        <CardWrap>
          <PurchaseMenuCard card={a} />
        </CardWrap>
        <SolidFlowArrow />
        <SolidFlowArrowMobile />
        <CardWrap cardRef={poRef}>
          <PurchaseMenuCard card={b} />
        </CardWrap>
        <SolidFlowArrow />
        <SolidFlowArrowMobile />
        <CardWrap>
          <PurchaseMenuCard card={c} />
        </CardWrap>
        <CardWrap cardRef={retRef}>
          <PurchaseMenuCard card={domesticBranchReturn} />
        </CardWrap>
        <CardWrap cardRef={warRef}>
          <PurchaseMenuCard card={domesticBranchWarranty} />
        </CardWrap>
      </div>
    </div>
  );
}

function SpecialFlow() {
  const [a, b, c] = specialMain;
  const rootRef = useRef<HTMLDivElement>(null);
  const poRef = useRef<HTMLDivElement>(null);
  const retRef = useRef<HTMLDivElement>(null);
  const warRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={rootRef} className="relative w-full min-w-0 overflow-visible pt-12">
      <BranchOverlay rootRef={rootRef} poRef={poRef} returnRef={retRef} warrantyRef={warRef} mode="special" />
      <div className="relative z-10 flex min-w-0 flex-col items-stretch gap-6 md:flex-row md:flex-nowrap md:items-center md:justify-start md:overflow-x-auto md:pb-1">
        <CardWrap>
          <PurchaseMenuCard card={a} />
        </CardWrap>
        <SolidFlowArrow />
        <SolidFlowArrowMobile />
        <CardWrap cardRef={poRef}>
          <PurchaseMenuCard card={b} />
        </CardWrap>
        <SolidFlowArrow />
        <SolidFlowArrowMobile />
        <CardWrap>
          <PurchaseMenuCard card={c} />
        </CardWrap>
        <CardWrap cardRef={retRef}>
          <PurchaseMenuCard card={specialReturn} />
        </CardWrap>
      </div>
    </div>
  );
}

export function PurchaseCenterHub() {
  return (
    <div className="w-full min-w-0 space-y-12">
      <header className="space-y-1">
        <p className="text-xs tracking-[0.35em] text-muted-foreground">PURCHASE CENTER</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">採購中心</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          依業務分區排列；點選卡片進入各採購流程。
        </p>
      </header>

      <section className="space-y-4" aria-labelledby="purchase-group-mgmt">
        <PurchaseGroupHeading id="purchase-group-mgmt" title="管理" />
        <div className="flex flex-wrap justify-start gap-6">
          {managementCards.map((c) => (
            <div key={c.id} className="flex w-[220px] shrink-0 justify-center sm:w-auto">
              <PurchaseMenuCard card={c} />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="purchase-group-domestic">
        <PurchaseGroupHeading id="purchase-group-domestic" title="國內採購" />
        <DomesticFlow />
      </section>

      <section className="space-y-4" aria-labelledby="purchase-group-special">
        <PurchaseGroupHeading id="purchase-group-special" title="特殊採購" />
        <SpecialFlow />
      </section>
    </div>
  );
}
