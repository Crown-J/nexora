/**
 * @FUNCTION_CODE NX99-SYS-DASH-CTX-001-F01
 * 首頁 Mock 公告狀態：供 HomeTopBar 與內容區共用（避免頂欄與子頁 props 鑽孔）
 */

'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { mockBulletins, type MockBulletin } from '@/mocks/dashboard';

export type DashboardBulletinContextValue = {
  bulletins: MockBulletin[];
  bulletinOpen: boolean;
  setBulletinOpen: Dispatch<SetStateAction<boolean>>;
  markBulletinRead: (id: number) => void;
};

const DashboardBulletinContext = createContext<DashboardBulletinContextValue | null>(null);

export function DashboardBulletinProvider({ children }: { children: ReactNode }) {
  const [bulletins, setBulletins] = useState<MockBulletin[]>(() =>
    mockBulletins.map((b) => ({ ...b })),
  );
  const [bulletinOpen, setBulletinOpen] = useState(false);

  const markBulletinRead = useCallback((id: number) => {
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
