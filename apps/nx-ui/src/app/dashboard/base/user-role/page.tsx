// apps/nx-ui/src/app/dashboard/base/user-role/page.tsx
/** 使用者職務設定 — 雙欄版（左職務 / 右成員）；DashboardShell 已加 bypass。 */
'use client';

import { ReverseAssignPage, type ReverseAssignConfig } from '@/features/nx01/shell/reverse-assign/ReverseAssignPage';
import { listRoles } from '@data/endpoints/base/api/role';
import { listUserRoles, assignUserRole, revokeUserRole } from '@data/endpoints/base/api/user-role';

const CONFIG: ReverseAssignConfig = {
  category: '帳號與權限',
  title: '使用者職務設定',
  entityNoun: '職務',
  memberNoun: '成員',
  loadEntities: async () => {
    const res = await listRoles({ pageSize: 100, isActive: true });
    // SYSADMIN 鎖定（前端再保險、對齊後端 role.service list 過濾）：系統管理員職務不出現在指派頁。
    return res.items
      .filter((r) => String(r.code ?? '').trim().toUpperCase() !== 'SYSADMIN')
      .map((r) => ({ id: r.id, code: r.code, name: r.name }));
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
