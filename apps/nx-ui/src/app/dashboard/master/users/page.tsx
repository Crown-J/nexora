// apps/nx-ui/src/app/dashboard/master/users/page.tsx
// v1.2 階段 E P6 closure：使用者主檔走 zoned 範式（4 zone）
// 對齊總經理 STOP-1 拍板 A：新版補完 5 客戶自助功能（建帳號 / 指派角色 / 指派倉庫 / 撤銷 / 主要切換）+ 清 admin UI 後、砍舊版
'use client';

import { UserZonedPage } from '@/features/nx01/org/user-zoned';

export default function BaseUsersPage() {
  return (
    <UserZonedPage
      pageCategory="組織架構"
      pageTitle="使用者基本資料"
      entityNoun="使用者"
      // 主檔中心：無 editableZones、全 4 zone（basic 完整可編、permission 含 RBAC 連動、security/hr placeholder）
    />
  );
}
