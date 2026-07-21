// apps/nx-ui/src/features/nx01/partner/partner-zoned/PartnerAccountSection.tsx
// 往來帳戶衛星分區（帳戶閘門規格 v1.3 Step 3c、2026-07-21 執行長拍板）
//
// 三張卡：R 收款帳戶（可銷售）/ P 進貨付款帳戶（可採購、採購域權限）/ T 調貨付款帳戶（同行）。
// 動作（editing 模式）：開戶（R=統編+外籍後門、P=銀行三欄、T=一鍵）、停用/啟用、P 銀行資訊編輯。
// 待補件（needsBackfill）＝祖父條款遷移戶：R=統編未補、P=銀行未補 → 琥珀徽章提醒。
// P 戶對無採購權限者：後端 PA-004 擋、前端把錯誤原樣顯示（貨源隔離、不特別遮卡）。
'use client';

import { useCallback, useEffect, useState } from 'react';
import { CircleDollarSign, Landmark, PowerOff, Power, Repeat } from 'lucide-react';

import { cn } from '@design/utils/cn';
import {
  listPartnerAccounts,
  openPartnerAccount,
  patchPartnerAccount,
  type AccountDirection,
  type PartnerAccount,
} from '@data/endpoints/shared/master/partner/api/partner-account';

const DIR_META: Record<AccountDirection, { label: string; hint: string; Icon: typeof CircleDollarSign }> = {
  R: { label: '收款帳戶', hint: '可銷售／報價（他付我）', Icon: CircleDollarSign },
  P: { label: '進貨付款帳戶', hint: '可採購／進貨（我付他、採購域）', Icon: Landmark },
  T: { label: '調貨付款帳戶', hint: '可同行調貨（軋帳/現結、免銀行）', Icon: Repeat },
};

