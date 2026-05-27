// apps/nx-ui/src/features/base/users/UserMasterPage.tsx
/**
 * NEXORA 使用者主檔（鋼鐵星球範式）
 *
 * 抽自 lab/users（commit 41-56 累積成果），作為共用元件供：
 * - /lab/users（沙盒、保留供未來迭代）
 * - /dashboard/base/users（production，需配合 DashboardShell bypass，commit 58）
 *
 * 內容包含：
 * - SIDEBAR_CONFIG / HEADER_CONFIG（資料驅動的 shell 配置）
 * - UserRow type + dtoToUserRow 映射（listUsers DTO → 內部 row）
 * - ErpTabBar（資料瀏覽 / 詳細資料 sub-tab）
 * - buildUserColumns（MasterTable 欄位定義）
 * - UserDetailView（基本資料 + 擔任職務 + 隸屬倉庫）
 * - 完整 ERP 工具列邏輯（A/E/F/D/P/R/Q + S/C edit mode + Alt 快捷鍵）
 *
 * 取代既有 BaseUserMasterView（features/base/users/BaseUserMasterView.tsx，1640 行 modal 範式）。
 */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Briefcase,
  Warehouse,
} from 'lucide-react';

import { listRoles, type RoleDto } from '@/features/base/api/role';
import { listUsers, setUserActive, updateUser, type UserDto } from '@/features/base/api/user';
/**
 * ⚠️ 軌 C C3 known issue 揭露：
 *  revokeUserRole / revokeUserWarehouse 後端目前為 **soft delete**（user_role.service.ts 設 isActive=false + revokedAt）。
 *  Crown 需求 3：關聯表（user_role / user_warehouse）應為 hard delete（避免再次指派同一 role 撞 unique constraint）。
 *  Hank 後端調整完成後，本 frontend 無需改動（API 介面不變、僅 backend service 改為 prisma.delete()）。
 *  追蹤：docs/_team/task-user-master-iterate-track-c-merge-verify.md C3 段。
 */
import {
  assignUserRole,
  listUserRoles,
  revokeUserRole,
  setUserRolePrimary,
  type UserRoleDto,
} from '@/features/base/api/user-role';
import {
  assignUserWarehouse,
  listUserWarehouses,
  revokeUserWarehouse,
  type UserWarehouseDto,
} from '@/features/base/api/user-warehouse';
import { listWarehouses, type WarehouseDto } from '@/features/base/api/warehouse';
import { CreateUserDialog } from '@/features/base/users/CreateUserDialog';
import { ConfirmDialog, type ConfirmState } from '@/features/master-shell/ui/ConfirmDialog';
import { EntityPickerDialog } from '@/features/master-shell/ui/EntityPickerDialog';
import { ErpToolbar, type ErpMode, type ExportFormat } from '@/features/master-shell/ui/ErpToolbar';
import { FormField, FormInput, FormSelect } from '@/features/master-shell/ui/FormField';
import {
  DetailTable,
  EmptyDetail,
  MasterDetailScroll,
  SectionAddButton,
  SectionHeader,
} from '@/features/master-shell/ui/MasterDetail';
import { type HeaderConfig } from '@/features/master-shell/ui/MasterShell';
import { MasterTopBar } from '@/features/master-shell/entity-master/MasterTopBar';
import { MasterTabs } from '@/features/master-shell/entity-master/MasterTabs';
import { formatDateTimeZh } from '@/features/master-shell/entity-master/format';
import { MasterTable, type MasterTableColumn } from '@/features/master-shell/ui/MasterTable';
import { SearchPanel } from '@/features/master-shell/ui/SearchPanel';
import { ToastStack, useToast } from '@/features/master-shell/ui/ToastStack';
import { cn } from '@/lib/utils';

// ──────────────────────────────────────────────────────────────
// 配置
// ──────────────────────────────────────────────────────────────

// 統一範式（2026-05-27）：USER 主檔改用 MasterTopBar（無左 sidebar），SIDEBAR_CONFIG 已移除。

const HEADER_CONFIG: HeaderConfig = {
  category: '帳號與權限',
  title: '使用者主檔',
  countBadge: { icon: Users, text: '5 位使用者' },
  notificationBadge: 3,
  announcementBadge: 2,
};

const DEFAULT_PAGE_SIZE = 20;

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

type UserRow = {
  id: string;
  username: string;
  displayName: string;
  jobTitle: string;
  email: string | null;
  phone: string | null;
  warehouse: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
};

/** 編輯模式 form state。
 * 只含 updateUser API 可改的欄位：displayName / isActive / email / phone（password 暫不在此 form）。
 * jobTitle / warehouse / username 為 derived 或 immutable，不在 form 內。
 */
type EditFormState = {
  displayName: string;
  isActive: boolean;
  email: string;
  phone: string;
};

/** 軌 C C1：編輯模式 staged write 範式（業界 ERP staged batch + S 存檔一次 apply）
 *
 * - PickerConfirm / SetRolePrimary / RevokeRole 等動作改為「加入 staged ops」
 * - 按 S 存檔 → handleSave 內依序 apply ops + updateUser 主檔欄位
 * - 按 C 取消 → 清空 pending ops + editForm
 *
 * 對齊 Crown 揭露：「按 C 取消還是寫入了」重大 bug（軌 B 即時寫入問題修正）
 */
type RoleOp =
  | { kind: 'add'; role: RoleDto }
  | { kind: 'remove'; userRoleId: string }
  | { kind: 'setPrimary'; userRoleId: string };

type WarehouseOp =
  | { kind: 'add'; warehouse: WarehouseDto }
  | { kind: 'remove'; userWarehouseId: string };

/** 將後端 UserDto 轉成內部 UserRow（仿 BaseUserMasterView dtoToRow 範式）
 * 注意：擔任職務 / 隸屬倉庫 由獨立 state 載入（selectedUserRoles / selectedUserWarehouses），
 * 不在 UserRow 內，避免列表每筆都打關聯 API。
 */
function dtoToUserRow(u: UserDto): UserRow {
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    jobTitle: u.jobTitle ?? '—',
    email: u.email,
    phone: u.phone,
    warehouse: u.warehouseSummary ?? null,
    isActive: u.isActive,
    lastLoginAt: u.lastLoginAt,
    createdAt: u.createdAt,
    createdBy: u.createdByName ?? u.createdByUsername ?? '—',
    updatedAt: u.updatedAt,
    updatedBy: u.updatedByName ?? u.updatedByUsername ?? '—',
  };
}

function makeEditForm(user: UserRow): EditFormState {
  return {
    displayName: user.displayName,
    isActive: user.isActive,
    email: user.email ?? '',
    phone: user.phone ?? '',
  };
}

// ──────────────────────────────────────────────────────────────
// 子元件
// ──────────────────────────────────────────────────────────────

