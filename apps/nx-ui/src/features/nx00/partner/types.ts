/**
 * File: apps/nx-ui/src/features/nx00/partner/types.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-PARTNER-TYPES-001：Partner Types（SSOT）
 */

export type PartnerType = 'CUST' | 'SUPP' | 'BOTH';

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
    createdByName?: string | null;

    updatedAt: string | null;
    updatedBy: string | null;
    updatedByName?: string | null;
};

export type PagedResult<T> = {
    items: T[];
    page: number;
    pageSize: number;
    total: number;
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

    statusCode?: string;
    remark2?: string | null;
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

    statusCode?: string;
    remark2?: string | null;
};