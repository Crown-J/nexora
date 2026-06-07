// apps/nx-ui/src/features/user-zoned/UserFormZoned.tsx
// v1.2 對齊軌 階段 E P4：user 分區編輯共用 form
//
// 對齊 v1.1 §2.3：4 zone basic / permission / security / hr(PRO)
// P4 階段簡化：
// - basic：4 欄完整可編
// - permission：isActive 可編；roles 衛星 + isTenantOwner 暫 placeholder（DTO 不支援、P5/PRO 補）
// - security：全 placeholder（mustChangePassword/failedLoginCount/lockedUntil/lastLoginAt）
// - hr：全 placeholder（PRO 才啟用）
'use client';

import { useMemo } from 'react';

import { cn } from '@/lib/utils';
import {
  USER_FIELDS,
  USER_ZONES,
  type UserZone,
} from '@/features/master-zones';
import { FormField, FormInput } from '@/features/master-shell/ui/FormField';
import { SatelliteSection } from '@/features/satellite/SatelliteSection';
import { formatDateTimeZh } from '@/features/master-shell/entity-master/format';
import { type RoleDto } from '@/features/base/api/role';
import { type UserRoleDto } from '@/features/base/api/user-role';
import { type UserWarehouseDto } from '@/features/base/api/user-warehouse';
import { type WarehouseDto } from '@/features/base/api/warehouse';

import { BASIC_WRITABLE, PERMISSION_WRITABLE, type UserDraft } from './helpers';
import { UserAddressMiniPicker } from '@/features/shared/address/UserAddressMiniPicker';

// 02 對齊第二批前端收尾軌 FE-CP3 2026-06-07：地址 9 個 key 跳過 inline、由 UserAddressSection 統一渲染
const ADDRESS_KEYS_HANDLED_BY_SECTION = new Set([
  'countryId',
  'householdCityId',
  'householdDistrictId',
  'householdPostalCode',
  'householdDetail',
  'mailingCityId',
  'mailingDistrictId',
  'mailingPostalCode',
  'mailingDetail',
]);

export type UserFormZonedProps = {
  mode: 'browse' | 'edit';
  creating: boolean;
  draft: UserDraft;
  setDraft: (next: UserDraft) => void;
  activeZone: UserZone;
  setActiveZone: (z: UserZone) => void;
  /** v1.1 §1 可編 zones。undefined = 主檔中心、全 zone */
  editableZones?: Set<UserZone>;
  // ── B2~B5：permission zone inline 渲染所需 ──
  selectedUserRoles?: UserRoleDto[];
  selectedUserWarehouses?: UserWarehouseDto[];
  stagedRemovedRoleIds?: Set<string>;
  stagedAddedRoles?: RoleDto[];
  stagedPrimaryRoleId?: string | null;
  stagedRemovedWarehouseIds?: Set<string>;
  stagedAddedWarehouses?: WarehouseDto[];
  onOpenRolePicker?: () => void;
  onOpenWarehousePicker?: () => void;
  onSetRolePrimary?: (role: UserRoleDto) => void;
  onRevokeRole?: (role: UserRoleDto) => void;
  onRevokeWarehouse?: (uw: UserWarehouseDto) => void;
};

