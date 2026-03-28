/**
 * File: apps/nx-ui/src/features/base/user-master/types.ts
 */
export type MockUser = {
  id: string;
  username: string;
  displayName: string;
  jobTitle: string;
  email: string;
  phone: string;
  active: boolean;
  remark: string;
};

export type UserSortKey = 'username' | 'displayName' | 'jobTitle' | 'email' | 'active';

export type SortState = { key: UserSortKey; dir: 'asc' | 'desc' } | null;
