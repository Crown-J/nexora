import { Body, Controller, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { PartRelationService } from '../services/part-relation.service';
import type { CreatePartRelationBody, SetActiveBody, UpdatePartRelationBody } from '../dto/part-relation.dto';

@Controller('part-relation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class PartRelationController {
    constructor(private readonly svc: PartRelationService) { }

    @Get()
    async list(@Query() query: any) {
        return this.svc.list({
            q: typeof query.q === 'string' ? query.q : undefined,
            isActive: query.isActive === undefined ? undefined : String(query.isActive) === 'true',
            page: query.page ? Number(query.page) : 1,
            pageSize: query.pageSize ? Number(query.pageSize) : 50,
        });
    }

    @Get(':id')
    async get(@Param('id') id: string) {
        return this.svc.get(id);
    }

    @Post()
    async create(@Body() body: CreatePartRelationBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;
        return this.svc.create(body, {
            actorUserId,
            ipAddr: (req?.ip as string | undefined) ?? null,
            userAgent: (req?.headers?.['user-agent'] as string | undefined) ?? null,
        });
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() body: UpdatePartRelationBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;
        return this.svc.update(id, body, {
            actorUserId,
            ipAddr: (req?.ip as string | undefined) ?? null,
            userAgent: (req?.headers?.['user-agent'] as string | undefined) ?? null,
        });
    }

    @Patch(':id/active')
    async setActive(@Param('id') id: string, @Body() body: SetActiveBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;
        return this.svc.setActive(id, body, {
            actorUserId,
            ipAddr: (req?.ip as string | undefined) ?? null,
            userAgent: (req?.headers?.['user-agent'] as string | undefined) ?? null,
        });
    }
}
