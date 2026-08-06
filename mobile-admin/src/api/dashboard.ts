import { apiClient } from './client';
import { DashboardStats } from './types';

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await apiClient.get('/dashboard/stats');
  return res.data.data as DashboardStats;
}