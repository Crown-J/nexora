// apps/nx-ui/src/design/hooks/useWorkstation.ts
//
// 工作站機制（現場殼專用）
// 規格：docs/專案/介面規格/NEXORA-外殼規格-v3.0.0.md §7
//
// ⭐ 執行長 2026-08-02 拍板：**綁在螢幕上，⛔ 不是綁在人身上。**
//    包貨台那台螢幕第一次開機問一次「你是哪個站」，選了就記住；
//    之後開機直接就是那個站的樣子、⛔ 不用每天登入選。
//    理由很簡單——那台螢幕⛔ 不會被拿去做別的事。
//
// ⭐ 為什麼需要這個東西：
//    手機和電腦可以靠裝置判斷，但「包貨台的固定螢幕」和「主管的電腦」
//    在瀏覽器眼裡是同一種東西。分不出來就會出事——
//    主管打開看到一次一箱的執行畫面、包貨員打開看到滿滿的看板。
//
// ⚠️ 存在瀏覽器本機、⛔ 不動 schema：
//    介面軌的紀律是⛔ 不碰 schema／API／DB（介面架構 §9）。
//    代價：換瀏覽器或清快取要重選一次；系統⛔ 不知道「哪一台包的」，
//    只知道「誰」包的（使用者本來就有記錄）。要稽核到機台再加表不遲。
//
// ⭐ 規模⛔ 不是設定：
//    沒有任何螢幕註冊成工作站 → 全部走手機走動版 → 自動就是單人作業；
//    有螢幕註冊了 → 那台是定點版 → 自動就是多工作線。
//    ⛔ 不做「小規模／大規模」選項，⛔ 沒有人會選錯。
//
// ⚠️ 用 useSyncExternalStore ⛔ 不用 useEffect+setState：
//    localStorage 與 matchMedia 是「外部狀態」，這是 React 給它們的正規做法。
//    附帶好處＝同一台螢幕開兩個分頁時會自己同步。

'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * 這台螢幕是什麼。
 *
 * 前三個是定點站（執行長 2026-08-02 拍板：收貨區也要）。
 *
 * ⭐ 後兩個是 2026-08-02 補的**逃生出口**，⛔ 不是原設計的一部分：
 *    原本只有「沒註冊＝自動判斷」，而自動判斷是靠「粗指標 ＋ 螢幕 <900px」。
 *    ⚠️ 倉庫的手持機型號千奇百怪——**萬一它沒被認出來是手機，
 *    倉管會拿到看板、而且沒有任何辦法切回走動版**。
 *    手持機本來就是一台永遠做同一件事的螢幕，讓它自己註冊最合理，
 *    也跟「綁螢幕⛔ 不綁人」是同一個道理。
 */
export const STATION_KINDS = ['receiving', 'packing', 'shipping', 'handheld', 'board'] as const;
export type StationKind = (typeof STATION_KINDS)[number];

export const STATION_LABEL: Record<StationKind, string> = {
  receiving: '收貨區',
  packing: '包貨台',
  shipping: '出貨台',
  handheld: '手持機',
  board: '看板',
};

/** 定點站＝會出現「左佇列＋右當前件」那套佈局的三種 */
export const FIXED_STATIONS: StationKind[] = ['receiving', 'packing', 'shipping'];

/** 現場殼的三套佈局（外殼規格 §7） */
export type FieldLayout =
  /** 走動：手機、一次一件、相機掃碼、大按鈕（戴手套按得到） */
  | 'roam'
  /** 定點：固定螢幕、一次一箱／一單、掃描槍（等同鍵盤） */
  | 'station'
  /** 看板：主管視角、看全部進度 */
  | 'board';

const KEY = 'nx.workstation';
const EVT = 'nx-workstation-change';

/** 這台螢幕註冊成哪個站；null＝沒註冊過 */
export type Workstation = { kind: StationKind; label: string } | null;

