/**
 * File: apps/nx-ui/src/features/nx02/stock-take/ui/StockTakeDetailView.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-STTK-UI-002：盤點明細
 */

'use client';

import { cx } from '@/shared/lib/cx';
import { normalizeDecimalStringInput } from '@/shared/lib/normalize-numeric-input';

import type { StockTakeDetailVm } from '../hooks/useStockTakeDetail';

export type StockTakeDetailViewProps = { vm: StockTakeDetailVm };

const STATUS_LABEL: Record<string, string> = {
  O: '待盤',
  P: '已過帳',
  S: '跳過',
};

/**
 * @FUNCTION_CODE NX02-STTK-UI-002-F01
 */
export function StockTakeDetailView({ vm }: StockTakeDetailViewProps) {
  const { doc, lines, loading, saving, error, editable, updateLine, save, post, voidDoc, exportCsv, back } = vm;

  if (loading && !doc) return <p className="text-sm text-muted-foreground">載入中…</p>;
  if (!doc) return <p className="text-sm text-destructive">找不到盤點單</p>;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs tracking-[0.35em] text-muted-foreground">NX02</p>
          <h1 className="text-lg font-semibold break-all md:text-xl">{doc.docNo}</h1>
          <p className="text-xs text-muted-foreground md:text-sm">
            {doc.warehouseName}｜{doc.stockTakeDate}｜{doc.scopeType === 'F' ? '全倉' : '部分'}
          </p>
        </div>
        <button
          type="button"
          className="inline-flex min-h-[44px] items-center px-2 text-sm text-muted-foreground underline lg:min-h-0"
          onClick={back}
        >
          返回
        </button>
      </header>
      {error ? <div className="text-sm text-destructive">{error}</div> : null}

      <div className="hidden overflow-x-auto rounded-xl border border-border/80 lg:block">
        <table className="w-full min-w-[1100px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-2 py-2 text-left text-xs text-muted-foreground">料號</th>
              <th className="px-2 py-2 text-left text-xs text-muted-foreground">品名</th>
              <th className="px-2 py-2 text-right text-xs text-muted-foreground">帳面</th>
              <th className="px-2 py-2 text-right text-xs text-muted-foreground">實盤</th>
              <th className="px-2 py-2 text-right text-xs text-muted-foreground">差異</th>
              <th className="px-2 py-2 text-right text-xs text-muted-foreground">均價</th>
              <th className="px-2 py-2 text-right text-xs text-muted-foreground">差異金額</th>
              <th className="px-2 py-2 text-left text-xs text-muted-foreground">狀態</th>
              <th className="px-2 py-2 text-left text-xs text-muted-foreground">備註</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => {
              const c = l.countedInput.trim() === '' ? null : Number(l.countedInput);
              const diff = c == null || Number.isNaN(c) ? null : c - l.systemQty;
              const diffCls =
                diff == null ? '' : diff > 0 ? 'text-blue-600' : diff < 0 ? 'text-orange-600' : 'text-muted-foreground';
              const diffCost =
                diff != null && !Number.isNaN(diff) ? Math.abs(diff) * l.unitCost : l.diffCost;
              return (
                <tr key={l.id} className="border-b border-border/60">
                  <td className="px-2 py-2 font-mono text-xs">{l.partNo}</td>
                  <td className="max-w-[160px] truncate px-2 py-2 text-xs">{l.partName}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{l.systemQty}</td>
                  <td className="px-2 py-2 text-right">
                    {editable ? (
                      <input
                        type="number"
                        className="w-24 rounded border border-border bg-background px-1 py-0.5 text-right text-xs tabular-nums"
                        value={l.countedInput}
                        onChange={(e) =>
                          updateLine(l.id, { countedInput: normalizeDecimalStringInput(e.target.value) })
                        }
                        placeholder="空白=未盤"
                      />
                    ) : (
                      <span className="tabular-nums">{l.countedQty ?? '—'}</span>
                    )}
                  </td>
                  <td className={cx('px-2 py-2 text-right tabular-nums', diffCls)}>
                    {diff == null ? '—' : diff}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-xs">{l.unitCost}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-xs">
                    {editable && diff != null && !Number.isNaN(diff) ? diffCost.toFixed(2) : l.diffCost}
                  </td>
                  <td className="px-2 py-2 text-xs">{STATUS_LABEL[l.status] ?? l.status}</td>
                  <td className="px-2 py-2">
                    {editable ? (
                      <input
                        className="w-full min-w-[80px] rounded border border-border bg-background px-1 py-0.5 text-xs"
                        value={l.remarkInput}
                        onChange={(e) => updateLine(l.id, { remarkInput: e.target.value })}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">{l.remark ?? '—'}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 lg:hidden">
        {lines.map((l) => {
          const c = l.countedInput.trim() === '' ? null : Number(l.countedInput);
          const diff = c == null || Number.isNaN(c) ? null : c - l.systemQty;
          const diffCls =
            diff == null ? 'text-muted-foreground' : diff > 0 ? 'text-blue-600' : diff < 0 ? 'text-orange-600' : 'text-muted-foreground';
          const diffCost =
            diff != null && !Number.isNaN(diff) ? Math.abs(diff) * l.unitCost : l.diffCost;
          return (
            <div key={l.id} className="rounded-xl border border-border/80 bg-card/40 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-xs text-primary">{l.partNo}</div>
                  <div className="mt-0.5 truncate text-sm font-medium text-foreground">{l.partName}</div>
                </div>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {STATUS_LABEL[l.status] ?? l.status}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border/40 pt-2 text-xs">
                <div>
                  <div className="text-muted-foreground">帳面</div>
                  <div className="tabular-nums text-foreground">{l.systemQty}</div>
                </div>
                <div>
                  <div className="mb-1 text-muted-foreground">實盤</div>
                  {editable ? (
                    <input
                      type="number"
                      inputMode="decimal"
                      className="h-9 w-full rounded border border-border bg-background px-1 text-right text-sm tabular-nums"
                      value={l.countedInput}
                      onChange={(e) =>
                        updateLine(l.id, { countedInput: normalizeDecimalStringInput(e.target.value) })
                      }
                      placeholder="未盤"
                    />
                  ) : (
                    <span className="tabular-nums text-foreground">{l.countedQty ?? '—'}</span>
                  )}
                </div>
                <div>
                  <div className="text-muted-foreground">差異</div>
                  <div className={cx('tabular-nums', diffCls)}>{diff == null ? '—' : diff}</div>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="tabular-nums">均價 {l.unitCost}</span>
                <span className="tabular-nums">
                  差異金額 {editable && diff != null && !Number.isNaN(diff) ? diffCost.toFixed(2) : l.diffCost}
                </span>
              </div>
              {editable ? (
                <div className="mt-2">
                  <label className="mb-1 block text-xs text-muted-foreground">備註</label>
                  <input
                    className="h-11 w-full rounded border border-border bg-background px-2 text-sm"
                    value={l.remarkInput}
                    onChange={(e) => updateLine(l.id, { remarkInput: e.target.value })}
                  />
                </div>
              ) : l.remark ? (
                <div className="mt-2 text-xs text-muted-foreground">備註：{l.remark}</div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-border px-4 text-sm lg:min-h-0 lg:px-3 lg:py-2"
          onClick={() => void exportCsv()}
        >
          匯出 CSV
        </button>
        {editable ? (
          <>
            <button
              type="button"
              disabled={saving}
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-border px-4 text-sm disabled:opacity-50 lg:min-h-0 lg:px-3 lg:py-2"
              onClick={() => void save()}
            >
              儲存
            </button>
            <button
              type="button"
              disabled={saving}
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50 lg:min-h-0 lg:px-3 lg:py-2"
              onClick={() => void post()}
            >
              過帳
            </button>
          </>
        ) : null}
        {doc.status === 'D' ? (
          <button
            type="button"
            disabled={saving}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-destructive/40 px-4 text-sm text-destructive disabled:opacity-50 lg:min-h-0 lg:px-3 lg:py-2"
            onClick={() => void voidDoc()}
          >
            作廢
          </button>
        ) : null}
      </div>
    </div>
  );
}
