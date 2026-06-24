// apps/nx-ui/src/features/nx01/location/structure/LocationStructurePage.tsx
// 據點架構圖 v3：雙版面切換 + 全鍵盤 + 主檔切換按鈕
//
// 2026-06-24 執行長拍板：對齊組織架構圖範式、共用前兩欄、後段 cascade 不同
//   Alt+1 員工版面：據點 → 倉庫 → 員工指派（3 欄、員工歸倉庫）
//   Alt+2 結構版面：據點 → 倉庫 → 分區 → 庫位 （4 欄、純架構）
//
// Alt+A 依當前欄分流：
//   據點欄  → 新增據點 (createSite)
//   倉庫欄  → 新增倉庫 (createWarehouse、自動帶 siteId)
//   員工欄  → 指派員工到倉庫 (assignUserWarehouse)
//   分區欄  → 新增分區 (createWarehouseZone、自動帶 warehouseId)
//   庫位欄  → 新增庫位 (createLocation、自動帶 warehouseId + zoneId)
//
// 倉庫負責人 (warehouse.managerUserId)：員工欄 row 加 ⭐ toggle、點 = updateWarehouse
//
// 全鍵盤（window listener）：
//   ← →   切欄
//   ↑ ↓   欄內移卡
//   Enter cascade
//   Alt+1 / Alt+2 切版面
//   Alt+A / A 新增/指派
//   Delete 移除員工（員工欄聚焦時）
//   [ ]   上/下個主檔
//   F3    主檔切換 modal
//   ?     熱鍵指南

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  HelpCircle,
  Keyboard,
  Layers,
  MapPin,
  Network,
  Package,
  Star,
  Trash2,
  UserPlus,
  Users2,
  Warehouse as WarehouseIcon,
} from 'lucide-react';

import { cn } from '@design/utils/cn';
import { PageHeader } from '@design/components/page-header/PageHeader';
import { ToastStack, useToast } from '@design/components/toast/ToastStack';
import { EntityPickerDialog } from '@design/components/multi-select-modal/EntityPickerDialog';
import { useReducedMotion } from '@/design/motion/gsap';
import { tryNavigate } from '@design/hooks/useDirtyGuard';

import { MasterQuickNav } from '@/features/nx01/shell/master-nav/MasterQuickNav';
import { MasterSwitcher } from '@/features/nx01/shell/keyboard-card-master/MasterSwitcher';
import { MASTER_PAGES } from '@/features/nx01/shell/master-nav/master-pages';

import { createSite, listSites, type SiteDto } from '@data/endpoints/nx01/api/site';
import {
  createWarehouse,
  listWarehouses,
  updateWarehouse,
  type WarehouseDto,
} from '@data/endpoints/nx01/api/warehouse';
import {
  createWarehouseZone,
  listWarehouseZones,
  type WarehouseZoneRow,
} from '@data/endpoints/nx01/api/warehouse-zone';
import {
  createLocation,
  listLocation,
} from '@data/endpoints/shared/master/location/api/location';
import type { LocationDto } from '@data/types/shared/master/location';
import { listUsers, type UserDto } from '@data/endpoints/nx01/api/user';
import {
  assignUserWarehouse,
  listUserWarehouses,
  revokeUserWarehouse,
  type UserWarehouseDto,
} from '@data/endpoints/nx01/api/user-warehouse';
import type { PagedResult } from '@data/types/nx01/api';

const CURRENT_PAGE_ID = 'sitechart';

type View = 'employee' | 'structure';
type Zone = 'site' | 'warehouse' | 'employee' | 'zone' | 'location';

const ZONES_EMPLOYEE: Zone[] = ['site', 'warehouse', 'employee'];
const ZONES_STRUCTURE: Zone[] = ['site', 'warehouse', 'zone', 'location'];

type Member = {
  /** user_warehouse.id (revoke 用) */
  assignmentId: string;
  userId: string;
  userAccount: string | null;
  userDisplayName: string | null;
  isPrimary: boolean;
};

