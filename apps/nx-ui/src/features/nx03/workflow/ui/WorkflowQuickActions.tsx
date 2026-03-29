/**
 * File: apps/nx-ui/src/features/nx03/workflow/ui/WorkflowQuickActions.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - 銷售流程頁底部常用功能列（圖示 + 文字；路由由父層 onNavigate 處理）
 *
 * Notes:
 * - Render-only；點擊僅呼叫 onNavigate(path)
 */

'use client';

import { ClipboardList, Clock, Download, Package, Search } from 'lucide-react';
import { cx } from '@/shared/lib/cx';

export interface WorkflowQuickActionsProps {
  onNavigate: (path: string) => void;
}

const ITEMS: Array<{ key: string; label: string; path: string; Icon: typeof Search }> = [
  { key: 'partner', label: '客戶/供應商', path: '/base/partner', Icon: Search },
  { key: 'part', label: '料號查詢', path: '/base/part', Icon: Package },
  { key: 'import', label: '批次匯入', path: '/dashboard/nx03/import', Icon: ClipboardList },
  { key: 'export', label: '報表匯出', path: '/dashboard/nx03/reports', Icon: Download },
  { key: 'history', label: '歷史紀錄', path: '/dashboard/nx03/history', Icon: Clock },
];

/**
 * @FUNCTION_CODE NX03-WKFL-UI-004-F01
 * 固定五項常用功能，橫向排列（可換行）；點擊觸發 onNavigate。
 */
export function WorkflowQuickActions({ onNavigate }: WorkflowQuickActionsProps) {
  return (
    <footer className="border-t border-border/60 pt-5">
      <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        常用功能
      </p>
      <nav className="flex flex-wrap gap-x-6 gap-y-3" aria-label="銷售常用功能">
        {ITEMS.map(({ key, label, path, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => onNavigate(path)}
            className={cx(
              'inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors',
              'hover:text-amber-200/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
            )}
          >
            <Icon className="h-4 w-4 shrink-0 text-amber-500/90" aria-hidden />
            {label}
          </button>
        ))}
      </nav>
    </footer>
  );
}
