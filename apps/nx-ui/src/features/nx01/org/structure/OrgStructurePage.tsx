// apps/nx-ui/src/features/nx01/org/structure/OrgStructurePage.tsx
// 組織架構圖（案例 1 / Step 3 Commit B）
//
// B 方案雙分支樹：
//   部門 → [📁 組別 / 🎖 職務] → 葉子（組別 / 職務）→ 點葉子右欄顯示員工
//
// schema 真相：Role 只 link Department、Team 也 link Department、Role 與 Team 不直接關聯。
// 所以「部門→組別→職務→使用者」嚴格四層不成立、用雙分支樹呈現。
//
// 互動：
//   - 點組別葉子 → 右欄顯示該組成員（filter by teamIds）
//   - 點職務葉子 → 右欄顯示掛此職務的員工（filter by roleIds）
//   - 「指派員工」開 EntityPickerDialog 多選加入 teamIds[] 或 roleIds[]
//   - 員工可多歸組、多職（執行長拍板）
//   - ✕ 鈕 / Delete 鍵：從 teamIds[] 或 roleIds[] 移除（員工本身不刪）
'use client';

import { useCallback, useMemo, useState } from 'react';
import { Briefcase, Building2, FolderTree, Users2, UserPlus } from 'lucide-react';

import { MasterBatchShell } from '@design/components/master-batch';
import type { MasterBatchConfig } from '@design/components/master-batch';
import { EntityPickerDialog } from '@design/components/multi-select-modal/EntityPickerDialog';
import type { PagedResult } from '@data/types/nx01/api';

import {
  DEPARTMENTS,
  EMPLOYEES_SEED,
  ROLES,
  TEAMS,
  departmentName,
  type EmployeeMock,
} from './mock-data';

type StructureNodeType = 'department' | 'team-folder' | 'role-folder' | 'team' | 'role';

type StructureNode = {
  id: string;
  type: StructureNodeType;
  label: string;
  deptId?: string;
  teamId?: string;
  roleId?: string;
};

