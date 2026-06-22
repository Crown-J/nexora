// apps/nx-ui/src/features/nx01/location/structure/LocationStructurePage.tsx
// 據點架構圖 B-1（接真 API、2026-06-22 重寫）
//
// 結構：tree 三層（據點 → 倉庫 → 庫位）+ list-with-extra
//   - site 層：list = 子倉庫；extra = 員工聯集（read-only）+ 加上「指派員工」按鈕灰
//   - warehouse 層：list = 子庫位；extra = 倉庫負責人 + 員工歸屬（可指派/換主要/移除）
//   - location 層：list = []；extra = null
//
// 執行長 2026-06-22 拍板 B-1 案：員工指派到「倉庫」、據點透過 user_warehouse 推導
// 倉庫負責人露出（warehouse.managerUserId）+ 換負責人按鈕
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, FolderTree, Layers, Map as MapIcon, Package, Users2, Warehouse } from 'lucide-react';

import { MasterBatchShell } from '@design/components/master-batch';
import type { MasterBatchConfig } from '@design/components/master-batch';
import { EntityPickerDialog } from '@design/components/multi-select-modal/EntityPickerDialog';
import type { PagedResult } from '@data/types/nx01/api';
import { listSites, type SiteDto } from '@data/endpoints/nx01/api/site';
import {
  listWarehouses,
  updateWarehouse,
  type WarehouseDto,
} from '@data/endpoints/nx01/api/warehouse';
import { listLocation } from '@data/endpoints/shared/master/location/api/location';
import type { LocationDto } from '@data/types/shared/master/location';
import { listUsers, type UserDto } from '@data/endpoints/nx01/api/user';
import {
  assignUserWarehouse,
  listUserWarehouses,
  revokeUserWarehouse,
  setUserWarehousePrimary,
  type UserWarehouseDto,
} from '@data/endpoints/nx01/api/user-warehouse';
import {
  listWarehouseZones,
  type WarehouseZoneRow,
} from '@data/endpoints/nx01/api/warehouse-zone';

import { EmployeeAssignmentSection, type EmployeeAssignmentRow } from './EmployeeAssignmentSection';

type LocationNodeType = 'site' | 'warehouse' | 'zone' | 'location';

type LocationNode = {
  id: string;
  type: LocationNodeType;
  label: string;
  siteId?: string;
  warehouseId?: string;
  zoneId?: string;
  locationId?: string;
};

