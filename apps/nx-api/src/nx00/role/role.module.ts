/**
 * File: apps/nx-api/src/nx00/role/role.module.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-ROLE-MODULE-001：Role Module（LITE 統一單數命名）
 *
 * Notes:
 * - 以 roles 為範本重構
 * - 舊版 roles 保留僅供參考
 */

import { Module } from '@nestjs/common';
import { RoleController } from './controllers/role.controller';
import { RoleService } from './services/role.service';

@Module({
    controllers: [RoleController],
    providers: [RoleService],
})
export class RoleModule { }