/**
 * File: apps/nx-api/src/nx00/part/controllers/part.controller.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-PART-CTRL-001：Part CRUD endpoints (ADMIN only)
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

import { PartService } from '../services/part.service';
import type { CreatePartBody, SetActiveBody, UpdatePartBody } from '../dto/part.dto';

@Controller('part')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class PartController {
    constructor(private readonly part: PartService) { }

    /**
     * @CODE nxapi_nx00_part_list_001
     */
    @Get()
    async list(@Query() query: any) {
        return this.part.list({
            q: typeof query.q === 'string' ? query.q : undefined,
            brandId: typeof query.brandId === 'string' ? query.brandId : undefined,
            isActive: query.isActive === undefined ? undefined : String(query.isActive) === 'true',
            page: query.page ? Number(query.page) : 1,
            pageSize: query.pageSize ? Number(query.pageSize) : 20,
        });
    }

    /**
     * @CODE nxapi_nx00_part_get_001
     */
    @Get(':id')
    async get(@Param('id') id: string) {
        return this.part.get(id);
    }

    /**
     * @CODE nxapi_nx00_part_create_001
     */
    @Post()
    async create(@Body() body: CreatePartBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;
        return this.part.create(body, actorUserId);
    }

    /**
     * @CODE nxapi_nx00_part_update_001
     */
    @Put(':id')
    async update(@Param('id') id: string, @Body() body: UpdatePartBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;
        return this.part.update(id, body, actorUserId);
    }

    /**
     * @CODE nxapi_nx00_part_set_active_001
     */
    @Patch(':id/active')
    async setActive(@Param('id') id: string, @Body() body: SetActiveBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;
        return this.part.setActive(id, body, actorUserId);
    }
}