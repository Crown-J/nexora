// apps/nx-ui/src/features/base/shell/BaseMasterMobileDock.tsx
/**
 * 主檔子頁手機 Bottom Dock（業界改革 #22 v1.2 + #17 手機介面）
 *
 * 對齊既有 MobileSectionTabs（/dashboard/base hub）設計範式：
 * - 手機（< lg）顯示、桌面 lg+ 隱藏
 * - fixed 底部 56px 高 + 安全區補償（pb-safe-area）
 * - 黑底 / amber 主色高亮（對齊 NEXORA dark theme）
 *
 * 與 MobileSectionTabs 差異真相：
 * - MobileSectionTabs：6 section tab、flex-1 平均分布（不滑動）
 * - BaseMasterMobileDock：25 主檔 icon、水平 swipe scroll（數量多）
 *
 * 對齊 Crown 拍板：Bottom Dock + 左右滑動 swipe scroll（業界 iOS / Android Dock 範式）
 */

'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { getMasterHubSections } from '@/features/base/config/master-cards';
import { cn } from '@/lib/utils';

function pathMatchesHub(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (pathname.startsWith(`${href}/`)) return true;
  return false;
}

export function BaseMasterMobileDock() {
  const pathname = usePathname() || '';
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef<HTMLAnchorElement | null>(null);

  const sections = getMasterHubSections();
  const allCards = sections.flatMap((g) => g.cards);

  // 自動滾動把當前主檔 icon 帶到可視中央（業界 SaaS dock 範式）
  useEffect(() => {
    const el = activeRef.current;
    const wrap = scrollRef.current;
    if (!el || !wrap) return;
    const elLeft = el.offsetLeft;
    const elWidth = el.offsetWidth;
    const wrapWidth = wrap.clientWidth;
    const targetLeft = elLeft - wrapWidth / 2 + elWidth / 2;
    wrap.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
  }, [pathname]);

  return (
    <nav
      aria-label="主檔快速切換（手機）"
      className={cn(
        'lg:hidden',
        'fixed bottom-0 left-0 right-0 z-40',
        'h-14 border-t border-white/10 bg-black/95 backdrop-blur',
        'pb-[env(safe-area-inset-bottom)]',
      )}
    >
      <div
        ref={scrollRef}
        className={cn(
          'flex h-full items-stretch overflow-x-auto overflow-y-hidden',
          // 隱藏 scrollbar 但保留 swipe 功能
          '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
        )}
      >
        {allCards.map((card) => {
          const Icon = card.icon;
          const active = pathMatchesHub(pathname, card.href);
          return (
            <Link
              key={card.id}
              ref={active ? activeRef : undefined}
              href={card.href}
              aria-label={card.title}
              aria-current={active ? 'page' : undefined}
              title={card.title}
              className={cn(
                'relative flex min-h-[56px] min-w-[64px] shrink-0 flex-col items-center justify-center px-2',
                'transition-colors',
                active ? 'text-[#E8A020]' : 'text-white/60 hover:text-white/80',
              )}
            >
              <Icon className="h-5 w-5" aria-hidden />
              <span className="mt-1 max-w-[60px] truncate text-[10px] leading-none">
                {card.title}
              </span>
              {active ? (
                <span
                  aria-hidden
                  className="absolute bottom-1 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-[#E8A020]"
                />
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
