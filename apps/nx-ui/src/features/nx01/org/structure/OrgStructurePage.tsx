// apps/nx-ui/src/features/nx01/org/structure/OrgStructurePage.tsx
// 組織架構圖 v3：四欄並列卡片 + 全鍵盤 + 主檔切換按鈕
//
// 2026-06-24 執行長拍板「職務硬綁組別」(部門→組別→職務→成員 嚴格四層 cascade)
//   - schema Nx01Role 加 teamId（業務職務必填、isSystem 系統角色豁免可空）
//   - UI 四欄：欄1部門 → 欄2組別(filter by 部門) → 欄3職務(filter by 組別) → 欄4成員(從 user-role 衛星)
//
// 鍵盤（全域 window listener、不依賴 input focus）：
//   ← →     切換欄（4 欄循環）
//   ↑ ↓     欄內上下移卡片
//   Home/End 欄內跳頭尾
//   Enter   選定 + cascade 到下一欄
//   A       右上「指派員工」（成員欄目標 = 選中職務）
//   Delete  移除成員（成員欄聚焦時）
//   [ / ]   上 / 下個主檔（依 master-pages 順序）
//   F3      開主檔切換 modal
//   ?       顯示鍵盤指南
//
// 主檔切換：MasterPageHead 同款 MasterQuickNav 嵌在頂部右側

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Briefcase,
  HelpCircle,
  Keyboard,
  Network,
  Trash2,
  UserPlus,
  Users2,
  UsersRound,
} from 'lucide-react';

import { cn } from '@design/utils/cn';
import { PageHeader } from '@design/components/page-header/PageHeader';
import { ToastStack, useToast } from '@design/components/toast/ToastStack';
import { EntityPickerDialog } from '@design/components/multi-select-modal/EntityPickerDialog';
import { useReducedMotion } from '@/design/motion/gsap';

import { MasterQuickNav } from '@/features/nx01/shell/master-nav/MasterQuickNav';
import { MasterSwitcher } from '@/features/nx01/shell/keyboard-card-master/MasterSwitcher';
import {
  MASTER_PAGES,
  masterPageIdFromPath,
} from '@/features/nx01/shell/master-nav/master-pages';
import { tryNavigate } from '@design/hooks/useDirtyGuard';

import { createDepartment, listDepartments, type DepartmentDto } from '@data/endpoints/nx01/api/department';
import { createTeam, listTeams, type TeamDto } from '@data/endpoints/nx01/api/team';
import { createRole, listRoles, type RoleDto } from '@data/endpoints/nx01/api/role';
import {
  assignUserRole,
  listUserRoles,
  revokeUserRole,
  type UserRoleDto,
} from '@data/endpoints/nx01/api/user-role';
import { listUsers, type UserDto } from '@data/endpoints/nx01/api/user';
import type { PagedResult } from '@data/types/nx01/api';

const CURRENT_PAGE_ID = 'orgchart';

type Zone = 'dept' | 'team' | 'role' | 'member';
const ZONE_ORDER: Zone[] = ['dept', 'team', 'role', 'member'];

type Member = {
  /** user_role.id（revoke 用） */
  assignmentId: string;
  userId: string;
  userAccount: string | null;
  userDisplayName: string | null;
};

