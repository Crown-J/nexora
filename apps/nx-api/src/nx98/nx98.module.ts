// apps/nx-api/src/nx98/nx98.module.ts
// LITE 階段 1 M4：NX98 共用核心模組（首發 = 共享待辦池）

import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { TaskPoolController } from './task-pool/task-pool.controller';
import { TaskPoolService } from './task-pool/task-pool.service';

@Module({
  imports: [PrismaModule],
  controllers: [TaskPoolController],
  providers: [TaskPoolService],
})
export class Nx98Module {}
