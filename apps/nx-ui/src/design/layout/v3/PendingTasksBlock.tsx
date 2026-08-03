// apps/nx-ui/src/design/layout/v3/PendingTasksBlock.tsx
//
// 工作檯「待處理清單」＝進度軸：回答「這批活還剩多少」
// 規格：docs/專案/介面規格/NEXORA-外殼規格-v3.0.0.md §3（殼 1）
//
// 版型與「待處理單據」共用 DocListBlock（執行長 2026-08-03：兩塊同樣的方式）。
//
// ⚠️ 中間欄叫「對象」不叫「客戶」：盤點單、調撥單本質上沒有客戶（一個是數自己的貨、
//    一個是自己倉庫之間搬），硬掛「客戶」整欄會是空的。異常回報那欄放料號品名。
// ⚠️ 撿貨單目前拿不到客戶——後端 /nx03/pk 清單不回客戶（要繞 refSoId 才有）。
//    真正的「已撿 8／20 項」也還沒有端點。兩件都等功能期補。

'use client';

import { listPks } from '@data/endpoints/nx03/workstation/api';
import { listStockTake } from '@data/endpoints/nx03/stocktake/api/stocktake';
import { listIssueReport } from '@data/endpoints/nx03/issue-report/api/issue-report';
import { listSt } from '@data/endpoints/nx03/transfer/api/transfer';
import { IR_STATUS_LABEL } from '@data/types/nx03/issue-report';
import { ST_STATUS_LABEL } from '@data/types/nx03/transfer';

import { DocListBlock, type DocTab } from './DocListBlock';

const SCAN = 100;

// ⭐ 這一塊四種單的狀態本來就全部是「自己人要動手」的，⛔ 沒有等外部的狀態，
//    所以判定與「待處理單據」那邊不同——那邊要濾掉已出貨／已寄廠商，這裡不用。
//    盤點在數、調撥在搬、撿貨在撿、異常在處置，每一個都是現在有人在做。

/** 撿貨單狀態：P=待撿 / C=撿貨中 / F=已完成 / V=作廢（見 workstation api 檔頭） */
const PK_STATUS_LABEL: Record<string, string> = {
  P: '待撿',
  C: '撿貨中',
  F: '已完成',
  V: '已作廢',
};

const STOCKTAKE_STATUS_LABEL: Record<string, string> = {
  DRAFT: '草稿',
  COUNTING: '盤點中',
  ADJUSTING: '調整中',
  POSTED: '已過帳',
  CANCELLED: '已取消',
};

const TABS: DocTab[] = [
  {
    key: 'pk',
    label: '撿貨單',
    load: async () => {
      const r = await listPks({ page: 1, pageSize: SCAN });
      return (r.items ?? [])
        .filter((x) => ['P', 'C'].includes(x.status))
        .map((x) => ({
          id: x.id,
          docNo: x.docNo,
          // ⚠️ 後端清單不回客戶，見檔頭
          partnerName: '—',
          statusLabel: PK_STATUS_LABEL[x.status] ?? x.status,
          href: '/dashboard/inventory/picking',
        }));
    },
  },
  {
    key: 'stocktake',
    label: '盤點單',
    load: async () => {
      const r = await listStockTake({ page: 1, pageSize: SCAN });
      return (r.items ?? [])
        .filter((x) => ['DRAFT', 'COUNTING', 'ADJUSTING'].includes(x.status))
        .map((x) => ({
          id: x.id,
          docNo: x.docNo,
          // 盤點是數自己的貨，本來就沒有對象
          partnerName: '—',
          statusLabel: STOCKTAKE_STATUS_LABEL[x.status] ?? x.status,
          href: '/dashboard/inventory/stock-take',
        }));
    },
  },
  {
    key: 'st',
    label: '調撥單',
    load: async () => {
      const r = await listSt({ page: 1, pageSize: SCAN });
      return (r.items ?? [])
        .filter((x) => ['DRAFT', 'TRANSIT'].includes(x.status))
        .map((x) => ({
          id: x.id,
          docNo: x.docNo,
          partnerName: '—',
          statusLabel: (ST_STATUS_LABEL[x.status] ?? x.status).replace(/（.*$/, '').trim(),
          href: '/dashboard/inventory/transfer',
        }));
    },
  },
  {
    key: 'ir',
    label: '異常回報',
    load: async () => {
      const r = await listIssueReport({ page: 1, pageSize: SCAN });
      return (r.items ?? [])
        .filter((x) => ['DRAFT', 'REPORTED', 'PROCESSING'].includes(x.status))
        .map((x) => ({
          id: x.id,
          docNo: x.docNo,
          // 異常是對「一顆零件」發的，對象就是那顆料
          partnerName: x.partName || x.partNo || '—',
          statusLabel: IR_STATUS_LABEL[x.status] ?? x.status,
          href: '/dashboard/inventory/issue-report',
        }));
    },
  },
];

export function PendingTasksBlock({ onGo }: { onGo: (href: string, label: string) => void }) {
  return (
    <DocListBlock
      title="待處理清單"
      tabs={TABS}
      onGo={onGo}
      middleLabel="對象"
      note="只列現在要動手的。⚠️ 撿貨單的客戶與「已撿 8／20 項」的進度，後端目前都給不出來。"
    />
  );
}
