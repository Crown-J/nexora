/**
 * File: apps/nx-ui/src/features/shared/master/lookup/types.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-LOOKUPS-TYPES-001：Lookups types（brand/function-group/part-status）
 *
 * Notes:
 * - 下拉選單：顯示 label（通常 code + name），送出 value（id）
 */

export type LookupRow = {
    id: string;
    code: string;
    name: string;
    nameEn?: string | null;
    isActive: boolean;
    /** T8 進貨對齊批次 2026-06-08：廠牌料號（部分 lookup 端點不返、optional 容忍） */
    secCode?: string | null;
};

export type PartStatusRow = {
    id: string;
    code: string;
    name: string;
    canSell: boolean;
    canPurchase: boolean;
    isActive: boolean;
};

export type SelectOption = {
    value: string; // id
    label: string; // code + name
    code?: string;
    name?: string;
    disabled?: boolean;
};