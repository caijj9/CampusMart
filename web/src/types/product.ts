import type { PageParams } from './index'

export type { Page } from './index'
export type ConditionLevel = 1 | 2 | 3 | 4
export type ProductStatus = 0 | 1 | 2 | 3
export type ProductSort = 'price_asc' | 'price_desc'

export interface Product {
  id: number
  sellerId: number
  categoryId: number
  title: string
  description: string | null
  price: number
  status: ProductStatus
  conditionLevel: ConditionLevel
  images: string | null
  createTime: string
  updateTime: string
}

export interface SellerBrief {
  nickname: string | null
  avatar: string | null
  campus: string | null
  avgRating: number | null
  reviewCount: number
}

export type ProductDetail = Product & { seller: SellerBrief; offlineReason: string | null; viewCount: number }

export interface ProductSearchParams extends PageParams {
  keyword?: string
  categoryId?: number
  minPrice?: number
  maxPrice?: number
  conditionLevel?: ConditionLevel
  // Omit sortBy for newest first; the backend has no "latest" value.
  sortBy?: ProductSort
}

export interface PublishProductParams {
  title: string
  description?: string
  price: number
  conditionLevel: ConditionLevel
  categoryId: number
  images?: string
}

export interface UpdateProductParams extends PublishProductParams {
  id: number
}

export interface Category {
  id: number
  name: string
  sort: number
}

export interface MyProductParams extends PageParams {
  status?: ProductStatus
}

export interface UploadImagesOptions {
  signal?: AbortSignal
  onProgress?: (percent: number | undefined) => void
}
