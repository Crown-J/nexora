/**
 * File: apps/nx-ui/src/features/nx02/shortage/ui/ShortageView.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-SHOR-UI-001：缺貨簿查詢、批次轉 RFQ、忽略
 *
 * @FUNCTION_CODE NX02-SHOR-UI-001-F01
 */

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { listLookupWarehouse } from '@/features/nx00/lookup/api/lookup';
import { cx } from '@/shared/lib/cx';

import { useShortage } from '../hooks/useShortage';

export type ShortageViewProps = { vm: ReturnType<typeof useShortage> };

function statusBadge(st: string) {
  if (st === 'O') return { label: '缺貨中', cls: 'bg-destructive/15 text-destructive' };
  if (st === 'R') return { label: 'RFQ已建立', cls: 'bg-sky-500/15 text-sky-700 dark:text-sky-400' };
  if (st === 'C') return { label: '已補足', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' };
  return { label: '已忽略', cls: 'bg-muted text-muted-foreground' };
}

/**
 * @FUNCTION_CODE NX02-SHOR-UI-001-F01
 */
export function ShortageView({ vm }: ShortageViewProps) {
  const {
    data,
    loading,
    error,
    qInput,
    setQInput,
    warehouseId,
    setWarehouseId,
    status,
    setStatus,
    page,
    setPage,
    toggle,
    toggleAllOnPage,
    selected,
    selectedIds,
    toRfq,
    ignore,
    busy,
    search,
  } = vm;

  const [whOpts, setWhOpts] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    listLookupWarehouse({ isActive: true })
      .then((w) => setWhOpts(w.map((x) => ({ id: x.id, name: x.name }))))
      .catch(() => setWhOpts([]));
  }, []);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const oRows = data ? data.rows.filter((r) => r.status === 'O') : [];
  const allSelectableSelected = oRows.length > 0 && oRows.every((r) => selected[r.id]);

  return (
    <div className="space-y-4">
      <header>
        <p className="text-xs tracking-[0.35em] text-muted-foreground">NX02</p>
        <h1 className="text-lg font-semibold md:text-xl">缺貨簿</h1>
      </header>

      <div className="flex flex-col gap-2 rounded-xl border border-border/80 bg-card/40 p-3 sm:flex-row sm:flex-wrap sm:items-end sm:p-4">
        <label className="flex w-full min-w-[200px] flex-col gap-1 text-xs text-muted-foreground sm:flex-1">
          料號／品名
          <input
            className="h-11 rounded-lg border border-border bg-background px-3 text-sm lg:h-9"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="搜尋…"
          />
        </label>
        <label className="flex w-full flex-col gap-1 text-xs text-muted-foreground sm:w-auto">
          倉庫
          <select
            className="h-11 rounded-lg border border-border bg-background px-2 text-sm lg:h-9"
            value={warehouseId}
            onChange={(e) => {
              setWarehouseId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">全部</option>
            {whOpts.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex w-full flex-col gap-1 text-xs text-muted-foreground sm:w-auto">
          狀態
          <select
            className="h-11 rounded-lg border border-border bg-background px-2 text-sm lg:h-9"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="O">缺貨中</option>
            <option value="R">RFQ已建立</option>
            <option value="C">已補足</option>
            <option value="I">已忽略</option>
            <option value="">全部</option>
          </select>
        </label>
        <div className="flex w-full gap-2 sm:w-auto">
          <button
            type="button"
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground sm:flex-none lg:min-h-0 lg:py-2"
            onClick={() => search()}
          >
            搜尋
          </button>
          <button
            type="button"
            disabled={busy || selectedIds.length === 0}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg border border-border px-4 text-sm disabled:opacity-40 sm:flex-none lg:min-h-0 lg:py-2"
            onClick={() => void toRfq()}
          >
            一鍵轉 RFQ（{selectedIds.length}）
          </button>
        </div>
      </div>

      {error ? <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">{error}</div> : null}
      {loading && !data ? <p className="text-sm text-muted-foreground">載入中…</p> : null}

      {data ? (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-border/80 lg:block">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="w-10 px-2 py-2">
                    <input
                      type="checkbox"
                      aria-label="全選本頁可轉 RFQ"
                      checked={Boolean(data.rows.length && allSelectableSelected)}
                      onChange={(e) => toggleAllOnPage(e.target.checked)}
                    />
                  </th>
                  <th className="px-2 py-2 font-medium">料號／品名</th>
                  <th className="px-2 py-2 font-medium">倉庫</th>
                  <th className="px-2 py-2 text-right font-medium">現存量</th>
                  <th className="px-2 py-2 text-right font-medium">安全量</th>
                  <th className="px-2 py-2 text-right font-medium">缺貨量</th>
                  <th className="px-2 py-2 text-right font-medium">建議訂購</th>
                  <th className="px-2 py-2 font-medium">偵測時間</th>
                  <th className="px-2 py-2 font-medium">狀態</th>
                  <th className="px-2 py-2 font-medium">關聯 RFQ</th>
                  <th className="px-2 py-2 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-3 py-6 text-center text-muted-foreground">
                      尚無資料
                    </td>
                  </tr>
                ) : (
                  data.rows.map((r) => {
                    const b = statusBadge(r.status);
                    return (
                      <tr key={r.id} className="border-b border-border/60">
                        <td className="px-2 py-2">
                          {r.status === 'O' ? (
                            <input
                              type="checkbox"
                              checked={Boolean(selected[r.id])}
                              onChange={() => toggle(r.id)}
                            />
                          ) : null}
                        </td>
                        <td className="px-2 py-2">
                          <div className="font-mono text-xs">{r.partNo}</div>
                          <div className="text-xs text-muted-foreground">{r.partName}</div>
                        </td>
                        <td className="px-2 py-2">{r.warehouseName}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{r.onHandQty}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{r.minQty}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{r.shortageQty}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{r.suggestOrderQty}</td>
                        <td className="px-2 py-2 text-xs text-muted-foreground">
                          {new Date(r.detectedAt).toLocaleString()}
                        </td>
                        <td className="px-2 py-2">
                          <span className={cx('rounded-full px-2 py-0.5 text-xs font-medium', b.cls)}>{b.label}</span>
                        </td>
                        <td className="px-2 py-2">
                          {r.refRfqId ? (
                            <Link
                              href={`/dashboard/nx01/rfq/${encodeURIComponent(r.refRfqId)}`}
                              className="font-mono text-xs text-primary underline"
                            >
                              {r.refRfqId}
                            </Link>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-2 py-2">
                          {r.status === 'O' ? (
                            <button
                              type="button"
                              className="text-xs text-muted-foreground underline"
                              disabled={busy}
                              onClick={() => void ignore(r.id)}
                            >
                              忽略
                            </button>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="space-y-2 lg:hidden">
            {data.rows.length === 0 ? (
              <div className="rounded-xl border border-border/80 bg-card/40 p-6 text-center text-sm text-muted-foreground">
                尚無資料
              </div>
            ) : (
              data.rows.map((r) => {
                const b = statusBadge(r.status);
                return (
                  <div key={r.id} className="rounded-xl border border-border/80 bg-card/40 p-3">
                    <div className="flex items-start justify-between gap-2">
                      {r.status === 'O' ? (
                        <input
                          type="checkbox"
                          checked={Boolean(selected[r.id])}
                          onChange={() => toggle(r.id)}
                          className="mt-1 h-5 w-5 shrink-0"
                        />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-xs text-primary">{r.partNo}</div>
                        <div className="mt-0.5 truncate text-sm font-medium text-foreground">{r.partName}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{r.warehouseName}</div>
                      </div>
                      <span className={cx('shrink-0 rounded-full px-2 py-0.5 text-xs font-medium', b.cls)}>
                        {b.label}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-4 gap-2 border-t border-border/40 pt-2 text-xs">
                      <div>
                        <div className="text-muted-foreground">現存</div>
                        <div className="tabular-nums text-foreground">{r.onHandQty}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">安全</div>
                        <div className="tabular-nums text-foreground">{r.minQty}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">缺貨</div>
                        <div className="tabular-nums font-medium text-destructive">{r.shortageQty}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">建議</div>
                        <div className="tabular-nums text-foreground">{r.suggestOrderQty}</div>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="text-muted-foreground">{new Date(r.detectedAt).toLocaleString()}</span>
                      <div className="flex items-center gap-3">
                        {r.refRfqId ? (
                          <Link
                            href={`/dashboard/nx01/rfq/${encodeURIComponent(r.refRfqId)}`}
                            className="font-mono text-primary underline"
                          >
                            {r.refRfqId}
                          </Link>
                        ) : null}
                        {r.status === 'O' ? (
                          <button
                            type="button"
                            className="inline-flex min-h-[36px] items-center text-muted-foreground underline"
                            disabled={busy}
                            onClick={() => void ignore(r.id)}
                          >
                            忽略
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">
              第 {data.page} / {totalPages} 頁，共 {data.total} 筆
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                className="min-h-[44px] rounded border border-border px-4 disabled:opacity-40 lg:min-h-0 lg:px-3 lg:py-1"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                上一頁
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                className="min-h-[44px] rounded border border-border px-4 disabled:opacity-40 lg:min-h-0 lg:px-3 lg:py-1"
                onClick={() => setPage((p) => p + 1)}
              >
                下一頁
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
