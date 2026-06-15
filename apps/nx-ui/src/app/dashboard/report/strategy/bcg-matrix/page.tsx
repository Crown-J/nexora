// apps/nx-ui/src/app/dashboard/report/strategy/bcg-matrix/page.tsx
import { NxWorkspacePlaceholder } from '@design/layout/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX08-STRATEGY-BCG-UI-001-F01
export default function Page() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX08-STRATEGY-BCG-UI-001-F01"
      title="BCG matrix 商品分類 ⭐⭐⭐"
      desc="業界改革 #3：60d split (recent30 vs prior30) + 自動 4 象限標記 S=Star / C=Cow / Q=Question / D=Dog（top 50 by revenue）。API：GET /nx08/dashboard/strategy/bcg-matrix"
    />
  );
}
