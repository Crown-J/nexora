// apps/nx-ui/src/app/dashboard/settings/page.tsx
// v1.2 對齊軌 A+B：設定中心 hub（v1.2 §12 五子頁）

import Link from 'next/link';

const CARDS: { href: string; title: string; desc: string; emoji: string; ready: boolean }[] = [
  {
    href: '/dashboard/settings/company',
    title: '公司資料',
    desc: '修改公司名稱 / 統編 / 地址 / LOGO',
    emoji: '🏢',
    ready: false,
  },
  {
    href: '/dashboard/settings/roles',
    title: '角色與權限',
    desc: '⭐ v1.2 §12.2 核心：從零建角色、自由命名、組合權限',
    emoji: '🔐',
    ready: true,
  },
  {
    href: '/dashboard/settings/system-param',
    title: '系統參數',
    desc: '資料起算日 ⭐（v1.2 §12.3 C 階段落地）+ 其他系統參數 FU',
    emoji: '⚙️',
    ready: true,
  },
  {
    href: '/dashboard/settings/accounts',
    title: '帳號管理',
    desc: '員工帳號列表 / 停用 / 重設密碼（負責人不可停用）',
    emoji: '👤',
    ready: false,
  },
  {
    href: '/dashboard/settings/wizard',
    title: '引導精靈',
    desc: '重新開啟匯入精靈 / 重置設定精靈',
    emoji: '🪄',
    ready: false,
  },
];

export default function SettingsHubPage() {
  return (
    <div className="w-full min-w-0 space-y-6 p-6">
      <header className="space-y-1">
        <p className="text-xs tracking-[0.35em] text-muted-foreground">SETTINGS</p>
        <h1 className="text-2xl font-semibold tracking-tight">設定中心</h1>
        <p className="text-sm text-muted-foreground">
          負責人專屬：管理公司資料 / 角色權限 / 系統參數 / 帳號 / 引導精靈。
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {CARDS.map((c) =>
          c.ready ? (
            <Link
              key={c.href}
              href={c.href}
              className="rounded-lg border p-4 transition hover:border-primary hover:bg-muted/30"
            >
              <div className="text-2xl">{c.emoji}</div>
              <h2 className="mt-2 font-semibold">{c.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
            </Link>
          ) : (
            <div
              key={c.href}
              className="rounded-lg border border-dashed p-4 opacity-60"
            >
              <div className="text-2xl">{c.emoji}</div>
              <h2 className="mt-2 font-semibold">
                {c.title} <span className="ml-2 text-xs text-muted-foreground">（未做）</span>
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
            </div>
          ),
        )}
      </section>

      <footer className="text-xs text-muted-foreground">
        ⚠️ 階段 A+B 階段先交付「角色與權限」、其他子頁待後續階段補（v1.2 §14 階段 C / D）。
      </footer>
    </div>
  );
}
