// apps/nx-ui/src/features/sale/ui/fulfillment/store.ts
/**
 * TASK-BUSINESS-RESTRUCTURE Phase 5~7:履約 store(Zustand)。
 *
 * 職責:
 *   - 管理 SO / IT / TI / PK / BX / DN 六種單據的生命週期
 *   - SO 成立時呼叫 SYS-C 依情境自動建 IT / TI / PK
 *   - 維持 SO/PK/BX/DN 共用流水、IT/TI 各自獨立流水
 *   - Phase 6 加入 IT 流程 actions(executeTransfer / completeTransfer)
 *   - Phase 7 加入 PK→BX→DN 連動 actions(completePicking / Packing / Delivery)
 *
 * Store 刻意不做任何庫存 mutation(庫存中心未實作即時扣庫存),
 * 僅以單據狀態變化反映流程進展,符合 demo 階段「庫存哲學:>= 0」的簡化。
 */

'use client';

import { create } from 'zustand';

import type { CustomerRef } from '../inquiry/types';
import {
  INITIAL_MOCK_BXS,
  INITIAL_MOCK_DNS,
  INITIAL_MOCK_ITS,
  INITIAL_MOCK_PKS,
  INITIAL_MOCK_SOS,
  INITIAL_MOCK_TIS,
  IT_SEQ_START,
  SHARED_SEQ_START,
  TI_SEQ_START,
} from './mock-data';
import {
  buildSharedDocNumbers,
  formatDocNumber,
  getCurrentYYMM,
} from './numbering';
import { analyzeSO } from './sysC';
import type {
  BX,
  BXStatus,
  DN,
  DNStatus,
  IT,
  ITItem,
  ITStatus,
  PK,
  PKStatus,
  SO,
  SOItem,
  SOStatus,
  SupplyAnalysis,
  TI,
  TIItem,
  TIStatus,
} from './types';

// ───────────────────── 建 SO 輸入 ─────────────────────

export interface CreateSOInput {
  customer: CustomerRef;
  items: SOItem[];
  createdBy?: string;
}

export interface CreateSOResult {
  so: SO;
  analysis: SupplyAnalysis;
  /** 情境 A 會直接建 PK;B/C/D 會先建 IT/TI、待完成才建 PK */
  pk?: PK;
  its: IT[];
  tis: TI[];
}

interface SalesStoreState {
  sos: SO[];
  its: IT[];
  tis: TI[];
  pks: PK[];
  bxs: BX[];
  dns: DN[];
  sharedSeq: number; // SO/PK/BX/DN 共用流水
  itSeq: number;
  tiSeq: number;

  /** 成立銷貨單,SYS-C 分流自動建對應單據 */
  createSO: (input: CreateSOInput) => CreateSOResult;

  // Phase 6:IT 調撥流程(他倉 → 本倉)
  /** pending → in_transit(倉管接單) */
  executeTransfer: (itId: string) => void;
  /** in_transit → completed(本倉已入庫);若 SO 其他供應條件都達標則自動建 PK */
  completeTransfer: (itId: string) => void;

  // Phase 7:TI 同行調貨取貨流程
  /** pending_pickup → picked_up(外務/倉管已取回,在路上) */
  pickupInquiry: (tiId: string) => void;
  /** picked_up → completed(本倉已入庫);若 SO 其他供應條件都達標則自動建 PK */
  completeInquiry: (tiId: string) => void;

  // Phase 7:PK → BX → DN 連動
  /** pk.pending/picking → completed + 自動建 BX + SO 進 packed */
  completePicking: (pkId: string) => void;
  /** bx.pending → completed + 自動建 DN + SO 進 delivering */
  completePacking: (bxId: string) => void;
  /** dn.delivering → signed + SO 進 completed */
  completeDelivery: (dnId: string) => void;
}

// ───────────────────── helpers ─────────────────────

function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function totalOf(items: readonly SOItem[]): number {
  return items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
}

