import { useState } from 'react'
import { ProgressiveImage } from '@/components/ProgressiveImage'
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { productImages } from '@/lib/productActions'

function GalleryImage({ src, alt, thumbnail = false }: { src?: string; alt: string; thumbnail?: boolean }) {
  const [failed, setFailed] = useState(false)
  return src && !failed ? <ProgressiveImage src={src} alt={alt} loading={thumbnail ? 'lazy' : 'eager'} decoding="async" onError={() => setFailed(true)} className={`size-full ${thumbnail ? 'object-cover' : 'object-contain'}`} /> : <div className="flex size-full flex-col items-center justify-center gap-4 text-muted-foreground" role="img" aria-label={`${alt}：图片暂不可用`}><ImageOff className={thumbnail ? 'size-5' : 'size-12'} aria-hidden="true" />{!thumbnail && <span className="text-sm">暂无商品图片</span>}</div>
}

export function ProductGallery({ images, title }: { images: string | null; title: string }) {
  const urls = productImages(images)
  const [index, setIndex] = useState(0)
  const current = Math.min(index, Math.max(0, urls.length - 1))
  const show = (next: number) => setIndex((next + urls.length) % urls.length)
  return <section aria-label="商品图片轮播" aria-roledescription="轮播" className="space-y-4" onKeyDown={(event) => {
    if (urls.length < 2) return
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      show(current + (event.key === 'ArrowRight' ? 1 : -1))
    }
  }}>
    <div className="relative aspect-square overflow-hidden rounded-xl border bg-muted/50" role="group" aria-label={urls.length ? `第 ${current + 1} 张，共 ${urls.length} 张` : '暂无图片'}>
      <GalleryImage key={urls[current] || 'empty'} src={urls[current]} alt={`${title}，第 ${current + 1} 张图片`} />
      {urls.length > 1 && <><Button variant="outline" className="absolute left-4 top-1/2 size-11 -translate-y-1/2 bg-background/95" aria-label="上一张图片" onClick={() => show(current - 1)}><ChevronLeft /></Button><Button variant="outline" className="absolute right-4 top-1/2 size-11 -translate-y-1/2 bg-background/95" aria-label="下一张图片" onClick={() => show(current + 1)}><ChevronRight /></Button><p className="absolute bottom-4 right-4 rounded-md bg-background/95 px-3 py-2 text-xs tabular-nums" aria-live="polite">{current + 1} / {urls.length}</p></>}
    </div>
    {urls.length > 1 && <div className="flex gap-3 overflow-x-auto pb-2" aria-label="选择商品图片">{urls.map((url, position) => <button key={url} type="button" className={`size-16 shrink-0 overflow-hidden rounded-lg border bg-muted/50 outline-offset-2 ${current === position ? 'ring-2 ring-foreground' : 'opacity-65 hover:opacity-100'}`} aria-label={`查看第 ${position + 1} 张图片`} aria-pressed={position === current} onClick={() => setIndex(position)}><GalleryImage src={url} alt="" thumbnail /></button>)}</div>}
  </section>
}
