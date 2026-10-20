import { Button } from '@/components/ui/button'
import { ReviewButton } from '@/components/ReviewButton'
import { availableOrderActions, ORDER_ACTION_LABELS } from '@/lib/orderState'
import { useOrderAction } from '@/hooks/useOrderAction'
import { useAuthStore } from '@/stores/auth'
import type { OrderSummary } from '@/types/order'

export function OrderActions({ order }: { order: OrderSummary }) {
  const userId = useAuthStore((state) => state.currentUser?.id)
  const { pending, run } = useOrderAction(order)
  const actions = availableOrderActions(order, userId)
  if (!actions.length) return null
  return <div className="flex flex-wrap gap-3" aria-label="订单操作">
    {actions.map((action) => action === 'review'
      ? <ReviewButton key={action} order={order} />
      : <Button key={action} className="h-11 px-4" variant={action === 'cancel' ? 'outline' : 'default'} disabled={pending} onClick={() => run(action)}>{pending ? '处理中…' : ORDER_ACTION_LABELS[action]}</Button>)}
  </div>
}
