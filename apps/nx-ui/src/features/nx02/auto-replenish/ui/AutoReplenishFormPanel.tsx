/**
 * File: apps/nx-ui/src/features/nx02/auto-replenish/ui/AutoReplenishFormPanel.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-AURE-UI-002：自動補貨規則表單（倉別、優先順序、啟用）
 *
 * @FUNCTION_CODE NX02-AURE-UI-002-F01
 */

'use client';

import { useEffect, useState } from 'react';

import { listLookupWarehouse } from '@/features/nx00/lookup/api/lookup';

import { useAutoReplenish } from '../hooks/useAutoReplenish';

export type AutoReplenishFormPanelProps = {
  vm: ReturnType<typeof useAutoReplenish>;
};

/**
 * @FUNCTION_CODE NX02-AURE-UI-002-F01
 */
export function AutoReplenishFormPanel({ vm }: AutoReplenishFormPanelProps) {
  const { form, setForm, isNew, selectedId, save, remove, toggleActive, saving, error } = vm;
  const [whOpts, setWhOpts] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    listLookupWarehouse({ isActive: true })
      .then((w) => setWhOpts(w.map((x) => ({ id: x.id, name: x.name }))))
      .catch(() => setWhOpts([]));
  }, []);

  const showForm = isNew || selectedId;

  if (!showForm) {
    return (
      <div className="rounded-xl border border-border/80 bg-card/40 p-6 text-sm text-muted-foreground">
        請選擇左側規則，或點「新增規則」。
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-border/80 bg-card/40 p-4">
      <h2 className="text-sm font-semibold">{isNew ? '新增規則' : '編輯規則'}</h2>
      {error ? <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">{error}</div> : null}

      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        補貨來源倉庫
        <select
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          value={form.fromWarehouseId}
          onChange={(e) => setForm((f) => ({ ...f, fromWarehouseId: e.target.value }))}
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
        補貨目標倉庫
        <select
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          value={form.toWarehouseId}
          onChange={(e) => setForm((f) => ({ ...f, toWarehouseId: e.target.value }))}
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
        優先順序
        <input
          type="number"
          min={0}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          value={form.priority}
          onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        備註
        <textarea
          className="min-h-[72px] rounded-lg border border-border bg-background px-3 py-2 text-sm"
          value={form.remark}
          onChange={(e) => setForm((f) => ({ ...f, remark: e.target.value }))}
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => {
            const next = e.target.checked;
            if (isNew) setForm((f) => ({ ...f, isActive: next }));
            else void toggleActive(next);
          }}
        />
        啟用
      </label>

      <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
        <button
          type="button"
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          onClick={() => void save()}
        >
          儲存
        </button>
        {!isNew && selectedId ? (
          <button
            type="button"
            disabled={saving}
            className="rounded-lg border border-destructive/50 px-4 py-2 text-sm text-destructive disabled:opacity-50"
            onClick={() => void remove()}
          >
            刪除
          </button>
        ) : null}
      </div>
    </div>
  );
}
