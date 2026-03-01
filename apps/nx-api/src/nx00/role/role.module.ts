/**
 * File: apps/nx-api/src/nx00/role/role.module.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-ROLE-MODULE-001：Role Module
 *
 * Notes:
 * - 匯入 AuditLogModule 以便 RoleService 寫入操作紀錄（CREATE/UPDATE/SET_ACTIVE）
 */

import { Module } from '@nestjs/common';

import { RoleController } from './controllers/role.controller';
import { RoleService } from './services/role.service';

import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
    imports: [AuditLogModule],
    controllers: [RoleController],
    providers: [RoleService],
})
export class RoleModule { }