// apps/nx-ui/src/features/sys-dashboard/ui/SysDashboardPage.tsx
// 首頁儀表板殼 — MasterTopBar + HomeDashboardV2
//
// 段 F closure（commit）：清掉 v0 mock body（Pro/Lite 兩套）、CalendarCard/EventBookCard/TaskListCard 不再引用、
// 改完全交給 HomeDashboardV2（上方 5 設定數據格 + 下方 任務/行事曆/事件簿 三欄 + 公告彈窗 + 任務 icon）

'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { HomeDashboardV2 } from '@/features/home-dashboard/HomeDashboardV2';
import { MasterTopBar } from '@/features/master-shell/entity-master/MasterTopBar';

export function SysDashboardPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const isTypingContext = (t: EventTarget | null) => {
      if (!t || !(t instanceof HTMLElement)) return false;
      if (t.isContentEditable) return true;
      const tag = t.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTypingContext(e.target)) return;
      if (e.key === '/' && pathname === '/dashboard') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pathname, router]);

  return (
    <div
      className="flex h-dvh flex-col text-[#E8E8EB]"
      style={{
        backgroundImage:
          'radial-gradient(ellipse at top, #11111A 0%, #0A0A0C 35%, #06060A 100%)',
      }}
    >
      <MasterTopBar
        category="首頁"
        title="個人儀表板"
        count=""
        requestNavigate={(href) => router.push(href)}
      />

      <input
        ref={searchRef}
        type="search"
        tabIndex={-1}
        className="sr-only"
        aria-label="全域搜尋"
        placeholder="搜尋…"
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <HomeDashboardV2 />
      </div>
    </div>
  );
}
