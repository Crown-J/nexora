// apps/nx-ui/src/app/dashboard/owner/grade-approvals/page.tsx
// NX04-M3 C5：全域客戶等級變更待核可清單頁（OWNER 角色）

import { GradeHistoryListView } from '@/features/nx04/partner-grade-history/ui/GradeHistoryListView';

export default function GradeApprovalsPage() {
  return (
    <GradeHistoryListView
      defaultStatus="PENDING"
      title="客戶等級變更待核可"
      subtitle="OWNER 主管 inbox：所有待核可的客戶等級變更申請。核可後立即生效、影響後續 QT 毛利率。"
      showRequestForm={false}
      showActions
    />
  );
}
