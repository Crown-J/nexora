// apps/nx-ui/src/app/dashboard/knowledge/page.tsx
// 合併收尾 2026-06-10：root → workspace redirect、防 typed URL / 舊書籤 404

import { redirect } from 'next/navigation';

export default function KnowledgeRootRedirect(): never {
  redirect('/dashboard/knowledge/workspace');
}
