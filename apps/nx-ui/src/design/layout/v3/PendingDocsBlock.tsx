// apps/nx-ui/src/design/layout/v3/PendingDocsBlock.tsx
//
// 工作檯「待處理單據」＝狀態軸：回答「這張單走到哪了」
// 規格：docs/專案/介面規格/NEXORA-外殼規格-v3.0.0.md §3（殼 1）
//
// 版型走共用的 DocListBlock（頁籤＋三欄＋排序＋區域捲動），本檔只負責
// 「哪幾種單、哪些狀態算未完成、點下去去哪裡」。
//
// ⚠️ 後端 list 一次只吃一個 status（so.service whereList：`where.status = q.status`），
//    而「未完成」是好幾個狀態的集合。本輪先取最新 100 筆再在前端濾（100＝後端 pageSize 上限），
//    ⛔ 這不是正解——正解是後端加一支「未完成單據」端點。功能期補。

'use client';

import { listSo } from '@data/endpoints/nx04/so/api/so';
import { listQuote } from '@data/endpoints/nx04/quote/api/quote';
import { listPo } from '@data/endpoints/nx02/po/api/po';
import { listRr } from '@data/endpoints/nx02/rr/api/rr';
import { SO_STATUS_LABEL } from '@data/types/nx04/so';
import { QUOTE_STATUS_LABEL } from '@data/types/nx04/quote';
import { PO_STATUS_LABEL } from '@data/types/nx02/po';
import { RR_STATUS_LABEL } from '@data/types/nx02/rr';

import { DocListBlock, type DocTab } from './DocListBlock';

/** 掃描筆數。⚠️ 前端濾的權宜之計，見檔頭 */
const SCAN = 100;

/** 狀態標籤太長時砍掉括號補述（例：已確認（自動調撥已觸發）→ 已確認） */
function shortLabel(s: string): string {
  return s.replace(/（.*$/, '').trim();
}

const TABS: DocTab[] = [
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
  return <DocListBlock title="待處理單據" tabs={TABS} onGo={onGo} />;
}
