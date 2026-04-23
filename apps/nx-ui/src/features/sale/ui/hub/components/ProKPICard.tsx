// apps/nx-ui/src/features/sale/ui/hub/components/ProKPICard.tsx
/**
 * R7 狀態追蹤分區頂部：PRO 限定 KPI 卡。
 * - 依角色（sales/team_leader/sales_manager）顯示 personal/team/company 3 種版本
 * - 3 格並排：業績（含進度條）/ 毛利率 / 退貨率
 * - 只在 PRO tier 顯示，呼叫端負責判斷
 */

'use client';

import { Crown } from 'lucide-react';

import { cx } from '@/shared/lib/cx';
import type { KPIData, KPILevel } from '../mock-data/scenario';

type KPIStatus = 'good' | 'warning' | 'danger';

interface ProKPICardProps {
  level: KPILevel;
  data: KPIData;
  /** 當前月份顯示文字，例如 '2026 年 4 月' */
  monthLabel: string;
  /** 顯示在標題右側的主體名，例如 '王小明' / '北區業務組（8 人）' / '全公司' */
  subjectLabel: string;
}

const LEVEL_TITLES: Record<KPILevel, string> = {
  personal: '個人 KPI',
  team: '團隊 KPI',
  company: '公司 KPI',
};

export function ProKPICard({ level, data, monthLabel, subjectLabel }: ProKPICardProps) {
  const salesActualTenK = (data.salesActual / 10000).toFixed(1);
  const salesTargetTenK = (data.salesTarget / 10000).toFixed(0);

  const salesStatus: KPIStatus = data.salesProgress >= 80 ? 'good' : 'warning';
  const marginStatus: KPIStatus = data.marginRate >= 27 ? 'good' : 'warning';
  const returnStatus: KPIStatus = data.returnRate < 3 ? 'good' : 'danger';

  return (
    <div className="space-y-4 rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-[#E8A020]" aria-hidden />
          <span className="text-sm text-white">{LEVEL_TITLES[level]}</span>
          <span className="text-xs text-white/40">· {subjectLabel}</span>
        </div>
        <span className="text-xs text-white/40">{monthLabel}</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <KPIBlock
          label="業績"
          value={`NT$ ${salesActualTenK} 萬`}
          sub={`目標 ${salesTargetTenK} 萬`}
          progress={data.salesProgress}
          status={salesStatus}
          subText={`${data.salesProgress.toFixed(1)}%`}
        />
        <KPIBlock
          label="毛利率"
          value={`${data.marginRate}%`}
          sub="目標 27%"
          progress={null}
          status={marginStatus}
          subText={marginStatus === 'good' ? '✓ 達標' : '⚠ 略低'}
        />
        <KPIBlock
          label="退貨率"
          value={`${data.returnRate}%`}
          sub="目標 < 3%"
          progress={null}
          status={returnStatus}
          subText={returnStatus === 'good' ? '✓ 良好' : '⚠ 偏高'}
        />
      </div>
    </div>
  );
}

interface KPIBlockProps {
  label: string;
  value: string;
  sub: string;
  progress: number | null;
  status: KPIStatus;
  subText: string;
}

function KPIBlock({ label, value, sub, progress, status, subText }: KPIBlockProps) {
  const statusColor =
    status === 'good'
      ? 'text-[#1D9E75]'
      : status === 'warning'
        ? 'text-[#E8A020]'
        : 'text-[#E24B4A]';

  const barColor = status === 'good' ? 'bg-[#1D9E75]' : 'bg-[#E8A020]';

  return (
    <div className="space-y-2">
      <div className="text-xs text-white/50">{label}</div>
      <div className="text-sm text-white tabular-nums">{value}</div>
      <div className="text-xs text-white/40">{sub}</div>

      {progress !== null ? (
        <div className="h-1 overflow-hidden rounded-full bg-white/10">
          <div
            className={cx('h-full transition-all duration-500', barColor)}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      ) : null}

      <div className={cx('text-xs', statusColor)}>{subText}</div>
    </div>
  );
}
