import client from './client'
import type { ApiResult } from '@/types'
import type { CreateOrderParams, OrderAction } from '@/types/order'

export async function getOrderToken(): Promise<string> {
  const { data } = await client.get<ApiResult<string>>('/order/token')
  return data.data
}

export async function createOrder(params: CreateOrderParams): Promise<number> {
  const { data } = await client.post<ApiResult<number>>('/order/create', params)
  return data.data
}

// Never cache the ticket or retry POST automatically. Each attempt gets a new one.
export async function purchaseProduct(productId: number): Promise<number> {
  const token = await getOrderToken()
  return createOrder({ productId, token })
}

export async function executeOrderAction(id: number, action: OrderAction): Promise<string> {
  const { data } = await client.put<ApiResult<string>>(`/order/${action}/${id}`)
  return data.data
}
