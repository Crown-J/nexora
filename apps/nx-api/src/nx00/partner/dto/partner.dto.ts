/**
 * File: apps/nx-api/src/nx00/partner/dto/partner.dto.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-PARTNER-DTO-001：Partner DTO（LITE 對齊 nx00_partner）
 */

export type PartnerType = 'BOTH' | 'CUSTOMER' | 'SUPPLIER';

export type PartnerDto = {
    id: string;
    code: string;
    name: string;
    partnerType: PartnerType;

    contactName: string | null;
    phone: string | null;
    mobile: string | null;
    email: string | null;
    address: string | null;
    remark: string | null;

    isActive: boolean;

    createdAt: string;
    createdBy: string | null;
    createdByName: string | null;

    updatedAt: string;
    updatedBy: string | null;
    updatedByName: string | null;
};

export type PagedResult<T> = {
    items: T[];
    page: number;
    pageSize: number;
    total: number;
};

export type ListPartnerQuery = {
    q?: string;
    partnerType?: PartnerType;
    isActive?: boolean;
    page?: number;
    pageSize?: number;
};

export type CreatePartnerBody = {
    code: string;
    name: string;
    partnerType?: PartnerType;

    contactName?: string | null;
    phone?: string | null;
    mobile?: string | null;
    email?: string | null;
    address?: string | null;
    remark?: string | null;

    isActive?: boolean;
};

export type UpdatePartnerBody = {
    code?: string;
    name?: string;
    partnerType?: PartnerType;

    contactName?: string | null;
    phone?: string | null;
    mobile?: string | null;
    email?: string | null;
    address?: string | null;
    remark?: string | null;

    isActive?: boolean;
};

export type SetActiveBody = {
    isActive: boolean;
};