export function OrgStructurePage() {
  const router = useRouter();
  const { toasts, showToast } = useToast();
  const reducedMotion = useReducedMotion();

  // ---------- 資料 ----------
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [teams, setTeams] = useState<TeamDto[]>([]);
  const [roles, setRoles] = useState<RoleDto[]>([]);
  /** Map<roleId, Member[]> */
  const [roleMembers, setRoleMembers] = useState<Map<string, Member[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [reloadTick, setReloadTick] = useState(0);

  // ---------- 選擇狀態（cascade） ----------
  const [deptId, setDeptId] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [roleId, setRoleId] = useState<string | null>(null);

  // ---------- 焦點 ----------
  const [zone, setZone] = useState<Zone>('dept');
  const [deptIdx, setDeptIdx] = useState(0);
  const [teamIdx, setTeamIdx] = useState(0);
  const [roleIdx, setRoleIdx] = useState(0);
  const [memberIdx, setMemberIdx] = useState(0);

  // ---------- modal / overlay ----------
  const [pickerOpen, setPickerOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  // 2026-06-24：三欄 Alt+A 新增 dialog（依 zone 分流）
  const [createOpen, setCreateOpen] = useState<'dept' | 'team' | 'role' | null>(null);

  // ---------- 載資料 ----------
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        // 後端 Nx01ListQueryDto @Max(100)、單頁上限 100、超過會 400
        const [depRes, teamRes, roleRes] = await Promise.all([
          listDepartments({ pageSize: 100, isActive: true }),
          listTeams({ pageSize: 100, isActive: true }),
          listRoles({ pageSize: 100, isActive: true }),
        ]);
        if (cancelled) return;
        setDepartments(depRes.items);
        setTeams(teamRes.items);
        setRoles(roleRes.items);

        // 為每個 role 並行 fetch 成員（user-role active=true）
        const map = new Map<string, Member[]>();
        await Promise.all(
          roleRes.items.map(async (r) => {
            const ur = await listUserRoles({ roleId: r.id, isActive: true, pageSize: 100 }).catch(
              () => null,
            );
            if (!ur) return;
            map.set(
              r.id,
              ur.items.map((u: UserRoleDto) => ({
                assignmentId: u.id,
                userId: u.userId,
                userAccount: u.userAccount,
                userDisplayName: u.userDisplayName,
              })),
            );
          }),
        );
        if (cancelled) return;
        setRoleMembers(map);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

  const triggerReload = useCallback(() => setReloadTick((t) => t + 1), []);

  // ---------- cascade lists ----------
  const teamsForDept = useMemo(
    () => (deptId ? teams.filter((t) => t.departmentId === deptId) : []),
    [teams, deptId],
  );
  const rolesForTeam = useMemo(
    () => (teamId ? roles.filter((r) => r.teamId === teamId) : []),
    [roles, teamId],
  );
  const membersForRole = useMemo(
    () => (roleId ? (roleMembers.get(roleId) ?? []) : []),
    [roleMembers, roleId],
  );

  // ---------- 選定 helpers ----------
  const selectDept = useCallback((id: string) => {
    setDeptId(id);
    setTeamId(null);
    setRoleId(null);
    setTeamIdx(0);
    setRoleIdx(0);
    setMemberIdx(0);
  }, []);
  const selectTeam = useCallback((id: string) => {
    setTeamId(id);
    setRoleId(null);
    setRoleIdx(0);
    setMemberIdx(0);
  }, []);
  const selectRole = useCallback((id: string) => {
    setRoleId(id);
    setMemberIdx(0);
  }, []);

  // ---------- 主檔切換（[/]） ----------
  const switchMaster = useCallback(
    (dir: -1 | 1) => {
      const enabled = MASTER_PAGES.filter((p) => !p.disabled);
      const curIdx = enabled.findIndex((p) => p.id === CURRENT_PAGE_ID);
      if (curIdx < 0) return;
      const next = enabled[(curIdx + dir + enabled.length) % enabled.length];
      tryNavigate(() => router.push(next.href), next.label);
    },
    [router],
  );

  // ---------- 鍵盤 handler（global） ----------
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // input/textarea/select focused 時放行
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName ?? '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        if (e.key === 'Escape') (t as HTMLElement).blur();
        return;
      }
      // overlay 開時放行（讓 overlay 自己處理）
      if (switcherOpen || helpOpen || pickerOpen || createOpen) {
        if (e.key === 'Escape') {
          setSwitcherOpen(false);
          setHelpOpen(false);
          setPickerOpen(false);
          setCreateOpen(null);
          e.preventDefault();
        }
        return;
      }

      // F3：主檔切換 modal
      if (e.key === 'F3') {
        e.preventDefault();
        setSwitcherOpen(true);
        return;
      }
      // [ / ]：上 / 下個主檔
      if (e.key === '[') {
        e.preventDefault();
        switchMaster(-1);
        return;
      }
      if (e.key === ']') {
        e.preventDefault();
        switchMaster(1);
        return;
      }
      // ? (Shift+/)：熱鍵指南
      if (e.code === 'Slash' && e.shiftKey) {
        e.preventDefault();
        setHelpOpen(true);
        return;
      }
      // A / Alt+A：依當前 focused 欄分流
      //   dept 欄 → 新增部門
      //   team 欄 → 新增組別（需先選部門）
      //   role 欄 → 新增職務（需先選組別）
      //   member 欄 → 指派員工（既有）
      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        if (zone === 'dept') setCreateOpen('dept');
        else if (zone === 'team' && deptId) setCreateOpen('team');
        else if (zone === 'role' && teamId) setCreateOpen('role');
        else if (zone === 'member' && roleId) setPickerOpen(true);
        return;
      }

      // ← → 切欄（包含 wrap、跳過空欄）
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const dir = e.key === 'ArrowRight' ? 1 : -1;
        const idx = ZONE_ORDER.indexOf(zone);
        const nextIdx = (idx + dir + ZONE_ORDER.length) % ZONE_ORDER.length;
        setZone(ZONE_ORDER[nextIdx]);
        return;
      }

      // 欄內 ↑ ↓ / Home / End / Enter / Delete
      const lists: Record<Zone, { count: number; idx: number; setIdx: (i: number) => void }> = {
        dept: { count: departments.length, idx: deptIdx, setIdx: setDeptIdx },
        team: { count: teamsForDept.length, idx: teamIdx, setIdx: setTeamIdx },
        role: { count: rolesForTeam.length, idx: roleIdx, setIdx: setRoleIdx },
        member: { count: membersForRole.length, idx: memberIdx, setIdx: setMemberIdx },
      };
      const cur = lists[zone];
      if (e.key === 'ArrowDown') {
        if (cur.count > 0) {
          e.preventDefault();
          cur.setIdx((cur.idx + 1) % cur.count);
        }
        return;
      }
      if (e.key === 'ArrowUp') {
        if (cur.count > 0) {
          e.preventDefault();
          cur.setIdx((cur.idx - 1 + cur.count) % cur.count);
        }
        return;
      }
      if (e.key === 'Home' && cur.count > 0) {
        e.preventDefault();
        cur.setIdx(0);
        return;
      }
      if (e.key === 'End' && cur.count > 0) {
        e.preventDefault();
        cur.setIdx(cur.count - 1);
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (zone === 'dept' && departments[deptIdx]) {
          selectDept(departments[deptIdx].id);
          setZone('team');
        } else if (zone === 'team' && teamsForDept[teamIdx]) {
          selectTeam(teamsForDept[teamIdx].id);
          setZone('role');
        } else if (zone === 'role' && rolesForTeam[roleIdx]) {
          selectRole(rolesForTeam[roleIdx].id);
          setZone('member');
        }
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && zone === 'member' && membersForRole[memberIdx]) {
        e.preventDefault();
        void handleRemoveMember(membersForRole[memberIdx]);
        return;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    zone,
    deptIdx,
    teamIdx,
    roleIdx,
    memberIdx,
    departments,
    teamsForDept,
    rolesForTeam,
    membersForRole,
    deptId,
    teamId,
    roleId,
    switcherOpen,
    helpOpen,
    pickerOpen,
    createOpen,
    switchMaster,
  ]);

  // ---------- 行為 ----------
  const handleRemoveMember = useCallback(
    async (member: Member) => {
      try {
        await revokeUserRole(member.assignmentId);
        showToast(
          `已將 ${member.userDisplayName ?? member.userAccount ?? '員工'} 移出此職務`,
          'success',
        );
        triggerReload();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        showToast(`移除失敗：${msg}`, 'danger');
      }
    },
    [showToast, triggerReload],
  );

  const pickerSearch = useCallback(
    async (q: string): Promise<PagedResult<UserDto>> => {
      if (!roleId) return { items: [], page: 1, pageSize: 0, total: 0 };
      const existing = new Set(membersForRole.map((m) => m.userId));
      const res = await listUsers({ q: q.trim() || undefined, pageSize: 50, isActive: true });
      const items = res.items.filter((u) => !existing.has(u.id));
      return { items, page: 1, pageSize: items.length, total: items.length };
    },
    [roleId, membersForRole],
  );

  const handlePickerConfirm = useCallback(
    async (selected: UserDto[]) => {
      if (!roleId) return;
      try {
        for (const u of selected) {
          await assignUserRole({ userId: u.id, roleId });
        }
        showToast(`已指派 ${selected.length} 位員工`, 'success');
        triggerReload();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        showToast(`指派失敗：${msg}`, 'danger');
      }
    },
    [roleId, showToast, triggerReload],
  );

  // ---------- 渲染 ----------
  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">
        載入中…
      </div>
    );
  }

  const selectedDept = deptId ? departments.find((d) => d.id === deptId) : null;
  const selectedTeam = teamId ? teams.find((t) => t.id === teamId) : null;
  const selectedRole = roleId ? roles.find((r) => r.id === roleId) : null;

  const totalCount = `${departments.length} 部門 / ${teams.length} 組別 / ${roles.length} 職務`;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* 頂部：標題列 + MasterQuickNav 主檔切換按鈕 */}
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 pt-3">
        <PageHeader
          crumbs={[{ label: '主檔' }, { label: '組織架構圖' }]}
          category="組織架構"
          title="組織架構圖"
          desc="部門 → 組別 → 職務 → 成員 四層 cascade、↑↓ 移卡 ← → 切欄 Enter 選定 A 指派 ? 熱鍵"
          count={totalCount}
        />
        <div data-nx-frame className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-border/50 bg-card px-2 text-[11px] font-medium text-foreground/80 hover:border-border hover:bg-accent/15"
            title="熱鍵指南（?）"
          >
            <Keyboard className="size-3" />
            <span className="hidden sm:inline">
              <span className="mr-0.5 font-mono text-primary">?</span>
              熱鍵
            </span>
          </button>
          <MasterQuickNav currentPageId={CURRENT_PAGE_ID} />
        </div>
      </div>

      {/* 四欄並列 */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 px-4 pb-4 md:grid-cols-4">
        <ColumnPanel
          title="部門"
          subtitle={`${departments.length} 項`}
          icon={Building2}
          active={zone === 'dept'}
          onClick={() => setZone('dept')}
          shortcut="1"
          headerAction={<AddBtn onClick={() => setCreateOpen('dept')} title="新增部門（A）" />}
        >
          {departments.length === 0 ? (
            <EmptyHint text="尚無部門" />
          ) : (
            departments.map((d, i) => (
              <Card
                key={d.id}
                title={d.name}
                code={d.code}
                count={teams.filter((t) => t.departmentId === d.id).length}
                countLabel="組"
                focused={zone === 'dept' && deptIdx === i}
                selected={deptId === d.id}
                reducedMotion={reducedMotion}
                onClick={() => {
                  setZone('dept');
                  setDeptIdx(i);
                  selectDept(d.id);
                }}
              />
            ))
          )}
        </ColumnPanel>

        <ColumnPanel
          title="組別"
          subtitle={selectedDept ? `${selectedDept.name} ▸ ${teamsForDept.length} 項` : '請先選部門'}
          icon={UsersRound}
          active={zone === 'team'}
          onClick={() => setZone('team')}
          shortcut="2"
          disabled={!deptId}
          headerAction={
            deptId ? <AddBtn onClick={() => setCreateOpen('team')} title="新增組別（A）" /> : null
          }
        >
          {!deptId ? (
            <EmptyHint text="← 請先選部門" />
          ) : teamsForDept.length === 0 ? (
            <EmptyHint text="此部門尚無組別" />
          ) : (
            teamsForDept.map((t, i) => (
              <Card
                key={t.id}
                title={t.name}
                code={t.code}
                count={roles.filter((r) => r.teamId === t.id).length}
                countLabel="職"
                focused={zone === 'team' && teamIdx === i}
                selected={teamId === t.id}
                reducedMotion={reducedMotion}
                onClick={() => {
                  setZone('team');
                  setTeamIdx(i);
                  selectTeam(t.id);
                }}
              />
            ))
          )}
        </ColumnPanel>

        <ColumnPanel
          title="職務"
          subtitle={selectedTeam ? `${selectedTeam.name} ▸ ${rolesForTeam.length} 項` : '請先選組別'}
          icon={Briefcase}
          active={zone === 'role'}
          onClick={() => setZone('role')}
          shortcut="3"
          disabled={!teamId}
          headerAction={
            teamId ? <AddBtn onClick={() => setCreateOpen('role')} title="新增職務（A）" /> : null
          }
        >
          {!teamId ? (
            <EmptyHint text="← 請先選組別" />
          ) : rolesForTeam.length === 0 ? (
            <EmptyHint text="此組別尚無職務" />
          ) : (
            rolesForTeam.map((r, i) => (
              <Card
                key={r.id}
                title={r.name}
                code={r.code}
                count={roleMembers.get(r.id)?.length ?? 0}
                countLabel="人"
                focused={zone === 'role' && roleIdx === i}
                selected={roleId === r.id}
                reducedMotion={reducedMotion}
                onClick={() => {
                  setZone('role');
                  setRoleIdx(i);
                  selectRole(r.id);
                }}
              />
            ))
          )}
        </ColumnPanel>

        <ColumnPanel
          title="成員"
          subtitle={selectedRole ? `${selectedRole.name} ▸ ${membersForRole.length} 人` : '請先選職務'}
          icon={Users2}
          active={zone === 'member'}
          onClick={() => setZone('member')}
          shortcut="4"
          disabled={!roleId}
          headerAction={
            roleId ? (
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="inline-flex h-6 items-center gap-1 rounded-md border border-primary/50 bg-primary/10 px-2 text-[11px] font-medium text-primary hover:bg-primary/20"
                title="指派員工（A）"
              >
                <UserPlus className="size-3" />
                <span className="hidden sm:inline">
                  <span className="mr-0.5 font-mono">A</span>
                  指派
                </span>
              </button>
            ) : null
          }
        >
          {!roleId ? (
            <EmptyHint text="← 請先選職務" />
          ) : membersForRole.length === 0 ? (
            <EmptyHint text="此職務尚無成員、按 A 指派" />
          ) : (
            membersForRole.map((m, i) => (
              <MemberCard
                key={m.userId}
                member={m}
                focused={zone === 'member' && memberIdx === i}
                reducedMotion={reducedMotion}
                onClick={() => {
                  setZone('member');
                  setMemberIdx(i);
                }}
                onRemove={() => void handleRemoveMember(m)}
              />
            ))
          )}
        </ColumnPanel>
      </div>

      {/* 主檔切換 modal（F3） */}
      <MasterSwitcher
        open={switcherOpen}
        currentPageId={CURRENT_PAGE_ID}
        onClose={() => setSwitcherOpen(false)}
      />

      {/* 指派員工 picker（A） */}
      <EntityPickerDialog<UserDto>
        open={pickerOpen && !!roleId}
        onClose={() => setPickerOpen(false)}
        title={selectedRole ? `指派員工到「${selectedRole.name}」` : '指派員工'}
        subtitle="Assign Role Members"
        icon={Users2}
        searchPlaceholder="搜尋姓名或員工編號…"
        search={pickerSearch}
        getId={(u) => u.id}
        getLabel={(u) => `${u.username} · ${u.displayName}`}
        getDescription={(u) => u.email ?? u.phone ?? ''}
        onConfirm={handlePickerConfirm}
        confirmLabel="指派"
      />

      {/* 熱鍵指南（?） */}
      {helpOpen ? <HelpOverlay onClose={() => setHelpOpen(false)} /> : null}

      {/* 三欄 Alt+A 新增 dialog（依 zone 分流） */}
      {createOpen === 'dept' ? (
        <QuickCreateDialog
          title="新增部門"
          subtitle="Create Department"
          icon={Building2}
          contextLine={null}
          onClose={() => setCreateOpen(null)}
          onSubmit={async ({ code, name, description }) => {
            const d = await createDepartment({
              code: code || `DEPT_${Date.now().toString(36).toUpperCase()}`,
              name,
            });
            showToast(`已新增部門「${d.name}」`, 'success');
            triggerReload();
            selectDept(d.id);
            setZone('team');
          }}
        />
      ) : null}
      {createOpen === 'team' && deptId && selectedDept ? (
        <QuickCreateDialog
          title="新增組別"
          subtitle="Create Team"
          icon={UsersRound}
          contextLine={`隸屬部門：${selectedDept.name}（${selectedDept.code}）`}
          onClose={() => setCreateOpen(null)}
          onSubmit={async ({ code, name }) => {
            const t = await createTeam({
              code: code || `TEAM_${Date.now().toString(36).toUpperCase()}`,
              name,
              departmentId: deptId,
            });
            showToast(`已新增組別「${t.name}」`, 'success');
            triggerReload();
            selectTeam(t.id);
            setZone('role');
          }}
        />
      ) : null}
      {createOpen === 'role' && teamId && selectedTeam ? (
        <QuickCreateDialog
          title="新增職務"
          subtitle="Create Role"
          icon={Briefcase}
          contextLine={`隸屬組別：${selectedTeam.name}（${selectedTeam.code}）`}
          onClose={() => setCreateOpen(null)}
          onSubmit={async ({ code, name, description }) => {
            const r = await createRole({
              code: code || `R_${Date.now().toString(36).toUpperCase()}`,
              name,
              description: description || undefined,
              teamId,
            });
            showToast(`已新增職務「${r.name}」`, 'success');
            triggerReload();
            selectRole(r.id);
            setZone('member');
          }}
        />
      ) : null}

      <ToastStack toasts={toasts} />
    </div>
  );
}

