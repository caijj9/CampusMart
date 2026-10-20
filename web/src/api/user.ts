import client from './client'
import { useAuthStore } from '@/stores/auth'
import type { ApiResult, LoginParams, RegisterParams, UpdatePasswordParams, User } from '@/types'

export async function login(params: LoginParams): Promise<string> {
  const { data } = await client.post<ApiResult<string>>('/user/login', params)
  return data.data
}

export async function register(params: RegisterParams): Promise<null> {
  const { data } = await client.post<ApiResult<null>>('/user/register', params)
  return data.data
}

export async function getMe(signal?: AbortSignal): Promise<User> {
  const { data } = await client.get<ApiResult<User>>('/user/me', { signal })
  return data.data
}

export async function updatePassword(params: UpdatePasswordParams): Promise<null> {
  const { data } = await client.put<ApiResult<null>>('/user/password', params)
  // The backend invalidates all old tokens after a password change.
  useAuthStore.getState().logout()
  return data.data
}

export async function uploadAvatar(file: File): Promise<string> {
  const body = new FormData()
  body.append('file', file)
  const { data } = await client.post<ApiResult<string>>('/user/avatar', body)
  const user = useAuthStore.getState().currentUser
  if (user) useAuthStore.getState().setCurrentUser({ ...user, avatar: data.data })
  return data.data
}
