import client from './client'
import type { ApiResult, Page } from '@/types'
import type { OrderDetail, OrderListParams, OrderSummary } from '@/types/order'

export async function listBoughtOrders(params: OrderListParams, signal?: AbortSignal): Promise<Page<OrderSummary>> {
  const { data } = await client.get<ApiResult<Page<OrderSummary>>>('/order/bought', { params, signal })
  return data.data
}

export async function listSoldOrders(params: OrderListParams, signal?: AbortSignal): Promise<Page<OrderSummary>> {
  const { data } = await client.get<ApiResult<Page<OrderSummary>>>('/order/sold', { params, signal })
  return data.data
}

export async function getOrderDetail(id: number, signal?: AbortSignal): Promise<OrderDetail> {
  const { data } = await client.get<ApiResult<OrderDetail>>(`/order/${id}`, { signal })
  return data.data
}
