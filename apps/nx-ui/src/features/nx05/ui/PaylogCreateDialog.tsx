// apps/nx-ui/src/features/nx05/ui/PaylogCreateDialog.tsx
// v1.2 階段 F P5-B (1)：票據新增 dialog
//
// 對齊意圖書 B + 總經理拍板①「一票對多」：
//   - 4 種付款方式（CASH / TRANSFER / CHECK / CREDIT）
//   - 可勾沖多筆 AR/AP、每筆指定金額（部分沖銷 OK）
//   - 接 POST /nx05/paylog/with-settlements
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Banknote, CreditCard, FileSpreadsheet, X } from 'lucide-react';

import { cn } from '@design/utils/cn';
import { useModalLayer } from '@design/primitives/modal-stack';
import {
  createNoteWithSettlements,
  getPayableView,
  listAr,
  type ApRow,
  type ArRow,
} from '@data/endpoints/nx05/api';
import { listPartner } from '@data/endpoints/shared/master/partner/api/partner';
import type { PartnerDto } from '@data/types/shared/master/partner';

import { fmtMoney } from './common';

type NoteType = 'R' | 'P';
type PayMethod = 'CASH' | 'TRANSFER' | 'CHECK' | 'CREDIT';

const PAY_METHODS: Array<{ value: PayMethod; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { value: 'CASH', label: '現金', icon: Banknote },
  { value: 'TRANSFER', label: '匯款', icon: Banknote },
  { value: 'CHECK', label: '支票', icon: FileSpreadsheet },
  { value: 'CREDIT', label: '信用卡', icon: CreditCard },
];

type SettlementChoice = {
  ledgerId: string; // arId 或 apId
  docNo: string;
  date: string;
  balanceAmount: string;
  checked: boolean;
  settledAmount: string; // 使用者輸入
};

