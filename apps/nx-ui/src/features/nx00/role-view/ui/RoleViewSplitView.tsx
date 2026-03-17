/**
 * File: apps/nx-ui/src/features/nx00/role-view/ui/RoleViewSplitView.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-ROLE-VIEW-SPLIT-VIEW-001：RoleView Split View（左角色列表 + 右權限矩陣）
 *
 * Notes:
 * - 使用 useRoleView（批次 API 版）取得資料
 * - 本檔負責組裝左右版面與頁首，子矩陣由 RoleViewMatrix render-only 呈現
 */

'use client';

import { useMemo } from 'react';
import { PageHeader } from '@/shared/ui/PageHeader';
import { GroupSplitShell } from '@/shared/ui/group/GroupSplitShell';
import { GroupListPanel } from '@/shared/ui/group/GroupListPanel';
import { GroupPanelShell } from '@/shared/ui/group/GroupPanelShell';

import { useRoleView } from '@/features/nx00/role-view/hooks/useRoleView';
import type { RoleDto } from '@/features/nx00/role/types';
import { RoleViewMatrix } from '@/features/nx00/role-view/ui/RoleViewMatrix';

function roleItem(r: RoleDto) {
  return (
    <>
      <div className="font-semibold">{r.name}</div>
      <div className="text-xs text-white/50">{r.code}</div>
    </>
  );
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-ROLE-VIEW-SPLIT-VIEW-001-F01
 * 說明：RoleViewSplitView - 左側角色 + 右側權限矩陣（批次儲存）
 */
export function RoleViewSplitView() {
  const vm = useRoleView();

  const leftTitle = useMemo(() => '畫面功能列表（角色）', []);
  const rightTitle = useMemo(() => {
    if (!vm.selectedRole) return '權限矩陣（請先選角色）';
    return `權限矩陣：${vm.selectedRole.name}`;
  }, [vm.selectedRole]);

  const rightHeaderActions = (
    <>
      <button
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80 hover:bg-white/10 disabled:opacity-40"
        onClick={() => vm.actions.clearRole()}
        disabled={vm.saving}
      >
        退出
      </button>

      <button
        className="rounded-lg border border-white/10 bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/15 disabled:opacity-40"
        onClick={vm.actions.save}
        disabled={!vm.selectedRole || vm.saving || vm.dirtyCount === 0}
        title={!vm.selectedRole ? '請先選擇角色' : vm.dirtyCount === 0 ? '沒有變更' : '儲存變更'}
      >
        {vm.saving ? '儲存中...' : 'Save'}
      </button>
    </>
  );

  const left = (
    <GroupListPanel
      title={leftTitle}
      className="w-[360px]"
      searchValue={vm.roleSearch}
      onSearchChange={vm.actions.setRoleSearch}
      searchPlaceholder="搜尋角色（code / name）"
      loading={vm.rolesLoading}
      error={vm.rolesError}
      emptyText="無角色資料"
      items={vm.roles}
      getKey={(r) => r.id}
      isActive={(r) => vm.roleId === r.id}
      onSelect={(r) => vm.actions.selectRole(r.id)}
      renderItem={roleItem}
    />
  );

  const right = (
    <GroupPanelShell title={rightTitle} actions={rightHeaderActions}>
      {!vm.selectedRole ? (
        <div className="rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-white/60">
          請先從左側選擇角色，才會顯示該角色的 View 權限矩陣。
        </div>
      ) : (
        <RoleViewMatrix
          title=""
          headerActions={null}
          modules={vm.modules}
          moduleOpen={vm.moduleOpen}
          moduleFilter={vm.moduleFilter}
          grouped={vm.grouped}
          viewError={vm.viewError}
          roleViewError={vm.roleViewError}
          saveError={vm.saveError}
          viewLoading={vm.viewLoading}
          roleViewLoading={vm.roleViewLoading}
          saving={vm.saving}
          dirtyCount={vm.dirtyCount}
          onToggleModule={vm.actions.toggleModule}
          onChangeModuleFilter={vm.actions.setModuleFilter}
          onBulkSetPerm={vm.actions.bulkSetPermForVisible}
          onSetPerm={vm.actions.setPerm}
          onSetRowActive={vm.actions.setRowActive}
        />
      )}
    </GroupPanelShell>
  );

  return (
    <>
      <PageHeader title="使用者權限設定（Role ⇄ View）" />
      <GroupSplitShell left={left} right={right} leftWidthClassName="w-[360px]" />
    </>
  );
}

