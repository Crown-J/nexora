// apps/nx-ui/src/features/user-zoned/UserZonedPage.tsx
// v1.2 對齊軌 階段 E P6：user 分區編輯 list+detail 容器（B1~B5 補完客戶自助功能）
//
// 對齊總經理 STOP-1 拍板 A：補完 5 個客戶自助功能、清 admin UI、再砍舊版。
//
// 客戶自助功能（從舊版 UserMasterPage 移植）：
//   B1 新增使用者（CreateUserDialog、預設密碼）
//   B2 指派職務 / 角色（staged add/remove + 主要切換）
//   B3 指派隸屬倉庫（staged add/remove）
//   B4 撤銷職務 / 倉庫（軟刪除）
//   B5 主要職務切換
//
// 清除（admin、客戶端不該出現）：
//   - isAdmin 標記 +「系統管理員擁有所有權限、無需設定」UI（不再 render）
//   - 過期的 hard delete vs soft delete 註解
//
// 保留（這是好的防呆）：
//   - RolePicker 過濾 SYSADMIN code 不顯示給客戶（handleRolePickerSearch 仍 filter）
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Briefcase, UsersRound, Warehouse as WarehouseIcon } from 'lucide-react';

import { cn } from '@design/utils/cn';
import { USER_FIELDS, type UserZone } from '@/features/nx01/shell/zones';
// 02 第四批 軌 1 2026-06-07：員工列表姓名前小圓頭像
import { UserAvatarSmall } from '@/features/shared/user-photo/UserPhotoManager';
// 05 批 T3 2026-06-07：UserTeam 衛星 API（員工隸屬組 m-n、主組旗標、isLeader、自動帶 hrDepartmentId）
import {
  assignUserTeam,
  listUserTeams,
  revokeUserTeam,
  setUserTeamLeader,
  setUserTeamPrimary,
  type UserTeamDto,
} from '@data/endpoints/nx01/api/user-team';
import { listTeams as listTeamsApi, type TeamDto } from '@data/endpoints/nx01/api/team';
import { ConfirmDialog, type ConfirmState } from '@/features/nx01/shell/ui/ConfirmDialog';
import { EntityPickerDialog } from '@design/components/multi-select-modal/EntityPickerDialog';
import { ToastStack, useToast } from '@design/components/toast/ToastStack';
import {
  ErpToolbar,
  type ErpMode,
  type ExportFormat,
} from '@/features/nx01/shell/ui/ErpToolbar';
import { exportTable } from '@/features/nx01/shell/hooks/useExportTable';
import { SearchPanel } from '@/features/nx01/shell/ui/SearchPanel';
import {
  MasterTable,
  type MasterTableColumn,
} from '@/features/nx01/shell/ui/MasterTable';
import { MasterDetailScroll, EmptyDetail } from '@/features/nx01/shell/ui/MasterDetail';
import { FormField } from '@/features/nx01/shell/ui/FormField';
// 2026-06-28 執行長：清除麵包屑（PageHeader 不再 render）
import { useDirtyGuard } from '@design/hooks/useDirtyGuard';
import { MasterPageHead } from '@/features/nx01/shell/master-nav';
import { formatDateTimeZh } from '@/features/nx01/shell/entity-master/format';
import {
  createUser,
  listUsers,
  setUserActive,
  updateUser,
  type UserDto,
} from '@data/endpoints/nx01/api/user';
import { listRoles, type RoleDto } from '@data/endpoints/nx01/api/role';
import {
  assignUserRole,
  listUserRoles,
  revokeUserRole,
  setUserRolePrimary,
  type UserRoleDto,
} from '@data/endpoints/nx01/api/user-role';
import {
  assignUserWarehouse,
  listUserWarehouses,
  revokeUserWarehouse,
  type UserWarehouseDto,
} from '@data/endpoints/nx01/api/user-warehouse';
import { listWarehouses, type WarehouseDto } from '@data/endpoints/nx01/api/warehouse';
import { useColumnsPref } from '@/features/nx01/shell/ui/columns-config/useColumnsPref';
import {
  type SortableOption,
  type SortOrder,
} from '@/features/nx01/shell/ui/sort-config/SortMenuButton';

/** 預設密碼（與 CreateUserDialog 同步）：新建員工首次登入後系統強制改密 */
const DEFAULT_PASSWORD = 'changeme';

import { UserFormZoned } from './UserFormZoned';
import { PositionAddDialog } from './PositionAddDialog';
import { WarehouseAddDialog } from './WarehouseAddDialog';
import {
  emptyUserDraft,
  userDraftToBody,
  userRowToDraft,
  type UserDraft,
} from './helpers';

/** B2~B5：staged ops 型別、按 S 才寫入後端、按 C 全清 */
type RoleOp =
  | { kind: 'add'; role: RoleDto }
  | { kind: 'remove'; userRoleId: string }
  | { kind: 'setPrimary'; userRoleId: string };

type WarehouseOp =
  | { kind: 'add'; warehouse: WarehouseDto }
  | { kind: 'remove'; userWarehouseId: string };

type Tab = 'list' | 'detail';

export type UserZonedPageProps = {
  pageCategory: string;
  pageTitle: string;
  editableZones?: Set<UserZone>;
  entityNoun: string;
};