// ============ 子元件 ============

function ColumnPanel({
  title,
  subtitle,
  icon: Icon,
  active,
  onClick,
  shortcut,
  disabled,
  children,
  headerAction,
}: {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onClick: () => void;
  shortcut: string;
  disabled?: boolean;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
}) {
  return (
    <section
      onClick={onClick}
      className={cn(
        'flex min-h-0 flex-col overflow-hidden rounded-lg border bg-card transition-all',
        active
          ? 'border-primary/60 shadow-[0_0_0_2px_var(--color-primary)/0.18]'
          : disabled
            ? 'border-border/40 opacity-70'
            : 'border-border/50 hover:border-border',
      )}
    >
      <header
        className={cn(
          'flex items-center gap-2 border-b px-3 py-2',
          active ? 'border-primary/40 bg-primary/8' : 'border-border/40 bg-muted/30',
        )}
      >
        <Icon className={cn('size-4', active ? 'text-primary' : 'text-muted-foreground')} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            {title}
            <kbd
              className={cn(
                'inline-block rounded border px-1 font-mono text-[10px]',
                active
                  ? 'border-primary/60 bg-primary/15 text-primary'
                  : 'border-border/50 bg-muted/40 text-muted-foreground',
              )}
            >
              {shortcut}
            </kbd>
          </div>
          <div className="truncate text-[11px] text-muted-foreground">{subtitle}</div>
        </div>
        {headerAction}
      </header>
      <div className="flex flex-col gap-1.5 overflow-y-auto p-2">{children}</div>
    </section>
  );
}

