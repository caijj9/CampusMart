import { z } from 'zod'
import { BusinessError, errorMessage } from '@/api/client'

export const reviewSchema = z.object({
  rating: z.number().int('评分必须是整数').min(1, '请选择 1–5 星评分').max(5, '评分不能超过 5 星'),
  content: z.string().trim().max(500, '评价内容最多 500 个字符'),
})

export type ReviewValues = z.infer<typeof reviewSchema>

export function reviewErrorMessage(error: unknown): string {
  if (error instanceof BusinessError && error.code === 2011) return '订单尚未完成，确认收货后才能评价。'
  if (error instanceof BusinessError && error.code === 2012) return '这笔订单已经评价过了。'
  return errorMessage(error)
}
