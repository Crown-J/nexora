// apps/nx-ui/src/app/lab/users/page.tsx
// v1.2 階段 E P6 closure：lab/users 沿用 zoned 範式（與 dashboard/base/users 共用 UserZonedPage）
'use client';

import { UserZonedPage } from '@/features/user-zoned';

export default function LabUsersPage() {
  return (
    <UserZonedPage
      pageCategory="Lab"
      pageTitle="使用者基本資料（sandbox）"
      entityNoun="使用者"
    />
  );
}
