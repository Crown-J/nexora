// apps/nx-ui/src/features/nx01/org/user-zoned/UserFormZoned.tsx
// 2026-06-18 對齊 Hana demo CFG.emp 4 tabs：basic / education / orgPosition / account
//   + hr (PRO) 保留
// inline 衛星:
//   - orgPosition zone：roles / teams（即時 PATCH）
//   - orgPosition zone 末尾：WarehousesInlineSection（隸屬倉庫）
'use client';

import { useMemo } from 'react';

import { cn } from '@design/utils/cn';
import {
  USER_FIELDS,
  USER_FIELD_SECTIONS,
  USER_ZONES,
  type UserZone,
} from '@/features/nx01/shell/zones';
import { FormField, FormInput } from '@/features/nx01/shell/ui/FormField';
import { SatelliteSection } from '@/features/nx01/shell/satellite/SatelliteSection';
import { formatDateTimeZh } from '@/features/nx01/shell/entity-master/format';
import { fetchRefOptions, type SelectOption } from '@/features/nx01/shell/entity-master/config';
import { type RoleDto } from '@data/endpoints/nx01/api/role';
import { type UserRoleDto } from '@data/endpoints/nx01/api/user-role';
import { type UserWarehouseDto } from '@data/endpoints/nx01/api/user-warehouse';
import { type WarehouseDto } from '@data/endpoints/nx01/api/warehouse';
// 05 批 T3 2026-06-07：teams 即時範式 inline 渲染
import { type UserTeamDto } from '@data/endpoints/nx01/api/user-team';
import Link from 'next/link';
import { ImageIcon } from 'lucide-react';

import { useEffect, useState } from 'react';

import { FIELD_WRITABLE, type UserDraft } from './helpers';
import { UserAddressMiniPicker } from '@/features/shared/address/UserAddressMiniPicker';
import { fetchCountries, type CountryRow } from '@/features/shared/address/country-helper';

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
  /** 02 第四批 軌 1 2026-06-07：當前選中員工 id（編輯 / 瀏覽既有時）、用於大頭貼 sub-page 連結 */
  selectedUserId?: string | null;
  /** 後端 hasPhoto 旗標、決定大頭貼按鈕文案（管理 vs 新增） */
  selectedHasPhoto?: boolean;
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
  // 05 批 T3 2026-06-07：teams 即時範式（permission zone inline）
  selectedUserTeams?: UserTeamDto[];
  onOpenTeamPicker?: () => void;
  onSetTeamPrimary?: (ut: UserTeamDto) => void;
  onToggleTeamLeader?: (ut: UserTeamDto) => void;
  onRevokeTeam?: (ut: UserTeamDto) => void;
};

