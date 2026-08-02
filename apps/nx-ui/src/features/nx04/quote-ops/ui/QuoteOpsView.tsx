// apps/nx-ui/src/features/nx04/quote-ops/ui/QuoteOpsView.tsx
//
// 報價作業（銷售第 1 格）—— v3.0.0 一頁式，取代舊的「即時報價」浮層工作站。
// 規格：docs/專案/介面規格/NEXORA-介面架構-v3.0.0.md v1.1 §2.1 §3.3 §6 §7
//
// ⭐ 為什麼這是第 1 格（執行長 2026-08-01）：
//    「客戶打進來就是來詢價，所以要做的就是直接報價。」
//    查料、看有沒有貨、看兩個價——那些不是另一件事，是報價當下的動作，全部收在這一頁。
//    所以九宮格⛔ 沒有「查價查貨」那一格了。
//
// ⭐ 沿用舊浮層工作站的五階段流程（執行長 2026-08-01 訂正）：
//      對象 → 搜尋 → 檢查庫存 → 報價 → 發送訊息
//    形狀不變、使用者已經認得，⛔ 改掉的只有「它是彈窗」這件事。
//    流程軌從浮層左欄變成頁面左欄常駐（FlowTemplate），內容一頁到底、Alt+1~5 跳段。
//    ⛔ 不是分步精靈——五段同時都在，往下滾就看得到全貌、回頭改只是往上滾。
//
// ⚠️ 存的是**報價紀錄**（source='INSTANT'），⛔ 不是正式報價單——
//    沿用舊站的業務行為（見 QuoteWorkspace.save()）：電話報價量大，不是每通都要開正式單。
//
// ⚠️ 訊息文字沿用共用產生器 buildQuoteMessage（與舊站、調貨詢價同一支），
//    ⛔ 不另外發明格式，否則客戶收到的訊息會因為從哪裡報而長不一樣。

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, Trash2 } from 'lucide-react';

import {
  checkCredit,
  type CreditCheckBlocked,
  type CreditCheckResult,
} from '@data/endpoints/nx04/credit-guard/api/credit-guard';
import { getQuoteCandidates, getQuotePriceHistory } from '@data/endpoints/nx04/quote/api/quote';
import { createQuoteRecord } from '@data/endpoints/nx04/record/api/record';
import { quickSearchParts } from '@data/endpoints/nx01/part-search/api/part-search';
import type { PartSearchRow } from '@data/types/nx01/part-search';
import type { QuoteCandidate, QuotePriceHistoryRow } from '@data/types/nx04/quote';
import { FlowPanes } from '@design/templates/FlowPanes';
import { FlowTemplate, type FlowApi, type FlowSection } from '@design/templates/FlowTemplate';

import { createPartner, getPartner } from '@data/endpoints/shared/master/partner/api/partner';
import {
  createPartnerAddress,
  listPartnerAddresses,
  type PartnerAddressRow,
} from '@data/endpoints/shared/address/partner-address-api';
import { listWarehouses } from '@data/endpoints/nx01/api/warehouse';
import type { PartnerDto, PartnerType } from '@data/types/shared/master/partner';

import { CustomerPicker, type PickedCustomer } from '../../quote/ui/CustomerPicker';
import {
  buildQuoteMessage,
  defaultMsgOpts,
  MSG_OPT_DEFS,
  MSG_OPTS_KEY,
  type MsgOpts,
} from '../../quote/ui/quote-message';

/** 這通電話已經報出去的一行 */
type QuoteLine = {
  partId: string;
  code: string;
  name: string;
  secCode: string | null;
  brandCode: string | null;
  brandName: string | null;
  isOem: boolean;
  qty: string;
  unitPrice: string;
  remark: string;
  /** 加入當下的可出量，只用來提醒「報了但沒貨」*/
  available: number;
  // ── 比價用（執行長 2026-08-01：價格只在「報價」這一段出現）──
  /** 市場行情價（主檔 A 價）：保養廠拿去跟車主講的 */
  marketPrice: string | null;
  /** 公司定價（主檔 B 價）：我們賣他的 */
  listPrice: string | null;
  /** 這個客戶上次買這支多少 */
  customerLastAmount: string | null;
  customerLastDate: string | null;
};

/*
 * ⚠️ 原本掛在這裡的 FIELD 常數已移除（2026-08-02 字級收斂）——
 *    輸入框樣式改用 design/styles/v3.css 的 .nx-field / .nx-field-cell / .nx-field-lg。
 *    ⭐ 焦點用底色表達（灰底退後、白底浮出）的設計沒有變，只是搬到樣式表裡定義一次，
 *       ⛔ 不再每個欄位重打一次尺寸與字級。
 */

