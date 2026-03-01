/**
 * File: apps/nx-api/src/nx00/nx00.module.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-002：NX00 Module 聚合（Lookup / Master Data / RBAC / Audit）
 *
 * Notes:
 * - Nx00Module 本身不再直接掛 controllers/providers
 * - 改以 imports 匯入各子模組，維護更一致
 */

import { Module } from '@nestjs/common';

import { LookupModule } from './lookup/lookup.module';

// RBAC / Users
import { UserModule } from './user/user.module';
import { RoleModule } from './role/role.module';
import { UserRoleModule } from './user-role/user-role.module';
import { ViewModule } from './view/view.module';
import { RoleViewModule } from './role-view/role-view.module';

// Master Data
import { BrandModule } from './brand/brand.module';
import { PartModule } from './part/part.module';
import { WarehouseModule } from './warehouse/warehouse.module';
import { LocationModule } from './location/location.module';
import { PartnerModule } from './partner/partner.module';

// Audit
import { AuditLogModule } from './audit-log/audit-log.module';

@Module({
  imports: [
    // Lookup（下拉資料）
    LookupModule,

    // RBAC / Users
    UserModule,
    RoleModule,
    UserRoleModule,
    ViewModule,
    RoleViewModule,

    // Master Data
    BrandModule,
    PartModule,
    WarehouseModule,
    LocationModule,
    PartnerModule,

    // Audit
    AuditLogModule,
  ],
})
export class Nx00Module { }