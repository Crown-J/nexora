// apps/nx-ui/src/features/home-dashboard/HomeDashboardBody.tsx
// 首頁儀表板主體（Sub 2 串接完成版）
//
// 權限判斷規則：
// - me.view_permissions === null（SYSADMIN / OWNER）→ 全部顯示
// - me.view_permissions[viewCode]?.can_read === true → 顯示
//
// Sub 2 串接：
// - 21 個現況數字卡：對既有 list endpoint 拉 total
// - 下半部公告：/nx01/bulletins?pageSize=5
// - 下半部待辦池：/nx98/task-pool?pageSize=5

'use client';

import Link from 'next/link';
import { Bell, ListTodo } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { useSessionMe } from '@/features/auth/hooks/useSessionMe';
import type { MeDto } from '@/features/auth/types';

import {
  fetchCardCount,
  fetchHomeBulletins,
  fetchHomeTasks,
  type BulletinSummary,
  type TaskPoolItem,
} from './api';
import { HOME_CARDS, HOME_CARDS_PREMIUM_KPI, type HomeCardDef } from './cards.config';
import { StatusCard } from './StatusCard';

/** 判斷該 viewCode 是否能 read（用 me API view_permissions 結構）*/
function canReadView(me: MeDto | null, viewCode: string): boolean {
  if (!me) return false;
  const vp = me.view_permissions;
  if (vp === null || vp === undefined) return true; // SYSADMIN / OWNER 全開
  const entry = vp[viewCode];
  if (!entry) return false;
  return Boolean(entry.can_read);
}

type CardState =
  | { state: 'loading' }
  | { state: 'ok'; value: number }
  | { state: 'error' }
  | { state: 'pending' };

export function HomeDashboardBody() {
  const { me } = useSessionMe();

  // 依權限過濾現況卡 + KPI 套件
  const visibleCards = useMemo<HomeCardDef[]>(
    () => HOME_CARDS.filter((c) => canReadView(me as MeDto | null, c.viewCode)),
    [me],
  );
  const visiblePremium = useMemo<HomeCardDef[]>(
    () => HOME_CARDS_PREMIUM_KPI.filter((c) => canReadView(me as MeDto | null, c.viewCode)),
    [me],
  );

  // 每張卡的數字狀態（key = viewCode + title）
  const [cardStates, setCardStates] = useState<Record<string, CardState>>({});
  const [bulletins, setBulletins] = useState<BulletinSummary[] | null>(null);
  const [bulletinErr, setBulletinErr] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskPoolItem[] | null>(null);
  const [taskErr, setTaskErr] = useState<string | null>(null);

  // 拉每張可見卡的 endpoint
  useEffect(() => {
    if (!me) return;
    // 修法 2：mustChange=true 期間不 fetch（avoid useSessionMe redirect race、
    // useSessionMe 偵測到 mustChange 會 router.replace('/change-password')、
    // 期間在路由切換 + token state 不穩定、21 個平行 fetch 容易誤拿 401 → 全紅）
    if ((me as MeDto).must_change_password) return;
    let cancelled = false;

    // 初始：所有卡 loading（isPending 例外）
    const init: Record<string, CardState> = {};
    visibleCards.forEach((c) => {
      const key = c.viewCode + c.title;
      if (c.isPending || !c.endpoint) {
        init[key] = { state: 'pending' };
      } else {
        init[key] = { state: 'loading' };
      }
    });
    setCardStates(init);

    // 平行 fetch
    for (const card of visibleCards) {
      if (card.isPending || !card.endpoint) continue;
      const key = card.viewCode + card.title;
      const ep = card.endpoint;
      fetchCardCount(ep)
        .then((n) => {
          if (cancelled) return;
          setCardStates((prev) => ({ ...prev, [key]: { state: 'ok', value: n } }));
        })
        .catch(() => {
          if (cancelled) return;
          setCardStates((prev) => ({ ...prev, [key]: { state: 'error' } }));
        });
    }

    // 公告 + 待辦池
    fetchHomeBulletins()
      .then((rows) => {
        if (cancelled) return;
        setBulletins(rows);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setBulletinErr(e instanceof Error ? e.message : '載入失敗');
      });
    fetchHomeTasks()
      .then((rows) => {
        if (cancelled) return;
        setTasks(rows);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setTaskErr(e instanceof Error ? e.message : '載入失敗');
      });

    return () => {
      cancelled = true;
    };
  }, [me, visibleCards]);

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
      {/* 上半部：現況數字 */}
      <section>
        <h2 className="mb-2 text-[10px] uppercase tracking-[0.3em] text-zinc-500">重點儀表板</h2>
        {visibleCards.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-6 text-center text-xs text-zinc-500">
            目前沒有任何子功能權限、無可顯示卡片。
            <br />
            請聯絡負責人或 HR 確認您的角色配置。
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {visibleCards.map((card) => {
              const key = card.viewCode + card.title;
              const cs = cardStates[key] ?? { state: 'loading' };
              return (
                <StatusCard
                  key={key}
                  title={card.title}
                  href={card.href}
                  category={card.category}
                  unit={card.unit}
                  hint={card.hint}
                  state={cs.state}
                  value={cs.state === 'ok' ? cs.value : null}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* KPI 套件 */}
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

      {/* 下半部：公告 + 待辦池 兩欄 */}
      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* 公告 */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-zinc-500">
            <Bell className="size-3" />
            公告
          </h3>
          {bulletinErr ? (
            <div className="text-xs text-rose-400">載入失敗：{bulletinErr}</div>
          ) : bulletins === null ? (
            <div className="space-y-2">
              <span className="inline-block h-4 w-2/3 animate-pulse rounded bg-zinc-800" />
              <span className="inline-block h-4 w-3/4 animate-pulse rounded bg-zinc-800" />
              <span className="inline-block h-4 w-1/2 animate-pulse rounded bg-zinc-800" />
            </div>
          ) : bulletins.length === 0 ? (
            <div className="text-xs text-zinc-600">無公告</div>
          ) : (
            <ul className="space-y-2 text-xs">
              {bulletins.map((b) => (
                <li key={b.id} className="border-b border-zinc-900 pb-2 last:border-b-0">
                  <Link
                    href={`/dashboard/base/bulletins/${b.id}`}
                    className="flex items-baseline justify-between gap-2 text-zinc-200 hover:text-amber-300"
                  >
                    <span className="truncate">{b.title}</span>
                    {b.publishedAt ? (
                      <span className="shrink-0 text-[10px] text-zinc-600">
                        {new Date(b.publishedAt).toLocaleDateString('zh-TW')}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 待辦池 */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-zinc-500">
            <ListTodo className="size-3" />
            共享待辦池
          </h3>
          {taskErr ? (
            <div className="text-xs text-rose-400">載入失敗：{taskErr}</div>
          ) : tasks === null ? (
            <div className="space-y-2">
              <span className="inline-block h-4 w-2/3 animate-pulse rounded bg-zinc-800" />
              <span className="inline-block h-4 w-3/4 animate-pulse rounded bg-zinc-800" />
              <span className="inline-block h-4 w-1/2 animate-pulse rounded bg-zinc-800" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-xs text-zinc-600">無待辦</div>
          ) : (
            <ul className="space-y-2 text-xs">
              {tasks.map((t) => (
                <li
                  key={t.id}
                  className="flex items-baseline justify-between gap-2 border-b border-zinc-900 pb-2 last:border-b-0"
                >
                  <span className="truncate text-zinc-200">{t.title}</span>
                  <span className="shrink-0 text-[10px] uppercase text-zinc-600">{t.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