export function UserFormZoned({
  mode,
  creating,
  draft,
  setDraft,
  activeZone,
  setActiveZone,
  editableZones,
  selectedUserRoles,
  selectedUserWarehouses,
  stagedRemovedRoleIds,
  stagedAddedRoles,
  stagedPrimaryRoleId,
  stagedRemovedWarehouseIds,
  stagedAddedWarehouses,
  onOpenRolePicker,
  onOpenWarehousePicker,
  onSetRolePrimary,
  onRevokeRole,
  onRevokeWarehouse,
}: UserFormZonedProps) {
  const editing = mode === 'edit';

  const visibleZones = useMemo<Set<UserZone>>(
    () => editableZones ?? new Set(USER_ZONES.map((z) => z.zone)),
    [editableZones],
  );

  const visibleZoneList = useMemo(
    () => USER_ZONES.filter((z) => visibleZones.has(z.zone)),
    [visibleZones],
  );

  const safeActiveZone = visibleZones.has(activeZone)
    ? activeZone
    : visibleZoneList[0]?.zone ?? 'basic';

  const fieldsForZone = useMemo(
    () => USER_FIELDS.filter((f) => f.zone === safeActiveZone),
    [safeActiveZone],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Zone Tabs */}
      <div className="flex flex-wrap items-center gap-1 border-b border-[#2A2A30] pb-px">
        {visibleZoneList.map((z) => {
          const active = z.zone === safeActiveZone;
          const isPlaceholderZone = z.zone === 'security' || z.zone === 'hr';
          return (
            <button
              key={z.zone}
              type="button"
              onClick={() => setActiveZone(z.zone)}
              className={cn(
                'relative px-3 py-2 text-xs font-semibold tracking-[0.1em] uppercase transition-colors',
                active ? 'text-[#E8A020]' : 'text-[#888892] hover:text-[#E8E8EB]',
                isPlaceholderZone && !active && 'text-[#5A5A60]',
              )}
            >
              {z.label}
              {active ? (
                <span className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-[#E8A020]" />
              ) : null}
            </button>
          );
        })}
      </div>

      {/* fields */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fieldsForZone.map((f) => {
          // 02 對齊第二批前端收尾軌 FE-CP3：地址 9 keys 統一由 UserAddressSection 渲染
          if (ADDRESS_KEYS_HANDLED_BY_SECTION.has(f.key)) return null;
          // 衛星表
          if (f.isSatellite) {
            // B2~B5：roles 衛星改為 inline 編輯區（從舊版 UserMasterPage 移植）
            if (f.key === 'roles') {
              return (
                <div key={f.key} className="sm:col-span-2">
                  <RolesInlineSection
                    editing={editing}
                    items={selectedUserRoles ?? []}
                    stagedRemovedIds={stagedRemovedRoleIds ?? new Set()}
                    stagedAdded={stagedAddedRoles ?? []}
                    stagedPrimaryId={stagedPrimaryRoleId ?? null}
                    onOpenPicker={onOpenRolePicker}
                    onSetPrimary={onSetRolePrimary}
                    onRevoke={onRevokeRole}
                  />
                </div>
              );
            }
            // hr zone 衛星（teams）：PRO 啟用、本軌 placeholder
            return (
              <div key={f.key} className="sm:col-span-2">
                <SatelliteSection
                  title={f.label}
                  description={`衛星表 ${f.satelliteName ?? ''}；${f.notes ?? ''}`}
                  status="backend-missing"
                  hint="PRO 啟用 / closure 後續軌"
                />
              </div>
            );
          }

          // 本軌可編 = basic 4 欄 + permission.isActive；其餘 DTO 不支援、顯示 placeholder
          const isWritable = BASIC_WRITABLE.has(f.key) || PERMISSION_WRITABLE.has(f.key);
          const zoneEditable = editableZones ? editableZones.has(f.zone) : true;
          // 員工編號制改造（2026-06-02）：員編可改（內碼 id 不變、FK 不斷）
          //   舊規格曾鎖 userAccount（lockedNow = editing && !creating && f.key === 'userAccount'）、
          //   現解鎖、依賴 schema @@unique[tenantId, userAccount] + service 端 ConflictException 防衝突
          const lockedNow = false;
          const fieldEditable = editing && isWritable && zoneEditable && !lockedNow;

          // isActive toggle（permission 區）
          if (f.key === 'isActive' && fieldEditable) {
            const on = Boolean(draft[f.key]);
            return (
              <FieldShell key={f.key} label={f.label}>
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, [f.key]: !on })}
                  className={cn(
                    'inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors',
                    on
                      ? 'border-[#22D88F]/40 bg-[#22D88F]/10 text-[#22D88F]'
                      : 'border-[#E26060]/40 bg-[#E26060]/10 text-[#E26060]',
                  )}
                >
                  {on ? '啟用' : '停用'}
                </button>
              </FieldShell>
            );
          }

          // 一般文字輸入
          if (fieldEditable) {
            return (
              <FormInput
                key={f.key}
                label={f.label + (f.required ? ' *' : '')}
                value={String(draft[f.key] ?? '')}
                onChange={(v) => setDraft({ ...draft, [f.key]: v })}
              />
            );
          }

          // 非本軌支援欄位 → placeholder（security / hr / isTenantOwner / 角色衛星）
          if (!isWritable) {
            const placeholderHint =
              f.zone === 'hr' ? 'PRO 啟用' :
              f.zone === 'security' ? 'P5 啟用（安全設定 service 自動寫、後台檢視）' :
              '本軌不可編';
            return (
              <FormField
                key={f.key}
                label={f.label}
                value={`${placeholderHint}：${f.notes ?? '—'}`}
                dim
              />
            );
          }

          // 瀏覽 / locked
          const raw = draft[f.key];
          return (
            <FormField
              key={f.key}
              label={f.label}
              value={String(raw ?? '—') || '—'}
              mono={f.key === 'userAccount'}
              tone={
                f.key === 'isActive'
                  ? (raw ? 'green' : 'red')
                  : undefined
              }
            />
          );
        })}
      </div>

      {/* 02 對齊第二批前端收尾軌 FE-CP3：basic zone 末尾兩組地址 picker（戶籍 + 通訊） */}
      {safeActiveZone === 'basic' ? (
        <UserAddressSection editing={editing} draft={draft} setDraft={setDraft} />
      ) : null}

      {/* B3：permission zone 末尾插入「隸屬倉庫」inline 編輯區（warehouse 不在 USER_FIELDS） */}
      {safeActiveZone === 'permission' ? (
        <WarehousesInlineSection
          editing={editing}
          items={selectedUserWarehouses ?? []}
          stagedRemovedIds={stagedRemovedWarehouseIds ?? new Set()}
          stagedAdded={stagedAddedWarehouses ?? []}
          onOpenPicker={onOpenWarehousePicker}
          onRevoke={onRevokeWarehouse}
        />
      ) : null}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 02 對齊第二批前端收尾軌 FE-CP3：user 兩組地址 section（戶籍 + 通訊）
