// apps/nx-ui/src/features/inventory/workstation/stocktake/MobileStocktakeScanPage.tsx
// 庫存中心 · 盤點掃條碼模式（手機版）
//
// v1.2 階段 G P6：接 nx03/stocktake、共用 BarcodeScanner（P5 元件）
//
// 業務流程（blueprint §10.3「盤點：點進去掃條碼 / 點數量 → 系統算差異」）：
// 1. 載 stocktake detail（含 items + systemQty 系統庫存）
// 2. 「掃條碼」開 BarcodeScanner
// 3. 掃到 → 比對 partNo/partId → 命中 item → 開數量輸入 dialog
// 4. 輸入實盤數 → PATCH item.countedQty + (optional) varianceReasonCode
// 5. 差異 = countedQty − systemQty（後端 service 自動算 diffQty）
// 6. items 表格顯示每項 systemQty / countedQty / diffQty
//
// 範式：
// - 進入掃條碼前若 status=DRAFT 自動 PATCH → COUNTING
// - 連續掃模式（onScan 回 true）
// - 數量輸入 inline dialog（不全螢幕、保持流暢）
// - 完成核可流程（送審 / 過帳）留給桌面 detail view

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle, RotateCcw, ScanBarcode, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { cx } from '@design/utils/cx';

import {
  ensureCountingStatus,
  getStocktake,
  patchStocktakeItem,
  type StocktakeDetail,
  type StocktakeItem,
} from '@data/endpoints/inventory/workstation/api';

import { BarcodeScanner } from '../shared/BarcodeScanner';
import { DocStatusBadge, type DocStatusTone } from '../shared/DocStatusBadge';

const STATUS_LABEL = {
  DRAFT: '待開始',
  COUNTING: '盤點中',
  ADJUSTING: '調整中',
  POSTED: '已過帳',
  CANCELLED: '已取消',
} as const;

const STATUS_TONE: Record<string, DocStatusTone> = {
  DRAFT: 'warn',
  COUNTING: 'info',
  ADJUSTING: 'info',
  POSTED: 'success',
  CANCELLED: 'muted',
};

const REASON_LABEL: Record<'S' | 'M' | 'B' | 'U', string> = {
  S: '被偷',
  M: '算錯',
  B: '破損',
  U: '不明',
};

function CountedBadge({ item }: { item: StocktakeItem }) {
  if (item.countedQty == null) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-white/40">
        <Circle className="size-3" /> 未盤
      </span>
    );
  }
  const diff = item.diffQty != null ? Number(item.diffQty) : 0;
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px]',
        diff === 0
          ? 'bg-[#1D9E75]/15 text-[#1D9E75]'
          : diff > 0
            ? 'bg-[#4D8FE8]/15 text-[#4D8FE8]'
            : 'bg-[#E26060]/15 text-[#E26060]',
      )}
    >
      <CheckCircle2 className="size-3" />
      實盤 {item.countedQty} {diff !== 0 ? `(差 ${diff > 0 ? '+' : ''}${diff})` : '(零差異)'}
    </span>
  );
}

interface CountInputDialogProps {
  item: StocktakeItem;
  busy: boolean;
  onClose: () => void;
  onSubmit: (countedQty: number, reason?: 'S' | 'M' | 'B' | 'U') => void;
}