export function OrgStructurePage() {
  const [employees, setEmployees] = useState<EmployeeMock[]>(EMPLOYEES_SEED);
  const [pickerSubject, setPickerSubject] = useState<StructureNode | null>(null);

  // ---------- 樹結構 ----------
  const treeRoots = useCallback(
    (): StructureNode[] =>
      DEPARTMENTS.map((d) => ({
        id: `dept:${d.id}`,
        type: 'department',
        label: d.name,
        deptId: d.id,
      })),
    [],
  );

  const treeChildren = useCallback((n: StructureNode): StructureNode[] => {
    if (n.type === 'department') {
      return [
        { id: `folder:${n.deptId!}:teams`, type: 'team-folder', label: '組別', deptId: n.deptId },
        { id: `folder:${n.deptId!}:roles`, type: 'role-folder', label: '職務', deptId: n.deptId },
      ];
    }
    if (n.type === 'team-folder') {
      return TEAMS.filter((t) => t.deptId === n.deptId).map((t) => ({
        id: `team:${t.id}`,
        type: 'team',
        label: t.name,
        deptId: t.deptId,
        teamId: t.id,
      }));
    }
    if (n.type === 'role-folder') {
      return ROLES.filter((r) => r.deptId === n.deptId).map((r) => ({
        id: `role:${r.id}`,
        type: 'role',
        label: r.name,
        deptId: r.deptId,
        roleId: r.id,
      }));
    }
    return [];
  }, []);

  const membersOf = useCallback(
    (n: StructureNode): EmployeeMock[] => {
      if (n.type === 'team') return employees.filter((e) => e.teamIds.includes(n.teamId!));
      if (n.type === 'role') return employees.filter((e) => e.roleIds.includes(n.roleId!));
      return [];
    },
    [employees],
  );

  // ---------- config ----------
  const config = useMemo<MasterBatchConfig<StructureNode, EmployeeMock>>(
    () => ({
      title: '組織架構圖',
      category: '組織架構',
      desc: '部門 → 組別／職務 → 使用者；員工可多歸組、多職。點開部門展開組別／職務分支。',
      subjectIcon: FolderTree,
      subjectNoun: '組織節點',
      memberNoun: '使用者',
      memberUnit: '位',
      addLabel: '指派員工',
      addIcon: UserPlus,

      leftMode: 'tree',
      treeRoots,
      treeChildren,
      isSelectable: (n) => n.type === 'team' || n.type === 'role',
      defaultExpandedIds: () =>
        DEPARTMENTS.flatMap((d) => [
          `dept:${d.id}`,
          `folder:${d.id}:teams`,
          `folder:${d.id}:roles`,
        ]),
      subjectId: (n) => n.id,
      subjectTitle: (n) => n.label,
      subjectCount: (n) => {
        if (n.type === 'team' || n.type === 'role') return membersOf(n).length;
        return undefined;
      },

      rightMode: 'list',
      members: membersOf,
      memberId: (e) => e.id,
      renderMember: (e) => <EmployeeRow employee={e} />,

      onAdd: (n) => {
        if (n.type === 'team' || n.type === 'role') setPickerSubject(n);
      },
      onRemoveMember: (n, userId, ctx) => {
        const removed = employees.find((e) => e.id === userId);
        setEmployees((prev) =>
          prev.map((e) => {
            if (e.id !== userId) return e;
            if (n.type === 'team') return { ...e, teamIds: e.teamIds.filter((t) => t !== n.teamId) };
            if (n.type === 'role') return { ...e, roleIds: e.roleIds.filter((r) => r !== n.roleId) };
            return e;
          }),
        );
        ctx.showToast(`已將 ${removed?.name ?? '員工'} 移出「${n.label}」`, 'success');
      },
      emptyText: (n) => {
        if (n.type === 'team')
          return {
            title: `「${n.label}」組別還沒有成員`,
            desc: '點右上「指派員工」勾選後加入；員工可多歸組。',
          };
        if (n.type === 'role')
          return {
            title: `「${n.label}」職務還沒有成員`,
            desc: '點右上「指派員工」勾選後加入；員工可多職。',
          };
        return { title: '請選一個組別或職務', desc: '展開部門節點選擇組別或職務分支。' };
      },
    }),
    [employees, membersOf, treeChildren, treeRoots],
  );

  // ---------- picker：client array 包 fake search ----------
  const pickerSearch = useCallback(
    async (q: string): Promise<PagedResult<EmployeeMock>> => {
      if (!pickerSubject) return { items: [], page: 1, pageSize: 0, total: 0 };
      const qq = q.trim().toLowerCase();
      const alreadyIds = new Set(membersOf(pickerSubject).map((e) => e.id));
      const items = employees.filter((e) => {
        if (alreadyIds.has(e.id)) return false;
        if (!qq) return true;
        return e.name.includes(q) || e.id.toLowerCase().includes(qq);
      });
      return { items, page: 1, pageSize: items.length, total: items.length };
    },
    [employees, membersOf, pickerSubject],
  );

  const handlePickerConfirm = useCallback(
    async (selected: EmployeeMock[]) => {
      if (!pickerSubject) return;
      const subj = pickerSubject;
      setEmployees((prev) =>
        prev.map((e) => {
          const isAdded = selected.some((s) => s.id === e.id);
          if (!isAdded) return e;
          if (subj.type === 'team') {
            if (e.teamIds.includes(subj.teamId!)) return e;
            return { ...e, teamIds: [...e.teamIds, subj.teamId!] };
          }
          if (subj.type === 'role') {
            if (e.roleIds.includes(subj.roleId!)) return e;
            return { ...e, roleIds: [...e.roleIds, subj.roleId!] };
          }
          return e;
        }),
      );
    },
    [pickerSubject],
  );

  const pickerTitle = pickerSubject
    ? `指派員工到「${pickerSubject.label}」`
    : '指派員工';
  const pickerSubtitle =
    pickerSubject?.type === 'team' ? 'Assign Team Members' : 'Assign Role Members';

  return (
    <>
      <MasterBatchShell config={config} />

      <EntityPickerDialog<EmployeeMock>
        open={pickerSubject !== null}
        onClose={() => setPickerSubject(null)}
        title={pickerTitle}
        subtitle={pickerSubtitle}
        icon={Users2}
        searchPlaceholder="搜尋姓名或員工編號…"
        search={pickerSearch}
        getId={(e) => e.id}
        getLabel={(e) => `${e.id} · ${e.name}`}
        getDescription={(e) => `部門：${departmentName(e.deptId)}`}
        onConfirm={handlePickerConfirm}
        confirmLabel="指派"
      />
    </>
  );
}

/* ============ 員工列渲染 ============ */
function EmployeeRow({ employee }: { employee: EmployeeMock }) {
  const teamLabels = TEAMS.filter((t) => employee.teamIds.includes(t.id))
    .map((t) => t.name)
    .join('、');
  const roleLabels = ROLES.filter((r) => employee.roleIds.includes(r.id))
    .map((r) => r.name)
    .join('、');
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-9 flex-none place-items-center rounded-full bg-[#E8A020]/18 text-sm font-semibold text-[#E8A020]">
        {employee.name.slice(0, 1)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-foreground">{employee.name}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
          <span className="font-mono text-foreground/85">{employee.id}</span>
          <span className="text-muted-foreground/70">·</span>
          <span className="inline-flex items-center gap-1">
            <Building2 className="size-3" />
            {departmentName(employee.deptId)}
          </span>
          {roleLabels ? (
            <span className="inline-flex items-center gap-1">
              <Briefcase className="size-3" />
              {roleLabels}
            </span>
          ) : null}
          {teamLabels ? <span className="text-muted-foreground/70">組：{teamLabels}</span> : null}
        </div>
      </div>
    </div>
  );
}
