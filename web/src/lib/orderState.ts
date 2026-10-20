import type { OrderAction, OrderListParams, OrderStatus, OrderSummary } from '@/types/order'

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = { 0: '待付款', 1: '已付款', 2: '已发货', 3: '已完成', 4: '已取消' }
export const ORDER_ACTION_LABELS: Record<OrderAction, string> = { pay: '支付', ship: '发货', confirm: '确认收货', cancel: '取消' }
export const ORDER_ACTION_STATUS: Record<OrderAction, OrderStatus> = { pay: 1, ship: 2, confirm: 3, cancel: 4 }

export function availableOrderActions(order: OrderSummary, userId?: number): (OrderAction | 'review')[] {
  const buyer = userId !== undefined && userId === order.buyerId
  const seller = userId !== undefined && userId === order.sellerId
  if (!buyer && !seller) return []
  switch (order.status) {
    case 0: return buyer ? ['pay', 'cancel'] : ['cancel']
    case 1: return seller ? ['ship', 'cancel'] : ['cancel']
    case 2: return buyer ? ['confirm'] : []
    case 3: return buyer ? ['review'] : []
    default: return []
  }
}

export function normalizeOrderPagination(params: OrderListParams): Required<OrderListParams> {
  return {
    pageNum: Number.isSafeInteger(params.pageNum) && params.pageNum! > 0 && params.pageNum! <= 2_147_483_647 ? params.pageNum! : 1,
    pageSize: Number.isSafeInteger(params.pageSize) && params.pageSize! > 0 ? Math.min(params.pageSize!, 50) : 10,
  }
}

export function formatOrderTime(value: string): string {
  if (!value) return '时间暂无数据'
  // LocalDateTime has no timezone. Display it as sent; do not shift it to UTC.
  return value.replace('T', ' ').replace(/\.\d+$/, '')
}