function CountInputDialog({ item, busy, onClose, onSubmit }: CountInputDialogProps) {
  const initial = item.countedQty != null ? String(item.countedQty) : String(item.systemQty);
  const [value, setValue] = useState(initial);
  const [reason, setReason] = useState<'S' | 'M' | 'B' | 'U' | ''>(item.varianceReasonCode ?? '');

  const parsed = Number.parseFloat(value);
  const isValid = Number.isFinite(parsed) && parsed >= 0;
  const diff = isValid ? parsed - Number(item.systemQty) : 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-end lg:hidden">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full rounded-t-2xl border-t border-[#2A2A30] bg-[#0E0E12] p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <div className="mb-3 flex items-center justify-between">
          <div className="min-w-0">
            <div className="font-mono text-xs text-white/40">{item.partNo ?? item.partId}</div>
            <div className="truncate text-sm font-semibold text-white">{item.partName ?? '—'}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉"
            className="rounded p-1 text-white/60 hover:bg-white/10"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="mb-3 text-xs text-white/60">
          系統庫存：<span className="font-mono text-white/80">{item.systemQty}</span>
        </div>

        <label className="mb-1 block text-[10px] uppercase tracking-[0.18em] text-white/40">
          實際盤點數量
        </label>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step="0.0001"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded-md border border-white/15 bg-black/50 px-3 py-2.5 text-base text-white outline-none focus:border-[#E8A020]/60"
        />

        {isValid && diff !== 0 ? (
          <>
            <div
              className={cx(
                'mt-2 rounded px-2 py-1.5 text-xs',
                diff > 0
                  ? 'bg-[#4D8FE8]/15 text-[#4D8FE8]'
                  : 'bg-[#E26060]/15 text-[#E26060]',
              )}
            >
              差異 {diff > 0 ? '+' : ''}
              {diff.toFixed(4)}
            </div>

            <label className="mt-3 mb-1 block text-[10px] uppercase tracking-[0.18em] text-white/40">
              差異原因（建議填寫）
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {(['S', 'M', 'B', 'U'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(reason === r ? '' : r)}
                  className={cx(
                    'rounded border px-2 py-1.5 text-xs transition-colors',
                    reason === r
                      ? 'border-[#E8A020]/60 bg-[#E8A020]/10 text-[#E8A020]'
                      : 'border-white/15 text-white/60 hover:border-white/30',
                  )}
                >
                  {REASON_LABEL[r]}
                </button>
              ))}
            </div>
          </>
        ) : null}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 rounded border border-white/15 px-3 py-2.5 text-sm text-white/70 hover:border-white/30 disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => isValid && onSubmit(parsed, reason || undefined)}
            disabled={!isValid || busy}
            className="flex-1 rounded bg-[#1D9E75] px-3 py-2.5 text-sm text-black hover:bg-[#1D9E75]/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? '儲存中…' : '儲存'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function MobileStocktakeScanPage({ id }: { id: string }) {
  const router = useRouter();
  const [stk, setStk] = useState<StocktakeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  /** 當前彈出 count 輸入 dialog 的 item id */
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getStocktake(id);
      setStk(data);
      // 自動 DRAFT → COUNTING（讓 items 可編）
      await ensureCountingStatus(data.id, data.status);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleScan = useCallback(
    (decodedText: string): boolean => {
      if (!stk) return false;
      const trimmed = decodedText.trim();
      const hit = stk.items.find((it) => it.partNo === trimmed || it.partId === trimmed);
      if (!hit) {
        setScanFeedback({ ok: false, message: `找不到對應品項：${trimmed}` });
        return true;
      }
      setScanFeedback({ ok: true, message: `命中：${hit.partNo ?? hit.partId} ${hit.partName ?? ''}` });
      setEditingItemId(hit.id);
      return false; // 命中 → 關掃描器、進入輸入 dialog
    },
    [stk],
  );

  const handleSubmitCount = useCallback(
    async (countedQty: number, reason?: 'S' | 'M' | 'B' | 'U') => {
      if (!stk || !editingItemId) return;
      setBusy(true);
      setError(null);
      try {
        await patchStocktakeItem(stk.id, editingItemId, {
          countedQty,
          varianceReasonCode: reason,
        });
        setEditingItemId(null);
        await load();
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [stk, editingItemId, load],
  );

  const stats = useMemo(() => {
    if (!stk) return { total: 0, counted: 0, mismatch: 0 };
    const total = stk.items.length;
    let counted = 0;
    let mismatch = 0;
    for (const it of stk.items) {
      if (it.countedQty != null) {
        counted++;
        if (it.diffQty != null && Number(it.diffQty) !== 0) mismatch++;
      }
    }
    return { total, counted, mismatch };
  }, [stk]);

  if (loading) {
    return <div className="p-4 text-center text-xs text-white/50">載入中…</div>;
  }
  if (error && !stk) {
    return (
      <div className="space-y-3 p-4">
        <div className="rounded-md border border-[#E26060]/40 bg-[#E26060]/10 px-3 py-2 text-xs text-[#E26060]">
          {error}
        </div>
        <button
          type="button"
          onClick={() => router.push('/dashboard/inventory/stocktake')}
          className="text-xs text-[#E8A020] hover:underline"
        >
          ← 返回盤點清單
        </button>
      </div>
    );
  }
  if (!stk) return null;

  const editingItem = editingItemId ? stk.items.find((it) => it.id === editingItemId) ?? null : null;
  const isLocked =
    stk.status === 'POSTED' || stk.status === 'CANCELLED';

  return (
    <div className="space-y-4 p-4 pb-[calc(env(safe-area-inset-bottom)+5rem)]">
      <header className="space-y-2">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push(`/dashboard/inventory/stocktake/${stk.id}`)}
            aria-label="返回詳情"
            className="rounded p-1 text-white/70 hover:bg-white/10"
          >
            <X className="size-5" />
          </button>
          <DocStatusBadge tone={STATUS_TONE[stk.status] ?? 'muted'}>
            {STATUS_LABEL[stk.status as keyof typeof STATUS_LABEL] ?? stk.status}
          </DocStatusBadge>
        </div>
        <div>
          <div className="font-mono text-base text-white">{stk.docNo}</div>
          <div className="text-xs text-white/50">
            {stk.stockTakeDate.slice(0, 10)} · 共 {stats.total} 項
          </div>
        </div>
      </header>

      {error ? (
        <div className="rounded-md border border-[#E26060]/40 bg-[#E26060]/10 px-3 py-2 text-xs text-[#E26060]">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded border border-white/10 bg-white/5 p-2">
          <div className="text-[10px] text-white/40">總項目</div>
          <div className="text-base font-semibold text-white tabular-nums">{stats.total}</div>
        </div>
        <div className="rounded border border-white/10 bg-white/5 p-2">
          <div className="text-[10px] text-white/40">已盤</div>
          <div className="text-base font-semibold text-[#1D9E75] tabular-nums">{stats.counted}</div>
        </div>
        <div className="rounded border border-white/10 bg-white/5 p-2">
          <div className="text-[10px] text-white/40">差異</div>
          <div
            className={cx(
              'text-base font-semibold tabular-nums',
              stats.mismatch > 0 ? 'text-[#E8A020]' : 'text-white/40',
            )}
          >
            {stats.mismatch}
          </div>
        </div>
      </div>

      {!isLocked ? (
        <button
          type="button"
          onClick={() => {
            setScanFeedback(null);
            setScannerOpen(true);
          }}
          className="inline-flex w-full items-center justify-center gap-2 rounded bg-[#E8A020] px-3 py-3 text-sm text-black transition-colors hover:bg-[#E8A020]/90"
        >
          <ScanBarcode className="size-5" />
          掃條碼盤點
        </button>
      ) : (
        <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/50">
          盤點單已 {STATUS_LABEL[stk.status as keyof typeof STATUS_LABEL]}、不可修改
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

      <ul className="space-y-2">
        {stk.items.map((it) => (
          <li key={it.id}>
            <button
              type="button"
              onClick={() => !isLocked && setEditingItemId(it.id)}
              disabled={isLocked}
              className={cx(
                'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                it.countedQty != null
                  ? 'border-[#1D9E75]/20 bg-[#1D9E75]/5'
                  : 'border-white/10 bg-white/5 hover:border-white/20',
                isLocked && 'cursor-not-allowed opacity-70',
              )}
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-mono text-xs text-white/40">{it.partNo ?? it.partId.slice(0, 8)}</span>
                  <span className="min-w-0 flex-1 truncate text-white/80">{it.partName ?? '—'}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[10px] text-white/50 tabular-nums">
                  <span>系統 {it.systemQty}</span>
                  <CountedBadge item={it} />
                  {it.varianceReasonCode ? (
                    <span className="text-[10px] text-white/40">
                      原因：{REASON_LABEL[it.varianceReasonCode]}
                    </span>
                  ) : null}
                </div>
              </div>
              <RotateCcw className="size-4 shrink-0 text-white/30" aria-hidden />
            </button>
          </li>
        ))}
      </ul>

      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScan}
        title="掃描盤點品項"
      />

      {editingItem ? (
        <CountInputDialog
          item={editingItem}
          busy={busy}
          onClose={() => setEditingItemId(null)}
          onSubmit={handleSubmitCount}
        />
      ) : null}
    </div>
  );
}
