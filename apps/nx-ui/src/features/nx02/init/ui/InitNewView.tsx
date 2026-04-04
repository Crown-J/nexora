/**
 * File: apps/nx-ui/src/features/nx02/init/ui/InitNewView.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-INIT-UI-003：新增開帳存
 *
 * Notes:
 * - @FUNCTION_CODE NX02-INIT-UI-003-F02
 */

'use client';

import { useEffect, useState } from 'react';

import { listLookupWarehouse } from '@/features/nx00/lookup/api/lookup';

import type { InitCreateVm } from '../hooks/useInitCreate';

import { InitItemsTable } from './init-items-table';

export type InitNewViewProps = { vm: InitCreateVm };

/**
 * @FUNCTION_CODE NX02-INIT-UI-003-F02
 */
export function InitNewView({ vm }: InitNewViewProps) {
  const {
    saving,
    error,
    warehouseId,
    setWarehouseId,
    initDate,
    setInitDate,
    remark,
    setRemark,
    items,
    addRow,
    removeRow,
    updateRow,
    submit,
    backToList,
  } = vm;

  const [whOpts, setWhOpts] = useState<{ id: string; name: string; code: string }[]>([]);
  useEffect(() => {
    listLookupWarehouse({ isActive: true })
      .then((w) => setWhOpts(w.map((x) => ({ id: x.id, name: x.name, code: x.code }))))
      .catch(() => setWhOpts([]));
  }, []);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs tracking-[0.35em] text-muted-foreground">NX02</p>
          <h1 className="text-xl font-semibold">新增開帳存</h1>
        </div>
        <button type="button" className="text-sm text-muted-foreground underline" onClick={backToList}>
          返回列表
        </button>
      </header>

      {error ? <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">{error}</div> : null}

      <div className="grid gap-4 rounded-xl border border-border/80 bg-card/40 p-4 md:grid-cols-2">
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
                {w.name} ({w.code})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          開帳日期
          <input
            type="date"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={initDate}
            onChange={(e) => setInitDate(e.target.value)}
          />
        </label>
        <label className="md:col-span-2 flex flex-col gap-1 text-xs text-muted-foreground">
          備註
          <textarea
            className="min-h-[72px] rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
          />
        </label>
      </div>

      <InitItemsTable
        warehouseId={warehouseId}
        items={items}
        editable
        onAdd={addRow}
        onRemove={removeRow}
        onUpdate={updateRow}
      />

      <div className="flex gap-2">
        <button
          type="button"
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          onClick={() => void submit()}
        >
          建立草稿
        </button>
      </div>
    </div>
  );
}
