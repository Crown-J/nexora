import { Body, Controller, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { CountryService } from '../services/country.service';
import type { CreateCountryBody, SetActiveBody, UpdateCountryBody } from '../dto/country.dto';

@Controller('country')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class CountryController {
    constructor(private readonly country: CountryService) { }

    @Get()
    async list(@Query() query: any) {
        return this.country.list({
            q: typeof query.q === 'string' ? query.q : undefined,
            isActive: query.isActive === undefined ? undefined : String(query.isActive) === 'true',
            page: query.page ? Number(query.page) : 1,
            pageSize: query.pageSize ? Number(query.pageSize) : 50,
        });
    }

    @Get(':id')
    async get(@Param('id') id: string) {
        return this.country.get(id);
    }

    @Post()
    async create(@Body() body: CreateCountryBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;
        return this.country.create(body, {
            actorUserId,
            ipAddr: (req?.ip as string | undefined) ?? null,
            userAgent: (req?.headers?.['user-agent'] as string | undefined) ?? null,
        });
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() body: UpdateCountryBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;
        return this.country.update(id, body, {
            actorUserId,
            ipAddr: (req?.ip as string | undefined) ?? null,
            userAgent: (req?.headers?.['user-agent'] as string | undefined) ?? null,
        });
    }

    @Patch(':id/active')
    async setActive(@Param('id') id: string, @Body() body: SetActiveBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;
        return this.country.setActive(id, body, {
            actorUserId,
            ipAddr: (req?.ip as string | undefined) ?? null,
            userAgent: (req?.headers?.['user-agent'] as string | undefined) ?? null,
        });
    }
}
