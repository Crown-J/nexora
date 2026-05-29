// apps/nx-ui/src/app/dashboard/nx04/page.tsx
// NX04-M3 C7：NX04 銷貨 LITE 模組首頁（hub）

import Link from 'next/link';

const CARDS: { href: string; title: string; desc: string; emoji: string }[] = [
  {
    href: '/dashboard/nx04/quote',
    title: '報價單工作台 QT',
    desc: '客戶詢價 / 開報價、含歷史價提示 + 毛利警告 + 採用後失效。',
    emoji: '📜',
  },
  {
    href: '/dashboard/nx04/sales-order',
    title: '銷貨單工作台 SO',
    desc: '拉舊報價 + 補新行混合、雙段狀態、IT-O 同行調貨觸發。',
    emoji: '🧾',
  },
  {
    href: '/dashboard/nx04/sales-return',
    title: '銷退單工作台 SR',
    desc: '驗收流程 + 好品 / 壞品分流（G 入主倉、B 寫異常表）。',
    emoji: '↩️',
  },
  {
    href: '/dashboard/nx04/partner-grade-history',
    title: '客戶等級變更',
    desc: '業務申請 → G 主管核可 → 自動套新毛利、變更歷史完整。',
    emoji: '📈',
  },
  {
    href: '/dashboard/owner/grade-approvals',
    title: '待核可清單（OWNER）',
    desc: '主管 inbox：所有等級變更待核可。核可後立即生效。',
    emoji: '✅',
  },
];

export default function Nx04HubPage() {
  return (
    <div className="w-full min-w-0 space-y-6 p-6">
      <header className="space-y-1">
        <p className="text-xs tracking-[0.35em] text-muted-foreground">NX04 · SALES LITE</p>
        <h1 className="text-2xl font-semibold tracking-tight">銷貨模組首頁</h1>
        <p className="text-sm text-muted-foreground">
          報價 → 銷貨 → 銷退 + 客戶等級變更核可。每個工作台都支援跨單據問題回報（🚨）。
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {CARDS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-lg border p-4 transition hover:border-primary hover:bg-muted/30"
          >
            <div className="text-2xl">{c.emoji}</div>
            <h2 className="mt-2 font-semibold">{c.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
          </Link>
        ))}
      </section>

      <footer className="text-xs text-muted-foreground">
        ⚠️ LITE 版：ID 欄位用純文字輸入（picker 列 FU-sales-lite-11）。
      </footer>
    </div>
  );
}
