import { z } from 'zod'
import { BusinessError, errorMessage } from '@/api/client'
import type { ConditionLevel, Product, PublishProductParams } from '@/types/product'

export const productFormSchema = z.object({
  title: z.string().trim().min(1, '请输入商品标题').max(100, '标题最多 100 个字符'),
  description: z.string(),
  price: z.string().trim().regex(/^\d{1,8}(\.\d{1,2})?$/, '请输入金额，最多 8 位整数、2 位小数')
    .refine((value) => Number.isFinite(Number(value)) && Number(value) >= 0.01, '价格至少为 0.01 元'),
  conditionLevel: z.enum(['1', '2', '3', '4'], { error: '请选择有效成色' }),
  categoryId: z.string().regex(/^[1-9]\d*$/, '请选择分类').refine((value) => Number.isSafeInteger(Number(value)), '请选择有效分类'),
  images: z.array(z.string().min(1)).max(9, '最多上传 9 张图片'),
})

export type ProductFormValues = z.infer<typeof productFormSchema>

export function productFormDefaults(product?: Product): ProductFormValues {
  return {
    title: product?.title || '',
    description: product?.description || '',
    price: product ? String(product.price) : '',
    conditionLevel: product ? String(product.conditionLevel) as ProductFormValues['conditionLevel'] : '1',
    categoryId: product ? String(product.categoryId) : '',
    images: product?.images?.split(',').map((url) => url.trim()).filter(Boolean) || [],
  }
}

export function productFormPayload(values: ProductFormValues): PublishProductParams {
  return {
    title: values.title.trim(), description: values.description.trim(), price: Number(values.price),
    conditionLevel: Number(values.conditionLevel) as ConditionLevel, categoryId: Number(values.categoryId),
    images: values.images.join(','),
  }
}

export function sellerErrorMessage(error: unknown): string {
  if (error instanceof BusinessError && error.code === 2010) return '商品正在交易中，暂时无法执行此操作，请等待交易结束。'
  if (error instanceof BusinessError && error.code === 2013) return '只有卖家主动下架的商品才能重新上架。'
  return errorMessage(error)
}

export type SellerAction = 'edit' | 'offline' | 'relist' | 'delete'
export function sellerActions(product: Product, userId?: number): SellerAction[] {
  if (userId === undefined || userId !== product.sellerId) return []
  if (product.status === 1) return ['edit', 'offline', 'delete']
  if (product.status === 0) return ['relist', 'delete']
  return []
}

export function imageSelectionError(files: File[], currentCount: number): string | null {
  if (files.length + currentCount > 9) return '最多上传 9 张图片，请减少选择数量。'
  for (const file of files) {
    if (!/\.(jpe?g|png|gif|webp)$/i.test(file.name) || (file.type && !['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type))) return '仅支持 JPG、PNG、GIF、WebP 图片。'
    if (file.size === 0) return '不能上传空文件。'
    if (file.size > 2 * 1024 * 1024) return '每张图片不能超过 2MB。'
  }
  return null
}
