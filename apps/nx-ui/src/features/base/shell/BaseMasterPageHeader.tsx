/**
 * File: apps/nx-ui/src/features/base/shell/BaseMasterPageHeader.tsx
 *
 * Purpose:
 * - 主檔子頁共用標題區（返回連結、標題說明、右側主檔捷徑圖示）
 */

'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BaseMasterQuickNav } from '@/features/base/shell/BaseMasterQuickNav';

export type BaseMasterPageHeaderProps = {
  title: string;
  description: string;
};

export function BaseMasterPageHeader({ title, description }: BaseMasterPageHeaderProps) {
  return (
    <header className="space-y-3">
      <Link
        href="/base"
        className={cn(
          'inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors',
          'hover:text-primary',
        )}
      >
        <ChevronLeft className="size-4" aria-hidden />
        返回主檔
      </Link>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xs tracking-[0.35em] text-muted-foreground">MASTER DATA</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">{description}</p>
        </div>
        <div className="shrink-0 lg:pt-1">
          <BaseMasterQuickNav />
        </div>
      </div>
    </header>
  );
}
