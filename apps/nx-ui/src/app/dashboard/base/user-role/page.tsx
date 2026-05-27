// apps/nx-ui/src/app/dashboard/base/user-role/page.tsx
/** 使用者職務設定 — 雙欄版（左職務 / 右成員）；DashboardShell 已加 bypass。 */
'use client';

import { ReverseAssignPage, type ReverseAssignConfig } from '@/features/base/reverse-assign/ReverseAssignPage';
import { listRoles } from '@/features/base/api/role';
import { listUserRoles, assignUserRole, revokeUserRole } from '@/features/base/api/user-role';

const CONFIG: ReverseAssignConfig = {
  category: '帳號與權限',
  title: '使用者職務設定',
  entityNoun: '職務',
  memberNoun: '成員',
  loadEntities: async () => {
    const res = await listRoles({ pageSize: 100, isActive: true });
    return res.items.map((r) => ({ id: r.id, code: r.code, name: r.name }));
  },
  loadMembers: async (roleId) => {
    const res = await listUserRoles({ roleId, isActive: true, pageSize: 100 });
    return res.items.map((ur) => ({
      recordId: ur.id,
      userId: ur.userId,
      label: ur.userDisplayName ?? ur.userId,
      sub: ur.roleName ?? '',
    }));
  },
  assign: async (roleId, userId) => {
    await assignUserRole({ userId, roleId });
  },
  revoke: async (recordId) => {
    await revokeUserRole(recordId);
  },
};

export default function Page() {
  return <ReverseAssignPage config={CONFIG} />;
}
