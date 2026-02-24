/**
 * File: apps/nx-api/src/nx00/permissions/controllers/permissions.controller.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-PERMISSIONS-CTRL-001：Permissions Controller（CRUD）
 */

import { Body, Controller, Get, Param, Post, Put, Query, Req } from '@nestjs/common';
import { PermissionsService } from '../services/permissions.service';
import type {
    CreatePermissionBody,
    ListPermissionsQuery,
    UpdatePermissionBody,
} from '../dto/permissions.dto';

@Controller('nx00/permissions')
export class PermissionsController {
    constructor(private readonly service: PermissionsService) { }

    /**
     * @CODE nxapi_nx00_permissions_list_001
     * GET /nx00/permissions
     */
    @Get()
    list(@Query() query: ListPermissionsQuery) {
        return this.service.list(query);
    }

    /**
     * @CODE nxapi_nx00_permissions_get_001
     * GET /nx00/permissions/:id
     */
    @Get(':id')
    get(@Param('id') id: string) {
        return this.service.get(id);
    }

    /**
     * @CODE nxapi_nx00_permissions_create_001
     * POST /nx00/permissions
     */
    @Post()
    create(@Body() body: CreatePermissionBody, @Req() req: any) {
        const actorUserId = req?.user?.id;
        return this.service.create(body, actorUserId);
    }

    /**
     * @CODE nxapi_nx00_permissions_update_001
     * PUT /nx00/permissions/:id
     */
    @Put(':id')
    update(@Param('id') id: string, @Body() body: UpdatePermissionBody, @Req() req: any) {
        const actorUserId = req?.user?.id;
        return this.service.update(id, body, actorUserId);
    }
}