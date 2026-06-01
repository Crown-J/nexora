// apps/nx-ui/src/features/nx05/ui/ClosingWorkbench.tsx
// v1.2 階段 F P4：關帳作業頁（含 401 雙月一期預覽 + 上報旗標）
'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarCheck, Download, FileCheck, FilePlus, RefreshCw } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  createClosing,
  export401Txt,
  listClosing,
  markClosingFiled,
  patchClosingStatus,
  previewPeriod401,
  type ClosingRow,
  type Period401Preview,
} from '@/features/nx05/api';

import {
  DataTable,
  PageHeader,
  StatCard,
  StatusBadge,
  currentYearPeriod,
  fmtDate,
  fmtMoney,
  ypLabel,
} from './common';

export function ClosingWorkbench() {
  const [closings, setClosings] = useState<ClosingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedYp, setSelectedYp] = useState<string>(currentYearPeriod());
  const [preview, setPreview] = useState<Period401Preview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  // 載關帳列表
  useEffect(() => {
    let alive = true;
    setLoading(true);
    void (async () => {
      try {
        const res = await listClosing({ page: 1, pageSize: 24 });
        if (alive) setClosings(res.rows);
      } catch (e) {
        if (alive) setError((e as Error).message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [reloadTick]);

  // 載 401 期預覽
  const loadPreview = useCallback(async (yp: string) => {
    setPreviewLoading(true);
    try {
      const res = await previewPeriod401(yp);
      setPreview(res);
    } catch (e) {
      setError((e as Error).message);
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPreview(selectedYp);
  }, [selectedYp, loadPreview, reloadTick]);

  // 建立當月關帳（以當月最後一日）
  const handleCreateClosing = useCallback(async () => {
    const today = new Date();
    // service 會 normalize 到月底、傳入今日即可
    const dateStr = today.toISOString().slice(0, 10);
    try {
      await createClosing({ closingDate: dateStr });
      setReloadTick((t) => t + 1);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  // 月關帳（CLOSING → CLOSED）
  const handleClose = useCallback(async (row: ClosingRow) => {
    setBusyId(row.id);
    try {
      if (row.status === 'OPEN') {
        await patchClosingStatus(row.id, { status: 'CLOSING' });
      }
      await patchClosingStatus(row.id, { status: 'CLOSED' });
      setReloadTick((t) => t + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }, []);

  // 解鎖（CLOSED → REOPENED、期未上報才允許）
  const handleReopen = useCallback(async (row: ClosingRow) => {
    const reason = window.prompt('解除關帳原因（必填、永久保存）：');
    if (!reason?.trim()) return;
    setBusyId(row.id);
    try {
      await patchClosingStatus(row.id, { status: 'REOPENED', reopenReason: reason.trim() });
      setReloadTick((t) => t + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }, []);

  // 下載 401 TXT 兩檔（fixed-width 媒體申報檔 + 主表）
  const handleDownloadTxt = useCallback(async () => {
    try {
      const res = await export401Txt(selectedYp);
      const downloadBase64 = (base64: string, filename: string) => {
        const binStr = atob(base64);
        const bytes = new Uint8Array(binStr.length);
        for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
        const blob = new Blob([bytes], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      };
      downloadBase64(res.mediaContent, res.mediaFileName);
      downloadBase64(res.mainContent, res.mainFileName);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [selectedYp]);

  // 標記 401 已上報
  const handleMarkFiled = useCallback(async (row: ClosingRow) => {
    if (
      !window.confirm(
        `確定標記 401 期 ${row.reportPeriod ?? '?'} 已上報？\n整期（兩個月）將鎖死、不可再修改。`,
      )
    ) {
      return;
    }
    setBusyId(row.id);
    try {
      await markClosingFiled(row.id);
      setReloadTick((t) => t + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="關帳作業 + 401 申報"
        subtitle="月關帳（內部控管）+ 401 雙月一期產出（法定營業稅）"
        actions={
          <>
            <button
              type="button"
              onClick={() => setReloadTick((t) => t + 1)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#2A2A30] bg-[#0A0A0C] px-2.5 text-xs text-[#B8B8C0] hover:border-[#E8A020]/40 hover:text-[#E8A020]"
            >
              <RefreshCw className="size-3.5" /> 重新整理
            </button>
            <button
              type="button"
              onClick={handleCreateClosing}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#E8A020]/40 bg-[#E8A020]/12 px-2.5 text-xs font-medium text-[#E8A020] hover:bg-[#E8A020]/20"
            >
              <FilePlus className="size-3.5" /> 建立當月關帳
            </button>
          </>
        }
      />

      {error ? (
        <div className="rounded-md border border-[#E26060]/40 bg-[#E26060]/10 px-3 py-2 text-xs text-[#E26060]">
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-2 underline hover:text-[#FF8C8C]"
          >
            關閉
          </button>
        </div>
      ) : null}

      {/* 401 期切換 + 預覽 */}
      <section className="space-y-3 rounded-md border border-[#2A2A30] bg-[#0A0A0C]/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[#E8E8EB]">401 期彙整預覽</h2>
            <p className="text-[10px] text-[#5A5A60]">
              一年 6 期、雙月一期；單數月 15 號前申報前期兩個月資料
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.18em] text-[#5A5A60]">期碼</span>
            <input
              value={selectedYp}
              onChange={(e) => setSelectedYp(e.target.value)}
              placeholder="YYYY-EE"
              className="h-8 w-28 rounded-md border border-[#2A2A30] bg-[#0A0A0C] px-2 font-mono text-xs text-[#E8E8EB] outline-none focus:border-[#E8A020]/60"
            />
            <button
              type="button"
              onClick={() => void loadPreview(selectedYp)}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-[#2A2A30] bg-[#0A0A0C] px-2 text-xs text-[#B8B8C0] hover:border-[#E8A020]/40 hover:text-[#E8A020]"
            >
              預覽
            </button>
            <button
              type="button"
              onClick={() => void handleDownloadTxt()}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-[#22D88F]/40 bg-[#22D88F]/12 px-2.5 text-xs font-medium text-[#22D88F] hover:bg-[#22D88F]/20"
              title="產出 401 媒體申報 TXT 兩檔（{統編}.TXT 進銷項資料 + {統編}.TET_U 主表）"
            >
              <Download className="size-3.5" /> 下載 TXT
            </button>
          </div>
        </div>

        {previewLoading ? (
          <div className="py-6 text-center text-xs text-[#5A5A60]">載入中...</div>
        ) : preview ? (
          <div className="space-y-3">
            <div className="text-xs text-[#B8B8C0]">
              <span className="font-mono text-[#E8A020]">{ypLabel(preview.reportPeriod)}</span>
              <span className="ml-2 text-[#5A5A60]">
                · 期間：{fmtDate(preview.startDate)} ~ {fmtDate(preview.endDate)}
              </span>
              {preview.filed ? (
                <span className="ml-2 inline-flex items-center gap-1 rounded border border-[#22D88F]/40 bg-[#22D88F]/10 px-1.5 py-0.5 text-[10px] text-[#22D88F]">
                  <FileCheck className="size-3" /> 已上報
                </span>
              ) : preview.readyToFile ? (
                <span className="ml-2 inline-flex items-center gap-1 rounded border border-[#E8A020]/40 bg-[#E8A020]/10 px-1.5 py-0.5 text-[10px] text-[#E8A020]">
                  可標記上報
                </span>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="銷售總額" value={fmtMoney(preview.sales.gross)} hint={`SO ${preview.sales.soCount} 筆`} />
              <StatCard
                label="銷售退回"
                value={fmtMoney(preview.sales.return)}
                tone="muted"
                hint={`SR ${preview.sales.srCount} 筆`}
              />
              <StatCard label="進貨總額" value={fmtMoney(preview.purchase.gross)} hint={`RR ${preview.purchase.rrCount} 筆`} />
              <StatCard
                label="進貨退回"
                value={fmtMoney(preview.purchase.return)}
                tone="muted"
                hint={`PR ${preview.purchase.prCount} 筆`}
              />
              <StatCard label="銷項淨額" value={fmtMoney(preview.sales.net)} tone="green" />
              <StatCard label="進項淨額" value={fmtMoney(preview.purchase.net)} tone="green" />
              <StatCard
                label="應納稅額"
                value={fmtMoney(preview.taxPayable)}
                tone={Number(preview.taxPayable) >= 0 ? 'amber' : 'red'}
                hint="銷項 - 進項（基礎版、未拆 5%）"
              />
              <StatCard label="該期關帳" value={`${preview.closings.length}/2 筆`} tone={preview.readyToFile ? 'green' : 'muted'} />
            </div>
            <p className="text-[10px] text-[#5A5A60]">{preview.note}</p>
          </div>
        ) : null}
      </section>

      {/* 關帳列表 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#E8E8EB]">關帳記錄</h2>
          <span className="text-[10px] text-[#5A5A60]">每月限一筆、closingDate 統一指向月底</span>
        </div>
        <DataTable<ClosingRow>
          columns={[
            {
              key: 'docNo',
              label: '關帳單號',
              render: (r) => <span className="font-mono text-[#E8E8EB]">{r.docNo}</span>,
            },
            {
              key: 'closingDate',
              label: '關帳日',
              render: (r) => <span>{fmtDate(r.closingDate)}</span>,
            },
            {
              key: 'reportPeriod',
              label: '401 期',
              render: (r) => <span className="font-mono text-[#E8A020]">{r.reportPeriod ?? '—'}</span>,
            },
            {
              key: 'status',
              label: '狀態',
              render: (r) => <StatusBadge status={r.status} />,
            },
            {
              key: 'reportFiledAt',
              label: '401 上報',
              render: (r) =>
                r.reportFiledAt ? (
                  <span className="inline-flex items-center gap-1 text-[#22D88F]">
                    <CalendarCheck className="size-3" /> {fmtDate(r.reportFiledAt)}
                  </span>
                ) : (
                  <span className="text-[#5A5A60]">未上報</span>
                ),
            },
            {
              key: 'actions',
              label: '操作',
              align: 'right',
              render: (r) => (
                <div className="flex flex-wrap justify-end gap-1">
                  {r.status === 'OPEN' || r.status === 'CLOSING' ? (
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => void handleClose(r)}
                      className={cn(
                        'inline-flex h-6 items-center rounded-md border px-2 text-[10px] font-medium',
                        busyId === r.id
                          ? 'cursor-not-allowed border-[#3A3A42] text-[#5A5A60]'
                          : 'border-[#E8A020]/40 bg-[#E8A020]/10 text-[#E8A020] hover:bg-[#E8A020]/20',
                      )}
                    >
                      執行關帳
                    </button>
                  ) : null}
                  {r.status === 'CLOSED' && !r.reportFiledAt ? (
                    <>
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => void handleMarkFiled(r)}
                        className={cn(
                          'inline-flex h-6 items-center gap-1 rounded-md border px-2 text-[10px] font-medium',
                          busyId === r.id
                            ? 'cursor-not-allowed border-[#3A3A42] text-[#5A5A60]'
                            : 'border-[#22D88F]/40 bg-[#22D88F]/10 text-[#22D88F] hover:bg-[#22D88F]/20',
                        )}
                      >
                        <FileCheck className="size-3" /> 標記 401 已上報
                      </button>
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => void handleReopen(r)}
                        className={cn(
                          'inline-flex h-6 items-center rounded-md border px-2 text-[10px] font-medium',
                          busyId === r.id
                            ? 'cursor-not-allowed border-[#3A3A42] text-[#5A5A60]'
                            : 'border-[#5A2A2A] bg-[#1F1212] text-[#C84A4A] hover:bg-[#2A1818]',
                        )}
                      >
                        解除關帳
                      </button>
                    </>
                  ) : null}
                  {r.reportFiledAt ? (
                    <span className="text-[10px] text-[#22D88F]">已上報、整期鎖死</span>
                  ) : null}
                </div>
              ),
            },
          ]}
          rows={closings}
          loading={loading}
          emptyMessage="尚無關帳記錄、按「建立當月關帳」開始"
        />
      </section>
    </div>
  );
}
