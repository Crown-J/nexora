// apps/nx-ui/src/design/templates/LegacyBoardFrame.tsx
//
// 舊看板的外框（現場殼配套）
// 規格：docs/專案/介面規格/NEXORA-外殼規格-v3.0.0.md §7
//
// ⭐ 為什麼要這個東西：
//    撿貨／包貨／出貨的「看板」是沿用既有元件的（⛔ 不重寫是對的決定），
//    但那條路徑**完全繞過 FieldTemplate**，所以也繞過了「這台螢幕是什麼」的逃生出口。
//    ⚠️ 後果：一台被誤判成電腦的手持機，會停在舊看板上、**沒有任何辦法切回走動版**。
//    這個外框只做一件事——把逃生出口補回去，⛔ 不碰舊元件本身。

'use client';

import { useWorkstation } from '@design/hooks/useWorkstation';

import { StationPicker } from './FieldTemplate';

export function LegacyBoardFrame({ children }: { children: React.ReactNode }) {
  const ws = useWorkstation();
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-end border-b border-border px-5 py-2">
        <StationPicker
          value={ws.station?.kind ?? null}
          auto={ws.layoutSource === 'auto'}
          onPick={ws.register}
          onClear={ws.clear}
        />
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