function initialStatusByScenario(scenario: SupplyAnalysis['scenario']): SOStatus {
  switch (scenario) {
    case 'A':
      return 'ready_to_pick';
    case 'B':
      return 'waiting_transfer';
    case 'C':
      return 'waiting_supplier';
    case 'D':
      return 'waiting_all';
  }
}

/**
 * Phase 6/7:IT 或 TI 狀態變動後,依 SO 關聯單據整體狀況推進 SO 狀態。
 * 若 IT + TI 都完成,自動建 PK 並回傳(透過 pkToCreate)。
 */
function planSoAdvance(
  so: SO,
  its: readonly IT[],
  tis: readonly TI[],
):
  | {
      newStatus: SOStatus;
      pkToCreate?: PK;
      relatedPkNumber?: string;
    }
  | null {
  // 情境 A 已在 createSO 時直接建 PK、狀態為 ready_to_pick,無需推進
  if (so.scenario === 'A') return null;
  // 已經有 PK(或後續狀態)則不再推進
  if (so.relatedPkNumber) return null;

  const relatedIts = its.filter((it) => so.relatedItNumbers.includes(it.itNumber));
  const relatedTis = tis.filter((ti) => so.relatedTiNumbers.includes(ti.tiNumber));

  const allItsDone =
    relatedIts.length === 0 || relatedIts.every((it) => it.status === 'completed');
  const allTisDone =
    relatedTis.length === 0 || relatedTis.every((ti) => ti.status === 'completed');

  if (allItsDone && allTisDone) {
    const yymm = getCurrentYYMM(so.createdAt);
    const pkNumber = formatDocNumber('PK', yymm, so.seq);
    const pk: PK = {
      id: generateId('pk'),
      pkNumber,
      seq: so.seq,
      relatedSoNumber: so.soNumber,
      items: so.items,
      status: 'pending',
      createdAt: new Date(),
    };
    return {
      newStatus: 'ready_to_pick',
      pkToCreate: pk,
      relatedPkNumber: pkNumber,
    };
  }

  if (allItsDone && !allTisDone) {
    return { newStatus: 'waiting_supplier' };
  }
  if (!allItsDone && allTisDone) {
    return { newStatus: 'waiting_transfer' };
  }
  return { newStatus: 'waiting_all' };
}

// ───────────────────── store ─────────────────────