/** 使用者主檔的 column 配置（傳給 MasterTable<UserRow>） */
function buildUserColumns(): MasterTableColumn<UserRow>[] {
  return [
    {
      key: 'username',
      label: '帳號',
      minWidthClass: 'min-w-[140px]',
      sortable: true,
      render: (row) => <span className="font-mono text-xs tracking-wide text-[#E8E8EB]">{row.username}</span>,
    },
    {
      key: 'displayName',
      label: '姓名',
      minWidthClass: 'min-w-[200px]',
      sortable: true,
      render: (row) => <span className="font-medium text-[#F0F0F3]">{row.displayName}</span>,
    },
    {
      key: 'jobTitle',
      label: '職務',
      minWidthClass: 'min-w-[120px]',
      render: (row) => (
        <span className="inline-flex items-center rounded-md border border-[#2A2A30] bg-gradient-to-b from-[#1A1A1F] to-[#131316] px-2 py-0.5 text-[11px] text-[#B8B8C0] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]">
          {row.jobTitle}
        </span>
      ),
    },
    {
      key: 'email',
      label: '信箱',
      minWidthClass: 'min-w-[200px]',
      render: (row) => <span className="text-xs text-[#5A5A60]">{row.email ?? '—'}</span>,
    },
    {
      key: 'phone',
      label: '電話',
      minWidthClass: 'min-w-[140px]',
      render: (row) => <span className="text-xs text-[#5A5A60]">{row.phone ?? '—'}</span>,
    },
    {
      key: 'warehouse',
      label: '隸屬倉庫',
      minWidthClass: 'min-w-[140px]',
      render: (row) => <span className="text-xs text-[#5A5A60]">{row.warehouse ?? '—'}</span>,
    },
    {
      key: 'isActive',
      label: '啟用',
      minWidthClass: 'min-w-[80px]',
      render: (row) =>
        row.isActive ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#22D88F]/35 bg-gradient-to-b from-[#22D88F]/14 to-[#22D88F]/6 px-2 py-0.5 text-[10px] font-medium text-[#22D88F] shadow-[inset_0_1px_0_0_rgba(34,216,143,0.18)]">
            <span className="relative flex size-1.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-[#22D88F]/60" />
              <span className="relative size-1.5 rounded-full bg-[#22D88F] shadow-[0_0_8px_#22D88F]" />
            </span>
            啟用
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E26060]/35 bg-gradient-to-b from-[#E26060]/14 to-[#E26060]/6 px-2 py-0.5 text-[10px] font-medium text-[#E26060] shadow-[inset_0_1px_0_0_rgba(226,96,96,0.15)]">
            <span className="relative flex size-1.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-[#E26060]/50" />
              <span className="relative size-1.5 rounded-full bg-[#E26060] shadow-[0_0_8px_#E26060]" />
            </span>
            未啟用
          </span>
        ),
    },
    {
      key: 'lastLoginAt',
      label: '最後登入',
      minWidthClass: 'min-w-[160px]',
      sortable: true,
      render: (row) => (
        <span className="text-xs tabular-nums text-[#888892]">
          {row.lastLoginAt ? formatDateTimeZh(row.lastLoginAt) : <span className="text-[#5A5A60]">—</span>}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: '建立時間',
      minWidthClass: 'min-w-[180px]',
      render: (row) => (
        <span className="text-xs tabular-nums text-[#888892]">{formatDateTimeZh(row.createdAt)}</span>
      ),
    },
  ];
}

/** 軌 B B5：隸屬倉庫 row 編輯模式操作按鈕（只有「移除」，warehouse 無 primary 概念）。 */
function WarehouseRowActions({ onRevoke }: { onRevoke: () => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={onRevoke}
        title="撤銷此倉庫據點（軟刪除）"
        className="inline-flex h-6 items-center gap-1 rounded-md border border-[#5A2A2A] bg-[#1F1212] px-2 text-[10px] font-medium text-[#C84A4A] transition-colors hover:border-[#7A3A3A] hover:bg-[#2A1818] hover:text-[#E26060]"
      >
        撤銷
      </button>
    </div>
  );
}

/** 軌 B B3：擔任職務 row 編輯模式操作按鈕（設為主要 / 撤銷）。
 *  - 已是主要 → 「設為主要」按鈕 disabled（顯示為「主要」）+ 「移除」按鈕 disabled（避免移除唯一主要職務）
 *  - 非主要 → 兩按鈕皆可用
 *  - 鋼鐵風樣式對齊 SectionAddButton（小按鈕、hover 變琥珀 / 鋼鐵紅）
 */
function RoleRowActions({
  isPrimary,
  onSetPrimary,
  onRevoke,
}: {
  isPrimary: boolean;
  onSetPrimary: () => void;
  onRevoke: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={onSetPrimary}
        disabled={isPrimary}
        title={isPrimary ? '已是主要職務' : '設為主要職務'}
        className={cn(
          'inline-flex h-6 items-center gap-1 rounded-md border px-2 text-[10px] font-medium transition-colors',
          isPrimary
            ? 'cursor-not-allowed border-[#E8A020]/30 bg-[#E8A020]/8 text-[#E8A020]/60'
            : 'border-[#2A2A30] bg-[#0A0A0C] text-[#B8B8C0] hover:border-[#E8A020]/40 hover:bg-[#E8A020]/10 hover:text-[#E8A020]',
        )}
      >
        {isPrimary ? '主要' : '設為主要'}
      </button>
      <button
        type="button"
        onClick={onRevoke}
        disabled={isPrimary}
        title={isPrimary ? '主要職務不可撤銷（請先指派其他主要）' : '撤銷此職務（軟刪除）'}
        className={cn(
          'inline-flex h-6 items-center gap-1 rounded-md border px-2 text-[10px] font-medium transition-colors',
          isPrimary
            ? 'cursor-not-allowed border-[#2A2A30]/60 bg-[#131316] text-[#5A5A60]'
            : 'border-[#5A2A2A] bg-[#1F1212] text-[#C84A4A] hover:border-[#7A3A3A] hover:bg-[#2A1818] hover:text-[#E26060]',
        )}
      >
        撤銷
      </button>
    </div>
  );
}

/** 詳細資料：滿版單欄滾動。
 *
 * 設計：
 * - 滿版單欄：所有 section 直接滾動陳列，章節間細分隔線
 * - 無 card 邊框、無左側索引（小規模關聯表時索引多餘；零件主檔等大規模再考慮加回）
 * - 模式語意：
 *   瀏覽模式 = read-only：form 不可改、不顯示「新增職務 / 新增倉庫據點」按鈕
 *   編輯模式 = write：form 變 input、顯示新增按鈕
 * - 擴充：新增關聯表只需多寫一個 <section>；若某主檔關聯表 ≥ 6+ 再評估加回索引列
 */
