// apps/nx-ui/src/design/navigation/NineGrid.tsx
//
// 九宮格導覽面板（v3.0.0 階段 1 Step 2）
// 規格：docs/專案/介面規格/NEXORA-介面架構-v3.0.0.md v1.1 §3.1 §6 §7
//
// 三層：角色(1-9) → 功能(1-9) → 子功能(1-9)
// 鍵盤：1-9 選格 / 0 回上層 / Esc 關閉
// 排列：照數字鍵盤 789 / 456 / 123——手指位置＝螢幕位置，中間不用轉換
//
// ⛔ 位置固定是肌肉記憶的前提：
//   · 空格與不可用的格子照樣佔位，⛔ 不得讓後面的格子往前遞補
//   · 不可用的格子變灰但仍顯示，使用者才知道「這裡有東西、我沒權限」
//     （恆迎 F2 圓盤驗證過的做法）
//
// ⛔ 禁動畫（規格 §6）：使用者年紀偏大，動畫對他們是「畫面剛剛怎麼了？」不是回饋。
//
// 本元件是純元件：不知道怎麼開頁面，由 onNavigate 決定（Step 3 換新外殼時只換接線）。

'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  NUMPAD_ROWS,
  ROLES,
  type CellNo,
  type GridCell,
  type RoleDef,
} from './role-registry';

/** 面板顯示的一格（角色層與功能層共用同一種呈現） */
type PanelItem = {
  no: CellNo;
  label: string;
  /** 副標：角色層顯示部門、功能層顯示「N 項」 */
  hint?: string;
  /** 可否進入（pending 或無權限 → false，格子變灰但仍佔位） */
  enabled: boolean;
};

type Level = 'role' | 'cell' | 'child';

/** 選到的最終目的地。href＝開頁面；station＝開既有的即時工作站（過渡，見 role-registry） */
export type NineGridTarget = { href?: string; station?: number; label: string };

export type NineGridProps = {
  open: boolean;
  onClose: () => void;
  /** 選到最終目的地時呼叫；由外層決定怎麼開 */
  onPick: (target: NineGridTarget) => void;
};

export function NineGrid({ open, onClose, onPick: onPickTarget }: NineGridProps) {
  const [level, setLevel] = useState<Level>('role');
  const [role, setRole] = useState<RoleDef | null>(null);
  const [cell, setCell] = useState<GridCell | null>(null);

  // 每次開啟都從第一層開始——⛔ 不記住上次位置，位置要可預測
  useEffect(() => {
    if (open) {
      setLevel('role');
      setRole(null);
      setCell(null);
    }
  }, [open]);

  const back = useCallback(() => {
    if (level === 'child') {
      setCell(null);
      setLevel('cell');
      return;
    }
    if (level === 'cell') {
      setRole(null);
      setLevel('role');
      return;
    }
    onClose();
  }, [level, onClose]);

  const pick = useCallback(
    (no: CellNo) => {
      if (level === 'role') {
        const r = ROLES.find((x) => x.no === no);
        if (!r) return;
        setRole(r);
        setLevel('cell');
        return;
      }
      if (level === 'cell') {
        const c = role?.cells.find((x) => x.no === no);
        if (!c || c.status === 'pending') return;
        if (c.children?.length) {
          setCell(c);
          setLevel('child');
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
    [level, role, cell, onPickTarget, onClose],
  );

  // 鍵盤：capture 搶在底下頁面與 modal-stack 之前
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === '0') {
        e.preventDefault();
        e.stopPropagation();
        back();
        return;
      }
      if (e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        e.stopPropagation();
        pick(Number(e.key) as CellNo);
      }
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [open, back, pick, onClose]);

  if (!open) return null;

  const items: PanelItem[] = buildItems(level, role, cell);
  const title =
    level === 'role' ? '功能選單' : level === 'cell' ? role!.label : `${role!.label}／${cell!.label}`;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-[620px] max-w-[94vw] rounded-xl border border-border bg-card text-card-foreground shadow-xl">
        {/* 標題列：永遠顯示目前在哪一層，長輩不會迷路 */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <span className="text-lg">{title}</span>
          <span className="text-sm text-muted-foreground">
            {level === 'role' ? 'Esc 關閉' : '0 上一層 · Esc 關閉'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 p-5">
          {NUMPAD_ROWS.flat().map((no) => {
            const item = items.find((x) => x.no === no);
            return <GridButton key={no} no={no} item={item} onPick={pick} />;
          })}
        </div>
      </div>
    </div>
  );
}

/** 一格。空位與不可用的格子照樣佔位——⛔ 不遞補 */
function GridButton({
  no,
  item,
  onPick,
}: {
  no: CellNo;
  item?: PanelItem;
  onPick: (no: CellNo) => void;
}) {
  const usable = !!item?.enabled;

  if (!item) {
    return (
      <div
        aria-hidden="true"
        className="flex h-24 flex-col justify-between rounded-lg border border-dashed border-border/60 p-3"
      >
        <span className="text-base text-muted-foreground/40">{no}</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={!usable}
      onClick={() => onPick(no)}
      className={[
        'flex h-24 flex-col justify-between rounded-lg border p-3 text-left',
        usable
          ? 'border-border bg-background hover:border-primary hover:bg-accent'
          : 'cursor-not-allowed border-border/60 bg-muted/40',
      ].join(' ')}
    >
      <span className={usable ? 'text-base text-primary' : 'text-base text-muted-foreground/60'}>
        {no}
      </span>
      <span className="leading-tight">
        {/* 字級 18px：規格 §6 要求內文 15-16px 起跳，選單再放大一級 */}
        <span className={usable ? 'block text-lg' : 'block text-lg text-muted-foreground'}>
          {item.label}
        </span>
        {item.hint ? (
          <span className="block text-xs text-muted-foreground">{item.hint}</span>
        ) : null}
      </span>
    </button>
  );
}

/** 依目前層級組出九格內容 */
function buildItems(level: Level, role: RoleDef | null, cell: GridCell | null): PanelItem[] {
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