export function LocationStructurePage() {
  const [sites, setSites] = useState<SiteDto[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([]);
  const [zones, setZones] = useState<WarehouseZoneRow[]>([]);
  const [locations, setLocations] = useState<LocationDto[]>([]);
  /** Map<warehouseId, EmployeeAssignmentRow[]> */
  const [warehouseEmployees, setWarehouseEmployees] = useState<Map<string, EmployeeAssignmentRow[]>>(
    new Map(),
  );
  const [loading, setLoading] = useState(true);
  const [pickerWarehouseId, setPickerWarehouseId] = useState<string | null>(null);
  const [managerPickerWarehouseId, setManagerPickerWarehouseId] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  // ---------- 載入主資料 ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [siteRes, whRes, zoneRes, locRes] = await Promise.all([
          listSites({ pageSize: 100, isActive: true }),
          listWarehouses({ pageSize: 200, isActive: true }),
          listWarehouseZones({ pageSize: 500, isActive: true }),
          listLocation({ page: 1, pageSize: 500, isActive: true }),
        ]);
        if (cancelled) return;
        setSites(siteRes.items);
        setWarehouses(whRes.items);
        setZones(zoneRes.rows);
        setLocations(locRes.items);

        // 對每個倉庫並行 fetch active 員工歸屬
        const empMap = new Map<string, EmployeeAssignmentRow[]>();
        await Promise.all(
          whRes.items.map(async (w) => {
            const r = await listUserWarehouses({
              warehouseId: w.id,
              isActive: true,
              pageSize: 100,
            }).catch(() => null);
            if (!r) return;
            empMap.set(
              w.id,
              r.items.map((uw: UserWarehouseDto) => ({
                assignmentId: uw.id,
                userId: uw.userId,
                userAccount: uw.userAccount,
                userDisplayName: uw.userDisplayName,
                isPrimary: uw.isPrimary,
              })),
            );
          }),
        );
        if (cancelled) return;
        setWarehouseEmployees(empMap);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

  const triggerReload = useCallback(() => setReloadTick((t) => t + 1), []);

  // ---------- 樹結構 ----------
  const treeRoots = useCallback(
    (): LocationNode[] =>
      sites.map((s) => ({
        id: `site:${s.id}`,
        type: 'site',
        label: s.name + (s.isMain ? '（總部）' : ''),
        siteId: s.id,
      })),
    [sites],
  );

  const treeChildren = useCallback(
    (n: LocationNode): LocationNode[] => {
      if (n.type === 'site') {
        return warehouses
          .filter((w) => w.siteId === n.siteId)
          .map((w) => ({
            id: `warehouse:${w.id}`,
            type: 'warehouse',
            label: w.name,
            siteId: w.siteId ?? undefined,
            warehouseId: w.id,
          }));
      }
      if (n.type === 'warehouse') {
        return zones
          .filter((z) => z.warehouseId === n.warehouseId)
          .map((z) => ({
            id: `zone:${z.id}`,
            type: 'zone',
            label: `${z.code} · ${z.name}`,
            warehouseId: z.warehouseId,
            zoneId: z.id,
          }));
      }
      if (n.type === 'zone') {
        return locations
          .filter((l) => (l as LocationDto & { zoneId?: string | null }).zoneId === n.zoneId)
          .map((l) => ({
            id: `location:${l.id}`,
            type: 'location',
            label: l.code,
            warehouseId: l.warehouseId,
            locationId: l.id,
          }));
      }
      return [];
    },
    [warehouses, zones, locations],
  );

  // 員工聯集（site 層 distinct by userId）
  const employeesOfSite = useCallback(
    (siteId: string): EmployeeAssignmentRow[] => {
      const seen = new Map<string, EmployeeAssignmentRow>();
      for (const w of warehouses) {
        if (w.siteId !== siteId) continue;
        const list = warehouseEmployees.get(w.id) ?? [];
        for (const e of list) {
          if (!seen.has(e.userId)) seen.set(e.userId, e);
        }
      }
      return Array.from(seen.values());
    },
    [warehouses, warehouseEmployees],
  );

  const membersOf = useCallback(
    (n: LocationNode): LocationNode[] => treeChildren(n),
    [treeChildren],
  );

  // ---------- 倉庫負責人操作 ----------
  const handleChangeManager = useCallback(
    async (warehouseId: string, newManagerId: string | null) => {
      try {
        await updateWarehouse(warehouseId, { managerUserId: newManagerId });
        triggerReload();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        alert(`換負責人失敗：${msg}`);
      }
    },
    [triggerReload],
  );

  // ---------- 員工歸屬操作 ----------
  const handleRevoke = useCallback(
    async (assignmentId: string) => {
      try {
        await revokeUserWarehouse(assignmentId);
        triggerReload();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        alert(`移除失敗：${msg}`);
      }
    },
    [triggerReload],
  );

  const handleTogglePrimary = useCallback(
    async (assignmentId: string, currentPrimary: boolean) => {
      try {
        await setUserWarehousePrimary(assignmentId, !currentPrimary);
        triggerReload();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        alert(`切換主要倉失敗：${msg}`);
      }
    },
    [triggerReload],
  );

  // ---------- config ----------
  const config = useMemo<MasterBatchConfig<LocationNode, LocationNode>>(
    () => ({
      title: '據點架構圖',
      category: '據點與倉庫',
      desc: '據點 → 倉庫 → 分區 → 庫位。員工指派到「倉庫」、據點透過倉庫推導員工。倉庫節點可設定負責人。',
      subjectIcon: FolderTree,
      subjectNoun: '組織節點',
      memberNoun: '子節點',
      memberUnit: '項',
      addLabel: '指派員工',
      searchPlaceholder: '搜尋據點 / 倉庫…',

      leftMode: 'tree',
      treeRoots,
      treeChildren,
      isSelectable: () => true,
      defaultExpandedIds: () =>
        sites.flatMap((s) => [
          `site:${s.id}`,
          ...warehouses.filter((w) => w.siteId === s.id).map((w) => `warehouse:${w.id}`),
        ]),
      subjectId: (n) => n.id,
      subjectTitle: (n) => n.label,
      subjectCount: (n) => {
        if (n.type === 'site') return warehouses.filter((w) => w.siteId === n.siteId).length;
        if (n.type === 'warehouse') return zones.filter((z) => z.warehouseId === n.warehouseId).length;
        if (n.type === 'zone')
          return locations.filter(
            (l) => (l as LocationDto & { zoneId?: string | null }).zoneId === n.zoneId,
          ).length;
        return undefined;
      },

      rightMode: 'list-with-extra',
      members: membersOf,
      memberId: (m) => m.id,
      renderMember: (m) => <ChildNodeRow node={m} />,

      renderExtra: (n) => {
        if (n.type === 'site') {
          return (
            <EmployeeAssignmentSection
              variant="site"
              siteName={n.label}
              employees={employeesOfSite(n.siteId!)}
            />
          );
        }
        if (n.type === 'warehouse') {
          const w = warehouses.find((x) => x.id === n.warehouseId);
          return (
            <EmployeeAssignmentSection
              variant="warehouse"
              warehouseName={n.label}
              managerName={w?.managerUserName ?? null}
              managerAccount={w?.managerUserAccount ?? null}
              employees={warehouseEmployees.get(n.warehouseId!) ?? []}
              onAddClick={() => setPickerWarehouseId(n.warehouseId!)}
              onChangeManagerClick={() => setManagerPickerWarehouseId(n.warehouseId!)}
              onRemove={handleRevoke}
              onTogglePrimary={handleTogglePrimary}
            />
          );
        }
        return null;
      },

      onAdd: (n, ctx) => {
        if (n.type === 'warehouse') setPickerWarehouseId(n.warehouseId!);
        else ctx.showToast('員工指派到倉庫層、請展開據點選擇倉庫', 'info');
      },
      isAddEnabled: (n) => n.type === 'warehouse',

      emptyText: (n) => {
        if (n.type === 'site')
          return {
            title: `「${n.label}」尚未設置倉庫`,
            desc: '從倉庫主檔加入倉庫；下方可看見此據點所有倉的員工聯集。',
          };
        if (n.type === 'warehouse')
          return {
            title: `「${n.label}」尚未設置分區`,
            desc: '從倉庫分區主檔加入分區（每倉至少要有一個分區、現有資料已預建「Z00 主區」）。',
          };
        if (n.type === 'zone')
          return {
            title: `「${n.label}」分區尚未設置庫位`,
            desc: '從庫位主檔加入庫位節點。',
          };
        return {
          title: `「${n.label}」是葉子節點`,
          desc: '庫位無子節點；後續可在此顯示庫位屬性 / 庫存。',
        };
      },
    }),
    [
      sites,
      warehouses,
      locations,
      warehouseEmployees,
      employeesOfSite,
      handleRevoke,
      handleTogglePrimary,
      membersOf,
      treeChildren,
      treeRoots,
    ],
  );

  // ---------- 員工 picker（指派員工到倉） ----------
  const pickerSearch = useCallback(
    async (q: string): Promise<PagedResult<UserDto>> => {
      if (!pickerWarehouseId) return { items: [], page: 1, pageSize: 0, total: 0 };
      const existing = new Set((warehouseEmployees.get(pickerWarehouseId) ?? []).map((e) => e.userId));
      const res = await listUsers({ q: q.trim() || undefined, pageSize: 50, isActive: true });
      const items = res.items.filter((u) => !existing.has(u.id));
      return { items, page: 1, pageSize: items.length, total: items.length };
    },
    [pickerWarehouseId, warehouseEmployees],
  );

  const handlePickerConfirm = useCallback(
    async (selected: UserDto[]) => {
      if (!pickerWarehouseId) return;
      try {
        for (const u of selected) {
          await assignUserWarehouse({ userId: u.id, warehouseId: pickerWarehouseId });
        }
        triggerReload();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        alert(`指派失敗：${msg}`);
      }
    },
    [pickerWarehouseId, triggerReload],
  );

  // ---------- 負責人 picker ----------
  const managerPickerSearch = useCallback(
    async (q: string): Promise<PagedResult<UserDto>> => {
      const res = await listUsers({ q: q.trim() || undefined, pageSize: 50, isActive: true });
      return res;
    },
    [],
  );

  const handleManagerPickerConfirm = useCallback(
    async (selected: UserDto[]) => {
      if (!managerPickerWarehouseId) return;
      const newManager = selected[0];
      if (!newManager) return;
      await handleChangeManager(managerPickerWarehouseId, newManager.id);
      setManagerPickerWarehouseId(null);
    },
    [handleChangeManager, managerPickerWarehouseId],
  );

  const pickerWarehouseName =
    warehouses.find((w) => w.id === pickerWarehouseId)?.name ?? '';
  const managerWarehouseName =
    warehouses.find((w) => w.id === managerPickerWarehouseId)?.name ?? '';

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">
        載入中…
      </div>
    );
  }

  return (
    <>
      <MasterBatchShell config={config} />

      {/* 指派員工到倉 picker */}
      <EntityPickerDialog<UserDto>
        open={pickerWarehouseId !== null}
        onClose={() => setPickerWarehouseId(null)}
        title={pickerWarehouseId ? `指派員工到「${pickerWarehouseName}」` : '指派員工'}
        subtitle="Assign Warehouse Members"
        icon={MapIcon}
        searchPlaceholder="搜尋姓名或員工編號…"
        search={pickerSearch}
        getId={(u) => u.id}
        getLabel={(u) => `${u.username} · ${u.displayName}`}
        getDescription={(u) => u.email ?? u.phone ?? ''}
        onConfirm={handlePickerConfirm}
        confirmLabel="指派"
      />

      {/* 換負責人 picker（單選、用多選 picker 但取首筆） */}
      <EntityPickerDialog<UserDto>
        open={managerPickerWarehouseId !== null}
        onClose={() => setManagerPickerWarehouseId(null)}
        title={
          managerPickerWarehouseId ? `指定「${managerWarehouseName}」負責人` : '指定倉庫負責人'
        }
        subtitle="Set Warehouse Manager"
        icon={Users2}
        searchPlaceholder="搜尋姓名或員工編號…"
        search={managerPickerSearch}
        getId={(u) => u.id}
        getLabel={(u) => `${u.username} · ${u.displayName}`}
        getDescription={(u) => u.email ?? u.phone ?? ''}
        onConfirm={handleManagerPickerConfirm}
        confirmLabel="設為負責人"
      />
    </>
  );
}

/* ============ 子節點列渲染（上半 list） ============ */
function ChildNodeRow({ node }: { node: LocationNode }) {
  const Icon =
    node.type === 'warehouse'
      ? Warehouse
      : node.type === 'zone'
      ? Layers
      : node.type === 'location'
      ? Package
      : Building2;
  const typeLabel =
    node.type === 'warehouse'
      ? '倉庫'
      : node.type === 'zone'
      ? '分區'
      : node.type === 'location'
      ? '庫位'
      : '據點';
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-9 flex-none place-items-center rounded-md bg-[#E8A020]/14 text-[#E8A020]">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-foreground">{node.label}</div>
        <div className="text-[11px] text-muted-foreground">{typeLabel}</div>
      </div>
    </div>
  );
}
