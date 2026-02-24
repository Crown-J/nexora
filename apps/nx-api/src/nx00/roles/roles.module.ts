/**
 * File: apps/nx-api/src/nx00/roles/roles.module.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-ROLES-MODULE-001：Roles Module
 */

import { Module } from '@nestjs/common';
import { RolesController } from './controllers/roles.controller';
import { RolesService } from './services/roles.service';

@Module({
    controllers: [RolesController],
    providers: [RolesService],
})
export class RolesModule { }