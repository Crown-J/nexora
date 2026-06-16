// apps/nx-ui/src/shared/ui/NexoraBottomDock.tsx
/**
 * NEXORA 統一手機 Bottom Dock（業界改革 #22 v1.2 + #17 手機介面 = NEXORA 亮點）
 *
 * Crown 拍板統一範式（圖二 hub 為標準）：
 * - 固定 6 slot 視覺基準
 * - icon-only（無文字 label、aria-label / title 提供無障礙）
 * - items.length <= 6：flex-1 均分（無滑動）
 * - items.length > 6：overflow-x-auto + 每 item 寬 = calc(100vw / 6)（固定 6 visible、swipe scroll）
 * - active：text-[#E8A020] + 底部小橫槓
 * - fixed bottom-0 / 56px 高 / safe-area / bg-black/95 backdrop-blur / lg:hidden
 *
 * 統一替換目標（commit 11 refactor）：
 * - features/base/ui/MobileSectionTabs（hub 6 section）
 * - features/base/shell/BaseMasterMobileDock（主檔 25）
 * - components/home/dock.tsx 兩個 mobile 分支（首頁 5/6 + 跨模組 7）
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@design/utils/cn';

export type DockItem = {
  id: string;
  icon: LucideIcon;
  /** 無文字 label（aria-label + title 用、無障礙）*/
  label: string;
  /** 與 onClick 擇一 */
  href?: string;
  /** 與 href 擇一 */
  onClick?: () => void;
  /** 當前激活（amber 高亮 + 底部橫槓）*/
  active?: boolean;
};

export type NexoraBottomDockProps = {
  items: DockItem[];
  /** 整 dock 的 aria-label（如「主檔快速切換」） */
  ariaLabel?: string;
  className?: string;
};

/**
 * 統一手機 Bottom Dock 元件。
 * - <= 6 items：flex-1 平均分布
 * - > 6 items：水平 swipe scroll、激活 item 自動 scroll 至中央
 */
export function NexoraBottomDock({
  items,
  ariaLabel = 'NEXORA 底部導覽',
  className,
}: NexoraBottomDockProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef<HTMLAnchorElement | HTMLButtonElement | null>(null);
  const isSwipe = items.length > 6;

  // React Portal 把 dock 渲染到 document.body 末端、徹底脫離 ancestor 影響、永遠相對 viewport。
  // 避免 ancestor 鏈中 backdrop-filter / transform / filter 等屬性將 fixed containing block
  // 從 viewport 改為該 ancestor（CSS spec 行為、導致 dock 沒貼底）。
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // > 6 items：當前激活 item 自動 scroll 至可視中央（業界 SaaS 範式）
  useEffect(() => {
    if (!isSwipe) return;
    const el = activeRef.current;
    const wrap = scrollRef.current;
    if (!el || !wrap) return;
    const elLeft = el.offsetLeft;
    const elWidth = el.offsetWidth;
    const wrapWidth = wrap.clientWidth;
    const targetLeft = elLeft - wrapWidth / 2 + elWidth / 2;
    wrap.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
  }, [isSwipe, items]);

  const dockContent = (
    <nav
      aria-label={ariaLabel}
      className={cn(
        'lg:hidden',
        'fixed bottom-0 left-0 right-0 z-40',
        'h-14 border-t border-white/10 bg-black/95 backdrop-blur',
        'pb-[env(safe-area-inset-bottom)]',
        className,
      )}
    >
      <div
        ref={scrollRef}
        className={cn(
          'flex h-full items-stretch',
          isSwipe
            ? cn(
                'overflow-x-auto overflow-y-hidden',
                '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
              )
            : 'overflow-hidden',
        )}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const slotClass = cn(
            'relative flex min-h-[56px] flex-col items-center justify-center transition-colors',
            // 業界改革 #22 v1.2：固定 visible 6 完整、超過用 swipe
            isSwipe ? 'w-[calc(100vw/6)] shrink-0' : 'min-w-[44px] flex-1',
            item.active ? 'text-[#E8A020]' : 'text-white/60 hover:text-white/80',
          );
          const indicator = item.active ? (
            <span
              aria-hidden
              className="absolute bottom-1 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-[#E8A020]"
            />
          ) : null;

          if (item.href) {
            return (
              <Link
                key={item.id}
                ref={item.active && isSwipe ? (activeRef as React.RefObject<HTMLAnchorElement>) : undefined}
                href={item.href}
                aria-label={item.label}
                aria-current={item.active ? 'page' : undefined}
                title={item.label}
                className={slotClass}
              >
                <Icon className="h-6 w-6" aria-hidden />
                {indicator}
              </Link>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              ref={item.active && isSwipe ? (activeRef as React.RefObject<HTMLButtonElement>) : undefined}
              onClick={item.onClick}
              aria-label={item.label}
              aria-current={item.active ? 'page' : undefined}
              title={item.label}
              className={slotClass}
            >
              <Icon className="h-6 w-6" aria-hidden />
              {indicator}
            </button>
          );
        })}
      </div>
    </nav>
  );

  // SSR：useEffect 尚未 mount、不渲染（避免 hydration mismatch）
  // CSR：portal 到 document.body 末端、徹底脫離 ancestor backdrop-filter / transform 影響
  if (!mounted) return null;
  return createPortal(dockContent, document.body);
}
