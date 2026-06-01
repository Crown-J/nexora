// apps/nx-ui/src/app/platform/customers/[id]/page.tsx
// 平台層 vs 租戶層分離軌 Phase 4：平台後台客戶租戶詳情

'use client';

import Link from 'next/link';
import { use, useEffect, useState } from 'react';

import { getTenant, type TenantDetail } from '@/features/platform/tenants/api';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function PlatformCustomerDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getTenant(id)
      .then((d) => {
        if (cancelled) return;
        setTenant(d);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setErr(e instanceof Error ? e.message : 'load failed');
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (err) {
    return (
      <div className="space-y-3">
        <Link href="/platform/customers" className="text-xs text-zinc-500 hover:text-zinc-300">
          ← Customers
        </Link>
        <div className="border border-red-900 bg-red-950 text-red-300 text-xs p-3">{err}</div>
      </div>
    );
  }
  if (!tenant) {
    return <div className="text-zinc-600 text-xs">loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Link href="/platform/customers" className="text-xs text-zinc-500 hover:text-zinc-300">
        ← Customers
      </Link>

      <header className="space-y-1">
        <p className="text-[10px] tracking-[0.3em] uppercase text-zinc-600">
          Platform / Customers / <span className="text-zinc-400">{tenant.code}</span>
        </p>
        <h1 className="text-2xl tracking-tight text-zinc-100">{tenant.name}</h1>
        {tenant.nameEn ? <p className="text-xs text-zinc-500">{tenant.nameEn}</p> : null}
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Plan" value={tenant.planCode ?? '—'} />
        <Stat label="Status" value={tenant.isActive ? 'Active' : 'Inactive'} valueClass={tenant.isActive ? 'text-emerald-300' : 'text-zinc-500'} />
        <Stat label="Users" value={String(tenant.stats.userCount)} />
      </div>

      <section className="border border-zinc-800 bg-zinc-950">
        <SectionHeader>Identity</SectionHeader>
        <SectionRow label="Tenant ID" value={tenant.id} mono />
        <SectionRow label="Code" value={tenant.code} mono />
        <SectionRow label="Tax ID" value={tenant.taxId ?? '—'} mono />
        <SectionRow label="Address" value={tenant.address ?? '—'} />
        <SectionRow label="Phone" value={tenant.phone ?? '—'} />
        <SectionRow label="Logo URL" value={tenant.logoUrl ?? '—'} />
      </section>

      <section className="border border-zinc-800 bg-zinc-950">
        <SectionHeader>Owner Contact</SectionHeader>
        <SectionRow label="Name" value={tenant.contactName ?? '—'} />
        <SectionRow label="Email" value={tenant.contactEmail ?? '—'} />
        <SectionRow label="Phone" value={tenant.contactPhone ?? '—'} />
      </section>

      <section className="border border-zinc-800 bg-zinc-950">
        <SectionHeader>Subscription</SectionHeader>
        {tenant.subscription ? (
          <>
            <SectionRow label="Plan" value={`${tenant.subscription.planName} (${tenant.subscription.planCode})`} />
            <SectionRow label="Seats" value={String(tenant.subscription.seats)} />
            <SectionRow label="Start" value={tenant.subscription.startAt} mono />
            <SectionRow label="End" value={tenant.subscription.endAt} mono />
            <SectionRow label="Status" value={tenant.subscription.status} mono />
          </>
        ) : (
          <div className="p-3 text-xs text-zinc-600">無啟用中的訂閱方案</div>
        )}
      </section>

      <section className="border border-zinc-800 bg-zinc-950">
        <SectionHeader>Audit</SectionHeader>
        <SectionRow label="Created" value={`${new Date(tenant.createdAt).toLocaleString('zh-TW')} · by ${tenant.createdBy}`} mono />
        <SectionRow label="Updated" value={`${new Date(tenant.updatedAt).toLocaleString('zh-TW')} · by ${tenant.updatedBy}`} mono />
        <SectionRow label="Data start date" value={tenant.dataStartDate ?? '—'} />
        <SectionRow label="Import wizard done" value={tenant.importWizardCompletedAt ?? '—'} />
      </section>
    </div>
  );
}

function Stat({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="border border-zinc-800 bg-zinc-950 p-4">
      <div className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">{label}</div>
      <div className={`text-lg ${valueClass ?? 'text-zinc-100'}`}>{value}</div>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 py-2 border-b border-zinc-800 text-[10px] uppercase tracking-widest text-zinc-500 bg-zinc-900/50">
      {children}
    </div>
  );
}

function SectionRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[160px_1fr] px-3 py-2 border-b border-zinc-900 text-xs last:border-b-0">
      <div className="text-zinc-500">{label}</div>
      <div className={mono ? 'font-mono text-zinc-300' : 'text-zinc-300'}>{value}</div>
    </div>
  );
}
