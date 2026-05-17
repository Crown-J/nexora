// apps/nx-api/src/nx10/nx10.module.ts
// NX10 八角遊戲化 module（既有 5 service + IMPL-01 SurpriseBox + Sprint）

import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { Nx10CheckinController } from './checkin/nx10-checkin.controller';
import { Nx10CheckinService } from './checkin/nx10-checkin.service';
import { Nx10ExpController } from './exp/nx10-exp.controller';
import { Nx10ExpService } from './exp/nx10-exp.service';
import { Nx10LeaderboardController } from './leaderboard/nx10-leaderboard.controller';
import { Nx10LeaderboardService } from './leaderboard/nx10-leaderboard.service';
import { Nx10MedalsController } from './medals/nx10-medals.controller';
import { Nx10MedalsService } from './medals/nx10-medals.service';
import { Nx10SprintController } from './sprint/nx10-sprint.controller';
import { Nx10SprintService } from './sprint/nx10-sprint.service';
import { Nx10SurpriseBoxController } from './surprise-box/nx10-surprise-box.controller';
import { Nx10SurpriseBoxService } from './surprise-box/nx10-surprise-box.service';
import { Nx10TasksController } from './tasks/nx10-tasks.controller';
import { Nx10TasksTodayController } from './tasks/nx10-tasks-today.controller';
import { Nx10TasksService } from './tasks/nx10-tasks.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    Nx10ExpController,
    Nx10CheckinController,
    Nx10TasksTodayController,
    Nx10TasksController,
    Nx10MedalsController,
    Nx10LeaderboardController,
    Nx10SurpriseBoxController,
    Nx10SprintController,
  ],
  providers: [
    Nx10ExpService,
    Nx10CheckinService,
    Nx10TasksService,
    Nx10MedalsService,
    Nx10LeaderboardService,
    Nx10SurpriseBoxService,
    Nx10SprintService,
  ],
  exports: [Nx10ExpService],
})
export class Nx10Module {}
