/**
 * File: apps/nx-ui/src/features/nx00/rbac/ui/RoleUserAssignView.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-RBAC-UI-003：角色 ↔ 使用者指派視圖（View）
 *
 * Notes:
 * - View container：串接 panels + hook
 * - 草稿模式：Add/Remove → draft，Save 才寫入
 */

'use client';

import { useMemo, useState } from 'react';

import { useRoleUserAssign } from '@/features/nx00/rbac/hooks/useRoleUserAssign';
import { CreateRoleModal } from '@/features/nx00/rbac/ui/CreateRoleModal';
import { RoleListPanel } from '@/features/nx00/rbac/ui/RoleListPanel';
import { RoleMembersPanel } from '@/features/nx00/rbac/ui/RoleMembersPanel';

export function RoleUserAssignView() {
  const { state, actions } = useRoleUserAssign();
  const [createOpen, setCreateOpen] = useState(false);

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

  const {
    selectRole,
    setQuery,
    selectCandidate,

    stageAdd,
    stageRemove,

    save,
    resetDraft,

    createRole,
  } = actions;

  const selectedRole = useMemo(() => {
    if (!selectedRoleId) return null;
    return roles.find((r) => r.id === selectedRoleId) ?? null;
  }, [roles, selectedRoleId]);

  return (
    <>
      <div className="flex gap-5">
        {/* Left: Role list */}
        <div className="w-[520px]">
          <RoleListPanel
            title="Roles"
            roles={roles}
            selectedRoleId={selectedRoleId}
            onSelectRole={selectRole}
            onCreateRole={() => setCreateOpen(true)}
            enableSearch
          />
        </div>

        {/* Right: Role members */}
        <div className="flex-1">
          <RoleMembersPanel
            title="Users in Role"
            roleName={selectedRole?.name ?? null}
            query={q}
            onChangeQuery={setQuery}
            candidates={candidates}
            selectedCandidateId={selectedCandidateId}
            onSelectCandidate={selectCandidate}
            onAddMember={
              selectedCandidateId ? () => stageAdd(selectedCandidateId) : undefined
            }
            members={members}
            onRemoveMember={stageRemove}
            dirty={dirty}
            saving={saving}
            onSave={save}
            onReset={resetDraft}
          />
        </div>
      </div>

      <CreateRoleModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={createRole}
      />
    </>
  );
}