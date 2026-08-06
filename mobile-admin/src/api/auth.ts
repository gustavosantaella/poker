import { apiClient } from './client';
import { AuthResult, User } from './types';

export interface UpdateProfilePayload {
  name?: string;
  email?: string;
  password?: string;
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const res = await apiClient.post('/auth/login', { email, password });
  return res.data.data as AuthResult;
}

export async function register(name: string, email: string, password: string): Promise<AuthResult> {
  const res = await apiClient.post('/auth/register', { name, email, password });
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