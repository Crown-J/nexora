// apps/nx-ui/src/design/layout/v3/workbench-tiles.ts
//
// 工作檯卡片牆的 SSOT（執行長 2026-08-03 拍板：十一張卡片）
// 規格：docs/專案/介面規格/NEXORA-外殼規格-v3.0.0.md §3（殼 1）
//
// 十一張＝簽到／搜尋／業績 ＋ 八種單據作業。
// ⛔ 沒權限的卡片變灰但仍佔位（與九宮格同一條鐵則：位置固定是肌肉記憶的前提）。
// ⭐ 有待處理項目的卡片才出現紅點與數字；0 的不上色、⛔ 不隱藏、⛔ 不重排。
//
// ⚠️ 「待處理」＝現在卡在自己人手上、而且動作現在就做得了。
//    等外部回應的一律不算（已出貨等簽收、已寄廠商等交期、已開立等帳期）——
//    掛在紅點上只會讓人對數字免疫，看久了連真的急件也一起忽略。
// ⚠️ 目前是「有人要動手」，還不是「指派給我」；後者要等職務欄位（/auth/me 目前不回職務）。
//
// ⚠️ 掃描筆數 100＝後端 pageSize 上限。後端 list 一次只吃一個狀態，
//    「待處理」是好幾個狀態的集合，所以先抓最新 100 筆再在前端濾。
//    ⛔ 這不是正解——正解是後端加一支「待處理」端點，功能期補。

import {
  AlertTriangle,
  ArrowLeftRight,
  Handshake,
  ClipboardCheck,
  ClipboardList,
  Fingerprint,
  FileText,
  PackagePlus,
  PackageSearch,
  Search,
  ShoppingCart,
  Target,
  type LucideIcon,
} from 'lucide-react';

import { listSo } from '@data/endpoints/nx04/so/api/so';
import { listQuote } from '@data/endpoints/nx04/quote/api/quote';
import { listPo } from '@data/endpoints/nx02/po/api/po';
import { listRr } from '@data/endpoints/nx02/rr/api/rr';
import { listPks } from '@data/endpoints/nx03/workstation/api';
import { listStockTake } from '@data/endpoints/nx03/stocktake/api/stocktake';
import { listSt } from '@data/endpoints/nx03/transfer/api/transfer';
import { listTi } from '@data/endpoints/nx02/ti/api/ti';
import { listIssueReport } from '@data/endpoints/nx03/issue-report/api/issue-report';

const SCAN = 100;

/** 卡片型別：action＝按下去做一件事、search＝內嵌搜尋框、doc＝單據作業（有數字） */
export type TileKind = 'action' | 'search' | 'doc';

export type WorkbenchTile = {
  key: string;
  label: string;
  /** 副標：一句話講清楚這張卡是幹嘛的 */
  hint: string;
  /** 卡面圖示。⭐ 圖示是給「掃視」用的——找卡片時眼睛先抓形狀、再讀字 */
  icon: LucideIcon;
  kind: TileKind;
  /** doc 卡片點下去要去哪 */
  href?: string;
  /** doc 卡片的待處理筆數；⛔ 只算「現在要動手的」 */
  load?: () => Promise<number>;
  /**
   * 桌機（xl 以上）橫跨兩欄。⭐ 這是把牆「排滿」的手段：
   * 12 張卡在 4 欄下是 3 排，最後一排會缺兩格；讓四張卡各佔兩欄剛好補成 16 格＝4 排整。
   * ⛔ 跨欄是固定設定，⛔ 不隨資料多寡變動——位置會跳就失去肌肉記憶。
   */
  wide?: boolean;
};

/** 只數「現在要動手的」——判定理由見各行註解 */
async function countBy<T extends { status: string }>(
  fetcher: () => Promise<{ items?: T[] }>,
  actionable: readonly string[],
): Promise<number> {
  const r = await fetcher();
  return (r.items ?? []).filter((x) => actionable.includes(x.status)).length;
}

