// apps/nx-ui/src/design/components/quick-search/PartMainWindow.tsx
// 料號即時搜尋 視窗 2：主視窗（執行長 2026-06-25 任務單）
//
// 三欄式：左基本資料 / 中公司總存貨 / 右通用零件
//
// F2 改版 Step 1（docs/_team/f2-redesign-handoff.md §3 §6、執行長 2026-06-25 拍板）：
//   · 預設頁不分倉、只答「公司到底有沒有貨」：
//     大狀態（有貨可出／低於安全／缺貨）+ 總可出/總庫存/在途 + 公司庫存水位條
//   · 水位條一條看懂：安全量 ─ 現量 ─ 最高量（安全/最高 = 各倉庫存設定加總）
//   · 各倉分布自預設頁移除（執行長明確拿掉；倉別改由入口情境決定、見交接 §4）
//   · 基本資訊卡加大面積
//
// 核心連動（視窗 2 靈魂、執行長 2026-07-11 S01 走查改版）：
//   · ↑↓（右欄）= 選件：左欄基本資料 + 中欄庫存「即時跟隨」選中列（主件只留「主」徽章、不再恆亮）
//   · Space = 標記✓/取消（可多顆）；Alt+Q 報價：有標記＝批次報價、無標記＝報當前件
//   · Alt+F（右欄）= 跳搜：以該件為新主件重來、原主件不保留
//   · Alt+W = 各倉分布展開/收合（localStorage 記憶、換料不縮回）
//   · Alt+P = 放大零件圖（原 Space、讓位給標記）
//   · Alt+H = 快捷鍵說明（引導精靈通用鍵）；底部提示列已收進右上「?」
//   · Alt+G = 聚焦右欄通用零件（原 F3；2026-07-14 F 鍵清場：F3~F10 全改 Alt、F4 刪＝Alt+Q 重複）
//   · Esc = 關視窗 2 → 退回搜尋窗（保留搜尋窗 state）
//
// 焦點地基：FocusLockedDialog 包殼、modal-stack 自動隔離背景。
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Image as ImageIcon,
  Loader2,
  Package,
  Pin,
  Warehouse,
  X,
} from 'lucide-react';

import {
  buildPartSearchPhotoUrl,
  getPartCompatGroup,
  getPartDetail,
  getPartModels,
  getPartMonthlyStats,
  getPartPurchaseHistory,
  getPartRelated,
  getPartSalesHistory,
  getPartStockHistory,
  getPartStockSettings,
  getPartStockSummary,
  listPartSearchPhotos,
  type PartPhotoMeta,
} from '@data/endpoints/nx01/part-search/api/part-search';
import type {
  PartCompatGroupDto,
  PartCompatMemberDto,
  PartDetailDto,
  PartModelRow,
  PartMonthlyStatsDto,
  PartPurchaseHistoryRow,
  PartRelatedRow,
  PartSalesHistoryDto,
  PartStockHistoryRow,
  PartStockSettingRow,
  PartStockSummaryDto,
  PartStockWarehouseRow,
} from '@data/types/nx01/part-search';
import { FocusLockedDialog } from '@design/primitives/focus-locked-dialog';
import { FocusZone } from '@design/primitives/focus-zone';
import { cn } from '@design/utils/cn';

import type { F2EntryContext } from './GlobalPartQuickSearch';

type Props = {
  partId: string;
  /** F2 三入口情境（Step 5、交接 §1 §4：銷售為錨／採購／倉管；倉別＝情境決定）*/
  entryContext?: F2EntryContext;
  /** 關閉主視窗、退回搜尋窗 */
  onBack: () => void;
  /** 整個關閉（搜尋窗也關）*/
  onClose: () => void;
  /** F2 報價流（2026-07-12 執行長拍板）：中欄下半「價格資訊」render prop（跟著預覽件切換）。
      design 層不 import nx04、由 features 注入（歷史價面板＋量價輸入）。*/
  renderPriceSection?: (args: {
    partId: string;
    code: string;
    name: string;
    available: number;
  }) => React.ReactNode;
  /** 標題旁附加內容（F2 報價流：客戶徽章＋已報數）*/
  headerExtra?: React.ReactNode;
  /** 右上角標（F1 預設「F1 · 庫存主視窗」）*/
  cornerBadge?: string;
  /** 開窗自動聚焦右欄第一列（F2 報價流傳 false：焦點給量價輸入）*/
  autoFocusCompat?: boolean;
  /** Alt+Q／「即時報價」鈕的覆寫動作（F2 報價流：開報價環節、不再開選客戶的單顆對話框）*/
  onQuoteAction?: () => void;
  /** 右欄卡片樣式（執行長 2026-07-12）：'quote'＝瘦身版（料號/品名/廠牌/庫存/建議售價）；預設 'stock' */
  compatVariant?: 'stock' | 'quote';
  /** 右欄每顆的建議售價（依客戶等級、features 端拿報價候選 API 餵；quote variant 用）*/
  compatExtras?: Record<string, { suggested: string | null }>;
  /** Alt+Q 報價環節（F2 報價流）：帶 Space 標記列、無標記帶目前選中列 */
  onQuoteMarked?: (rows: PartCompatMemberDto[]) => void;
  /** Alt+D 加入調貨清單：帶 Space 標記列、無標記帶目前選中列；
   *  右欄空（本料不屬任何通用件群組）退回主件本身——F1 查到缺貨料直接記調貨（2026-07-12 接通）*/
  onTransferMarked?: (rows: Array<Pick<PartCompatMemberDto, 'id' | 'code' | 'name'>>) => void;
  /** Alt+1/2/3 價格細節窗（F2 報價流：1=ABCD 價 2=該客戶紀錄 3=其他客戶紀錄）；ctx＝目前預覽件 */
  onAltDigit?: (n: 1 | 2 | 3, ctx: { partId: string; code: string }) => void;
};

// 執行長 2026-06-25 拍板的庫存四指標配色（KpiTile + WhTile 共用、視覺一致）
const STOCK_COLORS = {
  // 現有 = 跟主題走的前景色（原寫死 #E8E8EB 近白、淺色主題與背景同色看不到——執行長 2026-07-12 抓的）
  onHand: 'var(--foreground)',
  available: '#22D88F', // 可出 = 綠
  reserved: '#E26060', // 不可出 = 紅
  inTransit: '#FFB347', // 在途 = 橘
} as const;
const ZERO_GREY = '#5A5A60'; // 0 值弱化色