function num(v: string | null | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * ⭐⚠️ 業績值計算——這是「插槽」，⛔ 不是最終規則（執行長 2026-08-02：
 *      「可以先設定好，後面設計完 KPI 可以帶入」）。
 *
 * 目前暫定 業績＝營收認列金額＝數量 × 報價。整頁只有這一支函式在算業績，
 * KPI 規則定案後 ⛔ 只改這裡、⛔ 不要散到畫面各處。
 *
 * ⚠️ 待執行長拍板的業務語意（⛔ 我不自己決定）：
 *   1. 業績算「營收」還是「毛利」？算毛利的話要成本——目前這支 API 的候選列
 *      （QuoteCandidate）⛔ 沒有帶任何成本欄位，要接毛利得先擴 API。
 *   2. 報價階段就算業績，還是成交才算？現在這頁存的是報價紀錄、不是銷貨單。
 *   3. 退貨、折讓要不要回沖？
 */
function calcPerformance(qty: number, unitPrice: number): number {
  return qty * unitPrice;
}

function money(v: string | null | undefined): string {
  if (v == null || v === '') return '—';
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString() : String(v);
}

/** 全公司可出量＝各倉相加（與命中清單同口徑，⛔ 不用單倉的 warehouseAvailable）*/
function totalAvailable(c: QuoteCandidate): number {
  return Object.values(c.stockByWh ?? {}).reduce((s, v) => s + num(v), 0);
}

/** 取貨方式代碼 → 看得懂的字（值域對齊 partner DTO 的 D/P/C）*/
const DELIVERY_LABEL: Record<string, string> = {
  D: '配送',
  P: '自取',
  C: '寄貨',
};

/**
 * 從地址清單挑出「要送去哪」：預設送貨地址 → 任一送貨地址 → 都沒有就 null。
 * 結構化欄位（縣市/路/巷/弄）與 freeform 兩種都要能顯示——舊資料多半是 freeform。
 */
function pickShipTo(rows: PartnerAddressRow[]): string | null {
  const ship = rows.filter((r) => r.addressType === 'SHIPPING' && r.isActive);
  const pick = ship.find((r) => r.isDefault) ?? ship[0];
  if (!pick) return null;
  if (pick.freeformAddress?.trim()) return pick.freeformAddress.trim();
  const parts = [
    pick.postalCode,
    pick.city?.name,
    pick.district?.name,
    pick.streetName,
    pick.lane ? `${pick.lane}巷` : null,
    pick.alley ? `${pick.alley}弄` : null,
    pick.buildingNo ? `${pick.buildingNo}號` : null,
    pick.floor ? `${pick.floor}樓` : null,
  ].filter(Boolean);
  return parts.length ? parts.join('') : null;
}

/**
 * 基本資料的一欄。⛔ 值不用灰字（規格 §6），只有標籤降一階。
 *
 * ⭐ 2026-08-02 執行長指正：原本把欄位塞進「貨怎麼出」「錢」兩個有標題的小框裡——
 *    ⛔ 那是在做分類，但業務看客戶資料時根本不需要分類，他要的是一張看得舒服的表。
 *    改成單一張表：所有欄位同一個網格、同一種樣式、標籤對齊值對齊，⛔ 沒有標題、沒有內框。
 *
 * children 用來放非純文字的值（例如狀態徽章）；⛔ 兩者不並存，有 children 就以它為準。
 */
function Field({
  label,
  value,
  wide,
  children,
}: {
  label: string;
  value?: string | null;
  wide?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className={wide ? 'md:col-span-2' : undefined}>
      {/* ⚠️ 標籤原本是 13px，2026-08-02 收斂時抬到 14（§6 的最小級距）*/}
      <div className="nx-hint mb-1">{label}</div>
      {children ?? <div className="text-[15px] font-medium text-foreground">{value || '—'}</div>}
    </div>
  );
}

/** 這支料有貨的倉別（⛔ 只列有貨的——零的倉列出來只是雜訊） */
function stockSpots(
  c: QuoteCandidate,
  warehouses: { id: string; code: string; name: string }[],
): { name: string; qty: number }[] {
  return warehouses
    .map((w) => ({ name: w.name, qty: num(c.stockByWh?.[w.id]) }))
    .filter((x) => x.qty > 0)
    .sort((a, b) => b.qty - a.qty);
}

export function QuoteOpsView() {
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [credit, setCredit] = useState<CreditCheckResult | CreditCheckBlocked | null>(null);
  /** 選定客戶後的完整基本資料（下方常駐面板用）*/
  const [profile, setProfile] = useState<PartnerDto | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  /** 送貨地址（衛星表；⭐ 業務要知道這批貨要送去哪） */
  const [shipTo, setShipTo] = useState<string | null>(null);
  /**
   * 建立新客戶的草稿；null＝沒有在建。
   * 欄位＝執行長 2026-08-01 指定的最小集合。
   * ⛔ 交易條件（付款方式、額度、月結）不放這裡——那要跟財務接洽，不是業務接電話時決定的。
   */
  const [draft, setDraft] = useState<{
    partnerType: PartnerType;
    name: string;
    address: string;
    defaultWarehouseId: string;
    defaultDeliveryType: string;
    contactName: string;
    phone: string;
    mobile: string;
    remark: string;
  } | null>(null);
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);
  const draftNameRef = useRef<HTMLInputElement>(null);
  /** 建檔用的倉別選項（開頁就抓一次） */
  const [whOptions, setWhOptions] = useState<{ id: string; code: string; name: string }[]>([]);
  /** 選定客戶後的卡片；⭐ 選完焦點落在這裡，Enter 進下一段 */
  const cardRef = useRef<HTMLDivElement>(null);
  /** 流程模板交出來的 goTo（⚠️ 只在事件處理器裡用） */
  const flowApi = useRef<FlowApi | null>(null);
  /**
   * ⚠️ 卡片要等客戶資料抓回來才存在，所以⛔ 不能在 onPick 當下就 focus——那時它還沒 render。
   *    改成先舉旗，資料到齊的那一刻再聚焦，並且只做這一次
   *    （不然使用者換去別的欄位、資料一重整就被搶回來）。
   */
  const wantCardFocus = useRef(false);

  /*
   * ⭐ 2026-08-02 執行長指正：零件也要走「關鍵字下拉選單」，⛔ 不做卡片格。
   *    原本命中結果排成三欄卡片，等於同一頁有兩套操作——客戶是下拉、零件是卡片格，
   *    使用者得學兩次；而且卡片格不能用 ↑↓ 選，鍵盤流程斷在這裡。
   *    現在與 CustomerPicker 同一個形狀：打字即查 → 下拉浮在輸入框底下 → ↑↓ 選 → Enter 帶入。
   */
  const [term, setTerm] = useState('');
  const [hits, setHits] = useState<PartSearchRow[]>([]);
  /** 下拉裡目前高亮的那一列（⛔ 不是「選定的料」，選定的是 picked） */
  const [hi, setHi] = useState(0);
  const [open, setOpen] = useState(false);
  /** 選定的那支料；null＝還沒選。第 3 段「檢查庫存」看的是它 */
  const [picked, setPicked] = useState<PartSearchRow | null>(null);
  const [searching, setSearching] = useState(false);
  /** ⚠️ 「確實搜過而且真的零筆」才算查無，⛔ 不能只看 hits.length（搜尋還沒回來時本來就是空的） */
  const [noMatch, setNoMatch] = useState(false);
  const [rows, setRows] = useState<QuoteCandidate[]>([]);
  const [rowsLoading, setRowsLoading] = useState(false);
  /**
   * 「檢查庫存」左欄清單目前選到第幾列（⛔ 不是「已加入」——已加入看 lines）。
   * 右欄儀表板顯示的就是這一列。
   */
  const [stockSel, setStockSel] = useState(0);
  /** 「報價」左欄選到第幾列；右欄的報價屬性顯示的就是這一列 */
  const [lineSel, setLineSel] = useState(0);
  /**
   * ⭐ 「報價」這一段兩側都要打字（左邊選項目、右邊改數量與價格），
   *    所以要記住鍵盤現在在哪一側——沿用舊浮層工作站的 items／props 機制。
   *    ⛔ 別的段落不需要（只有一側在做事），所以這個狀態只給報價用。
   */
  const [quotePane, setQuotePane] = useState<'items' | 'props'>('items');
  /** 各倉別（用來把 stockByWh 的 id 翻成看得懂的倉名）*/
  const [warehouses, setWarehouses] = useState<{ id: string; code: string; name: string }[]>([]);

  const [lines, setLines] = useState<QuoteLine[]>([]);
  /**
   * 「過去成交／報價」就地展開（執行長 2026-08-02：報價那一欄要打得開）。
   * histPartId＝目前展開的是哪一列；⛔ 一次只展開一列（兩列同時攤開表格會被撐爛）。
   * ⚠️ 舊浮層工作站這一段是彈窗，新架構⛔ 不做彈窗（規格 §2.1）——改成表格內就地展開。
   */
  const [histPartId, setHistPartId] = useState<string | null>(null);
  const [hist, setHist] = useState<QuotePriceHistoryRow[] | null>(null);
  const [histLoading, setHistLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  /**
   * 訊息內容設定（會記住）。⚠️ 與舊浮層工作站共用同一把 localStorage 鑰匙（MSG_OPTS_KEY）——
   * ⛔ 不另開一把：同一個人在新舊兩邊調出來的訊息格式要一樣，否則客戶收到的會長不同。
   */
  const [msgOpts, setMsgOpts] = useState<MsgOpts>(defaultMsgOpts);

  // 開頁讀回上次的設定。⚠️ 只在客戶端做（localStorage 在 SSR 不存在）
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(MSG_OPTS_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<MsgOpts>;
      // ⚠️ 用預設值墊底：舊資料可能少了後來新增的選項，直接套會變成 undefined
      setMsgOpts({ ...defaultMsgOpts, ...saved });
    } catch {
      /* 壞掉的設定就當作沒有，⛔ 不要因此擋住整頁 */
    }
  }, []);

  const setMsgOpt = useCallback((key: keyof MsgOpts, value: boolean) => {
    setMsgOpts((prev) => {
      const next = { ...prev, [key]: value };
      try {
        window.localStorage.setItem(MSG_OPTS_KEY, JSON.stringify(next));
      } catch {
        /* 存不進去（無痕模式之類）不影響這一次的使用 */
      }
      return next;
    });
  }, []);

  const searchRef = useRef<HTMLInputElement>(null);
  /** 下拉清單容器：↑↓ 時要把高亮列捲進可視範圍 */
  const hitListRef = useRef<HTMLDivElement>(null);
  /** 「檢查庫存」左欄清單容器（跳段時焦點落點、↑↓ 捲動用） */
  const stockListRef = useRef<HTMLDivElement>(null);
  /** 「報價」左欄清單容器（同上） */
  const lineListRef = useRef<HTMLDivElement>(null);
  /** 「報價」右欄屬性面板容器（Enter 從左欄進來的落點、Esc 回去的起點） */
  const propPaneRef = useRef<HTMLDivElement>(null);
  const customerRef = useRef<HTMLInputElement>(null);
  const reqRef = useRef(0);
  /** 歷史查詢的競態序號（連點兩列時，⛔ 不能讓先回來的蓋掉後點的） */
  const histReqRef = useRef(0);

  // ⭐ 進來先鎖「對象」（執行長 2026-08-01 訂正）：
  //    流程第一段就是對象，游標卻跳去第二段的搜尋框，等於一開始就把人往下拉。
  //    先選客戶還有一個實質理由——選了才知道他的價、他的預設倉、他欠不欠錢。
  useEffect(() => {
    customerRef.current?.focus();
  }, []);

  // 選了客戶 → 問一次「他現在能不能出貨」，並抓完整基本資料給下方面板
  useEffect(() => {
    if (!customer) {
      setCredit(null);
      setProfile(null);
      setShipTo(null);
      return;
    }
    let alive = true;
    setProfileLoading(true);
    checkCredit(customer.id, 0)
      .then((r) => alive && setCredit(r))
      .catch(() => alive && setCredit(null));
    // 送貨地址在衛星表、不在 partner 主表上，所以要另外抓一次
    listPartnerAddresses(customer.id)
      .then((rows) => alive && setShipTo(pickShipTo(rows)))
      .catch(() => alive && setShipTo(null));
    getPartner(customer.id)
      .then((p) => alive && setProfile(p))
      .catch(() => alive && setProfile(null))
      .finally(() => {
        if (alive) setProfileLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [customer]);

  /**
   * 選完客戶 → 焦點交給下方卡片。
   * ⚠️ 一定要放 effect：卡片是 profile 到齊才 render 的，
   *    在 onPick 或 API 回呼裡用 setTimeout 都可能早於 React 提交、cardRef 還是 null（實測踩過）。
   *    effect 保證在提交之後才跑。
   */
  useEffect(() => {
    if (!profile || !wantCardFocus.current) return;
    wantCardFocus.current = false;
    cardRef.current?.focus();
  }, [profile]);

  // 建檔要選預設倉，開頁先把倉別抓好——⛔ 不要等使用者按了建立客戶才轉圈
  useEffect(() => {
    let alive = true;
    listWarehouses({ pageSize: 100, isActive: true })
      .then((r) => {
        if (!alive) return;
        setWhOptions(r.items.map((w) => ({ id: w.id, code: w.code, name: w.name })));
      })
      .catch(() => {
        /* 拿不到就讓那一欄空著，⛔ 不擋建檔 */
      });
    return () => {
      alive = false;
    };
  }, []);

  /** 查無客戶 → 就地開一張空白基本資料讓業務填（⛔ 不跳去主檔頁） */
  const startCreate = useCallback((typedName: string) => {
    setCreateErr(null);
    setDraft({
      partnerType: 'C', // 電話進來的九成是保養廠，預設它
      name: typedName,
      address: '',
      defaultWarehouseId: '',
      defaultDeliveryType: 'D', // 配送
      contactName: '',
      phone: '',
      mobile: '',
      remark: '',
    });
    setTimeout(() => draftNameRef.current?.focus(), 0);
  }, []);

  const saveNewCustomer = useCallback(async () => {
    if (!draft || !draft.name.trim()) return;
    setCreating(true);
    setCreateErr(null);
    try {
      // 代碼留空由後端自動產生（執行長：客戶代碼系統設定、不用輸入）
      const created = await createPartner({
        name: draft.name.trim(),
        partnerType: draft.partnerType,
        contactName: draft.contactName.trim() || undefined,
        phone: draft.phone.trim() || undefined,
        mobile: draft.mobile.trim() || undefined,
        remark: draft.remark.trim() || undefined,
        defaultWarehouseId: draft.defaultWarehouseId || undefined,
        defaultDeliveryType: draft.defaultDeliveryType || undefined,
      });

      // ⚠️ 地址不在 partner 主表上（2026-06-06 起改走 partner_address 衛星表），
      //    所以要在建完客戶之後另外開一筆送貨地址。
      //    ⛔ 電話中不逼業務拆縣市/路/巷/弄/號/樓——用單行 freeformAddress，之後主檔再整理。
      if (draft.address.trim()) {
        try {
          await createPartnerAddress(created.id, {
            addressType: 'SHIPPING',
            isDefault: true,
            freeformAddress: draft.address.trim(),
          });
        } catch {
          // ⚠️ 客戶已經建起來了，地址失敗不該讓整件事回不去——客戶照樣帶入，地址之後補
          setCreateErr('客戶已建立，但地址沒存進去——請稍後到客戶管理補。');
        }
      }

      setDraft(null);
      // 建完直接當成這通電話的對象，⛔ 不用再回去搜一次
      setCustomer({
        id: created.id,
        code: created.code,
        name: created.name,
        defaultWarehouseId: created.defaultWarehouseId ?? null,
        defaultWarehouseName: created.defaultWarehouseName ?? null,
      });
    } catch (e: unknown) {
      setCreateErr(e instanceof Error ? e.message : '建立客戶失敗');
    } finally {
      setCreating(false);
    }
  }, [draft]);

  /**
   * 打字即查（debounce 200ms），比照 CustomerPicker。
   * ⚠️ 選定之後不再自動搜——picked 有值時 term 是「已帶入的料號」，
   *    再去搜它只會把剛選好的下拉又打開一次。
   * ⚠️ 一個字不查：料號都是長碼，單字元會撈回整個資料庫。
   */
  useEffect(() => {
    if (picked) return;
    const kw = term.trim();
    const seq = ++reqRef.current;
    const h = setTimeout(async () => {
      if (kw.length < 2) {
        setHits([]);
        setOpen(false);
        setNoMatch(false);
        return;
      }
      setSearching(true);
      try {
        // 料號、品名、車型一起搜——業務講得出哪個就用哪個
        const res = await quickSearchParts({ partNo: kw, pageSize: 50 });
        let list = res.rows;
        if (list.length === 0) {
          const alt = await quickSearchParts({
            keyword: kw,
            modelQuery: kw,
            pageSize: 50,
          });
          list = alt.rows;
        }
        if (seq !== reqRef.current) return;
        setHits(list);
        setNoMatch(list.length === 0);
        setOpen(true);
        setHi(0);
      } catch {
        if (seq !== reqRef.current) return;
        setHits([]);
        setNoMatch(false);
      } finally {
        if (seq === reqRef.current) setSearching(false);
      }
    }, 200);
    return () => clearTimeout(h);
  }, [term, picked]);

  // ↑↓ 時把高亮那列捲進可視範圍（⛔ 不然選到第 10 筆時看不到自己選在哪）
  useEffect(() => {
    hitListRef.current?.querySelector(`[data-hi="${hi}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [hi, open]);

  /** 帶入一支料 → 第 3 段「檢查庫存」跟著換 */
  const selectPart = useCallback((p: PartSearchRow) => {
    setPicked(p);
    setTerm(`${p.code}　${p.name}`);
    setOpen(false);
    setNoMatch(false);
  }, []);

  const currentPartId = picked?.id ?? null;
  useEffect(() => {
    if (!currentPartId) {
      setRows([]);
      return;
    }
    let alive = true;
    setRowsLoading(true);
    getQuoteCandidates(currentPartId, customer?.id, customer?.defaultWarehouseId ?? undefined)
      .then((r) => {
        if (!alive) return;
        setRows(r.candidates);
        setWarehouses(r.warehouses ?? []);
        // 換了一支料 → 清單回到第一列，⛔ 不要停在上一支料的第 5 列
        setStockSel(0);
      })
      .catch(() => {
        if (!alive) return;
        setRows([]);
        setWarehouses([]);
      })
      .finally(() => {
        if (alive) setRowsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [currentPartId, customer]);

  /** 加進報價：單價預帶公司定價，⛔ 不帶市場行情價（那是給保養廠對車主講的） */
  const addLine = useCallback((c: QuoteCandidate) => {
    setSavedMsg(null);
    setLines((prev) => {
      if (prev.some((l) => l.partId === c.id)) return prev; // 同一支料不重複加
      return [
        ...prev,
        {
          partId: c.id,
          code: c.code,
          name: c.name,
          secCode: c.secCode,
          brandCode: c.brandCode,
          brandName: c.brandName,
          isOem: c.isOem,
          qty: '1',
          unitPrice: c.listPrice ?? '',
          remark: '',
          available: totalAvailable(c),
          marketPrice: c.marketPrice,
          listPrice: c.listPrice,
          customerLastAmount: c.customerLastAmount,
          customerLastDate: c.customerLastDate,
        },
      ];
    });
  }, []);

  const patchLine = useCallback((partId: string, patch: Partial<QuoteLine>) => {
    setLines((prev) => prev.map((l) => (l.partId === partId ? { ...l, ...patch } : l)));
  }, []);

  const removeLine = useCallback((partId: string) => {
    setLines((prev) => {
      const next = prev.filter((l) => l.partId !== partId);
      // 刪掉最後一列時選取要退回來，⛔ 不然右欄會指到一個不存在的列
      setLineSel((i) => Math.min(i, Math.max(0, next.length - 1)));
      return next;
    });
  }, []);

  /**
   * 空白鍵切換：已加入 → 移除、沒加入 → 加入（沿用舊浮層工作站的行為，執行長 2026-08-02）。
   * ⛔ 不做成「只能加入」——按錯一顆還要跑去第 4 段刪，那條路太遠。
   */
  const toggleLine = useCallback(
    (c: QuoteCandidate) => {
      if (lines.some((l) => l.partId === c.id)) removeLine(c.id);
      else addLine(c);
    },
    [lines, addLine, removeLine],
  );

  // ↑↓ 時把選到的那列捲進可視範圍
  useEffect(() => {
    stockListRef.current
      ?.querySelector(`[data-stock="${stockSel}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [stockSel]);
  useEffect(() => {
    lineListRef.current
      ?.querySelector(`[data-line="${lineSel}"]`)
      ?.scrollIntoView({ block: 'nearest' });
    // 換一列＝回到左欄操作（沿用舊站：換聚焦項目時操作側回主容器）
    setQuotePane('items');
  }, [lineSel]);

  /** 從左欄清單進右欄屬性面板：焦點落在「數量」並整段反白，⭐ 進去就能直接打 */
  const enterPropPane = useCallback(() => {
    setQuotePane('props');
    // ⚠️ 要等 React 把「操作中」那一輪畫完再聚焦，⛔ 同步呼叫會抓到還沒更新的節點
    setTimeout(() => {
      const el = propPaneRef.current?.querySelector<HTMLInputElement>('input:not([disabled])');
      el?.focus();
      el?.select();
    }, 0);
  }, []);

  /** 從右欄退回左欄清單（Esc） */
  const backToLinePane = useCallback(() => {
    setQuotePane('items');
    setTimeout(() => lineListRef.current?.focus(), 0);
  }, []);

  /** 有數量也有價的才算數（對齊舊站 validLines 口徑） */
  const validLines = useMemo(
    () => lines.filter((l) => num(l.qty) > 0 && num(l.unitPrice) > 0),
    [lines],
  );
  const total = useMemo(
    () => validLines.reduce((s, l) => s + num(l.qty) * num(l.unitPrice), 0),
    [validLines],
  );
  /** 這一通電話報出去的業績合計。⚠️ 規則見 calcPerformance 的註解（暫定值、待 KPI 定案） */
  const perfTotal = useMemo(
    () => validLines.reduce((s, l) => s + calcPerformance(num(l.qty), num(l.unitPrice)), 0),
    [validLines],
  );

  /**
   * 展開／收起某一列的「過去成交與報價」。
   * ⚠️ 需要客戶才查得到（API 以 customerId + partId 為鍵）——散客沒有客戶就查不了。
   */
  const toggleHistory = useCallback(
    (partId: string) => {
      if (histPartId === partId) {
        setHistPartId(null);
        return;
      }
      setHistPartId(partId);
      setHist(null);
      if (!customer) return;
      setHistLoading(true);
      const seq = ++histReqRef.current;
      getQuotePriceHistory(customer.id, partId, 10)
        .then((r) => {
          if (seq !== histReqRef.current) return;
          setHist(r.rows);
        })
        .catch(() => {
          if (seq !== histReqRef.current) return;
          setHist([]);
        })
        .finally(() => {
          if (seq === histReqRef.current) setHistLoading(false);
        });
    },
    [histPartId, customer],
  );

  /** 給客戶的訊息——沿用共用產生器，⛔ 不自己排版 */
  const msgText = useMemo(
    () =>
      buildQuoteMessage(
        validLines.map((l) => ({
          name: l.name,
          code: l.code,
          secCode: l.secCode,
          brand: l.brandCode,
          brandName: l.brandName,
          isOem: l.isOem,
          qty: l.qty,
          price: l.unitPrice,
          remark: l.remark || undefined,
        })),
        msgOpts,
        customer?.defaultWarehouseName,
      ),
    [validLines, customer, msgOpts],
  );

  useEffect(() => {
    setCopied(false);
  }, [msgText]);

  const resetAll = useCallback(() => {
    setLines([]);
    setTerm('');
    setHits([]);
    setPicked(null);
    setOpen(false);
    setNoMatch(false);
    setRows([]);
    setErrMsg(null);
    searchRef.current?.focus();
  }, []);

  const save = useCallback(async () => {
    if (!customer || validLines.length === 0) return;
    // §2.1 允許的浮層只有「確認對話」這一種——單一問句、兩個按鈕
    if (!window.confirm(`把這 ${validLines.length} 筆報價存進 ${customer.name} 的報價紀錄？`))
      return;
    setSaving(true);
    setErrMsg(null);
    try {
      for (const l of validLines) {
        await createQuoteRecord({
          customerId: customer.id,
          partId: l.partId,
          qty: num(l.qty),
          unitPrice: num(l.unitPrice),
          warehouseId: customer.defaultWarehouseId ?? undefined,
          source: 'INSTANT',
          remark: l.remark.trim() || undefined,
        });
      }
      setSavedMsg(`已存 ${validLines.length} 筆報價紀錄。`);
      // 存完清空、準備接下一通——⛔ 不留舊資料，避免報到別家客戶身上
      resetAll();
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : '報價紀錄儲存失敗');
    } finally {
      setSaving(false);
    }
  }, [customer, validLines, resetAll]);

  // ───────────────────────────── 五個階段
  const sections: FlowSection[] = [
    {
      key: 'customer',
      label: '對象',
      blocked: customer ? undefined : '還沒選客戶（散客可先跳過，存檔前要補）',
      /*
        ⭐ 2026-08-02 改成兩欄骨架（執行長拍板沿用舊浮層工作站的版面）：
           左＝客戶搜尋（做事）、右＝客戶基本資料（看跟著選中客戶走的資料）。
        ⚠️ 建檔表單放右欄、⛔ 不佔整段：搜尋框要一直留著，
           不然按「取消」時它已經被卸載、焦點回不去（舊版就是把整段換掉才會有這問題）。
      */
      content: (
        <FlowPanes
          mainTitle="客戶搜尋"
          mainNote="↑↓ 選　·　Enter 帶入　·　Alt+Z 注音首碼"
          main={
            <div>
              {/*
              ⭐ 客戶欄常駐、⛔ 選完不換成靜態文字（執行長 2026-08-01）：
                 換掉之後 Alt+1 就找不到輸入欄，想改客戶只能用滑鼠。
                 留著它，Alt+1 回來就會自動聚焦並把文字整段反白，直接重打即可。
            */}
              <CustomerPicker
                onPick={(c) => {
                  // ⭐ 選完焦點落到下方卡片（不是直接衝到搜尋）——
                  //    讓業務先確認「這家對不對」，Enter 才進下一段。
                  //    ⚠️ 卡片要等資料抓回來才存在，所以只舉旗、實際聚焦在資料到齊時做。
                  wantCardFocus.current = true;
                  setCustomer(c);
                }}
                onCommit={() => cardRef.current?.focus()}
                partnerType="C,O"
                inputRef={customerRef}
                onCreateNew={startCreate}
                big
                autoFocus
              />
              <p className="nx-hint mt-3">
                打編號或名稱，↑↓ 選、Enter 帶入；注音首碼按 Alt+Z。查不到按 Enter 直接建客戶。
                <br />
                要換客戶：再按一次 Alt+1，欄位會反白讓你重打。
              </p>

              {credit && !credit.passed ? (
                <div className="nx-alert-danger mt-3">
                  ⛔ 這個客戶目前擋單：{credit.blockedReason}
                </div>
              ) : null}
              {credit && credit.passed && credit.overdueTransferToCash ? (
                <div className="nx-alert-warn mt-3">
                  ⚠️ 這個客戶已逾期 {credit.details.overdueDays} 天——這一單要收現金。
                </div>
              ) : null}
            </div>
          }
          sideTitle={draft ? '建立客戶' : '客戶基本資料'}
          sideNote={draft ? '代碼由系統自動產生' : profile ? '確認無誤按 Enter 進下一段' : undefined}
          side={
            /*
              ⭐ 選到客戶就顯示他是誰、怎麼聯絡、什麼交易條件——業務講電話時要對得上人。
                 查不到客戶時同一個位置變成建檔表單，存完直接變成這通的對象。
                 ⛔ 不跳去主檔頁：跳出去再回來，剛剛打的字跟情境都沒了。
            */
            <div className="h-full overflow-auto">
              {draft ? (
                <div>
                  {/*
                    ⚠️ 這裡刻意單欄（⛔ 不用 nx-form-grid 的兩欄）：
                       這一側只有整段的 4 成寬，兩欄會把每欄壓到放不下一個地址。
                  */}
                  <div className="grid gap-4">
                  <label className="block">
                    <span className="nx-label">客戶類型</span>
                    <select
                      value={draft.partnerType}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          partnerType: e.target.value as PartnerType,
                        })
                      }
                      className="nx-field"
                    >
                      <option value="C">保養廠</option>
                      <option value="O">同行</option>
                      <option value="L">散客</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="nx-label">客戶名稱（必填）</span>
                    <input
                      ref={draftNameRef}
                      value={draft.name}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                      className="nx-field"
                    />
                  </label>

                  <label className="block">
                    <span className="nx-label">預設取貨方式</span>
                    <select
                      value={draft.defaultDeliveryType}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          defaultDeliveryType: e.target.value,
                        })
                      }
                      className="nx-field"
                    >
                      <option value="D">配送</option>
                      <option value="P">自取</option>
                      <option value="C">寄貨</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="nx-label">預設倉位</span>
                    <select
                      value={draft.defaultWarehouseId}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          defaultWarehouseId: e.target.value,
                        })
                      }
                      className="nx-field"
                    >
                      <option value="">（不指定）</option>
                      {whOptions.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  {/* ⚠️ 這裡是單欄，⛔ 不能掛 col-span-2——那會在單欄網格上長出一個隱形的第二欄 */}
                  <label className="block">
                    <span className="nx-label">客戶地址（送去哪）</span>
                    <input
                      value={draft.address}
                      onChange={(e) => setDraft({ ...draft, address: e.target.value })}
                      placeholder="整行打進來就好，⛔ 不用拆縣市巷弄"
                      className="nx-field"
                    />
                  </label>

                  <label className="block">
                    <span className="nx-label">聯絡人</span>
                    <input
                      value={draft.contactName}
                      onChange={(e) => setDraft({ ...draft, contactName: e.target.value })}
                      className="nx-field"
                    />
                  </label>
                  <label className="block">
                    <span className="nx-label">電話</span>
                    <input
                      value={draft.phone}
                      onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                      className="nx-field"
                    />
                  </label>

                  <label className="block">
                    <span className="nx-label">手機</span>
                    <input
                      value={draft.mobile}
                      onChange={(e) => setDraft({ ...draft, mobile: e.target.value })}
                      className="nx-field"
                    />
                  </label>
                  <label className="block">
                    <span className="nx-label">備註</span>
                    <input
                      value={draft.remark}
                      onChange={(e) => setDraft({ ...draft, remark: e.target.value })}
                      className="nx-field"
                    />
                  </label>
                </div>
                {createErr ? <div className="nx-alert-danger mt-4">{createErr}</div> : null}
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={!draft.name.trim() || creating}
                    onClick={() => void saveNewCustomer()}
                    className="nx-btn-primary"
                  >
                    {creating ? '存檔中…' : '存檔並帶入'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(null);
                      setTimeout(() => customerRef.current?.focus(), 0);
                    }}
                    className="nx-btn"
                  >
                    取消
                  </button>
                </div>
                  <p className="nx-hint mt-3">
                    ⚠️ 交易條件（付款方式、額度、月結）系統先給預設值——
                    客戶要談月結請轉財務，⛔ 不在這裡決定。
                  </p>
                </div>
              ) : profileLoading ? (
                <div className="nx-hint">讀取客戶資料中…</div>
              ) : profile ? (
              /*
                ⭐ 選完客戶焦點落在這張卡片、Enter 進下一段（執行長 2026-08-01）：
                   先讓業務確認「這家對不對」再往下走——⛔ 不要選完就直接衝進搜尋，
                   選錯人整通電話的價都會報到別家身上。
              */
              <div
                ref={cardRef}
                tabIndex={0}
                role="group"
                aria-label="客戶基本資料，按 Enter 進下一段"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    flowApi.current?.goTo(1); // 進「搜尋」那一段
                  }
                }}
                /*
                  ⚠️ 2026-08-02 執行長回報「邊框都快壓到字了」：
                     原本這個框沒有內距，焦點外框直接貼著文字畫過去。
                  ⭐ 修法是兩件：內距給到 24px（p-6）讓字四周有空間；
                     外框再往外推 2px（outline-offset）⛔ 不要壓在卡片邊線上。
                */
                className="rounded-lg focus:outline focus:outline-2 focus:outline-primary focus:outline-offset-2"
              >
                {/*
                  就是一張表：抬頭寫這是誰，底下一個網格把該知道的欄位排齊。
                  ⭐ 授信狀態直接放進表裡——那是「這個客戶」的一部分，
                     ⛔ 不該只是飄在上面的一條警示條。

                  ⚠️ 2026-08-02 執行長指正，⛔ 不要再改回去：
                     原本欄位被裝進「貨怎麼出」「錢」兩個有標題的小框——那是在做分類，
                     但業務看客戶資料時不需要分類，他要的是一張看得舒服的表。
                     分類標題與內框全部拿掉，欄位改成單一網格、同一種樣式、標籤與值各自對齊。

                  ⚠️ 2026-08-02 再改：搬進右欄之後，這裡⛔ 不再自己畫框與內距——
                     外面的欄位面板已經是框了，兩層框就是先前被指正過的「卡中卡」。
                */}
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border pb-3">
                  <span className="nx-t-page">{profile.name}</span>
                  <span className="nx-mono">{profile.code}</span>
                  {profile.contactName || profile.phone || profile.mobile ? (
                    <span className="nx-body">
                      {profile.contactName ? `${profile.contactName}　` : ''}
                      {profile.phone ?? profile.mobile ?? ''}
                    </span>
                  ) : null}
                </div>

                {/*
                  ⚠️ 欄位改兩欄（原本四欄）：搬到右欄之後只剩整段四成寬，四欄會把每欄壓爛。
                     地址仍然跨滿——它是唯一會長到換行的欄位。
                */}
                <div className="grid gap-x-6 gap-y-5 pt-4 sm:grid-cols-2">
                  <Field label="統一編號" value={profile.taxId} />
                  <Field
                    label="客戶等級"
                    value={profile.customerGradeName ?? profile.customerGradeCode}
                  />
                  <Field label="付款條件" value={profile.paymentTermDomestic} />
                  <Field label="目前欠款狀況">
                    {credit == null ? (
                      <div className="text-[15px] font-medium text-foreground">—</div>
                    ) : !credit.passed ? (
                      <span className="nx-pill-danger">擋單中</span>
                    ) : credit.overdueTransferToCash ? (
                      <span className="nx-pill-warn">逾期 {credit.details.overdueDays} 天</span>
                    ) : (
                      <span className="nx-pill-ok">正常</span>
                    )}
                  </Field>

                  <Field
                    label="取貨方式"
                    value={
                      profile.defaultDeliveryType
                        ? (DELIVERY_LABEL[profile.defaultDeliveryType] ??
                          profile.defaultDeliveryType)
                        : null
                    }
                  />
                  <Field label="預設出貨倉" value={profile.defaultWarehouseName} />
                  <Field label="送貨地址" value={shipTo} wide />
                </div>
              </div>
              ) : (
                <div className="nx-hint">
                  還沒選客戶。選定之後這裡會顯示他的基本資料；查不到的話會變成建檔表單。
                </div>
              )}
            </div>
          }
        />
      ),
    },
    {
      key: 'search',
      label: '搜尋',
      // ⛔ 這一段不掛 blocked：查料是過程不是條件，
      //    存檔只需要「有客戶」＋「有可報的項目」。掛了會變成查完料還得留著搜尋結果才准存檔。
      content: (
        <div>
          {/* ⚠️ relative 是下拉的定位基準，⛔ 不能拿掉——拿掉下拉會跑到頁面左上角 */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground" />
            <input
              ref={searchRef}
              value={term}
              onChange={(e) => {
                // 一改字就不再是「已選定」，回到搜尋狀態
                setPicked(null);
                setNoMatch(false);
                setTerm(e.target.value);
              }}
              onKeyDown={(e) => {
                if (open && hits.length) {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setHi((i) => Math.min(hits.length - 1, i + 1));
                    return;
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setHi((i) => Math.max(0, i - 1));
                    return;
                  }
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const r = hits[hi];
                    if (r) selectPart(r);
                    return;
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    setOpen(false);
                    return;
                  }
                }
                // 已經選定 → 再按 Enter 進下一段（與「對象」那一段同一個手勢）
                if (e.key === 'Enter' && picked) {
                  e.preventDefault();
                  flowApi.current?.goTo(2);
                }
              }}
              placeholder="料號／品名／車型——打兩個字以上就會跳出清單"
              aria-label="查料"
              autoComplete="off"
              role="combobox"
              aria-expanded={open}
              aria-controls="quote-part-hits"
              className="nx-field-lg pl-12"
            />

            {/*
              ⭐ 關鍵字下拉（執行長 2026-08-02 指正：零件要跟客戶同一套操作）：
                 ↑↓ 選、Enter 帶入、Esc 收起。⛔ 不做三欄卡片格——那個不能用鍵盤選。
              ⚠️ 這是規格 §2.1 允許的三種浮層之一（挑選器：選完即關、不承載流程），
                 ⛔ 不是被禁的彈跳視窗。
            */}
            {open && hits.length ? (
              <div
                ref={hitListRef}
                id="quote-part-hits"
                role="listbox"
                className="absolute z-30 mt-1 max-h-[52vh] w-full overflow-auto rounded-lg border border-border bg-card shadow-lg"
              >
                {hits.map((h, i) => (
                  <button
                    key={h.id}
                    type="button"
                    data-hi={i}
                    role="option"
                    aria-selected={i === hi}
                    // ⚠️ 用 onMouseDown + preventDefault：onClick 會先讓輸入框失焦，
                    //    下拉在那一瞬間就收掉了，滑鼠永遠點不到（比照 CustomerPicker）
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectPart(h);
                    }}
                    className={`flex w-full items-baseline gap-3 border-b border-border px-3 py-2.5 text-left last:border-b-0 ${
                      i === hi ? 'bg-primary/15' : 'hover:bg-accent/15'
                    }`}
                  >
                    <span className="nx-mono shrink-0 font-medium">{h.code}</span>
                    <span className="min-w-0 flex-1 truncate text-[15px] text-foreground">
                      {h.name}
                    </span>
                    <span className="nx-hint shrink-0">
                      {h.brandName ?? '—'}・可出 {num(h.availableTotal).toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}

            {open && noMatch && !searching ? (
              <div className="nx-hint absolute z-30 mt-1 w-full rounded-lg border border-border bg-card px-3 py-3 shadow-lg">
                找不到「{term.trim()}」——換料號、品名或車型再試。
              </div>
            ) : null}
          </div>

          {/* 選定之後的確認列：⛔ 不留在下拉裡，使用者要看得到「我現在拿的是哪一支」 */}
          <div className="mt-4">
            {picked ? (
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="nx-tag-primary">已帶入</span>
                <span className="nx-mono font-medium">{picked.code}</span>
                <span className="nx-body">{picked.name}</span>
                <span className="nx-hint">
                  {picked.brandName ?? '—'}・可出 {num(picked.availableTotal).toLocaleString()}
                </span>
                <span className="nx-hint ml-auto">再按 Enter 看庫存　·　要換一支就直接重打</span>
              </div>
            ) : (
              <div className="nx-hint">
                {searching ? '查詢中…' : '打料號、品名或車型，↑↓ 選、Enter 帶入。'}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'stock',
      label: '檢查庫存',
      // ⛔ 不掛 blocked——看庫存是過程不是存檔條件
      content: (
        <div className="flex min-h-0 flex-1 flex-col">
          {/*
            ⭐ 這一段回答兩個問題（執行長 2026-08-01 訂正）：
                「這支料的通用件有哪些？」「在哪些倉位？」
            ⛔ 這裡不出現任何價格——比價是下一段「報價」的事。
               混在一起會讓業務在還沒確定要出哪一支料的時候就先看價、先想折扣。

            ⭐ 2026-08-02 執行長改版：左邊清單、右邊儀表板。
               原本是一張寬表格，倉位全部擠成一排小標籤——料一多就得橫向捲，
               而且看不出「哪個倉最多」。改成左邊只列通用零件（一列一支、可用鍵盤走），
               右邊把選到的那一支攤開來看：可出量、各倉分佈、身分。
            ⭐ 空白鍵加入／移除（沿用舊浮層工作站，⛔ 不改手勢）。
          */}
          {rowsLoading ? (
            <div className="nx-hint">查詢中…</div>
          ) : rows.length === 0 ? (
            <div className="nx-hint">上一段選一支料，這裡列出它和它的通用件、各在哪個倉。</div>
          ) : (
            <FlowPanes
              mainTitle="通用零件"
              mainNote={`共 ${rows.length} 支　·　↑↓ 選　·　空白鍵加入／移除　·　Enter 去報價`}
              main={
                /*
                  ⚠️ 清單容器自己接焦點（tabIndex + data-flow-focus），列本身 tabIndex={-1}：
                     這樣 Tab 只會停在清單上一次，用 ↑↓ 在列間走，⛔ 不會 Tab 十幾下才過得去。
                     滑鼠使用者點列＝選取，加入／移除走右欄那顆按鈕（§7.1 兩條路都在）。
                */
                <div
                  ref={stockListRef}
                  tabIndex={0}
                  data-flow-focus
                  role="listbox"
                  aria-label="通用零件"
                  onKeyDown={(e) => {
                    if (rows.length === 0) return;
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setStockSel((i) => Math.min(rows.length - 1, i + 1));
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setStockSel((i) => Math.max(0, i - 1));
                    } else if (e.key === ' ') {
                      // ⚠️ 一定要 preventDefault：空白鍵預設會把整頁往下捲一頁
                      e.preventDefault();
                      const c = rows[stockSel];
                      if (c) toggleLine(c);
                    } else if (e.key === 'Enter') {
                      e.preventDefault();
                      flowApi.current?.goTo(3);
                    }
                  }}
                  className="h-full space-y-2 overflow-auto rounded-md focus:outline focus:outline-2 focus:outline-primary"
                >
                  {rows.map((c, i) => {
                    const avail = totalAvailable(c);
                    const added = lines.some((l) => l.partId === c.id);
                    const sel = i === stockSel;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        data-stock={i}
                        tabIndex={-1}
                        role="option"
                        aria-selected={sel}
                        onClick={() => setStockSel(i)}
                        /*
                          ⭐ 兩個狀態各用一種訊號，⛔ 不要搶同一個：
                             「現在選到誰」＝邊框（主色）、「已經加進報價了」＝底色（綠）。
                             用同一種的話，選到一支已加入的零件就分不出是哪個意思。
                        */
                        className={[
                          'flex w-full items-center gap-3 rounded-lg border-2 px-3 py-2.5 text-left',
                          sel ? 'border-primary' : 'border-border',
                          added
                            ? 'bg-emerald-600/10'
                            : sel
                              ? 'bg-primary/[0.07]'
                              : 'hover:bg-foreground/[0.04]',
                        ].join(' ')}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2">
                            <span className="nx-mono font-medium">{c.code}</span>
                            {c.role === 1 ? (
                              <span className="nx-tag-primary">客戶問的這支</span>
                            ) : (
                              <span className="nx-tag">可代用</span>
                            )}
                            {added ? <span className="nx-pill-ok">✓ 已加入</span> : null}
                          </div>
                          <div className="nx-hint truncate">
                            {c.name}・{c.brandName ?? '—'}
                            {c.isOem ? '・正廠' : ''}
                          </div>
                        </div>
                        <div
                          className={`shrink-0 text-right ${avail > 0 ? 'nx-num-lg' : 'nx-num-lg text-red-500'}`}
                        >
                          {avail.toLocaleString()}
                        </div>
                      </button>
                    );
                  })}
                </div>
              }
              sideTitle="出貨狀態"
              sideNote="跟著左邊選中的那一支"
              side={(() => {
                const cur = rows[stockSel];
                if (!cur) return <div className="nx-hint">左邊選一支。</div>;
                const avail = totalAvailable(cur);
                const spots = stockSpots(cur, warehouses);
                const top = spots[0]?.qty ?? 0;
                const added = lines.some((l) => l.partId === cur.id);
                return (
                  <div className="flex h-full flex-col">
                    <div className="nx-t-sub break-all">{cur.code}</div>
                    <div className="nx-hint mt-0.5">
                      {cur.name}・{cur.brandName ?? '—'}・{cur.isOem ? '正廠' : '副廠'}
                      {cur.secCode ? `・廠牌料號 ${cur.secCode}` : ''}
                    </div>

                    {/* 全公司可出量：這一段最重要的一個數字，⭐ 所以只有它是大字 */}
                    <div className="mt-4 flex items-baseline gap-2 border-t border-border pt-4">
                      <span className="nx-hint">全公司可出</span>
                      <span className={avail > 0 ? 'nx-num-xl' : 'nx-num-xl text-red-500'}>
                        {avail.toLocaleString()}
                      </span>
                    </div>

                    {/*
                      各倉分佈：長條的長度＝跟最多的那個倉比。
                      ⭐ 業務要的是「去哪個倉調最快」，⛔ 純數字排排站看不出誰多誰少。
                    */}
                    <div className="mt-4 min-h-0 flex-1 overflow-auto">
                      {spots.length === 0 ? (
                        <div className="text-[15px] font-bold text-red-500">各倉都沒貨</div>
                      ) : (
                        <div className="space-y-2.5">
                          {spots.map((s) => (
                            <div key={s.name}>
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="nx-body truncate">{s.name}</span>
                                <span className="nx-num font-medium">{s.qty.toLocaleString()}</span>
                              </div>
                              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-foreground/10">
                                <div
                                  className="h-full rounded-full bg-primary"
                                  style={{
                                    width: `${top > 0 ? Math.max(4, (s.qty / top) * 100) : 0}%`,
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleLine(cur)}
                      className={added ? 'nx-btn mt-4 w-full' : 'nx-btn-primary mt-4 w-full'}
                    >
                      {added ? '移出報價（空白鍵）' : '加入報價（空白鍵）'}
                    </button>
                  </div>
                );
              })()}
            />
          )}
        </div>
      ),
    },
    {
      key: 'quote',
      label: '報價',
      blocked: validLines.length > 0 ? undefined : '還沒有可報的項目（要有數量與價格）',
      /*
        ⭐ 比價集中在這一段（執行長 2026-08-01 訂正）：
           三個參考價擺在報價欄旁邊——市場行情（保養廠對車主講的）、
           公司定價（我們的價）、上次賣他（議價依據）。
           ⛔ 上一段「檢查庫存」刻意不放價，那裡只決定「要出哪一支」。

        ⭐ 2026-08-02 改成兩欄（執行長拍板沿用舊浮層工作站的版面）：
           左＝報價清單（有哪幾支、各多少錢）、右＝報價屬性（選中那一支的參考價與輸入欄）。
        ⚠️ 原本是一張九欄寬表格、min-width 980，在 1366 基準下一定要橫向捲——
           規格 §1 明寫水平像素比垂直像素值錢，⛔ 這種表格本來就不該出現在主流程裡。
      */
      content:
        lines.length === 0 ? (
          <div className="nx-hint">上一段用空白鍵把要報的零件加進來。</div>
        ) : (
          <FlowPanes
            activePane={quotePane === 'items' ? 'main' : 'side'}
            mainTitle="報價清單"
            mainNote={`共 ${lines.length} 筆　·　↑↓ 選　·　Enter 進右邊改　·　Alt+D 移除`}
            main={
              <div className="flex h-full flex-col">
                <div
                  ref={lineListRef}
                  tabIndex={0}
                  data-flow-focus
                  role="listbox"
                  aria-label="報價清單"
                  onFocus={() => setQuotePane('items')}
                  onKeyDown={(e) => {
                    if (lines.length === 0) return;
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setLineSel((i) => Math.min(lines.length - 1, i + 1));
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setLineSel((i) => Math.max(0, i - 1));
                    } else if (e.key === 'Enter') {
                      /*
                        ⭐ Enter＝進右欄屬性面板，⛔ 不是跳下一段（執行長 2026-08-02 指正）。
                           舊浮層工作站這一段就是這樣做的，程式碼裡還留著註解
                           「本階段 Enter 不再跳發送訊息」——我先前接成跳段是接錯了。
                           要去發訊息走 Alt+5，⛔ 不佔用 Enter。
                      */
                      e.preventDefault();
                      enterPropPane();
                    } else if (e.altKey && (e.key === 'd' || e.key === 'D')) {
                      /*
                        移除沿用舊站的 Alt+D ＋ 確認，⛔ 不用 Del：
                        Del 沒有確認、手滑一下就掉一整列；而且它在輸入框裡本來就是刪字，
                        使用者對它的預期不是「刪掉整筆報價」。
                      */
                      e.preventDefault();
                      const l = lines[lineSel];
                      if (l && window.confirm(`把 ${l.code} ${l.name} 從報價清單移除？`)) {
                        removeLine(l.partId);
                      }
                    }
                  }}
                  className="min-h-0 flex-1 space-y-2 overflow-auto rounded-md focus:outline focus:outline-2 focus:outline-primary"
                >
                  {lines.map((l, i) => {
                    const sel = i === lineSel;
                    const sub = num(l.qty) * num(l.unitPrice);
                    return (
                      <button
                        key={l.partId}
                        type="button"
                        data-line={i}
                        tabIndex={-1}
                        role="option"
                        aria-selected={sel}
                        onClick={() => setLineSel(i)}
                        className={[
                          'flex w-full items-center gap-3 rounded-lg border-2 px-3 py-2.5 text-left',
                          sel ? 'border-primary bg-primary/[0.07]' : 'border-border hover:bg-foreground/[0.04]',
                        ].join(' ')}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2">
                            <span className="nx-mono font-medium">{l.code}</span>
                            {l.available <= 0 ? (
                              <span className="nx-pill-danger">目前沒貨</span>
                            ) : null}
                          </div>
                          <div className="nx-hint truncate">{l.name}</div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="nx-num-md">{sub.toLocaleString()}</div>
                          <div className="nx-hint tabular-nums">
                            {num(l.qty)} × {money(l.unitPrice)}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/*
                  ⭐ 業績值（執行長 2026-08-02：「報價後應該可以看到業績值」）。
                  ⚠️ 目前規則是暫定的（見檔頭 calcPerformance 的註解），KPI 定案後只改那一支函式。
                     標籤上明寫「暫以報價金額計」，⛔ 不要讓使用者以為這已經是正式的業績數字。
                */}
                <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t border-border pt-3">
                  <div className="nx-body font-medium">
                    本次業績
                    <span className="nx-hint ml-1">暫以報價金額計</span>
                    <span className="nx-num-lg ml-2">{perfTotal.toLocaleString()}</span>
                  </div>
                  <div className="nx-body font-medium">
                    合計 <span className="nx-num-xl">{total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            }
            sideTitle="報價屬性"
            sideNote={quotePane === 'props' ? 'Esc 回清單' : lines[lineSel]?.code}
            side={(() => {
              const l = lines[lineSel];
              if (!l) return <div className="nx-hint">左邊選一筆。</div>;
              const p = num(l.unitPrice);
              const base = num(l.listPrice);
              const diff = p > 0 && base > 0 && p !== base ? p - base : null;
              return (
                <div
                  ref={propPaneRef}
                  onFocus={() => setQuotePane('props')}
                  onKeyDown={(e) => {
                    // ⭐ Esc 退回左欄清單（沿用舊站）。⛔ 不 stopPropagation 就會被上層當成取消
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      e.stopPropagation();
                      backToLinePane();
                    }
                  }}
                  className="flex h-full flex-col overflow-auto"
                >
                  {/*
                    三個參考價並排——這是議價時眼睛要一次掃過的三個數字。
                    ⛔ 不要拆成上下三列：拆開之後就得逐個找，失去比價的意義。
                  */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <div className="nx-hint">市場行情價</div>
                      <div className="nx-hint">保養廠對車主</div>
                      <div className="nx-num-md mt-1">{money(l.marketPrice)}</div>
                    </div>
                    <div>
                      <div className="nx-hint">公司定價</div>
                      <div className="nx-hint">我們賣他</div>
                      <div className="nx-num-md mt-1">{money(l.listPrice)}</div>
                    </div>
                    {/*
                      ⭐ 這一格可以打開（執行長 2026-08-02）：原本只印一個「上次賣他」的數字，
                         業務要議價時真正想看的是「這支我報過幾次、成交在什麼價」。
                      ⚠️ 需要客戶才查得到（API 以 客戶＋料號 為鍵），散客沒得查。
                    */}
                    <div>
                      <div className="nx-hint">上次賣他</div>
                      <div className="nx-hint">{customer ? '點開看全部' : '要先選客戶'}</div>
                      <button
                        type="button"
                        disabled={!customer}
                        onClick={() => toggleHistory(l.partId)}
                        aria-expanded={histPartId === l.partId}
                        className="nx-num-md mt-1 rounded underline decoration-dotted underline-offset-4 hover:bg-foreground/[0.06] disabled:no-underline disabled:opacity-60"
                      >
                        {l.customerLastAmount ? money(l.customerLastAmount) : '—'}
                      </button>
                    </div>
                  </div>

                  {/* ───── 輸入區：這一側唯一要填的東西 ───── */}
                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
                    <label className="block">
                      <span className="nx-label">數量</span>
                      <input
                        value={l.qty}
                        onChange={(e) => patchLine(l.partId, { qty: e.target.value })}
                        inputMode="decimal"
                        aria-label={`${l.code} 數量`}
                        className="nx-field text-right tabular-nums"
                      />
                    </label>
                    <label className="block">
                      <span className="nx-label">報價</span>
                      <input
                        value={l.unitPrice}
                        onChange={(e) => patchLine(l.partId, { unitPrice: e.target.value })}
                        inputMode="decimal"
                        aria-label={`${l.code} 報價`}
                        className="nx-field text-right tabular-nums"
                      />
                      {/*
                        ⭐ 打了價就看得到「這個價讓了多少」。
                           基準是公司定價（B 價）＝我們原本要賣他的價。
                        ⛔ 不拿市場行情價當基準——那是保養廠對車主的價，不是我們的。
                      */}
                      {diff !== null ? (
                        <div
                          className={`nx-hint mt-1 text-right tabular-nums ${
                            diff < 0 ? 'text-red-600' : 'text-emerald-700'
                          }`}
                        >
                          {diff < 0 ? '▼' : '▲'}
                          {Math.abs(diff).toLocaleString()}（{diff > 0 ? '+' : ''}
                          {Math.round((diff / base) * 100)}%）
                        </div>
                      ) : null}
                    </label>
                    <label className="col-span-2 block">
                      <span className="nx-label">備註</span>
                      <input
                        value={l.remark}
                        onChange={(e) => patchLine(l.partId, { remark: e.target.value })}
                        placeholder="選填（會照設定決定要不要寫進訊息）"
                        aria-label={`${l.code} 備註`}
                        className="nx-field"
                      />
                    </label>
                  </div>

                  <div className="mt-4 flex items-baseline gap-2 border-t border-border pt-4">
                    <span className="nx-hint">小計</span>
                    <span className="nx-num-xl">
                      {(num(l.qty) * num(l.unitPrice)).toLocaleString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeLine(l.partId)}
                      aria-label={`移除 ${l.code}`}
                      className="nx-btn ml-auto hover:border-red-500"
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      移除這筆
                    </button>
                  </div>

                  {/* ───── 展開：這支料對這個客戶的過去報價與成交 ───── */}
                  {histPartId === l.partId ? (
                    <div className="mt-4 border-t border-border pt-4">
                      {histLoading ? (
                        <div className="nx-hint">讀取中…</div>
                      ) : !hist || hist.length === 0 ? (
                        <div className="nx-hint">這支料沒有可查的報價或成交紀錄。</div>
                      ) : (
                        <div>
                          <div className="nx-hint mb-2">點一列可以把那個價帶進報價欄</div>
                          <div className="space-y-1">
                            {hist.map((h, idx) => (
                              <button
                                key={`${h.date}-${h.kind}-${idx}`}
                                type="button"
                                onClick={() =>
                                  patchLine(l.partId, { unitPrice: String(num(h.amount)) })
                                }
                                title="把這個價帶進報價欄"
                                className="flex w-full items-baseline gap-2 rounded-md border border-border bg-card px-2.5 py-2 text-left hover:border-primary"
                              >
                                <span className="nx-mono shrink-0">{h.date.slice(0, 10)}</span>
                                {/* 成交與報價是兩件事：成交是真的賣掉了、報價只是報過 */}
                                <span
                                  className={h.kind === 'SALE' ? 'nx-pill-ok' : 'nx-tag font-normal'}
                                >
                                  {h.kind === 'SALE' ? '成交' : '報價'}
                                </span>
                                <span className="nx-hint shrink-0">
                                  {h.scope === 'CUSTOMER' ? '這家' : '同級距'}
                                </span>
                                <span className="nx-num-md ml-auto shrink-0">
                                  {money(h.amount)}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })()}
          />
        ),
    },
    {
      key: 'message',
      label: '發送訊息',
      /*
        ⭐ 2026-08-02 補回「訊息內容設定」（執行長拍板沿用舊浮層工作站的版面時發現的漏）：
           舊站這一段是「左＝給客戶的訊息、右＝訊息內容設定（會記住）」，
           新頁面先前只做了左半邊——訊息一直用寫死的預設選項產生，
           ⛔ 畫面上完全沒有地方可以改。這正是「一格一格重想」會漏掉的東西。
      */
      content: (
        <FlowPanes
          mainTitle="給客戶的訊息"
          mainNote="複製後貼到 LINE"
          main={
            <div className="flex h-full flex-col">
              <textarea
                readOnly
                value={msgText || '（還沒有可發送的報價——回「報價」那一段填數量與價格）'}
                aria-label="給客戶的報價訊息"
                className="min-h-0 w-full flex-1 rounded-lg border border-border bg-muted p-3 text-[15px] leading-relaxed text-foreground"
              />
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={!msgText}
                  onClick={() => {
                    void navigator.clipboard.writeText(msgText).then(() => setCopied(true));
                  }}
                  className="nx-btn font-medium"
                >
                  複製訊息
                </button>
                {copied ? (
                  <span className="text-[15px] font-bold text-foreground">已複製</span>
                ) : null}
                <span className="nx-hint">
                  ⚠️ 散客可以只複製訊息不存檔；要存報價紀錄才需要客戶。
                </span>
              </div>

              {savedMsg ? <div className="nx-alert-ok mt-3">{savedMsg}</div> : null}
              {errMsg ? <div className="nx-alert-danger mt-3">{errMsg}</div> : null}
            </div>
          }
          sideTitle="訊息內容設定"
          sideNote="會記住"
          side={
            /*
              ⚠️ 這一側是「切換」不是「填寫」，所以⛔ 不做成表單欄位——
                 每一項就是一顆可以按的開關，鍵盤走 Tab、按空白或 Enter 切換（原生 checkbox 行為）。
              ⭐ 改一項訊息就立刻重生，使用者看得到左邊在變——⛔ 不要做成「按套用才生效」。
            */
            <div className="h-full overflow-auto">
              <div className="space-y-2">
                {MSG_OPT_DEFS.map((d) => (
                  <label
                    key={d.key}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 px-3 py-2.5 ${
                      msgOpts[d.key]
                        ? 'border-primary bg-primary/[0.07]'
                        : 'border-border hover:bg-foreground/[0.04]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={msgOpts[d.key]}
                      onChange={(e) => setMsgOpt(d.key, e.target.checked)}
                      className="mt-1 h-4 w-4 shrink-0 accent-[var(--primary)]"
                    />
                    <span className="nx-body">{d.label}</span>
                  </label>
                ))}
              </div>
              <p className="nx-hint mt-3">
                這些選項存在這台電腦上，下次進來還是同一套。⛔ 不影響別人。
              </p>
            </div>
          }
        />
      ),
    },
  ];

  return (
    <FlowTemplate
      // 九宮格是「報價作業 ▸ 建立報價」，落地頁就該叫建立報價（執行長 2026-08-01）
      title="建立報價"
      sections={sections}
      apiRef={flowApi}
      onCancel={resetAll}
      onSubmit={() => void save()}
      submitLabel={saving ? '存檔中…' : `存成報價紀錄（${validLines.length}）`}
    />
  );
}
