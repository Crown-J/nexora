// apps/nx-api/src/shared/guards/platform-admin.guard.ts
// 平台層 vs 租戶層分離軌 Phase 2：平台超管守衛
//
// 用法：@UseGuards(PlatformAdminGuard) 保護平台 endpoint
// 機制：底層 = AuthGuard('platform-jwt')、strategy 內部已驗 scope==='platform'
// 結果：tenant token（即使是 SYSADMIN role）100% 無法進入

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class PlatformAdminGuard extends AuthGuard('platform-jwt') {}
