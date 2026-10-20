import type { Product } from '@/types/product'

export function canPurchase(product: Product, currentUserId?: number): boolean {
  return currentUserId !== undefined && product.status === 1 && product.sellerId !== currentUserId
}

export function purchaseLabel(product: Product, currentUserId?: number): string {
  if (product.status === 2) return '已售出'
  if (product.status !== 1) return '已下架'
  if (product.sellerId === currentUserId) return '这是你的商品'
  return '立即购买'
}

export function productImages(images: string | null): string[] {
  return [...new Set(images?.split(',').map((image) => image.trim()).filter(Boolean) || [])]
}
