// apps/nx-ui/src/features/nx03/workstation/picking/PickField.tsx
//
// 撿貨（現場殼的第一個真實流程）
// 規格：docs/專案/介面規格/NEXORA-外殼規格-v3.0.0.md §7
//
// ⭐ 一支殼・一個路由・三套佈局：
//    走動（手機）／定點（固定螢幕）＝現場執行，用 FieldTemplate；
//    看板（電腦）＝主管視角，⭐ 沿用既有的三欄看板 PickBoard、⛔ 不重寫。
//    理由：PickBoard 已經有「待撿／已撿／已取消」三欄與取消撿貨、已放回等管理動作，
//    那正是看板該做的事；⛔ 用只有「待撿」的新畫面取代它就是功能倒退。
//
// ⚠️ 這一頁會真的寫資料：確認取件＝POST /nx03/pick-pool/pick（伺服器為準、按下即寫）。
//    ⛔ 不做樂觀更新——現場最怕「畫面說撿了、帳上沒有」。做完重抓清單。

'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  getPickList,
  pickAggregate,
  reportPickIssue,
  type PickItem,
} from '@data/endpoints/nx03/workstation/api';
import { FieldTemplate, type FieldTask } from '@design/templates/FieldTemplate';
import { useWorkstation } from '@design/hooks/useWorkstation';

import { BarcodeScanner } from '../shared/BarcodeScanner';
import { PickBoard } from './PickBoard';

/** 一件事＝一個（倉 × 料件）。⚠️ 後端的撿貨單位就是這個，⛔ 不是單號 */
const keyOf = (i: PickItem) => `${i.warehouseId}:${i.partId}`;

export function PickField() {
  const ws = useWorkstation();
  const [items, setItems] = useState<PickItem[] | null>(null);
  const [currentId, setCurrentId] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      // 走動與定點都照庫位排——現場的人是照著走道走，⛔ 不是照客戶跳
      const r = await getPickList({ groupBy: 'location' });
      setItems(r.groups.flatMap((g) => g.items));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '讀不到撿貨清單');
      setItems([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // 看板：⭐ 沿用既有三欄看板，⛔ 不重寫
  if (ws.ready && ws.layout === 'board') return <PickBoard />;

  if (items === null) return <div className="nx-hint p-5">載入中⋯</div>;

  const tasks: FieldTask[] = items.map((i) => ({
    id: keyOf(i),
    code: i.partNo,
    name: [i.partName, i.brandName].filter(Boolean).join('・'),
    place: [i.warehouseCode, i.locationCode].filter(Boolean).join(' / ') || undefined,
    qty: String(Number(i.remainingQty)),
    note: Number(i.pickedQty) > 0 ? `已撿 ${Number(i.pickedQty)} / 需 ${Number(i.neededQty)}` : undefined,
    done: Number(i.remainingQty) <= 0,
  }));

  const itemOf = (id: string) => items.find((i) => keyOf(i) === id);

  const run = async (id: string, fn: (i: PickItem) => Promise<string>) => {
    const it = itemOf(id);
    if (!it || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      setMsg(await fn(it));
      setCurrentId(undefined);
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '操作失敗，請再試一次');
    } finally {
      setBusy(false);
    }
  };

  /** 掃到條碼 → 跳到那一件；⛔ 不自動確認（掃到不等於撿到，要人看一眼數量） */
  const onScan = (code: string) => {
    const hit = items.find(
      (i) => i.partNo.replace(/\s/g, '').toUpperCase() === code.replace(/\s/g, '').toUpperCase(),
    );
    if (hit) {
      setCurrentId(keyOf(hit));
      setMsg(`跳到 ${hit.partNo}`);
    } else {
      setMsg(`這張清單裡沒有 ${code}`);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
        <FieldTemplate
          title="撿貨"
          tasks={tasks}
          currentId={currentId}
          onCurrentChange={setCurrentId}
          onScan={onScan}
          emptyText="目前沒有要撿的貨。"
          scanSlot={
            <button type="button" className="nx-btn h-12 w-full" onClick={() => setScanOpen(true)}>
              掃條碼
            </button>
          }
          actions={[
            {
              key: 'pick',
              label: busy ? '處理中⋯' : '確認取件',
              tone: 'confirm',
              disabled: busy,
              onClick: (t) =>
                void run(t.id, async (i) => {
                  const r = await pickAggregate(i.warehouseId, i.partId);
                  return `${i.partNo} 撿了 ${r.picked}`;
                }),
            },
            {
              key: 'short',
              label: '缺料',
              tone: 'problem',
              disabled: busy,
              // ⚠️ 這會對剩餘量開一張正式的異常回報單，⛔ 不只是畫面上跳過
              onClick: (t) =>
                void run(t.id, async (i) => {
                  const r = await reportPickIssue({
                    warehouseId: i.warehouseId,
                    partId: i.partId,
                    issueType: 'S',
                    reason: '撿貨現場回報短缺',
                  });
                  return `已開異常單 ${r.docNo}`;
                }),
            },
            {
              key: 'skip',
              label: '跳過',
              disabled: busy,
              // 純畫面：先做下一件，⛔ 不動帳
              onClick: (t) => {
                const i = tasks.findIndex((x) => x.id === t.id);
                const next = tasks.slice(i + 1).find((x) => !x.done) ?? tasks.find((x) => !x.done);
                setCurrentId(next?.id);
                setMsg(null);
              },
            },
          ]}
        />
      </div>

      {msg && (
        <div className="border-t border-border px-5 py-2">
          <span className="nx-hint">{msg}</span>
        </div>
      )}

      {/* 相機掃碼在 features 層，靠 scanSlot 插進殼裡（design 區⛔ 不 import features） */}
      <BarcodeScanner
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onScan={(text) => {
          onScan(text);
          return false; // 掃到就關，⛔ 不連續掃
        }}
      />
    </div>
  );
}
