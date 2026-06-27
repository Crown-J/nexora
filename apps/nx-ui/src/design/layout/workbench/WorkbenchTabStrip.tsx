// apps/nx-ui/src/design/layout/workbench/WorkbenchTabStrip.tsx
// 傳統 ERP 分頁列：首頁固定釘最前，其後為已開啟功能分頁（可關閉）。
// 作用中分頁 = 目前路由；點分頁切換路由。

'use client';

import { Home, X } from 'lucide-react';
import { HOME_HREF, useWorkbenchTabs } from './WorkbenchTabsContext';

export function WorkbenchTabStrip() {
  const { tabs, activeHref, open, close } = useWorkbenchTabs();
  const homeActive = activeHref === HOME_HREF;

  return (
    <div className="flex items-stretch gap-0.5 overflow-x-auto border-b border-border bg-background px-1.5 pt-1">
      {/* 首頁（固定、不可關） */}
      <button
        type="button"
        onClick={() => open(HOME_HREF, 'tab: 首頁')}
        className={`flex items-center gap-1.5 whitespace-nowrap rounded-t-md border border-b-0 px-3 py-1.5 text-[12.5px] transition ${
          homeActive
            ? 'border-border bg-card font-medium text-foreground'
            : 'border-transparent text-muted-foreground hover:bg-foreground/[0.05]'
        }`}
      >
        <Home className="h-3.5 w-3.5" />
        首頁
      </button>

      {tabs.map((t) => {
        const isActive = t.href === activeHref;
        return (
          <div
            key={t.href}
            className={`group flex items-center gap-1.5 whitespace-nowrap rounded-t-md border border-b-0 px-3 py-1.5 text-[12.5px] transition ${
              isActive
                ? 'border-border bg-card font-medium text-foreground'
                : 'border-transparent text-muted-foreground hover:bg-foreground/[0.05]'
            }`}
          >
            <button type="button" onClick={() => open(t.href, `tab: ${t.label}`)}>
              {t.label}
            </button>
            <button
              type="button"
              title="關閉分頁"
              onClick={(e) => {
                e.stopPropagation();
                close(t.href);
              }}
              className="grid h-4 w-4 place-items-center rounded-sm text-muted-foreground/70 opacity-60 hover:bg-foreground/10 hover:text-foreground group-hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
