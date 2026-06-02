// apps/nx-ui/src/features/platform/ui/PlatformShell.tsx
// 平台層 vs 租戶層分離軌 Phase 4/5/6.1：平台後台 client shell
// Phase 6.5：從 app/platform/layout.tsx 拆出來、讓 layout 變 server component
//            可以 export metadata 覆蓋客戶端 NEXORA GRID 殘留。
//
// 視覺設計刻意跟客戶端 /dashboard 區隔：
// - 全黑底 + zinc 灰階、無星空背景、無 NEXORA GRID 品牌字眼
// - 頂部 nav 用 monospace、僅顯示 "NEXORA · Platform Console"
// - 不繼承 DashboardShell、不掛 HomeTopBar、不放任何客戶可能看到的元件
// - 客戶端瀏覽器若不小心進來、視覺上一眼看出「不是給我的」

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { getPlatformMe, type PlatformMe } from '@/features/platform/auth/api';
import { PlatformApiError } from '@/features/platform/api/client';
import { clearToken } from '@/features/auth/token';

const NAV_ITEMS: Array<{ href: string; label: string }> = [
  { href: '/platform', label: 'Hub' },
  { href: '/platform/onboarding', label: 'Onboarding' },
  { href: '/platform/customers', label: 'Customers' },
];

// Phase 5：/platform/login 自帶完整黑底頁殼、bypass layout 認證守衛、避免雞生蛋
const LOGIN_PATH = '/platform/login';
// Phase 6.1：強制改密頁、layout 仍掛外殼但不執行 must_change_password redirect 守衛（雞生蛋）
const CHANGE_PASSWORD_PATH = '/platform/change-password';

export function PlatformShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<PlatformMe | null>(null);
  const [authState, setAuthState] = useState<'checking' | 'ok' | 'no-token' | 'wrong-scope'>('checking');

  const isLoginPath = pathname === LOGIN_PATH;

  useEffect(() => {
    if (isLoginPath) {
      setAuthState('ok');
      return;
    }
    let cancelled = false;
    getPlatformMe()
      .then((data) => {
        if (cancelled) return;
        setMe(data);
        setAuthState('ok');
        if (data.must_change_password && pathname !== CHANGE_PASSWORD_PATH) {
          router.replace(CHANGE_PASSWORD_PATH);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof PlatformApiError && err.status === 401) {
          setAuthState('wrong-scope');
        } else {
          setAuthState('no-token');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [pathname, isLoginPath, router]);

  if (isLoginPath) {
    return <>{children}</>;
  }

  function handleLogout() {
    clearToken();
    router.replace('/login');
  }

  if (authState === 'checking') {
    return (
      <div className="min-h-screen bg-black text-zinc-500 font-mono text-xs flex items-center justify-center">
        verifying platform session...
      </div>
    );
  }

  if (authState !== 'ok' || !me) {
    return (
      <div className="min-h-screen bg-black text-zinc-200 font-mono p-8 max-w-md mx-auto flex items-center">
        <div className="w-full border border-zinc-800 bg-zinc-950 p-6 space-y-4">
          <div className="space-y-1">
            <p className="text-[10px] tracking-[0.3em] uppercase text-zinc-600">NEXORA · Platform Console</p>
            <p className="text-amber-300 text-sm">⚠ Platform session not detected</p>
          </div>
          <p className="text-zinc-500 text-xs leading-relaxed">
            此區為 NEXORA 自家營運後台、需平台帳號才能進。請使用平台超管帳號登入。
          </p>
          <Link
            href={LOGIN_PATH}
            className="block w-full text-center bg-zinc-100 text-zinc-950 hover:bg-zinc-300 py-2 text-xs uppercase tracking-[0.3em]"
          >
            Go to platform sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-mono">
      <header className="border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="text-sm tracking-[0.3em] uppercase text-zinc-200">
              NEXORA · Platform Console
            </div>
            <nav className="flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href || (item.href !== '/platform' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      'px-3 py-1 text-xs uppercase tracking-wider rounded-sm transition-colors',
                      active
                        ? 'bg-zinc-800 text-zinc-100'
                        : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900',
                    ].join(' ')}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <div>
              <span className="text-zinc-600">signed in as</span>{' '}
              <span className="text-zinc-300">{me.account}</span>
            </div>
            <Link
              href={CHANGE_PASSWORD_PATH}
              className={[
                'px-2 py-1 border uppercase tracking-wider rounded-sm',
                pathname === CHANGE_PASSWORD_PATH
                  ? 'border-zinc-500 text-zinc-200'
                  : 'border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200',
              ].join(' ')}
            >
              Change password
            </Link>
            <button
              onClick={handleLogout}
              className="px-2 py-1 border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 uppercase tracking-wider rounded-sm"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {me.must_change_password && pathname !== CHANGE_PASSWORD_PATH ? (
        <div className="bg-amber-950 border-b border-amber-800 text-amber-200 text-xs px-6 py-2 max-w-6xl mx-auto">
          ⚠ 您的帳號目前使用預設密碼、請至「Change password」更新。
        </div>
      ) : null}

      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>

      <footer className="max-w-6xl mx-auto px-6 py-6 text-[10px] text-zinc-700 border-t border-zinc-900 mt-12 uppercase tracking-widest">
        Platform Console · 不對客戶開放 · operated by Innova IT
      </footer>
    </div>
  );
}
