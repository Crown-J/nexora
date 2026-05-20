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
import {
  Users,
  UserCog,
  Briefcase,
  Shield,
  MapPin,
  Package,
  Car,
  Building2,
  Handshake,
  Settings,
  Layers,
} from 'lucide-react';

import { listUsers, type UserDto } from '@/features/base/api/user';
import { ConfirmDialog, type ConfirmState } from '@/features/master-shell/ui/ConfirmDialog';
import { ErpToolbar, type ErpMode, type ExportFormat } from '@/features/master-shell/ui/ErpToolbar';
import { FormField, FormInput, FormSelect } from '@/features/master-shell/ui/FormField';
import {
  DetailTable,
  EmptyDetail,
  MasterDetailScroll,
  SectionAddButton,
  SectionHeader,
} from '@/features/master-shell/ui/MasterDetail';
import {
  MasterShell,
  type HeaderConfig,
  type SidebarConfig,
} from '@/features/master-shell/ui/MasterShell';
import { MasterTable, type MasterTableColumn } from '@/features/master-shell/ui/MasterTable';
import { SearchPanel } from '@/features/master-shell/ui/SearchPanel';
import { ToastStack, useToast } from '@/features/master-shell/ui/ToastStack';
import { cn } from '@/lib/utils';

// ──────────────────────────────────────────────────────────────
// 配置
// ──────────────────────────────────────────────────────────────

const SIDEBAR_CONFIG: SidebarConfig = {
  brandTitle: 'NEXORA GRID',
  brandSubtitle: '測試公司（LITE）',
  userInitial: '管',
  userName: '測試租戶管理員（LITE）',
  userMeta: 'admin · 使用者',
  sections: [
    {
      id: 'account',
      label: '帳號與權限',
      hasAddAction: true,
      items: [
        { id: 'user', icon: Users, label: '使用者', active: true, count: 5 },
        { id: 'role', icon: Briefcase, label: '職務主檔', count: 6 },
        { id: 'user-role', icon: UserCog, label: '使用者職務設定', count: 5 },
        { id: 'user-warehouse', icon: MapPin, label: '使用者據點設定', count: 5 },
        { id: 'role-view', icon: Shield, label: '職務權限設定', count: 12 },
      ],
    },
    {
      id: 'product',
      label: '產品與料號',
      items: [
        { id: 'part', icon: Package, label: '零件主檔', count: 256 },
        { id: 'brand', icon: Layers, label: '汽車／零件廠牌', count: 48 },
      ],
    },
    {
      id: 'vehicle',
      label: '車型字典',
      items: [
        { id: 'engine', icon: Car, label: '引擎主檔', count: 32 },
        { id: 'model', icon: Car, label: '車型主檔', count: 128 },
      ],
    },
    {
      id: 'org',
      label: '組織架構',
      items: [{ id: 'warehouse', icon: Building2, label: '倉庫主檔', count: 4 }],
    },
    {
      id: 'partner',
      label: '交易對象',
      items: [{ id: 'partner', icon: Handshake, label: '客戶主檔', count: 87 }],
    },
    {
      id: 'system',
      label: '系統設定',
      items: [{ id: 'settings', icon: Settings, label: '基礎設定' }],
    },
  ],
};

const HEADER_CONFIG: HeaderConfig = {
  category: '帳號與權限',
  title: '使用者主檔',
  countBadge: { icon: Users, text: '5 位使用者' },
  notificationBadge: 3,
  announcementBadge: 2,
};

const JOB_TITLES = ['系統管理員', '財務', '採購', '業務', '倉管'] as const;

const PAGE_SIZE = 20;

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
  /** detail：擔任職務（多項）*/
  roles: { code: string; name: string; isPrimary: boolean; assignedAt: string; assignedBy: string }[];
  /** detail：隸屬倉庫（多項）*/
  warehouses: { code: string; name: string; assignedAt: string; assignedBy: string }[];
};

type EditFormState = {
  username: string;
  displayName: string;
  jobTitle: string;
  isActive: boolean;
  email: string;
  phone: string;
  warehouse: string;
};