export function PaylogCreateDialog({
  open,
  onClose,
  onSuccess,
  defaultNoteType,
  defaultPartnerId,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (id: string) => void;
  defaultNoteType?: NoteType;
  defaultPartnerId?: string;
}) {
  const [noteType, setNoteType] = useState<NoteType>(defaultNoteType ?? 'R');
  const [partnerId, setPartnerId] = useState<string>(defaultPartnerId ?? '');
  const [partners, setPartners] = useState<PartnerDto[]>([]);
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState<PayMethod>('CASH');
  const [remark, setRemark] = useState('');
  const [ledgerChoices, setLedgerChoices] = useState<SettlementChoice[]>([]);
  const [loadingLedgers, setLoadingLedgers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const layerRef = useRef<HTMLDivElement>(null);
  useModalLayer(layerRef, onClose);

  // 載 partner（依 R/P 篩 partnerType、防呆避免實測選錯對象掛錯帳）
  //   - R 收款 → 客戶 C / 同行 O
  //   - P 付款 → 供應商 S / 一般廠商 V / 物流 T / 銀行 B
  useEffect(() => {
    if (!open) return;
    let alive = true;
    void (async () => {
      try {
        const res = await listPartner({ page: 1, pageSize: 200, isActive: true });
        if (!alive) return;
        const allowed =
          noteType === 'R' ? new Set(['C', 'O']) : new Set(['S', 'V', 'T', 'B']);
        setPartners(res.items.filter((p) => allowed.has(String(p.partnerType).toUpperCase())));
      } catch (e) {
        if (alive) setError((e as Error).message);
      }
    })();
    return () => {
      alive = false;
    };
  }, [open, noteType]);

  // 載對象的未結清 AR（R 收款）或 AP（P 付款）
  useEffect(() => {
    if (!open || !partnerId) {
      setLedgerChoices([]);
      return;
    }
    let alive = true;
    setLoadingLedgers(true);
    void (async () => {
      try {
        if (noteType === 'R') {
          const res = await listAr({ page: 1, pageSize: 100, status: 'OPEN' });
          if (!alive) return;
          // 前端 filter customerId（後端 list 暫無 customerId 過濾、後續軌加 query param）
          const open = res.rows.filter(
            (r: ArRow) => r.customerId === partnerId && Number(r.balanceAmount) > 0,
          );
          setLedgerChoices(
            open.map((r) => ({
              ledgerId: r.id,
              docNo: r.docNo,
              date: r.arDate,
              balanceAmount: r.balanceAmount,
              checked: false,
              settledAmount: '',
            })),
          );
        } else {
          const res = await getPayableView({ status: 'OPEN' });
          if (!alive) return;
          const open = res.ap.filter((r: ApRow & { kind: 'AP' }) => r.supplierId === partnerId && Number(r.balanceAmount) > 0);
          setLedgerChoices(
            open.map((r) => ({
              ledgerId: r.id,
              docNo: r.docNo,
              date: r.apDate,
              balanceAmount: r.balanceAmount,
              checked: false,
              settledAmount: '',
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
  }, [open, partnerId, noteType]);

  // 重設 form（R-P 切換時 partnerId 也清掉，避免上一輪選的對象不在新清單）
  useEffect(() => {
    setPartnerId(defaultPartnerId ?? '');
    setLedgerChoices([]);
  }, [noteType, defaultPartnerId]);

  // 計算總沖銷 / 剩餘
  const stats = useMemo(() => {
    const totalSettled = ledgerChoices
      .filter((c) => c.checked)
      .reduce((acc, c) => acc + (Number(c.settledAmount) || 0), 0);
    const amt = Number(amount) || 0;
    return { totalSettled, remaining: amt - totalSettled, amount: amt };
  }, [ledgerChoices, amount]);

  const toggleCheck = (idx: number) => {
    setLedgerChoices((prev) =>
      prev.map((c, i) => {
        if (i !== idx) return c;
        const willCheck = !c.checked;
        return {
          ...c,
          checked: willCheck,
          // 勾選時自動帶入「剩餘可沖 vs 該筆餘額」較小值
          settledAmount: willCheck
            ? Math.min(stats.remaining > 0 ? stats.remaining : Number(c.balanceAmount), Number(c.balanceAmount)).toFixed(2)
            : '',
        };
      }),
    );
  };

  const updateSettled = (idx: number, v: string) => {
    setLedgerChoices((prev) => prev.map((c, i) => (i === idx ? { ...c, settledAmount: v } : c)));
  };

  // 自動分配剩餘到第一個勾選的
  const autoAllocate = () => {
    setLedgerChoices((prev) => {
      let rest = Number(amount) || 0;
      return prev.map((c) => {
        if (!c.checked) return c;
        const bal = Number(c.balanceAmount);
        const give = Math.min(bal, rest);
        rest -= give;
        return { ...c, settledAmount: give.toFixed(2) };
      });
    });
  };

  const handleSubmit = async () => {
    setError(null);
    if (!partnerId) return setError('請選擇對象');
    if (!amount || Number(amount) <= 0) return setError('請填寫金額（> 0）');
    const checked = ledgerChoices.filter((c) => c.checked);
    if (checked.length === 0) return setError('至少選一筆要沖銷的單據');
    const totalSettled = checked.reduce((acc, c) => acc + (Number(c.settledAmount) || 0), 0);
    if (Math.abs(totalSettled - Number(amount)) > 0.01) {
      return setError(`沖銷總額（${fmtMoney(totalSettled)}）必須 = 收/付款金額（${fmtMoney(amount)}）`);
    }
    setSubmitting(true);
    try {
      const res = await createNoteWithSettlements({
        noteType,
        paymentMethod: payMethod,
        partnerId,
        amount: Number(amount),
        noteDate: date,
        remark: remark.trim() || undefined,
        settlements: checked.map((c) => ({
          ...(noteType === 'R' ? { arId: c.ledgerId } : { apId: c.ledgerId }),
          settledAmount: Number(c.settledAmount),
        })),
      });
      onSuccess(res.paylogId);
      // reset form
      setAmount('');
      setRemark('');
      setLedgerChoices([]);
      setPartnerId('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div ref={layerRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-[#2A2A30] bg-[#0E0E12] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2A2A30] bg-[#11111A] px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-[#E8E8EB]">新增{noteType === 'R' ? '收款' : '付款'}</h2>
            <p className="text-[10px] text-[#5A5A60]">可勾選多張單據沖銷、各自指定金額（一票對多）</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#2A2A30] bg-[#0A0A0C] p-1.5 text-[#888892] hover:border-[#E26060]/40 hover:text-[#E26060]"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {error ? (
            <div className="rounded-md border border-[#E26060]/40 bg-[#E26060]/10 px-3 py-2 text-xs text-[#E26060]">
              {error}
              <button type="button" onClick={() => setError(null)} className="ml-2 underline">
                關閉
              </button>
            </div>
          ) : null}

          {/* 收/付 toggle */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.18em] text-[#5A5A60]">類型</span>
            {(['R', 'P'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setNoteType(t)}
                className={cn(
                  'rounded-md border px-2.5 py-1 text-xs transition-colors',
                  noteType === t
                    ? 'border-[#E8A020]/60 bg-[#E8A020]/10 text-[#E8A020]'
                    : 'border-[#3A3A42] text-[#888892] hover:border-[#5A5A60]',
                )}
              >
                {t === 'R' ? '收款' : '付款'}
              </button>
            ))}
          </div>

          {/* 對象 + 日期 + 金額 + 方式 */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-[0.18em] text-[#5A5A60]">對象</span>
              <select
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value)}
                className="h-9 rounded-md border border-[#2A2A30] bg-[#0A0A0C] px-2 text-xs text-[#E8E8EB] outline-none focus:border-[#E8A020]/60"
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
              <span className="text-[10px] uppercase tracking-[0.18em] text-[#5A5A60]">金額</span>
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
              <span className="text-[10px] uppercase tracking-[0.18em] text-[#5A5A60]">付款方式</span>
              <div className="flex flex-wrap gap-1">
                {PAY_METHODS.map((pm) => (
                  <button
                    key={pm.value}
                    type="button"
                    onClick={() => setPayMethod(pm.value)}
                    className={cn(
                      'inline-flex h-9 items-center gap-1.5 rounded-md border px-2.5 text-xs transition-colors',
                      payMethod === pm.value
                        ? 'border-[#E8A020]/60 bg-[#E8A020]/10 text-[#E8A020]'
                        : 'border-[#3A3A42] text-[#888892] hover:border-[#5A5A60]',
                    )}
                  >
                    <pm.icon className="size-3.5" /> {pm.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-[0.18em] text-[#5A5A60]">備註</span>
            <input
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="（可空）"
              className="h-9 rounded-md border border-[#2A2A30] bg-[#0A0A0C] px-2 text-xs text-[#E8E8EB] outline-none focus:border-[#E8A020]/60"
            />
          </div>

          {/* Settlement 列表 */}
          <div className="space-y-2 rounded-md border border-[#2A2A30] bg-[#0A0A0C]/40 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-semibold text-[#E8E8EB]">
                  選擇要沖銷的{noteType === 'R' ? '應收' : '應付'}單據
                </h3>
                <p className="text-[10px] text-[#5A5A60]">
                  剩餘可沖：
                  <span
                    className={cn(
                      'ml-1 font-mono',
                      stats.remaining === 0
                        ? 'text-[#22D88F]'
                        : stats.remaining > 0
                          ? 'text-[#E8A020]'
                          : 'text-[#E26060]',
                    )}
                  >
                    {fmtMoney(stats.remaining)}
                  </span>
                  <span className="ml-2 text-[#5A5A60]">
                    （已沖 {fmtMoney(stats.totalSettled)} / 金額 {fmtMoney(stats.amount)}）
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={autoAllocate}
                disabled={!amount || ledgerChoices.filter((c) => c.checked).length === 0}
                className={cn(
                  'rounded-md border px-2 py-1 text-[10px] font-medium transition-colors',
                  !amount || ledgerChoices.filter((c) => c.checked).length === 0
                    ? 'cursor-not-allowed border-[#3A3A42] text-[#5A5A60]'
                    : 'border-[#E8A020]/40 bg-[#E8A020]/10 text-[#E8A020] hover:bg-[#E8A020]/20',
                )}
              >
                自動分配剩餘
              </button>
            </div>
            {loadingLedgers ? (
              <div className="py-4 text-center text-xs text-[#5A5A60]">載入中...</div>
            ) : ledgerChoices.length === 0 ? (
              <div className="py-4 text-center text-xs text-[#5A5A60]">
                {partnerId
                  ? `此對象無未結清${noteType === 'R' ? '應收' : '應付'}`
                  : '請先選擇對象'}
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-[#5A5A60]">
                    <th className="w-8" />
                    <th className="py-1 pr-2">單號</th>
                    <th className="py-1 pr-2">日期</th>
                    <th className="py-1 pr-2 text-right">餘額</th>
                    <th className="py-1 pr-2 text-right">沖銷金額</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerChoices.map((c, idx) => (
                    <tr key={c.ledgerId} className="border-t border-[#2A2A30]/60">
                      <td>
                        <input
                          type="checkbox"
                          checked={c.checked}
                          onChange={() => toggleCheck(idx)}
                          className="size-3.5 cursor-pointer"
                        />
                      </td>
                      <td className="py-1.5 pr-2 font-mono">{c.docNo}</td>
                      <td className="py-1.5 pr-2 text-[#888892]">{c.date}</td>
                      <td className="py-1.5 pr-2 text-right font-mono">{fmtMoney(c.balanceAmount)}</td>
                      <td className="py-1.5 pr-2 text-right">
                        {c.checked ? (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={c.balanceAmount}
                            value={c.settledAmount}
                            onChange={(e) => updateSettled(idx, e.target.value)}
                            className="h-7 w-24 rounded border border-[#E8A020]/40 bg-[#0A0A0C] px-1.5 text-right font-mono text-xs text-[#E8A020] outline-none"
                          />
                        ) : (
                          <span className="text-[#5A5A60]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Footer */}
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
                : 'border-[#22D88F]/40 bg-[#22D88F]/12 text-[#22D88F] hover:bg-[#22D88F]/20',
            )}
          >
            {submitting ? '存檔中...' : `確認${noteType === 'R' ? '收款' : '付款'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
