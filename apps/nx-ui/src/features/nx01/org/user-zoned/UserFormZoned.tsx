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
import { ImageIcon, Trash2, Upload } from 'lucide-react';

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
  // 2026-06-23 執行長拍板：一般欄位 ~250px、信箱類較長標 wide ~500px
  const WIDE_FIELD_KEYS = useMemo(
    () =>
      new Set<string>([
        'email',
        'graduateSchool',
      ]),
    [],
  );

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

  // 渲染序列：zone-header → (sub-section header)? → field …
  // basic zone 末尾插入 UserAddressSection
  // orgPosition zone 末尾插入 WarehousesInlineSection
  type FieldItem = (typeof allFields)[number];
  type RenderItem =
    | { kind: 'zone-header'; label: string; key: string }
    | { kind: 'address-section'; key: string }
    | { kind: 'warehouse-section'; key: string }
    | { kind: 'header'; label: string; key: string }
    | { kind: 'field'; field: FieldItem };
  const renderItems = useMemo<RenderItem[]>(() => {
    const items: RenderItem[] = [];
    let prevZone: UserZone | null = null;
    for (const f of allFields) {
      if (f.zone !== prevZone) {
        // 上一個 zone 末尾追加 inline section
        if (prevZone === 'basic') items.push({ kind: 'address-section', key: 'address-section' });
        if (prevZone === 'orgPosition') items.push({ kind: 'warehouse-section', key: 'warehouse-section' });
        // 新 zone 開頭 header
        const zoneInfo = USER_ZONES.find((z) => z.zone === f.zone);
        if (zoneInfo) {
          items.push({ kind: 'zone-header', label: zoneInfo.label, key: `zone-${f.zone}` });
        }
        prevZone = f.zone;
      }
      const sectionLabel = USER_FIELD_SECTIONS[f.key];
      if (sectionLabel) items.push({ kind: 'header', label: sectionLabel, key: `sec-${f.key}` });
      items.push({ kind: 'field', field: f });
    }
    // 最後一個 zone 末尾
    if (prevZone === 'basic') items.push({ kind: 'address-section', key: 'address-section' });
    if (prevZone === 'orgPosition') items.push({ kind: 'warehouse-section', key: 'warehouse-section' });
    return items;
  }, [allFields]);

  // 頂部區欄位的渲染（簡化版、只處理一般文字欄位）
  const renderTopField = (key: string) => {
    const f = USER_FIELDS.find((x) => x.key === key);
    if (!f) return null;
    const isWritable = FIELD_WRITABLE.has(f.key);
    const zoneEditable = editableZones ? editableZones.has(f.zone) : true;
    const fieldEditable = editing && isWritable && zoneEditable;
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
    const raw = draft[f.key];
    return (
      <FormField
        key={f.key}
        label={f.label}
        value={String(raw ?? '—') || '—'}
        mono={f.key === 'userAccount'}
      />
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 頂部區：左側 2 吋大頭照、右側 3 排基本欄位（執行長 2026-06-23 拍板）*/}
      <div className="flex items-stretch gap-4">
        {!creating && selectedUserId ? (
          <UserPhotoInline userId={selectedUserId} initialHasPhoto={selectedHasPhoto} />
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {/* 第 1 排：員工編號 / 舊員工編號 */}
          <div className="grid grid-cols-2 gap-3">
            {renderTopField('userAccount')}
            {renderTopField('legacyCode')}
          </div>
          {/* 第 2 排：中文姓名 / 英文姓名 */}
          <div className="grid grid-cols-2 gap-3">
            {renderTopField('userName')}
            {renderTopField('userNameEn')}
          </div>
          {/* 第 3 排：性別 / 生日 / 身分證 */}
          <div className="grid grid-cols-3 gap-3">
            {renderTopField('gender')}
            {renderTopField('birthday')}
            {renderTopField('nationalId')}
          </div>
        </div>
      </div>

      {/* fields：執行長 2026-06-23 拍板 — 一般欄位 ~250px、wide 欄位 ~500px、用 auto-fill 動態分欄 */}
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
        {renderItems.map((item) => {
          // 2026-06-23 zone-level section header（合併單頁時用、原本 tabs 拿掉）
          if (item.kind === 'zone-header') {
            return (
              <div
                key={item.key}
                className="col-span-full mt-3 flex items-center gap-2.5 border-b border-[#E8A020]/40 pb-2 first:mt-0"
              >
                <span className="size-2 rounded-full bg-[#E8A020] shadow-[0_0_10px_#E8A020]" />
                <h2 className="text-base font-bold tracking-wide text-foreground">{item.label}</h2>
              </div>
            );
          }
          // 2026-06-23：basic zone 末尾插入地址 section
          if (item.kind === 'address-section') {
            return (
              <div key={item.key} className="col-span-full">
                <UserAddressSection editing={editing} draft={draft} setDraft={setDraft} />
              </div>
            );
          }
          // 2026-06-23：orgPosition zone 末尾插入隸屬倉庫 section
          if (item.kind === 'warehouse-section') {
            return (
              <div key={item.key} className="col-span-full">
                <WarehousesInlineSection
                  editing={editing}
                  items={selectedUserWarehouses ?? []}
                  stagedRemovedIds={stagedRemovedWarehouseIds ?? new Set()}
                  stagedAdded={stagedAddedWarehouses ?? []}
                  onOpenPicker={onOpenWarehousePicker}
                  onRevoke={onRevokeWarehouse}
                />
              </div>
            );
          }
          // 2026-06-18 對齊 demo：sub-section header 分組（編號 / 姓名 / 個資 / 聯絡 / 緊急聯絡 等）
          if (item.kind === 'header') {
            return (
              <div key={item.key} className="col-span-full mt-1 first:mt-0 border-b border-border/30 pb-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
                  {item.label}
                </span>
              </div>
            );
          }
          const f = item.field;
          const isWide = WIDE_FIELD_KEYS.has(f.key);
          const wideClass = isWide ? '[grid-column:span_2]' : '';
          // 統一 wrap 每個 field 到 grid cell（wide 自動跨 2 欄、~500px）
          const wrap = (node: React.ReactNode) => (
            <div key={f.key} className={wideClass || undefined}>
              {node}
            </div>
          );
          // 02 對齊第二批前端收尾軌 FE-CP3：地址 9 keys 統一由 UserAddressSection 渲染
          if (ADDRESS_KEYS_HANDLED_BY_SECTION.has(f.key)) return null;
          // 衛星表
          if (f.isSatellite) {
            // 05 批 T3 2026-06-07：teams 衛星 inline 編輯（即時 PATCH 範式、主組決定員工部門）
            if (f.key === 'teams') {
              return (
                <div key={f.key} className="col-span-full">
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
                <div key={f.key} className="col-span-full">
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
            // 未識別的衛星表：placeholder
            return (
              <div key={f.key} className="col-span-full">
                <SatelliteSection
                  title={f.label}
                  description={`衛星表 ${f.satelliteName ?? ''}；${f.notes ?? ''}`}
                  status="backend-missing"
                  hint="closure 後續軌"
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
            // 無主組 → fallback editable
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
                  <span className="text-[10px] text-muted-foreground">無主組 fallback、行政員工手動設</span>
                </FieldShell>,
              );
            }
            return wrap(<FormField label={f.label} value={labelText || '—'} />);
          }

          // 02 第四批 軌 1 2026-06-07：primarySiteId 走「ref 下拉」、不走純文字 input
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
            return wrap(
              <FormField label={f.label} value={matched?.label ?? (value || '—')} />,
            );
          }

          // isActive toggle（account 區）
          if (f.key === 'isActive' && fieldEditable) {
            const on = Boolean(draft[f.key]);
            return wrap(
              <FieldShell label={f.label}>
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
              </FieldShell>,
            );
          }

          // 一般文字輸入
          if (fieldEditable) {
            return wrap(
              <FormInput
                label={f.label + (f.required ? ' *' : '')}
                value={String(draft[f.key] ?? '')}
                onChange={(v) => setDraft({ ...draft, [f.key]: v })}
              />,
            );
          }

          // 非本軌支援欄位 → placeholder（mustChangePassword / failedLoginCount 等 service 自動寫）
          if (!isWritable) {
            const placeholderHint =
              f.zone === 'account' ? '安全設定 service 自動寫、後台檢視' :
              f.zone === 'orgPosition' && f.key === 'isTenantOwner' ? '系統內建旗標、開戶時拍板' :
              '本軌不可編';
            return wrap(
              <FormField
                label={f.label}
                value={`${placeholderHint}：${f.notes ?? '—'}`}
                dim
              />,
            );
          }

          // 瀏覽 / locked
          const raw = draft[f.key];
          return wrap(
            <FormField
              label={f.label}
              value={String(raw ?? '—') || '—'}
              mono={f.key === 'userAccount'}
              tone={
                f.key === 'isActive'
                  ? (raw ? 'green' : 'red')
                  : undefined
              }
            />,
          );
        })}
      </div>

      {/* 2026-06-23 註：原 basic 末尾 UserAddressSection / 大頭貼 link / orgPosition 末尾
          WarehousesInlineSection 三段、合併單頁後改成在 renderItems 內 by-zone-end 插入。
          大頭貼改為頂部 inline 上傳元件、不再連結子頁。 */}
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
    <div className="flex w-[110px] flex-none flex-col gap-2">
      {/* 2 吋照片比例 35×45mm ≈ 90×115 (7:9)、執行長 2026-06-23 拍板 */}
      <div className="h-[140px] w-[110px] overflow-hidden rounded-md border border-border/60 bg-muted/30">
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
