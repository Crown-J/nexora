import { SetMetadata } from '@nestjs/common';

import type { Nx00ViewAction } from './nx00-view-action';

export const NX00_VIEW_PERMISSION_KEY = 'nx00ViewPermission' as const;

export type Nx00ViewPermissionMeta = { viewCode: string; action: Nx00ViewAction };

export function RequireNx00ViewPermission(viewCode: string, action: Nx00ViewAction) {
    return SetMetadata(NX00_VIEW_PERMISSION_KEY, { viewCode, action } satisfies Nx00ViewPermissionMeta);
}
