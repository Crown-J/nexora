/**
 * File: apps/nx-ui/src/features/nx02/stock-take/ui/StockTakeNewView.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-STTK-UI-003：新增盤點單表單
 */

'use client';

import { useEffect, useState } from 'react';

import { listLookupWarehouse } from '@/features/nx00/lookup/api/lookup';
import { PartLookupAutocomplete } from '@/features/nx02/shared/ui/PartLookupAutocomplete';

import type { StockTakeNewVm } from '../hooks/useStockTakeNew';

export type StockTakeNewViewProps = { vm: StockTakeNewVm };

/**
 * @FUNCTION_CODE NX02-STTK-UI-003-F01
 */
export function StockTakeNewView({ vm }: StockTakeNewViewProps) {
  const {
    warehouseId,
    setWarehouseId,
    stockTakeDate,
    setStockTakeDate,
    scopeType,
    setScopeType,
    selectedParts,
    addPart,
    removePart,
    remark,
    setRemark,
    saving,
    error,
    submit,
    back,
  } = vm;

  const [whOpts, setWhOpts] = useState<{ id: string; name: string }[]>([]);
  const [partPickerKey, setPartPickerKey] = useState(0);
  useEffect(() => {
    listLookupWarehouse({ isActive: true })
      .then((w) => setWhOpts(w.map((x) => ({ id: x.id, name: x.name }))))
      .catch(() => setWhOpts([]));
  }, []);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">新增盤點單</h1>
        <button type="button" className="text-sm text-muted-foreground underline" onClick={back}>
          返回
        </button>
      </header>
      {error ? <div className="text-sm text-destructive">{error}</div> : null}
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        倉庫 *
        <select
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          value={warehouseId}
          onChange={(e) => setWarehouseId(e.target.value)}
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
        盤點日期
        <input
          type="date"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          value={stockTakeDate}
          onChange={(e) => setStockTakeDate(e.target.value)}
        />
      </label>
      <div className="space-y-2 text-sm">
        <span className="text-xs text-muted-foreground">盤點範圍</span>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="sc"
            checked={scopeType === 'F'}
            onChange={() => setScopeType('F')}
          />
          全倉
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="sc"
            checked={scopeType === 'P'}
            onChange={() => setScopeType('P')}
          />
          指定料號
        </label>
      </div>
      {scopeType === 'P' ? (
        <div className="space-y-2 text-xs text-muted-foreground">
          <span>指定零件（搜尋料號或品名後選取，可加入多筆）</span>
          <PartLookupAutocomplete
            key={partPickerKey}
            partId=""
            onChange={(p) => {
              if (p) {
                addPart(p);
                setPartPickerKey((k) => k + 1);
              }
            }}
            placeholder="輸入料號或品名…"
            inputClassName="text-sm"
          />
          {selectedParts.length > 0 ? (
            <ul className="space-y-1 rounded-lg border border-border/80 bg-muted/20 p-2">
              {selectedParts.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2 rounded bg-background px-2 py-1.5 text-sm text-foreground"
                >
                  <span className="min-w-0 truncate">
                    <span className="font-mono">{p.code}</span>
                    <span className="ml-2 text-muted-foreground">{p.name}</span>
                  </span>
                  <button
                    type="button"
                    className="shrink-0 text-destructive hover:underline"
                    onClick={() => removePart(p.id)}
                  >
                    移除
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[11px] text-muted-foreground">尚未加入零件</p>
          )}
        </div>
      ) : null}
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        備註
        <input
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
        />
      </label>
      <button
        type="button"
        disabled={saving}
        className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        onClick={() => void submit()}
      >
        建立
      </button>
    </div>
  );
}
