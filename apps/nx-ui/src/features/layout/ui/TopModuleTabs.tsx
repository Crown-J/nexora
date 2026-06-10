/**
 * File: apps/nx-ui/src/features/shell/ui/TopModuleTabs.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-SHELL-003：上方主模組 Tabs（HOME + NX00~NX04）
 */

'use client';

import { useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getModuleTabs } from '@/features/layout/config/modules';
import { cn } from '@/lib/utils';

/**
 * @FUNCTION_CODE NX00-UI-SHELL-003-F01
 * 說明：
 * - 根據 pathname 判斷目前在哪個模組（路由 v2.0 語意化路由）
 * - 高亮目前 tab
 */
function getActiveModule(pathname: string): string {
  if (pathname.startsWith('/dashboard/base')) return 'base';
  if (pathname.startsWith('/dashboard/purchase')) return 'purchase';
  if (pathname.startsWith('/dashboard/nx01')) return 'purchase';
  if (
    pathname.startsWith('/dashboard/nx02/domestic') ||
    pathname.startsWith('/dashboard/nx02/import') ||
    pathname.startsWith('/dashboard/nx02/special') ||
    pathname.startsWith('/dashboard/nx02/product') ||
    pathname.startsWith('/dashboard/nx02/vendor')
  ) {
    return 'purchase';
  }
  if (pathname.startsWith('/dashboard/sale')) return 'sales';
  if (pathname.startsWith('/dashboard/inventory')) return 'inventory';
  if (pathname.startsWith('/dashboard/nx03')) return 'inventory';
  if (pathname.startsWith('/dashboard/nx04')) return 'sales';
  if (pathname.startsWith('/dashboard/finance')) return 'finance';
  if (pathname.startsWith('/dashboard/nx05')) return 'finance';
  if (pathname.startsWith('/dashboard/nx02')) return 'inventory';
  if (pathname.startsWith('/dashboard/nx06')) return 'logistics';
  if (pathname.startsWith('/dashboard/hr') || pathname.startsWith('/dashboard/nx07')) return 'hr';
  if (pathname.startsWith('/dashboard/report')) return 'report';
  if (pathname.startsWith('/dashboard/nx08')) return 'report';
  if (pathname.startsWith('/dashboard/nx09')) return 'knowledge';
  if (pathname.startsWith('/dashboard/nx10')) return 'game';
  return '';
}

function isModuleTabActive(pathname: string, tabCode: string): boolean {
  return getActiveModule(pathname) === tabCode;
}

/**
 * @FUNCTION_CODE NX00-UI-SHELL-003-F02
 * 說明：
 * - TopModuleTabs：呈現 HOME + NX00~NX04
 * - 透過 config 驅動，不寫死路由
 */
export function TopModuleTabs() {
  const router = useRouter();
  const pathname = usePathname();

  const tabs = useMemo(() => getModuleTabs(), []);

  const homeActive = pathname === '/dashboard';

  return (
    <div className="flex flex-nowrap items-center gap-1.5 sm:gap-2">
      <button
        type="button"
        onClick={() => router.push('/dashboard')}
        className={cn(
          'shrink-0 rounded-xl border px-2.5 py-1.5 text-[11px] transition sm:px-3 sm:text-xs',
          homeActive
            ? 'border-primary/45 bg-primary/12 text-primary'
            : 'border-border/80 bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground',
        )}
      >
        HOME
      </button>

      {tabs.map((t) => {
        const isActive = isModuleTabActive(pathname, t.code);
        return (
          <button
            key={t.code}
            type="button"
            disabled={!t.enabled}
            onClick={() => router.push(t.href)}
            className={cn(
              'shrink-0 rounded-xl border px-2.5 py-1.5 text-[11px] transition sm:px-3 sm:text-xs',
              !t.enabled && 'cursor-not-allowed opacity-50',
              isActive
                ? 'border-primary/45 bg-primary/12 text-primary'
                : 'border-border/80 bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}