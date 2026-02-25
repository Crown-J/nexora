/**
 * File: apps/nx-api/src/users/users.module.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-USERS-MODULE-001：Users Module
 */

import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersController } from './controllers/users.controller';
import { UsersService } from './services/users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, PrismaService],
})
export class UsersModule { }