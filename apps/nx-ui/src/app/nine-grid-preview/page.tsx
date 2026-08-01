// apps/nx-ui/src/app/nine-grid-preview/page.tsx
//
// 九宮格設計預覽頁（v3.0.0 階段 1 Step 2）
// 用途：不必登入、不必外殼就能檢視與操作九宮格，改樣式時直接看。
//
// 這頁同時是「NineGrid 是純元件」的證明——它不依賴 WorkbenchTabsProvider，
// onNavigate 由呼叫端決定（這裡只把結果印在畫面上）。
//
// ⚠️ 這是開發用頁面，不進九宮格、不掛選單。階段 4 收尾時決定保留或刪除。

'use client';

import { useEffect, useState } from 'react';

import { NineGrid } from '@design/navigation/NineGrid';

export default function NineGridPreviewPage() {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<{ href: string; label: string } | null>(null);

  // 與 V3Shell 相同的開關鍵，讓預覽頁的操作手感跟正式環境一致
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key !== 'F4' || e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      e.stopPropagation();
      setOpen((v) => !v);
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, []);

  return (
    <main className="min-h-dvh bg-background p-10 text-foreground">
      <h1 className="text-2xl">九宮格預覽</h1>
      <p className="mt-2 text-base text-muted-foreground">
        按 F4 或下面的按鈕開啟。開啟後：1–9 選格、0 回上一層、Esc 關閉。
      </p>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-6 rounded-lg border border-border bg-card px-5 py-3 text-lg hover:bg-accent"
      >
        開啟九宮格
      </button>

      <div className="mt-6 rounded-lg border border-border bg-card p-5">
        <div className="text-sm text-muted-foreground">最後選到的目的地</div>
        <div className="mt-1 text-lg">
          {picked ? `${picked.label} → ${picked.href}` : '（尚未選擇）'}
        </div>
      </div>

      <NineGrid
        open={open}
        onClose={() => setOpen(false)}
        onNavigate={(href, label) => setPicked({ href, label })}
      />
    </main>
  );
}
