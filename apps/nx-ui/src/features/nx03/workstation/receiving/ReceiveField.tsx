// apps/nx-ui/src/features/nx03/workstation/receiving/ReceiveField.tsx
//
// 進貨驗收（現場殼第 5 步）
// 規格：docs/專案/介面規格/NEXORA-外殼規格-v3.0.0.md §7
//
// ⭐ 這一頁順手修掉一個登記過的 bug（已作廢決策清單 §16）：
//    原本的 /dashboard/inventory/receiving 無條件渲染 MobileReceivingListPage、
//    元件裡沒有任何響應式斷點——**倉管在電腦上點九宮格進去，看到的是手機畫面**。
//    改用現場殼之後，三套佈局由裝置與工作站決定，⛔ 不會再有這種事。
//
// ⭐ 三套佈局全部走 FieldTemplate（⛔ 沒有舊的看板可以沿用——
//    舊的那支本來就是手機版，把它當看板才是錯的）：
//      收貨區螢幕 → 定點（左待驗清單＋右這張單的明細＋掃描槍）
//      手機       → 走動（貨到門口，站著點）
//      其餘電腦   → 看板（看還有幾車沒驗，⛔ 不放過帳鍵——點貨要在現場做）
//
// ⚠️ 後端只能「整張過帳」，⛔ 沒有逐項點收的端點：
//    patchInbound(id, { status: 'POSTED' | 'REJECTED' })。
//    所以這裡的一件事＝一張進貨單，⛔ 不是一個料號。
//    真正的逐項點收（點到哪一項、差幾個）要後端補，已列為補做候選。

'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  getInbound,
  listInbounds,
  patchInbound,
  type Inbound,
  type InboundDetail,
} from '@data/endpoints/nx03/workstation/api';
import { FieldTemplate, type FieldTask } from '@design/templates/FieldTemplate';

import { BarcodeScanner } from '../shared/BarcodeScanner';

export function ReceiveField() {
  const [rows, setRows] = useState<Inbound[] | null>(null);
  const [detail, setDetail] = useState<InboundDetail | null>(null);
  const [currentId, setCurrentId] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      // 待驗收＝檢驗中。⛔ 不撈草稿：那是採購還沒收完的單，倉庫還碰不到
      const r = await listInbounds({ status: 'INSPECTING', pageSize: 100 });
      setRows(r.items);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '讀不到待驗收清單');
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedId = currentId ?? rows?.[0]?.id;

  // 明細另外抓——清單端點⛔ 不帶 items
  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let alive = true;
    void (async () => {
      try {
        const d = await getInbound(selectedId);
        if (alive) setDetail(d);
      } catch {
        if (alive) setDetail(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, [selectedId]);

  if (rows === null) return <div className="nx-hint p-5">載入中⋯</div>;

  const tasks: FieldTask[] = rows.map((r) => ({
    id: r.id,
    code: r.docNo,
    name: r.remark ?? undefined,
    place: r.inboundDate?.slice(0, 10),
    qty: String(r.id === detail?.id ? detail.items.length : '—'),
    unit: '項',
  }));

  const run = async (status: 'POSTED' | 'REJECTED', word: string) => {
    if (!selectedId || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await patchInbound(selectedId, { status });
      setMsg(`${r.docNo} ${word}`);
      setCurrentId(undefined);
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '操作失敗，請再試一次');
    } finally {
      setBusy(false);
    }
  };

  /** 掃到條碼 → 跳到那張單（比單號）；比不到再看是不是某張單裡的料號 */
  const onScan = (code: string) => {
    const k = code.replace(/\s/g, '').toUpperCase();
    const hit = rows.find((r) => r.docNo.replace(/\s/g, '').toUpperCase() === k);
    if (hit) {
      setCurrentId(hit.id);
      setMsg(`跳到 ${hit.docNo}`);
      return;
    }
    const inCurrent = detail?.items.find(
      (i) => (i.partNo ?? '').replace(/\s/g, '').toUpperCase() === k,
    );
    setMsg(
      inCurrent
        ? `${inCurrent.partNo} 在這張單裡（第 ${inCurrent.lineNo} 項、${Number(inCurrent.qty)} 個）`
        : `待驗收清單裡沒有 ${code}`,
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
        <FieldTemplate
          title="進貨驗收"
          tasks={tasks}
          currentId={selectedId}
          onCurrentChange={setCurrentId}
          onScan={onScan}
          emptyText="目前沒有等著驗收的貨。"
          scanSlot={
            <button type="button" className="nx-btn h-12 w-full" onClick={() => setScanOpen(true)}>
              掃條碼
            </button>
          }
          // ⚠️ 只在真的有單的時候給插槽。
          //    包貨／出貨那種「容器」流程佇列空了仍要顯示（手上還有沒封的箱），
          //    驗收⛔ 沒有容器——沒單就該只留一句「沒有等著驗收的貨」，
          //    ⛔ 不要多一張寫著「—」和「這張單沒有明細」的空卡片。
          currentSlot={
            !detail ? undefined : (
            <div className="nx-card">
              <div className="flex items-baseline gap-3">
                <span className="nx-t-sec">{detail.docNo}</span>
                <span className="nx-hint">{detail.inboundDate?.slice(0, 10)}</span>
                <span className="nx-tag ml-auto">{detail.items.length} 項</span>
              </div>
              {detail.items.length ? (
                <table className="mt-3 w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="nx-th w-10">#</th>
                      <th className="nx-th">料號</th>
                      <th className="nx-th">品名</th>
                      <th className="nx-th text-right">應收數量</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.items.map((i) => (
                      <tr key={i.id} className="border-b border-border/60">
                        <td className="nx-td text-foreground/75">{i.lineNo}</td>
                        <td className="nx-td">
                          <span className="nx-mono">{i.partNo ?? '—'}</span>
                        </td>
                        <td className="nx-td">{i.partName ?? '—'}</td>
                        <td className="nx-td nx-num text-right">{Number(i.qty)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="nx-hint mt-3">這張單沒有明細。</p>
              )}
              {/* ⚠️ 誠實告知：目前只能整張收或整張退，⛔ 不能逐項點 */}
              <p className="nx-hint mt-3">
                目前只能整張驗收或整張退回。要逐項點收（點到哪一項、差幾個）系統還做不到。
              </p>
            </div>
            )
          }
          actions={[
            {
              key: 'post',
              label: busy ? '處理中⋯' : '驗收通過',
              tone: 'confirm',
              disabled: busy || !detail,
              onClick: () => void run('POSTED', '已驗收入庫'),
            },
            {
              key: 'reject',
              label: '退回',
              tone: 'problem',
              disabled: busy || !detail,
              onClick: () => void run('REJECTED', '已退回'),
            },
          ]}
        />
      </div>

      {msg && (
        <div className="border-t border-border px-5 py-2">
          <span className="nx-hint">{msg}</span>
        </div>
      )}

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
