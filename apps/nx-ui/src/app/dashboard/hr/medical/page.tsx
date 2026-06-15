// apps/nx-ui/src/app/dashboard/hr/medical/page.tsx
import { NxWorkspacePlaceholder } from '@design/layout/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX07-MEDICAL-UI-001-F01
export default function Page() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX07-MEDICAL-UI-001-F01"
      title="醫療管理 + 職災追蹤 ⭐"
      desc="Crown Q1=b 亞羅特色 ⭐：MedicalRecord（年度健檢 / 特殊作業健檢 / 追蹤）+ Injury（職災通報 5 階流轉 REPORTED→TREATING→RECOVERED/DISABLED/FATAL）。API：/nx07/medical/records + /nx07/medical/injuries（9 endpoint）"
    />
  );
}
