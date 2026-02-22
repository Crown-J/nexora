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
import { PartsModule } from './parts/parts.module';
import { LookupsModule } from './lookups/lookups.module';

@Module({
  imports: [
    UsersModule,
    RbacModule,
    PartsModule,
    LookupsModule,
  ],
})
export class Nx00Module {}