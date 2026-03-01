/**
 * File: apps/nx-ui/src/features/nx00/partner/meta/partner.fields.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-PARTNER-FIELDS-001：Partner fields meta
 */

export type PartnerFieldKey =
    | 'code'
    | 'name'
    | 'partnerType'
    | 'contactName'
    | 'phone'
    | 'mobile'
    | 'email'
    | 'address'
    | 'remark'
    | 'isActive'
    | 'createdAt'
    | 'createdBy'
    | 'createdByName'
    | 'updatedAt'
    | 'updatedBy'
    | 'updatedByName';

export type PartnerFieldDef = {
    key: PartnerFieldKey;
    label: string;
    inList: boolean;
    sortable?: boolean;
    filterable?: boolean;
};

export const PARTNER_FIELDS: PartnerFieldDef[] = [
    { key: 'code', label: '代碼', inList: true, sortable: true, filterable: true },
    { key: 'name', label: '名稱', inList: true, sortable: true, filterable: true },
    { key: 'partnerType', label: '類型', inList: true, sortable: true, filterable: true },
    { key: 'contactName', label: '聯絡人', inList: true, sortable: true, filterable: true },
    { key: 'phone', label: '電話', inList: true, sortable: true, filterable: true },
    { key: 'mobile', label: '手機', inList: false, sortable: true, filterable: true },
    { key: 'email', label: 'Email', inList: false, sortable: true, filterable: true },
    { key: 'isActive', label: '啟用', inList: true, sortable: true, filterable: true },

    { key: 'address', label: '地址', inList: false, sortable: true, filterable: true },
    { key: 'remark', label: '備註', inList: false, sortable: true, filterable: true },

    { key: 'createdAt', label: '建立時間', inList: false, sortable: true },
    { key: 'createdBy', label: '建立人ID', inList: false, sortable: true },
    { key: 'createdByName', label: '建立人', inList: false, sortable: true },

    { key: 'updatedAt', label: '更新時間', inList: false, sortable: true },
    { key: 'updatedBy', label: '更新人ID', inList: false, sortable: true },
    { key: 'updatedByName', label: '更新人', inList: false, sortable: true },
];