// apps/nx-ui/src/features/part-zoned/StockSettingsSatellite.tsx
/**
 * W5 收尾 2026-06-06：零件庫存設定衛星表 CRUD UI（NX-MANUAL-02 v2.0 §5.1 庫存分頁）
 *
 * 每倉一筆：安全量 minQty / 最高量 maxQty / 補貨點 reorderQty / 預設庫位 defaultLocationId。
 * - LITE 多倉時每倉自己設、單倉 = 1 筆
 * - safety 串到庫存報表「低庫存警報」（後續軌）
 *
 * 本版（W5 收尾）：read + 新增 + inline 編輯 + 停用/啟用 + warehouse picker + location picker
 * Alex W5 驗收意見對齊：「能看不能填等於半成品」→ 補完 CRUD。
 */

'use client';

import { useCallback, useEffect, useState } from 'react';

import { SatelliteSection } from '@/features/satellite/SatelliteSection';
import { KeyboardSelect } from '@/features/master-shell/ui/KeyboardSelect';
import { apiJson } from '@data/api/client';
import { buildQueryString } from '@data/api/query';
import { listWarehouses, type WarehouseDto } from '@/features/base/api/warehouse';
import {
  createPartStockSetting,
  listPartStockSettingByPart,
  updatePartStockSetting,
  type PartStockSettingDto,
} from '@/features/base/api/partStockSetting';

type LocationLite = {
  id: string;
  warehouseId: string;
  code: string;
  name: string | null;
};

type DraftRow = {
  warehouseId: string;
  minQty: string;
  maxQty: string;
  reorderQty: string;
  defaultLocationId: string;
};

const EMPTY_DRAFT: DraftRow = {
  warehouseId: '',
  minQty: '0',
  maxQty: '0',
  reorderQty: '0',
  defaultLocationId: '',
};

function toDraft(r: PartStockSettingDto): DraftRow {
  return {
    warehouseId: r.warehouseId,
    minQty: r.minQty,
    maxQty: r.maxQty,
    reorderQty: r.reorderQty,
    defaultLocationId: r.defaultLocationId ?? '',
  };
}

