/**
 * File: apps/nx-ui/src/features/nx00/rbac/hooks/useRoleUserAssign.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-RBAC-HOOK-001：Role ↔ Users 指派 Hook（資料/操作集中）
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RoleListItem, UserLite } from '@/features/nx00/rbac/types';
import {
  addRoleMember,
  createRole,
  getRoleMembers,
  listRoles,
  removeRoleMember,
  searchUsers,
  type CreateRoleInput,
} from '@/features/nx00/rbac/api/rbac';

type State = {
  roles: RoleListItem[];
  selectedRoleId: string | null;

  members: UserLite[];
  candidates: UserLite[];

  q: string;

  loadingRoles: boolean;
  loadingMembers: boolean;
  loadingCandidates: boolean;

  err: string | null;
};

type Actions = {
  selectRole: (roleId: string) => void;
  setQuery: (q: string) => void;

  reloadRoles: () => Promise<void>;
  reloadMembers: () => Promise<void>;

  createRole: (input: CreateRoleInput) => Promise<void>;

  addMember: (u: UserLite) => Promise<void>;
  removeMember: (u: UserLite) => Promise<void>;
};

/**
 * @FUNCTION_CODE NX00-UI-NX00-RBAC-HOOK-001-F01
 * 說明：
 * - useRoleUserAssign：提供 RoleListPanel / RoleMembersPanel 共用資料與操作
 */
export function useRoleUserAssign(): { state: State; actions: Actions } {
  const [roles, setRoles] = useState<RoleListItem[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  const [members, setMembers] = useState<UserLite[]>([]);
  const [candidates, setCandidates] = useState<UserLite[]>([]);

  const [q, setQ] = useState('');
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  const [err, setErr] = useState<string | null>(null);

  const membersReqSeq = useRef(0);
  const candidatesReqSeq = useRef(0);

  /**
   * @FUNCTION_CODE NX00-UI-NX00-RBAC-HOOK-001-F02
   * 說明：
   * - reloadRoles：載入 roles，若尚未選 role 則自動選第一個
   */
  const reloadRoles = useCallback(async () => {
    setLoadingRoles(true);
    setErr(null);

    try {
      const data = await listRoles();
      setRoles(data);
      setSelectedRoleId((prev) => prev ?? (data[0]?.id ?? null));
    } catch (e: any) {
      setErr(e?.message || 'Load roles failed');
    } finally {
      setLoadingRoles(false);
    }
  }, []);

  /**
   * @FUNCTION_CODE NX00-UI-NX00-RBAC-HOOK-001-F10
   * 說明：
   * - createRole：建立角色後
   *   1) 將新 role 加入列表（或直接 reloadRoles）
   *   2) 自動選取新 role
   *   3) 讓右側 members 自動跟著 reloadMembers（由 effect 驅動）
   */
  const createRoleAction = useCallback(async (input: CreateRoleInput) => {
    setErr(null);

    // basic validate（UI 也會擋，但 hook 再擋一次更安全）
    if (!input.code?.trim()) {
      setErr('Role code is required');
      return;
    }
    if (!input.name?.trim()) {
      setErr('Role name is required');
      return;
    }

    try {
      const created = await createRole(input);

      // 直接把新角色插入（避免多打一支 listRoles）
      setRoles((prev) => [created, ...prev]);

      // 自動選取新 role
      setSelectedRoleId(created.id);
    } catch (e: any) {
      setErr(e?.message || 'Create role failed');
    }
  }, []);

  /**
   * @FUNCTION_CODE NX00-UI-NX00-RBAC-HOOK-001-F03
   * 說明：
   * - reloadMembers：依 selectedRoleId 載入 members
   */
  const reloadMembers = useCallback(async () => {
    if (!selectedRoleId) {
      setMembers([]);
      return;
    }

    const seq = ++membersReqSeq.current;
    setLoadingMembers(true);
    setErr(null);

    try {
      const dto = await getRoleMembers(selectedRoleId);
      if (seq !== membersReqSeq.current) return;
      setMembers(dto.members);
    } catch (e: any) {
      if (seq !== membersReqSeq.current) return;
      setErr(e?.message || 'Load members failed');
    } finally {
      if (seq === membersReqSeq.current) setLoadingMembers(false);
    }
  }, [selectedRoleId]);

  /**
   * @FUNCTION_CODE NX00-UI-NX00-RBAC-HOOK-001-F04
   * 說明：
   * - loadCandidates：依 q 搜尋 users
   */
  const loadCandidates = useCallback(async () => {
    const keyword = q.trim();
    const seq = ++candidatesReqSeq.current;

    if (!keyword) {
      setCandidates([]);
      return;
    }

    setLoadingCandidates(true);
    setErr(null);

    try {
      const list = await searchUsers(keyword);
      if (seq !== candidatesReqSeq.current) return;
      setCandidates(list);
    } catch (e: any) {
      if (seq !== candidatesReqSeq.current) return;
      setErr(e?.message || 'Search users failed');
    } finally {
      if (seq === candidatesReqSeq.current) setLoadingCandidates(false);
    }
  }, [q]);

  /**
   * @FUNCTION_CODE NX00-UI-NX00-RBAC-HOOK-001-F05
   * 說明：
   * - addMember：加入 role member（optimistic + rollback）
   */
  const addMemberAction = useCallback(
    async (u: UserLite) => {
      if (!selectedRoleId) return;
      if (members.some((m) => m.id === u.id)) return;

      setMembers((prev) => [...prev, u]);

      try {
        await addRoleMember(selectedRoleId, u.id);
      } catch (e: any) {
        setMembers((prev) => prev.filter((m) => m.id !== u.id));
        setErr(e?.message || 'Add member failed');
      }
    },
    [members, selectedRoleId]
  );

  /**
   * @FUNCTION_CODE NX00-UI-NX00-RBAC-HOOK-001-F06
   * 說明：
   * - removeMember：移除 role member（optimistic + rollback）
   */
  const removeMemberAction = useCallback(
    async (u: UserLite) => {
      if (!selectedRoleId) return;

      const snapshot = members;
      setMembers((prev) => prev.filter((m) => m.id !== u.id));

      try {
        await removeRoleMember(selectedRoleId, u.id);
      } catch (e: any) {
        setMembers(snapshot);
        setErr(e?.message || 'Remove member failed');
      }
    },
    [members, selectedRoleId]
  );

  useEffect(() => {
    void reloadRoles();
  }, [reloadRoles]);

  useEffect(() => {
    void reloadMembers();
  }, [reloadMembers]);

  useEffect(() => {
    void loadCandidates();
  }, [loadCandidates]);

  const state: State = useMemo(
    () => ({
      roles,
      selectedRoleId,
      members,
      candidates,
      q,
      loadingRoles,
      loadingMembers,
      loadingCandidates,
      err,
    }),
    [roles, selectedRoleId, members, candidates, q, loadingRoles, loadingMembers, loadingCandidates, err]
  );

  const actions: Actions = useMemo(
    () => ({
      selectRole: (roleId) => setSelectedRoleId(roleId),
      setQuery: (next) => setQ(next),

      reloadRoles,
      reloadMembers,

      createRole: createRoleAction,

      addMember: addMemberAction,
      removeMember: removeMemberAction,
    }),
    [reloadRoles, reloadMembers, createRoleAction, addMemberAction, removeMemberAction]
  );

  return { state, actions };
}