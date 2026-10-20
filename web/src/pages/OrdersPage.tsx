import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, ReceiptText, WifiOff } from 'lucide-react'
import { listBoughtOrders, listSoldOrders } from '@/api/orderQueries'
import { errorMessage } from '@/api/client'
import { ListItem } from '@/components/ListItem'
import { OrderCard, OrderCardSkeleton } from '@/components/OrderCard'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { normalizeOrderPagination } from '@/lib/orderState'
import { paginationPages } from '@/lib/productFilters'
import { useAuthStore } from '@/stores/auth'
import type { OrderTab } from '@/types/order'

export function OrdersPage() {
  const [search, setSearch] = useSearchParams()
  const token = useAuthStore((state) => state.token)
  const tab: OrderTab = search.get('tab') === 'sold' ? 'sold' : 'bought'
  const params = normalizeOrderPagination({ pageNum: Number(search.get('pageNum')) || undefined, pageSize: Number(search.get('pageSize')) || undefined })
  const orders = useQuery({ queryKey: ['orders', token, tab, params], queryFn: ({ signal }) => tab === 'bought' ? listBoughtOrders(params, signal) : listSoldOrders(params, signal), retry: false })
  function change(values: Record<string, string>, reset = true) {
    setSearch((previous) => {
      const next = new URLSearchParams(previous)
      Object.entries(values).forEach(([key, value]) => next.set(key, value))
      if (reset) next.delete('pageNum')
      return next
    })
  }
  useEffect(() => {
    if (orders.data && params.pageNum > Math.max(1, orders.data.pages)) {
      setSearch((previous) => {
        const next = new URLSearchParams(previous)
        next.set('pageNum', String(Math.max(1, orders.data!.pages)))
        return next
      }, { replace: true })
    }
  }, [orders.data, params.pageNum, setSearch])

  return <div className="space-y-8"><div className="space-y-3"><h1 className="text-2xl font-semibold">我的订单</h1><p className="text-sm text-muted-foreground">买到的喜欢，卖出的闲置，都在这里。</p></div>
    <Tabs value={tab} onValueChange={(value) => change({ tab: value === 'sold' ? 'sold' : 'bought' })} className="gap-6"><div className="flex flex-wrap items-center justify-between gap-4"><TabsList className="min-h-12"><TabsTrigger value="bought" className="min-h-11 px-6">我买的</TabsTrigger><TabsTrigger value="sold" className="min-h-11 px-6">我卖的</TabsTrigger></TabsList><div className="flex items-center gap-3"><Label htmlFor="order-page-size" className="text-muted-foreground">每页</Label><select id="order-page-size" value={params.pageSize} onChange={(event) => change({ pageSize: event.target.value })} className="h-11 rounded-lg border bg-background px-3 text-sm">{![10, 20, 50].includes(params.pageSize) && <option value={params.pageSize}>{params.pageSize} 条</option>}<option value={10}>10 条</option><option value={20}>20 条</option><option value={50}>50 条</option></select></div></div>
      <TabsContent value={tab} className="space-y-6">
        {orders.isPending ? <div className="space-y-6" role="status" aria-label="正在加载订单">{Array.from({ length: 3 }, (_, index) => <OrderCardSkeleton key={index} />)}</div>
          : orders.isError ? <div className="flex flex-col items-center rounded-xl border bg-card px-6 py-16 text-center"><WifiOff className="mb-6 size-10 text-muted-foreground" /><h2 className="text-lg font-medium">订单加载失败</h2><p role="alert" className="mt-4 text-sm text-muted-foreground">{errorMessage(orders.error)}</p><Button className="mt-6 h-11 px-6" onClick={() => void orders.refetch()}>重新加载</Button></div>
          : !orders.data.records.length ? <div className="flex flex-col items-center rounded-xl border bg-card px-6 py-16 text-center"><ReceiptText className="mb-6 size-10 text-muted-foreground" /><h2 className="text-lg font-medium">还没有{tab === 'bought' ? '购买' : '卖出'}订单</h2><p className="mt-4 text-sm text-muted-foreground">去集市看看，让好物与需要相遇。</p><Link to="/" className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-primary px-6 text-sm text-primary-foreground">逛逛集市</Link></div>
          : <><p className="text-sm text-muted-foreground" role="status">共 {orders.data.total} 笔订单</p><div className="space-y-6">{orders.data.records.map((order, index) => <ListItem key={order.id} index={index}><OrderCard order={order} /></ListItem>)}</div>{orders.data.pages > 1 && <nav aria-label="订单分页" className="flex flex-wrap items-center justify-center gap-2"><Button variant="outline" className="size-11" disabled={params.pageNum <= 1 || orders.isFetching} aria-label="上一页" onClick={() => change({ pageNum: String(params.pageNum - 1) }, false)}><ChevronLeft /></Button>{paginationPages(params.pageNum, orders.data.pages).map((page) => <Button key={page} className="size-11" variant={page === params.pageNum ? 'default' : 'outline'} aria-current={page === params.pageNum ? 'page' : undefined} disabled={orders.isFetching} onClick={() => change({ pageNum: String(page) }, false)}>{page}</Button>)}<Button variant="outline" className="size-11" disabled={params.pageNum >= orders.data.pages || orders.isFetching} aria-label="下一页" onClick={() => change({ pageNum: String(params.pageNum + 1) }, false)}><ChevronRight /></Button><p className="w-full pt-2 text-center text-xs text-muted-foreground">第 {params.pageNum} / {orders.data.pages} 页</p></nav>}</>}
      </TabsContent>
    </Tabs>
  </div>
}
