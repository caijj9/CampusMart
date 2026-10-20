import client, { BusinessError } from './client'
import type { ApiResult } from '@/types'
import type { Product } from '@/types/product'

export async function listFavorites(signal?: AbortSignal): Promise<Product[]> {
  const { data } = await client.get<ApiResult<Product[]>>('/favorite/list', { signal })
  return data.data
}

export async function addFavorite(productId: number): Promise<string> {
  const { data } = await client.post<ApiResult<string>>(`/favorite/${productId}`)
  return data.data
}

export async function removeFavorite(productId: number): Promise<string> {
  const { data } = await client.delete<ApiResult<string>>(`/favorite/${productId}`)
  return data.data
}

export async function changeFavorite(productId: number, saved: boolean): Promise<'saved' | 'already-saved' | 'removed'> {
  if (!saved) {
    await removeFavorite(productId)
    return 'removed'
  }
  try {
    await addFavorite(productId)
    return 'saved'
  } catch (error) {
    if (error instanceof BusinessError && error.code === 2008) return 'already-saved'
    throw error
  }
}
