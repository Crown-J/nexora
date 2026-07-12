// apps/nx-ui/src/features/nx04/so/ui/CreateTiFromSoModal.tsx
// NX04-M3 C2/C3：SO → IT-O 同行調貨觸發 modal（2026-07-12 鍵盤化＋成本預覽 4/7）
//
// 流程：列出該 SO 所有 transferSourceType='G' + transferStatus='P' + 未綁 TI 的行
//      選同行（CustomerPicker、O 類）→ 每行即時預覽將帶入的詢價成本
//      （該同行×該料最近一筆、查無亮警示=建單後成本 0 要手動補）
//      ↑↓ 選行、Space 勾/取消、Enter 建單（一張 TI 對應一個同行）→ 跳 NX02 TI detail
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useModalLayer } from '@design/primitives/modal-stack';
import { createTiFromSo, listPendingTransferLines } from '@data/endpoints/nx04/so/api/so';
import { listInquiryRecords } from '@data/endpoints/nx04/record/api/record';
import type { CreateTiFromSoResponse, SoItem } from '@data/types/nx04/so';
// NX02-TI-SHELL 2026-07-11：同行對象 純文字 ID 輸入 → 搜尋 picker（收 FU-sales-lite-11）
import { CustomerPicker, type PickedCustomer } from '../../quote/ui/CustomerPicker';

/** 每行成本預覽：undefined=載入中、null=查無詢價、number=將帶入單價 */
type CostPreview = number | null | undefined;

