export interface CreateOrderParams {
  productId: number
  token: string
}

export type OrderStatus = 0 | 1 | 2 | 3 | 4
export type OrderTab = 'bought' | 'sold'
export type OrderAction = 'pay' | 'ship' | 'confirm' | 'cancel'

// Frontend view models based on the existing Order snapshot fields.
// These are not a claim about the pending backend VO wire format.
export interface OrderSummary {
  id: number
  orderNo: string
  buyerId: number
  sellerId: number
  productId: number
  productTitle: string
  productImages: string | null
  amount: number
  status: OrderStatus
  createTime: string
  updateTime: string
}

export interface OrderDetail extends OrderSummary {
  // A future API adapter must map the actual OrderDetailVO into this model.
  // Contact information exists only in this detail model.
  counterparty: {
    nickname: string | null
    campus: string | null
    phone: string | null
  }
}

export interface OrderListParams {
  pageNum?: number
  pageSize?: number
}
