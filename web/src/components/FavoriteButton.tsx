import { useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Heart } from 'lucide-react'
import { toast } from 'sonner'
import { changeFavorite } from '@/api/favorite'
import { errorMessage } from '@/api/client'
import { useFavorites } from '@/hooks/useFavorites'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { Product } from '@/types/product'

export function FavoriteButton({ product }: { product: Product }) {
  const token = useAuthStore((state) => state.token)
  const favorites = useFavorites()
  const queryClient = useQueryClient()
  const locked = useRef(false)
  const saved = favorites.data?.some((item) => item.id === product.id) || false
  const mutation = useMutation({
    mutationFn: (next: boolean) => changeFavorite(product.id, next),
    retry: false,
    onMutate: async () => { await queryClient.cancelQueries({ queryKey: ['favorites', token] }) },
    onSuccess: (result) => {
      const nextSaved = result !== 'removed'
      queryClient.setQueryData<Product[]>(['favorites', token], (previous = []) => nextSaved
        ? [product, ...previous.filter((item) => item.id !== product.id)]
        : previous.filter((item) => item.id !== product.id))
      toast.success(result === 'already-saved' ? '已收藏这件好物' : nextSaved ? '收藏成功' : '已取消收藏')
      void queryClient.invalidateQueries({ queryKey: ['favorites', token] })
    },
    onError: (error) => { toast.error(errorMessage(error)) },
    onSettled: () => { locked.current = false },
  })

  if (favorites.isPending) return <Skeleton className="h-11 w-32" aria-label="正在加载收藏状态" />
  if (favorites.isError && !favorites.data) return <Button className="h-11 px-4" variant="outline" disabled={favorites.isFetching} onClick={() => void favorites.refetch()}>重试收藏状态</Button>
  return <Button variant="outline" className="h-11 px-4" disabled={mutation.isPending} aria-pressed={saved} aria-label={saved ? '取消收藏' : '收藏商品'} onClick={() => {
    if (locked.current) return
    locked.current = true
    mutation.mutate(!saved)
  }}><Heart className={`size-4 ${saved ? 'fill-current' : ''}`} />{mutation.isPending ? '处理中…' : saved ? '已收藏 · 取消收藏' : '收藏'}</Button>
}
