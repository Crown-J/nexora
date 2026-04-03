/**
 * NX00 首頁公告 DTO（nx00_bulletin）
 */

export type BulletinDto = {
  id: string;
  tenantId: string;
  title: string;
  content: string | null;
  /** S=SYSTEM / C=COMPANY / R=REMIND */
  scopeType: string;
  isPinned: boolean;
  expiredAt: string | null;
  isActive: boolean;

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
  content?: string | null;
  scopeType: string;
  isPinned?: boolean;
  expiredAt?: string | null;
  isActive?: boolean;
};

export type UpdateBulletinBody = {
  title?: string;
  content?: string | null;
  scopeType?: string;
  isPinned?: boolean;
  expiredAt?: string | null;
  isActive?: boolean;
};

export type SetActiveBody = {
  isActive: boolean;
};
