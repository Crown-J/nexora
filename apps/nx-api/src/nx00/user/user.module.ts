/**
 * File: apps/nx-api/src/nx00/user/user.module.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-USER-MODULE-001：User Module（LITE 統一單數命名）
 *
 * Notes:
 * - 匯入 AuditLogModule 以便 UserService 寫入操作紀錄（CREATE/UPDATE/SET_ACTIVE）
 */

import { Module } from '@nestjs/common';
import { UserController } from './controllers/user.controller';
import { UserService } from './services/user.service';

import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
    imports: [AuditLogModule],
    controllers: [UserController],
    providers: [UserService],
})
export class UserModule { }