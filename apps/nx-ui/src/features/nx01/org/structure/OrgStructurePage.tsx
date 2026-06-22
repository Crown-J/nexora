// apps/nx-ui/src/features/nx01/org/structure/OrgStructurePage.tsx
// 組織架構圖（接真 API、2026-06-22 重寫）
//
// schema 真相：Role 只 link Department、Team 也 link Department、Role 與 Team 不直接關聯。
// 所以「部門→組別→職務→使用者」嚴格四層不成立、用雙分支樹呈現。
//
// 樹結構：
//   部門 → [📁 組別 / 🎖 職務] → 葉子（組別 / 職務）
//
// 互動：
//   - 點組別葉子 → 右欄顯示該組成員（從 nx01_user_team 衛星表）
//   - 點職務葉子 → 右欄顯示掛此職務的員工（從 nx01_user_role 衛星表）
//   - 「指派員工」開 EntityPickerDialog 多選加入；員工可多歸組、多職
//   - ✕ 鈕 / Delete 鍵：revoke user-team 或 user-role（員工本身不刪）
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Briefcase, Building2, FolderTree, Users2, UserPlus } from 'lucide-react';

import { MasterBatchShell } from '@design/components/master-batch';
import type { MasterBatchConfig } from '@design/components/master-batch';
import { EntityPickerDialog } from '@design/components/multi-select-modal/EntityPickerDialog';
import type { PagedResult } from '@data/types/nx01/api';
import { listDepartments, type DepartmentDto } from '@data/endpoints/nx01/api/department';
import { listTeams, type TeamDto } from '@data/endpoints/nx01/api/team';
import { listRoles, type RoleDto } from '@data/endpoints/nx01/api/role';
import {
  assignUserTeam,
  listUserTeams,
  revokeUserTeam,
  type UserTeamDto,
} from '@data/endpoints/nx01/api/user-team';
import {
  assignUserRole,
  listUserRoles,
  revokeUserRole,
  type UserRoleDto,
} from '@data/endpoints/nx01/api/user-role';
import { listUsers, type UserDto } from '@data/endpoints/nx01/api/user';

type StructureNodeType = 'department' | 'team-folder' | 'role-folder' | 'team' | 'role';

type StructureNode = {
  id: string;
  type: StructureNodeType;
  label: string;
  deptId?: string;
  teamId?: string;
  roleId?: string;
};

/** 葉子節點的成員顯示用結構 */
type MemberRow = {
  /** 衛星表 row id（user-team.id 或 user-role.id），用於 revoke */
  assignmentId: string;
  userId: string;
  userAccount: string | null;
  userDisplayName: string | null;
};

