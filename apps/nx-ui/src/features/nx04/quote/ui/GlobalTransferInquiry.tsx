// apps/nx-ui/src/features/nx04/quote/ui/GlobalTransferInquiry.tsx
// F5 全域即時調貨詢價視窗（執行長 2026-07-12 拍板）：
//   F2 報價流 Alt+D 加進來的「調貨詢價清單」在這消化——掛掉客戶電話後、照清單打給同行、
//   Enter 對選中料記一筆詢價（走既有 nx-instant-inquiry 事件 → InstantInquiryDialog）、
//   選中料下方帶出近期同行詢價紀錄（比價參考）。Delete 移除、清單存本機（localStorage）。
//   ⚠️ F5 攔掉瀏覽器重新整理（Ctrl+R 仍可用）——鍵盤優先 ERP 的取捨、執行長拍板。
'use client';

import { PhoneCall, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { listInquiryRecords } from '@data/endpoints/nx04/record/api/record';
import type { InquiryRecord } from '@data/types/nx04/record';
import { FocusLockedDialog } from '@design/primitives/focus-locked-dialog';

import {
  clearTransferItems,
  listTransferItems,
  removeTransferItem,
  TRANSFER_LIST_EVENT,
  type TransferInquiryItem,
} from './transfer-inquiry-store';

const fmtNt = (n: number) =>
  n < 100 && n !== Math.floor(n) ? n.toFixed(2) : n.toLocaleString('zh-TW', { maximumFractionDigits: 0 });

export function GlobalTransferInquiry() {
  const [open, setOpen] = useState(false);

  // F5 toggle（capture＋preventDefault：攔瀏覽器整頁重新整理）
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'F5' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        setOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', h, true);
    return () => document.removeEventListener('keydown', h, true);
  }, []);

  if (!open) return null;
  return <TransferInquiryDialog onClose={() => setOpen(false)} />;
}