/** 將後端 UserDto 轉成內部 UserRow（仿 BaseUserMasterView dtoToRow 範式）
 * roles / warehouses 暫留空陣列，Stage 1-B.7/B.8 接 listUserRoles / listUserWarehouses 時補。
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
    roles: [],
    warehouses: [],
  };
}

function makeEditForm(user: UserRow): EditFormState {
  return {
    username: user.username,
    displayName: user.displayName,
    jobTitle: user.jobTitle,
    isActive: user.isActive,
    email: user.email ?? '',
    phone: user.phone ?? '',
    warehouse: user.warehouse ?? '',
  };
}

// ──────────────────────────────────────────────────────────────
// 子元件
// ──────────────────────────────────────────────────────────────

/** 舊 ERP 範式 tab bar（1 資料瀏覽 / 2 詳細資料）；編輯模式下 list 鎖定 */
function ErpTabBar({
  tab,
  onChange,
  hasSelected,
  editMode,
}: {
  tab: 'list' | 'detail';
  onChange: (next: 'list' | 'detail') => void;
  hasSelected: boolean;
  editMode: boolean;
}) {
  return (
    <div
      className="flex items-center border-b border-[#2A2A30] px-3"
      style={{
        backgroundImage: 'linear-gradient(180deg, #0E0E12 0%, #08080A 100%)',
        boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.03)',
      }}
    >
      <button
        type="button"
        onClick={() => onChange('list')}
        disabled={editMode}
        title={editMode ? '編輯模式無法切換' : '資料瀏覽（Alt+1）'}
        className={cn(
          'inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors',
          tab === 'list'
            ? 'border-[#E8A020] text-[#E8A020] [text-shadow:0_0_12px_rgba(232,160,32,0.4)]'
            : editMode
              ? 'cursor-not-allowed border-transparent text-[#5A5A60]'
              : 'border-transparent text-[#888892] hover:text-[#E8E8EB]',
        )}
      >
        <span className="rounded bg-[#1A1A1F] px-1 font-mono text-[10px] text-[#888892]">1</span>
        資料瀏覽
      </button>
      <button
        type="button"
        onClick={() => onChange('detail')}
        disabled={!hasSelected || editMode}
        title={editMode ? '編輯模式無法切換' : '詳細資料（Alt+2）'}
        className={cn(
          'inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors',
          tab === 'detail'
            ? 'border-[#E8A020] text-[#E8A020] [text-shadow:0_0_12px_rgba(232,160,32,0.4)]'
            : hasSelected && !editMode
              ? 'border-transparent text-[#888892] hover:text-[#E8E8EB]'
              : 'cursor-not-allowed border-transparent text-[#5A5A60]',
        )}
      >
        <span className="rounded bg-[#1A1A1F] px-1 font-mono text-[10px] text-[#888892]">2</span>
        詳細資料
      </button>
    </div>
  );
}

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
          {row.lastLoginAt ?? <span className="text-[#5A5A60]">—</span>}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: '建立時間',
      minWidthClass: 'min-w-[160px]',
      render: (row) => <span className="text-xs tabular-nums text-[#888892]">{row.createdAt}</span>,
    },
  ];
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
  onAddRole,
  onAddWarehouse,
}: {
  user: UserRow;
  editMode: boolean;
  editForm: EditFormState | null;
  onEditChange: (next: EditFormState) => void;
  onAddRole: () => void;
  onAddWarehouse: () => void;
}) {
  const update = <K extends keyof EditFormState>(key: K, value: EditFormState[K]) => {
    if (!editForm) return;
    onEditChange({ ...editForm, [key]: value });
  };

  return (
    <MasterDetailScroll scrollKey={user.id}>
      {/* 基本資料 */}
      <section className="border-b border-[#1A1A1F] px-8 py-6">
        <SectionHeader title="基本資料" subtitle="User Profile" />
        <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          <FormField label="帳號" value={user.username} mono />
          {editMode && editForm ? (
            <FormInput label="姓名" value={editForm.displayName} onChange={(v) => update('displayName', v)} />
          ) : (
            <FormField label="姓名" value={user.displayName} />
          )}
          {editMode && editForm ? (
            <FormSelect
              label="職務"
              value={editForm.jobTitle}
              options={JOB_TITLES as unknown as string[]}
              onChange={(v) => update('jobTitle', v)}
            />
          ) : (
            <FormField label="職務" value={user.jobTitle} />
          )}
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
          {editMode && editForm ? (
            <FormInput label="隸屬倉庫" value={editForm.warehouse} onChange={(v) => update('warehouse', v)} placeholder="—" />
          ) : (
            <FormField label="隸屬倉庫" value={user.warehouse ?? '—'} dim={!user.warehouse} />
          )}
          <FormField label="最後登入" value={user.lastLoginAt ?? '從未登入'} dim={!user.lastLoginAt} />

          <FormField label="建立時間" value={user.createdAt} mono />
          <FormField label="建立人員" value={user.createdBy} />
          <FormField label="修改時間" value={user.updatedAt} mono />
          <FormField label="修改人員" value={user.updatedBy} />
        </div>
      </section>

      {/* 擔任職務 */}
      <section className="border-b border-[#1A1A1F] px-8 py-6">
        <SectionHeader
          title="擔任職務"
          count={user.roles.length}
          subtitle="Assigned Roles"
          action={editMode ? <SectionAddButton label="新增職務" onClick={onAddRole} /> : null}
        />
        <div className="mt-4">
          {user.roles.length > 0 ? (
            <DetailTable
              headers={['項次', '職務代碼', '職務名稱', '主要', '指派時間', '指派人員']}
              rows={user.roles.map((r, i) => [
                String(i + 1).padStart(4, '0'),
                r.code,
                r.name,
                r.isPrimary ? '✓' : '',
                r.assignedAt,
                r.assignedBy,
              ])}
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
          count={user.warehouses.length}
          subtitle="Assigned Warehouses"
          action={editMode ? <SectionAddButton label="新增倉庫據點" onClick={onAddWarehouse} /> : null}
        />
        <div className="mt-4">
          {user.warehouses.length > 0 ? (
            <DetailTable
              headers={['項次', '倉庫代碼', '倉庫名稱', '指派時間', '指派人員']}
              rows={user.warehouses.map((w, i) => [
                String(i + 1).padStart(4, '0'),
                w.code,
                w.name,
                w.assignedAt,
                w.assignedBy,
              ])}
            />
          ) : (
            <EmptyDetail message="尚未指派倉庫據點" />
          )}
        </div>
      </section>
    </MasterDetailScroll>
  );
}

// ──────────────────────────────────────────────────────────────
// UserMasterPage（共用元件，供 lab/users 與 dashboard/base/users 使用）
// ──────────────────────────────────────────────────────────────

export function UserMasterPage() {
  const [tab, setTab] = useState<'list' | 'detail'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [mode, setMode] = useState<ErpMode>('browse');
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [sortKey, setSortKey] = useState<string>('username');
  const sidebarRef = useRef<HTMLElement>(null);
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

  // 300ms debounce keyword → debouncedKeyword
  useEffect(() => {
    const t = setTimeout(() => setDebouncedKeyword(keyword.trim()), 300);
    return () => clearTimeout(t);
  }, [keyword]);

  // keyword 改變時 reset 回第一頁
  useEffect(() => {
    setPage(1);
  }, [debouncedKeyword]);

  // 載入使用者列表（仿 BaseUserMasterView 範式：alive flag + cleanup）
  useEffect(() => {
    let alive = true;
    setLoading(true);
    void (async () => {
      try {
        const res = await listUsers({
          q: debouncedKeyword || undefined,
          page,
          pageSize: PAGE_SIZE,
          isActive: true,
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
  }, [page, reloadTick, debouncedKeyword, showToast]);

  const selectedUser = useMemo(
    () => (selectedId ? users.find((u) => u.id === selectedId) ?? null : null),
    [selectedId, users],
  );
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleToggleSelection = () => {
    setSelectionMode((prev) => {
      if (prev) setChecked(new Set());
      return !prev;
    });
  };

  // ── ERP 工具列動作（lab：多為 mock，皆透過 toast 給可見反饋）─────
  const handleCreate = useCallback(() => {
    showToast('新增（Alt+A） · 待接 API', 'info');
  }, [showToast]);

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
      showToast('請先點選一筆資料才能刪除', 'danger');
      return;
    }
    setConfirmState({
      title: '確認刪除',
      message: `確定要刪除「${selectedUser.displayName}（${selectedUser.username}）」？此動作無法復原。`,
      confirmLabel: '刪除',
      variant: 'danger',
      onConfirm: () => {
        const name = selectedUser.username;
        setSelectedId(null);
        showToast(`已刪除 ${name}`, 'danger');
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
    setSelectedId(null);
    const first = sidebarRef.current?.querySelector<HTMLButtonElement>('[data-nav-item]');
    first?.focus();
    showToast('焦點已轉至左側模組列表（↑↓ 切換、Enter 返回表格）', 'info');
  }, [showToast]);

  const handleReturnToTable = useCallback(() => {
    if (users.length === 0) return;
    const first = users[0];
    setSelectedId(first.id);
    setTimeout(() => {
      const row = document.querySelector<HTMLTableRowElement>(`[data-row-id="${first.id}"]`);
      row?.focus();
    }, 0);
    showToast(`已聚焦第一筆：${first.username}`, 'info');
  }, [showToast, users]);

  const handleSave = useCallback(() => {
    setConfirmState({
      title: '確認存檔',
      message: '是否確認將變更寫入此筆資料？',
      confirmLabel: '存檔',
      onConfirm: () => {
        setMode('browse');
        setEditForm(null);
        showToast('已存檔（lab mock）', 'success');
      },
    });
  }, [showToast]);

  const handleCancel = useCallback(() => {
    setMode('browse');
    setEditForm(null);
    showToast('已取消編輯', 'info');
  }, [showToast]);

  const handleNotification = useCallback(() => {
    showToast('通知中心 · 3 則未讀（lab mock）', 'info');
  }, [showToast]);

  const handleAnnouncement = useCallback(() => {
    showToast('公告 · 2 則最新（lab mock）', 'info');
  }, [showToast]);

  const handleAddRole = useCallback(() => {
    showToast('新增職務 · 待接職務選擇器（lab mock）', 'info');
  }, [showToast]);

  const handleAddWarehouse = useCallback(() => {
    showToast('新增倉庫據點 · 待接倉庫選擇器（lab mock）', 'info');
  }, [showToast]);

  // ── Alt+letter 快捷鍵 ─────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const k = e.key.toLowerCase();

      // Alt+1 / Alt+2：Tab 切換（瀏覽 + 選取模式可用，編輯模式禁用）
      if ((k === '1' || k === '2') && mode !== 'edit') {
        e.preventDefault();
        if (k === '1') {
          setTab('list');
        } else if (selectedUser) {
          setTab('detail');
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
      <MasterShell
        sidebarRef={sidebarRef}
        sidebarConfig={SIDEBAR_CONFIG}
        headerConfig={HEADER_CONFIG}
        onReturnToTable={handleReturnToTable}
        onNotification={handleNotification}
        onAnnouncement={handleAnnouncement}
      >
        <ErpToolbar
          mode={mode}
          hasActiveRow={selectedUser !== null}
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
        />
        <SearchPanel
          open={searchOpen}
          value={keyword}
          onChange={setKeyword}
          onClose={handleCloseSearch}
          placeholder="搜尋帳號 / 姓名 / 信箱 / 電話..."
        />
        <ErpTabBar
          tab={tab}
          onChange={setTab}
          hasSelected={selectedUser !== null}
          editMode={mode === 'edit'}
        />
        {tab === 'list' ? (
          <MasterTable<UserRow>
            columns={userColumns}
            rows={users}
            getRowId={(r) => r.id}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onOpenDetail={(id) => {
              setSelectedId(id);
              setTab('detail');
              // 雙擊 = 進入編輯（對齊 footer 文案）
              const u = users.find((u) => u.id === id);
              if (u) {
                setMode('edit');
                setEditForm(makeEditForm(u));
              }
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
                  ? `關鍵字「${debouncedKeyword}」過濾中`
                  : selectedId
                    ? '雙擊或 Alt+E 進入編輯'
                    : '點選列以啟用更正/刪除'
            }
            pageSize={PAGE_SIZE}
            totalCount={total}
          />
        ) : selectedUser ? (
          <UserDetailView
            user={selectedUser}
            editMode={mode === 'edit'}
            editForm={editForm}
            onEditChange={setEditForm}
            onAddRole={handleAddRole}
            onAddWarehouse={handleAddWarehouse}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-[#5A5A60]">
            請先於「資料瀏覽」選擇一筆資料
          </div>
        )}
      </MasterShell>
      <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />
      <ToastStack toasts={toasts} />
    </>
  );
}
