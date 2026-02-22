/**
 * File: apps/nx-api/src/prisma/prisma.service.ts
 * Project: NEXORA (Monorepo)
 * Purpose: NX00-API-002 PrismaService（Prisma v7 + adapter-pg 連線 PostgreSQL）
 * Notes:
 * - 連線字串讀取 DATABASE_URL（請設定於 apps/nx-api/.env）
 * - 使用 @prisma/adapter-pg 搭配 pg Pool
 * - PrismaClient 來源統一使用 db-core（packages/db-core/generated/prisma）
 */

import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from 'db-core';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly pool: Pool;

  constructor() {
    /**
     * @CODE nxapi_prisma_ctor_001
     * Notes:
     * - Prisma v7 adapter 模式：PrismaClient({ adapter })
     * - DATABASE_URL 缺少時直接 fail-fast
     */
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL is missing. Please set it in apps/nx-api/.env');
    }

    const pool = new Pool({ connectionString: url });
    const adapter = new PrismaPg(pool);

    super({ adapter });

    this.pool = pool;
  }

  /**
   * @CODE nxapi_prisma_on_module_init_001
   */
  async onModuleInit() {
    await this.$connect();
  }

  /**
   * @CODE nxapi_prisma_on_module_destroy_001
   */
  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
  }
}
