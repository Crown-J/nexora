// apps/nx-ui/src/features/nx03/workstation/packing/PackField.tsx
//
// 包貨（現場殼第 3 步）
// 規格：docs/專案/介面規格/NEXORA-外殼規格-v3.0.0.md §7
//
// ⭐ 包貨是「定點站」的主場——包貨台那面固定螢幕、掃描槍、一次一箱。
//    ⚠️ 它跟撿貨的形狀不一樣：撿貨是「一次一件確認」、包貨是「把左邊的搬進右邊的箱」。
//    所以當前那一塊用 FieldTemplate 的 currentSlot 換成「正在裝的箱」，
//    佇列・進度・動作列・掃描槍・三套佈局全部照舊共用、⛔ 不分叉另一支殼。
//
// ⭐ 看板沿用既有的 PackageWorkbench（包裹列表 ＋ 兩分頁），⛔ 不重寫。
//    ⚠️ 但它的「新增」是一個 5 步彈窗精靈——那違反介面架構 §2.1「⛔ 不做彈跳視窗」，
//    而定點佈局正是要取代它的東西。⛔ 本輪不刪精靈（看板還在用），已記為待收斂。
//
// ⚠️ 這一頁會真的寫資料：開箱／加貨／封箱都是按下即寫、伺服器為準。

'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  addToBox,
  createBox,
  discardBox,
  getPackWorkspace,
  sealPacking,
  type PackBox,
  type PackWorkspace,
} from '@data/endpoints/nx03/workstation/api';
import { FieldTemplate, type FieldTask } from '@design/templates/FieldTemplate';
import { useWorkstation } from '@design/hooks/useWorkstation';

import { PackageWorkbench } from './PackageWorkbench';

/** 出貨方式：⛔ 不對使用者露 D/P/C 這種代碼 */
const TYPE_LABEL: Record<string, string> = { D: '配送', P: '自取', C: '寄貨' };
const typeText = (t: string) => TYPE_LABEL[t] ?? t;

