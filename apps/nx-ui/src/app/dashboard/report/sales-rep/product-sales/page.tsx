// apps/nx-ui/src/app/dashboard/report/sales-rep/product-sales/page.tsx
import { NxWorkspacePlaceholder } from '@/features/layout/ui/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX08-SALESREP-PRODUCT-UI-001-F01
export default function Page() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX08-SALESREP-PRODUCT-UI-001-F01"
      title="商品銷量排行"
      desc="當月個人 SO items 按 amount 排序 top 10。API：GET /nx08/dashboard/sales-rep/product-sales"
    />
  );
}
