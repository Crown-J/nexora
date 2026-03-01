/**
 * File: apps/nx-api/src/nx00/view/controllers/view.controller.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-VIEW-CTRL-001：View CRUD endpoints (ADMIN only)
 */

import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Post,
    Put,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../../shared/guards/roles.guard';

import { ViewService } from '../services/view.service';
import type { CreateViewBody, SetActiveBody, UpdateViewBody } from '../dto/view.dto';

@Controller('view')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class ViewController {
    constructor(private readonly view: ViewService) { }

    /**
     * @CODE nxapi_nx00_view_list_001
     */
    @Get()
    async list(@Query() query: any) {
        return this.view.list({
            q: typeof query.q === 'string' ? query.q : undefined,
            moduleCode: typeof query.moduleCode === 'string' ? query.moduleCode : undefined,
            isActive: query.isActive === undefined ? undefined : String(query.isActive) === 'true',
            page: query.page ? Number(query.page) : 1,
            pageSize: query.pageSize ? Number(query.pageSize) : 20,
        });
    }

    /**
     * @CODE nxapi_nx00_view_get_001
     */
    @Get(':id')
    async get(@Param('id') id: string) {
        return this.view.get(id);
    }

    /**
     * @CODE nxapi_nx00_view_create_001
     */
    @Post()
    async create(@Body() body: CreateViewBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;
        return this.view.create(body, actorUserId);
    }

    /**
     * @CODE nxapi_nx00_view_update_001
     */
    @Put(':id')
    async update(@Param('id') id: string, @Body() body: UpdateViewBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;
        return this.view.update(id, body, actorUserId);
    }

    /**
     * @CODE nxapi_nx00_view_set_active_001
     */
    @Patch(':id/active')
    async setActive(@Param('id') id: string, @Body() body: SetActiveBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;
        return this.view.setActive(id, body, actorUserId);
    }
}