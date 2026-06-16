// apps/nx-ui/src/features/nx05/ui/AllowanceWorkbench.tsx
// v1.2 階段 F P5-B (2)：折讓單工作台（list + 主管核可 + 駁回）
//
// 對齊：
//   - 意圖書 E③（折讓需主管核可才生效、防亂打折少收）
//   - approve 後端會自動建 paylog + settlement 沖（不需前端額外動）
'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Plus, RefreshCw, XCircle } from 'lucide-react';

import { cn } from '@design/utils/cn';
import {
  approveAllowance,
  listAllowance,
  rejectAllowance,
  type AllowanceRow,
} from '@data/endpoints/nx05/api';

import { DataTable, PageHeader, StatCard, StatusBadge, fmtDate, fmtMoney } from './common';
import { AllowanceCreateDialog } from './AllowanceCreateDialog';

type Tab = 'all' | 'draft' | 'approved' | 'rejected';

export function AllowanceWorkbench() {
  const [rows, setRows] = useState<AllowanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>('draft'); // 預設 draft = 待核可（主管最關心）
  const [reloadTick, setReloadTick] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void (async () => {
      try {
        const statusFilter = tab === 'draft' ? 'DRAFT' : tab === 'approved' ? 'APPROVED' : tab === 'rejected' ? 'REJECTED' : undefined;
        const res = await listAllowance({ page: 1, pageSize: 100, status: statusFilter });
        if (alive) setRows(res.rows);
      } catch (e) {
        if (alive) setError((e as Error).message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [tab, reloadTick]);

  const handleApprove = useCallback(
    async (row: AllowanceRow) => {
      if (
        !window.confirm(
          `確定核可折讓 ${row.docNo}（${row.allowanceType === 'S' ? '銷貨' : '進貨'}折讓 ${fmtMoney(row.totalAmount)}）？\n\n核可後系統會自動建立沖銷紀錄（paylog + settlement）、直接扣${row.allowanceType === 'S' ? '應收' : '應付'}餘額。\n\n本動作不可復原（核可後不能取消）。`,
        )
      ) {
        return;
      }
      setBusyId(row.id);
      try {
        await approveAllowance(row.id);
        setReloadTick((t) => t + 1);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusyId(null);
      }
    },
    [],
  );

  const handleReject = useCallback(async (row: AllowanceRow) => {
    const reason = window.prompt(
      `駁回折讓 ${row.docNo} 的理由（必填、永久保存作稽核依據）：`,
    );
    if (!reason?.trim()) return;
    setBusyId(row.id);
    try {
      await rejectAllowance(row.id, reason.trim());
      setReloadTick((t) => t + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }, []);

  const draftCount = rows.filter((r) => r.status === 'DRAFT' || r.status === 'D').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="折讓核可"
        subtitle="人工折讓單需主管核可才實際沖銷（防亂打折少收）"
        actions={
          <>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#E8A020]/40 bg-[#E8A020]/12 px-2.5 text-xs font-medium text-[#E8A020] hover:bg-[#E8A020]/20"
            >
              <Plus className="size-3.5" /> 新增折讓
            </button>
            <button
              type="button"
              onClick={() => setReloadTick((t) => t + 1)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#2A2A30] bg-[#0A0A0C] px-2.5 text-xs text-[#B8B8C0] hover:border-[#E8A020]/40 hover:text-[#E8A020]"
            >
              <RefreshCw className="size-3.5" /> 重新整理
            </button>
          </>
        }
      />

      <AllowanceCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => {
          setCreateOpen(false);
          setTab('draft');
          setReloadTick((t) => t + 1);
        }}
      />

      {error ? (
        <div className="rounded-md border border-[#E26060]/40 bg-[#E26060]/10 px-3 py-2 text-xs text-[#E26060]">
          {error}
          <button type="button" onClick={() => setError(null)} className="ml-2 underline">
            關閉
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="本頁總額" value={fmtMoney(rows.reduce((a, r) => a + Number(r.totalAmount || 0), 0))} hint={`${rows.length} 筆`} />
        <StatCard label="待核可 (DRAFT)" value={String(draftCount)} tone={draftCount > 0 ? 'amber' : 'muted'} />
        <StatCard label="當前篩選" value={tab === 'draft' ? '待核可' : tab === 'approved' ? '已核可' : tab === 'rejected' ? '已駁回' : '全部'} />
      </div>

      <section className="space-y-3 rounded-md border border-[#2A2A30] bg-[#0A0A0C]/40 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.18em] text-[#5A5A60]">分類</span>
          {[
            { value: 'draft', label: `待核可 ${draftCount > 0 ? `(${draftCount})` : ''}` },
            { value: 'approved', label: '已核可' },
            { value: 'rejected', label: '已駁回' },
            { value: 'all', label: '全部' },
          ].map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setTab(f.value as Tab)}
              className={cn(
                'rounded-md border px-2 py-1 text-[11px] transition-colors',
                tab === f.value
                  ? 'border-[#E8A020]/60 bg-[#E8A020]/10 text-[#E8A020]'
                  : 'border-[#3A3A42] text-[#888892] hover:border-[#5A5A60]',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <DataTable<AllowanceRow>
          columns={[
            {
              key: 'docNo',
              label: '折讓單號',
              render: (r) => <span className="font-mono text-[#E8E8EB]">{r.docNo}</span>,
            },
            {
              key: 'type',
              label: '方向',
              render: (r) => (
                <span
                  className={cn(
                    'rounded border px-1.5 py-0.5 text-[10px]',
                    r.allowanceType === 'S'
                      ? 'border-[#22D88F]/40 bg-[#22D88F]/8 text-[#22D88F]'
                      : 'border-[#E8A020]/40 bg-[#E8A020]/8 text-[#E8A020]',
                  )}
                >
                  {r.allowanceType === 'S' ? '銷貨' : '進貨'}
                </span>
              ),
            },
            {
              key: 'partnerId',
              label: '對象',
              render: (r) => <span className="font-mono text-[10px]">{r.partnerId}</span>,
            },
            {
              key: 'refId',
              label: '沖哪張',
              render: (r) => (
                <span className="font-mono text-[10px] text-[#888892]">
                  {r.refArId ?? r.refApId ?? '—'}
                </span>
              ),
            },
            {
              key: 'allowanceDate',
              label: '日期',
              render: (r) => fmtDate(r.allowanceDate),
            },
            {
              key: 'totalAmount',
              label: '折讓金額',
              align: 'right',
              render: (r) => <span className="font-mono">{fmtMoney(r.totalAmount)}</span>,
            },
            {
              key: 'status',
              label: '狀態',
              render: (r) => <StatusBadge status={r.status} />,
            },
            {
              key: 'actions',
              label: '操作',
              align: 'right',
              render: (r) => (
                <div className="flex justify-end gap-1">
                  {r.status === 'DRAFT' || r.status === 'D' ? (
                    <>
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => void handleApprove(r)}
                        className={cn(
                          'inline-flex h-6 items-center gap-1 rounded-md border px-2 text-[10px] font-medium',
                          busyId === r.id
                            ? 'cursor-not-allowed border-[#3A3A42] text-[#5A5A60]'
                            : 'border-[#22D88F]/40 bg-[#22D88F]/10 text-[#22D88F] hover:bg-[#22D88F]/20',
                        )}
                        title="主管核可、自動沖銷"
                      >
                        <CheckCircle2 className="size-3" /> 核可
                      </button>
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => void handleReject(r)}
                        className={cn(
                          'inline-flex h-6 items-center gap-1 rounded-md border px-2 text-[10px] font-medium',
                          busyId === r.id
                            ? 'cursor-not-allowed border-[#3A3A42] text-[#5A5A60]'
                            : 'border-[#5A2A2A] bg-[#1F1212] text-[#C84A4A] hover:bg-[#2A1818]',
                        )}
                        title="駁回（需填理由、永久保存）"
                      >
                        <XCircle className="size-3" /> 駁回
                      </button>
                    </>
                  ) : r.status === 'APPROVED' ? (
                    <span className="text-[10px] text-[#22D88F]">已核可、已沖銷</span>
                  ) : (
                    <span className="text-[10px] text-[#5A5A60]">{r.rejectReason ?? '已關閉'}</span>
                  )}
                </div>
              ),
            },
          ]}
          rows={rows}
          loading={loading}
          emptyMessage={tab === 'draft' ? '尚無待核可折讓' : '尚無資料'}
        />
        <p className="text-[10px] text-[#5A5A60]">
          ⚠️ 權限：誰能開折讓 / 誰能核可由客戶自訂角色控制（不寫死、走 RBAC）
        </p>
      </section>
    </div>
  );
}
