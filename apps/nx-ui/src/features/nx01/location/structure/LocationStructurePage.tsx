// apps/nx-ui/src/features/nx01/location/structure/LocationStructurePage.tsx
// 據點架構圖（案例 2 / Step 4 Commit B）
//
// 結構：tree 三層（據點 → 倉庫 → 庫位）+ list-with-extra
//   - 所有節點皆可選（isSelectable = true）
//   - 上半 list：子節點瀏覽（site→倉庫列表 / warehouse→庫位列表 / location→空）
//   - 下半 extra：員工副區（僅 site 層渲染）
//
// 互動：
//   - shell add 鈕「指派員工」：僅 site 層啟用（isAddEnabled）、按了開 picker
//   - 員工副區內部「指派員工」鈕：同樣開 picker（同 picker state）
//   - 員工 ✕ 鈕：從 employee.siteIds 移除該據點（員工本身不刪）
'use client';

import { useCallback, useMemo, useState } from 'react';
import { Building2, FolderTree, Map, Package, Warehouse } from 'lucide-react';

import { MasterBatchShell } from '@design/components/master-batch';
import type { MasterBatchConfig } from '@design/components/master-batch';
import { EntityPickerDialog } from '@design/components/multi-select-modal/EntityPickerDialog';
import type { PagedResult } from '@data/types/nx01/api';

import { EmployeeAssignmentSection } from './EmployeeAssignmentSection';
import {
  BINS,
  EMPLOYEES_SEED,
  SITES,
  WAREHOUSES,
  siteName,
  type SiteEmployeeMock,
} from './mock-data';

type LocationNodeType = 'site' | 'warehouse' | 'location';

type LocationNode = {
  id: string;
  type: LocationNodeType;
  label: string;
  siteId?: string;
  warehouseId?: string;
  locationId?: string;
};