export function CreateTiFromSoModal({
  soId,
  docNo,
  onClose,
  onCreated,
}: {
  soId: string;
  docNo: string;
  onClose: () => void;
  onCreated: (resp: CreateTiFromSoResponse) => void;
}) {
  const layerRef = useRef<HTMLDivElement>(null);
  useModalLayer(layerRef, onClose);
  const [items, setItems] = useState<SoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [partner, setPartner] = useState<PickedCustomer | null>(null);
  const [remark, setRemark] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [cursor, setCursor] = useState(0);
  const [costs, setCosts] = useState<Map<string, CostPreview>>(new Map());
  const [submitting, setSubmitting] = useState(false);
  const linesRef = useRef<HTMLDivElement>(null);
  const costReqRef = useRef(0);

  const reload = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const resp = await listPendingTransferLines(soId);
      setItems(resp.items);
      // 預設全選
      setSelectedIds(new Set(resp.items.map((i) => i.id)));
      setCursor(0);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '載入失敗');
    } finally {
      setLoading(false);
    }
  }, [soId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // 成本預覽：選定同行 → 每行抓「該同行×該料」最近一筆詢價（後端建 TI 同一口徑、B3）
  useEffect(() => {
    if (!partner) {
      setCosts(new Map());
      return;
    }
    const myReq = ++costReqRef.current;
    setCosts(new Map()); // 全部回「載入中」
    void (async () => {
      const next = new Map<string, CostPreview>();
      await Promise.all(
        items.map(async (it) => {
          try {
            const r = await listInquiryRecords({ partnerCode: partner.code, partNo: it.partNo, pageSize: 1 });
            next.set(it.id, r.items.length ? Number(r.items[0].unitPrice) : null);
          } catch {
            next.set(it.id, null);
          }
        }),
      );
      if (costReqRef.current === myReq) setCosts(next);
    })();
  }, [partner, items]);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submit = async () => {
    if (!partner) {
      setErr('請先選同行對象（O 或可調貨）');
      return;
    }
    if (!selectedIds.size) {
      setErr('至少選一行');
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      const resp = await createTiFromSo(soId, {
        partnerId: partner.id,
        soItemIds: Array.from(selectedIds),
        remark: remark.trim() || undefined,
      });
      onCreated(resp);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '建單失敗');
    } finally {
      setSubmitting(false);
    }
  };

  // 勾選行的成本合計預覽（查無=0、同後端）
  const costTotal = items
    .filter((it) => selectedIds.has(it.id))
    .reduce((sum, it) => {
      const c = costs.get(it.id);
      return sum + (typeof c === 'number' ? c * Number(it.qty) : 0);
    }, 0);

  const onLinesKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!items.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((i) => Math.min(items.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((i) => Math.max(0, i - 1));
    } else if (e.key === ' ') {
      e.preventDefault();
      const it = items[cursor];
      if (it) toggle(it.id);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!submitting && partner && selectedIds.size) void submit();
    }
  };

  const fmtCost = (n: number) => n.toLocaleString('zh-TW', { maximumFractionDigits: 2 });

  return (
    <div
      ref={layerRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-3xl space-y-4 rounded-lg bg-background p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">建立同行調貨單 IT-O</h2>
            <p className="text-xs text-muted-foreground">
              SO {docNo} · 一張 TI 對應一個同行；不同同行請分次建立
            </p>
          </div>
          <button onClick={onClose} className="rounded border px-3 py-1 text-sm">
            ✕ 關閉
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="text-sm">
            <span className="mb-1 block">🟢 同行對象 *（↑↓ 選、Enter 定 → 跳明細）</span>
            <CustomerPicker
              partnerType="O"
              autoFocus
              onPick={(p) => {
                setPartner(p);
                setTimeout(() => linesRef.current?.focus(), 30);
              }}
              onCommit={() => linesRef.current?.focus()}
            />
          </div>
          <label className="text-sm">
            <span className="block mb-1">⚪ 備註</span>
            <input
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder={`From SO ${docNo}`}
              className="w-full rounded border bg-background px-2 py-1"
            />
          </label>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">待調貨行（G + P + 未綁 TI）</h3>
            <button onClick={() => void reload()} className="rounded border px-2 py-0.5 text-xs">
              重新整理
            </button>
          </div>
          {loading ? <div className="text-xs text-muted-foreground">載入中…</div> : null}
          {!loading && !items.length ? (
            <div className="rounded border border-dashed p-4 text-center text-xs text-muted-foreground">
              此銷貨單無待調貨行。（明細要先標「同行調貨」：編輯明細 → 補貨來源）
            </div>
          ) : null}
          {items.length > 0 ? (
            <div
              ref={linesRef}
              tabIndex={0}
              onKeyDown={onLinesKey}
              className="max-h-72 overflow-y-auto rounded border outline-none focus:ring-1 focus:ring-primary/50"
            >
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted text-[10px] uppercase text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1"></th>
                    <th className="px-2 py-1 text-left">#</th>
                    <th className="px-2 py-1 text-left">料號 / 品名</th>
                    <th className="px-2 py-1 text-right">數量</th>
                    <th className="px-2 py-1 text-right">售價</th>
                    <th className="px-2 py-1 text-right">帶入成本（該同行最近詢價）</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => {
                    const c = costs.get(it.id);
                    return (
                      <tr
                        key={it.id}
                        onClick={() => setCursor(i)}
                        className={`border-t ${i === cursor ? 'bg-primary/[0.08] shadow-[inset_2px_0_0_var(--primary)]' : 'hover:bg-muted/30'}`}
                      >
                        <td className="px-2 py-1">
                          <input
                            type="checkbox"
                            tabIndex={-1}
                            checked={selectedIds.has(it.id)}
                            onChange={() => toggle(it.id)}
                          />
                        </td>
                        <td className="px-2 py-1 text-xs text-muted-foreground">{it.lineNo}</td>
                        <td className="px-2 py-1">
                          <div className="font-mono">{it.partNo}</div>
                          <div className="text-[10px] text-muted-foreground">{it.partName}</div>
                        </td>
                        <td className="px-2 py-1 text-right tabular-nums">{it.qty}</td>
                        <td className="px-2 py-1 text-right tabular-nums">{it.unitPrice}</td>
                        <td className="px-2 py-1 text-right">
                          {!partner ? (
                            <span className="text-[10px] text-muted-foreground">先選同行</span>
                          ) : c === undefined ? (
                            <span className="text-[10px] text-muted-foreground">查詢中…</span>
                          ) : c === null ? (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800" title="這家同行沒有此料的詢價紀錄——建單後成本 0、要進調貨單手動補">
                              ⚠️ 查無詢價（成本 0）
                            </span>
                          ) : (
                            <span className="font-mono font-semibold tabular-nums text-primary">{fmtCost(c)}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>

        {err ? <div className="text-xs text-destructive">{err}</div> : null}

        <div className="flex items-center justify-between gap-2 pt-2">
          <span className="text-[11px] text-muted-foreground/70">
            ↑↓ 選行｜Space 勾/取消｜Enter 建單｜Esc 關閉
            {partner && selectedIds.size ? (
              <>
                ｜勾選 {selectedIds.size} 行・成本合計{' '}
                <span className="font-mono font-semibold text-foreground">{fmtCost(costTotal)}</span>（未稅）
              </>
            ) : null}
          </span>
          <span className="flex gap-2">
            <button onClick={onClose} className="rounded border px-4 py-1.5 text-sm">
              取消
            </button>
            <button
              disabled={submitting || !items.length || !selectedIds.size || !partner}
              onClick={() => void submit()}
              className="rounded bg-amber-600 px-4 py-1.5 text-sm text-white disabled:opacity-50"
            >
              {submitting ? '建單中…' : `建 TI（${selectedIds.size} 行）`}
            </button>
          </span>
        </div>

        <p className="text-[10px] text-muted-foreground">
          建單後：SO 行 transferStatus 從「待補」改「補貨中」、tiId 連結 TI 草稿、
          成本自動帶上表預覽值（查無=0 進 TI 手動補）；自動跳轉 NX02 TI detail 頁。
        </p>
      </div>
    </div>
  );
}