export function UserFormZoned({
  mode,
  creating,
  draft,
  setDraft,
  activeZone,
  setActiveZone,
  editableZones,
  selectedUserId,
  selectedHasPhoto,
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
  // 05 批 T3 2026-06-07：teams 即時範式
  selectedUserTeams,
  onOpenTeamPicker,
  onSetTeamPrimary,
  onToggleTeamLeader,
  onRevokeTeam,
}: UserFormZonedProps) {
  const editing = mode === 'edit';

  // 02 第四批 軌 1 2026-06-07：主要據點下拉選項（permission zone primarySiteId 用）
  const [siteOptions, setSiteOptions] = useState<SelectOption[]>([]);
  useEffect(() => {
    void fetchRefOptions('nx01/sites').then(setSiteOptions).catch(() => setSiteOptions([]));
  }, []);

  // 05 批 T3 2026-06-07：部門下拉選項（basic zone departmentId 用、有主組時 readonly）
  const [departmentOptions, setDepartmentOptions] = useState<SelectOption[]>([]);
  useEffect(() => {
    void fetchRefOptions('nx01/departments').then(setDepartmentOptions).catch(() => setDepartmentOptions([]));
  }, []);

  // 05 批 T3 2026-06-07：當前選中主組（決定 departmentId 是否走 readonly fallback）
  const primaryTeam = useMemo(
    () => (selectedUserTeams ?? []).find((ut) => ut.isPrimary) ?? null,
    [selectedUserTeams],
  );

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

  // 2026-06-23 修：地址 9 欄（countryId + 4 戶籍 + 4 通訊）由 UserAddressSection 統一渲染、
  // 不再讓 fields.map loop 用 FormField 顯示原始 cityId/districtId 內碼。
  const ADDRESS_FIELD_KEYS = useMemo(
    () =>
      new Set([
        'countryId',
        'householdCityId',
        'householdDistrictId',
        'householdPostalCode',
        'householdDetail',
        'mailingCityId',
        'mailingDistrictId',
        'mailingPostalCode',
        'mailingDetail',
      ]),
    [],
  );
  const fieldsForZone = useMemo(
    () =>
      USER_FIELDS.filter(
        (f) => f.zone === safeActiveZone && !ADDRESS_FIELD_KEYS.has(f.key),
      ),
    [safeActiveZone, ADDRESS_FIELD_KEYS],
  );

  // 2026-06-18 對齊 demo CFG.emp section 分組：把 virtual section header 插入欄位序列前
  type RenderItem =
    | { kind: 'header'; label: string; key: string }
    | { kind: 'field'; field: (typeof fieldsForZone)[number] };
  const renderItems = useMemo<RenderItem[]>(() => {
    const items: RenderItem[] = [];
    for (const f of fieldsForZone) {
      const sectionLabel = USER_FIELD_SECTIONS[f.key];
      if (sectionLabel) items.push({ kind: 'header', label: sectionLabel, key: `sec-${f.key}` });
      items.push({ kind: 'field', field: f });
    }
    return items;
  }, [fieldsForZone]);

  return (
    <div className="flex flex-col gap-4">
      {/* Zone Tabs */}
      <div className="flex gap-[2px] overflow-x-auto border-b border-border/40 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {visibleZoneList.map((z) => {
          const active = z.zone === safeActiveZone;
          const isPlaceholderZone = z.zone === 'hr';
          return (
            <button
              key={z.zone}
              type="button"
              onClick={() => setActiveZone(z.zone)}
              className={cn(
                '-mb-px whitespace-nowrap border-b-2 border-transparent px-[14px] py-[11px] text-[13px] font-semibold transition-colors',
                active ? 'border-[#E8A020] text-[#E8A020]' : 'text-muted-foreground hover:text-foreground',
                isPlaceholderZone && !active && 'text-muted-foreground/70',
              )}
            >
              {z.label}
            </button>
          );
        })}
      </div>

      {/* fields */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {renderItems.map((item) => {
          // 2026-06-18 對齊 demo：section header 分組（編號 / 姓名 / 個資 / 聯絡 / 緊急聯絡 等）
          if (item.kind === 'header') {
            return (
              <div key={item.key} className="sm:col-span-2 mt-1 first:mt-0 border-b border-border/30 pb-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
                  {item.label}
                </span>
              </div>
            );
          }
          const f = item.field;
          // 02 對齊第二批前端收尾軌 FE-CP3：地址 9 keys 統一由 UserAddressSection 渲染
          if (ADDRESS_KEYS_HANDLED_BY_SECTION.has(f.key)) return null;
          // 衛星表
          if (f.isSatellite) {
            // 05 批 T3 2026-06-07：teams 衛星 inline 編輯（即時 PATCH 範式、主組決定員工部門）
            if (f.key === 'teams') {
              return (
                <div key={f.key} className="sm:col-span-2">
                  <TeamsInlineSection
                    editing={editing}
                    items={selectedUserTeams ?? []}
                    onOpenPicker={onOpenTeamPicker}
                    onSetPrimary={onSetTeamPrimary}
                    onToggleLeader={onToggleTeamLeader}
                    onRevoke={onRevokeTeam}
                  />
                </div>
              );
            }
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

          // 跨 zone 統一可編判斷（DTO 已支援的欄位）；其餘顯示 placeholder（hr 加購 / 其他 service 自動寫）
          const isWritable = FIELD_WRITABLE.has(f.key);
          const zoneEditable = editableZones ? editableZones.has(f.zone) : true;
          // 員工編號制改造（2026-06-02）：員編可改（內碼 id 不變、FK 不斷）
          //   舊規格曾鎖 userAccount（lockedNow = editing && !creating && f.key === 'userAccount'）、
          //   現解鎖、依賴 schema @@unique[tenantId, userAccount] + service 端 ConflictException 防衝突
          const lockedNow = false;
          const fieldEditable = editing && isWritable && zoneEditable && !lockedNow;

          // 05 批 T3 2026-06-07：departmentId 特殊處理
          //   - 有主組（primaryTeam）→ readonly + 顯示「from 主組」徽章
          //   - 無主組 → ref dropdown 編輯（fallback、行政員工手動設）
          if (f.key === 'departmentId') {
            const draftValue = String(draft[f.key] ?? '');
            const effectiveValue = primaryTeam?.departmentId ?? draftValue;
            const matched = departmentOptions.find((o) => String(o.value) === effectiveValue);
            const labelText = matched?.label ?? (effectiveValue || '—');
            if (primaryTeam) {
              // 唯讀（顯示主組部門 + 來源徽章）
              return (
                <FieldShell key={f.key} label={f.label}>
                  <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-2.5 py-1.5">
                    <span className="text-sm text-foreground">{primaryTeam.departmentName ?? labelText}</span>
                    <span className="ml-auto rounded border border-[#E8A020]/40 bg-[#E8A020]/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-[#E8A020]">
                      自動帶（主組）
                    </span>
                  </div>
                </FieldShell>
              );
            }
            // 無主組 → fallback editable
            if (fieldEditable) {
              return (
                <FieldShell key={f.key} label={f.label}>
                  <select
                    className="h-9 w-full rounded-md border border-[#E8A020]/30 bg-[var(--nx-surface-input)] px-2.5 text-sm text-foreground outline-none focus:border-[#E8A020]/60 focus:ring-1 focus:ring-[#E8A020]/40"
                    value={draftValue}
                    onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                  >
                    <option value="">（未指定）</option>
                    {departmentOptions.map((opt) => (
                      <option key={String(opt.value)} value={String(opt.value)} className="bg-popover">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-muted-foreground">無主組 fallback、行政員工手動設</span>
                </FieldShell>
              );
            }
            return <FormField key={f.key} label={f.label} value={labelText || '—'} />;
          }

          // 02 第四批 軌 1 2026-06-07：primarySiteId 走「ref 下拉」、不走純文字 input
          if (f.key === 'primarySiteId') {
            const value = String(draft[f.key] ?? '');
            if (fieldEditable) {
              return (
                <FieldShell key={f.key} label={f.label}>
                  <select
                    className="h-9 w-full rounded-md border border-[#E8A020]/30 bg-[var(--nx-surface-input)] px-2.5 text-sm text-foreground outline-none focus:border-[#E8A020]/60 focus:ring-1 focus:ring-[#E8A020]/40"
                    value={value}
                    onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                  >
                    <option value="">（未指定）</option>
                    {siteOptions.map((opt) => (
                      <option key={String(opt.value)} value={String(opt.value)} className="bg-popover">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </FieldShell>
              );
            }
            const matched = siteOptions.find((o) => String(o.value) === value);
            return (
              <FormField key={f.key} label={f.label} value={matched?.label ?? (value || '—')} />
            );
          }

          // isActive toggle（account 區）
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

          // 非本軌支援欄位 → placeholder（hr / mustChangePassword / failedLoginCount 等 service 自動寫）
          if (!isWritable) {
            const placeholderHint =
              f.zone === 'hr' ? 'PRO 啟用' :
              f.zone === 'account' ? '安全設定 service 自動寫、後台檢視' :
              f.zone === 'orgPosition' && f.key === 'isTenantOwner' ? '系統內建旗標、開戶時拍板' :
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

      {/* 02 第四批 軌 1 2026-06-07：basic zone 大頭貼進入連結（編輯 / 瀏覽既有員工才顯示、新增中不顯示） */}
      {safeActiveZone === 'basic' && !creating && selectedUserId ? (
        <div className="mt-4 flex items-center justify-between rounded-lg border border-border/60 bg-card px-4 py-3">
          <div className="flex items-center gap-3">
            <ImageIcon className="size-4 text-muted-foreground" />
            <div>
              <div className="text-xs font-medium text-foreground">大頭貼</div>
              <div className="text-[10px] text-muted-foreground">
                {selectedHasPhoto ? '已上傳、點右方按鈕管理（取代 / 刪除）' : '尚未上傳、點右方按鈕新增'}
              </div>
            </div>
          </div>
          <Link
            href={`/dashboard/master/users/${selectedUserId}/photo`}
            className="rounded-md border border-[#E8A020]/30 bg-[#E8A020]/10 px-3 py-1.5 text-xs font-medium text-[#E8A020] hover:bg-[#E8A020]/20"
          >
            {selectedHasPhoto ? '管理大頭貼' : '新增大頭貼'}
          </Link>
        </div>
      ) : null}

      {/* 2026-06-18：orgPosition zone 末尾插入「隸屬倉庫」inline 編輯區（warehouse 不在 USER_FIELDS） */}
      {safeActiveZone === 'orgPosition' ? (
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
  const [countries, setCountries] = useState<CountryRow[]>([]);
  useEffect(() => {
    void fetchCountries().then(setCountries);
  }, []);
  return (
    <div className="mt-4 space-y-4 rounded-lg border border-border/60 bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          地址（戶籍 + 通訊）
        </h3>
        <span className="text-[10px] text-muted-foreground">空白國別 = 台灣（走字典）；其他國家 = 國外自由填</span>
      </div>
      <div>
        <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">國別</label>
        {/* 02 真正完工軌 2026-06-07：國別改 select dropdown、不用純 input 填 ID */}
        <select
          className="h-9 w-full rounded-md border border-border/60 bg-[var(--nx-surface-input)] px-3 text-sm text-foreground disabled:opacity-50"
          value={countryId ?? ''}
          onChange={(e) => setDraft({ ...draft, countryId: e.target.value || '' })}
          disabled={!editing}
        >
          <option value="">台灣（預設）</option>
          {countries
            .filter((c) => c.code !== 'TWN')
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
        </select>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-2 text-[11px] font-medium text-foreground">戶籍地址</div>
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
          <div className="mb-2 text-[11px] font-medium text-foreground">通訊地址</div>
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
    <div className="rounded-md border border-border/60 bg-muted/30">
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
            擔任職務
          </span>
          <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] text-foreground/80">
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
          <div className="text-xs text-muted-foreground">尚未指派職務</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
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
                  <tr key={ur.id} className="border-t border-border/40">
                    <td className="py-1.5 pr-3 font-mono text-muted-foreground">{ur.roleCode ?? '—'}</td>
                    <td className="py-1.5 pr-3">{ur.roleName ?? '—'}</td>
                    <td className="py-1.5 pr-3">
                      {isPrimary ? (
                        <span className="rounded border border-[#E8A020]/40 bg-[#E8A020]/10 px-1.5 py-0.5 text-[10px] text-[#E8A020]">
                          主要
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-1.5 pr-3 text-muted-foreground">
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
                                : 'border-border/60 bg-[var(--nx-surface-input)] text-foreground/80 hover:border-[#E8A020]/40 hover:bg-[#E8A020]/10 hover:text-[#E8A020]',
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
                                ? 'cursor-not-allowed border-border/40 bg-popover text-muted-foreground'
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
                  <td className="py-1.5 pr-3 text-muted-foreground">—</td>
                  <td className="py-1.5 pr-3 text-muted-foreground">（待存檔）</td>
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
    <div className="rounded-md border border-border/60 bg-muted/30">
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
            隸屬倉庫
          </span>
          <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] text-foreground/80">
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
          <div className="text-xs text-muted-foreground">尚未指派倉庫據點</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="py-1.5 pr-3">倉庫代碼</th>
                <th className="py-1.5 pr-3">倉庫名稱</th>
                <th className="py-1.5 pr-3">指派時間</th>
                {editing ? <th className="py-1.5">操作</th> : null}
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((uw) => (
                <tr key={uw.id} className="border-t border-border/40">
                  <td className="py-1.5 pr-3 font-mono text-muted-foreground">{uw.warehouseCode ?? '—'}</td>
                  <td className="py-1.5 pr-3">{uw.warehouseName ?? '—'}</td>
                  <td className="py-1.5 pr-3 text-muted-foreground">
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
                  <td className="py-1.5 pr-3 text-muted-foreground">（待存檔）</td>
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
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/80">
        {label + (required ? ' *' : '')}
      </span>
      {children}
    </div>
  );
}

// 05 批 T3 2026-06-07：員工隸屬組 inline 區塊（permission zone、即時 PATCH 範式）
// 與 RolesInlineSection 的差異：本元件操作即時生效（assign/revoke/setPrimary/setLeader 直接 PATCH）、無 staged 暫存。
function TeamsInlineSection({
  editing,
  items,
  onOpenPicker,
  onSetPrimary,
  onToggleLeader,
  onRevoke,
}: {
  editing: boolean;
  items: UserTeamDto[];
  onOpenPicker?: () => void;
  onSetPrimary?: (ut: UserTeamDto) => void;
  onToggleLeader?: (ut: UserTeamDto) => void;
  onRevoke?: (ut: UserTeamDto) => void;
}) {
  const primary = items.find((ut) => ut.isPrimary);
  return (
    <div className="rounded-md border border-border/60 bg-muted/30">
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
            隸屬組
          </span>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-foreground/80">
            {items.length} 筆
          </span>
          {primary?.departmentName ? (
            <span className="ml-1 text-[10px] text-muted-foreground">
              主組決定員工部門：{primary.departmentName}
            </span>
          ) : null}
        </div>
        {editing && onOpenPicker ? (
          <button
            type="button"
            onClick={onOpenPicker}
            data-formchain="3"
            className="inline-flex h-7 items-center gap-1 rounded-md border border-[#E8A020]/40 bg-[#E8A020]/12 px-2.5 text-[11px] font-medium text-[#E8A020] hover:bg-[#E8A020]/20"
          >
            設定組
          </button>
        ) : null}
      </div>
      <div className="px-3 py-2.5">
        {items.length === 0 ? (
          <div className="text-xs text-muted-foreground">
            尚未指派組（員工部門可由「基本資料 → 部門」手動設定 fallback）
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="py-1.5 pr-3">組代碼</th>
                <th className="py-1.5 pr-3">組名</th>
                <th className="py-1.5 pr-3">隸屬部門</th>
                <th className="py-1.5 pr-3">主組</th>
                <th className="py-1.5 pr-3">組長</th>
                <th className="py-1.5 pr-3">指派時間</th>
                {editing ? <th className="py-1.5">操作</th> : null}
              </tr>
            </thead>
            <tbody>
              {items.map((ut) => (
                <tr key={ut.id} className="border-t border-border/40">
                  <td className="py-1.5 pr-3 font-mono text-muted-foreground">{ut.teamCode ?? '—'}</td>
                  <td className="py-1.5 pr-3">{ut.teamName ?? '—'}</td>
                  <td className="py-1.5 pr-3 text-muted-foreground">{ut.departmentName ?? '—'}</td>
                  <td className="py-1.5 pr-3">
                    {ut.isPrimary ? (
                      <span className="rounded border border-[#E8A020]/40 bg-[#E8A020]/10 px-1.5 py-0.5 text-[10px] text-[#E8A020]">
                        主組
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-1.5 pr-3">
                    {ut.isLeader ? (
                      <span className="rounded border border-[#22D88F]/40 bg-[#22D88F]/10 px-1.5 py-0.5 text-[10px] text-[#22D88F]">
                        組長
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-1.5 pr-3 text-muted-foreground">
                    {ut.assignedAt ? formatDateTimeZh(ut.assignedAt) : '—'}
                  </td>
                  {editing ? (
                    <td className="py-1.5">
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          disabled={ut.isPrimary}
                          onClick={() => onSetPrimary?.(ut)}
                          title={ut.isPrimary ? '已是主組' : '設為主組（自動帶員工部門）'}
                          className={cn(
                            'inline-flex h-6 items-center rounded-md border px-2 text-[10px] font-medium transition-colors',
                            ut.isPrimary
                              ? 'cursor-not-allowed border-[#E8A020]/30 bg-[#E8A020]/8 text-[#E8A020]/60'
                              : 'border-border/60 bg-[var(--nx-surface-input)] text-foreground/80 hover:border-[#E8A020]/40 hover:bg-[#E8A020]/10 hover:text-[#E8A020]',
                          )}
                        >
                          {ut.isPrimary ? '主組' : '設為主組'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onToggleLeader?.(ut)}
                          title={ut.isLeader ? '取消組長' : '標記為組長（影響公告對象）'}
                          className={cn(
                            'inline-flex h-6 items-center rounded-md border px-2 text-[10px] font-medium transition-colors',
                            ut.isLeader
                              ? 'border-[#22D88F]/40 bg-[#22D88F]/12 text-[#22D88F] hover:bg-[#22D88F]/20'
                              : 'border-border/60 bg-[var(--nx-surface-input)] text-foreground/80 hover:border-[#22D88F]/40 hover:bg-[#22D88F]/10 hover:text-[#22D88F]',
                          )}
                        >
                          {ut.isLeader ? '組長' : '設組長'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onRevoke?.(ut)}
                          title="撤銷此組（軟刪除、保留紀錄）"
                          className="inline-flex h-6 items-center rounded-md border border-[#5A2A2A] bg-[#1F1212] px-2 text-[10px] font-medium text-[#C84A4A] hover:border-[#7A3A3A] hover:bg-[#2A1818] hover:text-[#E26060]"
                        >
                          撤銷
                        </button>
                      </div>
                    </td>
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
