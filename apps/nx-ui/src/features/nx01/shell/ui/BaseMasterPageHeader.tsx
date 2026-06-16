/**
 * File: apps/nx-ui/src/features/base/shell/BaseMasterPageHeader.tsx
 *
 * Purpose:
 * - 主檔子頁共用標題區（簡化版、業界改革 #26 v1）
 *
 * 業界改革 #26 v1 / Crown 拍板簡化：
 * - 移除「返回主檔」連結（NavPlanetMenu contextual 取代 navigation）
 * - 移除「MASTER DATA」副標（業界 SaaS 簡潔範式）
 * - 加 actions slot：標題與 toolbar 同列（節省垂直空間）
 * - 手機 dock：retire（NavPlanetMenu 已含 contextual 25 主檔、避免重複入口）
 */

'use client';

import type { ReactNode } from 'react';

export type BaseMasterPageHeaderProps = {
  title: string;
  /** 省略時不顯示說明段落 */
  description?: string;
  /** 業界改革 #26 v1：頁面 toolbar actions（與標題同列、節省垂直空間）*/
  actions?: ReactNode;
};

export function BaseMasterPageHeader({ title, description, actions }: BaseMasterPageHeaderProps) {
  return (
    <header className="flex min-w-0 flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
      <div className="min-w-0 flex-1 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description ? (
          <p className="text-sm text-muted-foreground max-w-2xl">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-2 lg:justify-end">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
