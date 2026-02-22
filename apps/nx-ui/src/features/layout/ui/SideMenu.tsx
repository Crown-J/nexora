/**
 * File: apps/nx-ui/src/features/layout/ui/SideMenu.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-SHELL-004：左側次功能選單（依模組切換）
 */

'use client';

import { useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { cx } from '@/shared/lib/cx';
import { resolveSideMenuGroups } from '@/features/layout/config/side-menu';

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

  const groups = useMemo(() => resolveSideMenuGroups(pathname), [pathname]);

  return (
    <aside className="w-[340px] shrink-0">
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-xl shadow-[0_25px_90px_rgba(0,0,0,0.6)]">
        <div className="text-xs tracking-wider text-white/55">MODULE MENU</div>

        <div className="mt-3 space-y-4">
          {groups.map((g) => (
            <div key={g.group}>
              <div className="mb-2 text-xs text-white/40">{g.group}</div>

              <div className="space-y-2">
                {g.items.map((it) => {
                  const isDisabled = !!it.disabled || !it.href;
                  const isActive = !!it.href && isPathActive(pathname, it.href);

                  return (
                    <button
                      key={it.key}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => it.href && router.push(it.href)}
                      className={cx(
                        'w-full rounded-xl border px-3 py-2 text-left text-sm transition',
                        isActive
                          ? 'border-[#39ff14]/35 bg-[#39ff14]/10 text-white'
                          : 'border-white/10 bg-black/25 text-white/80 hover:bg-black/35',
                        isDisabled &&
                          'cursor-not-allowed opacity-55 hover:bg-black/25'
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

/**
 * @FUNCTION_CODE NX00-UI-SHELL-004-F03
 * 說明：
 * - active 判斷：避免 startsWith 誤判（確保段落邊界）
 */
function isPathActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}