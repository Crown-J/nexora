// apps/nx-ui/src/app/dashboard/base/users/zoned/page.tsx
// v1.2 階段 E P4：user 主檔中心（分區編輯 zoned 範式 demo）
// 對齊 v1.1 §2.3 + §4.6：4 zone basic / permission / security / hr(PRO)
// 既有 /dashboard/base/users（UserMasterPage 1725 行含 RBAC 連動）保留、
// closure STOP-1 由總經理裁定範式統一
'use client';

import { UserZonedPage } from '@/features/user-zoned';

export default function Page() {
  return (
    <UserZonedPage
      pageCategory="組織架構"
      pageTitle="使用者基本資料（分區版）"
      entityNoun="使用者"
    />
  );
}
