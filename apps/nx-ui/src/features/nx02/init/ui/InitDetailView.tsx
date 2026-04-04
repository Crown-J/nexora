/**
 * File: apps/nx-ui/src/features/nx02/init/ui/InitDetailView.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-INIT-UI-002：開帳存明細（儲存／過帳／作廢）
 *
 * Notes:
 * - @FUNCTION_CODE NX02-INIT-UI-002-F02
 */

'use client';

import { cx } from '@/shared/lib/cx';

import type { InitDetailVm } from '../hooks/useInitDetail';

import { InitItemsTable } from './init-items-table';

export type InitDetailViewProps = { vm: InitDetailVm };

function statusBadge(status: string) {
  if (status === 'P') return { label: '已過帳', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' };
  if (status === 'V') return { label: '作廢', cls: 'bg-destructive/15 text-destructive' };
  return { label: '草稿', cls: 'bg-muted text-muted-foreground' };
}

/**
 * @FUNCTION_CODE NX02-INIT-UI-002-F02
 */
export function InitDetailView({ vm }: InitDetailViewProps) {
  const {
    doc,
    loading,
    saving,
    error,
    initDate,
    setInitDate,
    remark,
    setRemark,
    warehouseId,
    items,
    isDraft,
    save,
    post,
    voidDoc,
    addRow,
    removeRow,
    updateRow,
    backToList,
  } = vm;

  if (loading && !doc) {
    return <p className="text-sm text-muted-foreground">載入中…</p>;
  }
  if (!doc) {
    return <p className="text-sm text-destructive">找不到單據</p>;
  }

  const b = statusBadge(doc.status);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs tracking-[0.35em] text-muted-foreground">NX02</p>
          <h1 className="text-xl font-semibold">開帳存 {doc.docNo}</h1>
          <p className="text-sm text-muted-foreground">{doc.warehouseName}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={cx('rounded-full px-3 py-1 text-xs font-medium', b.cls)}>{b.label}</span>
          <button type="button" className="text-sm text-muted-foreground underline" onClick={backToList}>
            返回列表
          </button>
        </div>
      </header>

      {error ? <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">{error}</div> : null}

      <div className="grid gap-4 rounded-xl border border-border/80 bg-card/40 p-4 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          開帳日期
          <input
            type="date"
            disabled={!isDraft}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm disabled:opacity-60"
            value={initDate}
            onChange={(e) => setInitDate(e.target.value)}
          />
        </label>
        <label className="md:col-span-2 flex flex-col gap-1 text-xs text-muted-foreground">
          備註
          <textarea
            disabled={!isDraft}
            className="min-h-[72px] rounded-lg border border-border bg-background px-3 py-2 text-sm disabled:opacity-60"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
          />
        </label>
      </div>

      <InitItemsTable
        warehouseId={warehouseId}
        items={items}
        editable={isDraft}
        onAdd={isDraft ? addRow : undefined}
        onRemove={isDraft ? removeRow : undefined}
        onUpdate={isDraft ? updateRow : undefined}
      />

      <div className="flex flex-wrap gap-2">
        {isDraft ? (
          <>
            <button
              type="button"
              disabled={saving}
              className="rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-50"
              onClick={() => void save()}
            >
              儲存
            </button>
            <button
              type="button"
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              onClick={() => void post()}
            >
              過帳
            </button>
            <button
              type="button"
              disabled={saving}
              className="rounded-lg border border-destructive/50 px-4 py-2 text-sm text-destructive disabled:opacity-50"
              onClick={() => void voidDoc()}
            >
              作廢
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
