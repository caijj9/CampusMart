import { z } from 'zod'
import { BusinessError, errorMessage } from '@/api/client'

export const offlineReasonSchema = z.object({
  reason: z.string().trim().min(1, '下架原因不能为空').max(200, '下架原因最多 200 个字符'),
})

export function canForceOffline(status: number): boolean {
  return status === 0 || status === 1
}

export function offlineErrorMessage(error: unknown): string {
  if (error instanceof BusinessError) {
    switch (error.code) {
      case 400: return '下架原因不能为空'
      case 2014: return '该商品已售出，不能下架'
      case 2010: return '该商品正在交易中，无法下架'
      case 2003: return '该商品当前状态不允许下架'
    }
  }
  return errorMessage(error)
}
