// apps/nx-ui/src/features/home-dashboard/HomeDashboardBody.tsx
// 首頁儀表板主體：上半部 21 張現況數字卡（依權限掃）+ KPI 6 張（選購套件）
//
// 權限判斷規則：
// - me.view_permissions === null（SYSADMIN / OWNER）→ 全部顯示
// - me.view_permissions[viewCode]?.can_read === true → 顯示
// - 其餘 → 不顯示
//
// Sub 1：UI 殼層、數字用 placeholder loading 狀態
// Sub 2：串各卡 endpoint 拉真實數字
// Sub 3：下半部公告 + task-pool + 刪 v0 mock + 設定精靈 bug

'use client';

import { useMemo } from 'react';

import { useSessionMe } from '@/features/auth/hooks/useSessionMe';
import type { MeDto } from '@/features/auth/types';

import { HOME_CARDS, HOME_CARDS_PREMIUM_KPI, type HomeCardDef } from './cards.config';
import { StatusCard } from './StatusCard';

/** 判斷該 viewCode 是否能 read（用 me API view_permissions 結構）*/
function canReadView(me: MeDto | null, viewCode: string): boolean {
  if (!me) return false;
  const vp = me.view_permissions;
  // SYSADMIN / OWNER：view_permissions === null → 全開
  if (vp === null || vp === undefined) return true;
  const entry = vp[viewCode];
  if (!entry) return false;
  return Boolean(entry.can_read);
}

export function HomeDashboardBody() {
  const { me } = useSessionMe();

  // 依權限過濾現況卡（Sub 2 才接 API、目前全部 loading）
  const visibleCards = useMemo<HomeCardDef[]>(() => {
    return HOME_CARDS.filter((c) => canReadView(me as MeDto | null, c.viewCode));
  }, [me]);

  // KPI 選購套件卡：用同 viewCode 判斷顯示、但永遠 premium 狀態
  const visiblePremium = useMemo<HomeCardDef[]>(() => {
    return HOME_CARDS_PREMIUM_KPI.filter((c) => canReadView(me as MeDto | null, c.viewCode));
  }, [me]);

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
      {/* 上半部：現況數字（依權限） */}
      <section>
        <h2 className="mb-2 text-[10px] uppercase tracking-[0.3em] text-zinc-500">
          重點儀表板
        </h2>
        {visibleCards.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-6 text-center text-xs text-zinc-500">
            目前沒有任何子功能權限、無可顯示卡片。<br />
            請聯絡負責人或 HR 確認您的角色配置。
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {visibleCards.map((card) => (
              <StatusCard
                key={`${card.viewCode}-${card.title}`}
                title={card.title}
                href={card.href}
                category={card.category}
                unit={card.unit}
                hint={card.hint}
                state="loading"
                value={null}
              />
            ))}
          </div>
        )}
      </section>

      {/* KPI 選購套件區塊 */}
      {visiblePremium.length > 0 ? (
        <section>
          <h2 className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-zinc-500">
            <span>KPI</span>
            <span className="rounded border border-amber-700/40 bg-amber-900/20 px-1.5 py-0.5 text-[10px] text-amber-300 normal-case tracking-normal">
              選購套件
            </span>
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {visiblePremium.map((card) => (
              <StatusCard
                key={`${card.viewCode}-${card.title}-premium`}
                title={card.title}
                href={card.href}
                category={card.category}
                unit={card.unit}
                hint={card.hint}
                state="premium"
                value={null}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* 下半部：公告 + 待辦池（Sub 2 接 API、Sub 3 刪 v0 mock）*/}
      <section className="mt-2">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4 text-xs text-zinc-500">
          📌 下半部「公告 + 共享待辦池」Sub 2 接 API 後顯示。
        </div>
      </section>
    </div>
  );
}
