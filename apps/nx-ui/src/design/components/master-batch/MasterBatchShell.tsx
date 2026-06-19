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
// tree mode 概念：
//   - hasChildren：純視覺判定（有子節點 → 顯示 chevron）
//   - isSelectable：行為判定（true 表可被選定、進入右欄）
//   - 兩者獨立、可同時 true（例：據點可選且有倉庫子節點）
//   - case 沒提供 isSelectable 時、預設 = 無 children 即可選
//
// 鍵盤：
//   左欄 flat：↑↓ 走、Enter/Space 選定、→ 跳右欄
//   左欄 tree：↑↓ 走 visibleRows、Enter/Space 可選→select / 不可選→toggle、
//              → 可選→select+zone右；非可選+折疊→展開；非可選+展開→下一節點
//              ← 已展開→折疊
//   右欄：↑↓ 走成員、Enter 開加入、Delete 移除、Esc/← 回左欄
//   全域：Alt+A 開加入（需有 selectedSubject）
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

/** tree mode 攤平輸出（內部 + 對外 view-model） */
type TreeRow<S> = {
  node: S;
  id: string;
  level: number;
  hasChildren: boolean;
  expanded: boolean;
  isSelectable: boolean;
};

function flattenTree<S>(
  roots: S[],
  childrenOf: (n: S) => S[],
  isSelectableOf: ((n: S) => boolean) | undefined,
  idOf: (n: S) => string,
  expandedIds: Set<string>,
  level = 0,
): TreeRow<S>[] {
  const out: TreeRow<S>[] = [];
  for (const node of roots) {
    const id = idOf(node);
    const children = childrenOf(node);
    const hasChildren = children.length > 0;
    const expanded = hasChildren && expandedIds.has(id);
    const isSelectable = isSelectableOf ? isSelectableOf(node) : !hasChildren;
    out.push({ node, id, level, hasChildren, expanded, isSelectable });
    if (expanded) {
      out.push(...flattenTree(children, childrenOf, isSelectableOf, idOf, expandedIds, level + 1));
    }
  }
  return out;
}

function countSelectable<S>(
  roots: S[],
  childrenOf: (n: S) => S[],
  isSelectableOf?: (n: S) => boolean,
): number {
  let n = 0;
  function dfs(node: S) {
    const children = childrenOf(node);
    const selectable = isSelectableOf ? isSelectableOf(node) : children.length === 0;
    if (selectable) n++;
    children.forEach(dfs);
  }
  roots.forEach(dfs);
  return n;
}

function findInTree<S>(
  roots: S[],
  childrenOf: (n: S) => S[],
  idOf: (n: S) => string,
  id: string,
): S | null {
  for (const node of roots) {
    if (idOf(node) === id) return node;
    const found = findInTree(childrenOf(node), childrenOf, idOf, id);
    if (found) return found;
  }
  return null;
}

