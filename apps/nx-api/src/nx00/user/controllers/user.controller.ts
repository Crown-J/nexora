/**
 * File: apps/nx-api/src/nx00/user/controllers/user.controller.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-USER-CTRL-001：User CRUD endpoints (ADMIN only)
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

import { UserService } from '../services/user.service';
import type { CreateUserBody, SetActiveBody, UpdateUserBody } from '../dto/user.dto';

@Controller('user')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class UserController {
    constructor(private readonly user: UserService) { }

    /**
     * @CODE nxapi_nx00_user_list_001
     */
    @Get()
    async list(@Query() query: any) {
        return this.user.list({
            q: typeof query.q === 'string' ? query.q : undefined,
            page: query.page ? Number(query.page) : 1,
            pageSize: query.pageSize ? Number(query.pageSize) : 20,
        });
    }

    /**
     * @CODE nxapi_nx00_user_get_001
     */
    @Get(':id')
    async get(@Param('id') id: string) {
        return this.user.get(id);
    }

    /**
     * @CODE nxapi_nx00_user_create_001
     */
    @Post()
    async create(@Body() body: CreateUserBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;
        return this.user.create(body, actorUserId);
    }

    /**
     * @CODE nxapi_nx00_user_update_001
     */
    @Put(':id')
    async update(@Param('id') id: string, @Body() body: UpdateUserBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;
        return this.user.update(id, body, actorUserId);
    }

    /**
     * @CODE nxapi_nx00_user_set_active_001
     */
    @Patch(':id/active')
    async setActive(@Param('id') id: string, @Body() body: SetActiveBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;
        return this.user.setActive(id, body, actorUserId);
    }
}