function Card({
  title,
  code,
  count,
  countLabel,
  focused,
  selected,
  reducedMotion,
  onClick,
}: {
  title: string;
  code: string;
  count: number;
  countLabel: string;
  focused: boolean;
  selected: boolean;
  reducedMotion: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex items-center gap-2 rounded-md border px-2.5 py-2 text-left transition-all',
        focused
          ? 'border-primary/70 bg-primary/12 shadow-md'
          : selected
            ? 'border-primary/40 bg-primary/6'
            : 'border-border/40 bg-card hover:border-border hover:bg-accent/15',
        !reducedMotion && focused && 'scale-[1.01]',
      )}
    >
      <span
        className={cn(
          'inline-block h-7 w-1 rounded-sm transition-colors',
          focused ? 'bg-primary' : selected ? 'bg-primary/50' : 'bg-transparent',
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-foreground">{title}</div>
        <div className="truncate font-mono text-[10px] text-muted-foreground">{code}</div>
      </div>
      <span
        className={cn(
          'flex-none rounded-full px-2 py-0.5 text-[10px] font-semibold',
          focused
            ? 'bg-primary/20 text-primary'
            : count > 0
              ? 'bg-muted/60 text-foreground/80'
              : 'bg-muted/30 text-muted-foreground',
        )}
      >
        {count} {countLabel}
      </span>
    </button>
  );
}