export function MasterBatchShell<S, M>({ config, className }: MasterBatchShellProps<S, M>) {
  const { toasts, showToast } = useToast();
  const ctx = useMemo<BatchCtx>(() => ({ showToast }), [showToast]);

  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusZone, setFocusZone] = useState<'left' | 'right'>('left');
  const [leftFocusIdx, setLeftFocusIdx] = useState(0);
  const [rightFocusIdx, setRightFocusIdx] = useState(0);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    if (config.leftMode !== 'tree') return new Set();
    return new Set(config.defaultExpandedIds?.() ?? []);
  });

  const loadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    },
    [],
  );

  const subjectIdOf = useCallback((s: S) => config.subjectId?.(s) ?? '', [config]);
  const treeChildrenOf = useCallback((n: S) => config.treeChildren?.(n) ?? [], [config]);

  // ---------- flat 模式 ----------
  const flatSubjects = useMemo<S[]>(() => {
    if (config.leftMode !== 'flat') return [];
    return config.subjects?.() ?? [];
  }, [config]);

  const filteredFlat = useMemo<S[]>(() => {
    if (config.leftMode !== 'flat') return [];
    const q = query.trim().toLowerCase();
    if (!q || !config.subjectSearch) return flatSubjects;
    return flatSubjects.filter((s) => config.subjectSearch!(s, q));
  }, [config, flatSubjects, query]);

  // ---------- tree 模式 ----------
  const treeRoots = useMemo<S[]>(() => {
    if (config.leftMode !== 'tree') return [];
    return config.treeRoots?.() ?? [];
  }, [config]);

  const treeRows = useMemo<TreeRow<S>[]>(() => {
    if (config.leftMode !== 'tree') return [];
    return flattenTree(treeRoots, treeChildrenOf, config.isSelectable, subjectIdOf, expandedIds);
  }, [config.leftMode, config.isSelectable, expandedIds, subjectIdOf, treeChildrenOf, treeRoots]);

  const treeSelectableCount = useMemo<number>(() => {
    if (config.leftMode !== 'tree') return 0;
    return countSelectable(treeRoots, treeChildrenOf, config.isSelectable);
  }, [config.isSelectable, config.leftMode, treeChildrenOf, treeRoots]);

  // ---------- selectedSubject 解析（tree: 整棵樹找、不受 expand 影響） ----------
  const selectedSubject = useMemo<S | null>(() => {
    if (!selectedId) return null;
    if (config.leftMode === 'flat') {
      return flatSubjects.find((s) => subjectIdOf(s) === selectedId) ?? null;
    }
    return findInTree(treeRoots, treeChildrenOf, subjectIdOf, selectedId);
  }, [config.leftMode, flatSubjects, selectedId, subjectIdOf, treeChildrenOf, treeRoots]);

  // ---------- 選定（含 320ms 載入態） ----------
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

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ---------- 鍵盤導覽 ----------
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName ?? '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        if (e.key === 'Escape') (t as HTMLElement).blur();
        return;
      }
      // 全域 Alt+A
      if (e.altKey && (e.key === 'a' || e.key === 'A')) {
        if (selectedSubject && (config.isAddEnabled?.(selectedSubject) ?? true)) {
          e.preventDefault();
          config.onAdd(selectedSubject, ctx);
        }
        return;
      }

      if (focusZone === 'left') {
        if (config.leftMode === 'flat') handleFlatKey(e);
        else handleTreeKey(e);
      } else {
        // grouped 模式：暫不支援 ↑↓ Delete 鍵盤（後續軌可補 flatten 鍵盤導覽）
        if (config.rightMode === 'grouped') {
          if (e.key === 'ArrowLeft' || e.key === 'Escape') {
            e.preventDefault();
            setFocusZone('left');
            return;
          }
          if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedSubject && (config.isAddEnabled?.(selectedSubject) ?? true)) {
              config.onAdd(selectedSubject, ctx);
            }
          }
          return;
        }
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

    function handleFlatKey(e: KeyboardEvent) {
      const list = filteredFlat;
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
    }

    function handleTreeKey(e: KeyboardEvent) {
      const rows = treeRows;
      if (!rows.length) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setLeftFocusIdx((i) => (i + 1) % rows.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setLeftFocusIdx((i) => (i - 1 + rows.length) % rows.length);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const row = rows[leftFocusIdx];
        if (!row) return;
        if (row.isSelectable) {
          selectSubject(row.id, true);
          setFocusZone('right');
        } else if (row.hasChildren && !row.expanded) {
          toggleExpand(row.id);
        } else {
          setLeftFocusIdx((i) => (i + 1) % rows.length);
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const row = rows[leftFocusIdx];
        if (!row) return;
        if (row.hasChildren && row.expanded) toggleExpand(row.id);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const row = rows[leftFocusIdx];
        if (!row) return;
        if (row.isSelectable) {
          selectSubject(row.id, true);
          setFocusZone('right');
        } else if (row.hasChildren) {
          toggleExpand(row.id);
        }
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    config,
    ctx,
    filteredFlat,
    focusZone,
    leftFocusIdx,
    rightFocusIdx,
    selectSubject,
    selectedId,
    selectedSubject,
    subjectIdOf,
    toggleExpand,
    treeRows,
  ]);

  // ---------- 計數 chip ----------
  const totalCount =
    config.leftMode === 'flat' ? `${flatSubjects.length} 項` : `${treeSelectableCount} 項`;

  // ---------- grouped 模式：右欄分組（給 MemberPanel）----------
  const memberGroupsForPanel = useMemo(() => {
    if (config.rightMode !== 'grouped' || !selectedSubject || !config.memberGroups) return [];
    return config.memberGroups(selectedSubject);
  }, [config, selectedSubject]);

  // ---------- tree row VM（不暴露 S 給 SubjectPanel） ----------
  const treeRowVMs = useMemo(
    () =>
      treeRows.map((r) => ({
        id: r.id,
        level: r.level,
        hasChildren: r.hasChildren,
        expanded: r.expanded,
        isSelectable: r.isSelectable,
        title: config.subjectTitle?.(r.node) ?? r.id,
        count: config.subjectCount?.(r.node),
      })),
    [config, treeRows],
  );

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col gap-3', className)}>
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
          totalCount={config.leftMode === 'flat' ? flatSubjects.length : treeSelectableCount}
          // flat
          subjects={filteredFlat}
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
          // tree
          treeRows={treeRowVMs}
          onToggleExpand={toggleExpand}
          // create
          leftCreatable={config.leftCreatable}
          createLabel={config.createLabel}
          onCreate={config.onCreate ? () => config.onCreate!(ctx) : undefined}
        />

        <MemberPanel
          mode={config.rightMode}
          subjectIcon={config.subjectIcon}
          subjectTitle={
            selectedSubject && config.subjectTitle ? config.subjectTitle(selectedSubject) : null
          }
          subjectNoun={config.subjectNoun}
          memberNoun={config.memberNoun}
          memberUnit={config.memberUnit}
          addLabel={config.addLabel}
          addIcon={config.addIcon}
          loading={loadingMembers}
          members={selectedSubject ? config.members(selectedSubject) : []}
          memberGroups={memberGroupsForPanel}
          memberIdOf={config.memberId}
          renderMember={(m, i, focused) =>
            selectedSubject ? config.renderMember(m, i, focused, selectedSubject) : null
          }
          extraContent={
            selectedSubject && config.renderExtra ? config.renderExtra(selectedSubject) : undefined
          }
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
          onAdd={
            selectedSubject && (config.isAddEnabled?.(selectedSubject) ?? true)
              ? () => config.onAdd(selectedSubject, ctx)
              : undefined
          }
          emptyText={
            selectedSubject && config.emptyText ? config.emptyText(selectedSubject) : undefined
          }
          waitingSubjectText={`請先從左欄選一個${config.subjectNoun}`}
        />
      </div>

      <ToastStack toasts={toasts} />
    </div>
  );
}
