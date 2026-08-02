// apps/nx-ui/src/features/nx03/workstation/stocktake/CountField.tsx
//
// 盤點（現場殼第 5 步・下半）
// 規格：docs/專案/介面規格/NEXORA-外殼規格-v3.0.0.md §7
//
// ⭐ 盤點的現場動作是「一項一項數，把實際數量填進去」——
//    這是六個現場流程裡唯一**每一件都要輸入一個數字**的。
//    所以 currentSlot 放的是數量輸入框（形狀同出貨的簽收人欄位），
//    ⛔ 不是唯讀卡片。
//
// ⚠️ 兩層資料：先有一張進行中的盤點單，才有一項一項的明細。
//    ⛔ 不做「先選單再進另一頁」——現場的人手上就是那一張單，
//    有一張就直接進去數；有多張才要選。
//
// ⭐ 刻意⛔ 不顯示系統帳上的數量：
//    先看到答案再去數，數出來的一定是答案（現場叫「照抄」）。
//    數完填進去、系統自己算差異——差多少留給盤點差異表在辦公室處理。
//
// ⚠️ 系統裡有兩套盤點（已作廢決策清單 §13）：
//    /inventory/stock-take（九宮格進得去）與 /inventory/stocktake（孤兒、但手機掃碼在那）。
//    本檔接的是同一組 API，⛔ 沒有收斂那兩條路由——那要另外一輪。

'use client';

import { useCallback, useEffect, useState } from 'react';

import { listStockTake } from '@data/endpoints/nx03/stocktake/api/stocktake';
import {
  getStocktake,
  patchStocktakeItem,
  type StocktakeDetail,
  type StocktakeItem,
} from '@data/endpoints/nx03/workstation/api';
import { FieldTemplate, type FieldTask } from '@design/templates/FieldTemplate';

import { BarcodeScanner } from '../shared/BarcodeScanner';

