// apps/nx-ui/src/features/nx02/warranty-claim/types.ts
// LITE 階段 1 M3：保固申請單前端 type 定義

export type ClaimType = 'CUST' | 'SELF';
export type ClaimResult = 'NEW' | 'REF' | 'RPR' | 'REJ';
export type ClaimStatus = 'D' | 'S' | 'R' | 'C' | 'V';
export type AttachmentFileType = 'LIC' | 'PHO' | 'VID';

export type WarrantyClaimDto = {
  id: string;
  tenantId: string;
  docNo: string;
  claimType: ClaimType;
  sourceSoId: string | null;
  sourceSoNo: string | null;
  supplierId: string;
  partId: string;
  partNo: string;
  partName: string;
  qty: string;
  claimDate: string;
  issueDescription: string;
  status: ClaimStatus;
  result: ClaimResult | null;
  resultRemark: string | null;
  resultedAt: string | null;
  resultedBy: string | null;
  remark: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  voidedAt: string | null;
  voidedBy: string | null;
  supplier?: { code: string; name: string; partnerType: string } | null;
  part?: { code: string; name: string } | null;
};

export type CreateWarrantyClaimBody = {
  claimType: ClaimType;
  sourceSoId?: string;
  sourceSoNo?: string;
  supplierId: string;
  partId: string;
  qty: number;
  claimDate: string;
  issueDescription: string;
  remark?: string;
};

export type UpdateWarrantyClaimBody = Partial<{
  sourceSoId: string | null;
  sourceSoNo: string | null;
  supplierId: string;
  partId: string;
  qty: number;
  claimDate: string;
  issueDescription: string;
  remark: string | null;
}>;

export type RegisterResultBody = {
  result: ClaimResult;
  resultRemark: string;
};

export type WarrantyClaimAttachmentDto = {
  id: string;
  tenantId: string;
  claimId: string;
  fileType: AttachmentFileType;
  storageKey: string;
  mimeType: string;
  fileSize: number;
  origFilename: string;
  uploaderUserId: string;
  createdAt: string;
};

export const CLAIM_STATUS_LABEL: Record<ClaimStatus, string> = {
  D: '草稿',
  S: '已送出',
  R: '審核中',
  C: '已完成',
  V: '作廢',
};

export const CLAIM_RESULT_LABEL: Record<ClaimResult, string> = {
  NEW: '換新',
  REF: '退錢',
  RPR: '維修後還',
  REJ: '駁回',
};

export const CLAIM_TYPE_LABEL: Record<ClaimType, string> = {
  CUST: '客訴型（連銷貨單）',
  SELF: '自用型（庫存壞）',
};

export const FILE_TYPE_LABEL: Record<AttachmentFileType, string> = {
  LIC: '行照',
  PHO: '問題照片',
  VID: '影片',
};