export const WORKBENCH_TILES: WorkbenchTile[] = [
  { key: 'checkin', icon: Fingerprint, label: '簽到', hint: '上班／下班打卡', kind: 'action', wide: true },
  { key: 'search', icon: Search, label: '查價查貨', hint: '料號／品名／車型', kind: 'search', wide: true },
  { key: 'kpi', icon: Target, label: '業績目標', hint: '當月累計', kind: 'action', wide: true },

  {
    key: 'so',
    icon: ShoppingCart,
    label: '銷貨單',
    hint: '要確認、要撿貨的',
    kind: 'doc',
    href: '/dashboard/sale/so',
    // ⛔ 撿貨中不算——那份工作在撿貨單那張卡，⛔ 不重複計
    // ⛔ 已出貨不算——在等司機與客戶簽收，業務動不了
    load: () => countBy(() => listSo({ page: 1, pageSize: SCAN }), ['DRAFT', 'CONFIRMED']),
  },
  {
    key: 'qt',
    icon: FileText,
    label: '報價單',
    hint: '要寄出、要追的',
    kind: 'doc',
    href: '/dashboard/sale/qt',
    // ⛔ 已寄出不算——那是等客戶回覆，不是卡住
    load: () => countBy(() => listQuote({ page: 1, pageSize: SCAN }), ['DRAFT', 'EXPIRED']),
  },
  {
    key: 'ti',
    icon: Handshake,
    label: '調貨',
    hint: '要發出、要驗收的',
    kind: 'doc',
    href: '/dashboard/purchase/ti',
    // ⛔ 已發出不算——那是等同行回覆；已回覆要決定、待驗收要點收，都算自己人要動
    load: () => countBy(() => listTi({ page: 1, pageSize: SCAN }), ['DRAFT', 'REPLIED', 'PENDING_RECEIPT']),
  },
  {
    key: 'po',
    icon: ClipboardList,
    label: '採購單',
    hint: '要核准、要收貨的',
    kind: 'doc',
    href: '/dashboard/purchase/po',
    // ⛔ 已寄廠商／廠商確認不算——那是等交期
    load: () =>
      countBy(() => listPo({ page: 1, pageSize: SCAN }), [
        'DRAFT',
        'PENDING_APPROVAL',
        'APPROVED',
        'PARTIAL_RECEIVED',
      ]),
  },
  {
    key: 'rr',
    icon: PackagePlus,
    label: '進貨單',
    hint: '要驗收的',
    kind: 'doc',
    href: '/dashboard/purchase/rr',
    load: () => countBy(() => listRr({ page: 1, pageSize: SCAN }), ['DRAFT', 'INSPECTING']),
  },
  {
    key: 'pk',
    icon: PackageSearch,
    label: '撿貨單',
    hint: '要撿的',
    kind: 'doc',
    href: '/dashboard/inventory/picking',
    // P＝待撿、C＝撿貨中；F 已完成與 V 作廢⛔ 不算
    load: () => countBy(() => listPks({ page: 1, pageSize: SCAN }), ['P', 'C']),
  },
  {
    key: 'stocktake',
    icon: ClipboardCheck,
    label: '盤點單',
    hint: '要數、要調整的',
    kind: 'doc',
    href: '/dashboard/inventory/stock-take',
    load: () =>
      countBy(() => listStockTake({ page: 1, pageSize: SCAN }), ['DRAFT', 'COUNTING', 'ADJUSTING']),
  },
  {
    key: 'st',
    icon: ArrowLeftRight,
    label: '調撥單',
    hint: '要出庫、要收貨的',
    kind: 'doc',
    href: '/dashboard/inventory/transfer',
    load: () => countBy(() => listSt({ page: 1, pageSize: SCAN }), ['DRAFT', 'TRANSIT']),
  },
  {
    key: 'ir',
    icon: AlertTriangle,
    label: '異常回報',
    hint: '要處置的',
    kind: 'doc',
    href: '/dashboard/inventory/issue-report',
    load: () =>
      countBy(() => listIssueReport({ page: 1, pageSize: SCAN }), [
        'DRAFT',
        'REPORTED',
        'PROCESSING',
      ]),
  },
];
