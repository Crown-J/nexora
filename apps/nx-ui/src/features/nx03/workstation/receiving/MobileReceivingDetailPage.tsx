// apps/nx-ui/src/features/inventory/workstation/receiving/MobileReceivingDetailPage.tsx
// 庫存中心 · 驗收詳情（手機版、掃條碼模式）
//
// v1.2 階段 G P5：接 nx03/inbound + Q1 html5-qrcode 掃條碼
//
// 流程：
// 1. 載 inbound detail（含 items）
// 2. 顯示 line items 清單、每項有「待驗 / 已驗」狀態（前端 local state）
// 3. 「掃條碼」按鈕開 BarcodeScanner
// 4. 掃到 → 比對 partNo（或 partId）→ 標記為已驗
// 5. 「完成驗收」按鈕：sequential PATCH DRAFT→INSPECTING→POSTED
//    （即使沒掃完所有 item 也可手動完成、後端 service 不要求逐項 verified）

'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Circle, ScanBarcode, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { cx } from '@design/utils/cx';

import {
  completeReceiving,
  getInbound,
  type InboundDetail,
} from '@data/endpoints/nx03/workstation/api';

import { BarcodeScanner } from '../shared/BarcodeScanner';
import { DocStatusBadge, type DocStatusTone } from '../shared/DocStatusBadge';

const STATUS_LABEL = {
  DRAFT: '待驗收',
  INSPECTING: '驗收中',
  POSTED: '已入庫',
  REJECTED: '已拒收',
  CANCELLED: '已取消',
} as const;

const STATUS_TONE: Record<string, DocStatusTone> = {
  DRAFT: 'warn',
  INSPECTING: 'info',
  POSTED: 'success',
  REJECTED: 'muted',
  CANCELLED: 'muted',
};

export function MobileReceivingDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const [inb, setInb] = useState<InboundDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** 前端 local state：哪些 item 已掃條碼 / 已點確認 */
  const [verifiedSet, setVerifiedSet] = useState<Set<string>>(new Set());
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getInbound(id);
      setInb(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Scanner 回調：比對 partNo / partId、命中標記
  const handleScan = useCallback(
    (decodedText: string): boolean => {
      if (!inb) return false;
      const trimmed = decodedText.trim();
      const hit = inb.items.find(
        (it) => it.partNo === trimmed || it.partId === trimmed,
      );
      if (!hit) {
        setScanFeedback({ ok: false, message: `找不到對應品項：${trimmed}` });
        return true; // 繼續掃
      }
      setVerifiedSet((prev) => {
        const next = new Set(prev);
        next.add(hit.id);
        return next;
      });
      setScanFeedback({ ok: true, message: `已驗收：${hit.partNo ?? hit.partId} ${hit.partName ?? ''}` });
      return true; // 繼續掃（連續掃多項）
    },
    [inb],
  );

  const handleToggle = useCallback((itemId: string) => {
    setVerifiedSet((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }, []);

  const handleComplete = useCallback(async () => {
    if (!inb) return;
    setBusy(true);
    setError(null);
    try {
      await completeReceiving(inb.id, inb.status);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [inb, load]);

  if (loading) {
    return (
      <div className="p-4 text-center text-xs text-white/50">載入中…</div>
    );
  }
  if (error && !inb) {
    return (
      <div className="space-y-3 p-4">
        <div className="rounded-md border border-[#E26060]/40 bg-[#E26060]/10 px-3 py-2 text-xs text-[#E26060]">
          {error}
        </div>
        <button
          type="button"
          onClick={() => router.push('/dashboard/inventory/receiving')}
          className="text-xs text-[#E8A020] hover:underline"
        >
          ← 返回驗收清單
        </button>
      </div>
    );
  }
  if (!inb) return null;

  const isClosed = inb.status === 'POSTED' || inb.status === 'REJECTED' || inb.status === 'CANCELLED';
  const verifiedCount = verifiedSet.size;
  const totalCount = inb.items.length;

  return (
    <div className="space-y-4 p-4 pb-[calc(env(safe-area-inset-bottom)+5rem)]">
      <header className="space-y-2">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push('/dashboard/inventory/receiving')}
            aria-label="返回"
            className="rounded p-1 text-white/70 hover:bg-white/10"
          >
            <X className="size-5" />
          </button>
          <DocStatusBadge tone={STATUS_TONE[inb.status] ?? 'muted'}>
            {STATUS_LABEL[inb.status as keyof typeof STATUS_LABEL] ?? inb.status}
          </DocStatusBadge>
        </div>
        <div>
          <div className="font-mono text-base text-white">{inb.docNo}</div>
          <div className="text-xs text-white/50">
            {inb.inboundDate.slice(0, 10)} · 共 {totalCount} 項
          </div>
        </div>
      </header>

      {error ? (
        <div className="rounded-md border border-[#E26060]/40 bg-[#E26060]/10 px-3 py-2 text-xs text-[#E26060]">
          {error}
        </div>
      ) : null}

      {!isClosed ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setScanFeedback(null);
              setScannerOpen(true);
            }}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded bg-[#E8A020] px-3 py-2.5 text-sm text-black transition-colors hover:bg-[#E8A020]/90"
          >
            <ScanBarcode className="size-4" />
            掃條碼
          </button>
          <button
            type="button"
            onClick={handleComplete}
            disabled={busy}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded bg-[#1D9E75] px-3 py-2.5 text-sm text-black transition-colors hover:bg-[#1D9E75]/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCircle2 className="size-4" />
            {busy ? '入庫中…' : '完成驗收'}
          </button>
        </div>
      ) : (
        <div className="rounded-md border border-[#1D9E75]/40 bg-[#1D9E75]/10 px-3 py-2 text-xs text-[#1D9E75]">
          已入庫、無法再修改
        </div>
      )}

      {scanFeedback ? (
        <div
          className={cx(
            'rounded-md border px-3 py-2 text-xs',
            scanFeedback.ok
              ? 'border-[#1D9E75]/40 bg-[#1D9E75]/10 text-[#1D9E75]'
              : 'border-[#E26060]/40 bg-[#E26060]/10 text-[#E26060]',
          )}
        >
          {scanFeedback.message}
        </div>
      ) : null}

      <div className="text-xs text-white/50 tabular-nums">
        已驗 {verifiedCount} / {totalCount} 項
      </div>

      <ul className="space-y-2">
        {inb.items.map((it) => {
          const verified = verifiedSet.has(it.id);
          return (
            <li key={it.id}>
              <button
                type="button"
                onClick={() => !isClosed && handleToggle(it.id)}
                disabled={isClosed}
                className={cx(
                  'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                  verified
                    ? 'border-[#1D9E75]/40 bg-[#1D9E75]/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20',
                  isClosed && 'cursor-not-allowed opacity-70',
                )}
              >
                {verified ? (
                  <CheckCircle2 className="size-5 shrink-0 text-[#1D9E75]" />
                ) : (
                  <Circle className="size-5 shrink-0 text-white/30" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-mono text-white/40">{it.partNo ?? it.partId.slice(0, 8)}</span>
                    <span className="truncate text-white/80">{it.partName ?? '—'}</span>
                  </div>
                  <div className="text-xs text-white/50 tabular-nums">數量 {it.qty}</div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScan}
        title="掃描驗收品項"
      />
    </div>
  );
}
