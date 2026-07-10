// apps/nx-ui/src/features/nx01/org/user-zoned/UserFormZoned.tsx
// 2026-06-23 執行長拍板大改：
//   - 所有 zones 合併單頁長表（取消 tabs）
//   - 大頭貼搬最上面、inline 上傳按鈕
//   - hr (PRO) 分頁移除（規格從 USER_ZONES / USER_FIELDS 拿掉）
// inline 衛星:
//   - orgPosition section：roles / teams（即時 PATCH）
//   - orgPosition section 末尾：WarehousesInlineSection（隸屬倉庫）
//   - basic section 末尾：UserAddressSection（戶籍 + 通訊）
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
import { type UserTeamDto } from '@data/endpoints/nx01/api/user-team';
import { apiFetch } from '@data/api/client';
import {
  deleteUserPhoto,
  uploadUserPhoto,
  userPhotoRawPath,
} from '@data/endpoints/shared/user-photo/user-photo-api';
import { updateUser } from '@data/endpoints/nx01/api/user';
import { ImageIcon, KeyRound, Lock, Trash2, Upload } from 'lucide-react';

/** 2026-06-23 admin 重設密碼後的預設密碼（員工首次登入要改） */
const RESET_PASSWORD_DEFAULT = 'CHANGEME';

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
  // 2026-06-23 audit 資料：搬到帳號狀況區下方（執行長拍板）
  auditData?: {
    createdAt: string;
    createdByUsername?: string | null;
    createdByName?: string | null;
    updatedAt: string;
    updatedByUsername?: string | null;
    updatedByName?: string | null;
  };
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
  auditData,
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

  // 職務↔權限拆分軌 2026-06-28：權限等級下拉選項
  const [permissionLevelOptions, setPermissionLevelOptions] = useState<SelectOption[]>([]);
  useEffect(() => {
    void fetchRefOptions('nx01/permission-levels')
      .then(setPermissionLevelOptions)
      .catch(() => setPermissionLevelOptions([]));
  }, []);

  // 2026-06-23 國籍下拉選項（basic zone countryId 獨立 dropdown 用、不再合併進 UserAddressSection）
  const [countriesForSelect, setCountriesForSelect] = useState<CountryRow[]>([]);
  useEffect(() => {
    void fetchCountries().then(setCountriesForSelect).catch(() => setCountriesForSelect([]));
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

  // 2026-06-23 修：地址 8 欄（4 戶籍 + 4 通訊）由 UserAddressSection 統一渲染。
  // countryId 拿掉、改成 main grid 獨立 dropdown（執行長拍板）。
  const ADDRESS_FIELD_KEYS = useMemo(
    () =>
      new Set([
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
  // 2026-06-23 執行長拍板 F 方案：統一 5 欄 220px、不再有 wide 欄位
  const WIDE_FIELD_KEYS = useMemo(() => new Set<string>(), []);

  // 2026-06-23 執行長拍板：頂部區「大頭照 + 右側 3 排」放這 7 個欄位、main grid 不再渲染
  const TOP_FIELD_KEYS = useMemo(
    () =>
      new Set<string>([
        'userAccount',
        'legacyCode',
        'userName',
        'userNameEn',
        'gender',
        'birthday',
        'nationalId',
      ]),
    [],
  );

  // 2026-06-23 執行長拍板合併單頁：不再 filter by activeZone、全 fields 一次渲染。
  // editableZones 仍用於「個別欄位可編判定」。
  // 額外排除 TOP_FIELD_KEYS（已在頂部區渲染）。
  const allFields = useMemo(
    () =>
      USER_FIELDS.filter(
        (f) => !ADDRESS_FIELD_KEYS.has(f.key) && !TOP_FIELD_KEYS.has(f.key),
      ),
    [ADDRESS_FIELD_KEYS, TOP_FIELD_KEYS],
  );

  // 2026-06-23 三區塊 layout：renderField 通用 helper、處理所有 special case
  const renderField = (key: string): React.ReactNode => {
    const f = USER_FIELDS.find((x) => x.key === key);
    if (!f) return null;
    if (ADDRESS_FIELD_KEYS.has(key)) return null;
    if (f.isSatellite) return null; // 衛星表呼叫者另外渲染

    const isWide = WIDE_FIELD_KEYS.has(key);
    // 一般欄 250px、wide 跨 2 欄 ≈ 500px+gap（執行長 2026-06-23 拍板回調）
    const wideClass = isWide ? '[grid-column:span_2]' : '';
    const wrap = (node: React.ReactNode) => (
      <div key={f.key} className={wideClass || undefined}>
        {node}
      </div>
    );

    const isWritable = FIELD_WRITABLE.has(f.key);
    const zoneEditable = editableZones ? editableZones.has(f.zone) : true;
    const fieldEditable = editing && isWritable && zoneEditable;

    // isActive / twoFaEnabled 由帳號狀況區的 Switch 處理、不在這裡渲染
    if (f.key === 'isActive' || f.key === 'twoFaEnabled') return null;
    // lastLoginAt 也在帳號狀況區渲染
    if (f.key === 'lastLoginAt') return null;
    // 其他 account zone 不再渲染的（mustChangePassword / failedLoginCount / lockedUntil）
    if (f.key === 'mustChangePassword' || f.key === 'failedLoginCount' || f.key === 'lockedUntil') return null;

    // departmentId 特殊：有主組 readonly + 徽章；無主組 fallback editable
    if (f.key === 'departmentId') {
      const draftValue = String(draft[f.key] ?? '');
      const effectiveValue = primaryTeam?.departmentId ?? draftValue;
      const matched = departmentOptions.find((o) => String(o.value) === effectiveValue);
      const labelText = matched?.label ?? (effectiveValue || '—');
      if (primaryTeam) {
        return wrap(
          <FieldShell label={f.label}>
            <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-2.5 py-1.5">
              <span className="text-sm text-foreground">{primaryTeam.departmentName ?? labelText}</span>
              <span className="ml-auto rounded border border-[#E8A020]/40 bg-[#E8A020]/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-[#E8A020]">
                自動帶（主組）
              </span>
            </div>
          </FieldShell>,
        );
      }
      if (fieldEditable) {
        return wrap(
          <FieldShell label={f.label}>
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
          </FieldShell>,
        );
      }
      return wrap(<FormField label={f.label} value={labelText || '—'} />);
    }

    // gender 特殊：dropdown 顯示「男/女/其他」、底層仍 M/F/O
    if (f.key === 'gender') {
      const value = String(draft[f.key] ?? '');
      const display =
        value === 'M' ? '男' : value === 'F' ? '女' : value === 'O' ? '其他' : '—';
      if (fieldEditable) {
        return wrap(
          <FieldShell label={f.label}>
            <select
              className="h-9 w-full rounded-md border border-[#E8A020]/30 bg-[var(--nx-surface-input)] px-2.5 text-sm text-foreground outline-none focus:border-[#E8A020]/60 focus:ring-1 focus:ring-[#E8A020]/40"
              value={value}
              onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
            >
              <option value="">（未指定）</option>
              <option value="M">男</option>
              <option value="F">女</option>
              <option value="O">其他</option>
            </select>
          </FieldShell>,
        );
      }
      return wrap(<FormField label={f.label} value={display} />);
    }

    // countryId 特殊：ref dropdown（空白=台灣預設、其他選單列國家清單）
    if (f.key === 'countryId') {
      const value = String(draft[f.key] ?? '');
      if (fieldEditable) {
        return wrap(
          <FieldShell label={f.label}>
            <select
              className="h-9 w-full rounded-md border border-[#E8A020]/30 bg-[var(--nx-surface-input)] px-2.5 text-sm text-foreground outline-none focus:border-[#E8A020]/60 focus:ring-1 focus:ring-[#E8A020]/40"
              value={value}
              onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
            >
              <option value="">台灣（預設）</option>
              {countriesForSelect
                .filter((c) => c.code !== 'TWN')
                .map((c) => (
                  <option key={c.id} value={c.id} className="bg-popover">
                    {c.name} ({c.code})
                  </option>
                ))}
            </select>
          </FieldShell>,
        );
      }
      const matched = countriesForSelect.find((c) => c.id === value);
      const display = matched ? `${matched.name}（${matched.code}）` : value ? value : '台灣';
      return wrap(<FormField label={f.label} value={display} />);
    }

    // primarySiteId 特殊：ref dropdown
    if (f.key === 'primarySiteId') {
      const value = String(draft[f.key] ?? '');
      if (fieldEditable) {
        return wrap(
          <FieldShell label={f.label}>
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
          </FieldShell>,
        );
      }
      const matched = siteOptions.find((o) => String(o.value) === value);
      return wrap(<FormField label={f.label} value={matched?.label ?? (value || '—')} />);
    }

    // 職務↔權限拆分軌：權限等級 ref dropdown
    if (f.key === 'permissionLevelId') {
      const value = String(draft[f.key] ?? '');
      if (fieldEditable) {
        return wrap(
          <FieldShell label={f.label}>
            <select
              className="h-9 w-full rounded-md border border-border bg-[var(--nx-surface-input)] px-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
              value={value}
              onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
            >
              <option value="">（未指定）</option>
              {permissionLevelOptions.map((opt) => (
                <option key={String(opt.value)} value={String(opt.value)} className="bg-popover">
                  {opt.label}
                </option>
              ))}
            </select>
          </FieldShell>,
        );
      }
      const matched = permissionLevelOptions.find((o) => String(o.value) === value);
      return wrap(<FormField label={f.label} value={matched?.label ?? (value || '—')} />);
    }

    // 一般可編輸入
    if (fieldEditable) {
      return wrap(
        <FormInput
          label={f.label + (f.required ? ' *' : '')}
          value={String(draft[f.key] ?? '')}
          onChange={(v) => setDraft({ ...draft, [f.key]: v })}
        />,
      );
    }

    // 非本軌支援 → placeholder
    if (!isWritable) {
      const placeholderHint =
        f.zone === 'account' ? '安全設定 service 自動寫、後台檢視' :
        f.zone === 'orgPosition' && f.key === 'isTenantOwner' ? '系統內建旗標、開戶時拍板' :
        '本軌不可編';
      return wrap(<FormField label={f.label} value={`${placeholderHint}：${f.notes ?? '—'}`} dim />);
    }

    // 瀏覽（userAccount/userName 主識別 emphasis、詳細頁排版 2026-07-11 執行長拍板）
    const raw = draft[f.key];
    return wrap(
      <FormField
        label={f.label}
        value={String(raw ?? '—') || '—'}
        mono={f.key === 'userAccount'}
        emphasis={f.key === 'userAccount' || f.key === 'userName'}
      />,
    );
  };

  // 2026-06-23 帳號狀態 derived（鎖定中 / 啟用中 / 關閉中）
  const accountStatus = useMemo<{
    label: '鎖定中' | '啟用中' | '關閉中';
    tone: 'red' | 'green' | 'muted';
  }>(() => {
    const lockedRaw = draft.lockedUntil;
    const lockedAt = lockedRaw ? new Date(String(lockedRaw)) : null;
    if (lockedAt && !Number.isNaN(lockedAt.getTime()) && lockedAt.getTime() > Date.now()) {
      return { label: '鎖定中', tone: 'red' };
    }
    if (draft.isActive) return { label: '啟用中', tone: 'green' };
    return { label: '關閉中', tone: 'muted' };
  }, [draft.isActive, draft.lockedUntil]);

  // 2026-06-23 admin 重設密碼
  const [resetting, setResetting] = useState(false);
  const handleResetPassword = useCallback(async () => {
    if (!selectedUserId) return;
    if (!window.confirm(`確認重設此員工密碼為「${RESET_PASSWORD_DEFAULT}」？\n員工下次登入會被強制改密。`)) return;
    setResetting(true);
    try {
      await updateUser(selectedUserId, {
        password: RESET_PASSWORD_DEFAULT,
        mustChangePassword: true,
      });
      window.alert(`✅ 已重設密碼為「${RESET_PASSWORD_DEFAULT}」`);
    } catch (e) {
      window.alert(`重設密碼失敗：${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setResetting(false);
    }
  }, [selectedUserId]);

  return (
    <div className="grid gap-4 lg:[grid-template-columns:180px_minmax(0,1fr)]">
      {/* ─── 左欄：大頭照 + 帳號狀況（執行長 2026-06-23 拍板搬回左欄）─── */}
      <div className="flex flex-col gap-4">
        {!creating && selectedUserId ? (
          <UserPhotoInline userId={selectedUserId} initialHasPhoto={selectedHasPhoto} />
        ) : null}

        <div className="rounded-lg border border-border/60 bg-card p-3">
          <SectionTitle title="帳號狀況" />
          <div className="flex flex-col gap-3">
            {/* 帳號狀態 chip */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                帳號狀態
              </span>
              <StatusChip label={accountStatus.label} tone={accountStatus.tone} />
            </div>
            <SwitchRow
              label="啟用"
              value={Boolean(draft.isActive)}
              disabled={!editing || !FIELD_WRITABLE.has('isActive')}
              onChange={(v) => setDraft({ ...draft, isActive: v })}
            />
            <SwitchRow
              label="兩階段驗證"
              value={Boolean(draft.twoFaEnabled)}
              disabled={!editing || !FIELD_WRITABLE.has('twoFaEnabled')}
              onChange={(v) => setDraft({ ...draft, twoFaEnabled: v })}
            />
            {/* 最近登入時間 200px（執行長 2026-06-23 拍板）*/}
            <div className="max-w-[200px]">
              <FormField
                label="最近登入時間"
                value={draft.lastLoginAt ? formatDateTimeZh(String(draft.lastLoginAt)) : '—'}
                dim
                mono
              />
            </div>
            {!creating && selectedUserId ? (
              <button
                type="button"
                disabled={resetting}
                onClick={handleResetPassword}
                className="mt-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-[#E26060]/40 bg-[#E26060]/10 px-3 text-xs font-semibold text-[#E26060] transition-colors hover:bg-[#E26060]/20 disabled:opacity-50"
              >
                <KeyRound className="size-3.5" />
                {resetting ? '重設中…' : '重設密碼'}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* ─── 右欄：全部欄位 + 職務 / 據點兩卡片 ─── */}
      <div className="flex flex-col gap-4">
        {/* 主卡：執行長 2026-06-23 拍板 F 方案 — 統一 5 欄 220px + section header */}
        <div className="rounded-lg border border-border/60 bg-card p-4">
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(5, minmax(220px, 1fr))' }}>
            {/* ─── 個人資訊 ─── */}
            <div className="col-span-full">
              <SectionTitle title="個人資訊" />
            </div>
            {renderField('userAccount')}
            {renderField('legacyCode')}
            {renderField('userName')}
            {renderField('userNameEn')}
            {renderField('gender')}
            {renderField('birthday')}
            {renderField('countryId')}
            {renderField('nationalId')}

            {/* ─── 聯絡 & 緊急聯絡 ─── */}
            <div className="col-span-full">
              <SectionTitle title="聯絡 & 緊急聯絡" />
            </div>
            {renderField('email')}
            {renderField('phone')}
            {renderField('emergencyContact')}
            {renderField('emergencyRelation')}
            {renderField('emergencyPhone')}

            {/* ─── 教育 / 在職 ─── */}
            <div className="col-span-full">
              <SectionTitle title="教育 / 在職" />
            </div>
            {renderField('highestEducation')}
            {renderField('graduateSchool')}
            {renderField('militaryService')}
            {renderField('healthCheckDate')}
            {renderField('healthCheckResult')}
            {renderField('hireDate')}
            {renderField('leftAt')}

            {/* ─── 地址 ─── */}
            <div className="col-span-full">
              <SectionTitle title="地址" />
            </div>
            <div className="col-span-full">
              <UserAddressSection editing={editing} draft={draft} setDraft={setDraft} />
            </div>
          </div>
        </div>

        {/* 職務 + 據點：兩卡片並排（節省空間）*/}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-border/60 bg-card p-4">
            <SectionTitle title="職務" />
            <RolesInlineSection
              editing={editing}
              items={selectedUserRoles ?? []}
              stagedRemovedIds={stagedRemovedRoleIds ?? new Set()}
              stagedAdded={stagedAddedRoles ?? []}
              stagedPrimaryId={stagedPrimaryRoleId ?? null}
              onOpenPicker={onOpenRolePicker}
              onSetPrimary={onSetRolePrimary}
              onRevoke={onRevokeRole}
              primaryTeam={primaryTeam}
            />
          </div>

          <div className="rounded-lg border border-border/60 bg-card p-4">
            <SectionTitle title="隸屬據點" />
            <WarehousesInlineSection
              editing={editing}
              items={selectedUserWarehouses ?? []}
              stagedRemovedIds={stagedRemovedWarehouseIds ?? new Set()}
              stagedAdded={stagedAddedWarehouses ?? []}
              onOpenPicker={onOpenWarehousePicker}
              onRevoke={onRevokeWarehouse}
            />
          </div>
        </div>

        {/* audit 一行精簡（執行長 2026-06-23 拍板）*/}
        {auditData ? (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 px-1 text-[11px] text-muted-foreground">
            <span>
              建立：
              <span className="ml-1 font-mono text-foreground/85">
                {formatDateTimeZh(auditData.createdAt)}
              </span>
              <span className="ml-1">· {auditPersonLabel(auditData.createdByUsername, auditData.createdByName)}</span>
            </span>
            <span>
              修改：
              <span className="ml-1 font-mono text-foreground/85">
                {formatDateTimeZh(auditData.updatedAt)}
              </span>
              <span className="ml-1">· {auditPersonLabel(auditData.updatedByUsername, auditData.updatedByName)}</span>
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 2026-06-23 大頭貼 inline 上傳元件（執行長拍板搬詳細頁最上面）
// 對齊 UserPhotoManager 範式：base64 上傳、單張、上傳即取代舊檔
// ──────────────────────────────────────────────────────────────
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// 2026-06-23 audit 人員顯示（複用 UserZonedPage 的 auditPerson 邏輯）
function auditPersonLabel(username: unknown, name: unknown): string {
  const n = (name as string) || '';
  const u = (username as string) || '';
  if (n && u) return `${n}（${u}）`;
  return n || u || '—';
}

// 2026-06-23 三區塊 layout 共用元件：section 卡片標題
function SectionTitle({ title }: { title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2 border-b border-[#E8A020]/40 pb-1.5">
      <span className="size-2 rounded-full bg-[#E8A020] shadow-[0_0_10px_#E8A020]" />
      <h3 className="text-sm font-bold tracking-wide text-foreground">{title}</h3>
    </div>
  );
}

// 帳號狀態徽章
function StatusChip({
  label,
  tone,
}: {
  label: string;
  tone: 'red' | 'green' | 'muted';
}) {
  const cls =
    tone === 'green'
      ? 'border-[#22D88F]/45 bg-[#22D88F]/12 text-[#22D88F] shadow-[0_0_10px_#22D88F33]'
      : tone === 'red'
      ? 'border-[#E26060]/45 bg-[#E26060]/12 text-[#E26060] shadow-[0_0_10px_#E2606033]'
      : 'border-border bg-muted/40 text-muted-foreground';
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold', cls)}>
      {tone === 'red' ? <Lock className="size-3" /> : null}
      {label}
    </span>
  );
}

// 開關按鈕（取代 true/false 文字）
function SwitchRow({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!value)}
        className={cn(
          'relative inline-flex h-5 w-9 flex-none items-center rounded-full border transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
          value
            ? 'border-[#22D88F]/45 bg-[#22D88F]/30'
            : 'border-border bg-muted/40',
        )}
        role="switch"
        aria-checked={value}
      >
        <span
          className={cn(
            'inline-block size-3.5 rounded-full transition-transform',
            value ? 'translate-x-[18px] bg-[#22D88F]' : 'translate-x-[2px] bg-muted-foreground',
          )}
        />
      </button>
    </div>
  );
}

function UserPhotoInline({
  userId,
  initialHasPhoto,
}: {
  userId: string;
  initialHasPhoto?: boolean;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reloadPreview = useCallback(async () => {
    try {
      const res = await apiFetch(userPhotoRawPath(userId), { method: 'GET' });
      if (res.ok) {
        const blob = await res.blob();
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
      } else {
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
      }
    } catch {
      // ignore: 沒大頭貼也是正常
    }
  }, [userId]);

  useEffect(() => {
    void reloadPreview();
    return () => {
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [reloadPreview]);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      setBusy(true);
      try {
        const base64 = await fileToBase64(file);
        await uploadUserPhoto(userId, {
          base64Content: base64,
          originalFilename: file.name,
          mimeType: file.type || 'image/jpeg',
        });
        await reloadPreview();
      } catch (e) {
        alert(`上傳失敗：${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setBusy(false);
        if (fileRef.current) fileRef.current.value = '';
      }
    },
    [userId, reloadPreview],
  );

  const handleDelete = useCallback(async () => {
    if (!confirm('確認移除大頭貼？')) return;
    setBusy(true);
    try {
      await deleteUserPhoto(userId);
      await reloadPreview();
    } catch (e) {
      alert(`移除失敗：${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }, [userId, reloadPreview]);

  const hasPhoto = previewUrl !== null;

  return (
    <div className="flex w-full flex-col gap-2">
      {/* 2 吋照片比例 7:9、寬度 fill 左欄、執行長 2026-06-23 拍板「再加大、貼右邊框框」 */}
      <div className="w-full overflow-hidden rounded-md border border-border/60 bg-muted/30" style={{ aspectRatio: '7 / 9' }}>
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="大頭貼" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <ImageIcon className="size-8" />
          </div>
        )}
      </div>
      <div className="flex gap-1">
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          title={hasPhoto ? '重新上傳' : '上傳大頭貼'}
          className="inline-flex h-7 flex-1 items-center justify-center gap-1 rounded-md border border-[#E8A020]/40 bg-[#E8A020]/10 px-2 text-[11px] font-semibold text-[#E8A020] transition-colors hover:bg-[#E8A020]/20 disabled:opacity-50"
        >
          <Upload className="size-3" />
          {hasPhoto ? '重傳' : '上傳'}
        </button>
        {hasPhoto ? (
          <button
            type="button"
            disabled={busy}
            onClick={handleDelete}
            title="移除大頭貼"
            className="grid size-7 flex-none place-items-center rounded-md border border-[#E26060]/40 bg-[#E26060]/10 text-[#E26060] transition-colors hover:bg-[#E26060]/20 disabled:opacity-50"
          >
            <Trash2 className="size-3.5" />
          </button>
        ) : null}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </div>
      {initialHasPhoto && !hasPhoto ? (
        <div className="text-[10px] text-muted-foreground">載入中…</div>
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
    <div className="mt-2 space-y-4 rounded-lg border border-border/60 bg-card p-4">
      {/* 2026-06-23 國別 dropdown 已搬到 main grid 內、這邊只留地址 picker */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          地址（戶籍 + 通訊）
        </h3>
        <span className="text-[10px] text-muted-foreground">國別空白 / TWN = 走縣市鄉鎮字典；其他國家 = 自由填</span>
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
            onCountryChange={(next) => setDraft({ ...draft, countryId: next ?? '' })}
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
            onCountryChange={(next) => setDraft({ ...draft, countryId: next ?? '' })}
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
  onSetPrimary: _onSetPrimary,
  onRevoke,
  primaryTeam,
}: {
  editing: boolean;
  items: UserRoleDto[];
  stagedRemovedIds: Set<string>;
  stagedAdded: RoleDto[];
  stagedPrimaryId: string | null;
  onOpenPicker?: () => void;
  onSetPrimary?: (role: UserRoleDto) => void;
  onRevoke?: (role: UserRoleDto) => void;
  /** 2026-06-23：員工主組（卡片顯示「部門 / 組別」用、執行長拍板卡片設計）*/
  primaryTeam?: UserTeamDto | null;
}) {
  // 計算當前「有效」 primary：有 staged 則用 staged、否則用 existing.isPrimary
  const effectivePrimaryId =
    stagedPrimaryId ?? items.find((r) => r.isPrimary)?.id ?? null;
  const visibleItems = items.filter((r) => !stagedRemovedIds.has(r.id));
  const totalActive = visibleItems.length + stagedAdded.length;

  const deptText = primaryTeam?.departmentName ?? '—';
  const teamText = primaryTeam?.teamName ?? '—';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
          職務（{totalActive}）
        </span>
        {editing && onOpenPicker ? (
          <button
            type="button"
            onClick={onOpenPicker}
            data-formchain="1"
            className="inline-flex h-7 items-center gap-1 rounded-md border border-[#E8A020]/40 bg-[#E8A020]/12 px-2.5 text-[11px] font-medium text-[#E8A020] hover:bg-[#E8A020]/20"
          >
            ＋ 新增職務
          </button>
        ) : null}
      </div>
      {totalActive === 0 ? (
        <div className="text-xs text-muted-foreground">尚未指派職務</div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {visibleItems.map((ur) => {
            const isPrimary = ur.id === effectivePrimaryId;
            return (
              <RolePositionCard
                key={ur.id}
                department={deptText}
                team={teamText}
                roleName={ur.roleName ?? '—'}
                assignedAt={ur.assignedAt}
                isPrimary={isPrimary}
                onRemove={editing && !isPrimary ? () => onRevoke?.(ur) : undefined}
              />
            );
          })}
          {stagedAdded.map((r) => (
            <RolePositionCard
              key={`staged-${r.id}`}
              department={deptText}
              team={teamText}
              roleName={r.name}
              assignedAt={null}
              isPrimary={false}
              staged
            />
          ))}
        </div>
      )}
    </div>
  );
}

// 2026-06-23 職務卡片（執行長拍板：部門 / 組別 / 職務 / 指派日期 + 右上「主要」）
function RolePositionCard({
  department,
  team,
  roleName,
  assignedAt,
  isPrimary,
  onRemove,
  staged,
}: {
  department: string;
  team: string;
  roleName: string;
  assignedAt: string | null;
  isPrimary: boolean;
  onRemove?: () => void;
  staged?: boolean;
}) {
  return (
    <div
      className={cn(
        'relative rounded-md border bg-card p-2.5',
        staged ? 'border-[#E8A020]/30 bg-[#E8A020]/5' : 'border-border/60',
      )}
    >
      {isPrimary ? (
        <span className="absolute right-1.5 top-1.5 rounded border border-[#E8A020]/45 bg-[#E8A020]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#E8A020]">
          主要
        </span>
      ) : null}
      <div className="space-y-0.5 pr-12 text-xs">
        <div>
          <span className="text-muted-foreground">部門：</span>
          {department}
        </div>
        <div>
          <span className="text-muted-foreground">組別：</span>
          {team}
        </div>
        <div>
          <span className="text-muted-foreground">職務：</span>
          <span className="font-medium text-foreground">{roleName}</span>
        </div>
        <div>
          <span className="text-muted-foreground">指派：</span>
          <span className="font-mono text-[10.5px] text-foreground/75">
            {assignedAt ? formatDateTimeZh(assignedAt) : staged ? '（待存檔）' : '—'}
          </span>
        </div>
      </div>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="absolute bottom-1.5 right-1.5 inline-flex h-6 items-center rounded-md border border-[#5A2A2A]/60 bg-[#1F1212] px-1.5 text-[10px] text-[#C84A4A] hover:bg-[#2A1818] hover:text-[#E26060]"
        >
          移除
        </button>
      ) : null}
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
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
          隸屬倉庫（{totalActive}）
        </span>
        {editing && onOpenPicker ? (
          <button
            type="button"
            onClick={onOpenPicker}
            data-formchain="2"
            className="inline-flex h-7 items-center gap-1 rounded-md border border-[#E8A020]/40 bg-[#E8A020]/12 px-2.5 text-[11px] font-medium text-[#E8A020] hover:bg-[#E8A020]/20"
          >
            ＋ 新增據點
          </button>
        ) : null}
      </div>
      {totalActive === 0 ? (
        <div className="text-xs text-muted-foreground">尚未指派倉庫據點</div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {visibleItems.map((uw) => (
            <WarehousePositionCard
              key={uw.id}
              code={uw.warehouseCode ?? '—'}
              name={uw.warehouseName ?? '—'}
              assignedAt={uw.assignedAt}
              isPrimary={Boolean(uw.isPrimary)}
              onRemove={editing && !uw.isPrimary ? () => onRevoke?.(uw) : undefined}
            />
          ))}
          {stagedAdded.map((w) => (
            <WarehousePositionCard
              key={`staged-${w.id}`}
              code={w.code}
              name={w.name}
              assignedAt={null}
              isPrimary={false}
              staged
            />
          ))}
        </div>
      )}
    </div>
  );
}

// 2026-06-23 據點卡片（執行長拍板：倉庫代碼/名稱/指派日期 + 右上「主要」）
function WarehousePositionCard({
  code,
  name,
  assignedAt,
  isPrimary,
  onRemove,
  staged,
}: {
  code: string;
  name: string;
  assignedAt: string | null;
  isPrimary: boolean;
  onRemove?: () => void;
  staged?: boolean;
}) {
  return (
    <div
      className={cn(
        'relative rounded-md border bg-card p-2.5',
        staged ? 'border-[#E8A020]/30 bg-[#E8A020]/5' : 'border-border/60',
      )}
    >
      {isPrimary ? (
        <span className="absolute right-1.5 top-1.5 rounded border border-[#E8A020]/45 bg-[#E8A020]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#E8A020]">
          主要
        </span>
      ) : null}
      <div className="space-y-0.5 pr-12 text-xs">
        <div>
          <span className="text-muted-foreground">代碼：</span>
          <span className="font-mono text-foreground/85">{code}</span>
        </div>
        <div>
          <span className="text-muted-foreground">倉庫：</span>
          <span className="font-medium text-foreground">{name}</span>
        </div>
        <div>
          <span className="text-muted-foreground">指派：</span>
          <span className="font-mono text-[10.5px] text-foreground/75">
            {assignedAt ? formatDateTimeZh(assignedAt) : staged ? '（待存檔）' : '—'}
          </span>
        </div>
      </div>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="absolute bottom-1.5 right-1.5 inline-flex h-6 items-center rounded-md border border-[#5A2A2A]/60 bg-[#1F1212] px-1.5 text-[10px] text-[#C84A4A] hover:bg-[#2A1818] hover:text-[#E26060]"
        >
          移除
        </button>
      ) : null}
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
