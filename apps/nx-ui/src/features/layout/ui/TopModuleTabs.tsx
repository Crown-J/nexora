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
import { cx } from '@/shared/lib/cx';

/**
 * @FUNCTION_CODE NX00-UI-SHELL-003-F01
 * 說明：
 * - 根據 pathname 判斷目前在哪個模組
 * - 高亮目前 tab
 */
function getActiveModule(pathname: string): string {
  const m = pathname.match(/^\/dashboard\/(nx\d{2})/i);
  return (m?.[1] || '').toLowerCase();
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
  const active = getActiveModule(pathname);

  const tabs = useMemo(() => getModuleTabs(), []);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => router.push('/dashboard')}
        className={cx(
          'px-3 py-1.5 rounded-xl text-xs border transition',
          pathname === '/dashboard'
            ? 'border-[#39ff14]/40 bg-[#39ff14]/15 text-[#39ff14]'
            : 'border-white/10 bg-white/5 text-white/75 hover:bg-white/10'
        )}
      >
        HOME
      </button>

      {tabs.map((t) => {
        const isActive = active === t.code;
        return (
          <button
            key={t.code}
            disabled={!t.enabled}
            onClick={() => router.push(t.href)}
            className={cx(
              'px-3 py-1.5 rounded-xl text-xs border transition',
              !t.enabled && 'opacity-50 cursor-not-allowed',
              isActive
                ? 'border-[#39ff14]/40 bg-[#39ff14]/15 text-[#39ff14]'
                : 'border-white/10 bg-white/5 text-white/75 hover:bg-white/10'
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}