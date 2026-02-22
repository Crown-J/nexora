/**
 * File: apps/nx-api/src/nx00/rbac/rbac.module.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-RBAC-API-MOD-001：RBAC 管理 Module
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { RbacController } from './controllers/rbac.controller';
import { RbacService } from '../rbac/services/rbac.service';

@Module({
  imports: [PrismaModule],
  controllers: [RbacController],
  providers: [RbacService],
})
export class RbacModule {}