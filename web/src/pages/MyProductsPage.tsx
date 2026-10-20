import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, PackageOpen, Plus, WifiOff } from 'lucide-react'
import { ListItem } from '@/components/ListItem'
import { listMine } from '@/api/product'
import { errorMessage } from '@/api/client'
import { SellerProductCard, SELLER_STATUS_LABELS } from '@/components/SellerProductCard'
import { ProductCardSkeleton } from '@/components/ProductCard'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { paginationPages } from '@/lib/productFilters'
import { useAuthStore } from '@/stores/auth'
import type { MyProductParams, ProductStatus } from '@/types/product'

export function MyProductsPage() {
  const [search, setSearch] = useSearchParams()
  const token = useAuthStore((state) => state.token)
  const rawStatus = search.get('status')
  const status = rawStatus !== null && ['0', '1', '2', '3'].includes(rawStatus) ? Number(rawStatus) as ProductStatus : undefined
  const rawPage = Number(search.get('pageNum'))
  const pageNum = Number.isSafeInteger(rawPage) && rawPage >= 1 && rawPage <= 2_147_483_647 ? rawPage : 1
  const rawSize = Number(search.get('pageSize'))
  const pageSize = Number.isSafeInteger(rawSize) && rawSize >= 1 ? Math.min(50, rawSize) : 10
  const params: MyProductParams = { pageNum, pageSize, status }
  const products = useQuery({ queryKey: ['myProducts', token, params], queryFn: ({ signal }) => listMine(params, signal), retry: false, staleTime: 0 })
  useEffect(() => {
    if (products.data && !products.isFetching && pageNum > Math.max(1, products.data.pages)) {
      setSearch((previous) => { const next = new URLSearchParams(previous); next.set('pageNum', String(Math.max(1, products.data!.pages))); return next }, { replace: true })
    }
  }, [products.data, products.isFetching, pageNum, setSearch])
  function change(values: Record<string, string>, reset = true) {
    setSearch((previous) => {
      const next = new URLSearchParams(previous)
      Object.entries(values).forEach(([key, value]) => { if (value) next.set(key, value); else next.delete(key) })
      if (reset) next.delete('pageNum')
      return next
    })
  }
  return <div className="space-y-8"><div className="flex flex-wrap items-center justify-between gap-4"><div className="space-y-3"><h1 className="text-2xl font-semibold">我的发布</h1><p className="text-sm text-muted-foreground">管理你的好物，查看它们的新去处。</p></div><Link to="/sell" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm text-primary-foreground"><Plus className="size-4" />发布商品</Link></div>
    <div className="flex flex-wrap gap-6 rounded-xl border bg-card p-4"><div className="flex flex-wrap items-center gap-3"><Label htmlFor="listing-status">商品状态</Label><select id="listing-status" value={status === undefined ? '' : String(status)} className="h-11 rounded-lg border bg-background px-3 text-sm" onChange={(event) => change({ status: event.target.value })}><option value="">全部状态</option>{[1, 0, 2, 3].map((value) => <option key={value} value={value}>{SELLER_STATUS_LABELS[value as ProductStatus]}</option>)}</select></div><div className="flex items-center gap-3"><Label htmlFor="listing-size">每页</Label><select id="listing-size" value={pageSize} className="h-11 rounded-lg border bg-background px-3 text-sm" onChange={(event) => change({ pageSize: event.target.value })}>{![10, 20, 50].includes(pageSize) && <option value={pageSize}>{pageSize} 条</option>}{[10, 20, 50].map((size) => <option key={size} value={size}>{size} 条</option>)}</select></div></div>
    {products.isPending ? <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" role="status" aria-label="正在加载我的发布">{Array.from({ length: 8 }, (_, index) => <ProductCardSkeleton key={index} />)}</div>
      : products.isError ? <div className="flex flex-col items-center rounded-xl border bg-card px-6 py-16 text-center"><WifiOff className="mb-6 size-10 text-muted-foreground" /><h2 className="font-semibold">暂时无法加载发布记录</h2><p className="mt-4 text-sm text-muted-foreground" role="alert">{errorMessage(products.error)}</p><Button className="mt-6 h-11 px-6" onClick={() => void products.refetch()}>重新加载</Button></div>
      : !products.data.records.length ? <div className="flex flex-col items-center rounded-xl border bg-card px-6 py-16 text-center"><PackageOpen className="mb-6 size-10 text-muted-foreground" /><h2 className="text-lg font-medium">{status === undefined ? '还没有发布过商品' : '这个状态下还没有商品'}</h2><p className="mt-4 text-sm text-muted-foreground">{status === undefined ? '整理一件闲置好物，让它遇到需要的同学。' : '切换其他状态，或发布一件新好物。'}</p>{status === undefined ? <Link to="/sell" className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-primary px-6 text-sm text-primary-foreground">发布第一件好物</Link> : <Button variant="outline" className="mt-6 h-11 px-6" onClick={() => change({ status: '' })}>查看全部发布</Button>}</div>
      : <><p className="text-sm text-muted-foreground" role="status">共 {products.data.total} 件商品</p><div className="grid grid-cols-1 items-start gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{products.data.records.map((product, index) => <ListItem key={product.id} index={index}><SellerProductCard product={product} /></ListItem>)}</div>{products.data.pages > 1 && <nav aria-label="我的发布分页" className="flex flex-wrap justify-center gap-2"><Button variant="outline" className="size-11" aria-label="上一页" disabled={pageNum <= 1 || products.isFetching} onClick={() => change({ pageNum: String(pageNum - 1) }, false)}><ChevronLeft /></Button>{paginationPages(pageNum, products.data.pages).map((page) => <Button key={page} className="size-11" variant={page === pageNum ? 'default' : 'outline'} aria-current={page === pageNum ? 'page' : undefined} disabled={products.isFetching} onClick={() => change({ pageNum: String(page) }, false)}>{page}</Button>)}<Button variant="outline" className="size-11" aria-label="下一页" disabled={pageNum >= products.data.pages || products.isFetching} onClick={() => change({ pageNum: String(pageNum + 1) }, false)}><ChevronRight /></Button><p className="w-full pt-2 text-center text-xs text-muted-foreground">第 {pageNum} / {products.data.pages} 页</p></nav>}</>}
  </div>
}
