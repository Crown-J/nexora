/**
 * File: apps/nx-ui/src/features/nx00/role-view/ui/RoleViewMatrixView.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-ROLE-VIEW-MATRIX-VIEW-001：RoleView Matrix View（權限矩陣）
 *
 * Notes:
 * - 左：角色列表（GroupListPanel）
 * - 右：View + CRUDX 權限矩陣（本地暫存 + Save）
 */

'use client';

import { useMemo } from 'react';
import { PageHeader } from '@/shared/ui/PageHeader';
import { GroupSplitShell } from '@/shared/ui/group/GroupSplitShell';
import { GroupListPanel } from '@/shared/ui/group/GroupListPanel';
import { GroupPanelShell } from '@/shared/ui/group/GroupPanelShell';
import { cx } from '@/shared/lib/cx';

import { useRoleViewMatrix } from '@/features/nx00/role-view/hooks/useRoleViewMatrix';
import type { PermKey } from '@/features/nx00/role-view/types';
import type { RoleDto } from '@/features/nx00/role/types';

const PERM_COLS: { key: PermKey; label: string }[] = [
    { key: 'canRead', label: '讀取' },
    { key: 'canCreate', label: '新增' },
    { key: 'canUpdate', label: '修改' },
    { key: 'canDelete', label: '刪除' },
    { key: 'canExport', label: '匯出' },
];

function roleItem(r: RoleDto) {
    return (
        <>
            <div className="font-semibold">{r.name}</div>
            <div className="text-xs text-white/50">{r.code}</div>
        </>
    );
}

export function RoleViewMatrixView() {
    const vm = useRoleViewMatrix();

    const leftTitle = useMemo(() => '畫面功能列表（角色）', []);
    const rightTitle = useMemo(() => {
        if (!vm.selectedRole) return '權限矩陣（請先選角色）';
        return `權限矩陣：${vm.selectedRole.name}`;
    }, [vm.selectedRole]);

    const rightActions = (
        <>
            <div className="mr-2 text-xs text-white/60">Dirty: {vm.dirtyCount}</div>

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
        <GroupPanelShell title={rightTitle} actions={rightActions}>
            {(vm.viewError || vm.roleViewError || vm.saveError) && (
                <div className="mb-2 space-y-1">
                    {vm.viewError && <div className="text-xs text-red-300">{vm.viewError}</div>}
                    {vm.roleViewError && <div className="text-xs text-red-300">{vm.roleViewError}</div>}
                    {vm.saveError && <div className="text-xs text-red-300">{vm.saveError}</div>}
                </div>
            )}

            {!vm.selectedRole ? (
                <div className="rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-white/60">
                    請先從左側選擇角色，才會顯示該角色的 View 權限矩陣。
                </div>
            ) : (
                <>
                    {/* Top bulk buttons (像你圖上的 讀取/新增/修改/刪除/匯出) */}
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                        {PERM_COLS.map((c) => (
                            <button
                                key={c.key}
                                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/80 hover:bg-white/10 disabled:opacity-40"
                                onClick={() => vm.actions.bulkSetPermForVisible(c.key, true)}
                                disabled={vm.saving}
                                title={`將目前可見的 rows 全部設為 ${c.label}=true`}
                            >
                                {c.label}
                            </button>
                        ))}

                        <div className="ml-auto flex items-center gap-2">
                            <span className="text-xs text-white/60">Module</span>
                            <select
                                className="rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-xs text-white/80 outline-none"
                                value={vm.moduleFilter}
                                onChange={(e) => vm.actions.setModuleFilter(e.target.value)}
                            >
                                <option value="">全部</option>
                                {vm.modules.map((m) => (
                                    <option key={m} value={m}>
                                        {m}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Matrix */}
                    <div className="overflow-auto rounded-xl border border-white/10 bg-black/20">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 z-10 bg-black/70 backdrop-blur supports-[backdrop-filter]:bg-black/50">
                                <tr className="border-b border-white/10">
                                    <th className="w-[360px] px-3 py-2 text-left text-[11px] font-semibold text-white/70">
                                        畫面 / 功能
                                    </th>

                                    {PERM_COLS.map((c) => (
                                        <th key={c.key} className="w-[110px] px-3 py-2 text-center text-[11px] font-semibold text-white/70">
                                            {c.label}
                                        </th>
                                    ))}

                                    <th className="w-[110px] px-3 py-2 text-center text-[11px] font-semibold text-white/70">
                                        啟用
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="text-white/85">
                                {vm.modules
                                    .filter((m) => (vm.moduleFilter ? m === vm.moduleFilter : true))
                                    .map((mc) => {
                                        const rows = vm.grouped[mc] ?? [];
                                        const open = vm.moduleOpen[mc] !== false;

                                        return (
                                            <tbody key={mc}>
                                                <tr className="border-b border-white/10 bg-white/[0.03]">
                                                    <td className="px-3 py-2">
                                                        <button
                                                            className="flex items-center gap-2 text-sm font-semibold text-white/85 hover:text-white"
                                                            onClick={() => vm.actions.toggleModule(mc)}
                                                        >
                                                            <span className="inline-block w-4 text-center">{open ? '▼' : '▶'}</span>
                                                            <span>{mc}</span>
                                                            <span className="text-xs text-white/45">({rows.length})</span>
                                                        </button>
                                                    </td>
                                                    {PERM_COLS.map((c) => (
                                                        <td key={c.key} className="px-3 py-2 text-center text-xs text-white/35">
                                                            —
                                                        </td>
                                                    ))}
                                                    <td className="px-3 py-2 text-center text-xs text-white/35">—</td>
                                                </tr>

                                                {open &&
                                                    rows.map((r, idx) => (
                                                        <tr
                                                            key={r.view.id}
                                                            className={cx(
                                                                'border-b border-white/5 hover:bg-white/[0.06]',
                                                                idx % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]',
                                                            )}
                                                        >
                                                            <td className="px-3 py-2">
                                                                <div className="text-sm font-semibold">{r.view.name}</div>
                                                                <div className="text-xs text-white/45">{r.view.code}</div>
                                                                <div className="text-[11px] text-white/35">{r.view.path}</div>
                                                            </td>

                                                            {PERM_COLS.map((c) => (
                                                                <td key={c.key} className="px-3 py-2 text-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={Boolean(r.perms[c.key])}
                                                                        onChange={(e) => vm.actions.setPerm(r.view.id, c.key, e.target.checked)}
                                                                        disabled={vm.saving}
                                                                    />
                                                                </td>
                                                            ))}

                                                            <td className="px-3 py-2 text-center">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={Boolean(r.isActive)}
                                                                    onChange={(e) => vm.actions.setRowActive(r.view.id, e.target.checked)}
                                                                    disabled={vm.saving}
                                                                    title="取消啟用會在 Save 後 revoke"
                                                                />
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>

                    {(vm.viewLoading || vm.roleViewLoading) && <div className="mt-2 text-xs text-white/60">載入中...</div>}
                </>
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