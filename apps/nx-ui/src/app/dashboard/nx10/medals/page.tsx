// apps/nx-ui/src/app/dashboard/nx10/medals/page.tsx
import { NxWorkspacePlaceholder } from '@/features/layout/ui/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX10-MEDALS-UI-001-F01
export default function Page() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX10-MEDALS-UI-001-F01"
      title="勳章系統（20 levels）"
      desc="5 tier × 4 rank = 20 levels（BRONZE/SILVER/GOLD/PLATINUM/DIAMOND × IV/III/II/I）+ EmpMedal 累積 Exp 鏈 + 降階保護期。八角驅動力 #2 成就 + #4 佔有。API：/nx10/medals/me + /nx10/medals"
    />
  );
}
