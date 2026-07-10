// apps/nx-ui/src/data/endpoints/nx01/part-barcode/api/part-barcode.ts
// 偉盟 P2 2.6 2026-07-11：零件條碼對照 API client（對應 apps/nx-api/src/nx01/part-barcode/）

import { apiJson } from '@data/api/client';

export interface PartBarcodeRow {
  id: string;
  tenantId: string;
  partId: string;
  barcode: string;
  isDefault: boolean;
  remark: string | null;
  createdAt: string;
  createdBy: string;
}

export interface CreatePartBarcodePayload {
  barcode: string;
  isDefault?: boolean;
  remark?: string;
}

export interface UpdatePartBarcodePayload {
  isDefault?: boolean;
  remark?: string | null;
}

/** 掃碼解析結果：found=false 時前端 fallback 料號直比（不破壞既有行為） */
export type ResolveBarcodeResult =
  | { found: false }
  | { found: true; partId: string; partNo: string; partName: string };

export function listPartBarcodes(partId: string): Promise<PartBarcodeRow[]> {
  return apiJson<{ rows: PartBarcodeRow[] }>(`/nx01/parts/${encodeURIComponent(partId)}/barcodes`).then((r) => r.rows);
}

export function createPartBarcode(partId: string, payload: CreatePartBarcodePayload): Promise<PartBarcodeRow> {
  return apiJson(`/nx01/parts/${encodeURIComponent(partId)}/barcodes`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updatePartBarcode(
  partId: string,
  barcodeId: string,
  payload: UpdatePartBarcodePayload,
): Promise<PartBarcodeRow> {
  return apiJson(`/nx01/parts/${encodeURIComponent(partId)}/barcodes/${encodeURIComponent(barcodeId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deletePartBarcode(partId: string, barcodeId: string): Promise<{ ok: boolean }> {
  return apiJson(`/nx01/parts/${encodeURIComponent(partId)}/barcodes/${encodeURIComponent(barcodeId)}`, {
    method: 'DELETE',
  });
}

export function resolveBarcode(code: string): Promise<ResolveBarcodeResult> {
  return apiJson(`/nx01/part-barcode/resolve?code=${encodeURIComponent(code)}`);
}
