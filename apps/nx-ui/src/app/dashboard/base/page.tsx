/**
 * File: apps/nx-ui/src/app/dashboard/base/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-BASE-001：基本資料入口頁（沿用既有深色風格）
 */

import Link from 'next/link';

const baseEntries: { label: string; href: string }[] = [
  { label: '使用者基本資料', href: '/dashboard/nx00/user' },
  { label: '權限角色基本資料', href: '/dashboard/nx00/role' },
  { label: '使用者職位設定', href: '/dashboard/nx00/role-view' },
  { label: '使用者權限設定', href: '/dashboard/nx00/user-role' },
  { label: '零件基本資料', href: '/dashboard/nx00/part' },
  { label: '廠牌基本資料', href: '/dashboard/nx00/brand' },
  { label: '倉庫基本資料', href: '/dashboard/nx00/warehouse' },
  { label: '庫位基本資料', href: '/dashboard/nx00/location' },
  { label: '往來客戶基本資料', href: '/dashboard/nx00/partner' },
];

export default function DashboardBasePage() {
  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 sm:p-5">
        <div className="text-xs tracking-[0.28em] text-emerald-200/90">NEXORA</div>
        <h1 className="mt-2 text-2xl font-semibold text-white/95">基本資料</h1>
        <p className="mt-2 text-sm text-white/60">依族群分類的主檔入口，點擊卡片即可進入對應維護頁。</p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {baseEntries.map((entry) => (
          <Link
            key={entry.href}
            href={entry.href}
            className="group flex h-24 rounded-xl border border-white/10 bg-white/[0.05] p-3 text-sm text-white/85 transition hover:border-emerald-300/35 hover:bg-emerald-300/10"
          >
            <div className="flex w-full items-end justify-between">
              <span className="font-medium leading-tight">{entry.label}</span>
              <span className="text-[11px] text-white/45 group-hover:text-emerald-100">Open</span>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
