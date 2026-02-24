/**
 * File: apps/nx-api/src/nx00/permissions/permissions.module.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-PERMISSIONS-MOD-001：Permissions Module
 */

import { Module } from '@nestjs/common';
import { PermissionsController } from './controllers/permissions.controller';
import { PermissionsService } from './services/permissions.service';

@Module({
    controllers: [PermissionsController],
    providers: [PermissionsService],
    exports: [PermissionsService],
})
export class PermissionsModule { }