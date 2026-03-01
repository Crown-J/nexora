/**
 * File: apps/nx-api/src/nx00/view/view.module.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-VIEW-MODULE-001：View Module（LITE 統一單數命名）
 */

import { Module } from '@nestjs/common';
import { ViewController } from './controllers/view.controller';
import { ViewService } from './services/view.service';

@Module({
    controllers: [ViewController],
    providers: [ViewService],
})
export class ViewModule { }