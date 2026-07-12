// apps/nx-ui/src/features/nx04/quote/ui/QuoteWorkspace.tsx
// F2 即時報價工作台（執行長 2026-07-12 深夜拍板・A/B/C 三區五階段、取代三層疊窗）：
//   A 階段軌（純圖示、Alt+1~5 切換）：對象 → 搜尋 → 檢查庫存 → 報價 → 發送訊息
//   B 主容器／C 副容器 各階段內容：
//     1 對象：B 輸入 Enter（Alt+N 散客跳過）→ C 候選清單 ↑↓ Enter 選定 → 回 B 下半顯示＋C 基本資料八欄
//     2 搜尋：B 三查法輸入（[ ] 循環切、即打即出聯想、英數當注音碼）｜C 群組樹卡片（↑↓ Enter 選定）
//     3 檢查庫存：B 上基本資料+圖片（Alt+P 放大）、下通用零件（↑↓ 選、Space 加入報價）
//       ｜C 出貨狀態大卡+三指標（總庫存/可出/不可出）+各倉卡片（Alt+D 加調貨已退場→④出貨倉庫）
//     4 報價：B 卡片式項目（↑↓ 選、Alt+D 移除、Alt+S 結案、Alt+2 回搜尋累加）
//       ｜C 五列屬性面板（Enter 進、↑↓：建議售價/歷史/出貨倉庫（倉位或調貨）/數量/報價、Esc 回 B）
//     5 發送訊息：B 滿版固定訊息框（Alt+E 編輯、Shift+Enter 換行、Enter 回副容器）
//       ｜C 設定卡（↑↓ Space、Enter 存檔→確認→關窗）＋複製/存檔鈕；訊息同品名分組（品名組標題）
//   防呆沿用：無庫存且近月無同行詢價→報價前提示；公司有貨→加調貨前提示。
'use client';

