// apps/nx-ui/src/app/platform/onboarding/page.tsx
// 平台層 vs 租戶層分離軌 Phase 4：平台後台開戶頁
//
// 使用既有 OnboardingFormView（features/sys-admin/onboarding/ui）、底層 API
// 仍打 POST /sys-admin/onboarding/create-tenant（守衛 Phase 3 已換 PlatformAdminGuard）。
// Phase 6 收尾可考慮搬 OnboardingFormView 到 features/platform/onboarding/。

import { OnboardingFormView } from '@/features/sys-admin/onboarding/ui/OnboardingFormView';

export default function PlatformOnboardingPage() {
  return (
    <div className="space-y-4">
      <p className="text-[10px] tracking-[0.3em] uppercase text-zinc-600">Platform / Onboarding</p>
      <div className="bg-zinc-950 border border-zinc-800 text-zinc-100">
        <OnboardingFormView />
      </div>
    </div>
  );
}
