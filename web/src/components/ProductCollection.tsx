import { Link } from 'react-router-dom'
import { Heart, History, WifiOff } from 'lucide-react'
import { errorMessage } from '@/api/client'
import { ProductCard, ProductCardSkeleton } from '@/components/ProductCard'
import { ListItem } from '@/components/ListItem'
import { FavoriteButton } from '@/components/FavoriteButton'
import { Button } from '@/components/ui/button'
import type { Product } from '@/types/product'

interface Props {
  kind: 'favorites' | 'history'
  data?: Product[]
  pending: boolean
  failed: boolean
  error: unknown
  retry: () => void
}

export function ProductCollection({ kind, data, pending, failed, error, retry }: Props) {
  const favorites = kind === 'favorites'
  const Icon = favorites ? Heart : History
  return <div className="space-y-8"><div className="space-y-3"><h1 className="text-2xl font-semibold">{favorites ? '我的收藏' : '浏览历史'}</h1><p className="text-sm text-muted-foreground">{favorites ? '把喜欢的好物留在这里，随时回来看看。' : '最近看过的 20 件好物，按浏览时间排列。'}</p></div>
    {pending ? <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" role="status" aria-label="正在加载商品">{Array.from({ length: 8 }, (_, index) => <ProductCardSkeleton key={index} />)}</div>
      : failed ? <div className="flex flex-col items-center rounded-xl border bg-card px-6 py-16 text-center"><WifiOff className="mb-6 size-10 text-muted-foreground" /><h2 className="text-lg font-medium">暂时无法加载{favorites ? '收藏' : '历史'}</h2><p role="alert" className="mt-4 text-sm text-muted-foreground">{errorMessage(error)}</p><Button className="mt-6 h-11 px-6" onClick={retry}>重新加载</Button></div>
      : !data?.length ? <div className="flex flex-col items-center rounded-xl border bg-card px-6 py-16 text-center"><Icon className="mb-6 size-10 text-muted-foreground" /><h2 className="text-lg font-medium">{favorites ? '还没有收藏的好物' : '还没有浏览记录'}</h2><p className="mt-4 text-sm text-muted-foreground">{favorites ? '遇到喜欢的商品，点一下收藏就能留住它。' : '打开一件商品详情，下次就能在这里找到它。'}</p><Link to="/" className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-primary px-6 text-sm text-primary-foreground">去逛逛集市</Link></div>
      : <><p role="status" className="text-sm text-muted-foreground">共 {data.length} 件好物</p><div className="grid grid-cols-1 items-start gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{data.map((product, index) => <ListItem key={product.id} index={index} className="space-y-3"><ProductCard product={product} />{favorites && <FavoriteButton product={product} />}</ListItem>)}</div></>}
  </div>
}
