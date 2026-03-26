/**
 * File: apps/nx-api/src/nx03/quote/controllers/quote.controller.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX03-API-QUOTE-CTRL-001：QUOTE endpoints
 */

import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../../shared/guards/roles.guard';

import { QuoteService } from '../services/quote.service';
import type { AcceptQuoteBody, CreateQuoteBody, ListQuoteQuery } from '../dto/quote.dto';

@Controller('nx03/quote')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class QuoteController {
  constructor(private readonly quote: QuoteService) {}

  @Get()
  async list(@Query() query: any) {
    const q: ListQuoteQuery = {
      q: typeof query.q === 'string' ? query.q : undefined,
      status: typeof query.status === 'string' ? query.status : undefined,
      page: query.page ? Number(query.page) : 1,
      pageSize: query.pageSize ? Number(query.pageSize) : 20,
    };
    return this.quote.list(q);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.quote.get(id);
  }

  @Post()
  async create(@Body() body: CreateQuoteBody, @Req() req: any) {
    const actorUserId = req?.user?.sub as string | undefined;
    const ipAddr = (req?.ip as string | undefined) ?? null;
    const userAgent = (req?.headers?.['user-agent'] as string | undefined) ?? null;
    return this.quote.create(body, { actorUserId, ipAddr, userAgent });
  }

  @Post(':id/accept')
  async accept(@Param('id') quoteId: string, @Body() body: AcceptQuoteBody, @Req() req: any) {
    const actorUserId = req?.user?.sub as string | undefined;
    const ipAddr = (req?.ip as string | undefined) ?? null;
    const userAgent = (req?.headers?.['user-agent'] as string | undefined) ?? null;
    return this.quote.acceptQuote(quoteId, body, { actorUserId, ipAddr, userAgent });
  }
}

