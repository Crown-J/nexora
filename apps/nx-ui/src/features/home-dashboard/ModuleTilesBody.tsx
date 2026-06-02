// apps/nx-ui/src/features/home-dashboard/ModuleTilesBody.tsx
// 首頁 Win8 磚式主體：段① 骨架版
//
// - 6 磚統一大小、grid 排列、靜態（不翻轉不亂跳）
// - 業務中文名（絕不顯示 NXxx）
// - 依權限亮 / 反灰
// - 反灰磚：鎖頭 icon、不可點、不顯任何內容
// - 角標數字段② 做、本段一律不顯

'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';
import { useMemo } from 'react';

import { useSessionMe } from '@/features/auth/hooks/useSessionMe';
import type { MeDto } from '@/features/auth/types';

import { MODULE_TILES, type ModuleTileDef } from './modules.config';

/** 判斷該模組磚是否亮（有任一該 prefix view code 的 can_read=true）*/
function canAccessModule(me: MeDto | null, prefix: string): boolean {
  if (!me) return false;
  const vp = me.view_permissions;
  // SYSADMIN / OWNER：view_permissions === null → 全部模組亮
  if (vp === null || vp === undefined) return true;
  for (const [code, entry] of Object.entries(vp)) {
    if (code.startsWith(prefix) && entry?.can_read) return true;
  }
  return false;
}

export function ModuleTilesBody() {
  const { me } = useSessionMe();

  const tiles = useMemo(
    () =>
      MODULE_TILES.map((t) => ({
        ...t,
        active: canAccessModule(me as MeDto | null, t.viewCodePrefix),
      })),
    [me],
  );

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6">
      {/* 6 磚 grid：手機 2 欄、平板 3 欄、桌面 6 欄一排（一頁排得下、不用捲）*/}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 lg:gap-5 w-full max-w-6xl">
        {tiles.map((t) => (
          <ModuleTile key={t.id} tile={t} />
        ))}
      </div>
    </div>
  );
}

function ModuleTile({ tile }: { tile: ModuleTileDef & { active: boolean } }) {
  const { label, href, Icon, active } = tile;

  const inner = (
    <div
      className={[
        'group relative flex aspect-square flex-col items-center justify-center gap-3',
        'rounded-xl border bg-[#11111A]/70 backdrop-blur-sm',
        'transition-all',
        active
          ? 'border-zinc-700 hover:border-amber-500/60 hover:bg-[#1a1a25] cursor-pointer'
          : 'border-zinc-900 cursor-not-allowed opacity-50',
      ].join(' ')}
    >
      {/* 鎖頭：反灰磚右上 */}
      {!active ? (
        <Lock className="absolute right-3 top-3 size-3.5 text-zinc-600" />
      ) : null}

      {/* 圖示：大、置中 */}
      <Icon
        className={[
          'size-12 transition-colors',
          active ? 'text-zinc-200 group-hover:text-amber-300' : 'text-zinc-700',
        ].join(' ')}
        strokeWidth={1.5}
      />

      {/* 業務中文名（⚠️ 唯一顯示給客戶的文字、不換 NXxx）*/}
      <span
        className={[
          'text-base font-medium tracking-wide',
          active ? 'text-zinc-100' : 'text-zinc-600',
        ].join(' ')}
      >
        {label}
      </span>
    </div>
  );

  if (!active) return inner;
  return (
    <Link href={href} aria-label={label} className="block">
      {inner}
    </Link>
  );
}
