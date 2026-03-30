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

import { CalendarEventService } from '../services/calendar-event.service';
import type {
  CreateCalendarEventBody,
  SetActiveBody,
  UpdateCalendarEventBody,
} from '../dto/calendar-event.dto';

@Controller('calendar-event')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CalendarEventController {
  constructor(private readonly calendarEvent: CalendarEventService) {}

  @Get()
  async list(@Query() query: Record<string, string | undefined>, @Req() req: any) {
    const tenantId = req?.user?.tenantId as string | null | undefined;
    return this.calendarEvent.list(tenantId, {
      from: typeof query.from === 'string' ? query.from : undefined,
      to: typeof query.to === 'string' ? query.to : undefined,
      isActive:
        query.isActive === undefined ? undefined : String(query.isActive) === 'true',
      page: query.page ? Number(query.page) : 1,
      pageSize: query.pageSize ? Number(query.pageSize) : 50,
    });
  }

  @Get(':id')
  async get(@Param('id') id: string, @Req() req: any) {
    const tenantId = req?.user?.tenantId as string | null | undefined;
    return this.calendarEvent.get(tenantId, id);
  }

  @Post()
  @Roles('ADMIN')
  async create(@Body() body: CreateCalendarEventBody, @Req() req: any) {
    const tenantId = req?.user?.tenantId as string | null | undefined;
    const actorUserId = req?.user?.sub as string | undefined;
    const ipAddr = (req?.ip as string | undefined) ?? null;
    const userAgent = (req?.headers?.['user-agent'] as string | undefined) ?? null;
    return this.calendarEvent.create(tenantId, body, { actorUserId, ipAddr, userAgent });
  }

  @Put(':id')
  @Roles('ADMIN')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateCalendarEventBody,
    @Req() req: any,
  ) {
    const tenantId = req?.user?.tenantId as string | null | undefined;
    const actorUserId = req?.user?.sub as string | undefined;
    const ipAddr = (req?.ip as string | undefined) ?? null;
    const userAgent = (req?.headers?.['user-agent'] as string | undefined) ?? null;
    return this.calendarEvent.update(tenantId, id, body, { actorUserId, ipAddr, userAgent });
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
    return this.calendarEvent.setActive(tenantId, id, body, { actorUserId, ipAddr, userAgent });
  }
}
