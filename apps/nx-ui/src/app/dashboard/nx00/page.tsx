/**
 * File: apps/nx-ui/src/app/dashboard/nx00/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00 基本資料模組根路徑（主檔集中於此；子功能由左側選單進入）
 */

import { ModulePlaceholderPage } from '@/features/layout/ui/ModulePlaceholderPage';

export default function Nx00ModuleRootPage() {
  return (
    <ModulePlaceholderPage
      title="基本資料（NX00）"
      description="主檔資料（使用者、角色、零件、品牌、倉庫／庫位、往來客戶等）請由左側選單進入對應維護畫面。"
      showDevNotice={false}
    />
  );
}
