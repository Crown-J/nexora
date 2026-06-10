/**
 * File: apps/nx-ui/src/features/nx02/transfer/ui/TransferFormView.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-XFER-UI-002：調撥單新增／明細（倉別、明細、儲存／過帳／作廢）
 *
 * @FUNCTION_CODE NX02-XFER-UI-002-F01
 */

'use client';

import { useEffect, useState } from 'react';

import { listLookupLocation, listLookupWarehouse } from '@/features/shared/master/lookup/api/lookup';
import type { LookupLocationRow } from '@/features/shared/master/lookup/api/lookup';
import { PartLookupAutocomplete } from '@/features/nx03/shared/ui/PartLookupAutocomplete';
import { cx } from '@/shared/lib/cx';

import { useTransferDoc } from '../hooks/useTransfer';

export type TransferFormViewProps = {
  vm: ReturnType<typeof useTransferDoc>;
  isNew: boolean;
};

function statusBadge(status: string) {
  if (status === 'P') return { label: '已過帳', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' };
  if (status === 'V') return { label: '作廢', cls: 'bg-destructive/15 text-destructive' };
  return { label: '草稿', cls: 'bg-muted text-muted-foreground' };
}

/**
 * @FUNCTION_CODE NX02-XFER-UI-002-F01
 */
export function TransferFormView({ vm, isNew }: TransferFormViewProps) {
  const {
    doc,
    loading,
    saving,
    error,
    fromWarehouseId,
    setFromWarehouseId,
    toWarehouseId,
    setToWarehouseId,
    stDate,
    setStDate,
    remark,
    setRemark,
    rows,
    isDraft,
    save,
    post,
    voidDoc,
    addRow,
    removeRow,
    updateRow,
    backToList,
    warehousesLocked,
  } = vm;

  const [whOpts, setWhOpts] = useState<{ id: string; name: string }[]>([]);
  const [fromLocs, setFromLocs] = useState<LookupLocationRow[]>([]);
  const [toLocs, setToLocs] = useState<LookupLocationRow[]>([]);

  useEffect(() => {
    listLookupWarehouse({ isActive: true })
      .then((w) => setWhOpts(w.map((x) => ({ id: x.id, name: x.name }))))
      .catch(() => setWhOpts([]));
  }, []);

  useEffect(() => {
    if (!fromWarehouseId) {
      setFromLocs([]);
      return;
    }
    listLookupLocation({ warehouseId: fromWarehouseId, isActive: true })
      .then(setFromLocs)
      .catch(() => setFromLocs([]));
  }, [fromWarehouseId]);

  useEffect(() => {
    if (!toWarehouseId) {
      setToLocs([]);
      return;
    }
    listLookupLocation({ warehouseId: toWarehouseId, isActive: true })
      .then(setToLocs)
      .catch(() => setToLocs([]));
  }, [toWarehouseId]);

  if (loading && !isNew) {
    return <p className="text-sm text-muted-foreground">載入中…</p>;
  }
  if (!isNew && !doc) {
    return <p className="text-sm text-destructive">找不到調撥單</p>;
  }

  const title = isNew ? '新增調撥單' : `調撥單 ${doc?.docNo ?? ''}`;
  const b = doc ? statusBadge(doc.status) : statusBadge('D');

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs tracking-[0.35em] text-muted-foreground">NX02</p>
          <h1 className="text-lg font-semibold break-all md:text-xl">{title}</h1>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {doc ? <span className={cx('rounded-full px-3 py-1 text-xs font-medium', b.cls)}>{b.label}</span> : null}
          <button
            type="button"
            className="inline-flex min-h-[44px] items-center px-2 text-sm text-muted-foreground underline lg:min-h-0"
            onClick={backToList}
          >
            返回列表
          </button>
        </div>
      </header>

      {error ? <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">{error}</div> : null}

      <div className="grid gap-3 rounded-xl border border-border/80 bg-card/40 p-3 md:grid-cols-2 md:gap-4 md:p-4">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          來源倉庫
          <select
            className="h-11 rounded-lg border border-border bg-background px-3 text-sm disabled:opacity-60 lg:h-10"
            disabled={warehousesLocked || !isDraft}
            value={fromWarehouseId}
            onChange={(e) => setFromWarehouseId(e.target.value)}
          >
            <option value="">請選擇</option>
            {whOpts.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          目標倉庫
          <select
            className="h-11 rounded-lg border border-border bg-background px-3 text-sm disabled:opacity-60 lg:h-10"
            disabled={warehousesLocked || !isDraft}
            value={toWarehouseId}
            onChange={(e) => setToWarehouseId(e.target.value)}
          >
            <option value="">請選擇</option>
            {whOpts.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          調撥日期
          <input
            type="date"
            disabled={!isDraft}
            className="h-11 rounded-lg border border-border bg-background px-3 text-sm disabled:opacity-60 lg:h-10"
            value={stDate}
            onChange={(e) => setStDate(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground md:col-span-2">
          備註
          <textarea
            disabled={!isDraft}
            className="min-h-[72px] rounded-lg border border-border bg-background px-3 py-2 text-sm disabled:opacity-60"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
          />
        </label>
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-border/80 lg:block">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-2 py-2 font-medium">料號</th>
              <th className="px-2 py-2 font-medium">品名</th>
              <th className="px-2 py-2 font-medium">出貨庫位</th>
              <th className="px-2 py-2 font-medium">目標庫位</th>
              <th className="px-2 py-2 text-right font-medium">數量</th>
              <th className="px-2 py-2 text-right font-medium">來源現存</th>
              {doc?.status === 'P' ? <th className="px-2 py-2 text-right font-medium">出庫成本</th> : null}
              <th className="px-2 py-2 font-medium">備註</th>
              {isDraft ? <th className="w-10" /> : null}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                  尚無明細
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const live = doc?.items.find((it) => it.id === r.tempKey);
                const onHand = live?.fromWarehouseOnHand ?? 0;
                return (
                  <tr key={r.tempKey} className="border-b border-border/60 align-top">
                    <td className="px-2 py-2">
                      {isDraft ? (
                        <PartLookupAutocomplete
                          partId={r.partId}
                          partCode={r.partNo}
                          partName={r.partName}
                          onChange={(p) =>
                            updateRow(r.tempKey, {
                              partId: p?.id ?? '',
                              partNo: p?.code ?? '',
                              partName: p?.name ?? '',
                            })
                          }
                          inputClassName="w-[140px]"
                        />
                      ) : (
                        <span className="font-mono text-xs">{r.partNo}</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-muted-foreground">{r.partName || '—'}</td>
                    <td className="px-2 py-2">
                      {isDraft ? (
                        <select
                          className="max-w-[140px] rounded border border-border bg-background px-1 py-1 text-xs"
                          value={r.fromLocationId}
                          onChange={(e) => updateRow(r.tempKey, { fromLocationId: e.target.value })}
                        >
                          <option value="">（預設庫位）</option>
                          {fromLocs.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.code}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs">{live?.fromLocationCode ?? '—'}</span>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      {isDraft ? (
                        <select
                          className="max-w-[140px] rounded border border-border bg-background px-1 py-1 text-xs"
                          value={r.toLocationId}
                          onChange={(e) => updateRow(r.tempKey, { toLocationId: e.target.value })}
                        >
                          <option value="">（預設庫位）</option>
                          {toLocs.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.code}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs">{live?.toLocationCode ?? '—'}</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right">
                      {isDraft ? (
                        <input
                          className="w-20 rounded border border-border bg-background px-1 py-1 text-right text-xs"
                          value={r.qty}
                          onChange={(e) => updateRow(r.tempKey, { qty: e.target.value })}
                        />
                      ) : (
                        <span className="tabular-nums">{live?.qty ?? r.qty}</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{onHand}</td>
                    {doc?.status === 'P' ? (
                      <td className="px-2 py-2 text-right tabular-nums">{live?.unitCost?.toFixed?.(4) ?? '—'}</td>
                    ) : null}
                    <td className="px-2 py-2">
                      {isDraft ? (
                        <input
                          className="w-full min-w-[80px] rounded border border-border bg-background px-1 py-1 text-xs"
                          value={r.remark}
                          onChange={(e) => updateRow(r.tempKey, { remark: e.target.value })}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">{r.remark || '—'}</span>
                      )}
                    </td>
                    {isDraft ? (
                      <td className="px-1 py-2">
                        <button
                          type="button"
                          className="text-xs text-destructive underline"
                          onClick={() => removeRow(r.tempKey)}
                        >
                          刪
                        </button>
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 lg:hidden">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-border/80 bg-card/40 p-6 text-center text-sm text-muted-foreground">
            尚無明細
          </div>
        ) : (
          rows.map((r) => {
            const live = doc?.items.find((it) => it.id === r.tempKey);
            const onHand = live?.fromWarehouseOnHand ?? 0;
            return (
              <div key={r.tempKey} className="space-y-2 rounded-xl border border-border/80 bg-card/40 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    {isDraft ? (
                      <PartLookupAutocomplete
                        partId={r.partId}
                        partCode={r.partNo}
                        partName={r.partName}
                        onChange={(p) =>
                          updateRow(r.tempKey, {
                            partId: p?.id ?? '',
                            partNo: p?.code ?? '',
                            partName: p?.name ?? '',
                          })
                        }
                        inputClassName="w-full"
                      />
                    ) : (
                      <div className="font-mono text-xs text-primary">{r.partNo}</div>
                    )}
                    <div className="truncate text-xs text-muted-foreground">{r.partName || '—'}</div>
                  </div>
                  {isDraft ? (
                    <button
                      type="button"
                      className="inline-flex min-h-[44px] shrink-0 items-center text-xs text-destructive underline"
                      onClick={() => removeRow(r.tempKey)}
                    >
                      刪除
                    </button>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex flex-col gap-1 text-muted-foreground">
                    出貨庫位
                    {isDraft ? (
                      <select
                        className="h-9 rounded border border-border bg-background px-1 text-xs"
                        value={r.fromLocationId}
                        onChange={(e) => updateRow(r.tempKey, { fromLocationId: e.target.value })}
                      >
                        <option value="">（預設）</option>
                        {fromLocs.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.code}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-foreground">{live?.fromLocationCode ?? '—'}</span>
                    )}
                  </label>
                  <label className="flex flex-col gap-1 text-muted-foreground">
                    目標庫位
                    {isDraft ? (
                      <select
                        className="h-9 rounded border border-border bg-background px-1 text-xs"
                        value={r.toLocationId}
                        onChange={(e) => updateRow(r.tempKey, { toLocationId: e.target.value })}
                      >
                        <option value="">（預設）</option>
                        {toLocs.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.code}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-foreground">{live?.toLocationCode ?? '—'}</span>
                    )}
                  </label>
                  <label className="flex flex-col gap-1 text-muted-foreground">
                    數量
                    {isDraft ? (
                      <input
                        inputMode="decimal"
                        className="h-9 rounded border border-border bg-background px-2 text-right text-xs tabular-nums"
                        value={r.qty}
                        onChange={(e) => updateRow(r.tempKey, { qty: e.target.value })}
                      />
                    ) : (
                      <span className="tabular-nums text-foreground">{live?.qty ?? r.qty}</span>
                    )}
                  </label>
                  <div className="flex flex-col gap-1 text-muted-foreground">
                    <span>來源現存</span>
                    <span className="tabular-nums text-foreground">{onHand}</span>
                  </div>
                </div>
                {doc?.status === 'P' ? (
                  <div className="text-xs text-muted-foreground">
                    出庫成本{' '}
                    <span className="tabular-nums text-foreground">{live?.unitCost?.toFixed?.(4) ?? '—'}</span>
                  </div>
                ) : null}
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">備註</div>
                  {isDraft ? (
                    <input
                      className="h-9 w-full rounded border border-border bg-background px-2 text-xs"
                      value={r.remark}
                      onChange={(e) => updateRow(r.tempKey, { remark: e.target.value })}
                    />
                  ) : (
                    <div className="text-xs text-muted-foreground">{r.remark || '—'}</div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {isDraft ? (
        <button
          type="button"
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-dashed border-border px-4 text-sm text-muted-foreground lg:min-h-0 lg:py-2"
          onClick={addRow}
        >
          新增明細
        </button>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {isDraft ? (
          <>
            <button
              type="button"
              disabled={saving}
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-border px-4 text-sm disabled:opacity-50 lg:min-h-0 lg:py-2"
              onClick={() => void save()}
            >
              儲存
            </button>
            {doc && doc.status === 'D' ? (
              <>
                <button
                  type="button"
                  disabled={saving}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50 lg:min-h-0 lg:py-2"
                  onClick={() => void post()}
                >
                  過帳
                </button>
                <button
                  type="button"
                  disabled={saving}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-destructive/50 px-4 text-sm text-destructive disabled:opacity-50 lg:min-h-0 lg:py-2"
                  onClick={() => void voidDoc()}
                >
                  作廢
                </button>
              </>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
