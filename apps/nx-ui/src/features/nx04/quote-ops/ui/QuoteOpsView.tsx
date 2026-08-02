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
import { getQuoteCandidates } from '@data/endpoints/nx04/quote/api/quote';
import { createQuoteRecord } from '@data/endpoints/nx04/record/api/record';
import { quickSearchParts } from '@data/endpoints/nx01/part-search/api/part-search';
import type { PartSearchRow } from '@data/types/nx01/part-search';
import type { QuoteCandidate } from '@data/types/nx04/quote';
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
import { buildQuoteMessage, defaultMsgOpts } from '../../quote/ui/quote-message';

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
const DELIVERY_LABEL: Record<string, string> = { D: '配送', P: '自取', C: '寄貨' };

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

  const [term, setTerm] = useState('');
  const [hits, setHits] = useState<PartSearchRow[]>([]);
  const [hitIdx, setHitIdx] = useState(0);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [rows, setRows] = useState<QuoteCandidate[]>([]);
  const [rowsLoading, setRowsLoading] = useState(false);
  /** 各倉別（用來把 stockByWh 的 id 翻成看得懂的倉名）*/
  const [warehouses, setWarehouses] = useState<{ id: string; code: string; name: string }[]>([]);

  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const hitListRef = useRef<HTMLDivElement>(null);
  const customerRef = useRef<HTMLInputElement>(null);
  const reqRef = useRef(0);

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

  const runSearch = useCallback(async () => {
    const kw = term.trim();
    if (!kw) return;
    setSearching(true);
    setSearched(true);
    const seq = ++reqRef.current;
    try {
      // 料號、品名、車型一起搜——業務講得出哪個就用哪個
      const res = await quickSearchParts({ partNo: kw, pageSize: 50 });
      let list = res.rows;
      if (list.length === 0) {
        const alt = await quickSearchParts({ keyword: kw, modelQuery: kw, pageSize: 50 });
        list = alt.rows;
      }
      if (seq !== reqRef.current) return;
      setHits(list);
      setHitIdx(0);
    } catch {
      if (seq !== reqRef.current) return;
      setHits([]);
    } finally {
      if (seq === reqRef.current) setSearching(false);
    }
  }, [term]);

  const currentPartId = hits[hitIdx]?.id ?? null;
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
    setLines((prev) => prev.filter((l) => l.partId !== partId));
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
        defaultMsgOpts,
        customer?.defaultWarehouseName,
      ),
    [validLines, customer],
  );

  useEffect(() => {
    setCopied(false);
  }, [msgText]);

  const resetAll = useCallback(() => {
    setLines([]);
    setTerm('');
    setHits([]);
    setRows([]);
    setSearched(false);
    setErrMsg(null);
    searchRef.current?.focus();
  }, []);

  const save = useCallback(async () => {
    if (!customer || validLines.length === 0) return;
    // §2.1 允許的浮層只有「確認對話」這一種——單一問句、兩個按鈕
    if (!window.confirm(`把這 ${validLines.length} 筆報價存進 ${customer.name} 的報價紀錄？`)) return;
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
      content: (
        <div>
          <div className="flex flex-wrap items-end gap-3">
            {/*
              ⭐ 客戶欄常駐、⛔ 選完不換成靜態文字（執行長 2026-08-01）：
                 換掉之後 Alt+1 就找不到輸入欄，想改客戶只能用滑鼠。
                 留著它，Alt+1 回來就會自動聚焦並把文字整段反白，直接重打即可。
            */}
            <div className="min-w-[320px]">
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
            </div>
            <p className="nx-hint">
              打編號或名稱，↑↓ 選、Enter 帶入；注音首碼按 Alt+Z。查不到按 Enter 直接建客戶。
              <br />
              要換客戶：再按一次 Alt+1，欄位會反白讓你重打。
            </p>
          </div>

          {credit && !credit.passed ? (
            <div className="nx-alert-danger mt-3">⛔ 這個客戶目前擋單：{credit.blockedReason}</div>
          ) : null}
          {credit && credit.passed && credit.overdueTransferToCash ? (
            <div className="nx-alert-warn mt-3">
              ⚠️ 這個客戶已逾期 {credit.details.overdueDays} 天——這一單要收現金。
            </div>
          ) : null}

          {/*
            ⭐ 客戶基本資料常駐在下方（執行長 2026-08-01）：
               選到客戶就顯示他是誰、怎麼聯絡、什麼交易條件——業務講電話時要對得上人。
               查不到客戶時同一個位置變成可編輯的建檔表單，存完直接變成這通的對象。
               ⛔ 不跳去主檔頁：跳出去再回來，剛剛打的字跟情境都沒了。
          */}
          {/*
            ⚠️ 2026-08-02 改版：這一塊原本是「卡中卡」（外面已經是一張段落卡、裡面再包一個 border-2 的框）。
               雙層框線是視覺雜訊，改成一條分隔線——上面是要填的、下面是系統告訴你的。
          */}
          <div className="mt-5 border-t border-border pt-5">
            {draft ? (
              <div>
                <div className="nx-t-sub mb-4">
                  建立客戶　<span className="font-normal text-foreground/75">代碼由系統自動產生</span>
                </div>
                {/* ⭐ 兩欄網格（規格 §6 欄位密度 6–8）：⛔ 不用四欄——1366 下一欄放不下一個地址 */}
                <div className="nx-form-grid">
                  <label className="block">
                    <span className="nx-label">客戶類型</span>
                    <select
                      value={draft.partnerType}
                      onChange={(e) => setDraft({ ...draft, partnerType: e.target.value as PartnerType })}
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
                      onChange={(e) => setDraft({ ...draft, defaultDeliveryType: e.target.value })}
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
                      onChange={(e) => setDraft({ ...draft, defaultWarehouseId: e.target.value })}
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

                  {/* 長欄位跨滿兩欄，⛔ 不要讓地址擠在半欄裡 */}
                  <label className="block md:col-span-2">
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
                  <span className="nx-hint">
                    ⚠️ 交易條件（付款方式、額度、月結）系統先給預設值——
                    客戶要談月結請轉財務，⛔ 不在這裡決定。
                  </span>
                </div>
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
                className="rounded-md focus:outline focus:outline-2 focus:outline-primary"
              >
                {/*
                  卡片就是一張表：抬頭寫這是誰，底下一個網格把該知道的欄位排齊。
                  ⭐ 授信狀態直接放進表裡——那是「這個客戶」的一部分，
                     ⛔ 不該只是飄在上面的一條警示條。

                  ⚠️ 2026-08-02 執行長指正，⛔ 不要再改回去：
                     原本欄位被裝進「貨怎麼出」「錢」兩個有標題的小框——那是在做分類，
                     但業務看客戶資料時不需要分類，他要的是一張看得舒服的表。
                     分類標題與內框全部拿掉，欄位改成單一網格、同一種樣式、標籤與值各自對齊。
                */}
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border pb-4">
                  <span className="nx-t-page">{profile.name}</span>
                  <span className="nx-mono">{profile.code}</span>
                  {profile.contactName || profile.phone || profile.mobile ? (
                    <span className="nx-body">
                      {profile.contactName ? `${profile.contactName}　` : ''}
                      {profile.phone ?? profile.mobile ?? ''}
                    </span>
                  ) : null}
                  <span className="nx-hint ml-auto rounded border border-border px-2 py-0.5">
                    確認無誤按 Enter 進下一段
                  </span>
                </div>

                {/*
                  ⭐ 一張表、四欄。順序照業務講電話時會問到的先後：
                     先確認是誰家（統編／等級）→ 錢怎麼算（付款條件／欠款）→ 貨怎麼走（取貨／倉／地址）。
                  ⚠️ 地址跨滿兩欄——它是唯一會長到換行的欄位，擠在四分之一欄會很醜。
                */}
                <div className="grid gap-x-8 gap-y-5 pt-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="統一編號" value={profile.taxId} />
                  <Field label="客戶等級" value={profile.customerGradeName ?? profile.customerGradeCode} />
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
                        ? (DELIVERY_LABEL[profile.defaultDeliveryType] ?? profile.defaultDeliveryType)
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
        </div>
      ),
    },
    {
      key: 'search',
      label: '搜尋',
      // ⛔ 這一段不掛 blocked：查料是過程不是條件，
      //    存檔只需要「有客戶」＋「有可報的項目」。掛了會變成查完料還得留著搜尋結果才准存檔。
      content: (
        <div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground" />
            <input
              ref={searchRef}
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void runSearch();
                  setTimeout(() => hitListRef.current?.focus(), 0);
                }
              }}
              placeholder="料號／品名／車型"
              aria-label="查料"
              className="nx-field-lg pl-12"
            />
          </div>

          <div
            ref={hitListRef}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHitIdx((i) => Math.min(i + 1, hits.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHitIdx((i) => Math.max(i - 1, 0));
              } else if (e.key === 'Escape') {
                e.preventDefault();
                searchRef.current?.focus();
              }
            }}
            className="mt-4 rounded-lg border border-border p-2 focus:outline focus:outline-2 focus:outline-primary"
          >
            <div className="px-1 pb-2 text-[14px] font-bold text-foreground">
              找到 {hits.length} 筆{searching ? '（查詢中…）' : ''}
            </div>
            {hits.length === 0 ? (
              <div className="nx-hint px-1 py-3">
                {searched && !searching ? '沒有符合的零件。' : '打料號、品名或車型，按 Enter。'}
              </div>
            ) : (
              /* ⚠️ 命中清單保留段內捲動（max-h）：一次可能上百筆，全部展開會把這一段撐到十個畫面高 */
              <div className="grid max-h-[46vh] gap-1 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
                {hits.map((h, i) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => setHitIdx(i)}
                    className={`rounded-md px-2 py-2 text-left ${
                      i === hitIdx ? 'bg-primary/15 ring-2 ring-primary' : 'hover:bg-foreground/[0.05]'
                    }`}
                  >
                    <div className="text-[15px] font-medium text-foreground">{h.code}</div>
                    <div className="nx-hint">{h.name}</div>
                    <div className="nx-hint">
                      {h.brandName ?? '—'}・可出 {num(h.availableTotal).toLocaleString()}
                    </div>
                  </button>
                ))}
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
        <div>
          {/*
            ⭐ 這一段回答兩個問題（執行長 2026-08-01 訂正）：
                「這支料的通用件有哪些？」「在哪些倉位？」
            ⛔ 這裡不出現任何價格——比價是下一段「報價」的事。
               混在一起會讓業務在還沒確定要出哪一支料的時候就先看價、先想折扣。
          */}
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr className="border-b-2 border-border text-left">
                  <th className="nx-th">料號 / 品名 / 廠牌</th>
                  <th className="nx-th">通用件</th>
                  <th className="nx-th">在哪些倉位</th>
                  <th className="nx-th text-right">
                    可出量
                    <div className="nx-th-note">全公司</div>
                  </th>
                  <th className="nx-th" />
                </tr>
              </thead>
              <tbody>
                {rowsLoading ? (
                  <tr>
                    <td colSpan={5} className="nx-hint px-3 py-6">
                      查詢中…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="nx-hint px-3 py-6">
                      上一段選一支料，這裡列出它和它的通用件、各在哪個倉。
                    </td>
                  </tr>
                ) : (
                  rows.map((c) => {
                    const avail = totalAvailable(c);
                    const spots = stockSpots(c, warehouses);
                    const added = lines.some((l) => l.partId === c.id);
                    return (
                      <tr key={c.id} className="border-b border-border last:border-b-0">
                        <td className="nx-td">
                          <div className="font-medium">{c.code}</div>
                          <div className="nx-hint">
                            {c.name}・{c.brandName ?? '—'}
                            {c.isOem ? '・正廠' : ''}
                          </div>
                        </td>
                        <td className="nx-td">
                          {c.role === 1 ? (
                            <span className="nx-tag-primary">客戶問的這支</span>
                          ) : (
                            <span className="nx-tag">可代用</span>
                          )}
                        </td>
                        <td className="nx-td">
                          {spots.length === 0 ? (
                            <span className="text-[15px] font-bold text-red-500">都沒貨</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {spots.map((s) => (
                                <span key={s.name} className="nx-tag font-normal">
                                  {s.name} <b className="tabular-nums">{s.qty.toLocaleString()}</b>
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        {/* ⚠️ 沒貨轉紅：utilities 層排在 components 層之後，text-red-500 會蓋過 .nx-num-lg 的顏色，⛔ 不需要 important */}
                        <td
                          className={`nx-num-lg px-3 py-2.5 text-right ${avail > 0 ? '' : 'text-red-500'}`}
                        >
                          {avail.toLocaleString()}
                        </td>
                        <td className="nx-td text-right">
                          <button
                            type="button"
                            disabled={added}
                            onClick={() => addLine(c)}
                            className="nx-btn-cell"
                          >
                            {added ? '已加入' : '拿這支報'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ),
    },
    {
      key: 'quote',
      label: '報價',
      blocked: validLines.length > 0 ? undefined : '還沒有可報的項目（要有數量與價格）',
      content: (
        <div>
          {/*
            ⭐ 比價集中在這一段（執行長 2026-08-01 訂正）：
               三個參考價擺在報價欄旁邊——市場行情（保養廠對車主講的）、
               公司定價（我們的價）、上次賣他（議價依據）。
               ⛔ 上一段「檢查庫存」刻意不放價，那裡只決定「要出哪一支」。
          */}
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[980px] border-collapse">
              <thead>
                <tr className="border-b-2 border-border text-left">
                  <th className="nx-th">料號 / 品名</th>
                  <th className="nx-th text-right">
                    市場行情價
                    <div className="nx-th-note">保養廠對車主</div>
                  </th>
                  <th className="nx-th text-right">
                    公司定價
                    <div className="nx-th-note">我們賣他</div>
                  </th>
                  <th className="nx-th text-right">上次賣他</th>
                  <th className="nx-th text-right">數量</th>
                  <th className="nx-th text-right">報價</th>
                  <th className="nx-th text-right">小計</th>
                  <th className="nx-th">備註</th>
                  <th className="nx-th" />
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="nx-hint px-3 py-6">
                      上一段按「拿這支報」把料帶下來。
                    </td>
                  </tr>
                ) : (
                  lines.map((l) => (
                    <tr key={l.partId} className="border-b border-border last:border-b-0">
                      <td className="nx-td">
                        <div className="font-medium">{l.code}</div>
                        <div className="nx-hint">
                          {l.name}
                          {l.available <= 0 ? (
                            <span className="ml-2 font-bold text-red-500">目前沒貨</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="nx-num-md px-3 py-2.5 text-right">{money(l.marketPrice)}</td>
                      <td className="nx-num-md px-3 py-2.5 text-right">{money(l.listPrice)}</td>
                      <td className="nx-num px-3 py-2.5 text-right">
                        {l.customerLastAmount ? (
                          <>
                            {money(l.customerLastAmount)}
                            <div className="nx-hint">
                              {l.customerLastDate ? l.customerLastDate.slice(0, 10) : ''}
                            </div>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <input
                          value={l.qty}
                          onChange={(e) => patchLine(l.partId, { qty: e.target.value })}
                          inputMode="decimal"
                          aria-label={`${l.code} 數量`}
                          className="nx-field-cell w-24 text-right tabular-nums"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <input
                          value={l.unitPrice}
                          onChange={(e) => patchLine(l.partId, { unitPrice: e.target.value })}
                          inputMode="decimal"
                          aria-label={`${l.code} 報價`}
                          className="nx-field-cell w-28 text-right tabular-nums"
                        />
                      </td>
                      <td className="nx-num-md px-3 py-2.5 text-right">
                        {(num(l.qty) * num(l.unitPrice)).toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5">
                        <input
                          value={l.remark}
                          onChange={(e) => patchLine(l.partId, { remark: e.target.value })}
                          placeholder="選填"
                          aria-label={`${l.code} 備註`}
                          className="nx-field-cell min-w-[120px]"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => removeLine(l.partId)}
                          aria-label={`移除 ${l.code}`}
                          title="移除"
                          className="nx-btn-cell px-2 hover:border-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="nx-body mt-3 text-right font-medium">
            合計 <span className="nx-num-xl">{total.toLocaleString()}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'message',
      label: '發送訊息',
      content: (
        <div>
          <textarea
            readOnly
            value={msgText || '（還沒有可發送的報價——回「報價」那一段填數量與價格）'}
            aria-label="給客戶的報價訊息"
            rows={10}
            className="w-full rounded-lg border border-border bg-muted p-3 text-[15px] leading-relaxed text-foreground"
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
            {copied ? <span className="text-[15px] font-bold text-foreground">已複製</span> : null}
            <span className="nx-hint">
              複製後貼到 LINE 給客戶。⚠️ 散客可以只複製訊息不存檔；要存報價紀錄才需要客戶。
            </span>
          </div>

          {savedMsg ? <div className="nx-alert-ok mt-3">{savedMsg}</div> : null}
          {errMsg ? <div className="nx-alert-danger mt-3">{errMsg}</div> : null}
        </div>
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