export function LocationStructurePage() {
  const router = useRouter();
  const { toasts, showToast } = useToast();
  const reducedMotion = useReducedMotion();

  // ---------- 版面 ----------
  const [view, setView] = useState<View>('employee');

  // ---------- 資料 ----------
  const [sites, setSites] = useState<SiteDto[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([]);
  const [zones, setZones] = useState<WarehouseZoneRow[]>([]);
  const [locations, setLocations] = useState<LocationDto[]>([]);
  /** Map<warehouseId, Member[]> */
  const [warehouseEmployees, setWarehouseEmployees] = useState<Map<string, Member[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [reloadTick, setReloadTick] = useState(0);

  // ---------- cascade 選擇（共用） ----------
  const [siteId, setSiteId] = useState<string | null>(null);
  const [warehouseId, setWarehouseId] = useState<string | null>(null);
  const [zoneId, setZoneId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);

  // ---------- 焦點 ----------
  const [zone, setZone] = useState<Zone>('site');
  const [siteIdx, setSiteIdx] = useState(0);
  const [warehouseIdx, setWarehouseIdx] = useState(0);
  const [employeeIdx, setEmployeeIdx] = useState(0);
  const [zoneIdx, setZoneIdx] = useState(0);
  const [locationIdx, setLocationIdx] = useState(0);

  // ---------- modal / overlay ----------
  const [pickerOpen, setPickerOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState<'site' | 'warehouse' | 'zone' | 'location' | null>(
    null,
  );

  // ---------- 載入 ----------
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        // 後端 Nx01ListQueryDto @Max(100)、單頁上限 100、超過會 400
        // 假設 LITE 客戶資料量小、暫不做分頁迭代；超出時再改 paginate loop
        const [siteRes, whRes, zoneRes, locRes] = await Promise.all([
          listSites({ pageSize: 100, isActive: true }),
          listWarehouses({ pageSize: 100, isActive: true }),
          listWarehouseZones({ pageSize: 100, isActive: true }),
          listLocation({ page: 1, pageSize: 100, isActive: true }),
        ]);
        if (cancelled) return;
        setSites(siteRes.items);
        setWarehouses(whRes.items);
        setZones(zoneRes.rows);
        setLocations(locRes.items);

        const empMap = new Map<string, Member[]>();
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

  // ---------- cascade lists ----------
  const warehousesForSite = useMemo(
    () => (siteId ? warehouses.filter((w) => w.siteId === siteId) : []),
    [warehouses, siteId],
  );
  const zonesForWarehouse = useMemo(
    () => (warehouseId ? zones.filter((z) => z.warehouseId === warehouseId) : []),
    [zones, warehouseId],
  );
  const locationsForZone = useMemo(
    () =>
      zoneId
        ? locations.filter(
            (l) => (l as LocationDto & { zoneId?: string | null }).zoneId === zoneId,
          )
        : warehouseId
          ? locations.filter((l) => l.warehouseId === warehouseId)
          : [],
    [locations, zoneId, warehouseId],
  );
  const employeesForWarehouse = useMemo(
    () => (warehouseId ? (warehouseEmployees.get(warehouseId) ?? []) : []),
    [warehouseEmployees, warehouseId],
  );

  // ---------- 選定 helpers ----------
  const selectSite = useCallback((id: string) => {
    setSiteId(id);
    setWarehouseId(null);
    setZoneId(null);
    setLocationId(null);
    setWarehouseIdx(0);
    setZoneIdx(0);
    setLocationIdx(0);
    setEmployeeIdx(0);
  }, []);
  const selectWarehouse = useCallback((id: string) => {
    setWarehouseId(id);
    setZoneId(null);
    setLocationId(null);
    setZoneIdx(0);
    setLocationIdx(0);
    setEmployeeIdx(0);
  }, []);
  const selectZone = useCallback((id: string) => {
    setZoneId(id);
    setLocationId(null);
    setLocationIdx(0);
  }, []);

  // ---------- 版面切換 ----------
  const switchView = useCallback(
    (v: View) => {
      setView(v);
      const valid = v === 'employee' ? ZONES_EMPLOYEE : ZONES_STRUCTURE;
      // 當前 zone 不在新版面內、退回 'warehouse'（共用欄、最安全）
      if (!valid.includes(zone)) setZone('warehouse');
    },
    [zone],
  );

  // ---------- 主檔切換 ----------
  const switchMaster = useCallback(
    (dir: -1 | 1) => {
      const enabled = MASTER_PAGES.filter((p) => !p.disabled);
      const curIdx = enabled.findIndex((p) => p.id === CURRENT_PAGE_ID);
      if (curIdx < 0) return;
      const next = enabled[(curIdx + dir + enabled.length) % enabled.length];
      tryNavigate(() => router.push(next.href), next.label);
    },
    [router],
  );

  // ---------- 操作：員工 ----------
  const handleRevokeMember = useCallback(
    async (member: Member) => {
      try {
        await revokeUserWarehouse(member.assignmentId);
        showToast(
          `已將 ${member.userDisplayName ?? member.userAccount ?? '員工'} 移出此倉庫`,
          'success',
        );
        triggerReload();
      } catch (e) {
        showToast(`移除失敗：${e instanceof Error ? e.message : String(e)}`, 'danger');
      }
    },
    [showToast, triggerReload],
  );

  const handleSetManager = useCallback(
    async (member: Member) => {
      if (!warehouseId) return;
      try {
        await updateWarehouse(warehouseId, { managerUserId: member.userId });
        showToast(
          `已設定 ${member.userDisplayName ?? member.userAccount ?? '員工'} 為負責人`,
          'success',
        );
        triggerReload();
      } catch (e) {
        showToast(`設定失敗：${e instanceof Error ? e.message : String(e)}`, 'danger');
      }
    },
    [warehouseId, showToast, triggerReload],
  );

  // ---------- picker ----------
  const pickerSearch = useCallback(
    async (q: string): Promise<PagedResult<UserDto>> => {
      if (!warehouseId) return { items: [], page: 1, pageSize: 0, total: 0 };
      const existing = new Set(employeesForWarehouse.map((m) => m.userId));
      const res = await listUsers({ q: q.trim() || undefined, pageSize: 50, isActive: true });
      const items = res.items.filter((u) => !existing.has(u.id));
      return { items, page: 1, pageSize: items.length, total: items.length };
    },
    [warehouseId, employeesForWarehouse],
  );

  const handlePickerConfirm = useCallback(
    async (selected: UserDto[]) => {
      if (!warehouseId) return;
      try {
        for (const u of selected) {
          await assignUserWarehouse({ userId: u.id, warehouseId });
        }
        showToast(`已指派 ${selected.length} 位員工`, 'success');
        triggerReload();
      } catch (e) {
        showToast(`指派失敗：${e instanceof Error ? e.message : String(e)}`, 'danger');
      }
    },
    [warehouseId, showToast, triggerReload],
  );

  // ---------- 鍵盤 ----------
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName ?? '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        if (e.key === 'Escape') (t as HTMLElement).blur();
        return;
      }
      if (switcherOpen || helpOpen || pickerOpen || createOpen) {
        if (e.key === 'Escape') {
          setSwitcherOpen(false);
          setHelpOpen(false);
          setPickerOpen(false);
          setCreateOpen(null);
          e.preventDefault();
        }
        return;
      }

      // Alt+1 / Alt+2 切版面
      if (e.altKey && e.key === '1') {
        e.preventDefault();
        switchView('employee');
        return;
      }
      if (e.altKey && e.key === '2') {
        e.preventDefault();
        switchView('structure');
        return;
      }

      // F3 主檔切換
      if (e.key === 'F3') {
        e.preventDefault();
        setSwitcherOpen(true);
        return;
      }
      if (e.key === '[') {
        e.preventDefault();
        switchMaster(-1);
        return;
      }
      if (e.key === ']') {
        e.preventDefault();
        switchMaster(1);
        return;
      }
      if (e.code === 'Slash' && e.shiftKey) {
        e.preventDefault();
        setHelpOpen(true);
        return;
      }

      // A / Alt+A：依當前 focused 欄分流
      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        if (zone === 'site') setCreateOpen('site');
        else if (zone === 'warehouse' && siteId) setCreateOpen('warehouse');
        else if (zone === 'employee' && warehouseId) setPickerOpen(true);
        else if (zone === 'zone' && warehouseId) setCreateOpen('zone');
        else if (zone === 'location' && warehouseId) setCreateOpen('location');
        return;
      }

      // ← → 切欄
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const order = view === 'employee' ? ZONES_EMPLOYEE : ZONES_STRUCTURE;
        const dir = e.key === 'ArrowRight' ? 1 : -1;
        const idx = order.indexOf(zone);
        const nextIdx = (idx + dir + order.length) % order.length;
        setZone(order[nextIdx]);
        return;
      }

      // 欄內 ↑ ↓ / Home / End / Enter / Delete
      const lists: Record<Zone, { count: number; idx: number; setIdx: (i: number) => void }> = {
        site: { count: sites.length, idx: siteIdx, setIdx: setSiteIdx },
        warehouse: {
          count: warehousesForSite.length,
          idx: warehouseIdx,
          setIdx: setWarehouseIdx,
        },
        employee: {
          count: employeesForWarehouse.length,
          idx: employeeIdx,
          setIdx: setEmployeeIdx,
        },
        zone: { count: zonesForWarehouse.length, idx: zoneIdx, setIdx: setZoneIdx },
        location: {
          count: locationsForZone.length,
          idx: locationIdx,
          setIdx: setLocationIdx,
        },
      };
      const cur = lists[zone];
      if (e.key === 'ArrowDown' && cur.count > 0) {
        e.preventDefault();
        cur.setIdx((cur.idx + 1) % cur.count);
        return;
      }
      if (e.key === 'ArrowUp' && cur.count > 0) {
        e.preventDefault();
        cur.setIdx((cur.idx - 1 + cur.count) % cur.count);
        return;
      }
      if (e.key === 'Home' && cur.count > 0) {
        e.preventDefault();
        cur.setIdx(0);
        return;
      }
      if (e.key === 'End' && cur.count > 0) {
        e.preventDefault();
        cur.setIdx(cur.count - 1);
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (zone === 'site' && sites[siteIdx]) {
          selectSite(sites[siteIdx].id);
          setZone('warehouse');
        } else if (zone === 'warehouse' && warehousesForSite[warehouseIdx]) {
          selectWarehouse(warehousesForSite[warehouseIdx].id);
          setZone(view === 'employee' ? 'employee' : 'zone');
        } else if (zone === 'zone' && zonesForWarehouse[zoneIdx]) {
          selectZone(zonesForWarehouse[zoneIdx].id);
          setZone('location');
        } else if (zone === 'location' && locationsForZone[locationIdx]) {
          setLocationId(locationsForZone[locationIdx].id);
        }
        return;
      }
      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        zone === 'employee' &&
        employeesForWarehouse[employeeIdx]
      ) {
        e.preventDefault();
        void handleRevokeMember(employeesForWarehouse[employeeIdx]);
        return;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    view,
    zone,
    siteIdx,
    warehouseIdx,
    employeeIdx,
    zoneIdx,
    locationIdx,
    sites,
    warehousesForSite,
    employeesForWarehouse,
    zonesForWarehouse,
    locationsForZone,
    siteId,
    warehouseId,
    switcherOpen,
    helpOpen,
    pickerOpen,
    createOpen,
    switchMaster,
    switchView,
  ]);

  // ---------- render helpers ----------
  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">
        載入中…
      </div>
    );
  }

  const selectedSite = siteId ? sites.find((s) => s.id === siteId) : null;
  const selectedWarehouse = warehouseId ? warehouses.find((w) => w.id === warehouseId) : null;
  const selectedZone = zoneId ? zones.find((z) => z.id === zoneId) : null;
  const managerUserId = selectedWarehouse?.managerUserId ?? null;

  const totalCount = `${sites.length} 據點 / ${warehouses.length} 倉庫 / ${zones.length} 分區 / ${locations.length} 庫位`;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* 頂部：標題 + 版面 tab + MasterQuickNav */}
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 pt-3">
        <PageHeader
          crumbs={[{ label: '主檔' }, { label: '據點架構圖' }]}
          category="據點與倉庫"
          title="據點架構圖"
          desc={
            view === 'employee'
              ? '據點 → 倉庫 → 員工指派（Alt+1）'
              : '據點 → 倉庫 → 分區 → 庫位（Alt+2）'
          }
          count={totalCount}
        />
        <div data-nx-frame className="flex items-center gap-2">
          <ViewTab
            active={view === 'employee'}
            label="員工歸屬"
            shortcut="1"
            onClick={() => switchView('employee')}
          />
          <ViewTab
            active={view === 'structure'}
            label="實體結構"
            shortcut="2"
            onClick={() => switchView('structure')}
          />
          <span className="mx-1 h-5 w-px bg-border/60" aria-hidden />
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-border/50 bg-card px-2 text-[11px] font-medium text-foreground/80 hover:border-border hover:bg-accent/15"
            title="熱鍵指南（?）"
          >
            <Keyboard className="size-3" />
            <span className="hidden sm:inline">
              <span className="mr-0.5 font-mono text-primary">?</span>
              熱鍵
            </span>
          </button>
          <MasterQuickNav currentPageId={CURRENT_PAGE_ID} />
        </div>
      </div>

      {/* 欄群組 */}
      <div
        className={cn(
          'grid min-h-0 flex-1 grid-cols-1 gap-3 px-4 pb-4',
          view === 'employee' ? 'md:grid-cols-3' : 'md:grid-cols-4',
        )}
      >
        <ColumnPanel
          title="據點"
          subtitle={`${sites.length} 項`}
          icon={Building2}
          active={zone === 'site'}
          onClick={() => setZone('site')}
          shortcut="←1"
          headerAction={<AddBtn onClick={() => setCreateOpen('site')} title="新增據點（A）" />}
        >
          {sites.length === 0 ? (
            <EmptyHint text="尚無據點" />
          ) : (
            sites.map((s, i) => (
              <Card
                key={s.id}
                title={`${s.name}${s.isMain ? ' ⭐' : ''}`}
                code={s.code}
                count={warehouses.filter((w) => w.siteId === s.id).length}
                countLabel="倉"
                focused={zone === 'site' && siteIdx === i}
                selected={siteId === s.id}
                reducedMotion={reducedMotion}
                onClick={() => {
                  setZone('site');
                  setSiteIdx(i);
                  selectSite(s.id);
                }}
              />
            ))
          )}
        </ColumnPanel>

        <ColumnPanel
          title="倉庫"
          subtitle={
            selectedSite ? `${selectedSite.name} ▸ ${warehousesForSite.length} 項` : '請先選據點'
          }
          icon={WarehouseIcon}
          active={zone === 'warehouse'}
          onClick={() => setZone('warehouse')}
          shortcut="2"
          disabled={!siteId}
          headerAction={
            siteId ? <AddBtn onClick={() => setCreateOpen('warehouse')} title="新增倉庫（A）" /> : null
          }
        >
          {!siteId ? (
            <EmptyHint text="← 請先選據點" />
          ) : warehousesForSite.length === 0 ? (
            <EmptyHint text="此據點尚無倉庫" />
          ) : (
            warehousesForSite.map((w, i) => (
              <Card
                key={w.id}
                title={`${w.name}${w.isMain ? ' ⭐' : ''}`}
                code={w.code}
                count={
                  view === 'employee'
                    ? warehouseEmployees.get(w.id)?.length ?? 0
                    : zones.filter((z) => z.warehouseId === w.id).length
                }
                countLabel={view === 'employee' ? '人' : '區'}
                focused={zone === 'warehouse' && warehouseIdx === i}
                selected={warehouseId === w.id}
                reducedMotion={reducedMotion}
                onClick={() => {
                  setZone('warehouse');
                  setWarehouseIdx(i);
                  selectWarehouse(w.id);
                }}
              />
            ))
          )}
        </ColumnPanel>

        {/* Alt+1 員工版面：第 3 欄 = 員工 */}
        {view === 'employee' ? (
          <ColumnPanel
            title="員工"
            subtitle={
              selectedWarehouse
                ? `${selectedWarehouse.name} ▸ ${employeesForWarehouse.length} 人`
                : '請先選倉庫'
            }
            icon={Users2}
            active={zone === 'employee'}
            onClick={() => setZone('employee')}
            shortcut="3"
            disabled={!warehouseId}
            headerAction={
              warehouseId ? (
                <AddBtn onClick={() => setPickerOpen(true)} title="指派員工（A）" iconKind="user" />
              ) : null
            }
          >
            {!warehouseId ? (
              <EmptyHint text="← 請先選倉庫" />
            ) : employeesForWarehouse.length === 0 ? (
              <EmptyHint text="此倉庫尚無員工、按 A 指派" />
            ) : (
              employeesForWarehouse.map((m, i) => (
                <EmployeeCard
                  key={m.userId}
                  member={m}
                  isManager={managerUserId === m.userId}
                  focused={zone === 'employee' && employeeIdx === i}
                  reducedMotion={reducedMotion}
                  onClick={() => {
                    setZone('employee');
                    setEmployeeIdx(i);
                  }}
                  onSetManager={() => void handleSetManager(m)}
                  onRemove={() => void handleRevokeMember(m)}
                />
              ))
            )}
          </ColumnPanel>
        ) : null}

        {/* Alt+2 結構版面：第 3 欄 = 分區、第 4 欄 = 庫位 */}
        {view === 'structure' ? (
          <>
            <ColumnPanel
              title="分區"
              subtitle={
                selectedWarehouse
                  ? `${selectedWarehouse.name} ▸ ${zonesForWarehouse.length} 項`
                  : '請先選倉庫'
              }
              icon={Layers}
              active={zone === 'zone'}
              onClick={() => setZone('zone')}
              shortcut="3"
              disabled={!warehouseId}
              headerAction={
                warehouseId ? (
                  <AddBtn onClick={() => setCreateOpen('zone')} title="新增分區（A）" />
                ) : null
              }
            >
              {!warehouseId ? (
                <EmptyHint text="← 請先選倉庫" />
              ) : zonesForWarehouse.length === 0 ? (
                <EmptyHint text="此倉庫尚無分區" />
              ) : (
                zonesForWarehouse.map((z, i) => (
                  <Card
                    key={z.id}
                    title={z.name}
                    code={z.code}
                    count={
                      locations.filter(
                        (l) => (l as LocationDto & { zoneId?: string | null }).zoneId === z.id,
                      ).length
                    }
                    countLabel="位"
                    focused={zone === 'zone' && zoneIdx === i}
                    selected={zoneId === z.id}
                    reducedMotion={reducedMotion}
                    onClick={() => {
                      setZone('zone');
                      setZoneIdx(i);
                      selectZone(z.id);
                    }}
                  />
                ))
              )}
            </ColumnPanel>

            <ColumnPanel
              title="庫位"
              subtitle={
                selectedZone
                  ? `${selectedZone.name} ▸ ${locationsForZone.length} 項`
                  : '請先選分區'
              }
              icon={Package}
              active={zone === 'location'}
              onClick={() => setZone('location')}
              shortcut="4"
              disabled={!warehouseId}
              headerAction={
                warehouseId ? (
                  <AddBtn onClick={() => setCreateOpen('location')} title="新增庫位（A）" />
                ) : null
              }
            >
              {!warehouseId ? (
                <EmptyHint text="← 請先選倉庫" />
              ) : !zoneId ? (
                <EmptyHint text="← 請先選分區" />
              ) : locationsForZone.length === 0 ? (
                <EmptyHint text="此分區尚無庫位" />
              ) : (
                locationsForZone.map((l, i) => (
                  <Card
                    key={l.id}
                    title={l.name ?? l.code}
                    code={l.code}
                    count={0}
                    countLabel=""
                    focused={zone === 'location' && locationIdx === i}
                    selected={locationId === l.id}
                    reducedMotion={reducedMotion}
                    onClick={() => {
                      setZone('location');
                      setLocationIdx(i);
                      setLocationId(l.id);
                    }}
                  />
                ))
              )}
            </ColumnPanel>
          </>
        ) : null}
      </div>

      {/* 主檔切換 modal */}
      <MasterSwitcher
        open={switcherOpen}
        currentPageId={CURRENT_PAGE_ID}
        onClose={() => setSwitcherOpen(false)}
      />

      {/* 指派員工 picker */}
      <EntityPickerDialog<UserDto>
        open={pickerOpen && !!warehouseId}
        onClose={() => setPickerOpen(false)}
        title={selectedWarehouse ? `指派員工到「${selectedWarehouse.name}」` : '指派員工'}
        subtitle="Assign Warehouse Members"
        icon={MapPin}
        searchPlaceholder="搜尋姓名或員工編號…"
        search={pickerSearch}
        getId={(u) => u.id}
        getLabel={(u) => `${u.username} · ${u.displayName}`}
        getDescription={(u) => u.email ?? u.phone ?? ''}
        onConfirm={handlePickerConfirm}
        confirmLabel="指派"
      />

      {/* 熱鍵指南 */}
      {helpOpen ? <HelpOverlay onClose={() => setHelpOpen(false)} /> : null}

      {/* 新增 dialog（依 zone 分流） */}
      {createOpen === 'site' ? (
        <QuickCreateDialog
          title="新增據點"
          subtitle="Create Site"
          icon={Building2}
          contextLine={null}
          onClose={() => setCreateOpen(null)}
          onSubmit={async ({ code, name }) => {
            const s = await createSite({
              code: code || `SITE_${Date.now().toString(36).toUpperCase()}`,
              name,
            });
            showToast(`已新增據點「${s.name}」`, 'success');
            triggerReload();
            selectSite(s.id);
            setZone('warehouse');
          }}
        />
      ) : null}
      {createOpen === 'warehouse' && siteId && selectedSite ? (
        <QuickCreateDialog
          title="新增倉庫"
          subtitle="Create Warehouse"
          icon={WarehouseIcon}
          contextLine={`隸屬據點：${selectedSite.name}（${selectedSite.code}）`}
          onClose={() => setCreateOpen(null)}
          onSubmit={async ({ code, name }) => {
            const w = await createWarehouse({
              code: code || `WH_${Date.now().toString(36).toUpperCase()}`,
              name,
              siteId,
            });
            showToast(`已新增倉庫「${w.name}」`, 'success');
            triggerReload();
            selectWarehouse(w.id);
            setZone(view === 'employee' ? 'employee' : 'zone');
          }}
        />
      ) : null}
      {createOpen === 'zone' && warehouseId && selectedWarehouse ? (
        <QuickCreateDialog
          title="新增分區"
          subtitle="Create Zone"
          icon={Layers}
          contextLine={`隸屬倉庫：${selectedWarehouse.name}（${selectedWarehouse.code}）`}
          onClose={() => setCreateOpen(null)}
          onSubmit={async ({ code, name }) => {
            const z = await createWarehouseZone({
              warehouseId,
              code: code || `Z${Date.now().toString(36).toUpperCase().slice(0, 5)}`,
              name,
            });
            showToast(`已新增分區「${z.name}」`, 'success');
            triggerReload();
            selectZone(z.id);
            setZone('location');
          }}
        />
      ) : null}
      {createOpen === 'location' && warehouseId && selectedWarehouse ? (
        <QuickCreateDialog
          title="新增庫位"
          subtitle="Create Location"
          icon={Package}
          contextLine={
            selectedZone
              ? `隸屬分區：${selectedZone.name}（${selectedWarehouse.name}）`
              : `隸屬倉庫：${selectedWarehouse.name}（未選分區）`
          }
          onClose={() => setCreateOpen(null)}
          onSubmit={async ({ code, name }) => {
            const l = await createLocation({
              warehouseId,
              zoneId: zoneId ?? null,
              code: code || `L_${Date.now().toString(36).toUpperCase()}`,
              name: name || null,
            });
            showToast(`已新增庫位「${l.code}」`, 'success');
            triggerReload();
            setLocationId(l.id);
          }}
        />
      ) : null}

      <ToastStack toasts={toasts} />
    </div>
  );
}

