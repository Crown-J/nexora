/**
 * File: apps/nx-api/src/nx00/user-role/user-role.module.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-USER-ROLE-MODULE-001：UserRole Module（LITE 統一單數命名）
 *
 * Notes:
 * - 匯入 AuditLogModule 以便 UserRoleService 寫入操作紀錄（ASSIGN/REVOKE/SET_PRIMARY/SET_ACTIVE）
 */

import { Module } from '@nestjs/common';
import { UserRoleController } from './controllers/user-role.controller';
import { UserRoleService } from './services/user-role.service';

import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
    imports: [AuditLogModule],
    controllers: [UserRoleController],
    providers: [UserRoleService],
})
export class UserRoleModule { }