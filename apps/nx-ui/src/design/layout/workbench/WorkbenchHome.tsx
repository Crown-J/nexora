// apps/nx-ui/src/design/layout/workbench/WorkbenchHome.tsx
// 傳統 ERP 首頁工作區（取代舊太空風 HomeView）：乾淨歡迎頁 + 模組快捷入口。
// 快捷來源 = DOCK_NAV 業務模組（導覽單一來源），點卡片開該模組首功能。

'use client';

import { useRouter } from 'next/navigation';
import { tryNavigate } from '@design/hooks/useDirtyGuard';
import {
  BarChart3,
  ClipboardCheck,
  Database,
  DollarSign,
  Package,
  ShoppingCart,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { useSessionMe } from '@/features/auth/hooks/useSessionMe';
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

const GROUP_DESC: Record<string, string> = {
  master: '基本資料維護',
  purchase: '採購與進貨',
  sales: '報價銷貨作業',
  approval: '跨模組簽核',
  inventory: '入庫出貨庫存',
  finance: '應收應付關帳',
  report: '營運報表分析',
};

// 首頁快捷：取選單列業務組（排除系統設定）
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

export function WorkbenchHome() {
  const router = useRouter();
  const { displayName, me } = useSessionMe();
  const name = displayName || me?.username || '系統管理員';

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="rounded-lg border border-border bg-card px-6 py-5">
        <div className="text-[13px] tracking-[0.3em] text-muted-foreground">NEXORA GRID</div>
        <h1 className="mt-1 text-xl font-semibold text-foreground">{name}，您好</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          請由上方功能選單或下方快捷進入作業。
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {HOME_GROUPS.map((g) => {
          const Icon = GROUP_ICON[g.key] ?? Database;
          const href = firstHref(g);
          const disabled = !href || !!g.comingSoon;
          return (
            <button
              key={g.key}
              type="button"
              disabled={disabled}
              onClick={() => href && tryNavigate(() => router.push(href), `home: ${g.label}`)}
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3.5 text-left transition hover:border-primary/50 hover:bg-primary/[0.04] disabled:opacity-50 disabled:hover:border-border disabled:hover:bg-card"
            >
              <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary">
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span>
                <span className="block text-[14px] font-medium text-foreground">{g.label}</span>
                <span className="block text-[11.5px] text-muted-foreground">
                  {g.comingSoon ? '即將推出' : (GROUP_DESC[g.key] ?? '')}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
