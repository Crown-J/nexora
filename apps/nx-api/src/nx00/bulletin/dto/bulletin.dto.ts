/**
 * NX00 首頁公告 DTO（nx00_bulletin）
 */

export type BulletinDto = {
  id: string;
  tenantId: string;
  title: string;
  subtitle: string | null;
  content: string | null;
  /** S=SYSTEM / C=COMPANY / R=REMIND */
  scopeType: string;
  isPinned: boolean;
  expiredAt: string | null;
  isActive: boolean;
  displayBadge: string | null;

  createdAt: string;
  createdBy: string | null;
  createdByName: string | null;
  updatedAt: string;
  updatedBy: string | null;
  updatedByName: string | null;
};

export type PagedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

export type ListBulletinQuery = {
  scopeType?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
};

export type CreateBulletinBody = {
  title: string;
  subtitle?: string | null;
  content?: string | null;
  scopeType: string;
  isPinned?: boolean;
  expiredAt?: string | null;
  isActive?: boolean;
  displayBadge?: string | null;
};

export type UpdateBulletinBody = {
  title?: string;
  subtitle?: string | null;
  content?: string | null;
  scopeType?: string;
  isPinned?: boolean;
  expiredAt?: string | null;
  isActive?: boolean;
  displayBadge?: string | null;
};

export type SetActiveBody = {
  isActive: boolean;
};
