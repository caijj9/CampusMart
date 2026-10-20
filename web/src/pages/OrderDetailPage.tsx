import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ReceiptText } from 'lucide-react'
import { getOrderDetail } from '@/api/orderQueries'
import { errorMessage } from '@/api/client'
import { OrderThumbnail } from '@/components/OrderCard'
import { OrderActions } from '@/components/OrderActions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ORDER_STATUS_LABELS, formatOrderTime } from '@/lib/orderState'
import { useAuthStore } from '@/stores/auth'

export function OrderDetailPage() {
  const { id: rawId } = useParams()
  const id = Number(rawId)
  const valid = !!rawId && /^\d+$/.test(rawId) && Number.isSafeInteger(id) && id > 0
  const token = useAuthStore((state) => state.token)
  const userId = useAuthStore((state) => state.currentUser?.id)
  const detail = useQuery({ queryKey: ['orderDetail', token, id], queryFn: ({ signal }) => getOrderDetail(id, signal), enabled: valid, retry: false })
  const order = detail.data
  const allowed = order && (userId === order.buyerId || userId === order.sellerId)
  return <div className="max-w-3xl space-y-8"><Link to="/trades" className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="size-4" />返回我的订单</Link>
    {!valid ? <div className="space-y-4 rounded-xl border bg-card p-8"><ReceiptText className="size-8" /><h1 className="text-xl font-semibold">订单编号无效</h1></div>
      : detail.isPending ? <div className="space-y-6" role="status" aria-label="正在加载订单详情"><Skeleton className="h-10 w-40" /><Skeleton className="h-64 w-full rounded-xl" /><Skeleton className="h-48 w-full rounded-xl" /></div>
      : detail.isError ? <div className="space-y-6 rounded-xl border bg-card p-8"><h1 className="text-xl font-semibold">订单详情加载失败</h1><p role="alert" className="text-sm text-muted-foreground">{errorMessage(detail.error)}</p><Button className="h-11 px-6" onClick={() => void detail.refetch()}>重新加载</Button></div>
      : !allowed ? <p role="alert">你无法查看这笔订单。</p>
      : <><div className="flex flex-wrap items-center justify-between gap-4"><h1 className="text-2xl font-semibold">订单详情</h1><Badge variant="secondary" className="rounded-md">{ORDER_STATUS_LABELS[order.status]}</Badge></div><section aria-label="订单商品快照" className="space-y-6 rounded-xl border bg-card p-6"><p className="text-xs text-muted-foreground">订单号：{order.orderNo}</p><div className="flex gap-4"><OrderThumbnail images={order.productImages} title={order.productTitle} /><div className="min-w-0 space-y-4"><h2 className="break-words font-semibold">{order.productTitle}</h2><p className="text-2xl font-semibold tabular-nums">¥{Number(order.amount).toFixed(2)}</p></div></div><p className="text-sm text-muted-foreground">下单时间：{formatOrderTime(order.createTime)}</p><OrderActions order={order} /></section><section aria-label="对方联系信息" className="space-y-6 rounded-xl border bg-card p-6"><h2 className="font-semibold">{userId === order.buyerId ? '卖家' : '买家'}联系信息</h2><dl className="grid grid-cols-[4rem_1fr] gap-4 text-sm"><dt className="text-muted-foreground">昵称</dt><dd>{order.counterparty.nickname || '暂未填写'}</dd><dt className="text-muted-foreground">校区</dt><dd>{order.counterparty.campus || '暂未填写'}</dd><dt className="text-muted-foreground">手机号</dt><dd>{order.counterparty.phone || '暂未填写'}</dd></dl></section></>}
  </div>
}
