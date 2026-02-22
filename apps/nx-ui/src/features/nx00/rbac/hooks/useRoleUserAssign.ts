/**
 * File: apps/nx-ui/src/features/nx00/rbac/hooks/useRoleUserAssign.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-RBAC-HOOK-001：Role ↔ Users 指派 Hook（資料/操作集中）
 *
 * Notes:
 * - 草稿模式：Add/Remove 先改 draft，按 Save 才寫入後端
 * - 統一使用 userId（string）
 * - candidates 搜尋加入簡單 debounce，降低 API hit 次數
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { CreateRoleInput, RoleListItem, UserLite } from '@/features/nx00/rbac/types';
import {
  addRoleMember,
  createRole as createRoleApi,
  getRoleMembers,
  listRoles,
  removeRoleMember,
  searchUsers,
} from '@/features/nx00/rbac/api/rbac';

type State = {
  roles: RoleListItem[];
  selectedRoleId: string | null;

  /** 後端已保存的 members（baseline） */
  savedMembers: UserLite[];

  /** UI 草稿 members（顯示用） */
  members: UserLite[];

  /** 搜尋候選 */
  candidates: UserLite[];
  selectedCandidateId: string | null;

  /** query */
  q: string;

  /** 狀態 */
  dirty: boolean;
  saving: boolean;

  loadingRoles: boolean;
  loadingMembers: boolean;
  loadingCandidates: boolean;

  err: string | null;
};

type Actions = {
  selectRole: (roleId: string) => void;

  setQuery: (q: string) => void;
  selectCandidate: (userId: string | null) => void;

  reloadRoles: () => Promise<void>;
  reloadMembers: () => Promise<void>;

  createRole: (input: CreateRoleInput) => Promise<void>;

  /** 草稿操作（統一 userId） */
  stageAdd: (userId: string) => void;
  stageRemove: (userId: string) => void;

  /** 草稿控制 */
  resetDraft: () => void;
  save: () => Promise<void>;
};

function idsOf(list: UserLite[]) {
  return new Set(list.map((x) => x.id));
}

function sameIdSet(a: Set<string>, b: Set<string>) {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Unknown error';
}

/**
 * @HOOK_CODE NX00-RBAC-HOOK-001
 */
