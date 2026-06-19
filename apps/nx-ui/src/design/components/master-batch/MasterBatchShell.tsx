// apps/nx-ui/src/design/components/master-batch/MasterBatchShell.tsx
// 主檔群組模板（雙欄殼）— 對齊 demo cmb-engine.js 範式
//
// 結構：
//   <PageHeader> 麵包屑 + 標題 + 計數 + 描述
//   <div grid 360px 1fr>
//     <SubjectPanel />    左欄：搜尋 + 列表（flat / tree）
//     <MemberPanel />     右欄：頭 + 成員（list / list-with-extra / grouped）
//   </div>
//   <ToastStack />
//
// 狀態：query / selectedSubjectId / focusZone / leftFocusIdx / rightFocusIdx
// 鍵盤：
//   左欄：↑↓ 走、Enter/Space 選定（zone→right）、→ 跳右欄
//   右欄：↑↓ 走成員、Enter 開加入、Delete 移除、Esc/← 回左欄
//   全域：Alt+A 開加入（需有 selected subject）
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '@design/utils/cn';
import { PageHeader } from '@design/components/page-header/PageHeader';
import { ToastStack, useToast } from '@design/components/toast/ToastStack';

import { SubjectPanel } from './SubjectPanel';
import { MemberPanel } from './MemberPanel';
import type { BatchCtx, MasterBatchConfig } from './types';

const MEMBER_LOAD_MS = 320;

export type MasterBatchShellProps<S, M> = {
  config: MasterBatchConfig<S, M>;
  className?: string;
};

