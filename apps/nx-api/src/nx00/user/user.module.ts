/**
 * File: apps/nx-api/src/nx00/user/user.module.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-USER-MODULE-001：User Module（LITE 統一單數命名）
 */

import { Module } from '@nestjs/common';
import { UserController } from './controllers/user.controller';
import { UserService } from './services/user.service';

@Module({
    controllers: [UserController],
    providers: [UserService],
})
export class UserModule { }