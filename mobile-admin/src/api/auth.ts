import { apiClient } from './client';
import { AuthResult, User } from './types';

export interface UpdateProfilePayload {
  name?: string;
  email?: string;
  password?: string;
  address?: string | null;
  phone?: string | null;
  city?: string | null;
  photoUrl?: string | null;
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const res = await apiClient.post('/auth/login', { email, password });
  return res.data.data as AuthResult;
}

export async function register(
  name: string,
  email: string,
  password: string,
  inviteCode?: string,
): Promise<AuthResult> {
  const res = await apiClient.post('/auth/register', { name, email, password, inviteCode });
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

export type UploadFolder = 'avatars' | 'clubs';

/**
 * Sube una imagen al backend (Vercel Blob).
 *
 * `folder` elige el destino (`clubs` para la foto del club) y `previousUrl`, si se
 * indica, borra la imagen anterior del mismo destino para no dejar blobs huérfanos.
 */
export async function uploadImage(
  localUri: string,
  folder: UploadFolder,
  previousUrl?: string | null,
): Promise<string> {
  const formData = new FormData();
  const filename = localUri.split('/').pop() ?? 'image.jpg';
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  // React Native FormData accepts an object with uri/name/type
  formData.append('file', { uri: localUri, name: filename, type: mimeType } as unknown as Blob);
  formData.append('folder', folder);
  if (previousUrl) formData.append('previousUrl', previousUrl);
  const res = await apiClient.post('/uploads/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return (res.data.data as { url: string }).url;
}

/** Sube el avatar del usuario actual (el backend borra el avatar anterior). */
export async function uploadAvatar(localUri: string): Promise<string> {
  const formData = new FormData();
  const filename = localUri.split('/').pop() ?? 'avatar.jpg';
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  // React Native FormData accepts an object with uri/name/type
  formData.append('file', { uri: localUri, name: filename, type: mimeType } as unknown as Blob);
  const res = await apiClient.post('/uploads/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return (res.data.data as { url: string }).url;
}

/** Elimina la cuenta actual y todos sus datos asociados (el cliente debe confirmar antes). */
export async function deleteAccount(): Promise<void> {
  await apiClient.delete('/account/delete');
}