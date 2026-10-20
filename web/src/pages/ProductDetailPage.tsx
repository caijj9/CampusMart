import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2, Eye, PackageSearch, ShoppingBag } from 'lucide-react'
import { toast } from 'sonner'
import { BusinessError, errorMessage } from '@/api/client'
import { getProductDetail } from '@/api/product'
import { purchaseProduct } from '@/api/order'
import { FavoriteButton } from '@/components/FavoriteButton'
import { ProductGallery } from '@/components/ProductGallery'
import { SellerCard } from '@/components/SellerCard'
import { PlatformOfflineNotice } from '@/components/PlatformOfflineNotice'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { canPurchase, purchaseLabel } from '@/lib/productActions'
import { CONDITION_LABELS } from '@/lib/productFilters'
import { safeRedirect } from '@/lib/authSchemas'
import { useAuthStore } from '@/stores/auth'
import type { ProductDetail } from '@/types/product'

function ProductDetails({ product, refreshing }: { product: ProductDetail; refreshing: boolean }) {
  const user = useAuthStore((state) => state.currentUser)
  const token = useAuthStore((state) => state.token)
  const queryClient = useQueryClient()
  const [orderId, setOrderId] = useState<number | null>(null)
  const [confirmationOpen, setConfirmationOpen] = useState(false)
  const locked = useRef(false)
  const order = useMutation({
    mutationFn: () => purchaseProduct(product.id),
    retry: false,
    onSuccess: (id) => {
      setOrderId(id)
      setConfirmationOpen(true)
      queryClient.setQueryData<ProductDetail>(['product', token, product.id], { ...product, status: 2 })
      for (const name of ['products', 'favorites', 'history', 'orders']) void queryClient.invalidateQueries({ queryKey: [name, token] })
      toast.success('下单成功')
    },
    onError: (error) => {
      toast.error(errorMessage(error))
      // Re-read availability before the user makes another explicit attempt.
      void queryClient.invalidateQueries({ queryKey: ['product', token, product.id] })
    },
    onSettled: () => { locked.current = false },
  })

  return <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-12">
    <ProductGallery key={product.images} images={product.images} title={product.title} />
    <div className="space-y-8">
      <PlatformOfflineNotice status={product.status} offlineReason={product.offlineReason} />
      <div className="space-y-4"><div className="flex gap-2"><Badge variant="secondary" className="rounded-md">{CONDITION_LABELS[product.conditionLevel] || '成色未标注'}</Badge><Badge variant="outline" className="rounded-md">{product.status === 1 ? '在售' : product.status === 2 ? '已售出' : '已下架'}</Badge></div><h1 className="break-words text-2xl font-semibold leading-relaxed tracking-tight sm:text-3xl">{product.title}</h1><p className="text-4xl font-semibold tracking-tight tabular-nums"><span className="mr-1 text-xl">¥</span>{Number(product.price).toFixed(2)}</p><p className="flex items-center gap-2 text-xs text-muted-foreground"><Eye className="size-4" aria-hidden="true" />{product.viewCount} 人看过</p></div>
      <div className="flex flex-wrap gap-4"><Button className="h-12 flex-1 px-6 sm:flex-none" disabled={!canPurchase(product, user?.id) || order.isPending || refreshing || orderId !== null} onClick={() => {
        if (locked.current || !canPurchase(product, user?.id) || orderId !== null) return
        locked.current = true
        order.mutate()
      }}><ShoppingBag className="size-4" />{order.isPending ? '正在下单…' : orderId !== null ? '已创建订单' : purchaseLabel(product, user?.id)}</Button><FavoriteButton product={product} /></div>
      {orderId !== null && <p className="rounded-lg border bg-muted/40 p-4 text-sm" role="status">已创建待付款订单，订单编号：<strong className="tabular-nums">{orderId}</strong></p>}
      {order.isError && <p role="alert" className="text-sm text-destructive">{errorMessage(order.error)}</p>}
      <Separator />
      <section className="space-y-4" aria-label="商品描述"><h2 className="font-semibold">关于这件好物</h2><p className="whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground">{product.description?.trim() || '卖家暂未填写描述。'}</p></section>
      <Separator />
      <SellerCard seller={product.seller} sellerId={product.sellerId} />
    </div>
    <Dialog open={confirmationOpen} onOpenChange={setConfirmationOpen}><DialogContent><DialogHeader><CheckCircle2 className="mb-4 size-8" /><DialogTitle>下单成功</DialogTitle><DialogDescription>已创建待付款订单，订单编号：{orderId}。</DialogDescription></DialogHeader><Link to={`/trades/${orderId}`} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-6 text-sm text-primary-foreground">查看订单</Link><Button variant="outline" className="h-11" onClick={() => setConfirmationOpen(false)}>知道了</Button></DialogContent></Dialog>
  </div>
}

export function ProductDetailPage() {
  const { id: rawId } = useParams()
  const id = Number(rawId)
  const valid = !!rawId && /^\d+$/.test(rawId) && Number.isSafeInteger(id) && id > 0
  const token = useAuthStore((state) => state.token)
  const queryClient = useQueryClient()
  const location = useLocation()
  const from = typeof location.state?.from === 'string' ? safeRedirect(location.state.from) : '/'
  const detail = useQuery({ queryKey: ['product', token, id], queryFn: ({ signal }) => getProductDetail(id, signal), enabled: valid, retry: false, staleTime: 0, refetchOnMount: 'always' })
  useEffect(() => {
    if (detail.isSuccess) void queryClient.invalidateQueries({ queryKey: ['history', token] })
  }, [detail.dataUpdatedAt, detail.isSuccess, queryClient, token])

  const missing = !valid || (detail.error instanceof BusinessError && detail.error.code === 2001)
  return <div className="space-y-8"><Link to={from} className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />返回列表</Link>
    {missing || detail.isError ? <div className="flex flex-col items-center rounded-xl border bg-card px-6 py-16 text-center"><PackageSearch className="mb-6 size-10 text-muted-foreground" /><h1 className="text-xl font-semibold">{missing ? '这件商品暂时找不到了' : '商品详情加载失败'}</h1><p className="mt-4 text-sm text-muted-foreground" role="alert">{missing ? '商品可能已被删除，去看看其他好物吧。' : errorMessage(detail.error)}</p><div className="mt-6 flex gap-4">{!missing && <Button variant="outline" className="h-11 px-6" onClick={() => void detail.refetch()}>重新加载</Button>}<Link to="/" className="inline-flex min-h-11 items-center rounded-lg bg-primary px-6 text-sm text-primary-foreground">逛逛集市</Link></div></div>
      : detail.isPending ? <div className="grid gap-8 lg:grid-cols-2" role="status" aria-label="正在加载商品详情"><Skeleton className="aspect-square rounded-xl" /><div className="space-y-6"><Skeleton className="h-8 w-24" /><Skeleton className="h-12 w-4/5" /><Skeleton className="h-12 w-32" /><Skeleton className="h-12 w-full" /><Skeleton className="h-40 w-full" /></div></div>
      : <ProductDetails key={id} product={detail.data} refreshing={detail.isFetching} />}
  </div>
}
