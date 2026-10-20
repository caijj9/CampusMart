import { ProgressiveImage } from '@/components/ProgressiveImage'
import { motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ImageOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { OrderActions } from '@/components/OrderActions'
import { mainProductImage } from '@/lib/productFilters'
import { formatOrderTime, ORDER_STATUS_LABELS } from '@/lib/orderState'
import type { OrderSummary } from '@/types/order'

export function OrderThumbnail({ images, title }: { images: string | null; title: string }) {
  const src = mainProductImage(images)
  const [failedSource, setFailedSource] = useState<string | undefined>()
  return <div className="size-24 shrink-0 overflow-hidden rounded-lg border bg-muted/50">{src && failedSource !== src ? <ProgressiveImage src={src} alt={title} width={96} height={96} loading="lazy" decoding="async" className="size-full object-cover" onError={() => setFailedSource(src)} /> : <div className="flex size-full items-center justify-center text-muted-foreground" role="img" aria-label="暂无商品快照图片"><ImageOff className="size-6" /></div>}</div>
}

export function OrderCard({ order }: { order: OrderSummary }) {
  const reduced = useReducedMotion()
  return <motion.article whileHover={reduced ? undefined : { y: -2 }} transition={{ duration: 0.15 }} className="space-y-6 rounded-xl border bg-card p-4 shadow-xs transition-colors hover:border-foreground/25 sm:p-6" aria-label={order.productTitle}>
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"><p>订单号：{order.orderNo}</p><Badge variant="secondary" className="rounded-md">{ORDER_STATUS_LABELS[order.status]}</Badge></div>
    <Link to={`/trades/${order.id}`} className="flex gap-4 rounded-lg outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"><OrderThumbnail images={order.productImages} title={order.productTitle} /><div className="min-w-0 flex-1 space-y-3"><h2 className="line-clamp-2 font-medium leading-6">{order.productTitle}</h2><p className="text-xl font-semibold tabular-nums">¥{Number(order.amount).toFixed(2)}</p><p className="text-xs text-muted-foreground">{formatOrderTime(order.createTime)}</p></div></Link>
    <div className="flex flex-wrap items-center justify-between gap-4"><Link to={`/trades/${order.id}`} className="inline-flex min-h-11 items-center text-sm underline-offset-4 hover:underline">查看订单详情</Link><OrderActions order={order} /></div>
  </motion.article>
}

export function OrderCardSkeleton() {
  return <div className="space-y-6 rounded-xl border bg-card p-6" aria-hidden="true"><div className="flex justify-between"><Skeleton className="h-4 w-40" /><Skeleton className="h-6 w-16" /></div><div className="flex gap-4"><Skeleton className="size-24 shrink-0" /><div className="flex-1 space-y-4"><Skeleton className="h-6 w-4/5" /><Skeleton className="h-6 w-24" /><Skeleton className="h-4 w-32" /></div></div><Skeleton className="ml-auto h-11 w-40" /></div>
}
