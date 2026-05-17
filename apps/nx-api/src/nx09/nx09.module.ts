// apps/nx-api/src/nx09/nx09.module.ts
// NX09 EIP 企業資訊平台 module（既有 3 service + IMPL-01 SystemManual + FTS）

import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { Nx09ArticleController } from './article/article.controller';
import { Nx09ArticleService } from './article/article.service';
import { Nx09DocumentController } from './document/document.controller';
import { Nx09DocumentService } from './document/document.service';
import { Nx09FulltextSearchController } from './fulltext-search/fulltext-search.controller';
import { Nx09FulltextSearchService } from './fulltext-search/fulltext-search.service';
import { Nx09MeetingController } from './meeting/meeting.controller';
import { Nx09MeetingService } from './meeting/meeting.service';
import { Nx09SubTablesController } from './sub-tables/sub-tables.controller';
import { Nx09SubTablesService } from './sub-tables/sub-tables.service';
import { Nx09SystemManualController } from './system-manual/system-manual.controller';
import { Nx09SystemManualService } from './system-manual/system-manual.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    Nx09ArticleController,
    Nx09DocumentController,
    Nx09MeetingController,
    Nx09SystemManualController,
    Nx09FulltextSearchController,
    Nx09SubTablesController,
  ],
  providers: [
    Nx09ArticleService,
    Nx09DocumentService,
    Nx09MeetingService,
    Nx09SystemManualService,
    Nx09FulltextSearchService,
    Nx09SubTablesService,
  ],
})
export class Nx09Module {}
