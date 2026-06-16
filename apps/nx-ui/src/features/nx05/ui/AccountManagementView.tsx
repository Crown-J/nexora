// apps/nx-ui/src/features/nx05/ui/AccountManagementView.tsx
// v1.2 階段 F P4：帳戶管理（往來帳戶 vs 自有銀行帳戶分開、意圖書 §6.2）
'use client';

import { useState } from 'react';
import { Building2, Landmark } from 'lucide-react';

import { PartnerMasterPage } from '@/features/nx01/partner/partner-zoned';

type Tab = 'partner' | 'bank';

const EDITABLE_ZONES = new Set(['basic', 'finance'] as const);

export function AccountManagementView() {
  const [tab, setTab] = useState<Tab>('partner');

  return (
    <div className="flex h-dvh flex-col">
      {/* Tab 切換列 */}
      <div className="flex items-center gap-1 border-b border-[#2A2A30] bg-[#0A0A0C] px-4 py-2">
        <span className="text-[10px] uppercase tracking-[0.18em] text-[#5A5A60]">帳戶分類</span>
        <button
          type="button"
          onClick={() => setTab('partner')}
          className={`ml-2 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors ${
            tab === 'partner'
              ? 'border-[#E8A020]/60 bg-[#E8A020]/10 text-[#E8A020]'
              : 'border-[#3A3A42] text-[#888892] hover:border-[#5A5A60]'
          }`}
        >
          <Building2 className="size-3.5" /> 往來帳戶（應收應付）
        </button>
        <button
          type="button"
          onClick={() => setTab('bank')}
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors ${
            tab === 'bank'
              ? 'border-[#E8A020]/60 bg-[#E8A020]/10 text-[#E8A020]'
              : 'border-[#3A3A42] text-[#888892] hover:border-[#5A5A60]'
          }`}
        >
          <Landmark className="size-3.5" /> 自有銀行帳戶（資金存放）
        </button>
        <span className="ml-auto text-[10px] text-[#5A5A60]">
          意圖書 §6.2：往來帳戶 vs 自有銀行兩類分開呈現
        </span>
      </div>

      {/* tab 內容 */}
      <div className="min-h-0 flex-1">
        {tab === 'partner' ? (
          <PartnerMasterPage
            pageCategory="財務"
            pageTitle="帳戶管理"
            entityNoun="帳戶"
            editableZones={EDITABLE_ZONES}
            createDefaultPartnerType="C"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
            <Landmark className="size-12 text-[#5A5A60]" />
            <h2 className="text-base font-semibold text-[#E8E8EB]">自有銀行帳戶</h2>
            <p className="max-w-md text-xs text-[#888892]">
              「我方持有的銀行帳戶」（玉山 / 國泰 / 中信 等）、跟「跟誰開戶的銀行 partner」不同類。
            </p>
            <div className="mt-4 rounded-md border border-[#E8A020]/30 bg-[#E8A020]/8 px-4 py-3 text-xs text-[#E8A020]">
              ⚠️ 此分類後續軌啟用、需新建{' '}
              <span className="font-mono">nx05_bank_account</span> schema
              <br />
              （階段 F P1 6 個 schema 變更後不再動 schema、列入 closure 後續軌）
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