export const useSalesStore = create<SalesStoreState>((set, get) => ({
  sos: [...INITIAL_MOCK_SOS],
  its: [...INITIAL_MOCK_ITS],
  tis: [...INITIAL_MOCK_TIS],
  pks: [...INITIAL_MOCK_PKS],
  bxs: [...INITIAL_MOCK_BXS],
  dns: [...INITIAL_MOCK_DNS],
  sharedSeq: SHARED_SEQ_START,
  itSeq: IT_SEQ_START,
  tiSeq: TI_SEQ_START,

  createSO: ({ customer, items, createdBy = '王小明' }) => {
    const analysis = analyzeSO(items);
    const yymm = getCurrentYYMM();
    const createdAt = new Date();

    const nextSeq = get().sharedSeq + 1;
    const shared = buildSharedDocNumbers(yymm, nextSeq);

    // 1. 建立 IT(若情境 B/D 需調撥)
    //    目前 demo 對每個 from-warehouse 合併成一張 IT(未來可依倉別拆單)。
    const newIts: IT[] = [];
    if (analysis.needsTransfer) {
      // 依來源倉分組,同一倉合併一張 IT
      const byWarehouse = new Map<string, ITItem[]>();
      for (const plan of analysis.transferPlan) {
        const list = byWarehouse.get(plan.fromWarehouse) ?? [];
        list.push({
          sku: plan.sku,
          name: plan.name,
          fromWarehouse: plan.fromWarehouse,
          quantity: plan.quantity,
        });
        byWarehouse.set(plan.fromWarehouse, list);
      }
      let itSeqCursor = get().itSeq;
      byWarehouse.forEach((itItems) => {
        itSeqCursor += 1;
        newIts.push({
          id: generateId('it'),
          itNumber: formatDocNumber('IT', yymm, itSeqCursor),
          toWarehouse: 'main',
          items: itItems,
          relatedSoNumber: shared.soNumber,
          status: 'pending',
          createdAt,
        });
      });
    }

    // 2. 建立 TI(若情境 C/D 需同行調貨)
    //    所有 inquiry 項目合併成一張 TI(簡化,實務上可依 vendor 拆單)。
    const newTis: TI[] = [];
    if (analysis.needsInquiry) {
      const tiItems: TIItem[] = analysis.inquiryPlan.map((p) => ({
        sku: p.sku,
        name: p.name,
        quantity: p.quantity,
        vendorId: p.vendorId ?? 'UNKNOWN',
        vendorName: p.vendorName ?? '未指定同行',
        unitCost: p.unitCost ?? 0,
        sourceRfqNumber: p.sourceRfqNumber,
        sourceQtNumber: p.sourceQtNumber,
      }));
      const nextTiSeq = get().tiSeq + 1;
      newTis.push({
        id: generateId('ti'),
        tiNumber: formatDocNumber('TI', yymm, nextTiSeq),
        items: tiItems,
        relatedSoNumber: shared.soNumber,
        status: 'pending_pickup',
        createdAt,
      });
    }

    // 3. 建立 SO(先不帶 relatedPkNumber;情境 A 下面會補)
    const status = initialStatusByScenario(analysis.scenario);
    const so: SO = {
      id: generateId('so'),
      soNumber: shared.soNumber,
      seq: nextSeq,
      customer,
      items,
      scenario: analysis.scenario,
      status,
      relatedItNumbers: newIts.map((it) => it.itNumber),
      relatedTiNumbers: newTis.map((ti) => ti.tiNumber),
      relatedPkNumber: analysis.scenario === 'A' ? shared.pkNumber : undefined,
      totalAmount: totalOf(items),
      createdAt,
      createdBy,
    };

    // 4. 情境 A 直接建 PK
    let newPk: PK | undefined;
    if (analysis.scenario === 'A') {
      newPk = {
        id: generateId('pk'),
        pkNumber: shared.pkNumber,
        seq: nextSeq,
        relatedSoNumber: shared.soNumber,
        items,
        status: 'pending',
        createdAt,
      };
    }

    set((state) => ({
      sos: [so, ...state.sos],
      its: newIts.length ? [...newIts, ...state.its] : state.its,
      tis: newTis.length ? [...newTis, ...state.tis] : state.tis,
      pks: newPk ? [newPk, ...state.pks] : state.pks,
      sharedSeq: nextSeq,
      itSeq: state.itSeq + newIts.length,
      tiSeq: state.tiSeq + newTis.length,
    }));

    return {
      so,
      analysis,
      pk: newPk,
      its: newIts,
      tis: newTis,
    };
  },

  executeTransfer: (itId) => {
    set((state) => ({
      its: state.its.map((it) =>
        it.id === itId && it.status === 'pending'
          ? { ...it, status: 'in_transit' as ITStatus, startedAt: new Date() }
          : it,
      ),
    }));
  },

  completeTransfer: (itId) => {
    const it = get().its.find((x) => x.id === itId);
    if (!it || it.status !== 'in_transit') return;

    // 先建立新的 IT 陣列(含本次 completed 的)
    const updatedIts: IT[] = get().its.map((x) =>
      x.id === itId
        ? { ...x, status: 'completed' as ITStatus, completedAt: new Date() }
        : x,
    );

    // 再檢查該 IT 關聯的 SO 是否可推進
    const so = get().sos.find((s) => s.soNumber === it.relatedSoNumber);
    if (!so) {
      set({ its: updatedIts });
      return;
    }

    const advance = planSoAdvance(so, updatedIts, get().tis);
    if (!advance) {
      set({ its: updatedIts });
      return;
    }

    set((state) => ({
      its: updatedIts,
      sos: state.sos.map((s) =>
        s.id === so.id
          ? {
              ...s,
              status: advance.newStatus,
              relatedPkNumber: advance.relatedPkNumber ?? s.relatedPkNumber,
            }
          : s,
      ),
      pks: advance.pkToCreate ? [advance.pkToCreate, ...state.pks] : state.pks,
    }));
  },

  pickupInquiry: (tiId) => {
    set((state) => ({
      tis: state.tis.map((ti) =>
        ti.id === tiId && ti.status === 'pending_pickup'
          ? { ...ti, status: 'picked_up' as TIStatus, pickedUpAt: new Date() }
          : ti,
      ),
    }));
  },

  completeInquiry: (tiId) => {
    const ti = get().tis.find((x) => x.id === tiId);
    if (!ti || ti.status !== 'picked_up') return;

    const updatedTis: TI[] = get().tis.map((x) =>
      x.id === tiId
        ? { ...x, status: 'completed' as TIStatus, completedAt: new Date() }
        : x,
    );

    const so = get().sos.find((s) => s.soNumber === ti.relatedSoNumber);
    if (!so) {
      set({ tis: updatedTis });
      return;
    }

    const advance = planSoAdvance(so, get().its, updatedTis);
    if (!advance) {
      set({ tis: updatedTis });
      return;
    }

    set((state) => ({
      tis: updatedTis,
      sos: state.sos.map((s) =>
        s.id === so.id
          ? {
              ...s,
              status: advance.newStatus,
              relatedPkNumber: advance.relatedPkNumber ?? s.relatedPkNumber,
            }
          : s,
      ),
      pks: advance.pkToCreate ? [advance.pkToCreate, ...state.pks] : state.pks,
    }));
  },

  completePicking: (pkId) => {
    const pk = get().pks.find((x) => x.id === pkId);
    if (!pk) return;
    if (pk.status === 'completed') return;

    const so = get().sos.find((s) => s.soNumber === pk.relatedSoNumber);
    if (!so) return;

    // 用 SO seq 建立 BX(共享流水)
    const bxNumber = formatDocNumber('BX', getCurrentYYMM(so.createdAt), so.seq);
    const newBx: BX = {
      id: generateId('bx'),
      bxNumber,
      seq: so.seq,
      relatedSoNumber: so.soNumber,
      relatedPkNumber: pk.pkNumber,
      status: 'pending',
      createdAt: new Date(),
    };

    set((state) => ({
      pks: state.pks.map((x) =>
        x.id === pkId
          ? { ...x, status: 'completed' as PKStatus, completedAt: new Date() }
          : x,
      ),
      bxs: [newBx, ...state.bxs],
      sos: state.sos.map((s) =>
        s.id === so.id ? { ...s, status: 'packed', relatedBxNumber: bxNumber } : s,
      ),
    }));
  },

  completePacking: (bxId) => {
    const bx = get().bxs.find((x) => x.id === bxId);
    if (!bx) return;
    if (bx.status === 'completed') return;

    const so = get().sos.find((s) => s.soNumber === bx.relatedSoNumber);
    if (!so) return;

    const dnNumber = formatDocNumber('DN', getCurrentYYMM(so.createdAt), so.seq);
    const newDn: DN = {
      id: generateId('dn'),
      dnNumber,
      seq: so.seq,
      relatedSoNumber: so.soNumber,
      relatedBxNumber: bx.bxNumber,
      status: 'delivering',
      createdAt: new Date(),
    };

    set((state) => ({
      bxs: state.bxs.map((x) =>
        x.id === bxId
          ? { ...x, status: 'completed' as BXStatus, completedAt: new Date() }
          : x,
      ),
      dns: [newDn, ...state.dns],
      sos: state.sos.map((s) =>
        s.id === so.id ? { ...s, status: 'delivering', relatedDnNumber: dnNumber } : s,
      ),
    }));
  },

  completeDelivery: (dnId) => {
    const dn = get().dns.find((x) => x.id === dnId);
    if (!dn) return;
    if (dn.status === 'signed') return;

    set((state) => ({
      dns: state.dns.map((x) =>
        x.id === dnId
          ? { ...x, status: 'signed' as DNStatus, deliveredAt: new Date() }
          : x,
      ),
      sos: state.sos.map((s) =>
        s.soNumber === dn.relatedSoNumber ? { ...s, status: 'completed' as SOStatus } : s,
      ),
    }));
  },
}));
