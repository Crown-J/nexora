// apps/nx-ui/src/features/nx00/context/DashboardBulletinContext.tsx
// 2026-06-25 首頁儀表板「測試資料移除」Phase 1：改接 listBulletins 真實資料
//
// Phase 1 範圍：
//   - bulletins[] 從 listBulletins({ isActive: true }) 拉
//   - isRead 暫一律 false（後端 read tracking 在 /:id/read endpoint、Phase 2 接）
//   - markBulletinRead 改本地 toggle（前端 local read 狀態、未送後端）

'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { listBulletins, type BulletinDto } from '@data/endpoints/nx01/api/bulletin';

/** 首頁公告 view-model（type 維持 BulletinDto 原始 string、HomeTopBar bulletinTypeLabel 容錯 fallback） */
export type DashboardBulletin = BulletinDto & {
  /** 前端 local read 狀態（Phase 2 接後端 POST :id/read） */
  isRead: boolean;
};

export type DashboardBulletinContextValue = {
  bulletins: DashboardBulletin[];
  bulletinOpen: boolean;
  setBulletinOpen: Dispatch<SetStateAction<boolean>>;
  markBulletinRead: (id: string) => void;
};

const DashboardBulletinContext = createContext<DashboardBulletinContextValue | null>(null);

export function DashboardBulletinProvider({ children }: { children: ReactNode }) {
  const [bulletins, setBulletins] = useState<DashboardBulletin[]>([]);
  const [bulletinOpen, setBulletinOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await listBulletins({ isActive: true, pageSize: 50 });
        if (cancelled) return;
        setBulletins(res.items.map((b) => ({ ...b, isRead: false })));
      } catch {
        if (!cancelled) setBulletins([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const markBulletinRead = useCallback((id: string) => {
    setBulletins((prev) => prev.map((b) => (b.id === id ? { ...b, isRead: true } : b)));
  }, []);

  const value = useMemo(
    () => ({
      bulletins,
      bulletinOpen,
      setBulletinOpen,
      markBulletinRead,
    }),
    [bulletins, bulletinOpen, markBulletinRead],
  );

  return (
    <DashboardBulletinContext.Provider value={value}>{children}</DashboardBulletinContext.Provider>
  );
}

export function useDashboardBulletinOptional() {
  return useContext(DashboardBulletinContext);
}
