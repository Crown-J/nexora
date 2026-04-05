'use client';

import Link from 'next/link';
import { ChevronRight, Lock } from 'lucide-react';

import { useSessionMe } from '@/features/auth/hooks/useSessionMe';
import { planSupportsNx02PlusFeatures } from '@/shared/lib/plan-plus-support';
import { cn } from '@/lib/utils';

import { useNx01Dashboard } from '../hooks/useNx01Dashboard';

type FlowStepProps = {
  href: string;
  step: number;
  title: string;
  pending: number;
  subtitle: string;
  plusOnly?: boolean;
  showPlus: boolean;
};

function FlowStep({ href, step, title, pending, subtitle, plusOnly, showPlus }: FlowStepProps) {
  const hasWork = pending > 0;
  const locked = plusOnly && !showPlus;

  return (
    <Link
      href={href}
      className={cn(
        'group relative flex min-w-[140px] flex-1 flex-col rounded-xl border bg-card/50 p-4 transition-colors hover:bg-card/80',
        hasWork
          ? 'border-amber-500/60 ring-1 ring-amber-500/30'
          : 'border-border/70',
        locked && 'opacity-95',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium tabular-nums tracking-wider text-muted-foreground">
          STEP {step}
        </span>
        {locked ? (
          <span className="flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            <Lock className="size-3" aria-hidden />
            PLUS
          </span>
        ) : null}
      </div>
      <h3 className="mt-1 text-sm font-semibold text-foreground">{title}</h3>
      <p
        className={cn(
          'mt-2 text-2xl font-semibold tabular-nums',
          hasWork ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground',
        )}
      >
        待處理 {pending}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      <span className="mt-3 text-xs font-medium text-primary group-hover:underline">前往 →</span>
    </Link>
  );
}

export function Nx01DashboardPage() {
  const { planCode } = useSessionMe();
  const showPlus = planSupportsNx02PlusFeatures(planCode);
  const { data, loading, error, reload } = useNx01Dashboard();

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="text-xs tracking-[0.35em] text-muted-foreground">NX01</p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">採購與進貨作業</h1>
            <p className="text-sm text-muted-foreground">
              依流程檢視各階段待辦：詢價 → 採購（PLUS）→ 進貨 → 退貨
            </p>
          </div>
          <button
            type="button"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => void reload()}
          >
            重新整理統計
          </button>
        </div>
      </header>

      {error ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">{error}</div>
      ) : null}

      {loading && !data ? <p className="text-sm text-muted-foreground">載入流程統計中…</p> : null}

      {data ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-wide text-foreground">流程進度（待處理筆數）</h2>
          <p className="text-xs text-muted-foreground">
            數字大於 0 的階段會以醒目框線標示，方便一眼找出須處理的單據。
          </p>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
            <FlowStep
              href="/dashboard/nx01/rfq"
              step={1}
              title="詢價 RFQ"
              pending={data.rfq.pending}
              subtitle={`進行中單據 ${data.rfq.total} 筆（含草稿／已發出／已回覆）`}
              showPlus={showPlus}
            />
            <div className="hidden items-center justify-center text-muted-foreground lg:flex">
              <ChevronRight className="size-5 shrink-0" aria-hidden />
            </div>
            <FlowStep
              href="/dashboard/nx01/po"
              step={2}
              title="採購 PO"
              pending={data.po.pending}
              subtitle={
                showPlus
                  ? `進行中 ${data.po.total} 筆（草稿／已送出）`
                  : 'LITE 可瀏覽升級說明；開通 PLUS 後管理採購單'
              }
              plusOnly
              showPlus={showPlus}
            />
            <div className="hidden items-center justify-center text-muted-foreground lg:flex">
              <ChevronRight className="size-5 shrink-0" aria-hidden />
            </div>
            <FlowStep
              href="/dashboard/nx01/rr"
              step={3}
              title="進貨 RR"
              pending={data.rr.pending}
              subtitle={`草稿 ${data.rr.pending} 筆 · 本月已過帳 ${data.posted.thisMonth} 筆`}
              showPlus={showPlus}
            />
            <div className="hidden items-center justify-center text-muted-foreground lg:flex">
              <ChevronRight className="size-5 shrink-0" aria-hidden />
            </div>
            <FlowStep
              href="/dashboard/nx01/pr"
              step={4}
              title="退貨 PR"
              pending={data.pr.inProgress}
              subtitle="草稿狀態、尚待過帳的退貨單"
              showPlus={showPlus}
            />
          </div>
        </section>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/dashboard/nx01/rfq/new"
          className="rounded-xl border border-border/70 bg-card/40 px-4 py-3 text-sm font-medium hover:bg-card/70"
        >
          + 新增詢價
        </Link>
        <Link
          href="/dashboard/nx01/po/new"
          className="rounded-xl border border-border/70 bg-card/40 px-4 py-3 text-sm font-medium hover:bg-card/70"
        >
          + 新增採購（PLUS）
        </Link>
        <Link
          href="/dashboard/nx01/rr/new"
          className="rounded-xl border border-border/70 bg-card/40 px-4 py-3 text-sm font-medium hover:bg-card/70"
        >
          + 新增進貨
        </Link>
        <Link
          href="/dashboard/nx01/pr/new"
          className="rounded-xl border border-border/70 bg-card/40 px-4 py-3 text-sm font-medium hover:bg-card/70"
        >
          + 新增退貨
        </Link>
      </section>

      <section className="rounded-xl border border-border/60 bg-muted/10 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">庫存補貨</p>
        <p className="mt-1">
          由缺貨／補貨建議產生詢價時，請使用{' '}
          <Link href="/dashboard/nx01/stock-replenishment" className="text-primary underline-offset-4 hover:underline">
            庫存補貨流程
          </Link>
          。
        </p>
      </section>
    </div>
  );
}
