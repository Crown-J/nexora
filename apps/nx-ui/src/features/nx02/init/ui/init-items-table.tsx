/**
 * File: apps/nx-ui/src/features/nx02/init/ui/init-items-table.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-INIT-UI-004：開帳存明細表格（新增／編輯共用）
 */

'use client';

import { useEffect, useState } from 'react';

import { listLookupLocation } from '@/features/nx00/lookup/api/lookup';

import type { DraftItem } from '../hooks/useInitDetail';
import { PartLookupAutocomplete } from '../../shared/ui/PartLookupAutocomplete';

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
  onAdd?: () => void;
  onRemove?: (k: string) => void;
  onUpdate?: (k: string, p: Partial<DraftItem>) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">明細</h2>
        {editable && onAdd ? (
          <button type="button" className="text-sm text-primary" onClick={onAdd}>
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
            {items.map((row) => (
              <InitItemRow
                key={row.tempKey}
                warehouseId={warehouseId}
                row={row}
                editable={Boolean(editable)}
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
  onRemove,
  onUpdate,
}: {
  warehouseId: string;
  row: DraftItem;
  editable: boolean;
  onRemove?: () => void;
  onUpdate?: (p: Partial<DraftItem>) => void;
}) {
  const [locOpts, setLocOpts] = useState<{ id: string; label: string }[]>([]);
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
            label: `${x.code}${x.name ? ` ${x.name}` : ''}`,
          })),
        ),
      )
      .catch(() => setLocOpts([]));
  }, [warehouseId]);

  const qty = Number(row.qty) || 0;
  const uc = Number(row.unitCost) || 0;
  const lineAmt = qty * uc;

  return (
    <tr className="border-b border-border/60">
      <td className="px-2 py-2 align-top">
        {editable && onUpdate ? (
          <PartLookupAutocomplete
            partId={row.partId}
            partCode={row.partNo}
            partName={row.partName}
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
            className="max-w-[160px] rounded border border-border bg-background px-2 py-1 text-xs"
            value={row.locationId}
            onChange={(e) => onUpdate({ locationId: e.target.value })}
          >
            <option value="">（預設庫位）</option>
            {locOpts.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-xs text-muted-foreground">{row.locationId || '—'}</span>
        )}
      </td>
      <td className="px-2 py-2 text-right align-top">
        {editable && onUpdate ? (
          <input
            type="number"
            className="w-24 rounded border border-border bg-background px-2 py-1 text-right tabular-nums"
            value={row.qty}
            onChange={(e) => onUpdate({ qty: e.target.value })}
          />
        ) : (
          qty
        )}
      </td>
      <td className="px-2 py-2 text-right align-top">
        {editable && onUpdate ? (
          <input
            type="number"
            className="w-28 rounded border border-border bg-background px-2 py-1 text-right tabular-nums"
            value={row.unitCost}
            onChange={(e) => onUpdate({ unitCost: e.target.value })}
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
