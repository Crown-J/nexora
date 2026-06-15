// apps/nx-ui/src/app/dashboard/task-pool/page.tsx
// LITE 階段 1 M4：共享待辦池主頁（我的待辦 + 部門池 + 全部）

'use client';

import { useEffect, useState } from 'react';
import {
  claimTask,
  completeTask,
  createTaskPool,
  listTaskPool,
  releaseTask,
  voidTask,
} from '@/features/nx98/task-pool/api/task-pool';
import {
  CATEGORY_LABEL,
  PRIORITY_LABEL,
  STATUS_LABEL,
  type TaskPoolDto,
  type TaskPriority,
  type TaskScope,
} from '@data/types/nx98/task-pool';
import {
  TieredField,
  TieredFormProvider,
  TieredFormToolbar,
} from '@/features/shared/tiered-form';

type CreateForm = {
  title: string;
  description: string;
  category: string;
  priority: TaskPriority;
  dueDate: string;
};

const EMPTY_FORM: CreateForm = {
  title: '',
  description: '',
  category: 'OTHER',
  priority: 'M',
  dueDate: '',
};

export default function TaskPoolPage() {
  const [scope, setScope] = useState<TaskScope>('mine');
  const [rows, setRows] = useState<TaskPoolDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await listTaskPool({ scope, pageSize: 50 });
      setRows(res.rows);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  async function onCreate() {
    if (!form.title.trim() || !form.category.trim()) {
      setError('請填必要欄位：title / category');
      return;
    }
    try {
      await createTaskPool({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        category: form.category.trim(),
        priority: form.priority,
        dueDate: form.dueDate || undefined,
      });
      setShowForm(false);
      setForm(EMPTY_FORM);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function doAction(id: string, action: 'claim' | 'release' | 'complete' | 'void') {
    setBusyId(id);
    try {
      if (action === 'claim') await claimTask(id);
      else if (action === 'release') await releaseTask(id);
      else if (action === 'complete') await completeTask(id);
      else await voidTask(id);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl p-6 text-white">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">共享待辦池</h1>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="rounded-lg bg-emerald-500/80 px-4 py-2 text-sm font-medium hover:bg-emerald-500"
        >
          {showForm ? '取消' : '+ 新建待辦'}
        </button>
      </div>

      {/* scope tabs */}
      <div className="mb-4 flex gap-2">
        {([
          ['mine', '我的待辦'],
          ['pool', '池中（未領）'],
          ['all', '全部'],
        ] as [TaskScope, string][]).map(([s, label]) => (
          <button
            key={s}
            type="button"
            onClick={() => setScope(s)}
            className={`rounded-lg px-3 py-1.5 text-sm ${scope === s ? 'bg-white/20' : 'bg-white/5 hover:bg-white/10'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-300">{error}</div>}

      {showForm && (
        <TieredFormProvider defaultMode="lite">
        <div className="mb-6 rounded-lg border border-white/10 bg-black/30 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">新建待辦</h2>
            <TieredFormToolbar />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <TieredField tier="required" label="標題" className="md:col-span-2">
              <input
                className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </TieredField>
            <TieredField tier="required" label="分類">
              <select
                className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </TieredField>
            <TieredField tier="recommended" label="優先級" hint="預設 M（中）">
              <select
                className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}
              >
                {(['L', 'M', 'H'] as TaskPriority[]).map((p) => (
                  <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
                ))}
              </select>
            </TieredField>
            <TieredField tier="recommended" label="截止日期" hint="超過會在列表標紅">
              <input
                type="date"
                className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </TieredField>
            <TieredField tier="recommended" label="詳細說明" hint="領取人看到" className="md:col-span-2">
              <textarea
                rows={3}
                className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </TieredField>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={onCreate}
              className="rounded-lg bg-emerald-500/80 px-4 py-2 text-sm hover:bg-emerald-500"
            >
              建立
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
              className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
            >
              取消
            </button>
          </div>
        </div>
        </TieredFormProvider>
      )}

      {loading ? (
        <div className="text-white/60">載入中…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-black/20 p-12 text-center text-white/50">
          {scope === 'mine' ? '我沒待辦。可點上方「全部」或「池中」看共享待辦。' : '池中目前沒有未領取的待辦。'}
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={priorityBadgeClass(r.priority)}>{PRIORITY_LABEL[r.priority]}</span>
                    <span className={statusBadgeClass(r.status)}>{STATUS_LABEL[r.status]}</span>
                    <span className="text-xs text-white/50">{CATEGORY_LABEL[r.category] ?? r.category}</span>
                    {r.dueDate && <span className="text-xs text-white/50">截止：{r.dueDate.slice(0, 10)}</span>}
                  </div>
                  <div className="mt-1 font-medium">{r.title}</div>
                  {r.description && <div className="mt-1 text-sm text-white/60">{r.description}</div>}
                  {r.sourceModule && (
                    <div className="mt-1 text-xs text-white/40">
                      來源：{r.sourceModule} {r.sourceDocType} {r.sourceDocNo}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  {r.status === 'OPEN' && (
                    <button
                      disabled={busyId === r.id}
                      onClick={() => doAction(r.id, 'claim')}
                      className="rounded bg-blue-500/70 px-2 py-1 text-xs hover:bg-blue-500"
                    >領取</button>
                  )}
                  {r.status === 'CLAIMED' && (
                    <>
                      <button
                        disabled={busyId === r.id}
                        onClick={() => doAction(r.id, 'complete')}
                        className="rounded bg-emerald-500/70 px-2 py-1 text-xs hover:bg-emerald-500"
                      >完成</button>
                      <button
                        disabled={busyId === r.id}
                        onClick={() => doAction(r.id, 'release')}
                        className="rounded bg-white/10 px-2 py-1 text-xs hover:bg-white/20"
                      >放回池</button>
                    </>
                  )}
                  {(r.status === 'OPEN' || r.status === 'CLAIMED') && (
                    <button
                      disabled={busyId === r.id}
                      onClick={() => doAction(r.id, 'void')}
                      className="rounded bg-red-500/40 px-2 py-1 text-xs hover:bg-red-500/70"
                    >作廢</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function statusBadgeClass(s: string): string {
  const base = 'rounded px-2 py-0.5 text-xs';
  switch (s) {
    case 'OPEN': return `${base} bg-white/10 text-white/80`;
    case 'CLAIMED': return `${base} bg-blue-500/30 text-blue-200`;
    case 'DONE': return `${base} bg-emerald-500/30 text-emerald-200`;
    case 'VOIDED': return `${base} bg-red-500/30 text-red-200`;
    default: return base;
  }
}

function priorityBadgeClass(p: string): string {
  const base = 'rounded px-2 py-0.5 text-xs';
  switch (p) {
    case 'H': return `${base} bg-red-500/30 text-red-200`;
    case 'M': return `${base} bg-amber-500/30 text-amber-200`;
    case 'L': return `${base} bg-white/10 text-white/60`;
    default: return base;
  }
}
