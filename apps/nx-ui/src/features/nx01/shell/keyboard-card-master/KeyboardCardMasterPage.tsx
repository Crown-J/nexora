// apps/nx-ui/src/features/nx01/shell/keyboard-card-master/KeyboardCardMasterPage.tsx
/**
 * KeyboardCardMasterPage — L0 字典表「卡片式 + 全鍵盤」範本（執行長 2026-06-23 拍板第二代）
 *
 * 設計初衷：
 *   分級表 L0（country / region / department / phonetic-dictionary）的 inline edit row 範式
 *   執行長體驗後不滿意。改走「遊戲化卡片 + 全鍵盤」路線：
 *     - 卡片 grid、有質感、不像表單
 *     - 全鍵盤可達、無 modifier 單鍵為主、像遊戲操作
 *     - GSAP 進場 + framer-motion focus ring + reduce-motion 退化
 *
 * 鍵盤映射：
 *   瀏覽：↑↓←→ 移動 │ Enter/Space 編輯 │ N 新增 │ X 停用/啟用 │
 *         / 搜尋 │ T 切顯停用 │ R 重整 │ Q/E 上下頁 │ Home/End 頭尾 │ ? 熱鍵
 *   編輯：Tab/Shift+Tab 跳欄 │ Enter 儲存 │ Esc 取消
 *   搜尋：直接打字 │ ↓ 移回 grid │ Esc 退出
 *
 * 共用：吃既有 EntityMasterConfig + REST helper（不擴 schema/API、不擴 config 型別）。
 */
'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Ref,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X as XIcon, Keyboard } from 'lucide-react';

import { cn } from '@design/utils/cn';
import { PageHeader } from '@design/components/page-header/PageHeader';
import { useDirtyGuard } from '@design/hooks/useDirtyGuard';
import { ToastStack, useToast } from '@design/components/toast/ToastStack';
import {
  gsap,
  useGSAP,
  useReducedMotion,
  DURATION,
  EASE,
  STAGGER,
} from '@/design/motion/gsap';

import { useRouter } from 'next/navigation';
import { tryNavigate } from '@design/hooks/useDirtyGuard';

import { MasterQuickNav } from '@/features/nx01/shell/master-nav/MasterQuickNav';
import { MASTER_PAGES } from '@/features/nx01/shell/master-nav/master-pages';
import {
  ConfirmDialog,
  type ConfirmState,
} from '@/features/nx01/shell/ui/ConfirmDialog';

import { MasterSwitcher } from './MasterSwitcher';

import {
  type EntityMasterConfig,
  type EntityRow,
  type EntityDraft,
  type EntityFieldDef,
  fetchEntityList,
  createEntity,
  updateEntity,
  setEntityActive,
  emptyDraft,
  rowToDraft,
  draftToBody,
} from '../entity-master/config';

const PAGE_SIZE = 50;

function listFields(cfg: EntityMasterConfig): EntityFieldDef[] {
  return cfg.fields.filter((f) => f.inList !== false);
}

function editFields(cfg: EntityMasterConfig): EntityFieldDef[] {
  return cfg.fields.filter((f) => f.type !== 'computed');
}

function displayCell(f: EntityFieldDef, raw: unknown): string {
  if (raw == null || raw === '') return '—';
  if (f.type === 'toggle') return raw ? '是' : '否';
  if (f.type === 'select' && f.options) {
    return f.options.find((x) => String(x.value) === String(raw))?.label ?? String(raw);
  }
  return String(raw);
}

type Mode = 'browse' | 'edit' | 'create';