function MemberCard({
  member,
  focused,
  reducedMotion,
  onClick,
  onRemove,
}: {
  member: Member;
  focused: boolean;
  reducedMotion: boolean;
  onClick: () => void;
  onRemove: () => void;
}) {
  const display = member.userDisplayName ?? member.userAccount ?? member.userId;
  return (
    <div
      onClick={onClick}
      className={cn(
        'group flex items-center gap-2 rounded-md border px-2.5 py-2 transition-all',
        focused
          ? 'border-primary/70 bg-primary/12 shadow-md'
          : 'border-border/40 bg-card hover:border-border hover:bg-accent/15',
        !reducedMotion && focused && 'scale-[1.01]',
      )}
    >
      <span className="grid size-8 flex-none place-items-center rounded-full bg-[#E8A020]/18 text-xs font-semibold text-[#E8A020]">
        {display.slice(0, 1)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] text-foreground">{display}</div>
        {member.userAccount ? (
          <div className="truncate font-mono text-[10px] text-muted-foreground">
            {member.userAccount}
          </div>
        ) : null}
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="rounded-md p-1 text-muted-foreground opacity-0 transition-all hover:bg-destructive/15 hover:text-destructive group-hover:opacity-100"
        title="移除（Delete）"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="grid place-items-center py-8 text-center text-[12px] text-muted-foreground">
      <Network className="mb-2 size-6 opacity-40" />
      {text}
    </div>
  );
}