export function PartMainWindow({
  partId: initialPartId,
  entryContext,
  onBack,
  onClose,
  renderPriceSection,
  headerExtra,
  cornerBadge = 'F1 · 庫存主視窗',
  autoFocusCompat = true,
  onQuoteAction,
  compatVariant = 'stock',
  compatExtras,
  onQuoteMarked,
  onTransferMarked,
  onAltDigit,
}: Props) {
  // 主件：Alt+F 跳搜時切換
  const [mainPartId, setMainPartId] = useState(initialPartId);
  // 預覽：Enter 暫切（null = 顯示 mainPartId 自己）
  const [previewPartId, setPreviewPartId] = useState<string | null>(null);
  const effectivePartId = previewPartId ?? mainPartId;

  // 左中欄資料（隨 effectivePartId 變）
  const [detail, setDetail] = useState<PartDetailDto | null>(null);
  const [stock, setStock] = useState<PartStockSummaryDto | null>(null);
  const [stockSettings, setStockSettings] = useState<PartStockSettingRow[]>([]);
  const [photos, setPhotos] = useState<PartPhotoMeta[]>([]);
  const [leftLoading, setLeftLoading] = useState(false);

  // 右欄資料（隨 mainPartId 變、預覽不變）
  const [compatGroup, setCompatGroup] = useState<PartCompatGroupDto | null>(null);
  const [rightLoading, setRightLoading] = useState(false);

  // 右欄列表 highlight + focused side
  const [highlightIndex, setHighlightIndex] = useState(0);
  const compatListRef = useRef<HTMLDivElement>(null);
  const compatFirstRowRef = useRef<HTMLButtonElement>(null);

  // 標記（Space、執行長 2026-07-11）：Alt+Q 報價時有標記＝批次
  const [markedIds, setMarkedIds] = useState<Set<string>>(new Set());

  // 圖片放大（Alt+P、原 Space 讓位給標記）
  const [photoZoom, setPhotoZoom] = useState(false);

  // 快捷鍵說明（Alt+H / 右上「?」、取代底部提示列）
  const [helpOpen, setHelpOpen] = useState(false);

  // 各倉分布展開（Alt+W、localStorage 記憶、換料不縮回）
  const [whExpanded, setWhExpanded] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined') return localStorage.getItem('nx-f2-wh-bars') === '1';
    } catch {
      /* 讀不到走預設 */
    }
    return false;
  });
  const toggleWhExpanded = useCallback(() => {
    setWhExpanded((v) => {
      const next = !v;
      try {
        localStorage.setItem('nx-f2-wh-bars', next ? '1' : '0');
      } catch {
        /* 存不了不擋 */
      }
      return next;
    });
  }, []);
  // 情境倉（銷售選客戶/倉管入口）出現 → 自動展開（不寫記憶、手動 Alt+W 才寫）
  useEffect(() => {
    if (entryContext?.warehouseId || entryContext?.entry === 'warehouse') setWhExpanded(true);
  }, [entryContext?.warehouseId, entryContext?.entry]);

  // F2 改版 Step 4（交接 §5）：快捷鍵面板（Alt+5 周轉率 / Alt+6 出入庫；Alt+Q 報價走全域事件）
  // 可替代小面板已退役（與右欄同資料、2026-07-11 合併）；下鑽：Alt+8 銷貨比價
  // （2026-07-14 F 鍵清場：原 F5~F10 整排平移 Alt+5~0）
  const [quickPanel, setQuickPanel] = useState<QuickPanelKind | null>(null);
  // 出入庫紀錄 lazy 載（Alt+6、換料件清空重抓）
  const [historyRows, setHistoryRows] = useState<PartStockHistoryRow[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const historyReqRef = useRef(0);
  // 進銷月統計 lazy 載（F5 轉正、執行長 2026-07-11 拍板：後端全量聚合取代前端近 100 筆估算）
  const [monthlyStats, setMonthlyStats] = useState<PartMonthlyStatsDto | null>(null);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const monthlyReqRef = useRef(0);
  // 銷貨比價 lazy 載（Alt+8、換料件清空重抓）
  const [salesData, setSalesData] = useState<PartSalesHistoryDto | null>(null);
  const [salesLoading, setSalesLoading] = useState(false);
  const salesReqRef = useRef(0);
  // 進貨比價 lazy 載（Alt+9、換料件清空重抓）
  const [purchaseRows, setPurchaseRows] = useState<PartPurchaseHistoryRow[] | null>(null);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const purchaseReqRef = useRef(0);
  // 相關零件 + 適用車型 lazy 載（Alt+0 兩頁籤、開面板一次載齊、換料件清空重抓）
  const [relatedRows, setRelatedRows] = useState<PartRelatedRow[] | null>(null);
  const [modelRows, setModelRows] = useState<PartModelRow[] | null>(null);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const relatedReqRef = useRef(0);

  // race 防護
  const leftReqRef = useRef(0);
  const rightReqRef = useRef(0);

  // 載 detail / stock / photos（effectivePartId）
  useEffect(() => {
    const myReq = ++leftReqRef.current;
    setLeftLoading(true);
    void (async () => {
      try {
        const [d, s, g, p] = await Promise.all([
          getPartDetail(effectivePartId),
          getPartStockSummary(effectivePartId),
          // 庫存設定（水位條安全/最高量用）；未設定或失敗 → 空陣列、水位條退化顯示
          getPartStockSettings(effectivePartId).catch(() => ({ rows: [] as PartStockSettingRow[] })),
          listPartSearchPhotos(effectivePartId).catch(() => ({ rows: [] as PartPhotoMeta[] })),
        ]);
        if (leftReqRef.current !== myReq) return;
        setDetail(d);
        setStock(s);
        setStockSettings(g.rows);
        setPhotos(p.rows);
      } catch {
        if (leftReqRef.current !== myReq) return;
        setDetail(null);
        setStock(null);
        setStockSettings([]);
        setPhotos([]);
      } finally {
        if (leftReqRef.current === myReq) setLeftLoading(false);
      }
    })();
  }, [effectivePartId]);

  // 換料件：出入庫/銷貨比價/進貨比價快取失效、面板收起（避免顯示上一件的資料）
  useEffect(() => {
    setHistoryRows(null);
    setMonthlyStats(null);
    setSalesData(null);
    setPurchaseRows(null);
    setRelatedRows(null);
    setModelRows(null);
    setQuickPanel(null);
  }, [effectivePartId]);

  // Alt+6 面板開啟時 lazy 載出入庫紀錄（同料件共用快取；周轉率已改吃 monthly-stats）
  useEffect(() => {
    if (quickPanel !== 'history') return;
    if (historyRows !== null) return;
    const myReq = ++historyReqRef.current;
    setHistoryLoading(true);
    void (async () => {
      try {
        const r = await getPartStockHistory(effectivePartId);
        if (historyReqRef.current !== myReq) return;
        setHistoryRows(r.rows);
      } catch {
        if (historyReqRef.current !== myReq) return;
        setHistoryRows([]);
      } finally {
        if (historyReqRef.current === myReq) setHistoryLoading(false);
      }
    })();
  }, [quickPanel, historyRows, effectivePartId]);

  // F5 面板開啟時 lazy 載進銷月統計（同料件共用快取）
  useEffect(() => {
    if (quickPanel !== 'turnover') return;
    if (monthlyStats !== null) return;
    const myReq = ++monthlyReqRef.current;
    setMonthlyLoading(true);
    void (async () => {
      try {
        const r = await getPartMonthlyStats(effectivePartId);
        if (monthlyReqRef.current !== myReq) return;
        setMonthlyStats(r);
      } catch {
        if (monthlyReqRef.current !== myReq) return;
        setMonthlyStats({
          months: [],
          window: { out30: '0', out90: '0', in90: '0', outMoves90: '0' },
        });
      } finally {
        if (monthlyReqRef.current === myReq) setMonthlyLoading(false);
      }
    })();
  }, [quickPanel, monthlyStats, effectivePartId]);

  // Alt+8 面板開啟時 lazy 載銷貨比價（同料件共用快取）
  useEffect(() => {
    if (quickPanel !== 'sales') return;
    if (salesData !== null) return;
    const myReq = ++salesReqRef.current;
    setSalesLoading(true);
    void (async () => {
      try {
        const r = await getPartSalesHistory(effectivePartId);
        if (salesReqRef.current !== myReq) return;
        setSalesData(r);
      } catch {
        if (salesReqRef.current !== myReq) return;
        setSalesData({
          suggestedPrices: { cost: null, priceA: null, priceB: null, priceC: null, priceD: null },
          sales: [],
          quotes: [],
        });
      } finally {
        if (salesReqRef.current === myReq) setSalesLoading(false);
      }
    })();
  }, [quickPanel, salesData, effectivePartId]);

  // Alt+9 面板開啟時 lazy 載進貨比價（同料件共用快取）
  useEffect(() => {
    if (quickPanel !== 'purchase') return;
    if (purchaseRows !== null) return;
    const myReq = ++purchaseReqRef.current;
    setPurchaseLoading(true);
    void (async () => {
      try {
        const r = await getPartPurchaseHistory(effectivePartId);
        if (purchaseReqRef.current !== myReq) return;
        setPurchaseRows(r.rows);
      } catch {
        if (purchaseReqRef.current !== myReq) return;
        setPurchaseRows([]);
      } finally {
        if (purchaseReqRef.current === myReq) setPurchaseLoading(false);
      }
    })();
  }, [quickPanel, purchaseRows, effectivePartId]);

  // Alt+0 面板開啟時 lazy 載相關零件 + 適用車型（兩頁籤一次載齊、同料件共用快取）
  useEffect(() => {
    if (quickPanel !== 'related') return;
    if (relatedRows !== null && modelRows !== null) return;
    const myReq = ++relatedReqRef.current;
    setRelatedLoading(true);
    void (async () => {
      const [rel, mod] = await Promise.all([
        getPartRelated(effectivePartId).catch(() => ({ rows: [] as PartRelatedRow[] })),
        getPartModels(effectivePartId).catch(() => ({ rows: [] as PartModelRow[] })),
      ]);
      if (relatedReqRef.current !== myReq) return;
      setRelatedRows(rel.rows);
      setModelRows(mod.rows);
      setRelatedLoading(false);
    })();
  }, [quickPanel, relatedRows, modelRows, effectivePartId]);

  // 載 compat group（mainPartId、預覽不重抓）
  useEffect(() => {
    const myReq = ++rightReqRef.current;
    setRightLoading(true);
    setHighlightIndex(0);
    setMarkedIds(new Set()); // 換主件（新群組）→ 標記歸零
    void (async () => {
      try {
        const r = await getPartCompatGroup(mainPartId);
        if (rightReqRef.current !== myReq) return;
        // 取第一個 group（多 group 時、選與 mainPartId 直接相關的）
        // 規則：找含 mainPartId 為主件的 group；其次找含 mainPartId 為替代品的 group
        const firstWithMainAsPrimary = r.groups.find((g) => g.primary?.id === mainPartId);
        const firstWithMain =
          firstWithMainAsPrimary ?? r.groups.find((g) => g.alts.some((a) => a.id === mainPartId));
        setCompatGroup(firstWithMain ?? r.groups[0] ?? null);
      } catch {
        if (rightReqRef.current !== myReq) return;
        setCompatGroup(null);
      } finally {
        if (rightReqRef.current === myReq) setRightLoading(false);
      }
    })();
  }, [mainPartId]);

  // 右欄列表扁平：主件 always [0]、alts 接後
  const compatRows = useMemo<PartCompatMemberDto[]>(() => {
    if (!compatGroup) return [];
    const rows: PartCompatMemberDto[] = [];
    if (compatGroup.primary) rows.push(compatGroup.primary);
    rows.push(...compatGroup.alts);
    return rows;
  }, [compatGroup]);

  // 預覽某 row（Enter）
  const previewRow = useCallback((row: PartCompatMemberDto) => {
    setPreviewPartId(row.id === undefined ? null : row.id);
  }, []);

  // 跳搜：把 row 變新主件、清預覽（Alt+F）
  const jumpSearch = useCallback((row: PartCompatMemberDto) => {
    setMainPartId(row.id);
    setPreviewPartId(null);
    setHighlightIndex(0);
  }, []);

  // 切回主件（取消預覽）— 點主件 row 時觸發
  const clearPreview = useCallback(() => {
    setPreviewPartId(null);
  }, []);

  // 右欄動作 callbacks（row onKeyDown 與 FocusZone 容器共用）
  // 執行長 2026-07-11：↑↓ 選件時左欄基本資料 + 中欄庫存「即時跟隨」（不用再按 Enter）
  const compatSelectIndex = useCallback(
    (next: number) => {
      setHighlightIndex(next);
      focusCompatRow(next);
      const r = compatRows[next];
      if (r) setPreviewPartId(r.id === mainPartId ? null : r.id);
    },
    [compatRows, mainPartId],
  );
  const compatMoveDown = useCallback(() => {
    if (compatRows.length === 0) return;
    compatSelectIndex(Math.min(compatRows.length - 1, highlightIndex + 1));
  }, [compatRows.length, highlightIndex, compatSelectIndex]);
  const compatMoveUp = useCallback(() => {
    if (compatRows.length === 0) return;
    compatSelectIndex(Math.max(0, highlightIndex - 1));
  }, [compatRows.length, highlightIndex, compatSelectIndex]);
  const compatEnter = useCallback(() => {
    const r = compatRows[highlightIndex];
    if (!r) return;
    if (r.id === mainPartId) clearPreview();
    else previewRow(r);
  }, [compatRows, highlightIndex, mainPartId, clearPreview, previewRow]);
  const compatJumpSearch = useCallback(() => {
    const r = compatRows[highlightIndex];
    if (r) jumpSearch(r);
  }, [compatRows, highlightIndex, jumpSearch]);
  // Space 標記✓/取消（執行長 2026-07-11）：只在全域 keydown 處理、避免 row/zone 雙觸發
  const compatToggleMark = useCallback(() => {
    const r = compatRows[highlightIndex];
    if (!r) return;
    setMarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(r.id)) next.delete(r.id);
      else next.add(r.id);
      return next;
    });
  }, [compatRows, highlightIndex]);

  // row button onKeyDown（focus 在 row 時走這、FocusZone scope='space-only' 不接 row 冒泡）
  const handleCompatKey = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.nativeEvent.isComposing) return;
      if (compatRows.length === 0) return;

      if (e.altKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        e.stopPropagation();
        compatJumpSearch();
        return;
      }
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          compatMoveDown();
          break;
        case 'ArrowUp':
          e.preventDefault();
          compatMoveUp();
          break;
        case 'Enter':
          e.preventDefault();
          compatEnter();
          break;
        // Space 標記走全域 capture handler（避免與 row 雙觸發）
      }
    },
    [compatRows.length, compatMoveDown, compatMoveUp, compatEnter, compatJumpSearch],
  );

  // 即時報價（Alt+Q / 按鈕）：dispatch 事件，全域 GlobalInstantQuote 接（design 層不 import nx04）
  // 執行長 2026-07-11：右欄有 Space 標記 → 帶 items 陣列＝批次報價；無標記＝報當前件
  const fireInstantQuote = useCallback(() => {
    const marked = compatRows.filter((r) => markedIds.has(r.id));
    if (marked.length > 0) {
      window.dispatchEvent(
        new CustomEvent('nx-instant-quote', {
          detail: {
            partId: marked[0].id,
            code: marked[0].code,
            name: marked[0].name,
            items: marked.map((r) => ({ partId: r.id, code: r.code, name: r.name })),
          },
        }),
      );
      return;
    }
    window.dispatchEvent(
      new CustomEvent('nx-instant-quote', {
        detail: { partId: effectivePartId, code: detail?.code, name: detail?.name },
      }),
    );
  }, [compatRows, markedIds, effectivePartId, detail?.code, detail?.name]);

  // 「即時報價」鈕＝與 Alt+Q 同路由：F2 流走報價環節（標記列/選中列）、通用流走單顆/批次對話框
  const quoteButtonAction = useCallback(() => {
    if (onQuoteMarked) {
      const marked = compatRows.filter((r) => markedIds.has(r.id));
      const cur = compatRows[highlightIndex];
      const rows = marked.length > 0 ? marked : cur ? [cur] : [];
      if (rows.length > 0) onQuoteMarked(rows);
      return;
    }
    if (onQuoteAction) onQuoteAction();
    else fireInstantQuote();
  }, [onQuoteMarked, compatRows, markedIds, highlightIndex, onQuoteAction, fireInstantQuote]);

  // 即時詢價（Alt+7 / 按鈕）：dispatch 事件，全域 GlobalInstantInquiry 接（調貨側，挑同行）
  const fireInstantInquiry = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent('nx-instant-inquiry', {
        detail: { partId: effectivePartId, code: detail?.code, name: detail?.name },
      }),
    );
  }, [effectivePartId, detail?.code, detail?.name]);

  // 全域快捷鍵（任何地方按、除了 input/textarea）
  // 執行長 2026-07-11 S01 走查改版：Space=標記✓（原放大改 Alt+P）/ Alt+W 各倉分布 / Alt+H 說明
  // Alt+G 聚焦右欄通用零件（原 F3 小面板與右欄同資料、合併退役）；Alt+7 詢價（原 F7、2026-07-10 拍板）。
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.isComposing) return;
      const tgt = e.target;
      const isEditable =
        tgt instanceof HTMLInputElement ||
        tgt instanceof HTMLTextAreaElement ||
        (tgt instanceof HTMLElement && tgt.isContentEditable);
      if (isEditable) return;
      const togglePanel = (p: QuickPanelKind) =>
        setQuickPanel((cur) => (cur === p ? null : p));
      // Space 標記列（無標記＝目前選中列）——Alt+Q／Alt+D 共用
      const markedOrCurrent = () => {
        const marked = compatRows.filter((r) => markedIds.has(r.id));
        if (marked.length > 0) return marked;
        const cur = compatRows[highlightIndex];
        return cur ? [cur] : [];
      };
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const k = e.key.toLowerCase();
        if (k === 'p') {
          // Alt+P 放大零件圖（stopPropagation：不讓背景選單 accelerator 撿到）
          e.preventDefault();
          e.stopPropagation();
          setPhotoZoom((z) => !z);
        } else if (k === 'w') {
          // Alt+W 各倉分布展開/收合（記憶）
          e.preventDefault();
          e.stopPropagation();
          toggleWhExpanded();
        } else if (k === 'h') {
          // Alt+H 快捷鍵說明（引導精靈通用鍵）
          e.preventDefault();
          e.stopPropagation();
          setHelpOpen((v) => !v);
        } else if (k === '5') {
          // Alt+5 周轉率（原 F5、F5 讓給全域調貨詢價視窗——執行長 2026-07-12）
          e.preventDefault();
          e.stopPropagation();
          togglePanel('turnover');
        } else if (k === 'q' && onQuoteMarked) {
          // Alt+Q 報價環節（F2 報價流、執行長 2026-07-12）
          e.preventDefault();
          e.stopPropagation();
          const rows = markedOrCurrent();
          if (rows.length > 0) onQuoteMarked(rows);
        } else if (k === 'd' && onTransferMarked) {
          // Alt+D 加入調貨清單；右欄空（無通用件群組）退回主件本身
          e.preventDefault();
          e.stopPropagation();
          const rows = markedOrCurrent();
          if (rows.length > 0) onTransferMarked(rows);
          else if (detail) onTransferMarked([{ id: effectivePartId, code: detail.code, name: detail.name }]);
        } else if ((k === '1' || k === '2' || k === '3') && onAltDigit) {
          // Alt+1/2/3 價格細節窗（F2 報價流：ABCD／該客戶紀錄／其他客戶紀錄）
          e.preventDefault();
          e.stopPropagation();
          onAltDigit(Number(k) as 1 | 2 | 3, { partId: effectivePartId, code: detail?.code ?? '' });
        } else if (k === 'g') {
          // Alt+G 聚焦右欄通用零件（原 F3、2026-07-14 F 鍵清場：F 鍵只留全域保留鍵）
          e.preventDefault();
          e.stopPropagation();
          focusCompatRow(highlightIndex);
        } else if (k === '6') {
          // Alt+6~0 查價面板（原 F6~F10 整排平移、對齊 Alt+5 周轉率先例＝原 F5）
          e.preventDefault();
          e.stopPropagation();
          togglePanel('history');
        } else if (k === '7') {
          // Alt+7 即時詢價（原 F7、2026-07-10 拍板的詢價鍵）
          e.preventDefault();
          e.stopPropagation();
          fireInstantInquiry();
        } else if (k === '8') {
          e.preventDefault();
          e.stopPropagation();
          togglePanel('sales');
        } else if (k === '9') {
          e.preventDefault();
          e.stopPropagation();
          togglePanel('purchase');
        } else if (k === '0') {
          e.preventDefault();
          e.stopPropagation();
          togglePanel('related');
        }
        return; // 其他 Alt 組合放行（Alt+F 跳搜由右欄 row/zone 處理）
      }
      if (e.key === ' ' || e.code === 'Space') {
        // Space = 標記✓/取消（批次報價用）；只在這攔一次、row/zone 不再處理避免雙觸發
        e.preventDefault();
        compatToggleMark();
      }
      // 2026-07-14 F 鍵清場：F4（=Alt+Q 重複鍵）刪除；F3→Alt+G；F6~F10→Alt+6~0。
      // F 鍵全數還給瀏覽器／全域保留鍵（instant-workbench-keymap-plan.md §4.1）。
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [
    fireInstantQuote,
    fireInstantInquiry,
    compatToggleMark,
    toggleWhExpanded,
    highlightIndex,
    onQuoteAction,
    compatRows,
    markedIds,
    onQuoteMarked,
    onTransferMarked,
    onAltDigit,
    effectivePartId,
    detail?.code,
  ]);

  // 執行長 2026-06-25：開窗焦點永遠在右側通用零件、不去 Header「退回搜尋」按鈕。
  // 1. initialFocusRef={compatListRef} → mount 時先 focus FocusZone 容器（即使資料還沒載完、容器可 focus）
  // 2. compatRows 載入後 useEffect → 切到第一筆（主件）row、↑↓ 直接生效
  useEffect(() => {
    if (!autoFocusCompat) return; // F2 報價流：焦點留給量價輸入、不搶
    if (compatRows.length === 0) return;
    queueMicrotask(() => {
      const el = document.querySelector('[data-compat-row="0"]') as HTMLElement | null;
      el?.focus();
    });
  }, [compatRows.length, mainPartId, autoFocusCompat]);

  return (
    <FocusLockedDialog
      open
      onClose={onBack} // Esc → 退回搜尋窗（不是直接關全部）
      initialFocusRef={compatListRef}
      ariaLabel="料號主視窗"
      backdropClassName="bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      dialogClassName="flex flex-col rounded-2xl border border-border/60 bg-popover text-foreground shadow-[0_24px_70px_rgba(0,0,0,0.55),0_0_50px_-18px_rgba(232,160,32,0.22)] animate-in fade-in zoom-in-95 duration-200"
      dialogStyle={{ width: 'min(1400px, 96vw)', height: 'min(820px, 94vh)' }}
    >
      <>
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border/40 px-6 py-2.5">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-md border border-border/40 bg-background/40 px-2.5 py-1 text-xs text-muted-foreground hover:border-primary/55 hover:bg-secondary/60 hover:text-foreground"
            title="退回搜尋窗 (Esc)"
          >
            <ArrowLeft className="size-3.5" />
            退回搜尋
          </button>
          <span className="size-2 rounded-full bg-primary shadow-[0_0_10px_#02EDAB]" />
          <Package className="size-4 text-primary" />
          <h2 className="text-sm font-bold tracking-wide text-foreground">料號主視窗</h2>
          {previewPartId ? (
            <span className="ml-3 rounded border border-border/60 bg-secondary/20 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              預覽中
            </span>
          ) : null}
          {/* Step 5：情境倉徽章（倉別＝情境決定、交接 §4）*/}
          {entryContext?.warehouseId && (
            <span
              className="ml-2 inline-flex items-center gap-1 rounded border border-primary/50 bg-primary/12 px-2 py-0.5 text-[11px] text-primary"
              title={`${entryContext.label ?? '情境倉'}：依入口情境帶入`}
            >
              <Pin className="size-3" />
              {entryContext.label ?? '情境倉'}
              <span className="font-mono">
                {entryContext.warehouseName ?? entryContext.warehouseId}
              </span>
            </span>
          )}
          {/* 即時詢價原 F7（2026-07-10 拍板）→ Alt+7（2026-07-14 F 鍵清場）*/}
          <button
            type="button"
            onClick={fireInstantInquiry}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-border/55 bg-background/40 px-2.5 py-1 text-xs font-medium text-foreground hover:border-primary/55 hover:bg-secondary/60"
            title="即時詢價（調貨、Alt+7）"
          >
            即時詢價
            <kbd className="rounded border border-border/40 bg-muted/40 px-1 py-px font-mono text-[10px]">Alt+7</kbd>
          </button>
          <button
            type="button"
            onClick={quoteButtonAction}
            className="inline-flex items-center gap-1.5 rounded-md border border-primary/55 bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/25"
            title="即時報價 (Alt+Q)"
          >
            即時報價
            <kbd className="rounded border border-primary/40 bg-primary/10 px-1 py-px font-mono text-[10px]">Alt+Q</kbd>
          </button>
          {headerExtra}
          <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground/60">
            {cornerBadge}
          </span>
          {/* 快捷鍵說明（Alt+H）：底部提示列收攏至此（執行長 2026-07-11）*/}
          <button
            type="button"
            onClick={() => setHelpOpen((v) => !v)}
            className="ml-1 rounded-md border border-border/40 bg-background/40 p-1 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            aria-label="快捷鍵說明"
            title="快捷鍵說明 (Alt+H)"
          >
            <HelpCircle className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="ml-1 rounded-md border border-border/40 bg-background/40 p-1 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            aria-label="關閉全部"
            title="關閉全部"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* 三欄（Step 1：基本資訊加大 → 左欄配比 1fr→1.25fr）*/}
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(340px,1.25fr)_minmax(300px,1fr)_minmax(340px,1.2fr)]">
          {/* 左欄：基本資料 + 縮圖 */}
          <LeftColumn
            detail={detail}
            photos={photos}
            loading={leftLoading}
            previewActive={!!previewPartId}
            onZoomToggle={() => setPhotoZoom((z) => !z)}
          />

          {/* 中欄：公司總存貨（不分倉）；各倉分布 Alt+W 展開/收合（記憶）、情境倉自動展開；
              F2 報價流（2026-07-12）：下半掛「價格資訊」slot（跟著預覽件）*/}
          <CompanyStockColumn
            stock={stock}
            settings={stockSettings}
            loading={leftLoading}
            contextWarehouseId={entryContext?.warehouseId}
            contextLabel={entryContext?.label}
            whExpanded={whExpanded}
            onToggleWh={toggleWhExpanded}
            priceSection={
              renderPriceSection
                ? renderPriceSection({
                    partId: effectivePartId,
                    code: detail?.code ?? '',
                    name: detail?.name ?? '',
                    available: Number(stock?.company.available ?? 0),
                  })
                : undefined
            }
          />

          {/* 右欄：通用零件（＝可替代件、執行長 2026-07-11 合併；2026-07-12 quote 瘦身版）*/}
          <RightColumn
            group={compatGroup}
            rows={compatRows}
            mainPartId={mainPartId}
            effectivePartId={effectivePartId}
            highlightIndex={highlightIndex}
            markedIds={markedIds}
            variant={compatVariant}
            extras={compatExtras}
            onHover={(idx) => setHighlightIndex(idx)}
            onKeyDown={handleCompatKey}
            onClickRow={(row) => {
              if (row.id === mainPartId) clearPreview();
              else previewRow(row);
            }}
            loading={rightLoading}
            firstRowRef={compatFirstRowRef}
            listRef={compatListRef}
            zoneCallbacks={{
              onArrowDown: compatMoveDown,
              onArrowUp: compatMoveUp,
              onEnter: compatEnter,
              onAltF: compatJumpSearch,
            }}
          />
        </div>

        {/* 底部提示列已退役：快捷鍵說明收進右上「?」/ Alt+H（執行長 2026-07-11）*/}

        {/* 圖片放大 Lightbox（疊在最上層）*/}
        {photoZoom && photos.length > 0 && (
          <PhotoZoomOverlay
            partId={effectivePartId}
            photos={photos}
            onClose={() => setPhotoZoom(false)}
          />
        )}

        {/* Step 4：快捷鍵面板（Alt+5~0、疊在視窗 2 上、Esc 或同鍵關）
            下鑽：Alt+8 銷貨比價 */}
        {/* 快捷鍵說明（Alt+H / 右上「?」）*/}
        {helpOpen && <ShortcutHelpOverlay onClose={() => setHelpOpen(false)} />}

        {quickPanel && (
          <QuickPanelOverlay
            kind={quickPanel}
            partCode={detail?.code ?? ''}
            historyRows={historyRows}
            historyLoading={historyLoading}
            monthlyStats={monthlyStats}
            monthlyLoading={monthlyLoading}
            companyOnHand={Number(stock?.company.onHand ?? 0)}
            salesData={salesData}
            salesLoading={salesLoading}
            purchaseRows={purchaseRows}
            purchaseLoading={purchaseLoading}
            relatedRows={relatedRows}
            modelRows={modelRows}
            relatedLoading={relatedLoading}
            onClose={() => setQuickPanel(null)}
          />
        )}
      </>
    </FocusLockedDialog>
  );
}

