/**
 * File: apps/nx-api/src/nx00/lookup/dto/lookup.dto.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-LOOKUP-DTO-001：Lookup DTO（下拉資料）
 */

export type LookupItem = {
    id: string;
    code: string;
    name: string;
    isActive?: boolean;
};

export type LookupLocationItem = {
    id: string;
    warehouseId: string;
    code: string;
    name: string | null;
    zone: string | null;
    rack: string | null;
    levelNo: number | null;
    binNo: string | null;
    isActive: boolean;
};

export type PartnerType = 'BOTH' | 'CUSTOMER' | 'SUPPLIER';