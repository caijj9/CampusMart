import { ListItem } from '@/components/ListItem'
import { motion, useReducedMotion } from 'motion/react'
import { useEffect } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ChevronLeft, ChevronRight, MessageSquare, Star, WifiOff } from 'lucide-react'
import { getSellerReviews } from '@/api/review'
import { errorMessage } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { formatOrderTime, normalizeOrderPagination } from '@/lib/orderState'
import { paginationPages } from '@/lib/productFilters'
import { useAuthStore } from '@/stores/auth'
import type { ReviewItem, SellerReviews } from '@/types/review'

function StarRating({ rating }: { rating: number }) {
  return <span className="inline-flex gap-1" role="img" aria-label={`${rating.toFixed(1)} / 5 星`}>{[0, 1, 2, 3, 4].map((index) => <span key={index} className="relative inline-flex size-5" aria-hidden="true"><Star className="size-5 text-muted-foreground/40" /><span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${Math.max(0, Math.min(1, rating - index)) * 100}%` }}><Star className="size-5 fill-current text-foreground/80" /></span></span>)}</span>
}

export function SellerRatingSummary({ reviews }: { reviews: SellerReviews }) {
  return <section aria-label="卖家评分汇总" className="space-y-4 rounded-xl border bg-card p-6 shadow-xs sm:p-8"><h2 className="text-sm font-medium text-muted-foreground">交易口碑</h2>
    {reviews.avgRating === null ? <p className="text-2xl font-semibold">暂无评价</p> : <div className="flex flex-wrap items-center gap-6"><p className="text-5xl font-semibold tracking-tight tabular-nums">{reviews.avgRating.toFixed(1)}<span className="ml-2 text-base font-normal text-muted-foreground">/ 5</span></p><StarRating rating={reviews.avgRating} /></div>}
    <p className="text-sm text-muted-foreground">{reviews.reviewCount} 条评价</p>
  </section>
}

export function SellerReviewEntry({ review }: { review: ReviewItem }) {
  const reduced = useReducedMotion()
  return <motion.article whileHover={reduced ? undefined : { y: -2 }} transition={{ duration: 0.15 }} aria-label="交易评价" className="space-y-4 rounded-xl border bg-card p-6 shadow-xs transition-colors hover:border-foreground/25"><div className="flex flex-wrap items-center justify-between gap-4"><StarRating rating={review.rating} /><time className="text-xs text-muted-foreground" dateTime={review.createTime}>{formatOrderTime(review.createTime)}</time></div>{review.content !== null && <p className="whitespace-pre-wrap break-words text-sm leading-7">{review.content}</p>}</motion.article>
}

export function SellerReviewsPage() {
  const { id: rawId } = useParams()
  const sellerId = Number(rawId)
  const valid = !!rawId && /^\d+$/.test(rawId) && Number.isSafeInteger(sellerId) && sellerId > 0
  const token = useAuthStore((state) => state.token)
  const [search, setSearch] = useSearchParams()
  const params = normalizeOrderPagination({ pageNum: Number(search.get('pageNum')) || undefined, pageSize: Number(search.get('pageSize')) || undefined })
  const reviews = useQuery({ queryKey: ['sellerReviews', token, sellerId, params], queryFn: ({ signal }) => getSellerReviews(sellerId, params, signal), enabled: valid, retry: false })

  useEffect(() => {
    if (reviews.data && !reviews.isFetching && params.pageNum > Math.max(1, reviews.data.page.pages)) {
      setSearch((previous) => {
        const next = new URLSearchParams(previous)
        next.set('pageNum', String(Math.max(1, reviews.data!.page.pages)))
        return next
      }, { replace: true })
    }
  }, [reviews.data, reviews.isFetching, params.pageNum, setSearch])

  function changePage(page: number) {
    setSearch((previous) => {
      const next = new URLSearchParams(previous)
      if (page === 1) next.delete('pageNum')
      else next.set('pageNum', String(page))
      return next
    })
  }

  return <div className="mx-auto max-w-3xl space-y-8"><Link to="/" className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />返回集市</Link><div className="space-y-3"><h1 className="text-2xl font-semibold">卖家评价</h1><p className="text-sm text-muted-foreground">来自已完成交易的买家反馈。</p></div>
    {!valid ? <div className="rounded-xl border bg-card p-8"><p role="alert">卖家编号无效，请从商品详情重新进入。</p></div>
      : reviews.isPending ? <div className="space-y-6" role="status" aria-label="正在加载卖家评价"><div className="space-y-4 rounded-xl border bg-card p-8"><Skeleton className="h-6 w-24" /><Skeleton className="h-14 w-48" /><Skeleton className="h-4 w-24" /></div>{[0, 1, 2].map((key) => <div key={key} className="space-y-4 rounded-xl border bg-card p-6"><Skeleton className="h-5 w-32" /><Skeleton className="h-16 w-full" /><Skeleton className="h-4 w-40" /></div>)}</div>
      : reviews.isError ? <div className="flex flex-col items-center rounded-xl border bg-card px-6 py-16 text-center"><WifiOff className="mb-6 size-10 text-muted-foreground" /><h2 className="text-lg font-medium">评价暂时加载不了</h2><p role="alert" className="mt-4 text-sm text-muted-foreground">{errorMessage(reviews.error)}</p><Button className="mt-6 h-11 px-6" onClick={() => void reviews.refetch()}>重新加载</Button></div>
      : <><SellerRatingSummary reviews={reviews.data} /><div className="flex flex-wrap items-center justify-between gap-4"><h2 className="text-lg font-semibold">全部评价</h2><div className="flex items-center gap-3"><Label htmlFor="review-page-size" className="text-muted-foreground">每页</Label><select id="review-page-size" className="h-11 rounded-lg border bg-background px-3 text-sm" value={params.pageSize} onChange={(event) => setSearch((previous) => { const next = new URLSearchParams(previous); next.set('pageSize', event.target.value); next.delete('pageNum'); return next })}>{![10, 20, 50].includes(params.pageSize) && <option value={params.pageSize}>{params.pageSize} 条</option>}{[10, 20, 50].map((size) => <option key={size} value={size}>{size} 条</option>)}</select></div></div>
        {!reviews.data.page.records.length ? <div className="flex flex-col items-center rounded-xl border bg-card px-6 py-16 text-center"><MessageSquare className="mb-6 size-10 text-muted-foreground" /><h3 className="text-lg font-medium">还没有人评价过</h3><p className="mt-4 text-sm text-muted-foreground">去看看其他好物，也许会有新的发现。</p><Link to="/" className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-primary px-6 text-sm text-primary-foreground">逛逛集市</Link></div> : <div className="space-y-6">{reviews.data.page.records.map((review, index) => <ListItem key={review.id} index={index}><SellerReviewEntry review={review} /></ListItem>)}</div>}
        {reviews.data.page.pages > 1 && <nav aria-label="卖家评价分页" className="flex flex-wrap items-center justify-center gap-2"><Button variant="outline" className="size-11" aria-label="上一页" disabled={params.pageNum <= 1 || reviews.isFetching} onClick={() => changePage(params.pageNum - 1)}><ChevronLeft /></Button>{paginationPages(params.pageNum, reviews.data.page.pages).map((page) => <Button key={page} className="size-11" variant={page === params.pageNum ? 'default' : 'outline'} aria-label={`第 ${page} 页`} aria-current={page === params.pageNum ? 'page' : undefined} disabled={reviews.isFetching} onClick={() => changePage(page)}>{page}</Button>)}<Button variant="outline" className="size-11" aria-label="下一页" disabled={params.pageNum >= reviews.data.page.pages || reviews.isFetching} onClick={() => changePage(params.pageNum + 1)}><ChevronRight /></Button><p className="w-full pt-2 text-center text-xs text-muted-foreground">第 {params.pageNum} / {reviews.data.page.pages} 页</p></nav>}
      </>}
  </div>
}
