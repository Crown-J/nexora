// apps/nx-ui/src/features/sys-admin/onboarding/api.ts
import { apiJson } from '@/shared/api/client';

import type { CreateOnboardingPayload, OnboardingResponse } from './types';

export function createOnboarding(payload: CreateOnboardingPayload): Promise<OnboardingResponse> {
  return apiJson('/sys-admin/onboarding/create-tenant', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
