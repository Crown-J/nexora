// apps/nx-ui/src/features/nx02/qt/api/qt.ts
// M3-redo-3b：詢價回報（Qt）API client

import { apiFetch } from '@/shared/api/client';
import { assertOk } from '@/shared/api/http';

export type QtRow = {
  id: string;
  tenantId: string;
  rfqId: string;
  inquiryPartnerId: string;
  quotedPrice: number | string;
  quotedQuantity: number | string;
  leadDays: number | null;
  status: 'P' | 'A' | 'R';
  notes: string | null;
  rejectReason: string | null;
  createdAt: string;
  inquiryPartner?: { code: string; name: string; partnerType: string };
};

export type ListQuotesByRfqResponse = {
  rfqId: string;
  rfqDocNo: string;
  rfqType: 'G' | 'P';
  quotes: QtRow[];
};

export type CreateQtBody = {
  rfqId: string;
  inquiryPartnerId: string;
  quotedPrice: number;
  quotedQuantity: number;
  leadDays?: number | null;
  notes?: string;
};

export async function listQuotesByRfq(rfqId: string): Promise<ListQuotesByRfqResponse> {
  const res = await apiFetch(`/nx02/rfq/${encodeURIComponent(rfqId)}/quotes`, { method: 'GET' });
  await assertOk(res, 'nxui_nx02_qt_list_by_rfq');
  return res.json() as Promise<ListQuotesByRfqResponse>;
}

export async function createQt(body: CreateQtBody): Promise<QtRow> {
  const res = await apiFetch('/nx02/qt', { method: 'POST', body: JSON.stringify(body) });
  await assertOk(res, 'nxui_nx02_qt_create');
  return res.json() as Promise<QtRow>;
}

/** M3-redo-3b-2：adoptQt return shape 對齊 backend 分流（rfqType='G' 建 PO / 'P' 建 TI） */
export type AdoptQtResult = {
  qtId: string;
  rfqId: string;
  tiId: string | null;
  tiDocNo: string | null;
  poId: string | null;
  poDocNo: string | null;
  createdDocKind: 'TI' | 'PO';
  rejectedSiblingCount: number;
  linkedSoItemId: string | null;
};

export async function adoptQt(qtId: string): Promise<AdoptQtResult> {
  const res = await apiFetch(`/nx02/qt/${encodeURIComponent(qtId)}/adopt`, { method: 'POST', body: '{}' });
  await assertOk(res, 'nxui_nx02_qt_adopt');
  return res.json() as Promise<AdoptQtResult>;
}

export async function rejectQt(qtId: string, rejectReason: string): Promise<{ ok: boolean }> {
  const res = await apiFetch(`/nx02/qt/${encodeURIComponent(qtId)}/reject`, {
    method: 'POST',
    body: JSON.stringify({ rejectReason }),
  });
  await assertOk(res, 'nxui_nx02_qt_reject');
  return res.json() as Promise<{ ok: boolean }>;
}