function UserDetailView({
  user,
  editMode,
  editForm,
  onEditChange,
  userRoles,
  userWarehouses,
  onAddRole,
  onAddWarehouse,
  onSetRolePrimary,
  onRevokeRole,
  onRevokeWarehouse,
  stagedRoleAddCount,
  stagedRoleRemoveCount,
  stagedRolePrimaryChanged,
  stagedWarehouseAddCount,
  stagedWarehouseRemoveCount,
  onRequestSave,
}: {
  user: UserRow;
  editMode: boolean;
  editForm: EditFormState | null;
  onEditChange: (next: EditFormState) => void;
  /** 該使用者已指派的職務（從 listUserRoles 載入）*/
  userRoles: UserRoleDto[];
  /** 該使用者已指派的倉庫（從 listUserWarehouses 載入）*/
  userWarehouses: UserWarehouseDto[];
  onAddRole: () => void;
  onAddWarehouse: () => void;
  /** 設為主要職務（C1 staged）*/
  onSetRolePrimary: (role: UserRoleDto) => void;
  /** 移除職務（C1 staged，toggle 模式：再點 = undo）*/
  onRevokeRole: (role: UserRoleDto) => void;
  /** 移除倉庫據點（C1 staged，toggle 模式：再點 = undo）*/
  onRevokeWarehouse: (uw: UserWarehouseDto) => void;
  /** Staged ops（C1：顯示變更計數，按 S 才會寫入）*/
  stagedRoleAddCount: number;
  stagedRoleRemoveCount: number;
  stagedRolePrimaryChanged: boolean;
  stagedWarehouseAddCount: number;
  stagedWarehouseRemoveCount: number;
  /** 基本資料最後一格 Enter → 存檔確認（ERP muscle memory） */
  onRequestSave: () => void;
}) {
  const formRef = useRef<HTMLDivElement>(null);

  // 系統管理員（含 SYSADMIN 職務）：擁有所有權限、職務/據點區塊唯讀灰掉、不可設定
  const isAdmin = userRoles.some((r) => String(r.roleCode ?? '').trim().toUpperCase() === 'SYSADMIN');

  const update = <K extends keyof EditFormState>(key: K, value: EditFormState[K]) => {
    if (!editForm) return;
    onEditChange({ ...editForm, [key]: value });
  };

  // 進編輯自動 focus 第一格
  useEffect(() => {
    if (!editMode) return;
    formRef.current?.querySelector<HTMLElement>('input, select, textarea')?.focus();
  }, [editMode, user.id]);

  // Enter 跳下一格；最後一格 Enter → 存檔確認（基本資料區；textarea 例外）
  const handleFormKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    const t = e.target as HTMLElement;
    if (t.tagName.toLowerCase() === 'textarea') return;
    e.preventDefault();
    // 設定職務 / 設定據點 按鈕：Enter = 打開設定視窗（不跳格；關閉後再 Enter 才前進）
    if (t.hasAttribute('data-formchain')) {
      (t as HTMLButtonElement).click();
      return;
    }
    const els = Array.from(
      formRef.current?.querySelectorAll<HTMLElement>('input, select, textarea, [data-formchain]') ?? [],
    ).filter((el) => !(el as HTMLInputElement).disabled && el.offsetParent !== null);
    const idx = els.indexOf(t);
    if (idx >= 0 && idx < els.length - 1) els[idx + 1]?.focus();
    else onRequestSave();
  };

  return (
    <MasterDetailScroll scrollKey={user.id}>
      {/* Enter 跳格鏈包整個詳細頁：基本資料欄位 → 新增職務 → 新增倉庫 → 存檔 */}
      <div ref={formRef} onKeyDown={handleFormKey}>
      {/* 基本資料 */}
      <section className="border-b border-[#1A1A1F] px-8 py-6">
        <SectionHeader title="基本資料" subtitle="User Profile" />
        <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* username / jobTitle / warehouse 為 derived 欄位（jobTitle ← user_role、warehouse ← user_warehouse）
             updateUser API 不接受、需於下方「擔任職務 / 隸屬倉庫」區塊調整，編輯模式仍維持 read-only */}
          <FormField label="帳號" value={user.username} mono />
          {editMode && editForm ? (
            <FormInput label="姓名" value={editForm.displayName} onChange={(v) => update('displayName', v)} />
          ) : (
            <FormField label="姓名" value={user.displayName} />
          )}
          <FormField label="職務" value={user.jobTitle} />
          {editMode && editForm ? (
            <FormSelect
              label="啟用狀態"
              value={editForm.isActive ? '啟用' : '未啟用'}
              options={['啟用', '未啟用']}
              onChange={(v) => update('isActive', v === '啟用')}
            />
          ) : (
            <FormField label="啟用狀態" value={user.isActive ? '啟用' : '未啟用'} tone={user.isActive ? 'green' : 'red'} />
          )}

          {editMode && editForm ? (
            <FormInput label="信箱" value={editForm.email} onChange={(v) => update('email', v)} placeholder="—" />
          ) : (
            <FormField label="信箱" value={user.email ?? '—'} dim={!user.email} />
          )}
          {editMode && editForm ? (
            <FormInput label="電話" value={editForm.phone} onChange={(v) => update('phone', v)} placeholder="—" />
          ) : (
            <FormField label="電話" value={user.phone ?? '—'} dim={!user.phone} />
          )}
          <FormField label="隸屬倉庫" value={user.warehouse ?? '—'} dim={!user.warehouse} />
          <FormField
            label="最後登入"
            value={user.lastLoginAt ? formatDateTimeZh(user.lastLoginAt) : '從未登入'}
            dim={!user.lastLoginAt}
          />

          <FormField label="建立時間" value={formatDateTimeZh(user.createdAt)} mono dim />
          <FormField label="建立人員" value={user.createdBy} dim />
          <FormField label="修改時間" value={formatDateTimeZh(user.updatedAt)} mono dim />
          <FormField label="修改人員" value={user.updatedBy} dim />
          <FormField label="系統編號" value={user.id} mono dim />
        </div>
      </section>

      {/* 擔任職務 */}
      <section className="border-b border-[#1A1A1F] px-8 py-6">
        <SectionHeader
          title="擔任職務"
          count={userRoles.length}
          subtitle="Assigned Roles"
          action={editMode && !isAdmin ? <SectionAddButton label="設定職務" onClick={onAddRole} formChain={1} /> : null}
        />
        {editMode &&
        (stagedRoleAddCount > 0 || stagedRoleRemoveCount > 0 || stagedRolePrimaryChanged) ? (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-[#E8A020]/30 bg-[#E8A020]/8 px-2 py-1 text-[10px] font-medium text-[#E8A020]">
            <span>● 待存檔：</span>
            {stagedRoleAddCount > 0 ? <span>新增 {stagedRoleAddCount}</span> : null}
            {stagedRoleRemoveCount > 0 ? <span>· 撤銷 {stagedRoleRemoveCount}</span> : null}
            {stagedRolePrimaryChanged ? <span>· 變更主要職務</span> : null}
            <span className="ml-1 text-[#888892]">（按 S 才寫入；撤銷為軟刪除）</span>
          </div>
        ) : null}
        <div className={cn('mt-4', isAdmin && 'opacity-60')}>
          {isAdmin ? (
            <div className="mb-3 rounded-md border border-[#3A3A42] bg-[#1A1A1F] px-3 py-2 text-xs text-[#888892]">
              系統管理員擁有所有權限、無需設定
            </div>
          ) : null}
          {userRoles.length > 0 ? (
            <DetailTable
              headers={
                editMode
                  ? ['項次', '職務代碼', '職務名稱', '主要', '指派時間', '指派人員', '操作']
                  : ['項次', '職務代碼', '職務名稱', '主要', '指派時間', '指派人員']
              }
              rows={userRoles.map((r, i) => {
                const base = [
                  String(i + 1).padStart(4, '0'),
                  r.roleCode ?? '—',
                  r.roleName ?? '—',
                  r.isPrimary ? '✓' : '',
                  formatDateTimeZh(r.assignedAt),
                  r.assignedByName ?? '—',
                ];
                if (!editMode || isAdmin) return base;
                return [
                  ...base,
                  <RoleRowActions
                    key={`actions-${r.id}`}
                    isPrimary={r.isPrimary}
                    onSetPrimary={() => onSetRolePrimary(r)}
                    onRevoke={() => onRevokeRole(r)}
                  />,
                ];
              })}
            />
          ) : (
            <EmptyDetail message="尚未指派職務" />
          )}
        </div>
      </section>

      {/* 隸屬倉庫 */}
      <section className="px-8 py-6">
        <SectionHeader
          title="隸屬倉庫"
          count={userWarehouses.length}
          subtitle="Assigned Warehouses"
          action={editMode && !isAdmin ? <SectionAddButton label="設定據點" onClick={onAddWarehouse} formChain={2} /> : null}
        />
        {editMode && (stagedWarehouseAddCount > 0 || stagedWarehouseRemoveCount > 0) ? (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-[#E8A020]/30 bg-[#E8A020]/8 px-2 py-1 text-[10px] font-medium text-[#E8A020]">
            <span>● 待存檔：</span>
            {stagedWarehouseAddCount > 0 ? <span>新增 {stagedWarehouseAddCount}</span> : null}
            {stagedWarehouseRemoveCount > 0 ? <span>· 撤銷 {stagedWarehouseRemoveCount}</span> : null}
            <span className="ml-1 text-[#888892]">（按 S 才寫入；撤銷為軟刪除）</span>
          </div>
        ) : null}
        <div className={cn('mt-4', isAdmin && 'opacity-60')}>
          {isAdmin ? (
            <div className="mb-3 rounded-md border border-[#3A3A42] bg-[#1A1A1F] px-3 py-2 text-xs text-[#888892]">
              系統管理員擁有所有權限、無需設定
            </div>
          ) : null}
          {userWarehouses.length > 0 ? (
            <DetailTable
              headers={
                editMode
                  ? ['項次', '倉庫代碼', '倉庫名稱', '指派時間', '指派人員', '操作']
                  : ['項次', '倉庫代碼', '倉庫名稱', '指派時間', '指派人員']
              }
              rows={userWarehouses.map((w, i) => {
                const base = [
                  String(i + 1).padStart(4, '0'),
                  w.warehouseCode ?? '—',
                  w.warehouseName ?? '—',
                  formatDateTimeZh(w.assignedAt),
                  w.assignedByName ?? '—',
                ];
                if (!editMode || isAdmin) return base;
                return [
                  ...base,
                  <WarehouseRowActions key={`actions-${w.id}`} onRevoke={() => onRevokeWarehouse(w)} />,
                ];
              })}
            />
          ) : (
            <EmptyDetail message="尚未指派倉庫據點" />
          )}
        </div>
      </section>
      </div>
    </MasterDetailScroll>
  );
}

