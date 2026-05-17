// apps/nx-api/src/nx09/nx09.module.ts
// NX09 EIP 企業資訊平台 module（IMPL-01 6 子模組 + IMPL-02 VinLookup + RepairSop 亞羅特色）

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
import { Nx09RepairSopController } from './repair-sop/nx09-repair-sop.controller';
import { Nx09RepairSopService } from './repair-sop/nx09-repair-sop.service';
import { Nx09VinLookupController } from './vin-lookup/nx09-vin-lookup.controller';
import { Nx09VinLookupService } from './vin-lookup/nx09-vin-lookup.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    Nx09ArticleController,
    Nx09DocumentController,
    Nx09MeetingController,
    Nx09SystemManualController,
    Nx09FulltextSearchController,
    Nx09SubTablesController,
    Nx09VinLookupController,
    Nx09RepairSopController,
  ],
  providers: [
    Nx09ArticleService,
    Nx09DocumentService,
    Nx09MeetingService,
    Nx09SystemManualService,
    Nx09FulltextSearchService,
    Nx09SubTablesService,
    Nx09VinLookupService,
    Nx09RepairSopService,
  ],
})
export class Nx09Module {}
