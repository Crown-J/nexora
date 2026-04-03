/**
 * File: apps/nx-ui/src/features/base/role-view/BaseRoleViewSplitView.tsx
 *
 * Purpose:
 * - 主檔「職務權限設定」：左側角色列表 + 右側 Role⇄View 矩陣（沿用 useRoleView API，新風格外殼）
 */

'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useRoleView } from '@/features/nx00/role-view/hooks/useRoleView';
import { RoleViewMatrix } from '@/features/nx00/role-view/ui/RoleViewMatrix';
import type { RoleDto } from '@/features/nx00/role/types';

export function BaseRoleViewSplitView() {
  const vm = useRoleView();

  const leftTitle = useMemo(() => {
    if (!vm.selectedRole) return '畫面功能列表（角色）';
    return `畫面功能列表（已選：${vm.selectedRole.name}）`;
  }, [vm.selectedRole]);

  const rightTitle = useMemo(() => {
    if (!vm.selectedRole) return '權限矩陣（請先選角色）';
    return `權限矩陣：${vm.selectedRole.name}`;
  }, [vm.selectedRole]);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)] lg:items-stretch">
      <section className="glass-card flex max-h-[min(720px,calc(100vh-220px))] min-h-[420px] flex-col rounded-2xl border border-border/80 p-4 shadow-sm">
        <div className="mb-3">
          <p className="text-xs tracking-[0.35em] text-muted-foreground">ROLES</p>
          <h2 className="mt-1 text-sm font-semibold text-foreground">{leftTitle}</h2>
        </div>
        <Input
          value={vm.roleSearch}
          onChange={(e) => vm.actions.setRoleSearch(e.target.value)}
          placeholder="搜尋角色（code / name）"
          className="mb-3"
          autoComplete="off"
          onKeyDown={(e) => {
            if (e.key === 'Escape') vm.actions.setRoleSearch('');
          }}
        />
        {vm.rolesError ? <div className="mb-2 text-xs text-destructive">{vm.rolesError}</div> : null}
        {vm.rolesLoading ? <div className="mb-2 text-xs text-muted-foreground">載入中…</div> : null}
        <ScrollArea className="min-h-0 flex-1 pr-2">
          <div className="space-y-2 pb-1">
            {vm.roles.map((r: RoleDto) => {
              const active = vm.roleId === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => vm.actions.selectRole(r.id)}
                  className={cn(
                    'w-full rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
                    active
                      ? 'border-primary/40 border-l-4 border-l-primary bg-primary/10 pl-2.5 text-foreground shadow-sm ring-1 ring-primary/20'
                      : 'border-border/80 bg-muted/15 text-foreground hover:bg-muted/30',
                  )}
                >
                  <div className="font-semibold leading-snug">{r.name}</div>
                  <div className="text-xs text-muted-foreground">{r.code}</div>
                </button>
              );
            })}
            {!vm.rolesLoading && vm.roles.length === 0 ? (
              <div className="rounded-xl border border-border/60 bg-muted/10 p-4 text-sm text-muted-foreground">
                無角色資料（請確認後端 API 與登入權限）。
              </div>
            ) : null}
          </div>
        </ScrollArea>
      </section>

      <section className="glass-card flex min-h-[min(720px,calc(100vh-220px))] flex-col rounded-2xl border border-border/80 p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="min-w-0">
            <p className="text-xs tracking-[0.35em] text-muted-foreground">MATRIX</p>
            <h2 className="mt-1 text-sm font-semibold text-foreground">{rightTitle}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs tabular-nums text-muted-foreground">Dirty: {vm.dirtyCount}</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => vm.actions.clearRole()}
              disabled={vm.saving}
            >
              退出
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={vm.actions.save}
              disabled={!vm.selectedRole || vm.saving || vm.dirtyCount === 0}
              title={
                !vm.selectedRole ? '請先選擇角色' : vm.dirtyCount === 0 ? '沒有變更' : '儲存變更'
              }
            >
              {vm.saving ? '儲存中…' : '儲存'}
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          {!vm.selectedRole ? (
            <p className="text-sm text-muted-foreground">
              請先從左側選擇角色，才會顯示該角色的 View 權限矩陣。
            </p>
          ) : (
            <ScrollArea className="h-[min(640px,calc(100vh-320px))] pr-3">
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
                onSetPerm={vm.actions.setPerm}
                onSetRowActive={vm.actions.setRowActive}
                onToggleAll={vm.actions.setAllPerms}
                onToggleModuleAll={vm.actions.toggleModuleAll}
                appearance="base"
                showMatrixHeader={false}
              />
            </ScrollArea>
          )}
        </div>
      </section>
    </div>
  );
}
