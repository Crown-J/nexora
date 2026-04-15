/**
 * @FUNCTION_CODE NX03-DASH-UI-001-F01
 * 庫存中心首頁：版型與採購中心一致；數字取自 /nx02/balance/dashboard（與原庫存首頁相同資料源）
 */

'use client';

import {
  AlertTriangle,
  ArrowLeftRight,
  BarChart2,
  ClipboardList,
  PackagePlus,
  RefreshCw,
  ScrollText,
  Settings,
  Warehouse,
} from 'lucide-react';
import { useSessionMe } from '@/features/auth/hooks/useSessionMe';
import { planSupportsNx02PlusFeatures } from '@/shared/lib/plan-plus-support';
import { useDashboard } from '@/features/nx02/dashboard/hooks/useDashboard';
import {
  CenterHubCardWrap,
  CenterHubFlowCard,
  CenterHubGroupHeading,
} from '@/features/layout/ui/CenterHubFlowCard';

const ACCENT = '#E8A020';

export function InventoryCenterHub() {
  const { planCode } = useSessionMe();
  const { data, loading, error } = useDashboard();
  const showPlus = planSupportsNx02PlusFeatures(planCode);

  const b = data?.balance;
  const ledger = data?.ledger;
  const init = data?.init;
  const stockSetting = data?.stockSetting;
  const stockTake = data?.stockTake;
  const transfer = data?.transfer;
  const shortage = data?.shortage;
  const autoReplenish = data?.autoReplenish;

  return (
    <div className="w-full min-w-0 space-y-12">
      <header className="space-y-1">
        <p className="text-xs tracking-[0.35em] text-muted-foreground">INVENTORY CENTER</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">庫存中心</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          版型與採購中心一致；統計與原「庫存管理」首頁相同 API。
        </p>
      </header>

      {error ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">{error}</div>
      ) : null}
      {loading && !data ? <div className="text-sm text-muted-foreground">載入統計中…</div> : null}

      <section className="space-y-4" aria-labelledby="inv-group-query">
        <CenterHubGroupHeading id="inv-group-query" title="庫存查詢" />
        <div className="relative z-10 flex min-w-0 flex-col items-stretch gap-6 md:flex-row md:flex-nowrap md:items-center md:justify-start md:overflow-x-auto md:pb-1">
          <CenterHubCardWrap>
            <CenterHubFlowCard
              title="庫存一覽"
              description="依倉庫／狀態檢視現存、可用量與安全量警示"
              icon={ClipboardList}
              footerBadge={b ? `${b.inStock}` : '—'}
              accentHex={ACCENT}
              subItems={[
                { label: '庫存一覽', href: '/dashboard/nx02/balance' },
                { label: '庫存工作台', href: '/dashboard/inventory/workspace' },
              ]}
            />
          </CenterHubCardWrap>
          <CenterHubCardWrap>
            <CenterHubFlowCard
              title="庫存台帳"
              description="依區間檢視入出庫與調整流水"
              icon={ScrollText}
              footerBadge={ledger ? `${ledger.thisMonthCount}` : '—'}
              accentHex={ACCENT}
              subItems={[
                { label: '庫存台帳', href: '/dashboard/nx02/ledger' },
                { label: '工作台', href: '/dashboard/inventory/workspace' },
              ]}
            />
          </CenterHubCardWrap>
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="inv-group-ops">
        <CenterHubGroupHeading id="inv-group-ops" title="庫存作業" />
        <div className="relative z-10 flex min-w-0 flex-col items-stretch gap-6 md:flex-row md:flex-nowrap md:items-center md:justify-start md:overflow-x-auto md:pb-1">
          <CenterHubCardWrap>
            <CenterHubFlowCard
              title="作業工作台"
              description="入庫／出庫／盤點流程節點（倉管）"
              icon={Warehouse}
              footerBadge="Alt+W"
              stepLabel="Step.1"
              accentHex={ACCENT}
              subItems={[
                { label: '庫存工作台', href: '/dashboard/inventory/workspace' },
                { label: 'NX02 入口', href: '/dashboard/nx02/balance' },
              ]}
            />
          </CenterHubCardWrap>
          <CenterHubCardWrap>
            <CenterHubFlowCard
              title="庫位與安全量"
              description="庫位主檔、安全量／最高量設定"
              icon={Settings}
              footerBadge="設定"
              stepLabel="Step.2"
              accentHex={ACCENT}
              subItems={[
                { label: '庫存設定頁', href: '/dashboard/inventory/setting' },
                { label: '安全量設定', href: '/dashboard/nx02/stock-setting' },
              ]}
            />
          </CenterHubCardWrap>
          <CenterHubCardWrap>
            <CenterHubFlowCard
              title="開帳存"
              description="初次導入庫存與成本"
              icon={PackagePlus}
              footerBadge={init ? `${init.totalCount}` : '—'}
              stepLabel="Step.3"
              accentHex={ACCENT}
              subItems={[
                { label: '開帳存', href: '/dashboard/nx02/init' },
                { label: '新增開帳', href: '/dashboard/nx02/init/new' },
              ]}
            />
          </CenterHubCardWrap>
          <CenterHubCardWrap>
            <CenterHubFlowCard
              title="庫存設定"
              description="安全量／最高量"
              icon={BarChart2}
              footerBadge={stockSetting ? `${stockSetting.settingCount}` : '—'}
              stepLabel="Step.4"
              accentHex={ACCENT}
              subItems={[
                { label: '庫存設定', href: '/dashboard/nx02/stock-setting' },
                { label: '設定彙整', href: '/dashboard/inventory/setting' },
              ]}
            />
          </CenterHubCardWrap>
          <CenterHubCardWrap>
            <CenterHubFlowCard
              title="盤點單"
              description="盤點中與草稿"
              icon={ClipboardList}
              footerBadge={stockTake ? `${stockTake.inProgressCount}` : '—'}
              stepLabel="Step.5"
              accentHex={ACCENT}
              subItems={[
                { label: '盤點單列表', href: '/dashboard/nx02/stock-take' },
                { label: '工作台', href: '/dashboard/inventory/workspace' },
              ]}
            />
          </CenterHubCardWrap>
          {showPlus ? (
            <CenterHubCardWrap>
              <CenterHubFlowCard
                title="調撥單"
                description="倉與倉調撥（PLUS）"
                icon={ArrowLeftRight}
                footerBadge={transfer ? `${transfer.inProgressCount}` : '—'}
                accentHex={ACCENT}
                subItems={[
                  { label: '調撥單', href: '/dashboard/nx02/transfer' },
                  { label: '自動補貨', href: '/dashboard/nx02/auto-replenish' },
                ]}
              />
            </CenterHubCardWrap>
          ) : null}
        </div>
      </section>

      {showPlus ? (
        <section className="space-y-4" aria-labelledby="inv-group-alert">
          <CenterHubGroupHeading id="inv-group-alert" title="庫存警示（PLUS）" />
          <div className="relative z-10 flex min-w-0 flex-col items-stretch gap-6 md:flex-row md:flex-nowrap md:items-center md:justify-start md:overflow-x-auto md:pb-1">
            <CenterHubCardWrap>
              <CenterHubFlowCard
                title="缺貨簿"
                description="低於安全量之缺貨清單"
                icon={AlertTriangle}
                footerBadge={shortage ? `${shortage.openCount}` : '—'}
                accentHex={ACCENT}
                subItems={[
                  { label: '缺貨簿', href: '/dashboard/nx02/shortage' },
                  { label: '工作台', href: '/dashboard/inventory/workspace' },
                ]}
              />
            </CenterHubCardWrap>
            <CenterHubCardWrap>
              <CenterHubFlowCard
                title="自動補貨設定"
                description="跨倉補貨規則"
                icon={RefreshCw}
                footerBadge={autoReplenish ? `${autoReplenish.activeRuleCount}` : '—'}
                accentHex={ACCENT}
                subItems={[
                  { label: '自動補貨', href: '/dashboard/nx02/auto-replenish' },
                  { label: '庫存首頁', href: '/dashboard/inventory' },
                ]}
              />
            </CenterHubCardWrap>
          </div>
        </section>
      ) : null}
    </div>
  );
}
