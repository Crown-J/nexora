/**
 * File: apps/nx-ui/src/features/nx02/init/ui/init-items-table.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-INIT-UI-004：開帳存明細表格（新增／編輯共用）
 * - Enter 鍵：零件選完 → 庫位 → 數量 → 均價；最後一列均價 Enter 新增列並聚焦新列零件
 */

'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';

import { listLookupLocation } from '@/features/nx00/lookup/api/lookup';
import { normalizeDecimalStringInput } from '@/shared/lib/normalize-numeric-input';

import type { DraftItem } from '../hooks/useInitDetail';
import { PartLookupAutocomplete } from '../../shared/ui/PartLookupAutocomplete';

function formatInitLocationReadOnly(row: DraftItem): string {
  if (row.locationCode || row.locationName) {
    const s = `${row.locationCode ?? ''}${row.locationName ? ` ${row.locationName}` : ''}`.trim();
    if (s) return s;
  }
  return row.locationId ? row.locationId : '—';
}

export function InitItemsTable({
  warehouseId,
  items,
  editable,
  onAdd,
  onRemove,
  onUpdate,
}: {
  warehouseId: string;
  items: DraftItem[];
  editable: boolean;
  /** 新增列時請回傳新列 tempKey，供鍵盤流程聚焦零件欄 */
  onAdd?: () => string | void;
  onRemove?: (k: string) => void;
  onUpdate?: (k: string, p: Partial<DraftItem>) => void;
}) {
  const partInputsRef = useRef<Map<string, HTMLInputElement | null>>(new Map());
  const focusPartTempKeyRef = useRef<string | null>(null);

  const setPartInputEl = useCallback((tempKey: string, el: HTMLInputElement | null) => {
    if (el) partInputsRef.current.set(tempKey, el);
    else partInputsRef.current.delete(tempKey);
  }, []);

  const handleLineComplete = useCallback(() => {
    if (!onAdd) return;
    const k = onAdd();
    if (typeof k === 'string' && k) focusPartTempKeyRef.current = k;
  }, [onAdd]);

  useLayoutEffect(() => {
    const k = focusPartTempKeyRef.current;
    if (!k) return;
    const run = () => {
      const el = partInputsRef.current.get(k);
      if (el) {
        el.focus();
        focusPartTempKeyRef.current = null;
      }
    };
    run();
    requestAnimationFrame(run);
  }, [items]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">明細</h2>
        {editable && onAdd ? (
          <button type="button" className="text-sm text-primary" onClick={() => onAdd()}>
            + 新增列
          </button>
        ) : null}
      </div>
      <div className="overflow-x-auto rounded-xl border border-border/80">
        <table className="w-full min-w-[960px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-2 py-2 text-left text-xs text-muted-foreground">零件</th>
              <th className="px-2 py-2 text-left text-xs text-muted-foreground">品名</th>
              <th className="px-2 py-2 text-left text-xs text-muted-foreground">庫位</th>
              <th className="px-2 py-2 text-right text-xs text-muted-foreground">數量</th>
              <th className="px-2 py-2 text-right text-xs text-muted-foreground">均價</th>
              <th className="px-2 py-2 text-right text-xs text-muted-foreground">金額</th>
              {editable ? <th className="px-2 py-2" /> : null}
            </tr>
          </thead>
          <tbody>
            {items.map((row, rowIndex) => (
              <InitItemRow
                key={row.tempKey}
                warehouseId={warehouseId}
                row={row}
                editable={Boolean(editable)}
                isLastRow={rowIndex === items.length - 1}
                registerPartInput={(el) => setPartInputEl(row.tempKey, el)}
                onLineComplete={
                  editable && onAdd && rowIndex === items.length - 1 ? handleLineComplete : undefined
                }
                onRemove={onRemove ? () => onRemove(row.tempKey) : undefined}
                onUpdate={onUpdate ? (p) => onUpdate(row.tempKey, p) : undefined}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InitItemRow({
  warehouseId,
  row,
  editable,
  isLastRow,
  registerPartInput,
  onLineComplete,
  onRemove,
  onUpdate,
}: {
  warehouseId: string;
  row: DraftItem;
  editable: boolean;
  isLastRow: boolean;
  registerPartInput: (el: HTMLInputElement | null) => void;
  onLineComplete?: () => void;
  onRemove?: () => void;
  onUpdate?: (p: Partial<DraftItem>) => void;
}) {
  const locSelectRef = useRef<HTMLSelectElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  const unitCostRef = useRef<HTMLInputElement>(null);
  const [locOpts, setLocOpts] = useState<
    { id: string; code: string; name: string | null; label: string }[]
  >([]);

  useEffect(() => {
    if (!warehouseId) {
      setLocOpts([]);
      return;
    }
    listLookupLocation({ warehouseId, isActive: true })
      .then((l) =>
        setLocOpts(
          l.map((x) => ({
            id: x.id,
            code: x.code,
            name: x.name,
            label: `${x.code}${x.name ? ` ${x.name}` : ''}`,
          })),
        ),
      )
      .catch(() => setLocOpts([]));
  }, [warehouseId]);

  const qty = Number(row.qty) || 0;
  const uc = Number(row.unitCost) || 0;
  const lineAmt = qty * uc;

  const focusLocation = useCallback(() => {
    queueMicrotask(() => locSelectRef.current?.focus());
  }, []);

  const onLocKeyDown = useCallback((e: KeyboardEvent<HTMLSelectElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    qtyRef.current?.focus();
  }, []);

  const onQtyKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    unitCostRef.current?.focus();
  }, []);

  const onUnitCostKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter') return;
      if (!onLineComplete || !isLastRow) return;
      e.preventDefault();
      onLineComplete();
    },
    [onLineComplete, isLastRow],
  );

  return (
    <tr className="border-b border-border/60">
      <td className="px-2 py-2 align-top">
        {editable && onUpdate ? (
          <PartLookupAutocomplete
            partId={row.partId}
            partCode={row.partNo}
            partName={row.partName}
            inputRef={registerPartInput}
            onCommittedSelection={focusLocation}
            onChange={(p) =>
              p
                ? onUpdate({ partId: p.id, partNo: p.code, partName: p.name })
                : onUpdate({ partId: '', partNo: '', partName: '' })
            }
            placeholder="料號或品名…"
            inputClassName="min-w-[10rem]"
          />
        ) : (
          <span className="font-mono text-xs">{row.partNo}</span>
        )}
      </td>
      <td className="max-w-[200px] px-2 py-2 text-xs">{row.partName || '—'}</td>
      <td className="px-2 py-2 align-top">
        {editable && onUpdate ? (
          <select
            ref={locSelectRef}
            className="max-w-[160px] rounded border border-border bg-background px-2 py-1 text-xs"
            value={row.locationId}
            onChange={(e) => {
              const v = e.target.value;
              const opt = locOpts.find((x) => x.id === v);
              onUpdate({
                locationId: v,
                locationCode: opt?.code ?? null,
                locationName: opt?.name ?? null,
              });
            }}
            onKeyDown={onLocKeyDown}
          >
            <option value="">（預設庫位）</option>
            {locOpts.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-xs text-muted-foreground">{formatInitLocationReadOnly(row)}</span>
        )}
      </td>
      <td className="px-2 py-2 text-right align-top">
        {editable && onUpdate ? (
          <input
            ref={qtyRef}
            type="number"
            className="w-24 rounded border border-border bg-background px-2 py-1 text-right tabular-nums"
            value={row.qty}
            onChange={(e) => onUpdate({ qty: normalizeDecimalStringInput(e.target.value) })}
            onKeyDown={onQtyKeyDown}
          />
        ) : (
          qty
        )}
      </td>
      <td className="px-2 py-2 text-right align-top">
        {editable && onUpdate ? (
          <input
            ref={unitCostRef}
            type="number"
            className="w-28 rounded border border-border bg-background px-2 py-1 text-right tabular-nums"
            value={row.unitCost}
            onChange={(e) => onUpdate({ unitCost: normalizeDecimalStringInput(e.target.value) })}
            onKeyDown={onUnitCostKeyDown}
          />
        ) : (
          uc
        )}
      </td>
      <td className="px-2 py-2 text-right tabular-nums">{lineAmt.toFixed(2)}</td>
      {editable && onRemove ? (
        <td className="px-2 py-2">
          <button type="button" className="text-xs text-destructive" onClick={onRemove}>
            刪
          </button>
        </td>
      ) : null}
    </tr>
  );
}
