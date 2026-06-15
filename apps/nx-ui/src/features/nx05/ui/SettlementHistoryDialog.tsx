// apps/nx-ui/src/features/nx05/ui/SettlementHistoryDialog.tsx
// v1.2 階段 F P5-B (4)：AR/AP 沖銷歷史 dialog
//
// 業務語意：使用者追溯「這張單怎麼被沖掉的」
//   - 列出所有 settlement、含 paylog 單號 / 日期 / 方式 / 沖銷金額 / 備註
//   - 摘要：原始金額 / 已沖總額 / 剩餘餘額
'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  listApSettlements,
  listArSettlements,
  type SettlementsResult,
} from '@data/endpoints/nx05/api';

import { fmtDate, fmtMoney, StatCard, StatusBadge } from './common';

const PM_LABEL: Record<string, string> = {
  CA: '現金',
  TT: '匯款',
  CK: '支票',
  CR: '信用卡',
  AL: '折讓沖銷',
};

const PT_LABEL: Record<string, string> = {
  CR: '客戶收款',
  CP: '廠商付款',
  RR: '廠商退款',
  RC: '客戶退款',
  EX: '費用支出',
};

export function SettlementHistoryDialog({
  open,
  onClose,
  kind,
  ledgerId,
  ledgerDocNo,
}: {
  open: boolean;
  onClose: () => void;
  kind: 'AR' | 'AP' | null;
  ledgerId: string | null;
  ledgerDocNo: string | null;
}) {
  const [data, setData] = useState<SettlementsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !ledgerId || !kind) {
      setData(null);
      return;
    }
    let alive = true;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const res = kind === 'AR' ? await listArSettlements(ledgerId) : await listApSettlements(ledgerId);
        if (alive) setData(res);
      } catch (e) {
        if (alive) setError((e as Error).message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [open, ledgerId, kind]);

  if (!open || !ledgerId || !kind) return null;

  const ledgerLabel = kind === 'AR' ? '應收' : '應付';
  const balanceNum = data ? Number(data.balanceAmount) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-[#2A2A30] bg-[#0E0E12] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2A2A30] bg-[#11111A] px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-[#E8E8EB]">
              {ledgerLabel}帳款 {ledgerDocNo} 沖銷歷史
            </h2>
            <p className="text-[10px] text-[#5A5A60]">追溯每一筆沖銷、看這張單怎麼被沖掉的</p>
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
            </div>
          ) : null}

          {loading ? (
            <div className="py-8 text-center text-xs text-[#5A5A60]">載入中...</div>
          ) : data ? (
            <>
              {/* 摘要卡 */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatCard label="原始金額" value={fmtMoney(data.originalAmount)} hint={`${ledgerLabel} ${ledgerDocNo}`} />
                <StatCard
                  label={kind === 'AR' ? '已收總額' : '已付總額'}
                  value={fmtMoney(data.totalSettled)}
                  tone="green"
                  hint={`沖 ${data.rows.length} 次`}
                />
                <StatCard
                  label="剩餘餘額"
                  value={fmtMoney(data.balanceAmount)}
                  tone={balanceNum === 0 ? 'green' : balanceNum > 0 ? 'amber' : 'red'}
                  hint={balanceNum === 0 ? '已沖完' : balanceNum > 0 ? '未沖完' : '溢沖'}
                />
              </div>

              {/* settlement 列表 */}
              {data.rows.length === 0 ? (
                <div className="rounded-md border border-dashed border-[#2A2A30] bg-[#0A0A0C]/30 px-4 py-12 text-center text-xs text-[#5A5A60]">
                  尚無沖銷紀錄
                </div>
              ) : (
                <div className="overflow-x-auto rounded-md border border-[#2A2A30] bg-[#0A0A0C]/30">
                  <table className="w-full text-xs">
                    <thead className="bg-[#11111A]">
                      <tr>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-[#888892]">
                          收/付款單號
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-[#888892]">
                          日期
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-[#888892]">
                          類型
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-[#888892]">
                          方式
                        </th>
                        <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-[#888892]">
                          沖銷金額
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-[#888892]">
                          沖銷時間
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.rows.map((s) => (
                        <tr key={s.id} className="border-t border-[#2A2A30]/60 hover:bg-[#11111A]/60">
                          <td className="px-3 py-2 font-mono text-[#E8E8EB]">{s.paylogDocNo}</td>
                          <td className="px-3 py-2 text-[#888892]">{fmtDate(s.paylogPayDate)}</td>
                          <td className="px-3 py-2">
                            <StatusBadge status={PT_LABEL[s.paylogPayType] ?? s.paylogPayType} />
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={cn(
                                'inline-flex rounded border px-1.5 py-0.5 text-[10px]',
                                s.paylogPayMethod === 'AL'
                                  ? 'border-[#E8A020]/40 bg-[#E8A020]/8 text-[#E8A020]'
                                  : 'border-[#3A3A42] bg-[#1A1A1F] text-[#B8B8C0]',
                              )}
                            >
                              {PM_LABEL[s.paylogPayMethod] ?? s.paylogPayMethod}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-[#22D88F]">
                            {fmtMoney(s.settledAmount)}
                          </td>
                          <td className="px-3 py-2 text-[10px] text-[#5A5A60]">
                            {fmtDate(s.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 備註行 */}
              {data.rows.some((r) => r.remark) ? (
                <div className="rounded-md border border-[#2A2A30] bg-[#0A0A0C]/30 p-3">
                  <h3 className="mb-2 text-[10px] uppercase tracking-[0.12em] text-[#888892]">沖銷備註</h3>
                  <div className="space-y-1 text-xs">
                    {data.rows
                      .filter((r) => r.remark)
                      .map((r) => (
                        <div key={r.id} className="flex gap-2 text-[#B8B8C0]">
                          <span className="font-mono text-[#5A5A60]">{r.paylogDocNo}：</span>
                          <span>{r.remark}</span>
                        </div>
                      ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[#2A2A30] bg-[#11111A] px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#3A3A42] bg-[#0A0A0C] px-3 py-1.5 text-xs text-[#B8B8C0] hover:border-[#5A5A60]"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}
