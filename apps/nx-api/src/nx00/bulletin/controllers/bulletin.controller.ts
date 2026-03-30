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

import { BulletinService } from '../services/bulletin.service';
import type { CreateBulletinBody, SetActiveBody, UpdateBulletinBody } from '../dto/bulletin.dto';

@Controller('bulletin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BulletinController {
  constructor(private readonly bulletin: BulletinService) {}

  @Get()
  async list(@Query() query: Record<string, string | undefined>, @Req() req: any) {
    const tenantId = req?.user?.tenantId as string | null | undefined;
    return this.bulletin.list(tenantId, {
      scopeType: typeof query.scopeType === 'string' ? query.scopeType : undefined,
      isActive:
        query.isActive === undefined ? undefined : String(query.isActive) === 'true',
      page: query.page ? Number(query.page) : 1,
      pageSize: query.pageSize ? Number(query.pageSize) : 20,
    });
  }

  @Get(':id')
  async get(@Param('id') id: string, @Req() req: any) {
    const tenantId = req?.user?.tenantId as string | null | undefined;
    return this.bulletin.get(tenantId, id);
  }

  @Post()
  @Roles('ADMIN')
  async create(@Body() body: CreateBulletinBody, @Req() req: any) {
    const tenantId = req?.user?.tenantId as string | null | undefined;
    const actorUserId = req?.user?.sub as string | undefined;
    const ipAddr = (req?.ip as string | undefined) ?? null;
    const userAgent = (req?.headers?.['user-agent'] as string | undefined) ?? null;
    return this.bulletin.create(tenantId, body, { actorUserId, ipAddr, userAgent });
  }

  @Put(':id')
  @Roles('ADMIN')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateBulletinBody,
    @Req() req: any,
  ) {
    const tenantId = req?.user?.tenantId as string | null | undefined;
    const actorUserId = req?.user?.sub as string | undefined;
    const ipAddr = (req?.ip as string | undefined) ?? null;
    const userAgent = (req?.headers?.['user-agent'] as string | undefined) ?? null;
    return this.bulletin.update(tenantId, id, body, { actorUserId, ipAddr, userAgent });
  }

  @Patch(':id/active')
  @Roles('ADMIN')
  async setActive(
    @Param('id') id: string,
    @Body() body: SetActiveBody,
    @Req() req: any,
  ) {
    const tenantId = req?.user?.tenantId as string | null | undefined;
    const actorUserId = req?.user?.sub as string | undefined;
    const ipAddr = (req?.ip as string | undefined) ?? null;
    const userAgent = (req?.headers?.['user-agent'] as string | undefined) ?? null;
    return this.bulletin.setActive(tenantId, id, body, { actorUserId, ipAddr, userAgent });
  }
}
