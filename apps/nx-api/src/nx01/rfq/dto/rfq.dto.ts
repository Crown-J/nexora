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

export { CreateRfqDto, CreateRfqItemDto } from './create-rfq.dto';
/** 與服務層沿用之別名（實際為 `CreateRfqDto` class） */
export type CreateRfqBodyDto = import('./create-rfq.dto').CreateRfqDto;

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

export { PatchReplyDto, PatchReplyItemDto } from './patch-reply.dto';
/** 與服務層沿用之別名（實際為 `PatchReplyDto` class） */
export type PatchRfqReplyBodyDto = import('./patch-reply.dto').PatchReplyDto;
export type RfqReplyItemDto = import('./patch-reply.dto').PatchReplyItemDto;
