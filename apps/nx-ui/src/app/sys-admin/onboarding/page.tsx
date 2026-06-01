// apps/nx-ui/src/app/sys-admin/onboarding/page.tsx
// 平台層 vs 租戶層分離軌 Phase 4：舊路徑 redirect 至 /platform/onboarding
// 保留檔案是為了避免舊書籤 / 外部連結 404；Phase 6 退役時可整支移除。

import { redirect } from 'next/navigation';

export default function LegacySysAdminOnboardingRedirect() {
  redirect('/platform/onboarding');
}