// ============ 子元件 ============

function ViewTab({
  active,
  label,
  shortcut,
  onClick,
}: {
  active: boolean;
  label: string;
  shortcut: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] font-medium transition-all',
        active
          ? 'border-primary/60 bg-primary/15 text-primary'
          : 'border-border/50 bg-card text-foreground/80 hover:border-border hover:bg-accent/15',
      )}
      title={`${label}（Alt+${shortcut}）`}
    >
      <span className="font-mono text-[10px]">Alt+{shortcut}</span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function ColumnPanel({
  title,
  subtitle,
  icon: Icon,
  active,
  onClick,
  shortcut,
  disabled,
  children,
  headerAction,
}: {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onClick: () => void;
  shortcut: string;
  disabled?: boolean;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
}) {
  return (
    <section
      onClick={onClick}
      className={cn(
        'flex min-h-0 flex-col overflow-hidden rounded-lg border bg-card transition-all',
        active
          ? 'border-primary/60 shadow-[0_0_0_2px_var(--color-primary)/0.18]'
          : disabled
            ? 'border-border/40 opacity-70'
            : 'border-border/50 hover:border-border',
      )}
    >
      <header
        className={cn(
          'flex items-center gap-2 border-b px-3 py-2',
          active ? 'border-primary/40 bg-primary/8' : 'border-border/40 bg-muted/30',
        )}
      >
        <Icon className={cn('size-4', active ? 'text-primary' : 'text-muted-foreground')} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            {title}
            <kbd
              className={cn(
                'inline-block rounded border px-1 font-mono text-[10px]',
                active
                  ? 'border-primary/60 bg-primary/15 text-primary'
                  : 'border-border/50 bg-muted/40 text-muted-foreground',
              )}
            >
              {shortcut}
            </kbd>
          </div>
          <div className="truncate text-[11px] text-muted-foreground">{subtitle}</div>
        </div>
        {headerAction}
      </header>
      <div className="flex flex-col gap-1.5 overflow-y-auto p-2">{children}</div>
    </section>
  );
}

