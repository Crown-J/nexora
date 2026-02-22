/**
 * File: apps/nx-ui/src/app/home/page.tsx
 * Project: NEXORA (Monorepo)
 * Purpose: NX00-UI-002 登入後首頁（Landing / Home）
 * Notes:
 * - 黑底 + 霧面玻璃 + Nexora 綠點綴
 * - 先用 Client Guard（localStorage token）保護
 * - 之後可改成 /auth/me 驗證與全域 AuthProvider
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

const TOKEN_KEY = 'nx00_token';

function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

type QuickAction = {
  title: string;
  desc: string;
  href: string;
  tag?: string;
};

export default function HomePage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  /**
   * @CODE nxui_nx00_home_guard_001
   * 說明：
   * - 進入 /home 時檢查 token
   * - 沒 token → 導回 /login
   */
  useEffect(() => {
    const t = getToken();
    if (!t) {
      router.replace('/login');
      return;
    }
    setToken(t);
  }, [router]);

  /**
   * @CODE nxui_nx00_home_data_001
   * 說明：
   * - 首頁先用靜態資料（後面再接 API）
   * - actions 之後會變成「模組捷徑」
   */
  const actions: QuickAction[] = useMemo(
    () => [
      { title: '零件主檔', desc: '建立/查詢零件資料（NX12）', href: '/nx12/parts', tag: 'NX12' },
      { title: '庫存查詢', desc: '查庫位、數量、批次（NX01）', href: '/nx01/stock', tag: 'NX01' },
      { title: '調撥/出貨', desc: '建立調撥與出貨單（NX02）', href: '/nx02/orders', tag: 'NX02' },
      { title: '系統設定', desc: '使用者、權限、公司資料（CORE）', href: '/core/settings', tag: 'CORE' },
    ],
    [],
  );

  /**
   * @CODE nxui_nx00_home_logout_001
   * 說明：
   * - 先用最簡單 logout：清 token → 回 /login
   */
  function handleLogout() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {}
    router.replace('/login');
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-sm text-white/60">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070b] text-white">
      {/* 背景光暈 */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute right-[-120px] top-[20%] h-[520px] w-[520px] rounded-full bg-lime-400/10 blur-[140px]" />
        <div className="absolute left-[20%] bottom-[-160px] h-[520px] w-[520px] rounded-full bg-emerald-500/10 blur-[140px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 mx-auto max-w-6xl px-6 pt-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl border border-white/10 bg-white/[0.06] backdrop-blur-xl flex items-center justify-center">
              <span className="text-xs font-semibold tracking-widest">NX</span>
            </div>
            <div>
              <div className="text-sm tracking-[0.28em] font-semibold">NEXORA</div>
              <div className="text-xs text-white/50">ERP Console — Home</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs text-white/70">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.65)]" />
              Auth OK
            </div>

            <button
              onClick={() => router.push('/dashboard')}
              className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 text-xs text-white/80 hover:bg-white/[0.10] transition"
            >
              Dashboard
            </button>

            <button
              onClick={handleLogout}
              className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs text-emerald-200 hover:bg-emerald-400/15 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 mx-auto max-w-6xl px-6 pb-16 pt-10">
        {/* Hero */}
        <section className="rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur-xl p-8 md:p-10 shadow-[0_30px_120px_rgba(0,0,0,0.55)]">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                NX00 Auth Verified
              </div>

              <h1 className="mt-4 text-2xl md:text-3xl font-semibold tracking-tight">
                Welcome back, <span className="text-emerald-200">admin</span>
              </h1>
              <p className="mt-2 text-sm md:text-base text-white/55 leading-relaxed">
                這裡是 Nexora 登入後首頁。接下來你可以直接進入各模組，或查看系統狀態。
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => router.push('/nx01/stock')}
                className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-black hover:brightness-110 transition shadow-[0_18px_45px_rgba(52,211,153,0.25)]"
              >
                Quick: Stock
              </button>
              <button
                onClick={() => router.push('/core/settings')}
                className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-semibold text-white/85 hover:bg-white/[0.10] transition"
              >
                Settings
              </button>
            </div>
          </div>

          {/* Status cards */}
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            <StatCard
              title="API"
              value="Online"
              hint="http://localhost:3001"
              badge="OK"
            />
            <StatCard
              title="Database"
              value="Connected"
              hint="PostgreSQL / Prisma"
              badge="OK"
            />
            <StatCard
              title="Module"
              value="NX00 Ready"
              hint="Auth / UI baseline"
              badge="W02"
            />
          </div>
        </section>

        {/* Quick actions */}
        <section className="mt-10">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Quick Actions</h2>
              <p className="mt-1 text-sm text-white/50">常用入口（後續會接真實模組與權限）</p>
            </div>

            <button
              onClick={() => router.push('/core/settings')}
              className="text-xs text-white/70 hover:text-white transition"
            >
              Manage →
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {actions.map((a) => (
              <button
                key={a.href}
                onClick={() => router.push(a.href)}
                className="group text-left rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur-xl p-6 hover:bg-white/[0.10] transition shadow-[0_20px_80px_rgba(0,0,0,0.45)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-base font-semibold">{a.title}</div>
                    <div className="mt-1 text-sm text-white/55">{a.desc}</div>
                  </div>

                  {a.tag ? (
                    <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
                      {a.tag}
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 text-xs text-white/45 group-hover:text-white/70 transition">
                  Open →
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-12 text-center text-xs text-white/35">
          © 2026 Nexora — Secure Access
        </footer>
      </main>
    </div>
  );
}

function StatCard(props: { title: string; value: string; hint: string; badge: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs text-white/50">{props.title}</div>
        <div className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] text-white/70">
          {props.badge}
        </div>
      </div>
      <div className="mt-3 text-lg font-semibold">{props.value}</div>
      <div className="mt-1 text-xs text-white/45">{props.hint}</div>
    </div>
  );
}
