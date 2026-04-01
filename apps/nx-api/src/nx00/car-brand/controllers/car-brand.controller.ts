import { Body, Controller, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { CarBrandService } from '../services/car-brand.service';
import type { CreateCarBrandBody, SetActiveBody, UpdateCarBrandBody } from '../dto/car-brand.dto';

@Controller('car-brand')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class CarBrandController {
    constructor(private readonly carBrand: CarBrandService) {}

    @Get()
    async list(@Query() query: any) {
        return this.carBrand.list({
            q: typeof query.q === 'string' ? query.q : undefined,
            isActive: query.isActive === undefined ? undefined : String(query.isActive) === 'true',
            page: query.page ? Number(query.page) : 1,
            pageSize: query.pageSize ? Number(query.pageSize) : 50,
        });
    }

    @Get(':id')
    async get(@Param('id') id: string) {
        return this.carBrand.get(id);
    }

    @Post()
    async create(@Body() body: CreateCarBrandBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;
        return this.carBrand.create(body, {
            actorUserId,
            ipAddr: (req?.ip as string | undefined) ?? null,
            userAgent: (req?.headers?.['user-agent'] as string | undefined) ?? null,
        });
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() body: UpdateCarBrandBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;
        return this.carBrand.update(id, body, {
            actorUserId,
            ipAddr: (req?.ip as string | undefined) ?? null,
            userAgent: (req?.headers?.['user-agent'] as string | undefined) ?? null,
        });
    }

    @Patch(':id/active')
    async setActive(@Param('id') id: string, @Body() body: SetActiveBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;
        return this.carBrand.setActive(id, body, {
            actorUserId,
            ipAddr: (req?.ip as string | undefined) ?? null,
            userAgent: (req?.headers?.['user-agent'] as string | undefined) ?? null,
        });
    }
}