export function LocationStructurePage() {
  const [employees, setEmployees] = useState<SiteEmployeeMock[]>(EMPLOYEES_SEED);
  const [pickerSiteId, setPickerSiteId] = useState<string | null>(null);

  // ---------- 樹結構 ----------
  const treeRoots = useCallback(
    (): LocationNode[] =>
      SITES.map((s) => ({
        id: `site:${s.id}`,
        type: 'site',
        label: s.name + (s.isMain ? '（總部）' : ''),
        siteId: s.id,
      })),
    [],
  );

  const treeChildren = useCallback((n: LocationNode): LocationNode[] => {
    if (n.type === 'site') {
      return WAREHOUSES.filter((w) => w.siteId === n.siteId).map((w) => ({
        id: `warehouse:${w.id}`,
        type: 'warehouse',
        label: w.name,
        siteId: w.siteId,
        warehouseId: w.id,
      }));
    }
    if (n.type === 'warehouse') {
      return BINS.filter((b) => b.warehouseId === n.warehouseId).map((b) => ({
        id: `location:${b.id}`,
        type: 'location',
        label: b.code,
        warehouseId: b.warehouseId,
        locationId: b.id,
      }));
    }
    return [];
  }, []);

  // ---------- 右欄 ----------
  // members(n) = 上半 list：顯示子節點瀏覽
  const membersOf = useCallback(
    (n: LocationNode): LocationNode[] => treeChildren(n),
    [treeChildren],
  );

  const siteEmployees = useCallback(
    (siteId: string): SiteEmployeeMock[] => employees.filter((e) => e.siteIds.includes(siteId)),
    [employees],
  );

  const handleRemoveSiteEmployee = useCallback((siteId: string, employeeId: string) => {
    setEmployees((prev) =>
      prev.map((e) =>
        e.id === employeeId ? { ...e, siteIds: e.siteIds.filter((s) => s !== siteId) } : e,
      ),
    );
  }, []);

  // ---------- config ----------
  const config = useMemo<MasterBatchConfig<LocationNode, LocationNode>>(
    () => ({
      title: '據點架構圖',
      category: '據點與倉庫',
      desc: '據點 → 倉庫 → 庫位，三層結構瀏覽；下方副區管理員工歸屬。員工可多歸據點。',
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
        SITES.flatMap((s) => [
          `site:${s.id}`,
          ...WAREHOUSES.filter((w) => w.siteId === s.id).map((w) => `warehouse:${w.id}`),
        ]),
      subjectId: (n) => n.id,
      subjectTitle: (n) => n.label,
      subjectCount: (n) => {
        if (n.type === 'site') return WAREHOUSES.filter((w) => w.siteId === n.siteId).length;
        if (n.type === 'warehouse')
          return BINS.filter((b) => b.warehouseId === n.warehouseId).length;
        return undefined;
      },

      rightMode: 'list-with-extra',
      members: membersOf,
      memberId: (m) => m.id,
      renderMember: (m) => <ChildNodeRow node={m} />,

      renderExtra: (n) => {
        if (n.type !== 'site') return null;
        const sid = n.siteId!;
        return (
          <EmployeeAssignmentSection
            siteName={siteName(sid)}
            employees={siteEmployees(sid)}
            onAddClick={() => setPickerSiteId(sid)}
            onRemove={(empId) => handleRemoveSiteEmployee(sid, empId)}
          />
        );
      },

      onAdd: (n, ctx) => {
        if (n.type === 'site') setPickerSiteId(n.siteId!);
        else ctx.showToast('此層級不可指派員工、請選擇據點', 'info');
      },
      isAddEnabled: (n) => n.type === 'site',

      emptyText: (n) => {
        if (n.type === 'site')
          return {
            title: `「${n.label}」尚未設置倉庫`,
            desc: '從倉庫主檔加入倉庫；下方可指派員工歸屬此據點。',
          };
        if (n.type === 'warehouse')
          return {
            title: `「${n.label}」尚未設置庫位`,
            desc: '從庫位主檔加入庫位節點。',
          };
        return {
          title: `「${n.label}」是葉子節點`,
          desc: '庫位無子節點；後續可在此顯示庫位屬性 / 庫存。',
        };
      },
    }),
    [handleRemoveSiteEmployee, membersOf, siteEmployees, treeChildren, treeRoots],
  );

  // ---------- Picker：client array 包 fake search ----------
  const pickerSearch = useCallback(
    async (q: string): Promise<PagedResult<SiteEmployeeMock>> => {
      if (!pickerSiteId) return { items: [], page: 1, pageSize: 0, total: 0 };
      const qq = q.trim().toLowerCase();
      const alreadyIds = new Set(siteEmployees(pickerSiteId).map((e) => e.id));
      const items = employees.filter((e) => {
        if (alreadyIds.has(e.id)) return false;
        if (!qq) return true;
        return e.name.includes(q) || e.id.toLowerCase().includes(qq);
      });
      return { items, page: 1, pageSize: items.length, total: items.length };
    },
    [employees, pickerSiteId, siteEmployees],
  );

  const handlePickerConfirm = useCallback(
    async (selected: SiteEmployeeMock[]) => {
      if (!pickerSiteId) return;
      const sid = pickerSiteId;
      setEmployees((prev) =>
        prev.map((e) => {
          const isAdded = selected.some((s) => s.id === e.id);
          if (!isAdded) return e;
          if (e.siteIds.includes(sid)) return e;
          return { ...e, siteIds: [...e.siteIds, sid] };
        }),
      );
    },
    [pickerSiteId],
  );

  const pickerTitle = pickerSiteId
    ? `指派員工到「${siteName(pickerSiteId)}」`
    : '指派員工';

  return (
    <>
      <MasterBatchShell config={config} />

      <EntityPickerDialog<SiteEmployeeMock>
        open={pickerSiteId !== null}
        onClose={() => setPickerSiteId(null)}
        title={pickerTitle}
        subtitle="Assign Site Members"
        icon={Map}
        searchPlaceholder="搜尋姓名或員工編號…"
        search={pickerSearch}
        getId={(e) => e.id}
        getLabel={(e) => `${e.id} · ${e.name}`}
        getDescription={(e) => `部門：${e.dept}`}
        onConfirm={handlePickerConfirm}
        confirmLabel="指派"
      />
    </>
  );
}

/* ============ 子節點列渲染（上半 list） ============ */
function ChildNodeRow({ node }: { node: LocationNode }) {
  const Icon = node.type === 'warehouse' ? Warehouse : node.type === 'location' ? Package : Building2;
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-9 flex-none place-items-center rounded-md bg-[#E8A020]/14 text-[#E8A020]">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-foreground">{node.label}</div>
        <div className="text-[11px] text-muted-foreground">
          {node.type === 'warehouse' ? '倉庫' : node.type === 'location' ? '庫位' : '據點'}
        </div>
      </div>
    </div>
  );
}
