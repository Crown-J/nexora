// apps/nx-ui/src/design/layout/workbench/WorkbenchHome.tsx
// 首頁工作區。2026-07-11 執行長拍板改版 V1：「首頁＝我今天要做什麼」——
//   ① 今日待辦卡（點卡直達清單）② 快捷動作（數字鍵直達）③ 主管今日數字（OWNER/SYSADMIN）
//   ④ 公告；模組導航卡保留但降級縮小（選單已有同功能）。
// 分期：V2 角色個人化配置、V3 主管儀表擴充（拍板分期）。
// 前身「乾淨歡迎頁 + 模組快捷入口」（快捷來源 = 選單業務組）降級為底部導航列。

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { tryNavigate } from '@design/hooks/useDirtyGuard';
import {
  BarChart3,
  ClipboardCheck,
  Database,
  DollarSign,
  FilePlus,
  Megaphone,
  Package,
  Receipt,
  Search,
  ShoppingCart,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useSessionMe } from '@/features/auth/hooks/useSessionMe';
import { BrandLogo } from '@design/brand/BrandLogo';
import { getHomeSummary, type HomeSummary } from '@data/endpoints/nx08/api';
import { listBulletins, type BulletinDto } from '@data/endpoints/nx01/api/bulletin';
import { MENU_BAR, type MenuNode } from './menu-data';

const GROUP_ICON: Record<string, LucideIcon> = {
  master: Database,
  purchase: ShoppingCart,
  sales: TrendingUp,
  approval: ClipboardCheck,
  inventory: Package,
  finance: DollarSign,
  report: BarChart3,
};

// 首頁底部導航：取選單列業務組（排除系統設定）
const HOME_GROUPS: MenuNode[] = MENU_BAR.filter((g) => g.key !== 'system');

/** 取某選單群組第一個可導向的葉節點 href */
function firstHref(node: MenuNode): string | undefined {
  if (node.href) return node.href;
  for (const c of node.children ?? []) {
    const h = firstHref(c);
    if (h) return h;
  }
  return undefined;
}

/** 待辦卡（count 級、點卡直達過濾清單頁；alert=非零時橘/紅框提醒） */
function TodoCard({
  label,
  value,
  href,
  alert,
  onGo,
}: {
  label: string;
  value: number | null;
  href: string;
  alert?: 'warning' | 'danger';
  onGo: (href: string, label: string) => void;
}) {
  const alertCls =
    value && alert === 'danger'
      ? 'border-red-500/50'
      : value && alert === 'warning'
        ? 'border-amber-500/50'
        : 'border-border';
  return (
    <button
      type="button"
      onClick={() => onGo(href, label)}
      className={`rounded-lg border bg-card px-3 py-2.5 text-left transition hover:border-primary/50 hover:bg-primary/[0.04] ${alertCls}`}
    >
      <span className="block text-[11.5px] text-muted-foreground">{label}</span>
      <span className="block text-[22px] font-semibold leading-7 text-foreground">
        {value ?? '—'}
      </span>
    </button>
  );
}