// ⚠️ 快取解析結果：useSyncExternalStore 的 getSnapshot 每次回傳新物件會無限重繪
let cachedRaw: string | null = null;
let cachedValue: Workstation = null;

function parse(raw: string | null): Workstation {
  if (raw === cachedRaw) return cachedValue;
  cachedRaw = raw;
  cachedValue = null;
  if (raw) {
    try {
      const v = JSON.parse(raw) as { kind?: string; label?: string };
      if (v.kind && (STATION_KINDS as readonly string[]).includes(v.kind)) {
        const kind = v.kind as StationKind;
        cachedValue = { kind, label: v.label || STATION_LABEL[kind] };
      }
    } catch {
      /* 壞掉的值當作沒註冊，⛔ 不要讓一個爛字串把整頁弄掛 */
    }
  }
  return cachedValue;
}

function subscribeStation(cb: () => void) {
  window.addEventListener('storage', cb); // 其他分頁改的
  window.addEventListener(EVT, cb); // 同一個分頁改的
  return () => {
    window.removeEventListener('storage', cb);
    window.removeEventListener(EVT, cb);
  };
}
const stationSnapshot = () => parse(window.localStorage.getItem(KEY));
const stationServerSnapshot = (): Workstation => null;

/**
 * 手機判定：⚠️ 刻意用「粗指標 ＋ 窄螢幕」兩個條件，⛔ 不看 userAgent。
 * 倉庫的手持裝置型號千奇百怪，比對 UA 字串一定會漏；
 * 「手指在點 ＋ 螢幕很窄」才是走動版真正要服務的情境。
 */
const ROAM_QUERY = '(pointer: coarse) and (max-width: 899px)';
function subscribeRoam(cb: () => void) {
  const mq = window.matchMedia(ROAM_QUERY);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}
const roamSnapshot = () => window.matchMedia(ROAM_QUERY).matches;
const roamServerSnapshot = () => false;

export function useWorkstation() {
  const station = useSyncExternalStore(subscribeStation, stationSnapshot, stationServerSnapshot);
  const roam = useSyncExternalStore(subscribeRoam, roamSnapshot, roamServerSnapshot);
  // SSR 與第一次 hydrate 之後才算數；useSyncExternalStore 已經處理好，這裡永遠是 true
  const ready = typeof window !== 'undefined';

  const register = useCallback((kind: StationKind) => {
    window.localStorage.setItem(KEY, JSON.stringify({ kind, label: STATION_LABEL[kind] }));
    window.dispatchEvent(new Event(EVT));
  }, []);

  const clear = useCallback(() => {
    window.localStorage.removeItem(KEY);
    window.dispatchEvent(new Event(EVT));
  }, []);

  /**
   * ⭐ 佈局優先序：**這台螢幕自己說的 > 自動判斷**。
   *
   *   註冊成手持機   → 走動
   *   註冊成看板     → 看板
   *   註冊成定點站   → 定點
   *   ⛔ 沒註冊      → 自動判斷：手機→走動、其餘→看板
   *
   * ⚠️ 為什麼註冊要蓋過自動判斷（2026-08-02 補）：
   *    自動判斷靠「粗指標 ＋ 螢幕 <900px」，倉庫手持機型號千奇百怪，
   *    **偵測失準時倉管會拿到看板而且切不回去**。
   *    有了註冊當出口，偵測只是「沒設定時的方便預設」⛔ 不是唯一依據。
   */
  const layout: FieldLayout = station
    ? station.kind === 'handheld'
      ? 'roam'
      : station.kind === 'board'
        ? 'board'
        : 'station'
    : roam
      ? 'roam'
      : 'board';

  /** 這個佈局是自己選的還是自動判斷的——畫面上要講清楚，⛔ 不要讓人以為系統壞了 */
  const layoutSource: 'registered' | 'auto' = station ? 'registered' : 'auto';

  return { ready, layout, layoutSource, station, roam, register, clear };
}
