// apps/nx-ui/src/features/home-dashboard/bulletin-types.ts
// 公告系統前端共用型別

export type BulletinRow = {
  id: string;
  title: string;
  content?: string | null;
  type?: string | null;
  importance?: string | null;
  publishAt?: string | null;
  isReadByMe?: boolean;
};

export type BulletinListResponse = {
  rows?: BulletinRow[];
  total?: number;
};
