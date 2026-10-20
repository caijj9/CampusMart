import { Link } from 'react-router-dom'
import { Star, User } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { SellerBrief } from '@/types/product'

export function SellerCard({ seller, sellerId }: { seller: SellerBrief; sellerId: number }) {
  return <section aria-label="卖家信息" className="space-y-6 rounded-xl border bg-card p-6 shadow-xs">
    <h2 className="font-semibold">卖家</h2>
    <div className="flex items-center gap-4"><Avatar className="size-14 shrink-0"><AvatarImage src={seller.avatar ?? undefined} alt="卖家头像" /><AvatarFallback><User className="size-6 text-muted-foreground" aria-hidden="true" /><span className="sr-only">卖家头像占位</span></AvatarFallback></Avatar><div className="min-w-0 space-y-2"><p className="break-words font-medium">{seller.nickname ?? '暂未填写'}</p><p className="break-words text-sm text-muted-foreground">校区：{seller.campus ?? '暂未填写'}</p></div></div>
    <div className="flex flex-wrap items-center gap-3">
      {seller.avgRating === null ? <p className="text-sm text-muted-foreground">暂无评价</p> : <><span className="inline-flex gap-1" role="img" aria-label={`${seller.avgRating.toFixed(1)} / 5 星`}>{[0, 1, 2, 3, 4].map((index) => <span key={index} className="relative inline-flex size-4" aria-hidden="true"><Star className="size-4 text-muted-foreground/40" /><span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${Math.max(0, Math.min(1, seller.avgRating! - index)) * 100}%` }}><Star className="size-4 fill-current text-foreground/80" /></span></span>)}</span><span className="text-sm font-semibold tabular-nums">{seller.avgRating.toFixed(1)}</span></>}
      <span className="text-sm text-muted-foreground">{seller.reviewCount} 条评价</span>
    </div>
    <Link to={`/sellers/${sellerId}`} className="inline-flex min-h-11 items-center text-sm underline-offset-4 hover:underline">查看全部评价</Link>
  </section>
}
