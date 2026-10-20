import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getDetail } from '@/api/product'
import { errorMessage } from '@/api/client'
import { ProductForm } from '@/components/ProductForm'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { sellerActions } from '@/lib/productForm'
import { useAuthStore } from '@/stores/auth'

export function EditProductPage() {
  const { id: rawId } = useParams()
  const id = Number(rawId)
  const valid = !!rawId && /^\d+$/.test(rawId) && Number.isSafeInteger(id) && id > 0
  const token = useAuthStore((state) => state.token)
  const userId = useAuthStore((state) => state.currentUser?.id)
  const detail = useQuery({ queryKey: ['productEdit', token, id], queryFn: ({ signal }) => getDetail(id, signal), enabled: valid, staleTime: 0, gcTime: 0, refetchOnMount: 'always', retry: false })
  return <div className="mx-auto max-w-3xl space-y-8"><h1 className="text-2xl font-semibold">编辑商品</h1>
    {!valid ? <p role="alert">商品编号无效。</p> : detail.isPending ? <div className="space-y-6" role="status" aria-label="正在加载商品"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-64 w-full" /></div>
      : detail.isError ? <div className="space-y-4 rounded-xl border bg-card p-8"><p role="alert">{errorMessage(detail.error)}</p><Button className="h-11" onClick={() => void detail.refetch()}>重新加载</Button></div>
      : !sellerActions(detail.data, userId).includes('edit') ? <div className="space-y-4 rounded-xl border bg-card p-8"><p role="alert">{detail.data.sellerId !== userId ? '你只能编辑自己发布的商品。' : '当前只支持编辑在售商品。已下架商品请先重新上架。'}</p><Link to="/listings" className="inline-flex min-h-11 items-center underline">返回我的发布</Link></div>
      : <ProductForm key={id} product={detail.data} />}
  </div>
}
