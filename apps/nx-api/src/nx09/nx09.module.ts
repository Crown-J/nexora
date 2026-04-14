import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { Nx09ArticleController } from './article/article.controller';
import { Nx09ArticleService } from './article/article.service';
import { Nx09DocumentController } from './document/document.controller';
import { Nx09DocumentService } from './document/document.service';
import { Nx09MeetingController } from './meeting/meeting.controller';
import { Nx09MeetingService } from './meeting/meeting.service';

@Module({
  imports: [PrismaModule],
  controllers: [Nx09ArticleController, Nx09DocumentController, Nx09MeetingController],
  providers: [Nx09ArticleService, Nx09DocumentService, Nx09MeetingService],
})
export class Nx09Module {}