function AddBtn({ onClick, title }: { onClick: () => void; title: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="inline-flex h-6 items-center gap-1 rounded-md border border-primary/50 bg-primary/10 px-2 text-[11px] font-medium text-primary hover:bg-primary/20"
      title={title}
    >
      <UserPlus className="size-3" />
      <span className="hidden sm:inline">
        <span className="mr-0.5 font-mono">A</span>
        新增
      </span>
    </button>
  );
}

function QuickCreateDialog({
  title,
  subtitle,
  icon: Icon,
  contextLine,
  onClose,
  onSubmit,
}: {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  contextLine: string | null;
  onClose: () => void;
  onSubmit: (values: { code: string; name: string; description: string }) => Promise<void>;
}) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  async function submit() {
    if (!name.trim()) {
      setErr('名稱必填');
      nameRef.current?.focus();
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await onSubmit({ code: code.trim().toUpperCase(), name: name.trim(), description: description.trim() });
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '建立失敗');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          void submit();
        }
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border/40 bg-popover p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-3 flex items-center gap-2.5">
          <Icon className="size-5 text-primary" />
          <h2 className="text-sm font-bold tracking-wide text-foreground">{title}</h2>
          <span className="ml-auto text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground/70">
            {subtitle}
          </span>
        </header>
        {contextLine ? (
          <div className="mb-3 rounded-md border border-border/40 bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
            {contextLine}
          </div>
        ) : null}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="space-y-3"
        >
          <label className="block text-sm">
            <span className="mb-1 block text-foreground/80">🟢 名稱 *</span>
            <input
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="輸入名稱..."
              className="w-full rounded border border-border/50 bg-background px-2 py-1 text-sm"
              required
              disabled={busy}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-foreground/80">⚪ 代碼（可空、自動產）</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="留空自動產"
              className="w-full rounded border border-border/50 bg-background px-2 py-1 font-mono text-sm uppercase"
              disabled={busy}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-foreground/80">⚪ 說明（可空）</span>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="這個的用途..."
              className="w-full rounded border border-border/50 bg-background px-2 py-1 text-sm"
              disabled={busy}
            />
          </label>
          {err ? <div className="text-xs text-destructive">{err}</div> : null}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-md border border-border/50 bg-card px-3 py-1.5 text-xs text-foreground/80 hover:bg-accent/15 disabled:opacity-50"
            >
              取消 (Esc)
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {busy ? '建立中…' : '建立 (Ctrl+Enter)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function HelpOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border/40 bg-popover p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-3 flex items-center gap-2">
          <HelpCircle className="size-5 text-primary" />
          <h2 className="text-sm font-bold tracking-wide text-foreground">組織架構圖 · 鍵盤指南</h2>
        </header>
        <div className="space-y-2 text-[12px] text-foreground/85">
          <Row k="← →" desc="切換四欄（部門 → 組別 → 職務 → 成員）" />
          <Row k="↑ ↓" desc="欄內上下移卡片" />
          <Row k="Home / End" desc="欄內跳頭尾" />
          <Row k="Enter / Space" desc="選定 + cascade 到下一欄" />
          <Row k="A / Alt+A" desc="依當前欄：新增部門 / 組別 / 職務、或指派員工" />
          <Row k="Delete / Backspace" desc="移除成員（成員欄聚焦時）" />
          <Row k="[ / ]" desc="上 / 下個主檔" />
          <Row k="F3" desc="主檔切換 modal" />
          <Row k="?" desc="開 / 關 此指南" />
          <Row k="Esc" desc="關閉浮層" />
        </div>
        <footer className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border/50 bg-card px-3 py-1 text-[12px] text-foreground/80 hover:bg-accent/15"
          >
            關閉（Esc）
          </button>
        </footer>
      </div>
    </div>
  );
}

function Row({ k, desc }: { k: string; desc: string }) {
  return (
    <div className="flex items-center gap-3">
      <kbd className="inline-block min-w-[64px] rounded border border-border/50 bg-muted/40 px-2 py-0.5 text-center font-mono text-[11px] text-foreground">
        {k}
      </kbd>
      <span className="flex-1">{desc}</span>
    </div>
  );
}

// 確保 masterPageIdFromPath import 沒被 tree-shake（保留 ref）
void masterPageIdFromPath;