// ──────────────────────────────────────────────────────────────
function UserAddressSection({
  editing,
  draft,
  setDraft,
}: {
  editing: boolean;
  draft: UserDraft;
  setDraft: (next: UserDraft) => void;
}) {
  const countryId = (draft.countryId as string | undefined) ?? null;
  return (
    <div className="mt-4 space-y-4 rounded-lg border border-[#2A2A30] bg-[#0E0E12] p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#888892]">
          地址（戶籍 + 通訊）
        </h3>
        <span className="text-[10px] text-[#5A5A60]">空白國別 = 台灣（走字典）；其他國家 = 國外自由填</span>
      </div>
      <div>
        <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#888892]">國別</label>
        <input
          type="text"
          className="h-9 w-full rounded-md border border-[#2A2A30] bg-[#0A0A0C] px-3 text-sm text-[#E8E8EC] disabled:opacity-50"
          value={countryId ?? ''}
          onChange={(e) => setDraft({ ...draft, countryId: e.target.value || '' })}
          placeholder="留空 = 台灣；非台灣請填國家 ID"
          disabled={!editing}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-2 text-[11px] font-medium text-[#E8E8EC]">戶籍地址</div>
          <UserAddressMiniPicker
            value={{
              cityId: (draft.householdCityId as string | undefined) ?? null,
              districtId: (draft.householdDistrictId as string | undefined) ?? null,
              postalCode: (draft.householdPostalCode as string | undefined) ?? null,
              detail: (draft.householdDetail as string | undefined) ?? null,
            }}
            onChange={(v) =>
              setDraft({
                ...draft,
                householdCityId: v.cityId ?? '',
                householdDistrictId: v.districtId ?? '',
                householdPostalCode: v.postalCode ?? '',
                householdDetail: v.detail ?? '',
              })
            }
            countryId={countryId}
            disabled={!editing}
          />
        </div>
        <div>
          <div className="mb-2 text-[11px] font-medium text-[#E8E8EC]">通訊地址</div>
          <UserAddressMiniPicker
            value={{
              cityId: (draft.mailingCityId as string | undefined) ?? null,
              districtId: (draft.mailingDistrictId as string | undefined) ?? null,
              postalCode: (draft.mailingPostalCode as string | undefined) ?? null,
              detail: (draft.mailingDetail as string | undefined) ?? null,
            }}
            onChange={(v) =>
              setDraft({
                ...draft,
                mailingCityId: v.cityId ?? '',
                mailingDistrictId: v.districtId ?? '',
                mailingPostalCode: v.postalCode ?? '',
                mailingDetail: v.detail ?? '',
              })
            }
            countryId={countryId}
            disabled={!editing}
          />
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// B2~B5：roles inline section（從舊版 UserMasterPage UserDetailView 移植）
// ──────────────────────────────────────────────────────────────

function RolesInlineSection({
  editing,
  items,
  stagedRemovedIds,
  stagedAdded,
  stagedPrimaryId,
  onOpenPicker,
  onSetPrimary,
  onRevoke,
}: {
  editing: boolean;
  items: UserRoleDto[];
  stagedRemovedIds: Set<string>;
  stagedAdded: RoleDto[];
  stagedPrimaryId: string | null;
  onOpenPicker?: () => void;
  onSetPrimary?: (role: UserRoleDto) => void;
  onRevoke?: (role: UserRoleDto) => void;
}) {
  // 計算當前「有效」 primary：有 staged 則用 staged、否則用 existing.isPrimary
  const effectivePrimaryId =
    stagedPrimaryId ?? items.find((r) => r.isPrimary)?.id ?? null;
  const visibleItems = items.filter((r) => !stagedRemovedIds.has(r.id));
  const totalActive = visibleItems.length + stagedAdded.length;

  return (
    <div className="rounded-md border border-[#2A2A30] bg-[#0A0A0C]/40">
      <div className="flex items-center justify-between border-b border-[#2A2A30] px-3 py-2">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#E8E8EB]">
            擔任職務
          </span>
          <span className="ml-2 rounded bg-[#2A2A30] px-1.5 py-0.5 text-[10px] text-[#B8B8C0]">
            {totalActive} 筆
          </span>
        </div>
        {editing && onOpenPicker ? (
          <button
            type="button"
            onClick={onOpenPicker}
            data-formchain="1"
            className="inline-flex h-7 items-center gap-1 rounded-md border border-[#E8A020]/40 bg-[#E8A020]/12 px-2.5 text-[11px] font-medium text-[#E8A020] hover:bg-[#E8A020]/20"
          >
            設定職務
          </button>
        ) : null}
      </div>
      <div className="px-3 py-2.5">
        {totalActive === 0 ? (
          <div className="text-xs text-[#5A5A60]">尚未指派職務</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-[#5A5A60]">
                <th className="py-1.5 pr-3">職務代碼</th>
                <th className="py-1.5 pr-3">職務名稱</th>
                <th className="py-1.5 pr-3">主要</th>
                <th className="py-1.5 pr-3">指派時間</th>
                {editing ? <th className="py-1.5">操作</th> : null}
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((ur) => {
                const isPrimary = ur.id === effectivePrimaryId;
                return (
                  <tr key={ur.id} className="border-t border-[#2A2A30]/60">
                    <td className="py-1.5 pr-3 font-mono text-[#888892]">{ur.roleCode ?? '—'}</td>
                    <td className="py-1.5 pr-3">{ur.roleName ?? '—'}</td>
                    <td className="py-1.5 pr-3">
                      {isPrimary ? (
                        <span className="rounded border border-[#E8A020]/40 bg-[#E8A020]/10 px-1.5 py-0.5 text-[10px] text-[#E8A020]">
                          主要
                        </span>
                      ) : (
                        <span className="text-[#5A5A60]">—</span>
                      )}
                    </td>
                    <td className="py-1.5 pr-3 text-[#888892]">
                      {ur.assignedAt ? formatDateTimeZh(ur.assignedAt) : '—'}
                    </td>
                    {editing ? (
                      <td className="py-1.5">
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            disabled={isPrimary}
                            onClick={() => onSetPrimary?.(ur)}
                            title={isPrimary ? '已是主要職務' : '設為主要職務'}
                            className={cn(
                              'inline-flex h-6 items-center rounded-md border px-2 text-[10px] font-medium transition-colors',
                              isPrimary
                                ? 'cursor-not-allowed border-[#E8A020]/30 bg-[#E8A020]/8 text-[#E8A020]/60'
                                : 'border-[#2A2A30] bg-[#0A0A0C] text-[#B8B8C0] hover:border-[#E8A020]/40 hover:bg-[#E8A020]/10 hover:text-[#E8A020]',
                            )}
                          >
                            {isPrimary ? '主要' : '設為主要'}
                          </button>
                          <button
                            type="button"
                            disabled={isPrimary}
                            onClick={() => onRevoke?.(ur)}
                            title={isPrimary ? '主要職務不可撤銷（請先指派其他主要）' : '撤銷此職務（軟刪除）'}
                            className={cn(
                              'inline-flex h-6 items-center rounded-md border px-2 text-[10px] font-medium transition-colors',
                              isPrimary
                                ? 'cursor-not-allowed border-[#2A2A30]/60 bg-[#131316] text-[#5A5A60]'
                                : 'border-[#5A2A2A] bg-[#1F1212] text-[#C84A4A] hover:border-[#7A3A3A] hover:bg-[#2A1818] hover:text-[#E26060]',
                            )}
                          >
                            撤銷
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
              {/* staged 新增（尚未存檔）以反向高亮顯示 */}
              {stagedAdded.map((r) => (
                <tr key={`staged-${r.id}`} className="border-t border-[#E8A020]/20 bg-[#E8A020]/5">
                  <td className="py-1.5 pr-3 font-mono text-[#E8A020]">{r.code}</td>
                  <td className="py-1.5 pr-3 text-[#E8A020]">{r.name}</td>
                  <td className="py-1.5 pr-3 text-[#5A5A60]">—</td>
                  <td className="py-1.5 pr-3 text-[#5A5A60]">（待存檔）</td>
                  {editing ? (
                    <td className="py-1.5 text-[10px] text-[#E8A020]">staged 新增</td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function WarehousesInlineSection({
  editing,
  items,
  stagedRemovedIds,
  stagedAdded,
  onOpenPicker,
  onRevoke,
}: {
  editing: boolean;
  items: UserWarehouseDto[];
  stagedRemovedIds: Set<string>;
  stagedAdded: WarehouseDto[];
  onOpenPicker?: () => void;
  onRevoke?: (uw: UserWarehouseDto) => void;
}) {
  const visibleItems = items.filter((uw) => !stagedRemovedIds.has(uw.id));
  const totalActive = visibleItems.length + stagedAdded.length;

  return (
    <div className="rounded-md border border-[#2A2A30] bg-[#0A0A0C]/40">
      <div className="flex items-center justify-between border-b border-[#2A2A30] px-3 py-2">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#E8E8EB]">
            隸屬倉庫
          </span>
          <span className="ml-2 rounded bg-[#2A2A30] px-1.5 py-0.5 text-[10px] text-[#B8B8C0]">
            {totalActive} 筆
          </span>
        </div>
        {editing && onOpenPicker ? (
          <button
            type="button"
            onClick={onOpenPicker}
            data-formchain="2"
            className="inline-flex h-7 items-center gap-1 rounded-md border border-[#E8A020]/40 bg-[#E8A020]/12 px-2.5 text-[11px] font-medium text-[#E8A020] hover:bg-[#E8A020]/20"
          >
            設定據點
          </button>
        ) : null}
      </div>
      <div className="px-3 py-2.5">
        {totalActive === 0 ? (
          <div className="text-xs text-[#5A5A60]">尚未指派倉庫據點</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-[#5A5A60]">
                <th className="py-1.5 pr-3">倉庫代碼</th>
                <th className="py-1.5 pr-3">倉庫名稱</th>
                <th className="py-1.5 pr-3">指派時間</th>
                {editing ? <th className="py-1.5">操作</th> : null}
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((uw) => (
                <tr key={uw.id} className="border-t border-[#2A2A30]/60">
                  <td className="py-1.5 pr-3 font-mono text-[#888892]">{uw.warehouseCode ?? '—'}</td>
                  <td className="py-1.5 pr-3">{uw.warehouseName ?? '—'}</td>
                  <td className="py-1.5 pr-3 text-[#888892]">
                    {uw.assignedAt ? formatDateTimeZh(uw.assignedAt) : '—'}
                  </td>
                  {editing ? (
                    <td className="py-1.5">
                      <button
                        type="button"
                        onClick={() => onRevoke?.(uw)}
                        title="撤銷此倉庫據點（軟刪除）"
                        className="inline-flex h-6 items-center rounded-md border border-[#5A2A2A] bg-[#1F1212] px-2 text-[10px] font-medium text-[#C84A4A] hover:border-[#7A3A3A] hover:bg-[#2A1818] hover:text-[#E26060]"
                      >
                        撤銷
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
              {stagedAdded.map((w) => (
                <tr key={`staged-${w.id}`} className="border-t border-[#E8A020]/20 bg-[#E8A020]/5">
                  <td className="py-1.5 pr-3 font-mono text-[#E8A020]">{w.code}</td>
                  <td className="py-1.5 pr-3 text-[#E8A020]">{w.name}</td>
                  <td className="py-1.5 pr-3 text-[#5A5A60]">（待存檔）</td>
                  {editing ? (
                    <td className="py-1.5 text-[10px] text-[#E8A020]">staged 新增</td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function FieldShell({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#B8B8C0]">
        {label + (required ? ' *' : '')}
      </span>
      {children}
    </div>
  );
}
