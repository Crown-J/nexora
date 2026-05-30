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

import { BASIC_WRITABLE, PERMISSION_WRITABLE, type UserDraft } from './helpers';

export type UserFormZonedProps = {
  mode: 'browse' | 'edit';
  creating: boolean;
  draft: UserDraft;
  setDraft: (next: UserDraft) => void;
  activeZone: UserZone;
  setActiveZone: (z: UserZone) => void;
  /** v1.1 §1 可編 zones。undefined = 主檔中心、全 zone */
  editableZones?: Set<UserZone>;
};

export function UserFormZoned({
  mode,
  creating,
  draft,
  setDraft,
  activeZone,
  setActiveZone,
  editableZones,
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
          // 衛星表（v1.1 §3.3）
          if (f.isSatellite) {
            const endpointMap: Record<string, string> = {
              roles: '/nx01/user-roles?userId=…',
              teams: '/nx01/user-team?userId=…',
            };
            const endpoint = endpointMap[f.key];
            const isHr = f.zone === 'hr';
            return (
              <div key={f.key} className="sm:col-span-2">
                <SatelliteSection
                  title={f.label}
                  description={`衛星表 ${f.satelliteName ?? ''}；${f.notes ?? ''}`}
                  status={isHr ? 'backend-missing' : 'ready'}
                  hint={isHr ? 'PRO 啟用 / closure 後續軌' : endpoint ? `endpoint：${endpoint}` : undefined}
                  summary={
                    isHr ? undefined : (
                      <div className="text-xs text-[#5A5A60]">
                        後端 endpoint 已備（既有 RBAC 框架），UI fetch + CRUD 走既有 UserMasterPage、列入 closure 範式統一決策。
                      </div>
                    )
                  }
                  expandedContent={
                    isHr ? undefined : (
                      <div className="text-xs text-[#5A5A60]">
                        既有 /dashboard/base/users 含完整 RBAC UI；本軌 SatelliteSection 僅範式骨架。
                      </div>
                    )
                  }
                />
              </div>
            );
          }

          // 本軌可編 = basic 4 欄 + permission.isActive；其餘 DTO 不支援、顯示 placeholder
          const isWritable = BASIC_WRITABLE.has(f.key) || PERMISSION_WRITABLE.has(f.key);
          const zoneEditable = editableZones ? editableZones.has(f.zone) : true;
          const lockedNow = editing && !creating && f.key === 'userAccount';
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
