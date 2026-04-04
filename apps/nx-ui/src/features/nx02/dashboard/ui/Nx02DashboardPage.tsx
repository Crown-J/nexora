/**
 * File: apps/nx-ui/src/features/nx02/dashboard/ui/Nx02DashboardPage.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-DSH-UI-002：庫存模組首頁（CARD 區塊 + 統計）
 *
 * Notes:
 * - PLUS 卡片依 planCode（PLUS／PRO）顯示；LITE 隱藏
 * - @FUNCTION_CODE NX02-DSH-UI-002-F01
 */

'use client';

import { useSessionMe } from '@/features/auth/hooks/useSessionMe';

import { useDashboard } from '../hooks/useDashboard';
import { Nx02StatCard } from './Nx02StatCard';

function planShowsPlusFeatures(planCode: string | null | undefined): boolean {
  const p = (planCode ?? '').trim().toUpperCase();
  return p === 'PLUS' || p === 'PRO';
}

/**
 * @FUNCTION_CODE NX02-DSH-UI-002-F01
 */
export function Nx02DashboardPage() {
  const { me } = useSessionMe();
  const { data, loading, error } = useDashboard();
  const showPlus = planShowsPlusFeatures(me?.plan_code ?? null);

  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <p className="text-xs tracking-[0.35em] text-muted-foreground">NX02</p>
        <h1 className="text-2xl font-semibold text-foreground">庫存管理</h1>
        <p className="text-sm text-muted-foreground">庫存查詢、台帳與倉儲作業入口</p>
      </header>

      {error ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">{error}</div>
      ) : null}

      {loading && !data ? <div className="text-sm text-muted-foreground">載入統計中…</div> : null}

      {data ? (
        <>
          <section className="space-y-4">
            <h2 className="text-sm font-semibold tracking-wide text-foreground border-b border-border/70 pb-2">
              庫存查詢
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Nx02StatCard
                title="庫存一覽"
                description="依倉庫／狀態檢視現存、可用量與安全量警示"
                href="/dashboard/nx02/balance"
              >
                <p className="tabular-nums text-foreground">
                  有庫存 <span className="font-semibold">{data.balance.inStock}</span> 筆 · 零庫存{' '}
                  <span className="font-semibold">{data.balance.zero}</span> 筆 · 負庫存{' '}
                  <span className="font-semibold">{data.balance.negative}</span> 筆
                </p>
              </Nx02StatCard>
              <Nx02StatCard title="庫存台帳" description="依區間檢視入出庫與調整流水" href="/dashboard/nx02/ledger">
                <p className="tabular-nums text-foreground">
                  本月異動 <span className="font-semibold">{data.ledger.thisMonthCount}</span> 筆
                </p>
              </Nx02StatCard>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold tracking-wide text-foreground border-b border-border/70 pb-2">
              庫存作業
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Nx02StatCard title="開帳存" description="初次導入庫存與成本" href="/dashboard/nx02/init">
                <p className="tabular-nums text-foreground">
                  歷史 <span className="font-semibold">{data.init.totalCount}</span> 張
                </p>
              </Nx02StatCard>
              <Nx02StatCard title="庫存設定" description="安全量／最高量" href="/dashboard/nx02/stock-setting">
                <p className="tabular-nums text-foreground">
                  已設定安全量 <span className="font-semibold">{data.stockSetting.settingCount}</span> 筆
                </p>
              </Nx02StatCard>
              <Nx02StatCard title="盤點單" description="盤點中與草稿" href="/dashboard/nx02/stock-take">
                <p className="tabular-nums text-foreground">
                  進行中 <span className="font-semibold">{data.stockTake.inProgressCount}</span> 張
                </p>
              </Nx02StatCard>
              {showPlus ? (
                <Nx02StatCard title="調撥單" description="倉與倉調撥（PLUS）" href="/dashboard/nx02/transfer">
                  <p className="tabular-nums text-foreground">
                    進行中 <span className="font-semibold">{data.transfer.inProgressCount}</span> 張
                  </p>
                </Nx02StatCard>
              ) : null}
            </div>
          </section>

          {showPlus ? (
            <section className="space-y-4">
              <h2 className="text-sm font-semibold tracking-wide text-foreground border-b border-border/70 pb-2">
                庫存警示
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Nx02StatCard title="缺貨簿" description="低於安全量之缺貨清單" href="/dashboard/nx02/shortage">
                  <p className="tabular-nums text-foreground">
                    缺貨中 <span className="font-semibold">{data.shortage.openCount}</span> 筆
                  </p>
                </Nx02StatCard>
                <Nx02StatCard
                  title="自動補貨設定"
                  description="跨倉補貨規則"
                  href="/dashboard/nx02/auto-replenish"
                >
                  <p className="tabular-nums text-foreground">
                    已設定 <span className="font-semibold">{data.autoReplenish.activeRuleCount}</span> 條規則
                  </p>
                </Nx02StatCard>
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
