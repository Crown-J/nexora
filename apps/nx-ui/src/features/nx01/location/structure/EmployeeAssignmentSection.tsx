// apps/nx-ui/src/features/nx01/location/structure/EmployeeAssignmentSection.tsx
// 據點架構圖 — 員工歸屬副區（B-1 案、2026-06-22 改）
//
// 業務語意：員工指派到「倉庫」、據點透過倉庫推導。所以這個元件渲染兩種模式：
//   variant='warehouse'：完整版（顯示負責人 + 員工列表、可指派/換主要/移除）
//   variant='site'：精簡版（read-only、顯示該據點下所有倉的員工聯集）
'use client';

import { Star, UserCog, UserPlus, Users2, X } from 'lucide-react';

import { cn } from '@design/utils/cn';

export type EmployeeAssignmentRow = {
  /** user-warehouse 衛星 row id；read-only 顯示時可省 */
  assignmentId?: string;
  userId: string;
  userAccount: string | null;
  userDisplayName: string | null;
  isPrimary: boolean;
};

export type EmployeeAssignmentSectionProps =
  | {
      variant: 'warehouse';
      warehouseName: string;
      managerName: string | null;
      managerAccount: string | null;
      employees: EmployeeAssignmentRow[];
      onAddClick: () => void;
      onChangeManagerClick: () => void;
      onRemove: (assignmentId: string) => void;
      onTogglePrimary: (assignmentId: string, currentPrimary: boolean) => void;
    }
  | {
      variant: 'site';
      siteName: string;
      employees: EmployeeAssignmentRow[];
    };

export function EmployeeAssignmentSection(props: EmployeeAssignmentSectionProps) {
  if (props.variant === 'site') {
    return (
      <div className="flex h-full flex-col">
        <div className="mb-2 flex flex-none items-center gap-2.5">
          <Users2 className="size-4 text-[#E8A020]" />
          <span className="text-sm font-semibold text-foreground">員工聯集</span>
          <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-mono tabular-nums text-muted-foreground">
            {props.employees.length} 位
          </span>
          <span className="ml-2 text-[11px] text-muted-foreground/70">
            （此據點所有倉的員工去重）
          </span>
        </div>
        <div className="min-h-0 flex-1">
          {props.employees.length === 0 ? (
            <EmptyState
              title={`「${props.siteName}」還沒有歸屬員工`}
              desc="進入下方的倉庫節點、點「指派員工」加入歸屬。"
            />
          ) : (
            props.employees.map((e) => (
              <div key={e.userId} className="mb-0.5 flex items-center gap-3 rounded-lg p-2">
                <span className="grid size-8 flex-none place-items-center rounded-full bg-[#E8A020]/18 text-sm font-semibold text-[#E8A020]">
                  {(e.userDisplayName ?? e.userAccount ?? '?').slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-foreground">
                    {e.userDisplayName ?? e.userAccount ?? e.userId}
                  </div>
                  {e.userAccount ? (
                    <div className="text-[11px] font-mono text-muted-foreground">{e.userAccount}</div>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // ── warehouse variant ──
  const {
    warehouseName,
    managerName,
    managerAccount,
    employees,
    onAddClick,
    onChangeManagerClick,
    onRemove,
    onTogglePrimary,
  } = props;

  return (
    <div className="flex h-full flex-col gap-3">
      {/* 倉庫負責人區塊 */}
      <div className="flex flex-none items-center gap-3 rounded-lg border border-border bg-accent/20 px-3 py-2">
        <UserCog className="size-4 flex-none text-[#E8A020]" />
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            倉庫負責人
          </div>
          <div className="truncate text-sm font-semibold text-foreground">
            {managerName ?? <span className="text-muted-foreground/70">未指定</span>}
          </div>
          {managerAccount ? (
            <div className="text-[11px] font-mono text-muted-foreground">{managerAccount}</div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onChangeManagerClick}
          className="inline-flex h-7 items-center gap-1.5 rounded-md border border-[#E8A020]/45 bg-[#E8A020]/14 px-2.5 text-xs font-semibold text-[#E8A020] transition-colors hover:bg-[#E8A020]/22"
        >
          {managerName ? '換負責人' : '指定負責人'}
        </button>
      </div>

      {/* 員工歸屬區塊標頭 */}
      <div className="mb-1 flex flex-none items-center gap-2.5">
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

      <div className="min-h-0 flex-1 overflow-auto">
        {employees.length === 0 ? (
          <EmptyState
            title={`「${warehouseName}」還沒有歸屬員工`}
            desc="點右上「指派員工」勾選後加入；員工可同時歸屬多個倉。"
          />
        ) : (
          employees.map((e) => (
            <div
              key={e.assignmentId ?? e.userId}
              className="group mb-0.5 flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent/30"
            >
              <span className="grid size-8 flex-none place-items-center rounded-full bg-[#E8A020]/18 text-sm font-semibold text-[#E8A020]">
                {(e.userDisplayName ?? e.userAccount ?? '?').slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm text-foreground">
                    {e.userDisplayName ?? e.userAccount ?? e.userId}
                  </span>
                  {e.isPrimary ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#E8A020]/45 bg-[#E8A020]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#E8A020]">
                      <Star className="size-3" />
                      主要
                    </span>
                  ) : null}
                </div>
                {e.userAccount ? (
                  <div className="text-[11px] font-mono text-muted-foreground">{e.userAccount}</div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => e.assignmentId && onTogglePrimary(e.assignmentId, e.isPrimary)}
                title={e.isPrimary ? '取消主要倉庫' : '設為主要倉庫'}
                aria-label={e.isPrimary ? '取消主要倉庫' : '設為主要倉庫'}
                className={cn(
                  'inline-flex h-7 flex-none items-center gap-1 rounded-md border px-2 text-xs font-medium transition-colors',
                  e.isPrimary
                    ? 'border-[#E8A020]/45 bg-[#E8A020]/15 text-[#E8A020] hover:bg-[#E8A020]/22'
                    : 'border-border bg-background/60 text-muted-foreground hover:border-[#E8A020]/45 hover:bg-[#E8A020]/12 hover:text-[#E8A020]',
                )}
              >
                <Star className="size-3.5" />
                {e.isPrimary ? '主要' : '設主要'}
              </button>
              <button
                type="button"
                onClick={() => e.assignmentId && onRemove(e.assignmentId)}
                title="移出此倉"
                aria-label="移出此倉"
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

function EmptyState({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex h-full min-h-[120px] flex-col items-center justify-center gap-2 px-6 text-center">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="max-w-[34ch] text-xs leading-relaxed text-muted-foreground/70">{desc}</div>
    </div>
  );
}
