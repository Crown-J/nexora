// C:\nexora\apps\nx-api\src\app.module.ts
// AppModule：註冊 AppController、掛載 PrismaModule 與 AuthModule

import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { Nx00Module } from './nx00/nx00.module';
import { Nx01Module } from './nx01/nx01.module';
import { Nx03Module } from './nx03/nx03.module';

@Module({
  imports: [PrismaModule, AuthModule, Nx00Module, Nx01Module, Nx03Module],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }