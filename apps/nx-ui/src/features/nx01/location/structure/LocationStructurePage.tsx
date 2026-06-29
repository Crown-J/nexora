// apps/nx-ui/src/features/nx01/location/structure/LocationStructurePage.tsx
// 據點架構圖 v4：五層架構 + 六層介面 + 全鍵盤（2026-06-28 執行長拍板）
//
// 五層 cascade（單一版面、不再分員工/結構兩版）：
//   據點 → 倉庫 → 區域 → 貨架 → 庫位
//   （員工歸屬已移除：一人一據點、改在「使用者基本資料」設 primarySiteId）
//
// 六層介面：L3 情境工具列（ErpToolbar 銀質 bar）+ L4 五分頁（Alt+1~5）+ L5 五欄
//
// 全鍵盤（window listener）：
//   Alt+1~5 直接切欄 / ← → 切欄 / ↑ ↓ 欄內移卡 / Enter cascade
//   A 依當前欄新增（據點/倉庫/區域/貨架/庫位）/ [ ] 上下主檔 / F3 主檔切換 / ? 熱鍵

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Boxes,
  Building2,
  HelpCircle,
  Keyboard,
  Layers,
  Network,
  Package,
  Plus,
  RefreshCw,
  Warehouse as WarehouseIcon,
} from 'lucide-react';

import { cn } from '@design/utils/cn';
import { ToolbarPortal } from '@design/layout/workbench/WorkbenchToolbarSlot';
import { ToolbarButton, ToolbarSeparator } from '@/features/nx01/shell/ui/ErpToolbar';
import { ToastStack, useToast } from '@design/components/toast/ToastStack';
import { useReducedMotion } from '@/design/motion/gsap';
import { tryNavigate } from '@design/hooks/useDirtyGuard';

import { MasterSwitcher } from '@/features/nx01/shell/keyboard-card-master/MasterSwitcher';
import { MASTER_PAGES } from '@/features/nx01/shell/master-nav/master-pages';

import { createSite, listSites, type SiteDto } from '@data/endpoints/nx01/api/site';
import {
  createWarehouse,
  listWarehouses,
  type WarehouseDto,
} from '@data/endpoints/nx01/api/warehouse';
import {
  createWarehouseZone,
  listWarehouseZones,
  type WarehouseZoneRow,
} from '@data/endpoints/nx01/api/warehouse-zone';
import {
  createWarehouseRack,
  listWarehouseRacks,
  type WarehouseRackRow,
} from '@data/endpoints/nx01/api/warehouse-rack';
import {
  createLocation,
  listLocation,
} from '@data/endpoints/shared/master/location/api/location';
import type { LocationDto } from '@data/types/shared/master/location';

const CURRENT_PAGE_ID = 'sitechart';

type Zone = 'site' | 'warehouse' | 'zone' | 'rack' | 'location';
const ZONES: Zone[] = ['site', 'warehouse', 'zone', 'rack', 'location'];

// LocationDto 尚未型別化 zoneId / rackId（後端已回傳）→ 視窗讀取用 cast
type LocRow = LocationDto & { zoneId?: string | null; rackId?: string | null };