export function KeyboardCardMasterPage({ config }: { config: EntityMasterConfig }) {
  const { toasts, showToast } = useToast();
  const reduced = useReducedMotion();
  const router = useRouter();

  // 資料
  const [rows, setRows] = useState<EntityRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [showInactive, setShowInactive] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [debouncedKw, setDebouncedKw] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const [loading, setLoading] = useState(false);

  // 焦點 / 編輯
  const [focusIdx, setFocusIdx] = useState(0);
  const [mode, setMode] = useState<Mode>('browse');
  const [draft, setDraft] = useState<EntityDraft>({});
  const [original, setOriginal] = useState<EntityDraft>({});

  // overlay
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [cheatOpen, setCheatOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  // refs
  const gridRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const editFormRef = useRef<HTMLDivElement>(null);

  const listFs = useMemo(() => listFields(config), [config]);
  const editFs = useMemo(() => editFields(config), [config]);
  const editing = mode === 'edit' || mode === 'create';

  // search debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedKw(keyword), 250);
    return () => clearTimeout(t);
  }, [keyword]);

  // load
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchEntityList(config, {
        search: debouncedKw,
        page,
        pageSize: PAGE_SIZE,
        isActive: showInactive ? undefined : true,
      });
      setRows(res.items);
      setTotal(res.total);
      setFocusIdx((i) => Math.min(i, Math.max(0, res.items.length - 1)));
    } catch (e) {
      showToast((e as Error)?.message ?? '載入失敗', 'danger');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, debouncedKw, page, showInactive, reloadTick]);

  useEffect(() => {
    void load();
  }, [load]);

  // dirty
  const isDirty = useMemo(() => {
    if (!editing) return false;
    const keys = new Set([...Object.keys(draft), ...Object.keys(original)]);
    for (const k of keys) {
      if (String(draft[k] ?? '') !== String(original[k] ?? '')) return true;
    }
    return false;
  }, [editing, draft, original]);

  const exitEditing = useCallback(() => {
    setMode('browse');
    setDraft({});
    setOriginal({});
  }, []);

  // ── actions ──
  const startCreate = useCallback(() => {
    if (config.readOnly || config.canCreate === false) return;
    if (editing) return;
    const d = emptyDraft(config);
    setMode('create');
    setDraft(d);
    setOriginal(d);
  }, [config, editing]);

  const startEdit = useCallback(() => {
    if (config.readOnly) return;
    if (editing) return;
    const row = rows[focusIdx];
    if (!row) return;
    const d = rowToDraft(config, row);
    setMode('edit');
    setDraft(d);
    setOriginal(d);
  }, [config, editing, rows, focusIdx]);

  const handleSave = useCallback(async () => {
    if (!editing) return;
    for (const f of config.fields) {
      if (!f.required) continue;
      const v = String(draft[f.key] ?? '').trim();
      if (!v) {
        showToast(`「${f.label}」必填`, 'danger');
        return;
      }
    }
    try {
      const body = draftToBody(config, draft);
      if (mode === 'create') {
        await createEntity(config, body);
        showToast(`新增${config.entityNoun}成功`, 'success');
      } else {
        const row = rows[focusIdx];
        if (!row) return;
        await updateEntity(config, row.id, body);
        showToast(`更新${config.entityNoun}成功`, 'success');
      }
      exitEditing();
      setReloadTick((n) => n + 1);
    } catch (e) {
      showToast((e as Error)?.message ?? '儲存失敗', 'danger');
    }
  }, [editing, mode, config, draft, rows, focusIdx, showToast, exitEditing]);

  const handleCancel = useCallback(() => {
    if (!editing) return;
    if (!isDirty) {
      exitEditing();
      return;
    }
    setConfirm({
      title: mode === 'create' ? '取消新增？' : '丟棄變更？',
      message: '所有未存的修改將遺失。',
      variant: 'danger',
      confirmLabel: '丟棄',
      onConfirm: exitEditing,
    });
  }, [editing, isDirty, mode, exitEditing]);

  const handleToggleActive = useCallback(
    (row: EntityRow) => {
      if (config.readOnly) return;
      const next = !row.isActive;
      const label = next ? '啟用' : '停用';
      const firstKey = listFs[0]?.key;
      const rowLabel = firstKey ? String(row[firstKey] ?? row.id) : row.id;
      setConfirm({
        title: `${label}${config.entityNoun}？`,
        message: `將「${rowLabel}」${label}。`,
        variant: next ? 'default' : 'danger',
        confirmLabel: label,
        onConfirm: async () => {
          try {
            await setEntityActive(config, row.id, next);
            showToast(`${label}成功`, 'success');
            setReloadTick((n) => n + 1);
          } catch (e) {
            showToast((e as Error)?.message ?? '操作失敗', 'danger');
          }
        },
      });
    },
    [config, listFs, showToast],
  );

  // dirty guard
  useDirtyGuard(
    () => isDirty,
    (proceed) => {
      setConfirm({
        title: '有未儲存的變更',
        message: '是否儲存後再離開、或直接丟棄？',
        variant: 'danger',
        confirmLabel: '儲存後離開',
        onConfirm: () => {
          void handleSave().then(() => proceed());
        },
        secondaryAction: {
          label: '丟棄變更',
          variant: 'danger',
          onClick: () => {
            exitEditing();
            proceed();
          },
        },
      });
    },
  );

  // ── 方向鍵：用 bounding rect 算上下左右 ──
  const moveFocus = useCallback(
    (dir: 'up' | 'down' | 'left' | 'right') => {
      const cards = cardRefs.current.filter(Boolean) as HTMLDivElement[];
      if (cards.length === 0) return;
      const curr = cards[focusIdx]?.getBoundingClientRect();
      if (!curr) return;
      const cx = curr.left + curr.width / 2;
      const cy = curr.top + curr.height / 2;
      let bestIdx = focusIdx;
      let bestDist = Infinity;
      for (let i = 0; i < cards.length; i++) {
        if (i === focusIdx) continue;
        const r = cards[i].getBoundingClientRect();
        const rx = r.left + r.width / 2;
        const ry = r.top + r.height / 2;
        const dx = rx - cx;
        const dy = ry - cy;
        let primary = 0;
        let secondary = 0;
        if (dir === 'right') {
          if (dx <= 4) continue;
          primary = dx;
          secondary = Math.abs(dy) * 3;
        } else if (dir === 'left') {
          if (dx >= -4) continue;
          primary = -dx;
          secondary = Math.abs(dy) * 3;
        } else if (dir === 'down') {
          if (dy <= 4) continue;
          primary = dy;
          secondary = Math.abs(dx) * 3;
        } else if (dir === 'up') {
          if (dy >= -4) continue;
          primary = -dy;
          secondary = Math.abs(dx) * 3;
        }
        const dist = primary + secondary;
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      }
      if (bestIdx !== focusIdx) {
        setFocusIdx(bestIdx);
        cards[bestIdx]?.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
      }
    },
    [focusIdx, reduced],
  );

  // ── A：[ / ] 同分區翻頁（其實是平鋪 MASTER_PAGES 中相鄰、跨分區自然進下分區） ──
  const navigateAdjacent = useCallback(
    (dir: 'prev' | 'next') => {
      if (!config.pageId) return;
      const pages = MASTER_PAGES.filter((p) => !p.disabled);
      const idx = pages.findIndex((p) => p.id === config.pageId);
      if (idx === -1) return;
      const target = dir === 'next' ? pages[idx + 1] : pages[idx - 1];
      if (!target) {
        showToast(dir === 'next' ? '已是最後一個主檔' : '已是第一個主檔', 'info');
        return;
      }
      tryNavigate(
        () => router.push(target.href),
        `card-master ${dir}: ${target.label} → ${target.href}`,
      );
    },
    [config.pageId, router, showToast],
  );

  // ── 鍵盤 handler（window listener） ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // switcher 開啟時、所有鍵交給 switcher 內部 input 處理
      if (switcherOpen) return;

      // 編輯中：只攔 Esc / Enter（讓 Tab/Shift+Tab 由瀏覽器原生跳）
      if (editing) {
        if (e.key === 'Escape') {
          e.preventDefault();
          handleCancel();
          return;
        }
        if (e.key === 'Enter') {
          const tgt = e.target as HTMLElement;
          if (tgt.tagName === 'TEXTAREA') return;
          e.preventDefault();
          void handleSave();
          return;
        }
        return;
      }
      // 搜尋中：focus 在 input 時、只攔 Esc / ↓
      if (searchOpen) {
        const tgt = e.target as HTMLElement;
        if (tgt === searchInputRef.current) {
          if (e.key === 'Escape') {
            e.preventDefault();
            setSearchOpen(false);
            setKeyword('');
            return;
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            searchInputRef.current?.blur();
            return;
          }
          return;
        }
      }
      // 瀏覽模式
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key;

      if (k === 'ArrowUp') {
        e.preventDefault();
        moveFocus('up');
        return;
      }
      if (k === 'ArrowDown') {
        e.preventDefault();
        moveFocus('down');
        return;
      }
      if (k === 'ArrowLeft') {
        e.preventDefault();
        moveFocus('left');
        return;
      }
      if (k === 'ArrowRight') {
        e.preventDefault();
        moveFocus('right');
        return;
      }
      if (k === 'Home') {
        e.preventDefault();
        setFocusIdx(0);
        return;
      }
      if (k === 'End') {
        e.preventDefault();
        setFocusIdx(Math.max(0, rows.length - 1));
        return;
      }
      if (k === 'PageDown' || k === 'e' || k === 'E') {
        e.preventDefault();
        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
        if (page < totalPages) setPage(page + 1);
        return;
      }
      if (k === 'PageUp' || k === 'q' || k === 'Q') {
        e.preventDefault();
        if (page > 1) setPage(page - 1);
        return;
      }
      if (k === 'Enter' || k === ' ') {
        e.preventDefault();
        startEdit();
        return;
      }
      if (k === 'n' || k === 'N') {
        e.preventDefault();
        startCreate();
        return;
      }
      if (k === '/') {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
        return;
      }
      if (k === 'x' || k === 'X') {
        e.preventDefault();
        const row = rows[focusIdx];
        if (row) handleToggleActive(row);
        return;
      }
      if (k === 't' || k === 'T') {
        e.preventDefault();
        setShowInactive((v) => !v);
        return;
      }
      if (k === 'r' || k === 'R') {
        e.preventDefault();
        setReloadTick((n) => n + 1);
        showToast('已重新整理', 'info');
        return;
      }
      if (k === '?') {
        e.preventDefault();
        setCheatOpen((v) => !v);
        return;
      }
      if (k === 'm' || k === 'M') {
        e.preventDefault();
        setSwitcherOpen(true);
        return;
      }
      if (k === '[') {
        e.preventDefault();
        navigateAdjacent('prev');
        return;
      }
      if (k === ']') {
        e.preventDefault();
        navigateAdjacent('next');
        return;
      }
      if (k === 'Escape') {
        if (cheatOpen) {
          e.preventDefault();
          setCheatOpen(false);
          return;
        }
        if (searchOpen) {
          e.preventDefault();
          setSearchOpen(false);
          setKeyword('');
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    editing,
    searchOpen,
    cheatOpen,
    switcherOpen,
    moveFocus,
    handleCancel,
    handleSave,
    handleToggleActive,
    startCreate,
    startEdit,
    navigateAdjacent,
    rows,
    focusIdx,
    page,
    total,
    showToast,
  ]);

  // ── 編輯浮層出現時、auto-focus 第一個非鎖定欄位 ──
  useEffect(() => {
    if (!editing) return;
    const t = setTimeout(() => {
      const root = editFormRef.current;
      if (!root) return;
      const first = root.querySelector<HTMLInputElement | HTMLSelectElement>(
        'input:not([disabled]),select:not([disabled])',
      );
      first?.focus();
      if (first && 'select' in first) (first as HTMLInputElement).select?.();
    }, 80);
    return () => clearTimeout(t);
  }, [editing, mode]);

  // ── GSAP 進場 stagger（reduce-motion 退化） ──
  useGSAP(
    () => {
      const root = gridRef.current;
      if (!root) return;
      const targets = root.querySelectorAll<HTMLElement>('[data-kbcard]');
      if (targets.length === 0) return;
      const mm = gsap.matchMedia();
      mm.add(
        {
          reduceMotion: '(prefers-reduced-motion: reduce)',
          normal: '(prefers-reduced-motion: no-preference)',
        },
        (ctx) => {
          if (ctx.conditions?.reduceMotion) {
            gsap.set(targets, { autoAlpha: 1, y: 0, scale: 1 });
            return;
          }
          gsap.fromTo(
            targets,
            { autoAlpha: 0, y: 18, scale: 0.96 },
            {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              duration: DURATION.slow,
              ease: EASE.enter,
              stagger: STAGGER.tight,
              overwrite: true,
            },
          );
        },
      );
      return () => mm.revert();
    },
    { scope: gridRef, dependencies: [rows.length, reloadTick] },
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const focused = rows[focusIdx];
  const headField = listFs[0];
  const subField = listFs[1];
  const tailFields = listFs.slice(2);

  const focusedLabel = focused
    ? [headField && String(focused[headField.key] ?? ''), subField && String(focused[subField.key] ?? '')]
        .filter(Boolean)
        .join(' · ')
    : '—';

  return (
    <div className="flex flex-col gap-3 px-4 pb-6 pt-4 lg:px-6">
      <PageHeader
        category={config.category}
        title={config.title}
        count={total > 0 ? `共 ${total} 筆` : undefined}
      />

      <div data-nx-frame className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
        <MasterQuickNav currentPageId={config.pageId} />
      </div>

      <StatusBar
        mode={mode}
        focusedLabel={focusedLabel}
        keyword={keyword}
        searchOpen={searchOpen}
        showInactive={showInactive}
        page={page}
        totalPages={totalPages}
        canCreate={!config.readOnly && config.canCreate !== false}
      />

      <AnimatePresence initial={false}>
        {searchOpen ? (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="flex items-center gap-2 rounded-lg border border-[#E8A020]/40 bg-card/80 px-3 py-2"
          >
            <Search className="h-4 w-4 text-[#E8A020]" />
            <input
              ref={searchInputRef}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={`搜尋${config.entityNoun}…（Esc 退出、↓ 移到卡片）`}
              className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
            />
            {keyword ? (
              <button
                type="button"
                onClick={() => setKeyword('')}
                className="rounded p-1 text-muted-foreground hover:bg-foreground/10"
                title="清除"
              >
                <XIcon className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div
        ref={gridRef}
        data-nx-frame
        className={cn(
          'relative rounded-lg border border-border/40 bg-card/40 p-3 transition-[filter] duration-200',
          editing && 'pointer-events-none [filter:blur(2px)_brightness(0.85)]',
        )}
      >
        {loading && rows.length === 0 ? (
          <div className="px-3 py-16 text-center text-xs text-muted-foreground">載入中…</div>
        ) : rows.length === 0 ? (
          <div className="px-3 py-16 text-center text-xs text-muted-foreground">
            {keyword ? '無符合搜尋的資料' : `尚無${config.entityNoun}資料`}
          </div>
        ) : (
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
          >
            {rows.map((row, idx) => (
              <KbCard
                key={row.id}
                ref={(el) => {
                  cardRefs.current[idx] = el;
                }}
                row={row}
                focused={idx === focusIdx && !editing}
                headField={headField}
                subField={subField}
                tailFields={tailFields}
                onSelect={() => setFocusIdx(idx)}
                onActivate={() => {
                  setFocusIdx(idx);
                  startEdit();
                }}
                reduced={reduced}
              />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {editing ? (
          <motion.div
            className="fixed inset-0 z-40 flex items-center justify-center bg-background/50 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.18 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) handleCancel();
            }}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 6 }}
              transition={{ duration: reduced ? 0 : 0.22, ease: [0.2, 0.7, 0.2, 1] }}
              className="w-full max-w-md rounded-xl border-2 border-[#E8A020] bg-card p-5 shadow-2xl shadow-[#E8A020]/20"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold tracking-wide text-foreground">
                  {mode === 'create' ? `新增${config.entityNoun}` : `編輯：${focusedLabel}`}
                </h2>
                <span className="rounded-full bg-[#E8A020]/14 px-2 py-0.5 text-[10px] font-semibold text-[#E8A020]">
                  {mode === 'create' ? '新增中' : '編輯中'}
                </span>
              </div>
              <div ref={editFormRef}>
                <EditForm
                  editFs={editFs}
                  draft={draft}
                  onChange={setDraft}
                  isCreate={mode === 'create'}
                />
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3 text-[11px] text-muted-foreground">
                <span>
                  <kbd className="kb">Tab</kbd> 跳欄 · <kbd className="kb">Enter</kbd> 儲存 ·{' '}
                  <kbd className="kb">Esc</kbd> 取消
                </span>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {cheatOpen ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.15 }}
            onClick={() => setCheatOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.2, ease: 'easeOut' }}
              className="rounded-xl border border-[#E8A020]/40 bg-card p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center gap-2 text-[#E8A020]">
                <Keyboard className="h-4 w-4" />
                <h3 className="text-sm font-semibold tracking-wider">鍵盤快捷鍵</h3>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                <Hk k="↑ ↓ ← →" t="卡片間移動" />
                <Hk k="Enter / Space" t="進入編輯" />
                <Hk k="N" t="新增一筆" />
                <Hk k="X" t="停用 / 啟用" />
                <Hk k="/" t="搜尋此主檔" />
                <Hk k="T" t="切換顯示停用" />
                <Hk k="R" t="重新整理" />
                <Hk k="Q / E" t="上一頁 / 下一頁" />
                <Hk k="Home / End" t="第一張 / 最後一張" />
                <Hk k="[ / ]" t="上 / 下個主檔" />
                <Hk k="M" t="切換主檔（switcher）" />
                <Hk k="?" t="本說明" />
                <Hk k="Tab / Shift+Tab" t="編輯中跳欄" />
                <Hk k="Esc" t="取消 / 退出" />
              </div>
              <div className="mt-3 border-t border-border/40 pt-2 text-[10px] text-muted-foreground">
                按 <kbd className="kb">Esc</kbd> 或點擊背景關閉
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <MasterSwitcher
        open={switcherOpen}
        currentPageId={config.pageId}
        onClose={() => setSwitcherOpen(false)}
      />

      {confirm ? <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} /> : null}
      <ToastStack toasts={toasts} />

      {/* kbd 樣式 */}
      <style jsx global>{`
        .kb {
          display: inline-block;
          padding: 0 5px;
          border-radius: 4px;
          border: 1px solid rgba(232, 160, 32, 0.45);
          background: rgba(232, 160, 32, 0.1);
          color: #e8a020;
          font-size: 10px;
          font-weight: 600;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          line-height: 14px;
        }
      `}</style>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// StatusBar — 遊戲提示列風（模式 + 焦點 + 熱鍵 hint）
// ──────────────────────────────────────────────────────────────

function StatusBar({
  mode,
  focusedLabel,
  keyword,
  searchOpen,
  showInactive,
  page,
  totalPages,
  canCreate,
}: {
  mode: Mode;
  focusedLabel: string;
  keyword: string;
  searchOpen: boolean;
  showInactive: boolean;
  page: number;
  totalPages: number;
  canCreate: boolean;
}) {
  const modeLabel = searchOpen
    ? '搜尋'
    : mode === 'create'
      ? '新增'
      : mode === 'edit'
        ? '編輯'
        : '瀏覽';
  const modeColor =
    mode === 'edit' || mode === 'create' ? '#E8A020' : searchOpen ? '#7AC4FF' : '#22D88F';

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border/30 bg-card/60 px-3 py-1.5 text-[11px] text-muted-foreground">
      <span
        className="rounded px-1.5 py-0.5 font-semibold tracking-wider"
        style={{ background: `${modeColor}22`, color: modeColor }}
      >
        {modeLabel}
      </span>
      <span className="text-foreground/80">
        {mode === 'browse' && !searchOpen ? `焦點：${focusedLabel}` : null}
        {searchOpen ? <>關鍵字：「{keyword || '—'}」</> : null}
      </span>
      <span className="flex-1" />
      {showInactive ? (
        <span className="rounded bg-[#888892]/20 px-1.5 py-0.5 text-[10px] text-[#bdbdc6]">
          含停用
        </span>
      ) : null}
      {totalPages > 1 ? (
        <span>
          {page} / {totalPages}
        </span>
      ) : null}
      <span className="hidden sm:inline">
        {mode === 'browse' && !searchOpen ? (
          <>
            <kbd className="kb">↑↓←→</kbd> 移動 · <kbd className="kb">Enter</kbd> 編輯 ·{' '}
            {canCreate ? (
              <>
                <kbd className="kb">N</kbd> 新增 ·{' '}
              </>
            ) : null}
            <kbd className="kb">[ ]</kbd> 切主檔 · <kbd className="kb">M</kbd> 切換 ·{' '}
            <kbd className="kb">/</kbd> 搜尋 · <kbd className="kb">?</kbd> 熱鍵
          </>
        ) : null}
        {searchOpen ? (
          <>
            <kbd className="kb">↓</kbd> 移到卡片 · <kbd className="kb">Esc</kbd> 退出
          </>
        ) : null}
        {mode === 'edit' || mode === 'create' ? (
          <>
            <kbd className="kb">Tab</kbd> 跳欄 · <kbd className="kb">Enter</kbd> 儲存 ·{' '}
            <kbd className="kb">Esc</kbd> 取消
          </>
        ) : null}
      </span>
    </div>
  );
}

function Hk({ k, t }: { k: string; t: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <kbd className="kb">{k}</kbd>
      <span className="text-muted-foreground">{t}</span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// KbCard — 單張卡片
// ──────────────────────────────────────────────────────────────

type KbCardProps = {
  row: EntityRow;
  focused: boolean;
  headField?: EntityFieldDef;
  subField?: EntityFieldDef;
  tailFields: EntityFieldDef[];
  onSelect: () => void;
  onActivate: () => void;
  reduced: boolean;
};

const KbCard = forwardRef(function KbCard(
  { row, focused, headField, subField, tailFields, onSelect, onActivate, reduced }: KbCardProps,
  ref: Ref<HTMLDivElement>,
) {
  return (
    <div
      ref={ref}
      data-kbcard
      data-row-id={row.id}
      onClick={onSelect}
      onDoubleClick={onActivate}
      className={cn(
        'relative cursor-pointer rounded-xl border bg-card/80 p-3 text-sm transition-colors',
        'border-border/50 hover:border-[#E8A020]/60 hover:bg-card',
        !row.isActive && 'opacity-55',
      )}
    >
      {focused ? (
        <motion.span
          layoutId="kb-focus-ring"
          className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-[#E8A020] [box-shadow:0_0_0_4px_rgba(232,160,32,0.18),0_8px_22px_-6px_rgba(232,160,32,0.45)]"
          transition={
            reduced
              ? { duration: 0 }
              : { type: 'spring', stiffness: 380, damping: 30 }
          }
        />
      ) : null}

      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {headField ? (
            <div
              className={cn(
                'truncate text-base font-bold tracking-wider text-foreground',
                headField.mono && 'font-mono',
              )}
            >
              {displayCell(headField, row[headField.key])}
            </div>
          ) : null}
          {subField ? (
            <div className="mt-0.5 truncate text-[13px] text-muted-foreground">
              {displayCell(subField, row[subField.key])}
            </div>
          ) : null}
        </div>
        <span
          className={cn(
            'mt-1 h-2 w-2 shrink-0 rounded-full',
            row.isActive
              ? 'bg-[#22D88F] [box-shadow:0_0_8px_rgba(34,216,143,0.7)]'
              : 'bg-[#888892]',
          )}
          title={row.isActive ? '啟用' : '停用'}
        />
      </div>

      {tailFields.length > 0 ? (
        <div className="relative mt-2 flex flex-wrap gap-x-3 gap-y-0.5 border-t border-border/30 pt-2 text-[11px] text-muted-foreground">
          {tailFields.map((f) => (
            <span key={f.key} className="truncate">
              <span className="opacity-60">{f.label}：</span>
              <span className={cn(f.mono && 'font-mono')}>{displayCell(f, row[f.key])}</span>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
});

// ──────────────────────────────────────────────────────────────
// EditForm — 編輯浮層內表單（純鍵盤、Tab 跳欄）
// ──────────────────────────────────────────────────────────────

function EditForm({
  editFs,
  draft,
  onChange,
  isCreate,
}: {
  editFs: EntityFieldDef[];
  draft: EntityDraft;
  onChange: (next: EntityDraft) => void;
  isCreate: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      {editFs.map((f) => {
        const v = draft[f.key];
        const disabled = !isCreate && f.lockedOnEdit;
        return (
          <div key={f.key} className="flex flex-col gap-1">
            <label className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <span>{f.label}</span>
              {f.required ? <span className="text-[#E26060]">*</span> : null}
              {disabled ? <span className="text-[10px] text-muted-foreground/60">（不可修改）</span> : null}
            </label>
            {f.type === 'select' && f.options ? (
              <select
                value={String(v ?? '')}
                disabled={disabled}
                onChange={(e) => onChange({ ...draft, [f.key]: e.target.value })}
                className={cn(
                  'rounded border border-[var(--nx-surface-input-border)] bg-[var(--nx-surface-input)] px-2 py-1.5 text-sm text-[var(--nx-surface-input-fg)] outline-none focus:border-[#E8A020]',
                  f.mono && 'font-mono',
                  disabled && 'cursor-not-allowed opacity-50',
                )}
              >
                <option value="">—</option>
                {f.options.map((opt) => (
                  <option key={String(opt.value)} value={String(opt.value)}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : f.type === 'toggle' ? (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(v)}
                  disabled={disabled}
                  onChange={(e) => onChange({ ...draft, [f.key]: e.target.checked })}
                  className="h-4 w-4 accent-[#E8A020]"
                />
                <span className="text-sm text-foreground">{v ? '是' : '否'}</span>
              </label>
            ) : f.type === 'textarea' ? (
              <textarea
                value={String(v ?? '')}
                placeholder={f.placeholder}
                maxLength={f.maxLength}
                disabled={disabled}
                rows={3}
                onChange={(e) => onChange({ ...draft, [f.key]: e.target.value })}
                className={cn(
                  'rounded border border-[var(--nx-surface-input-border)] bg-[var(--nx-surface-input)] px-2 py-1.5 text-sm text-[var(--nx-surface-input-fg)] outline-none focus:border-[#E8A020]',
                  f.mono && 'font-mono',
                  disabled && 'cursor-not-allowed opacity-50',
                )}
              />
            ) : (
              <input
                type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                value={String(v ?? '')}
                placeholder={f.placeholder}
                maxLength={f.maxLength}
                disabled={disabled}
                onChange={(e) => onChange({ ...draft, [f.key]: e.target.value })}
                className={cn(
                  'rounded border border-[var(--nx-surface-input-border)] bg-[var(--nx-surface-input)] px-2 py-1.5 text-sm text-[var(--nx-surface-input-fg)] outline-none focus:border-[#E8A020]',
                  f.mono && 'font-mono',
                  disabled && 'cursor-not-allowed opacity-50',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
