// apps/nx-ui/src/app/dashboard/nx09/km/page.tsx
import { NxWorkspacePlaceholder } from '@/features/layout/ui/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX09-KM-UI-001-F01
export default function Page() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX09-KM-UI-001-F01"
      title="KM 知識庫（FAQ / SOP / 公告 / 訓練）"
      desc="KmArticle QA 條目 + 9 分類（既有 6 SO/BP/RG/CX/EM/OT + 新 3 FQ/AN/TR）+ KmTag 標籤 + KmFeedback「已解決」按鈕。API：/nx09/article（5 CRUD）+ /nx09/km-tag + /nx09/km-article/:id/feedback"
    />
  );
}
