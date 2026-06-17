// apps/nx-ui/src/design/components/page-frame/PageFrame.tsx
// 內容卡片框（對齊 Hana demo .nx-frame）
// - border + radius 14、overflow hidden
// - 半透明卡片背景、玻璃感（背後星空透出）
// 用法:包工具列 + 表格 / 明細區
'use client';

import { type ReactNode } from 'react';

import { cn } from '@design/utils/cn';

export function PageFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex min-h-0 flex-1 flex-col overflow-hidden rounded-[14px] border border-border/40 bg-card/40 backdrop-blur-md',
        className,
      )}
    >
      {children}
    </div>
  );
}