export function UserZonedPage({
  // pageCategory 保留於 props 型別（向後相容）、麵包屑移除後不再使用
  pageTitle,
  editableZones,
  entityNoun,
}: UserZonedPageProps) {
  const { toasts, showToast } = useToast();

  // 2026-06-24 執行長拍板：取消分頁、固定撈前 100 筆
  const [rows, setRows] = useState<UserDto[]>([]);
  const [total, setTotal] = useState(0);
  const pageSize = 100;
  const [showInactive, setShowInactive] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [debouncedKw, setDebouncedKw] = useState('');
  const [reloadTick, setReloadTick] = useState(0);
  const [loading, setLoading] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<ErpMode>('browse');
  const [tab, setTab] = useState<Tab>('list');
  const [creating, setCreating] = useState(false);
  const [activeZone, setActiveZone] = useState<UserZone>('basic');

  const [draft, setDraft] = useState<UserDraft>({});
  const [original, setOriginal] = useState<UserDraft>({});

  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  // 2026-06-18 Alt+O 觸發 O 匯出 dropdown（受控）
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  // 2026-06-18 表頭拖拉重排欄位順序 + localStorage 記憶（B 方案、Excel-like）
  //   I 欄位 dialog/按鈕已退役、user 直接拖表頭即可
  const COLUMN_ALL_KEYS = useMemo(
    () => ['username', 'displayName', 'email', 'phone', 'isActive'],
    [],
  );
  const {
    visibleKeys: columnsOrder,
    setVisibleKeys: setColumnsOrder,
  } = useColumnsPref('master-users:columns:v1', COLUMN_ALL_KEYS, COLUMN_ALL_KEYS);

  // 2026-06-18 M 排序 dropdown menu（受控、Alt+M 程式打開）
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const SORT_OPTIONS: SortableOption[] = useMemo(
    () => [
      { key: 'userAccount', label: '員工編號' },
      { key: 'userName', label: '姓名' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: '電話' },
      { key: 'isActive', label: '狀態' },
      { key: 'hireDate', label: '到職日' },
      { key: 'leftAt', label: '離職日' },
      { key: 'lastLoginAt', label: '最近登入時間' },
      { key: 'createdAt', label: '建立時間' },
    ],
    [],
  );

  // ── B2~B5：staged ops + picker dialogs + 載入的 user_role / user_warehouse ──
  const [selectedUserRoles, setSelectedUserRoles] = useState<UserRoleDto[]>([]);
  const [selectedUserWarehouses, setSelectedUserWarehouses] = useState<UserWarehouseDto[]>([]);
  const [rolesReloadTick, setRolesReloadTick] = useState(0);
  const [warehousesReloadTick, setWarehousesReloadTick] = useState(0);
  const [pendingRoleOps, setPendingRoleOps] = useState<RoleOp[]>([]);
  const [pendingWarehouseOps, setPendingWarehouseOps] = useState<WarehouseOp[]>([]);
  const [rolePickerOpen, setRolePickerOpen] = useState(false);
  const [warehousePickerOpen, setWarehousePickerOpen] = useState(false);

  // 05 批 T3 2026-06-07：UserTeam 衛星即時範式（非 staged、寫操作直接 PATCH）
  // 理由：「組」操作頻率低於職務、即時範式複雜度大幅降低；後續可再考慮對齊 staged。
  const [selectedUserTeams, setSelectedUserTeams] = useState<UserTeamDto[]>([]);
  const [teamsReloadTick, setTeamsReloadTick] = useState(0);
  const [teamPickerOpen, setTeamPickerOpen] = useState(false);

  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedKw(keyword), 300);
    return () => clearTimeout(t);
  }, [keyword]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listUsers({
        page: 1,
        pageSize,
        q: debouncedKw,
        // 垃圾桶語意：開=只看停用列（再啟用入口）、關=只看啟用列（2026-07-21 執行長回饋：啟用列不該混進垃圾桶）
        isActive: showInactive ? false : true,
        sortBy: sortKey ?? undefined,
        sortOrder: sortKey ? sortOrder : undefined,
      });
      setRows(res.items);
      setTotal(res.total);
    } catch (e) {
      showToast((e as Error)?.message ?? '載入失敗', 'danger');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedKw, pageSize, showInactive, reloadTick, sortKey, sortOrder]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (rows.length === 0) {
      if (selectedId !== null) setSelectedId(null);
      return;
    }
    if (!rows.some((r) => r.id === selectedId)) setSelectedId(rows[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const selected = useMemo(
    () => rows.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId],
  );

  // 2026-06-24 取消分頁後：itemIndex / 項目級導航不再跨頁、純 rows 內 ±1
  const localIdx = rows.findIndex((r) => r.id === selectedId);
  const itemIndex = localIdx >= 0 ? localIdx + 1 : 0;
  const itemTotal = rows.length;
  // 2026-06-18 全鍵盤範式:進主檔 / 存檔 / 取消後自動 focus 第一 row（user 可直接用 ↑↓ 切換）
  const focusFirstRowRef = useRef<boolean>(true); // mount 時預設 true
  useEffect(() => {
    if (rows.length === 0) return;
    if (focusFirstRowRef.current) {
      const firstId = rows[0].id;
      setSelectedId(firstId);
      focusFirstRowRef.current = false;
      requestAnimationFrame(() => {
        document
          .querySelector<HTMLElement>(`[data-row-id="${firstId}"]`)
          ?.focus();
      });
    }
  }, [rows]);

  // 2026-06-24 選中列捲入視野（鍵盤 ↑↓ 切列時、跟 EntityMasterPage 同範式）
  useEffect(() => {
    if (!selectedId || tab !== 'list') return;
    document
      .querySelector(`[data-row-id="${selectedId}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [selectedId, tab]);

  const handleJumpFirstItem = useCallback(() => {
    if (rows.length === 0) return;
    setSelectedId(rows[0].id);
  }, [rows]);
  const handleJumpLastItem = useCallback(() => {
    if (rows.length === 0) return;
    setSelectedId(rows[rows.length - 1].id);
  }, [rows]);
  const handlePrevItem = useCallback(() => {
    if (localIdx > 0) setSelectedId(rows[localIdx - 1].id);
  }, [localIdx, rows]);
  const handleNextItem = useCallback(() => {
    if (localIdx >= 0 && localIdx < rows.length - 1) {
      setSelectedId(rows[localIdx + 1].id);
    } else if (localIdx < 0 && rows.length > 0) {
      setSelectedId(rows[0].id);
    }
  }, [localIdx, rows]);

  // B2~B5：load roles + warehouses when entering detail
  useEffect(() => {
    if (!selectedId || tab !== 'detail') {
      setSelectedUserRoles([]);
      return;
    }
    let alive = true;
    void (async () => {
      try {
        const res = await listUserRoles({ userId: selectedId, isActive: true, pageSize: 100 });
        if (alive) setSelectedUserRoles(res.items);
      } catch {
        if (alive) setSelectedUserRoles([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [selectedId, tab, rolesReloadTick]);

  useEffect(() => {
    if (!selectedId || tab !== 'detail') {
      setSelectedUserWarehouses([]);
      return;
    }
    let alive = true;
    void (async () => {
      try {
        const res = await listUserWarehouses({ userId: selectedId, isActive: true, pageSize: 100 });
        if (alive) setSelectedUserWarehouses(res.items);
      } catch {
        if (alive) setSelectedUserWarehouses([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [selectedId, tab, warehousesReloadTick]);

  // 05 批 T3 2026-06-07：載入 selected user 的 teams（permission zone 顯示）
  useEffect(() => {
    if (!selectedId || tab !== 'detail') {
      setSelectedUserTeams([]);
      return;
    }
    let alive = true;
    void (async () => {
      try {
        const res = await listUserTeams({ userId: selectedId, isActive: true, pageSize: 100 });
        if (alive) setSelectedUserTeams(res.items);
      } catch {
        if (alive) setSelectedUserTeams([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [selectedId, tab, teamsReloadTick]);

  // 切換 selected / 退出編輯 → 清 staged ops
  useEffect(() => {
    setPendingRoleOps([]);
    setPendingWarehouseOps([]);
  }, [selectedId, mode]);

  // 2026-06-23 修瀏覽模式 detail 全 "—"：UserFormZoned 瀏覽欄位讀 draft、
  // 但編輯才 setDraft、瀏覽 selected 時 draft 是空 → 全顯示 "—"。
  // 在瀏覽模式下、selected 變動就同步把 selected → draft，讓欄位顯示真實值。
  useEffect(() => {
    if (mode === 'edit') return;
    if (creating) return;
    if (!selected) {
      setDraft({});
      return;
    }
    const d = userRowToDraft(selected as unknown as Parameters<typeof userRowToDraft>[0]);
    setDraft(d);
  }, [selected, mode, creating]);

  // B2~B5：staged ops derived state
  const stagedRemovedRoleIds = useMemo(
    () =>
      new Set(
        pendingRoleOps
          .filter((o): o is Extract<RoleOp, { kind: 'remove' }> => o.kind === 'remove')
          .map((o) => o.userRoleId),
      ),
    [pendingRoleOps],
  );
  const stagedPrimaryRoleId = useMemo(() => {
    const last = [...pendingRoleOps].reverse().find((o) => o.kind === 'setPrimary');
    return last && last.kind === 'setPrimary' ? last.userRoleId : null;
  }, [pendingRoleOps]);
  const stagedAddedRoles = useMemo(
    () =>
      pendingRoleOps
        .filter((o): o is Extract<RoleOp, { kind: 'add' }> => o.kind === 'add')
        .map((o) => o.role),
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

  const isDirty = useMemo(() => {
    if (mode !== 'edit') return false;
    const draftDirty = Object.keys({ ...draft, ...original }).some(
      (k) => String(draft[k] ?? '') !== String(original[k] ?? ''),
    );
    return draftDirty || pendingRoleOps.length > 0 || pendingWarehouseOps.length > 0;
  }, [mode, draft, original, pendingRoleOps, pendingWarehouseOps]);

  const performCancel = useCallback(() => {
    setMode('browse');
    setCreating(false);
    setDraft({});
    setOriginal({});
    setActiveZone('basic');
    setTab('list');
    // 2026-06-18 全鍵盤範式:cancel 後回 list tab + 自動 focus 第一 row
    focusFirstRowRef.current = true;
    // 若 rows 已在記憶體（沒 reload）也立即 focus
    if (rows.length > 0) {
      const firstId = rows[0].id;
      setSelectedId(firstId);
      requestAnimationFrame(() => {
        document
          .querySelector<HTMLElement>(`[data-row-id="${firstId}"]`)
          ?.focus();
      });
      focusFirstRowRef.current = false;
    }
  }, [rows]);

  // 2026-06-18 對齊 Hana demo：新增不再走 modal、直接切右側詳細頁 + creating 模式
  // 客戶老闆按 A → 右側 form 空白、basic zone、輸入姓名按 S 存檔
  // 密碼用 DEFAULT_PASSWORD（系統自動）、員編留空時後端 SeqCounterService 自動產 Y+4 碼
  const handleCreate = useCallback(() => {
    const empty = emptyUserDraft();
    setCreating(true);
    setSelectedId(null);
    setDraft(empty);
    setOriginal(empty);
    setMode('edit');
    setTab('detail');
    setActiveZone('basic');
    setPendingRoleOps([]);
    setPendingWarehouseOps([]);
  }, []);

  // B2~B5：picker handlers + staged ops（從舊版 UserMasterPage 移植）
  const effectiveAssignedRoleIds = useMemo(() => {
    const s = new Set<string>();
    for (const ur of selectedUserRoles) {
      if (!stagedRemovedRoleIds.has(ur.id)) s.add(ur.roleId);
    }
    for (const r of stagedAddedRoles) s.add(r.id);
    return s;
  }, [selectedUserRoles, stagedRemovedRoleIds, stagedAddedRoles]);

  const lockedPrimaryRoleIds = useMemo(() => {
    const primaryUserRoleId =
      stagedPrimaryRoleId ?? selectedUserRoles.find((r) => r.isPrimary)?.id ?? null;
    const ur = selectedUserRoles.find((r) => r.id === primaryUserRoleId);
    return ur ? new Set([ur.roleId]) : new Set<string>();
  }, [stagedPrimaryRoleId, selectedUserRoles]);

  /** B2：RolePicker 搜尋 — 保留過濾 SYSADMIN（防客戶誤指派 Innova admin 職務） */
  const handleRolePickerSearch = useCallback(async (q: string) => {
    const res = await listRoles({ q: q || undefined, isActive: true, pageSize: 50 });
    return {
      ...res,
      items: res.items.filter((r) => String(r.code ?? '').trim().toUpperCase() !== 'SYSADMIN'),
    };
  }, []);

  const handleRoleManageApply = useCallback(
    async (added: RoleDto[], removedRoleIds: string[]) => {
      setPendingRoleOps((prev) => {
        let next = [...prev];
        for (const role of added) {
          const existingUr = selectedUserRoles.find((ur) => ur.roleId === role.id);
          if (existingUr && next.some((o) => o.kind === 'remove' && o.userRoleId === existingUr.id)) {
            next = next.filter((o) => !(o.kind === 'remove' && o.userRoleId === existingUr.id));
          } else if (!next.some((o) => o.kind === 'add' && o.role.id === role.id)) {
            next.push({ kind: 'add', role });
          }
        }
        for (const roleId of removedRoleIds) {
          if (next.some((o) => o.kind === 'add' && o.role.id === roleId)) {
            next = next.filter((o) => !(o.kind === 'add' && o.role.id === roleId));
            continue;
          }
          const ur = selectedUserRoles.find((u) => u.roleId === roleId);
          if (ur && !next.some((o) => o.kind === 'remove' && o.userRoleId === ur.id)) {
            next.push({ kind: 'remove', userRoleId: ur.id });
          }
        }
        return next;
      });
    },
    [selectedUserRoles],
  );

  /** B5：主要職務切換（staged、toggle 模式） */
  const handleSetRolePrimary = useCallback((role: UserRoleDto) => {
    setPendingRoleOps((prev) => {
      const last = [...prev].reverse().find((o) => o.kind === 'setPrimary');
      const lastPrimaryId = last && last.kind === 'setPrimary' ? last.userRoleId : null;
      if (lastPrimaryId === role.id) {
        return prev.filter((o) => !(o.kind === 'setPrimary' && o.userRoleId === role.id));
      }
      return [...prev, { kind: 'setPrimary', userRoleId: role.id }];
    });
  }, []);

  /** B4：撤銷職務（staged、軟刪除、主要職務不可撤） */
  const handleRevokeRole = useCallback(
    (role: UserRoleDto) => {
      setPendingRoleOps((prev) => {
        const alreadyRemoved = prev.some((o) => o.kind === 'remove' && o.userRoleId === role.id);
        if (alreadyRemoved) {
          return prev.filter((o) => !(o.kind === 'remove' && o.userRoleId === role.id));
        }
        const isCurrentlyPrimary = stagedPrimaryRoleId
          ? role.id === stagedPrimaryRoleId
          : role.isPrimary;
        if (isCurrentlyPrimary) {
          showToast('主要職務不可撤銷，請先將其他職務設為主要', 'danger');
          return prev;
        }
        return [...prev, { kind: 'remove', userRoleId: role.id }];
      });
    },
    [stagedPrimaryRoleId, showToast],
  );

  const effectiveAssignedWarehouseIds = useMemo(() => {
    const s = new Set<string>();
    for (const uw of selectedUserWarehouses) {
      if (!stagedRemovedWarehouseIds.has(uw.id)) s.add(uw.warehouseId);
    }
    for (const w of stagedAddedWarehouses) s.add(w.id);
    return s;
  }, [selectedUserWarehouses, stagedRemovedWarehouseIds, stagedAddedWarehouses]);

  const handleWarehousePickerSearch = useCallback(
    (q: string) => listWarehouses({ q: q || undefined, isActive: true, pageSize: 50 }),
    [],
  );

  const handleWarehouseManageApply = useCallback(
    async (added: WarehouseDto[], removedWarehouseIds: string[]) => {
      setPendingWarehouseOps((prev) => {
        let next = [...prev];
        for (const w of added) {
          const existingUw = selectedUserWarehouses.find((uw) => uw.warehouseId === w.id);
          if (
            existingUw &&
            next.some((o) => o.kind === 'remove' && o.userWarehouseId === existingUw.id)
          ) {
            next = next.filter(
              (o) => !(o.kind === 'remove' && o.userWarehouseId === existingUw.id),
            );
          } else if (!next.some((o) => o.kind === 'add' && o.warehouse.id === w.id)) {
            next.push({ kind: 'add', warehouse: w });
          }
        }
        for (const wid of removedWarehouseIds) {
          if (next.some((o) => o.kind === 'add' && o.warehouse.id === wid)) {
            next = next.filter((o) => !(o.kind === 'add' && o.warehouse.id === wid));
            continue;
          }
          const uw = selectedUserWarehouses.find((u) => u.warehouseId === wid);
          if (uw && !next.some((o) => o.kind === 'remove' && o.userWarehouseId === uw.id)) {
            next.push({ kind: 'remove', userWarehouseId: uw.id });
          }
        }
        return next;
      });
    },
    [selectedUserWarehouses],
  );

  /** B4：撤銷倉庫（staged、軟刪除） */
  const handleRevokeWarehouse = useCallback((uw: UserWarehouseDto) => {
    setPendingWarehouseOps((prev) => {
      const alreadyRemoved = prev.some((o) => o.kind === 'remove' && o.userWarehouseId === uw.id);
      if (alreadyRemoved) {
        return prev.filter((o) => !(o.kind === 'remove' && o.userWarehouseId === uw.id));
      }
      return [...prev, { kind: 'remove', userWarehouseId: uw.id }];
    });
  }, []);

  // 05 批 T3 2026-06-07：UserTeam 即時 PATCH handlers（非 staged、寫操作直接落地）
  const handleTeamPickerSearch = useCallback(
    (q: string) => listTeamsApi({ q: q || undefined, isActive: true, pageSize: 50 }),
    [],
  );

  const effectiveAssignedTeamIds = useMemo(
    () => new Set(selectedUserTeams.map((ut) => ut.teamId)),
    [selectedUserTeams],
  );

  /**
   * Picker apply：add → 立即 assign；remove → 立即 revoke。
   * 與 role staged 範式不同（即時範式、保 user.departmentId 同步即時生效）。
   */
  const handleTeamPickerApply = useCallback(
    async (added: TeamDto[], removedTeamIds: string[]) => {
      if (!selectedId) return;
      let ok = 0;
      let fail = 0;
      for (const t of added) {
        try {
          await assignUserTeam({ userId: selectedId, teamId: t.id });
          ok++;
        } catch {
          fail++;
        }
      }
      for (const teamId of removedTeamIds) {
        const ut = selectedUserTeams.find((x) => x.teamId === teamId);
        if (!ut) continue;
        try {
          await revokeUserTeam(ut.id);
          ok++;
        } catch {
          fail++;
        }
      }
      if (fail === 0 && ok > 0) showToast(`已套用 ${ok} 個變更`, 'success');
      else if (fail > 0) showToast(`部分失敗：成功 ${ok} / 失敗 ${fail}`, 'danger');
      setTeamsReloadTick((t) => t + 1);
      setReloadTick((t) => t + 1); // user.departmentId 已自動同步、重 fetch user
    },
    [selectedId, selectedUserTeams, showToast],
  );

  const handleRevokeTeam = useCallback(
    (ut: UserTeamDto) => {
      setConfirm({
        title: '撤銷組',
        message: `確定將「${ut.teamName ?? ut.teamCode ?? ut.teamId}」從此員工撤銷？（軟刪除、保留紀錄${ut.isPrimary ? '；主組撤銷後系統自動把剩餘最新組設為主組' : ''}）`,
        confirmLabel: '撤銷',
        variant: 'danger',
        onConfirm: () => {
          void (async () => {
            try {
              await revokeUserTeam(ut.id);
              showToast('已撤銷', 'success');
              setTeamsReloadTick((t) => t + 1);
              setReloadTick((t) => t + 1);
            } catch (e) {
              showToast((e as Error)?.message ?? '撤銷失敗', 'danger');
            }
          })();
        },
      });
    },
    [showToast],
  );

  const handleSetTeamPrimary = useCallback(
    (ut: UserTeamDto) => {
      if (ut.isPrimary) return;
      void (async () => {
        try {
          await setUserTeamPrimary(ut.id, true);
          showToast(`已設「${ut.teamName ?? ut.teamCode}」為主組`, 'success');
          setTeamsReloadTick((t) => t + 1);
          setReloadTick((t) => t + 1); // user.departmentId 同步
        } catch (e) {
          showToast((e as Error)?.message ?? '設主組失敗', 'danger');
        }
      })();
    },
    [showToast],
  );

  const handleToggleTeamLeader = useCallback(
    (ut: UserTeamDto) => {
      void (async () => {
        try {
          await setUserTeamLeader(ut.id, !ut.isLeader);
          showToast(ut.isLeader ? '已取消組長' : '已標記為組長', 'success');
          setTeamsReloadTick((t) => t + 1);
        } catch (e) {
          showToast((e as Error)?.message ?? '組長切換失敗', 'danger');
        }
      })();
    },
    [showToast],
  );

  const handleEdit = useCallback(() => {
    if (!selected) return;
    const d = userRowToDraft(selected as unknown as Parameters<typeof userRowToDraft>[0]);
    setCreating(false);
    setDraft(d);
    setOriginal(d);
    setMode('edit');
    setTab('detail');
  }, [selected]);

  const performSave = useCallback(async () => {
    const requiredFields = USER_FIELDS.filter((f) => {
      if (f.isSatellite) return false;
      if (!f.required) return false;
      if (editableZones && !editableZones.has(f.zone)) return false;
      return true;
    });
    for (const f of requiredFields) {
      const v = String(draft[f.key] ?? '').trim();
      if (!v) {
        showToast(`「${f.label}」為必填`, 'danger');
        return;
      }
    }
    const body = userDraftToBody(draft, editableZones, { isCreate: creating });

    // 2026-06-18 對齊 demo：creating → createUser；非 creating → updateUser
    let effectiveUserId = selectedId;
    let mainOk = false;
    if (creating) {
      try {
        const created = await createUser({
          ...(body as Record<string, unknown>),
          password: DEFAULT_PASSWORD,
          displayName: String(draft.userName ?? '').trim(),
          username: String(draft.userAccount ?? '').trim() || undefined,
        } as Parameters<typeof createUser>[0]);
        effectiveUserId = created.id;
        mainOk = true;
        showToast(`已建立員工：${created.displayName}（初始密碼 ${DEFAULT_PASSWORD}）`, 'success');
      } catch (e) {
        showToast(`建立失敗：${(e as Error)?.message ?? '未知錯誤'}`, 'danger');
        return;
      }
    } else {
      if (!selectedId) return;
      try {
        await updateUser(selectedId, body);
        mainOk = true;
      } catch (e) {
        showToast(`主檔存檔失敗：${(e as Error)?.message ?? '未知錯誤'}`, 'danger');
        return;
      }
    }
    // B2~B5：apply staged ops（roles + warehouses）
    let roleOk = 0;
    let roleFail = 0;
    for (const op of pendingRoleOps) {
      try {
        if (op.kind === 'add') await assignUserRole({ userId: effectiveUserId!, roleId: op.role.id });
        else if (op.kind === 'remove') await revokeUserRole(op.userRoleId);
        else if (op.kind === 'setPrimary') await setUserRolePrimary(op.userRoleId, true);
        roleOk++;
      } catch {
        roleFail++;
      }
    }
    let whOk = 0;
    let whFail = 0;
    for (const op of pendingWarehouseOps) {
      try {
        if (op.kind === 'add')
          await assignUserWarehouse({ userId: effectiveUserId!, warehouseId: op.warehouse.id });
        else if (op.kind === 'remove') await revokeUserWarehouse(op.userWarehouseId);
        whOk++;
      } catch {
        whFail++;
      }
    }
    if (mainOk && roleFail === 0 && whFail === 0) {
      const parts: string[] = ['主檔已存'];
      if (roleOk > 0) parts.push(`職務 ${roleOk} 變更`);
      if (whOk > 0) parts.push(`倉庫 ${whOk} 變更`);
      showToast(`已存檔（${parts.join('、')}）`, 'success');
    } else {
      showToast(
        `部分變更失敗：職務 ${roleOk}/${pendingRoleOps.length}、倉庫 ${whOk}/${pendingWarehouseOps.length}`,
        'danger',
      );
    }
    setReloadTick((t) => t + 1);
    setRolesReloadTick((t) => t + 1);
    setWarehousesReloadTick((t) => t + 1);
    performCancel();
  }, [creating, draft, editableZones, selectedId, pendingRoleOps, pendingWarehouseOps, performCancel, showToast]);

  const handleSave = useCallback(() => {
    setConfirm({
      title: creating ? '建立新員工' : '存檔變更',
      message: creating
        ? `確定建立員工「${String(draft.userName ?? '')}」？（初始密碼 ${DEFAULT_PASSWORD}、首次登入須改）`
        : `確定儲存對「${selected?.displayName ?? ''}」的變更？`,
      confirmLabel: creating ? '建立' : '存檔',
      onConfirm: () => void performSave(),
    });
  }, [creating, draft, selected, performSave]);

  const handleCancel = useCallback(() => {
    if (!isDirty) {
      performCancel();
      return;
    }
    setConfirm({
      title: '尚有未儲存的變更',
      message: '要先存檔再離開，還是丟棄變更？',
      confirmLabel: '存檔後離開',
      onConfirm: () => void performSave(),
      secondaryAction: { label: '丟棄變更', variant: 'danger', onClick: performCancel },
    });
  }, [isDirty, performCancel, performSave]);

  const handleDelete = useCallback(() => {
    if (!selected) return;
    const turningOff = selected.isActive;
    const label = selected.displayName;
    setConfirm({
      title: turningOff ? `停用${entityNoun}` : `啟用${entityNoun}`,
      message: turningOff
        ? `確定停用「${label}」？（系統不刪資料、停用後可從「顯示停用」恢復）`
        : `確定重新啟用「${label}」？`,
      confirmLabel: turningOff ? '停用' : '啟用',
      variant: turningOff ? 'danger' : 'default',
      onConfirm: () => {
        void (async () => {
          try {
            await setUserActive(selected.id, !selected.isActive);
            showToast(turningOff ? '已停用' : '已啟用', 'success');
            setReloadTick((t) => t + 1);
          } catch (e) {
            // setUserActive 內 assertOk 失敗會丟 Error、message 格式：
            //   `[nxui_base_user_set_active] 409 已達席次上限（X/Y 席）...`
            // 將前綴剝掉、只留客戶看得懂的中文業務訊息
            const raw = (e as Error)?.message ?? '操作失敗';
            const cleaned = raw.replace(/^\[[^\]]+\]\s*\d{3}\s*/, '').trim() || raw;
            showToast(cleaned, 'danger');
          }
        })();
      },
    });
  }, [selected, entityNoun, showToast]);

  const attemptTabChange = useCallback(
    (next: Tab) => {
      if (mode === 'edit' && isDirty) {
        setConfirm({
          title: '尚有未儲存的變更',
          message: '離開編輯要先存檔，還是丟棄變更？',
          confirmLabel: '存檔後離開',
          onConfirm: () => {
            void performSave();
            setTab(next);
          },
          secondaryAction: {
            label: '丟棄變更',
            variant: 'danger',
            onClick: () => {
              performCancel();
              setTab(next);
            },
          },
        });
        return;
      }
      setTab(next);
    },
    [mode, isDirty, performSave, performCancel],
  );

  // [1-2] 2026-06-05：handleExit / Alt+Q 已移除（離開主檔改走星球選單 Alt+X）

  // Phase 2 後續軌:全域 dirty 攔截、編輯模式跨頁跳轉前跳 3-way confirm
  useDirtyGuard(
    () => mode === 'edit' && isDirty,
    useCallback(
      (proceed) => {
        setConfirm({
          title: '尚有未儲存的變更',
          message: '離開此頁要先存檔、還是丟棄變更？',
          confirmLabel: '存檔後離開',
          onConfirm: () => {
            void performSave();
            proceed();
          },
          secondaryAction: {
            label: '丟棄變更',
            variant: 'danger',
            onClick: () => {
              performCancel();
              proceed();
            },
          },
        });
      },
      [performSave, performCancel],
    ),
  );

  const handleExport = useCallback(
    (format: ExportFormat) => {
      // [2-1] 三模式匯出（CSV / PDF / 列印）「所見即所得」
      exportTable(format, {
        title: pageTitle,
        columns: [
          { label: '帳號', get: (r) => r.username },
          { label: '姓名', get: (r) => r.displayName },
          { label: 'Email', get: (r) => r.email ?? '' },
          { label: '電話', get: (r) => r.phone ?? '' },
          { label: '狀態', get: (r) => (r.isActive ? '啟用' : '停用') },
        ],
        rows,
      });
    },
    [rows, pageTitle],
  );

  const toggleSearch = useCallback(() => setSearchOpen((s) => !s), []);

  // 2026-06-24 執行長拍板：滑鼠點旁邊 focus 跑掉、↑↓ 仍要切 row（不依賴 DOM focus）
  // 規則同 EntityMasterPage：
  //   - input/textarea/select/contenteditable focus 時：單鍵 ↑↓/Enter 不接、Alt 系仍接管
  //   - Radix modal/dropdown 開（[data-state="open"][role="dialog"|"menu"]）：全短路、交給 modal
  //   - 其他焦點（body/空白處）：↑↓ 用 selectedId state 切上下、不依賴 DOM
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement | null;
      const tag = tgt?.tagName ?? '';
      const inInput =
        tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' ||
        (tgt?.isContentEditable ?? false);
      const radixOpen = !!document.querySelector(
        '[data-state="open"][role="dialog"], [data-state="open"][role="menu"]',
      );

      if (radixOpen) return;

      if (e.altKey) {
        const k = e.key.toLowerCase();
        const map: Record<string, () => void> = {
          '1': () => attemptTabChange('list'),
          '2': () => attemptTabChange('detail'),
        };
        if (mode === 'browse') {
          Object.assign(map, {
            a: handleCreate,
            e: () => selected && handleEdit(),
            f: toggleSearch,
            d: () => selected && handleDelete(),
            r: () => {
              setReloadTick((t) => t + 1);
              showToast('已重新整理', 'success');
            },
            p: () => handleExport('print'),
            o: () => setExportMenuOpen(true),
            m: () => setSortMenuOpen(true),
          });
        } else {
          Object.assign(map, { s: handleSave, c: handleCancel });
        }
        const fn = map[k];
        if (fn) {
          e.preventDefault();
          fn();
        }
        return;
      }

      if (e.key === 'Escape') {
        if (searchOpen) {
          setSearchOpen(false);
          setKeyword('');
        } else if (mode === 'edit') {
          handleCancel();
        }
        return;
      }

      // 單鍵 ↑↓/Enter：input 焦點不攔
      if (inInput) return;

      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        if (tab !== 'list') return;
        if (tgt?.hasAttribute?.('data-row-id')) return; // row 焦點交給 MasterTable
        if (rows.length === 0) return;
        const idx = rows.findIndex((r) => r.id === selectedId);
        const nextIdx =
          e.key === 'ArrowDown'
            ? Math.min(rows.length - 1, Math.max(0, idx + 1))
            : Math.max(0, idx - 1);
        const nextRow = rows[nextIdx];
        if (nextRow) {
          e.preventDefault();
          setSelectedId(nextRow.id);
        }
        return;
      }

      if (e.key === 'Enter') {
        if (tab !== 'list') return;
        if (tgt?.hasAttribute?.('data-row-id')) return;
        if (!selectedId) return;
        e.preventDefault();
        attemptTabChange('detail');
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    mode,
    tab,
    rows,
    selectedId,
    selected,
    searchOpen,
    attemptTabChange,
    handleCreate,
    handleEdit,
    handleDelete,
    handleSave,
    handleCancel,
    handleExport,
    showToast,
    toggleSearch,
    exportMenuOpen,
    sortMenuOpen,
  ]);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // 全欄位定義（依 user 偏好 visibleKeys 過濾 + 排序）
  const ALL_COLUMN_MAP: Record<string, MasterTableColumn<UserDto>> = useMemo(
    () => ({
      username: {
        key: 'username',
        label: '員工編號',
        minWidthClass: 'min-w-[120px]',
        render: (row) => <span className="font-mono text-[14px]">{row.username}</span>,
      },
      displayName: {
        key: 'displayName',
        label: '姓名',
        minWidthClass: 'min-w-[140px]',
        render: (row) => (
          <span className="flex items-center gap-2">
            <UserAvatarSmall
              userId={row.id}
              hasPhoto={Boolean(row.hasPhoto)}
              displayName={row.displayName}
            />
            <span>{row.displayName}</span>
          </span>
        ),
      },
      email: {
        key: 'email',
        label: 'Email',
        minWidthClass: 'min-w-[180px]',
        render: (row) => <span className="text-xs">{row.email ?? '—'}</span>,
      },
      phone: {
        key: 'phone',
        label: '電話',
        minWidthClass: 'min-w-[110px]',
        render: (row) => <span>{row.phone ?? '—'}</span>,
      },
      isActive: {
        key: 'isActive',
        label: '狀態',
        minWidthClass: 'min-w-[80px]',
        render: (row) => (
          <span className="inline-flex items-center gap-1.5">
            <span
              className={cn(
                'size-2 rounded-full',
                row.isActive
                  ? 'bg-[#22D88F] shadow-[0_0_8px_#22D88F]'
                  : 'bg-[#E26060] shadow-[0_0_8px_#E26060]',
              )}
            />
            <span className={row.isActive ? 'text-[#22D88F]' : 'text-[#E26060]'}>
              {row.isActive ? '啟用' : '停用'}
            </span>
          </span>
        ),
      },
    }),
    [],
  );
  const columns: MasterTableColumn<UserDto>[] = useMemo(
    () => columnsOrder.map((k) => ALL_COLUMN_MAP[k]).filter(Boolean),
    [columnsOrder, ALL_COLUMN_MAP],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden text-foreground">
      <MasterPageHead
        tab={tab}
        onTabChange={attemptTabChange}
        currentPageId="emp"
        detailTitle={
          creating ? `新增${entityNoun}` : selected?.displayName ?? undefined
        }
        detailSubtitle={mode === 'edit' ? (creating ? '新增中' : '編輯中') : '瀏覽'}
        onCreate={handleCreate}
      />
        <ErpToolbar
          mode={mode}
          hasActiveRow={!!selected}
          selectedRowActive={selected?.isActive ?? true}
          selectedRowBuiltin={(selected as { isBuiltin?: boolean } | null)?.isBuiltin ?? false}
          selectionMode={false}
          onToggleSelection={() => {}}
          selectedCount={0}
          itemIndex={itemIndex}
          itemTotal={itemTotal}
          onJumpFirstItem={handleJumpFirstItem}
          onPrevItem={handlePrevItem}
          onNextItem={handleNextItem}
          onJumpLastItem={handleJumpLastItem}
          onCreate={handleCreate}
          onEdit={handleEdit}
          onSearch={toggleSearch}
          onDelete={handleDelete}
          onExport={handleExport}
          sortOptions={SORT_OPTIONS}
          sortKey={sortKey}
          sortOrder={sortOrder}
          onSortChange={(k, o) => {
            setSortKey(k);
            setSortOrder(o);
          }}
          onSortReset={() => {
            setSortKey(null);
            setSortOrder('asc');
          }}
          sortMenuOpen={sortMenuOpen}
          onSortMenuOpenChange={setSortMenuOpen}
          onSortMenuCloseAutoFocus={(e) => {
            if (!selectedId) return;
            const rowEl = document.querySelector<HTMLElement>(
              `[data-row-id="${selectedId}"]`,
            );
            if (rowEl) {
              e.preventDefault();
              rowEl.focus();
            }
          }}
          exportMenuOpen={exportMenuOpen}
          onExportMenuOpenChange={setExportMenuOpen}
          // 2026-06-18 Radix DropdownMenu 預設關閉時 focus 還給 trigger（O 按鈕）
          //   → 攔截後 preventDefault + 手動 focus 回 row、避免再按 ↑↓ 又打開 dropdown
          onExportMenuCloseAutoFocus={(e) => {
            if (!selectedId) return;
            const rowEl = document.querySelector<HTMLElement>(
              `[data-row-id="${selectedId}"]`,
            );
            if (rowEl) {
              e.preventDefault();
              rowEl.focus();
            }
          }}
          onRefresh={() => {
            setReloadTick((t) => t + 1);
            showToast('已重新整理', 'success');
          }}
          onSave={handleSave}
          onCancel={handleCancel}
          showInactive={showInactive}
          onShowInactiveChange={mode === 'browse' && tab === 'list' ? setShowInactive : undefined}
          onBatchEnable={() => {}}
          onBatchDisable={() => {}}
        />
      <SearchPanel
        open={searchOpen}
        value={keyword}
        onChange={setKeyword}
        onClose={() => {
          setSearchOpen(false);
          setKeyword('');
        }}
        placeholder={`搜尋${entityNoun}帳號 / 姓名 / Email...`}
      />
      <div className="flex min-h-0 flex-1 flex-col">
        {tab === 'list' ? (
          <MasterTable<UserDto>
            columns={columns}
            rows={rows}
            getRowId={(r) => r.id}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onOpenDetail={(id) => {
              setSelectedId(id);
              attemptTabChange('detail');
            }}
            selectionMode={false}
            checked={new Set()}
            setChecked={() => {}}
            pageSize={pageSize}
            hidePageSizeArea
            onColumnOrderChange={setColumnsOrder}
            footerHint={
              loading
                ? '載入中...'
                : total > pageSize
                  ? `資料較多、僅顯前 ${pageSize} 筆、請用搜尋過濾`
                  : undefined
            }
            totalCount={total}
          />
        ) : (
          <DetailPane
            creating={creating}
            mode={mode}
            selected={selected}
            draft={draft}
            setDraft={setDraft}
            activeZone={activeZone}
            setActiveZone={setActiveZone}
            editableZones={editableZones}
            entityNoun={entityNoun}
            // B2~B5：roles + warehouses staged 渲染
            selectedUserRoles={selectedUserRoles}
            selectedUserWarehouses={selectedUserWarehouses}
            stagedRemovedRoleIds={stagedRemovedRoleIds}
            stagedAddedRoles={stagedAddedRoles}
            stagedPrimaryRoleId={stagedPrimaryRoleId}
            stagedRemovedWarehouseIds={stagedRemovedWarehouseIds}
            stagedAddedWarehouses={stagedAddedWarehouses}
            onOpenRolePicker={() => setRolePickerOpen(true)}
            onOpenWarehousePicker={() => setWarehousePickerOpen(true)}
            onSetRolePrimary={handleSetRolePrimary}
            onRevokeRole={handleRevokeRole}
            onRevokeWarehouse={handleRevokeWarehouse}
            // 05 批 T3 2026-06-07：teams 即時範式
            selectedUserTeams={selectedUserTeams}
            onOpenTeamPicker={() => setTeamPickerOpen(true)}
            onSetTeamPrimary={handleSetTeamPrimary}
            onToggleTeamLeader={handleToggleTeamLeader}
            onRevokeTeam={handleRevokeTeam}
            onRequestSave={handleSave}
          />
        )}
      </div>
      <ToastStack toasts={toasts} />
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
      {/* 2026-06-18 對齊 demo：新增改走右側詳細頁 creating 模式，CreateUserDialog 已退役 */}
      {/* 2026-06-18 表頭拖拉重排（dnd-kit）取代 I 欄位 dialog、ColumnsConfigDialog 已退役 */}
      {/* 2026-06-18 M 排序 dropdown menu 直接掛在 ErpToolbar 內、不需獨立 mount */}
      {/* B2~B5：role / warehouse pickers */}
      {/* 2026-06-23 執行長拍板：取代舊 EntityPickerDialog 改用單筆新增 dialog */}
      <PositionAddDialog
        open={rolePickerOpen}
        onClose={() => setRolePickerOpen(false)}
        userId={selected?.id ?? ''}
        onSuccess={() => {
          setReloadTick((t) => t + 1);
          setTeamsReloadTick((t) => t + 1);
          showToast('已新增職務', 'success');
        }}
      />
      <WarehouseAddDialog
        open={warehousePickerOpen}
        onClose={() => setWarehousePickerOpen(false)}
        userId={selected?.id ?? ''}
        onSuccess={() => {
          setReloadTick((t) => t + 1);
          showToast('已新增隸屬據點', 'success');
        }}
      />
      {/* 05 批 T3 2026-06-07：組 picker（即時 PATCH 範式、apply 後立即寫 DB） */}
      <EntityPickerDialog<TeamDto>
        open={teamPickerOpen}
        onClose={() => setTeamPickerOpen(false)}
        title="管理隸屬組"
        subtitle="Manage Teams"
        icon={UsersRound}
        searchPlaceholder="搜尋組代碼 / 名稱..."
        search={handleTeamPickerSearch}
        getId={(t) => t.id}
        getLabel={(t) => t.name}
        getDescription={(t) => (t.departmentName ? `${t.code} · ${t.departmentName}` : t.code)}
        preselectedIds={effectiveAssignedTeamIds}
        onApplyChanges={handleTeamPickerApply}
        onApplied={(addedCount, removedCount) =>
          showToast(
            `已套用：新增 ${addedCount} · 撤銷 ${removedCount}（立即寫入、主組決定員工部門）`,
            'success',
          )
        }
      />
      <nav ref={sidebarRef} className="sr-only" aria-hidden />
    </div>
  );
}

function DetailPane({
  creating,
  mode,
  selected,
  draft,
  setDraft,
  activeZone,
  setActiveZone,
  editableZones,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  entityNoun,
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
  onRequestSave,
}: {
  creating: boolean;
  mode: ErpMode;
  selected: UserDto | null;
  draft: UserDraft;
  setDraft: (next: UserDraft) => void;
  activeZone: UserZone;
  setActiveZone: (z: UserZone) => void;
  editableZones?: Set<UserZone>;
  entityNoun: string;
  selectedUserRoles: UserRoleDto[];
  selectedUserWarehouses: UserWarehouseDto[];
  stagedRemovedRoleIds: Set<string>;
  stagedAddedRoles: RoleDto[];
  stagedPrimaryRoleId: string | null;
  stagedRemovedWarehouseIds: Set<string>;
  stagedAddedWarehouses: WarehouseDto[];
  onOpenRolePicker: () => void;
  onOpenWarehousePicker: () => void;
  onSetRolePrimary: (role: UserRoleDto) => void;
  onRevokeRole: (role: UserRoleDto) => void;
  onRevokeWarehouse: (uw: UserWarehouseDto) => void;
  // 05 批 T3 2026-06-07：teams 即時範式 props
  selectedUserTeams: UserTeamDto[];
  onOpenTeamPicker: () => void;
  onSetTeamPrimary: (ut: UserTeamDto) => void;
  onToggleTeamLeader: (ut: UserTeamDto) => void;
  onRevokeTeam: (ut: UserTeamDto) => void;
  onRequestSave: () => void;
}) {
  const formRef = useRef<HTMLDivElement>(null);
  const editing = mode === 'edit';

  useEffect(() => {
    if (!editing) return;
    const el = formRef.current?.querySelector<HTMLElement>(
      'input, select, textarea, [data-kbd-select], button',
    );
    el?.focus();
  }, [editing, creating, selected?.id, activeZone]);

  const handleFormKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    const t = e.target as HTMLElement;
    if (t.tagName.toLowerCase() === 'textarea') return;
    if (t.hasAttribute('data-kbd-select')) return;
    e.preventDefault();
    const els = Array.from(
      formRef.current?.querySelectorAll<HTMLElement>(
        'input, select, textarea, [data-kbd-select]',
      ) ?? [],
    ).filter((el) => !(el as HTMLInputElement).disabled && el.offsetParent !== null);
    const idx = els.indexOf(t);
    if (idx >= 0 && idx < els.length - 1) els[idx + 1]?.focus();
    else onRequestSave();
  };

  if (mode !== 'edit' && !selected) {
    return <EmptyDetail message={`從「資料瀏覽」選一筆`} />;
  }

  return (
    <MasterDetailScroll scrollKey={selected?.id ?? (creating ? '__new__' : null)}>
      <div className="px-4 py-4 sm:px-6">
        {/* 2026-06-18 SectionHeader 已搬到 MasterPageHead tabs 同排 */}
        <div ref={formRef} data-master-form onKeyDown={handleFormKey}>
          <UserFormZoned
            mode={mode}
            creating={creating}
            draft={draft}
            setDraft={setDraft}
            activeZone={activeZone}
            setActiveZone={setActiveZone}
            editableZones={editableZones}
            // 02 第四批 軌 1 2026-06-07：傳當前員工 id + 大頭貼旗標、給大頭貼 sub-page 連結用
            selectedUserId={selected?.id ?? null}
            selectedHasPhoto={selected?.hasPhoto ?? false}
            // B2~B5：傳 roles + warehouses 給 permission zone inline 渲染
            selectedUserRoles={selectedUserRoles}
            selectedUserWarehouses={selectedUserWarehouses}
            stagedRemovedRoleIds={stagedRemovedRoleIds}
            stagedAddedRoles={stagedAddedRoles}
            stagedPrimaryRoleId={stagedPrimaryRoleId}
            stagedRemovedWarehouseIds={stagedRemovedWarehouseIds}
            stagedAddedWarehouses={stagedAddedWarehouses}
            onOpenRolePicker={onOpenRolePicker}
            onOpenWarehousePicker={onOpenWarehousePicker}
            onSetRolePrimary={onSetRolePrimary}
            onRevokeRole={onRevokeRole}
            onRevokeWarehouse={onRevokeWarehouse}
            // 05 批 T3 2026-06-07：teams 即時範式（permission zone TeamsInlineSection）
            selectedUserTeams={selectedUserTeams}
            onOpenTeamPicker={onOpenTeamPicker}
            onSetTeamPrimary={onSetTeamPrimary}
            onToggleTeamLeader={onToggleTeamLeader}
            onRevokeTeam={onRevokeTeam}
            // 2026-06-23 audit 區搬到帳號狀況下方（執行長拍板）
            auditData={
              !creating && selected
                ? {
                    createdAt: selected.createdAt,
                    createdByUsername: selected.createdByUsername,
                    createdByName: selected.createdByName,
                    updatedAt: selected.updatedAt,
                    updatedByUsername: selected.updatedByUsername,
                    updatedByName: selected.updatedByName,
                  }
                : undefined
            }
          />
        </div>
      </div>
    </MasterDetailScroll>
  );
}

function auditPerson(username: unknown, name: unknown): string {
  const n = (name as string) || '';
  const u = (username as string) || '';
  if (n && u) return `${n}（${u}）`;
  return n || u || '—';
}
