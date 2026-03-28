/**
 * File: apps/nx-ui/src/features/base/user-master/mock-users.ts
 */
import type { MockUser } from '@/features/base/user-master/types';

export const MOCK_JOB_TITLES = ['系統管理員', '倉管', '採購', '業務', '財務', '客服'] as const;

export const INITIAL_MOCK_USERS: MockUser[] = [
  { id: 'u1', username: 'admin', displayName: '王管理', jobTitle: '系統管理員', email: 'admin@nexora.local', phone: '02-2700-0001', active: true, remark: '內建管理帳號' },
  { id: 'u2', username: 'wh01', displayName: '林倉管', jobTitle: '倉管', email: 'wh01@nexora.local', phone: '02-2700-0002', active: true, remark: '' },
  { id: 'u3', username: 'buy01', displayName: '陳採購', jobTitle: '採購', email: 'buy01@nexora.local', phone: '0912-111-222', active: true, remark: '主力供應商聯絡' },
  { id: 'u4', username: 'sales01', displayName: '張業務', jobTitle: '業務', email: 'sales01@nexora.local', phone: '0933-444-555', active: false, remark: '留職停薪' },
  { id: 'u5', username: 'acct01', displayName: '李財務', jobTitle: '財務', email: 'acct01@nexora.local', phone: '02-2700-0009', active: true, remark: '' },
];