export function PartnerAccountSection({
  partnerId,
  editing,
  partnerType,
  canTransferStock,
}: {
  partnerId: string | null;
  editing: boolean;
  partnerType: string;
  canTransferStock: boolean;
}) {
  const [data, setData] = useState<{ taxId: string | null; isCashCustomer: boolean; accounts: PartnerAccount[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [openForm, setOpenForm] = useState<AccountDirection | null>(null);
  // 開戶表單欄位
  const [taxId, setTaxId] = useState('');
  const [foreignTax, setForeignTax] = useState(false);
  const [bankName, setBankName] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [bankAccountNo, setBankAccountNo] = useState('');
  const [accountHolder, setAccountHolder] = useState('');

  const reload = useCallback(async () => {
    if (!partnerId) {
      setData(null);
      return;
    }
    try {
      const r = await listPartnerAccounts(partnerId);
      setData({ taxId: r.taxId, isCashCustomer: r.isCashCustomer, accounts: r.accounts });
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '帳戶載入失敗');
    }
  }, [partnerId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (!partnerId) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-xs text-muted-foreground">
        往來帳戶：建檔完成後管理（新建對象由系統依身分自動開戶）
      </div>
    );
  }

  const acctOf = (d: AccountDirection) => data?.accounts.find((a) => a.direction === d);
  // T 卡只對同行身分顯示；散客/現金客戶提示不需開戶
  const dirs: AccountDirection[] = partnerType === 'O' || canTransferStock ? ['R', 'P', 'T'] : ['R', 'P'];

  const doOpen = async (direction: AccountDirection) => {
    setBusy(true);
    setErr(null);
    try {
      await openPartnerAccount(partnerId, {
        direction,
        ...(direction === 'R' ? { taxId: taxId.trim() || undefined, foreignTaxId: foreignTax || undefined } : {}),
        ...(direction === 'P'
          ? { bankName: bankName.trim(), bankCode: bankCode.trim() || undefined, bankAccountNo: bankAccountNo.trim(), accountHolder: accountHolder.trim() }
          : {}),
      });
      setOpenForm(null);
      setTaxId('');
      setForeignTax(false);
      setBankName('');
      setBankCode('');
      setBankAccountNo('');
      setAccountHolder('');
      await reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '開戶失敗');
    } finally {
      setBusy(false);
    }
  };

  const doToggle = async (acct: PartnerAccount) => {
    setBusy(true);
    setErr(null);
    try {
      await patchPartnerAccount(acct.id, { status: acct.status === 'A' ? 'S' : 'A' });
      await reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '狀態切換失敗');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">往來帳戶</span>
        <span>交易資格閘門：有收款戶才能賣、有進貨付款戶才能買、有調貨戶才能同行調貨</span>
        {data?.isCashCustomer ? (
          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-500">現金客戶：免收款帳戶可銷售</span>
        ) : null}
      </div>
      {err ? <div className="rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs text-destructive">{err}</div> : null}
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
        {dirs.map((d) => {
          const meta = DIR_META[d];
          const acct = acctOf(d);
          const active = acct?.status === 'A';
          return (
            <div
              key={d}
              className={cn(
                'rounded-lg border px-3 py-2 text-xs',
                active ? 'border-[#22D88F]/30 bg-[#22D88F]/5' : 'border-border/60 bg-background/40',
              )}
            >
              <div className="flex items-center gap-1.5">
                <meta.Icon size={13} className={active ? 'text-[#22D88F]' : 'text-muted-foreground'} />
                <span className="font-medium">{meta.label}</span>
                <span
                  className={cn(
                    'ml-auto rounded px-1.5 py-0.5 text-[10px]',
                    active ? 'bg-[#22D88F]/15 text-[#22D88F]' : acct ? 'bg-muted/40 text-muted-foreground' : 'bg-muted/20 text-muted-foreground',
                  )}
                >
                  {active ? '啟用中' : acct ? '已停用' : '未開戶'}
                </span>
              </div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">{meta.hint}</div>
              {acct?.needsBackfill ? (
                <div className="mt-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-500">
                  待補件：{d === 'R' ? '統編未補（主檔財務區補統編）' : '銀行帳號未補'}
                </div>
              ) : null}
              {d === 'R' && data ? (
                <div className="mt-1 font-mono text-[10px] text-muted-foreground">統編：{data.taxId || '—'}</div>
              ) : null}
              {d === 'P' && acct ? (
                <div className="mt-1 text-[10px] text-muted-foreground">
                  {acct.bankName || '—'} {acct.bankCode ? `(${acct.bankCode})` : ''} {acct.bankAccountNo || ''}
                  {acct.accountHolder ? `／${acct.accountHolder}` : ''}
                </div>
              ) : null}

              {editing ? (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {acct ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void doToggle(acct)}
                      className="inline-flex items-center gap-1 rounded border border-border/60 px-2 py-1 text-[11px] hover:bg-muted/30 disabled:opacity-50"
                    >
                      {active ? <PowerOff size={11} /> : <Power size={11} />}
                      {active ? '停用' : '啟用'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => (d === 'T' ? void doOpen('T') : setOpenForm(openForm === d ? null : d))}
                      className="rounded border border-[#22D88F]/40 bg-[#22D88F]/10 px-2 py-1 text-[11px] text-[#22D88F] hover:bg-[#22D88F]/20 disabled:opacity-50"
                    >
                      {d === 'T' ? '一鍵開戶' : '開戶'}
                    </button>
                  )}
                </div>
              ) : null}

              {editing && openForm === d && d === 'R' ? (
                <div className="mt-2 space-y-1.5">
                  <input
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder={data?.taxId ? `統編（既有 ${data.taxId}）` : '統編 8 碼 *'}
                    className="w-full rounded border border-border/60 bg-background px-2 py-1 font-mono text-[11px]"
                  />
                  <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <input type="checkbox" checked={foreignTax} onChange={(e) => setForeignTax(e.target.checked)} />
                    外籍／特殊統編（跳過 8 碼檢核）
                  </label>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void doOpen('R')}
                    className="rounded bg-primary px-2 py-1 text-[11px] text-primary-foreground disabled:opacity-50"
                  >
                    確認開戶
                  </button>
                </div>
              ) : null}

              {editing && openForm === d && d === 'P' ? (
                <div className="mt-2 space-y-1.5">
                  <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="銀行名稱 *" className="w-full rounded border border-border/60 bg-background px-2 py-1 text-[11px]" />
                  <div className="flex gap-1.5">
                    <input value={bankCode} onChange={(e) => setBankCode(e.target.value)} placeholder="代碼" className="w-16 rounded border border-border/60 bg-background px-2 py-1 font-mono text-[11px]" />
                    <input value={bankAccountNo} onChange={(e) => setBankAccountNo(e.target.value)} placeholder="銀行帳號 *" className="flex-1 rounded border border-border/60 bg-background px-2 py-1 font-mono text-[11px]" />
                  </div>
                  <input value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} placeholder="戶名 *" className="w-full rounded border border-border/60 bg-background px-2 py-1 text-[11px]" />
                  <button
                    type="button"
                    disabled={busy || !bankName.trim() || !bankAccountNo.trim() || !accountHolder.trim()}
                    onClick={() => void doOpen('P')}
                    className="rounded bg-primary px-2 py-1 text-[11px] text-primary-foreground disabled:opacity-50"
                  >
                    確認開戶
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