export function PackField() {
  const ws = useWorkstation();
  const [wsData, setWsData] = useState<PackWorkspace | null>(null);
  const [currentId, setCurrentId] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setWsData(await getPackWorkspace());
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '讀不到待包清單');
      setWsData({ pool: [], boxes: { P: [], C: [], D: [] } });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // 看板：⭐ 沿用既有的包裹工作台，⛔ 不重寫
  if (ws.ready && ws.layout === 'board') return <PackageWorkbench />;

  if (!wsData) return <div className="nx-hint p-5">載入中⋯</div>;

  const pool = wsData.pool;
  const selected = pool.find((s) => s.soId === currentId) ?? pool[0] ?? null;
  /**
   * 目前的箱＝選中那張單的出貨方式底下第一個還在建的箱。
   * ⚠️ 實跑踩到：把最後一張單裝進箱之後 pool 空了、selected 變 null，
   *    箱子明明還在卻找不到，封箱鍵整排變灰、使用者卡住。
   *    → 沒有選中的單時，退回「哪一種出貨方式有開著的箱就用哪個」。
   */
  const boxOf = (t: 'D' | 'P' | 'C'): PackBox | null => wsData.boxes[t]?.[0] ?? null;
  const box = selected
    ? boxOf(selected.deliveryType as 'D' | 'P' | 'C')
    : (boxOf('D') ?? boxOf('P') ?? boxOf('C'));

  const tasks: FieldTask[] = pool.map((s) => ({
    id: s.soId,
    code: s.soDocNo,
    name: s.customerName,
    place: typeText(s.deliveryType),
    qty: String(s.lines.length),
    unit: '項',
    note: s.deliveryAddress ?? undefined,
  }));

  const run = async (fn: () => Promise<string>) => {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      setMsg(await fn());
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '操作失敗，請再試一次');
    } finally {
      setBusy(false);
    }
  };

  /** 掃到條碼 → 跳到那張單（比對單號，比不到再比料號） */
  const onScan = (code: string) => {
    const k = code.replace(/\s/g, '').toUpperCase();
    const hit =
      pool.find((s) => s.soDocNo.replace(/\s/g, '').toUpperCase() === k) ??
      pool.find((s) => s.lines.some((l) => l.partNo.replace(/\s/g, '').toUpperCase() === k));
    if (hit) {
      setCurrentId(hit.soId);
      setMsg(`跳到 ${hit.soDocNo}`);
    } else {
      setMsg(`待包清單裡沒有 ${code}`);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
        <FieldTemplate
          title="包貨"
          tasks={tasks}
          currentId={selected?.soId}
          onCurrentChange={setCurrentId}
          onScan={onScan}
          emptyText="目前沒有撿完待包的貨。"
          currentSlot={
            <div className="flex flex-col gap-3">
              {/* 這張單有什麼 */}
              <div className="nx-card">
                <div className="flex items-baseline gap-3">
                  <span className="nx-t-sec">{selected?.soDocNo ?? '—'}</span>
                  <span className="nx-body">{selected?.customerName}</span>
                  {selected && <span className="nx-tag ml-auto">{typeText(selected.deliveryType)}</span>}
                </div>
                <ul className="mt-3 flex flex-col gap-1">
                  {selected?.lines.map((l) => (
                    <li key={l.pkItemId} className="flex items-baseline gap-3">
                      <span className="nx-mono">{l.partNo}</span>
                      <span className="nx-body">{l.partName}</span>
                      <span className="nx-num ml-auto">×{Number(l.qty)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* ⭐ 正在裝的箱——這就是「當前」，⛔ 不是佇列裡的一筆 */}
              <div className="nx-card">
                <div className="flex items-baseline gap-3">
                  <span className="nx-t-sub">正在裝的箱</span>
                  {box ? (
                    <>
                      <span className="nx-mono">{box.docNo}</span>
                      <span className="nx-hint ml-auto">
                        {box.lineCount} 項
                        {box.mixedCustomer ? '　混客戶' : ''}
                      </span>
                    </>
                  ) : (
                    <span className="nx-hint ml-auto">還沒開箱——按「加入這箱」會自動開一個</span>
                  )}
                </div>
                {box && box.lines.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1">
                    {box.lines.map((l) => (
                      <li key={l.plItemId} className="flex items-baseline gap-3">
                        <span className="nx-mono">{l.partNo}</span>
                        <span className="nx-hint">{l.soDocNo}</span>
                        <span className="nx-num ml-auto">×{Number(l.qty)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {box?.mixedCustomer && (
                  <div className="nx-alert-warn mt-2">這箱裝了不同客戶的貨，封箱前請確認是不是故意的。</div>
                )}
              </div>
            </div>
          }
          actions={[
            {
              key: 'add',
              label: busy ? '處理中⋯' : '加入這箱',
              tone: 'confirm',
              disabled: busy || !selected,
              onClick: () =>
                void run(async () => {
                  if (!selected) return '';
                  // 沒箱就先開一個（同出貨方式），⛔ 不要求使用者先按「開箱」
                  let target = box;
                  if (!target) {
                    const r = await createBox(
                      selected.deliveryType as 'D' | 'P' | 'C',
                      selected.warehouseId,
                    );
                    target = (r.boxes[selected.deliveryType as 'D' | 'P' | 'C'] ?? [])[0] ?? null;
                  }
                  if (!target) return '開箱失敗';
                  await addToBox(
                    target.plId,
                    selected.lines.map((l) => l.pkItemId),
                  );
                  return `${selected.soDocNo} 的 ${selected.lines.length} 項裝進 ${target.docNo}`;
                }),
            },
            {
              key: 'seal',
              label: '封箱',
              disabled: busy || !box || box.lineCount === 0,
              onClick: () =>
                void run(async () => {
                  if (!box) return '';
                  const r = await sealPacking(box.plId);
                  return `${r.docNo ?? box.docNo} 已封箱`;
                }),
            },
            {
              key: 'discard',
              label: '丟棄這箱',
              tone: 'problem',
              disabled: busy || !box,
              // ⚠️ 貨會全部退回左邊的待包池，⛔ 不是刪掉
              onClick: () =>
                void run(async () => {
                  if (!box) return '';
                  await discardBox(box.plId);
                  return `${box.docNo} 已丟棄，貨退回待包`;
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
