'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Check,
  ClipboardList,
  Clock,
  Download,
  Plus,
  Search,
} from 'lucide-react';
import { cx } from '@/shared/lib/cx';

const PAGE_TITLE = '採購與進貨作業';

type StatusTone = 'amber' | 'rose' | 'emerald';

type FlowRow = {
  id: string;
  title: string;
  sub: string;
  date: string;
  status: string;
  tone: StatusTone;
  price?: string;
};

type StepDef = {
  id: string;
  label: string;
  /** 流程中此階段總筆數（stepper 顯示） */
  pipelineTotal: number;
  cta: { label: string; href?: string };
  rows: FlowRow[];
};

const STEPS: StepDef[] = [
  {
    id: 'rfq',
    label: '詢價',
    pipelineTotal: 8,
    cta: { label: '+ 新增詢價', href: '/dashboard/nx01/stock-replenishment' },
    rows: [
      {
        id: 'RFQ-001',
        title: '高效能處理器詢價',
        sub: '台科科技有限公司',
        date: '2024-01-20',
        status: '待處理',
        tone: 'amber',
      },
      {
        id: 'RFQ-002',
        title: '伺服器記憶體補貨',
        sub: '新旺電子股份有限公司',
        date: '2024-01-19',
        status: '進行中',
        tone: 'amber',
      },
      {
        id: 'RFQ-003',
        title: '散熱模組急件',
        sub: '台北科技有限公司',
        date: '2024-01-18',
        status: '急件',
        tone: 'rose',
      },
    ],
  },
  {
    id: 'inv-review',
    label: '庫存覆核',
    pipelineTotal: 12,
    cta: { label: '+ 新增覆核單' },
    rows: [
      {
        id: 'REV-101',
        title: 'A 倉安全庫存覆核',
        sub: '覆核人：王大明',
        date: '2024-01-21',
        status: '待覆核',
        tone: 'amber',
      },
      {
        id: 'REV-102',
        title: 'B 倉慢動品檢視',
        sub: '覆核人：李小華',
        date: '2024-01-20',
        status: '進行中',
        tone: 'amber',
      },
    ],
  },
  {
    id: 'purchase',
    label: '採購',
    pipelineTotal: 5,
    cta: { label: '+ 新增採購' },
    rows: [
      {
        id: 'PO-2401-001',
        title: 'Q1 料件批量採購',
        sub: '供應商：台科科技有限公司',
        date: '2024-01-17',
        status: '草稿',
        tone: 'amber',
      },
    ],
  },
  {
    id: 'confirm',
    label: '確認訂單',
    pipelineTotal: 3,
    cta: { label: '+ 建立確認單' },
    rows: [
      {
        id: 'CFM-009',
        title: '訂單確認：伺服器主板',
        sub: '台科科技有限公司',
        date: '2024-01-16',
        status: '待確認',
        tone: 'amber',
      },
    ],
  },
  {
    id: 'pending-gr',
    label: '待驗收',
    pipelineTotal: 7,
    cta: { label: '+ 登記到貨' },
    rows: [
      {
        id: 'GR-PEND-01',
        title: '進貨單待驗收',
        sub: '倉別：A 倉',
        date: '2024-01-20',
        status: '待驗收',
        tone: 'amber',
      },
      {
        id: 'GR-PEND-02',
        title: '進貨單待驗收',
        sub: '倉別：B 倉',
        date: '2024-01-19',
        status: '待驗收',
        tone: 'amber',
      },
    ],
  },
  {
    id: 'gr-slip',
    label: '驗收單',
    pipelineTotal: 4,
    cta: { label: '+ 新增驗收單' },
    rows: [
      {
        id: 'GR-7788',
        title: '驗收完成：記憶體模組',
        sub: '驗收人：陳小安',
        date: '2024-01-15',
        status: '已完成',
        tone: 'emerald',
      },
    ],
  },
];

const FOOTER_ACTIONS = [
  {
    key: 'supplier',
    label: '供應商搜尋',
    sub: '搜尋',
    href: '/base/partner',
    icon: Search,
  },
  {
    key: 'import',
    label: '批次匯入',
    sub: '匯入',
    icon: ClipboardList,
  },
  {
    key: 'export',
    label: '報表匯出',
    sub: '匯出',
    icon: Download,
  },
  {
    key: 'history',
    label: '歷史紀錄',
    sub: '檢視',
    icon: Clock,
  },
];

function toneClasses(tone: StatusTone) {
  switch (tone) {
    case 'rose':
      return 'border-rose-400/35 bg-rose-500/15 text-rose-100';
    case 'emerald':
      return 'border-emerald-400/35 bg-emerald-500/15 text-emerald-100';
    default:
      return 'border-amber-400/35 bg-amber-500/12 text-amber-100';
  }
}

function pendingCount(rows: FlowRow[]) {
  return rows.filter((r) => r.status !== '已完成').length;
}