function TransferInquiryDialog({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<TransferInquiryItem[]>(() => listTransferItems());
  const [sel, setSel] = useState(0);
  const [recent, setRecent] = useState<InquiryRecord[] | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const recReqRef = useRef(0);

  // 清單跨視窗同步（F2 Alt+D 加入時、詢價紀錄存檔後回來也會刷新）
  useEffect(() => {
    const sync = () => setItems(listTransferItems());
    window.addEventListener(TRANSFER_LIST_EVENT, sync);
    return () => window.removeEventListener(TRANSFER_LIST_EVENT, sync);
  }, []);

  useEffect(() => {
    if (sel >= items.length) setSel(Math.max(0, items.length - 1));
  }, [items.length, sel]);

  // 選中料 → 近期同行詢價紀錄（比價參考、近 5 筆）
  const cur = items[sel];
  useEffect(() => {
    if (!cur) {
      setRecent(null);
      return;
    }
    const myReq = ++recReqRef.current;
    setRecent(null);
    void (async () => {
      try {
        const r = await listInquiryRecords({ partNo: cur.code, pageSize: 5 });
        if (recReqRef.current === myReq) setRecent(r.items);
      } catch {
        if (recReqRef.current === myReq) setRecent([]);
      }
    })();
  }, [cur?.partId]); // eslint-disable-line react-hooks/exhaustive-deps

  // 鍵盤：↑↓ 選料、Enter 記詢價（開既有即時詢價對話框）、Delete 移除
  useEffect(() => {
    const el = listRef.current;
    el?.focus();
  }, []);

  const fireInquiry = (it: TransferInquiryItem) => {
    window.dispatchEvent(
      new CustomEvent('nx-instant-inquiry', {
        detail: { partId: it.partId, code: it.code, name: it.name },
      }),
    );
  };

  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (items.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSel((i) => Math.min(items.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSel((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (cur) fireInquiry(cur);
    } else if (e.key === 'Delete') {
      e.preventDefault();
      if (cur) removeTransferItem(cur.partId);
    }
  };

  return (
    <FocusLockedDialog
      open
      onClose={onClose}
      ariaLabel="即時調貨詢價"
      backdropClassName="bg-black/55 backdrop-blur-sm animate-in fade-in duration-200"
      dialogClassName="flex flex-col rounded-2xl border border-border/60 bg-popover text-foreground shadow-[0_24px_70px_rgba(0,0,0,0.55),0_0_50px_-18px_rgba(232,160,32,0.22)] animate-in fade-in zoom-in-95 duration-200"
      dialogStyle={{ width: 'min(860px, 96vw)', height: 'min(640px, 92vh)' }}
    >
      <>
        <div className="flex items-center gap-2.5 border-b border-border/40 px-6 py-3">
          <span className="size-2 rounded-full bg-primary shadow-[0_0_10px_#02EDAB]" />
          <PhoneCall className="size-[18px] text-primary" />
          <h2 className="text-[15px] font-semibold tracking-wide">即時調貨詢價</h2>
          <span className="text-[12px] text-muted-foreground">清單 {items.length} 顆・打給同行、問到價就記</span>
          <span className="ml-auto text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/65">
            F5 · TRANSFER INQUIRY
          </span>
          <button
            type="button"
            onClick={onClose}
            className="ml-1 rounded-md border border-border/40 bg-background/40 p-1 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            aria-label="關閉"
          >
            <X className="size-3.5" />
          </button>
        </div>

        <div
          ref={listRef}
          tabIndex={0}
          onKeyDown={onKey}
          className="min-h-0 flex-1 space-y-3 overflow-auto px-6 py-4 outline-none"
        >
          {items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              調貨清單是空的——在 F2 報價主視窗用 <kbd className="rounded border border-border/50 bg-muted/40 px-1 font-mono text-[11px]">Space</kbd> 標記缺貨料、
              <kbd className="rounded border border-border/50 bg-muted/40 px-1 font-mono text-[11px]">Alt+D</kbd> 加進來
            </div>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead className="bg-muted text-xs text-muted-foreground">
                <tr>
                  <th className="px-2 py-1.5 text-left">料號／品名</th>
                  <th className="w-28 px-2 py-1.5 text-right">加入時間</th>
                  <th className="w-32 px-2 py-1.5 text-right">動作</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr
                    key={it.partId}
                    onClick={() => setSel(i)}
                    className={`cursor-pointer border-b border-border/40 last:border-b-0 ${
                      i === sel ? 'bg-primary/[0.08] shadow-[inset_3px_0_0_var(--primary)]' : 'hover:bg-accent/10'
                    }`}
                  >
                    <td className="px-2 py-1.5">
                      <span className="font-mono text-xs text-muted-foreground">{it.code}</span>
                      <span className="ml-2">{it.name}</span>
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono text-[11px] text-muted-foreground">
                      {it.addedAt.slice(5, 16).replace('T', ' ')}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSel(i);
                          fireInquiry(it);
                        }}
                        className="rounded border border-primary/55 bg-primary/12 px-2 py-0.5 text-[11px] text-primary hover:bg-primary/20"
                      >
                        記詢價
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTransferItem(it.partId);
                        }}
                        className="ml-1 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label="移除"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* 選中料的近期詢價（比價參考）*/}
          {cur ? (
            <div>
              <div className="mb-1 text-xs font-medium text-muted-foreground">
                {cur.code} 近期同行詢價（比價參考）
              </div>
              {recent === null ? (
                <div className="text-[12px] text-muted-foreground">載入中…</div>
              ) : recent.length === 0 ? (
                <div className="text-[12px] text-muted-foreground">還沒有詢價紀錄——按 Enter 或「記詢價」記第一筆</div>
              ) : (
                <table className="w-full border-collapse text-[13px]">
                  <tbody>
                    {recent.map((r) => (
                      <tr key={r.id} className="border-b border-border/15 last:border-b-0">
                        <td className="py-1 pr-3 font-mono text-[12px] text-muted-foreground">{r.recordDate.slice(0, 10)}</td>
                        <td className="py-1 pr-3">{r.partnerName ?? r.partnerCode ?? '—'}</td>
                        <td className="py-1 pr-3 text-right font-mono tabular-nums">{Number(r.qty)}</td>
                        <td className="py-1 text-right font-mono font-semibold tabular-nums text-primary">
                          {fmtNt(Number(r.unitPrice))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t border-border/35 bg-background/35 px-6 py-2 text-[11px] text-muted-foreground/70">
          <span>↑↓ 選料｜Enter 記詢價｜Delete 移除｜Esc 關閉</span>
          {items.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('清空整份調貨詢價清單？（已記的詢價紀錄不受影響）')) clearTransferItems();
              }}
              className="rounded border border-border px-2 py-0.5 text-[11px] hover:border-destructive/50 hover:text-destructive"
            >
              清空清單
            </button>
          ) : null}
        </div>
      </>
    </FocusLockedDialog>
  );
}
