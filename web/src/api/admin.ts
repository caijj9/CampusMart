import client from './client'
import type { ApiResult, Page, User } from '@/types'
import type { AdminProduct, AdminProductSearchParams, AdminUserRow, OfflineReasonBody } from '@/types/admin'

export async function searchAdminProducts(params: AdminProductSearchParams, signal?: AbortSignal): Promise<Page<AdminProduct>> {
  const { data } = await client.get<ApiResult<Page<AdminProduct>>>('/admin/product/search', { params, signal })
  return data.data
}

export async function disableUser(id: number, signal?: AbortSignal): Promise<string> {
  const { data } = await client.put<ApiResult<string>>(`/admin/user/disable/${id}`, undefined, { signal })
  return data.data
}

export async function enableUser(id: number, signal?: AbortSignal): Promise<string> {
  const { data } = await client.put<ApiResult<string>>(`/admin/user/enable/${id}`, undefined, { signal })
  return data.data
}

export async function offlineProduct(id: number, reason: string): Promise<null> {
  const body: OfflineReasonBody = { reason }
  const { data } = await client.put<ApiResult<null>>(`/admin/product/offline/${id}`, body)
  return data.data
}

export async function listAdminUsers(signal?: AbortSignal): Promise<AdminUserRow[]> {
  const { data } = await client.get<ApiResult<User[]>>('/user/list', { signal })
  // The endpoint returns full entities. Only retain the explicit UI allowlist.
  return data.data.map(({ id, username, nickname, role, status }) => ({ id, username, nickname, role, status }))
}