export function LocationStructurePage() {
  const router = useRouter();
  const { toasts, showToast } = useToast();
  const reducedMotion = useReducedMotion();

  // ---------- 資料 ----------
  const [sites, setSites] = useState<SiteDto[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([]);
  const [zones, setZones] = useState<WarehouseZoneRow[]>([]);
  const [racks, setRacks] = useState<WarehouseRackRow[]>([]);
  const [locations, setLocations] = useState<LocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadTick, setReloadTick] = useState(0);

  // ---------- cascade 選擇 ----------
  const [siteId, setSiteId] = useState<string | null>(null);
  const [warehouseId, setWarehouseId] = useState<string | null>(null);
  const [zoneId, setZoneId] = useState<string | null>(null);
  const [rackId, setRackId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);

  // ---------- 焦點 ----------
  const [zone, setZone] = useState<Zone>('site');
  const [siteIdx, setSiteIdx] = useState(0);
  const [warehouseIdx, setWarehouseIdx] = useState(0);
  const [zoneIdx, setZoneIdx] = useState(0);
  const [rackIdx, setRackIdx] = useState(0);
  const [locationIdx, setLocationIdx] = useState(0);

  // ---------- modal / overlay ----------
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState<Zone | null>(null);

  // ---------- 載入 ----------
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        // 後端 Nx01ListQueryDto @Max(100)、單頁上限 100；LITE 客戶資料量小、暫不分頁迭代
        const [siteRes, whRes, zoneRes, rackRes, locRes] = await Promise.all([
          listSites({ pageSize: 100, isActive: true }),
          listWarehouses({ pageSize: 100, isActive: true }),
          listWarehouseZones({ pageSize: 100, isActive: true }),
          listWarehouseRacks({ pageSize: 100, isActive: true }),
          listLocation({ page: 1, pageSize: 100, isActive: true }),
        ]);
        if (cancelled) return;
        setSites(siteRes.items);
        setWarehouses(whRes.items);
        setZones(zoneRes.rows);
        setRacks(rackRes.rows);
        setLocations(locRes.items as LocRow[]);
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
  const racksForZone = useMemo(
    () => (zoneId ? racks.filter((r) => r.zoneId === zoneId) : []),
    [racks, zoneId],
  );
  const locationsForRack = useMemo(
    () => (rackId ? locations.filter((l) => l.rackId === rackId) : []),
    [locations, rackId],
  );

  // ---------- 選定 helpers ----------
  const selectSite = useCallback((id: string) => {
    setSiteId(id);
    setWarehouseId(null);
    setZoneId(null);
    setRackId(null);
    setLocationId(null);
    setWarehouseIdx(0);
    setZoneIdx(0);
    setRackIdx(0);
    setLocationIdx(0);
  }, []);
  const selectWarehouse = useCallback((id: string) => {
    setWarehouseId(id);
    setZoneId(null);
    setRackId(null);
    setLocationId(null);
    setZoneIdx(0);
    setRackIdx(0);
    setLocationIdx(0);
  }, []);
  const selectZone = useCallback((id: string) => {
    setZoneId(id);
    setRackId(null);
    setLocationId(null);
    setRackIdx(0);
    setLocationIdx(0);
  }, []);
  const selectRack = useCallback((id: string) => {
    setRackId(id);
    setLocationId(null);
    setLocationIdx(0);
  }, []);

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

  // 依當前欄分流新增（A 鍵 + 工具列共用）
  const addByZone = useCallback(() => {
    if (zone === 'site') setCreateOpen('site');
    else if (zone === 'warehouse' && siteId) setCreateOpen('warehouse');
    else if (zone === 'zone' && warehouseId) setCreateOpen('zone');
    else if (zone === 'rack' && zoneId) setCreateOpen('rack');
    else if (zone === 'location' && rackId) setCreateOpen('location');
  }, [zone, siteId, warehouseId, zoneId, rackId]);

  // ---------- 鍵盤 ----------
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName ?? '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        if (e.key === 'Escape') (t as HTMLElement).blur();
        return;
      }
      if (switcherOpen || helpOpen || createOpen) {
        if (e.key === 'Escape') {
          setSwitcherOpen(false);
          setHelpOpen(false);
          setCreateOpen(null);
          e.preventDefault();
        }
        return;
      }

      // Alt+1~5：直接切欄
      if (e.altKey && ['1', '2', '3', '4', '5'].includes(e.key)) {
        e.preventDefault();
        setZone(ZONES[Number(e.key) - 1]);
        return;
      }

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

      // A：依當前 focused 欄分流新增
      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        addByZone();
        return;
      }

      // ← → 切欄
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const dir = e.key === 'ArrowRight' ? 1 : -1;
        const idx = ZONES.indexOf(zone);
        setZone(ZONES[(idx + dir + ZONES.length) % ZONES.length]);
        return;
      }

      // 欄內 ↑ ↓ / Home / End / Enter
      const lists: Record<Zone, { count: number; idx: number; setIdx: (i: number) => void }> = {
        site: { count: sites.length, idx: siteIdx, setIdx: setSiteIdx },
        warehouse: { count: warehousesForSite.length, idx: warehouseIdx, setIdx: setWarehouseIdx },
        zone: { count: zonesForWarehouse.length, idx: zoneIdx, setIdx: setZoneIdx },
        rack: { count: racksForZone.length, idx: rackIdx, setIdx: setRackIdx },
        location: { count: locationsForRack.length, idx: locationIdx, setIdx: setLocationIdx },
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
          setZone('zone');
        } else if (zone === 'zone' && zonesForWarehouse[zoneIdx]) {
          selectZone(zonesForWarehouse[zoneIdx].id);
          setZone('rack');
        } else if (zone === 'rack' && racksForZone[rackIdx]) {
          selectRack(racksForZone[rackIdx].id);
          setZone('location');
        } else if (zone === 'location' && locationsForRack[locationIdx]) {
          setLocationId(locationsForRack[locationIdx].id);
        }
        return;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    zone,
    siteIdx,
    warehouseIdx,
    zoneIdx,
    rackIdx,
    locationIdx,
    sites,
    warehousesForSite,
    zonesForWarehouse,
    racksForZone,
    locationsForRack,
    siteId,
    warehouseId,
    zoneId,
    rackId,
    switcherOpen,
    helpOpen,
    createOpen,
    switchMaster,
    addByZone,
  ]);

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
  const selectedRack = rackId ? racks.find((r) => r.id === rackId) : null;

  const addLabel =
    zone === 'site'
      ? '新增據點'
      : zone === 'warehouse'
        ? '新增倉庫'
        : zone === 'zone'
          ? '新增區域'
          : zone === 'rack'
            ? '新增貨架'
            : '新增庫位';
  const addEnabled =
    zone === 'site' ||
    (zone === 'warehouse' && !!siteId) ||
    (zone === 'zone' && !!warehouseId) ||
    (zone === 'rack' && !!zoneId) ||
    (zone === 'location' && !!rackId);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ── L3 情境工具列：共用 ErpToolbar 銀質 bar、按鈕依聚焦欄變換 ── */}
      <ToolbarPortal>
        <div
          data-nx-frame
          className="flex items-center gap-1 border-b border-border/40 px-3 py-2"
          style={{
            backgroundImage:
              'linear-gradient(180deg, var(--nx-surface-toolbar-from) 0%, var(--nx-surface-toolbar-to) 100%)',
            boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.04), 0 1px 0 0 rgba(0,0,0,0.5)',
          }}
        >
          <ToolbarButton icon={Plus} letter="A" label={addLabel} enabled={addEnabled} onClick={addByZone} />
          <ToolbarSeparator />
          <ToolbarButton icon={RefreshCw} letter="R" label="重新整理" enabled onClick={triggerReload} />
          <ToolbarButton icon={Keyboard} letter="?" label="熱鍵" enabled onClick={() => setHelpOpen(true)} />
          <div className="flex-1" />
          <span className="hidden text-[11px] text-muted-foreground lg:inline">
            Alt+1~5 切欄 · ↑↓ 移卡 · ←→ 切欄 · Enter 選定 · A 新增
          </span>
        </div>
      </ToolbarPortal>

      {/* ── L4 頁內分頁：五欄同時顯示、tab 標示焦點欄（Alt+1~5）── */}
      <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-border bg-background px-3 py-1">
        <ColTab label="據點" count={sites.length} hint="1" active={zone === 'site'} onClick={() => setZone('site')} />
        <ColTab label="倉庫" count={warehousesForSite.length} hint="2" active={zone === 'warehouse'} onClick={() => setZone('warehouse')} />
        <ColTab label="區域" count={zonesForWarehouse.length} hint="3" active={zone === 'zone'} onClick={() => setZone('zone')} />
        <ColTab label="貨架" count={racksForZone.length} hint="4" active={zone === 'rack'} onClick={() => setZone('rack')} />
        <ColTab label="庫位" count={locationsForRack.length} hint="5" active={zone === 'location'} onClick={() => setZone('location')} />
      </div>

      {/* ── L5 主內容：五欄並列 ── */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 px-4 py-3 md:grid-cols-5">
        <ColumnPanel
          title="據點"
          subtitle={`${sites.length} 項`}
          icon={Building2}
          active={zone === 'site'}
          onClick={() => setZone('site')}
          shortcut="1"
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
                  setSiteIdx(i);
                  selectSite(s.id);
                  setZone('warehouse');
                }}
              />
            ))
          )}
        </ColumnPanel>

        <ColumnPanel
          title="倉庫"
          subtitle={selectedSite ? `${selectedSite.name} ▸ ${warehousesForSite.length} 項` : '請先選據點'}
          icon={WarehouseIcon}
          active={zone === 'warehouse'}
          onClick={() => setZone('warehouse')}
          shortcut="2"
          disabled={!siteId}
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
                count={zones.filter((z) => z.warehouseId === w.id).length}
                countLabel="區"
                focused={zone === 'warehouse' && warehouseIdx === i}
                selected={warehouseId === w.id}
                reducedMotion={reducedMotion}
                onClick={() => {
                  setWarehouseIdx(i);
                  selectWarehouse(w.id);
                  setZone('zone');
                }}
              />
            ))
          )}
        </ColumnPanel>

        <ColumnPanel
          title="區域"
          subtitle={selectedWarehouse ? `${selectedWarehouse.name} ▸ ${zonesForWarehouse.length} 項` : '請先選倉庫'}
          icon={Layers}
          active={zone === 'zone'}
          onClick={() => setZone('zone')}
          shortcut="3"
          disabled={!warehouseId}
        >
          {!warehouseId ? (
            <EmptyHint text="← 請先選倉庫" />
          ) : zonesForWarehouse.length === 0 ? (
            <EmptyHint text="此倉庫尚無區域" />
          ) : (
            zonesForWarehouse.map((z, i) => (
              <Card
                key={z.id}
                title={z.name}
                code={z.code}
                count={racks.filter((r) => r.zoneId === z.id).length}
                countLabel="架"
                focused={zone === 'zone' && zoneIdx === i}
                selected={zoneId === z.id}
                reducedMotion={reducedMotion}
                onClick={() => {
                  setZoneIdx(i);
                  selectZone(z.id);
                  setZone('rack');
                }}
              />
            ))
          )}
        </ColumnPanel>

        <ColumnPanel
          title="貨架"
          subtitle={selectedZone ? `${selectedZone.name} ▸ ${racksForZone.length} 項` : '請先選區域'}
          icon={Boxes}
          active={zone === 'rack'}
          onClick={() => setZone('rack')}
          shortcut="4"
          disabled={!zoneId}
        >
          {!zoneId ? (
            <EmptyHint text="← 請先選區域" />
          ) : racksForZone.length === 0 ? (
            <EmptyHint text="此區域尚無貨架" />
          ) : (
            racksForZone.map((r, i) => (
              <Card
                key={r.id}
                title={r.name}
                code={r.code}
                count={locations.filter((l) => l.rackId === r.id).length}
                countLabel="位"
                focused={zone === 'rack' && rackIdx === i}
                selected={rackId === r.id}
                reducedMotion={reducedMotion}
                onClick={() => {
                  setRackIdx(i);
                  selectRack(r.id);
                  setZone('location');
                }}
              />
            ))
          )}
        </ColumnPanel>

        <ColumnPanel
          title="庫位"
          subtitle={selectedRack ? `${selectedRack.name} ▸ ${locationsForRack.length} 項` : '請先選貨架'}
          icon={Package}
          active={zone === 'location'}
          onClick={() => setZone('location')}
          shortcut="5"
          disabled={!rackId}
        >
          {!rackId ? (
            <EmptyHint text="← 請先選貨架" />
          ) : locationsForRack.length === 0 ? (
            <EmptyHint text="此貨架尚無庫位、按 A 新增" />
          ) : (
            locationsForRack.map((l, i) => (
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
      </div>

      {/* 主檔切換 modal */}
      <MasterSwitcher open={switcherOpen} currentPageId={CURRENT_PAGE_ID} onClose={() => setSwitcherOpen(false)} />

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
            setZone('zone');
          }}
        />
      ) : null}
      {createOpen === 'zone' && warehouseId && selectedWarehouse ? (
        <QuickCreateDialog
          title="新增區域"
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
            showToast(`已新增區域「${z.name}」`, 'success');
            triggerReload();
            selectZone(z.id);
            setZone('rack');
          }}
        />
      ) : null}
      {createOpen === 'rack' && zoneId && selectedZone ? (
        <QuickCreateDialog
          title="新增貨架"
          subtitle="Create Rack"
          icon={Boxes}
          contextLine={`隸屬區域：${selectedZone.name}（${selectedWarehouse?.name ?? ''}）`}
          onClose={() => setCreateOpen(null)}
          onSubmit={async ({ code, name }) => {
            const r = await createWarehouseRack({
              zoneId,
              code: code || `R${Date.now().toString(36).toUpperCase().slice(0, 5)}`,
              name,
            });
            showToast(`已新增貨架「${r.name}」`, 'success');
            triggerReload();
            selectRack(r.id);
            setZone('location');
          }}
        />
      ) : null}
      {createOpen === 'location' && warehouseId && rackId && selectedRack ? (
        <QuickCreateDialog
          title="新增庫位"
          subtitle="Create Location"
          icon={Package}
          contextLine={`隸屬貨架：${selectedRack.name}（${selectedZone?.name ?? ''} ▸ ${selectedWarehouse?.name ?? ''}）`}
          onClose={() => setCreateOpen(null)}
          onSubmit={async ({ code, name }) => {
            const l = await createLocation({
              warehouseId,
              zoneId: zoneId ?? null,
              rackId,
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

/** L4 頁內分頁的一個欄位 tab（五欄同時顯示、active 標示焦點欄、附 Alt 提示）*/
function ColTab({
  label,
  count,
  hint,
  active,
  onClick,
}: {
  label: string;
  count: number;
  hint: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-medium transition-colors',
        active
          ? 'border-primary/50 bg-primary/10 text-primary'
          : 'border-transparent text-muted-foreground hover:bg-accent/15 hover:text-foreground',
      )}
    >
      <span className="font-mono text-[10px] opacity-60">Alt+{hint}</span>
      {label}
      <span
        className={cn(
          'inline-flex min-w-4 items-center justify-center rounded px-1 text-[10px]',
          active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
        )}
      >
        {count}
      </span>
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
}: {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onClick: () => void;
  shortcut: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      onClick={onClick}
      className={cn(
        // 手機逐層下鑽：只顯示當前聚焦欄；桌面五欄並列（md:flex）
        active ? 'flex' : 'hidden',
        'md:flex min-h-0 flex-col overflow-hidden rounded-lg border bg-card transition-all',
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

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="grid place-items-center py-8 text-center text-[12px] text-muted-foreground">
      <Network className="mb-2 size-6 opacity-40" />
      {text}
    </div>
  );
}

function HelpOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-border/40 bg-popover p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-3 flex items-center gap-2">
          <HelpCircle className="size-5 text-primary" />
          <h2 className="text-sm font-bold tracking-wide text-foreground">據點架構圖 · 鍵盤指南</h2>
        </header>
        <div className="space-y-2 text-[12px] text-foreground/85">
          <Row k="Alt+1~5" desc="直接切到 據點 / 倉庫 / 區域 / 貨架 / 庫位 欄" />
          <Row k="← →" desc="左右切換欄" />
          <Row k="↑ ↓" desc="欄內上下移卡片" />
          <Row k="Home / End" desc="欄內跳頭尾" />
          <Row k="Enter / Space" desc="選定 + cascade 到下一欄" />
          <Row k="A" desc="依當前欄：新增 據點 / 倉庫 / 區域 / 貨架 / 庫位" />
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
