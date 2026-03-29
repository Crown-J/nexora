'use client';

import Link from 'next/link';
import { Fragment, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Check,
  ClipboardList,
  Clock,
  Download,
  Package,
  Plus,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const PAGE_KICKER = 'SALES / NX03';
const PAGE_TITLE = '銷售與出貨作業';

type StatusTone = 'primary' | 'destructive' | 'success';

type FlowRow = {
  id: string;
  title: string;
  sub: string;
  date: string;
  status: string;
  tone: StatusTone;
  price?: string;
  /** 不計入「待處理」筆數（例如已回價、已出貨） */
  terminal?: boolean;
};

type StepDef = {
  id: string;
  label: string;
  pipelineTotal: number;
  cta: { label: string; href?: string };
  rows: FlowRow[];
};

/** 對齊 docs/flows/05-sales-quote-so.md：詢價→報價→成交→PO/SO→入庫→出貨 */
const STEPS: StepDef[] = [
  {
    id: 'rfq-cost',
    label: '詢價與成本',
    pipelineTotal: 5,
    cta: { label: '+ 新增詢價', href: '/dashboard/nx03/customer-sales' },
    rows: [
      {
        id: 'RFQ-S-101',
        title: '客戶急件：車用 ECU 模組',
        sub: '供應商：台科科技有限公司',
        date: '2024-01-22',
        status: '待供應商回覆',
        tone: 'primary',
      },
      {
        id: 'RFQ-S-102',
        title: '散熱風扇成本確認',
        sub: '供應商：新旺電子股份有限公司',
        date: '2024-01-21',
        status: '已回價',
        tone: 'success',
        terminal: true,
      },
    ],
  },
  {
    id: 'quote',
    label: '對客報價',
    pipelineTotal: 4,
    cta: { label: '+ 新增報價' },
    rows: [
      {
        id: 'QT-2401-008',
        title: 'Q1 專案報價（含 markup 20%）',
        sub: '客戶：台北汽車修護中心',
        date: '2024-01-21',
        status: '草稿',
        tone: 'primary',
        price: 'NT$ 128,400',
      },
      {
        id: 'QT-2401-007',
        title: '維修料報價',
        sub: '客戶：新竹車業有限公司',
        date: '2024-01-20',
        status: '已送出',
        tone: 'primary',
      },
    ],
  },
  {
    id: 'accept',
    label: '成交確認',
    pipelineTotal: 2,
    cta: { label: '+ 登記成交' },
    rows: [
      {
        id: 'ACC-003',
        title: '待客戶回簽：報價 QT-2401-005',
        sub: '客戶：台中保修廠',
        date: '2024-01-19',
        status: '待確認',
        tone: 'primary',
      },
    ],
  },
  {
    id: 'po-so',
    label: '採購與銷貨',
    pipelineTotal: 3,
    cta: { label: '+ 建立單據' },
    rows: [
      {
        id: 'PO/SO-2401',
        title: 'Accept 後產生之 PO＋SO',
        sub: '客戶訂單對應採購與銷貨單',
        date: '2024-01-18',
        status: '草稿',
        tone: 'primary',
      },
    ],
  },
  {
    id: 'inbound',
    label: '待入庫',
    pipelineTotal: 4,
    cta: { label: '+ 登記進貨' },
    rows: [
      {
        id: 'GR-WAIT-02',
        title: '採購到貨待驗收',
        sub: '倉別：A 倉',
        date: '2024-01-22',
        status: '待入庫',
        tone: 'primary',
      },
      {
        id: 'GR-WAIT-01',
        title: '進貨單待過帳',
        sub: '倉別：B 倉',
        date: '2024-01-21',
        status: '待入庫',
        tone: 'primary',
      },
    ],
  },
  {
    id: 'ship',
    label: '出貨',
    pipelineTotal: 6,
    cta: { label: '+ 出貨確認' },
    rows: [
      {
        id: 'SO-2401-012',
        title: '銷貨單待出貨',
        sub: '客戶：台北汽車修護中心',
        date: '2024-01-22',
        status: '待出貨',
        tone: 'primary',
      },
      {
        id: 'SO-2401-011',
        title: '銷貨單已出貨',
        sub: '客戶：新竹車業有限公司',
        date: '2024-01-15',
        status: '已出貨',
        tone: 'success',
        terminal: true,
      },
    ],
  },
];

type ToolbarAction = {
  key: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  disabled?: boolean;
};

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  { key: 'customer', label: '客戶／供應商', href: '/base/partner', icon: Search },
  { key: 'part', label: '料號查詢', href: '/base/part', icon: Package },
  { key: 'import', label: '批次匯入', icon: ClipboardList, disabled: true },
  { key: 'export', label: '報表匯出', icon: Download, disabled: true },
  { key: 'history', label: '歷史紀錄', icon: Clock, disabled: true },
];

function toneClasses(tone: StatusTone) {
  switch (tone) {
    case 'destructive':
      return 'border-destructive/35 bg-destructive/10 text-destructive-foreground';
    case 'success':
      return 'border-emerald-500/40 bg-emerald-500/12 text-emerald-100';
    default:
      return 'border-primary/35 bg-primary/10 text-primary';
  }
}

function pendingCount(rows: FlowRow[]) {
  return rows.filter((r) => !r.terminal).length;
}

