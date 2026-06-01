// apps/nx-ui/src/features/nx05/ui/AllowanceCreateDialog.tsx
// v1.2 階段 F P5-B (2)：人工開折讓 DRAFT dialog
//
// 對齊意圖書 E③ + 總經理拍板「折讓需主管核可才生效」：
//   - 開單只是建 DRAFT、approve 才實際沖銷
//   - 銷貨折讓（S）→ 必填 refArId（沖該筆應收）
//   - 進貨折讓（P）→ 必填 refApId（沖該筆應付）
//
// 點外不關（防誤關）、submit 後 reload
'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  createAllowanceManual,
  getPayableView,
  listAr,
  type ApRow,
  type ArRow,
} from '@/features/nx05/api';
import { listPartner } from '@/features/shared/master/partner/api/partner';
import type { PartnerDto } from '@/features/shared/master/partner/types';

import { fmtMoney } from './common';

export function AllowanceCreateDialog({
  open,
  onClose,
  onSuccess,
  defaultType,
  defaultPartnerId,
  defaultRefId,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (id: string) => void;
  defaultType?: 'S' | 'P';
  defaultPartnerId?: string;
  defaultRefId?: string; // arId or apId 預填
}) {
  const [allowanceType, setAllowanceType] = useState<'S' | 'P'>(defaultType ?? 'S');
  const [partnerId, setPartnerId] = useState<string>(defaultPartnerId ?? '');
  const [partners, setPartners] = useState<PartnerDto[]>([]);
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState<string>('');
  const [refId, setRefId] = useState<string>(defaultRefId ?? ''); // arId 或 apId
  const [ledgers, setLedgers] = useState<Array<{ id: string; docNo: string; balanceAmount: string }>>([]);
  const [loadingLedgers, setLoadingLedgers] = useState(false);
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 載 partner（依 S/P 過濾、防呆）
  useEffect(() => {
    if (!open) return;
    let alive = true;
    void (async () => {
      try {
        const res = await listPartner({ page: 1, pageSize: 200, isActive: true });
        if (!alive) return;
        const allowed =
          allowanceType === 'S' ? new Set(['C', 'O']) : new Set(['S', 'V', 'T', 'B']);
        setPartners(res.items.filter((p) => allowed.has(String(p.partnerType).toUpperCase())));
      } catch (e) {
        if (alive) setError((e as Error).message);
      }
    })();
    return () => {
      alive = false;
    };
  }, [open, allowanceType]);

  // 切 S/P 時 reset partnerId + refId（避免不在新清單）
  useEffect(() => {
    if (!defaultType) {
      setPartnerId(defaultPartnerId ?? '');
      setRefId(defaultRefId ?? '');
      setLedgers([]);
    }
  }, [allowanceType, defaultType, defaultPartnerId, defaultRefId]);

  // 載對象未結清 ledger（S=AR / P=AP）
  useEffect(() => {
    if (!open || !partnerId) {
      setLedgers([]);
      return;
    }
    let alive = true;
    setLoadingLedgers(true);
    void (async () => {
      try {
        if (allowanceType === 'S') {
          const res = await listAr({ page: 1, pageSize: 100, status: 'OPEN' });
          if (!alive) return;
          const open = res.rows.filter(
            (r: ArRow) => r.customerId === partnerId && Number(r.balanceAmount) > 0,
          );
          setLedgers(
            open.map((r) => ({
              id: r.id,
              docNo: r.docNo,
              balanceAmount: r.balanceAmount,
            })),
          );
        } else {
          const res = await getPayableView({ status: 'OPEN' });
          if (!alive) return;
          const open = res.ap.filter(
            (r: ApRow & { kind: 'AP' }) => r.supplierId === partnerId && Number(r.balanceAmount) > 0,
          );
          setLedgers(
            open.map((r) => ({
              id: r.id,
              docNo: r.docNo,
              balanceAmount: r.balanceAmount,
            })),
          );
        }
      } catch (e) {
        if (alive) setError((e as Error).message);
      } finally {
        if (alive) setLoadingLedgers(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [open, partnerId, allowanceType]);

  const handleSubmit = async () => {
    setError(null);
    if (!partnerId) return setError('請選擇對象');
    if (!amount || Number(amount) <= 0) return setError('請填寫折讓金額（> 0）');
    if (!refId) {
      return setError(allowanceType === 'S' ? '請選沖哪張應收' : '請選沖哪張應付');
    }
    setSubmitting(true);
    try {
      const res = await createAllowanceManual({
        allowanceType,
        partnerId,
        allowanceDate: date,
        totalAmount: Number(amount),
        refArId: allowanceType === 'S' ? refId : undefined,
        refApId: allowanceType === 'P' ? refId : undefined,
        remark: remark.trim() || undefined,
      });
      onSuccess(res.id);
      setAmount('');
      setRemark('');
      setRefId('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-[#2A2A30] bg-[#0E0E12] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#2A2A30] bg-[#11111A] px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-[#E8E8EB]">
              新增{allowanceType === 'S' ? '銷貨' : '進貨'}折讓單
            </h2>
            <p className="text-[10px] text-[#5A5A60]">
              建立後狀態為 DRAFT、待主管核可才實際沖{allowanceType === 'S' ? '應收' : '應付'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#2A2A30] bg-[#0A0A0C] p-1.5 text-[#888892] hover:border-[#E26060]/40 hover:text-[#E26060]"
          >
            <X className="size-3.5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {error ? (
            <div className="rounded-md border border-[#E26060]/40 bg-[#E26060]/10 px-3 py-2 text-xs text-[#E26060]">
              {error}
              <button type="button" onClick={() => setError(null)} className="ml-2 underline">
                關閉
              </button>
            </div>
          ) : null}

          {/* type 切換（defaultType 鎖定時不可改） */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.18em] text-[#5A5A60]">折讓方向</span>
            {(['S', 'P'] as const).map((t) => (
              <button
                key={t}
                type="button"
                disabled={!!defaultType}
                onClick={() => setAllowanceType(t)}
                className={cn(
                  'rounded-md border px-2.5 py-1 text-xs transition-colors',
                  allowanceType === t
                    ? 'border-[#E8A020]/60 bg-[#E8A020]/10 text-[#E8A020]'
                    : 'border-[#3A3A42] text-[#888892] hover:border-[#5A5A60]',
                  defaultType && allowanceType !== t && 'cursor-not-allowed opacity-40',
                )}
              >
                {t === 'S' ? '銷貨折讓（沖應收）' : '進貨折讓（沖應付）'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-[0.18em] text-[#5A5A60]">對象</span>
              <select
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value)}
                disabled={!!defaultPartnerId}
                className="h-9 rounded-md border border-[#2A2A30] bg-[#0A0A0C] px-2 text-xs text-[#E8E8EB] outline-none focus:border-[#E8A020]/60 disabled:opacity-60"
              >
                <option value="">— 請選擇 —</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} · {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-[0.18em] text-[#5A5A60]">日期</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-9 rounded-md border border-[#2A2A30] bg-[#0A0A0C] px-2 text-xs text-[#E8E8EB] outline-none focus:border-[#E8A020]/60"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-[0.18em] text-[#5A5A60]">折讓金額</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="h-9 rounded-md border border-[#2A2A30] bg-[#0A0A0C] px-2 font-mono text-sm text-[#E8E8EB] outline-none focus:border-[#E8A020]/60"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-[0.18em] text-[#5A5A60]">
                沖哪張{allowanceType === 'S' ? '應收' : '應付'}
              </span>
              <select
                value={refId}
                onChange={(e) => setRefId(e.target.value)}
                className="h-9 rounded-md border border-[#2A2A30] bg-[#0A0A0C] px-2 text-xs text-[#E8E8EB] outline-none focus:border-[#E8A020]/60"
              >
                <option value="">
                  {loadingLedgers ? '載入中...' : partnerId ? `— 請選擇（${ledgers.length} 筆）—` : '請先選對象'}
                </option>
                {ledgers.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.docNo} · 餘額 {fmtMoney(l.balanceAmount)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-[0.18em] text-[#5A5A60]">備註</span>
            <input
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="（可空、建議寫明折讓原因）"
              className="h-9 rounded-md border border-[#2A2A30] bg-[#0A0A0C] px-2 text-xs text-[#E8E8EB] outline-none focus:border-[#E8A020]/60"
            />
          </div>

          <div className="rounded-md border border-[#E8A020]/30 bg-[#E8A020]/8 px-3 py-2 text-xs text-[#E8A020]">
            ⚠️ 建立後狀態為 <span className="font-mono">DRAFT</span>、需主管至「折讓核可」頁面按「核可」才實際沖
            {allowanceType === 'S' ? '應收' : '應付'}並扣餘額。
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[#2A2A30] bg-[#11111A] px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-[#3A3A42] bg-[#0A0A0C] px-3 py-1.5 text-xs text-[#B8B8C0] hover:border-[#5A5A60]"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className={cn(
              'inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium',
              submitting
                ? 'cursor-not-allowed border-[#3A3A42] text-[#5A5A60]'
                : 'border-[#E8A020]/40 bg-[#E8A020]/12 text-[#E8A020] hover:bg-[#E8A020]/20',
            )}
          >
            {submitting ? '建立中...' : '建立 DRAFT 折讓單'}
          </button>
        </div>
      </div>
    </div>
  );
}
