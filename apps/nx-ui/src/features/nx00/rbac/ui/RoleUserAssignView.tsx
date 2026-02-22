/**
 * File: apps/nx-ui/src/features/nx00/rbac/ui/RoleUserAssignView.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-RBAC-UI-003：角色 ↔ 使用者指派視圖（View only）
 *
 * Notes:
 * - View only（render）
 * - 所有 state/actions 由 useRoleUserAssign 提供
 * - 統一使用 userId
 * - 草稿模式：Add/Remove → draft，Save 才寫入
 */

'use client';

import React, { useMemo } from 'react';
import { RoleListPanel } from '@/features/nx00/rbac/ui/RoleListPanel';
import { RoleMembersPanel } from '@/features/nx00/rbac/ui/RoleMembersPanel';
import { useRoleUserAssign } from '@/features/nx00/rbac/hooks/useRoleUserAssign';

export function RoleUserAssignView() {
  const { state, actions } = useRoleUserAssign();

  const {
    roles,
    selectedRoleId,
    members,
    candidates,
    selectedCandidateId,
    q,
    dirty,
    saving,
  } = state;

  const { selectRole, setQuery, selectCandidate, stageAdd, stageRemove, save, resetDraft, createRole } = actions;

  const selectedRole = useMemo(() => {
    if (!selectedRoleId) return null;
    return roles.find((r) => r.id === selectedRoleId) ?? null;
  }, [roles, selectedRoleId]);

  // panel 需要的 chips/candidates 型別（id/username/displayName）
  const candidateChips = useMemo(
    () => candidates.map((u) => ({ id: u.id, username: u.username, displayName: u.displayName })),
    [candidates]
  );

  const memberChips = useMemo(
    () => members.map((u) => ({ id: u.id, username: u.username, displayName: u.displayName })),
    [members]
  );

  return (
    <div className="flex gap-5">
      {/* 中欄：角色清單 */}
      <div className="w-[520px]">
        <RoleListPanel
          title="Roles"
          roles={roles}
          selectedRoleId={selectedRoleId}
          onSelectRole={selectRole}
          onCreateRole={() => {
            // 你目前已經有 CreateRoleModal 的話，就維持原本 open modal 的方式
            // 這邊先留著 hook 點：若你是直接呼叫 createRole(input)，可在 Modal submit 時呼叫
            // 暫時不做事也沒關係
          }}
          enableSearch
        />
      </div>

      {/* 右欄：角色成員 */}
      <div className="flex-1">
        <RoleMembersPanel
          title="Users in Role"
          roleName={selectedRole?.name ?? null}
          query={q}
          onChangeQuery={setQuery}
          candidates={candidateChips}
          selectedCandidateId={selectedCandidateId}
          onSelectCandidate={(userId) => selectCandidate(userId)}
          onAddMember={
            selectedCandidateId
              ? () => stageAdd(selectedCandidateId)
              : undefined
          }
          members={memberChips}
          onRemoveMember={(userId) => stageRemove(userId)}
          dirty={dirty}
          saving={saving}
          onSave={save}
          onReset={resetDraft}
        />
      </div>
    </div>
  );
}