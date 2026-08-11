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

export async function fetchAdminProfile(): Promise<User | null> {
  const res = await apiClient.get('/users/admin/profile');
  return res.data.data as User | null;
}

export async function uploadAvatar(localUri: string): Promise<string> {
  const formData = new FormData();
  const filename = localUri.split('/').pop() ?? 'avatar.jpg';
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  formData.append('file', { uri: localUri, name: filename, type: mimeType } as unknown as Blob);
  const res = await apiClient.post('/uploads/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return (res.data.data as { url: string }).url;
}