export function CountField() {
  const [sheets, setSheets] = useState<{ id: string; docNo: string }[] | null>(null);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [detail, setDetail] = useState<StocktakeDetail | null>(null);
  const [currentId, setCurrentId] = useState<string | undefined>();
  const [qty, setQty] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(false);

  // 進行中的盤點單。⛔ 不撈草稿（還沒開始數）也⛔ 不撈已過帳的
  const loadSheets = useCallback(async () => {
    try {
      const r = await listStockTake({ status: 'COUNTING', pageSize: 50 });
      const rows = (r.items ?? []).map((s) => ({ id: s.id, docNo: s.docNo }));
      setSheets(rows);
      setSheetId((prev) => prev ?? rows[0]?.id ?? null);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '讀不到盤點單');
      setSheets([]);
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    try {
      setDetail(await getStocktake(id));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '讀不到盤點明細');
      setDetail(null);
    }
  }, []);

  useEffect(() => {
    void loadSheets();
  }, [loadSheets]);

  useEffect(() => {
    if (sheetId) void loadDetail(sheetId);
  }, [sheetId, loadDetail]);

  if (sheets === null) return <div className="nx-hint p-5">載入中⋯</div>;

  const items: StocktakeItem[] = detail?.items ?? [];
  const current = items.find((i) => i.id === currentId) ?? items.find((i) => i.countedQty == null) ?? items[0] ?? null;

  const tasks: FieldTask[] = items.map((i) => ({
    id: i.id,
    code: i.partNo ?? '—',
    name: i.partName ?? undefined,
    place: i.locationId ?? undefined,
    // ⭐ 這裡放「已數到多少」⛔ 不放系統帳上的量——⛔ 不給答案
    qty: i.countedQty == null ? '—' : String(Number(i.countedQty)),
    unit: i.countedQty == null ? undefined : '個',
    note: i.countedQty == null ? undefined : '已數過，可以重數',
    done: i.countedQty != null,
  }));

  const save = async () => {
    if (!current || !sheetId || busy) return;
    const n = Number(qty);
    if (!qty.trim() || Number.isNaN(n) || n < 0) {
      setMsg('請填一個 0 或以上的數字');
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await patchStocktakeItem(sheetId, current.id, { countedQty: n });
      setMsg(`${current.partNo} 記為 ${n}`);
      setQty('');
      setCurrentId(undefined);
      await loadDetail(sheetId);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '存不進去，請再試一次');
    } finally {
      setBusy(false);
    }
  };

  /** 掃到條碼 → 跳到那一項，游標直接落在數量上（⛔ 不必再點一次） */
  const onScan = (code: string) => {
    const k = code.replace(/\s/g, '').toUpperCase();
    const hit = items.find((i) => (i.partNo ?? '').replace(/\s/g, '').toUpperCase() === k);
    if (hit) {
      setCurrentId(hit.id);
      setQty('');
      setMsg(`跳到 ${hit.partNo}`);
      setTimeout(() => document.getElementById('count-qty')?.focus(), 0);
    } else {
      setMsg(`這張盤點單裡沒有 ${code}`);
    }
  };

  const countedCount = items.filter((i) => i.countedQty != null).length;

  return (
    <div className="flex h-full flex-col">
      {/* 有多張進行中的盤點單才需要選；只有一張就⛔ 不佔畫面 */}
      {sheets.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-2">
          <span className="nx-hint">盤哪一張</span>
          {sheets.map((s) => (
            <button
              key={s.id}
              type="button"
              className={s.id === sheetId ? 'nx-btn-primary' : 'nx-btn'}
              onClick={() => {
                setSheetId(s.id);
                setCurrentId(undefined);
                setQty('');
              }}
            >
              {s.docNo}
            </button>
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1">
        <FieldTemplate
          title={detail ? `盤點・${detail.docNo}` : '盤點'}
          tasks={tasks}
          currentId={current?.id}
          onCurrentChange={(id) => {
            setCurrentId(id);
            setQty('');
          }}
          onScan={onScan}
          emptyText={
            sheets.length === 0 ? '目前沒有進行中的盤點單。' : '這張盤點單沒有要數的品項。'
          }
          scanSlot={
            <button type="button" className="nx-btn h-12 w-full" onClick={() => setScanOpen(true)}>
              掃條碼
            </button>
          }
          currentSlot={
            !current ? undefined : (
              <div className="flex flex-col gap-3">
                <div className="nx-card">
                  <div className="nx-num-xl leading-8">{current.partNo}</div>
                  {current.partName && <div className="nx-body mt-1">{current.partName}</div>}
                  {current.locationId && <div className="nx-hint mt-1">{current.locationId}</div>}
                  {/* ⭐ 這裡刻意⛔ 不寫系統帳上有幾個——先看到答案就不會認真數 */}
                  <div className="nx-hint mt-2">
                    數完直接填下面。系統帳上有幾個要等數完才會顯示差異。
                  </div>
                </div>
                <div className="nx-card">
                  <label className="nx-label" htmlFor="count-qty">
                    實際數到幾個
                  </label>
                  <input
                    id="count-qty"
                    className="nx-field-lg"
                    inputMode="numeric"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void save();
                      }
                    }}
                    placeholder="0"
                    disabled={busy}
                  />
                  <p className="nx-hint mt-2">打完按 Enter 就記下來，接著數下一項。</p>
                </div>
              </div>
            )
          }
          actions={[
            {
              key: 'save',
              label: busy ? '存檔中⋯' : '記下來',
              tone: 'confirm',
              disabled: busy || !current || !qty.trim(),
              onClick: () => void save(),
            },
            {
              key: 'skip',
              label: '先跳過',
              disabled: busy || !current,
              // 純畫面：⛔ 不動帳，等一下回來數
              onClick: () => {
                const i = items.findIndex((x) => x.id === current?.id);
                const next =
                  items.slice(i + 1).find((x) => x.countedQty == null) ??
                  items.find((x) => x.countedQty == null);
                setCurrentId(next?.id);
                setQty('');
                setMsg(null);
              },
            },
          ]}
        />
      </div>

      <div className="border-t border-border px-5 py-2">
        <span className="nx-hint">
          {msg ?? (detail ? `已數 ${countedCount} / ${items.length} 項` : '　')}
        </span>
      </div>

      <BarcodeScanner
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onScan={(text) => {
          onScan(text);
          return false;
        }}
      />
    </div>
  );
}