export function ProcurementFlowHub() {
  const [active, setActive] = useState(0);

  const step = STEPS[active]!;
  const pending = useMemo(() => pendingCount(step.rows), [step.rows]);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold tracking-wide text-white/95">{PAGE_TITLE}</h1>
        <p className="text-sm text-white/55">
          依採購與進貨流程階段檢視待辦；詢價建立請走「庫存補貨流程」與後端 API。
        </p>
      </header>

      {/* Stepper */}
      <div className="relative">
        <div
          className="pointer-events-none absolute inset-x-4 top-[22px] z-0 hidden h-px sm:block"
          style={{
            background:
              'linear-gradient(90deg, rgba(251,191,36,0.55) 0%, rgba(251,191,36,0.55) ' +
              (active / (STEPS.length - 1)) * 100 +
              '%, rgba(255,255,255,0.12) ' +
              (active / (STEPS.length - 1)) * 100 +
              '%, rgba(255,255,255,0.12) 100%)',
          }}
        />
        <div className="relative z-10 flex gap-2 overflow-x-auto pb-1 sm:gap-3">
          {STEPS.map((s, i) => {
            const isActive = i === active;
            const isDone = i < active;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActive(i)}
                className={cx(
                  'glass-card flex min-w-[140px] flex-1 flex-col gap-2 rounded-xl px-3 py-3 text-left transition',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40',
                  isActive && 'ring-2 ring-amber-400/70 glow-primary',
                  !isActive && !isDone && 'opacity-80 hover:opacity-100',
                  isDone && 'border-emerald-500/25'
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cx(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                      isDone &&
                        'border-emerald-400/50 bg-emerald-500/20 text-emerald-100',
                      isActive &&
                        !isDone &&
                        'border-amber-400/70 bg-amber-500/20 text-amber-50',
                      !isActive &&
                        !isDone &&
                        'border-white/15 bg-white/[0.06] text-white/55'
                    )}
                  >
                    {isDone ? (
                      <Check className="h-4 w-4 text-emerald-300" aria-hidden />
                    ) : (
                      i + 1
                    )}
                  </span>
                  <span
                    className={cx(
                      'text-sm font-medium',
                      isActive ? 'text-white' : 'text-white/75'
                    )}
                  >
                    {s.label}
                  </span>
                </div>
                <div className="text-xs text-white/45">{s.pipelineTotal} 筆</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active step */}
      <section className="glass-card rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-white/95">
              {step.label}
              <span className="ml-2 text-sm font-normal text-white/50">
                （{pending} 筆待處理）
              </span>
            </h2>
          </div>
          {step.cta.href ? (
            <Link
              href={step.cta.href}
              className={cx(
                'inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium',
                'border border-amber-400/40 bg-amber-500/20 text-amber-50',
                'transition hover:bg-amber-500/30'
              )}
            >
              <Plus className="h-4 w-4" aria-hidden />
              {step.cta.label.replace(/^\+\s*/, '')}
            </Link>
          ) : (
            <button
              type="button"
              disabled
              title="此階段尚未串接後端，僅展示流程"
              className={cx(
                'inline-flex cursor-not-allowed items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium',
                'border border-white/10 bg-white/[0.04] text-white/40'
              )}
            >
              <Plus className="h-4 w-4" aria-hidden />
              {step.cta.label.replace(/^\+\s*/, '')}
            </button>
          )}
        </div>

        <ul className="mt-4 space-y-3">
          {step.rows.map((row) => (
            <li
              key={row.id}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 transition hover:border-white/15"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <span className="text-xs font-medium tracking-wide text-white/45">
                  {row.id}
                </span>
                <span
                  className={cx(
                    'rounded-lg border px-2 py-0.5 text-[11px] font-medium',
                    toneClasses(row.tone)
                  )}
                >
                  {row.status}
                </span>
              </div>
              <div className="mt-2 text-sm font-semibold text-white/95">
                {row.title}
              </div>
              <div className="mt-0.5 text-xs text-white/55">{row.sub}</div>
              <div className="mt-3 flex flex-wrap items-end justify-between gap-2 border-t border-white/10 pt-2">
                {row.price ? (
                  <span className="text-sm font-semibold text-amber-400">
                    {row.price}
                  </span>
                ) : (
                  <span />
                )}
                <span className="text-xs text-white/45">{row.date}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Footer shortcuts */}
      <footer className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {FOOTER_ACTIONS.map((a) => {
          const Icon = a.icon;
          const inner = (
            <>
              <Icon className="h-5 w-5 text-amber-400/90" aria-hidden />
              <div className="mt-2 text-sm font-medium text-white/90">{a.label}</div>
              <div className="text-xs text-white/45">{a.sub}</div>
            </>
          );
          const className = cx(
            'glass-card rounded-xl px-3 py-3 text-left transition',
            'hover:border-amber-400/25 hover:bg-white/[0.06]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/35',
            a.href ? 'cursor-pointer' : 'cursor-default opacity-90'
          );
          return a.href ? (
            <Link key={a.key} href={a.href} className={className}>
              {inner}
            </Link>
          ) : (
            <div
              key={a.key}
              role="note"
              className={cx(className, 'text-white/50')}
              title="即將開放"
            >
              {inner}
            </div>
          );
        })}
      </footer>
    </div>
  );
}
