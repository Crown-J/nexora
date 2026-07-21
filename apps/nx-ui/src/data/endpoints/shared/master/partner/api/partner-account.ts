// apps/nx-ui/src/data/endpoints/shared/master/partner/api/partner-account.ts
// 往來帳戶 API client（帳戶閘門規格 v1.3 Step 3b、2026-07-21）
// R=收款帳戶（統編）/ P=進貨付款帳戶（採購域）/ T=調貨付款帳戶（同行、輕量）

import { apiFetch } from '@data/api/client';
import { assertOk } from '@data/api/http';

export type AccountDirection = 'R' | 'P' | 'T';

export type PartnerAccount = {
  id: string;
  partnerId: string;
  direction: AccountDirection;
  status: 'A' | 'S';
  bankName: string | null;
  bankCode: string | null;
  bankAccountNo: string | null;
  accountHolder: string | null;
  needsBackfill: boolean;
  openedAt: string;
  openedBy: string;
  updatedAt: string;
};

export type PartnerAccountsResponse = {
  partnerId: string;
  taxId: string | null;
  isCashCustomer: boolean;
  accounts: PartnerAccount[];
};

export async function listPartnerAccounts(partnerId: string): Promise<PartnerAccountsResponse> {
  const res = await apiFetch(`/nx01/partners/${encodeURIComponent(partnerId)}/accounts`, { method: 'GET' });
  await assertOk(res, 'nxui_partner_account_list_001');
  return (await res.json()) as PartnerAccountsResponse;
}

export async function openPartnerAccount(
  partnerId: string,
  payload: {
    direction: AccountDirection;
    taxId?: string;
    foreignTaxId?: boolean;
    bankName?: string;
    bankCode?: string;
    bankAccountNo?: string;
    accountHolder?: string;
  },
): Promise<PartnerAccount> {
  const res = await apiFetch(`/nx01/partners/${encodeURIComponent(partnerId)}/accounts`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  await assertOk(res, 'nxui_partner_account_open_001');
  return (await res.json()) as PartnerAccount;
}

export async function patchPartnerAccount(
  accountId: string,
  payload: { status?: 'A' | 'S'; bankName?: string; bankCode?: string; bankAccountNo?: string; accountHolder?: string },
): Promise<PartnerAccount> {
  const res = await apiFetch(`/nx01/partner-accounts/${encodeURIComponent(accountId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  await assertOk(res, 'nxui_partner_account_patch_001');
  return (await res.json()) as PartnerAccount;
}

/** 從 API 錯誤訊息抽 PA-xxx 閘門碼（未開戶偵測 → 一鍵開戶）。 */
export function parsePaCode(err: unknown): string | null {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  const m = /\[?(PA-\d{3})\]?/.exec(msg);
  return m ? m[1] : null;
}
