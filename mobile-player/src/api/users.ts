import { apiClient } from './client';
import { Paginated, User } from './types';

/** Lista los usuarios con rol admin (staff) para mostrarlos en la app del player. */
export async function fetchAdmins(): Promise<Paginated<User>> {
  const res = await apiClient.get('/users', { params: { limit: 100, role: 'admin' } });
  return res.data.data as Paginated<User>;
}
