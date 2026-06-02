// apps/nx-api/src/public-files/public-files.module.ts
// LOGO 上傳軌：公開讀檔 module（無 auth、限 LOGO 圖檔）

import { Module } from '@nestjs/common';

import { FileUploadModule } from '../shared/file-upload/file-upload.module';
import { PublicFilesController } from './public-files.controller';

@Module({
  imports: [FileUploadModule],
  controllers: [PublicFilesController],
})
export class PublicFilesModule {}
