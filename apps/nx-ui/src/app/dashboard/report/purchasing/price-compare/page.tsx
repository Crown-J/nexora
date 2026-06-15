// apps/nx-ui/src/app/dashboard/report/purchasing/price-compare/page.tsx
import { NxWorkspacePlaceholder } from '@design/layout/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX08-PURCHASING-PRICECOMP-UI-001-F01
export default function Page() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX08-PURCHASING-PRICECOMP-UI-001-F01"
      title="比價歷史"
      desc="同 part 跨供應商 PO unitCost trace（90 天）。API：GET /nx08/dashboard/purchasing/price-compare"
    />
  );
}
