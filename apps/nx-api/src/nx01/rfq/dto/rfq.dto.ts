/**
 * File: apps/nx-api/src/nx01/rfq/dto/rfq.dto.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX01-RFQ-DTO-001：詢價單 API 請求型別
 */

export type RfqItemInputDto = {
  partId: string;
  qty: number;
  unitPrice?: number | null;
  leadTimeDays?: number | null;
  remark?: string | null;
};

export type CreateRfqBodyDto = {
  /** 單號流水用（與 doc_no 倉別段對齊） */
  warehouseId: string;
  rfqDate?: string;
  supplierId?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  remark?: string | null;
  items: RfqItemInputDto[];
};

export type PatchRfqBodyDto = {
  rfqDate?: string;
  supplierId?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  remark?: string | null;
  items?: RfqItemInputDto[];
};

export type PatchRfqStatusBodyDto = {
  status: string;
};

export type RfqToRrBodyDto = {
  supplierId: string;
  warehouseId: string;
  items: { rfqItemId: string; qty: number }[];
};

export type RfqToPoBodyDto = {
  items: { rfqItemId: string; qty: number }[];
};
