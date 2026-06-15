// apps/nx-ui/src/features/nx02/rfq-greeting-template/api/rfq-greeting-template.ts
// LITE 階段 1 M3：詢價客套話設定 API client（每租戶 1:1）

import { apiFetch } from '@data/api/client';
import { assertOk } from '@data/api/http';

const BASE = '/nx02/rfq-greeting-template';

export type RfqGreetingTemplateDto = {
  id: string;
  tenantId: string;
  greetingContent: string;
  closingContent: string;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
};

export type UpdateRfqGreetingTemplateBody = Partial<{
  greetingContent: string;
  closingContent: string;
  isActive: boolean;
}>;

export async function getRfqGreetingTemplate(): Promise<RfqGreetingTemplateDto> {
  const res = await apiFetch(BASE, { method: 'GET' });
  await assertOk(res, 'nxui_nx02_rfq_greeting_get');
  return res.json() as Promise<RfqGreetingTemplateDto>;
}

export async function updateRfqGreetingTemplate(body: UpdateRfqGreetingTemplateBody): Promise<RfqGreetingTemplateDto> {
  const res = await apiFetch(BASE, { method: 'PATCH', body: JSON.stringify(body) });
  await assertOk(res, 'nxui_nx02_rfq_greeting_update');
  return res.json() as Promise<RfqGreetingTemplateDto>;
}

export async function generateRfqInquiryText(rfqId: string): Promise<{ text: string }> {
  const res = await apiFetch(`/nx02/rfq/${encodeURIComponent(rfqId)}/inquiry-text`, { method: 'GET' });
  await assertOk(res, 'nxui_nx02_rfq_inquiry_text');
  return res.json() as Promise<{ text: string }>;
}
