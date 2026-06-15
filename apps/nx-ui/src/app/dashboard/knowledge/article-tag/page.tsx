// apps/nx-ui/src/app/dashboard/knowledge/article-tag/page.tsx
import { NxWorkspacePlaceholder } from '@design/layout/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX09-ARTICLETAG-UI-001-F01
export default function Page() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX09-ARTICLETAG-UI-001-F01"
      title="KM 文章標籤管理（IMPL-02 子表補）"
      desc="KmArticleTag link 表（attach/detach）+ KmTag 主檔（IMPL-01 既有）。API：GET /nx09/km-article/:articleId/tags + POST /nx09/km-article-tag + DELETE /nx09/km-article-tag/:id ; KmTag 主檔在 GET/POST /nx09/km-tag"
    />
  );
}
