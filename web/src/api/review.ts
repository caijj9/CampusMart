import client from './client'
import type { ApiResult, PageParams } from '@/types'
import type { SellerReviews, SubmitReviewParams } from '@/types/review'

export async function submitReview(orderId: number, params: SubmitReviewParams): Promise<string> {
  const { data } = await client.post<ApiResult<string>>(`/review/${orderId}`, params)
  return data.data
}

export async function getSellerReviews(sellerId: number, params: PageParams, signal?: AbortSignal): Promise<SellerReviews> {
  const { data } = await client.get<ApiResult<SellerReviews>>(`/review/seller/${sellerId}`, { params, signal })
  return data.data
}