export function MasterBatchShell<S, M>({ config, className }: MasterBatchShellProps<S, M>) {
  const { toasts, showToast } = useToast();
  const ctx = useMemo<BatchCtx>(() => ({ showToast }), [showToast]);

  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusZone, setFocusZone] = useState<'left' | 'right'>('left');
  const [leftFocusIdx, setLeftFocusIdx] = useState(0);
  const [rightFocusIdx, setRightFocusIdx] = useState(0);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const loadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    },
    [],
  );

  // ---------- flat 模式：左欄資料 ----------
  const flatSubjects = useMemo<S[]>(() => {
    if (config.leftMode !== 'flat') return [];
    return config.subjects?.() ?? [];
  }, [config]);

  const subjectIdOf = useCallback(
    (s: S) => config.subjectId?.(s) ?? '',
    [config],
  );

  const filteredSubjects = useMemo<S[]>(() => {
    if (config.leftMode !== 'flat') return [];
    const q = query.trim().toLowerCase();
    if (!q) return flatSubjects;
    if (!config.subjectSearch) return flatSubjects;
    return flatSubjects.filter((s) => config.subjectSearch!(s, q));
  }, [config, flatSubjects, query]);

  const selectedSubject = useMemo<S | null>(() => {
    if (!selectedId) return null;
    if (config.leftMode !== 'flat') return null;
    return flatSubjects.find((s) => subjectIdOf(s) === selectedId) ?? null;
  }, [config.leftMode, flatSubjects, selectedId, subjectIdOf]);

  // ---------- 選定主體（含 320ms 載入態） ----------
  const selectSubject = useCallback(
    (id: string, force?: boolean) => {
      if (selectedId === id && !force) return;
      setSelectedId(id);
      setRightFocusIdx(0);
      setLoadingMembers(true);
      if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
      loadTimerRef.current = setTimeout(() => setLoadingMembers(false), MEMBER_LOAD_MS);
    },
    [selectedId],
  );

  // ---------- 鍵盤導覽 ----------
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName ?? '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        if (e.key === 'Escape') (t as HTMLElement).blur();
        return;
      }

      // 全域 Alt+A：開加入（需有 selectedSubject）
      if (e.altKey && (e.key === 'a' || e.key === 'A')) {
        if (selectedSubject) {
          e.preventDefault();
          config.onAdd(selectedSubject, ctx);
        }
        return;
      }

      if (focusZone === 'left') {
        const list = filteredSubjects;
        if (!list.length) return;
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setLeftFocusIdx((i) => (i + 1) % list.length);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setLeftFocusIdx((i) => (i - 1 + list.length) % list.length);
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const s = list[leftFocusIdx];
          if (s) {
            selectSubject(subjectIdOf(s), true);
            setFocusZone('right');
          }
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          const s = list[leftFocusIdx];
          if (s) {
            if (subjectIdOf(s) !== selectedId) selectSubject(subjectIdOf(s), true);
            setFocusZone('right');
          }
        }
      } else {
        const members = selectedSubject ? config.members(selectedSubject) : [];
        if (e.key === 'ArrowLeft' || e.key === 'Escape') {
          e.preventDefault();
          setFocusZone('left');
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          if (selectedSubject) config.onAdd(selectedSubject, ctx);
          return;
        }
        if (!members.length) return;
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setRightFocusIdx((i) => (i + 1) % members.length);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setRightFocusIdx((i) => (i - 1 + members.length) % members.length);
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          const m = members[rightFocusIdx];
          if (m && selectedSubject && config.onRemoveMember) {
            config.onRemoveMember(selectedSubject, config.memberId(m), ctx);
          }
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    config,
    ctx,
    filteredSubjects,
    focusZone,
    leftFocusIdx,
    rightFocusIdx,
    selectSubject,
    selectedId,
    selectedSubject,
    subjectIdOf,
  ]);

  // ---------- 標題列計數 ----------
  const totalCount =
    config.leftMode === 'flat'
      ? `${flatSubjects.length} 項`
      : undefined;

  return (
    <div data-nx-frame className={cn('flex h-full flex-col gap-3', className)}>
      <PageHeader
        crumbs={config.crumbs}
        category={config.category}
        title={config.title}
        desc={config.desc}
        count={totalCount}
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 px-4 pb-4 md:grid-cols-[360px_1fr]">
        <SubjectPanel
          mode={config.leftMode}
          subjectIcon={config.subjectIcon}
          subjectNoun={config.subjectNoun}
          searchPlaceholder={config.searchPlaceholder}
          query={query}
          onQueryChange={setQuery}
          // flat
          totalCount={config.leftMode === 'flat' ? flatSubjects.length : 0}
          subjects={filteredSubjects}
          subjectIdOf={subjectIdOf}
          subjectTitleOf={config.subjectTitle}
          subjectCountOf={config.subjectCount}
          selectedId={selectedId}
          focusedIdx={focusZone === 'left' ? leftFocusIdx : -1}
          onSelect={(id, idx) => {
            setLeftFocusIdx(idx);
            setFocusZone('right');
            selectSubject(id, true);
          }}
          // create
          leftCreatable={config.leftCreatable}
          createLabel={config.createLabel}
          onCreate={config.onCreate ? () => config.onCreate!(ctx) : undefined}
        />

        <MemberPanel
          mode={config.rightMode}
          subjectIcon={config.subjectIcon}
          subjectTitle={
            selectedSubject && config.subjectTitle
              ? config.subjectTitle(selectedSubject)
              : null
          }
          subjectNoun={config.subjectNoun}
          memberNoun={config.memberNoun}
          memberUnit={config.memberUnit}
          addLabel={config.addLabel}
          addIcon={config.addIcon}
          loading={loadingMembers}
          members={selectedSubject ? config.members(selectedSubject) : []}
          memberIdOf={config.memberId}
          renderMember={config.renderMember}
          focusedIdx={focusZone === 'right' ? rightFocusIdx : -1}
          onRowFocus={(idx) => {
            setRightFocusIdx(idx);
            setFocusZone('right');
          }}
          onRemove={
            selectedSubject && config.onRemoveMember
              ? (memberId) => config.onRemoveMember!(selectedSubject, memberId, ctx)
              : undefined
          }
          onAdd={selectedSubject ? () => config.onAdd(selectedSubject, ctx) : undefined}
          emptyText={
            selectedSubject && config.emptyText
              ? config.emptyText(selectedSubject)
              : undefined
          }
          waitingSubjectText={`請先從左欄選一個${config.subjectNoun}`}
        />
      </div>

      <ToastStack toasts={toasts} />
    </div>
  );
}
