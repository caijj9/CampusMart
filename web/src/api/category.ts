import client from './client'
import type { ApiResult } from '@/types'
import type { Category } from '@/types/product'

export async function listCategories(signal?: AbortSignal): Promise<Category[]> {
  const { data } = await client.get<ApiResult<Category[]>>('/category/list', { signal })
  return data.data
}
