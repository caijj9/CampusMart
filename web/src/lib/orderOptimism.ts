import type { QueryClient, QueryKey } from '@tanstack/react-query'
import type { Page } from '@/types'
import type { OrderDetail, OrderStatus, OrderSummary } from '@/types/order'

interface Snapshot {
  key: QueryKey
  order: OrderSummary | OrderDetail
  detail: boolean
}

export function optimisticallyUpdateOrder(client: QueryClient, token: string | null, id: number, status: OrderStatus): Snapshot[] {
  const snapshots: Snapshot[] = []
  for (const [key, page] of client.getQueriesData<Page<OrderSummary>>({ queryKey: ['orders', token] })) {
    const order = page?.records.find((item) => item.id === id)
    if (!page || !order) continue
    snapshots.push({ key, order, detail: false })
    client.setQueryData<Page<OrderSummary>>(key, { ...page, records: page.records.map((item) => item.id === id ? { ...item, status } : item) })
  }
  const key = ['orderDetail', token, id]
  const detail = client.getQueryData<OrderDetail>(key)
  if (detail) {
    snapshots.push({ key, order: detail, detail: true })
    client.setQueryData<OrderDetail>(key, { ...detail, status })
  }
  return snapshots
}

export function rollbackOrder(client: QueryClient, snapshots: Snapshot[]) {
  // Restore only the failed order. Other orders may have changed concurrently.
  for (const snapshot of snapshots) {
    if (snapshot.detail) client.setQueryData<OrderDetail>(snapshot.key, snapshot.order as OrderDetail)
    else client.setQueryData<Page<OrderSummary>>(snapshot.key, (page) => page ? {
      ...page, records: page.records.map((item) => item.id === snapshot.order.id ? snapshot.order : item),
    } : page)
  }
}
