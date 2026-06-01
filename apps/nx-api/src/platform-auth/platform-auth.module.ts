// apps/nx-api/src/platform-auth/platform-auth.module.ts
// 平台層 vs 租戶層分離軌 Phase 2：PlatformAuthModule
//
// 跟既有 AuthModule 並存、不耦合：
// - 共用 JWT_SECRET（同一個 secret pool）
// - JwtModule 各自 register（避免全域 default）
// - PassportModule 共用（Nest 標準）

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { PrismaModule } from '../prisma/prisma.module';
import { PlatformAuthController } from './controllers/platform-auth.controller';
import { PlatformAuthService } from './services/platform-auth.service';
import { PlatformJwtStrategy } from './strategies/platform-jwt.strategy';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev_secret_change_me',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [PlatformAuthController],
  providers: [PlatformAuthService, PlatformJwtStrategy],
})
export class PlatformAuthModule {}
