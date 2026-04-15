/**
 * @FUNCTION_CODE NX99-SYS-DASH-UI-024-F01
 * PRO 本月 KPI：圓形進度（SVG）＋三行文字
 */

'use client';

import type { MockProMonthlyKpiItem } from '@/mocks/dashboard';
import { getKpiColor, getProKpiDisplayPercent } from '@/features/sys-dashboard/lib/proKpiColor';

const R = 22;
const CIRC = 2 * Math.PI * R;
const VB = 56;
const CX = VB / 2;

type Props = {
  item: MockProMonthlyKpiItem;
};

export function ProKpiCircularRow({ item }: Props) {
  const displayPct = getProKpiDisplayPercent(item);
  const strokeColor = getKpiColor(displayPct);
  const dash = (displayPct / 100) * CIRC;

  return (
    <div className="flex gap-3">
      <div className="relative h-14 w-14 shrink-0" aria-hidden>
        <svg width={VB} height={VB} viewBox={`0 0 ${VB} ${VB}`} className="block text-muted-foreground/35">
          <circle cx={CX} cy={CX} r={R} fill="none" stroke="currentColor" strokeWidth={3.5} />
          <circle
            cx={CX}
            cy={CX}
            r={R}
            fill="none"
            stroke={strokeColor}
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${CIRC}`}
            transform={`rotate(-90 ${CX} ${CX})`}
          />
        </svg>
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] font-bold tabular-nums text-foreground">
          {displayPct}%
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="shrink-0 rounded-md border border-border/70 bg-muted/50 px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
            {item.type}
          </span>
          <span className="text-xs font-medium text-foreground sm:text-sm">{item.label}</span>
        </div>
        <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">計算：{item.formula}</div>
        <div className="mt-0.5 text-xs tabular-nums text-foreground">
          {item.current} / {item.target} 分
        </div>
      </div>
    </div>
  );
}