export function OrgStructurePage() {
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [teams, setTeams] = useState<TeamDto[]>([]);
  const [roles, setRoles] = useState<RoleDto[]>([]);
  /** Map<teamId, MemberRow[]> */
  const [teamMembers, setTeamMembers] = useState<Map<string, MemberRow[]>>(new Map());
  /** Map<roleId, MemberRow[]> */
  const [roleMembers, setRoleMembers] = useState<Map<string, MemberRow[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [pickerSubject, setPickerSubject] = useState<StructureNode | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  // ---------- 載入：departments + teams + roles + 衛星表所有 active assignments ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [depRes, teamRes, roleRes] = await Promise.all([
          listDepartments({ pageSize: 100, isActive: true }),
          listTeams({ pageSize: 200, isActive: true }),
          listRoles({ pageSize: 200, isActive: true }),
        ]);
        if (cancelled) return;
        setDepartments(depRes.items);
        setTeams(teamRes.items);
        setRoles(roleRes.items);

        // 為每個 team / role 並行 fetch 成員（衛星 active=true）
        const teamMap = new Map<string, MemberRow[]>();
        const roleMap = new Map<string, MemberRow[]>();
        await Promise.all([
          ...teamRes.items.map(async (t) => {
            const r = await listUserTeams({ teamId: t.id, isActive: true, pageSize: 100 }).catch(() => null);
            if (!r) return;
            teamMap.set(
              t.id,
              r.items.map((ut: UserTeamDto) => ({
                assignmentId: ut.id,
                userId: ut.userId,
                userAccount: ut.userAccount,
                userDisplayName: ut.userDisplayName,
              })),
            );
          }),
          ...roleRes.items.map(async (r0) => {
            const r = await listUserRoles({ roleId: r0.id, isActive: true, pageSize: 100 }).catch(() => null);
            if (!r) return;
            roleMap.set(
              r0.id,
              r.items.map((ur: UserRoleDto) => ({
                assignmentId: ur.id,
                userId: ur.userId,
                userAccount: ur.userAccount,
                userDisplayName: ur.userDisplayName,
              })),
            );
          }),
        ]);
        if (cancelled) return;
        setTeamMembers(teamMap);
        setRoleMembers(roleMap);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

  const triggerReload = useCallback(() => setReloadTick((t) => t + 1), []);

  // ---------- 樹結構 ----------
  const treeRoots = useCallback(
    (): StructureNode[] =>
      departments.map((d) => ({
        id: `dept:${d.id}`,
        type: 'department',
        label: d.name,
        deptId: d.id,
      })),
    [departments],
  );

  const treeChildren = useCallback(
    (n: StructureNode): StructureNode[] => {
      if (n.type === 'department') {
        return [
          { id: `folder:${n.deptId!}:teams`, type: 'team-folder', label: '組別', deptId: n.deptId },
          { id: `folder:${n.deptId!}:roles`, type: 'role-folder', label: '職務', deptId: n.deptId },
        ];
      }
      if (n.type === 'team-folder') {
        return teams
          .filter((t) => t.departmentId === n.deptId)
          .map((t) => ({
            id: `team:${t.id}`,
            type: 'team',
            label: t.name,
            deptId: t.departmentId,
            teamId: t.id,
          }));
      }
      if (n.type === 'role-folder') {
        return roles
          .filter((r) => r.departmentId === n.deptId)
          .map((r) => ({
            id: `role:${r.id}`,
            type: 'role',
            label: r.name,
            deptId: r.departmentId ?? undefined,
            roleId: r.id,
          }));
      }
      return [];
    },
    [teams, roles],
  );

  const membersOf = useCallback(
    (n: StructureNode): MemberRow[] => {
      if (n.type === 'team') return teamMembers.get(n.teamId!) ?? [];
      if (n.type === 'role') return roleMembers.get(n.roleId!) ?? [];
      return [];
    },
    [teamMembers, roleMembers],
  );

  // ---------- config ----------
  const config = useMemo<MasterBatchConfig<StructureNode, MemberRow>>(
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
        departments.flatMap((d) => [
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
      memberId: (m) => m.userId,
      renderMember: (m) => <EmployeeRowView member={m} />,

      onAdd: (n) => {
        if (n.type === 'team' || n.type === 'role') setPickerSubject(n);
      },
      onRemoveMember: async (n, userId, ctx) => {
        const member = membersOf(n).find((m) => m.userId === userId);
        if (!member) return;
        try {
          if (n.type === 'team') await revokeUserTeam(member.assignmentId);
          else if (n.type === 'role') await revokeUserRole(member.assignmentId);
          ctx.showToast(
            `已將 ${member.userDisplayName ?? member.userAccount ?? '員工'} 移出「${n.label}」`,
            'success',
          );
          triggerReload();
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          ctx.showToast(`移除失敗：${msg}`, 'danger');
        }
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
    [departments, membersOf, treeChildren, treeRoots, triggerReload],
  );

  // ---------- picker：listUsers async search、排除已指派的 ----------
  const pickerSearch = useCallback(
    async (q: string): Promise<PagedResult<UserDto>> => {
      if (!pickerSubject) return { items: [], page: 1, pageSize: 0, total: 0 };
      const existingUserIds = new Set(membersOf(pickerSubject).map((m) => m.userId));
      const res = await listUsers({ q: q.trim() || undefined, pageSize: 50, isActive: true });
      const items = res.items.filter((u) => !existingUserIds.has(u.id));
      return { items, page: 1, pageSize: items.length, total: items.length };
    },
    [pickerSubject, membersOf],
  );

  const handlePickerConfirm = useCallback(
    async (selected: UserDto[]) => {
      if (!pickerSubject) return;
      const subj = pickerSubject;
      try {
        for (const u of selected) {
          if (subj.type === 'team') {
            await assignUserTeam({ userId: u.id, teamId: subj.teamId! });
          } else if (subj.type === 'role') {
            await assignUserRole({ userId: u.id, roleId: subj.roleId! });
          }
        }
        triggerReload();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        alert(`指派失敗：${msg}`);
      }
    },
    [pickerSubject, triggerReload],
  );

  const pickerTitle = pickerSubject ? `指派員工到「${pickerSubject.label}」` : '指派員工';
  const pickerSubtitle =
    pickerSubject?.type === 'team' ? 'Assign Team Members' : 'Assign Role Members';

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">
        載入中…
      </div>
    );
  }

  return (
    <>
      <MasterBatchShell config={config} />

      <EntityPickerDialog<UserDto>
        open={pickerSubject !== null}
        onClose={() => setPickerSubject(null)}
        title={pickerTitle}
        subtitle={pickerSubtitle}
        icon={Users2}
        searchPlaceholder="搜尋姓名或員工編號…"
        search={pickerSearch}
        getId={(u) => u.id}
        getLabel={(u) => `${u.username} · ${u.displayName}`}
        getDescription={(u) => u.email ?? u.phone ?? ''}
        onConfirm={handlePickerConfirm}
        confirmLabel="指派"
      />
    </>
  );
}

/* ============ 員工列渲染 ============ */
function EmployeeRowView({ member }: { member: MemberRow }) {
  const display = member.userDisplayName ?? member.userAccount ?? member.userId;
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-9 flex-none place-items-center rounded-full bg-[#E8A020]/18 text-sm font-semibold text-[#E8A020]">
        {display.slice(0, 1)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-foreground">{display}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
          {member.userAccount ? (
            <span className="font-mono text-foreground/85">{member.userAccount}</span>
          ) : null}
          <span className="inline-flex items-center gap-1">
            <Briefcase className="size-3" />
            員工
          </span>
          <span className="inline-flex items-center gap-1">
            <Building2 className="size-3" />
          </span>
        </div>
      </div>
    </div>
  );
}
