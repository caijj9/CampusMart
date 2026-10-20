import client from './client'
import type { ApiResult } from '@/types'
import type { Page, Product, ProductDetail, ProductSearchParams, PublishProductParams, UpdateProductParams, MyProductParams, UploadImagesOptions } from '@/types/product'

export async function searchProducts(params: ProductSearchParams = {}, signal?: AbortSignal): Promise<Page<Product>> {
  const { data } = await client.get<ApiResult<Page<Product>>>('/product/search', { params, signal })
  return data.data
}

export async function listByCategory(categoryId: number, signal?: AbortSignal): Promise<Product[]> {
  const { data } = await client.get<ApiResult<Product[]>>('/product/list', { params: { categoryId }, signal })
  return data.data
}

export async function getProductDetail(id: number, signal?: AbortSignal): Promise<ProductDetail> {
  const { data } = await client.get<ApiResult<ProductDetail>>(`/product/${id}`, { signal })
  return data.data
}

// Preserve the existing name used by the editing page and contract checks.
export { getProductDetail as getDetail }

export async function getHistory(signal?: AbortSignal): Promise<Product[]> {
  const { data } = await client.get<ApiResult<Product[]>>('/product/history', { signal })
  return data.data
}

export async function publish(params: PublishProductParams): Promise<number> {
  const { data } = await client.post<ApiResult<number>>('/product/publish', params)
  return data.data
}

export async function update(params: UpdateProductParams): Promise<null> {
  const { data } = await client.put<ApiResult<null>>('/product/update', params)
  return data.data
}

export async function offline(id: number): Promise<null> {
  const { data } = await client.put<ApiResult<null>>(`/product/offline/${id}`)
  return data.data
}

export async function deleteProduct(id: number): Promise<null> {
  const { data } = await client.delete<ApiResult<null>>(`/product/delete/${id}`)
  return data.data
}

export async function uploadImages(files: File[], options: UploadImagesOptions = {}): Promise<string[]> {
  const body = new FormData()
  files.forEach((file) => body.append('files', file))
  const { data } = await client.post<ApiResult<string[]>>('/product/images', body, {
    signal: options.signal,
    onUploadProgress: ({ loaded, total }) => options.onProgress?.(total ? Math.min(99, Math.round(loaded / total * 100)) : undefined),
  })
  options.onProgress?.(100)
  return data.data
}

export async function listMine(params: MyProductParams = {}, signal?: AbortSignal): Promise<Page<Product>> {
  const { data } = await client.get<ApiResult<Page<Product>>>('/product/mine', { params, signal })
  return data.data
}

export async function relist(id: number): Promise<null> {
  const { data } = await client.put<ApiResult<null>>(`/product/relist/${id}`)
  return data.data
}
