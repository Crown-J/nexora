// apps/nx-ui/src/design/navigation/NineGrid.tsx
//
// 九宮格導覽面板（v3.0.0 階段 1 Step 2；2026-08-03 改成整鍵複製數字鍵盤）
// 規格：docs/專案/介面規格/NEXORA-介面架構-v3.0.0.md v1.1 §3.1 §6 §7
// 鍵位對照表：docs/專案/介面規格/NEXORA-快捷鍵對照表-v3.0.0.xlsx
//
// 三層：角色(1-9) → 功能(1-9) → 子功能(1-9)；另有「資訊」一層掛在 . 鍵
//
// ⭐ 2026-08-03 執行長拍板：面板＝把整個數字鍵盤複製上螢幕。
//   1-9 是九個角色（號碼終身凍結），頂欄那三顆按鈕收進數字鍵盤剩下的實體鍵：
//     0 ＝ 第一層回首頁／其餘層回上一層　·　. ＝ 資訊　·　+ ＝ 任務／通知
//     - ＝ 設定　·　/ ＝ 全域搜尋　·　Enter ＝ 確認　·　* ＝ 留白　·　Num ＝ 不攔
//   位置照實體鍵盤排（見 role-registry 的 PAD_LAYOUT），⛔ 不得為美觀重排。
//
// ⛔ 位置固定是肌肉記憶的前提：
//   · 空格與不可用的格子照樣佔位，⛔ 不得讓後面的格子往前遞補
//   · 不可用的格子變灰但仍顯示，使用者才知道「這裡有東西、我沒權限」
//     （恆迎 F2 圓盤驗證過的做法）
//
// ⛔ 禁動畫（規格 §6）：使用者年紀偏大，動畫對他們是「畫面剛剛怎麼了？」不是回饋。
//
// 本元件是純元件：不知道怎麼開頁面，由 onPick／onHome 決定。

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  PAD_LAYOUT,
  UTILITY_KEYS,
  padCenter,
  ROLES,
  type CellNo,
  type GridCell,
  type PadSlot,
  type RoleDef,
  type UtilityKeyId,
} from './role-registry';

/** 面板顯示的一格（各層共用同一種呈現） */
type PanelItem = {
  no: CellNo;
  label: string;
  /** 副標：角色層顯示部門、功能層顯示「N 項」 */
  hint?: string;
  /** 可否進入（pending 或無權限 → false，格子變灰但仍佔位） */
  enabled: boolean;
};

type Level = 'role' | 'cell' | 'child' | 'info';

/** 鍵盤游標：方向鍵／Tab 移動，Enter 確認 */
type Cursor = { kind: 'num'; no: CellNo } | { kind: 'util'; util: UtilityKeyId } | null;

/** 選到的最終目的地。href＝開頁面；station＝開既有的即時工作站（過渡，見 role-registry） */
export type NineGridTarget = { href?: string; station?: number; label: string };

/** 頂欄「使用者」那顆搬進來之後，登出的唯一入口就在這裡（資訊 → 1 個人資訊） */
export type NineGridSession = {
  displayName: string;
  employeeNo: string;
  tenantName: string;
  onLogout: () => void;
};

export type NineGridProps = {
  open: boolean;
  onClose: () => void;
  /** 選到最終目的地時呼叫；由外層決定怎麼開 */
  onPick: (target: NineGridTarget) => void;
  /** 第一層按 0：離開九宮格、回工作檯 */
  onHome: () => void;
  /** 有給才有「個人資訊」可以進（預覽頁沒有 session） */
  session?: NineGridSession;
};

/**
 * 「資訊」層的九格（執行長 2026-08-03：個人資訊／行事曆／佈告欄）。
 * ⚠️ 行事曆與佈告欄本階段只有格子——內容分段進行。
 *    · 行事曆：後端 API 與前端元件都在（封存的舊首頁 design/home/HomeView），撿現成的即可
 *    · 佈告欄：只有「管理端」存在（行政作業 9-3），員工「看」的那一端要新做
 */
function buildInfoCells(hasSession: boolean): PanelItem[] {
  return [
    { no: 1, label: '個人資訊', hint: hasSession ? undefined : '建置中', enabled: hasSession },
    { no: 2, label: '行事曆', hint: '建置中', enabled: false },
    { no: 3, label: '佈告欄', hint: '建置中', enabled: false },
  ];
}

