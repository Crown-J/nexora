// apps/nx-ui/src/app/dashboard/sale/partner-grade-history/page.tsx
// NX04-M3 C5：客戶等級變更歷史 - 通用 list（可篩 partnerId）

import { GradeHistoryListView } from '@/features/nx04/partner-grade-history/ui/GradeHistoryListView';

export default function PartnerGradeHistoryPage() {
  return <GradeHistoryListView showRequestForm showActions />;
}
