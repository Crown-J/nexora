// apps/nx-ui/src/features/nx03/workstation/ship-zones/ShipField.tsx
//
// 出貨（現場殼第 4 步）
// 規格：docs/專案/介面規格/NEXORA-外殼規格-v3.0.0.md §7
//
// ⭐ 出貨台的現場工作是「一次交出一箱」：
//    自取＝客戶站在櫃檯前，簽個名把貨帶走；
//    寄貨＝貼單號、交給貨運。
//    兩個都是一次一箱、當場完成，正是定點站的形狀。
//
// ⭐ 配送配單⛔ 不在這裡——那是「把多張包貨單組成一趟、派給某個外務」，
//    是**分配工作**不是現場執行，照外殼規格 §7 屬於看板。
//    看板沿用既有的 ShipZonesPage（三區都在、含配單），⛔ 不重寫。
//
// ⚠️ 這一頁會真的寫資料：簽收與寄出都會把對應的銷貨單推進到完成。

'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  getShipZones,
  shipMail,
  signPickup,
  type ShipZoneItem,
  type ShipZones,
} from '@data/endpoints/nx03/workstation/api';
import { FieldTemplate, type FieldTask } from '@design/templates/FieldTemplate';
import { useWorkstation } from '@design/hooks/useWorkstation';

import { ShipZonesPage } from './ShipZonesPage';

type Zone = 'pickup' | 'mail';
const ZONE_LABEL: Record<Zone, string> = { pickup: '自取', mail: '寄貨' };

