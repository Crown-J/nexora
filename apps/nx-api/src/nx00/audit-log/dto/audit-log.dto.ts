/**
 * File: apps/nx-api/src/nx00/audit-log/dto/audit-log.dto.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-AUDIT-LOG-DTO-001：AuditLog DTO（LITE 對齊 nx00_audit_log）
 */

export type AuditLogDto = {
    id: string;
    occurredAt: string;

    actorUserId: string;
    actorUserName: string | null;

    moduleCode: string;
    action: string;
    entityTable: string;

    entityId: string | null;
    entityCode: string | null;
    summary: string | null;

    beforeData: any | null;
    afterData: any | null;

    ipAddr: string | null;
    userAgent: string | null;
};

export type PagedResult<T> = {
    items: T[];
    page: number;
    pageSize: number;
    total: number;
};

export type ListAuditLogQuery = {
    q?: string; // 模糊查 summary/entityCode/entityId
    actorUserId?: string;
    moduleCode?: string;
    action?: string;
    entityTable?: string;

    dateFrom?: string; // ISO
    dateTo?: string;   // ISO

    page?: number;
    pageSize?: number;
};

export type CreateAuditLogBody = {
    // actorUserId 建議不要讓 client 自填，預設由 req.user.sub 來
    moduleCode: string;
    action: string;
    entityTable: string;

    entityId?: string | null;
    entityCode?: string | null;
    summary?: string | null;

    beforeData?: any | null;
    afterData?: any | null;

    ipAddr?: string | null;
    userAgent?: string | null;
};