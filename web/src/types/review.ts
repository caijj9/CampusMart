import type { Page } from '@/types'

export interface SubmitReviewParams {
  rating: number
  content?: string
}

export interface ReviewItem {
  id: number
  rating: number
  content: string | null
  createTime: string
}

export interface SellerReviews {
  page: Page<ReviewItem>
  avgRating: number | null
  reviewCount: number
}