function Card({
  title,
  code,
  count,
  countLabel,
  focused,
  selected,
  reducedMotion,
  onClick,
}: {
  title: string;
  code: string;
  count: number;
  countLabel: string;
  focused: boolean;
  selected: boolean;
  reducedMotion: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex items-center gap-2 rounded-md border px-2.5 py-2 text-left transition-all',
        focused
          ? 'border-primary/70 bg-primary/12 shadow-md'
          : selected
            ? 'border-primary/40 bg-primary/6'
            : 'border-border/40 bg-card hover:border-border hover:bg-accent/15',
        !reducedMotion && focused && 'scale-[1.01]',
      )}
    >
      <span
        className={cn(
          'inline-block h-7 w-1 rounded-sm transition-colors',
          focused ? 'bg-primary' : selected ? 'bg-primary/50' : 'bg-transparent',
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-foreground">{title}</div>
        <div className="truncate font-mono text-[10px] text-muted-foreground">{code}</div>
      </div>
      {countLabel ? (
        <span
          className={cn(
            'flex-none rounded-full px-2 py-0.5 text-[10px] font-semibold',
            focused
              ? 'bg-primary/20 text-primary'
              : count > 0
                ? 'bg-muted/60 text-foreground/80'
                : 'bg-muted/30 text-muted-foreground',
          )}
        >
          {count} {countLabel}
        </span>
      ) : null}
    </button>
  );
}

