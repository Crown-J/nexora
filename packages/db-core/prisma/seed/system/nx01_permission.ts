// packages/db-core/prisma/seed/system/nx01_permission.ts
// @FUNCTION_CODE SYS-SEED-SVC-PERM-001
// 系統層：v1.2 對齊軌 A+B 權限目錄（無 tenant scope、所有租戶共用）
//
// 對齊 v1.2 §12.2「角色與權限頁面」樹狀勾選的「系統提供的權限項目」。
// 用戶在 UI 不能新增權限本身、只能組合（v1.2 §12.2 ⭐ 第二點）。

import type { PrismaClient } from '../../../generated/prisma';

interface PermissionRow {
  code: string;
  moduleCode: string;
  category: string;
  action: string;
  name: string;
  description?: string;
  sortNo: number;
}

/// 通用 CRUD 動作（list/view/create/edit/delete/export）
function crudPerms(
  moduleCode: string,
  category: string,
  zhCategory: string,
  baseSort: number,
): PermissionRow[] {
  const actions: { action: string; zh: string }[] = [
    { action: 'list', zh: '檢視' },
    { action: 'view', zh: '檢視單筆' },
    { action: 'create', zh: '新增' },
    { action: 'edit', zh: '編輯' },
    { action: 'delete', zh: '刪除 / 停用' },
    { action: 'export', zh: '匯出' },
  ];
  return actions.map((a, i) => ({
    code: `${moduleCode}.${category}.${a.action}`,
    moduleCode,
    category,
    action: a.action,
    name: `${zhCategory}.${a.zh}`,
    sortNo: baseSort + i,
  }));
}

