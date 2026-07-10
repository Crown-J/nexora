// apps/nx-ui/src/features/shared/issue-report-trigger/IssueReportTrigger.tsx
// NX04-M3 C6：跨單據問題回報共用觸發按鈕 + modal
// W5-ISSUE-CHAIN Step 5 2026-07-11：孤兒復活 + 升級
//   - 單據外殼改版時掉了掛載點、本輪重掛 QT/SO/SR 詳情（IssueReportModal 直接嵌 toolbar 用）
//   - 料號改「本單明細下拉」（partOptions 由各單據帶入）、庫位改下拉（listLocation）
//   - 拿掉建單時選處置：統一異常鏈拍板「處置分流在異常回報工作區做」（dispose 一鍵開單）
//   - 成功畫面給異常單連結、不露內部表名
//
// 用法（單據詳情 toolbar）：
//   <ToolbarButton icon={AlertTriangle} label="問題回報" onClick={() => setIrOpen(true)} />
//   {irOpen ? <IssueReportModal sourceDocType="SO" sourceDocId={so.id} sourceDocNo={so.docNo}
//               warehouseId={so.warehouseId} partOptions={...} onClose={...} /> : null}

'use client';

import { X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { PartPicker, type PickedPart } from '@/features/nx04/quote/ui/PartPicker';
import { createIssueReport } from '@data/endpoints/shared/issue-report-trigger/api';
import { listLocation } from '@data/endpoints/shared/master/location/api/location';
import type { CreateIssueReportPayload, IssueType, SourceDocType } from '@data/types/shared/issue-report-trigger';
import { ISSUE_TYPE_LABEL, ISSUE_TYPES } from '@data/types/shared/issue-report-trigger';

export type IrPartOption = { partId: string; partNo: string; partName: string };

type LocOpt = { id: string; code: string };

interface ModalProps {
  sourceDocType: SourceDocType;
  sourceDocId: string;
  /** 來源單號（顯示用；不帶就顯示 ID） */
  sourceDocNo?: string;
  warehouseId: string;
  /** 本單明細料號（帶入 = 下拉選；不帶 = PartPicker 搜尋） */
  partOptions?: IrPartOption[];
  defaultPartId?: string;
  onClose: () => void;
}

/** 舊版簡易觸發鈕（自帶按鈕樣式；新殼 toolbar 建議直接嵌 IssueReportModal） */
export function IssueReportTrigger({
  className,
  label = '🚨 問題回報',
  ...modalProps
}: Omit<ModalProps, 'onClose'> & { className?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={className ?? 'rounded border border-rose-300 bg-rose-50 px-3 py-1 text-sm text-rose-900 hover:bg-rose-100'}
      >
        {label}
      </button>
      {open ? <IssueReportModal {...modalProps} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

export function IssueReportModal({
  sourceDocType,
  sourceDocId,
  sourceDocNo,
  warehouseId,
  partOptions,
  defaultPartId,
  onClose,
}: ModalProps) {
  const [issueType, setIssueType] = useState<IssueType>('O');
  const [partId, setPartId] = useState(defaultPartId ?? partOptions?.[0]?.partId ?? '');
  const [pickedPart, setPickedPart] = useState<PickedPart | null>(null);
  const [qty, setQty] = useState('1');
  const [locs, setLocs] = useState<LocOpt[]>([]);
  const [locationId, setLocationId] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; docNo: string } | null>(null);

  const usePartSelect = !!partOptions?.length;
  const needsLocation = issueType === 'L';

  useEffect(() => {
    if (!warehouseId) return;
    void (async () => {
      try {
        const res = await listLocation({ page: 1, pageSize: 200, warehouseId, isActive: true });
        setLocs(res.items.map((l) => ({ id: l.id, code: l.code })));
      } catch {
        /* 撈不到不擋、送出時後端會驗 */
      }
    })();
  }, [warehouseId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const effectivePartId = usePartSelect ? partId : pickedPart?.id ?? '';
    if (!effectivePartId) {
      setErr('請選料號');
      return;
    }
    if (needsLocation && !locationId) {
      setErr('放錯庫位類型、庫位必選');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const payload: CreateIssueReportPayload = {
        sourceDocType,
        sourceDocId,
        partId: effectivePartId,
        qty: Number(qty) || 0,
        issueType,
        warehouseId,
        locationId: locationId || undefined,
        description: description.trim() || undefined,
      };
      const resp = await createIssueReport(payload);
      setCreated(resp);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : '送出失敗');
    } finally {
      setBusy(false);
    }
  }

  const cls = 'w-full rounded border bg-background px-2 py-1 text-sm';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl space-y-4 rounded-xl border border-border bg-card p-5 shadow-2xl" onKeyDown={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold">問題回報</h2>
            <p className="text-xs text-muted-foreground">
              來源單據：<span className="font-mono">{sourceDocNo ?? sourceDocId}</span>
            </p>
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-accent/20" aria-label="關閉">
            <X className="h-4 w-4" />
          </button>
        </div>

        {created ? (
          <div className="space-y-3">
            <div className="rounded border border-emerald-300/60 bg-emerald-500/10 p-4 text-sm">
              ✅ 已建立異常回報單：
              <Link href={`/dashboard/inventory/issue-report/${encodeURIComponent(created.id)}`} className="font-mono text-primary hover:underline">
                {created.docNo}
              </Link>
              <div className="mt-1 text-xs text-muted-foreground">後續處置分流（退廠商 / 保固 / 報廢…）在「異常回報」工作區進行。</div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setCreated(null);
                  setPartId(defaultPartId ?? partOptions?.[0]?.partId ?? '');
                  setPickedPart(null);
                  setQty('1');
                  setLocationId('');
                  setDescription('');
                  setIssueType('O');
                }}
                className="rounded border px-3 py-1.5 text-sm"
              >
                再回報一筆
              </button>
              <button onClick={onClose} className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground">
                關閉
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-xs text-muted-foreground">異常類型 *</span>
                <select value={issueType} onChange={(e) => setIssueType(e.target.value as IssueType)} className={cls} required>
                  {ISSUE_TYPES.map((t) => (
                    <option key={t} value={t}>{ISSUE_TYPE_LABEL[t]}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs text-muted-foreground">數量 *</span>
                <input type="number" step="0.0001" min="0" value={qty} onChange={(e) => setQty(e.target.value)} className={`${cls} tabular-nums`} required />
              </label>
              <div className="text-sm md:col-span-2">
                <span className="mb-1 block text-xs text-muted-foreground">料號 *</span>
                {usePartSelect ? (
                  <select value={partId} onChange={(e) => setPartId(e.target.value)} className={cls} required>
                    {partOptions!.map((p) => (
                      <option key={p.partId} value={p.partId}>{p.partNo}　{p.partName}</option>
                    ))}
                  </select>
                ) : pickedPart ? (
                  <div className="flex items-center gap-2 rounded border border-border/40 bg-muted/30 px-2 py-1 text-sm">
                    <span className="font-mono">{pickedPart.code}</span>
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">{pickedPart.name}</span>
                    <button type="button" onClick={() => setPickedPart(null)} className="rounded p-0.5 hover:bg-accent/20" aria-label="重選料號">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <PartPicker onPick={setPickedPart} autoFocus />
                )}
              </div>
              <label className="text-sm md:col-span-2">
                <span className="mb-1 block text-xs text-muted-foreground">庫位 {needsLocation ? '*（放錯庫位必選）' : '（可空）'}</span>
                <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className={cls} required={needsLocation}>
                  <option value="">（不指定）</option>
                  {locs.map((l) => (
                    <option key={l.id} value={l.id}>{l.code}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm md:col-span-2">
                <span className="mb-1 block text-xs text-muted-foreground">說明（詳細描述、誰反映、發現時間…）</span>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={`${cls} resize-y`} />
              </label>
            </div>
            {err ? <div className="rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs">{err}</div> : null}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} className="rounded border px-4 py-1.5 text-sm">取消</button>
              <button type="submit" disabled={busy} className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground disabled:opacity-50">
                {busy ? '送出中…' : '送出問題回報'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