function EmployeeCard({
  member,
  isManager,
  focused,
  reducedMotion,
  onClick,
  onSetManager,
  onRemove,
}: {
  member: Member;
  isManager: boolean;
  focused: boolean;
  reducedMotion: boolean;
  onClick: () => void;
  onSetManager: () => void;
  onRemove: () => void;
}) {
  const display = member.userDisplayName ?? member.userAccount ?? member.userId;
  return (
    <div
      onClick={onClick}
      className={cn(
        'group flex items-center gap-2 rounded-md border px-2.5 py-2 transition-all',
        focused
          ? 'border-primary/70 bg-primary/12 shadow-md'
          : isManager
            ? 'border-amber-400/50 bg-amber-50/50 dark:bg-amber-900/10'
            : 'border-border/40 bg-card hover:border-border hover:bg-accent/15',
        !reducedMotion && focused && 'scale-[1.01]',
      )}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSetManager();
        }}
        className={cn(
          'rounded-md p-1 transition-colors',
          isManager
            ? 'text-amber-500'
            : 'text-muted-foreground/40 hover:text-amber-500',
        )}
        title={isManager ? '此倉負責人' : '設為此倉負責人'}
      >
        <Star className={cn('size-4', isManager && 'fill-amber-400')} />
      </button>
      <span className="grid size-8 flex-none place-items-center rounded-full bg-[#E8A020]/18 text-xs font-semibold text-[#E8A020]">
        {display.slice(0, 1)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[13px] text-foreground">
          <span className="truncate">{display}</span>
          {isManager ? (
            <span className="rounded bg-amber-200/70 px-1 text-[9px] font-semibold text-amber-900 dark:bg-amber-700/40 dark:text-amber-100">
              負責人
            </span>
          ) : null}
        </div>
        {member.userAccount ? (
          <div className="truncate font-mono text-[10px] text-muted-foreground">
            {member.userAccount}
          </div>
        ) : null}
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="rounded-md p-1 text-muted-foreground opacity-0 transition-all hover:bg-destructive/15 hover:text-destructive group-hover:opacity-100"
        title="移除（Delete）"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="grid place-items-center py-8 text-center text-[12px] text-muted-foreground">
      <Network className="mb-2 size-6 opacity-40" />
      {text}
    </div>
  );
}