export function ShipField() {
  const ws = useWorkstation();
  const [zones, setZones] = useState<ShipZones | null>(null);
  const [zone, setZone] = useState<Zone>('pickup');
  const [currentId, setCurrentId] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // 自取要簽收人；寄貨要物流商與追蹤號
  const [signer, setSigner] = useState('');
  const [provider, setProvider] = useState('');
  const [tracking, setTracking] = useState('');

  const load = useCallback(async () => {
    try {
      setZones(await getShipZones());
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '讀不到出貨清單');
      setZones({ pickup: [], mail: [], delivery: [] });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // 看板：⭐ 沿用既有的出貨三區頁（含配送配單），⛔ 不重寫
  if (ws.ready && ws.layout === 'board') return <ShipZonesPage />;

  if (!zones) return <div className="nx-hint p-5">載入中⋯</div>;

  const list: ShipZoneItem[] = zones[zone];
  const selected = list.find((i) => i.plId === currentId) ?? list[0] ?? null;

  const tasks: FieldTask[] = list.map((i) => ({
    id: i.plId,
    code: i.docNo,
    name: i.customerName,
    place: i.soDocNos.join('、') || undefined,
    qty: String(i.parcelCount),
    unit: '箱',
    note: i.deliveryAddress ?? undefined,
  }));

  const run = async (fn: () => Promise<string>) => {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      setMsg(await fn());
      setCurrentId(undefined);
      setSigner('');
      setProvider('');
      setTracking('');
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '操作失敗，請再試一次');
    } finally {
      setBusy(false);
    }
  };

  /** 掃到條碼 → 跳到那一箱（包貨單號，比不到再比銷貨單號） */
  const onScan = (code: string) => {
    const k = code.replace(/\s/g, '').toUpperCase();
    for (const z of ['pickup', 'mail'] as Zone[]) {
      const hit =
        zones[z].find((i) => i.docNo.replace(/\s/g, '').toUpperCase() === k) ??
        zones[z].find((i) => i.soDocNos.some((d) => d.replace(/\s/g, '').toUpperCase() === k));
      if (hit) {
        setZone(z);
        setCurrentId(hit.plId);
        setMsg(`跳到 ${ZONE_LABEL[z]}　${hit.docNo}`);
        return;
      }
    }
    setMsg(`自取與寄貨區都沒有 ${code}`);
  };

  const ready = zone === 'pickup' ? signer.trim().length > 0 : provider.trim() && tracking.trim();

  return (
    <div className="flex h-full flex-col">
      {/* 出貨方式切換：⭐ 一台出貨台通常兩種都要顧 */}
      <div className="flex items-center gap-2 border-b border-border px-5 py-2">
        {(['pickup', 'mail'] as Zone[]).map((z) => (
          <button
            key={z}
            type="button"
            className={z === zone ? 'nx-btn-primary' : 'nx-btn'}
            onClick={() => {
              setZone(z);
              setCurrentId(undefined);
            }}
          >
            {ZONE_LABEL[z]} {zones[z].length}
          </button>
        ))}
        <span className="nx-hint ml-auto">
          配送有 {zones.delivery.length} 張待配單——配單請在電腦上做（要挑外務、組整趟）
        </span>
      </div>

      <div className="min-h-0 flex-1">
        <FieldTemplate
          title={`出貨・${ZONE_LABEL[zone]}`}
          tasks={tasks}
          currentId={selected?.plId}
          onCurrentChange={setCurrentId}
          onScan={onScan}
          emptyText={`${ZONE_LABEL[zone]}區目前沒有待出的貨。`}
          currentSlot={
            <div className="flex flex-col gap-3">
              <div className="nx-card">
                <div className="flex items-baseline gap-3">
                  <span className="nx-t-sec">{selected?.docNo ?? '—'}</span>
                  <span className="nx-body">{selected?.customerName}</span>
                  <span className="nx-tag ml-auto">{selected?.parcelCount ?? 0} 箱</span>
                </div>
                {selected?.soDocNos.length ? (
                  <div className="nx-hint mt-2">銷貨單：{selected.soDocNos.join('、')}</div>
                ) : null}
                {selected?.deliveryAddress && <div className="nx-hint mt-1">{selected.deliveryAddress}</div>}
              </div>

              {/* ⭐ 兩種出貨方式要問的東西不一樣，⛔ 不做成同一組欄位硬湊 */}
              <div className="nx-card">
                {zone === 'pickup' ? (
                  <>
                    <label className="nx-label" htmlFor="ship-signer">
                      誰來拿的（簽收人）
                    </label>
                    <input
                      id="ship-signer"
                      className="nx-field"
                      value={signer}
                      onChange={(e) => setSigner(e.target.value)}
                      placeholder="陳老闆／司機姓名"
                      disabled={!selected || busy}
                    />
                  </>
                ) : (
                  <div className="nx-form-grid">
                    <div>
                      <label className="nx-label" htmlFor="ship-provider">
                        貨運公司
                      </label>
                      <input
                        id="ship-provider"
                        className="nx-field"
                        value={provider}
                        onChange={(e) => setProvider(e.target.value)}
                        placeholder="新竹貨運／黑貓"
                        disabled={!selected || busy}
                      />
                    </div>
                    <div>
                      <label className="nx-label" htmlFor="ship-tracking">
                        追蹤號碼
                      </label>
                      <input
                        id="ship-tracking"
                        className="nx-field"
                        value={tracking}
                        onChange={(e) => setTracking(e.target.value)}
                        placeholder="貼在箱子上的那組號碼"
                        disabled={!selected || busy}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          }
          actions={[
            {
              key: 'done',
              label: busy ? '處理中⋯' : zone === 'pickup' ? '確認交貨' : '確認寄出',
              tone: 'confirm',
              disabled: busy || !selected || !ready,
              onClick: () =>
                void run(async () => {
                  if (!selected) return '';
                  if (zone === 'pickup') {
                    const r = await signPickup(selected.plId, signer.trim());
                    return `${selected.docNo} 已交貨，完成 ${r.completedSoCount} 張銷貨單`;
                  }
                  const r = await shipMail(selected.plId, provider.trim(), tracking.trim());
                  return `${selected.docNo} 已寄出，完成 ${r.completedSoCount} 張銷貨單`;
                }),
            },
          ]}
        />
      </div>

      {msg && (
        <div className="border-t border-border px-5 py-2">
          <span className="nx-hint">{msg}</span>
        </div>
      )}
    </div>
  );
}
