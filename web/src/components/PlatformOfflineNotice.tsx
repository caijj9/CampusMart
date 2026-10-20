import { AlertTriangle } from 'lucide-react'
import type { ProductDetail } from '@/types/product'

export function PlatformOfflineNotice({ status, offlineReason }: Pick<ProductDetail, 'status' | 'offlineReason'>) {
  if (status !== 3) return null
  return <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"><AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" /><p className="whitespace-pre-wrap break-words text-sm font-medium leading-6">{offlineReason == null ? '该商品已被平台下架' : `该商品已被平台下架：${offlineReason}`}</p></div>
}
