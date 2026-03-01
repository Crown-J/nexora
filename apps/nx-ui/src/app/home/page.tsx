/**
 * File: apps/nx-ui/src/app/home/page.tsx
 * Project: NEXORA (Monorepo)
 * Purpose:
 * - NX00-UI-002：登入後首頁（Landing / Home）
 *
 * Notes:
 * - 黑底 + 霧面玻璃 + Nexora 綠點綴
 * - ✅ 改用 useSessionMe 做驗證（與 /dashboard layout 對齊）
 * - 未登入 → useSessionMe 內部會 redirect /login
 * - logout → 統一走 useSessionMe.logout
 * - ✅ 簡化首頁：卡片入口（主檔 / 進貨 / 銷售 / 庫存 / 財務）
 */

'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionMe } from '@/features/auth/hooks/useSessionMe';

type HomeCard = {
  key: 'master' | 'purchase' | 'sales' | 'inventory' | 'finance';
  title: string;
  desc: string;
  tag?: string;
  href: string;
  links?: { label: string; href: string }[];
};

export default function HomePage() {
  const router = useRouter();
  const { me, displayName, logout, view, hasToken } = useSessionMe();

  useEffect(() => {
    if (!view.loading && !me) router.replace('/login');
  }, [me, router, view.loading]);

  const cards: HomeCard[] = useMemo(
    () => [
      {
        key: 'master',
        title: '主檔',
        desc: '使用者、零件、品牌、客戶/供應商、倉庫/庫位等基本資料。',
        tag: 'NX00',
        href: '/dashboard/nx00/part',
        links: [
          { label: 'Users', href: '/dashboard/nx00/users' },
          { label: 'Parts', href: '/dashboard/nx00/parts' },
          { label: 'Roles', href: '/dashboard/nx00/roles' },
        ],
      },
      {
        key: 'purchase',
        title: '進貨',
        desc: '採購/進貨流程（Lite：先放入口，後續接 NX01）。',
        tag: 'NX01',
        href: '/dashboard',
        links: [{ label: 'Dashboard', href: '/dashboard' }],
      },
      {
        key: 'sales',
        title: '銷售',
        desc: '銷售/出貨流程（Lite：先放入口，後續接 NX03）。',
        tag: 'NX03',
        href: '/dashboard',
        links: [{ label: 'Dashboard', href: '/dashboard' }],
      },
      {
        key: 'inventory',
        title: '庫存',
        desc: '庫存查詢、庫位管理、盤點（Lite：先放入口，後續接 NX02）。',
        tag: 'NX02',
        href: '/dashboard',
        links: [{ label: 'Dashboard', href: '/dashboard' }],
      },
      {
        key: 'finance',
        title: '財務',
        desc: '應收/應付/付款（Lite：先放入口，後續接 NX04）。',
        tag: 'NX04',
        href: '/dashboard',
        links: [{ label: 'Dashboard', href: '/dashboard' }],
      },
    ],
    [],
  );

  if (view.loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-sm text-white/60">Loading…</div>
      </div>
    );
  }

  if (view.errorMsg) {
    return (
      <div className="min-h-screen bg-[#05070b] text-white flex items-center justify-center px-6">
        <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur-xl p-6 shadow-[0_30px_120px_rgba(0,0,0,0.55)]">
          <div className="text-xs tracking-[0.35em] text-white/60">NEXORA</div>
          <div className="mt-2 text-lg font-semibold text-white/90">Session error</div>
          <div className="mt-2 text-sm text-white/60 leading-relaxed">{view.errorMsg}</div>

          <div className="mt-5 flex gap-2">
            <button
              onClick={() => router.replace('/login')}
              className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 text-xs text-white/80 hover:bg-white/[0.10] transition"
            >
              Go to Login
            </button>

            <button
              onClick={logout}
              className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs text-emerald-200 hover:bg-emerald-400/15 transition"
            >
              Logout
            </button>
          </div>

          <div className="mt-4 text-xs text-white/35">checkedAt: {view.checkedAt || '-'}</div>
        </div>
      </div>
    );
  }

  const nameText = displayName || me?.username || '—';

  return (
    <div className="min-h-screen bg-[#05070b] text-white">
      {/* 背景光暈 */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute right-[-120px] top-[20%] h-[520px] w-[520px] rounded-full bg-lime-400/10 blur-[140px]" />
        <div className="absolute left-[20%] bottom-[-160px] h-[520px] w-[520px] rounded-full bg-emerald-500/10 blur-[140px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 mx-auto max-w-6xl px-6 pt-8">
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
              {hasToken ? 'Auth OK' : 'No Token'}
            </div>

            <button
              onClick={() => router.push('/dashboard')}
              className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 text-xs text-white/80 hover:bg-white/[0.10] transition"
            >
              Dashboard
            </button>

            <button
              onClick={logout}
              className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs text-emerald-200 hover:bg-emerald-400/15 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 mx-auto max-w-6xl px-6 pb-14 pt-8">
        {/* Top strip */}
        <section className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              NX00 Auth Verified
            </div>

            <div className="mt-3 text-xl md:text-2xl font-semibold tracking-tight">
              {nameText}，今天要從哪個模組開始？
            </div>
            <div className="mt-1 text-sm text-white/50">Lite 版首頁：用卡片入口快速進入各工作區。</div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => router.push('/dashboard/nx00/users')}
              className="rounded-2xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-black hover:brightness-110 transition shadow-[0_18px_45px_rgba(52,211,153,0.25)]"
            >
              Users
            </button>
            <button
              onClick={() => router.push('/dashboard/nx00/parts')}
              className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-white/85 hover:bg-white/[0.10] transition"
            >
              Parts
            </button>
          </div>
        </section>

        {/* Cards */}
        <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <HomeModuleCard
              key={c.key}
              title={c.title}
              desc={c.desc}
              tag={c.tag}
              onOpen={() => router.push(c.href)}
              links={c.links}
              onOpenLink={(href) => router.push(href)}
            />
          ))}
        </section>

        {/* Footer */}
        <footer className="mt-10 text-center text-xs text-white/35">© 2026 Nexora — Secure Access</footer>
      </main>
    </div>
  );
}

function HomeModuleCard(props: {
  title: string;
  desc: string;
  tag?: string;
  onOpen: () => void;
  links?: { label: string; href: string }[];
  onOpenLink?: (href: string) => void;
}) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur-xl p-6 shadow-[0_20px_80px_rgba(0,0,0,0.45)] hover:bg-white/[0.10] transition">
      {/* corner glow */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-emerald-400/10 blur-[60px] opacity-0 group-hover:opacity-100 transition" />

      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-white/90">{props.title}</div>
          <div className="mt-1 text-sm text-white/55 leading-relaxed">{props.desc}</div>
        </div>

        {props.tag ? (
          <div className="shrink-0 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
            {props.tag}
          </div>
        ) : null}
      </div>

      {/* actions */}
      <div className="mt-5 flex items-center justify-between">
        <button
          onClick={props.onOpen}
          className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-xs text-white/80 hover:bg-white/[0.10] transition"
        >
          Open →
        </button>

        <div className="text-[11px] text-white/45">快捷入口</div>
      </div>

      {/* links */}
      {props.links && props.links.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {props.links.map((l) => (
            <button
              key={l.href}
              onClick={() => props.onOpenLink?.(l.href)}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-white/70 hover:bg-white/[0.08] transition"
            >
              {l.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}