export function NineGrid({ open, onClose, onPick: onPickTarget, onHome, session }: NineGridProps) {
  const [level, setLevel] = useState<Level>('role');
  const [role, setRole] = useState<RoleDef | null>(null);
  const [cell, setCell] = useState<GridCell | null>(null);
  const [cursor, setCursor] = useState<Cursor>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  /** 資訊層裡展開的小面板（目前只有個人資訊） */
  const [infoPanel, setInfoPanel] = useState<'profile' | null>(null);

  // 每次開啟都從第一層開始——⛔ 不記住上次位置，位置要可預測。
  // ⚠️ 用 render 階段調整而不是 useEffect：effect 裡 setState 會多跑一輪 render
  //    （React 官方的 adjusting-state-when-a-prop-changes 寫法）。行為與原本相同。
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setLevel('role');
      setRole(null);
      setCell(null);
      setCursor(null);
      setSearchOpen(false);
      setInfoPanel(null);
    }
  }

  const back = useCallback(() => {
    setCursor(null);
    // 展開的小面板算一層：先收面板，再退層
    if (infoPanel) {
      setInfoPanel(null);
      return;
    }
    if (level === 'child') {
      setCell(null);
      setLevel('cell');
      return;
    }
    if (level === 'cell' || level === 'info') {
      setRole(null);
      setLevel('role');
      return;
    }
    // 第一層＝已經退到底：離開九宮格、回工作檯（執行長 2026-08-03）
    onHome();
  }, [level, onHome, infoPanel]);

  const pick = useCallback(
    (no: CellNo) => {
      if (level === 'info') {
        // 1 個人資訊＝頂欄「使用者」搬進來的東西（含登出）；2/3 本階段只有格子
        if (no === 1 && session) setInfoPanel('profile');
        return;
      }
      if (level === 'role') {
        const r = ROLES.find((x) => x.no === no);
        if (!r) return;
        setRole(r);
        setLevel('cell');
        setCursor(null);
        return;
      }
      if (level === 'cell') {
        const c = role?.cells.find((x) => x.no === no);
        if (!c || c.status === 'pending') return;
        if (c.children?.length) {
          setCell(c);
          setLevel('child');
          setCursor(null);
          return;
        }
        if (c.href || c.station) {
          onPickTarget({ href: c.href, station: c.station, label: c.label });
          onClose();
        }
        return;
      }
      const child = cell?.children?.find((x) => x.no === no);
      if (!child || child.status === 'pending') return;
      if (!child.href && !child.station) return;
      onPickTarget({ href: child.href, station: child.station, label: child.label });
      onClose();
    },
    [level, role, cell, onPickTarget, onClose, session],
  );

  const pickUtil = useCallback(
    (id: UtilityKeyId) => {
      const key = UTILITY_KEYS[id];
      if (!key.enabled) return;
      if (id === 'home') {
        back();
        return;
      }
      if (id === 'info') {
        setRole(null);
        setCell(null);
        setLevel('info');
        setCursor(null);
        return;
      }
      if (id === 'search') {
        setSearchOpen(true);
        return;
      }
      if (key.href) {
        onPickTarget({ href: key.href, label: key.label });
        onClose();
      }
    },
    [back, onClose, onPickTarget],
  );

  /** Enter：確認目前游標所在的格 */
  const confirmCursor = useCallback(() => {
    if (!cursor) return;
    if (cursor.kind === 'num') pick(cursor.no);
    else pickUtil(cursor.util);
  }, [cursor, pick, pickUtil]);

  /** 方向鍵：往該方向找中心點最近的一格（照實體鍵盤座標） */
  const moveCursor = useCallback(
    (dx: number, dy: number) => {
      const slotOf = (c: Cursor): PadSlot | undefined => {
        if (!c) return undefined;
        return c.kind === 'num'
          ? PAD_LAYOUT.find((s) => s.kind === 'num' && s.no === c.no)
          : PAD_LAYOUT.find((s) => s.kind === 'util' && s.util === c.util);
      };
      const cur = slotOf(cursor);
      // 還沒有游標：從 5（正中央）起步，手指不必先找位置
      if (!cur) {
        setCursor({ kind: 'num', no: 5 });
        return;
      }
      const from = padCenter(cur);
      let best: PadSlot | null = null;
      let bestDist = Number.POSITIVE_INFINITY;
      for (const s of PAD_LAYOUT) {
        if (s === cur) continue;
        const to = padCenter(s);
        const vx = to.x - from.x;
        const vy = to.y - from.y;
        if (dx !== 0 && Math.sign(vx) !== Math.sign(dx)) continue;
        if (dy !== 0 && Math.sign(vy) !== Math.sign(dy)) continue;
        // 主軸距離加權：⛔ 不讓斜對角搶走正前方的格子
        const dist = dx !== 0 ? Math.abs(vx) * 2 + Math.abs(vy) : Math.abs(vy) * 2 + Math.abs(vx);
        if (dist < bestDist) {
          bestDist = dist;
          best = s;
        }
      }
      if (!best) return;
      setCursor(best.kind === 'num' ? { kind: 'num', no: best.no! } : { kind: 'util', util: best.util! });
    },
    [cursor],
  );

  // 鍵盤：capture 搶在底下頁面與 modal-stack 之前
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // 搜尋框開著＝使用者在打字，只留 Esc，其餘一律讓原生（⛔ 不可攔 / 與數字）
      if (searchOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          setSearchOpen(false);
        }
        return;
      }

      const stop = () => {
        e.preventDefault();
        e.stopPropagation();
      };

      if (e.key === 'Escape') {
        stop();
        onClose();
        return;
      }
      if (e.key === '0') {
        stop();
        back();
        return;
      }
      if (e.key === '.') {
        stop();
        pickUtil('info');
        return;
      }
      if (e.key === '+') {
        stop();
        pickUtil('tasks');
        return;
      }
      if (e.key === '-') {
        stop();
        pickUtil('settings');
        return;
      }
      if (e.key === '/') {
        stop();
        pickUtil('search');
        return;
      }
      if (e.key === 'Enter') {
        stop();
        confirmCursor();
        return;
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        stop();
        moveCursor(
          e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0,
          e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0,
        );
        return;
      }
      if (e.key >= '1' && e.key <= '9') {
        stop();
        pick(Number(e.key) as CellNo);
      }
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [open, back, pick, pickUtil, confirmCursor, moveCursor, onClose, searchOpen]);

  const items: PanelItem[] = useMemo(
    () => buildItems(level, role, cell, !!session),
    [level, role, cell, session],
  );

  if (!open) return null;

  const title =
    level === 'role'
      ? '功能選單'
      : level === 'info'
        ? '資訊'
        : level === 'cell'
          ? role!.label
          : `${role!.label}／${cell!.label}`;

  // 0 的字面意思會變：第一層是「回首頁」、其餘層是「回上一層」
  const homeLabel = level === 'role' ? '回首頁' : '回上一層';

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-[860px] max-w-[96vw] rounded-xl border border-border bg-card text-card-foreground shadow-xl">
        {/* 標題列：永遠顯示目前在哪一層，長輩不會迷路 */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <span className="text-lg">{title}</span>
          <span className="text-sm text-muted-foreground">
            {level === 'role' ? '0 回首頁 · Esc 關閉' : '0 上一層 · Esc 關閉'}
          </span>
        </div>

        {searchOpen ? (
          <SearchShell onBack={() => setSearchOpen(false)} />
        ) : infoPanel === 'profile' && session ? (
          <ProfilePanel session={session} onBack={() => setInfoPanel(null)} />
        ) : (
          <div
            className="grid gap-3 p-5"
            style={{
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gridTemplateRows: 'repeat(5, minmax(0, 1fr))',
            }}
          >
            {PAD_LAYOUT.map((slot) => {
              const style = {
                gridColumn: `${slot.col} / span ${slot.colSpan}`,
                gridRow: `${slot.row} / span ${slot.rowSpan}`,
              };
              if (slot.kind === 'num') {
                const no = slot.no!;
                return (
                  <PadButton
                    key={`n${no}`}
                    style={style}
                    cap={String(no)}
                    label={items.find((x) => x.no === no)?.label}
                    hint={items.find((x) => x.no === no)?.hint}
                    enabled={!!items.find((x) => x.no === no)?.enabled}
                    present={!!items.find((x) => x.no === no)}
                    focused={cursor?.kind === 'num' && cursor.no === no}
                    onSelect={() => pick(no)}
                    onFocus={() => setCursor({ kind: 'num', no })}
                  />
                );
              }
              const id = slot.util!;
              const k = UTILITY_KEYS[id];
              return (
                <PadButton
                  key={`u${id}`}
                  style={style}
                  cap={k.cap}
                  label={id === 'home' ? homeLabel : k.label}
                  hint={k.hint}
                  enabled={k.enabled}
                  present={!!k.label}
                  utility
                  focused={cursor?.kind === 'util' && cursor.util === id}
                  onSelect={() => pickUtil(id)}
                  onFocus={() => setCursor({ kind: 'util', util: id })}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 全域搜尋的殼（執行長 2026-08-03 拍板掛在 / 鍵）。
 * ⚠️ 只有框、還不會搜——規格已定「不做成頁面、同一個框依角色回不同答案」，內容分段進行。
 */
function SearchShell({ onBack }: { onBack: () => void }) {
  return (
    <div className="p-5">
      <input
        type="text"
        autoFocus
        placeholder="料號／客戶／單號"
        className="w-full rounded-lg border border-border bg-background px-4 py-3 text-lg"
      />
      <div className="mt-4 rounded-lg border border-dashed border-border p-6 text-center">
        <div className="text-lg">全域搜尋建置中</div>
        <div className="mt-1 text-base text-muted-foreground">
          同一個框依角色回不同答案，⛔ 不做成獨立頁面
        </div>
      </div>
      <button
        type="button"
        onClick={onBack}
        className="mt-4 rounded-md border border-border px-4 py-2 text-base hover:bg-accent"
      >
        Esc 返回選單
      </button>
    </div>
  );
}

/**
 * 個人資訊（資訊 → 1）。頂欄那顆「使用者」整個搬進來，⭐ 含登出。
 * ⚠️ 頂欄拆掉之後，這裡是全系統唯一的登出入口——⛔ 不可再被拿掉。
 */
function ProfilePanel({
  session,
  onBack,
}: {
  session: NineGridSession;
  onBack: () => void;
}) {
  return (
    <div className="p-5">
      <div className="rounded-lg border border-border p-5">
        <div className="text-lg">{session.displayName}</div>
        {session.employeeNo ? (
          <div className="nx-hint mt-1">工號 {session.employeeNo}</div>
        ) : null}
        <div className="nx-hint mt-1">{session.tenantName}</div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md border border-border px-4 py-2 text-base hover:bg-accent"
        >
          0 返回
        </button>
        <button
          type="button"
          onClick={session.onLogout}
          className="rounded-md border border-border px-4 py-2 text-base hover:bg-accent"
        >
          登出
        </button>
      </div>
    </div>
  );
}

/** 一顆鍵。空位與不可用的鍵照樣佔位——⛔ 不遞補 */
function PadButton({
  style,
  cap,
  label,
  hint,
  enabled,
  present,
  utility,
  focused,
  onSelect,
  onFocus,
}: {
  style: React.CSSProperties;
  cap: string;
  label?: string;
  hint?: string;
  enabled: boolean;
  present: boolean;
  utility?: boolean;
  focused: boolean;
  onSelect: () => void;
  onFocus: () => void;
}) {
  if (!present) {
    return (
      <div
        aria-hidden="true"
        style={style}
        className="flex min-h-24 flex-col justify-between rounded-lg border border-dashed border-border/60 p-3"
      >
        <span className="text-base text-muted-foreground/40">{cap}</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      style={style}
      disabled={!enabled}
      onClick={onSelect}
      onFocus={onFocus}
      onMouseEnter={onFocus}
      className={[
        'flex min-h-24 flex-col justify-between rounded-lg border p-3 text-left',
        enabled
          ? utility
            ? 'border-border bg-muted/30 hover:border-primary hover:bg-accent'
            : 'border-border bg-background hover:border-primary hover:bg-accent'
          : 'cursor-not-allowed border-border/60 bg-muted/40',
        // 游標＝加粗外框。⛔ 不用動畫、不用陰影，看得出來就好（規格 §6）
        focused ? 'border-primary ring-2 ring-primary' : '',
      ].join(' ')}
    >
      <span className={enabled ? 'text-base text-primary' : 'text-base text-muted-foreground/60'}>
        {cap}
      </span>
      <span className="leading-tight">
        {/* 字級 18px：規格 §6 要求內文 15-16px 起跳，選單再放大一級 */}
        <span className={enabled ? 'block text-lg' : 'block text-lg text-muted-foreground'}>
          {label}
        </span>
        {/* 順手清歷史債：原本 text-xs（12px）違反 §6 最小級距，改掛語意類別 */}
        {hint ? <span className="nx-hint block">{hint}</span> : null}
      </span>
    </button>
  );
}

/** 依目前層級組出九格內容 */
function buildItems(
  level: Level,
  role: RoleDef | null,
  cell: GridCell | null,
  hasSession: boolean,
): PanelItem[] {
  if (level === 'info') return buildInfoCells(hasSession);
  if (level === 'role') {
    // 第一層永遠是九個角色的固定位置（規格 §3.1）；權限過濾階段 2 接線，目前全開
    return ROLES.map((r) => ({ no: r.no, label: r.label, hint: r.department, enabled: true }));
  }
  if (level === 'cell') {
    return (role?.cells ?? []).map((c) => ({
      no: c.no,
      label: c.label,
      hint: c.status === 'pending' ? '建置中' : c.children?.length ? `${c.children.length} 項` : undefined,
      enabled: c.status === 'live',
    }));
  }
  return (cell?.children ?? []).map((c) => ({
    no: c.no,
    label: c.label,
    hint: c.status === 'pending' ? '建置中' : undefined,
    enabled: c.status === 'live',
  }));
}
