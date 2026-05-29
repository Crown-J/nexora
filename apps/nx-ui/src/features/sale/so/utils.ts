// apps/nx-ui/src/features/sale/so/utils.ts
// NX04-M3 C2：雙段狀態組合顯示（給業務員看得懂的中文標籤）
//
// 規則來自 Alex M3 §A C2：
//   transferStatus=P + fulfillStatus=W  → 「等貨」
//   transferStatus=I                    → 「補貨中」
//   transferStatus=C + fulfillStatus=W  → 「等撿貨」
//   fulfillStatus=PK/PL                 → 「撿包中」
//   fulfillStatus=D/F                   → 「已出貨」

export interface CombinedStatusInfo {
  label: string;
  badgeClass: string;
}

const CLASS_WAIT = 'bg-amber-100 text-amber-900';
const CLASS_INPROGRESS = 'bg-sky-100 text-sky-900';
const CLASS_READY = 'bg-violet-100 text-violet-900';
const CLASS_PICKING = 'bg-indigo-100 text-indigo-900';
const CLASS_SHIPPED = 'bg-emerald-100 text-emerald-900';
const CLASS_UNKNOWN = 'bg-muted text-muted-foreground';

export function combinedStatusLabel(transferStatus: string, fulfillStatus: string): CombinedStatusInfo {
  // 順序很重要：出貨完成最優先（已出/已完成 → 不管 transferStatus）
  if (fulfillStatus === 'D' || fulfillStatus === 'F') {
    return { label: '已出貨', badgeClass: CLASS_SHIPPED };
  }
  // 撿包中（無論 transferStatus）
  if (fulfillStatus === 'PK' || fulfillStatus === 'PL') {
    return { label: '撿包中', badgeClass: CLASS_PICKING };
  }
  // 補貨中（不管 fulfillStatus）
  if (transferStatus === 'I') {
    return { label: '補貨中', badgeClass: CLASS_INPROGRESS };
  }
  // 補貨完成、等撿貨
  if (transferStatus === 'C' && fulfillStatus === 'W') {
    return { label: '等撿貨', badgeClass: CLASS_READY };
  }
  // 待補 + 等貨
  if (transferStatus === 'P' && fulfillStatus === 'W') {
    return { label: '等貨', badgeClass: CLASS_WAIT };
  }
  // fallback
  return {
    label: `${transferStatus || '?'}/${fulfillStatus || '?'}`,
    badgeClass: CLASS_UNKNOWN,
  };
}

/// SO 整單階段對應的中文顯示
export const SO_HEADER_STATUS_BADGE_CLASS: Record<string, string> = {
  DRAFT: 'bg-muted text-foreground',
  CONFIRMED: 'bg-amber-100 text-amber-900',
  PICKING: 'bg-indigo-100 text-indigo-900',
  SHIPPED: 'bg-emerald-100 text-emerald-900',
  INVOICED: 'bg-emerald-200 text-emerald-900',
  CANCELLED: 'bg-zinc-100 text-zinc-500 line-through',
};
