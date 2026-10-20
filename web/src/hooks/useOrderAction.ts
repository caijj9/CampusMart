import { useIsMutating, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { executeOrderAction } from '@/api/order'
import { errorMessage } from '@/api/client'
import { availableOrderActions, ORDER_ACTION_LABELS, ORDER_ACTION_STATUS } from '@/lib/orderState'
import { optimisticallyUpdateOrder, rollbackOrder } from '@/lib/orderOptimism'
import { useAuthStore } from '@/stores/auth'
import type { OrderAction, OrderSummary } from '@/types/order'

export function useOrderAction(order: OrderSummary) {
  const token = useAuthStore((state) => state.token)
  const userId = useAuthStore((state) => state.currentUser?.id)
  const client = useQueryClient()
  const key = ['orderAction', token, order.id]
  const pending = useIsMutating({ mutationKey: key }) > 0
  const mutation = useMutation({
    mutationKey: key,
    mutationFn: (action: OrderAction) => executeOrderAction(order.id, action),
    retry: false,
    onMutate: async (action) => {
      await client.cancelQueries({ queryKey: ['orders', token] })
      await client.cancelQueries({ queryKey: ['orderDetail', token, order.id] })
      return optimisticallyUpdateOrder(client, token, order.id, ORDER_ACTION_STATUS[action])
    },
    onError: (error, _action, snapshots) => {
      if (snapshots) rollbackOrder(client, snapshots)
      toast.error(errorMessage(error))
    },
    onSuccess: (_result, action) => { toast.success(`${ORDER_ACTION_LABELS[action]}成功`) },
    onSettled: async () => {
      await client.invalidateQueries({ queryKey: ['orderDetail', token, order.id] })
      // Wait for other order mutations before refetching shared list queries.
      if (client.isMutating({ mutationKey: ['orderAction', token] }) === 1) {
        await client.invalidateQueries({ queryKey: ['orders', token] })
      }
      for (const name of ['products', 'product', 'favorites', 'history']) void client.invalidateQueries({ queryKey: [name, token] })
    },
  })
  return {
    pending,
    run: (action: OrderAction) => {
      if (client.isMutating({ mutationKey: key }) || !availableOrderActions(order, userId).includes(action)) return
      mutation.mutate(action)
    },
  }
}
