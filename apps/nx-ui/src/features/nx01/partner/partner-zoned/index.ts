// apps/nx-ui/src/features/partner-zoned/index.ts
// v1.2 對齊軌 階段 E P2：partner 分區編輯 barrel

export { PartnerFormZoned } from './PartnerFormZoned';
export type { PartnerFormZonedProps, RefOption } from './PartnerFormZoned';
export { PartnerMasterPage } from './PartnerMasterPage';
export type { PartnerMasterPageProps } from './PartnerMasterPage';
export {
  PARTNER_TYPE_LABEL,
  PARTNER_TYPE_OPTIONS,
  partnerDraftToBody,
  partnerRowToDraft,
  emptyPartnerDraft,
  type PartnerDraft,
} from './helpers';
