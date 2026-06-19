// apps/nx-ui/src/design/components/master-batch/MemberPanel.tsx
// 主檔群組模板 — 右欄面板（標頭 + 成員 + 空狀態 / skeleton）
//
// list 模式：成員 list、ren by config.renderMember
// list-with-extra 模式：上半 list + 下半 extra（50/50 split、各自獨立滾動）
//   - 若 extraContent 為 null/undefined、上半佔滿
//   - extra 由 case 自行渲染（含獨立 modal / 互動）
// grouped 模式：Step 6（供應商供貨）補
//
// 對齊 demo cmb-engine.js 範式：320ms 載入 skeleton、空狀態三段式 + CTA、
// 鍵盤 focused row 顯示 ring。
'use client';

import { type ReactNode } from 'react';
import { ArrowRight, Inbox, Plus, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@design/utils/cn';

import type { RightMode } from './types';

const SKELETON_ROWS = 5;

export type MemberPanelProps<M> = {
  mode: RightMode;
  subjectIcon?: LucideIcon;
  /** 已選主體顯示名（null = 尚未選定） */
  subjectTitle: string | null;
  subjectNoun: string;
  memberNoun: string;
  memberUnit?: string;
  addLabel: string;
  addIcon?: LucideIcon;

  loading: boolean;
  members: M[];
  memberIdOf: (m: M) => string;
  renderMember: (m: M, index: number, focused: boolean) => ReactNode;
  /** list-with-extra：副區內容；undefined/null = 上半佔滿 */
  extraContent?: ReactNode;
  focusedIdx: number;
  onRowFocus: (idx: number) => void;
  onRemove?: (memberId: string) => void;
  onAdd?: () => void;
  emptyText?: { title: string; desc: string };
  waitingSubjectText: string;
};

export function MemberPanel<M>(props: MemberPanelProps<M>) {
  const {
    mode,
    subjectIcon: SubjectIcon,
    subjectTitle,
    subjectNoun,
    memberNoun,
    memberUnit = '項',
    addLabel,
    addIcon: AddIcon = Plus,
    loading,
    members,
    memberIdOf,
    renderMember,
    extraContent,
    focusedIdx,
    onRowFocus,
    onRemove,
    onAdd,
    emptyText,
    waitingSubjectText,
  } = props;

  const hasSubject = subjectTitle !== null;

  return (
    <div
      className={cn(
        'flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card/95',
        'backdrop-blur-md shadow-[0_1px_0_rgba(255,255,255,0.05)_inset,0_26px_60px_-34px_rgba(0,0,0,0.7)]',
      )}
    >
      {/* 標頭 */}
      <div className="flex flex-none items-center gap-2.5 border-b border-border/60 px-4 py-3">
        {SubjectIcon ? <SubjectIcon className="size-4 text-[#E8A020]" /> : null}
        <span className="truncate text-sm font-semibold tracking-wide text-foreground">
          {hasSubject ? `${subjectTitle} · ${memberNoun}` : `${memberNoun}清單`}
        </span>
        {hasSubject && !loading ? (
          <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-mono tabular-nums text-muted-foreground">
            {members.length} {memberUnit}
          </span>
        ) : null}
        <span className="flex-1" />
        {hasSubject && onAdd ? (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex h-8 items-center gap-2 rounded-md border border-[#E8A020]/45 bg-[#E8A020]/14 px-3 text-xs font-semibold text-[#E8A020] transition-colors hover:bg-[#E8A020]/22"
          >
            <AddIcon className="size-3.5" />
            {addLabel}
            <span className="ml-1 rounded border border-[#E8A020]/40 px-1 font-mono text-[10px] text-[#E8A020]">
              Alt+A
            </span>
          </button>
        ) : null}
      </div>

      {/* 內容 */}
      <div className="min-h-0 flex-1">
        {!hasSubject ? (
          <div className="h-full overflow-y-auto p-2">
            <EmptyState
              icon={<ArrowRight className="size-6" />}
              title={waitingSubjectText}
              desc={`選定後，這裡會載入該${subjectNoun}目前的${memberNoun}清單。`}
            />
          </div>
        ) : loading ? (
          <div className="h-full overflow-y-auto p-2">
            <SkeletonRows />
          </div>
        ) : mode === 'grouped' ? (
          <div className="px-4 py-8 text-center text-xs text-muted-foreground">
            grouped TODO（Step 6 補：供應商供貨按品牌分組）
          </div>
        ) : mode === 'list-with-extra' ? (
          <div className="flex h-full flex-col">
            <div
              className={cn(
                'min-h-0 overflow-y-auto p-2',
                extraContent ? 'flex-1' : 'h-full',
              )}
            >
              <MemberListBody
                members={members}
                memberIdOf={memberIdOf}
                renderMember={renderMember}
                focusedIdx={focusedIdx}
                onRowFocus={onRowFocus}
                onRemove={onRemove}
                emptyText={emptyText}
                subjectNoun={subjectNoun}
                memberNoun={memberNoun}
                addLabel={addLabel}
                onAdd={onAdd}
              />
            </div>
            {extraContent ? (
              <div className="min-h-0 flex-1 overflow-y-auto border-t border-border/60 p-2">
                {extraContent}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="h-full overflow-y-auto p-2">
            <MemberListBody
              members={members}
              memberIdOf={memberIdOf}
              renderMember={renderMember}
              focusedIdx={focusedIdx}
              onRowFocus={onRowFocus}
              onRemove={onRemove}
              emptyText={emptyText}
              subjectNoun={subjectNoun}
              memberNoun={memberNoun}
              addLabel={addLabel}
              onAdd={onAdd}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ============ 共用的 list body（list / list-with-extra 上半都用） ============ */
function MemberListBody<M>({
  members,
  memberIdOf,
  renderMember,
  focusedIdx,
  onRowFocus,
  onRemove,
  emptyText,
  subjectNoun,
  memberNoun,
  addLabel,
  onAdd,
}: {
  members: M[];
  memberIdOf: (m: M) => string;
  renderMember: (m: M, index: number, focused: boolean) => ReactNode;
  focusedIdx: number;
  onRowFocus: (idx: number) => void;
  onRemove?: (memberId: string) => void;
  emptyText?: { title: string; desc: string };
  subjectNoun: string;
  memberNoun: string;
  addLabel: string;
  onAdd?: () => void;
}) {
  if (members.length === 0) {
    return (
      <EmptyState
        icon={<Inbox className="size-6" />}
        title={emptyText?.title ?? `這個${subjectNoun}還沒有${memberNoun}`}
        desc={emptyText?.desc ?? `點右上「${addLabel}」加入。`}
        cta={onAdd ? { label: addLabel, onClick: onAdd } : undefined}
      />
    );
  }
  return (
    <>
      {members.map((m, i) => {
        const id = memberIdOf(m);
        const focused = i === focusedIdx;
        return (
          <div
            key={id}
            onMouseEnter={() => onRowFocus(i)}
            className={cn(
              'group relative mb-0.5 flex items-center gap-3 rounded-lg p-2.5 transition-colors',
              'hover:bg-accent/30',
              focused && 'ring-1 ring-inset ring-[#E8A020]/45',
            )}
          >
            <div className="min-w-0 flex-1">{renderMember(m, i, focused)}</div>
            {onRemove ? (
              <button
                type="button"
                onClick={() => onRemove(id)}
                title="移除"
                aria-label="移除"
                className={cn(
                  'grid size-8 flex-none place-items-center rounded-md border border-transparent text-muted-foreground/60',
                  'opacity-0 transition-opacity hover:border-destructive/40 hover:bg-destructive/15 hover:text-destructive',
                  'group-hover:opacity-100',
                  focused && 'opacity-100',
                )}
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>
        );
      })}
    </>
  );
}

/* ============ 空狀態 ============ */
function EmptyState({
  icon,
  title,
  desc,
  cta,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
  cta?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-3 px-7 py-10 text-center">
      <span className="grid size-14 place-items-center rounded-2xl border border-border bg-background/60 text-muted-foreground">
        {icon}
      </span>
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="max-w-[34ch] text-xs leading-relaxed text-muted-foreground/70">{desc}</div>
      {cta ? (
        <button
          type="button"
          onClick={cta.onClick}
          className="mt-1 inline-flex h-9 items-center gap-2 rounded-lg border border-[#E8A020]/45 bg-[#E8A020]/13 px-4 text-xs font-semibold text-[#E8A020] transition-colors hover:bg-[#E8A020]/20"
        >
          <Plus className="size-3.5" />
          {cta.label}
        </button>
      ) : null}
    </div>
  );
}

/* ============ Skeleton 5 列 ============ */
function SkeletonRows() {
  return (
    <>
      {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
        <div key={i} className="mb-0.5 flex items-center gap-3 p-2.5">
          <div className="size-9 flex-none animate-pulse rounded-full bg-accent/40" />
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="h-2.5 w-2/5 animate-pulse rounded bg-accent/40" />
            <div className="h-2 w-3/5 animate-pulse rounded bg-accent/30" />
          </div>
        </div>
      ))}
    </>
  );
}