function AddBtn({
  onClick,
  title,
  iconKind = 'plus',
}: {
  onClick: () => void;
  title: string;
  iconKind?: 'plus' | 'user';
}) {
  const Icon = iconKind === 'user' ? UserPlus : UserPlus;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="inline-flex h-6 items-center gap-1 rounded-md border border-primary/50 bg-primary/10 px-2 text-[11px] font-medium text-primary hover:bg-primary/20"
      title={title}
    >
      <Icon className="size-3" />
      <span className="hidden sm:inline">
        <span className="mr-0.5 font-mono">A</span>
        {iconKind === 'user' ? '指派' : '新增'}
      </span>
    </button>
  );
}

function HelpOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border/40 bg-popover p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-3 flex items-center gap-2">
          <HelpCircle className="size-5 text-primary" />
          <h2 className="text-sm font-bold tracking-wide text-foreground">據點架構圖 · 鍵盤指南</h2>
        </header>
        <div className="space-y-2 text-[12px] text-foreground/85">
          <Row k="Alt+1" desc="切到「員工歸屬」版面（據點 → 倉庫 → 員工）" />
          <Row k="Alt+2" desc="切到「實體結構」版面（據點 → 倉庫 → 分區 → 庫位）" />
          <Row k="← →" desc="切換欄（前兩欄共用、後段依版面）" />
          <Row k="↑ ↓" desc="欄內上下移卡片" />
          <Row k="Home / End" desc="欄內跳頭尾" />
          <Row k="Enter / Space" desc="選定 + cascade 到下一欄" />
          <Row k="A / Alt+A" desc="依當前欄：新增據點 / 倉庫 / 分區 / 庫位、或指派員工" />
          <Row k="⭐" desc="員工 row 點星 = 設為此倉負責人" />
          <Row k="Delete / Backspace" desc="移除員工（員工欄聚焦時）" />
          <Row k="[ / ]" desc="上 / 下個主檔" />
          <Row k="F3" desc="主檔切換 modal" />
          <Row k="?" desc="開 / 關 此指南" />
          <Row k="Esc" desc="關閉浮層" />
        </div>
        <footer className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border/50 bg-card px-3 py-1 text-[12px] text-foreground/80 hover:bg-accent/15"
          >
            關閉（Esc）
          </button>
        </footer>
      </div>
    </div>
  );
}