// ──────────────────────────────────────────────────────────────
// UserMasterPage（共用元件，供 lab/users 與 dashboard/base/users 使用）
// ──────────────────────────────────────────────────────────────

export function UserMasterPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'list' | 'detail'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [mode, setMode] = useState<ErpMode>('browse');
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [sortKey, setSortKey] = useState<string>('username');
  const { toasts, showToast } = useToast();
  const userColumns = useMemo(() => buildUserColumns(), []);

  // ── API state ───────────────────────────────────────────────
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  // ── 搜尋 state（Stage 1-B.2）─────────────────────────────────
  const [searchOpen, setSearchOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');

  // ── 顯示停用 toggle（Stage 1-B.4.5）─────────────────────────
  const [showInactive, setShowInactive] = useState(false);

  // ── 新增對話框（Stage 1-B.6）─────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);

  // ── 詳細頁關聯資料：擔任職務 / 隸屬倉庫（Stage 1-B.7 / 1-B.8）─
  const [selectedUserRoles, setSelectedUserRoles] = useState<UserRoleDto[]>([]);
  const [rolesReloadTick, setRolesReloadTick] = useState(0);
  const [selectedUserWarehouses, setSelectedUserWarehouses] = useState<UserWarehouseDto[]>([]);
  const [warehousesReloadTick, setWarehousesReloadTick] = useState(0);

  // ── 軌 B Picker 對話框（B2 / B4）─────────────────────────────
  const [rolePickerOpen, setRolePickerOpen] = useState(false);
  const [warehousePickerOpen, setWarehousePickerOpen] = useState(false);

  // ── 軌 C C1：staged ops（編輯模式內的關聯變更暫存、按 S 才 apply）─
  const [pendingRoleOps, setPendingRoleOps] = useState<RoleOp[]>([]);
  const [pendingWarehouseOps, setPendingWarehouseOps] = useState<WarehouseOp[]>([]);

  // staged ops 衍生：移除清單 / 主要切換目標
  const stagedRemovedRoleIds = useMemo(
    () => new Set(pendingRoleOps.filter((o): o is Extract<RoleOp, { kind: 'remove' }> => o.kind === 'remove').map((o) => o.userRoleId)),
    [pendingRoleOps],
  );
  const stagedPrimaryRoleId = useMemo(() => {
    const last = [...pendingRoleOps].reverse().find((o) => o.kind === 'setPrimary');
    return last && last.kind === 'setPrimary' ? last.userRoleId : null;
  }, [pendingRoleOps]);
  const stagedAddedRoles = useMemo(
    () => pendingRoleOps.filter((o): o is Extract<RoleOp, { kind: 'add' }> => o.kind === 'add').map((o) => o.role),
    [pendingRoleOps],
  );
  const stagedRemovedWarehouseIds = useMemo(
    () =>
      new Set(
        pendingWarehouseOps
          .filter((o): o is Extract<WarehouseOp, { kind: 'remove' }> => o.kind === 'remove')
          .map((o) => o.userWarehouseId),
      ),
    [pendingWarehouseOps],
  );
  const stagedAddedWarehouses = useMemo(
    () =>
      pendingWarehouseOps
        .filter((o): o is Extract<WarehouseOp, { kind: 'add' }> => o.kind === 'add')
        .map((o) => o.warehouse),
    [pendingWarehouseOps],
  );

  // 切換 selected user / 退出編輯模式 → 清空 staged ops（避免跨 user / 跨次編輯 leak）
  useEffect(() => {
    setPendingRoleOps([]);
    setPendingWarehouseOps([]);
  }, [selectedId, mode]);

  // 300ms debounce keyword → debouncedKeyword
  useEffect(() => {
    const t = setTimeout(() => setDebouncedKeyword(keyword.trim()), 300);
    return () => clearTimeout(t);
  }, [keyword]);

  // keyword / showInactive 改變時 reset 回第一頁
  useEffect(() => {
    setPage(1);
  }, [debouncedKeyword, showInactive]);

  // 載入使用者列表（仿 BaseUserMasterView 範式：alive flag + cleanup）
  useEffect(() => {
    let alive = true;
    setLoading(true);
    void (async () => {
      try {
        const res = await listUsers({
          q: debouncedKeyword || undefined,
          page,
          pageSize,
          // showInactive=true → 後端不過濾（含啟用+停用）；預設 isActive=true 只看啟用
          isActive: showInactive ? undefined : true,
        });
        if (!alive) return;
        setUsers(res.items.map(dtoToUserRow));
        setTotal(res.total);
      } catch (e) {
        if (!alive) return;
        const msg = e instanceof Error ? e.message : '載入失敗';
        showToast(`使用者載入失敗：${msg}`, 'danger');
        setUsers([]);
        setTotal(0);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [page, pageSize, reloadTick, debouncedKeyword, showInactive, showToast]);

  // 載入該使用者的擔任職務（Stage 1-B.7）：selectedId 變 + tab='detail' 才打 API
  useEffect(() => {
    if (!selectedId || tab !== 'detail') {
      setSelectedUserRoles([]);
      return;
    }
    let alive = true;
    void (async () => {
      try {
        const res = await listUserRoles({
          userId: selectedId,
          isActive: true, // 只看生效中的職務指派
          pageSize: 100,
        });
        if (!alive) return;
        setSelectedUserRoles(res.items);
      } catch (e) {
        if (!alive) return;
        const msg = e instanceof Error ? e.message : '載入失敗';
        showToast(`擔任職務載入失敗：${msg}`, 'danger');
        setSelectedUserRoles([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [selectedId, tab, rolesReloadTick, showToast]);

  // 載入該使用者的隸屬倉庫（Stage 1-B.8）：selectedId 變 + tab='detail' 才打 API
  useEffect(() => {
    if (!selectedId || tab !== 'detail') {
      setSelectedUserWarehouses([]);
      return;
    }
    let alive = true;
    void (async () => {
      try {
        const res = await listUserWarehouses({
          userId: selectedId,
          isActive: true,
          pageSize: 100,
        });
        if (!alive) return;
        setSelectedUserWarehouses(res.items);
      } catch (e) {
        if (!alive) return;
        const msg = e instanceof Error ? e.message : '載入失敗';
        showToast(`隸屬倉庫載入失敗：${msg}`, 'danger');
        setSelectedUserWarehouses([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [selectedId, tab, warehousesReloadTick, showToast]);

  const selectedUser = useMemo(
    () => (selectedId ? users.find((u) => u.id === selectedId) ?? null : null),
    [selectedId, users],
  );

  // C2：dirty 偵測 — 編輯模式下，表單欄位 diff OR staged ops 數量 > 0 → dirty
  const isDirty = useMemo(() => {
    if (mode !== 'edit' || !editForm || !selectedUser) return false;
    const original = makeEditForm(selectedUser);
    const formChanged =
      editForm.displayName !== original.displayName ||
      editForm.isActive !== original.isActive ||
      editForm.email !== original.email ||
      editForm.phone !== original.phone;
    if (formChanged) return true;
    if (pendingRoleOps.length > 0) return true;
    if (pendingWarehouseOps.length > 0) return true;
    return false;
  }, [mode, editForm, selectedUser, pendingRoleOps, pendingWarehouseOps]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handlePageSizeChange = useCallback((next: number) => {
    setPageSize(next);
    setPage(1); // 改 pageSize 一律回第 1 頁
  }, []);

  const handleToggleSelection = () => {
    setSelectionMode((prev) => {
      if (prev) setChecked(new Set());
      return !prev;
    });
  };

  // ── ERP 工具列動作（lab：多為 mock，皆透過 toast 給可見反饋）─────
  const handleCreate = useCallback(() => {
    setCreateOpen(true);
  }, []);

  const handleEdit = useCallback(() => {
    if (!selectedUser) {
      showToast('請先點選一筆資料才能更正', 'danger');
      return;
    }
    setMode('edit');
    setTab('detail');
    setEditForm(makeEditForm(selectedUser));
    showToast(`進入編輯模式：${selectedUser.username}`, 'info');
  }, [selectedUser, showToast]);

  const handleSearch = useCallback(() => {
    setSearchOpen((prev) => !prev);
  }, []);

  const handleCloseSearch = useCallback(() => {
    setSearchOpen(false);
    setKeyword('');
  }, []);

  const handleDelete = useCallback(() => {
    if (!selectedUser) {
      showToast('請先點選一筆資料', 'danger');
      return;
    }
    const target = selectedUser;
    const isCurrentlyActive = target.isActive;
    const nextActive = !isCurrentlyActive;
    const actionLabel = nextActive ? '啟用' : '停用';
    setConfirmState({
      title: `確認${actionLabel}`,
      message: isCurrentlyActive
        ? `停用「${target.displayName}（${target.username}）」後將從預設列表移除（軟刪除，可由「顯示停用」開關重新看到並啟用）。`
        : `啟用「${target.displayName}（${target.username}）」？啟用後該使用者可正常登入並使用系統。`,
      confirmLabel: actionLabel,
      variant: isCurrentlyActive ? 'danger' : 'default',
      onConfirm: () => {
        void (async () => {
          try {
            await setUserActive(target.id, nextActive);
            showToast(`已${actionLabel} ${target.username}`, nextActive ? 'success' : 'danger');
            setSelectedId(null);
            setReloadTick((t) => t + 1);
          } catch (e) {
            const msg = e instanceof Error ? e.message : `${actionLabel}失敗`;
            showToast(`${actionLabel}失敗：${msg}`, 'danger');
          }
        })();
      },
    });
  }, [selectedUser, showToast]);

  const handleExport = useCallback(
    (format: ExportFormat) => {
      const label = format === 'csv' ? 'CSV' : format === 'pdf' ? 'PDF' : '列印';
      showToast(`匯出 ${label} · lab mock`, 'success');
    },
    [showToast],
  );

  const handleRefresh = useCallback(() => {
    setReloadTick((t) => t + 1);
    showToast('已重新整理（Alt+R）', 'success');
  }, [showToast]);

  const handleExit = useCallback(() => {
    if (mode === 'edit') {
      showToast('編輯中：請先存檔（Alt+S）或取消（Alt+C）', 'info');
      return;
    }
    router.push('/dashboard');
  }, [mode, router, showToast]);

  // C2：handleReturnToTable 已 inline 進 attemptReturnToTable（含 dirty 攔截）

  // C2：抽出純執行 save 邏輯（給 handleSave / dirty-aware 3-way confirm 共用）
  const performSave = useCallback(async (): Promise<boolean> => {
    if (!editForm || !selectedUser) {
      showToast('編輯狀態異常，請取消後重試', 'danger');
      return false;
    }
    const target = selectedUser;
    const form = editForm;
    const roleOps = pendingRoleOps;
    const warehouseOps = pendingWarehouseOps;
    let mainOk = false;
    let roleSuccess = 0;
    let roleFailed = 0;
    let warehouseSuccess = 0;
    let warehouseFailed = 0;
    try {
      await updateUser(target.id, {
        displayName: form.displayName.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        isActive: form.isActive,
      });
      mainOk = true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : '主檔存檔失敗';
      showToast(`主檔存檔失敗：${msg}`, 'danger');
      return false;
    }
    for (const op of roleOps) {
      try {
        if (op.kind === 'add') {
          await assignUserRole({ userId: target.id, roleId: op.role.id });
        } else if (op.kind === 'remove') {
          await revokeUserRole(op.userRoleId);
        } else if (op.kind === 'setPrimary') {
          await setUserRolePrimary(op.userRoleId, true);
        }
        roleSuccess++;
      } catch {
        roleFailed++;
      }
    }
    for (const op of warehouseOps) {
      try {
        if (op.kind === 'add') {
          await assignUserWarehouse({ userId: target.id, warehouseId: op.warehouse.id });
        } else if (op.kind === 'remove') {
          await revokeUserWarehouse(op.userWarehouseId);
        }
        warehouseSuccess++;
      } catch {
        warehouseFailed++;
      }
    }
    if (mainOk && roleFailed === 0 && warehouseFailed === 0) {
      const parts = [
        `主檔已存`,
        roleSuccess > 0 ? `職務 ${roleSuccess} 變更` : null,
        warehouseSuccess > 0 ? `倉庫 ${warehouseSuccess} 變更` : null,
      ].filter(Boolean);
      showToast(`已存檔 ${target.username}（${parts.join('、')}）`, 'success');
    } else {
      showToast(
        `部分變更失敗：職務 ${roleSuccess}/${roleOps.length}、倉庫 ${warehouseSuccess}/${warehouseOps.length}`,
        'danger',
      );
    }
    setMode('browse');
    setEditForm(null);
    setPendingRoleOps([]);
    setPendingWarehouseOps([]);
    setReloadTick((t) => t + 1);
    setRolesReloadTick((t) => t + 1);
    setWarehousesReloadTick((t) => t + 1);
    return roleFailed === 0 && warehouseFailed === 0;
  }, [editForm, selectedUser, pendingRoleOps, pendingWarehouseOps, showToast]);

  const handleSave = useCallback(() => {
    if (!editForm || !selectedUser) {
      showToast('編輯狀態異常，請取消後重試', 'danger');
      return;
    }
    const target = selectedUser;
    const stagedSummary = [
      pendingRoleOps.length > 0 ? `${pendingRoleOps.length} 個職務變更` : null,
      pendingWarehouseOps.length > 0 ? `${pendingWarehouseOps.length} 個倉庫據點變更` : null,
    ]
      .filter(Boolean)
      .join('、');
    setConfirmState({
      title: '確認存檔',
      message: `將「${target.displayName}（${target.username}）」的變更寫入資料庫${stagedSummary ? `（含 ${stagedSummary}）` : ''}？`,
      confirmLabel: '存檔',
      onConfirm: () => {
        void performSave();
      },
    });
  }, [editForm, selectedUser, pendingRoleOps, pendingWarehouseOps, performSave, showToast]);

  // C2：純執行 cancel 邏輯（給 handleCancel / dirty-aware 3-way confirm 共用）
  const performCancel = useCallback(() => {
    setMode('browse');
    setEditForm(null);
    setPendingRoleOps([]);
    setPendingWarehouseOps([]);
  }, []);

  const handleCancel = useCallback(() => {
    if (!isDirty) {
      performCancel();
      showToast('已取消編輯', 'info');
      return;
    }
    // dirty 時跳 3-way confirm
    setConfirmState({
      title: '您有未存檔變更',
      message: '取消後變更將丟棄、無法復原。是否先儲存再離開？',
      confirmLabel: '儲存後離開',
      onConfirm: () => {
        void performSave();
      },
      secondaryAction: {
        label: '丟棄變更',
        variant: 'danger',
        onClick: () => {
          performCancel();
          showToast('已丟棄變更', 'danger');
        },
      },
    });
  }, [isDirty, performSave, performCancel, showToast]);

  // C2：dirty-aware tab change（取代 ErpTabBar 直接 setTab + Alt+1/2 keyboard handler）
  const attemptTabChange = useCallback(
    (nextTab: 'list' | 'detail') => {
      if (!isDirty) {
        setTab(nextTab);
        return;
      }
      setConfirmState({
        title: '您有未存檔變更',
        message: `切換 Tab 前需處理變更：儲存後切換、丟棄變更後切換、或取消（保持編輯）。`,
        confirmLabel: '儲存後切換',
        onConfirm: () => {
          void (async () => {
            const ok = await performSave();
            if (ok) setTab(nextTab);
          })();
        },
        secondaryAction: {
          label: '丟棄變更',
          variant: 'danger',
          onClick: () => {
            performCancel();
            setTab(nextTab);
          },
        },
      });
    },
    [isDirty, performSave, performCancel],
  );

  // 統一範式：模組選單 / 公告等跨頁跳轉（編輯 dirty 先 3-way confirm，對齊 EntityMasterPage）
  const requestNavigate = useCallback(
    (href: string) => {
      if (mode === 'edit' && isDirty) {
        setConfirmState({
          title: '您有未存檔變更',
          message: '離開此頁要先存檔，還是丟棄變更？',
          confirmLabel: '存檔後離開',
          onConfirm: () => {
            void (async () => {
              const ok = await performSave();
              if (ok) router.push(href);
            })();
          },
          secondaryAction: {
            label: '丟棄變更',
            variant: 'danger',
            onClick: () => {
              performCancel();
              router.push(href);
            },
          },
        });
        return;
      }
      router.push(href);
    },
    [mode, isDirty, performSave, performCancel, router],
  );

  // 進頁面自動鎖定第一列（對齊其他 22 個主檔；詳細頁不再跳「請先選擇」）
  useEffect(() => {
    if (users.length === 0) {
      if (selectedId !== null) setSelectedId(null);
      return;
    }
    if (!users.some((u) => u.id === selectedId)) setSelectedId(users[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users]);

  // 選中列捲入視野
  useEffect(() => {
    if (!selectedId || tab !== 'list') return;
    document.querySelector(`[data-row-id="${selectedId}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [selectedId, tab]);

  // 瀏覽模式整頁 ↑↓ 切列 + Enter 進詳細（焦點非表單元素時）
  useEffect(() => {
    const onArrow = (e: KeyboardEvent) => {
      if (mode !== 'browse' || tab !== 'list') return;
      const tag = (document.activeElement?.tagName ?? '').toLowerCase();
      if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        if (users.length === 0) return;
        e.preventDefault();
        const idx = users.findIndex((u) => u.id === selectedId);
        const cur = idx < 0 ? 0 : idx;
        const nextIdx =
          e.key === 'ArrowDown' ? Math.min(users.length - 1, cur + 1) : Math.max(0, cur - 1);
        setSelectedId(users[nextIdx].id);
      } else if (e.key === 'Enter') {
        // 選中列 Enter → 進詳細資料（瀏覽）
        if (!selectedId) return;
        e.preventDefault();
        setTab('detail');
      }
    };
    window.addEventListener('keydown', onArrow);
    return () => window.removeEventListener('keydown', onArrow);
  }, [mode, tab, users, selectedId]);

  const handleAddRole = useCallback(() => {
    if (!selectedUser) {
      showToast('請先點選一筆使用者', 'danger');
      return;
    }
    setRolePickerOpen(true);
  }, [selectedUser, showToast]);

  // RolePicker 用：已指派的 roleId 集合（picker 內 disable + 顯示「已指派」chip）
  const assignedRoleIds = useMemo(
    () => new Set(selectedUserRoles.map((ur) => ur.roleId)),
    [selectedUserRoles],
  );

  const handleRolePickerSearch = useCallback(
    (q: string) => listRoles({ q: q || undefined, isActive: true, pageSize: 50 }),
    [],
  );

  // C1 staged：picker confirm 不立即 assign，只加入 pendingRoleOps
  const handleRolePickerConfirm = useCallback(
    async (roles: RoleDto[]) => {
      setPendingRoleOps((prev) => [...prev, ...roles.map((r): RoleOp => ({ kind: 'add', role: r }))]);
    },
    [],
  );

  const handleRolePickerSuccess = useCallback(
    (count: number) => {
      showToast(`已加入 ${count} 個職務（待存檔，按 S 才會寫入）`, 'info');
    },
    [showToast],
  );

  // C1 staged：設為主要（toggle 模式：再點同一筆 = 取消 staged）
  const handleSetRolePrimary = useCallback(
    (role: UserRoleDto) => {
      setPendingRoleOps((prev) => {
        const last = [...prev].reverse().find((o) => o.kind === 'setPrimary');
        const lastPrimaryId = last && last.kind === 'setPrimary' ? last.userRoleId : null;
        // 已 staged 同一個 → 取消（移除最後一個 setPrimary op）
        if (lastPrimaryId === role.id) {
          return prev.filter((o) => !(o.kind === 'setPrimary' && o.userRoleId === role.id));
        }
        // 否則 append 新 setPrimary op（覆蓋前一個的視覺效果）
        return [...prev, { kind: 'setPrimary', userRoleId: role.id }];
      });
    },
    [],
  );

  // C1 staged：移除職務（toggle 模式：再點 = 取消 staged remove）
  const handleRevokeRole = useCallback(
    (role: UserRoleDto) => {
      setPendingRoleOps((prev) => {
        const alreadyRemoved = prev.some((o) => o.kind === 'remove' && o.userRoleId === role.id);
        if (alreadyRemoved) {
          // toggle undo：移除 staged remove op
          return prev.filter((o) => !(o.kind === 'remove' && o.userRoleId === role.id));
        }
        // 業務規則：主要職務不可撤銷（依 derived primary 計算）
        const isCurrentlyPrimary = stagedPrimaryRoleId ? role.id === stagedPrimaryRoleId : role.isPrimary;
        if (isCurrentlyPrimary) {
          showToast('主要職務不可撤銷，請先將其他職務設為主要', 'danger');
          return prev;
        }
        return [...prev, { kind: 'remove', userRoleId: role.id }];
      });
    },
    [stagedPrimaryRoleId, showToast],
  );

  // 註：handleUnstageAddedRole 未提供（簡化 UI 不渲染 staged-add row）。
  // 使用者反悔請按 C 取消（清空所有 staged ops）；後續軌可加 staged-add row + 「取消新增」按鈕。

  const handleAddWarehouse = useCallback(() => {
    if (!selectedUser) {
      showToast('請先點選一筆使用者', 'danger');
      return;
    }
    setWarehousePickerOpen(true);
  }, [selectedUser, showToast]);

  // WarehousePicker 用：已指派的 warehouseId 集合
  const assignedWarehouseIds = useMemo(
    () => new Set(selectedUserWarehouses.map((uw) => uw.warehouseId)),
    [selectedUserWarehouses],
  );

  const handleWarehousePickerSearch = useCallback(
    (q: string) => listWarehouses({ q: q || undefined, isActive: true, pageSize: 50 }),
    [],
  );

  // C1 staged：picker confirm 不立即 assign，只加入 pendingWarehouseOps
  const handleWarehousePickerConfirm = useCallback(
    async (warehouses: WarehouseDto[]) => {
      setPendingWarehouseOps((prev) => [
        ...prev,
        ...warehouses.map((w): WarehouseOp => ({ kind: 'add', warehouse: w })),
      ]);
    },
    [],
  );

  const handleWarehousePickerSuccess = useCallback(
    (count: number) => {
      showToast(`已加入 ${count} 個倉庫據點(待存檔，按 S 才會寫入)`, 'info');
    },
    [showToast],
  );

  // B5（軌 B 第 5 commit）：批次啟用 / 批次停用 接 setUserActive 串聯
  // 業界範式：confirm + 進度錯誤分流（success / failed 各別 count）
  const handleBatchSetActive = useCallback(
    (nextActive: boolean) => {
      if (checked.size === 0) {
        showToast('請先勾選至少一筆使用者', 'danger');
        return;
      }
      const ids = Array.from(checked);
      const actionLabel = nextActive ? '啟用' : '停用';
      setConfirmState({
        title: `確認批次${actionLabel}`,
        message: `將勾選的 ${ids.length} 筆使用者批次${actionLabel}？此動作為軟刪除/啟用，可由「顯示停用」開關重新檢視。`,
        confirmLabel: `${actionLabel} ${ids.length} 筆`,
        variant: nextActive ? 'default' : 'danger',
        onConfirm: () => {
          void (async () => {
            let success = 0;
            let failed = 0;
            for (const id of ids) {
              try {
                await setUserActive(id, nextActive);
                success++;
              } catch {
                failed++;
              }
            }
            if (failed > 0) {
              showToast(
                `批次${actionLabel}：${success}/${ids.length} 成功、${failed} 筆失敗`,
                'danger',
              );
            } else {
              showToast(`已批次${actionLabel} ${success} 筆`, nextActive ? 'success' : 'danger');
            }
            setChecked(new Set());
            setSelectionMode(false);
            setReloadTick((t) => t + 1);
          })();
        },
      });
    },
    [checked, showToast],
  );

  const handleBatchEnable = useCallback(() => handleBatchSetActive(true), [handleBatchSetActive]);
  const handleBatchDisable = useCallback(() => handleBatchSetActive(false), [handleBatchSetActive]);

  // C1 staged：移除倉庫據點（toggle 模式：再點 = 取消 staged）
  const handleRevokeWarehouse = useCallback((uw: UserWarehouseDto) => {
    setPendingWarehouseOps((prev) => {
      const alreadyRemoved = prev.some((o) => o.kind === 'remove' && o.userWarehouseId === uw.id);
      if (alreadyRemoved) {
        return prev.filter((o) => !(o.kind === 'remove' && o.userWarehouseId === uw.id));
      }
      return [...prev, { kind: 'remove', userWarehouseId: uw.id }];
    });
  }, []);

  // 註：handleUnstageAddedWarehouse 同樣不提供（簡化 UI）。

  // ── C2：ESC 鍵在編輯模式下 → 觸發 handleCancel（含 dirty 攔截）─
  useEffect(() => {
    if (mode !== 'edit') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // 讓內層 dialog（ConfirmDialog / Picker / Search 等）先處理自己的 ESC
      const openDialog = document.querySelector('[role="dialog"]');
      if (openDialog) return;
      // 編輯模式內 ESC 不在 input／textarea → 觸發 handleCancel
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      e.preventDefault();
      handleCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mode, handleCancel]);

  // ── C2：beforeunload → dirty 時瀏覽器原生 warn dialog（避免關 tab/重整丟資料）─
  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ''; // Chrome 需要、訊息由瀏覽器自定
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  // ── Alt+letter 快捷鍵 ─────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const k = e.key.toLowerCase();

      // Alt+1 / Alt+2：Tab 切換（C2：編輯模式允許切換但 dirty 時跳 3-way confirm）
      if (k === '1' || k === '2') {
        e.preventDefault();
        if (k === '1') {
          attemptTabChange('list');
        } else if (selectedUser) {
          attemptTabChange('detail');
        } else {
          showToast('請先點選一筆資料才能切換至詳細資料', 'danger');
        }
        return;
      }

      if (selectionMode) return; // selectionMode 不接其他 Alt 快捷
      if (mode === 'edit') {
        if (k === 's') {
          e.preventDefault();
          handleSave();
        } else if (k === 'c') {
          e.preventDefault();
          handleCancel();
        }
        return;
      }
      // browse mode
      switch (k) {
        case 'a':
          e.preventDefault();
          handleCreate();
          break;
        case 'e':
          if (selectedUser) {
            e.preventDefault();
            handleEdit();
          }
          break;
        case 'f':
          e.preventDefault();
          handleSearch();
          break;
        case 'd':
          if (selectedUser) {
            e.preventDefault();
            handleDelete();
          }
          break;
        case 'p':
          e.preventDefault();
          handleExport('csv');
          break;
        case 'r':
          e.preventDefault();
          handleRefresh();
          break;
        case 'q':
          e.preventDefault();
          handleExit();
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    mode,
    selectionMode,
    selectedUser,
    handleCreate,
    handleEdit,
    handleSearch,
    handleDelete,
    handleExport,
    handleRefresh,
    handleExit,
    handleSave,
    handleCancel,
    showToast,
  ]);

  return (
    <>
      <div
        className="flex h-dvh flex-col text-[#E8E8EB]"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at top, #11111A 0%, #0A0A0C 35%, #06060A 100%)',
        }}
      >
        {/* 統一置頂列（與其他 22 個主檔頁一致） */}
        <MasterTopBar
          category={HEADER_CONFIG.category}
          title={HEADER_CONFIG.title}
          count={`${total} 位使用者`}
          requestNavigate={requestNavigate}
        />
        {/* 統一 Tab */}
        <MasterTabs tab={tab} onChange={attemptTabChange} />
        {/* 工具列（手機橫向 scroll） */}
        <div className="overflow-x-auto">
          <ErpToolbar
            mode={mode}
            hasActiveRow={selectedUser !== null}
            selectedRowActive={selectedUser?.isActive ?? true}
            selectionMode={selectionMode}
            onToggleSelection={handleToggleSelection}
            selectedCount={checked.size}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            onCreate={handleCreate}
            onEdit={handleEdit}
            onSearch={handleSearch}
            onDelete={handleDelete}
            onExport={handleExport}
            onRefresh={handleRefresh}
            onExit={handleExit}
            onSave={handleSave}
            onCancel={handleCancel}
            showInactive={tab === 'list' ? showInactive : undefined}
            onShowInactiveChange={tab === 'list' ? setShowInactive : undefined}
            onBatchEnable={handleBatchEnable}
            onBatchDisable={handleBatchDisable}
          />
        </div>
        <SearchPanel
          open={searchOpen}
          value={keyword}
          onChange={setKeyword}
          onClose={handleCloseSearch}
          placeholder="搜尋帳號 / 姓名 / 信箱 / 電話..."
        />
        <div className="flex min-h-0 flex-1 flex-col">
        {tab === 'list' ? (
          <MasterTable<UserRow>
            columns={userColumns}
            rows={users}
            getRowId={(r) => r.id}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onOpenDetail={(id) => {
              // 雙擊 / Enter = 進詳細「瀏覽」模式（要編輯再按 Alt+E）
              setSelectedId(id);
              setTab('detail');
            }}
            selectionMode={selectionMode}
            checked={checked}
            setChecked={setChecked}
            sortKey={sortKey}
            onSortKeyChange={setSortKey}
            footerHint={
              loading
                ? '載入中…'
                : debouncedKeyword
                  ? `關鍵字「${debouncedKeyword}」過濾中${showInactive ? '（含停用）' : ''}`
                  : showInactive
                    ? '顯示全部（含停用）'
                    : selectedId
                      ? '雙擊或 Alt+E 進入編輯'
                      : '點選列以啟用更正/停用'
            }
            pageSize={pageSize}
            onPageSizeChange={handlePageSizeChange}
            totalCount={total}
          />
        ) : selectedUser ? (
          <UserDetailView
            user={selectedUser}
            editMode={mode === 'edit'}
            editForm={editForm}
            onEditChange={setEditForm}
            userRoles={selectedUserRoles}
            userWarehouses={selectedUserWarehouses}
            onAddRole={handleAddRole}
            onAddWarehouse={handleAddWarehouse}
            onSetRolePrimary={handleSetRolePrimary}
            onRevokeRole={handleRevokeRole}
            onRevokeWarehouse={handleRevokeWarehouse}
            stagedRoleAddCount={stagedAddedRoles.length}
            stagedRoleRemoveCount={stagedRemovedRoleIds.size}
            stagedRolePrimaryChanged={stagedPrimaryRoleId !== null}
            stagedWarehouseAddCount={stagedAddedWarehouses.length}
            stagedWarehouseRemoveCount={stagedRemovedWarehouseIds.size}
            onRequestSave={handleSave}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-[#5A5A60]">
            目前沒有資料
          </div>
        )}
        </div>
      </div>
      <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />
      <CreateUserDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={(created) => {
          setCreateOpen(false);
          showToast(`已建立使用者：${created.username}`, 'success');
          setReloadTick((t) => t + 1);
        }}
      />
      <EntityPickerDialog<RoleDto>
        open={rolePickerOpen}
        onClose={() => {
          setRolePickerOpen(false);
          // 設定職務視窗關閉後，焦點前進到「設定據點」（Enter 鏈：職務 → 據點）
          setTimeout(() => {
            (document.querySelector('[data-formchain="2"]') as HTMLElement | null)?.focus();
          }, 0);
        }}
        title="新增職務"
        subtitle="Assign Roles"
        icon={Briefcase}
        searchPlaceholder="搜尋職務代碼 / 名稱..."
        search={handleRolePickerSearch}
        getId={(r) => r.id}
        /* C4：主標只顯示中文名稱（去除 `${code} ·` 前綴）；英文代碼降為下方副標、仍可搜尋（backend role.service whereList OR code/name/description） */
        getLabel={(r) => r.name}
        getDescription={(r) => (r.description ? `${r.code} · ${r.description}` : r.code)}
        disabledIds={assignedRoleIds}
        disabledHint="已指派"
        onConfirm={handleRolePickerConfirm}
        onSuccess={handleRolePickerSuccess}
      />
      <EntityPickerDialog<WarehouseDto>
        open={warehousePickerOpen}
        onClose={() => setWarehousePickerOpen(false)}
        title="新增倉庫據點"
        subtitle="Assign Warehouses"
        icon={Warehouse}
        searchPlaceholder="搜尋倉庫代碼 / 名稱..."
        search={handleWarehousePickerSearch}
        getId={(w) => w.id}
        /* C4：對齊 Role picker —— 主標只顯示中文名稱，英文代碼降為副標 */
        getLabel={(w) => w.name}
        getDescription={(w) => (w.remark ? `${w.code} · ${w.remark}` : w.code)}
        disabledIds={assignedWarehouseIds}
        disabledHint="已指派"
        onConfirm={handleWarehousePickerConfirm}
        onSuccess={handleWarehousePickerSuccess}
      />
      <ToastStack toasts={toasts} />
    </>
  );
}
