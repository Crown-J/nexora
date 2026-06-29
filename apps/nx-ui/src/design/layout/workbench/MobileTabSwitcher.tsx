// apps/nx-ui/src/design/layout/workbench/MobileTabSwitcher.tsx
// 手機版 L2：已開啟分頁切換器（底部 sheet）。取代桌面常駐分頁列。
'use client';

import { Home, X } from 'lucide-react';
import { HOME_HREF, useWorkbenchTabs } from './WorkbenchTabsContext';

export function MobileTabSwitcher({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { tabs, activeHref, open: openTab, close } = useWorkbenchTabs();
  if (!open) return null;
  const homeActive = activeHref === HOME_HREF;

  const go = (href: string, label: string) => {
    openTab(href, `tab: ${label}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] md:hidden">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 flex max-h-[72vh] flex-col rounded-t-2xl bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-bold text-foreground">已開啟分頁（{tabs.length + 1}）</span>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent/15"
            aria-label="關閉"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          <button
            type="button"
            onClick={() => go(HOME_HREF, '首頁')}
            className={`mb-1 flex w-full items-center gap-2 rounded-lg border px-3 py-3 text-left text-[14px] ${
              homeActive ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border/50 text-foreground hover:bg-accent/10'
            }`}
          >
            <Home className="h-4 w-4" />
            首頁
          </button>
          {tabs.map((t) => {
            const active = t.href === activeHref;
            return (
              <div
                key={t.href}
                className={`mb-1 flex items-center gap-2 rounded-lg border px-3 py-3 text-[14px] ${
                  active ? 'border-primary/50 bg-primary/10' : 'border-border/50 hover:bg-accent/10'
                }`}
              >
                <button
                  type="button"
                  onClick={() => go(t.href, t.label)}
                  className={`min-w-0 flex-1 truncate text-left ${active ? 'font-medium text-primary' : 'text-foreground'}`}
                >
                  {t.label}
                </button>
                <button
                  type="button"
                  onClick={() => close(t.href)}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                  aria-label="關閉分頁"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
