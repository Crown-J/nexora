/**
 * File: apps/nx-ui/src/app/dashboard/base/page.tsx
 *
 * Purpose:
 * - 主檔中心首頁（路由 v2：`/dashboard/base`）
 * - Hub 卡片統一尺寸（一卡一概念、業界改革 #22 v1.1 拆 dual entries 後永遠 single-href）
 * - 鎖定卡 grey-out + Upgrade prompt（業界改革 #22 三版本可見性）
 */

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Lock } from 'lucide-react';
import {
  canAccessMasterCard,
  getMasterHubSections,
  normalizePlanCode,
} from '@/features/base/config/master-cards';
import type {
  MasterHubCard,
  MasterHubMinPlan,
  MasterHubSectionGroup,
  MasterHubSectionId,
} from '@/features/base/config/master-cards';
import { MobileSectionTabs } from '@/features/base/ui/MobileSectionTabs';
import { VersionBadge } from '@/features/base/ui/VersionBadge';
import { UpgradePromptDialog } from '@/features/base/ui/UpgradePromptDialog';
import { useSessionMe } from '@/features/auth/hooks/useSessionMe';
import { hubCardShellBaseClass } from '@/shared/lib/hubCardDimensions';
import { cn } from '@/lib/utils';

/** 手機下填滿 grid cell（w-full）、桌面下回歸原固定 220px 卡寬 */
const responsiveCardWidth = '!w-full lg:!w-[220px]';

/** 鎖定卡共用 grey-out 樣式（saturate + opacity、cursor 提示可點） */
const lockedShellClass = 'cursor-pointer opacity-60 saturate-[0.3] hover:opacity-70 hover:saturate-[0.5]';

function renderHubCard(
  card: MasterHubCard,
  shellMotion: string,
  locked: boolean,
  onLockedClick: (card: MasterHubCard) => void,
) {
  const Icon = card.icon;

  const innerBody = (
    <>
      <div className="flex shrink-0 items-start justify-between gap-2">
        <div
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/80',
            'bg-secondary/50 text-primary',
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <VersionBadge plan={card.minPlan} />
          {locked ? (
            <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" aria-hidden />
          ) : (
            <ChevronRight
              className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-100"
              aria-hidden
            />
          )}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-1 pt-1.5">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{card.title}</h3>
        <p
          className="truncate text-[11px] leading-snug text-muted-foreground"
          title={card.description}
        >
          {card.description}
        </p>
      </div>
    </>
  );

  if (locked) {
    return (
      <button
        key={card.id}
        type="button"
        onClick={() => onLockedClick(card)}
        className={cn(
          hubCardShellBaseClass,
          'group flex flex-col text-left',
          responsiveCardWidth,
          shellMotion,
          lockedShellClass,
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        )}
        aria-label={`${card.title}，需 ${card.minPlan} 版`}
      >
        {innerBody}
      </button>
    );
  }

  return (
    <Link
      key={card.id}
      href={card.href}
      className={cn(
        hubCardShellBaseClass,
        'group flex flex-col',
        responsiveCardWidth,
        shellMotion,
        'active:scale-[0.998]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      )}
    >
      {innerBody}
    </Link>
  );
}

function HubSectionHeader({
  group,
  lockedCount,
}: {
  group: MasterHubSectionGroup;
  lockedCount: number;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border/70 pb-2">
      <h2 className="text-sm font-semibold tracking-wide text-foreground">{group.title}</h2>
      <span className="text-[11px] text-muted-foreground tabular-nums">
        {group.cards.length} 項
        {lockedCount > 0 ? (
          <span className="ml-1 text-[#E8A020]/80">／ {lockedCount} 鎖</span>
        ) : null}
      </span>
    </div>
  );
}

export default function BaseDashboardPage() {
  const shellMotion = cn(
    'transition-all duration-300 ease-out',
    'hover:-translate-y-0.5 hover:scale-[1.01] hover:border-primary/35 hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)]',
  );

  const allSections = useMemo(() => getMasterHubSections(), []);
  const [activeMobileSection, setActiveMobileSection] = useState<MasterHubSectionId>('account');
  const mobileSection =
    allSections.find((g) => g.id === activeMobileSection) ?? allSections[0];

  // ── 三版本可見性策略（業界改革 #22）──────────────────────────────
  // - planCode 由 useSessionMe 揭露（已合併 plan_code / planCode、JWT claim）
  // - normalizePlanCode：'NEXORA-PLUS' / 'plus' / null 一律收斂為 LITE/PLUS/PRO
  // - 未登入 / loading 期間視同 LITE（保守、避免閃現高版本內容）
  const { planCode } = useSessionMe();
  const userPlan: MasterHubMinPlan = useMemo(() => normalizePlanCode(planCode), [planCode]);

  // Upgrade prompt：被點擊的鎖定卡（null = Dialog 關閉）
  const [lockedCard, setLockedCard] = useState<MasterHubCard | null>(null);
  const handleLockedClick = (card: MasterHubCard) => setLockedCard(card);
  const handleDialogClose = () => setLockedCard(null);

  const isCardLocked = (card: MasterHubCard) => !canAccessMasterCard(userPlan, card.minPlan);
  const countLocked = (cards: MasterHubCard[]) => cards.filter(isCardLocked).length;

  return (
    <>
      <div className="w-full min-w-0 space-y-6 pb-16 lg:pb-0">
        <header className="space-y-1">
          <p className="text-xs tracking-[0.35em] text-muted-foreground">MASTER DATA</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">主檔中心</h1>
        </header>

        {/* 桌面：所有 section 同時顯示、卡片固定 220px + flex-wrap（R2 前視覺不變）*/}
        <div className="hidden space-y-10 lg:block">
          {allSections.map((group) => (
            <section key={group.id} className="space-y-4" aria-label={group.title}>
              <HubSectionHeader group={group} lockedCount={countLocked(group.cards)} />
              <div className="flex flex-wrap justify-start gap-6">
                {group.cards.map((card) =>
                  renderHubCard(card, shellMotion, isCardLocked(card), handleLockedClick),
                )}
              </div>
            </section>
          ))}
        </div>

        {/* 手機：只顯示當前 Tab 對應 section，卡片 w-full + grid 響應式欄數 */}
        <div className="space-y-4 lg:hidden">
          {mobileSection ? (
            <section key={mobileSection.id} className="space-y-4" aria-label={mobileSection.title}>
              <HubSectionHeader group={mobileSection} lockedCount={countLocked(mobileSection.cards)} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {mobileSection.cards.map((card) =>
                  renderHubCard(card, shellMotion, isCardLocked(card), handleLockedClick),
                )}
              </div>
            </section>
          ) : null}
        </div>
      </div>

      <MobileSectionTabs
        activeSection={activeMobileSection}
        onSectionChange={setActiveMobileSection}
      />

      <UpgradePromptDialog card={lockedCard} userPlan={userPlan} onClose={handleDialogClose} />
    </>
  );
}
