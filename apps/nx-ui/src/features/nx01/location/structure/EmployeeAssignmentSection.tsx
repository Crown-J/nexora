// apps/nx-ui/src/features/nx01/location/structure/EmployeeAssignmentSection.tsx
// 據點架構圖 — 員工歸屬副區
//
// 用法：作為 MasterBatchShell list-with-extra 的 extra 區渲染、只在選中據點時顯示。
// 業務語意：員工可多歸據點（執行長拍板）；此區管理「該據點目前歸屬哪些員工」。
//
// 互動：
//   - 標頭「指派員工」鈕 → 開 picker（由 page 集中管 picker state、本元件 emit click）
//   - 員工卡 ✕ 鈕 → 從 employee.siteIds 移除該據點
'use client';

import { UserPlus, Users2, X } from 'lucide-react';

import { cn } from '@design/utils/cn';

import type { SiteEmployeeMock } from './mock-data';

export type EmployeeAssignmentSectionProps = {
  siteName: string;
  employees: SiteEmployeeMock[];
  onAddClick: () => void;
  onRemove: (employeeId: string) => void;
};

export function EmployeeAssignmentSection({
  siteName,
  employees,
  onAddClick,
  onRemove,
}: EmployeeAssignmentSectionProps) {
  return (
    <div className="flex h-full flex-col">
      {/* 副區標頭 */}
      <div className="mb-2 flex flex-none items-center gap-2.5">
        <Users2 className="size-4 text-[#E8A020]" />
        <span className="text-sm font-semibold text-foreground">員工歸屬</span>
        <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-mono tabular-nums text-muted-foreground">
          {employees.length} 位
        </span>
        <span className="flex-1" />
        <button
          type="button"
          onClick={onAddClick}
          className="inline-flex h-7 items-center gap-1.5 rounded-md border border-[#E8A020]/45 bg-[#E8A020]/14 px-2.5 text-xs font-semibold text-[#E8A020] transition-colors hover:bg-[#E8A020]/22"
        >
          <UserPlus className="size-3.5" />
          指派員工
        </button>
      </div>

      {/* 列表 */}
      <div className="min-h-0 flex-1">
        {employees.length === 0 ? (
          <div className="flex h-full min-h-[140px] flex-col items-center justify-center gap-2 px-6 text-center">
            <div className="text-sm text-muted-foreground">「{siteName}」還沒有歸屬員工</div>
            <div className="max-w-[34ch] text-xs leading-relaxed text-muted-foreground/70">
              點右上「指派員工」勾選後加入；員工可同時歸屬多個據點。
            </div>
          </div>
        ) : (
          employees.map((e) => (
            <div
              key={e.id}
              className={cn(
                'group mb-0.5 flex items-center gap-3 rounded-lg p-2 transition-colors',
                'hover:bg-accent/30',
              )}
            >
              <span className="grid size-8 flex-none place-items-center rounded-full bg-[#E8A020]/18 text-sm font-semibold text-[#E8A020]">
                {e.name.slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-foreground">{e.name}</div>
                <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                  <span className="font-mono text-foreground/85">{e.id}</span>
                  <span>· {e.dept}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemove(e.id)}
                title="移出此據點"
                aria-label="移出此據點"
                className={cn(
                  'grid size-7 flex-none place-items-center rounded-md border border-transparent text-muted-foreground/60',
                  'opacity-0 transition-opacity hover:border-destructive/40 hover:bg-destructive/15 hover:text-destructive',
                  'group-hover:opacity-100',
                )}
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
