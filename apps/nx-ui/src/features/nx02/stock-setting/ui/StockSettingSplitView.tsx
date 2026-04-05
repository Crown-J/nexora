/**
 * File: apps/nx-ui/src/features/nx02/stock-setting/ui/StockSettingSplitView.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-STKG-UI-001：庫存設定 左清單＋右表單
 */

'use client';

import { useEffect, useState } from 'react';

import { listLookupWarehouse } from '@/features/nx00/lookup/api/lookup';
import { PartLookupAutocomplete } from '@/features/nx02/shared/ui/PartLookupAutocomplete';
import { cx } from '@/shared/lib/cx';

import type { StockSettingVm } from '../hooks/useStockSetting';

export type StockSettingSplitViewProps = { vm: StockSettingVm };

/**
 * @FUNCTION_CODE NX02-STKG-UI-001-F01
 */
export function StockSettingSplitView({ vm }: StockSettingSplitViewProps) {
  const {
    qInput,
    setQInput,
    warehouseId,
    hasMinQty,
    page,
    pageSize,
    rows,
    total,
    loading,
    error,
    setQuery,
    selectedId,
    selectRow,
    form,
    setForm,
    formLoading,
    saving,
    isNew,
    startNew,
    save,
    toggleActive,
    reorderPreview,
  } = vm;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const [whOpts, setWhOpts] = useState<{ id: string; name: string; code: string }[]>([]);
  useEffect(() => {
    listLookupWarehouse({ isActive: true })
      .then((w) => setWhOpts(w.map((x) => ({ id: x.id, name: x.name, code: x.code }))))
      .catch(() => setWhOpts([]));
  }, []);

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col gap-4 lg:flex-row">
      <aside className="lg:w-[min(420px,40%)] space-y-3 rounded-xl border border-border/80 bg-card/40 p-4">
        <header className="space-y-1">
          <p className="text-xs tracking-[0.35em] text-muted-foreground">NX02</p>
          <h1 className="text-lg font-semibold">庫存設定</h1>
        </header>
        <input
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          placeholder="搜尋料號或品名…"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <select
            className="flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
            value={warehouseId}
            onChange={(e) => setQuery({ warehouseId: e.target.value || null, page: '1' })}
          >
            <option value="">全部倉庫</option>
            {whOpts.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={hasMinQty}
              onChange={(e) => setQuery({ hasMinQty: e.target.checked ? 'true' : null, page: '1' })}
            />
            有安全量
          </label>
        </div>
        <button
          type="button"
          className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground"
          onClick={() => startNew()}
        >
          新增設定
        </button>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        <div className="max-h-[55vh] overflow-auto rounded-lg border border-border/60">
          {loading ? (
            <p className="p-4 text-sm text-muted-foreground">載入中…</p>
          ) : (
            rows.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => selectRow(r.id)}
                className={cx(
                  'block w-full border-b border-border/50 px-3 py-2 text-left text-sm hover:bg-muted/50',
                  selectedId === r.id && 'bg-muted/70',
                )}
              >
                <div className="font-mono text-xs">{r.partCode}</div>
                <div className="truncate text-xs text-muted-foreground">{r.partName}</div>
                <div className="mt-1 flex justify-between text-xs">
                  <span>{r.warehouseName}</span>
                  <span className={r.isShortage ? 'font-medium text-orange-500' : ''}>
                    現存 {r.onHandQty}／安全 {r.minQty}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <button
            type="button"
            disabled={page <= 1}
            className="disabled:opacity-40"
            onClick={() => setQuery({ page: String(page - 1) })}
          >
            上一頁
          </button>
          <span>
            {page}/{totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            className="disabled:opacity-40"
            onClick={() => setQuery({ page: String(page + 1) })}
          >
            下一頁
          </button>
        </div>
      </aside>

      <section className="min-w-0 flex-1 space-y-4 rounded-xl border border-border/80 bg-card/40 p-4">
        {!form ? (
          <p className="text-sm text-muted-foreground">請選擇左側一筆或按「新增設定」。</p>
        ) : formLoading && !isNew ? (
          <p className="text-sm text-muted-foreground">載入表單…</p>
        ) : (
          <>
            <h2 className="text-base font-semibold">{isNew ? '新增庫存設定' : '編輯設定'}</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                <span>零件 {isNew ? '*' : '（唯讀）'}</span>
                {isNew ? (
                  <PartLookupAutocomplete
                    partId={form.partId}
                    partCode={form.partCode}
                    partName={form.partName}
                    onChange={(p) =>
                      p
                        ? setForm({ ...form, partId: p.id, partCode: p.code, partName: p.name })
                        : setForm({ ...form, partId: '', partCode: '', partName: '' })
                    }
                    placeholder="料號或品名…"
                    inputClassName="text-sm"
                  />
                ) : (
                  <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 font-mono text-sm">
                    {form.partCode || '—'}
                  </div>
                )}
              </div>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                倉庫 {isNew ? '' : '（唯讀）'}
                <select
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm disabled:opacity-60"
                  disabled={!isNew}
                  value={form.warehouseId}
                  onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}
                >
                  <option value="">請選擇</option>
                  {whOpts.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </label>
              {!isNew ? (
                <div className="md:col-span-2 text-sm">
                  <span className="text-muted-foreground">品名：</span>
                  {form.partName || '—'}
                </div>
              ) : null}
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                安全量
                <input
                  type="number"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={form.minQty}
                  onChange={(e) => setForm({ ...form, minQty: Number(e.target.value) })}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                最高量（0=不限制）
                <input
                  type="number"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={form.maxQty}
                  onChange={(e) => setForm({ ...form, maxQty: Number(e.target.value) })}
                />
              </label>
              <div className="text-sm">
                <span className="text-muted-foreground">建議補貨量（試算）：</span>
                <span className="ml-2 tabular-nums">{reorderPreview.toFixed(4)}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">現存量：</span>
                <span className="ml-2 tabular-nums">{form.onHandQty}</span>
              </div>
              <label className="md:col-span-2 flex flex-col gap-1 text-xs text-muted-foreground">
                備註
                <input
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={form.remark ?? ''}
                  onChange={(e) => setForm({ ...form, remark: e.target.value || null })}
                />
              </label>
              {!isNew && form.id ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    狀態：{form.isActive ? '啟用' : '停用'}
                  </span>
                  <button
                    type="button"
                    disabled={saving}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm disabled:opacity-50"
                    onClick={() => void toggleActive()}
                  >
                    切換啟用
                  </button>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              onClick={() => void save()}
            >
              儲存
            </button>
          </>
        )}
      </section>
    </div>
  );
}
