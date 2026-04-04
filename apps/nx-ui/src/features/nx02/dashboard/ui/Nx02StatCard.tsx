/**
 * File: apps/nx-ui/src/features/nx02/dashboard/ui/Nx02StatCard.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-DSH-UI-001：庫存首頁統計卡片（玻璃風格）
 *
 * Notes:
 * - @FUNCTION_CODE NX02-DSH-UI-001-F01
 */

'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';

import { cx } from '@/shared/lib/cx';

export type Nx02StatCardProps = {
  title: string;
  description: string;
  children: ReactNode;
  href?: string;
};

/**
 * @FUNCTION_CODE NX02-DSH-UI-001-F01
 */
export function Nx02StatCard({ title, description, children, href }: Nx02StatCardProps) {
  const inner = (
    <>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{description}</p>
      <div className="mt-4 border-t border-border/60 pt-4 text-sm">{children}</div>
    </>
  );

  const cls = cx(
    'group block rounded-2xl border border-border/80 p-5 shadow-sm transition-all duration-300',
    'bg-card/50 backdrop-blur-sm hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg',
  );

  if (href) {
    return (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    );
  }

  return <div className={cls}>{inner}</div>;
}
