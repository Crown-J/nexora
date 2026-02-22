/**
 * File: apps/nx-api/src/nx00/nx00.module.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-002：NX00 Module 聚合（Lookups / Parts / Users / RBAC）
 *
 * Notes:
 * - Nx00Module 本身不再直接掛 controllers/providers
 * - 改以 imports 匯入各子模組，維護更一致
 */

import { Module } from '@nestjs/common';

import { UsersModule } from './users/users.module';
import { RbacModule } from './rbac/rbac.module';

import { Nx00PartsController } from './parts/parts.controller';
import { Nx00PartsService } from './parts/parts.service';
import { Nx00LookupsController } from './lookups/lookups.controller';
import { Nx00LookupsService } from './lookups/lookups.service';

@Module({
  imports: [
    UsersModule, // ✅ 你本來就有 users.module.ts（現在集中由 nx00.module 統一掛載）
    RbacModule,      // ✅ 新增 RBAC 管理 API
  ],
  controllers: [
    Nx00PartsController,
    Nx00LookupsController,
  ],
  providers: [
    Nx00PartsService,
    Nx00LookupsService,
  ],
})
export class Nx00Module {}