export function StockSettingsSatellite({
  partId,
  label,
  satelliteName,
  notes,
}: {
  partId: string | null | undefined;
  label: string;
  satelliteName?: string;
  notes?: string;
}) {
  const [items, setItems] = useState<PartStockSettingDto[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([]);
  const [locations, setLocations] = useState<LocationLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 編輯 / 新增 state（同時間只允許一個列在 edit 模式 / 或新增模式）
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingMode, setAddingMode] = useState(false);
  const [draft, setDraft] = useState<DraftRow>(EMPTY_DRAFT);
  const [submitting, setSubmitting] = useState(false);

  const reload = useCallback(async () => {
    const id = partId?.trim();
    if (!id) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await listPartStockSettingByPart(id);
      setItems(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入失敗');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [partId]);

  // 載入 part 設定 + warehouse / location 字典
  useEffect(() => {
    let cancelled = false;
    void reload();
    void listWarehouses({ isActive: true, pageSize: 100 })
      .then((r) => {
        if (!cancelled) setWarehouses(r.items);
      })
      .catch(() => {
        if (!cancelled) setWarehouses([]);
      });
    void apiJson<{ items: LocationLite[] }>(
      `/nx01/locations${buildQueryString({ pageSize: '500' })}`,
    )
      .then((r) => {
        if (!cancelled) setLocations(r.items);
      })
      .catch(() => {
        if (!cancelled) setLocations([]);
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const cancelEdit = () => {
    setEditingId(null);
    setAddingMode(false);
    setDraft(EMPTY_DRAFT);
  };

  const startAdd = () => {
    setEditingId(null);
    setAddingMode(true);
    setDraft({ ...EMPTY_DRAFT, warehouseId: warehouses[0]?.id ?? '' });
  };

  const startEdit = (row: PartStockSettingDto) => {
    setAddingMode(false);
    setEditingId(row.id);
    setDraft(toDraft(row));
  };

  const parseNumber = (s: string): number => {
    const n = Number(s.trim());
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };

  const handleSave = async () => {
    if (!partId) return;
    if (addingMode && !draft.warehouseId) {
      setError('請選擇倉庫');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const body = {
        minQty: parseNumber(draft.minQty),
        maxQty: parseNumber(draft.maxQty),
        reorderQty: parseNumber(draft.reorderQty),
        defaultLocationId: draft.defaultLocationId || undefined,
      };
      if (addingMode) {
        await createPartStockSetting({
          partId,
          warehouseId: draft.warehouseId,
          ...body,
        });
      } else if (editingId) {
        await updatePartStockSetting(editingId, body);
      }
      cancelEdit();
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : '儲存失敗');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (row: PartStockSettingDto) => {
    setSubmitting(true);
    setError(null);
    try {
      await updatePartStockSetting(row.id, { isActive: !row.isActive });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : '切換啟用失敗');
    } finally {
      setSubmitting(false);
    }
  };

  // 過濾出當前 draft.warehouseId 的庫位
  const locationOptsForDraft = locations
    .filter((l) => l.warehouseId === draft.warehouseId)
    .map((l) => ({
      value: l.id,
      label: l.name ? `${l.code} ${l.name}` : l.code,
    }));

  // warehouse 選項：新增模式才會用、編輯模式 warehouseId 鎖
  const warehouseOpts = warehouses.map((w) => ({
    value: w.id,
    label: `${w.code} ${w.name}`,
  }));

  // 已設定的 warehouseId set（新增時避免重選同倉）
  const usedWarehouseIds = new Set(items.map((it) => it.warehouseId));
  const availableWarehouseOpts = warehouseOpts.filter(
    (o) => !usedWarehouseIds.has(o.value),
  );

  const count = items.length;
  const status: 'ready' | 'empty' = count > 0 || addingMode ? 'ready' : 'empty';

  const summaryEl = loading ? (
    <div className="text-xs text-[#5A5A60]">載入中…</div>
  ) : error ? (
    <div className="text-xs text-[#E26060]">{error}</div>
  ) : !partId ? (
    <div className="text-xs text-[#5A5A60]">尚未儲存料件、儲存後可設定每倉安全量 / 最高量 / 預設庫位</div>
  ) : count === 0 ? (
    <div className="text-xs text-[#5A5A60]">尚未設定任何倉的庫存安全量；點「展開全部」新增</div>
  ) : (
    <div className="text-xs text-[#E8E8EB]">
      <span className="text-[#5A5A60]">已設定 </span>
      <span className="font-mono">{count}</span>
      <span className="text-[#5A5A60]"> 個倉、點「展開全部」管理</span>
    </div>
  );

  const numCellCls = 'rounded-md border border-[#E8A020]/30 bg-[#0A0A0C] px-2 py-1 text-xs text-right text-[#E8E8EB] outline-none w-20';

  // 行 render：browse / editing inline form
  const renderRow = (it: PartStockSettingDto) => {
    const isEditing = editingId === it.id;
    if (isEditing) {
      return (
        <tr key={it.id} className="border-t border-[#E8A020]/40 bg-[#E8A020]/5">
          <td className="py-1.5 pr-3 text-[#888892]">
            {it.warehouse ? `${it.warehouse.code} ${it.warehouse.name}` : it.warehouseId}
          </td>
          <td className="py-1.5 pr-3 text-right">
            <input
              type="number"
              min="0"
              step="any"
              value={draft.minQty}
              onChange={(e) => setDraft({ ...draft, minQty: e.target.value })}
              className={numCellCls}
            />
          </td>
          <td className="py-1.5 pr-3 text-right">
            <input
              type="number"
              min="0"
              step="any"
              value={draft.maxQty}
              onChange={(e) => setDraft({ ...draft, maxQty: e.target.value })}
              className={numCellCls}
            />
          </td>
          <td className="py-1.5 pr-3 text-right">
            <input
              type="number"
              min="0"
              step="any"
              value={draft.reorderQty}
              onChange={(e) => setDraft({ ...draft, reorderQty: e.target.value })}
              className={numCellCls}
            />
          </td>
          <td className="py-1.5 pr-3 min-w-[10rem]">
            <KeyboardSelect
              value={draft.defaultLocationId}
              options={[{ value: '', label: '（不指定）' }, ...locationOptsForDraft]}
              ariaLabel="預設庫位"
              onChange={(v) => setDraft({ ...draft, defaultLocationId: v })}
            />
          </td>
          <td className="py-1.5 pr-3 text-right whitespace-nowrap">
            <button
              type="button"
              onClick={handleSave}
              disabled={submitting}
              className="mr-1 rounded border border-[#22D88F]/40 bg-[#22D88F]/10 px-2 py-0.5 text-[10px] text-[#22D88F] hover:bg-[#22D88F]/20 disabled:opacity-50"
            >
              {submitting ? '存…' : '存檔'}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              disabled={submitting}
              className="rounded border border-[#3A3A42] px-2 py-0.5 text-[10px] text-[#888892] hover:border-[#5A5A60]"
            >
              取消
            </button>
          </td>
        </tr>
      );
    }
    return (
      <tr key={it.id} className="border-t border-[#2A2A30]/60">
        <td className="py-1.5 pr-3 text-[#E8E8EB]">
          {it.warehouse ? (
            <>
              <span className="font-mono text-[#888892]">{it.warehouse.code}</span>
              <span className="ml-1.5">{it.warehouse.name}</span>
            </>
          ) : (
            <span className="font-mono text-[#5A5A60]">{it.warehouseId}</span>
          )}
        </td>
        <td className="py-1.5 pr-3 text-right font-mono tabular-nums text-[#E8E8EB]">{it.minQty}</td>
        <td className="py-1.5 pr-3 text-right font-mono tabular-nums text-[#E8E8EB]">{it.maxQty}</td>
        <td className="py-1.5 pr-3 text-right font-mono tabular-nums text-[#888892]">{it.reorderQty}</td>
        <td className="py-1.5 pr-3 font-mono text-xs text-[#888892]">
          {it.defaultLocationId
            ? locations.find((l) => l.id === it.defaultLocationId)?.code ?? it.defaultLocationId
            : '—'}
        </td>
        <td className="py-1.5 pr-3 text-right whitespace-nowrap">
          <button
            type="button"
            onClick={() => startEdit(it)}
            disabled={submitting || editingId !== null || addingMode}
            className="mr-1 rounded border border-[#3A3A42] px-2 py-0.5 text-[10px] text-[#B8B8C0] hover:border-[#5A5A60] disabled:opacity-50"
          >
            編輯
          </button>
          <button
            type="button"
            onClick={() => handleToggleActive(it)}
            disabled={submitting}
            className={
              it.isActive
                ? 'rounded border border-[#E26060]/40 bg-[#E26060]/10 px-2 py-0.5 text-[10px] text-[#E26060] hover:bg-[#E26060]/20 disabled:opacity-50'
                : 'rounded border border-[#22D88F]/40 bg-[#22D88F]/10 px-2 py-0.5 text-[10px] text-[#22D88F] hover:bg-[#22D88F]/20 disabled:opacity-50'
            }
          >
            {it.isActive ? '停用' : '啟用'}
          </button>
        </td>
      </tr>
    );
  };

  // 新增 inline form row
  const renderAddRow = () => (
    <tr className="border-t border-[#E8A020]/40 bg-[#E8A020]/5">
      <td className="py-1.5 pr-3">
        <KeyboardSelect
          value={draft.warehouseId}
          options={[
            { value: '', label: '（選擇倉庫）' },
            ...availableWarehouseOpts,
          ]}
          ariaLabel="倉庫"
          onChange={(v) => setDraft({ ...draft, warehouseId: v, defaultLocationId: '' })}
        />
      </td>
      <td className="py-1.5 pr-3 text-right">
        <input
          type="number"
          min="0"
          step="any"
          value={draft.minQty}
          onChange={(e) => setDraft({ ...draft, minQty: e.target.value })}
          className={numCellCls}
        />
      </td>
      <td className="py-1.5 pr-3 text-right">
        <input
          type="number"
          min="0"
          step="any"
          value={draft.maxQty}
          onChange={(e) => setDraft({ ...draft, maxQty: e.target.value })}
          className={numCellCls}
        />
      </td>
      <td className="py-1.5 pr-3 text-right">
        <input
          type="number"
          min="0"
          step="any"
          value={draft.reorderQty}
          onChange={(e) => setDraft({ ...draft, reorderQty: e.target.value })}
          className={numCellCls}
        />
      </td>
      <td className="py-1.5 pr-3 min-w-[10rem]">
        <KeyboardSelect
          value={draft.defaultLocationId}
          options={[{ value: '', label: '（不指定）' }, ...locationOptsForDraft]}
          ariaLabel="預設庫位"
          onChange={(v) => setDraft({ ...draft, defaultLocationId: v })}
        />
      </td>
      <td className="py-1.5 pr-3 text-right whitespace-nowrap">
        <button
          type="button"
          onClick={handleSave}
          disabled={submitting || !draft.warehouseId}
          className="mr-1 rounded border border-[#22D88F]/40 bg-[#22D88F]/10 px-2 py-0.5 text-[10px] text-[#22D88F] hover:bg-[#22D88F]/20 disabled:opacity-50"
        >
          {submitting ? '存…' : '新增'}
        </button>
        <button
          type="button"
          onClick={cancelEdit}
          disabled={submitting}
          className="rounded border border-[#3A3A42] px-2 py-0.5 text-[10px] text-[#888892] hover:border-[#5A5A60]"
        >
          取消
        </button>
      </td>
    </tr>
  );

  const expandedEl =
    loading || !partId ? null : (
      <div className="space-y-2">
        {error ? (
          <div className="rounded border border-[#E26060]/40 bg-[#E26060]/10 px-2 py-1 text-xs text-[#E26060]">
            {error}
          </div>
        ) : null}

        {count === 0 && !addingMode ? (
          <div className="text-xs text-[#5A5A60]">尚未設定任何倉的庫存安全量</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-[#5A5A60]">
                <th className="py-1.5 pr-3">倉庫</th>
                <th className="py-1.5 pr-3 text-right">安全量</th>
                <th className="py-1.5 pr-3 text-right">最高量</th>
                <th className="py-1.5 pr-3 text-right">補貨點</th>
                <th className="py-1.5 pr-3">預設庫位</th>
                <th className="py-1.5 pr-3 text-right">動作</th>
              </tr>
            </thead>
            <tbody>
              {items.map(renderRow)}
              {addingMode ? renderAddRow() : null}
            </tbody>
          </table>
        )}

        {!addingMode && !editingId ? (
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-[#5A5A60]">
              {availableWarehouseOpts.length === 0
                ? '所有倉庫都已設定、不可再新增（同 part 同倉唯一）'
                : `可新增 ${availableWarehouseOpts.length} 個未設定的倉`}
            </span>
            <button
              type="button"
              onClick={startAdd}
              disabled={availableWarehouseOpts.length === 0 || submitting}
              className="rounded border border-[#E8A020]/40 bg-[#E8A020]/10 px-3 py-1 text-[11px] text-[#E8A020] hover:bg-[#E8A020]/20 disabled:opacity-50"
            >
              + 新增倉設定
            </button>
          </div>
        ) : null}
      </div>
    );

  return (
    <SatelliteSection
      title={label}
      description={`衛星表 ${satelliteName ?? ''}；${notes ?? ''}`}
      count={count}
      status={status}
      hint={partId ? `共 ${count} 個倉` : '存檔後可設定'}
      summary={summaryEl}
      expandedContent={expandedEl}
    />
  );
}