export function SalesFlowHub() {
  const [active, setActive] = useState(0);

  const step = STEPS[active]!;
  const pending = useMemo(() => pendingCount(step.rows), [step.rows]);

  return (
    <div className="space-y-8 text-foreground">
      <header className="space-y-1">
        <p className="text-xs tracking-[0.35em] text-muted-foreground">{PAGE_KICKER}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{PAGE_TITLE}</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          依流程階段檢視待辦；語意色票與採購總覽／主檔一致。完整詢價→報價→成交→出貨請使用「客戶銷貨流程」與後端 API。
        </p>
      </header>

      <section aria-label="銷售流程階段" className="space-y-3">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          流程進度
        </p>
        <div className="overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-full min-w-[min(100%,640px)] items-start sm:min-w-0">
            {STEPS.map((s, i) => {
              const isActive = i === active;
              const isDone = i < active;
              return (
                <Fragment key={s.id}>
                  <div className="flex min-w-[76px] flex-1 flex-col items-center sm:min-w-0">
                    <button
                      type="button"
                      onClick={() => setActive(i)}
                      className={cn(
                        'flex w-full flex-col items-center gap-1.5 rounded-xl px-1 py-2 transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                        isActive && 'bg-primary/10',
                        !isActive && 'hover:bg-muted/40'
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold tabular-nums',
                          isDone &&
                            'border-emerald-500/45 bg-emerald-500/15 text-emerald-200',
                          isActive &&
                            !isDone &&
                            'border-primary/60 bg-primary/15 text-primary',
                          !isActive &&
                            !isDone &&
                            'border-border bg-secondary/40 text-muted-foreground'
                        )}
                      >
                        {isDone ? (
                          <Check className="h-4 w-4 text-emerald-300" aria-hidden />
                        ) : (
                          i + 1
                        )}
                      </span>
                      <span
                        className={cn(
                          'line-clamp-2 text-center text-[11px] font-medium leading-tight sm:text-xs',
                          isActive ? 'text-foreground' : 'text-muted-foreground'
                        )}
                      >
                        {s.label}
                      </span>
                      <span className="text-[10px] tabular-nums text-muted-foreground">
                        {s.pipelineTotal} 筆
                      </span>
                    </button>
                  </div>
                  {i < STEPS.length - 1 ? (
                    <div
                      className={cn(
                        'mt-[22px] h-px flex-1 min-w-[6px] max-w-[40px] shrink',
                        i < active ? 'bg-primary/55' : 'bg-border'
                      )}
                      aria-hidden
                    />
                  ) : null}
                </Fragment>
              );
            })}
          </div>
        </div>
      </section>

      <section
        className={cn(
          'rounded-2xl border border-border/80 bg-card/40 p-4 shadow-sm sm:p-5',
          'backdrop-blur-sm'
        )}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {step.label}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                （{pending} 筆待處理）
              </span>
            </h2>
          </div>
          {step.cta.href ? (
            <Link
              href={step.cta.href}
              className={cn(
                'inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium',
                'border border-primary/35 bg-primary/10 text-primary',
                'transition-colors hover:border-primary/50 hover:bg-primary/18'
              )}
            >
              <Plus className="h-4 w-4" aria-hidden />
              {step.cta.label.replace(/^\+\s*/, '')}
            </Link>
          ) : (
            <button
              type="button"
              disabled
              title="此階段請於客戶銷貨流程頁操作，或待後端串接"
              className={cn(
                'inline-flex cursor-not-allowed items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium',
                'border border-border bg-muted/30 text-muted-foreground'
              )}
            >
              <Plus className="h-4 w-4" aria-hidden />
              {step.cta.label.replace(/^\+\s*/, '')}
            </button>
          )}
        </div>

        <ul className="mt-4 divide-y divide-border/60 rounded-xl border border-border/50 bg-background/30">
          {step.rows.map((row) => (
            <li key={row.id} className="px-4 py-3.5 transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-muted/20">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <span className="text-xs font-medium tracking-wide text-muted-foreground">
                  {row.id}
                </span>
                <span
                  className={cn(
                    'rounded-md border px-2 py-0.5 text-[11px] font-medium',
                    toneClasses(row.tone)
                  )}
                >
                  {row.status}
                </span>
              </div>
              <div className="mt-2 text-sm font-semibold text-foreground">{row.title}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{row.sub}</div>
              <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
                {row.price ? (
                  <span className="text-sm font-semibold tabular-nums text-primary">{row.price}</span>
                ) : (
                  <span />
                )}
                <span className="text-xs tabular-nums text-muted-foreground">{row.date}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <footer className="border-t border-border/60 pt-5">
        <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          常用功能
        </p>
        <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="銷售常用功能">
          {TOOLBAR_ACTIONS.map((a) => {
            const Icon = a.icon;
            const shared = cn(
              'inline-flex items-center gap-2 text-sm transition-colors',
              a.disabled || !a.href
                ? 'cursor-not-allowed text-muted-foreground/70'
                : 'text-muted-foreground hover:text-primary'
            );
            if (a.href && !a.disabled) {
              return (
                <Link key={a.key} href={a.href} className={shared}>
                  <Icon className="h-4 w-4 shrink-0 text-primary/90" aria-hidden />
                  {a.label}
                </Link>
              );
            }
            return (
              <span key={a.key} className={shared} title="即將開放">
                <Icon className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
                {a.label}
              </span>
            );
          })}
        </nav>
      </footer>
    </div>
  );
}
