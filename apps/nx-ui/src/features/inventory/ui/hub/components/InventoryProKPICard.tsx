// apps/nx-ui/src/features/inventory/ui/hub/components/InventoryProKPICard.tsx
/**
 * TASK-BUSINESS-RESTRUCTURE Phase 8~10:庫存中心 PRO KPI 卡片。
 *
 * 依角色(warehouse_staff / leader / manager)顯示 personal / team / company 版本:
 *   個人 KPI:撿貨速度 / 包貨速度 / 誤差率
 *   團隊 KPI:團隊效率 / 調度完成率 / 調撥準確率
 *   公司 KPI:整體準時率 / 庫存週轉率 / 盤點差異率
 *
 * 仿 ProKPICard 結構,但因倉管 KPI 的 3 格內容因角色而異,採用 block[] 資料驅動
 * 而非寫死 3 格 field(更彈性)。Phase 10 完整版。
 */

'use client';

import { Boxes } from 'lucide-react';

import { cx } from '@design/utils/cx';

import {
  getInventoryKPILevelTitle,
  type InventoryKPIBlock,
  type InventoryKPIData,
  type InventoryKPILevel,
} from '../mock-data/scenario';

interface InventoryProKPICardProps {
  level: InventoryKPILevel;
  data: InventoryKPIData;
  /** 當前月份顯示文字,例如 '2026 年 4 月' */
  monthLabel: string;
  /** 顯示在標題右側的主體名,例如 '王小明' / '北區倉管組(5 人)' / '全公司' */
  subjectLabel: string;
}

export function InventoryProKPICard({
  level,
  data,
  monthLabel,
  subjectLabel,
}: InventoryProKPICardProps) {
  return (
    <div className="space-y-4 rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Boxes className="h-4 w-4 text-[#E8A020]" aria-hidden />
          <span className="text-sm text-white">{getInventoryKPILevelTitle(level)}</span>
          <span className="text-xs text-white/40">· {subjectLabel}</span>
        </div>
        <span className="text-xs text-white/40">{monthLabel}</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {data.blocks.map((block, idx) => (
          <KPIBlockView key={`${block.label}-${idx}`} block={block} />
        ))}
      </div>
    </div>
  );
}

function KPIBlockView({ block }: { block: InventoryKPIBlock }) {
  const statusColor =
    block.status === 'good'
      ? 'text-[#1D9E75]'
      : block.status === 'warning'
        ? 'text-[#E8A020]'
        : 'text-[#E24B4A]';

  const barColor =
    block.status === 'good'
      ? 'bg-[#1D9E75]'
      : block.status === 'warning'
        ? 'bg-[#E8A020]'
        : 'bg-[#E24B4A]';

  return (
    <div className="space-y-2">
      <div className="text-xs text-white/50">{block.label}</div>
      <div className="text-sm text-white tabular-nums">{block.value}</div>
      <div className="text-xs text-white/40">{block.sub}</div>

      {block.progress !== null ? (
        <div className="h-1 overflow-hidden rounded-full bg-white/10">
          <div
            className={cx('h-full transition-all duration-500', barColor)}
            style={{ width: `${Math.min(block.progress, 100)}%` }}
          />
        </div>
      ) : null}

      <div className={cx('text-xs', statusColor)}>{block.subText}</div>
    </div>
  );
}
