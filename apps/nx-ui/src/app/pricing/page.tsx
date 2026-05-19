// apps/nx-ui/src/app/pricing/page.tsx
/**
 * NEXORA GRID 方案對比頁（業界改革 #22 v1.1 Upgrade 流程載體）
 *
 * 路由：/pricing
 * 觸發：UpgradePromptDialog「了解升級方案」button navigate
 * 階段：封測一階純展示、不串金流（後續軌 TASK-NX99-PLAN-CHECKOUT 才接 Stripe / 綠界）
 *
 * 對齊：
 * - docs/_team/task-master-hub-polish-feasibility.md §6.3
 * - 業界 SaaS pricing 範式（Stripe / Notion / Linear / Salesforce）
 */

import Link from 'next/link';
import { Check, Sparkles, ArrowLeft } from 'lucide-react';

type PlanTier = {
  id: 'LITE' | 'PLUS' | 'PRO';
  name: string;
  tagline: string;
  highlighted: boolean;
  /** 業務 muscle memory：封測階段顯示「聯繫業務」、不顯示具體價格 */
  priceLabel: string;
  features: string[];
  ctaLabel: string;
};

const PLAN_TIERS: PlanTier[] = [
  {
    id: 'LITE',
    name: 'NEXORA LITE',
    tagline: '基礎版：核心主檔 + 採購銷售流程',
    highlighted: false,
    priceLabel: '基礎方案',
    features: [
      '15 個核心主檔（使用者／職務／零件／廠牌／倉庫等）',
      '採購銷售訂單流程',
      '基礎庫存管理',
      '單據列印與匯出',
      '上限 5 個使用者帳號',
      '一般技術支援',
    ],
    ctaLabel: '聯繫業務',
  },
  {
    id: 'PLUS',
    name: 'NEXORA PLUS',
    tagline: '進階版：車型字典 + 零件關聯 + 客戶分級',
    highlighted: true,
    priceLabel: '推薦方案',
    features: [
      '解鎖 9 項 PLUS 主檔（含車型字典 5 項）',
      '零件關聯與料件車型適配',
      '品牌料號規則自動驗證',
      '客戶等級分群與差異化定價',
      '上限 20 個使用者帳號',
      '優先技術支援',
      '含 LITE 全功能',
    ],
    ctaLabel: '聯繫業務',
  },
  {
    id: 'PRO',
    name: 'NEXORA PRO',
    tagline: '專業版：注音快搜 + 進階報表',
    highlighted: false,
    priceLabel: '專業方案',
    features: [
      '注音字典快速搜尋（F4 櫃台效率工具）',
      '進階報表與資料分析',
      'API 整合（後續軌、預估 v1.6）',
      '無使用者帳號上限',
      '專屬技術窗口',
      '含 PLUS 全功能',
    ],
    ctaLabel: '聯繫業務',
  },
];

function PlanCard({ tier }: { tier: PlanTier }) {
  return (
    <div
      className={
        'relative flex flex-col rounded-2xl border bg-card/60 p-6 backdrop-blur-md transition-all duration-300 ' +
        (tier.highlighted
          ? 'border-[#E8A020]/60 shadow-[0_20px_60px_-20px_rgba(232,160,32,0.45)]'
          : 'border-border/50 hover:border-border/70')
      }
    >
      {tier.highlighted ? (
        <div className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full border border-[#E8A020]/50 bg-[#E8A020]/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#E8A020]">
          <Sparkles className="h-3 w-3" aria-hidden />
          推薦
        </div>
      ) : null}

      <div className="space-y-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          {tier.id}
        </p>
        <h3 className="text-xl font-bold tracking-tight text-foreground">{tier.name}</h3>
        <p className="text-xs text-muted-foreground">{tier.tagline}</p>
      </div>

      <div className="mt-6 mb-6 border-y border-border/40 py-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{tier.priceLabel}</p>
        <p className="mt-1 text-sm text-foreground/80">封測階段、依規模議價</p>
      </div>

      <ul className="flex-1 space-y-2.5">
        {tier.features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm text-foreground/90">
            <Check
              className={
                'mt-0.5 h-4 w-4 shrink-0 ' +
                (tier.highlighted ? 'text-[#E8A020]' : 'text-muted-foreground')
              }
              aria-hidden
            />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <a
        href="mailto:sales@nexora.example.com?subject=NEXORA GRID 方案諮詢"
        className={
          'mt-6 inline-flex h-11 items-center justify-center rounded-lg text-sm font-medium tracking-wide transition-colors ' +
          (tier.highlighted
            ? 'bg-[#E8A020] text-background hover:bg-[#E8A020]/90'
            : 'border border-border bg-secondary/40 text-foreground hover:bg-secondary/60')
        }
      >
        {tier.ctaLabel}
      </a>
    </div>
  );
}

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-background py-12 lg:py-20">
      <div className="mx-auto w-full max-w-6xl px-4 lg:px-8">
        <div className="mb-10">
          <Link
            href="/dashboard/base"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            返回主檔中心
          </Link>
        </div>

        <header className="mb-12 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-[#E8A020]">
            NEXORA GRID
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground lg:text-4xl">
            選擇適合您的方案
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-sm text-muted-foreground lg:text-base">
            汽車零件零售 ERP 三階段方案、隨業務成長靈活升級。封測階段不串第三方金流、由業務窗口協助開通。
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
          {PLAN_TIERS.map((tier) => (
            <PlanCard key={tier.id} tier={tier} />
          ))}
        </div>

        <section className="mt-16 rounded-xl border border-border/40 bg-card/30 p-6 text-center backdrop-blur-md lg:p-8">
          <h2 className="text-lg font-semibold text-foreground">需要客製化方案？</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            企業級需求、多租戶整合、或 API 整合等客製化內容，請聯繫業務窗口。
          </p>
          <a
            href="mailto:sales@nexora.example.com?subject=NEXORA GRID 客製化方案諮詢"
            className="mt-4 inline-flex h-10 items-center justify-center rounded-lg border border-border bg-secondary/40 px-5 text-sm font-medium text-foreground transition-colors hover:bg-secondary/60"
          >
            聯繫業務窗口
          </a>
        </section>
      </div>
    </main>
  );
}
