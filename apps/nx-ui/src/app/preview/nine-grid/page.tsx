// apps/nx-ui/src/app/preview/nine-grid/page.tsx
//
// 九宮格預覽（原 /nine-grid-preview，2026-08-01 併入 /preview 區）
//
// 這頁同時是「NineGrid 是純元件」的證明——它不依賴 WorkbenchTabsProvider，
// onPick 由呼叫端決定（這裡只把結果印在畫面上）。

'use client';

import { useEffect, useState } from 'react';

import { NineGrid } from '@design/navigation/NineGrid';

export default function NineGridPreviewPage() {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<{ href: string; label: string } | null>(null);

  // 與 V3Shell 相同的開關鍵，讓預覽頁的操作手感跟正式環境一致
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key !== 'F2' || e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      e.stopPropagation();
      setOpen((v) => !v);
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl">九宮格導覽</h1>
      <p className="mt-2 text-[15px] text-muted-foreground">
        按 F2 或下面的按鈕開啟。開啟後：1–9 選格、0 回上一層、Esc 關閉。
      </p>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-6 rounded-lg border border-border bg-card px-5 py-3 text-lg hover:bg-accent"
      >
        開啟九宮格
      </button>

      <div className="mt-6 max-w-xl rounded-lg border border-border bg-card p-5">
        <div className="text-[14px] text-muted-foreground">最後選到的目的地</div>
        <div className="mt-1 text-lg">
          {picked ? `${picked.label} → ${picked.href}` : '（尚未選擇）'}
        </div>
      </div>

      <NineGrid
        open={open}
        onClose={() => setOpen(false)}
        onPick={(t) => setPicked({ href: t.href ?? `（即時工作站 ${t.station}）`, label: t.label })}
      />
    </div>
  );
}