function focusCompatRow(index: number) {
  const el = document.querySelector(`[data-compat-row="${index}"]`) as HTMLElement | null;
  if (!el) return;
  el.scrollIntoView({ block: 'nearest' });
  el.focus();
}

// ─── 左欄 ────────────────────────────────────────────────
function LeftColumn({
  detail,
  photos,
  loading,
  previewActive,
  onZoomToggle,
}: {
  detail: PartDetailDto | null;
  photos: PartPhotoMeta[];
  loading: boolean;
  previewActive: boolean;
  onZoomToggle: () => void;
}) {
  const v = (s: string | null | undefined) => (s && s.trim() ? s : '—');
  // 執行長 2026-07-11 S01 走查：代碼＝名稱時不重複顯示（BOSCH · BOSCH → BOSCH）
  const codeName = (o: { code: string; name: string } | null | undefined) =>
    !o ? '—' : o.code === o.name ? o.name : `${o.code} · ${o.name}`;
  const mainPhoto = photos[0];

  return (
    <aside className="flex min-h-0 flex-col border-r border-border/40 bg-background/30">
      <SectionHeader icon={<Package className="size-3.5" />} label="基本資料" loading={loading} />
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto px-5 py-4">
        {/* 縮圖（Space 放大）*/}
        <button
          type="button"
          onClick={onZoomToggle}
          className={cn(
            // Step 1：基本資訊卡加大面積（交接 §6）→ 縮圖 220 → 280
            'group relative mx-auto flex aspect-square w-full max-w-[280px] items-center justify-center overflow-hidden rounded-lg border-2 bg-background/40 transition-colors',
            previewActive ? 'border-border/55' : 'border-primary/35',
            'hover:border-primary',
          )}
          title="Alt+P 放大"
        >
          {detail && mainPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={buildPartSearchPhotoUrl(detail.id, mainPhoto.id)}
              alt={mainPhoto.origFilename ?? detail.name}
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

        {/* 文字資料（執行長 2026-07-11 S01 走查去重：
            廠牌/族群同碼不重複、正副廠只留文字、狀態列移除——停用時料號旁補徽章即可）*/}
        <div className="flex flex-col gap-1.5">
          <DataRow
            label="基準料號"
            value={detail?.code ?? '—'}
            mono
            primary
            badge={detail && !detail.isActive ? 'inactive' : undefined}
          />
          <DataRow label="廠牌料號" value={v(detail?.secCode)} mono />
          <DataRow label="品名" value={detail?.name ?? '—'} />
          <DataRow label="廠牌" value={codeName(detail?.brand)} />
          <DataRow label="族群" value={codeName(detail?.partGroup)} />
          <DataRow label="正/副廠" value={detail ? (detail.isOem ? '正廠' : '副廠') : '—'} />
          <DataRow label="規格備註" value={v(detail?.spec)} />
        </div>
      </div>
    </aside>
  );
}

// ─── 中欄：公司總存貨 ─────────────────────────────────────
// F2 改版 Step 1（交接 §3 §6）：預設頁不分倉、只答「公司到底有沒有貨」。
//   · 大狀態：有貨可出（可出 ≥ 安全）／低於安全（0 < 可出 < 安全）／缺貨（可出 ≤ 0）
//     未設定安全量時：可出 > 0 即視為有貨可出
//   · 三指標：總可出（主角）／總庫存／在途
//   · 水位條一條看懂：安全量 ─ 現量 ─ 最高量（各倉庫存設定 min/max 加總）
//   · 各倉分布已自預設頁移除（執行長拍板：那是過度設計；倉別由入口情境決定）
type CompanyStockStatus = 'ok' | 'low' | 'out';

const STATUS_META: Record<
  CompanyStockStatus,
  { label: string; sub: string; color: string }
> = {
  ok: { label: '有貨可出', sub: '公司可出量充足', color: STOCK_COLORS.available },
  low: { label: '低於安全', sub: '可出量低於安全庫存', color: STOCK_COLORS.inTransit },
  out: { label: '缺貨', sub: '公司無可出庫存', color: STOCK_COLORS.reserved },
};

function CompanyStockColumn({
  stock,
  settings,
  loading,
  contextWarehouseId,
  contextLabel,
  whExpanded,
  onToggleWh,
  priceSection,
}: {
  stock: PartStockSummaryDto | null;
  settings: PartStockSettingRow[];
  loading: boolean;
  /** Step 5：情境倉（銷售=客戶預設出貨倉）→ 各倉分布 pin 頂 + 徽章 */
  contextWarehouseId?: string;
  contextLabel?: string;
  /** 各倉分布展開（Alt+W、父層記憶、執行長 2026-07-11）*/
  whExpanded: boolean;
  onToggleWh: () => void;
  /** F2 報價流（2026-07-12）：中欄下半「價格資訊」（歷史報價/成交＋量價輸入、features 注入）*/
  priceSection?: React.ReactNode;
}) {
  const company = stock?.company;
  const onHand = Number(company?.onHand ?? 0);
  const available = Number(company?.available ?? 0);
  const inTransit = Number(company?.inTransit ?? 0);

  // 公司層安全/最高 = 各倉庫存設定加總（設定為每倉一筆、無公司層欄位；0 = 未設定）
  const safetyQty = settings.reduce((sum, s) => sum + Number(s.minQty || 0), 0);
  const maxQty = settings.reduce((sum, s) => sum + Number(s.maxQty || 0), 0);

  const status: CompanyStockStatus =
    available <= 0 ? 'out' : safetyQty > 0 && available < safetyQty ? 'low' : 'ok';
  const meta = STATUS_META[status];

  return (
    <section className="flex min-h-0 flex-col border-r border-border/40 bg-background/20">
      <SectionHeader
        icon={<Warehouse className="size-3.5" />}
        label={priceSection ? '庫存資訊' : '公司總存貨'}
        loading={loading}
      />
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-5 py-4">
        {/* 大狀態（視覺主角）*/}
        <div
          className="flex shrink-0 flex-col items-center gap-1 rounded-lg border-2 px-4 py-5"
          style={{
            borderColor: `${meta.color}88`,
            backgroundColor: `${meta.color}14`,
            boxShadow: `0 0 24px -8px ${meta.color}66`,
          }}
        >
          <span className="text-[26px] font-bold tracking-[0.12em]" style={{ color: meta.color }}>
            {stock ? meta.label : '—'}
          </span>
          <span className="text-[12px] text-muted-foreground/85">
            {stock ? meta.sub : '庫存資料載入中'}
          </span>
        </div>

        {/* 三指標：總可出（主角）／總庫存／在途 */}
        <div className="grid shrink-0 grid-cols-3 gap-2">
          <KpiTile label="總可出" value={company?.available} color={STOCK_COLORS.available} />
          <KpiTile label="總庫存" value={company?.onHand} color={STOCK_COLORS.onHand} />
          <KpiTile label="在途" value={company?.inTransit} color={STOCK_COLORS.inTransit} />
        </div>

        {/* 公司庫存水位條：安全量 ─ 現量 ─ 最高量 */}
        <CompanyWaterLevelBar
          onHand={onHand}
          safetyQty={safetyQty}
          maxQty={maxQty}
          statusColor={meta.color}
          hasData={!!stock}
        />

        {/* 在途補充（有在途才顯示、避免版面死空）*/}
        {inTransit > 0 && (
          <p className="shrink-0 text-[12px] text-muted-foreground/75">
            另有 <span className="font-mono" style={{ color: STOCK_COLORS.inTransit }}>{inTransit.toFixed(0)}</span> 件在途（採購已下單未入庫）
          </p>
        )}

        {/* Step 3：各倉分布橫向長條（Alt+W 展開/收合、父層記憶換料不縮回）
            Step 5：情境倉 pin 頂＋徽章；情境入口自動展開（父層 effect）*/}
        <WarehouseBarsSection
          warehouses={stock?.warehouses ?? []}
          contextWarehouseId={contextWarehouseId}
          contextLabel={contextLabel}
          expanded={whExpanded}
          onToggle={onToggleWh}
        />
      </div>

      {/* F2 報價流（2026-07-12 執行長拍板）：中欄下半＝價格資訊（歷史報價/成交＋量價輸入）*/}
      {priceSection ? (
        <>
          <SectionHeader icon={<Package className="size-3.5" />} label="價格資訊" />
          <div className="max-h-[52%] shrink-0 overflow-auto border-t border-border/35 px-4 py-3">
            {priceSection}
          </div>
        </>
      ) : null}
    </section>
  );
}

// ─── 各倉分布橫向長條（F2 Step 3、交接 §6）──────────────────
// · 長條資料驅動可長可短：長度 ∝ 該倉現有量 / 各倉最大現有量
// · 條內分段：可出（綠）+ 不可出（紅）= 現有；在途以數字附註
// · 本倉（isPrimary）pin 頂 + 徽章；空倉折疊沿用「其他 N 倉無庫存 ▾」機制（本倉零庫存仍顯示、弱化）
// · 一屏軟上限 8 倉：清單 max-height 內部捲動、不硬砍資料
const WH_BARS_SOFT_CAP = 8;
const WH_BAR_ROW_PX = 34;

function WarehouseBarsSection({
  warehouses,
  contextWarehouseId,
  contextLabel,
  expanded,
  onToggle,
}: {
  warehouses: PartStockWarehouseRow[];
  contextWarehouseId?: string;
  contextLabel?: string;
  /** 展開狀態受控（父層 Alt+W + localStorage 記憶、執行長 2026-07-11：換料不縮回）*/
  expanded: boolean;
  onToggle: () => void;
}) {
  const [showZeros, setShowZeros] = useState(false);

  const isAllZero = (w: PartStockWarehouseRow) =>
    Number(w.onHand) === 0 &&
    Number(w.available) === 0 &&
    Number(w.reserved) === 0 &&
    Number(w.inTransit) === 0;

  // pin 順序：情境倉（Step 5、如客戶預設出貨倉）→ 本倉（isPrimary）→ 其餘依 API 排序 sortNo；
  // 情境倉/本倉即使空倉也不進折疊區
  const { pinnedRows, zeroRows, maxOnHand } = useMemo(() => {
    const isCtx = (w: PartStockWarehouseRow) => w.warehouseId === contextWarehouseId;
    const visible = warehouses.filter((w) => isCtx(w) || w.isPrimary || !isAllZero(w));
    const zeros = warehouses.filter((w) => !isCtx(w) && !w.isPrimary && isAllZero(w));
    const rank = (w: PartStockWarehouseRow) => (isCtx(w) ? 2 : w.isPrimary ? 1 : 0);
    const sorted = [...visible].sort((a, b) => rank(b) - rank(a));
    const max = Math.max(...warehouses.map((w) => Number(w.onHand)), 1);
    return { pinnedRows: sorted, zeroRows: zeros, maxOnHand: max };
  }, [warehouses, contextWarehouseId]);

  if (warehouses.length === 0) return null;

  return (
    <div className="flex shrink-0 flex-col gap-1.5">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1.5 text-left text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70 transition-colors hover:text-foreground"
      >
        {expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        各倉分布
        <span className="font-mono normal-case tracking-normal">({warehouses.length} 倉)</span>
        <Kbd>Alt+W</Kbd>
      </button>

      {expanded && (
        <div
          className="flex flex-col gap-1 overflow-y-auto pr-0.5"
          style={{ maxHeight: WH_BARS_SOFT_CAP * WH_BAR_ROW_PX }}
        >
          {pinnedRows.map((w) => (
            <WarehouseBar
              key={w.warehouseId}
              w={w}
              maxOnHand={maxOnHand}
              dimmed={isAllZero(w)}
              contextLabel={w.warehouseId === contextWarehouseId ? (contextLabel ?? '情境倉') : undefined}
            />
          ))}

          {zeroRows.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setShowZeros((v) => !v)}
                className="flex items-center gap-1.5 py-1 text-left text-[12px] text-muted-foreground/85 transition-colors hover:text-foreground"
              >
                {showZeros ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                其他 <span className="font-mono">{zeroRows.length}</span> 倉無庫存
              </button>
              {showZeros &&
                zeroRows.map((w) => (
                  <WarehouseBar key={w.warehouseId} w={w} maxOnHand={maxOnHand} dimmed />
                ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function WarehouseBar({
  w,
  maxOnHand,
  dimmed,
  contextLabel,
}: {
  w: PartStockWarehouseRow;
  maxOnHand: number;
  dimmed?: boolean;
  /** Step 5：此倉為情境倉時的徽章文字（如「客戶倉」）*/
  contextLabel?: string;
}) {
  const onHand = Number(w.onHand);
  const available = Number(w.available);
  const reserved = Number(w.reserved);
  const inTransit = Number(w.inTransit);
  const barPct = Math.min(100, (onHand / maxOnHand) * 100);
  const availPct = onHand > 0 ? (available / onHand) * 100 : 0;

  return (
    <div className={cn('flex flex-col gap-0.5', dimmed && 'opacity-55')}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex min-w-0 items-baseline gap-1.5 truncate text-[12px]">
          {contextLabel && (
            <span
              className="inline-flex shrink-0 items-center gap-0.5 rounded border border-primary/55 bg-primary/15 px-1 py-px font-mono text-[10px] font-bold text-primary"
              title={`${contextLabel}（依入口情境帶入）`}
            >
              <Pin className="size-2.5" />
              {contextLabel}
            </span>
          )}
          {w.isPrimary && (
            <span
              className="inline-flex shrink-0 items-center gap-0.5 rounded border border-primary/55 bg-primary/15 px-1 py-px font-mono text-[10px] font-bold text-primary"
              title="本倉（我的主要倉）"
            >
              <Pin className="size-2.5" />本倉
            </span>
          )}
          <span className="font-mono font-medium text-primary">{w.warehouseCode}</span>
          <span className="truncate text-foreground/85">{w.warehouseName}</span>
        </span>
        <span className="shrink-0 font-mono text-[12px] tabular-nums">
          <span style={{ color: available > 0 ? STOCK_COLORS.available : ZERO_GREY }}>
            {available.toFixed(0)}
          </span>
          <span className="text-muted-foreground/45"> / {onHand.toFixed(0)}</span>
          {inTransit > 0 && (
            <span style={{ color: STOCK_COLORS.inTransit }} title="在途">
              {' '}+{inTransit.toFixed(0)}
            </span>
          )}
        </span>
      </div>
      {/* 長條：可出（綠）+ 不可出（紅）分段、長度資料驅動 */}
      <div className="h-2 overflow-hidden rounded-sm bg-secondary/55">
        <div className="flex h-full" style={{ width: `${barPct}%` }}>
          <div style={{ width: `${availPct}%`, backgroundColor: STOCK_COLORS.available }} />
          {reserved > 0 && (
            <div style={{ width: `${100 - availPct}%`, backgroundColor: STOCK_COLORS.reserved }} />
          )}
        </div>
      </div>
    </div>
  );
}

// 水位條：0 ──[安全]────現量▮──────[最高] 一條看懂（交接 §6）
// 未設定安全/最高（皆 0）→ 只畫現量、附「未設定安全量」註記
function CompanyWaterLevelBar({
  onHand,
  safetyQty,
  maxQty,
  statusColor,
  hasData,
}: {
  onHand: number;
  safetyQty: number;
  maxQty: number;
  statusColor: string;
  hasData: boolean;
}) {
  // 刻度上限：最高量為主；現量爆錶（超過最高）或未設定時退化取現量，再退 1 防除以 0
  const scale = Math.max(maxQty, onHand, safetyQty, 1);
  const pct = (n: number) => `${Math.min(100, (n / scale) * 100)}%`;
  const hasSettings = safetyQty > 0 || maxQty > 0;

  return (
    <div className="flex shrink-0 flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <h4 className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
          公司庫存水位
        </h4>
        {!hasSettings && hasData && (
          <span className="text-[10px] text-muted-foreground/55">未設定安全量／最高量</span>
        )}
      </div>

      <div className="relative h-7 overflow-hidden rounded-md border border-border/50 bg-secondary/55">
        {/* 現量填色 */}
        <div
          className="absolute inset-y-0 left-0 transition-[width] duration-300"
          style={{ width: pct(onHand), backgroundColor: `${statusColor}40` }}
        />
        {/* 安全量刻線 */}
        {safetyQty > 0 && (
          <div
            className="absolute inset-y-0 w-px"
            style={{ left: pct(safetyQty), backgroundColor: STOCK_COLORS.reserved }}
            title={`安全量 ${safetyQty}`}
          />
        )}
        {/* 現量數字（貼填色右緣、靠左防溢出）*/}
        <span
          className="absolute top-1/2 -translate-y-1/2 pl-2 font-mono text-[13px] font-semibold tabular-nums"
          style={{ color: statusColor }}
        >
          {hasData ? onHand.toFixed(0) : '—'}
        </span>
      </div>

      {/* 底部圖例：安全 ─ 現量 ─ 最高 */}
      <div className="flex items-baseline justify-between font-mono text-[11px] tabular-nums">
        <span style={{ color: STOCK_COLORS.reserved }}>
          安全 {safetyQty > 0 ? safetyQty.toFixed(0) : '—'}
        </span>
        <span className="text-muted-foreground/70">
          最高 {maxQty > 0 ? maxQty.toFixed(0) : '—'}
        </span>
      </div>
    </div>
  );
}

// ─── 右欄 ────────────────────────────────────────────────
function RightColumn({
  group,
  rows,
  mainPartId,
  effectivePartId,
  highlightIndex,
  markedIds,
  variant = 'stock',
  extras,
  onHover,
  onKeyDown,
  onClickRow,
  loading,
  firstRowRef,
  listRef,
  zoneCallbacks,
}: {
  group: PartCompatGroupDto | null;
  rows: PartCompatMemberDto[];
  mainPartId: string;
  effectivePartId: string;
  highlightIndex: number;
  /** Space 標記（批次報價用、執行長 2026-07-11）*/
  markedIds: Set<string>;
  /** 卡片樣式：'quote'＝瘦身版（執行長 2026-07-12）*/
  variant?: 'stock' | 'quote';
  /** 每顆建議售價（quote variant、依客戶等級）*/
  extras?: Record<string, { suggested: string | null }>;
  onHover: (idx: number) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
  onClickRow: (row: PartCompatMemberDto) => void;
  loading: boolean;
  firstRowRef: React.RefObject<HTMLButtonElement | null>;
  listRef: React.RefObject<HTMLDivElement | null>;
  /** 軌 2 FocusZone callbacks（容器接的方向鍵、點 row 間空白後仍 work；Space 走全域）*/
  zoneCallbacks: {
    onArrowDown: () => void;
    onArrowUp: () => void;
    onEnter: () => void;
    onAltF: () => void;
  };
}) {
  // FocusZone 容器 onKeyDown（接 Alt+F 等非標準 callback 鍵；Space 標記走全域 capture）
  const handleZoneKey = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.altKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        e.stopPropagation();
        zoneCallbacks.onAltF();
      }
    },
    [zoneCallbacks],
  );

  return (
    <section className="flex min-h-0 flex-col bg-background/15">
      <SectionHeader
        icon={<Package className="size-3.5" />}
        label="通用零件（可替代）"
        sublabel={group ? `${group.groupCode} · ${group.groupName}` : '本料件無通用件群組'}
        loading={loading}
      />
      <FocusZone
        ref={listRef}
        className="min-h-0 flex-1 overflow-auto px-3 py-3"
        onArrowDown={zoneCallbacks.onArrowDown}
        onArrowUp={zoneCallbacks.onArrowUp}
        onEnter={zoneCallbacks.onEnter}
        onKeyDown={handleZoneKey}
        role="listbox"
        ariaLabel="通用零件清單"
      >
        {rows.length === 0 ? (
          <div className="flex h-full min-h-[200px] items-center justify-center px-6 text-center text-sm text-muted-foreground/60">
            <span>本料件未屬於任何通用件群組</span>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((row, idx) => {
              const isMain = row.id === mainPartId;
              const isPreviewTarget = !isMain && row.id === effectivePartId;
              return (
                <li key={row.id}>
                  <CompatCard
                    row={row}
                    index={idx}
                    isMain={isMain}
                    isPreviewTarget={isPreviewTarget}
                    isHighlighted={idx === highlightIndex}
                    isMarked={markedIds.has(row.id)}
                    variant={variant}
                    suggested={extras?.[row.id]?.suggested ?? null}
                    onHover={() => onHover(idx)}
                    onKeyDown={onKeyDown}
                    onClick={() => onClickRow(row)}
                    rowRef={idx === 0 ? firstRowRef : undefined}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </FocusZone>
    </section>
  );
}

function CompatCard({
  row,
  index,
  isMain,
  isPreviewTarget,
  isHighlighted,
  isMarked,
  variant = 'stock',
  suggested,
  onHover,
  onKeyDown,
  onClick,
  rowRef,
}: {
  row: PartCompatMemberDto;
  index: number;
  isMain: boolean;
  isPreviewTarget: boolean;
  isHighlighted: boolean;
  /** Space 標記✓（批次報價、執行長 2026-07-11）*/
  isMarked: boolean;
  /** 'quote'＝瘦身版：料號/品名/廠牌/庫存/建議售價（執行長 2026-07-12、其餘細節看左欄）*/
  variant?: 'stock' | 'quote';
  /** 建議售價（quote variant、依客戶等級＝該客戶地板價）*/
  suggested?: string | null;
  onHover: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
  onClick: () => void;
  rowRef?: React.RefObject<HTMLButtonElement | null>;
}) {
  const onHand = Number(row.onHandTotal);
  const outOfStock = onHand <= 0;
  return (
    <button
      ref={rowRef}
      type="button"
      data-compat-row={index}
      onClick={onClick}
      onMouseEnter={onHover}
      onKeyDown={onKeyDown}
      className={cn(
        'relative flex w-full flex-col gap-1.5 overflow-hidden rounded-xl bg-secondary/60 px-4 py-3 text-left outline-none',
        'border-2 transition-[border-color,box-shadow,background-color] duration-150 ease-out',
        // 執行長 2026-07-11 S01 走查：只有「選中列」亮金框（主件不再恆亮、只留「主」徽章）
        isHighlighted
          ? 'border-primary bg-primary/12 shadow-[0_0_12px_-2px_rgba(232,160,32,0.45)]'
          : isMain
            ? 'border-primary/45 bg-primary/[0.06]'
            : isPreviewTarget
              ? 'border-muted-foreground bg-secondary/15'
              : 'border-border/35 bg-secondary/40 hover:border-primary/55 hover:bg-secondary/75',
        // Space 標記✓：綠色外圈（與金框選中互不干擾）
        isMarked && 'ring-2 ring-[#22D88F]/70',
        !row.isActive && 'opacity-55',
      )}
    >
      {/* 上排：料號 + 徽章 */}
      <div className="flex items-baseline justify-between gap-3">
        <span
          className={cn(
            'min-w-0 flex-1 break-all font-mono font-semibold tracking-[0.01em]',
            isMain ? 'text-[17px] text-primary' : 'text-[15px] text-primary/90',
          )}
        >
          {row.code}
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          {isMarked && (
            <span
              className="inline-flex items-center rounded-md border border-[#22D88F]/70 bg-[#22D88F]/15 px-1.5 py-0.5 font-mono text-[11px] font-bold text-[#22D88F]"
              title="已標記（F4 批次報價）"
            >
              <Check className="size-3" />
            </span>
          )}
          {isMain ? (
            <span className="rounded-md border border-primary bg-primary/25 px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-primary">
              主
            </span>
          ) : (
            <span className="rounded-md border border-border/60 bg-secondary/25 px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              替代
            </span>
          )}
          {variant === 'stock' && (
            <span
              className={cn(
                'rounded-md border px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-[0.08em]',
                row.isOem
                  ? 'border-primary/55 bg-primary/15 text-primary'
                  : 'border-border/55 bg-muted/35 text-muted-foreground/95',
              )}
            >
              {row.isOem ? '正廠' : '副廠'}
            </span>
          )}
        </div>
      </div>

      {/* 中排：品名 */}
      <div className="break-words text-[15px] font-medium leading-snug text-foreground">{row.name}</div>

      {/* 下排：
          stock＝副廠料號 / 廠牌 / 即時庫存
          quote＝廠牌 / 庫存 / 建議售價（執行長 2026-07-12 瘦身：其餘細節看左欄）*/}
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="inline-flex items-baseline gap-3">
          {variant === 'stock' && (
            <>
              <span className="inline-flex items-baseline gap-1.5">
                <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground/75">副廠</span>
                <span className="font-mono text-[13px] text-foreground/90">{row.secCode ?? '—'}</span>
              </span>
              <span className="select-none text-muted-foreground/30">·</span>
            </>
          )}
          <span className="inline-flex items-baseline gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground/75">廠牌</span>
            <span className="text-[13px] text-foreground/90">{row.brandCode ?? row.brandName ?? '—'}</span>
          </span>
        </span>
        <span className="inline-flex items-baseline gap-2">
          <span
            className={cn(
              'inline-flex items-baseline gap-1.5 rounded-md px-2.5 py-0.5 font-mono text-[14px] font-semibold',
              outOfStock
                ? 'border border-destructive/60 bg-destructive/10 text-destructive'
                : 'border border-[#22D88F]/40 bg-[#22D88F]/10 text-[#22D88F]',
            )}
            title={`公司總現有量 ${row.onHandTotal}`}
          >
            <span className="text-[10px] font-medium uppercase tracking-[0.1em] opacity-75">庫存</span>
            {row.onHandTotal}
            {outOfStock ? '（缺）' : ''}
          </span>
          {variant === 'quote' && (
            <span
              className="inline-flex items-baseline gap-1.5 rounded-md border border-primary/45 bg-primary/10 px-2.5 py-0.5 font-mono text-[14px] font-semibold text-primary"
              title="建議售價（依客戶等級＝此客戶地板價）"
            >
              <span className="text-[10px] font-medium uppercase tracking-[0.1em] opacity-75">建議</span>
              {suggested ?? '—'}
            </span>
          )}
        </span>
      </div>
    </button>
  );
}

// ─── 共用小元件 ──────────────────────────────────────────
function SectionHeader({
  icon,
  label,
  sublabel,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  loading?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-border/35 bg-background/25 px-5 py-2.5 text-[12px] font-medium uppercase tracking-[0.16em] text-muted-foreground/90">
      <span className="text-primary">{icon}</span>
      <span>{label}</span>
      {sublabel ? (
        <span className="ml-1 text-[12px] normal-case tracking-normal text-muted-foreground/75">
          · {sublabel}
        </span>
      ) : null}
      {loading ? <Loader2 className="ml-auto size-3.5 animate-spin text-primary" /> : null}
    </div>
  );
}

function KpiTile({
  label,
  value,
  color,
  exact,
}: {
  label: string;
  value: string | undefined;
  color: string;
  /** true = 值原樣顯示（含小數／'—'、F5 周轉率用）；預設取整 */
  exact?: boolean;
}) {
  const n = value ? Number(value) : 0;
  const isZero = !value || value === '—' || n === 0;
  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-border/55 bg-secondary px-3 py-2 shadow-sm">
      <span className="text-[12px] font-medium uppercase tracking-[0.1em] text-foreground/60">
        {label}
      </span>
      <span className="font-mono text-[20px] font-semibold" style={{ color: isZero ? ZERO_GREY : color }}>
        {exact ? (value ?? '—') : n.toFixed(0)}
      </span>
    </div>
  );
}

function DataRow({
  label,
  value,
  mono,
  primary,
  badge,
}: {
  label: string;
  value: string;
  mono?: boolean;
  primary?: boolean;
  badge?: 'oem' | 'non-oem' | 'inactive';
}) {
  // 執行長 2026-06-25 視覺優化：20 吋低解析 + 灰字看不清。
  // 字級 12→14、灰字透明度 65→90、邊框 15→35、value 14→15 medium、徽章 9→11
  // 執行長 2026-06-25 再調：欄名仍偏灰偏小 → 字級 12→13、底色 muted-foreground/90 換 foreground/70（對比拉高）、字距 0.1em→0.02em 收緊、寬 80→84
  return (
    <div className="flex items-baseline gap-3 border-b border-border/30 pb-1.5 text-[14px] last:border-b-0 last:pb-0">
      <span className="w-[84px] shrink-0 text-[13px] font-medium tracking-[0.02em] text-foreground/70">
        {label}
      </span>
      <span
        className={cn(
          'min-w-0 flex-1 break-words',
          mono && 'font-mono',
          primary ? 'text-primary text-[15px] font-semibold' : 'text-[15px] text-foreground/95',
        )}
      >
        {value}
      </span>
      {badge === 'oem' && (
        <span className="shrink-0 rounded border border-primary/55 bg-primary/15 px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-primary">
          正廠
        </span>
      )}
      {badge === 'non-oem' && (
        <span className="shrink-0 rounded border border-border/50 bg-muted/30 px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/90">
          副廠
        </span>
      )}
      {badge === 'inactive' && (
        <span className="shrink-0 rounded border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
          停用
        </span>
      )}
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

// ─── Step 4：快捷鍵面板（F3 可替代 / F5 周轉率 / F6 出入庫）──────
// 交接 §5：取代偉盟 11 彈窗的常用集。F3 只露 料號/廠牌/庫存數量。
// F5 周轉率：無單料號 API（nx08 僅 top-10 聚合）→ 依交接「視 API 而定」
// 先以既有 stock-history（近 100 筆）前端統計、面板標注估算基礎。
const DOC_TYPE_LABELS: Record<string, string> = {
  P: '進貨',
  R: '退貨',
  S: '銷貨',
  I: '開帳',
  T: '盤點',
  X: '調撥',
};

// F2 下鑽（交接 §7、執行長 2026-07-11 拍板）：F8 銷貨比價 / F9 進貨比價 / F10 相關零件
// F3 可替代小面板已退役（與右欄通用零件同資料、執行長 2026-07-11 S01 走查合併；F3 改聚焦右欄）
type QuickPanelKind = 'turnover' | 'history' | 'sales' | 'purchase' | 'related';

const QUICK_PANEL_META: Record<QuickPanelKind, { title: string; kbd: string; wide?: boolean }> = {
  turnover: { title: '周轉率分析', kbd: 'Alt+5' },
  history: { title: '出入庫紀錄', kbd: 'F6' },
  sales: { title: '銷貨比價', kbd: 'F8', wide: true },
  purchase: { title: '進貨比價', kbd: 'F9', wide: true },
  related: { title: '相關零件', kbd: 'F10' },
};

function QuickPanelOverlay({
  kind,
  partCode,
  historyRows,
  historyLoading,
  monthlyStats,
  monthlyLoading,
  companyOnHand,
  salesData,
  salesLoading,
  purchaseRows,
  purchaseLoading,
  relatedRows,
  modelRows,
  relatedLoading,
  onClose,
}: {
  kind: QuickPanelKind;
  partCode: string;
  historyRows: PartStockHistoryRow[] | null;
  historyLoading: boolean;
  monthlyStats: PartMonthlyStatsDto | null;
  monthlyLoading: boolean;
  companyOnHand: number;
  salesData: PartSalesHistoryDto | null;
  salesLoading: boolean;
  purchaseRows: PartPurchaseHistoryRow[] | null;
  purchaseLoading: boolean;
  relatedRows: PartRelatedRow[] | null;
  modelRows: PartModelRow[] | null;
  relatedLoading: boolean;
  onClose: () => void;
}) {
  const meta = QUICK_PANEL_META[kind];
  return (
    <FocusLockedDialog
      open
      onClose={onClose}
      ariaLabel={meta.title}
      backdropClassName="bg-black/55 backdrop-blur-[2px] animate-in fade-in duration-150"
      dialogClassName="flex flex-col rounded-xl border border-border/60 bg-popover text-foreground shadow-[0_18px_50px_rgba(0,0,0,0.5),0_0_36px_-14px_rgba(232,160,32,0.25)] animate-in fade-in zoom-in-95 duration-150"
      // 比價表欄位多 → 寬殼（避免客戶名/單號擠壓換行）
      dialogStyle={
        meta.wide
          ? { width: 'min(960px, 94vw)', height: 'min(640px, 88vh)' }
          : { width: 'min(680px, 90vw)', height: 'min(560px, 85vh)' }
      }
    >
      <>
        <div className="flex items-center gap-2.5 border-b border-border/40 px-5 py-2.5">
          <kbd className="rounded border border-primary/50 bg-primary/12 px-1.5 py-px font-mono text-[11px] font-bold text-primary">
            {meta.kbd}
          </kbd>
          <h3 className="text-sm font-bold tracking-wide">{meta.title}</h3>
          <span className="font-mono text-[12px] text-muted-foreground/75">{partCode}</span>
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
          {kind === 'turnover' && (
            <TurnoverPanel
              stats={monthlyStats}
              loading={monthlyLoading}
              companyOnHand={companyOnHand}
            />
          )}
          {kind === 'history' && <StockHistoryPanel rows={historyRows} loading={historyLoading} />}
          {kind === 'sales' && <SalesComparePanel data={salesData} loading={salesLoading} />}
          {kind === 'purchase' && (
            <PurchaseComparePanel rows={purchaseRows} loading={purchaseLoading} />
          )}
          {kind === 'related' && (
            <RelatedPartsPanel rows={relatedRows} modelRows={modelRows} loading={relatedLoading} />
          )}
        </div>

        <div className="border-t border-border/35 bg-background/35 px-5 py-1.5 text-right text-[11px] text-muted-foreground/65">
          <Kbd>Esc</Kbd> 或再按 <Kbd>{meta.kbd}</Kbd> 關閉
        </div>
      </>
    </FocusLockedDialog>
  );
}

/** 快捷鍵說明（Alt+H / 右上「?」、執行長 2026-07-11：取代底部提示列、引導精靈通用鍵）*/
function ShortcutHelpOverlay({ onClose }: { onClose: () => void }) {
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
      ariaLabel="快捷鍵說明"
      backdropClassName="bg-black/55 backdrop-blur-[2px] animate-in fade-in duration-150"
      dialogClassName="flex flex-col rounded-xl border border-border/60 bg-popover text-foreground shadow-[0_18px_50px_rgba(0,0,0,0.5),0_0_36px_-14px_rgba(232,160,32,0.25)] animate-in fade-in zoom-in-95 duration-150"
      dialogStyle={{ width: 'min(560px, 92vw)', maxHeight: 'min(640px, 90vh)' }}
    >
      <>
        <div className="flex items-center gap-2.5 border-b border-border/40 px-5 py-2.5">
          <HelpCircle className="size-4 text-primary" />
          <h3 className="text-sm font-bold tracking-wide">快捷鍵說明</h3>
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
            <Group title="右欄・通用零件（＝可替代件）" />
            <Row k="↑↓" desc="選件（左欄資料＋中欄庫存即時跟隨）" />
            <Row k="Space" desc="標記✓／取消（可標多顆、供批次報價）" />
            <Row k="Alt+F" desc="以選中件跳搜（換主件重來）" />
            <Row k="Alt+G" desc="聚焦右欄清單" />
            <Group title="報價・調貨" />
            <Row k="Alt+Q" desc="報價環節（帶 ✓ 標記列）" />
            <Row k="Alt+D" desc="加入調貨清單（F2→3 開調貨詢價）" />
            <Row k="Alt+1~3" desc="價格細節：ABCD 價／該客戶紀錄／其他客戶" />
            <Row k="Alt+7" desc="即時詢價（同行調貨、記一家一筆）" />
            <Group title="查價面板" />
            <Row k="Alt+5" desc="周轉率分析" />
            <Row k="Alt+6" desc="出入庫紀錄" />
            <Row k="Alt+8" desc="銷貨比價（成本+A~D 價）" />
            <Row k="Alt+9" desc="進貨比價（歷史進價）" />
            <Row k="Alt+0" desc="相關零件＋適用車型（兩頁籤）" />
            <Group title="視窗" />
            <Row k="Alt+W" desc="各倉分布展開／收合（會記憶、換料不縮回）" />
            <Row k="Alt+P" desc="放大零件圖" />
            <Row k="Alt+H" desc="本說明（引導精靈通用鍵）" />
            <Row k="Esc" desc="退回搜尋窗" />
          </div>
        </div>
        <div className="border-t border-border/35 bg-background/35 px-5 py-1.5 text-right text-[11px] text-muted-foreground/65">
          <Kbd>Esc</Kbd> 或再按 <Kbd>Alt+H</Kbd> 關閉
        </div>
      </>
    </FocusLockedDialog>
  );
}

/** F5 周轉率分析（2026-07-11 執行長拍板轉正）：後端全量聚合（monthly-stats）
 *  上半部六格指標照舊、下半部加近 12 個月進銷長條；不再有近 100 筆截斷 */
function TurnoverPanel({
  stats,
  loading,
  companyOnHand,
}: {
  stats: PartMonthlyStatsDto | null;
  loading: boolean;
  companyOnHand: number;
}) {
  if (loading || !stats) return <PanelEmpty msg="載入中…" loading />;

  const out30 = Number(stats.window.out30) || 0;
  const out90 = Number(stats.window.out90) || 0;
  const in90 = Number(stats.window.in90) || 0;
  const avgDailyOut = out30 / 30;
  const daysOfStock = avgDailyOut > 0 ? companyOnHand / avgDailyOut : null;
  // 年化周轉率＝近 90 天出庫年化 / 目前現量
  const turnoverPerYear = companyOnHand > 0 ? ((out90 / 90) * 365) / companyOnHand : null;

  const allZero =
    out90 === 0 &&
    in90 === 0 &&
    stats.months.every((m) => Number(m.purchaseIn) === 0 && Number(m.salesOut) === 0);
  if (allZero) return <PanelEmpty msg="本料件近 12 個月無進銷、無法計算周轉" />;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        <KpiTile label="近 30 天出庫" value={String(out30)} color={STOCK_COLORS.available} />
        <KpiTile label="近 90 天出庫" value={String(out90)} color={STOCK_COLORS.available} />
        <KpiTile label="近 90 天入庫" value={String(in90)} color={STOCK_COLORS.onHand} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <KpiTile
          label="日均出庫（30天）"
          value={avgDailyOut.toFixed(1)}
          color={STOCK_COLORS.onHand}
          exact
        />
        <KpiTile
          label="現量可售天數"
          value={daysOfStock === null ? '—' : Math.round(daysOfStock).toString()}
          color={STOCK_COLORS.inTransit}
          exact
        />
        <KpiTile
          label="年化周轉率"
          value={turnoverPerYear === null ? '—' : turnoverPerYear.toFixed(1)}
          color={STOCK_COLORS.available}
          exact
        />
      </div>

      {/* 近 12 個月進銷長條（進=橘、對齊在途/採購側配色；銷=綠、對齊可出配色）*/}
      <MonthlyBarsSection months={stats.months} />

      <p className="text-[11px] leading-relaxed text-muted-foreground/65">
        統計來源：全量出入庫流水後端聚合（無筆數截斷）；公司目前現量 {companyOnHand.toFixed(0)}。
        進＝進貨入庫、銷＝銷貨出庫；調撥／盤點等其他異動不計入進銷長條。
      </p>
    </div>
  );
}

function MonthlyBarsSection({ months }: { months: PartMonthlyStatsDto['months'] }) {
  if (months.length === 0) return null;
  const max = Math.max(...months.map((m) => Math.max(Number(m.purchaseIn), Number(m.salesOut))), 1);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <h4 className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
          近 12 個月進銷
        </h4>
        <span className="flex items-center gap-3 text-[10px] text-muted-foreground/65">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-sm" style={{ backgroundColor: STOCK_COLORS.inTransit }} />進
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-sm" style={{ backgroundColor: STOCK_COLORS.available }} />銷
          </span>
        </span>
      </div>
      {months.map((m) => {
        const pIn = Number(m.purchaseIn);
        const sOut = Number(m.salesOut);
        return (
          <div key={m.month} className="flex items-center gap-2">
            <span className="w-[52px] shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground/75">
              {m.month}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-px">
              <MonthlyBar value={pIn} max={max} color={STOCK_COLORS.inTransit} />
              <MonthlyBar value={sOut} max={max} color={STOCK_COLORS.available} />
            </div>
            <span className="w-[90px] shrink-0 text-right font-mono text-[11px] tabular-nums">
              <span style={{ color: pIn > 0 ? STOCK_COLORS.inTransit : ZERO_GREY }}>{pIn.toFixed(0)}</span>
              <span className="text-muted-foreground/40"> / </span>
              <span style={{ color: sOut > 0 ? STOCK_COLORS.available : ZERO_GREY }}>{sOut.toFixed(0)}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

function MonthlyBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="h-[5px] overflow-hidden rounded-sm bg-secondary/50">
      <div className="h-full rounded-sm" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

/** Alt+6 出入庫紀錄：近 100 筆異動表 */
function StockHistoryPanel({
  rows,
  loading,
}: {
  rows: PartStockHistoryRow[] | null;
  loading: boolean;
}) {
  if (loading || !rows) return <PanelEmpty msg="載入中…" loading />;
  if (rows.length === 0) return <PanelEmpty msg="本料件無出入庫紀錄" />;
  return (
    <table className="w-full border-collapse text-[12.5px]">
      <thead className="sticky top-0 bg-popover">
        <tr className="border-b border-border/40 text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground/70">
          <th className="py-1.5 pr-2 font-medium">日期</th>
          <th className="py-1.5 pr-2 font-medium">類型</th>
          <th className="py-1.5 pr-2 text-right font-medium">入</th>
          <th className="py-1.5 pr-2 text-right font-medium">出</th>
          <th className="py-1.5 pr-2 text-right font-medium">結存</th>
          <th className="py-1.5 font-medium">倉位</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const qIn = Number(r.qtyIn) || 0;
          const qOut = Number(r.qtyOut) || 0;
          return (
            <tr key={r.id} className="border-b border-border/15 last:border-b-0">
              <td className="py-1.5 pr-2 font-mono text-[12px] text-foreground/85">
                {new Date(r.movementDate).toLocaleDateString('zh-TW')}
              </td>
              <td className="py-1.5 pr-2">
                <span className="rounded border border-border/50 bg-secondary/40 px-1.5 py-px text-[11px] text-foreground/85">
                  {DOC_TYPE_LABELS[r.sourceDocType] ?? r.sourceDocType}
                </span>
              </td>
              <td
                className="py-1.5 pr-2 text-right font-mono tabular-nums"
                style={{ color: qIn > 0 ? STOCK_COLORS.available : ZERO_GREY }}
              >
                {qIn > 0 ? qIn.toFixed(0) : '—'}
              </td>
              <td
                className="py-1.5 pr-2 text-right font-mono tabular-nums"
                style={{ color: qOut > 0 ? STOCK_COLORS.reserved : ZERO_GREY }}
              >
                {qOut > 0 ? qOut.toFixed(0) : '—'}
              </td>
              <td className="py-1.5 pr-2 text-right font-mono tabular-nums text-foreground/85">
                {Number(r.balanceQty).toFixed(0)}
              </td>
              <td className="py-1.5">
                <span className="font-mono text-primary">{r.warehouseCode}</span>
                <span className="ml-1 text-[11px] text-muted-foreground/70">{r.locationCode}</span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ─── Alt+8 銷貨比價（原 F8；F2 下鑽、交接 §7、執行長 2026-07-11 拍板）─────
// 銷售電話報價場景：建議售價列（成本+A~D、成本照露）→ 歷史銷貨 → 歷史報價。
// 狀態字面對齊 @data/types/nx04 的 SO_STATUS_LABEL / QUOTE_STATUS_LABEL、
// 比價表取精簡版（design 層不 import nx04、沿用本檔 DOC_TYPE_LABELS 局部映射前例）。
const SO_STATUS_LABELS: Record<string, string> = {
  DRAFT: '草稿',
  CONFIRMED: '已確認',
  PICKING: '撿貨中',
  SHIPPED: '已出貨',
  INVOICED: '已開立',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
};

const QUOTE_STATUS_LABELS: Record<string, string> = {
  DRAFT: '草稿',
  SENT: '已寄出',
  ACCEPTED: '已接受',
  REJECTED: '客戶拒絕',
  EXPIRED: '已過期',
  CANCELLED: '已取消',
};

const fmtMoney = (n: string | number | null | undefined) =>
  n === null || n === undefined || n === ''
    ? '—'
    : Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('zh-TW');

function SalesComparePanel({
  data,
  loading,
}: {
  data: PartSalesHistoryDto | null;
  loading: boolean;
}) {
  if (loading || !data) return <PanelEmpty msg="載入中…" loading />;
  const { suggestedPrices: sp, sales, quotes } = data;
  return (
    <div className="flex flex-col gap-4">
      {/* 建議售價列：成本 + A~D 價（成本照露、權限分權題執行長指示擱置）*/}
      <div className="grid shrink-0 grid-cols-5 gap-2">
        <PriceTile label="成本" value={sp.cost} color={STOCK_COLORS.reserved} />
        <PriceTile label="A 價" value={sp.priceA} color={STOCK_COLORS.available} />
        <PriceTile label="B 價" value={sp.priceB} color={STOCK_COLORS.available} />
        <PriceTile label="C 價" value={sp.priceC} color={STOCK_COLORS.available} />
        <PriceTile label="D 價" value={sp.priceD} color={STOCK_COLORS.available} />
      </div>

      {/* 歷史銷貨（成交事實、比價主依據 → 在上）*/}
      <PanelSection title="歷史銷貨" count={sales.length} capped={sales.length >= 50}>
        {sales.length === 0 ? (
          <PanelSectionEmpty msg="本料件無銷貨紀錄" />
        ) : (
          <table className="w-full border-collapse text-[12.5px]">
            <thead className="sticky top-0 bg-popover">
              <tr className="border-b border-border/40 text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground/70">
                <th className="py-1.5 pr-2 font-medium">日期</th>
                <th className="py-1.5 pr-2 font-medium">單號</th>
                <th className="py-1.5 pr-2 font-medium">客戶</th>
                <th className="py-1.5 pr-2 text-right font-medium">數量</th>
                <th className="py-1.5 pr-2 text-right font-medium">單價</th>
                <th className="py-1.5 pr-2 text-right font-medium">金額</th>
                <th className="py-1.5 font-medium">狀態</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((r) => (
                <tr key={r.soItemId} className="border-b border-border/15 last:border-b-0">
                  <td className="py-1.5 pr-2 font-mono text-[12px] text-foreground/85">
                    {fmtDate(r.soDate)}
                  </td>
                  <td className="py-1.5 pr-2 font-mono text-[12px] text-primary/90">{r.docNo}</td>
                  <td className="max-w-[180px] truncate py-1.5 pr-2 text-foreground/90" title={`${r.customerCode} ${r.customerName}`}>
                    {r.customerName}
                  </td>
                  <td className="py-1.5 pr-2 text-right font-mono tabular-nums text-foreground/85">
                    {Number(r.qty).toFixed(0)}
                  </td>
                  <td className="py-1.5 pr-2 text-right font-mono font-semibold tabular-nums" style={{ color: STOCK_COLORS.available }}>
                    {fmtMoney(r.unitPrice)}
                  </td>
                  <td className="py-1.5 pr-2 text-right font-mono tabular-nums text-foreground/85">
                    {fmtMoney(r.lineAmount)}
                  </td>
                  <td className="py-1.5">
                    <StatusBadge label={SO_STATUS_LABELS[r.status] ?? r.status} muted={r.status === 'CANCELLED'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </PanelSection>

      {/* 歷史報價（含未成交、看得出客戶談過什麼價）*/}
      <PanelSection title="歷史報價" count={quotes.length} capped={quotes.length >= 50}>
        {quotes.length === 0 ? (
          <PanelSectionEmpty msg="本料件無報價紀錄" />
        ) : (
          <table className="w-full border-collapse text-[12.5px]">
            <thead className="sticky top-0 bg-popover">
              <tr className="border-b border-border/40 text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground/70">
                <th className="py-1.5 pr-2 font-medium">日期</th>
                <th className="py-1.5 pr-2 font-medium">單號</th>
                <th className="py-1.5 pr-2 font-medium">客戶</th>
                <th className="py-1.5 pr-2 text-right font-medium">數量</th>
                <th className="py-1.5 pr-2 text-right font-medium">報價</th>
                <th className="py-1.5 pr-2 text-right font-medium">最低價</th>
                <th className="py-1.5 pr-2 font-medium">狀態</th>
                <th className="py-1.5 text-right font-medium">成交</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((r) => (
                <tr key={r.quoteItemId} className="border-b border-border/15 last:border-b-0">
                  <td className="py-1.5 pr-2 font-mono text-[12px] text-foreground/85">
                    {fmtDate(r.quoteDate)}
                  </td>
                  <td className="py-1.5 pr-2 font-mono text-[12px] text-primary/90">{r.docNo}</td>
                  <td className="max-w-[180px] truncate py-1.5 pr-2 text-foreground/90" title={`${r.customerCode} ${r.customerName}`}>
                    {r.customerName}
                  </td>
                  <td className="py-1.5 pr-2 text-right font-mono tabular-nums text-foreground/85">
                    {Number(r.qty).toFixed(0)}
                  </td>
                  <td className="py-1.5 pr-2 text-right font-mono font-semibold tabular-nums text-foreground/90">
                    {fmtMoney(r.unitPrice)}
                  </td>
                  <td className="py-1.5 pr-2 text-right font-mono tabular-nums text-muted-foreground/80">
                    {fmtMoney(r.minPrice)}
                  </td>
                  <td className="py-1.5 pr-2">
                    <StatusBadge label={QUOTE_STATUS_LABELS[r.status] ?? r.status} muted={r.status === 'CANCELLED'} />
                  </td>
                  <td className="py-1.5 text-right">
                    {r.isSelected ? (
                      <span
                        className="rounded border border-[#22D88F]/50 bg-[#22D88F]/10 px-1.5 py-px font-mono text-[11px] font-bold text-[#22D88F]"
                        title={`已轉銷貨 ${r.transferredQty}`}
                      >
                        ✓ {Number(r.transferredQty).toFixed(0)}
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground/45">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </PanelSection>
    </div>
  );
}

// ─── Alt+9 進貨比價（原 F9；F2 下鑽、交接 §7 第二優先）─────────────
// 採購比價場景：同一顆料歷次進貨的供應商/成本一表看。
// 狀態字面對齊 @data/types/nx02/rr 的 RR_STATUS_LABEL（局部映射、同上）。
const RR_STATUS_LABELS: Record<string, string> = {
  DRAFT: '草稿',
  INSPECTING: '驗收中',
  POSTED: '已過帳',
  REJECTED: '已駁回',
  CANCELLED: '已取消',
};

function PurchaseComparePanel({
  rows,
  loading,
}: {
  rows: PartPurchaseHistoryRow[] | null;
  loading: boolean;
}) {
  if (loading || !rows) return <PanelEmpty msg="載入中…" loading />;
  if (rows.length === 0) return <PanelEmpty msg="本料件無進貨紀錄" />;
  return (
    <PanelSection title="歷史進貨" count={rows.length} capped={rows.length >= 50}>
      <table className="w-full border-collapse text-[12.5px]">
        <thead className="sticky top-0 bg-popover">
          <tr className="border-b border-border/40 text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground/70">
            <th className="py-1.5 pr-2 font-medium">日期</th>
            <th className="py-1.5 pr-2 font-medium">單號</th>
            <th className="py-1.5 pr-2 font-medium">供應商</th>
            <th className="py-1.5 pr-2 text-right font-medium">數量</th>
            <th className="py-1.5 pr-2 text-right font-medium">單位成本</th>
            <th className="py-1.5 pr-2 text-right font-medium">實際成本</th>
            <th className="py-1.5 pr-2 text-right font-medium">金額</th>
            <th className="py-1.5 pr-2 font-medium">批號</th>
            <th className="py-1.5 font-medium">狀態</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.rrItemId} className="border-b border-border/15 last:border-b-0">
              <td className="py-1.5 pr-2 font-mono text-[12px] text-foreground/85">
                {fmtDate(r.rrDate)}
              </td>
              <td className="py-1.5 pr-2 font-mono text-[12px] text-primary/90">{r.docNo}</td>
              <td className="max-w-[170px] truncate py-1.5 pr-2 text-foreground/90" title={`${r.supplierCode} ${r.supplierName}`}>
                {r.supplierName}
              </td>
              <td className="py-1.5 pr-2 text-right font-mono tabular-nums text-foreground/85">
                {Number(r.qty).toFixed(0)}
              </td>
              <td className="py-1.5 pr-2 text-right font-mono tabular-nums text-muted-foreground/80">
                {fmtMoney(r.unitCost)}
              </td>
              <td className="py-1.5 pr-2 text-right font-mono font-semibold tabular-nums" style={{ color: STOCK_COLORS.inTransit }}>
                {fmtMoney(r.actualUnitCost)}
              </td>
              <td className="py-1.5 pr-2 text-right font-mono tabular-nums text-foreground/85">
                {fmtMoney(r.lineAmount)}
              </td>
              <td className="py-1.5 pr-2 font-mono text-[11px] text-muted-foreground/70">
                {r.batchNo ?? '—'}
              </td>
              <td className="py-1.5">
                <StatusBadge label={RR_STATUS_LABELS[r.status] ?? r.status} muted={r.status === 'CANCELLED'} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </PanelSection>
  );
}

// ─── Alt+0 相關零件（原 F10；F2 下鑽、交接 §7 第三優先：對應料 + 適用車型兩頁籤）──
// 對應料：執行長既拍板（見後端 getRelatedParts 註解）relationType 1~5 不分子類型、全部歸一區。
// 適用車型：唯讀端點 :id/models（執行長 2026-07-11 拍板本線加）。
function RelatedPartsPanel({
  rows,
  modelRows,
  loading,
}: {
  rows: PartRelatedRow[] | null;
  modelRows: PartModelRow[] | null;
  loading: boolean;
}) {
  const [tab, setTab] = useState<'related' | 'models'>('related');
  if (loading || !rows || !modelRows) return <PanelEmpty msg="載入中…" loading />;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex shrink-0 gap-1.5">
        <PanelTab
          active={tab === 'related'}
          label="對應料"
          count={rows.length}
          onClick={() => setTab('related')}
        />
        <PanelTab
          active={tab === 'models'}
          label="適用車型"
          count={modelRows.length}
          onClick={() => setTab('models')}
        />
      </div>
      {tab === 'related' ? <RelatedPartsTable rows={rows} /> : <PartModelsTable rows={modelRows} />}
    </div>
  );
}

function PanelTab({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[12px] font-medium transition-colors',
        active
          ? 'border-primary/55 bg-primary/15 text-primary'
          : 'border-border/45 bg-background/40 text-muted-foreground hover:border-primary/40 hover:text-foreground',
      )}
    >
      {label}
      <span className="font-mono text-[11px] tabular-nums opacity-75">{count}</span>
    </button>
  );
}

function RelatedPartsTable({ rows }: { rows: PartRelatedRow[] }) {
  if (rows.length === 0) return <PanelEmpty msg="本料件無相關零件" />;
  return (
    <table className="w-full border-collapse text-[13px]">
      <thead className="sticky top-0 bg-popover">
        <tr className="border-b border-border/40 text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground/70">
          <th className="py-1.5 pr-3 font-medium">料號</th>
          <th className="py-1.5 pr-3 font-medium">品名</th>
          <th className="py-1.5 pr-3 font-medium">廠牌</th>
          <th className="py-1.5 pr-3 text-right font-medium">庫存</th>
          <th className="py-1.5 font-medium">備註</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const onHand = Number(r.onHandTotal);
          return (
            <tr
              key={r.relationId}
              className={cn('border-b border-border/15 last:border-b-0', !r.isActive && 'opacity-55')}
            >
              <td className="py-2 pr-3">
                <span className="font-mono font-medium text-foreground/90">{r.code}</span>
                {!r.isActive && (
                  <span className="ml-2 rounded border border-destructive/40 bg-destructive/10 px-1.5 py-px text-[10px] text-destructive">
                    停用
                  </span>
                )}
              </td>
              <td className="max-w-[220px] truncate py-2 pr-3 text-foreground/90" title={r.name}>
                {r.name}
              </td>
              <td className="py-2 pr-3 text-foreground/85">{r.brandCode ?? r.brandName ?? '—'}</td>
              <td
                className="py-2 pr-3 text-right font-mono tabular-nums"
                style={{ color: onHand > 0 ? STOCK_COLORS.available : STOCK_COLORS.reserved }}
                title={`可出 ${r.availableTotal}`}
              >
                {onHand.toFixed(0)}
              </td>
              <td className="max-w-[160px] truncate py-2 text-[12px] text-muted-foreground/75" title={r.remark ?? undefined}>
                {r.remark ?? '—'}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** 適配等級（schema Q3=B）：1=原廠 / 2=副廠等效 / 3=通用替代 */
const FIT_LEVEL_LABELS: Record<number, string> = {
  1: '原廠',
  2: '副廠等效',
  3: '通用替代',
};

function PartModelsTable({ rows }: { rows: PartModelRow[] }) {
  if (rows.length === 0) return <PanelEmpty msg="本料件未設定適用車型" />;
  const yearRange = (r: PartModelRow) => {
    if (r.modelYearFrom === null && r.modelYearTo === null) return '—';
    return `${r.modelYearFrom ?? '…'}–${r.modelYearTo ?? '現役'}`;
  };
  return (
    <table className="w-full border-collapse text-[13px]">
      <thead className="sticky top-0 bg-popover">
        <tr className="border-b border-border/40 text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground/70">
          <th className="py-1.5 pr-3 font-medium">車型</th>
          <th className="py-1.5 pr-3 font-medium">品牌</th>
          <th className="py-1.5 pr-3 font-medium">年份</th>
          <th className="py-1.5 pr-3 font-medium">引擎</th>
          <th className="py-1.5 pr-3 font-medium">適配</th>
          <th className="py-1.5 font-medium">備註</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr
            key={r.partModelId}
            className={cn('border-b border-border/15 last:border-b-0', !r.isActive && 'opacity-55')}
          >
            <td className="py-2 pr-3">
              <span className="font-mono font-medium text-primary/90">{r.modelCode}</span>
              <span className="ml-2 text-foreground/85">{r.modelName}</span>
            </td>
            <td className="py-2 pr-3 text-foreground/85">{r.brandName}</td>
            <td className="py-2 pr-3 font-mono text-[12px] tabular-nums text-foreground/80">
              {yearRange(r)}
            </td>
            <td className="py-2 pr-3 font-mono text-[12px] text-muted-foreground/80">
              {r.engineCode ?? '—'}
              {r.displacementCc !== null && (
                <span className="ml-1 text-muted-foreground/60">{r.displacementCc}cc</span>
              )}
            </td>
            <td className="py-2 pr-3">
              <StatusBadge label={FIT_LEVEL_LABELS[r.fitLevel] ?? String(r.fitLevel)} />
            </td>
            <td className="max-w-[150px] truncate py-2 text-[12px] text-muted-foreground/75" title={r.remark ?? undefined}>
              {r.remark ?? '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** 建議售價磚（金額原樣顯示、null = 未設定）*/
function PriceTile({ label, value, color }: { label: string; value: string | null; color: string }) {
  const empty = value === null || value === '' || Number(value) === 0;
  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-border/55 bg-secondary px-3 py-2 shadow-sm">
      <span className="text-[12px] font-medium uppercase tracking-[0.1em] text-foreground/60">
        {label}
      </span>
      <span className="font-mono text-[18px] font-semibold tabular-nums" style={{ color: empty ? ZERO_GREY : color }}>
        {empty ? '—' : fmtMoney(value)}
      </span>
    </div>
  );
}

function StatusBadge({ label, muted }: { label: string; muted?: boolean }) {
  return (
    <span
      className={cn(
        'rounded border border-border/50 bg-secondary/40 px-1.5 py-px text-[11px] text-foreground/85',
        muted && 'text-muted-foreground/55 line-through',
      )}
    >
      {label}
    </span>
  );
}

function PanelSection({
  title,
  count,
  capped,
  children,
}: {
  title: string;
  count: number;
  capped?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-1.5">
      <h4 className="flex items-baseline gap-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
        {title}
        <span className="font-mono normal-case tracking-normal">({count} 筆)</span>
        {capped && (
          <span className="normal-case tracking-normal text-muted-foreground/55">
            ⚠ 已達 50 筆上限、更早紀錄未列
          </span>
        )}
      </h4>
      {children}
    </section>
  );
}

function PanelSectionEmpty({ msg }: { msg: string }) {
  return (
    <div className="rounded-md border border-border/30 bg-background/25 py-3 text-center text-[12px] text-muted-foreground/55">
      {msg}
    </div>
  );
}

function PanelEmpty({ msg, loading }: { msg: string; loading?: boolean }) {
  return (
    <div className="flex h-full min-h-[160px] items-center justify-center gap-2 text-[13px] text-muted-foreground/65">
      {loading && <Loader2 className="size-4 animate-spin text-primary" />}
      <span>{msg}</span>
    </div>
  );
}

// ─── 圖片放大 Lightbox ────────────────────────────────────
// export：F2 報價工作台階段③沿用（Alt+P 同鍵位、S3-2 2026-07-12）
export function PhotoZoomOverlay({
  partId,
  photos,
  onClose,
}: {
  partId: string;
  photos: PartPhotoMeta[];
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const photo = photos[idx];
  // Esc / Space 關
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      } else if (e.key === 'ArrowRight') {
        setIdx((i) => (i + 1) % photos.length);
      } else if (e.key === 'ArrowLeft') {
        setIdx((i) => (i - 1 + photos.length) % photos.length);
      }
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [photos.length, onClose]);

  if (!photo) return null;
  return (
    <FocusLockedDialog
      open
      onClose={onClose}
      ariaLabel="零件圖片放大"
      backdropClassName="bg-black/92 animate-in fade-in duration-200"
      dialogClassName="relative flex items-center justify-center"
      dialogStyle={{ width: '90vw', height: '90vh' }}
    >
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={buildPartSearchPhotoUrl(partId, photo.id)}
          alt={photo.origFilename ?? ''}
          className="max-h-full max-w-full object-contain"
        />
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md border border-border/40 bg-background/40 p-2 text-foreground hover:bg-secondary/60"
          aria-label="關閉"
        >
          <X className="size-4" />
        </button>
        {photos.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-md border border-border/40 bg-background/60 px-3 py-1 font-mono text-[10px] text-muted-foreground">
            {idx + 1} / {photos.length} · ← → 切圖 · Space / Esc 關
          </div>
        )}
      </>
    </FocusLockedDialog>
  );
}
