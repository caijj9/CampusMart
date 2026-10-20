import { useState } from 'react'
import { ProgressiveImage } from '@/components/ProgressiveImage'
import { Link, useLocation } from 'react-router-dom'
import { ImageOff } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CONDITION_LABELS, mainProductImage } from '@/lib/productFilters'
import type { Product } from '@/types/product'

function ProductImage({ src, title }: { src?: string; title: string }) {
  const [failed, setFailed] = useState(false)
  return <div className="aspect-[4/3] overflow-hidden bg-muted/60">
    {src && !failed ? <ProgressiveImage src={src} alt={title} width={640} height={480} loading="lazy" decoding="async" onError={() => setFailed(true)} className="size-full object-cover" />
      : <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground" role="img" aria-label={`${title}：暂无商品图片`}><ImageOff className="size-8" aria-hidden="true" /><span className="text-xs">暂无商品图片</span></div>}
  </div>
}

const priceFormatter = new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function ProductCard({ product }: { product: Product }) {
  const location = useLocation()
  const reduced = useReducedMotion()
  const image = mainProductImage(product.images)
  return <motion.article whileHover={reduced ? undefined : { y: -2 }} transition={{ duration: 0.15 }} aria-label={product.title}>
    <Link to={`/items/${product.id}`} state={{ from: location.pathname + location.search }} className="block rounded-xl outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring">
    <Card className="gap-0 overflow-hidden rounded-xl py-0 shadow-xs transition-colors hover:border-foreground/25">
      <ProductImage key={image || 'empty'} src={image} title={product.title} />
      <CardContent className="space-y-4 p-4">
        <h2 className="line-clamp-2 min-h-12 text-base font-medium leading-6" title={product.title}>{product.title}</h2>
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-2xl font-semibold tracking-tight tabular-nums"><span className="mr-1 text-sm">¥</span>{priceFormatter.format(product.price)}</p><Badge variant="secondary" className="rounded-md">{CONDITION_LABELS[product.conditionLevel] || '成色未标注'}</Badge></div>
        {product.status !== 1 && <p className="text-xs text-muted-foreground">{product.status === 2 ? '已售出' : '已下架'}</p>}
      </CardContent>
    </Card></Link>
  </motion.article>
}

export function ProductCardSkeleton() {
  return <div className="overflow-hidden rounded-xl border bg-card" aria-hidden="true"><Skeleton className="aspect-[4/3] w-full rounded-none" /><div className="space-y-4 p-4"><Skeleton className="h-6 w-4/5" /><Skeleton className="h-4 w-1/2" /><div className="flex justify-between"><Skeleton className="h-8 w-24" /><Skeleton className="h-6 w-16" /></div></div></div>
}
