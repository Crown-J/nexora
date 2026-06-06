// apps/nx-ui/src/features/part-zoned/StockSettingsSatellite.tsx
/**
 * W5 [2-2] 2026-06-06：零件庫存設定衛星表（NX-MANUAL-02 v2.0 §5.1 庫存分頁）
 *
 * 從 PartFormZoned 抽出、變成「fetch + 顯示」實裝（取代 placeholder）。
 * 每倉一筆：安全量 minQty / 最高量 maxQty / 預設庫位 defaultLocationId / 補貨點 reorderQty。
 *
 * 本軌範圍（minimal）：只做 read + 顯示資料表；CRUD 操作（新增 / 改 / 停用）留後續軌。
 * 後續軌可加：
 *   - inline 編輯 minQty / maxQty / defaultLocation
 *   - 新增列按鈕 + warehouse / location picker
 *   - 低庫存警報串接報表
 */

'use client';

import { useEffect, useState } from 'react';

import { SatelliteSection } from '@/features/satellite/SatelliteSection';
import {
  listPartStockSettingByPart,
  type PartStockSettingDto,
} from '@/features/base/api/partStockSetting';

export function StockSettingsSatellite({
  partId,
  label,
  satelliteName,
  notes,
}: {
  /** 零件 ID；空字串 / null（新增模式尚未存檔）→ render placeholder、不 fetch */
  partId: string | null | undefined;
  label: string;
  satelliteName?: string;
  notes?: string;
}) {
  const [items, setItems] = useState<PartStockSettingDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = partId?.trim();
    if (!id) {
      setItems([]);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    listPartStockSettingByPart(id)
      .then((rows) => {
        if (cancelled) return;
        setItems(rows);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : '載入失敗');
        setItems([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [partId]);

  const status: 'ready' | 'empty' = items.length > 0 ? 'ready' : 'empty';
  const count = items.length;
  const fmt = (s: string | null | undefined) => (s == null || s === '' ? '—' : s);

  return (
    <SatelliteSection
      title={label}
      description={`衛星表 ${satelliteName ?? ''}；${notes ?? ''}`}
      count={count}
      status={status}
      hint="後端 endpoint 已備；本軌 read 顯示、CRUD 後續軌補"
      summary={
        loading ? (
          <div className="text-xs text-[#5A5A60]">載入中…</div>
        ) : error ? (
          <div className="text-xs text-[#E26060]">{error}</div>
        ) : !partId ? (
          <div className="text-xs text-[#5A5A60]">尚未儲存料件、儲存後可設定每倉安全量 / 最高量 / 預設庫位</div>
        ) : count === 0 ? (
          <div className="text-xs text-[#5A5A60]">尚未設定任何倉的庫存安全量</div>
        ) : (
          <div className="text-xs text-[#E8E8EB]">
            <span className="text-[#5A5A60]">已設定 </span>
            <span className="font-mono">{count}</span>
            <span className="text-[#5A5A60]"> 個倉</span>
          </div>
        )
      }
      expandedContent={
        loading || error || !partId || count === 0 ? null : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-[#5A5A60]">
                <th className="py-1.5 pr-3">倉庫</th>
                <th className="py-1.5 pr-3 text-right">安全量</th>
                <th className="py-1.5 pr-3 text-right">最高量</th>
                <th className="py-1.5 pr-3 text-right">補貨點</th>
                <th className="py-1.5 pr-3">預設庫位</th>
                <th className="py-1.5">啟用</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
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
                  <td className="py-1.5 pr-3 text-right font-mono tabular-nums text-[#E8E8EB]">{fmt(it.minQty)}</td>
                  <td className="py-1.5 pr-3 text-right font-mono tabular-nums text-[#E8E8EB]">{fmt(it.maxQty)}</td>
                  <td className="py-1.5 pr-3 text-right font-mono tabular-nums text-[#888892]">{fmt(it.reorderQty)}</td>
                  <td className="py-1.5 pr-3 font-mono text-xs text-[#888892]">{fmt(it.defaultLocationId)}</td>
                  <td className="py-1.5">
                    {it.isActive ? (
                      <span className="text-[#22D88F]">啟用</span>
                    ) : (
                      <span className="text-[#5A5A60]">停用</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      }
    />
  );
}