import {
  Check,
  FilePlus,
  HelpCircle,
  Image as ImageIcon,
  MessageSquareText,
  PackageSearch,
  UserRound,
  Warehouse as WarehouseIcon,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { listPartner } from '@data/endpoints/shared/master/partner/api/partner';
import {
  buildPartSearchPhotoUrl,
  getPartCompatGroup,
  getPartDetail,
  getPartSearchMasterOptions,
  getPartStockSettings,
  getPartStockSummary,
  listPartSearchPhotos,
  quickSearchParts,
  type PartPhotoMeta,
} from '@data/endpoints/nx01/part-search/api/part-search';
import { getQuoteCandidates, getQuotePriceHistory } from '@data/endpoints/nx04/quote/api/quote';
import {
  createQuoteRecord,
  listInquiryRecords,
} from '@data/endpoints/nx04/record/api/record';
import type {
  PartDetailDto,
  PartSearchResult,
  PartSearchRow,
  PartStockSettingRow,
  PartStockSummaryDto,
} from '@data/types/nx01/part-search';
import type { QuotePriceHistoryRow } from '@data/types/nx04/quote';
import type { PartnerDto } from '@data/types/shared/master/partner';
import { Combobox } from '@design/components/quick-search/Combobox';
import { PhotoZoomOverlay } from '@design/components/quick-search/PartMainWindow';
import { FocusLockedDialog } from '@design/primitives/focus-locked-dialog';

import { CustomerPicker, keyToBopomofo, type PickedCustomer } from './CustomerPicker';
import { addTransferItems, listTransferItems, TRANSFER_LIST_EVENT } from './transfer-inquiry-store';

type Stage = 1 | 2 | 3 | 4 | 5;
// S2-2 群組樹卡片扁平列（primary=群組主件 / alt=替代品縮排 / single=散件）
type FlatRow = { kind: 'primary' | 'alt' | 'single'; member: PartSearchRow };
type MasterOpt = { id: string; code: string; name: string };
const SEARCH_METHODS = ['partNo', 'keyword', 'advanced'] as const;
type CompatRow = {
  partId: string;
  code: string;
  name: string;
  brand: string | null;
  // S5-6 訊息分組識別用：正廠 或 廠牌名
  brandName: string | null;
  isOem: boolean;
  secCode: string | null;
  avail: number;
  suggested: string | null;
  prefill: string;
};
type QuoteLine = CompatRow & {
  qty: string;
  price: string;
  // S4-2 屬性 3 出貨倉庫（跟著項目走）：null=客戶預設倉；transfer=true 走調貨詢價（F5 清單）
  warehouseId?: string | null;
  warehouseLabel?: string | null;
  transfer?: boolean;
};
// S4-2 C 欄五列屬性（↑↓ 移動、Enter 展開/編輯）
const PROP_ROWS = ['建議售價', '報價/成交歷史', '出貨倉庫', '數量', '報價'] as const;
// S5-6（執行長 07/12 定案）：品名固定當組標題（不再是每行開關）、新增「廠牌」識別選項
// 回饋 5-1（07/12 二輪）：加「出貨倉庫」選項
type MsgOpts = { brand: boolean; baseNo: boolean; secCode: boolean; qtyAlways: boolean; warehouse: boolean };

const STAGES: { n: Stage; label: string; icon: React.ReactNode }[] = [
  { n: 1, label: '對象', icon: <UserRound className="size-[18px]" /> },
  { n: 2, label: '搜尋', icon: <PackageSearch className="size-[18px]" /> },
  { n: 3, label: '檢查庫存', icon: <WarehouseIcon className="size-[18px]" /> },
  { n: 4, label: '報價', icon: <FilePlus className="size-[18px]" /> },
  { n: 5, label: '發送訊息', icon: <MessageSquareText className="size-[18px]" /> },
];

function formatNt(n: number): string {
  if (n < 100 && n !== Math.floor(n)) return n.toFixed(2);
  return n.toLocaleString('zh-TW', { maximumFractionDigits: 0 });
}
// 階段① C 欄八欄用標籤（值域對齊系統真相：NX03 包貨 IsIn D/P/C/T、寄貨代碼是 C 不是 SO UI 漂移的 S）
const PAY_TERM_LABEL: Record<string, string> = { PREPAY: '先付款', NET30: '月結30天', NET60: '月結60天', NET90: '月結90天' };
const DELIVERY_LABEL: Record<string, string> = { D: '配送', P: '自取', C: '寄送' };
const MSG_OPTS_KEY = 'nx-f2-msg-opts';
const defaultOpts: MsgOpts = { brand: true, baseNo: true, secCode: false, qtyAlways: false, warehouse: false };
// C 欄設定卡（S5-3 卡片設計、↑↓ Space 操作）
const MSG_OPT_DEFS: { key: keyof MsgOpts; label: string }[] = [
  { key: 'brand', label: '廠牌識別（正廠／廠牌名）' },
  { key: 'baseNo', label: '顯示基準料號' },
  { key: 'secCode', label: '顯示副廠料號' },
  { key: 'qtyAlways', label: '數量恆顯示（否則 >1 才顯示）' },
  { key: 'warehouse', label: '顯示出貨倉庫' },
];

export function QuoteWorkspace({ onClose }: { onClose: () => void }) {
  const [stage, setStage] = useState<Stage>(1);
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  // 階段 2 搜尋
  const [method, setMethod] = useState<'partNo' | 'keyword' | 'advanced'>('partNo');
  const [q1, setQ1] = useState(''); // 料號 / 品名 / 廠牌
  const [q2, setQ2] = useState(''); // 車型 / 族群
  const [searchRes, setSearchRes] = useState<PartSearchResult | null>(null);
  const [resSel, setResSel] = useState(0);
  const [searching, setSearching] = useState(false);
  // S2-3 進階查法聯想主檔（廠牌/族群、載一次）
  const [brands, setBrands] = useState<MasterOpt[]>([]);
  const [partGroups, setPartGroups] = useState<MasterOpt[]>([]);
  // 階段 3 檢查庫存
  const [currentPartId, setCurrentPartId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PartDetailDto | null>(null);
  const [compat, setCompat] = useState<CompatRow[]>([]);
  const [compatSel, setCompatSel] = useState(0);
  const [stock, setStock] = useState<PartStockSummaryDto | null>(null);
  // S3-3 大狀態卡「低於安全」判定用（各倉安全量加總、F1 同法）
  const [stockSettings, setStockSettings] = useState<PartStockSettingRow[]>([]);
  // S3-1/S3-2 產品圖片（跟 currentPartId、Alt+P 放大）
  const [photos, setPhotos] = useState<PartPhotoMeta[]>([]);
  const [photoZoom, setPhotoZoom] = useState(false);
  // 階段 4/5
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [lineSel, setLineSel] = useState(0);
  const [stockWarn, setStockWarn] = useState<string[]>([]);
  // S4-2 C 欄五列屬性面板
  const [propSel, setPropSel] = useState(0);
  const [propOpen, setPropOpen] = useState<null | 'abcd' | 'wh'>(null);
  const [whSel, setWhSel] = useState(0);
  const [editingProp, setEditingProp] = useState<null | 'qty' | 'price'>(null);
  const [abcd, setAbcd] = useState<PartDetailDto | null>(null); // 展開 ABCD 價 lazy 載
  const [history, setHistory] = useState<QuotePriceHistoryRow[] | null>(null); // 聚焦行即載（前價顯示+彈窗共用）
  // 回饋 4-2：歷史改彈出視窗（↑↓ 選、Enter 帶價入報價欄）
  const [histModalOpen, setHistModalOpen] = useState(false);
  const [histSel, setHistSel] = useState(0);
  // 回饋 4-1：主（items）／副（props）容器誰在操作——非操作側變暗+操作側徽章
  const [quotePane, setQuotePane] = useState<'items' | 'props'>('items');
  const [msgOpts, setMsgOpts] = useState<MsgOpts>(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(MSG_OPTS_KEY) : null;
      if (raw) return { ...defaultOpts, ...(JSON.parse(raw) as Partial<MsgOpts>) };
    } catch {
      /* 走預設 */
    }
    return defaultOpts;
  });
  const [confirmOpen, setConfirmOpen] = useState(false);
  // T1 引導精靈（Alt+H / 右上「?」、行內 kbd 提示全收進來——執行長 07/12）
  const [helpOpen, setHelpOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState<number | null>(null);
  const [transferCount, setTransferCount] = useState(0);
  // 階段 1 C 欄：客戶基本資料（八欄、執行長 07/12 S1-2 加交易條件/取貨方式/預設倉庫）
  const [partnerInfo, setPartnerInfo] = useState<PartnerDto | null>(null);
  // 階段 1 B→C→B 選人流（S1-1）：B 輸入 Enter → C 候選清單 ↑↓ Enter → 回 B 顯示
  const [custQ, setCustQ] = useState('');
  const [custCands, setCustCands] = useState<PartnerDto[]>([]);
  const [custCandSel, setCustCandSel] = useState(0);
  const [custPicked, setCustPicked] = useState(false);
  const [custSearching, setCustSearching] = useState(false);

  const custBoxRef = useRef<HTMLDivElement>(null);
  const custInputRef = useRef<HTMLInputElement>(null);
  const custListRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resListRef = useRef<HTMLDivElement>(null);
  const compatListRef = useRef<HTMLDivElement>(null);
  const linesListRef = useRef<HTMLDivElement>(null);
  const propPanelRef = useRef<HTMLDivElement>(null);
  const propEditRef = useRef<HTMLInputElement>(null);
  const histListRef = useRef<HTMLDivElement>(null);
  const msgRef = useRef<HTMLTextAreaElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const reqRef = useRef(0);

  // ── 全域鍵：Alt+1~5 切階段、Alt+H 引導精靈、Alt+N 散客跳過（階段 1）──
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      if (['1', '2', '3', '4', '5'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        setStage(Number(e.key) as Stage);
        return;
      }
      const k = e.key.toLowerCase();
      if (k === 'h') {
        e.preventDefault();
        e.stopPropagation();
        setHelpOpen((v) => !v);
      } else if (k === 'p') {
        // S3-2 圖片放大（F1 同鍵位；無圖時 overlay 不會渲染）
        e.preventDefault();
        e.stopPropagation();
        setPhotoZoom((v) => !v);
      } else if (k === 'n') {
        // 散客／新客戶先跳過（原本只有鈕沒接鍵——T1 補上）
        e.preventDefault();
        e.stopPropagation();
        setStage((s) => (s === 1 ? 2 : s));
      } else if (k === 'e') {
        // S5-4：Alt+E 進主容器編輯模式（階段⑤限定）
        e.preventDefault();
        e.stopPropagation();
        if (stageRef.current === 5) {
          setEditMode(true);
          setTimeout(() => msgRef.current?.focus(), 30);
        }
      }
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, []);

  // 調貨清單徽章
  useEffect(() => {
    const sync = () => setTransferCount(listTransferItems().length);
    sync();
    window.addEventListener(TRANSFER_LIST_EVENT, sync);
    return () => window.removeEventListener(TRANSFER_LIST_EVENT, sync);
  }, []);

  // 選定客戶 → 補完整基本資料（階段① 選人流已直接帶入；此為階段⑤ CustomerPicker 補客戶的 fallback）
  // infoFetchedFor：每個 customer.id 只補抓一次、避免查無此客時 setPartnerInfo 觸發重抓迴圈
  const infoFetchedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!customer) {
      setPartnerInfo(null);
      infoFetchedFor.current = null;
      return;
    }
    if (partnerInfo?.id === customer.id || infoFetchedFor.current === customer.id) return;
    infoFetchedFor.current = customer.id;
    let alive = true;
    void listPartner({ page: 1, pageSize: 5, q: customer.code, partnerType: 'C', isActive: true })
      .then((r) => {
        if (!alive) return;
        setPartnerInfo(r.items.find((p) => p.id === customer.id) ?? null);
      })
      .catch(() => alive && setPartnerInfo(null));
    return () => {
      alive = false;
    };
  }, [customer, partnerInfo]);

  // 執行長 07/12 回饋 1-1：客戶欄即打即出——打字 debounce 即查、候選即時進 C 欄（不搶焦點、Enter 才跳右欄）
  const custReqRef = useRef(0);
  useEffect(() => {
    if (custPicked) return;
    const t = custQ.trim();
    const myReq = ++custReqRef.current;
    if (!t) {
      setCustCands([]);
      return;
    }
    const h = setTimeout(() => {
      void listPartner({ page: 1, pageSize: 20, q: t, partnerType: 'C', isActive: true })
        .then((r) => {
          if (custReqRef.current !== myReq) return;
          setCustCands(r.items);
          setCustCandSel(0);
        })
        .catch(() => {
          /* 查不到不擋 */
        });
    }, 250);
    return () => clearTimeout(h);
  }, [custQ, custPicked]);

  // ── 階段①：客戶搜尋（Enter 關鍵字 / F4 注音首碼）→ 候選進 C 欄 ──
  const runCustSearch = useCallback(
    async (phonetic?: boolean) => {
      const t = custQ.trim();
      if (!t) return;
      const myReq = ++custReqRef.current; // 蓋掉 pending 的即打即出 debounce、避免晚到重設選中列
      setCustSearching(true);
      try {
        const r = await listPartner({
          page: 1,
          pageSize: 20,
          partnerType: 'C',
          isActive: true,
          ...(phonetic ? { phonetic: keyToBopomofo(t) } : { q: t }),
        });
        if (custReqRef.current !== myReq) return;
        setCustCands(r.items);
        setCustCandSel(0);
        setTimeout(() => custListRef.current?.focus(), 30);
      } catch {
        setCustCands([]);
      } finally {
        setCustSearching(false);
      }
    },
    [custQ],
  );

  const pickCustomer = useCallback((p: PartnerDto) => {
    setPartnerInfo(p);
    setCustomer({
      id: p.id,
      code: p.code,
      name: p.name,
      defaultWarehouseId: p.defaultWarehouseId,
      defaultWarehouseName: p.defaultWarehouseName,
    });
    setCustPicked(true);
    setCustQ(`${p.code}　${p.name}`);
    setCustCands([]);
    setTimeout(() => custInputRef.current?.focus(), 30);
  }, []);

  // 階段切換 → 聚焦該階段主要元素
  // ⚠️ 階段 1 必須在這裡補聚焦：FocusLockedDialog 開啟時的預設聚焦會落在
  //   DOM 第一個 focusable（右上關閉鈕）、蓋掉 CustomerPicker 的 autoFocus
  //   ——執行長 07/12「F2 後不能直接打字」的病灶
  useEffect(() => {
    const t = setTimeout(() => {
      if (stage === 1) custBoxRef.current?.querySelector('input')?.focus();
      else if (stage === 2) searchInputRef.current?.focus();
      else if (stage === 3) compatListRef.current?.focus();
      else if (stage === 4) linesListRef.current?.focus();
      // S5-4：階段⑤焦點預設在副容器（設定卡）
      else if (stage === 5) optsPanelRef.current?.focus();
    }, 60);
    return () => clearTimeout(t);
  }, [stage]);

  useEffect(() => {
    if (confirmOpen) confirmRef.current?.focus();
  }, [confirmOpen]);

  // ── 階段 2：查詢（S2-2：groupByCompat=true 回通用件群組樹）──
  const runSearch = useCallback(async () => {
    setSearching(true);
    try {
      const r = await quickSearchParts({
        ...(method === 'partNo' ? { partNo: q1.trim() || undefined } : {}),
        ...(method === 'keyword' ? { keyword: q1.trim() || undefined, modelQuery: q2.trim() || undefined } : {}),
        ...(method === 'advanced' ? { brandQuery: q1.trim() || undefined, partGroupQuery: q2.trim() || undefined } : {}),
        groupByCompat: true,
        pageSize: 50,
      });
      setSearchRes(r);
      setResSel(0);
      setTimeout(() => resListRef.current?.focus(), 30);
    } catch {
      setSearchRes(null);
    } finally {
      setSearching(false);
    }
  }, [method, q1, q2]);

  // 群組樹 → 扁平列（主件在前、替代品縮排掛底、散件視為主件）
  const flatRows = useMemo<FlatRow[]>(() => {
    if (!searchRes) return [];
    const acc: FlatRow[] = [];
    for (const g of searchRes.groups ?? []) {
      if (g.primary) acc.push({ kind: 'primary', member: g.primary });
      for (const a of g.alts) acc.push({ kind: 'alt', member: a });
    }
    for (const u of searchRes.ungrouped ?? []) acc.push({ kind: 'single', member: u });
    return acc;
  }, [searchRes]);

  // 選中列捲入可視
  useEffect(() => {
    resListRef.current?.querySelector(`[data-f2res="${resSel}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [resSel]);

  // S2-1：[ ] 左右循環切三查法（頁籤仍可點）；只在階段 2 生效
  useEffect(() => {
    if (stage !== 2) return;
    const h = (e: KeyboardEvent) => {
      if ((e.key !== '[' && e.key !== ']') || e.ctrlKey || e.altKey || e.metaKey || e.isComposing) return;
      e.preventDefault();
      e.stopPropagation();
      setMethod((m) => {
        const i = SEARCH_METHODS.indexOf(m);
        return SEARCH_METHODS[(i + (e.key === ']' ? 1 : SEARCH_METHODS.length - 1)) % SEARCH_METHODS.length];
      });
      setTimeout(() => searchInputRef.current?.focus(), 30);
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [stage]);

  // S2-3 聯想主檔（廠牌/族群）載一次
  useEffect(() => {
    void getPartSearchMasterOptions()
      .then((o) => {
        setBrands(o.brands);
        setPartGroups(o.partGroups);
      })
      .catch(() => {
        /* 撈不到不擋 */
      });
  }, []);

  // S2-3 即打即出聯想（料號 / 品名+注音碼 / 廠牌 / 族群）
  const fetchPartNoSuggestions = useCallback(async (q: string): Promise<PartSearchRow[]> => {
    const t = q.trim();
    if (!t) return [];
    const r = await quickSearchParts({ partNo: t, page: 1, pageSize: 8 });
    return r.rows.slice(0, 8);
  }, []);
  const fetchNameSuggestions = useCallback(async (q: string): Promise<string[]> => {
    const t = q.trim();
    if (!t) return [];
    // 中文直查品名；英數視為注音鍵盤碼（例 cvn→ㄏㄒㄙ→火星塞）再查一輪、兩路合併去重
    const [byName, byPhonetic] = await Promise.all([
      quickSearchParts({ keyword: t, page: 1, pageSize: 30 }).catch(() => null),
      /[a-z0-9;,./-]/i.test(t)
        ? quickSearchParts({ keyword: keyToBopomofo(t), page: 1, pageSize: 30 }).catch(() => null)
        : Promise.resolve(null),
    ]);
    const seen = new Set<string>();
    const out: string[] = [];
    for (const row of [...(byName?.rows ?? []), ...(byPhonetic?.rows ?? [])]) {
      const n = row.name.trim();
      if (!n || seen.has(n)) continue;
      seen.add(n);
      out.push(n);
      if (out.length >= 8) break;
    }
    return out;
  }, []);
  const fetchBrandSuggestions = useCallback(
    async (q: string): Promise<MasterOpt[]> => {
      const lower = q.trim().toLowerCase();
      if (!lower) return brands.slice(0, 8);
      return brands.filter((b) => b.code.toLowerCase().includes(lower) || b.name.toLowerCase().includes(lower)).slice(0, 8);
    },
    [brands],
  );
  const fetchPartGroupSuggestions = useCallback(
    async (q: string): Promise<MasterOpt[]> => {
      const lower = q.trim().toLowerCase();
      if (!lower) return partGroups.slice(0, 8);
      return partGroups.filter((g) => g.code.toLowerCase().includes(lower) || g.name.toLowerCase().includes(lower)).slice(0, 8);
    },
    [partGroups],
  );

  // ── 階段 3：載明細＋通用件（候選帶建議售價；散客退回通用件群組）──
  useEffect(() => {
    if (!currentPartId) return;
    const myReq = ++reqRef.current;
    setDetail(null);
    setCompat([]);
    setCompatSel(0);
    setPhotos([]);
    void (async () => {
      try {
        const [d, rows, ph] = await Promise.all([
          getPartDetail(currentPartId),
          customer
            ? getQuoteCandidates(customer.id, currentPartId, customer.defaultWarehouseId ?? undefined).then((r) =>
                r.candidates.map((c) => ({
                  partId: c.id,
                  code: c.code,
                  name: c.name,
                  brand: c.brandCode ?? c.brandName,
                  brandName: c.brandName ?? c.brandCode,
                  isOem: c.isOem,
                  secCode: c.secCode,
                  avail: Object.values(c.stockByWh).reduce((s, v) => s + Number(v), 0),
                  suggested: c.suggestedPrice,
                  prefill: c.customerLastAmount ?? c.suggestedPrice ?? '',
                })),
              )
            : getPartCompatGroup(currentPartId).then((r) => {
                const g = r.groups.find((x) => x.primary?.id === currentPartId) ?? r.groups[0];
                const members = g ? [...(g.primary ? [g.primary] : []), ...g.alts] : [];
                return members.map((m) => ({
                  partId: m.id,
                  code: m.code,
                  name: m.name,
                  brand: m.brandCode ?? m.brandName,
                  brandName: m.brandName ?? m.brandCode,
                  isOem: m.isOem,
                  secCode: m.secCode,
                  avail: Number(m.onHandTotal),
                  suggested: null,
                  prefill: '',
                }));
              }),
          // S3-1 產品圖片（撈不到不擋）
          listPartSearchPhotos(currentPartId).catch(() => ({ rows: [] as PartPhotoMeta[] })),
        ]);
        if (reqRef.current !== myReq) return;
        setDetail(d);
        setPhotos(ph.rows);
        // 群組空（單一料）→ 至少列自己
        setCompat(
          rows.length > 0
            ? rows
            : [
                {
                  partId: d.id,
                  code: d.code,
                  name: d.name,
                  brand: d.brand?.code ?? null,
                  brandName: d.brand?.name ?? d.brand?.code ?? null,
                  isOem: d.isOem,
                  secCode: d.secCode,
                  avail: 0,
                  suggested: null,
                  prefill: '',
                },
              ],
        );
      } catch {
        if (reqRef.current === myReq) setDetail(null);
      }
    })();
  }, [currentPartId, customer]);

  // C 欄庫存：跟著階段 3 選中列（或階段 4 聚焦行）
  const focusPartId =
    stage === 4 ? (lines[lineSel]?.partId ?? null) : (compat[compatSel]?.partId ?? currentPartId);
  useEffect(() => {
    if (!focusPartId || (stage !== 3 && stage !== 4)) return;
    let alive = true;
    setStock(null);
    setStockSettings([]);
    void Promise.all([
      getPartStockSummary(focusPartId),
      // 安全量（S3-3 低於安全判定；未設定或失敗 → 空、退化成 有貨/缺貨 二態）
      getPartStockSettings(focusPartId).catch(() => ({ rows: [] as PartStockSettingRow[] })),
    ])
      .then(([s, st]) => {
        if (!alive) return;
        setStock(s);
        setStockSettings(st.rows);
      })
      .catch(() => alive && setStock(null));
    return () => {
      alive = false;
    };
  }, [focusPartId, stage]);

  // ── Space 加入/移除報價 ──
  // 階段③ Alt+D 加調貨已退場（執行長 07/12 定案 2）：調貨統一走階段④出貨倉庫屬性
  const toggleLine = useCallback(
    (row: CompatRow) => {
      setLines((prev) => {
        const i = prev.findIndex((l) => l.partId === row.partId);
        if (i >= 0) return prev.filter((l) => l.partId !== row.partId);
        return [...prev, { ...row, qty: '1', price: row.prefill }];
      });
    },
    [],
  );

  // 進階段 4 → 防呆檢查（無庫存且近月無同行詢價）
  useEffect(() => {
    if (stage !== 4) return;
    const zero = lines.filter((l) => l.avail <= 0);
    if (zero.length === 0) {
      setStockWarn([]);
      return;
    }
    let alive = true;
    const dateFrom = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    void Promise.all(
      zero.map(async (l) => {
        try {
          const r = await listInquiryRecords({ partNo: l.code, dateFrom, pageSize: 1 });
          return r.items.length === 0 ? l.code : null;
        } catch {
          return null;
        }
      }),
    ).then((codes) => alive && setStockWarn(codes.filter((c): c is string => c !== null)));
    return () => {
      alive = false;
    };
  }, [stage, lines]);

  // ── S4-2 屬性面板（C 欄五列、跟著 B 欄聚焦卡片）──
  const curLine = lines[lineSel] ?? null;
  const curLinePartId = curLine?.partId ?? null;
  // 換聚焦項目 / 階段 → 面板收合回第一列、操作側回主容器
  useEffect(() => {
    setPropSel(0);
    setPropOpen(null);
    setEditingProp(null);
    setHistModalOpen(false);
    setQuotePane('items');
  }, [lineSel, stage]);
  // 展開 ABCD 價（屬性 1）lazy 載
  useEffect(() => {
    if (stage !== 4 || !curLinePartId || propOpen !== 'abcd') return;
    let alive = true;
    setAbcd(null);
    void getPartDetail(curLinePartId)
      .then((d) => alive && setAbcd(d))
      .catch(() => alive && setAbcd(null));
    return () => {
      alive = false;
    };
  }, [propOpen, curLinePartId, stage]);
  // 回饋 4-2：歷史改聚焦行即載（屬性 2 顯示「該客戶前價」、Enter 彈窗看全列表）
  useEffect(() => {
    if (stage !== 4 || !curLinePartId || !customer) {
      setHistory(null);
      return;
    }
    let alive = true;
    setHistory(null);
    void getQuotePriceHistory(customer.id, curLinePartId, 12)
      .then((r) => alive && setHistory(r.rows))
      .catch(() => alive && setHistory([]));
    return () => {
      alive = false;
    };
  }, [curLinePartId, customer, stage]);
  // 該客戶前價＝歷史裡 scope=CUSTOMER 的最近一筆（報價/成交看哪個近就哪個；rows 已日期倒序）
  const custPrev = history?.find((h) => h.scope === 'CUSTOMER') ?? null;
  // 出貨倉庫選項（屬性 3）＝該料有可出量的倉（stock 已跟聚焦行載入）
  const whOptions = useMemo(() => (stock?.warehouses ?? []).filter((w) => Number(w.available) > 0), [stock]);
  // 聚焦項目卡捲入可視
  useEffect(() => {
    linesListRef.current?.querySelector(`[data-f2line="${lineSel}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [lineSel]);
  // 歷史彈窗選中列捲入可視
  useEffect(() => {
    histListRef.current?.querySelector(`[data-f2hist="${histSel}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [histSel]);
  const patchLine = useCallback((idx: number, patch: Partial<QuoteLine>) => {
    setLines((p) => p.map((x, xi) => (xi === idx ? { ...x, ...patch } : x)));
  }, []);

  // ── 訊息（S5-6：同品名分組——品名固定組標題、組內每行＝識別＋報價）──
  const validLines = lines.filter((l) => l.price !== '' && Number(l.qty) > 0 && Number(l.price) >= 0);
  const copyText = useMemo(() => {
    const groups = new Map<string, QuoteLine[]>();
    for (const l of validLines) {
      const arr = groups.get(l.name);
      if (arr) arr.push(l);
      else groups.set(l.name, [l]);
    }
    const blocks: string[] = [];
    for (const [name, ls] of groups) {
      const rows = ls.map((l) => {
        const parts: string[] = [];
        if (msgOpts.brand) parts.push(l.isOem ? '正廠' : (l.brandName ?? l.brand ?? ''));
        if (msgOpts.baseNo) parts.push(l.code);
        if (msgOpts.secCode && l.secCode) parts.push(l.secCode);
        const qtyPart = msgOpts.qtyAlways || Number(l.qty) > 1 ? `　數量 ${Number(l.qty)}` : '';
        // 回饋 5-1（二修）：出貨倉庫放行尾括號、只帶倉名（例：(恆迎-新莊)）；項目自選倉 → 調貨 → 客戶預設倉
        const whName = l.transfer
          ? '調貨'
          : l.warehouseLabel
            ? (l.warehouseLabel.split(' ').slice(1).join(' ') || l.warehouseLabel) // 「Z00 恆迎-總倉」去倉碼留名
            : (customer?.defaultWarehouseName ?? null);
        const whPart = msgOpts.warehouse && whName ? ` (${whName})` : '';
        return `${parts.filter(Boolean).join(' ')}${qtyPart}　報價 NT$ ${formatNt(Number(l.price))}${whPart}`.trim();
      });
      blocks.push([name, ...rows].join('\n'));
    }
    return blocks.join('\n\n');
  }, [validLines, msgOpts, customer]);
  // S5-4 編輯模式（Alt+E）＋手動編輯稿；定案 5(a)：copyText 重生成（設定卡/項目變更）即蓋掉手動稿
  const [editMode, setEditMode] = useState(false);
  const [msgDraft, setMsgDraft] = useState<string | null>(null);
  useEffect(() => {
    setMsgDraft(null);
  }, [copyText]);
  const msgText = msgDraft ?? copyText;
  // C 欄設定卡焦點列
  const [optSel, setOptSel] = useState(0);
  const optsPanelRef = useRef<HTMLDivElement>(null);
  const setOpt = (patch: Partial<MsgOpts>) =>
    setMsgOpts((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(MSG_OPTS_KEY, JSON.stringify(next));
      } catch {
        /* 存不了不擋 */
      }
      return next;
    });

  async function save() {
    if (!customer || validLines.length === 0) return;
    setBusy(true);
    setErr(null);
    try {
      for (const l of validLines) {
        await createQuoteRecord({
          customerId: customer.id,
          partId: l.partId,
          qty: Number(l.qty),
          unitPrice: Number(l.price),
          // S4-2：出貨倉跟著項目走（未選 → 客戶預設倉；調貨項不帶倉）
          warehouseId: l.transfer ? undefined : (l.warehouseId ?? customer.defaultWarehouseId ?? undefined),
          source: 'INSTANT',
        });
      }
      setSaved(validLines.length);
      setConfirmOpen(false);
      // S5-4：存檔確認後關閉整個即時報價視窗（「下一通」退場）
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '報價紀錄儲存失敗');
      setConfirmOpen(false);
    } finally {
      setBusy(false);
    }
  }

  // 穩定身分（防 FocusLockedDialog 掛載 effect 重跑搶焦點——07/12 走查坑）
  const linesRef = useRef(lines);
  linesRef.current = lines;
  const savedRef = useRef(saved);
  savedRef.current = saved;
  const stageRef = useRef(stage);
  stageRef.current = stage;

  // S4-3 Alt+S 結案：確認提示 → 進⑤發送訊息（階段④限定；Alt+2 回搜尋累加由 Alt+1~5 既有鍵涵蓋）
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key.toLowerCase() !== 's') return;
      e.preventDefault();
      e.stopPropagation();
      if (stageRef.current !== 4) return;
      const valid = linesRef.current.filter((l) => l.price !== '' && Number(l.qty) > 0 && Number(l.price) >= 0);
      if (valid.length === 0) {
        window.alert('還沒有可結案的報價（要有數量與價格）');
        return;
      }
      if (window.confirm(`結案：共 ${valid.length} 筆有效報價、進入發送訊息？`)) setStage(5);
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, []);
  const guardedClose = useCallback(() => {
    if (
      savedRef.current === null &&
      linesRef.current.length > 0 &&
      !window.confirm('報價還沒存、確定關閉？（清單會消失）')
    )
      return;
    onClose();
  }, [onClose]);

  const lineIds = new Set(lines.map((l) => l.partId));
  const secHead = 'text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/80';

  return (
    <FocusLockedDialog
      open
      onClose={guardedClose}
      ariaLabel="即時報價工作台"
      backdropClassName="bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      dialogClassName="flex flex-col rounded-2xl border border-border/60 bg-popover text-foreground shadow-[0_24px_70px_rgba(0,0,0,0.55),0_0_50px_-18px_rgba(232,160,32,0.22)] animate-in fade-in zoom-in-95 duration-200"
      dialogStyle={{ width: 'min(1400px, 96vw)', height: 'min(820px, 94vh)' }}
    >
      <>
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-border/40 px-6 py-2.5">
          <span className="size-2 rounded-full bg-primary shadow-[0_0_10px_#02EDAB]" />
          <FilePlus className="size-4 text-primary" />
          <h2 className="text-sm font-bold tracking-wide">即時報價</h2>
          <span className="text-[12px] text-muted-foreground">{STAGES.find((s) => s.n === stage)?.label}</span>
          <span className="ml-2 inline-flex items-center gap-1.5 rounded border border-primary/50 bg-primary/12 px-2 py-0.5 text-[11px] text-primary">
            {customer ? (
              <>
                <span className="font-mono">{customer.code}</span>
                {customer.name}
              </>
            ) : (
              <span className="text-muted-foreground">散客／未選</span>
            )}
            {lines.length > 0 ? <span className="rounded bg-primary/20 px-1 font-mono">{lines.length}</span> : null}
            {transferCount > 0 ? (
              <span className="rounded bg-amber-500/20 px-1 font-mono text-amber-500" title="調貨清單（F5）">
                調{transferCount}
              </span>
            ) : null}
          </span>
          {/* T1：角標退役 → 引導精靈鈕（Alt+H、行內 kbd 提示全收進說明——執行長 07/12）*/}
          <button
            type="button"
            onClick={() => setHelpOpen((v) => !v)}
            className="ml-auto rounded-md border border-border/40 bg-background/40 p-1 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            aria-label="引導精靈：快捷鍵說明"
            title="引導精靈（Alt+H）"
          >
            <HelpCircle className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={guardedClose}
            className="ml-1 rounded-md border border-border/40 bg-background/40 p-1 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            aria-label="關閉"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* A 階段軌 ｜ B 主容器 ｜ C 副容器 */}
        <div className="grid min-h-0 flex-1 grid-cols-[52px_minmax(420px,1.15fr)_minmax(380px,1fr)]">
          {/* A：純圖示階段軌（Alt+1~5、車站路線式：平均分散＋連結線——執行長 07/12）*/}
          <nav className="relative flex flex-col items-center justify-evenly border-r border-border/40 bg-background/30 py-6">
            {/* 路線連結線（貫穿五站、置於圖示下層）*/}
            <span aria-hidden className="absolute bottom-10 left-1/2 top-10 w-[2px] -translate-x-1/2 bg-border/70" />
            {STAGES.map((s) => {
              const active = s.n === stage;
              const done =
                (s.n === 1 && !!customer) ||
                (s.n === 2 && flatRows.length > 0) ||
                (s.n === 3 && !!currentPartId) ||
                (s.n === 4 && lines.length > 0) ||
                (s.n === 5 && saved !== null);
              return (
                <button
                  key={s.n}
                  type="button"
                  onClick={() => setStage(s.n)}
                  title={`${s.label}（Alt+${s.n}）`}
                  className={`relative z-10 grid size-10 place-items-center rounded-full border-2 transition-colors ${
                    active
                      ? 'border-primary bg-primary/20 text-primary shadow-[0_0_10px_-2px_rgba(232,160,32,0.6)]'
                      : done
                        ? 'border-[#22D88F]/70 bg-popover text-[#22D88F] hover:border-primary/60'
                        : 'border-border/60 bg-popover text-muted-foreground hover:border-primary/50 hover:text-foreground'
                  }`}
                >
                  {s.icon}
                  {done && !active ? (
                    <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-[#22D88F] text-background">
                      <Check className="size-3" />
                    </span>
                  ) : null}
                  <span className="absolute -bottom-1 -right-1 rounded bg-popover px-0.5 font-mono text-[9px] opacity-70">{s.n}</span>
                </button>
              );
            })}
          </nav>

          {/* B 主容器 */}
          <section className="flex min-h-0 flex-col overflow-auto border-r border-border/40 px-5 py-4">
            {stage === 1 && (
              <div ref={custBoxRef} className="mx-auto flex w-full max-w-md flex-col gap-3 pt-8">
                <div>
                  <div className={secHead}>客戶搜尋</div>
                  <input
                    ref={custInputRef}
                    value={custQ}
                    onChange={(e) => {
                      setCustQ(e.target.value);
                      setCustPicked(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'F4') {
                        e.preventDefault();
                        void runCustSearch(true);
                        return;
                      }
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        // B→C→B：已選定再 Enter → 進搜尋；否則查候選（右欄）
                        if (custPicked && customer) setStage(2);
                        else void runCustSearch();
                      }
                    }}
                    placeholder="輸入編號/名稱；注音首碼按 F4（例 we→太古）"
                    className="mt-1 w-full rounded border bg-background px-3 py-2 text-sm"
                  />
                  <div className="mt-2 flex justify-end text-[11px] text-muted-foreground/70">
                    <button
                      type="button"
                      onClick={() => setStage(2)}
                      className="rounded border border-border px-2.5 py-1 hover:border-primary/50"
                    >
                      散客／新客戶、先跳過
                    </button>
                  </div>
                </div>
                {/* B 下半：選定的客戶（S1-1 選人流：C 欄選完回到這裡顯示）*/}
                {customer ? (
                  <div className="rounded-xl border-2 border-primary/50 bg-primary/[0.07] px-4 py-3">
                    <div className="font-mono text-[13px] text-primary">{customer.code}</div>
                    <div className="text-[17px] font-semibold">{customer.name}</div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border/60 px-4 py-6 text-center text-[12px] text-muted-foreground">
                    {custSearching ? '搜尋中…' : custCands.length > 0 ? '在右欄選一個客戶（Enter 跳過去）' : '打字即出候選（右欄）'}
                  </div>
                )}
              </div>
            )}

            {stage === 2 && (
              <div className="space-y-3">
                <div className={secHead}>查零件</div>
                <div className="flex gap-1.5">
                  {(
                    [
                      ['partNo', '料號'],
                      ['keyword', '品名+車型'],
                      ['advanced', '進階（廠牌/族群）'],
                    ] as const
                  ).map(([m, label]) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setMethod(m);
                        setTimeout(() => searchInputRef.current?.focus(), 30);
                      }}
                      className={`rounded-md border px-2.5 py-1 text-[12px] ${
                        method === m ? 'border-primary bg-primary/12 text-primary' : 'border-border/50 text-muted-foreground hover:border-primary/40'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {/* S2-3：即打即出聯想（客戶欄範式；F1 Combobox 搬用）*/}
                {method === 'partNo' && (
                  <Combobox<PartSearchRow>
                    label="料號"
                    value={q1}
                    onChange={setQ1}
                    placeholder="料號（如 021 115 562）"
                    inputRef={searchInputRef}
                    fetchSuggestions={fetchPartNoSuggestions}
                    getKey={(r) => r.id}
                    getLabel={(r) => r.code}
                    getDescription={(r) => r.name}
                    onSelect={(r) => setQ1(r.code)}
                    onSubmit={() => void runSearch()}
                  />
                )}
                {method === 'keyword' && (
                  <Combobox<string>
                    label="品名（英數自動當注音鍵盤碼、例 cvn→火星塞）"
                    value={q1}
                    onChange={setQ1}
                    placeholder="品名關鍵字（如 機油芯）"
                    inputRef={searchInputRef}
                    fetchSuggestions={fetchNameSuggestions}
                    getKey={(n) => n}
                    getLabel={(n) => n}
                    onSelect={(n) => setQ1(n)}
                    onSubmit={() => void runSearch()}
                  />
                )}
                {method === 'advanced' && (
                  <Combobox<MasterOpt>
                    label="廠牌"
                    value={q1}
                    onChange={setQ1}
                    placeholder="空白=展開、或打字篩選（如 BOSCH）"
                    inputRef={searchInputRef}
                    fetchSuggestions={fetchBrandSuggestions}
                    getKey={(b) => b.id}
                    getLabel={(b) => `${b.code} · ${b.name}`}
                    onSelect={(b) => setQ1(b.name)}
                    onSubmit={() => void runSearch()}
                  />
                )}
                {method === 'keyword' && (
                  <input
                    value={q2}
                    onChange={(e) => setQ2(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void runSearch();
                      }
                    }}
                    placeholder="車型（選填、如 GOLF）"
                    className="w-full rounded border bg-background px-3 py-2 text-sm"
                  />
                )}
                {method === 'advanced' && (
                  <Combobox<MasterOpt>
                    label="族群"
                    value={q2}
                    onChange={setQ2}
                    placeholder="空白=展開、或打字篩選（如 引擎）"
                    fetchSuggestions={fetchPartGroupSuggestions}
                    getKey={(g) => g.id}
                    getLabel={(g) => `${g.code} · ${g.name}`}
                    onSelect={(g) => setQ2(g.name)}
                    onSubmit={() => void runSearch()}
                  />
                )}
                <div className="text-[11px] text-muted-foreground/70">
                  {searching ? '查詢中…' : searchRes ? `找到 ${searchRes.total} 筆` : ''}
                </div>
              </div>
            )}

            {stage === 3 && (
              <div className="flex min-h-0 flex-1 flex-col gap-3">
                {/* S3-1 上半加大：產品圖片 + 基本資料（通用零件不多、下半可縮）*/}
                <div>
                  <div className={secHead}>基本資料</div>
                  {detail ? (
                    <div className="mt-1.5 flex gap-4">
                      <button
                        type="button"
                        onClick={() => setPhotoZoom((v) => !v)}
                        className="group relative flex aspect-square w-[190px] shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-primary/35 bg-background/40 transition-colors hover:border-primary"
                        title="Alt+P 放大"
                      >
                        {photos[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={buildPartSearchPhotoUrl(detail.id, photos[0].id)}
                            alt={photos[0].origFilename ?? detail.name}
                            className="size-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-muted-foreground/55">
                            <ImageIcon className="size-7" />
                            <span className="text-[10px]">無產品圖</span>
                          </div>
                        )}
                        <span className="pointer-events-none absolute bottom-1.5 right-1.5 rounded border border-border/50 bg-background/80 px-2 py-0.5 font-mono text-[11px] text-foreground/90 opacity-0 transition-opacity group-hover:opacity-100">
                          Alt+P 放大
                        </span>
                      </button>
                      {/* 回饋 3-1：標籤/值兩欄對齊（同階段①八欄卡範式）*/}
                      <div className="min-w-0 flex-1 space-y-1.5 rounded-lg border border-border/40 bg-secondary/30 px-3.5 py-2.5">
                        {(
                          [
                            ['基準料號', detail.code, 'mono-primary'],
                            ['品名', detail.name, 'strong'],
                            ['廠牌料號', detail.secCode ?? '—', 'mono'],
                            ['廠牌', detail.brand ? detail.brand.code : '—', ''],
                            ['正/副廠', detail.isOem ? '正廠' : '副廠', ''],
                            ['規格', detail.spec ?? '—', ''],
                          ] as const
                        ).map(([label, value, kind]) => (
                          <div
                            key={label}
                            className="flex items-baseline gap-3 border-b border-border/25 pb-1.5 text-[13px] last:border-b-0 last:pb-0"
                          >
                            <span className="w-14 shrink-0 text-[11.5px] text-foreground/60">{label}</span>
                            <span
                              className={`min-w-0 flex-1 break-words ${
                                kind === 'mono-primary'
                                  ? 'font-mono text-[14.5px] font-semibold text-primary'
                                  : kind === 'mono'
                                    ? 'font-mono text-foreground/90'
                                    : kind === 'strong'
                                      ? 'text-[13.5px] font-medium text-foreground'
                                      : 'text-foreground/90'
                              }`}
                            >
                              {value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1 text-[12px] text-muted-foreground">{currentPartId ? '載入中…' : '先在「搜尋」選一顆料'}</div>
                  )}
                </div>
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className={secHead}>通用零件</div>
                  <div
                    ref={compatListRef}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (compat.length === 0) return;
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setCompatSel((i) => Math.min(compat.length - 1, i + 1));
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setCompatSel((i) => Math.max(0, i - 1));
                      } else if (e.key === ' ') {
                        e.preventDefault();
                        const r = compat[compatSel];
                        if (r) toggleLine(r);
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (lines.length > 0) setStage(4);
                      }
                    }}
                    className="mt-1 min-h-0 flex-1 space-y-1.5 overflow-auto outline-none"
                  >
                    {compat.map((r, i) => {
                      // 回饋 3-2：已加入報價的狀態要夠明顯——實心綠邊+綠底+「✓ 已加入」實心徽章（原淡 ring 退場）
                      const added = lineIds.has(r.partId);
                      return (
                        <div
                          key={r.partId}
                          onClick={() => {
                            setCompatSel(i);
                            toggleLine(r);
                          }}
                          className={`flex cursor-pointer items-baseline justify-between gap-3 rounded-lg border-2 px-3 py-2 ${
                            i === compatSel ? 'border-primary' : added ? 'border-[#22D88F]/80' : 'border-border/35 hover:border-primary/45'
                          } ${added ? 'bg-[#22D88F]/12' : i === compatSel ? 'bg-primary/10' : 'bg-secondary/40'}`}
                        >
                          <span className="min-w-0">
                            <span className="font-mono text-[13.5px] font-semibold text-primary/90">{r.code}</span>
                            {added ? (
                              <span className="ml-2 rounded bg-[#22D88F] px-1.5 py-px text-[10px] font-bold text-background">✓ 已加入</span>
                            ) : null}
                            <span className="ml-2 text-[13px]">{r.name}</span>
                            <span className="ml-2 text-[11.5px] text-muted-foreground">{r.brand ?? ''}</span>
                          </span>
                          <span className="shrink-0 font-mono text-[13px] tabular-nums">
                            <span className={r.avail > 0 ? 'text-[#22D88F]' : 'text-destructive'}>{r.avail}</span>
                            {r.suggested ? <span className="ml-2 text-primary">建議 {formatNt(Number(r.suggested))}</span> : null}
                          </span>
                        </div>
                      );
                    })}
                    {compat.length === 0 && currentPartId ? (
                      <div className="py-6 text-center text-[12px] text-muted-foreground">載入中…</div>
                    ) : null}
                  </div>
                </div>
              </div>
            )}

            {stage === 4 && (
              /* 回饋 4-1：操作側指示——B 聚焦時 C 變暗、反之亦然（onFocus 冒泡自動追）*/
              <div
                onFocus={() => setQuotePane('items')}
                className={`flex min-h-0 flex-1 flex-col gap-3 transition-opacity duration-150 ${
                  quotePane === 'props' ? 'opacity-45' : ''
                }`}
              >
                <div className={secHead}>
                  報價清單（可跨搜尋輪累加）
                  {quotePane === 'items' ? (
                    <span className="ml-2 rounded border border-primary/50 bg-primary/12 px-1.5 py-px text-[10px] normal-case tracking-normal text-primary">
                      操作中
                    </span>
                  ) : (
                    <span className="ml-2 text-[10px] normal-case tracking-normal text-muted-foreground/60">Esc 回這裡</span>
                  )}
                </div>
                {stockWarn.length > 0 && (
                  <div className="rounded border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-600">
                    ⚠️ {stockWarn.join('、')} 全公司無庫存、近一個月也沒問過同行——報了可能交不出來
                  </div>
                )}
                {lines.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                    還沒選零件——先回「檢查庫存」加入
                  </div>
                ) : (
                  /* S4-1 卡片式項目（Enter → 右欄屬性面板；本階段 Enter 不再跳發送訊息）*/
                  <div
                    ref={linesListRef}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (lines.length === 0) return;
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setLineSel((i) => Math.min(lines.length - 1, i + 1));
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setLineSel((i) => Math.max(0, i - 1));
                      } else if (e.key === 'Enter') {
                        // S4-2：Enter 進 C 副容器屬性面板
                        e.preventDefault();
                        setPropSel(0);
                        setPropOpen(null);
                        setTimeout(() => propPanelRef.current?.focus(), 30);
                      } else if (e.altKey && (e.key === 'd' || e.key === 'D')) {
                        // S4-4 移除項目（定案 3：Alt+D、需確認）
                        e.preventDefault();
                        const l = lines[lineSel];
                        if (l && window.confirm(`移除報價項目 ${l.code} ${l.name}？`)) {
                          setLines((p) => p.filter((_, xi) => xi !== lineSel));
                          setLineSel((i) => Math.max(0, Math.min(i, lines.length - 2)));
                        }
                      }
                    }}
                    className="min-h-0 flex-1 space-y-1.5 overflow-auto outline-none"
                  >
                    {lines.map((l, i) => (
                      <div
                        key={l.partId}
                        data-f2line={i}
                        onClick={() => setLineSel(i)}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-3.5 py-2.5 ${
                          i === lineSel ? 'border-primary bg-primary/10' : 'border-border/35 bg-secondary/40 hover:border-primary/45'
                        }`}
                      >
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-baseline gap-2">
                            <span className="break-all font-mono text-[13.5px] font-semibold text-primary/90">{l.code}</span>
                            <span className="text-[11.5px] text-muted-foreground">{l.brand ?? ''}</span>
                          </div>
                          <div className="truncate text-[13px]">{l.name}</div>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span>
                              可出 <span className={`font-mono ${l.avail > 0 ? 'text-[#22D88F]' : 'text-destructive'}`}>{l.avail}</span>
                            </span>
                            {l.transfer ? (
                              <span className="rounded border border-amber-500/50 bg-amber-500/10 px-1.5 py-px text-[10px] text-amber-500">
                                調貨詢價（F5）
                              </span>
                            ) : l.warehouseLabel ? (
                              <span className="rounded border border-border/50 bg-muted/30 px-1.5 py-px text-[10px]">{l.warehouseLabel}</span>
                            ) : (
                              <span className="rounded border border-border/40 bg-muted/20 px-1.5 py-px text-[10px] text-muted-foreground/70">
                                客戶預設倉
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 text-right font-mono tabular-nums">
                          <div className="text-[12px] text-muted-foreground">× {Number(l.qty) || 0}</div>
                          <div className={`text-[16px] font-semibold ${l.price ? 'text-primary' : 'text-muted-foreground/50'}`}>
                            {l.price ? `NT$ ${formatNt(Number(l.price))}` : '未報價'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {stage === 5 && (
              /* S5-1：主容器整版＝訊息內容、尺寸固定（內部捲動）；按鈕已移副容器（S5-2）*/
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <div className={secHead}>
                  給客戶的訊息
                  {editMode ? <span className="ml-2 normal-case tracking-normal text-primary">編輯模式</span> : null}
                </div>
                <textarea
                  ref={msgRef}
                  readOnly={!editMode}
                  value={msgText || '（沒有可發送的報價行——回「報價」填量價）'}
                  onChange={(e) => setMsgDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (!editMode) return;
                    // 定案 4：編輯模式 Enter＝回副容器、換行走 Shift+Enter
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      setEditMode(false);
                      setTimeout(() => optsPanelRef.current?.focus(), 0);
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      e.stopPropagation();
                      setEditMode(false);
                      setTimeout(() => optsPanelRef.current?.focus(), 0);
                    }
                  }}
                  className={`min-h-0 w-full flex-1 resize-none overflow-auto rounded-md border px-3 py-2 font-mono text-[13px] leading-relaxed text-foreground ${
                    editMode ? 'border-primary/60 bg-background' : 'border-border bg-muted/20'
                  }`}
                />
              </div>
            )}
          </section>

          {/* C 副容器 */}
          <aside className="flex min-h-0 flex-col overflow-auto bg-background/20 px-5 py-4">
            {stage === 1 && (
              <div className="flex min-h-0 flex-1 flex-col space-y-2">
                {customer && custCands.length === 0 ? (
                  /* 選定後：基本資料八欄（S1-2：五欄＋交易條件/取貨方式/預設倉庫）*/
                  <>
                    <div className={secHead}>客戶基本資料</div>
                    <div className="space-y-1.5 rounded-lg border border-border/40 bg-secondary/30 px-4 py-3">
                      {(
                        [
                          ['客編', customer.code, true],
                          ['名稱', customer.name, false],
                          ['地址', '—（結構化地址待接、v1）', false],
                          ['電話', partnerInfo ? (partnerInfo.phone ?? partnerInfo.mobile ?? '—') : '載入中…', false],
                          ['備註', partnerInfo ? (partnerInfo.remark ?? '—') : '載入中…', false],
                          [
                            '交易條件',
                            partnerInfo
                              ? (PAY_TERM_LABEL[partnerInfo.paymentTermDomestic] ?? partnerInfo.paymentTermDomestic)
                              : '載入中…',
                            false,
                          ],
                          [
                            '取貨方式',
                            partnerInfo
                              ? partnerInfo.defaultDeliveryType
                                ? (DELIVERY_LABEL[partnerInfo.defaultDeliveryType] ?? partnerInfo.defaultDeliveryType)
                                : '—（未設定）'
                              : '載入中…',
                            false,
                          ],
                          [
                            '預設倉庫',
                            partnerInfo
                              ? partnerInfo.defaultWarehouseName
                                ? `${partnerInfo.defaultWarehouseCode ?? ''}　${partnerInfo.defaultWarehouseName}`.trim()
                                : '—'
                              : '載入中…',
                            false,
                          ],
                        ] as const
                      ).map(([label, value, mono]) => (
                        <div key={label} className="flex items-baseline gap-3 border-b border-border/25 pb-1.5 text-[13.5px] last:border-b-0 last:pb-0">
                          <span className="w-14 shrink-0 text-[12px] text-foreground/60">{label}</span>
                          <span className={`min-w-0 flex-1 break-words ${mono ? 'font-mono text-primary' : 'text-foreground/95'}`}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  /* 選定前：候選清單（S1-1：左輸入、右結果）*/
                  <>
                    <div className={secHead}>候選客戶</div>
                    <div
                      ref={custListRef}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (custCands.length === 0) return;
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setCustCandSel((i) => Math.min(custCands.length - 1, i + 1));
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setCustCandSel((i) => Math.max(0, i - 1));
                        } else if (e.key === 'Enter') {
                          e.preventDefault();
                          const p = custCands[custCandSel];
                          if (p) pickCustomer(p);
                        } else if (e.key === 'Escape') {
                          e.preventDefault();
                          e.stopPropagation();
                          custInputRef.current?.focus();
                        }
                      }}
                      className="min-h-0 flex-1 space-y-1 overflow-auto outline-none"
                    >
                      {custCands.map((p, i) => (
                        <div
                          key={p.id}
                          onClick={() => pickCustomer(p)}
                          className={`flex cursor-pointer items-baseline gap-2 rounded-md border px-3 py-1.5 text-[13px] ${
                            i === custCandSel ? 'border-primary bg-primary/10' : 'border-border/30 hover:border-primary/40'
                          }`}
                        >
                          <span className="font-mono text-primary/90">{p.code}</span>
                          <span className="min-w-0 truncate">{p.name}</span>
                        </div>
                      ))}
                      {custCands.length === 0 ? (
                        <div className="py-6 text-center text-[12px] text-muted-foreground">
                          {custSearching ? '搜尋中…' : '左欄打字即出候選；散客可跳過'}
                        </div>
                      ) : null}
                    </div>
                  </>
                )}
              </div>
            )}

            {stage === 2 && (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className={secHead}>
                  搜尋結果
                  {searchRes ? (
                    <span className="ml-2 normal-case tracking-normal text-muted-foreground/70">
                      群組 {searchRes.groups?.length ?? 0}・散件 {searchRes.ungrouped?.length ?? 0}
                    </span>
                  ) : null}
                </div>
                <div
                  ref={resListRef}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (flatRows.length === 0) return;
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setResSel((i) => Math.min(flatRows.length - 1, i + 1));
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setResSel((i) => Math.max(0, i - 1));
                    } else if (e.key === 'Enter') {
                      e.preventDefault();
                      const r = flatRows[resSel];
                      if (r) {
                        setCurrentPartId(r.member.id);
                        setStage(3);
                      }
                    }
                  }}
                  className="mt-1 min-h-0 flex-1 space-y-1.5 overflow-auto outline-none"
                >
                  {/* S2-2：F1 搜尋窗同款群組樹卡片（主件金邊+替代縮排、正/副廠徽章、庫存三數）*/}
                  {flatRows.map((row, i) => {
                    const m = row.member;
                    const isAlt = row.kind === 'alt';
                    return (
                      <div
                        key={`${m.id}-${i}`}
                        data-f2res={i}
                        onClick={() => {
                          setCurrentPartId(m.id);
                          setStage(3);
                        }}
                        className={`relative flex cursor-pointer items-stretch gap-2.5 rounded-xl border-2 px-3 py-2 ${isAlt ? 'ml-5' : ''} ${
                          i === resSel
                            ? 'border-primary bg-primary/10'
                            : isAlt
                              ? 'border-border/35 bg-secondary/30 hover:border-primary/45'
                              : 'border-primary/30 bg-secondary/40 hover:border-primary/55'
                        } ${!m.isActive ? 'opacity-55' : ''}`}
                      >
                        {!isAlt && (
                          <span
                            aria-hidden
                            className={`pointer-events-none absolute bottom-2 left-0 top-2 rounded-r ${i === resSel ? 'w-1.5 bg-primary' : 'w-1 bg-primary/55'}`}
                          />
                        )}
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className={`min-w-0 break-all font-mono font-semibold ${isAlt ? 'text-[13px] text-primary/80' : 'text-[13.5px] text-primary/95'}`}>
                              {m.code}
                            </span>
                            <span className="flex shrink-0 items-center gap-1">
                              {isAlt ? (
                                <span className="rounded border border-border/55 bg-secondary/25 px-1.5 py-px text-[10px] text-muted-foreground">替代</span>
                              ) : null}
                              <span
                                className={`rounded border px-1.5 py-px text-[10px] ${
                                  m.isOem ? 'border-primary/55 bg-primary/15 text-primary' : 'border-border/50 bg-muted/30 text-muted-foreground/85'
                                }`}
                              >
                                {m.isOem ? '正廠' : '副廠'}
                              </span>
                              {!m.isActive ? (
                                <span className="rounded border border-destructive/40 bg-destructive/10 px-1.5 py-px text-[10px] text-destructive">停用</span>
                              ) : null}
                            </span>
                          </div>
                          <div className="break-words text-[13px] font-medium leading-snug text-foreground">{m.name}</div>
                          <div className="text-[11px] text-muted-foreground">
                            副廠 <span className="font-mono text-foreground/85">{m.secCode ?? '—'}</span>
                            <span className="mx-1.5 text-muted-foreground/35">·</span>
                            廠牌 <span className="text-foreground/85">{m.brandCode ?? m.brandName ?? '—'}</span>
                          </div>
                        </div>
                        <StockTriple onHand={m.onHandTotal} available={m.availableTotal} />
                      </div>
                    );
                  })}
                  {flatRows.length === 0 ? (
                    <div className="py-6 text-center text-[12px] text-muted-foreground">
                      {searching ? '查詢中…' : searchRes && searchRes.total === 0 ? '查無符合料號——換個關鍵字' : '左欄輸入條件、Enter 查詢'}
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {stage === 3 && (
              <div className="space-y-3">
                <div className={secHead}>出貨狀態（跟著選中件）</div>
                {stock ? (
                  (() => {
                    const onHand = Number(stock.company.onHand);
                    const avail = Number(stock.company.available);
                    const blocked = Math.max(0, onHand - avail);
                    const inTransit = Number(stock.company.inTransit);
                    // 低於安全＝各倉安全量加總（F1 同法；未設定退化成 有貨/缺貨 二態）
                    const safety = stockSettings.reduce((s, r) => s + Number(r.minQty || 0), 0);
                    const meta =
                      avail <= 0
                        ? { label: '缺貨', sub: '公司無可出庫存', color: '#E26060' }
                        : safety > 0 && avail < safety
                          ? { label: '低於安全', sub: '可出量低於安全庫存', color: '#FFB347' }
                          : { label: '有貨可出', sub: '公司可出量充足', color: '#22D88F' };
                    return (
                      <div className="space-y-3">
                        {/* S3-3 大狀態卡（F1 STATUS_META 同款）*/}
                        <div
                          className="flex flex-col items-center gap-1 rounded-lg border-2 px-4 py-4"
                          style={{
                            borderColor: `${meta.color}88`,
                            backgroundColor: `${meta.color}14`,
                            boxShadow: `0 0 24px -8px ${meta.color}66`,
                          }}
                        >
                          <span className="text-[24px] font-bold tracking-[0.12em]" style={{ color: meta.color }}>
                            {meta.label}
                          </span>
                          <span className="text-[12px] text-muted-foreground/85">{meta.sub}</span>
                        </div>
                        {/* 三指標（執行長點名：總庫存/可出量/不可出量；在途退場、下方另示）*/}
                        <div className="grid grid-cols-3 gap-2 text-center">
                          {(
                            [
                              ['總庫存', onHand, 'var(--foreground)'],
                              ['可出量', avail, '#22D88F'],
                              ['不可出量', blocked, '#E26060'],
                            ] as const
                          ).map(([label, v, color]) => (
                            <div key={label} className="rounded-md border border-border/50 bg-secondary px-2 py-1.5">
                              <div className="text-[10.5px] text-foreground/60">{label}</div>
                              <div className="font-mono text-[17px] font-semibold" style={{ color: v === 0 ? '#5A5A60' : color }}>
                                {v}
                              </div>
                            </div>
                          ))}
                        </div>
                        {inTransit > 0 ? (
                          <p className="text-[12px] text-muted-foreground/75">
                            另有 <span className="font-mono text-[#FFB347]">{inTransit}</span> 件在途（採購已下單未入庫）
                          </p>
                        ) : null}
                        {/* S3-4 各倉卡片（取代細表格）*/}
                        <div className="space-y-1.5">
                          {stock.warehouses
                            .filter((w) => Number(w.onHand) > 0 || w.isPrimary)
                            .map((w) => {
                              const wAvail = Number(w.available);
                              const wBlocked = Math.max(0, Number(w.onHand) - wAvail);
                              return (
                                <div
                                  key={w.warehouseId}
                                  className="flex items-center gap-3 rounded-lg border border-border/40 bg-secondary/30 px-3 py-2"
                                >
                                  <div className="min-w-0 flex-1">
                                    <span className="font-mono text-[13px] text-primary/90">{w.warehouseCode}</span>
                                    <span className="ml-2 text-[12.5px] text-muted-foreground">{w.warehouseName}</span>
                                    {w.isPrimary ? (
                                      <span className="ml-2 rounded border border-primary/45 bg-primary/10 px-1.5 py-px text-[10px] text-primary">本倉</span>
                                    ) : null}
                                  </div>
                                  <div className="flex shrink-0 items-baseline gap-3 font-mono tabular-nums">
                                    <span className={`text-[16px] font-semibold ${wAvail > 0 ? 'text-[#22D88F]' : 'text-destructive'}`}>
                                      {wAvail}
                                    </span>
                                    <span className="text-[11px] text-muted-foreground/70">
                                      庫存 {Number(w.onHand)}
                                      {wBlocked > 0 ? `・不可出 ${wBlocked}` : ''}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="text-[12px] text-muted-foreground">{focusPartId ? '載入中…' : '尚未選件'}</div>
                )}
              </div>
            )}

            {stage === 4 && (
              <div
                onFocus={() => setQuotePane('props')}
                className={`flex min-h-0 flex-1 flex-col space-y-2 transition-opacity duration-150 ${
                  quotePane === 'items' ? 'opacity-45' : ''
                }`}
              >
                <div className={secHead}>
                  報價屬性
                  {curLine ? <span className="ml-2 font-mono normal-case tracking-normal text-primary/80">{curLine.code}</span> : null}
                  {quotePane === 'props' ? (
                    <span className="ml-2 rounded border border-primary/50 bg-primary/12 px-1.5 py-px text-[10px] normal-case tracking-normal text-primary">
                      操作中
                    </span>
                  ) : (
                    <span className="ml-2 text-[10px] normal-case tracking-normal text-muted-foreground/60">Enter 進來</span>
                  )}
                </div>
                {!curLine ? (
                  <div className="text-[12px] text-muted-foreground">左欄選一個報價項目、Enter 進來調屬性</div>
                ) : (
                  /* S4-2 五列屬性面板：↑↓ 移動、Enter 展開/編輯、Esc 回左欄卡片 */
                  <div
                    ref={propPanelRef}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (editingProp) return; // 編輯輸入框自己接鍵
                      if (propOpen === 'wh') {
                        const total = whOptions.length + 1; // +1 = 調貨
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setWhSel((i) => Math.min(total - 1, i + 1));
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setWhSel((i) => Math.max(0, i - 1));
                        } else if (e.key === 'Enter') {
                          e.preventDefault();
                          if (whSel < whOptions.length) {
                            const w = whOptions[whSel];
                            patchLine(lineSel, {
                              warehouseId: w.warehouseId,
                              warehouseLabel: `${w.warehouseCode} ${w.warehouseName}`,
                              transfer: false,
                            });
                          } else {
                            // 調貨：公司有現貨 → 確認防呆（沿用）；入 F5 調貨詢價清單、決策跟著項目走
                            if (
                              curLine.avail > 0 &&
                              !window.confirm(`⚠️ ${curLine.code} 公司有現貨（可出 ${curLine.avail}）——確定改走調貨詢價？`)
                            ) {
                              setPropOpen(null);
                              return;
                            }
                            addTransferItems([{ partId: curLine.partId, code: curLine.code, name: curLine.name }]);
                            patchLine(lineSel, { transfer: true, warehouseId: null, warehouseLabel: null });
                          }
                          setPropOpen(null);
                        } else if (e.key === 'Escape') {
                          e.preventDefault();
                          e.stopPropagation();
                          setPropOpen(null);
                        }
                        return;
                      }
                      if (propOpen) {
                        // abcd 展開中：Enter 或 Esc 收合
                        if (e.key === 'Enter' || e.key === 'Escape') {
                          e.preventDefault();
                          e.stopPropagation();
                          setPropOpen(null);
                        }
                        return;
                      }
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setPropSel((i) => Math.min(PROP_ROWS.length - 1, i + 1));
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setPropSel((i) => Math.max(0, i - 1));
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (propSel === 0) setPropOpen('abcd');
                        else if (propSel === 1) {
                          // 回饋 4-2：歷史改彈出視窗（不向下擠版面）
                          setHistSel(0);
                          setHistModalOpen(true);
                        } else if (propSel === 2) {
                          setWhSel(0);
                          setPropOpen('wh');
                        } else {
                          setEditingProp(propSel === 3 ? 'qty' : 'price');
                          setTimeout(() => {
                            propEditRef.current?.focus();
                            propEditRef.current?.select();
                          }, 30);
                        }
                      } else if (e.key === 'Escape') {
                        // Esc 退出回主容器（B 欄卡片）
                        e.preventDefault();
                        e.stopPropagation();
                        setTimeout(() => linesListRef.current?.focus(), 0);
                      }
                    }}
                    className="min-h-0 flex-1 space-y-1.5 overflow-auto outline-none"
                  >
                    {PROP_ROWS.map((label, i) => {
                      const active = i === propSel;
                      const value =
                        i === 0
                          ? curLine.suggested
                            ? `NT$ ${formatNt(Number(curLine.suggested))}`
                            : '—'
                          : i === 1
                            ? history === null
                              ? customer
                                ? '…'
                                : '—（散客）'
                              : custPrev
                                ? `${custPrev.kind === 'SALE' ? '成交' : '報價'} NT$ ${formatNt(Number(custPrev.amount))}`
                                : '—（無前價）'
                            : i === 2
                              ? curLine.transfer
                                ? '調貨詢價（F5）'
                                : (curLine.warehouseLabel ??
                                  `客戶預設${customer?.defaultWarehouseName ? `（${customer.defaultWarehouseName}）` : '倉'}`)
                              : i === 3
                                ? curLine.qty
                                : curLine.price || '未填';
                      return (
                        <div key={label}>
                          <div
                            onClick={() => setPropSel(i)}
                            className={`flex items-center justify-between gap-3 rounded-lg border-2 px-3 py-2 ${
                              active ? 'border-primary bg-primary/10' : 'border-border/35 bg-secondary/30'
                            }`}
                          >
                            <span className="text-[12.5px] text-foreground/70">{label}</span>
                            {editingProp && active && (i === 3 || i === 4) ? (
                              <input
                                ref={propEditRef}
                                type="number"
                                min="0"
                                step={i === 4 ? '0.01' : '1'}
                                value={i === 3 ? curLine.qty : curLine.price}
                                onChange={(e) => patchLine(lineSel, i === 3 ? { qty: e.target.value } : { price: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === 'Escape') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setEditingProp(null);
                                    setTimeout(() => propPanelRef.current?.focus(), 0);
                                  }
                                }}
                                className="w-28 rounded border bg-background px-2 py-1 text-right font-mono text-sm tabular-nums"
                              />
                            ) : (
                              <span className={`font-mono text-[13.5px] tabular-nums ${i === 4 && curLine.price ? 'font-semibold text-primary' : 'text-foreground/95'}`}>
                                {value}
                              </span>
                            )}
                          </div>
                          {/* 展開區 */}
                          {i === 0 && propOpen === 'abcd' ? (
                            <div className="mt-1.5 grid grid-cols-4 gap-1.5 px-1">
                              {(['A', 'B', 'C', 'D'] as const).map((g) => {
                                const v = abcd?.[`price${g}` as 'priceA' | 'priceB' | 'priceC' | 'priceD'];
                                return (
                                  <div key={g} className="rounded-md border border-border/50 bg-secondary px-2 py-1.5 text-center">
                                    <div className="text-[10px] text-foreground/60">{g} 價</div>
                                    <div className="font-mono text-[13.5px] font-semibold tabular-nums">
                                      {abcd ? (v ? formatNt(Number(v)) : '—') : '…'}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : null}
                          {i === 2 && propOpen === 'wh' ? (
                            <div className="mt-1.5 space-y-1 px-1">
                              {whOptions.map((w, wi) => (
                                <div
                                  key={w.warehouseId}
                                  className={`flex items-baseline justify-between rounded border px-2 py-1 text-[12px] ${
                                    whSel === wi ? 'border-primary bg-primary/10' : 'border-border/30'
                                  }`}
                                >
                                  <span>
                                    <span className="font-mono text-primary/90">{w.warehouseCode}</span>
                                    <span className="ml-1.5 text-muted-foreground">{w.warehouseName}</span>
                                  </span>
                                  <span className="font-mono text-[#22D88F] tabular-nums">可出 {Number(w.available)}</span>
                                </div>
                              ))}
                              <div
                                className={`rounded border px-2 py-1 text-[12px] ${
                                  whSel === whOptions.length ? 'border-amber-500 bg-amber-500/10 text-amber-500' : 'border-border/30 text-muted-foreground'
                                }`}
                              >
                                調貨（同行詢價、入 F5 清單）
                              </div>
                              {whOptions.length === 0 ? (
                                <div className="px-1 text-[11px] text-muted-foreground/70">各倉都沒可出量——只剩調貨一途</div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {stage === 5 && (
              <div className="flex min-h-0 flex-1 flex-col gap-3">
                <div className={secHead}>訊息內容設定（會記住）</div>
                {/* S5-3 設定卡＋S5-4 鍵盤流：↑↓ 選卡、Space 啟用/取消、Enter 存檔 */}
                <div
                  ref={optsPanelRef}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setOptSel((i) => Math.min(MSG_OPT_DEFS.length - 1, i + 1));
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setOptSel((i) => Math.max(0, i - 1));
                    } else if (e.key === ' ') {
                      e.preventDefault();
                      const def = MSG_OPT_DEFS[optSel];
                      if (def) setOpt({ [def.key]: !msgOpts[def.key] });
                    } else if (e.key === 'Enter') {
                      // S5-4：副容器 Enter＝存檔 → 確認 → 關窗
                      e.preventDefault();
                      if (customer && validLines.length > 0 && !busy) setConfirmOpen(true);
                    }
                  }}
                  className="space-y-1.5 outline-none"
                >
                  {MSG_OPT_DEFS.map((def, i) => {
                    const on = msgOpts[def.key];
                    return (
                      <div
                        key={def.key}
                        onClick={() => {
                          setOptSel(i);
                          setOpt({ [def.key]: !on });
                        }}
                        className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border-2 px-3 py-2 text-[13px] ${
                          i === optSel ? 'border-primary bg-primary/10' : 'border-border/35 bg-secondary/30 hover:border-primary/45'
                        }`}
                      >
                        <span className="text-foreground/85">{def.label}</span>
                        <span
                          className={`shrink-0 rounded border px-1.5 py-px font-mono text-[10px] ${
                            on ? 'border-[#22D88F]/60 bg-[#22D88F]/12 text-[#22D88F]' : 'border-border/50 text-muted-foreground/60'
                          }`}
                        >
                          {on ? 'ON' : 'OFF'}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="text-[11px] text-muted-foreground/70">
                  品名固定顯示在組標題（同品名分組）；變更設定會重新生成訊息、手動編輯以最後動作為準
                </div>
                {!customer ? (
                  <div className="space-y-2 rounded-lg border border-dashed border-border px-3 py-2.5">
                    <div className="text-[12px] text-muted-foreground">
                      散客：訊息可直接複製；<b className="text-foreground">要存報價紀錄請先補客戶</b>
                    </div>
                    <CustomerPicker onPick={setCustomer} onCommit={() => {}} />
                  </div>
                ) : null}
                {err ? <div className="text-xs text-destructive">{err}</div> : null}
                {/* S5-2 按鈕移到副容器下方 */}
                <div className="mt-auto flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => void navigator.clipboard.writeText(msgText)}
                    disabled={!msgText}
                    className="rounded border px-4 py-1.5 text-sm disabled:opacity-50"
                  >
                    複製訊息
                  </button>
                  <button
                    type="button"
                    disabled={busy || !customer || validLines.length === 0}
                    onClick={() => setConfirmOpen(true)}
                    className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
                  >
                    存檔
                  </button>
                </div>
              </div>
            )}
          </aside>
        </div>

        {/* 存檔確認（Enter 確認 → 存 N 筆）*/}
        {confirmOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setConfirmOpen(false)}>
            <div className="absolute inset-0 bg-black/40" />
            <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-sm space-y-4 rounded-xl border border-border bg-card p-5 shadow-2xl">
              <h2 className="text-sm font-semibold">確認存檔</h2>
              <p className="text-sm text-muted-foreground">
                {customer ? `${customer.code} ${customer.name}` : '—'}
                <br />共 {validLines.length} 筆報價紀錄。
              </p>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setConfirmOpen(false)} className="rounded border px-4 py-1.5 text-sm">
                  返回
                </button>
                <button
                  ref={confirmRef}
                  type="button"
                  disabled={busy}
                  onClick={() => void save()}
                  className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
                >
                  {busy ? '儲存中…' : '確認 (Enter)'}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* 回饋 4-2：報價/成交歷史彈窗——↑↓ 選、Enter 帶價入報價欄（續編出貨倉庫）、Esc 關 */}
        {histModalOpen && curLine ? (
          <FocusLockedDialog
            open
            onClose={() => setHistModalOpen(false)}
            initialFocusRef={histListRef}
            ariaLabel="報價/成交歷史"
            backdropClassName="bg-black/55 backdrop-blur-[2px] animate-in fade-in duration-150"
            dialogClassName="flex flex-col rounded-xl border border-border/60 bg-popover text-foreground shadow-[0_18px_50px_rgba(0,0,0,0.5),0_0_36px_-14px_rgba(232,160,32,0.25)] animate-in fade-in zoom-in-95 duration-150"
            dialogStyle={{ width: 'min(640px, 92vw)', maxHeight: 'min(560px, 88vh)' }}
          >
            <>
              <div className="flex items-center gap-2.5 border-b border-border/40 px-5 py-2.5">
                <h3 className="text-sm font-bold tracking-wide">報價/成交歷史</h3>
                <span className="font-mono text-[12px] text-primary/85">{curLine.code}</span>
                <span className="text-[11px] text-muted-foreground/70">成交綠・報價金｜客名金字＝該客戶</span>
                <button
                  type="button"
                  onClick={() => setHistModalOpen(false)}
                  className="ml-auto rounded-md border border-border/40 bg-background/40 p-1 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                  aria-label="關閉"
                >
                  <X className="size-3.5" />
                </button>
              </div>
              {/* 執行長 07/12 五輪：欄位式＋表頭（數量獨立一欄、告別看不懂的 ×N）*/}
              <div className="grid grid-cols-[80px_40px_minmax(0,1fr)_44px_150px] items-baseline gap-x-2.5 border-b border-border/30 bg-background/40 px-6 py-1.5 text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground/65">
                <span>日期</span>
                <span>類別</span>
                <span>客戶</span>
                <span className="text-right">數量</span>
                <span className="text-right">單價（對建議售價差）</span>
              </div>
              <div
                ref={histListRef}
                tabIndex={0}
                onKeyDown={(e) => {
                  const rows = history ?? [];
                  if (rows.length === 0) return;
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setHistSel((i) => Math.min(rows.length - 1, i + 1));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setHistSel((i) => Math.max(0, i - 1));
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    const h = rows[histSel];
                    if (h) {
                      // 帶該筆價格入報價欄 → 關窗 → 屬性跳到出貨倉庫續編
                      patchLine(lineSel, { price: String(Number(h.amount)) });
                      setHistModalOpen(false);
                      setPropSel(2);
                      setTimeout(() => propPanelRef.current?.focus(), 50);
                    }
                  }
                }}
                className="min-h-0 flex-1 space-y-1 overflow-auto px-4 py-2.5 outline-none"
              >
                {history === null ? (
                  <div className="py-6 text-center text-[12px] text-muted-foreground">載入中…</div>
                ) : history.length === 0 ? (
                  <div className="py-6 text-center text-[12px] text-muted-foreground">沒有歷史紀錄</div>
                ) : (
                  history.map((h, hi) => (
                    <div
                      key={hi}
                      data-f2hist={hi}
                      onClick={() => setHistSel(hi)}
                      className={`grid cursor-pointer grid-cols-[80px_40px_minmax(0,1fr)_44px_150px] items-baseline gap-x-2.5 rounded-lg border-2 px-2 py-1.5 text-[12.5px] ${
                        hi === histSel ? 'border-primary bg-primary/10' : 'border-border/30 bg-secondary/25 hover:border-primary/40'
                      }`}
                    >
                      <span className="font-mono text-muted-foreground/80">{h.date.slice(0, 10)}</span>
                      <span className={`font-medium ${h.kind === 'SALE' ? 'text-[#22D88F]' : 'text-primary'}`}>
                        {h.kind === 'SALE' ? '成交' : '報價'}
                      </span>
                      {/* 客編+客名；該客戶金字 */}
                      <span
                        className={`min-w-0 truncate ${
                          h.scope === 'CUSTOMER' ? 'font-medium text-primary' : 'text-muted-foreground/70'
                        }`}
                      >
                        {[h.customerCode, h.customerName].filter(Boolean).join(' ') || '—'}
                      </span>
                      <span className="text-right font-mono tabular-nums text-foreground/85">{Number(h.qty ?? 1)}</span>
                      <span className="text-right font-mono tabular-nums">
                        {(() => {
                          const sug = curLine.suggested ? Number(curLine.suggested) : null;
                          if (!sug) return null;
                          const diff = Number(h.amount) - sug;
                          if (diff === 0) return null;
                          return (
                            <span className={`mr-2 text-[11.5px] ${diff > 0 ? 'text-[#22D88F]' : 'text-[#E26060]'}`}>
                              {diff > 0 ? '▲' : '▼'}
                              {formatNt(Math.abs(diff))}
                            </span>
                          );
                        })()}
                        <span className={h.kind === 'SALE' ? 'text-[#22D88F]' : 'text-primary'}>NT$ {formatNt(Number(h.amount))}</span>
                      </span>
                    </div>
                  ))
                )}
              </div>
              <div className="border-t border-border/35 bg-background/35 px-5 py-1.5 text-right text-[11px] text-muted-foreground/65">
                <Kbd>↑↓</Kbd> 選　<Kbd>Enter</Kbd> 帶入報價、續編出貨倉庫　<Kbd>Esc</Kbd> 關閉
              </div>
            </>
          </FocusLockedDialog>
        ) : null}

        {/* S3-2 圖片放大 Lightbox（Alt+P、F1 同款）*/}
        {photoZoom && photos.length > 0 && currentPartId ? (
          <PhotoZoomOverlay partId={currentPartId} photos={photos} onClose={() => setPhotoZoom(false)} />
        ) : null}

        {/* T1 引導精靈（Alt+H / 右上「?」、本功能全部快捷鍵）*/}
        {helpOpen ? <QuoteHelpOverlay onClose={() => setHelpOpen(false)} /> : null}
      </>
    </FocusLockedDialog>
  );
}

/** 結果卡右側庫存三數：總數量 / 可出量 / 不可出（＝總 − 可出；F1 StockCell 縮小版）*/
function StockTriple({ onHand, available }: { onHand: string; available: string }) {
  const total = Number(onHand) || 0;
  const avail = Number(available) || 0;
  const blocked = Math.max(0, total - avail);
  const Line = ({ label, value, cls, strong }: { label: string; value: number; cls: string; strong?: boolean }) => (
    <div className="flex items-baseline justify-between gap-1.5">
      <span className="text-[9.5px] uppercase tracking-[0.08em] text-muted-foreground/60">{label}</span>
      <span className={`font-mono tabular-nums ${strong ? 'text-[13.5px] font-semibold' : 'text-[11.5px]'} ${cls}`}>{value.toLocaleString()}</span>
    </div>
  );
  return (
    <div className="flex w-[86px] shrink-0 flex-col justify-center gap-0.5 self-center border-l border-border/30 pl-2.5">
      <Line label="總數量" value={total} cls="text-foreground/80" />
      <Line label="可出量" value={avail} strong cls={avail > 0 ? 'text-[#22D88F]' : 'text-destructive'} />
      <Line label="不可出" value={blocked} cls={blocked > 0 ? 'text-amber-400' : 'text-muted-foreground/45'} />
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-border/45 bg-background/45 px-1.5 py-px font-mono text-[11px] text-muted-foreground/90">
      {children}
    </kbd>
  );
}

/** T1 引導精靈（Alt+H / 右上「?」、執行長 07/12：角標退役、行內 kbd 提示全收進來）*/
function QuoteHelpOverlay({ onClose }: { onClose: () => void }) {
  const Group = ({ title }: { title: string }) => (
    <div className="col-span-2 pt-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/85 first:pt-0">
      {title}
    </div>
  );
  const Row = ({ k, desc }: { k: string; desc: string }) => (
    <>
      <span className="text-right">
        <Kbd>{k}</Kbd>
      </span>
      <span className="text-[13px] text-foreground/90">{desc}</span>
    </>
  );
  return (
    <FocusLockedDialog
      open
      onClose={onClose}
      ariaLabel="引導精靈：快捷鍵說明"
      backdropClassName="bg-black/55 backdrop-blur-[2px] animate-in fade-in duration-150"
      dialogClassName="flex flex-col rounded-xl border border-border/60 bg-popover text-foreground shadow-[0_18px_50px_rgba(0,0,0,0.5),0_0_36px_-14px_rgba(232,160,32,0.25)] animate-in fade-in zoom-in-95 duration-150"
      dialogStyle={{ width: 'min(560px, 92vw)', maxHeight: 'min(640px, 90vh)' }}
    >
      <>
        <div className="flex items-center gap-2.5 border-b border-border/40 px-5 py-2.5">
          <HelpCircle className="size-4 text-primary" />
          <h3 className="text-sm font-bold tracking-wide">即時報價・快捷鍵說明</h3>
          <kbd className="rounded border border-primary/50 bg-primary/12 px-1.5 py-px font-mono text-[11px] font-bold text-primary">
            Alt+H
          </kbd>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-md border border-border/40 bg-background/40 p-1 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            aria-label="關閉"
            title="關閉（Esc）"
          >
            <X className="size-3.5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-5 py-3">
          <div className="grid grid-cols-[88px_1fr] items-baseline gap-x-3 gap-y-1.5">
            <Group title="通用" />
            <Row k="Alt+1~5" desc="切五階段：對象／搜尋／檢查庫存／報價／發送訊息" />
            <Row k="Alt+H" desc="本說明（引導精靈通用鍵）" />
            <Row k="Esc" desc="關閉工作台（有未存報價會先確認）" />
            <Group title="① 對象" />
            <Row k="Enter" desc="查候選（右欄）；選定後再按 → 進搜尋" />
            <Row k="↑↓ / Enter" desc="右欄選候選客戶（Esc 回輸入框）" />
            <Row k="F4" desc="注音首碼搜尋（例 we→太古）" />
            <Row k="Alt+N" desc="散客／新客戶、先跳過" />
            <Group title="② 搜尋" />
            <Row k="[ ]" desc="左右循環切三查法（料號／品名+車型／進階）" />
            <Row k="Enter" desc="查詢；下拉建議開著時＝選定建議" />
            <Row k="↑↓ / Enter" desc="右欄群組樹選結果 → 進檢查庫存" />
            <Group title="③ 檢查庫存" />
            <Row k="↑↓" desc="選通用零件（右欄出貨狀態即時跟隨）" />
            <Row k="Space" desc="加入／移除報價清單" />
            <Row k="Alt+P" desc="放大產品圖片（←→ 切圖）" />
            <Row k="Enter" desc="進報價（已有項目時）" />
            <Group title="④ 報價" />
            <Row k="↑↓" desc="選報價項目卡（右欄屬性跟隨）" />
            <Row k="Enter" desc="進右欄屬性面板：↑↓ 五列、Enter 展開/編輯、Esc 回卡片" />
            <Row k="Alt+D" desc="移除聚焦項目（需確認）" />
            <Row k="Alt+S" desc="結案 → 確認 → 進發送訊息" />
            <Row k="Alt+2" desc="回搜尋報下一顆（項目保留累加）" />
            <Group title="⑤ 發送訊息" />
            <Row k="↑↓ / Space" desc="右欄選設定卡／啟用取消（即時重生成訊息）" />
            <Row k="Alt+E" desc="左欄編輯模式（Shift+Enter 換行、Enter 回右欄）" />
            <Row k="Enter" desc="右欄＝存檔 → 確認後關閉工作台" />
          </div>
        </div>
        <div className="border-t border-border/35 bg-background/35 px-5 py-1.5 text-right text-[11px] text-muted-foreground/65">
          <Kbd>Esc</Kbd> 或再按 <Kbd>Alt+H</Kbd> 關閉
        </div>
      </>
    </FocusLockedDialog>
  );
}