export function WorkbenchHome() {
  const router = useRouter();
  const { displayName, me } = useSessionMe();
  const name = displayName || me?.username || '系統管理員';

  const [summary, setSummary] = useState<HomeSummary | null>(null);
  const [bulletins, setBulletins] = useState<BulletinDto[]>([]);

  useEffect(() => {
    let alive = true;
    getHomeSummary()
      .then((s) => alive && setSummary(s))
      .catch(() => alive && setSummary(null));
    listBulletins({ isActive: true, pageSize: 5 })
      .then((b) => alive && setBulletins(b.items))
      .catch(() => alive && setBulletins([]));
    return () => {
      alive = false;
    };
  }, []);

  const go = (href: string, label: string) => tryNavigate(() => router.push(href), `home: ${label}`);

  // 快捷動作數字鍵（1 報價/2 銷貨/3 客戶）；輸入框內或帶修飾鍵不攔
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const map: Record<string, [string, string]> = {
        '1': ['/dashboard/sale/qt', '新報價'],
        '2': ['/dashboard/sale/so', '新銷貨'],
        '3': ['/dashboard/master/partners/customer', '查客戶'],
      };
      const hit = map[e.key];
      if (hit) {
        e.preventDefault();
        go(hit[0], hit[1]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const s = summary;
  const num = (v: number | undefined) => (s ? (v ?? 0) : null);

  return (
    <div className="mx-auto max-w-5xl p-6">
      {/* 問候列（緊湊版） */}
      <div className="flex items-center gap-3">
        <BrandLogo size={32} className="shrink-0 rounded-lg" />
        <h1 className="text-lg font-semibold text-foreground">{name}，您好</h1>
        <span className="text-[12px] text-muted-foreground">今天要做什麼、從下面開始。</span>
      </div>

      {/* ① 今日待辦 */}
      <div className="mt-4 space-y-3">
        <div>
          <div className="mb-1.5 text-[11.5px] font-medium text-muted-foreground">銷售待辦</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <TodoCard label="未結報價" value={num(s?.sales.openQuotes)} href="/dashboard/sale/qt" onGo={go} />
            <TodoCard label="待出貨銷貨" value={num(s?.sales.toShipSo)} href="/dashboard/sale/so" onGo={go} />
            <TodoCard label="補貨中明細" value={num(s?.sales.replenishingItems)} href="/dashboard/sale/so" alert="warning" onGo={go} />
            <TodoCard label="逾期應收" value={num(s?.sales.overdueAr)} href="/dashboard/finance/ar" alert="danger" onGo={go} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <div className="mb-1.5 text-[11.5px] font-medium text-muted-foreground">倉儲待辦</div>
            <div className="grid grid-cols-3 gap-2">
              <TodoCard label="待驗收" value={num(s?.warehouse.inspectingRr)} href="/dashboard/inventory/receiving" onGo={go} />
              <TodoCard label="待撿貨" value={num(s?.warehouse.pickingItems)} href="/dashboard/inventory/picking" onGo={go} />
              <TodoCard label="待包貨" value={num(s?.warehouse.packingItems)} href="/dashboard/inventory/packing" onGo={go} />
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-[11.5px] font-medium text-muted-foreground">財務待辦</div>
            <div className="grid grid-cols-2 gap-2">
              <TodoCard label="7 日內應付" value={num(s?.finance.apDueSoon)} href="/dashboard/finance/ap" alert="warning" onGo={go} />
              <TodoCard label="逾期應收" value={num(s?.finance.overdueAr)} href="/dashboard/finance/ar" alert="danger" onGo={go} />
            </div>
          </div>
        </div>
      </div>

      {/* ② 快捷動作 */}
      <div className="mt-5">
        <div className="mb-1.5 text-[11.5px] font-medium text-muted-foreground">
          快捷動作（鍵盤直達：F1 查庫存、F2 報價、數字鍵開單）
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-muted-foreground">
            <Search className="h-4 w-4" />
            即時庫存查詢
            <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10.5px]">F1</kbd>
          </span>
          <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-muted-foreground">
            <FilePlus className="h-4 w-4" />
            即時報價查詢
            <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10.5px]">F2</kbd>
          </span>
          <button type="button" onClick={() => go('/dashboard/sale/qt', '新報價')} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-[13px] transition hover:border-primary/50 hover:bg-primary/[0.04]">
            <FilePlus className="h-4 w-4 text-primary" />
            新報價
            <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10.5px]">1</kbd>
          </button>
          <button type="button" onClick={() => go('/dashboard/sale/so', '新銷貨')} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-[13px] transition hover:border-primary/50 hover:bg-primary/[0.04]">
            <Receipt className="h-4 w-4 text-primary" />
            新銷貨
            <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10.5px]">2</kbd>
          </button>
          <button type="button" onClick={() => go('/dashboard/master/partners/customer', '查客戶')} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-[13px] transition hover:border-primary/50 hover:bg-primary/[0.04]">
            <Users className="h-4 w-4 text-primary" />
            查客戶
            <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10.5px]">3</kbd>
          </button>
        </div>
      </div>

      {/* ③ 主管今日數字 + ④ 公告 */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {s?.manager ? (
          <div>
            <div className="mb-1.5 text-[11.5px] font-medium text-muted-foreground">今日數字</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-border bg-card px-3 py-2.5">
                <span className="block text-[11.5px] text-muted-foreground">今日銷貨額</span>
                <span className="block text-[18px] font-semibold text-foreground">
                  {Number(s.manager.todaySoAmount).toLocaleString()}
                </span>
              </div>
              <div className="rounded-lg border border-border bg-card px-3 py-2.5">
                <span className="block text-[11.5px] text-muted-foreground">今日開單數</span>
                <span className="block text-[18px] font-semibold text-foreground">{s.manager.todaySoCount}</span>
              </div>
            </div>
          </div>
        ) : (
          <div />
        )}
        <div>
          <div className="mb-1.5 text-[11.5px] font-medium text-muted-foreground">公告</div>
          <div className="rounded-lg border border-border bg-card px-3 py-2.5">
            {bulletins.length === 0 ? (
              <span className="text-[12.5px] text-muted-foreground">目前沒有公告。</span>
            ) : (
              <ul className="space-y-1">
                {bulletins.slice(0, 3).map((b) => (
                  <li key={b.id} className="flex items-center gap-2 text-[12.5px] text-foreground">
                    <Megaphone className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="truncate">{b.title}</span>
                    {b.isPinned ? <span className="rounded bg-primary/10 px-1 text-[10px] text-primary">置頂</span> : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* 模組導航（降級縮小；選單同功能、留給滑鼠使用者） */}
      <div className="mt-6">
        <div className="mb-1.5 text-[11.5px] font-medium text-muted-foreground">模組入口</div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-7">
          {HOME_GROUPS.map((g) => {
            const Icon = GROUP_ICON[g.key] ?? Database;
            const href = firstHref(g);
            const disabled = !href || !!g.comingSoon;
            return (
              <button
                key={g.key}
                type="button"
                disabled={disabled}
                onClick={() => href && go(href, g.label)}
                title={g.comingSoon ? '即將推出' : g.label}
                className="flex flex-col items-center gap-1 rounded-lg border border-border bg-card px-2 py-2.5 transition hover:border-primary/50 hover:bg-primary/[0.04] disabled:opacity-50 disabled:hover:border-border disabled:hover:bg-card"
              >
                <Icon className="h-4 w-4 text-primary" />
                <span className="text-[11.5px] text-foreground">{g.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
