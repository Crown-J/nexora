// apps/nx-ui/src/features/sale/so/ui/CreateTiFromSoModal.tsx
// NX04-M3 C2/C3：SO → IT-O 同行調貨觸發 modal
//
// 流程：列出該 SO 所有 transferSourceType='G' + transferStatus='P' + 未綁 TI 的行
//      用戶填同行 partnerId（純文字 input、無 picker、列 FU-sales-lite-11）
//      勾選要建 TI 的 line（一張 TI 對應一個同行）→ POST /nx04/so/:id/create-ti
//      成功後跳轉 NX02 TI detail

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useModalLayer } from '@design/primitives/modal-stack';
import { createTiFromSo, listPendingTransferLines } from '@data/endpoints/nx04/so/api/so';
import type { CreateTiFromSoResponse, SoItem } from '@data/types/nx04/so';

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
  const [partnerId, setPartnerId] = useState('');
  const [remark, setRemark] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const resp = await listPendingTransferLines(soId);
      setItems(resp.items);
      // 預設全選
      setSelectedIds(new Set(resp.items.map((i) => i.id)));
    } catch (e) {
      setErr(e instanceof Error ? e.message : '載入失敗');
    } finally {
      setLoading(false);
    }
  }, [soId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submit = async () => {
    if (!partnerId.trim()) {
      setErr('partnerId 必填（同行對象：O 或 canTransferStock=true）');
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
        partnerId: partnerId.trim(),
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
          <label className="text-sm">
            <span className="block mb-1">🟢 同行對象 partnerId *</span>
            <input
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
              placeholder="NX01PTNR... (O 同行 / canTransferStock=true)"
              className="w-full rounded border bg-background px-2 py-1 font-mono"
              required
            />
          </label>
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
              此銷貨單無待調貨行。
            </div>
          ) : null}
          {items.length > 0 ? (
            <div className="max-h-72 overflow-y-auto rounded border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted text-[10px] uppercase text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1"></th>
                    <th className="px-2 py-1 text-left">#</th>
                    <th className="px-2 py-1 text-left">料號 / 品名</th>
                    <th className="px-2 py-1 text-right">數量</th>
                    <th className="px-2 py-1 text-right">單價</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.id} className="border-t hover:bg-muted/30">
                      <td className="px-2 py-1">
                        <input
                          type="checkbox"
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>

        {err ? <div className="text-xs text-destructive">{err}</div> : null}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button onClick={onClose} className="rounded border px-4 py-1.5 text-sm">
            取消
          </button>
          <button
            disabled={submitting || !items.length || !selectedIds.size || !partnerId.trim()}
            onClick={() => void submit()}
            className="rounded bg-amber-600 px-4 py-1.5 text-sm text-white disabled:opacity-50"
          >
            {submitting ? '建單中…' : `建 TI（${selectedIds.size} 行）`}
          </button>
        </div>

        <p className="text-[10px] text-muted-foreground">
          建單後：SO 行 transferStatus 從「待補」改「補貨中」、tiId 連結 TI 草稿；
          自動跳轉 NX02 TI detail 頁、由業務手動回填 unitCost 後 POSTED。
        </p>
      </div>
    </div>
  );
}