const ALL_PERMS: PermissionRow[] = [
  // ────────────────────────────────────────────
  // 進貨作業 purchase
  // ────────────────────────────────────────────
  ...crudPerms('purchase', 'rfq', '詢價單', 1010),
  ...crudPerms('purchase', 'po', '採購單', 1020),
  ...crudPerms('purchase', 'rr', '進貨單', 1030),
  ...crudPerms('purchase', 'pr', '退貨單', 1040),
  ...crudPerms('purchase', 'demand', '採購需求單', 1050),
  ...crudPerms('purchase', 'warranty-claim', '保固申請單', 1060),
  ...crudPerms('purchase', 'vendor', '供應商管理', 1070),
  ...crudPerms('purchase', 'product', '產品（進貨角度）', 1080),
  {
    code: 'purchase.rr.post',
    moduleCode: 'purchase',
    category: 'rr',
    action: 'post',
    name: '進貨單.過帳驗收',
    sortNo: 1035,
  },
  {
    code: 'purchase.warranty-claim.approve',
    moduleCode: 'purchase',
    category: 'warranty-claim',
    action: 'approve',
    name: '保固申請單.核可',
    sortNo: 1065,
  },

  // ────────────────────────────────────────────
  // 銷貨作業 sale
  // ────────────────────────────────────────────
  ...crudPerms('sale', 'quote', '報價單', 2010),
  ...crudPerms('sale', 'so', '銷貨單', 2020),
  ...crudPerms('sale', 'sr', '銷退單', 2030),
  ...crudPerms('sale', 'ti', '同行調貨單', 2040),
  ...crudPerms('sale', 'customer', '客戶管理（銷貨角度）', 2050),
  ...crudPerms('sale', 'product-issue', '產品回報', 2060),
  // v1.2 階段 E P3：銷貨產品（售價維護角度）。對齊 v1.1 §3.2 屏障 1
  // 「售價只放銷售頁、業務不必拿主檔中心 key 也能維護售價」。Alex 2026-05-30 拍板補。
  ...crudPerms('sale', 'product', '產品（銷貨角度）', 2080),
  {
    code: 'sale.so.post',
    moduleCode: 'sale',
    category: 'so',
    action: 'post',
    name: '銷貨單.出貨過帳',
    sortNo: 2025,
  },
  {
    code: 'sale.sr.post',
    moduleCode: 'sale',
    category: 'sr',
    action: 'post',
    name: '銷退單.過帳',
    sortNo: 2035,
  },
  {
    code: 'sale.customer.grade-change.request',
    moduleCode: 'sale',
    category: 'customer-grade-change',
    action: 'request',
    name: '客戶等級變更.申請',
    sortNo: 2070,
  },
  {
    code: 'sale.customer.grade-change.approve',
    moduleCode: 'sale',
    category: 'customer-grade-change',
    action: 'approve',
    name: '客戶等級變更.核可 / 退回',
    sortNo: 2071,
  },

  // ────────────────────────────────────────────
  // 庫存作業 inventory
  // ────────────────────────────────────────────
  ...crudPerms('inventory', 'stocktake', '盤點單', 3010),
  ...crudPerms('inventory', 'stock-query', '庫存查詢', 3020),
  ...crudPerms('inventory', 'issue-report', '異常回報', 3030),
  ...crudPerms('inventory', 'conversion', '重組 / 分解', 3040),
  ...crudPerms('inventory', 'location', '庫位管理', 3050),
  ...crudPerms('inventory', 'part-stock-setting', '產品庫存設定（安全量等）', 3060),
  {
    code: 'inventory.stocktake.approve',
    moduleCode: 'inventory',
    category: 'stocktake',
    action: 'approve',
    name: '盤點單.核可',
    sortNo: 3015,
  },
  {
    code: 'inventory.stocktake.post',
    moduleCode: 'inventory',
    category: 'stocktake',
    action: 'post',
    name: '盤點單.過帳',
    sortNo: 3016,
  },
  {
    code: 'inventory.workstation.picking',
    moduleCode: 'inventory',
    category: 'workstation',
    action: 'picking',
    name: '工作站.撿貨',
    sortNo: 3070,
  },
  {
    code: 'inventory.workstation.packing',
    moduleCode: 'inventory',
    category: 'workstation',
    action: 'packing',
    name: '工作站.包貨',
    sortNo: 3071,
  },
  {
    code: 'inventory.workstation.delivery',
    moduleCode: 'inventory',
    category: 'workstation',
    action: 'delivery',
    name: '工作站.配送',
    sortNo: 3072,
  },
  {
    code: 'inventory.workstation.receiving',
    moduleCode: 'inventory',
    category: 'workstation',
    action: 'receiving',
    name: '工作站.驗收',
    sortNo: 3073,
  },

  // ────────────────────────────────────────────
  // 財務作業 finance（NX05、目前多數未做、權限先建好）
  // ────────────────────────────────────────────
  ...crudPerms('finance', 'ar', '應收帳款', 4010),
  ...crudPerms('finance', 'ap', '應付帳款', 4020),
  ...crudPerms('finance', 'voucher', '票據', 4030),
  ...crudPerms('finance', 'closing', '關帳作業', 4040),
  ...crudPerms('finance', 'account', '帳戶（財務角度）', 4050),
  {
    code: 'finance.ar.writeoff',
    moduleCode: 'finance',
    category: 'ar',
    action: 'writeoff',
    name: '應收帳款.沖銷',
    sortNo: 4015,
  },
  {
    code: 'finance.ap.writeoff',
    moduleCode: 'finance',
    category: 'ap',
    action: 'writeoff',
    name: '應付帳款.沖銷',
    sortNo: 4025,
  },
  {
    code: 'finance.closing.execute',
    moduleCode: 'finance',
    category: 'closing',
    action: 'execute',
    name: '關帳作業.執行關帳',
    sortNo: 4045,
  },

  // ────────────────────────────────────────────
  // 報表 report（NX08、目前多數未做、權限先建好）
  // ────────────────────────────────────────────
  {
    code: 'report.personal.view',
    moduleCode: 'report',
    category: 'personal',
    action: 'view',
    name: '個人月報.檢視',
    sortNo: 5010,
  },
  {
    code: 'report.personal.view-others',
    moduleCode: 'report',
    category: 'personal',
    action: 'view-others',
    name: '個人月報.檢視他人（限主管）',
    sortNo: 5011,
  },
  {
    code: 'report.sales.view',
    moduleCode: 'report',
    category: 'sales',
    action: 'view',
    name: '銷售報表.檢視',
    sortNo: 5020,
  },
  {
    code: 'report.purchase.view',
    moduleCode: 'report',
    category: 'purchase',
    action: 'view',
    name: '進貨報表.檢視',
    sortNo: 5030,
  },
  {
    code: 'report.inventory.view',
    moduleCode: 'report',
    category: 'inventory',
    action: 'view',
    name: '庫存報表.檢視',
    sortNo: 5040,
  },
  {
    code: 'report.finance.view',
    moduleCode: 'report',
    category: 'finance',
    action: 'view',
    name: '財務報表（三大財報）.檢視',
    sortNo: 5050,
  },
  {
    code: 'report.operation.view',
    moduleCode: 'report',
    category: 'operation',
    action: 'view',
    name: '營運報表（負責人看板）.檢視',
    sortNo: 5060,
  },
  {
    code: 'report.export',
    moduleCode: 'report',
    category: 'common',
    action: 'export',
    name: '報表.匯出 Excel',
    sortNo: 5070,
  },

  // ────────────────────────────────────────────
  // 主檔 master
  // ────────────────────────────────────────────
  ...crudPerms('master', 'customer', '客戶主檔', 6010),
  ...crudPerms('master', 'supplier', '供應商主檔', 6020),
  ...crudPerms('master', 'peer', '同行主檔', 6030),
  ...crudPerms('master', 'bank', '銀行主檔', 6040),
  ...crudPerms('master', 'vendor', '一般廠商主檔', 6050),
  ...crudPerms('master', 'product', '產品主檔', 6060),
  ...crudPerms('master', 'warehouse', '倉庫 / 庫位主檔', 6070),
  ...crudPerms('master', 'employee', '員工主檔', 6080),
  {
    code: 'master.import',
    moduleCode: 'master',
    category: 'common',
    action: 'import',
    name: '主檔.Excel 匯入',
    sortNo: 6090,
  },

  // ────────────────────────────────────────────
  // 設定 settings（負責人 OWNER 專屬、由 isSystem OWNER 角色自動全擁有）
  // ────────────────────────────────────────────
  {
    code: 'settings.company.edit',
    moduleCode: 'settings',
    category: 'company',
    action: 'edit',
    name: '設定.公司資料.編輯',
    sortNo: 7010,
  },
  {
    code: 'settings.role.list',
    moduleCode: 'settings',
    category: 'role',
    action: 'list',
    name: '設定.角色與權限.檢視',
    sortNo: 7020,
  },
  {
    code: 'settings.role.create',
    moduleCode: 'settings',
    category: 'role',
    action: 'create',
    name: '設定.角色與權限.新增 / 編輯',
    sortNo: 7021,
  },
  {
    code: 'settings.role.delete',
    moduleCode: 'settings',
    category: 'role',
    action: 'delete',
    name: '設定.角色與權限.停用',
    sortNo: 7022,
  },
  {
    code: 'settings.system-param.edit',
    moduleCode: 'settings',
    category: 'system-param',
    action: 'edit',
    name: '設定.系統參數.編輯（毛利率 / 客套話 / 起算日）',
    sortNo: 7030,
  },
  {
    code: 'settings.account.manage',
    moduleCode: 'settings',
    category: 'account',
    action: 'manage',
    name: '設定.帳號管理（員工 list / 停用 / 重設密碼）',
    sortNo: 7040,
  },
  {
    code: 'settings.wizard.reset',
    moduleCode: 'settings',
    category: 'wizard',
    action: 'reset',
    name: '設定.引導精靈.重置',
    sortNo: 7050,
  },
];

export async function seedNx01Permission(prisma: PrismaClient): Promise<void> {
  for (const p of ALL_PERMS) {
    await prisma.nx01Permission.upsert({
      where: { code: p.code },
      create: {
        code: p.code,
        moduleCode: p.moduleCode,
        category: p.category,
        action: p.action,
        name: p.name,
        description: p.description ?? null,
        sortNo: p.sortNo,
        isActive: true,
      },
      update: {
        moduleCode: p.moduleCode,
        category: p.category,
        action: p.action,
        name: p.name,
        description: p.description ?? null,
        sortNo: p.sortNo,
        isActive: true,
      },
    });
  }
  console.log(`✅ [SYSTEM] nx01_permission: ${ALL_PERMS.length} 筆權限目錄`);
}
