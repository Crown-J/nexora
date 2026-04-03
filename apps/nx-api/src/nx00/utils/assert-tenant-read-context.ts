/**
 * 使用者／職務主檔 GET：允許「JWT 已有租戶」或「平台 ADMIN（JWT 無租戶）」讀取。
 * 避免 RolesGuard 僅依 DB 職務列判斷時，與登入態不一致導致誤擋 403。
 */
import { ForbiddenException } from '@nestjs/common';

export type JwtUserForRead = {
    tenantId?: string | null;
    roles?: string[];
};

export function assertTenantScopedOrPlatformAdmin(user: JwtUserForRead | undefined): void {
    const tid = user?.tenantId ?? null;
    const roles = user?.roles ?? [];
    if (tid === null && !roles.includes('ADMIN')) {
        throw new ForbiddenException('Missing tenant scope for this resource');
    }
}

/** 使用者職務指派等：須為系統管理員或負責人（依 JWT validate 載入之 roles） */
export function assertAdminOrOwnerManager(user: JwtUserForRead | undefined): void {
    const roles = user?.roles ?? [];
    if (!roles.includes('ADMIN') && !roles.includes('OWNER')) {
        throw new ForbiddenException('需要系統管理員或負責人權限');
    }
}
