// C:\nexora\apps\nx-api\src\app.module.ts
// AppModule：註冊 AppController、掛載 PrismaModule 與 AuthModule

import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { PlatformAuthModule } from './platform-auth/platform-auth.module';
import { FileUploadModule } from './shared/file-upload/file-upload.module';
import { Nx01Module } from './nx01/nx01.module';
import { Nx02Module } from './nx02/nx02.module';
import { Nx03Module } from './nx03/nx03.module';
import { Nx04Module } from './nx04/nx04.module';
import { Nx05Module } from './nx05/nx05.module';
import { Nx06Module } from './nx06/nx06.module';
import { Nx07Module } from './nx07/nx07.module';
import { Nx08Module } from './nx08/nx08.module';
import { Nx09Module } from './nx09/nx09.module';
import { Nx10Module } from './nx10/nx10.module';
import { Nx98Module } from './nx98/nx98.module';
import { Nx99Module } from './nx99/nx99.module';
import { SysAdminModule } from './sys-admin/sys-admin.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    PlatformAuthModule,
    FileUploadModule,
    Nx99Module,
    Nx01Module,
    Nx02Module,
    Nx03Module,
    Nx04Module,
    Nx05Module,
    Nx06Module,
    Nx07Module,
    Nx08Module,
    Nx09Module,
    Nx10Module,
    Nx98Module,
    SysAdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }