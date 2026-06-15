/**
 * @FUNCTION_CODE NX99-LAYOUT-UI-CENTER-HUB-001-F01
 * 各業務「中心」首頁共用：下拉選單式流程卡（與採購中心 PurchaseMenuCard 對齊）
 */

'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@design/primitives/dropdown-menu';
import { hubCardShellBaseClass } from '@design/utils/hubCardDimensions';
import { cn } from '@/lib/utils';

export type HubFlowSubLink = { label: string; href: string };

export type CenterHubFlowCardProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  subItems: HubFlowSubLink[];
  /** 右下角數字徽章（例如待辦數、總筆數） */
  footerBadge: string;
  stepLabel?: string;
  /** 主題色（邊框 hover、徽章文字）；預設與採購中心橘金一致 */
  accentHex?: string;
};

const DEFAULT_ACCENT = '#E8A020';

export function CenterHubGroupHeading({ id, title }: { id: string; title: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border/70 pb-2">
      <h2 id={id} className="text-sm font-semibold tracking-wide text-foreground">
        {title}
      </h2>
    </div>
  );
}

export function CenterHubCardWrap({ children }: { children: ReactNode }) {
  return <div className="flex w-[220px] shrink-0 justify-center">{children}</div>;
}

export function CenterHubFlowCard({
  title,
  description,
  icon: Icon,
  subItems,
  footerBadge,
  stepLabel,
  accentHex = DEFAULT_ACCENT,
}: CenterHubFlowCardProps) {
  const stepBg = accentHex;
  const CARD_BASE = cn(
    hubCardShellBaseClass,
    'relative flex flex-col transition-all duration-300 ease-out',
    'hover:-translate-y-0.5 hover:scale-[1.01] hover:brightness-[1.03]',
    'hover:border-[#E8A020]/55 hover:shadow-[0_0_24px_rgba(232,160,32,0.22),0_12px_40px_rgba(0,0,0,0.28)]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'data-[state=open]:border-[#E8A020]/50 data-[state=open]:shadow-md',
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={CARD_BASE}>
          {stepLabel ? (
            <span
              className="pointer-events-none absolute right-2 top-2 rounded-md px-1.5 py-0.5 text-[10px] font-bold leading-none text-neutral-950"
              style={{ backgroundColor: stepBg }}
              aria-hidden
            >
              {stepLabel}
            </span>
          ) : null}
          <div
            className={cn(
              'flex shrink-0 items-start justify-between gap-2',
              stepLabel ? 'pr-[3.25rem]' : 'pr-8',
            )}
          >
            <div
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/80',
                'bg-secondary/50 text-primary',
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
            </div>
          </div>
          <div className="mt-1.5 min-h-0 flex-1 space-y-0.5 pr-11">
            <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-foreground">{title}</h3>
            <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">{description}</p>
          </div>
          <span
            className={cn(
              'pointer-events-none absolute bottom-3 right-3 rounded-full border px-2 py-0.5 text-[11px] font-semibold tabular-nums',
            )}
            style={{
              color: accentHex,
              borderColor: `${accentHex}73`,
              backgroundColor: `${accentHex}1f`,
            }}
          >
            {footerBadge}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" sideOffset={8} className="glass-card w-60 border-border/80 p-1 shadow-lg">
        <DropdownMenuSeparator className="my-1 bg-border/50" />
        {subItems.map((item) => (
          <DropdownMenuItem key={item.label} asChild className="cursor-pointer">
            <Link href={item.href}>{item.label}</Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="my-1 bg-border/50" />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
