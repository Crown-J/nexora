/**
 * File: apps/nx-api/src/nx00/role-view/role-view.module.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-ROLE-VIEW-MODULE-001：RoleView Module（LITE 統一單數命名）
 */

import { Module } from '@nestjs/common';
import { RoleViewController } from './controllers/role-view.controller';
import { RoleViewService } from './services/role-view.service';

@Module({
    controllers: [RoleViewController],
    providers: [RoleViewService],
})
export class RoleViewModule { }