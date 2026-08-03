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

/**
 * ⭐ 「要動手的」判定（執行長 2026-08-03 拍板：只顯示我能處理的）。
 *
 * 判準只有一句：**這張單現在卡在自己人手上、而且動作現在就做得了。**
 * ⛔ 等外部回應的一律不算——已出貨等客戶簽收、已寄廠商等交期、已開立等帳期到，
 *    這些掛在這裡只會讓人對數字免疫，看久了連真的急件也一起忽略。
 *
 * ⚠️ 實測佐證：最新 100 張銷貨單裡 91 張是「已出貨」、只有 4 張撿貨中。
 *    舊做法的「95」有 91 是業務動不了的，紅點寫 95 等於自我廢除。
 *
 * ⚠️ 現在是「有人要動手」，還不是「指派給我」——
 *    要做到後者得先有職務欄位（/auth/me 目前不回職務），等那個到位再收窄。
 */
const ACTIONABLE = {
  // 草稿要確認、已確認要撿貨；撿貨中是倉庫正在做、已出貨在等簽收，都⛔ 不算
  so: ['DRAFT', 'CONFIRMED'],
  // 草稿要寄出、過期要去追；已寄出是等客戶回覆，⛔ 不算卡住
  qt: ['DRAFT', 'EXPIRED'],
  // 草稿／待核准／已核准要往下推、部分到貨要繼續收；已寄廠商與廠商確認是等交期，⛔ 不算
  po: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PARTIAL_RECEIVED'],
  // 兩個狀態都是自己人要動
  rr: ['DRAFT', 'INSPECTING'],
} as const;

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
        .filter((x) => (ACTIONABLE.so as readonly string[]).includes(x.status))
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
      return (r.items ?? [])
        .filter((x) => (ACTIONABLE.qt as readonly string[]).includes(x.status))
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
        .filter((x) => (ACTIONABLE.po as readonly string[]).includes(x.status))
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
        .filter((x) => (ACTIONABLE.rr as readonly string[]).includes(x.status))
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
  return (
    <DocListBlock
      title="待處理單據"
      tabs={TABS}
      onGo={onGo}
      note="只列現在要動手的。等客戶簽收、等廠商交期、等帳期的不在這裡——進單據管理看得到。"
    />
  );
}
