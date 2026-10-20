import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { deleteProduct, offline, relist } from '@/api/product'
import { ProductCard } from '@/components/ProductCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { sellerActions, sellerErrorMessage } from '@/lib/productForm'
import { useAuthStore } from '@/stores/auth'
import type { Product } from '@/types/product'

const labels = { offline: '下架', relist: '重新上架', delete: '删除' } as const
export const SELLER_STATUS_LABELS = { 0: '已下架', 1: '在售', 2: '已售出', 3: '平台下架' } as const

export function SellerProductCard({ product }: { product: Product }) {
  const token = useAuthStore((state) => state.token)
  const userId = useAuthStore((state) => state.currentUser?.id)
  const actions = sellerActions(product, userId)
  const client = useQueryClient()
  const locked = useRef(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const mutation = useMutation({
    mutationKey: ['sellerAction', token, product.id],
    mutationFn: (action: keyof typeof labels) => action === 'offline' ? offline(product.id) : action === 'relist' ? relist(product.id) : deleteProduct(product.id),
    retry: false,
    onSuccess: (_data, action) => {
      toast.success(`${labels[action]}成功`)
      setDeleteOpen(false)
      if (action === 'delete') client.removeQueries({ queryKey: ['product', token, product.id], exact: true })
    },
    onError: (error) => { toast.error(sellerErrorMessage(error)) },
    onSettled: async () => {
      await Promise.all(['myProducts', 'products', 'product', 'favorites', 'history'].map((name) => client.invalidateQueries({ queryKey: [name, token] })))
      locked.current = false
    },
  })
  function run(action: keyof typeof labels) {
    if (locked.current || !actions.includes(action)) return
    locked.current = true
    mutation.mutate(action)
  }
  return <div className="space-y-3"><div className="flex items-center justify-between"><Badge variant="secondary" className="rounded-md">{SELLER_STATUS_LABELS[product.status]}</Badge></div><ProductCard product={product} /><div className="flex flex-wrap gap-2">
    {actions.includes('edit') && <Link to={`/listings/${product.id}/edit`} className={`inline-flex min-h-11 items-center rounded-lg border bg-background px-4 text-sm ${mutation.isPending ? 'pointer-events-none opacity-50' : 'hover:bg-muted'}`}>编辑</Link>}
    {actions.filter((action) => action !== 'edit').map((action) => <Button key={action} variant={action === 'delete' ? 'destructive' : 'outline'} className="h-11 px-4" disabled={mutation.isPending} onClick={() => action === 'delete' ? setDeleteOpen(true) : run(action)}>{mutation.isPending ? '处理中…' : labels[action]}</Button>)}
  </div><Dialog open={deleteOpen} onOpenChange={(open) => { if (!mutation.isPending) setDeleteOpen(open) }}><DialogContent showCloseButton={!mutation.isPending}><DialogHeader><DialogTitle>删除这件商品？</DialogTitle><DialogDescription>「{product.title}」将从你的发布列表中移除。</DialogDescription></DialogHeader><div className="flex gap-3"><Button type="button" variant="outline" className="h-11 flex-1" disabled={mutation.isPending} onClick={() => setDeleteOpen(false)}>保留商品</Button><Button type="button" variant="destructive" className="h-11 flex-1" disabled={mutation.isPending} onClick={() => run('delete')}>{mutation.isPending ? '正在删除…' : '确认删除'}</Button></div></DialogContent></Dialog></div>
}
