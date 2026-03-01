/**
 * File: apps/nx-api/src/nx00/audit-log/controllers/audit-log.controller.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-AUDIT-LOG-CTRL-001：AuditLog Query endpoints (ADMIN only)
 *
 * Notes:
 * - 僅提供查詢（list/get）
 * - 不提供 create/edit/delete（AuditLog 必須由後端自動寫入）
 */

import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../../shared/guards/roles.guard';

import { AuditLogService } from '../services/audit-log.service';

@Controller('audit-log')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AuditLogController {
    constructor(private readonly audit: AuditLogService) { }

    /**
     * @CODE nxapi_nx00_audit_log_list_001
     */
    @Get()
    async list(@Query() query: any) {
        return this.audit.list({
            q: typeof query.q === 'string' ? query.q : undefined,
            actorUserId: typeof query.actorUserId === 'string' ? query.actorUserId : undefined,
            moduleCode: typeof query.moduleCode === 'string' ? query.moduleCode : undefined,
            action: typeof query.action === 'string' ? query.action : undefined,
            entityTable: typeof query.entityTable === 'string' ? query.entityTable : undefined,

            dateFrom: typeof query.dateFrom === 'string' ? query.dateFrom : undefined,
            dateTo: typeof query.dateTo === 'string' ? query.dateTo : undefined,

            page: query.page ? Number(query.page) : 1,
            pageSize: query.pageSize ? Number(query.pageSize) : 20,
        });
    }

    /**
     * @CODE nxapi_nx00_audit_log_get_001
     */
    @Get(':id')
    async get(@Param('id') id: string) {
        return this.audit.get(id);
    }
}