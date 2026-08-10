import { apiClient } from './client';
import { AuthResult, User } from './types';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  alias: string;
  role?: string;
}

export interface UpdateProfilePayload {
  name?: string;
  alias?: string | null;
  email?: string;
  password?: string;
  country?: string | null;
  phone?: string | null;
  photoUrl?: string | null;
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const res = await apiClient.post('/auth/login', { email, password });
  return res.data.data as AuthResult;
}

export async function register(payload: RegisterPayload): Promise<AuthResult> {
  const res = await apiClient.post('/auth/register', payload);
  return res.data.data as AuthResult;
}

export async function fetchMe(): Promise<User> {
  const res = await apiClient.get('/auth/me');
  return res.data.data as User;
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<User> {
  const res = await apiClient.patch('/users/me/profile', payload);
  return res.data.data as User;
}
