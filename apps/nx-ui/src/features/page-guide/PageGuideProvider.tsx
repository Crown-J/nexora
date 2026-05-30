// apps/nx-ui/src/features/page-guide/PageGuideProvider.tsx
// v1.2 對齊軌 D：設定精靈 Provider（管 seenPages 快取）
//
// 用法：DashboardShell 包一次、子頁面用 usePageGuide(pageKey) 自動觸發

'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { getToken } from '@/features/auth/token';
import { getWizardStatus, markPageSeen, resetMyPageGuides } from '@/features/wizard/api';

interface Ctx {
  loading: boolean;
  seenSet: Set<string>;
  /// 標記某頁已看（先樂觀更新、再背景同步）
  markSeen: (pageKey: string) => Promise<void>;
  /// 強制重開（用在 ? 按鈕、移除快取讓下次進該頁再跳）
  reopen: (pageKey: string) => void;
  /// 重置全部設定精靈（v1.2 §12.5）
  resetAll: () => Promise<void>;
}

const PageGuideContext = createContext<Ctx | null>(null);

export function PageGuideProvider({ children }: { children: ReactNode }) {
  const [seenSet, setSeenSet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void (async () => {
      if (!getToken()) {
        if (alive) setLoading(false);
        return;
      }
      try {
        const status = await getWizardStatus();
        if (!alive) return;
        setSeenSet(new Set(status.seenPages.map((p) => p.pageKey)));
      } catch {
        // 401 / 網路錯 → 預設 empty、view 仍會 render 但「每頁第一次跳」就跳
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const markSeen = useCallback(async (pageKey: string) => {
    setSeenSet((prev) => {
      if (prev.has(pageKey)) return prev;
      const next = new Set(prev);
      next.add(pageKey);
      return next;
    });
    try {
      await markPageSeen(pageKey);
    } catch {
      // 失敗也維持樂觀更新（user 已點「我知道了」、不該因網路重複跳）
    }
  }, []);

  const reopen = useCallback((pageKey: string) => {
    setSeenSet((prev) => {
      if (!prev.has(pageKey)) return prev;
      const next = new Set(prev);
      next.delete(pageKey);
      return next;
    });
    // 注意：reopen 不打 API、只清前端快取
    // 用戶下次再點「我知道了」、會重新打 markPageSeen
  }, []);

  const resetAll = useCallback(async () => {
    try {
      await resetMyPageGuides();
      setSeenSet(new Set());
    } catch (e) {
      // throw 讓 UI 顯示錯誤
      throw e;
    }
  }, []);

  return (
    <PageGuideContext.Provider value={{ loading, seenSet, markSeen, reopen, resetAll }}>
      {children}
    </PageGuideContext.Provider>
  );
}

export function usePageGuideContext(): Ctx {
  const ctx = useContext(PageGuideContext);
  if (!ctx) throw new Error('usePageGuideContext must be used within PageGuideProvider');
  return ctx;
}
