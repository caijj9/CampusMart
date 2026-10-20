import type { ProductSearchParams } from '@/types/product'

export const PRODUCT_PAGE_SIZE = 12
export const CONDITION_LABELS = { 1: '全新', 2: '几乎全新', 3: '轻微使用', 4: '明显使用' } as const

function positiveInteger(value: string | null): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined
  const number = Number(value)
  return Number.isSafeInteger(number) && number >= 1 && number <= 2_147_483_647 ? number : undefined
}

export function parsePrice(value: string): number | undefined {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) return undefined
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : undefined
}

export function priceRangeError(min: string, max: string): string | null {
  if ((min.trim() && parsePrice(min) === undefined) || (max.trim() && parsePrice(max) === undefined)) return '请输入非负金额，最多保留两位小数'
  if (min.trim() && max.trim() && Number(min) > Number(max)) return '最低价不能高于最高价'
  return null
}

export function readProductFilters(search: URLSearchParams): ProductSearchParams {
  const minPrice = parsePrice(search.get('minPrice') || '')
  const maxPrice = parsePrice(search.get('maxPrice') || '')
  const sort = search.get('sortBy')
  const validRange = minPrice === undefined || maxPrice === undefined || minPrice <= maxPrice
  return {
    keyword: search.get('keyword')?.trim() || undefined,
    categoryId: positiveInteger(search.get('categoryId')),
    minPrice: validRange ? minPrice : undefined,
    maxPrice: validRange ? maxPrice : undefined,
    sortBy: sort === 'price_asc' || sort === 'price_desc' ? sort : undefined,
    pageNum: positiveInteger(search.get('pageNum')) || 1,
    pageSize: PRODUCT_PAGE_SIZE,
  }
}

export function mainProductImage(images: string | null): string | undefined {
  return images?.split(',').map((image) => image.trim()).find(Boolean)
}

export function paginationPages(current: number, total: number): number[] {
  const start = Math.max(1, Math.min(current - 2, total - 4))
  return Array.from({ length: Math.min(5, total) }, (_, index) => start + index)
}
