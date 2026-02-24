/**
 * File: apps/nx-ui/src/app/dashboard/nx00/parts/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-PARTS-PAGE-001：Parts Split Page Entry（單一路由）
 *
 * Notes:
 * - 新版架構：左列表 + 右表單（Split View）
 * - URL 為單一真實來源（q/page/pageSize/id/mode）
 * - 本檔案只負責掛載 UI，不處理資料與 API（避免 page 變肥）
 */

'use client';

import { PartsSplitView } from '@/features/nx00/parts/ui/PartsSplitView';

export default function Nx00PartsPage() {
  return <PartsSplitView />;
}