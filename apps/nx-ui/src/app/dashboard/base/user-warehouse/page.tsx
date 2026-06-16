// apps/nx-ui/src/app/dashboard/base/user-warehouse/page.tsx
/** 使用者據點設定 — 雙欄版（左據點 / 右成員）；DashboardShell 已加 bypass。 */
'use client';

import { ReverseAssignPage, type ReverseAssignConfig } from '@/features/nx01/shell/reverse-assign/ReverseAssignPage';
import { listWarehouses } from '@data/endpoints/base/api/warehouse';
import { listUserWarehouses, assignUserWarehouse, revokeUserWarehouse } from '@data/endpoints/base/api/user-warehouse';

const CONFIG: ReverseAssignConfig = {
  category: '帳號與權限',
  title: '使用者據點設定',
  entityNoun: '據點',
  memberNoun: '成員',
  loadEntities: async () => {
    const res = await listWarehouses({ pageSize: 100, isActive: true });
    return res.items.map((w) => ({ id: w.id, code: w.code, name: w.name }));
  },
  loadMembers: async (warehouseId) => {
    const res = await listUserWarehouses({ warehouseId, isActive: true, pageSize: 100 });
    return res.items.map((uw) => ({
      recordId: uw.id,
      userId: uw.userId,
      label: uw.userDisplayName ?? uw.userAccount ?? uw.userId,
      sub: uw.userAccount ?? '',
    }));
  },
  assign: async (warehouseId, userId) => {
    await assignUserWarehouse({ userId, warehouseId });
  },
  revoke: async (recordId) => {
    await revokeUserWarehouse(recordId);
  },
};

export default function Page() {
  return <ReverseAssignPage config={CONFIG} />;
}