export function useRoleUserAssign(): { state: State; actions: Actions } {
  const [roles, setRoles] = useState<RoleListItem[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  const [savedMembers, setSavedMembers] = useState<UserLite[]>([]);
  const [members, setMembers] = useState<UserLite[]>([]); // draft

  const [candidates, setCandidates] = useState<UserLite[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

  const [q, setQ] = useState('');

  const [loadingRoles, setLoadingRoles] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // 避免快速切換 role / search 時舊 request 回來覆蓋新 state
  const membersReqSeq = useRef(0);
  const candidatesReqSeq = useRef(0);

  const dirty = useMemo(() => {
    return !sameIdSet(idsOf(savedMembers), idsOf(members));
  }, [savedMembers, members]);

  /**
   * @CODE nxui_nx00_rbac_reload_roles_001
   * reloadRoles：載入 roles，若尚未選 role 則自動選第一個
   */
  const reloadRoles = useCallback(async () => {
    setLoadingRoles(true);
    setErr(null);

    try {
      const data = await listRoles();
      setRoles(data);
      setSelectedRoleId((prev) => prev ?? (data[0]?.id ?? null));
    } catch (e: unknown) {
      setErr(getErrorMessage(e) || 'Load roles failed');
    } finally {
      setLoadingRoles(false);
    }
  }, []);

  /**
   * @CODE nxui_nx00_rbac_create_role_action_001
   * createRole：建立角色後
   * 1) 插入 roles
   * 2) 自動選取新 role
   */
  const createRoleAction = useCallback(async (input: CreateRoleInput) => {
    setErr(null);

    if (!input.code?.trim()) {
      setErr('Role code is required');
      return;
    }
    if (!input.name?.trim()) {
      setErr('Role name is required');
      return;
    }

    try {
      const created = await createRoleApi(input);

      setRoles((prev) => [created, ...prev]);
      setSelectedRoleId(created.id);

      // 清理右側狀態（members 會由 reloadMembers 重新載入）
      setSelectedCandidateId(null);
      setQ('');
      setCandidates([]);
    } catch (e: unknown) {
      setErr(getErrorMessage(e) || 'Create role failed');
    }
  }, []);

  /**
   * @CODE nxui_nx00_rbac_reload_members_001
   * reloadMembers：依 selectedRoleId 載入 members
   * - 載入後會同步 savedMembers 與 draft members
   */
  const reloadMembers = useCallback(async () => {
    if (!selectedRoleId) {
      setSavedMembers([]);
      setMembers([]);
      return;
    }

    const seq = ++membersReqSeq.current;
    setLoadingMembers(true);
    setErr(null);

    try {
      const dto = await getRoleMembers(selectedRoleId);
      if (seq !== membersReqSeq.current) return;

      setSavedMembers(dto.members);
      setMembers(dto.members); // reset draft to baseline
      setSelectedCandidateId(null);
    } catch (e: unknown) {
      if (seq !== membersReqSeq.current) return;
      setErr(getErrorMessage(e) || 'Load members failed');
    } finally {
      if (seq === membersReqSeq.current) setLoadingMembers(false);
    }
  }, [selectedRoleId]);

  /**
   * @CODE nxui_nx00_rbac_load_candidates_001
   * loadCandidates：依 keyword 搜尋 users（由外層 useEffect debounce）
   */
  const loadCandidates = useCallback(async (keyword: string) => {
    const seq = ++candidatesReqSeq.current;

    if (!keyword) {
      setCandidates([]);
      setSelectedCandidateId(null);
      return;
    }

    setLoadingCandidates(true);
    setErr(null);

    try {
      const list = await searchUsers(keyword);
      if (seq !== candidatesReqSeq.current) return;

      setCandidates(list);

      // 若目前選取的 candidate 不在新結果中 → 清掉
      setSelectedCandidateId((prev) =>
        prev && list.some((u) => u.id === prev) ? prev : null
      );
    } catch (e: unknown) {
      if (seq !== candidatesReqSeq.current) return;
      setErr(getErrorMessage(e) || 'Search users failed');
    } finally {
      if (seq === candidatesReqSeq.current) setLoadingCandidates(false);
    }
  }, []);

  /**
   * @CODE nxui_nx00_rbac_stage_add_001
   * stageAdd：加入草稿（不打 API）
   */
  const stageAdd = useCallback(
    (userId: string) => {
      if (!userId) return;

      setMembers((prev) => {
        if (prev.some((m) => m.id === userId)) return prev;

        // 優先用 candidates 裡的資料（顯示更完整）
        const fromCandidates = candidates.find((u) => u.id === userId);
        const fromSaved = savedMembers.find((u) => u.id === userId);

        const u: UserLite =
          fromCandidates ??
          fromSaved ?? {
            id: userId,
            username: userId,
            displayName: null,
            email: null,
            phone: null,
            isActive: true,
          };

        return [...prev, u];
      });
    },
    [candidates, savedMembers]
  );

  /**
   * @CODE nxui_nx00_rbac_stage_remove_001
   * stageRemove：移除草稿（不打 API）
   */
  const stageRemove = useCallback((userId: string) => {
    if (!userId) return;
    setMembers((prev) => prev.filter((m) => m.id !== userId));
  }, []);

  /**
   * @CODE nxui_nx00_rbac_reset_draft_001
   * resetDraft：放棄草稿，回到 baseline
   */
  const resetDraft = useCallback(() => {
    setMembers(savedMembers);
    setErr(null);
  }, [savedMembers]);

  /**
   * @CODE nxui_nx00_rbac_save_001
   * save：比對差異 → 寫入後端
   * - add: draft - saved
   * - remove: saved - draft
   */
  const save = useCallback(async () => {
    if (!selectedRoleId) return;
    if (!dirty) return;

    setSaving(true);
    setErr(null);

    const savedSet = idsOf(savedMembers);
    const draftSet = idsOf(members);

    const toAdd: string[] = [];
    const toRemove: string[] = [];

    for (const id of draftSet) if (!savedSet.has(id)) toAdd.push(id);
    for (const id of savedSet) if (!draftSet.has(id)) toRemove.push(id);

    try {
      // 先新增再刪除：避免短暫沒有權限
      for (const userId of toAdd) {
        await addRoleMember(selectedRoleId, userId);
      }
      for (const userId of toRemove) {
        await removeRoleMember(selectedRoleId, userId);
      }

      // 提交成功：更新 baseline
      setSavedMembers(members);
    } catch (e: unknown) {
      setErr(getErrorMessage(e) || 'Save failed');

      // 保險：重新載入避免部分成功導致不同步
      await reloadMembers().catch(() => {});
    } finally {
      setSaving(false);
    }
  }, [dirty, members, reloadMembers, savedMembers, selectedRoleId]);

  /**
   * 初始載入 roles
   */
  useEffect(() => {
    void reloadRoles();
  }, [reloadRoles]);

  /**
   * role 變更 → 重新載入 members
   */
  useEffect(() => {
    void reloadMembers();
  }, [reloadMembers]);

  /**
   * q 變更 → debounce 搜尋 candidates
   */
  useEffect(() => {
    const keyword = q.trim();

    if (typeof window === 'undefined') return;

    const t = window.setTimeout(() => {
      void loadCandidates(keyword);
    }, 250);

    return () => window.clearTimeout(t);
  }, [q, loadCandidates]);

  const state: State = useMemo(
    () => ({
      roles,
      selectedRoleId,

      savedMembers,
      members,

      candidates,
      selectedCandidateId,

      q,

      dirty,
      saving,

      loadingRoles,
      loadingMembers,
      loadingCandidates,

      err,
    }),
    [
      roles,
      selectedRoleId,
      savedMembers,
      members,
      candidates,
      selectedCandidateId,
      q,
      dirty,
      saving,
      loadingRoles,
      loadingMembers,
      loadingCandidates,
      err,
    ]
  );

  const actions: Actions = useMemo(
    () => ({
      selectRole: (roleId) => {
        setSelectedRoleId(roleId);
        setErr(null);
        setSelectedCandidateId(null);
      },

      setQuery: (next) => setQ(next),
      selectCandidate: (userId) => setSelectedCandidateId(userId),

      reloadRoles,
      reloadMembers,

      createRole: createRoleAction,

      stageAdd,
      stageRemove,

      resetDraft,
      save,
    }),
    [reloadRoles, reloadMembers, createRoleAction, resetDraft, save, stageAdd, stageRemove]
  );

  return { state, actions };
}