function Row({ k, desc }: { k: string; desc: string }) {
  return (
    <div className="flex items-center gap-3">
      <kbd className="inline-block min-w-[64px] rounded border border-border/50 bg-muted/40 px-2 py-0.5 text-center font-mono text-[11px] text-foreground">
        {k}
      </kbd>
      <span className="flex-1">{desc}</span>
    </div>
  );
}

function QuickCreateDialog({
  title,
  subtitle,
  icon: Icon,
  contextLine,
  onClose,
  onSubmit,
}: {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  contextLine: string | null;
  onClose: () => void;
  onSubmit: (values: { code: string; name: string; description: string }) => Promise<void>;
}) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  async function submit() {
    if (!name.trim()) {
      setErr('名稱必填');
      nameRef.current?.focus();
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await onSubmit({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim(),
      });
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '建立失敗');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          void submit();
        }
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border/40 bg-popover p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-3 flex items-center gap-2.5">
          <Icon className="size-5 text-primary" />
          <h2 className="text-sm font-bold tracking-wide text-foreground">{title}</h2>
          <span className="ml-auto text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground/70">
            {subtitle}
          </span>
        </header>
        {contextLine ? (
          <div className="mb-3 rounded-md border border-border/40 bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
            {contextLine}
          </div>
        ) : null}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="space-y-3"
        >
          <label className="block text-sm">
            <span className="mb-1 block text-foreground/80">🟢 名稱 *</span>
            <input
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="輸入名稱..."
              className="w-full rounded border border-border/50 bg-background px-2 py-1 text-sm"
              required
              disabled={busy}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-foreground/80">⚪ 代碼（可空、自動產）</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="留空自動產"
              className="w-full rounded border border-border/50 bg-background px-2 py-1 font-mono text-sm uppercase"
              disabled={busy}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-foreground/80">⚪ 說明（可空）</span>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="這個的用途..."
              className="w-full rounded border border-border/50 bg-background px-2 py-1 text-sm"
              disabled={busy}
            />
          </label>
          {err ? <div className="text-xs text-destructive">{err}</div> : null}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-md border border-border/50 bg-card px-3 py-1.5 text-xs text-foreground/80 hover:bg-accent/15 disabled:opacity-50"
            >
              取消 (Esc)
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {busy ? '建立中…' : '建立 (Ctrl+Enter)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
