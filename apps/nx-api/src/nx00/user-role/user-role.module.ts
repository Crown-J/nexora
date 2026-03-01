/**
 * File: apps/nx-api/src/nx00/user-role/user-role.module.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-USER-ROLE-MODULE-001：UserRole Module（LITE 統一單數命名）
 */

import { Module } from '@nestjs/common';
import { UserRoleController } from './controllers/user-role.controller';
import { UserRoleService } from './services/user-role.service';

@Module({
    controllers: [UserRoleController],
    providers: [UserRoleService],
})
export class UserRoleModule { }