import { Body, Controller, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { PartGroupService } from '../services/part-group.service';
import type { CreatePartGroupBody, SetActiveBody, UpdatePartGroupBody } from '../dto/part-group.dto';

@Controller('part-group')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class PartGroupController {
    constructor(private readonly partGroup: PartGroupService) { }

    @Get()
    async list(@Query() query: any, @Req() req: any) {
        const tenantScopeId = (req?.user?.tenantId as string | null | undefined) ?? null;
        return this.partGroup.list(
            {
                q: typeof query.q === 'string' ? query.q : undefined,
                isActive: query.isActive === undefined ? undefined : String(query.isActive) === 'true',
                page: query.page ? Number(query.page) : 1,
                pageSize: query.pageSize ? Number(query.pageSize) : 50,
            },
            { tenantScopeId },
        );
    }

    @Get(':id')
    async get(@Param('id') id: string, @Req() req: any) {
        const tenantScopeId = (req?.user?.tenantId as string | null | undefined) ?? null;
        return this.partGroup.get(id, { tenantScopeId });
    }

    @Post()
    async create(@Body() body: CreatePartGroupBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;
        const tenantId = (req?.user?.tenantId as string | null | undefined) ?? null;
        return this.partGroup.create(body, {
            actorUserId,
            tenantId,
            ipAddr: (req?.ip as string | undefined) ?? null,
            userAgent: (req?.headers?.['user-agent'] as string | undefined) ?? null,
        });
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() body: UpdatePartGroupBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;
        return this.partGroup.update(id, body, {
            actorUserId,
            ipAddr: (req?.ip as string | undefined) ?? null,
            userAgent: (req?.headers?.['user-agent'] as string | undefined) ?? null,
        });
    }

    @Patch(':id/active')
    async setActive(@Param('id') id: string, @Body() body: SetActiveBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;
        return this.partGroup.setActive(id, body, {
            actorUserId,
            ipAddr: (req?.ip as string | undefined) ?? null,
            userAgent: (req?.headers?.['user-agent'] as string | undefined) ?? null,
        });
    }
}
