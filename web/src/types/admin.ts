import type { PageParams, User } from '@/types'
import type { ConditionLevel, ProductStatus } from '@/types/product'

export interface AdminProduct {
  id: number
  sellerId: number
  categoryId: number
  title: string
  price: number
  status: ProductStatus
  conditionLevel: ConditionLevel
  images: string | null
  createTime: string
  offlineReason: string | null
  offlineTime: string | null
}

export interface AdminProductSearchParams extends PageParams {
  status?: ProductStatus
  keyword?: string
  categoryId?: number
}

export type AdminUserRow = Pick<User, 'id' | 'username' | 'nickname' | 'role' | 'status'>

export type OfflineReasonBody = { reason: string }
