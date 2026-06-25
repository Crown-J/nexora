// apps/nx-ui/src/features/nx01/org/user-zoned/WarehouseAddDialog.tsx
// 2026-06-23 執行長拍板：據點新增 dialog（3 步：據點 → 倉庫 → 主要）
//
// 流程：
//   1. 據點必選
//   2. 倉庫必選（依據點 filter）
//   3. 是否設為主要 checkbox（對應 user-warehouse.isPrimary）
//   4. 確認 → call assignUserWarehouse({ userId, warehouseId, isPrimary })
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Map, X } from 'lucide-react';

import { cn } from '@design/utils/cn';
import { useModalLayer } from '@design/primitives/modal-stack';
import { listSites, type SiteDto } from '@data/endpoints/nx01/api/site';
import { assignUserWarehouse } from '@data/endpoints/nx01/api/user-warehouse';
import { listWarehouses, type WarehouseDto } from '@data/endpoints/nx01/api/warehouse';

export type WarehouseAddDialogProps = {
  open: boolean;
  onClose: () => void;
  userId: string;
  onSuccess?: () => void;
};

export function WarehouseAddDialog({ open, onClose, userId, onSuccess }: WarehouseAddDialogProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  useModalLayer(layerRef, onClose, open);
  const [sites, setSites] = useState<SiteDto[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([]);

  const [siteId, setSiteId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSiteId('');
    setWarehouseId('');
    setIsPrimary(false);
    setError(null);
    void (async () => {
      try {
        const [siteRes, whRes] = await Promise.all([
          listSites({ pageSize: 100, isActive: true }),
          listWarehouses({ pageSize: 200, isActive: true }),
        ]);
        setSites(siteRes.items);
        setWarehouses(whRes.items);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [open]);

  const warehousesForSite = useMemo(
    () => warehouses.filter((w) => !siteId || w.siteId === siteId),
    [warehouses, siteId],
  );

  const canSubmit = siteId !== '' && warehouseId !== '' && !submitting;

  const handleConfirm = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await assignUserWarehouse({ userId, warehouseId, isPrimary });
      if (onSuccess) onSuccess();
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, userId, warehouseId, isPrimary, onSuccess, onClose]);

  if (!open) return null;

  return (
    <div
      ref={layerRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-md flex-col rounded-2xl border border-[#2A2A30] bg-[#131316] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-[#2A2A30] px-5 py-3">
          <span className="size-2 rounded-full bg-[#E8A020] shadow-[0_0_10px_#E8A020]" />
          <Map className="size-4 text-[#E8A020]" />
          <h2 className="text-sm font-bold tracking-wide text-[#F0F0F3]">新增隸屬據點</h2>
          <span className="ml-auto text-[10px] font-semibold uppercase tracking-[0.28em] text-[#5A5A60]">
            Add Warehouse
          </span>
        </div>

        <div className="flex flex-col gap-4 px-5 py-4 text-sm">
          <Step
            num={1}
            label="據點"
            required
            children={
              <select
                className={selectCls}
                value={siteId}
                onChange={(e) => {
                  setSiteId(e.target.value);
                  setWarehouseId('');
                }}
                disabled={submitting}
              >
                <option value="">請選擇據點</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id} className="bg-popover">
                    {s.code} · {s.name}
                  </option>
                ))}
              </select>
            }
          />
          <Step
            num={2}
            label="倉庫"
            required
            children={
              <select
                className={selectCls}
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                disabled={!siteId || submitting}
              >
                <option value="">請選擇倉庫</option>
                {warehousesForSite.map((w) => (
                  <option key={w.id} value={w.id} className="bg-popover">
                    {w.code} · {w.name}
                  </option>
                ))}
              </select>
            }
          />
          <Step
            num={3}
            label="是否設為主要據點"
            children={
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  className="size-4"
                />
                設為主要
              </label>
            }
          />
          {error ? (
            <div className="rounded-md border border-[#E26060]/40 bg-[#E26060]/10 px-3 py-2 text-xs text-[#E26060]">
              {error}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[#2A2A30] bg-[#0A0A0C]/40 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-[#2A2A30] bg-[#1A1A1F] px-3 text-xs font-medium text-[#B8B8C0] hover:bg-[#22222A] disabled:opacity-50"
          >
            <X className="size-3.5" />
            取消
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleConfirm}
            className={cn(
              'inline-flex h-8 items-center gap-1 rounded-md border px-3 text-xs font-semibold transition-colors',
              canSubmit
                ? 'border-[#22D88F]/40 bg-[#22D88F]/10 text-[#22D88F] hover:bg-[#22D88F]/20'
                : 'cursor-not-allowed border-border bg-muted/30 text-muted-foreground',
            )}
          >
            <Check className="size-3.5" />
            {submitting ? '建立中…' : '確認新增'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Step({
  num,
  label,
  required,
  children,
}: {
  num: number;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className="grid size-5 place-items-center rounded-full bg-[#E8A020]/15 text-[10px] font-bold text-[#E8A020]">
          {num}
        </span>
        <span className="text-[12px] font-semibold text-foreground">
          {label}
          {required ? <span className="ml-1 text-[#E26060]">*</span> : null}
        </span>
      </div>
      <div className="pl-7">{children}</div>
    </div>
  );
}

const selectCls =
  'h-9 w-full rounded-md border border-[#E8A020]/30 bg-[var(--nx-surface-input)] px-2.5 text-sm text-foreground outline-none focus:border-[#E8A020]/60 focus:ring-1 focus:ring-[#E8A020]/40 disabled:opacity-50';
