// apps/nx-ui/src/design/layout/v3/PendingDocsBlock.tsx
//
// 工作檯「待處理單據」區塊（執行長 2026-08-03：依單別分頁籤，底下列單號／客戶／狀態）
// 規格：docs/專案/介面規格/NEXORA-外殼規格-v3.0.0.md §3（殼 1）
//
// ⭐ 這一塊是狀態軸：回答「這張單走到哪了」。
//    ⛔ 不是數字牆——執行長明確要求看得到單號與客戶，不是只有一個總數。
//
// ⚠️ 後端目前一次只吃一個 status（so.service whereList：`where.status = q.status`），
//    而「未完成」是好幾個狀態的集合。本輪先取最新 50 筆再在前端濾，
//    ⛔ 這不是正解——正解是後端加一支「未完成單據」端點。功能期補。
//    影響：若某單別最近 50 筆全部已完成，這裡會顯示「沒有未完成的」而其實更早的還有。

'use client';

import { useEffect, useState } from 'react';

import { listSo } from '@data/endpoints/nx04/so/api/so';
import { listQuote } from '@data/endpoints/nx04/quote/api/quote';
import { listPo } from '@data/endpoints/nx02/po/api/po';
import { listRr } from '@data/endpoints/nx02/rr/api/rr';
import { SO_STATUS_LABEL } from '@data/types/nx04/so';
import { QUOTE_STATUS_LABEL } from '@data/types/nx04/quote';
import { PO_STATUS_LABEL } from '@data/types/nx02/po';
import { RR_STATUS_LABEL } from '@data/types/nx02/rr';

/** 一列＝一張單。⛔ 三欄固定：單號／客戶／狀態 */
type DocRow = {
  id: string;
  docNo: string;
  partnerName: string;
  statusLabel: string;
  href: string;
};

/** 掃描筆數：夠涵蓋日常未結案的量，又不會拖慢首頁 */
const SCAN = 50;
/** 每個頁籤最多顯示幾列——工作檯是「接住下一個動作」，⛔ 不是完整清單 */
const SHOW = 8;

/** 狀態標籤太長時砍掉括號補述（例：已確認（自動調撥已觸發）→ 已確認） */
function shortLabel(s: string): string {
  return s.replace(/（.*$/, '').trim();
}

type TabDef = {
  key: string;
  label: string;
  load: () => Promise<DocRow[]>;
};

const TABS: TabDef[] = [
  {
    key: 'so',
    label: '銷貨單',
    load: async () => {
      const r = await listSo({ page: 1, pageSize: SCAN });
      return (r.items ?? [])
        .filter((x) => !['COMPLETED', 'CANCELLED'].includes(x.status))
        .map((x) => ({
          id: x.id,
          docNo: x.docNo,
          partnerName: x.customerName ?? '—',
          statusLabel: shortLabel(SO_STATUS_LABEL[x.status] ?? x.status),
          href: `/dashboard/sale/so/${x.id}`,
        }));
    },
  },
  {
    key: 'qt',
    label: '報價單',
    load: async () => {
      const r = await listQuote({ page: 1, pageSize: SCAN });
      // ⚠️ 過期也算待處理——業務要去追，⛔ 不是結案
      return (r.items ?? [])
        .filter((x) => ['DRAFT', 'SENT', 'EXPIRED'].includes(x.status))
        .map((x) => ({
          id: x.id,
          docNo: x.docNo,
          partnerName: x.customerName ?? '—',
          statusLabel: shortLabel(QUOTE_STATUS_LABEL[x.status] ?? x.status),
          href: `/dashboard/sale/qt/${x.id}`,
        }));
    },
  },
  {
    key: 'po',
    label: '採購單',
    load: async () => {
      const r = await listPo({ page: 1, pageSize: SCAN });
      return (r.items ?? [])
        .filter((x) => !['RECEIVED', 'CLOSED', 'CANCELLED'].includes(x.status))
        .map((x) => ({
          id: x.id,
          docNo: x.docNo,
          partnerName: x.supplierName ?? '—',
          statusLabel: shortLabel(PO_STATUS_LABEL[x.status] ?? x.status),
          href: `/dashboard/purchase/po/${x.id}`,
        }));
    },
  },
  {
    key: 'rr',
    label: '進貨單',
    load: async () => {
      const r = await listRr({ page: 1, pageSize: SCAN });
      return (r.items ?? [])
        .filter((x) => ['DRAFT', 'INSPECTING'].includes(x.status))
        .map((x) => ({
          id: x.id,
          docNo: x.docNo,
          partnerName: x.supplierName ?? '—',
          statusLabel: shortLabel(RR_STATUS_LABEL[x.status] ?? x.status),
          href: `/dashboard/purchase/rr/${x.id}`,
        }));
    },
  },
];

export function PendingDocsBlock({ onGo }: { onGo: (href: string, label: string) => void }) {
  const [active, setActive] = useState(TABS[0].key);
  /** null＝還沒回來（顯示「—」），[]＝真的沒有。⛔ 兩者不可長一樣 */
  const [rows, setRows] = useState<Record<string, DocRow[] | null>>({});

  useEffect(() => {
    let alive = true;
    for (const t of TABS) {
      t.load()
        .then((list) => alive && setRows((prev) => ({ ...prev, [t.key]: list })))
        .catch(() => alive && setRows((prev) => ({ ...prev, [t.key]: [] })));
    }
    return () => {
      alive = false;
    };
  }, []);

  const list = rows[active] ?? null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="nx-t-sec">待處理單據</h2>

      {/* 頁籤：單別分組。⚠️ 這是區塊內的頁籤，⛔ 不是 2026-08-01 拍板拿掉的那條全站分頁列 */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const n = rows[t.key];
          const on = t.key === active;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActive(t.key)}
              className={[
                'rounded-lg border-2 px-4 py-2 text-left',
                on ? 'border-primary bg-primary/[0.08]' : 'border-border bg-card hover:bg-primary/[0.06]',
              ].join(' ')}
            >
              <span className="nx-body font-medium">{t.label}</span>
              <span className="nx-body ml-2 font-medium">{n ? n.length : '—'}</span>
            </button>
          );
        })}
      </div>

      {/* 三欄固定：單號／客戶／狀態 */}
      <div className="rounded-lg border-2 border-border bg-card">
        <div className="flex items-center gap-3 border-b border-border px-4 py-2">
          <span className="nx-hint w-[34%]">單號</span>
          <span className="nx-hint flex-1">客戶</span>
          <span className="nx-hint w-[22%] text-right">狀態</span>
        </div>

        {list === null ? (
          <p className="nx-body px-4 py-6 text-center">載入中…</p>
        ) : list.length === 0 ? (
          <p className="nx-body px-4 py-6 text-center">目前沒有未完成的單據。</p>
        ) : (
          list.slice(0, SHOW).map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onGo(r.href, r.docNo)}
              // ⛔ 無 transition：規格 §6 動畫全部關掉
              className="flex w-full items-center gap-3 border-b border-border px-4 py-2.5 text-left last:border-b-0 hover:bg-primary/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              <span className="nx-mono w-[34%] truncate">{r.docNo}</span>
              <span className="nx-body flex-1 truncate">{r.partnerName}</span>
              <span className="nx-body w-[22%] truncate text-right font-medium">{r.statusLabel}</span>
            </button>
          ))
        )}

        {list && list.length > SHOW ? (
          <p className="nx-hint px-4 py-2">另有 {list.length - SHOW} 張未顯示——進單據管理看完整清單。</p>
        ) : null}
      </div>
    </section>
  );
}
