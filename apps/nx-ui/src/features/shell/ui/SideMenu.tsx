/**
 * File: apps/nx-ui/src/features/shell/ui/SideMenu.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-SHELL-004：左側次功能選單（依模組切換）
 */

'use client';

import { useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { cx } from '@/shared/lib/cx';
import { getNx00SideMenu, type SideMenuGroup } from '@/features/shell/config/menu.nx00';

/**
 * @FUNCTION_CODE NX00-UI-SHELL-004-F01
 * 說明：
 * - 依 pathname 推斷當前模組
 * - 目前先支援 nx00；之後加 nx01/nx02… 只要接對應 config
 */
function resolveMenu(pathname: string): SideMenuGroup[] {
  const m = pathname.match(/^\/dashboard\/(nx\d{2})/i);
  const code = (m?.[1] || 'nx00').toLowerCase();

  if (code === 'nx00') return getNx00SideMenu();

  // TODO: nx01/nx02/nx03/nx04
  return [];
}

/**
 * @FUNCTION_CODE NX00-UI-SHELL-004-F02
 * 說明：
 * - SideMenu：左側次功能清單
 * - 支援 active 高亮
 * - disabled 會呈現不可點
 */
export function SideMenu() {
  const router = useRouter();
  const pathname = usePathname();

  const groups = useMemo(() => resolveMenu(pathname), [pathname]);

  return (
    <aside className="w-[340px] shrink-0">
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl shadow-[0_25px_90px_rgba(0,0,0,0.6)] p-4">
        <div className="text-xs tracking-wider text-white/55">MODULE MENU</div>

        <div className="mt-3 space-y-4">
          {groups.map((g) => (
            <div key={g.group}>
              <div className="text-xs text-white/40 mb-2">{g.group}</div>

              <div className="space-y-2">
                {g.items.map((it) => {
                  const active = it.href ? pathname.startsWith(it.href) : false;
                  return (
                    <button
                      key={it.key}
                      disabled={!!it.disabled || !it.href}
                      onClick={() => it.href && router.push(it.href)}
                      className={cx(
                        'w-full rounded-xl border px-3 py-2 text-left text-sm transition',
                        active
                          ? 'border-[#39ff14]/35 bg-[#39ff14]/10 text-white'
                          : 'border-white/10 bg-black/25 text-white/80 hover:bg-black/35',
                        (it.disabled || !it.href) && 'opacity-55 cursor-not-allowed hover:bg-black/25'
                      )}
                    >
                      {it.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}